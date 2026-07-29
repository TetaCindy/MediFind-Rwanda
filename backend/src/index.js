const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

// Rate limit — 100 requests per 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please try again later." },
}));

// Stricter limit on auth routes to prevent brute force
app.use("/api/auth", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",  require("./routes/auth"));
app.use("/api/drugs", require("./routes/drugs"));
// Coming next:
// app.use("/api/inventory", require("./routes/inventory"));
// app.use("/api/inventory", require("./routes/inventory"));
// app.use("/api/facilities",require("./routes/facilities"));
// app.use("/api/notifications", require("./routes/notifications"));
// app.use("/api/admin",     require("./routes/admin"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", project: "MediFind Rwanda", version: "1.0.0" });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀  MediFind Rwanda API running on port ${PORT}`);
});
