import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { GitPullRequest, Loader2, Sparkles, Wand2, AlertTriangle, XCircle, Info, ExternalLink, FileCode2, ShieldAlert, ThumbsUp, ThumbsDown, HelpCircle } from "lucide-react";
import { aiPRReview } from "@/lib/api";
import { fetchPulls, parseId, fetchRepo } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import { exportMarkdown, exportPdf } from "@/lib/report";
import { cn } from "@/lib/utils";
const RISK = {
  low: "bg-olive/15 text-olive-dark border-olive/30",
  medium: "bg-gold/20 text-charcoal border-gold/40",
  high: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  critical: "bg-destructive/15 text-destructive border-destructive/40"
};
const SEVERITY = {
  info: {
    color: "text-muted-foreground",
    icon: Info
  },
  nit: {
    color: "text-muted-foreground",
    icon: Info
  },
  suggest: {
    color: "text-olive-dark",
    icon: Sparkles
  },
  warn: {
    color: "text-orange-600",
    icon: AlertTriangle
  },
  block: {
    color: "text-destructive",
    icon: XCircle
  }
};
const REC = {
  approve: {
    label: "Approve",
    color: "bg-olive text-cream",
    icon: ThumbsUp
  },
  request_changes: {
    label: "Request changes",
    color: "bg-destructive text-cream",
    icon: ThumbsDown
  },
  needs_discussion: {
    label: "Needs discussion",
    color: "bg-gold text-charcoal",
    icon: HelpCircle
  }
};
export default function PRReview() {
  const {
    id = ""
  } = useParams();
  const {
    owner,
    name
  } = parseId(id);
  const repoQ = useAsync(() => fetchRepo(owner, name), [owner, name]);
  const pullsQ = useAsync(() => fetchPulls(owner, name), [owner, name]);
  const [selected, setSelected] = useState("");
  const [manualPr, setManualPr] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  useEffect(() => {
    if (pullsQ.data && pullsQ.data[0] && selected === "") setSelected(pullsQ.data[0].number);
  }, [pullsQ.data, selected]);
  const runReview = async num => {
    setBusy(true);
    setReport(null);
    try {
      const r = await aiPRReview(id, num);
      setReport(r);
      toast.success(`Reviewed PR #${num}`);
    } catch (e) {
      toast.error("PR review failed", {
        description: e.message
      });
    } finally {
      setBusy(false);
    }
  };
  const parseManual = v => {
    const m = v.match(/(?:#|\/pull\/)(\d+)/) ?? v.match(/^(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
  };
  const download = kind => {
    if (!report) return;
    const r = report.review;
    const sections = [{
      title: "Summary",
      body: r.summary
    }, {
      title: "Impact",
      body: r.impact
    }, {
      title: "Risk",
      body: `**${r.risk_level.toUpperCase()}** ${r.breaking_changes ? "· Breaking changes detected" : ""}`
    }, {
      title: "Affected components",
      body: r.affected_components.map(c => `- ${c}`).join("\n") || "_None._"
    }, {
      title: "Review comments",
      body: r.review_comments.map(c => `- [${c.severity}] \`${c.file}\`${c.line_hint ? `:${c.line_hint}` : ""} — ${c.comment}`).join("\n") || "_None._"
    }, {
      title: "Test coverage gaps",
      body: r.test_coverage_gaps.map(g => `- ${g}`).join("\n") || "_None._"
    }, {
      title: "Merge recommendation",
      body: `**${REC[r.merge_recommendation]?.label ?? r.merge_recommendation}**`
    }];
    const input = {
      title: `PR Review — ${repoQ.data?.full_name ?? id} #${report.pr.number}`,
      subtitle: report.pr.title,
      sections
    };
    if (kind === "md") exportMarkdown(input, `${owner}-${name}-pr-${report.pr.number}`);else exportPdf(input);
  };
  return <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">AI pull request reviewer</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Review any PR · {repoQ.data?.full_name ?? id}</h1>
        <p className="text-sm text-muted-foreground">Grounded review from the diff — impact, risk, breaking changes, and merge recommendation.</p>
      </div>

      <div className="glass grid gap-4 rounded-2xl p-5 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Open pull request</label>
          <select value={selected} onChange={e => setSelected(e.target.value ? parseInt(e.target.value, 10) : "")} className="w-full rounded-xl border border-border/70 bg-cream px-3 py-2 text-sm outline-none focus:border-olive">
            <option value="">Select a PR…</option>
            {(pullsQ.data ?? []).map(p => <option key={p.id} value={p.number}>#{p.number} — {p.title}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Or paste PR number / URL</label>
          <input value={manualPr} onChange={e => setManualPr(e.target.value)} placeholder="e.g. 1234 or https://github.com/…/pull/1234" className="w-full rounded-xl border border-border/70 bg-cream px-3 py-2 text-sm outline-none focus:border-olive" />
        </div>
        <button className="btn-primary self-end !py-2" disabled={busy} onClick={() => {
        const n = manualPr ? parseManual(manualPr) : typeof selected === "number" ? selected : null;
        if (!n) return toast.error("Enter a valid PR number");
        runReview(n);
      }}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {busy ? "Reviewing…" : "Review PR"}
        </button>
      </div>

      {busy && <div className="glass h-64 animate-pulse rounded-2xl" />}

      {report && <>
          <div className="glass rounded-2xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <GitPullRequest className="h-3.5 w-3.5" /> #{report.pr.number} · @{report.pr.author ?? "unknown"}
                </div>
                <h3 className="mt-1 font-serif text-2xl font-semibold tracking-tight">{report.pr.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                {report.pr.url && <a href={report.pr.url} target="_blank" rel="noreferrer" className="btn-ghost !py-2 !px-3">
                    <ExternalLink className="h-3.5 w-3.5" /> View on GitHub
                  </a>}
                <button className="btn-ghost !py-2 !px-3" onClick={() => download("md")}>Markdown</button>
                <button className="btn-primary !py-2 !px-3" onClick={() => download("pdf")}>PDF Report</button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest", RISK[report.review.risk_level] ?? RISK.medium)}>
                Risk · {report.review.risk_level}
              </span>
              {report.review.breaking_changes && <span className="rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-destructive">
                  Breaking changes
                </span>}
              {report.review.merge_recommendation && (() => {
            const r = REC[report.review.merge_recommendation];
            if (!r) return null;
            const Icon = r.icon;
            return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-widest", r.color)}>
                    <Icon className="h-3 w-3" /> {r.label}
                  </span>;
          })()}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Summary</div>
                <p className="mt-1.5 text-sm leading-relaxed">{report.review.summary}</p>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Impact</div>
                <p className="mt-1.5 text-sm leading-relaxed">{report.review.impact}</p>
              </div>
            </div>

            {report.review.affected_components.length > 0 && <div className="mt-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Affected components</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {report.review.affected_components.map((c, i) => <span key={i} className="badge-soft">{c}</span>)}
                </div>
              </div>}
          </div>

          <div className="glass rounded-2xl p-6">
            <h3 className="font-serif text-xl font-semibold tracking-tight">Suggested review comments</h3>
            {report.review.review_comments.length === 0 ? <div className="mt-4 text-sm text-muted-foreground">No issues detected.</div> : <ul className="mt-4 space-y-3">
                {report.review.review_comments.map((c, i) => {
            const S = SEVERITY[c.severity] ?? SEVERITY.info;
            const Icon = S.icon;
            return <li key={i} className="rounded-xl border border-border/70 bg-cream-deep/40 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Icon className={cn("h-4 w-4", S.color)} />
                        <span className={cn("font-mono text-[10px] uppercase tracking-widest", S.color)}>{c.severity}</span>
                        <span className="font-mono text-xs text-foreground/80"><FileCode2 className="inline h-3 w-3 mr-1 text-olive" />{c.file}{c.line_hint ? `:${c.line_hint}` : ""}</span>
                      </div>
                      <p className="mt-2 text-sm">{c.comment}</p>
                    </li>;
          })}
              </ul>}
          </div>

          {report.review.test_coverage_gaps.length > 0 && <div className="glass rounded-2xl p-6">
              <h3 className="font-serif text-xl font-semibold tracking-tight">Test coverage gaps</h3>
              <ul className="mt-3 space-y-2">
                {report.review.test_coverage_gaps.map((g, i) => <li key={i} className="flex items-start gap-2 rounded-xl border border-border/70 bg-cream-deep/40 p-3 text-sm">
                    <ShieldAlert className="mt-0.5 h-4 w-4 text-gold" /> {g}
                  </li>)}
              </ul>
            </div>}
        </>}
    </div>;
}