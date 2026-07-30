import { useState } from "react";
import { useParams } from "react-router-dom";
import { Compass, CheckCircle2, Circle, ExternalLink, Tag, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchIssues, fetchRepo, parseId } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import { aiRoadmap } from "@/lib/api";
import { timeAgo, cn } from "@/lib/utils";
export default function LearningRoadmap() {
  const {
    id = ""
  } = useParams();
  const {
    owner,
    name
  } = parseId(id);
  const repoQ = useAsync(() => fetchRepo(owner, name), [owner, name]);
  const gfiQ = useAsync(() => fetchIssues(owner, name, "good first issue"), [owner, name]);
  const helpQ = useAsync(() => fetchIssues(owner, name, "help wanted"), [owner, name]);
  const [level, setLevel] = useState("Beginner");
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState({});
  const generate = async lv => {
    setLevel(lv);
    setLoading(true);
    setPhases([]);
    try {
      const r = await aiRoadmap(id, lv);
      setPhases(r.phases ?? []);
      toast.success(`${lv} roadmap generated`);
    } catch (e) {
      toast.error("Roadmap failed", {
        description: e.message
      });
    } finally {
      setLoading(false);
    }
  };
  const goodFirst = (gfiQ.data ?? []).filter(i => !("pull_request" in i && i.pull_request));
  const helpWanted = (helpQ.data ?? []).filter(i => !("pull_request" in i && i.pull_request));
  const total = phases.reduce((a, p) => a + p.steps.length, 0);
  const doneCount = Object.values(done).filter(Boolean).length;
  const progress = total === 0 ? 0 : Math.round(doneCount / total * 100);
  return <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">AI learning roadmap</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          Onboarding plan · {repoQ.data?.full_name ?? `${owner}/${name}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          Personalized path grounded in this specific repository, plus live open issues.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr_320px]">
        <aside className="glass h-fit rounded-2xl p-3">
          {["Beginner", "Intermediate", "Advanced", "Contributor"].map(p => <button key={p} onClick={() => generate(p)} disabled={loading} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition", level === p ? "bg-olive/20 font-semibold text-olive-dark ring-1 ring-olive/40" : "hover:bg-cream-deep", loading && level !== p && "opacity-40")}>
              <Compass className="h-4 w-4" /> {p}
            </button>)}
          <div className="mt-3 border-t border-border/70 pt-3">
            <div className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs">
              <div className="font-mono text-[10px] uppercase tracking-widest">Progress</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-deep">
                  <span className="block h-full rounded-full bg-olive" style={{
                  width: `${progress}%`
                }} />
                </div>
                <span className="font-mono text-[11px]">{progress}%</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="glass rounded-2xl p-6">
          {loading ? <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-olive" /> Building your {level} path…
            </div> : phases.length === 0 ? <div className="flex flex-col items-center py-12 text-center">
              <Sparkles className="h-8 w-8 text-olive" />
              <h3 className="mt-3 font-serif text-2xl">Pick a level to generate your roadmap</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Each path cites real files from the repository tree.
              </p>
            </div> : <ol className="space-y-4">
              {phases.map((p, pi) => <li key={pi} className="rounded-2xl border border-border/70 bg-cream/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-olive px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-cream">
                      Phase {pi + 1}
                    </span>
                    <h4 className="font-serif text-xl font-semibold tracking-tight">{p.title}</h4>
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">{p.duration}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground/75">{p.goal}</p>
                  <ol className="mt-3 space-y-2">
                    {p.steps.map((s, si) => {
                const key = `${pi}-${si}`;
                const isDone = !!done[key];
                return <li key={key} onClick={() => setDone(d => ({
                  ...d,
                  [key]: !isDone
                }))} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-cream-deep/40 p-3 transition hover:border-olive/40">
                          {isDone ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-olive" /> : <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                          <div className={cn("flex-1", isDone && "opacity-60 line-through")}>
                            <div className="text-sm font-medium">{s.task}</div>
                            {s.path && <div className="font-mono text-[11px] text-olive-dark">{s.path}</div>}
                            <div className="text-xs text-muted-foreground">{s.why}</div>
                          </div>
                        </li>;
              })}
                  </ol>
                </li>)}
            </ol>}
        </div>

        <aside className="glass h-fit rounded-2xl p-6">
          <h3 className="font-serif text-lg font-semibold tracking-tight">Good first issues</h3>
          <p className="mt-1 text-xs text-muted-foreground">Live from GitHub</p>
          {gfiQ.loading ? <div className="mt-3 h-24 animate-pulse rounded bg-cream-deep" /> : goodFirst.length === 0 ? <div className="mt-3 text-xs text-muted-foreground">
              No open <code className="font-mono">good first issue</code>s.
            </div> : <ul className="mt-3 space-y-2 text-sm">
              {goodFirst.slice(0, 5).map(i => <li key={i.id} className="rounded-lg border border-border/70 bg-cream-deep/40 px-3 py-2">
                  <a href={i.html_url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-2 font-mono text-[12px] hover:underline">
                    <span className="line-clamp-2">#{i.number} · {i.title}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <div className="mt-1 text-[10px] text-muted-foreground">opened {timeAgo(i.created_at)}</div>
                </li>)}
            </ul>}

          <h3 className="mt-6 font-serif text-lg font-semibold tracking-tight">Help wanted</h3>
          {helpQ.loading ? <div className="mt-3 h-24 animate-pulse rounded bg-cream-deep" /> : helpWanted.length === 0 ? <div className="mt-3 text-xs text-muted-foreground">No help-wanted issues open.</div> : <ul className="mt-3 space-y-2 text-sm">
              {helpWanted.slice(0, 4).map(i => <li key={i.id} className="flex items-center gap-2 rounded-lg border border-border/70 bg-cream-deep/40 px-3 py-2 font-mono text-[12px]">
                  <Tag className="h-3 w-3 text-olive" />
                  <a href={i.html_url} target="_blank" rel="noreferrer" className="line-clamp-1 hover:underline">
                    #{i.number} · {i.title}
                  </a>
                </li>)}
            </ul>}
        </aside>
      </div>
    </div>;
}