import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check } from "lucide-react";
import Logo from "@/components/branding/Logo";
import { authService } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { saveSettings } from "@/lib/store";
export default function Signup() {
  const nav = useNavigate();
  const {
    setUser
  } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pw, setPw] = useState("");
  const [role, setRole] = useState("Developer");
  const [busy, setBusy] = useState(false);
  const step1 = async e => {
    e.preventDefault();
    if (!name || !email) return toast.error("Enter your name and email.");
    setBusy(true);
    try {
      const {
        emailed,
        devCode
      } = await authService.sendOtp(email);
      setStep(2);
      if (!emailed && devCode) {
        setOtp(devCode);
        toast.success("OTP ready (dev mode — no SMTP configured)", {
          description: `Code auto-filled: ${devCode}`
        });
      } else {
        toast.success("OTP sent", {
          description: `Check ${email} for the code`
        });
      }
    } catch (err) {
      toast.error("Could not send OTP", {
        description: err.message
      });
    } finally {
      setBusy(false);
    }
  };
  const step2 = async e => {
    e.preventDefault();
    if (!otp) return toast.error("Enter the OTP code");
    setBusy(true);
    try {
      const u = await authService.verifyOtp(email, otp);
      if (!u) throw new Error("Verification failed");
      setStep(3);
    } catch (err) {
      toast.error("Invalid code", {
        description: err.message
      });
      setBusy(false);
    }
  };
  const step3 = async e => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password must be at least 6 characters.");
    setBusy(true);
    try {
      const u = await authService.setPassword(pw, name);
      if (!u) throw new Error("Could not set password");
      await saveSettings({
        role,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      setUser(u);
      toast.success("Account ready", {
        description: email
      });
      nav("/app");
    } catch (err) {
      toast.error("Failed to finish setup", {
        description: err.message
      });
      setBusy(false);
    }
  };
  return <div className="min-h-screen paper px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <Logo />
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div className="glass rounded-3xl p-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">
              Create your account · Step {step} of 3
            </div>
            <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight">
              Meet your <em className="text-olive-dark">repositories</em>, properly.
            </h1>

            <div className="mt-4 flex gap-2">
              {[1, 2, 3].map(s => <span key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-olive" : "bg-cream-deep"}`} />)}
            </div>

            {step === 1 && <form onSubmit={step1} className="mt-6 grid gap-3 sm:grid-cols-2">
                <Field label="Full name">
                  <input value={name} onChange={e => setName(e.target.value)} required className="input" placeholder="Ada Lovelace" />
                </Field>
                <Field label="Work email">
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" required className="input" placeholder="you@company.com" />
                </Field>
                <Field label="Primary role">
                  <select value={role} onChange={e => setRole(e.target.value)} className="input">
                    {["Developer", "Team Lead", "Recruiter", "Open Source Contributor", "Organization Admin"].map(r => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <button className="btn-primary w-full" disabled={busy}>
                    {busy ? "Sending code…" : "Send verification code"} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>}

            {step === 2 && <form onSubmit={step2} className="mt-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  We sent a one-time code to <span className="font-mono text-foreground">{email}</span>.
                </p>
                <Field label="One-time code">
                  <input value={otp} onChange={e => setOtp(e.target.value)} required className="input tracking-widest text-center font-mono text-lg" placeholder="0000" maxLength={8} />
                </Field>
                <button className="btn-primary w-full" disabled={busy}>
                  {busy ? "Verifying…" : "Verify code"} <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={async () => {
              try {
                const {
                  emailed,
                  devCode
                } = await authService.sendOtp(email);
                if (!emailed && devCode) {
                  setOtp(devCode);
                  toast.success("New code ready (dev mode)", {
                    description: `Code auto-filled: ${devCode}`
                  });
                } else {
                  toast.success("New code sent");
                }
              } catch {
                toast.error("Failed to resend");
              }
            }}>
                  Resend code
                </button>
              </form>}

            {step === 3 && <form onSubmit={step3} className="mt-6 space-y-3">
                <Field label="Choose a password">
                  <input value={pw} onChange={e => setPw(e.target.value)} type="password" required minLength={6} className="input" placeholder="Min 6 characters" />
                </Field>
                <button className="btn-primary w-full" disabled={busy}>
                  {busy ? "Finishing…" : "Create workspace"} <ArrowRight className="h-4 w-4" />
                </button>
              </form>}

            <p className="mt-6 text-sm text-foreground/70">
              Already have an account?{" "}
              <Link to="/login" className="link-underline font-semibold text-olive-dark">Sign in</Link>
            </p>
          </div>

          <aside className="glass rounded-3xl p-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">What you'll get</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight tracking-tight">
              Real repos. Real AI. Real answers.
            </h2>
            <ul className="mt-6 space-y-3 text-sm">
              {["Grounded RAG chat with cited files and paths", "AI-generated README, API docs, architecture guides", "Semantic security scanning powered by Gemini", "AI code review and framework-specific test scaffolds", "Repository-aware interview kits with rubrics", "Live GitHub metadata, contributors, PRs, and commits"].map(k => <li key={k} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-olive" /> {k}
                </li>)}
            </ul>
            <style>{`.input{width:100%;border:1px solid hsl(var(--border));background:hsl(var(--card));padding:.7rem 1rem;border-radius:.75rem;font-size:.875rem;outline:none}.input:focus{border-color:hsl(var(--olive))}`}</style>
          </aside>
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