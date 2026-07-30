const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Render (and most managed Postgres hosts) require SSL. Leave DB_SSL unset
  // for local development, where Postgres usually isn't configured for TLS.
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  // Keep connections alive in production
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to PostgreSQL database");
    release();
  }
});

module.exports = pool;
