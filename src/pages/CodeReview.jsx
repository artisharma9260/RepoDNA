import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Wand2, FileCode2, Copy, CheckCheck, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchRepo, fetchTree, parseId } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import { aiReview } from "@/lib/api";
import { cn } from "@/lib/utils";
const CODE_EXT = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".rb", ".kt", ".php", ".cs", ".swift", ".c", ".cpp"];
const isCodeFile = p => CODE_EXT.some(e => p.toLowerCase().endsWith(e));
export default function CodeReview() {
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
  const [copied, setCopied] = useState(false);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const files = useMemo(() => {
    const raw = (treeQ.data?.tree ?? []).filter(t => t.type === "blob" && isCodeFile(t.path));
    return raw.sort((a, b) => (b.size ?? 0) - (a.size ?? 0)).slice(0, 60);
  }, [treeQ.data]);
  const current = files.find(f => f.path === selected) ?? null;
  const runReview = async path => {
    setSelected(path);
    setReview("");
    setLoading(true);
    try {
      const res = await aiReview(id, path);
      setReview(res.content);
    } catch (e) {
      toast.error("Review failed", {
        description: e.message
      });
    } finally {
      setLoading(false);
    }
  };
  const copyReview = () => {
    if (!review) return;
    navigator.clipboard.writeText(review);
    setCopied(true);
    toast.success("Review copied");
    setTimeout(() => setCopied(false), 1500);
  };
  return <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">AI code reviewer</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          Semantic review · {repoQ.data?.full_name ?? `${owner}/${name}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          Select any file to get an AI review with strengths, issues, refactors, performance, and tests to add.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="glass h-[620px] overflow-hidden rounded-2xl p-3">
          <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Largest code files ({files.length})
          </div>
          <div className="h-[calc(100%-24px)] space-y-1 overflow-y-auto pr-1">
            {treeQ.loading ? <div className="h-40 animate-pulse rounded bg-cream-deep" /> : files.length === 0 ? <div className="rounded-xl border border-border/70 bg-cream-deep/40 px-3 py-2 text-xs text-muted-foreground">
                No source files found.
              </div> : files.map(f => <button key={f.path} onClick={() => runReview(f.path)} disabled={loading} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-mono text-[12px] transition", current?.path === f.path ? "bg-olive/15 text-olive-dark ring-1 ring-olive/40" : "hover:bg-cream-deep", loading && current?.path !== f.path && "opacity-40")}>
                  <FileCode2 className="h-3.5 w-3.5 shrink-0 text-olive" />
                  <span className="line-clamp-1 flex-1">{f.path}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{((f.size ?? 0) / 1024).toFixed(1)} KB</span>
                </button>)}
          </div>
        </aside>

        <div className="glass rounded-2xl p-6">
          {!current ? <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-olive/15 text-olive-dark">
                <Wand2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-serif text-2xl font-semibold tracking-tight">Select a file to review</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Gemini will fetch the raw source, then produce a structured code review with concrete refactors.
              </p>
            </div> : <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[11px] text-muted-foreground">Reviewing</div>
                  <h3 className="font-serif text-xl font-semibold tracking-tight">{current.path}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-ghost !py-2 !px-3" onClick={() => runReview(current.path)} disabled={loading}>
                    <Sparkles className="h-4 w-4" /> Re-run
                  </button>
                  <button className="btn-ghost !py-2 !px-3" onClick={copyReview} disabled={!review}>
                    {copied ? <CheckCheck className="h-4 w-4 text-olive" /> : <Copy className="h-4 w-4" />}
                    Copy
                  </button>
                </div>
              </div>
              {loading ? <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border/70 bg-cream-deep/40 p-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-olive" /> Reading source and generating review…
                </div> : <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-2xl border border-border/70 bg-cream/70 p-5 font-mono text-[12.5px] leading-relaxed text-foreground">
                  {review}
                </pre>}
            </>}
        </div>
      </div>
    </div>;
}