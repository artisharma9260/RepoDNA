import mongoose from "mongoose";
import { applyJsonTransform } from "../lib/schemaUtils.js";

const { Schema } = mongoose;

const ChatSessionSchema = new Schema({
  user_id: { type: String, required: true, index: true },
  repo_id: { type: String, required: true, index: true },
  repo_full_name: String,
  title: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

applyJsonTransform(ChatSessionSchema);

export default mongoose.model("ChatSession", ChatSessionSchema);
