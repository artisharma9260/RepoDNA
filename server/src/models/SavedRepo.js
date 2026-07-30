import mongoose from "mongoose";
import { applyJsonTransform } from "../lib/schemaUtils.js";

const { Schema } = mongoose;

const SavedRepoSchema = new Schema({
  user_id: { type: String, required: true, index: true },
  repo_id: { type: String, required: true },
  owner: String,
  name: String,
  full_name: String,
  description: { type: String, default: null },
  language: { type: String, default: null },
  owner_avatar: { type: String, default: null },
  stars: { type: Number, default: 0 },
  added_at: { type: String, default: () => new Date().toISOString() },
});

SavedRepoSchema.index({ user_id: 1, repo_id: 1 }, { unique: true });
applyJsonTransform(SavedRepoSchema);

export default mongoose.model("SavedRepo", SavedRepoSchema);
