import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Search as SearchIcon, Loader2, Sparkles, FileCode2, Copy } from "lucide-react";
import { aiSearch } from "@/lib/api";
import { parseId, fetchRepo } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import IngestBanner from "@/components/features/IngestBanner";
const SAMPLES = ["Find authentication", "Find payment logic", "Show JWT implementation", "Where is the database schema", "How does login work", "Show routing configuration"];
function highlight(text, query) {
  const terms = query.trim().split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) return [text];
  const rx = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(rx);
  return parts.map((p, i) => rx.test(p) ? <mark key={i} className="rounded bg-gold/40 text-charcoal px-0.5">{p}</mark> : <span key={i}>{p}</span>);
}
export default function Search() {
  const {
    id = ""
  } = useParams();
  const {
    owner,
    name
  } = parseId(id);
  const repoQ = useAsync(() => fetchRepo(owner, name), [owner, name]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState([]);
  const [explanation, setExplanation] = useState("");
  const run = async query => {
    const text = (query ?? q).trim();
    if (!text) return;
    setBusy(true);
    setHits([]);
    setExplanation("");
    try {
      const res = await aiSearch(id, text, true);
      setHits(res.results);
      setExplanation(res.explanation);
      if (res.results.length === 0) toast.info("No matches — try indexing the repo first");
    } catch (e) {
      toast.error("Search failed", {
        description: e.message
      });
    } finally {
      setBusy(false);
    }
  };
  return <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Smart search</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Ask in plain English · {repoQ.data?.full_name ?? id}</h1>
        <p className="text-sm text-muted-foreground">Natural-language search over the indexed codebase. Grounded in real files.</p>
      </div>

      <IngestBanner repoId={id} />

      <div className="glass flex flex-col gap-2 rounded-2xl p-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-cream px-3 py-2">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => {
          if (e.key === "Enter") run();
        }} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Find authentication, explain payment logic, show login flow…" />
        </div>
        <button className="btn-primary" onClick={() => run()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
          {busy ? "Searching…" : "Search"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
        <span>Try:</span>
        {SAMPLES.map(s => <button key={s} onClick={() => {
        setQ(s);
        run(s);
      }} className="rounded-full border border-border/70 bg-cream-deep/50 px-3 py-1 hover:bg-cream-deep">
            {s}
          </button>)}
      </div>

      {explanation && <div className="glass rounded-2xl border border-olive/20 bg-olive/5 p-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-olive-dark">
            <Sparkles className="h-3.5 w-3.5" /> AI summary
          </div>
          <p className="mt-1.5 text-sm leading-relaxed">{explanation}</p>
        </div>}

      {busy && <div className="glass h-24 animate-pulse rounded-2xl" />}

      {!busy && hits.length > 0 && <div className="space-y-3">
          {hits.map((h, i) => <div key={i} className="glass overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between border-b border-border/70 bg-cream-deep/40 px-4 py-2">
                <div className="flex items-center gap-2 text-xs">
                  <FileCode2 className="h-3.5 w-3.5 text-olive" />
                  <span className="font-mono">{h.path}:{h.start_line}-{h.end_line}</span>
                  <span className="badge-soft">{h.language}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground">rank {(h.rank * 100).toFixed(1)}</span>
                  <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-cream-deep hover:text-foreground" onClick={() => {
              navigator.clipboard.writeText(h.content);
              toast.success("Copied chunk");
            }}>
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <pre className="max-h-[240px] overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-[12px] leading-relaxed">
                {highlight(h.content.slice(0, 1400), q)}
              </pre>
            </div>)}
        </div>}

      {!busy && q && hits.length === 0 && <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No matches. Try re-indexing the repository or rephrasing your query.
        </div>}
    </div>;
}