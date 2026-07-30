import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { chatCompletion, chatCompletionStream, extractJson } from "../lib/ai.js";
import { buildRepoContext, getFileRaw, getRepo, getPull, getPullFiles, getCommits, getContributors, getTree, parseRepoId } from "../lib/github.js";
import { chunkFile, shouldIndex, scoreFile, retrieveChunks } from "../lib/rag.js";
import ChatSession from "../models/ChatSession.js";
import ChatMessage from "../models/ChatMessage.js";
import RepoChunk from "../models/RepoChunk.js";
import RepoIngestion from "../models/RepoIngestion.js";
import RepoHealth from "../models/RepoHealth.js";
import AiAnalysis from "../models/AiAnalysis.js";
import PrReview from "../models/PrReview.js";

const router = Router();
router.use(requireAuth);

function badRepoId(repoId) {
  return !repoId || !String(repoId).includes("__");
}

/* ---------------------------------- Chat ---------------------------------- */

const AGENT_PROMPTS = {
  architect: "You are the Repository Architect agent — focus on system design, service boundaries, data flow, and design patterns. Prefer diagrams (Mermaid) when helpful.",
  security: "You are the Security Expert agent — surface vulnerabilities, secrets exposure, authentication weaknesses, and dependency risks with clear severities.",
  performance: "You are the Performance Optimizer agent — identify bottlenecks, N+1 queries, blocking calls, memory pressure, bundle size, and caching gaps.",
  docs: "You are the Documentation Expert agent — produce clear, publication-quality prose grounded in the actual code.",
  testing: "You are the Testing Expert agent — design test suites, propose fixtures/mocks, and highlight untested critical paths.",
  reviewer: "You are the Code Reviewer agent — comment inline-style on code quality, readability, and maintainability, quoting concrete lines.",
  mentor: "You are the Open Source Mentor agent — help newcomers understand where to start, which files to read first, and how to file their first PR.",
  general: "You are RepoDNA AI — a senior staff engineer answering questions about the repository.",
};

function buildSystemPrompt(agent) {
  const base = AGENT_PROMPTS[agent] ?? AGENT_PROMPTS.general;
  return `${base}

Ground every answer strictly in the provided REPOSITORY CONTEXT and RETRIEVED CODE CHUNKS.
- Cite exact file paths (e.g. \`src/lib/auth.ts:42-88\`) when referring to code.
- For diagrams, respond with Mermaid inside \`\`\`mermaid fences.
- If the answer cannot be derived from context, say so and suggest which file to inspect next.
- Style: professional, precise, ~200-500 words. Use short headings and bullets when helpful.`;
}

function extractCitationsFromRetrieval(retrieved) {
  return retrieved.slice(0, 8).map((c) => ({ file: `${c.path}:${c.start_line}-${c.end_line}` }));
}

