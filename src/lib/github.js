import { getGithubToken } from "@/lib/store";
const BASE = "https://api.github.com";
function authHeaders() {
  const token = getGithubToken();
  return token ? {
    Authorization: `Bearer ${token}`
  } : {};
}
async function ghFetch(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...authHeaders(),
      ...opts.headers
    }
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(`GitHub ${res.status}: ${msg}`);
  }
  return res.json();
}
export function parseGithubUrl(input) {
  const s = input.trim();
  if (!s) return null;
  const short = /^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?$/.exec(s);
  if (short) return {
    owner: short[1],
    name: short[2]
  };
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    if (!/github\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return {
      owner: parts[0],
      name: parts[1].replace(/\.git$/, "")
    };
  } catch {
    return null;
  }
}
export const idOf = (owner, name) => `${owner}__${name}`;
export function parseId(id) {
  const idx = id.indexOf("__");
  if (idx < 0) return {
    owner: id,
    name: ""
  };
  return {
    owner: id.slice(0, idx),
    name: id.slice(idx + 2)
  };
}
export const fetchRepo = (owner, name) => ghFetch(`/repos/${owner}/${name}`);
export const fetchLanguages = (owner, name) => ghFetch(`/repos/${owner}/${name}/languages`);
export const fetchContributors = (owner, name) => ghFetch(`/repos/${owner}/${name}/contributors?per_page=20`);
export const fetchPulls = (owner, name) => ghFetch(`/repos/${owner}/${name}/pulls?state=open&per_page=10&sort=updated&direction=desc`);
export const fetchCommits = (owner, name, branch) => ghFetch(`/repos/${owner}/${name}/commits?sha=${encodeURIComponent(branch)}&per_page=20`);
export const fetchIssues = (owner, name, labels) => ghFetch(`/repos/${owner}/${name}/issues?state=open&per_page=8${labels ? `&labels=${encodeURIComponent(labels)}` : ""}`);
export const fetchTree = (owner, name, branch) => ghFetch(`/repos/${owner}/${name}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
export async function fetchReadme(owner, name) {
  const headers = {
    Accept: "application/vnd.github.raw",
    ...authHeaders()
  };
  const res = await fetch(`${BASE}/repos/${owner}/${name}/readme`, {
    headers
  });
  if (!res.ok) throw new Error(`README not found (${res.status})`);
  return res.text();
}
export async function fetchFileRaw(owner, name, path, branch = "HEAD") {
  const url = `https://raw.githubusercontent.com/${owner}/${name}/${branch}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`File not found: ${path}`);
  return res.text();
}
export const LANG_COLOR = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Shell: "#89e051",
  Dockerfile: "#384d54",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Dart: "#00B4AB",
  Lua: "#000080",
  R: "#198CE7",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Scala: "#c22d40",
  Perl: "#0298c3",
  ObjectiveC: "#438eff",
  "Objective-C": "#438eff",
  MDX: "#fcb32c",
  Markdown: "#083fa1",
  YAML: "#cb171e",
  JSON: "#292929",
  Makefile: "#427819",
  Nix: "#7e7eff",
  Zig: "#ec915c",
  Julia: "#a270ba",
  "Jupyter Notebook": "#DA5B0B"
};
export function colorForLang(name) {
  return LANG_COLOR[name] ?? "#8b8b8b";
}