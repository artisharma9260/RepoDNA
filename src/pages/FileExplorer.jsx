import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Folder, FolderOpen, FileCode2, ExternalLink, Search, Star } from "lucide-react";
import { fetchRepo, fetchTree, parseId } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import { cn } from "@/lib/utils";
function buildTree(items) {
  const root = {
    name: "",
    path: "",
    type: "tree",
    children: {}
  };
  for (const it of items) {
    const parts = it.path.split("/");
    let cur = root;
    parts.forEach((p, i) => {
      const isLast = i === parts.length - 1;
      cur.children[p] = cur.children[p] ?? {
        name: p,
        path: parts.slice(0, i + 1).join("/"),
        type: isLast ? it.type : "tree",
        size: isLast ? it.size : undefined,
        children: {}
      };
      cur = cur.children[p];
    });
  }
  return root;
}
function importance(path, size) {
  let score = Math.min(60, Math.round(Math.log((size || 1) + 1) * 6));
  if (/(^|\/)(index|main|app)\.(t|j)sx?$/.test(path)) score += 25;
  if (/(^|\/)(package\.json|pyproject\.toml|Cargo\.toml|go\.mod|pom\.xml)$/.test(path)) score += 30;
  if (/^README/i.test(path)) score += 15;
  if (/(^|\/)(routes?|controllers?|services?)\//.test(path)) score += 12;
  if (/(\.spec\.|\.test\.|__tests__|_test\.)/.test(path)) score -= 8;
  return Math.max(1, Math.min(100, score));
}
function TreeRow({
  node,
  depth,
  expanded,
  toggle
}) {
  const isFolder = node.type === "tree";
  const isOpen = expanded[node.path];
  const kids = Object.values(node.children).sort((a, b) => {
    if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return <>
      <button onClick={() => isFolder && toggle(node.path)} className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left font-mono text-[12px] transition hover:bg-cream-deep", isFolder && "font-semibold")} style={{
      paddingLeft: 8 + depth * 14
    }}>
        {isFolder ? isOpen ? <FolderOpen className="h-3.5 w-3.5 text-olive" /> : <Folder className="h-3.5 w-3.5 text-olive" /> : <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="line-clamp-1 flex-1">{node.name || "/"}</span>
        {!isFolder && node.size !== undefined && <span className="text-[10px] text-muted-foreground">{(node.size / 1024).toFixed(1)} KB</span>}
      </button>
      {isFolder && isOpen && kids.map(c => <TreeRow key={c.path} node={c} depth={depth + 1} expanded={expanded} toggle={toggle} />)}
    </>;
}
export default function FileExplorer() {
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
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState({});
  const root = useMemo(() => buildTree(treeQ.data?.tree ?? []), [treeQ.data]);
  const filteredRoot = useMemo(() => {
    if (!query.trim()) return root;
    const q = query.toLowerCase();
    function filter(node) {
      const kids = {};
      Object.values(node.children).forEach(c => {
        const cc = filter(c);
        if (cc) kids[c.name] = cc;
      });
      const matches = node.path.toLowerCase().includes(q);
      if (Object.keys(kids).length === 0 && !matches && node.type === "blob") return null;
      return {
        ...node,
        children: kids
      };
    }
    return filter(root) ?? root;
  }, [root, query]);

  // Auto-expand when searching
  useMemo(() => {
    if (!query.trim()) return;
    const map = {};
    function walk(n) {
      if (n.type === "tree") map[n.path] = true;
      Object.values(n.children).forEach(walk);
    }
    walk(filteredRoot);
    setExpanded(map);
  }, [query, filteredRoot]);
  const critical = useMemo(() => {
    const items = (treeQ.data?.tree ?? []).filter(t => t.type === "blob");
    return items.map(t => ({
      path: t.path,
      size: t.size ?? 0,
      score: importance(t.path, t.size ?? 0)
    })).sort((a, b) => b.score - a.score).slice(0, 8);
  }, [treeQ.data]);
  const toggle = p => setExpanded(s => ({
    ...s,
    [p]: !s[p]
  }));
  return <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Repository explorer</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          File tree · {repoQ.data?.full_name ?? `${owner}/${name}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {treeQ.data?.truncated ? "Tree was truncated by GitHub — showing available paths." : "Recursive tree from GitHub Git Data API."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="glass rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2 rounded-full border border-border/70 bg-cream-deep/40 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Filter paths (e.g. controller, .test.ts, /src)" />
            {query && <button className="text-xs text-muted-foreground hover:underline" onClick={() => setQuery("")}>Clear</button>}
          </div>
          <div className="max-h-[640px] overflow-y-auto pr-1">
            {treeQ.loading ? <div className="h-40 animate-pulse rounded bg-cream-deep" /> : Object.values(filteredRoot.children).length === 0 ? <div className="rounded-xl border border-border/70 bg-cream-deep/40 px-3 py-4 text-center text-sm text-muted-foreground">
                No paths match "{query}".
              </div> : Object.values(filteredRoot.children).sort((a, b) => {
            if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
            return a.name.localeCompare(b.name);
          }).map(c => <TreeRow key={c.path} node={c} depth={0} expanded={expanded} toggle={toggle} />)}
          </div>
        </div>

        <aside className="glass h-fit rounded-2xl p-6">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-gold" />
            <h3 className="font-serif text-lg font-semibold tracking-tight">Critical files</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Ranked by role, entry-point, and size heuristics.</p>
          <ul className="mt-4 space-y-2">
            {critical.map(f => <li key={f.path} className="rounded-xl border border-border/70 bg-cream/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="line-clamp-1 font-mono text-[12px]">{f.path}</div>
                  <span className="shrink-0 rounded-full bg-olive text-cream px-2 py-0.5 font-mono text-[10px]">
                    {f.score}
                  </span>
                </div>
                {repoQ.data && <a href={`${repoQ.data.html_url}/blob/${repoQ.data.default_branch}/${f.path}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-olive-dark hover:underline">
                    Open on GitHub <ExternalLink className="h-3 w-3" />
                  </a>}
              </li>)}
          </ul>
        </aside>
      </div>
    </div>;
}