router.post("/chat", async (req, res) => {
  const userId = req.userId;
  try {
    const body = req.body || {};
    if (!body?.question?.trim()) return res.status(400).json({ error: "Missing question" });
    if (badRepoId(body.repoId)) return res.status(400).json({ error: "Bad repoId" });

    const { owner, name } = parseRepoId(body.repoId);
    const ctx = await buildRepoContext(owner, name, body.githubToken, { maxTreeItems: 160 });

    const retrieved = await retrieveChunks(RepoChunk, { userId, repoId: body.repoId, query: body.question, limit: 6 });

    let sessionId = body.sessionId;
    if (!sessionId) {
      const s = await ChatSession.create({
        user_id: userId,
        repo_id: body.repoId,
        repo_full_name: ctx.info.full_name,
        title: body.question.slice(0, 60),
      });
      sessionId = s._id.toString();
    }

    await ChatMessage.create({ session_id: sessionId, user_id: userId, role: "user", content: body.question });

    const agent = body.agent ?? "general";
    const system = buildSystemPrompt(agent);

    const retrievalBlock = retrieved.length > 0
      ? retrieved.map((r, i) =>
          `## Chunk ${i + 1} — ${r.path}:${r.start_line}-${r.end_line} (${r.language})\n\`\`\`${(r.language || "").toLowerCase()}\n${r.content.slice(0, 1400)}\n\`\`\``,
        ).join("\n\n")
      : "(No indexed source code available — answer using README and tree only. Suggest running Repository Ingestion.)";

    const contextPrompt = `# REPOSITORY
- name: ${ctx.info.full_name}
- description: ${ctx.info.description ?? "n/a"}
- primary language: ${ctx.info.language ?? "n/a"}
- topics: ${(ctx.info.topics || []).join(", ") || "n/a"}
- default branch: ${ctx.info.default_branch}
- languages: ${Object.keys(ctx.languages).slice(0, 6).join(", ")}

# README (truncated)
${ctx.readme || "(no README found)"}

# TREE
${ctx.treeSummary}

# RETRIEVED CODE CHUNKS (top-${retrieved.length})
${retrievalBlock}`;

    const history = (body.history ?? []).slice(-6);
    const messages = [
      { role: "system", content: system },
      { role: "user", content: contextPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: body.question },
    ];

    const citations = extractCitationsFromRetrieval(retrieved);

    if (body.stream) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
      send({ type: "session", sessionId, citations });
      let full = "";
      try {
        for await (const delta of chatCompletionStream(messages, { temperature: 0.3, max_tokens: 1800 })) {
          full += delta;
          send({ type: "token", content: delta });
        }
        await ChatMessage.create({ session_id: sessionId, user_id: userId, role: "assistant", content: full, citations });
        await ChatSession.findByIdAndUpdate(sessionId, { updated_at: new Date() });
        send({ type: "done", full });
        res.write("data: [DONE]\n\n");
      } catch (e) {
        send({ type: "error", message: e.message });
      } finally {
        res.end();
      }
      return;
    }

    const answer = await chatCompletion(messages, { temperature: 0.3, max_tokens: 1800 });
    await ChatMessage.create({ session_id: sessionId, user_id: userId, role: "assistant", content: answer, citations });
    await ChatSession.findByIdAndUpdate(sessionId, { updated_at: new Date() });

    res.json({ sessionId, answer, citations });
  } catch (e) {
    console.error("ai/chat error", e);
    if (!res.headersSent) res.status(500).json({ error: e.message ?? "Chat failed" });
    else res.end();
  }
});

/* ---------------------------------- Docs ---------------------------------- */

const DOC_PROMPTS = {
  readme: { title: "README", ask: "Write a modern, well-structured README.md including: hero description, key features, tech stack (grounded in actual languages), architecture overview, quick start, project structure, and contribution notes. Use Markdown headings, tables where useful, and fenced code blocks for commands." },
  api: { title: "API Documentation", ask: "Draft API/module documentation. Infer endpoints, functions, or public exports from the tree/README. Group by module. Provide method, purpose, and example usage." },
  architecture: { title: "Architecture Documentation", ask: "Produce an Architecture.md: system overview, layered breakdown, module responsibilities, data flow, and a Mermaid diagram inside a ```mermaid block that reflects real folder groupings." },
  developer: { title: "Developer Guide", ask: "Write a Developer Guide covering local setup, branching conventions, testing workflow, coding standards, and how to add a new module. Reference actual paths where possible." },
  contributing: { title: "CONTRIBUTING.md", ask: "Write a CONTRIBUTING.md: project values, how to file issues, how to open a PR, style guide, review rubric, and code of conduct pointer." },
  install: { title: "Installation Guide", ask: "Produce a detailed installation guide covering prerequisites, environment variables, install commands (inferred from lock/package files if present), and troubleshooting." },
  future: { title: "Future Scope", ask: "Write a Future Scope / Roadmap document with 6-9 concrete initiatives, ordered by impact, grounded in the repository's current shape and gaps." },
};

