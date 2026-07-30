// RAG helpers: chunking, ingestion support, and retrieval.
// Chunking logic is unchanged from the original edge functions. Retrieval now
// uses MongoDB's text index instead of Postgres full-text search / RPC.

const SOURCE_EXT = new Set([
  "js", "jsx", "ts", "tsx", "mjs", "cjs",
  "py", "go", "rs", "java", "kt", "swift", "cpp", "cc", "cxx", "c", "h", "hpp", "cs", "php", "rb", "scala",
  "md", "mdx", "json", "yml", "yaml", "toml", "xml",
  "sql", "sh", "bash", "dockerfile", "proto",
]);
const SKIP_DIRS = /(^|\/)(node_modules|dist|build|out|\.next|\.turbo|\.git|\.venv|venv|coverage|vendor|target|__pycache__|\.cache|public\/build|tmp)(\/|$)/i;
const MIN_FILE_BYTES = 40;
const MAX_FILE_BYTES = 40_000; // 40kb per file cap
const CHUNK_CHARS = 1500;
const CHUNK_OVERLAP = 150;

export function detectLanguage(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "TypeScript";
  if (lower.endsWith(".js") || lower.endsWith(".jsx") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) return "JavaScript";
  if (lower.endsWith(".py")) return "Python";
  if (lower.endsWith(".go")) return "Go";
  if (lower.endsWith(".rs")) return "Rust";
  if (lower.endsWith(".java")) return "Java";
  if (lower.endsWith(".kt")) return "Kotlin";
  if (lower.endsWith(".swift")) return "Swift";
  if (lower.endsWith(".cpp") || lower.endsWith(".cc") || lower.endsWith(".cxx") || lower.endsWith(".hpp") || lower.endsWith(".h") || lower.endsWith(".c")) return "C++";
  if (lower.endsWith(".cs")) return "C#";
  if (lower.endsWith(".php")) return "PHP";
  if (lower.endsWith(".rb")) return "Ruby";
  if (lower.endsWith(".scala")) return "Scala";
  if (lower.endsWith(".md") || lower.endsWith(".mdx")) return "Markdown";
  if (lower.endsWith(".json")) return "JSON";
  if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return "YAML";
  if (lower.endsWith(".sql")) return "SQL";
  if (lower.endsWith(".sh") || lower.endsWith(".bash")) return "Shell";
  if (lower.includes("dockerfile")) return "Dockerfile";
  return "Text";
}

export function shouldIndex(path, size) {
  if (SKIP_DIRS.test(path)) return false;
  if (size !== undefined && (size < MIN_FILE_BYTES || size > MAX_FILE_BYTES)) return false;
  const seg = path.toLowerCase().split(".");
  const ext = seg.length > 1 ? seg[seg.length - 1] : "";
  if (SOURCE_EXT.has(ext)) return true;
  if (/^(dockerfile|makefile|readme|license|changelog)$/i.test(path.split("/").pop() ?? "")) return true;
  return false;
}

export function extractSymbols(source, lang) {
  const patterns = [];
  if (lang === "TypeScript" || lang === "JavaScript") {
    patterns.push(
      /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
      /(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g,
      /(?:^|\n)\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g,
      /(?:^|\n)\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/g,
      /(?:^|\n)\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/g,
    );
  } else if (lang === "Python") {
    patterns.push(/(?:^|\n)\s*def\s+([A-Za-z_][\w]*)/g, /(?:^|\n)\s*class\s+([A-Za-z_][\w]*)/g);
  } else if (lang === "Go") {
    patterns.push(/(?:^|\n)\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_][\w]*)/g, /(?:^|\n)\s*type\s+([A-Za-z_][\w]*)/g);
  } else if (lang === "Java" || lang === "Kotlin" || lang === "C#") {
    patterns.push(/(?:public|private|protected|internal|static)?\s+(?:class|interface)\s+([A-Za-z_][\w]*)/g);
  } else if (lang === "Rust") {
    patterns.push(/(?:^|\n)\s*(?:pub\s+)?fn\s+([A-Za-z_][\w]*)/g, /(?:^|\n)\s*(?:pub\s+)?struct\s+([A-Za-z_][\w]*)/g);
  }
  const out = new Set();
  for (const rx of patterns) {
    let m;
    while ((m = rx.exec(source)) !== null) if (m[1]) out.add(m[1]);
  }
  return Array.from(out).slice(0, 25);
}

export function chunkFile(path, source) {
  const language = detectLanguage(path);
  const lines = source.split("\n");
  const chunks = [];
  let currentLines = [];
  let currentStart = 1;
  let currentSize = 0;
  const flush = (endLine) => {
    if (currentLines.length === 0) return;
    const content = currentLines.join("\n");
    chunks.push({
      path,
      language,
      start_line: currentStart,
      end_line: endLine,
      content,
      symbols: extractSymbols(content, language),
    });
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    currentLines.push(line);
    currentSize += line.length + 1;
    if (currentSize >= CHUNK_CHARS) {
      flush(i + 1);
      const overlapLines = [];
      let os = 0;
      for (let j = currentLines.length - 1; j >= 0 && os < CHUNK_OVERLAP; j--) {
        overlapLines.unshift(currentLines[j]);
        os += currentLines[j].length + 1;
      }
      currentStart = i + 2 - overlapLines.length;
      currentLines = overlapLines.slice();
      currentSize = overlapLines.reduce((a, l) => a + l.length + 1, 0);
    }
  }
  flush(lines.length);
  return chunks;
}

// Priority score for files, used to pick which files to index first.
export function scoreFile(path) {
  let s = 100 - path.length;
  const depth = path.match(/\//g)?.length ?? 0;
  s -= depth * 3;
  if (/^readme|package\.json$|tsconfig|pyproject|go\.mod$|cargo\.toml$|dockerfile$/i.test(path.split("/").pop() ?? "")) s += 200;
  if (/(^|\/)src\//i.test(path)) s += 30;
  if (/(^|\/)(controllers?|routes?|api|handlers?|services?|models?|schemas?|middleware|auth|core|lib)\//i.test(path)) s += 40;
  if (/\.test\.|\.spec\.|__tests__\//i.test(path)) s -= 20;
  if (/\.(md|json|ya?ml)$/i.test(path)) s -= 10;
  return s;
}

// Retrieve top-k relevant chunks for a query using MongoDB's text index.
export async function retrieveChunks(RepoChunk, { userId, repoId, query, limit = 8 }) {
  const cleaned = query.trim().replace(/[^\w\s]/g, " ").slice(0, 500);
  if (!cleaned) return [];

  try {
    const results = await RepoChunk.find(
      { user_id: userId, repo_id: repoId, $text: { $search: cleaned } },
      { score: { $meta: "textScore" }, path: 1, language: 1, start_line: 1, end_line: 1, content: 1 },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .lean();
    if (results.length > 0) {
      return results.map((r) => ({
        path: r.path,
        language: r.language,
        start_line: r.start_line,
        end_line: r.end_line,
        content: r.content,
        rank: r.score ?? 0.5,
      }));
    }
  } catch {
    // fall through to regex fallback below
  }

  // Fallback: manual term match (mirrors the original ILIKE fallback).
  const terms = cleaned.split(/\s+/).filter((t) => t.length > 2).slice(0, 3);
  if (terms.length === 0) return [];
  const or = terms.map((t) => ({ content: { $regex: t, $options: "i" } }));
  const fallback = await RepoChunk.find({ user_id: userId, repo_id: repoId, $or: or })
    .select("path language start_line end_line content")
    .limit(limit)
    .lean();
  return fallback.map((r) => ({ ...r, rank: 0.5 }));
}
