import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, GitBranch, MessagesSquare, ShieldCheck, Network, BookOpenText, Wrench, Gauge, Compass, Bell, Settings as SettingsIcon, FolderTree, History, GitPullRequest, Wand2, FlaskConical, MessageSquareQuote, Share2, LayoutDashboard, Building2, X, ArrowRight } from "lucide-react";
import { useAnalyzedRepos } from "@/hooks/useStore";
import { cn } from "@/lib/utils";
export default function CommandPalette({
  open,
  onClose
}) {
  const nav = useNavigate();
  const {
    repos
  } = useAnalyzedRepos();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);
  const commands = useMemo(() => {
    const globals = [{
      id: "dashboard",
      label: "Go to Dashboard",
      icon: LayoutDashboard,
      group: "Navigate",
      action: () => nav("/app")
    }, {
      id: "enterprise",
      label: "Enterprise Dashboard",
      icon: Building2,
      group: "Navigate",
      action: () => nav("/app/enterprise")
    }, {
      id: "notifs",
      label: "Notifications",
      icon: Bell,
      group: "Navigate",
      action: () => nav("/app/notifications")
    }, {
      id: "settings",
      label: "Settings",
      icon: SettingsIcon,
      group: "Navigate",
      action: () => nav("/app/settings")
    }];
    const repoActions = [];
    for (const r of repos.slice(0, 8)) {
      const rid = r.id;
      repoActions.push({
        id: `open-${rid}`,
        label: `Open ${r.fullName}`,
        hint: r.language ?? "",
        icon: GitBranch,
        group: "Repositories",
        action: () => nav(`/app/repo/${rid}`)
      }, {
        id: `chat-${rid}`,
        label: `Chat with ${r.name}`,
        icon: MessagesSquare,
        group: "Repositories",
        action: () => nav(`/app/repo/${rid}/chat`)
      }, {
        id: `search-${rid}`,
        label: `Search inside ${r.name}`,
        icon: Search,
        group: "Repositories",
        action: () => nav(`/app/repo/${rid}/search`)
      }, {
        id: `health-${rid}`,
        label: `${r.name} — Health Score`,
        icon: Gauge,
        group: "Repositories",
        action: () => nav(`/app/repo/${rid}/health`)
      });
    }
    const sections = repos.length > 0 ? [{
      id: "explorer",
      label: "Explorer",
      icon: FolderTree,
      group: "Sections",
      action: () => nav(`/app/repo/${repos[0].id}/explorer`)
    }, {
      id: "architecture",
      label: "Architecture",
      icon: Network,
      group: "Sections",
      action: () => nav(`/app/repo/${repos[0].id}/architecture`)
    }, {
      id: "graph",
      label: "Knowledge Graph",
      icon: Share2,
      group: "Sections",
      action: () => nav(`/app/repo/${repos[0].id}/graph`)
    }, {
      id: "timeline",
      label: "Time Machine",
      icon: History,
      group: "Sections",
      action: () => nav(`/app/repo/${repos[0].id}/timeline`)
    }, {
      id: "docs",
      label: "Documentation",
      icon: BookOpenText,
      group: "Sections",
      action: () => nav(`/app/repo/${repos[0].id}/docs`)
    }, {
      id: "pulls",
      label: "Pull Requests",
      icon: GitPullRequest,
      group: "Sections",
      action: () => nav(`/app/repo/${repos[0].id}/pulls`)
    }, {
      id: "pr-review",
      label: "AI PR Reviewer",
      icon: Wand2,
      group: "Sections",
      action: () => nav(`/app/repo/${repos[0].id}/pr-review`)
    }, {
      id: "review",
      label: "Code Review",
      icon: Wand2,
      group: "Sections",
      action: () => nav(`/app/repo/${repos[0].id}/review`)
    }, {
      id: "tests",
      label: "Test Generator",
      icon: FlaskConical,
      group: "Sections",
      action: () => nav(`/app/repo/${repos[0].id}/tests`)
    }, {
      id: "security",
      label: "Security",
      icon: ShieldCheck,
      group: "Sections",
      action: () => nav(`/app/repo/${repos[0].id}/security`)
    }, {
      id: "debt",
      label: "Technical Debt",
      icon: Wrench,
      group: "Sections",
      action: () => nav(`/app/repo/${repos[0].id}/debt`)
    }, {
      id: "learn",
      label: "Learning Roadmap",
      icon: Compass,
      group: "Sections",
      action: () => nav(`/app/repo/${repos[0].id}/learn`)
    }, {
      id: "interview",
      label: "Interview Kit",
      icon: MessageSquareQuote,
      group: "Sections",
      action: () => nav(`/app/repo/${repos[0].id}/interview`)
    }] : [];
    return [...repoActions, ...globals, ...sections];
  }, [repos, nav]);
  const filtered = useMemo(() => {
    if (!q.trim()) return commands.slice(0, 40);
    const query = q.toLowerCase();
    return commands.filter(c => c.label.toLowerCase().includes(query) || (c.hint?.toLowerCase().includes(query) ?? false)).slice(0, 40);
  }, [commands, q]);
  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(a => Math.min(filtered.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(a => Math.max(0, a - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = filtered[active];
        if (target) {
          target.action();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, active, filtered, onClose]);
  useEffect(() => {
    setActive(0);
  }, [q]);
  if (!open) return null;
  const grouped = filtered.reduce((acc, c) => {
    (acc[c.group] ||= []).push(c);
    return acc;
  }, {});
  return <div className="fixed inset-0 z-[100] flex items-start justify-center bg-charcoal/60 backdrop-blur-sm p-4 pt-24" onClick={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/70 bg-cream shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Search commands, repos, or sections…" />
          <kbd className="kbd">ESC</kbd>
          <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-cream-deep" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto py-2">
          {filtered.length === 0 ? <div className="px-4 py-10 text-center text-sm text-muted-foreground">No results.</div> : Object.entries(grouped).map(([group, items]) => <div key={group} className="mb-1">
                <div className="px-4 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{group}</div>
                {items.map(c => {
            const idx = filtered.indexOf(c);
            const isActive = idx === active;
            return <button key={c.id} onMouseEnter={() => setActive(idx)} onClick={() => {
              c.action();
              onClose();
            }} className={cn("flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition", isActive ? "bg-olive/15 text-olive-dark" : "text-foreground/80 hover:bg-cream-deep")}>
                      <c.icon className="h-4 w-4" />
                      <span className="flex-1 truncate">{c.label}</span>
                      {c.hint && <span className="font-mono text-[10px] text-muted-foreground">{c.hint}</span>}
                      {isActive && <ArrowRight className="h-3.5 w-3.5 text-olive-dark" />}
                    </button>;
          })}
              </div>)}
        </div>

        <div className="flex items-center justify-between border-t border-border/70 bg-cream-deep/40 px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <kbd className="kbd">↑↓</kbd> navigate <kbd className="kbd">↵</kbd> select
          </div>
          <div>RepoDNA · Command Palette</div>
        </div>
      </div>
    </div>;
}