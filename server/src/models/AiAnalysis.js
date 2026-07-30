import mongoose from "mongoose";
import { applyJsonTransform } from "../lib/schemaUtils.js";

const { Schema } = mongoose;

// Write-only audit log of every AI generation (docs/review/tests/security/etc.).
// Not read back by the frontend today, but kept for parity + future history features.
const AiAnalysisSchema = new Schema({
  user_id: { type: String, required: true, index: true },
  repo_id: { type: String, required: true, index: true },
  repo_full_name: String,
  kind: String,
  target: String,
  content: String,
  metadata: { type: Schema.Types.Mixed, default: {} },
  created_at: { type: Date, default: Date.now },
});

applyJsonTransform(AiAnalysisSchema);

export default mongoose.model("AiAnalysis", AiAnalysisSchema);
