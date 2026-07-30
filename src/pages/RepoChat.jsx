import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { MessagesSquare, Send, Sparkles, FileCode2, Trash2, Plus, Square, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { aiChatStream } from "@/lib/api";
import { fetchRepo, parseId } from "@/lib/github";
import { useAsync } from "@/hooks/useAsync";
import { cn, timeAgo } from "@/lib/utils";
import { AGENTS, findAgent } from "@/lib/agents";
import IngestBanner from "@/components/features/IngestBanner";
const SAMPLES = {
  general: ["Where is authentication implemented?", "Explain the entry point and request flow.", "Summarize this repository for a new engineer.", "Generate a Mermaid diagram of the architecture."],
  architect: ["Draw the service dependency graph.", "Where are the boundaries between modules?", "Explain the data flow end-to-end."],
  security: ["What are the biggest security risks?", "Are there secrets or auth weaknesses?", "Review the authentication implementation."],
  performance: ["Where are potential N+1 or blocking calls?", "What could be cached?", "Are there memory or bundle-size concerns?"],
  docs: ["Draft a README improvement.", "Write a getting-started guide.", "Document the public API surface."],
  testing: ["Which critical paths lack tests?", "Propose a testing strategy.", "Write a test for the main handler."],
  reviewer: ["Review the code quality of core files.", "Find refactoring opportunities.", "Point out inconsistent patterns."],
  mentor: ["Where should a new contributor start?", "Suggest a first PR I could file.", "Explain the contribution workflow."]
};
export default function RepoChat() {
  const {
    id = ""
  } = useParams();
  const {
    owner,
    name
  } = parseId(id);
  const repoQ = useAsync(() => fetchRepo(owner, name), [owner, name]);
  const repoName = repoQ.data?.full_name ?? `${owner}/${name}`;
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [agent, setAgent] = useState("general");
  const [agentOpen, setAgentOpen] = useState(false);
  const scrollerRef = useRef(null);
  const abortRef = useRef(null);
  const currentAgent = findAgent(agent);
  const loadSessions = async () => {
    const {
      data
    } = await db.from("chat_sessions").select("id,title,updated_at").eq("repo_id", id).order("updated_at", {
      ascending: false
    });
    setSessions(data ?? []);
  };
  const loadMessages = async sid => {
    const {
      data
    } = await db.from("chat_messages").select("id,role,content,citations,created_at").eq("session_id", sid).order("created_at", {
      ascending: true
    });
    setMessages(data ?? []);
  };
  useEffect(() => {
    void loadSessions();
  }, [id]);
  useEffect(() => {
    sessionId ? void loadMessages(sessionId) : setMessages([]);
  }, [sessionId]);
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, busy]);
  const send = async q => {
    const text = (q ?? draft).trim();
    if (!text || busy) return;
    setDraft("");
    setBusy(true);
    const optimistic = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString()
    };
    const assistantId = `stream-${Date.now()}`;
    setMessages(m => [...m, optimistic, {
      id: assistantId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      streaming: true
    }]);
    const history = messages.slice(-6).map(m => ({
      role: m.role,
      content: m.content
    }));
    const controller = new AbortController();
    abortRef.current = controller;
    let receivedSessionId = null;
    try {
      await aiChatStream({
        repoId: id,
        question: text,
        sessionId: sessionId ?? undefined,
        agent,
        history
      }, {
        signal: controller.signal,
        onEvent: e => {
          if (e.type === "session" && e.sessionId) {
            receivedSessionId = e.sessionId;
            setMessages(m => m.map(msg => msg.id === assistantId ? {
              ...msg,
              citations: e.citations
            } : msg));
          } else if (e.type === "token" && e.content) {
            setMessages(m => m.map(msg => msg.id === assistantId ? {
              ...msg,
              content: msg.content + e.content
            } : msg));
          } else if (e.type === "done") {
            setMessages(m => m.map(msg => msg.id === assistantId ? {
              ...msg,
              streaming: false
            } : msg));
          } else if (e.type === "error") {
            toast.error("Stream error", {
              description: e.message
            });
          }
        }
      });
      if (receivedSessionId && !sessionId) {
        setSessionId(receivedSessionId);
        await loadSessions();
      }
    } catch (e) {
      if (e.name === "AbortError") {
        toast.info("Response canceled");
        setMessages(m => m.map(msg => msg.id === assistantId ? {
          ...msg,
          streaming: false,
          content: msg.content || "_[canceled]_"
        } : msg));
      } else {
        toast.error("Chat failed", {
          description: e.message
        });
        setMessages(m => m.filter(msg => msg.id !== assistantId));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };
  const cancel = () => abortRef.current?.abort();
  const newSession = () => {
    setSessionId(null);
    setMessages([]);
  };
  const deleteSession = async sid => {
    await db.from("chat_sessions").delete().eq("id", sid);
    if (sid === sessionId) newSession();
    await loadSessions();
    toast.success("Chat deleted");
  };
  const AgentIcon = currentAgent.icon;
  return <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="glass h-fit rounded-2xl p-3">
        <button className="mb-2 flex w-full items-center gap-2 rounded-xl bg-olive px-3 py-2 text-sm font-semibold text-cream" onClick={newSession}>
          <Plus className="h-4 w-4" /> New chat
        </button>
        <div className="px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">History</div>
        <div className="mt-2 max-h-[520px] space-y-1 overflow-y-auto pr-1">
          {sessions.length === 0 ? <div className="rounded-xl border border-border/70 bg-cream-deep/40 px-3 py-2 text-xs text-muted-foreground">No chats yet.</div> : sessions.map(s => <div key={s.id} className={cn("group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition", s.id === sessionId ? "bg-olive/15 text-olive-dark ring-1 ring-olive/40" : "hover:bg-cream-deep")}>
              <button className="line-clamp-1 flex-1 text-left" onClick={() => setSessionId(s.id)}>
                <div className="line-clamp-1">{s.title}</div>
                <div className="text-[10px] text-muted-foreground">{timeAgo(s.updated_at)}</div>
              </button>
              <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => deleteSession(s.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>)}
        </div>
      </aside>

      <section className="flex min-h-[calc(100vh-9rem)] flex-col gap-3">
        <IngestBanner repoId={id} variant="card" />

        <div className="glass flex flex-1 flex-col rounded-3xl">
          <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Repository chat · streaming</div>
              <h1 className="mt-0.5 font-serif text-xl font-semibold tracking-tight">Ask anything about {repoName}</h1>
            </div>
            <div className="relative">
              <button onClick={() => setAgentOpen(o => !o)} className="flex items-center gap-2 rounded-full border border-olive/40 bg-olive/10 px-3 py-1.5 text-xs font-medium text-olive-dark hover:bg-olive/15">
                <AgentIcon className="h-3.5 w-3.5" /> {currentAgent.name}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {agentOpen && <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-border/70 bg-cream shadow-xl">
                  <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Choose an AI agent</div>
                  {AGENTS.map(a => {
                const Icon = a.icon;
                return <button key={a.key} onClick={() => {
                  setAgent(a.key);
                  setAgentOpen(false);
                }} className={cn("flex w-full items-start gap-3 px-3 py-2 text-left text-sm transition hover:bg-cream-deep", agent === a.key && "bg-olive/10")}>
                        <span className={cn("mt-0.5 flex h-6 w-6 items-center justify-center rounded-full", a.tone === "olive" ? "bg-olive/15 text-olive-dark" : "bg-gold/25 text-charcoal")}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex-1">
                          <div className="font-medium">{a.name}</div>
                          <div className="text-[11px] text-muted-foreground">{a.tagline}</div>
                        </span>
                      </button>;
              })}
                </div>}
            </div>
          </div>

          <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            {messages.length === 0 && !busy && <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-olive/15 text-olive-dark">
                  <MessagesSquare className="h-7 w-7" />
                </div>
                <h2 className="mt-4 font-serif text-2xl font-semibold tracking-tight">Start a conversation</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Every answer is grounded in indexed source code, README, and repository tree.
                </p>
                <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {(SAMPLES[agent] ?? SAMPLES.general).map(q => <button key={q} onClick={() => send(q)} className="flex items-center gap-2 rounded-xl border border-border/70 bg-cream-deep/40 px-3 py-2 text-left text-sm transition hover:border-olive/50 hover:bg-cream-deep">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-olive" />
                      <span>{q}</span>
                    </button>)}
                </div>
              </div>}

            {messages.map(m => <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm", m.role === "user" ? "bg-charcoal text-cream" : "bg-cream border border-border/70")}>
                  {m.content}
                  {m.streaming && <span className="ml-1 inline-block h-3 w-1.5 animate-pulse rounded-sm bg-olive align-middle" />}
                  {m.citations && m.citations.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.citations.slice(0, 8).map((c, i) => <span key={i} className="inline-flex items-center gap-1 rounded-full border border-olive/30 bg-olive/10 px-2 py-0.5 font-mono text-[10px] text-olive-dark">
                          <FileCode2 className="h-3 w-3" /> {c.file}
                        </span>)}
                    </div>}
                </div>
              </div>)}
          </div>

          <div className="border-t border-border/70 px-4 py-3">
            <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-cream px-3 py-2">
              <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder={`Ask the ${currentAgent.name}…`} disabled={busy} />
              {busy ? <button onClick={cancel} className="btn-ghost !py-2 !px-3 !text-destructive">
                  <Square className="h-4 w-4" /> Stop
                </button> : <button onClick={() => send()} disabled={!draft.trim()} className="btn-primary !py-2 !px-3">
                  <Send className="h-4 w-4" />
                </button>}
            </div>
          </div>
        </div>
      </section>
    </div>;
}