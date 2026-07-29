const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// Render (and most hosts) sit behind a proxy, so Express needs to trust
// the X-Forwarded-For header it sets. Without this, express-rate-limit
// throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set("trust proxy", 1);

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.use(rateLimit({ windowMs:15*60*1000, max:100, message:{ error:"Too many requests. Please try again later." } }));
app.use("/api/auth", rateLimit({ windowMs:15*60*1000, max:20, message:{ error:"Too many login attempts. Please try again in 15 minutes." } }));

app.use("/api/auth",          require("./routes/auth"));
app.use("/api/drugs",         require("./routes/drugs"));
app.use("/api/inventory",     require("./routes/inventory"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/admin",         require("./routes/admin"));

app.get("/api/health", (req, res) => res.json({ status:"ok", project:"MediFind Rwanda", version:"1.0.0" }));
app.use((req, res) => res.status(404).json({ error:"Route not found." }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error:"Internal server error." }); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀  MediFind Rwanda API running on port ${PORT}`));
