import { useState } from "react";
import { useParams } from "react-router-dom";
import { Wrench, ExternalLink, RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchRepo, fetchTree, parseId } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import { aiDebt } from "@/lib/api";
import { formatBytes, cn } from "@/lib/utils";
const impactStyles = {
  high: "border-destructive/40 bg-destructive/10 text-destructive",
  medium: "border-gold/40 bg-gold/10 text-charcoal",
  low: "border-olive/40 bg-olive/10 text-olive-dark"
};
export default function TechnicalDebt() {
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
  const runAi = async () => {
    setAiLoading(true);
    try {
      const r = await aiDebt(id);
      setAiReport(r);
      toast.success(`Debt analysis complete · health ${r.score}`);
    } catch (e) {
      toast.error("Debt analysis failed", {
        description: e.message
      });
    } finally {
      setAiLoading(false);
    }
  };
  const heuristic = detectDebt(treeQ.data?.tree ?? []);
  return <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Technical debt</div>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
            Cleanup signals · {repoQ.data?.full_name ?? `${owner}/${name}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            Structural signals from the tree, plus AI-driven cleanup roadmap.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost !py-2 !px-3" onClick={() => treeQ.refetch()}>
            <RefreshCw className="h-4 w-4" /> Re-scan
          </button>
          <button className="btn-primary" onClick={runAi} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {aiLoading ? "Analyzing…" : aiReport ? "Re-run AI" : "Generate AI cleanup plan"}
          </button>
        </div>
      </div>

      {aiReport && <div className="glass rounded-3xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-olive">AI debt report</div>
              <h3 className="mt-2 font-serif text-2xl font-semibold tracking-tight">
                Health score · {aiReport.score} / 100
              </h3>
            </div>
          </div>
          <ul className="mt-5 space-y-3">
            {aiReport.items.map((it, i) => <li key={i} className="rounded-2xl border border-border/70 bg-cream/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-soft"><Wrench className="h-3 w-3 text-olive" /> {it.category}</span>
                  <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest", impactStyles[it.severity])}>
                    {it.severity}
                  </span>
                  <h4 className="font-serif text-base font-semibold">{it.title}</h4>
                </div>
                <p className="mt-2 text-sm">{it.detail}</p>
                {it.path && <div className="mt-1 font-mono text-xs text-muted-foreground">{it.path}</div>}
                <div className="mt-2 rounded-xl border border-olive/30 bg-olive/10 p-2 text-sm text-olive-dark">
                  <span className="font-semibold">Cleanup:</span> {it.cleanup}
                </div>
              </li>)}
          </ul>
          {aiReport.roadmap.length > 0 && <div className="mt-4 rounded-2xl border border-border/70 bg-cream/70 p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Cleanup roadmap</div>
              <ol className="mt-2 list-decimal pl-6 text-sm space-y-1">
                {aiReport.roadmap.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>}
        </div>}

      <div className="glass rounded-2xl p-6">
        <h3 className="mb-3 font-serif text-lg font-semibold tracking-tight">Structural heuristics</h3>
        {treeQ.loading ? <div className="h-40 animate-pulse rounded-xl bg-cream-deep" /> : heuristic.length === 0 ? <div className="rounded-2xl border border-olive/40 bg-olive/10 p-6 text-sm text-olive-dark">
            No structural debt signals detected.
          </div> : <ul className="space-y-3">
            {heuristic.map(d => <li key={d.id} className="rounded-2xl border border-border/70 bg-cream/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge-soft"><Wrench className="h-3 w-3 text-olive" /> {d.kind}</span>
                      <h4 className="font-serif text-base font-semibold">{d.title}</h4>
                    </div>
                    <p className="mt-1 text-sm text-foreground/75">{d.detail}</p>
                    <div className="mt-2 font-mono text-xs text-muted-foreground">{d.file}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase", impactStyles[d.impact])}>
                      {d.impact} impact
                    </span>
                    {repoQ.data && <a href={`${repoQ.data.html_url}/blob/${repoQ.data.default_branch}/${d.file}`} target="_blank" rel="noreferrer" className="btn-ghost !py-1.5 !px-3">
                        View <ExternalLink className="h-3 w-3" />
                      </a>}
                  </div>
                </div>
              </li>)}
          </ul>}
      </div>
    </div>;
}
function detectDebt(tree) {
  const items = [];
  const paths = tree.map(t => t.path);
  const has = rx => paths.some(p => rx.test(p));
  if (!has(/^README(\.md)?$/i)) items.push({
    id: "no-readme",
    kind: "Missing docs",
    title: "No README file",
    file: "README.md",
    impact: "high",
    detail: "Onboarding is 2-3x harder without a README."
  });
  if (!has(/^LICENSE(\.[a-z]+)?$/i)) items.push({
    id: "no-license",
    kind: "Governance",
    title: "No LICENSE file",
    file: "LICENSE",
    impact: "medium",
    detail: "Unlicensed code defaults to restrictive copyright."
  });
  if (!has(/^CONTRIBUTING(\.md)?$/i)) items.push({
    id: "no-contributing",
    kind: "Governance",
    title: "No CONTRIBUTING guide",
    file: "CONTRIBUTING.md",
    impact: "low",
    detail: "No formal contribution path."
  });
  if (!has(/^\.github\/workflows\//i)) items.push({
    id: "no-ci",
    kind: "CI/CD",
    title: "No GitHub Actions workflows",
    file: ".github/workflows/",
    impact: "medium",
    detail: "No automated CI configured."
  });
  if (!has(/(^|\/)(tests?|__tests__|spec|e2e)(\/|$)/i)) items.push({
    id: "no-tests",
    kind: "Testing",
    title: "No dedicated tests directory",
    file: "tests/",
    impact: "high",
    detail: "No conventional test folder found."
  });
  const large = tree.filter(t => t.type === "blob" && typeof t.size === "number" && t.size > 150_000 && /\.(ts|tsx|js|jsx|py|go|rs|java|rb|php|c|cpp|cs|kt|swift)$/i.test(t.path)).sort((a, b) => (b.size ?? 0) - (a.size ?? 0)).slice(0, 5);
  for (const f of large) {
    items.push({
      id: `large::${f.path}`,
      kind: "Large file",
      title: "Very large source file",
      file: f.path,
      impact: (f.size ?? 0) > 400_000 ? "high" : "medium",
      detail: `File weighs ${formatBytes(f.size ?? 0)} — likely a candidate to split up.`
    });
  }
  return items;
}