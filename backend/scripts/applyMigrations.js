// Applies every `prisma/migrations/*/migration.sql` that has not yet been run.
// Tracks applied migrations in the `_migrations` table.
const path = require("path");
const fs = require("fs");
const pool = require("../src/config/db");

const MIGRATIONS_DIR = path.join(__dirname, "..", "prisma", "migrations");

async function run() {
  await pool.query(`CREATE TABLE IF NOT EXISTS _migrations (
    filename VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log("No migrations directory found.");
    return;
  }

  const folders = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const applied = new Set(
    (await pool.query(`SELECT filename FROM _migrations`)).rows.map((r) => r.filename)
  );

  for (const folder of folders) {
    const sqlPath = path.join(MIGRATIONS_DIR, folder, "migration.sql");
    if (!fs.existsSync(sqlPath)) continue;
    if (applied.has(folder)) continue;

    const sql = fs.readFileSync(sqlPath, "utf8");
    const client = await pool.connect();
    try {
      console.log(`Applying migration: ${folder}`);
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`INSERT INTO _migrations (filename) VALUES ($1)`, [folder]);
      await client.query("COMMIT");
      console.log(`  -> applied ${folder}`);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`Migration failed: ${folder}`);
      throw error;
    } finally {
      client.release();
    }
  }

  console.log("All migrations applied.");
  await pool.end();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});