import { apiClient, API_URL, getToken } from "@/lib/apiClient";
import { getGithubToken } from "@/lib/store";
async function invoke(name, body) {
  const b = body;
  const withToken = {
    ...b,
    githubToken: b.githubToken ?? getGithubToken()
  };
  // "ai-chat" -> "/ai/chat", "ai-pr-review" -> "/ai/pr-review", etc.
  const path = "/" + name.replace(/^ai-/, "ai/");
  try {
    const res = await apiClient.post(path, withToken);
    if (!res.data) throw new Error("Empty AI response");
    return res.data;
  } catch (e) {
    const msg = e?.response?.data?.error ?? e.message ?? "Request failed";
    throw new Error(msg);
  }
}

/* ---------- Chat (non-streaming + streaming) ---------- */

export const aiChat = payload => invoke("ai-chat", payload);
// SSE streaming call using raw fetch (axios does not support streaming responses well).
export async function aiChatStream(payload, handlers) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const url = `${API_URL}/ai/chat`;
  const withToken = {
    ...payload,
    githubToken: getGithubToken(),
    stream: true
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(withToken),
    signal: handlers.signal
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Stream failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const {
      done,
      value
    } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, {
      stream: true
    });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const parsed = JSON.parse(raw);
        handlers.onEvent(parsed);
      } catch {/* ignore malformed */}
    }
  }
}

/* ---------- Docs / Review / Tests / Security / Interview / Summary / Roadmap / Debt ---------- */

export const aiDocs = (repoId, kind) => invoke("ai-docs", {
  repoId,
  kind
});
export const aiReview = (repoId, path) => invoke("ai-review", {
  repoId,
  path
});
export const aiTests = (repoId, path) => invoke("ai-tests", {
  repoId,
  path
});
export const aiSecurity = repoId => invoke("ai-security", {
  repoId
});
export const aiInterview = (repoId, track) => invoke("ai-interview", {
  repoId,
  track
});
export const aiSummary = repoId => invoke("ai-summary", {
  repoId
});
export const aiRoadmap = (repoId, level) => invoke("ai-roadmap", {
  repoId,
  level
});
export const aiDebt = repoId => invoke("ai-debt", {
  repoId
});

/* ---------- Ingest / Health / Onboarding / PR Review / Search ---------- */

export const aiIngest = (repoId, force = false) => invoke("ai-ingest", {
  repoId,
  force
});
export const aiHealth = (repoId, force = false) => invoke("ai-health", {
  repoId,
  force
});
export const aiPRReview = (repoId, pr) => invoke("ai-pr-review", {
  repoId,
  pr
});
export const aiSearch = (repoId, query, explain = true) => invoke("ai-search", {
  repoId,
  query,
  explain
});