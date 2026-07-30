import mongoose from "mongoose";
import { applyJsonTransform } from "../lib/schemaUtils.js";

const { Schema } = mongoose;

const RepoChunkSchema = new Schema({
  user_id: { type: String, required: true, index: true },
  repo_id: { type: String, required: true, index: true },
  repo_full_name: String,
  path: String,
  language: String,
  start_line: Number,
  end_line: Number,
  content: String,
  symbols: { type: [String], default: [] },
});

// Text index powers the RAG retrieval search (replaces Postgres full-text search).
RepoChunkSchema.index({ content: "text", symbols: "text", path: "text" });
applyJsonTransform(RepoChunkSchema);

export default mongoose.model("RepoChunk", RepoChunkSchema);
