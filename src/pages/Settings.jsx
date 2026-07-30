import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Github, KeyRound, Bell, Palette, ShieldCheck, User, Trash2, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/store";
import { db } from "@/lib/db";
const TABS = [{
  key: "profile",
  label: "Profile",
  icon: User
}, {
  key: "github",
  label: "GitHub",
  icon: Github
}, {
  key: "keys",
  label: "API Keys",
  icon: KeyRound
}, {
  key: "notify",
  label: "Notifications",
  icon: Bell
}, {
  key: "theme",
  label: "Theme",
  icon: Palette
}, {
  key: "privacy",
  label: "Privacy",
  icon: ShieldCheck
}];
const ROLES = ["Developer", "Team Lead", "Recruiter", "Open Source Contributor", "Organization Admin"];
export default function Settings() {
  const {
    user,
    setUser
  } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("profile");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettingsState] = useState({
    role: "Developer",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [username, setUsername] = useState(user?.username ?? "");
  useEffect(() => {
    if (!user) return;
    getSettings().then(s => {
      if (s) setSettingsState(s);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [user?.id]);
  if (!user) return null;
  const saveProfile = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        username
      });
      setUser(updated);
      await saveSettings({
        ...settings
      });
      toast.success("Profile saved");
    } catch (e) {
      toast.error("Save failed", {
        description: e.message
      });
    } finally {
      setSaving(false);
    }
  };
  const saveGithub = async () => {
    setSaving(true);
    try {
      await saveSettings(settings);
      toast.success("GitHub connection saved");
    } catch (e) {
      toast.error("Save failed", {
        description: e.message
      });
    } finally {
      setSaving(false);
    }
  };
  const logout = async () => {
    await authService.signOut();
    setUser(null);
    toast.success("Signed out");
    nav("/");
  };
  return <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Settings</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Workspace preferences</h1>
        <p className="text-sm text-muted-foreground">Profile, GitHub integration, and privacy controls.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="glass h-fit rounded-2xl p-3">
          {TABS.map(({
          key,
          label,
          icon: Icon
        }) => <button key={key} onClick={() => setTab(key)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${tab === key ? "bg-olive/20 font-semibold text-olive-dark ring-1 ring-olive/40" : "hover:bg-cream-deep"}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>)}
          <button onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-xl border-t border-border/70 px-3 pt-3 pb-2 text-left text-sm text-destructive hover:bg-destructive/5">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </aside>

        <div className="glass rounded-2xl p-6">
          {!loaded ? <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
            </div> : <>
              {tab === "profile" && <form onSubmit={saveProfile} className="space-y-4">
                  <h3 className="font-serif text-xl font-semibold tracking-tight">Your profile</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Username">
                      <input value={username} onChange={e => setUsername(e.target.value)} className="input" required />
                    </Field>
                    <Field label="Email">
                      <input value={user.email} disabled className="input opacity-70" />
                    </Field>
                    <Field label="Role">
                      <select value={settings.role ?? "Developer"} onChange={e => setSettingsState({
                  ...settings,
                  role: e.target.value
                })} className="input">
                        {ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </Field>
                    <Field label="Timezone">
                      <input value={settings.timezone ?? ""} onChange={e => setSettingsState({
                  ...settings,
                  timezone: e.target.value
                })} className="input" />
                    </Field>
                  </div>
                  <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
                </form>}

              {tab === "github" && <div className="space-y-4">
                  <h3 className="font-serif text-xl font-semibold tracking-tight">GitHub connection</h3>
                  <p className="text-sm text-muted-foreground">
                    Add a fine-grained Personal Access Token to unlock private repos and higher API rate limits.
                    The token is stored in your account settings and used by our API on your behalf.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="GitHub handle">
                      <input value={settings.githubHandle ?? ""} onChange={e => setSettingsState({
                  ...settings,
                  githubHandle: e.target.value
                })} className="input" placeholder="octocat" />
                    </Field>
                    <Field label="Personal access token">
                      <input value={settings.githubToken ?? ""} onChange={e => setSettingsState({
                  ...settings,
                  githubToken: e.target.value
                })} type="password" className="input" placeholder="ghp_… or github_pat_…" />
                    </Field>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Create a token at <a className="link-underline text-olive-dark" href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noreferrer">github.com/settings/tokens</a> with{" "}
                    <span className="font-mono">Contents: read</span> and <span className="font-mono">Metadata: read</span> permissions.
                  </p>
                  <button className="btn-primary" onClick={saveGithub} disabled={saving}>{saving ? "Saving…" : "Save GitHub settings"}</button>
                  {settings.githubToken && <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
                      <div className="font-semibold text-destructive">Remove stored token</div>
                      <div className="mt-1 text-foreground/75">This clears the token from cloud storage. Public repos still work without it.</div>
                      <button className="btn-ghost mt-3 !text-destructive" onClick={async () => {
                await saveSettings({
                  ...settings,
                  githubToken: ""
                });
                setSettingsState({
                  ...settings,
                  githubToken: ""
                });
                toast.success("Token cleared");
              }}>
                        <Trash2 className="h-4 w-4" /> Clear token
                      </button>
                    </div>}
                </div>}

              {tab === "keys" && <div className="space-y-3">
                  <h3 className="font-serif text-xl font-semibold tracking-tight">RepoDNA API keys</h3>
                  <p className="text-sm text-muted-foreground">
                    Programmatic API access will be available soon. Your existing session token can be used via the JS SDK today.
                  </p>
                </div>}

              {tab === "notify" && <div className="space-y-3">
                  <h3 className="font-serif text-xl font-semibold tracking-tight">Notifications</h3>
                  <p className="text-sm text-muted-foreground">
                    In-app notifications are enabled and stored in the cloud. Email digests are coming soon.
                  </p>
                </div>}

              {tab === "theme" && <div className="space-y-4">
                  <h3 className="font-serif text-xl font-semibold tracking-tight">Theme</h3>
                  <p className="text-sm text-muted-foreground">
                    RepoDNA uses an olive, cream, and charcoal editorial palette. Custom theming is on the roadmap.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[{
                n: "Cream",
                c: "hsl(42 33% 93%)"
              }, {
                n: "Olive",
                c: "hsl(71 34% 36%)"
              }, {
                n: "Ink",
                c: "hsl(0 0% 11%)"
              }].map(t => <div key={t.n} className="rounded-2xl border border-border/70 p-4">
                        <div className="h-12 rounded-lg" style={{
                  background: t.c
                }} />
                        <div className="mt-2 text-sm font-semibold">{t.n}</div>
                      </div>)}
                  </div>
                </div>}

              {tab === "privacy" && <div className="space-y-4">
                  <h3 className="font-serif text-xl font-semibold tracking-tight">Privacy & data</h3>
                  <p className="text-sm text-muted-foreground">
                    Your account, saved repos, chats, AI outputs, and settings live in MongoDB (with
                    row-level security). Every row is scoped to your user ID and inaccessible to anyone else.
                  </p>
                  <button className="btn-ghost !text-destructive" onClick={async () => {
              const {
                error
              } = await db.from("saved_repos").delete().eq("user_id", user.id);
              if (error) return toast.error("Failed", {
                description: error.message
              });
              toast.success("All indexed repos cleared");
            }}>
                    <Trash2 className="h-4 w-4" /> Clear indexed repos
                  </button>
                </div>}
            </>}

          <style>{`.input{width:100%;border:1px solid hsl(var(--border));background:hsl(var(--card));padding:.65rem .9rem;border-radius:.75rem;font-size:.875rem;outline:none}.input:focus{border-color:hsl(var(--olive))}`}</style>
        </div>
      </div>
    </div>;
}
function Field({
  label,
  children
}) {
  return <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</span>
      {children}
    </label>;
}