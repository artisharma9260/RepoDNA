import { useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, Download, Copy, RefreshCw, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchReadme, fetchRepo, fetchTree, parseId } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import { aiDocs } from "@/lib/api";
import { cn } from "@/lib/utils";
const AI_DOCS = [{
  key: "readme",
  label: "README"
}, {
  key: "api",
  label: "API Docs"
}, {
  key: "architecture",
  label: "Architecture"
}, {
  key: "developer",
  label: "Developer Guide"
}, {
  key: "contributing",
  label: "Contributing"
}, {
  key: "install",
  label: "Installation"
}, {
  key: "future",
  label: "Future Scope"
}];
export default function Documentation() {
  const {
    id = ""
  } = useParams();
  const {
    owner,
    name
  } = parseId(id);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [aiKind, setAiKind] = useState(null);
  const [aiContent, setAiContent] = useState("");
  const repoQ = useAsync(() => fetchRepo(owner, name), [owner, name]);
  const readmeQ = useAsync(() => fetchReadme(owner, name), [owner, name]);
  const treeQ = useAsync(async () => {
    const r = await fetchRepo(owner, name);
    return fetchTree(owner, name, r.default_branch);
  }, [owner, name]);
  const mdFiles = (treeQ.data?.tree ?? []).filter(t => t.type === "blob" && /\.(md|mdx)$/i.test(t.path) && !/^readme\.md$/i.test(t.path)).slice(0, 20);
  const displayContent = aiKind ? aiContent : readmeQ.data ?? "";
  const displayLabel = aiKind ? `AI · ${AI_DOCS.find(d => d.key === aiKind)?.label}` : "README.md";
  const copyContent = () => {
    if (!displayContent) return;
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };
  const generate = async kind => {
    setGenerating(kind);
    try {
      const res = await aiDocs(id, kind);
      setAiKind(kind);
      setAiContent(res.content);
      toast.success(`${AI_DOCS.find(d => d.key === kind)?.label} generated`);
    } catch (e) {
      toast.error("AI generation failed", {
        description: e.message
      });
    } finally {
      setGenerating(null);
    }
  };
  return <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Documentation</div>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
            Docs · {repoQ.data?.full_name ?? `${owner}/${name}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            Live README from GitHub, plus AI-generated docs powered by Gemini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost !py-2 !px-3" onClick={() => {
          readmeQ.refetch();
          treeQ.refetch();
          setAiKind(null);
          setAiContent("");
        }}>
            <RefreshCw className={`h-4 w-4 ${readmeQ.loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Sources</div>
            <button onClick={() => {
            setAiKind(null);
            setAiContent("");
          }} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition", !aiKind ? "bg-olive/15 text-olive-dark ring-1 ring-olive/40" : "hover:bg-cream-deep")}>
              <FileText className="h-3.5 w-3.5" /> Live README
            </button>
            {mdFiles.slice(0, 6).map(f => <a key={f.path} href={`${repoQ.data?.html_url}/blob/${repoQ.data?.default_branch}/${f.path}`} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 truncate rounded-xl px-3 py-2 text-xs font-mono text-foreground/80 transition hover:bg-cream-deep">
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{f.path}</span>
              </a>)}
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">AI-generated docs</div>
            </div>
            <div className="space-y-1">
              {AI_DOCS.map(d => <button key={d.key} onClick={() => generate(d.key)} disabled={generating !== null} className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition", aiKind === d.key ? "bg-olive/15 text-olive-dark ring-1 ring-olive/40" : "hover:bg-cream-deep", generating !== null && generating !== d.key && "opacity-40")}>
                  <span>{d.label}</span>
                  {generating === d.key ? <Loader2 className="h-3.5 w-3.5 animate-spin text-olive" /> : <Sparkles className="h-3 w-3 text-gold opacity-60" />}
                </button>)}
            </div>
          </div>
        </aside>

        <div className="glass overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-border/70 bg-cream-deep/40 px-5 py-3">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-olive" />
              <span className="font-mono text-sm">{displayLabel}</span>
              {aiKind ? <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[10px] text-charcoal">generated by AI</span> : <span className="badge-soft">live · default branch</span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={copyContent} className="btn-ghost !py-1.5 !px-3" disabled={!displayContent}>
                <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={() => {
              if (!displayContent) return;
              const blob = new Blob([displayContent], {
                type: "text/markdown"
              });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = aiKind ? `${name}-${aiKind}.md` : `${name}-README.md`;
              a.click();
            }} className="btn-ghost !py-1.5 !px-3" disabled={!displayContent}>
                <Download className="h-3.5 w-3.5" /> Download
              </button>
              {!aiKind && repoQ.data && <a href={`${repoQ.data.html_url}/blob/${repoQ.data.default_branch}/README.md`} target="_blank" rel="noreferrer" className="btn-primary !py-1.5 !px-3">
                  <ExternalLink className="h-3.5 w-3.5" /> GitHub
                </a>}
            </div>
          </div>
          {readmeQ.loading && !aiKind ? <div className="animate-pulse space-y-3 p-6">
              <div className="h-4 w-1/3 rounded bg-cream-deep" />
              <div className="h-3 w-2/3 rounded bg-cream-deep" />
              <div className="h-3 w-full rounded bg-cream-deep" />
              <div className="h-3 w-5/6 rounded bg-cream-deep" />
            </div> : !displayContent ? <div className="p-6 text-sm text-muted-foreground">
              {aiKind ? "Generating…" : "No README on this repository."}
            </div> : <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words px-6 py-6 font-mono text-[12.5px] leading-relaxed text-foreground">
              {displayContent}
            </pre>}
        </div>
      </div>
    </div>;
}