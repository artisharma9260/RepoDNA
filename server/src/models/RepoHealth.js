import mongoose from "mongoose";
import { applyJsonTransform } from "../lib/schemaUtils.js";

const { Schema } = mongoose;

const RepoHealthSchema = new Schema({
  user_id: { type: String, required: true, index: true },
  repo_id: { type: String, required: true },
  repo_full_name: String,
  overall: { type: Number, default: 0 },
  scores: { type: Schema.Types.Mixed, default: {} },
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] },
  recommendations: { type: [Schema.Types.Mixed], default: [] },
  created_at: { type: Date, default: Date.now },
});

RepoHealthSchema.index({ user_id: 1, repo_id: 1 }, { unique: true });
applyJsonTransform(RepoHealthSchema);

export default mongoose.model("RepoHealth", RepoHealthSchema);
