import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { GitPullRequest, ExternalLink, FileWarning, Users, TimerReset } from "lucide-react";
import { fetchPulls, fetchRepo, parseId } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import { timeAgo, cn } from "@/lib/utils";
function scorePR(title, draft, createdAt) {
  const factors = [];
  let score = 20;
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays > 30) {
    score += 30;
    factors.push(`Stale (${Math.round(ageDays)}d open)`);
  } else if (ageDays > 7) {
    score += 12;
    factors.push(`Aging (${Math.round(ageDays)}d open)`);
  }
  const t = title.toLowerCase();
  if (/(breaking|major|refactor|migration|rewrite)/.test(t)) {
    score += 30;
    factors.push("Breaking/major keyword in title");
  }
  if (/(security|cve|vuln)/.test(t)) {
    score += 40;
    factors.push("Security-tagged title");
  }
  if (/(revert|rollback)/.test(t)) {
    score += 25;
    factors.push("Revert/rollback");
  }
  if (/(fix|typo|docs|readme)/.test(t)) {
    score -= 10;
    factors.push("Low-risk keyword");
  }
  if (draft) {
    score -= 15;
    factors.push("Draft — not ready to merge");
  }
  score = Math.max(1, Math.min(100, score));
  const risk = score >= 65 ? "high" : score >= 35 ? "medium" : "low";
  if (factors.length === 0) factors.push("No signal — standard change");
  return {
    risk,
    score,
    factors
  };
}
const riskStyle = {
  low: "border-olive/40 bg-olive/10 text-olive-dark",
  medium: "border-gold/40 bg-gold/10 text-charcoal",
  high: "border-destructive/40 bg-destructive/10 text-destructive"
};
export default function PullRequests() {
  const {
    id = ""
  } = useParams();
  const {
    owner,
    name
  } = parseId(id);
  const repoQ = useAsync(() => fetchRepo(owner, name), [owner, name]);
  const prQ = useAsync(() => fetchPulls(owner, name), [owner, name]);
  const items = useMemo(() => {
    return (prQ.data ?? []).map(p => ({
      pr: p,
      insight: scorePR(p.title, p.draft, p.created_at)
    }));
  }, [prQ.data]);
  const summary = {
    total: items.length,
    high: items.filter(i => i.insight.risk === "high").length,
    medium: items.filter(i => i.insight.risk === "medium").length,
    low: items.filter(i => i.insight.risk === "low").length,
    draft: items.filter(i => i.pr.draft).length,
    authors: new Set(items.map(i => i.pr.user?.login).filter(Boolean)).size
  };
  return <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Pull request intelligence</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          Open PRs · {repoQ.data?.full_name ?? `${owner}/${name}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          Ranked by change-risk heuristics from title, age, and status flags.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Open PRs" value={summary.total} icon={GitPullRequest} />
        <Kpi label="High risk" value={summary.high} icon={FileWarning} tone="high" />
        <Kpi label="Draft PRs" value={summary.draft} icon={TimerReset} />
        <Kpi label="Authors" value={summary.authors} icon={Users} />
      </div>

      <div className="glass rounded-2xl p-6">
        {prQ.loading ? <div className="h-40 animate-pulse rounded-xl bg-cream-deep" /> : items.length === 0 ? <div className="rounded-2xl border border-border/70 bg-cream/70 p-6 text-sm text-muted-foreground">
            No open pull requests.
          </div> : <ul className="space-y-3">
            {items.sort((a, b) => b.insight.score - a.insight.score).map(({
          pr,
          insight
        }) => <li key={pr.id} className="rounded-2xl border border-border/70 bg-cream/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest", riskStyle[insight.risk])}>
                          {insight.risk} risk · {insight.score}
                        </span>
                        {pr.draft && <span className="badge-soft">draft</span>}
                        <span className="font-mono text-[11px] text-muted-foreground">#{pr.number}</span>
                      </div>
                      <h4 className="mt-1 font-serif text-lg font-semibold tracking-tight">{pr.title}</h4>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {pr.user?.avatar_url && <img src={pr.user.avatar_url} alt={pr.user.login} className="h-4 w-4 rounded-full" />}
                        {pr.user?.login} · opened {timeAgo(pr.created_at)}
                      </div>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {insight.factors.map(f => <li key={f} className="rounded-full border border-border/70 bg-cream-deep/50 px-2.5 py-0.5 font-mono text-[10px]">
                            {f}
                          </li>)}
                      </ul>
                    </div>
                    <a href={pr.html_url} target="_blank" rel="noreferrer" className="btn-ghost !py-2 !px-3">
                      Review <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </li>)}
          </ul>}
      </div>
    </div>;
}
function Kpi({
  label,
  value,
  icon: Icon,
  tone
}) {
  return <div className={cn("glass rounded-2xl p-5", tone === "high" && "!border-destructive/40")}>
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        <Icon className={cn("h-4 w-4", tone === "high" ? "text-destructive" : "text-olive")} />
      </div>
      <div className="mt-2 font-serif text-3xl font-semibold tracking-tight">{value}</div>
    </div>;
}