router.post("/docs", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body?.repoId || !body?.kind || !DOC_PROMPTS[body.kind]) return res.status(400).json({ error: "Bad body" });
    const { owner, name } = parseRepoId(body.repoId);
    const ctx = await buildRepoContext(owner, name, body.githubToken, { maxTreeItems: 240 });
    const p = DOC_PROMPTS[body.kind];

    const system = `You are a documentation architect for the "${ctx.info.full_name}" repository. Ground every claim in the provided repository context. Never invent APIs. Prefer Markdown that renders cleanly on GitHub.`;
    const user = `# TASK
Generate: ${p.title}

# INSTRUCTIONS
${p.ask}

# REPOSITORY
${ctx.info.full_name} — ${ctx.info.description ?? ""}
Primary language: ${ctx.info.language ?? "n/a"}. Topics: ${(ctx.info.topics || []).join(", ") || "n/a"}.
Stars: ${ctx.info.stargazers_count}. Default branch: ${ctx.info.default_branch}.

# README (truncated)
${ctx.readme || "(none)"}

# TREE
${ctx.treeSummary}`;

    const content = await chatCompletion([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.4, max_tokens: 3500 });

    await AiAnalysis.create({ user_id: req.userId, repo_id: body.repoId, repo_full_name: ctx.info.full_name, kind: `docs:${body.kind}`, target: body.kind, content });

    res.json({ content, kind: body.kind });
  } catch (e) {
    console.error("ai/docs error", e);
    res.status(500).json({ error: e.message ?? "Docs generation failed" });
  }
});

/* --------------------------------- Review --------------------------------- */

router.post("/review", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body?.repoId || !body?.path) return res.status(400).json({ error: "Missing repoId or path" });
    const { owner, name } = parseRepoId(body.repoId);
    const info = await getRepo(owner, name, body.githubToken);
    const raw = await getFileRaw(owner, name, body.path, info.default_branch, body.githubToken);
    const clipped = raw.slice(0, 16000);

    const system = "You are a senior code reviewer. Produce actionable, specific feedback grounded in the code provided. Use markdown sections: Summary, Strengths, Issues (with line references), Refactor suggestions, Performance, Security, Tests to add. Be concise and honest.";
    const user = `Repository: ${info.full_name}\nFile: ${body.path}\nLanguage hint: ${info.language ?? "unknown"}\n\n\`\`\`\n${clipped}\n\`\`\``;

    const content = await chatCompletion([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.3, max_tokens: 2200 });

    await AiAnalysis.create({ user_id: req.userId, repo_id: body.repoId, repo_full_name: info.full_name, kind: "review", target: body.path, content });

    res.json({ content, path: body.path });
  } catch (e) {
    console.error("ai/review error", e);
    res.status(500).json({ error: e.message ?? "Review failed" });
  }
});

/* ---------------------------------- Tests ---------------------------------- */

function frameworkForPath(p) {
  if (/\.(ts|tsx|js|jsx)$/.test(p)) return { lang: "TypeScript/JavaScript", framework: "Vitest or Jest" };
  if (/\.py$/.test(p)) return { lang: "Python", framework: "pytest" };
  if (/\.go$/.test(p)) return { lang: "Go", framework: "the standard testing package" };
  if (/\.rs$/.test(p)) return { lang: "Rust", framework: "cargo test" };
  if (/\.java$/.test(p)) return { lang: "Java", framework: "JUnit 5" };
  if (/\.rb$/.test(p)) return { lang: "Ruby", framework: "RSpec" };
  return { lang: "generic", framework: "an idiomatic test framework" };
}

router.post("/tests", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body?.repoId || !body?.path) return res.status(400).json({ error: "Missing repoId or path" });
    const { owner, name } = parseRepoId(body.repoId);
    const info = await getRepo(owner, name, body.githubToken);
    const raw = await getFileRaw(owner, name, body.path, info.default_branch, body.githubToken);
    const clipped = raw.slice(0, 14000);
    const fw = frameworkForPath(body.path);

    const system = "You are a senior test engineer. Produce runnable tests, not commentary. Cover the happy path, error paths, and edge cases. Include a short markdown intro explaining coverage, then a fenced code block containing the full test file.";
    const user = `Write tests in ${fw.lang} using ${fw.framework} for the following file.\nRepository: ${info.full_name}\nSource path: ${body.path}\n\n\`\`\`\n${clipped}\n\`\`\``;

    const content = await chatCompletion([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.35, max_tokens: 2600 });

    await AiAnalysis.create({ user_id: req.userId, repo_id: body.repoId, repo_full_name: info.full_name, kind: "tests", target: body.path, content, metadata: { framework: fw.framework } });

    res.json({ content, framework: fw.framework });
  } catch (e) {
    console.error("ai/tests error", e);
    res.status(500).json({ error: e.message ?? "Test generation failed" });
  }
});

