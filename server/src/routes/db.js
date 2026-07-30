import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import SavedRepo from "../models/SavedRepo.js";
import UserSettings from "../models/UserSettings.js";
import ChatSession from "../models/ChatSession.js";
import ChatMessage from "../models/ChatMessage.js";
import RepoIngestion from "../models/RepoIngestion.js";
import RepoHealth from "../models/RepoHealth.js";

const router = Router();

// Whitelisted tables — every one of these is scoped to req.userId automatically,
// the same way Supabase row-level security scoped every row to auth.uid().
const TABLES = {
  saved_repos: SavedRepo,
  user_settings: UserSettings,
  chat_sessions: ChatSession,
  chat_messages: ChatMessage,
  repo_ingestions: RepoIngestion,
  repo_health: RepoHealth,
};

function getModel(req, res) {
  const Model = TABLES[req.params.table];
  if (!Model) {
    res.status(404).json({ error: `Unknown table "${req.params.table}"` });
    return null;
  }
  return Model;
}

function parseFilters(req) {
  if (!req.query.filters) return {};
  try {
    const pairs = JSON.parse(req.query.filters);
    const out = {};
    for (const [col, val] of pairs) {
      if (col === "user_id") continue; // never trust a client-supplied user_id — always use req.userId
      out[col] = val;
    }
    return out;
  } catch {
    return {};
  }
}

// Some documents (e.g. an "id" the frontend refers to a Mongo _id string) need
// translating from the generic `id` field back to Mongo's `_id`.
function normalizeFilterKeys(filters) {
  if (filters.id !== undefined) {
    filters._id = filters.id;
    delete filters.id;
  }
  return filters;
}

router.get("/:table", requireAuth, async (req, res) => {
  const Model = getModel(req, res);
  if (!Model) return;
  try {
    const filters = normalizeFilterKeys(parseFilters(req));
    const query = Model.find({ ...filters, user_id: req.userId });
    if (req.query.order) {
      const ascending = req.query.ascending !== "false";
      query.sort({ [req.query.order]: ascending ? 1 : -1 });
    }
    if (req.query.limit) query.limit(Number(req.query.limit));
    const docs = await query.lean({ virtuals: true });
    const rows = docs.map((d) => ({ ...d, id: d._id?.toString(), _id: undefined, __v: undefined }));

    if (req.query.mode === "single" || req.query.mode === "maybe") {
      if (rows.length === 0) {
        if (req.query.mode === "single") return res.status(404).json({ error: "Not found" });
        return res.json({ data: null });
      }
      return res.json({ data: rows[0] });
    }
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message ?? "Query failed" });
  }
});

router.post("/:table", requireAuth, async (req, res) => {
  const Model = getModel(req, res);
  if (!Model) return;
  try {
    const payload = { ...req.body, user_id: req.userId };
    const created = await Model.create(payload);
    res.json({ data: created.toJSON() });
  } catch (e) {
    res.status(500).json({ error: e.message ?? "Insert failed" });
  }
});

router.patch("/:table", requireAuth, async (req, res) => {
  const Model = getModel(req, res);
  if (!Model) return;
  try {
    const filters = normalizeFilterKeys(parseFilters(req));
    const patch = { ...req.body };
    delete patch.user_id;
    await Model.updateMany({ ...filters, user_id: req.userId }, { $set: patch });
    res.json({ data: null });
  } catch (e) {
    res.status(500).json({ error: e.message ?? "Update failed" });
  }
});

router.delete("/:table", requireAuth, async (req, res) => {
  const Model = getModel(req, res);
  if (!Model) return;
  try {
    const filters = normalizeFilterKeys(parseFilters(req));
    await Model.deleteMany({ ...filters, user_id: req.userId });
    res.json({ data: null });
  } catch (e) {
    res.status(500).json({ error: e.message ?? "Delete failed" });
  }
});

// Upsert (used for saved_repos / user_settings / repo_health / repo_ingestions).
router.put("/:table", requireAuth, async (req, res) => {
  const Model = getModel(req, res);
  if (!Model) return;
  try {
    const onConflict = String(req.query.onConflict || "").split(",").filter(Boolean);
    const payload = { ...req.body, user_id: req.userId };
    const matchKeys = onConflict.length > 0 ? onConflict : ["user_id"];
    const match = {};
    for (const k of matchKeys) match[k] = k === "user_id" ? req.userId : payload[k];
    const updated = await Model.findOneAndUpdate(match, { $set: payload }, { new: true, upsert: true });
    res.json({ data: updated.toJSON() });
  } catch (e) {
    res.status(500).json({ error: e.message ?? "Upsert failed" });
  }
});

export default router;
