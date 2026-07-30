import { useEffect, useState } from "react";
import { Database, Loader2, Sparkles, CheckCircle2, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { aiIngest } from "@/lib/api";
import { cn } from "@/lib/utils";
export default function IngestBanner({
  repoId,
  variant = "card"
}) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const {
      data
    } = await db.from("repo_ingestions").select("status,progress,indexed_files,total_files,updated_at,error").eq("repo_id", repoId).maybeSingle();
    setState(data ?? null);
  };
  useEffect(() => {
    void load();
    // poll while running
    const int = setInterval(async () => {
      const {
        data
      } = await db.from("repo_ingestions").select("status,progress,indexed_files,total_files,updated_at,error").eq("repo_id", repoId).maybeSingle();
      if (data) setState(data);
      if (!data || data.status === "ready" || data.status === "error") clearInterval(int);
    }, 2500);
    return () => clearInterval(int);
  }, [repoId]);
  const runIngest = async (force = false) => {
    setBusy(true);
    try {
      setState(s => ({
        status: "running",
        progress: 0,
        indexed_files: 0,
        total_files: s?.total_files ?? 0,
        updated_at: new Date().toISOString(),
        error: null
      }));
      const res = await aiIngest(repoId, force);
      toast.success(res.status === "cached" ? "Using cached index" : "Repository indexed", {
        description: `${res.indexed}/${res.total} files`
      });
      await load();
    } catch (e) {
      toast.error("Ingestion failed", {
        description: e.message
      });
      setState(s => s ? {
        ...s,
        status: "error",
        error: e.message
      } : s);
    } finally {
      setBusy(false);
    }
  };
  const ready = state?.status === "ready";
  const running = state?.status === "running" || state?.status === "pending" || busy;
  const errored = state?.status === "error";
  if (variant === "inline") {
    return <div className="flex items-center gap-2 text-xs">
        {ready && <><CheckCircle2 className="h-3.5 w-3.5 text-olive" /><span className="text-olive-dark">Indexed · {state?.indexed_files} files</span></>}
        {running && <><Loader2 className="h-3.5 w-3.5 animate-spin text-olive" /><span>Indexing {state?.progress ?? 0}%</span></>}
        {errored && <><AlertTriangle className="h-3.5 w-3.5 text-destructive" /><span className="text-destructive">Index error</span></>}
        {!state && <span className="text-muted-foreground">Not indexed</span>}
        <button className="ml-2 underline hover:text-olive-dark" onClick={() => runIngest(!!ready)} disabled={busy}>
          {ready ? "Re-index" : "Index now"}
        </button>
      </div>;
  }
  return <div className={cn("glass flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between", ready ? "border-olive/30" : errored ? "border-destructive/40" : "border-border/70")}>
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", ready ? "bg-olive text-cream" : errored ? "bg-destructive/10 text-destructive" : "bg-gold/20 text-charcoal")}>
          {ready ? <CheckCircle2 className="h-5 w-5" /> : errored ? <AlertTriangle className="h-5 w-5" /> : running ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
        </div>
        <div>
          <div className="font-serif text-base font-semibold tracking-tight">
            {ready ? "Repository indexed for RAG" : errored ? "Indexing failed" : running ? "Indexing repository…" : "Not indexed yet"}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {ready ? `Chat, Search, PR Review, and Health Score use ${state?.indexed_files} files across the codebase.` : errored ? state?.error ?? "Retry the ingestion." : running ? `${state?.indexed_files ?? 0} / ${state?.total_files ?? "…"} files · ${state?.progress ?? 0}%` : "Index source files to unlock grounded AI answers, semantic search, and health scoring."}
          </div>
          {running && <div className="mt-2 h-1.5 w-64 overflow-hidden rounded-full bg-cream">
              <span className="block h-full rounded-full bg-olive transition-all" style={{
            width: `${state?.progress ?? 5}%`
          }} />
            </div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {ready ? <button className="btn-ghost !py-2 !px-3" onClick={() => runIngest(true)} disabled={busy}>
            <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} /> Re-index
          </button> : <button className="btn-primary !py-2 !px-4" onClick={() => runIngest()} disabled={busy}>
            {busy || running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy || running ? "Indexing…" : "Index repository"}
          </button>}
      </div>
    </div>;
}