/* -------------------------------- Security -------------------------------- */

router.post("/security", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body?.repoId) return res.status(400).json({ error: "Missing repoId" });
    const { owner, name } = parseRepoId(body.repoId);
    const ctx = await buildRepoContext(owner, name, body.githubToken, { maxTreeItems: 300 });

    const system = "You are a senior application security engineer. Analyze the repository shape and known signals for likely risks. Never invent CVE IDs. Always ground findings in files or patterns visible in the tree/README.";
    const user = `Return STRICT JSON with this shape:
{
  "summary": string,
  "score": number (0-100, higher = safer),
  "findings": [
    { "severity": "critical"|"high"|"medium"|"low"|"info", "title": string, "detail": string, "evidence": string, "recommendation": string }
  ],
  "next_steps": string[]
}

Repository: ${ctx.info.full_name} (${ctx.info.language ?? "n/a"})
License: ${ctx.info.license?.spdx_id ?? "n/a"}

# README (truncated)
${ctx.readme}

# TREE
${ctx.treeSummary}`;

    const raw = await chatCompletion([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.2, max_tokens: 2800, json: true });
    const parsed = extractJson(raw);
    if (!parsed) {
      console.error("ai/security: unparseable AI response:", raw.slice(0, 500));
      return res.status(502).json({ error: "The AI response couldn't be parsed — please try again." });
    }

    await AiAnalysis.create({ user_id: req.userId, repo_id: body.repoId, repo_full_name: ctx.info.full_name, kind: "security", target: "repo", content: JSON.stringify(parsed) });

    res.json(parsed);
  } catch (e) {
    console.error("ai/security error", e);
    res.status(500).json({ error: e.message ?? "Security scan failed" });
  }
});

/* -------------------------------- Interview -------------------------------- */

router.post("/interview", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body?.repoId || !body?.track) return res.status(400).json({ error: "Missing repoId or track" });
    const { owner, name } = parseRepoId(body.repoId);
    const ctx = await buildRepoContext(owner, name, body.githubToken, { maxTreeItems: 180 });

    const system = "You are a principal engineer designing repository-specific interviews. Ground every question in the actual codebase. Provide graded rubrics with what a good answer contains.";
    const countHint =
      body.track === "Screening" ? "8 quick questions" :
      body.track === "Junior" ? "8 code-reading questions" :
      body.track === "Senior" ? "7 design/tradeoff questions" :
      "6 architecture questions";
    const user = `Return STRICT JSON:
{
  "questions": [
    { "q": string, "look_for": string, "difficulty": "easy"|"medium"|"hard", "topic": string }
  ]
}

Track: ${body.track} (${countHint})

Repository: ${ctx.info.full_name}
Primary language: ${ctx.info.language ?? "n/a"}

# README (truncated)
${ctx.readme}

# TREE
${ctx.treeSummary}`;

    const raw = await chatCompletion([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.5, max_tokens: 3000, json: true });
    const parsed = extractJson(raw);
    if (!parsed) {
      console.error("ai/interview: unparseable AI response:", raw.slice(0, 500));
      return res.status(502).json({ error: "The AI response couldn't be parsed — please try again." });
    }

    await AiAnalysis.create({ user_id: req.userId, repo_id: body.repoId, repo_full_name: ctx.info.full_name, kind: "interview", target: body.track, content: JSON.stringify(parsed) });

    res.json(parsed);
  } catch (e) {
    console.error("ai/interview error", e);
    res.status(500).json({ error: e.message ?? "Interview generation failed" });
  }
});

