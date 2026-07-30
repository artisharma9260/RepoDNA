import mongoose from "mongoose";
import { applyJsonTransform } from "../lib/schemaUtils.js";

const { Schema } = mongoose;

const PrReviewSchema = new Schema({
  user_id: { type: String, required: true, index: true },
  repo_id: { type: String, required: true, index: true },
  repo_full_name: String,
  pr_number: Number,
  title: String,
  author: { type: String, default: null },
  summary: { type: String, default: null },
  risk_level: { type: String, default: "medium" },
  breaking: { type: Boolean, default: false },
  content: { type: Schema.Types.Mixed, default: {} },
  created_at: { type: Date, default: Date.now },
});

applyJsonTransform(PrReviewSchema);

export default mongoose.model("PrReview", PrReviewSchema);
