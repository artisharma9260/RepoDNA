import mongoose from "mongoose";
import { applyJsonTransform } from "../lib/schemaUtils.js";

const { Schema } = mongoose;

const RepoIngestionSchema = new Schema({
  user_id: { type: String, required: true, index: true },
  repo_id: { type: String, required: true },
  repo_full_name: String,
  status: { type: String, enum: ["pending", "running", "ready", "error"], default: "pending" },
  progress: { type: Number, default: 0 },
  default_branch: String,
  indexed_files: { type: Number, default: 0 },
  total_files: { type: Number, default: 0 },
  error: { type: String, default: null },
  head_sha: { type: String, default: null },
  updated_at: { type: String, default: () => new Date().toISOString() },
});

RepoIngestionSchema.index({ user_id: 1, repo_id: 1 }, { unique: true });
applyJsonTransform(RepoIngestionSchema);

export default mongoose.model("RepoIngestion", RepoIngestionSchema);
