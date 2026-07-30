import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import Logo from "@/components/branding/Logo";
import { authService } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
export default function Login() {
  const nav = useNavigate();
  const {
    setUser
  } = useAuth();
  const [mode, setMode] = useState("password");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const passwordSubmit = async e => {
    e.preventDefault();
    if (!email || pw.length < 6) return toast.error("Enter email and a password of at least 6 characters.");
    setBusy(true);
    try {
      const user = await authService.signInWithPassword(email, pw);
      if (!user) throw new Error("Sign in failed");
      setUser(user);
      toast.success("Signed in", {
        description: email
      });
      nav("/app");
    } catch (err) {
      toast.error("Sign-in failed", {
        description: err.message
      });
      setBusy(false);
    }
  };
  const sendOtp = async () => {
    if (!email) return toast.error("Enter your email first");
    setBusy(true);
    try {
      const {
        emailed,
        devCode
      } = await authService.sendOtp(email);
      setOtpSent(true);
      if (!emailed && devCode) {
        setOtp(devCode);
        toast.success("OTP ready (dev mode — no SMTP configured)", {
          description: `Code auto-filled: ${devCode}`
        });
      } else {
        toast.success("OTP sent", {
          description: `Check ${email}`
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
  const otpSubmit = async e => {
    e.preventDefault();
    if (!otp) return toast.error("Enter the OTP code");
    setBusy(true);
    try {
      const user = await authService.verifyOtp(email, otp);
      if (!user) throw new Error("Verification failed");
      setUser(user);
      toast.success("Signed in", {
        description: email
      });
      nav("/app");
    } catch (err) {
      toast.error("Invalid code", {
        description: err.message
      });
      setBusy(false);
    }
  };
  return <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col justify-between px-6 py-8 sm:px-14">
        <Logo />
        <div className="mx-auto w-full max-w-md">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-olive">Sign in</div>
          <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight">Welcome back.</h1>
          <p className="mt-2 text-foreground/70">Access your repositories, chat, and AI reports.</p>

          <div className="mt-6 flex rounded-full border border-border/70 bg-cream-deep/40 p-1 text-sm">
            <button className={`flex-1 rounded-full px-3 py-1.5 transition ${mode === "password" ? "bg-charcoal text-cream" : "text-muted-foreground"}`} onClick={() => setMode("password")}>
              <KeyRound className="mr-1 inline h-3.5 w-3.5" /> Password
            </button>
            <button className={`flex-1 rounded-full px-3 py-1.5 transition ${mode === "otp" ? "bg-charcoal text-cream" : "text-muted-foreground"}`} onClick={() => setMode("otp")}>
              <Mail className="mr-1 inline h-3.5 w-3.5" /> Email OTP
            </button>
          </div>

          {mode === "password" ? <form onSubmit={passwordSubmit} className="mt-6 space-y-3">
              <Field label="Email">
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" required className="input" placeholder="you@company.com" />
              </Field>
              <Field label="Password">
                <input value={pw} onChange={e => setPw(e.target.value)} type="password" required minLength={6} className="input" placeholder="Min 6 characters" />
              </Field>
              <button className="btn-primary mt-3 w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"} <ArrowRight className="h-4 w-4" />
              </button>
            </form> : <form onSubmit={otpSubmit} className="mt-6 space-y-3">
              <Field label="Email">
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" required className="input" placeholder="you@company.com" />
              </Field>
              {otpSent && <Field label="One-time code">
                  <input value={otp} onChange={e => setOtp(e.target.value)} required className="input tracking-widest text-center font-mono" placeholder="0000" maxLength={8} />
                </Field>}
              {!otpSent ? <button type="button" className="btn-primary mt-3 w-full" onClick={sendOtp} disabled={busy}>
                  {busy ? "Sending…" : "Send OTP"} <ArrowRight className="h-4 w-4" />
                </button> : <button className="btn-primary mt-3 w-full" disabled={busy}>
                  {busy ? "Verifying…" : "Verify & sign in"} <ArrowRight className="h-4 w-4" />
                </button>}
            </form>}

          <p className="mt-6 text-center text-sm text-foreground/70">
            New to RepoDNA?{" "}
            <Link to="/signup" className="link-underline font-semibold text-olive-dark">Create an account</Link>
          </p>
          <style>{`.input{width:100%;border:1px solid hsl(var(--border));background:hsl(var(--card));padding:.7rem 1rem;border-radius:.75rem;font-size:.875rem;outline:none}.input:focus{border-color:hsl(var(--olive))}`}</style>
        </div>
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} RepoDNA AI</div>
      </div>

      <div className="relative hidden overflow-hidden bg-charcoal text-cream lg:block">
        <div className="absolute inset-0 grid-lines opacity-[0.08]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
            Real backend · Real AI · Real GitHub data
          </div>
          <p className="font-serif text-3xl leading-snug text-cream">
            Ask any repository anything — with grounded citations to real files.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {["Gemini AI", "Node + Express", "MongoDB"].map(c => <div key={c} className="rounded-xl border border-cream/10 bg-cream/[0.04] px-4 py-3 font-mono text-[11px] text-cream/85">
                {c}
              </div>)}
          </div>
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