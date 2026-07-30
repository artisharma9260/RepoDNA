import { useParams } from "react-router-dom";
import { RefreshCw, ExternalLink } from "lucide-react";
import { fetchRepo, fetchTree, parseId } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import ArchitectureGraph from "@/components/features/ArchitectureGraph";
const PATTERN_HINTS = [{
  key: "MVC",
  test: /(^|\/)(controllers?|views?|models?)(\/|$)/i,
  desc: "Model-View-Controller separation detected via classic folder names."
}, {
  key: "Layered",
  test: /(^|\/)(services?|repositor(?:y|ies)|providers?)(\/|$)/i,
  desc: "Layered architecture — service and repository folders present."
}, {
  key: "Hooks",
  test: /(^|\/)hooks(\/|$)/i,
  desc: "React hooks pattern used for shared stateful logic."
}, {
  key: "Components",
  test: /(^|\/)components(\/|$)/i,
  desc: "Reusable UI component library structure."
}, {
  key: "Feature-based",
  test: /(^|\/)(features?|modules?)(\/|$)/i,
  desc: "Feature-based / vertical-slice module organization."
}, {
  key: "Monorepo",
  test: /(^|\/)(packages|apps)(\/|$)/i,
  desc: "Monorepo layout (packages/ or apps/)."
}, {
  key: "Microservices",
  test: /(^|\/)(services|cmd)(\/|$)/i,
  desc: "Independent services or Go-style cmd/ entrypoints."
}, {
  key: "API Gateway",
  test: /(^|\/)(gateway|edge|api|router)(\/|$)/i,
  desc: "Edge or gateway module coordinating downstream services."
}, {
  key: "Test-driven",
  test: /(^|\/)(tests?|__tests__|spec)(\/|$)/i,
  desc: "Dedicated test tree indicates a strong testing culture."
}, {
  key: "Infrastructure as Code",
  test: /(^|\/)(infra|terraform|helm|k8s|kubernetes|deploy)(\/|$)/i,
  desc: "Infrastructure declared as code in versioned directory."
}, {
  key: "CI/CD",
  test: /\.github\/workflows/i,
  desc: "GitHub Actions workflows drive CI/CD."
}, {
  key: "Docs-as-code",
  test: /(^|\/)(docs?|documentation)(\/|$)/i,
  desc: "Documentation tree checked into the repo."
}];
const KIND_HINTS = [{
  kind: "gateway",
  test: /^(gateway|edge|api|router|proxy)$/i
}, {
  kind: "controller",
  test: /^(controllers?|routes?|handlers?|resolvers?)$/i
}, {
  kind: "service",
  test: /^(services?|business|domain|features?|modules?)$/i
}, {
  kind: "data",
  test: /^(models?|entities|repositor(?:y|ies)|db|database|prisma|migrations?)$/i
}, {
  kind: "external",
  test: /^(infra|deploy|k8s|kubernetes|helm|terraform|scripts|docker|ci)$/i
}];
function classifyFolder(name) {
  for (const h of KIND_HINTS) if (h.test.test(name)) return h.kind;
  return "external";
}
export default function Architecture() {
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
  const tree = treeQ.data?.tree ?? [];
  const folders = groupFolders(tree).slice(0, 9);
  const patterns = detectPatterns(tree);
  const evolution = buildEvolution(tree);
  return <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Architecture intelligence</div>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
            System map · {repoQ.data?.full_name ?? `${owner}/${name}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            Derived live from the repository git tree. No AI inference — folder-name heuristics only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost !py-2 !px-3" onClick={() => {
          repoQ.refetch();
          treeQ.refetch();
        }}>
            <RefreshCw className="h-4 w-4" /> Re-analyze
          </button>
          {repoQ.data && <a href={repoQ.data.html_url} target="_blank" rel="noreferrer" className="btn-primary !py-2 !px-4">
              <ExternalLink className="h-4 w-4" /> Open on GitHub
            </a>}
        </div>
      </div>

      {treeQ.loading ? <div className="glass h-80 animate-pulse rounded-2xl" /> : folders.length === 0 ? <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          Not enough directory structure to build a map. This repository is too flat or empty.
        </div> : <ArchitectureGraph folders={folders} />}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-serif text-xl font-semibold tracking-tight">Detected patterns</h3>
          <p className="text-xs text-muted-foreground">Based on directory-name heuristics · confidence reflects match count.</p>
          {patterns.length === 0 ? <div className="mt-4 rounded-xl border border-border/70 bg-cream-deep/40 p-4 text-sm text-muted-foreground">
              No conventional patterns detected in this repository's structure.
            </div> : <ul className="mt-4 space-y-3">
              {patterns.map(p => <li key={p.name} className="rounded-xl border border-border/70 bg-cream-deep/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-serif text-lg font-semibold">{p.name}</div>
                    <span className="rounded-full bg-charcoal px-2 py-0.5 font-mono text-[10px] text-cream">
                      {p.confidence}% conf
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/75">{p.desc}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream">
                    <span className="block h-full rounded-full bg-olive" style={{
                width: `${p.confidence}%`
              }} />
                  </div>
                </li>)}
            </ul>}
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="font-serif text-xl font-semibold tracking-tight">Structural fingerprint</h3>
          <p className="text-xs text-muted-foreground">Notable files & configurations found in the tree.</p>
          {evolution.length === 0 ? <div className="mt-3 text-sm text-muted-foreground">No signature files found.</div> : <ol className="relative mt-4 space-y-4 border-l border-border pl-6">
              {evolution.map(e => <li key={e.label} className="relative">
                  <span className="absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full bg-olive ring-4 ring-cream" />
                  <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    {e.label}
                  </div>
                  <div className="mt-1 text-sm text-foreground/90">{e.detail}</div>
                </li>)}
            </ol>}
        </div>
      </div>
    </div>;
}
function groupFolders(tree) {
  const map = new Map();
  for (const t of tree) {
    const top = t.path.split("/")[0];
    if (!top || top.startsWith(".")) continue;
    if (!map.has(top)) {
      map.set(top, {
        name: top,
        path: top,
        files: 0,
        kind: classifyFolder(top)
      });
    }
    if (t.type === "blob") map.get(top).files += 1;
  }
  return Array.from(map.values()).sort((a, b) => b.files - a.files);
}
function detectPatterns(tree) {
  const paths = tree.map(t => t.path);
  const results = [];
  for (const p of PATTERN_HINTS) {
    const matches = paths.filter(path => p.test.test(path)).length;
    if (matches > 0) {
      const conf = Math.min(100, 40 + Math.log2(matches + 1) * 15);
      results.push({
        name: p.key,
        desc: p.desc,
        confidence: Math.round(conf)
      });
    }
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}
function buildEvolution(tree) {
  const paths = tree.map(t => t.path);
  const rows = [];
  const check = (rx, label, detail) => {
    if (paths.some(p => rx.test(p))) rows.push({
      label,
      detail
    });
  };
  check(/^package\.json$/, "Node.js", "package.json present — JavaScript/TypeScript stack.");
  check(/^pnpm-workspace\.yaml$|^lerna\.json$|^turbo\.json$/, "Monorepo", "Workspaces configured for multi-package management.");
  check(/^Dockerfile$|^docker-compose/i, "Docker", "Containerized development or deployment.");
  check(/^\.github\/workflows\//, "CI/CD", "GitHub Actions workflows configured.");
  check(/^tsconfig\.json$/, "TypeScript", "Strongly typed JavaScript.");
  check(/^go\.mod$/, "Go modules", "Go module system in use.");
  check(/^Cargo\.toml$/, "Rust", "Cargo-managed Rust crate.");
  check(/^pyproject\.toml$|^requirements.*\.txt$/, "Python", "Python project detected.");
  check(/^pom\.xml$|^build\.gradle/, "JVM", "Maven or Gradle build system.");
  check(/^terraform\/|\.tf$/i, "Terraform", "Infrastructure defined as code.");
  check(/^helm\/|^charts\//i, "Helm", "Kubernetes deployment via Helm charts.");
  check(/^prisma\/schema\.prisma$/, "Prisma ORM", "Typed database schema via Prisma.");
  check(/^supabase\//, "Supabase", "Supabase backend integration.");
  check(/^\.storybook\//, "Storybook", "Component playground configured.");
  return rows;
}