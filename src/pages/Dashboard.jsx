import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Github, Sparkles, Trash2, GitBranch, Star, Users2, FolderGit2 } from "lucide-react";
import RepoCard from "@/components/features/RepoCard";
import { useAnalyzedRepos } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { upsertRepo, removeRepo } from "@/lib/store";
import { fetchRepo, idOf, parseGithubUrl } from "@/lib/github";
import { formatNumber } from "@/lib/utils";
export default function Dashboard() {
  const {
    repos,
    loading
  } = useAnalyzedRepos();
  const {
    user
  } = useAuth();
  const nav = useNavigate();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const totalStars = repos.reduce((a, r) => a + (r.stars ?? 0), 0);
  const uniqueOwners = new Set(repos.map(r => r.owner)).size;
  const uniqueLanguages = new Set(repos.map(r => r.language).filter(Boolean)).size;
  const analyze = async () => {
    const parsed = parseGithubUrl(url);
    if (!parsed) return toast.error("Enter a valid GitHub repository URL");
    setBusy(true);
    try {
      const r = await fetchRepo(parsed.owner, parsed.name);
      await upsertRepo({
        id: idOf(r.owner.login, r.name),
        owner: r.owner.login,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        language: r.language,
        ownerAvatar: r.owner.avatar_url,
        stars: r.stargazers_count,
        addedAt: new Date().toISOString()
      });
      setUrl("");
      toast.success("Repository added", {
        description: r.full_name
      });
      nav(`/app/repo/${idOf(r.owner.login, r.name)}`);
    } catch (e) {
      toast.error("Failed to add repository", {
        description: e.message
      });
    } finally {
      setBusy(false);
    }
  };
  const remove = async r => {
    try {
      await removeRepo(r.id);
      toast.success("Removed", {
        description: r.fullName
      });
    } catch (e) {
      toast.error("Delete failed", {
        description: e.message
      });
    }
  };
  return <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Workspace overview</div>
          <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight">
            {user ? `Welcome, ${user.username.split(" ")[0]}.` : "Welcome."}
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            {repos.length === 0 ? "Analyze your first GitHub repository below to get started." : `Managing ${repos.length} indexed ${repos.length === 1 ? "repository" : "repositories"} in MongoDB.`}
          </p>
        </div>
      </div>

      <div className="glass flex flex-col gap-2 rounded-2xl p-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-cream px-3 py-2">
          <Github className="h-4 w-4 text-muted-foreground" />
          <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => {
          if (e.key === "Enter") analyze();
        }} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Paste a GitHub URL: https://github.com/owner/repo" />
        </div>
        <button className="btn-primary" onClick={analyze} disabled={busy}>
          {busy ? "Fetching…" : "Analyze repo"}
          <Sparkles className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock label="Repositories" value={String(repos.length)} icon={FolderGit2} />
        <StatBlock label="Aggregate stars" value={formatNumber(totalStars)} icon={Star} />
        <StatBlock label="Distinct owners" value={String(uniqueOwners)} icon={Users2} />
        <StatBlock label="Languages tracked" value={String(uniqueLanguages)} icon={GitBranch} />
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Your repositories</h2>
            <p className="text-sm text-muted-foreground">
              Synced to MongoDB · GitHub metadata fetched live
            </p>
          </div>
          {repos.length > 0 && <Link to="/app/settings" className="btn-ghost !py-2 !px-4">
              Manage <ArrowRight className="h-4 w-4" />
            </Link>}
        </div>

        {loading ? <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass h-48 animate-pulse rounded-2xl" />
            <div className="glass h-48 animate-pulse rounded-2xl" />
          </div> : repos.length === 0 ? <EmptyState onTry={s => setUrl(`https://github.com/${s}`)} /> : <div className="grid gap-4 sm:grid-cols-2">
            {repos.map((r, i) => <div key={r.id} className="relative group">
                <RepoCard repo={r} featured={i === 0} />
                <button onClick={e => {
            e.preventDefault();
            remove(r);
          }} className="absolute right-3 top-3 rounded-full border border-border/70 bg-cream/80 p-1.5 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100" aria-label="Remove">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>)}
          </div>}
      </section>
    </div>;
}
function StatBlock({
  label,
  value,
  icon: Icon
}) {
  return <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-olive" />
      </div>
      <div className="mt-2 font-serif text-3xl font-semibold tracking-tight">{value}</div>
    </div>;
}
function EmptyState({
  onTry
}) {
  return <div className="glass flex flex-col items-center rounded-3xl p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-olive/15 text-olive-dark">
        <FolderGit2 className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-serif text-2xl font-semibold tracking-tight">No repositories yet</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Paste any GitHub repository URL above to fetch live metadata, generate AI insights, and start chatting with the codebase.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
        <span>Try:</span>
        {["vercel/next.js", "facebook/react", "microsoft/vscode", "torvalds/linux"].map(s => <button key={s} onClick={() => onTry(s)} className="rounded-full border border-border/70 bg-cream-deep/50 px-3 py-1.5 hover:bg-cream-deep">
            {s}
          </button>)}
      </div>
    </div>;
}