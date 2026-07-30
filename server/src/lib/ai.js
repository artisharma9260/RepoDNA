// Google Gemini client (free tier) — replaces the paid Anthropic API.
// Uses plain fetch against the Generative Language API so no extra SDK is required.
// Get a free key (no credit card) at https://aistudio.google.com/apikey

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
export const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

function requireEnv() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server");
  return apiKey;
}

// Gemini uses "system_instruction" for the system prompt, and "model" (not
// "assistant") as the role for prior AI turns.
function toGeminiPayload(messages, opts) {
  const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  return {
    ...(systemParts.length > 0 ? { system_instruction: { parts: [{ text: systemParts.join("\n\n") }] } } : {}),
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.max_tokens ?? 2048,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
}

function extractText(candidate) {
  return (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join("");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retries transient errors (429 rate-limited, 503 overloaded) with exponential
// backoff. Anything else (400, 404, auth errors, etc.) fails immediately since
// retrying won't help.
async function withRetry(fn, { retries = 3, baseDelayMs = 800 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.status;
      const isTransient = status === 429 || status === 503;
      if (!isTransient || attempt === retries) throw err;
      const delay = baseDelayMs * 2 ** attempt + Math.random() * 300;
      console.warn(`[ai] transient error (${status}), retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retries})`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

export async function chatCompletion(messages, opts = {}) {
  const apiKey = requireEnv();
  const model = opts.model ?? DEFAULT_MODEL;
  return withRetry(async () => {
    const response = await fetch(`${BASE_URL}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(toGeminiPayload(messages, opts)),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (response.status === 404) {
        throw new Error(
          `AI request failed (404): Gemini model "${model}" is unavailable for this API key (it may have been retired). ` +
            `Set GEMINI_MODEL in server/.env to a current model — see https://ai.google.dev/gemini-api/docs/models for the current list — ` +
            `or use the alias "gemini-flash-latest" so it stays current automatically. Raw response: ${text.slice(0, 200)}`,
        );
      }
      if (response.status === 503) {
        const err = new Error(
          `AI request failed (503): Gemini is temporarily overloaded. This is usually transient — retried automatically, but it kept failing. Try again in a moment.`,
        );
        err.status = 503;
        throw err;
      }
      const err = new Error(`AI request failed (${response.status}): ${text.slice(0, 300)}`);
      err.status = response.status;
      throw err;
    }
    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
      const reason = data.promptFeedback?.blockReason;
      if (reason) throw new Error(`AI request blocked: ${reason}`);
      return "";
    }
    return extractText(data.candidates[0]);
  });
}

// Streaming: yields incremental text chunks parsed from Gemini's SSE stream.
export async function* chatCompletionStream(messages, opts = {}) {
  const apiKey = requireEnv();
  const model = opts.model ?? DEFAULT_MODEL;

  const response = await withRetry(async () => {
    const res = await fetch(`${BASE_URL}/${model}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(toGeminiPayload(messages, opts)),
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      if (res.status === 404) {
        throw new Error(
          `AI stream failed (404): Gemini model "${model}" is unavailable for this API key (it may have been retired). ` +
            `Set GEMINI_MODEL in server/.env to a current model, or use "gemini-flash-latest". Raw response: ${text.slice(0, 200)}`,
        );
      }
      const err = new Error(`AI stream failed (${res.status}): ${text.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }
    return res;
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let emitted = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload) continue;
      try {
        const parsed = JSON.parse(payload);
        const candidate = parsed.candidates?.[0];
        if (!candidate) continue;
        const full = extractText(candidate);
        const delta = full.startsWith(emitted) ? full.slice(emitted.length) : full;
        if (delta) {
          emitted += delta;
          yield delta;
        }
      } catch {
        /* skip malformed sse frames */
      }
    }
  }
}

// Extract the first JSON object/array from a raw string safely.
export function extractJson(raw) {
  const cleaned = String(raw ?? "").replace(/```json/gi, "```").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}