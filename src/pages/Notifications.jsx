import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bell, GitCommit, GitPullRequest, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { useAnalyzedRepos } from "@/hooks/useStore";
import { fetchCommits, fetchIssues, fetchPulls, fetchRepo } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import { timeAgo, cn } from "@/lib/utils";
const kindStyle = {
  commit: {
    icon: GitCommit,
    color: "text-olive-dark bg-olive/10 border-olive/30",
    label: "commit"
  },
  pr: {
    icon: GitPullRequest,
    color: "text-charcoal bg-gold/10 border-gold/40",
    label: "PR"
  },
  issue: {
    icon: AlertCircle,
    color: "text-destructive bg-destructive/10 border-destructive/30",
    label: "issue"
  }
};
export default function Notifications() {
  const {
    repos,
    loading: reposLoading
  } = useAnalyzedRepos();
  const top = repos.slice(0, 3);
  const feed = useAsync(async () => {
    if (top.length === 0) return [];
    const out = [];
    await Promise.all(top.map(async r => {
      try {
        const full = await fetchRepo(r.owner, r.name);
        const [commits, pulls, issues] = await Promise.all([fetchCommits(r.owner, r.name, full.default_branch).catch(() => []), fetchPulls(r.owner, r.name).catch(() => []), fetchIssues(r.owner, r.name).catch(() => [])]);
        commits.slice(0, 4).forEach(c => {
          out.push({
            id: `c:${r.id}:${c.sha}`,
            kind: "commit",
            repoId: r.id,
            repoName: r.fullName,
            title: c.commit.message.split("\n")[0],
            actor: c.author?.login ?? c.commit.author.name,
            avatar: c.author?.avatar_url,
            url: c.html_url,
            time: c.commit.author.date
          });
        });
        pulls.slice(0, 3).forEach(p => {
          out.push({
            id: `p:${r.id}:${p.id}`,
            kind: "pr",
            repoId: r.id,
            repoName: r.fullName,
            title: `#${p.number} · ${p.title}`,
            actor: p.user?.login,
            avatar: p.user?.avatar_url,
            url: p.html_url,
            time: p.created_at
          });
        });
        issues.filter(i => !("pull_request" in i && i.pull_request)).slice(0, 3).forEach(i => {
          out.push({
            id: `i:${r.id}:${i.id}`,
            kind: "issue",
            repoId: r.id,
            repoName: r.fullName,
            title: `#${i.number} · ${i.title}`,
            actor: i.user?.login,
            avatar: i.user?.avatar_url,
            url: i.html_url,
            time: i.created_at
          });
        });
      } catch {/* ignore */}
    }));
    out.sort((a, b) => a.time < b.time ? 1 : -1);
    return out;
  }, [repos.map(r => r.id).join(",")]);
  const grouped = useMemo(() => {
    const acc = {};
    (feed.data ?? []).forEach(n => {
      const key = new Date(n.time).toDateString();
      (acc[key] ??= []).push(n);
    });
    return Object.entries(acc);
  }, [feed.data]);
  return <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Notifications</div>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Live activity across your repos</h1>
          <p className="text-sm text-muted-foreground">
            Aggregated commits, pull requests, and open issues from your first three tracked repositories.
          </p>
        </div>
        {feed.data && feed.data.length > 0 && <div className="flex items-center gap-2 rounded-full border border-olive/40 bg-olive/10 px-3 py-1.5 font-mono text-[11px] text-olive-dark">
            <CheckCircle2 className="h-3.5 w-3.5" /> {feed.data.length} events synced
          </div>}
      </div>

      {reposLoading ? <div className="h-64 animate-pulse rounded-2xl bg-cream-deep" /> : repos.length === 0 ? <div className="glass flex flex-col items-center rounded-3xl p-12 text-center">
          <Bell className="h-8 w-8 text-olive" />
          <div className="mt-3 font-serif text-2xl">Nothing to notify yet</div>
          <div className="mt-1 text-sm text-muted-foreground">Analyze a repository to start receiving live events.</div>
          <Link to="/app" className="btn-primary mt-5">Go to dashboard</Link>
        </div> : feed.loading ? <div className="h-64 animate-pulse rounded-2xl bg-cream-deep" /> : grouped.length === 0 ? <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">No recent activity.</div> : <div className="space-y-6">
          {grouped.map(([day, items]) => <section key={day}>
              <div className="mb-2 px-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{day}</div>
              <ul className="space-y-2">
                {items.map(n => {
            const s = kindStyle[n.kind];
            const Icon = s.icon;
            return <li key={n.id} className="glass flex items-start gap-3 rounded-2xl p-4">
                      <div className={cn("mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border", s.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Link to={`/app/repo/${n.repoId}`} className="font-mono text-[11px] text-olive-dark hover:underline">
                            {n.repoName}
                          </Link>
                          <span>·</span>
                          <span className="rounded-full border border-current/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest">{s.label}</span>
                          <span>·</span>
                          <span>{timeAgo(n.time)}</span>
                        </div>
                        <div className="mt-1 line-clamp-2 font-serif text-base">{n.title}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {n.avatar && <img src={n.avatar} alt={n.actor} className="h-4 w-4 rounded-full" />}
                          {n.actor}
                        </div>
                      </div>
                      <a href={n.url} target="_blank" rel="noreferrer" className="btn-ghost !py-1.5 !px-3 text-xs">
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>;
          })}
              </ul>
            </section>)}
        </div>}
    </div>;
}