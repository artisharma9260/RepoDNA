import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { fetchCommits, fetchRepo, parseId } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import { timeAgo } from "@/lib/utils";
import { ExternalLink, GitCommit, History, Zap, Bug, Sparkles } from "lucide-react";
function classifyCommit(msg) {
  const m = msg.toLowerCase();
  if (/^feat|feature[:( ]/.test(m)) return {
    icon: Sparkles,
    label: "feature",
    color: "#6B7A3D"
  };
  if (/^fix|bug[:( ]/.test(m)) return {
    icon: Bug,
    label: "fix",
    color: "#c25b3b"
  };
  if (/^perf/.test(m)) return {
    icon: Zap,
    label: "perf",
    color: "#C9A66B"
  };
  if (/^refactor|^chore|^style|^docs|^test|^ci/.test(m)) return {
    icon: History,
    label: m.split(/[:(]/)[0],
    color: "#8b8b8b"
  };
  return {
    icon: GitCommit,
    label: "commit",
    color: "#4F5A2B"
  };
}
export default function TimeMachine() {
  const {
    id = ""
  } = useParams();
  const {
    owner,
    name
  } = parseId(id);
  const repoQ = useAsync(() => fetchRepo(owner, name), [owner, name]);
  const commitsQ = useAsync(async () => {
    const r = await fetchRepo(owner, name);
    return fetchCommits(owner, name, r.default_branch);
  }, [owner, name]);
  const buckets = useMemo(() => {
    const map = new Map();
    (commitsQ.data ?? []).forEach(c => {
      const d = new Date(c.commit.author.date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a < b ? 1 : -1);
  }, [commitsQ.data]);
  return <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Repository time machine</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          Commit timeline · {repoQ.data?.full_name ?? `${owner}/${name}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          Recent history from the default branch, classified by conventional-commit type.
        </p>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="font-serif text-lg font-semibold tracking-tight">Activity buckets</h3>
        <div className="mt-4 flex items-end gap-2">
          {buckets.length === 0 ? <div className="text-sm text-muted-foreground">No commit data.</div> : buckets.map(([k, v]) => <div key={k} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-md bg-olive/70" style={{
            height: `${Math.min(160, v * 12)}px`
          }} />
                <div className="font-mono text-[10px] text-muted-foreground">{k}</div>
                <div className="font-mono text-[11px]">{v}</div>
              </div>)}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="font-serif text-lg font-semibold tracking-tight">Timeline</h3>
        {commitsQ.loading ? <div className="mt-4 h-40 animate-pulse rounded bg-cream-deep" /> : <ol className="relative mt-5 space-y-4 pl-4">
            <span className="absolute left-1.5 top-1 bottom-1 w-px bg-border" />
            {(commitsQ.data ?? []).map(c => {
          const meta = classifyCommit(c.commit.message);
          const Icon = meta.icon;
          return <li key={c.sha} className="relative">
                  <span className="absolute -left-[15px] top-2 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-cream" style={{
              background: meta.color
            }}>
                    <Icon className="h-2.5 w-2.5 text-cream" />
                  </span>
                  <div className="ml-3 rounded-2xl border border-border/70 bg-cream/70 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{c.sha.slice(0, 7)}</span>
                      <span>·</span>
                      <span>{c.author?.login ?? c.commit.author.name}</span>
                      <span>·</span>
                      <span>{timeAgo(c.commit.author.date)}</span>
                      <span className="ml-auto rounded-full border border-border/70 bg-cream-deep/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest">
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 font-serif text-sm">
                      {c.commit.message.split("\n")[0]}
                    </div>
                    <a href={c.html_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-olive-dark hover:underline">
                      View on GitHub <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </li>;
        })}
          </ol>}
      </div>
    </div>;
}