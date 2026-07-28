const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function run() {
  const sqlFile = path.join(__dirname, "001_schema.sql");
  const sql = fs.readFileSync(sqlFile, "utf8");
  try {
    await pool.query(sql);
    console.log("✅  Schema migration complete.");
  } catch (err) {
    console.error("❌  Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

run();
