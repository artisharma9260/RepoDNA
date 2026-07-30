import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FlaskConical, FileCode2, Copy, CheckCheck, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchRepo, fetchTree, parseId } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import { aiTests } from "@/lib/api";
import { cn } from "@/lib/utils";
const CODE_EXT = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java"];
const isCode = p => CODE_EXT.some(e => p.toLowerCase().endsWith(e));
export default function TestGenerator() {
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
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState("");
  const [framework, setFramework] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const files = useMemo(() => {
    const raw = (treeQ.data?.tree ?? []).filter(t => t.type === "blob" && isCode(t.path));
    return raw.filter(t => !/(\.spec\.|\.test\.|__tests__|_test\.)/.test(t.path)).slice(0, 60);
  }, [treeQ.data]);
  const current = files.find(f => f.path === selected) ?? null;
  const generate = async path => {
    setSelected(path);
    setContent("");
    setLoading(true);
    try {
      const res = await aiTests(id, path);
      setContent(res.content);
      setFramework(res.framework);
    } catch (e) {
      toast.error("Test generation failed", {
        description: e.message
      });
    } finally {
      setLoading(false);
    }
  };
  const copy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 1500);
  };
  const coverage = useMemo(() => {
    const all = (treeQ.data?.tree ?? []).filter(t => t.type === "blob" && isCode(t.path));
    const tests = all.filter(t => /(\.spec\.|\.test\.|__tests__|_test\.)/.test(t.path)).length;
    const src = all.length - tests;
    if (src === 0) return 0;
    return Math.min(100, Math.round(tests / src * 100));
  }, [treeQ.data]);
  return <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">AI test generator</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          Test scaffolds · {repoQ.data?.full_name ?? `${owner}/${name}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          Untested files ranked by size. Gemini writes idiomatic tests for the detected framework.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Untested source files" value={files.length} />
        <Kpi label="Test-file ratio (est.)" value={`${coverage}%`} />
        <Kpi label="Framework" value={framework || "auto-detect"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="glass h-[560px] overflow-hidden rounded-2xl p-3">
          <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Files without a matching test
          </div>
          <div className="h-[calc(100%-24px)] space-y-1 overflow-y-auto pr-1">
            {treeQ.loading ? <div className="h-40 animate-pulse rounded bg-cream-deep" /> : files.length === 0 ? <div className="rounded-xl border border-border/70 bg-cream-deep/40 px-3 py-2 text-xs text-muted-foreground">
                All source files appear to have a paired test.
              </div> : files.map(f => <button key={f.path} onClick={() => generate(f.path)} disabled={loading} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-mono text-[12px] transition", current?.path === f.path ? "bg-olive/15 text-olive-dark ring-1 ring-olive/40" : "hover:bg-cream-deep", loading && current?.path !== f.path && "opacity-40")}>
                  <FileCode2 className="h-3.5 w-3.5 shrink-0 text-olive" />
                  <span className="line-clamp-1 flex-1">{f.path}</span>
                </button>)}
          </div>
        </aside>

        <div className="glass rounded-2xl p-6">
          {!current ? <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-olive/15 text-olive-dark">
                <FlaskConical className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-serif text-2xl font-semibold tracking-tight">Pick a source file</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                We'll fetch the file, detect the framework, and produce a runnable test scaffold.
              </p>
            </div> : <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[11px] text-muted-foreground">Target</div>
                  <h3 className="font-serif text-xl font-semibold tracking-tight">{current.path}</h3>
                  {framework && <div className="mt-1 font-mono text-[11px] text-olive-dark">{framework}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-ghost !py-2 !px-3" onClick={() => generate(current.path)} disabled={loading}>
                    <Sparkles className="h-4 w-4" /> Regenerate
                  </button>
                  <button className="btn-ghost !py-2 !px-3" onClick={copy} disabled={!content}>
                    {copied ? <CheckCheck className="h-4 w-4 text-olive" /> : <Copy className="h-4 w-4" />} Copy
                  </button>
                </div>
              </div>
              {loading ? <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border/70 bg-cream-deep/40 p-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-olive" /> Reading source and drafting tests…
                </div> : <pre className="mt-4 max-h-[440px] overflow-auto whitespace-pre-wrap rounded-2xl border border-border/70 bg-charcoal p-5 font-mono text-xs leading-relaxed text-cream">
                  <code>{content}</code>
                </pre>}
            </>}
        </div>
      </div>
    </div>;
}
function Kpi({
  label,
  value
}) {
  return <div className="glass rounded-2xl p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-serif text-3xl font-semibold tracking-tight">{value}</div>
    </div>;
}