/* --------------------------------- Summary --------------------------------- */

router.post("/summary", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body?.repoId) return res.status(400).json({ error: "Missing repoId" });
    const { owner, name } = parseRepoId(body.repoId);
    const ctx = await buildRepoContext(owner, name, body.githubToken, { maxTreeItems: 220 });

    const system = "You are RepoDNA AI's staff architect. Produce a JSON architecture summary for the repository. Only cite folders/files actually visible in the tree.";
    const user = `Return STRICT JSON:
{
  "elevator_pitch": string (60-90 words),
  "primary_stack": string[] (concise tech tags),
  "patterns": string[] (design patterns detected),
  "modules": [ { "name": string, "purpose": string, "path": string } ],
  "data_flow": string (2-4 sentences),
  "risks": string[],
  "onboarding_first_files": string[] (5-8 paths a new dev should read first)
}

Repository: ${ctx.info.full_name}
Description: ${ctx.info.description ?? ""}
Primary language: ${ctx.info.language ?? "n/a"}

# README (truncated)
${ctx.readme}

# TREE
${ctx.treeSummary}`;

    const raw = await chatCompletion([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.3, max_tokens: 2800, json: true });
    const parsed = extractJson(raw);
    if (!parsed) {
      console.error("ai/summary: unparseable AI response:", raw.slice(0, 500));
      return res.status(502).json({ error: "The AI response couldn't be parsed — please try again." });
    }

    await AiAnalysis.create({ user_id: req.userId, repo_id: body.repoId, repo_full_name: ctx.info.full_name, kind: "summary", target: "repo", content: JSON.stringify(parsed) });

    res.json(parsed);
  } catch (e) {
    console.error("ai/summary error", e);
    res.status(500).json({ error: e.message ?? "Summary failed" });
  }
});

/* --------------------------------- Roadmap --------------------------------- */

router.post("/roadmap", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body?.repoId || !body?.level) return res.status(400).json({ error: "Missing repoId or level" });
    const { owner, name } = parseRepoId(body.repoId);
    const ctx = await buildRepoContext(owner, name, body.githubToken, { maxTreeItems: 180 });

    const system = "You are a lead developer educator building a learning path for a specific repository. Cite real file paths from the provided tree.";
    const user = `Return STRICT JSON:
{
  "phases": [
    { "title": string, "duration": string, "goal": string, "steps": [ { "task": string, "path": string|null, "why": string } ] }
  ]
}
Level: ${body.level}

Repository: ${ctx.info.full_name}
Primary language: ${ctx.info.language ?? "n/a"}

# README (truncated)
${ctx.readme}

# TREE
${ctx.treeSummary}`;

    const raw = await chatCompletion([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.4, max_tokens: 2800, json: true });
    const parsed = extractJson(raw);
    if (!parsed) {
      console.error("ai/roadmap: unparseable AI response:", raw.slice(0, 500));
      return res.status(502).json({ error: "The AI response couldn't be parsed — please try again." });
    }

    await AiAnalysis.create({ user_id: req.userId, repo_id: body.repoId, repo_full_name: ctx.info.full_name, kind: "roadmap", target: body.level, content: JSON.stringify(parsed) });

    res.json(parsed);
  } catch (e) {
    console.error("ai/roadmap error", e);
    res.status(500).json({ error: e.message ?? "Roadmap failed" });
  }
});

/* ----------------------------------- Debt ----------------------------------- */

