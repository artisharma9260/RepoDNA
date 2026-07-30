import mongoose from "mongoose";
import { applyJsonTransform } from "../lib/schemaUtils.js";

const { Schema } = mongoose;

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  username: { type: String, default: null },
  avatar_url: { type: String, default: null },
  password_hash: { type: String, default: null },
  verified: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

applyJsonTransform(UserSchema);

// Never leak the password hash to clients.
UserSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    email: this.email,
    username: this.username || (this.email ? this.email.split("@")[0] : "user"),
    avatar: this.avatar_url || undefined,
  };
};

export default mongoose.model("User", UserSchema);
