import { NavLink, Outlet, useLocation, useParams, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, GitBranch, Network, MessagesSquare, BookOpenText, ShieldCheck, Wrench, Compass, Settings as SettingsIcon, Search, Sparkles, Bell, FolderTree, Share2, History, GitPullRequest, Wand2, FlaskConical, MessageSquareQuote, LogOut, Gauge, Building2, Command } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Logo from "@/components/branding/Logo";
import { useAnalyzedRepos } from "@/hooks/useStore";
import { upsertRepo } from "@/lib/store";
import { fetchRepo, idOf, parseGithubUrl } from "@/lib/github";
import { authService } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import CommandPalette from "@/components/features/CommandPalette";
export default function AppShell() {
  const {
    id
  } = useParams();
  const loc = useLocation();
  const {
    user,
    setUser
  } = useAuth();
  const {
    repos
  } = useAnalyzedRepos();
  const repo = repos.find(r => r.id === id);
  const repoScoped = loc.pathname.startsWith("/app/repo/") && !!repo;
  const nav = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKey = e => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const globalNav = [{
    to: "/app",
    icon: LayoutDashboard,
    label: "Overview"
  }, {
    to: "/app/enterprise",
    icon: Building2,
    label: "Enterprise"
  }, {
    to: "/app/notifications",
    icon: Bell,
    label: "Notifications"
  }, {
    to: "/app/settings",
    icon: SettingsIcon,
    label: "Settings"
  }];
  const repoNav = repo ? [{
    to: `/app/repo/${repo.id}`,
    icon: GitBranch,
    label: "Repository",
    end: true
  }, {
    to: `/app/repo/${repo.id}/health`,
    icon: Gauge,
    label: "Health Score"
  }, {
    to: `/app/repo/${repo.id}/search`,
    icon: Search,
    label: "Smart Search"
  }, {
    to: `/app/repo/${repo.id}/explorer`,
    icon: FolderTree,
    label: "Explorer"
  }, {
    to: `/app/repo/${repo.id}/architecture`,
    icon: Network,
    label: "Architecture"
  }, {
    to: `/app/repo/${repo.id}/graph`,
    icon: Share2,
    label: "Knowledge Graph"
  }, {
    to: `/app/repo/${repo.id}/timeline`,
    icon: History,
    label: "Time Machine"
  }, {
    to: `/app/repo/${repo.id}/chat`,
    icon: MessagesSquare,
    label: "AI Chat"
  }, {
    to: `/app/repo/${repo.id}/docs`,
    icon: BookOpenText,
    label: "Documentation"
  }, {
    to: `/app/repo/${repo.id}/pulls`,
    icon: GitPullRequest,
    label: "Pull Requests"
  }, {
    to: `/app/repo/${repo.id}/pr-review`,
    icon: Wand2,
    label: "AI PR Review"
  }, {
    to: `/app/repo/${repo.id}/review`,
    icon: Wand2,
    label: "Code Review"
  }, {
    to: `/app/repo/${repo.id}/tests`,
    icon: FlaskConical,
    label: "Test Generator"
  }, {
    to: `/app/repo/${repo.id}/security`,
    icon: ShieldCheck,
    label: "Security"
  }, {
    to: `/app/repo/${repo.id}/debt`,
    icon: Wrench,
    label: "Technical Debt"
  }, {
    to: `/app/repo/${repo.id}/learn`,
    icon: Compass,
    label: "Learning"
  }, {
    to: `/app/repo/${repo.id}/interview`,
    icon: MessageSquareQuote,
    label: "Interview Kit"
  }] : [];
  const workspaceLabel = user ? `${user.username}'s workspace` : "Workspace";
  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    toast.success("Signed out");
    nav("/");
  };
  return <div className="min-h-screen paper">
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-border/70 bg-charcoal text-cream lg:flex">
          <div className="flex items-center justify-between px-5 py-5">
            <Logo tone="dark" />
          </div>
          <div className="px-4">
            <div className="rounded-2xl border border-cream/10 bg-cream/[0.03] p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/50">Workspace</div>
              <div className="mt-1 truncate text-sm font-semibold text-cream">{workspaceLabel}</div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-cream/60">
                <span className="h-1.5 w-1.5 rounded-full bg-gold anim-pulse-soft" />
                {repos.length} repo{repos.length === 1 ? "" : "s"} · MongoDB
              </div>
              <button onClick={() => setPaletteOpen(true)} className="mt-3 flex w-full items-center justify-between rounded-xl border border-cream/10 bg-cream/[0.03] px-2.5 py-1.5 text-left text-[11px] text-cream/70 hover:bg-cream/[0.08]">
                <span className="flex items-center gap-1.5"><Command className="h-3 w-3" /> Command Palette</span>
                <span className="font-mono">⌘K</span>
              </button>
            </div>
          </div>

          <nav className="mt-5 flex-1 space-y-6 overflow-y-auto px-3 pb-6">
            <SidebarSection title="General">
              {globalNav.map(n => <SideLink key={n.to} to={n.to} icon={n.icon} label={n.label} end />)}
            </SidebarSection>

            {repoScoped && repo && <SidebarSection title={repo.name}>
                {repoNav.map(n => <SideLink key={n.to} to={n.to} icon={n.icon} label={n.label} end={n.end} />)}
              </SidebarSection>}

            <SidebarSection title="Your repos">
              {repos.length === 0 ? <div className="rounded-xl border border-cream/10 bg-cream/[0.03] px-3 py-2 text-xs text-cream/60">
                  No repos yet — analyze one from the dashboard.
                </div> : repos.slice(0, 6).map(r => <Link key={r.id} to={`/app/repo/${r.id}`} className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-cream/70 transition hover:bg-cream/[0.06]", r.id === repo?.id && repoScoped && "bg-cream/[0.06] text-cream")}>
                    {r.ownerAvatar ? <img src={r.ownerAvatar} alt={r.owner} className="h-4 w-4 rounded-full" /> : <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                    <span className="truncate">{r.name}</span>
                  </Link>)}
            </SidebarSection>
          </nav>

          <div className="border-t border-cream/10 p-4">
            {user && <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 bg-cream/10 font-mono text-xs text-cream overflow-hidden">
                  {user.avatar ? <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" /> : user.username.slice(0, 1).toUpperCase()}
                </div>
                <Link to="/app/settings" className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-cream">{user.username}</div>
                  <div className="truncate text-[11px] text-cream/50">{user.email}</div>
                </Link>
                <button className="rounded-lg p-2 text-cream/60 transition hover:bg-cream/[0.06] hover:text-cream" onClick={signOut} title="Sign out">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onOpenPalette={() => setPaletteOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>;
}
function SidebarSection({
  title,
  children
}) {
  return <div>
      <div className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/45">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>;
}
function SideLink({
  to,
  icon: Icon,
  label,
  end
}) {
  return <NavLink to={to} end={end} className={({
    isActive
  }) => cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition", isActive ? "bg-olive/25 text-cream ring-1 ring-inset ring-olive/60" : "text-cream/70 hover:bg-cream/[0.06] hover:text-cream")}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </NavLink>;
}
function TopBar({
  onOpenPalette
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const analyze = async value => {
    const url = (value ?? query).trim();
    if (!url) return;
    const parsed = parseGithubUrl(url);
    if (!parsed) return toast.error("Enter a valid GitHub URL or owner/repo shorthand");
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
      toast.success("Repository added", {
        description: r.full_name
      });
      setQuery("");
      nav(`/app/repo/${idOf(r.owner.login, r.name)}`);
    } catch (e) {
      toast.error("Failed to fetch repo", {
        description: e.message
      });
    } finally {
      setBusy(false);
    }
  };
  return <div className="sticky top-0 z-30 border-b border-border/70 bg-cream/70 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="relative w-full max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => {
          if (e.key === "Enter") analyze();
        }} className="w-full rounded-full border border-border/70 bg-cream-deep/50 py-2.5 pl-10 pr-24 text-sm outline-none transition placeholder:text-muted-foreground focus:border-olive focus:bg-cream" placeholder="Paste a GitHub URL to analyze (owner/repo also works)…" />
          <button onClick={onOpenPalette} className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full border border-border/70 bg-cream px-2 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground" title="Command palette">
            <Command className="h-3 w-3" /> ⌘K
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary !py-2 !px-4" onClick={() => analyze()} disabled={busy || !query.trim()}>
            <Sparkles className="h-4 w-4" /> {busy ? "Fetching…" : "Analyze"}
          </button>
        </div>
      </div>
    </div>;
}