router.post("/debt", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body?.repoId) return res.status(400).json({ error: "Missing repoId" });
    const { owner, name } = parseRepoId(body.repoId);
    const ctx = await buildRepoContext(owner, name, body.githubToken, { maxTreeItems: 300 });

    const system = "You are a technical-debt analyst. Detect probable dead code, oversized files, missing tests, missing CI, missing docs, and duplicate patterns, grounded strictly in the visible tree.";
    const user = `Return STRICT JSON:
{
  "score": number (0-100, higher = healthier),
  "items": [ { "category": string, "severity": "high"|"medium"|"low", "title": string, "detail": string, "path": string|null, "cleanup": string } ],
  "roadmap": string[]
}

Repository: ${ctx.info.full_name}

# README (truncated)
${ctx.readme}

# TREE
${ctx.treeSummary}`;

    const raw = await chatCompletion([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.3, max_tokens: 2800, json: true });
    const parsed = extractJson(raw);
    if (!parsed) {
      console.error("ai/debt: unparseable AI response:", raw.slice(0, 500));
      return res.status(502).json({ error: "The AI response couldn't be parsed — please try again." });
    }

    await AiAnalysis.create({ user_id: req.userId, repo_id: body.repoId, repo_full_name: ctx.info.full_name, kind: "debt", target: "repo", content: JSON.stringify(parsed) });

    res.json(parsed);
  } catch (e) {
    console.error("ai/debt error", e);
    res.status(500).json({ error: e.message ?? "Debt analysis failed" });
  }
});

/* ---------------------------------- Ingest ---------------------------------- */

router.post("/ingest", async (req, res) => {
  const userId = req.userId;
  try {
    const body = req.body || {};
    if (badRepoId(body.repoId)) return res.status(400).json({ error: "Bad repoId" });
    const { owner, name } = parseRepoId(body.repoId);
    const maxFiles = Math.min(Math.max(body.maxFiles ?? 120, 20), 250);

    const info = await getRepo(owner, name, body.githubToken);

    if (!body.force) {
      const existing = await RepoIngestion.findOne({ user_id: userId, repo_id: body.repoId });
      if (existing?.status === "ready" && existing.head_sha) {
        return res.json({ status: "cached", indexed: existing.indexed_files, total: existing.total_files });
      }
    }

    await RepoIngestion.findOneAndUpdate(
      { user_id: userId, repo_id: body.repoId },
      {
        repo_full_name: info.full_name,
        status: "running",
        progress: 0,
        default_branch: info.default_branch,
        indexed_files: 0,
        total_files: 0,
        error: null,
        updated_at: new Date().toISOString(),
      },
      { upsert: true },
    );

    await RepoChunk.deleteMany({ user_id: userId, repo_id: body.repoId });

    const tree = await getTree(owner, name, info.default_branch, body.githubToken);
    const candidates = tree.tree
      .filter((t) => t.type === "blob" && shouldIndex(t.path, t.size))
      .sort((a, b) => scoreFile(b.path) - scoreFile(a.path))
      .slice(0, maxFiles);

    await RepoIngestion.findOneAndUpdate(
      { user_id: userId, repo_id: body.repoId },
      { total_files: candidates.length, updated_at: new Date().toISOString() },
    );

    let indexed = 0;
    let batch = [];
    for (const f of candidates) {
      try {
        const source = await getFileRaw(owner, name, f.path, info.default_branch, body.githubToken);
        if (!source) continue;
        const chunks = chunkFile(f.path, source);
        for (const c of chunks) {
          batch.push({
            user_id: userId,
            repo_id: body.repoId,
            repo_full_name: info.full_name,
            path: c.path,
            language: c.language,
            start_line: c.start_line,
            end_line: c.end_line,
            content: c.content,
            symbols: c.symbols,
          });
        }
        indexed++;
        if (batch.length >= 40) {
          await RepoChunk.insertMany(batch.splice(0, batch.length)).catch((err) => console.error("chunk insert", err));
          if (indexed % 8 === 0) {
            await RepoIngestion.findOneAndUpdate(
              { user_id: userId, repo_id: body.repoId },
              { indexed_files: indexed, progress: Math.round((indexed / candidates.length) * 100), updated_at: new Date().toISOString() },
            );
          }
        }
      } catch (err) {
        console.warn("skip", f.path, err.message);
      }
    }
    if (batch.length > 0) await RepoChunk.insertMany(batch).catch((err) => console.error("chunk insert", err));

    await RepoIngestion.findOneAndUpdate(
      { user_id: userId, repo_id: body.repoId },
      {
        status: "ready",
        progress: 100,
        indexed_files: indexed,
        total_files: candidates.length,
        head_sha: info.updated_at,
        updated_at: new Date().toISOString(),
      },
    );

    res.json({ status: "ready", indexed, total: candidates.length });
  } catch (e) {
    console.error("ai/ingest error", e);
    await RepoIngestion.findOneAndUpdate(
      { user_id: userId, repo_id: req.body?.repoId },
      { status: "error", error: e.message ?? "Ingestion failed", updated_at: new Date().toISOString() },
    ).catch(() => {});
    res.status(500).json({ error: e.message ?? "Ingestion failed" });
  }
});

