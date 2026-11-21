import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";

// Execute the real runner against an in-memory connection. Never connect to MySQL.
const source = (await readFile("scripts/db-migrate.mjs", "utf8")).replace(/^import .*;\r?\n/gm, "");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const runner = new AsyncFunction("readFile", "readdir", "createHash", "mysql", "databaseOptions", "process", "console", source);

async function check({ recordsNames, approved = true, backup = true, review = false }) {
  const versions = new Set(["001"]);
  let connections = 0, statements = 0, ended = false;
  const connection = {
    async query(sql) {
      if (!sql.includes("CREATE TABLE IF NOT EXISTS schema_migrations")) statements++;
      return [[]];
    },
    async execute(sql, values) {
      if (sql.includes("GET_LOCK")) return [[{ acquired: 1 }]];
      if (sql.includes("information_schema.COLUMNS")) return [[{ COLUMN_NAME: "version" }, { COLUMN_NAME: "applied_at" }, ...(recordsNames ? [{ COLUMN_NAME: "migration_name" }] : [])]];
      if (sql.startsWith("SELECT version")) return [versions.has(values[0]) ? [{ version: values[0] }] : []];
      assert(sql.startsWith("INSERT INTO schema_migrations"));
      assert.equal(sql.includes("migration_name"), recordsNames);
      assert.equal(values.length, recordsNames ? 2 : 1);
      versions.add(values[0]);
      return [{ affectedRows: 1 }];
    },
    async end() { ended = true; },
  };
  const runtime = {
    argv: ["node", "db-migrate.mjs", "--production", ...(review ? ["--review"] : ["--apply"])],
    env: { NODE_ENV: "production", CAB_MIGRATION_APPROVED_DB: approved ? "reviewed_production_target" : "different_target", CAB_BACKUP_REFERENCE: backup ? "verified-test-backup" : "" },
    exitCode: 0,
  };
  await runner(readFile, readdir, createHash, { createConnection: async () => { connections++; return connection; } },
    () => ({ database: "reviewed_production_target" }), runtime, { log() {}, error() {} });
  if (review || !approved || !backup) {
    assert.equal(connections, 0);
    assert.equal(statements, 0);
    assert.equal(runtime.exitCode, review ? 0 : 1);
  } else {
    assert.equal(runtime.exitCode, 0);
    assert.deepEqual([...versions], ["001", "002", "003", "004", "005", "006", "007"]);
    assert.equal(statements, 19); // Only migrations 002–007; baseline 001 remains untouched.
    assert(ended);
  }
}

await check({ recordsNames: false });
await check({ recordsNames: true });
await check({ recordsNames: false, approved: false });
await check({ recordsNames: false, backup: false });
await check({ recordsNames: false, review: true });
console.log("PASS: legacy/named migration ledgers, baseline preservation, exact target approval, backup gate, offline review, and connection cleanup. No database accessed.");
