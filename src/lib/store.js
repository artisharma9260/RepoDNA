import { db } from "@/lib/db";
const REPOS_EVENT = "repodna:repos-changed";
const TOKEN_KEY = "repodna:gh-token";
function emit(name) {
  window.dispatchEvent(new Event(name));
}

/* --------- GitHub token (kept locally for GitHub API calls) --------- */
export function getGithubToken() {
  return localStorage.getItem(TOKEN_KEY) || undefined;
}
export function setGithubToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);else localStorage.removeItem(TOKEN_KEY);
}

/* --------- Saved repositories (MongoDB-backed via the Express API) --------- */
export async function listRepos() {
  const {
    data,
    error
  } = await db.from("saved_repos").select("*").order("added_at", {
    ascending: false
  });
  if (error) throw error;
  return (data ?? []).map(r => ({
    id: r.repo_id,
    owner: r.owner,
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    language: r.language,
    ownerAvatar: r.owner_avatar,
    stars: r.stars ?? 0,
    addedAt: r.added_at
  }));
}
export async function upsertRepo(r) {
  const {
    error
  } = await db.from("saved_repos").upsert({
    repo_id: r.id,
    owner: r.owner,
    name: r.name,
    full_name: r.fullName,
    description: r.description ?? null,
    language: r.language ?? null,
    owner_avatar: r.ownerAvatar ?? null,
    stars: r.stars ?? 0,
    added_at: r.addedAt
  }, {
    onConflict: "user_id,repo_id"
  });
  if (error) throw error;
  emit(REPOS_EVENT);
}
export async function removeRepo(repoId) {
  const {
    error
  } = await db.from("saved_repos").delete().eq("repo_id", repoId);
  if (error) throw error;
  emit(REPOS_EVENT);
}
export const REPOS_CHANGED = REPOS_EVENT;
export function emitReposChanged() {
  emit(REPOS_EVENT);
}

/* --------- User settings --------- */

export async function getSettings() {
  const {
    data,
    error
  } = await db.from("user_settings").select("*").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    githubHandle: data.github_handle ?? undefined,
    githubToken: data.github_token ?? undefined,
    role: data.role ?? undefined,
    timezone: data.timezone ?? undefined
  };
}
export async function saveSettings(patch) {
  const {
    error
  } = await db.from("user_settings").upsert({
    github_handle: patch.githubHandle ?? null,
    github_token: patch.githubToken ?? null,
    role: patch.role ?? "Developer",
    timezone: patch.timezone ?? null,
    updated_at: new Date().toISOString()
  }, {
    onConflict: "user_id"
  });
  if (error) throw error;
  if (patch.githubToken !== undefined) setGithubToken(patch.githubToken || null);
}