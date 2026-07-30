// Lightweight GitHub REST helpers — ported from the Supabase edge functions.
// No Deno-specific APIs were used here, so the logic is unchanged; only the
// module format (ESM for Node) and JSDoc typing (instead of TS types) differ.

const BASE = "https://api.github.com";

function headers(token) {
  const h = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "RepoDNA-AI",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function gh(path, token) {
  const res = await fetch(BASE + path, { headers: headers(token) });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

export const getRepo = (owner, name, token) => gh(`/repos/${owner}/${name}`, token);

export const getLanguages = (owner, name, token) => gh(`/repos/${owner}/${name}/languages`, token);

export const getTree = (owner, name, branch, token) =>
  gh(`/repos/${owner}/${name}/git/trees/${encodeURIComponent(branch)}?recursive=1`, token);

export const getPull = (owner, name, num, token) => gh(`/repos/${owner}/${name}/pulls/${num}`, token);

export const getPullFiles = (owner, name, num, token) =>
  gh(`/repos/${owner}/${name}/pulls/${num}/files?per_page=100`, token);

export const getCommits = (owner, name, branch, token) =>
  gh(`/repos/${owner}/${name}/commits?sha=${branch}&per_page=100`, token);

export const getContributors = (owner, name, token) =>
  gh(`/repos/${owner}/${name}/contributors?per_page=30`, token);

export async function getReadme(owner, name, token) {
  const h = headers(token);
  h.Accept = "application/vnd.github.raw";
  const res = await fetch(`${BASE}/repos/${owner}/${name}/readme`, { headers: h });
  if (!res.ok) return "";
  return res.text();
}

export async function getFileRaw(owner, name, path, branch = "HEAD", token) {
  const url = `https://raw.githubusercontent.com/${owner}/${name}/${branch}/${path}`;
  const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  if (!res.ok) throw new Error(`Raw file ${path} not found (${res.status})`);
  return res.text();
}

// Build a compact repo-context blob for grounding LLM answers.
export async function buildRepoContext(owner, name, token, opts = {}) {
  const info = await getRepo(owner, name, token);
  const [languages, readme, tree] = await Promise.all([
    getLanguages(owner, name, token).catch(() => ({})),
    getReadme(owner, name, token).catch(() => ""),
    getTree(owner, name, info.default_branch, token).catch(() => ({ tree: [], truncated: false })),
  ]);
  const max = opts.maxTreeItems ?? 260;
  const files = tree.tree
    .filter((t) => t.type === "blob")
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
    .slice(0, max)
    .map((t) => `${t.path}${t.size ? ` (${Math.round((t.size ?? 0) / 1024)}kb)` : ""}`);
  const dirs = tree.tree.filter((t) => t.type === "tree").map((t) => t.path).slice(0, 60);
  const truncatedNote = tree.truncated ? " (tree truncated)" : "";
  const treeSummary = `# Top folders${truncatedNote}\n${dirs.join("\n")}\n\n# Ranked files\n${files.join("\n")}`;
  return { info, readme: readme.slice(0, 12000), treeSummary, languages };
}

export function parseRepoId(id) {
  const i = id.indexOf("__");
  return { owner: id.slice(0, i), name: id.slice(i + 2) };
}