/* ---------------------------------- Health ---------------------------------- */

router.post("/health", async (req, res) => {
  const userId = req.userId;
  try {
    const body = req.body || {};
    if (badRepoId(body.repoId)) return res.status(400).json({ error: "Bad repoId" });

    if (!body.force) {
      const cached = await RepoHealth.findOne({ user_id: userId, repo_id: body.repoId });
      if (cached && cached.created_at.getTime() > Date.now() - 24 * 3600 * 1000) {
        return res.json(cached.toJSON());
      }
    }

    const { owner, name } = parseRepoId(body.repoId);
    const [ctx, contributors, commits] = await Promise.all([
      buildRepoContext(owner, name, body.githubToken, { maxTreeItems: 220 }),
      getContributors(owner, name, body.githubToken).catch(() => []),
      getCommits(owner, name, "HEAD", body.githubToken).catch(() => []),
    ]);

    const contributorSummary = contributors.slice(0, 10).map((c) => `${c.login}: ${c.contributions}`).join(", ");
    const recentCommits = commits.slice(0, 25).map((c) => `- ${c.commit.message.split("\n")[0].slice(0, 100)}`).join("\n");

    const system = "You are a senior engineering director scoring a repository across nine dimensions. Return STRICT JSON. Base every score on evidence in the provided data. Never invent CVEs or metrics.";
    const user = `Return STRICT JSON with this shape:
{
  "overall": number (0-100),
  "scores": {
    "architecture": number,
    "security": number,
    "documentation": number,
    "maintainability": number,
    "performance": number,
    "testing": number,
    "code_quality": number,
    "scalability": number,
    "technical_debt": number
  },
  "strengths": string[],
  "weaknesses": string[],
  "recommendations": [ { "priority": "high"|"medium"|"low", "title": string, "action": string } ]
}

Repository: ${ctx.info.full_name}
Primary language: ${ctx.info.language ?? "n/a"}
Topics: ${(ctx.info.topics || []).join(", ") || "n/a"}
Contributors (top): ${contributorSummary || "n/a"}
Open issues: ${ctx.info.open_issues_count}
Stars: ${ctx.info.stargazers_count}
License: ${ctx.info.license?.spdx_id ?? "unlicensed"}

# README (truncated)
${ctx.readme}

# TREE
${ctx.treeSummary}

# RECENT COMMITS
${recentCommits}`;

    const raw = await chatCompletion([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.2, max_tokens: 3200, json: true });

    const parsed = extractJson(raw);
    if (!parsed) {
      console.error("ai/health: unparseable AI response:", raw.slice(0, 500));
      return res.status(502).json({ error: "The AI response couldn't be parsed — please try again." });
    }

    const updated = await RepoHealth.findOneAndUpdate(
      { user_id: userId, repo_id: body.repoId },
      {
        repo_full_name: ctx.info.full_name,
        overall: parsed.overall ?? 0,
        scores: parsed.scores ?? {},
        strengths: parsed.strengths ?? [],
        weaknesses: parsed.weaknesses ?? [],
        recommendations: parsed.recommendations ?? [],
        created_at: new Date(),
      },
      { upsert: true, new: true },
    );

    res.json(updated.toJSON());
  } catch (e) {
    console.error("ai/health error", e);
    res.status(500).json({ error: e.message ?? "Health scoring failed" });
  }
});

/* -------------------------------- PR Review -------------------------------- */

