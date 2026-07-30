import mongoose from "mongoose";
import { applyJsonTransform } from "../lib/schemaUtils.js";

const { Schema } = mongoose;

const UserSettingsSchema = new Schema({
  user_id: { type: String, required: true, unique: true, index: true },
  github_handle: { type: String, default: null },
  github_token: { type: String, default: null },
  role: { type: String, default: "Developer" },
  timezone: { type: String, default: null },
  updated_at: { type: String, default: () => new Date().toISOString() },
});

applyJsonTransform(UserSettingsSchema);

export default mongoose.model("UserSettings", UserSettingsSchema);
