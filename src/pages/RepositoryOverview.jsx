import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Star, GitFork, CircleAlert, Eye, GitPullRequest, ArrowRight, Network, MessagesSquare, BookOpenText, ShieldCheck, FolderTree, FileCode2, Rocket, ExternalLink, Calendar, Scale, Sparkles, Loader2, Gauge, Search as SearchIcon } from "lucide-react";
import IngestBanner from "@/components/features/IngestBanner";
import { toast } from "sonner";
import { colorForLang, fetchLanguages, fetchPulls, fetchRepo, fetchTree, parseId } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import { aiSummary } from "@/lib/api";
import { computeLanguagePercents, formatBytes, formatNumber, timeAgo } from "@/lib/utils";
const ENTRY_HINTS = ["src/main.tsx", "src/main.ts", "src/index.tsx", "src/index.ts", "src/App.tsx", "index.js", "index.ts", "main.py", "app.py", "server.js", "cmd/main.go", "main.go", "Cargo.toml", "Package.swift", "pom.xml", "build.gradle", "package.json"];
export default function RepositoryOverview() {
  const {
    id = ""
  } = useParams();
  const {
    owner,
    name
  } = parseId(id);
  const repoQ = useAsync(() => fetchRepo(owner, name), [owner, name]);
  const langQ = useAsync(() => fetchLanguages(owner, name), [owner, name]);
  const treeQ = useAsync(async () => {
    const r = await fetchRepo(owner, name);
    return fetchTree(owner, name, r.default_branch);
  }, [owner, name]);
  const pullsQ = useAsync(() => fetchPulls(owner, name), [owner, name]);
  const [summary, setSummary] = useState(null);
  const [sumLoading, setSumLoading] = useState(false);
  const runSummary = async () => {
    setSumLoading(true);
    try {
      const s = await aiSummary(id);
      setSummary(s);
      toast.success("AI summary generated");
    } catch (e) {
      toast.error("Summary failed", {
        description: e.message
      });
    } finally {
      setSumLoading(false);
    }
  };
  if (repoQ.loading) return <PageSkeleton />;
  if (repoQ.error || !repoQ.data) return <ErrorState message={repoQ.error ?? "Repository not found"} />;
  const repo = repoQ.data;
  const langs = langQ.data ? computeLanguagePercents(langQ.data) : [];
  const tree = treeQ.data?.tree ?? [];
  const topLevel = groupByTopLevel(tree);
  const entryPoints = tree.filter(t => t.type === "blob" && ENTRY_HINTS.some(h => t.path.endsWith(h))).slice(0, 5);
  return <div className="space-y-8">
      <div className="glass rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-olive">
              <img src={repo.owner.avatar_url} alt={repo.owner.login} className="h-4 w-4 rounded-full" />
              {repo.owner.login} · {repo.license?.spdx_id ?? "No license"}
            </div>
            <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{repo.name}</h1>
            <p className="mt-2 max-w-2xl text-foreground/75">{repo.description ?? "No description provided."}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {repo.topics.slice(0, 10).map(t => <span key={t} className="badge-soft">#{t}</span>)}
              {repo.archived && <span className="badge-soft">archived</span>}
              {repo.private && <span className="badge-soft">private</span>}
              <a href={repo.html_url} target="_blank" rel="noreferrer" className="badge-soft hover:border-olive/50">
                <ExternalLink className="h-3 w-3" /> Open on GitHub
              </a>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 sm:min-w-[420px]">
            <IconMetric icon={Star} label="Stars" value={formatNumber(repo.stargazers_count)} />
            <IconMetric icon={GitFork} label="Forks" value={formatNumber(repo.forks_count)} />
            <IconMetric icon={CircleAlert} label="Issues" value={formatNumber(repo.open_issues_count)} />
            <IconMetric icon={Eye} label="Watchers" value={formatNumber(repo.watchers_count)} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link to={`/app/repo/${id}/health`} className="btn-primary">
            <Gauge className="h-4 w-4" /> Health Score
          </Link>
          <Link to={`/app/repo/${id}/chat`} className="btn-ghost">
            <MessagesSquare className="h-4 w-4" /> AI chat
          </Link>
          <Link to={`/app/repo/${id}/search`} className="btn-ghost">
            <SearchIcon className="h-4 w-4" /> Smart Search
          </Link>
          <Link to={`/app/repo/${id}/architecture`} className="btn-ghost">
            <Network className="h-4 w-4" /> Architecture
          </Link>
          <Link to={`/app/repo/${id}/docs`} className="btn-ghost">
            <BookOpenText className="h-4 w-4" /> Documentation
          </Link>
          <Link to={`/app/repo/${id}/security`} className="btn-ghost">
            <ShieldCheck className="h-4 w-4" /> Security
          </Link>
          <button onClick={runSummary} disabled={sumLoading} className="btn-gold">
            {sumLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {summary ? "Regenerate AI summary" : "AI summarize"}
          </button>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            Updated {timeAgo(repo.pushed_at)}
          </span>
        </div>
      </div>

      <IngestBanner repoId={id} />

      {summary && <div className="glass rounded-3xl p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-olive">AI architecture summary</div>
          <p className="mt-3 font-serif text-lg leading-relaxed">{summary.elevator_pitch}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Primary stack</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {summary.primary_stack.map(t => <span key={t} className="badge-soft">{t}</span>)}
              </div>
              <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Patterns detected</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {summary.patterns.map(t => <span key={t} className="badge-soft">{t}</span>)}
              </div>
              <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Data flow</div>
              <p className="mt-2 text-sm">{summary.data_flow}</p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Modules</div>
              <ul className="mt-2 space-y-2">
                {summary.modules.slice(0, 6).map(m => <li key={m.name} className="rounded-xl border border-border/70 bg-cream/70 p-3 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-semibold">{m.name}</div>
                      <span className="font-mono text-[11px] text-olive-dark">{m.path}</span>
                    </div>
                    <div className="mt-1 text-muted-foreground">{m.purpose}</div>
                  </li>)}
              </ul>
              {summary.onboarding_first_files.length > 0 && <>
                  <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Start here</div>
                  <ul className="mt-2 space-y-1 font-mono text-xs">
                    {summary.onboarding_first_files.map(f => <li key={f} className="rounded-lg border border-border/70 bg-cream-deep/40 px-2 py-1">{f}</li>)}
                  </ul>
                </>}
              {summary.risks.length > 0 && <>
                  <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Risks</div>
                  <ul className="mt-2 list-disc pl-6 text-sm">
                    {summary.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </>}
            </div>
          </div>
        </div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetaCard icon={Calendar} label="Created" value={new Date(repo.created_at).toLocaleDateString()} />
        <MetaCard icon={Rocket} label="Default branch" value={repo.default_branch} mono />
        <MetaCard icon={FileCode2} label="Primary language" value={repo.language ?? "—"} />
        <MetaCard icon={Scale} label="License" value={repo.license?.name ?? "Unlicensed"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-xl font-semibold tracking-tight">Repository intelligence</h3>
              <p className="text-xs text-muted-foreground">Languages · Entry points · via GitHub Linguist</p>
            </div>
            <Link to={`/app/repo/${id}/architecture`} className="text-xs font-medium text-olive-dark hover:underline">See system map →</Link>
          </div>

          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Languages</div>
            {langQ.loading ? <SkeletonBar /> : langs.length === 0 ? <div className="text-sm text-muted-foreground">No language data available.</div> : <>
                <div className="flex h-2 overflow-hidden rounded-full">
                  {langs.map(l => <span key={l.name} style={{
                width: `${l.percent}%`,
                background: colorForLang(l.name)
              }} />)}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {langs.slice(0, 8).map(l => <div key={l.name} className="flex items-center justify-between rounded-xl border border-border/70 bg-cream-deep/40 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{
                    background: colorForLang(l.name)
                  }} />
                        <span>{l.name}</span>
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{l.percent}%</span>
                    </div>)}
                </div>
              </>}
          </div>

          <div className="mt-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Detected entry points</div>
            {treeQ.loading ? <SkeletonBar /> : entryPoints.length === 0 ? <div className="text-sm text-muted-foreground">No conventional entry files detected.</div> : <ul className="space-y-2">
                {entryPoints.map(e => <li key={e.path} className="flex items-center gap-2 rounded-xl border border-border/70 bg-cream-deep/40 px-3 py-2 text-sm">
                    <Rocket className="h-3.5 w-3.5 text-olive" />
                    <span className="font-mono text-xs">{e.path}</span>
                    {e.size !== undefined && <span className="ml-auto font-mono text-[10px] text-muted-foreground">{formatBytes(e.size)}</span>}
                  </li>)}
              </ul>}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-xl font-semibold tracking-tight">Repository explorer</h3>
              <p className="text-xs text-muted-foreground">Live git tree · top-level directories</p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{topLevel.length} roots</span>
          </div>

          {treeQ.loading ? <SkeletonBar /> : <div className="space-y-2">
              {topLevel.map(n => <div key={n.path} className="flex items-center justify-between rounded-xl border border-border/70 bg-cream-deep/40 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    {n.isDir ? <FolderTree className="h-4 w-4 text-olive" /> : <FileCode2 className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-mono">{n.path}{n.isDir ? "/" : ""}</span>
                    {n.isDir && <span className="text-xs text-muted-foreground">· {n.count} entries</span>}
                  </span>
                  <ImportanceBar value={n.importance} />
                </div>)}
              {treeQ.data?.truncated && <div className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-[11px] text-charcoal">
                  Note: git tree was truncated by GitHub (very large repo).
                </div>}
            </div>}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-semibold tracking-tight">Open pull requests</h3>
            <p className="text-xs text-muted-foreground">Live from GitHub · updated {timeAgo(repo.pushed_at)}</p>
          </div>
          <Link to={`/app/repo/${id}/pulls`} className="btn-ghost !py-1.5 !px-3 text-xs">
            View intelligence <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {pullsQ.loading ? <SkeletonBar /> : pullsQ.error ? <div className="text-sm text-muted-foreground">Failed to load PRs.</div> : (pullsQ.data ?? []).length === 0 ? <div className="text-sm text-muted-foreground">No open pull requests.</div> : <ul className="space-y-3">
            {pullsQ.data.map(p => <li key={p.id} className="flex items-start gap-3 rounded-xl border border-border/70 bg-cream-deep/40 p-3">
                <GitPullRequest className="mt-0.5 h-4 w-4 text-olive" />
                <div className="min-w-0 flex-1">
                  <a href={p.html_url} target="_blank" rel="noreferrer" className="line-clamp-1 text-sm font-medium hover:underline">
                    #{p.number} · {p.title}
                  </a>
                  <div className="mt-1 flex items-center text-xs text-muted-foreground">
                    <span className="font-mono">@{p.user?.login ?? "unknown"}</span>
                    <span className="divider-dot" />
                    <span>opened {timeAgo(p.created_at)}</span>
                    {p.draft && <><span className="divider-dot" /><span>draft</span></>}
                  </div>
                </div>
                <a href={p.html_url} target="_blank" rel="noreferrer" className="btn-ghost !py-1.5 !px-3">
                  Open <ArrowRight className="h-3 w-3" />
                </a>
              </li>)}
          </ul>}
      </div>
    </div>;
}
function groupByTopLevel(tree) {
  const roots = new Map();
  for (const t of tree) {
    const top = t.path.split("/")[0];
    if (!top) continue;
    const cur = roots.get(top);
    const isDir = t.path.includes("/") || t.type === "tree";
    if (!cur) roots.set(top, {
      path: top,
      isDir,
      count: isDir ? 1 : 0,
      importance: 0
    });else if (isDir) cur.count++;
  }
  const arr = Array.from(roots.values());
  const max = Math.max(1, ...arr.map(r => r.count));
  return arr.map(r => ({
    ...r,
    importance: Math.round(r.count / max * 100)
  })).sort((a, b) => b.count - a.count);
}
function ImportanceBar({
  value
}) {
  return <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-cream">
        <span className="block h-full rounded-full bg-olive" style={{
        width: `${value}%`
      }} />
      </div>
      <span className="font-mono text-[10px] text-muted-foreground">{value}</span>
    </div>;
}
function IconMetric({
  icon: Icon,
  label,
  value
}) {
  return <div className="rounded-2xl border border-border/70 bg-cream-deep/50 px-3 py-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <div className="mt-1 font-serif text-xl font-semibold tracking-tight">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>;
}
function MetaCard({
  icon: Icon,
  label,
  value,
  mono
}) {
  return <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-olive" />
      </div>
      <div className={`mt-2 truncate ${mono ? "font-mono text-lg" : "font-serif text-xl font-semibold"}`}>{value}</div>
    </div>;
}
function SkeletonBar() {
  return <div className="animate-pulse space-y-2">
      <div className="h-3 w-full rounded bg-cream-deep" />
      <div className="h-3 w-3/4 rounded bg-cream-deep" />
      <div className="h-3 w-5/6 rounded bg-cream-deep" />
    </div>;
}
function PageSkeleton() {
  return <div className="space-y-6">
      <div className="glass h-40 animate-pulse rounded-3xl" />
      <div className="glass h-56 animate-pulse rounded-2xl" />
    </div>;
}
function ErrorState({
  message
}) {
  return <div className="glass rounded-3xl p-10 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-destructive">Load error</div>
      <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Could not load repository</h2>
      <p className="mt-2 text-muted-foreground">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Tip: add a GitHub token in Settings to raise the API rate limit and access private repos.
      </p>
    </div>;
}