router.post("/pr-review", async (req, res) => {
  try {
    const body = req.body || {};
    if (badRepoId(body.repoId) || !body?.pr) return res.status(400).json({ error: "Bad repoId or pr" });
    const { owner, name } = parseRepoId(body.repoId);

    const [info, pr, files] = await Promise.all([
      getRepo(owner, name, body.githubToken),
      getPull(owner, name, body.pr, body.githubToken),
      getPullFiles(owner, name, body.pr, body.githubToken),
    ]);

    const fileSummaries = files.slice(0, 25).map((f) =>
      `## ${f.filename}  (+${f.additions} -${f.deletions})\n${f.patch ? f.patch.slice(0, 2400) : "(binary or too large)"}`,
    ).join("\n\n");

    const system = "You are a principal engineer performing a rigorous pull-request review. Return STRICT JSON. Be specific: quote file paths and short code snippets. Never hallucinate.";
    const user = `Return STRICT JSON:
{
  "summary": string,
  "impact": string,
  "risk_level": "low"|"medium"|"high"|"critical",
  "breaking_changes": boolean,
  "affected_components": string[],
  "review_comments": [ { "file": string, "line_hint": string|null, "severity": "info"|"nit"|"suggest"|"warn"|"block", "comment": string } ],
  "test_coverage_gaps": string[],
  "merge_recommendation": "approve"|"request_changes"|"needs_discussion"
}

Repository: ${info.full_name}
PR #${pr.number}: ${pr.title}
Author: ${pr.user?.login ?? "unknown"}
Base: ${pr.base.ref} ← ${pr.head.ref}
Changed files: ${pr.changed_files} (+${pr.additions} -${pr.deletions})

# PR DESCRIPTION
${(pr.body ?? "").slice(0, 4000)}

# DIFFS
${fileSummaries}`;

    const raw = await chatCompletion([{ role: "system", content: system }, { role: "user", content: user }], { temperature: 0.25, max_tokens: 3400, json: true });
    const parsed = extractJson(raw);
    if (!parsed) {
      console.error("ai/pr-review: unparseable AI response:", raw.slice(0, 500));
      return res.status(502).json({ error: "The AI response couldn't be parsed — please try again." });
    }

    await PrReview.create({
      user_id: req.userId,
      repo_id: body.repoId,
      repo_full_name: info.full_name,
      pr_number: pr.number,
      title: pr.title,
      author: pr.user?.login ?? null,
      summary: parsed.summary ?? null,
      risk_level: parsed.risk_level ?? "medium",
      breaking: !!parsed.breaking_changes,
      content: parsed,
    });

    res.json({ pr: { number: pr.number, title: pr.title, author: pr.user?.login, url: pr.html_url }, review: parsed });
  } catch (e) {
    console.error("ai/pr-review error", e);
    res.status(500).json({ error: e.message ?? "PR review failed" });
  }
});

/* ---------------------------------- Search ---------------------------------- */

router.post("/search", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body?.repoId || !body?.query?.trim()) return res.status(400).json({ error: "Missing repoId or query" });

    const results = await retrieveChunks(RepoChunk, { userId: req.userId, repoId: body.repoId, query: body.query, limit: 12 });

    let explanation = "";
    if (body.explain && results.length > 0) {
      const context = results.slice(0, 6).map((r, i) => `## ${i + 1}. ${r.path}:${r.start_line}-${r.end_line}\n${r.content.slice(0, 800)}`).join("\n\n");
      explanation = await chatCompletion(
        [
          { role: "system", content: "You are a senior engineer. Given a natural-language query and retrieved code chunks, explain in 2-3 sentences where the relevant logic lives and why. Cite file paths." },
          { role: "user", content: `Query: ${body.query}\n\n${context}` },
        ],
        { temperature: 0.2, max_tokens: 400 },
      );
    }

    res.json({ results, explanation });
  } catch (e) {
    console.error("ai/search error", e);
    res.status(500).json({ error: e.message ?? "Search failed" });
  }
});

export default router;
