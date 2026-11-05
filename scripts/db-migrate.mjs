import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import mysql from "mysql2/promise";
import { databaseOptions } from "./db-environment.mjs";

// Review is offline and never opens a database connection.
const review = process.argv.includes("--review");
let connection;
try {
  const files = (await readdir("database/migrations")).filter(n => /^\d+_[a-z0-9_-]+\.sql$/i.test(n)).sort();
  const versions = new Set();
  const migrations = [];
  for (const name of files) {
    const version = name.split("_")[0];
    if (versions.has(version)) throw new Error("Duplicate migration version");
    versions.add(version);
    const sql = await readFile("database/migrations/" + name, "utf8");
    const statements = sql.split(/;\s*(?:\r?\n|$)/).map(s=>s.trim()).filter(Boolean);
    // Deliberately only allow the existing additive migration grammar.
    if (statements.some(s=>!/^CREATE TABLE IF NOT EXISTS\s|^INSERT IGNORE INTO\s/i.test(s)))
      throw new Error("Migration requires separate manual review: " + name);
    const sha256 = createHash("sha256").update(sql).digest("hex");
    migrations.push({name,version,statements,sha256});
    console.log(JSON.stringify({name,sha256,statements:statements.length,tables:[...sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map(m=>m[1])}));
  }
  if (!review) {
    const options = databaseOptions();
    const production = process.env.NODE_ENV === "production" || process.argv.includes("--production");
    if (!process.argv.includes("--apply")) throw new Error("Use --review first, then --apply for an approved target.");
    if (production && (process.env.CAB_MIGRATION_APPROVED_DB !== options.database || !process.env.CAB_BACKUP_REFERENCE))
      throw new Error("Production apply requires approval for the exact DB name and a verified backup reference.");
    connection = await mysql.createConnection(options);
    const lockName = "sukhd-migrate-" + createHash("sha256").update(options.database).digest("hex").slice(0,32);
    const [locks] = await connection.execute("SELECT GET_LOCK(?, 10) AS acquired", [lockName]);
    if (Number(locks[0].acquired) !== 1) throw new Error("Another migration is running");
    await connection.query("CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) NOT NULL PRIMARY KEY, migration_name VARCHAR(190) NOT NULL, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci");
    for (const m of migrations) {
      const [rows] = await connection.execute("SELECT version FROM schema_migrations WHERE version = ?", [m.version]);
      if (rows.length) { console.log("Already applied " + m.name); continue; }
      // MySQL DDL auto-commits: additive statements are safe to rerun after partial failure.
      for (const statement of m.statements) await connection.query(statement);
      await connection.execute("INSERT INTO schema_migrations (version, migration_name) VALUES (?, ?)", [m.version,m.name]);
      console.log("Applied " + m.name);
    }
    console.log("Migration complete; run npm run db:verify.");
  }
} catch (error) {
  const code = error?.code;
  console.error(code ? "Migration failed: " + code : error.message);
  process.exitCode = 1;
} finally { if (connection) await connection.end(); }
