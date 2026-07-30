import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDb } from "./db.js";
import { DEFAULT_MODEL } from "./lib/ai.js";
import authRoutes from "./routes/auth.js";
import dbRoutes from "./routes/db.js";
import aiRoutes from "./routes/ai.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*",
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/db", dbRoutes);
app.use("/api/ai", aiRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Unhandled error", err);
  res.status(500).json({ error: err?.message ?? "Internal server error" });
});

const port = process.env.PORT || 8787;

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`[server] RepoDNA API listening on http://localhost:${port}`);
      console.log(`[server] Using Gemini model: ${DEFAULT_MODEL}`);
    });
  })
  .catch((err) => {
    console.error("[server] Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
