import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import OtpCode from "../models/OtpCode.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { sendOtpEmail } from "../lib/mailer.js";

const router = Router();

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

// POST /api/auth/otp/send  { email }
// Mirrors Supabase's signInWithOtp({ shouldCreateUser: true }): creates the user
// if they don't exist yet, then emails a one-time code. Used by both the Login
// page's "Email OTP" tab and the Signup flow's first two steps.
router.post("/otp/send", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) return res.status(400).json({ error: "Valid email required" });

    const code = generateCode();
    const code_hash = await bcrypt.hash(code, 10);
    const { emailed } = await sendOtpEmail(email, code);

    // SECURITY: if SMTP isn't configured, DO NOT create the user record or
    // the OTP record, and DO NOT let this endpoint succeed — otherwise
    // "verifying" the code is meaningless (whoever calls /send can just read
    // the code back from this response and "prove" ownership of any email,
    // including one they don't own). The dev-mode fallback that echoes the
    // code back is opt-in only, via ALLOW_OTP_DEV_FALLBACK=true, and is only
    // meant for local testing on your own machine — never enable it if this
    // server is reachable by anyone else.
    const devFallbackEnabled = !emailed && process.env.ALLOW_OTP_DEV_FALLBACK === "true" && process.env.NODE_ENV !== "production";
    if (!emailed && !devFallbackEnabled) {
      return res.status(503).json({
        error: "Email delivery isn't configured (SMTP_* is missing in server/.env), so a code can't be sent — and for security, one won't be echoed back either. " +
          "Configure SMTP to send real emails, or set ALLOW_OTP_DEV_FALLBACK=true in server/.env for local testing only.",
      });
    }

    let user = await User.findOne({ email });
    if (!user) user = await User.create({ email });
    await OtpCode.create({ email, code_hash, expires_at: new Date(Date.now() + 10 * 60 * 1000) });

    const devCode = devFallbackEnabled ? code : undefined;
    res.json({ sent: true, emailed, ...(devCode ? { devCode } : {}) });
  } catch (e) {
    res.status(500).json({ error: e.message ?? "Could not send code" });
  }
});

// POST /api/auth/otp/verify  { email, code }
router.post("/otp/verify", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    if (!email || !code) return res.status(400).json({ error: "Email and code required" });

    const record = await OtpCode.findOne({ email }).sort({ created_at: -1 });
    if (!record || record.expires_at < new Date()) {
      return res.status(400).json({ error: "Code expired — request a new one" });
    }
    if (record.attempts >= 5) return res.status(400).json({ error: "Too many attempts — request a new code" });

    const ok = await bcrypt.compare(code, record.code_hash);
    if (!ok) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ error: "Invalid code" });
    }
    await OtpCode.deleteMany({ email });

    const user = await User.findOneAndUpdate({ email }, { verified: true }, { new: true, upsert: true });
    const token = signToken(user._id.toString());
    res.json({ token, user: user.toPublic() });
  } catch (e) {
    res.status(500).json({ error: e.message ?? "Verification failed" });
  }
});

// POST /api/auth/password/set  { password, username }  — requires auth
// Finishes signup after OTP verification (mirrors supabase.auth.updateUser).
router.post("/password/set", requireAuth, async (req, res) => {
  try {
    const password = String(req.body?.password || "");
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    const username = req.body?.username ? String(req.body.username) : undefined;

    const password_hash = await bcrypt.hash(password, 10);
    const update = { password_hash };
    if (username) update.username = username;
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });

    const token = signToken(user._id.toString());
    res.json({ token, user: user.toPublic() });
  } catch (e) {
    res.status(500).json({ error: e.message ?? "Could not set password" });
  }
});

// POST /api/auth/login  { email, password }
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const user = await User.findOne({ email });
    if (!user || !user.password_hash) return res.status(401).json({ error: "Invalid email or password" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken(user._id.toString());
    res.json({ token, user: user.toPublic() });
  } catch (e) {
    res.status(500).json({ error: e.message ?? "Sign-in failed" });
  }
});

// POST /api/auth/logout — stateless; provided for API parity.
router.post("/logout", (_req, res) => res.json({ ok: true }));

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: user.toPublic() });
});

// PATCH /api/auth/me  { username }
router.patch("/me", requireAuth, async (req, res) => {
  const username = req.body?.username ? String(req.body.username) : undefined;
  const user = await User.findByIdAndUpdate(req.userId, username ? { username } : {}, { new: true });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: user.toPublic() });
});

export default router;
