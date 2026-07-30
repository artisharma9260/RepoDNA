import mongoose from "mongoose";

const { Schema } = mongoose;

const OtpCodeSchema = new Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  code_hash: { type: String, required: true },
  expires_at: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

// Auto-expire documents once they're stale (TTL index).
OtpCodeSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("OtpCode", OtpCodeSchema);
