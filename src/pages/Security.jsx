import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldAlert, ShieldCheck, FileCode2, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchRepo, fetchTree, parseId } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import { aiSecurity } from "@/lib/api";
import { cn } from "@/lib/utils";
const sevStyle = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  high: "border-destructive/30 bg-destructive/5 text-destructive",
  medium: "border-gold/40 bg-gold/10 text-charcoal",
  low: "border-olive/40 bg-olive/10 text-olive-dark",
  info: "border-border/70 bg-cream-deep/40 text-foreground"
};
const RULES = [{
  id: "env-committed",
  test: /(^|\/)\.env(?!\.example|\.sample|\.template)/i,
  severity: "critical",
  category: "Secret",
  title: "Environment file committed",
  description: "A .env file is present in the tree."
}, {
  id: "pem-key",
  test: /\.(pem|p12|pfx|key|jks|keystore)$/i,
  severity: "critical",
  category: "Secret",
  title: "Private key material committed",
  description: "Cryptographic key file detected."
}, {
  id: "aws-creds",
  test: /(^|\/)(aws|credentials|\.aws\/credentials)$/i,
  severity: "high",
  category: "Secret",
  title: "Potential AWS credentials file",
  description: "Matches AWS credential storage."
}, {
  id: "id-rsa",
  test: /(^|\/)id_(rsa|ed25519|ecdsa|dsa)(\.|$)/,
  severity: "critical",
  category: "Secret",
  title: "SSH private key committed",
  description: "SSH private key material appears tracked."
}, {
  id: "sqlite-db",
  test: /\.(sqlite3?|db)$/i,
  severity: "medium",
  category: "Data",
  title: "Local database file committed",
  description: "May contain user data."
}];
export default function Security() {
  const {
    id = ""
  } = useParams();
  const {
    owner,
    name
  } = parseId(id);
  const repoQ = useAsync(() => fetchRepo(owner, name), [owner, name]);
  const treeQ = useAsync(async () => {
    const r = await fetchRepo(owner, name);
    return fetchTree(owner, name, r.default_branch);
  }, [owner, name]);
  const [aiReport, setAiReport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const heuristicFindings = useMemo(() => {
    const tree = treeQ.data?.tree ?? [];
    const out = [];
    for (const t of tree) {
      if (t.type !== "blob") continue;
      for (const rule of RULES) {
        if (rule.test.test(t.path)) {
          out.push({
            id: `${rule.id}::${t.path}`,
            ...rule,
            file: t.path
          });
        }
      }
    }
    return out;
  }, [treeQ.data]);
  const runAiScan = async () => {
    setAiLoading(true);
    try {
      const report = await aiSecurity(id);
      setAiReport(report);
      toast.success(`AI scan complete · score ${report.score}`);
    } catch (e) {
      toast.error("AI scan failed", {
        description: e.message
      });
    } finally {
      setAiLoading(false);
    }
  };
  const counts = {
    critical: heuristicFindings.filter(f => f.severity === "critical").length,
    high: heuristicFindings.filter(f => f.severity === "high").length,
    medium: heuristicFindings.filter(f => f.severity === "medium").length,
    low: heuristicFindings.filter(f => f.severity === "low").length
  };
  return <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Security analyzer</div>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
            Security posture · {repoQ.data?.full_name ?? `${owner}/${name}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            Instant heuristic scan of the tree plus AI-powered semantic analysis.
          </p>
        </div>
        <button className="btn-primary" onClick={runAiScan} disabled={aiLoading}>
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {aiLoading ? "Analyzing…" : aiReport ? "Re-run AI scan" : "Run AI security scan"}
        </button>
      </div>

      {aiReport && <div className="glass rounded-3xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-olive">AI security report</div>
              <p className="mt-2 max-w-3xl font-serif text-lg leading-relaxed">{aiReport.summary}</p>
            </div>
            <div className="rounded-2xl border border-olive/40 bg-olive/10 px-6 py-4 text-center">
              <div className="font-mono text-[10px] uppercase tracking-widest text-olive-dark">Safety score</div>
              <div className="mt-1 font-serif text-4xl font-semibold text-olive-dark">{aiReport.score}</div>
              <div className="font-mono text-[10px] text-muted-foreground">/ 100</div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {aiReport.findings.map((f, i) => <div key={i} className={cn("rounded-2xl border p-4", sevStyle[f.severity])}>
                <div className="flex flex-wrap items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  <div className="font-serif text-base font-semibold">{f.title}</div>
                  <span className="ml-auto rounded-full border border-current/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest">
                    {f.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm">{f.detail}</p>
                {f.evidence && <div className="mt-2 font-mono text-[11px] opacity-80">Evidence: {f.evidence}</div>}
                {f.recommendation && <div className="mt-2 rounded-xl border border-current/20 bg-cream/40 p-2 text-sm">
                    <span className="font-semibold">Fix:</span> {f.recommendation}
                  </div>}
              </div>)}
          </div>

          {aiReport.next_steps.length > 0 && <div className="mt-4 rounded-2xl border border-border/70 bg-cream/70 p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recommended next steps</div>
              <ul className="mt-2 list-disc pl-6 text-sm">
                {aiReport.next_steps.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>}
        </div>}

      <div>
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Heuristic tree scan</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SevCard label="Critical" value={counts.critical} tone="critical" />
          <SevCard label="High" value={counts.high} tone="high" />
          <SevCard label="Medium" value={counts.medium} tone="medium" />
          <SevCard label="Low" value={counts.low} tone="low" />
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        {treeQ.loading ? <div className="h-40 animate-pulse rounded-xl bg-cream-deep" /> : heuristicFindings.length === 0 ? <div className="flex items-center gap-3 rounded-2xl border border-olive/40 bg-olive/10 p-6">
            <ShieldCheck className="h-8 w-8 text-olive-dark" />
            <div>
              <div className="font-serif text-lg font-semibold text-olive-dark">No obvious risks in the tree.</div>
              <div className="text-sm text-foreground/75">Run the AI scan for deeper semantic analysis.</div>
            </div>
          </div> : <ul className="space-y-3">
            {heuristicFindings.sort((a, b) => {
          const order = ["critical", "high", "medium", "low", "info"];
          return order.indexOf(a.severity) - order.indexOf(b.severity);
        }).map(f => <li key={f.id} className="rounded-2xl border border-border/70 bg-cream/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-1 flex h-9 w-9 items-center justify-center rounded-full", sevStyle[f.severity])}>
                        <ShieldAlert className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-serif text-base font-semibold">{f.title}</h4>
                          <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest", sevStyle[f.severity])}>
                            {f.severity}
                          </span>
                          <span className="badge-soft">{f.category}</span>
                        </div>
                        <p className="mt-1 text-sm text-foreground/75">{f.description}</p>
                        <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/70 bg-cream-deep/40 px-3 py-1.5 font-mono text-xs">
                          <FileCode2 className="h-3.5 w-3.5 text-olive" />
                          {f.file}
                        </div>
                      </div>
                    </div>
                    {repoQ.data && <a href={`${repoQ.data.html_url}/blob/${repoQ.data.default_branch}/${f.file}`} target="_blank" rel="noreferrer" className="btn-ghost !py-2 !px-3">
                        View <ExternalLink className="h-3 w-3" />
                      </a>}
                  </div>
                </li>)}
          </ul>}
      </div>
    </div>;
}
function SevCard({
  label,
  value,
  tone
}) {
  return <div className={cn("rounded-2xl border p-5", sevStyle[tone])}>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em]">{label}</div>
      <div className="mt-1 font-serif text-4xl font-semibold tracking-tight">{value}</div>
      <div className="font-mono text-[10px] opacity-70">findings</div>
    </div>;
}