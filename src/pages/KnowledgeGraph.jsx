import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { fetchRepo, fetchTree, parseId } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import { Network } from "lucide-react";
const GROUPS = [{
  key: "entry",
  label: "Entry",
  match: /(^|\/)(main|index|app)\.(t|j)sx?$/,
  color: "#C9A66B"
}, {
  key: "route",
  label: "Routes",
  match: /(^|\/)(routes?|pages?)\//,
  color: "#6B7A3D"
}, {
  key: "ctrl",
  label: "Controllers",
  match: /(controller|handler)/i,
  color: "#4F5A2B"
}, {
  key: "svc",
  label: "Services",
  match: /(service|use[-_]?case)/i,
  color: "#8b6a2b"
}, {
  key: "model",
  label: "Models",
  match: /(model|schema|entity)/i,
  color: "#3b3b3b"
}, {
  key: "repo",
  label: "Repositories",
  match: /(repository|repositories|dao)/i,
  color: "#a86a2b"
}, {
  key: "util",
  label: "Utilities",
  match: /(util|helpers?|lib)/i,
  color: "#8b8b8b"
}, {
  key: "test",
  label: "Tests",
  match: /(\.test\.|\.spec\.|__tests__)/i,
  color: "#7c9083"
}];
function classify(path) {
  for (const g of GROUPS) if (g.match.test(path)) return g.key;
  return "other";
}
export default function KnowledgeGraph() {
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
  const {
    nodes,
    edges,
    groups
  } = useMemo(() => {
    const groupsMap = new Map();
    (treeQ.data?.tree ?? []).filter(t => t.type === "blob" && /\.(t|j)sx?$|\.py$|\.go$/.test(t.path)).forEach(t => {
      const g = classify(t.path);
      if (g === "other") return;
      const arr = groupsMap.get(g) ?? [];
      if (arr.length < 6) arr.push(t.path);
      groupsMap.set(g, arr);
    });
    const cx = 500;
    const cy = 320;
    const groupsList = Array.from(groupsMap.entries()).slice(0, 8);
    const nodes = [];
    const edges = [];

    // Center node — the repo
    const rootId = "root";
    nodes.push({
      id: rootId,
      x: cx,
      y: cy,
      label: repoQ.data?.name ?? name,
      group: "root"
    });
    groupsList.forEach(([gKey, files], gi) => {
      const angle = gi / groupsList.length * Math.PI * 2;
      const gx = cx + Math.cos(angle) * 220;
      const gy = cy + Math.sin(angle) * 180;
      const gId = `g:${gKey}`;
      const label = GROUPS.find(g => g.key === gKey)?.label ?? gKey;
      nodes.push({
        id: gId,
        x: gx,
        y: gy,
        label,
        group: gKey
      });
      edges.push({
        from: rootId,
        to: gId
      });
      files.forEach((f, fi) => {
        const a = angle + (fi - (files.length - 1) / 2) * 0.18;
        const fx = cx + Math.cos(a) * 380;
        const fy = cy + Math.sin(a) * 300;
        const fId = `f:${f}`;
        const short = f.split("/").pop() ?? f;
        nodes.push({
          id: fId,
          x: fx,
          y: fy,
          label: short,
          group: gKey
        });
        edges.push({
          from: gId,
          to: fId
        });
      });
    });
    return {
      nodes,
      edges,
      groups: groupsList.map(([k]) => k)
    };
  }, [treeQ.data, repoQ.data, name]);
  return <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Knowledge graph</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          Repository knowledge · {repoQ.data?.full_name ?? `${owner}/${name}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          Grouping by role (routes → controllers → services → models) inferred from file paths.
        </p>
      </div>

      <div className="glass overflow-hidden rounded-3xl p-4">
        {treeQ.loading ? <div className="h-[640px] animate-pulse rounded-2xl bg-cream-deep" /> : <svg viewBox="0 0 1000 640" className="h-[640px] w-full">
            <defs>
              <radialGradient id="bg" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="hsla(38, 45%, 60%, 0.12)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width="1000" height="640" fill="url(#bg)" />
            {edges.map((e, i) => {
          const from = nodes.find(n => n.id === e.from);
          const to = nodes.find(n => n.id === e.to);
          if (!from || !to) return null;
          return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="hsla(71, 34%, 36%, 0.35)" strokeWidth={1.25} />;
        })}
            {nodes.map(n => {
          const color = GROUPS.find(g => g.key === n.group)?.color ?? (n.group === "root" ? "#1C1C1C" : "#6B7A3D");
          const r = n.group === "root" ? 32 : n.id.startsWith("g:") ? 20 : 8;
          return <g key={n.id}>
                  <circle cx={n.x} cy={n.y} r={r} fill={color} opacity={0.95} />
                  {(n.group === "root" || n.id.startsWith("g:")) && <text x={n.x} y={n.y - r - 8} textAnchor="middle" className="font-mono text-[10px]" fill="#1C1C1C">
                      {n.label}
                    </text>}
                  {n.id.startsWith("f:") && <text x={n.x} y={n.y + 16} textAnchor="middle" className="font-mono text-[9px]" fill="#1C1C1C" opacity={0.7}>
                      {n.label}
                    </text>}
                </g>;
        })}
          </svg>}
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="mb-3 flex items-center gap-2">
          <Network className="h-4 w-4 text-olive" />
          <h3 className="font-serif text-lg font-semibold tracking-tight">Layers detected</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {groups.length === 0 ? <span className="text-sm text-muted-foreground">No structured layers detected in file paths.</span> : groups.map(g => {
          const meta = GROUPS.find(x => x.key === g);
          return <span key={g} className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-cream-deep/50 px-3 py-1 font-mono text-[11px]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{
              background: meta?.color
            }} />
                  {meta?.label ?? g}
                </span>;
        })}
        </div>
      </div>
    </div>;
}