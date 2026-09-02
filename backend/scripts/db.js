// Database lifecycle script.
//   node scripts/db.js            -> print status
//   node scripts/db.js --reset    -> drop + recreate DB schema, apply migrations
//   node scripts/db.js --reset --seed  -> reset then seed demo data
const { Client } = require("pg");

const connString = process.env.DATABASE_URL || "postgresql://school:school@localhost:5432/smart_school";
const url = new URL(connString);
const dbName = url.pathname.replace(/^\//, "") || "smart_school";

function maintenanceUrl() {
  const parts = connString.split("/");
  parts[parts.length - 1] = "postgres";
  return parts.join("/");
}

async function main() {
  const args = process.argv.slice(2);
  const doReset = args.includes("--reset");
  const doSeed = args.includes("--seed");

  if (!doReset) {
    const client = new Client({ connectionString: connString });
    try {
      await client.connect();
      const { rows } = await client.query(
        `SELECT datname, pg_size_pretty(pg_database_size(datname)) AS size
           FROM pg_database WHERE datname = $1`,
        [dbName]
      );
      console.log(`database "${dbName}" is reachable${rows.length ? ` (${rows[0].size})` : ""}`);
    } catch (error) {
      console.error(`database "${dbName}" is not reachable. Start it with: docker compose up -d db`);
      process.exitCode = 1;
    } finally {
      await client.end();
    }
    return;
  }

  const admin = new Client({ connectionString: maintenanceUrl() });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`recreated database "${dbName}"`);
  } finally {
    await admin.end();
  }

  const { execSync } = require("child_process");
  try {
    execSync("node scripts/applyMigrations.js", { stdio: "inherit" });
  } catch (error) {
    process.exitCode = 1;
    process.exit();
  }

  if (doSeed) {
    try {
      execSync("node scripts/seed.js", { stdio: "inherit" });
    } catch (error) {
      process.exitCode = 1;
    }
  }
}

main();