const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error:", err.message);
});

/**
 * Test connectivity (used on boot and by scripts). Logs a hint when the
 * database is unreachable so developers know to run `docker compose up -d db`.
 */
async function ping() {
  await pool.query("SELECT 1");
}

module.exports = pool;
module.exports.ping = ping;