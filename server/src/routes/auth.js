import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/signup  { name, email, password }
// Simple, direct signup — no email verification step required.
router.post("/signup", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const username = req.body?.name ? String(req.body.name) : undefined;

    if (!email || !email.includes("@")) return res.status(400).json({ error: "Valid email required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const existing = await User.findOne({ email });
    if (existing && existing.password_hash) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    let user;
    if (existing) {
      existing.password_hash = password_hash;
      if (username) existing.username = username;
      existing.verified = true;
      user = await existing.save();
    } else {
      user = await User.create({ email, password_hash, username, verified: true });
    }

    const token = signToken(user._id.toString());
    res.json({ token, user: user.toPublic() });
  } catch (e) {
    res.status(500).json({ error: e.message ?? "Could not create account" });
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
