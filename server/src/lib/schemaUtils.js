// Shared conventions for all models: expose `id` (string) instead of `_id`,
// drop `__v`, and keep field names snake_case to match what the frontend expects
// (the frontend was originally written against Supabase's Postgres column names).
export function applyJsonTransform(schema) {
  schema.set("toJSON", {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });
  schema.set("toObject", {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });
}
