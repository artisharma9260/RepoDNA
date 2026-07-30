import mongoose from "mongoose";
import { applyJsonTransform } from "../lib/schemaUtils.js";

const { Schema } = mongoose;

const ChatMessageSchema = new Schema({
  session_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, default: "" },
  citations: { type: [Schema.Types.Mixed], default: [] },
  created_at: { type: Date, default: Date.now },
});

applyJsonTransform(ChatMessageSchema);

export default mongoose.model("ChatMessage", ChatMessageSchema);
