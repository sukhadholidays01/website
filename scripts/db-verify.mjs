import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import mysql from "mysql2/promise";
import { databaseOptions } from "./db-environment.mjs";
let connection;
try {
 const options = databaseOptions();
 connection = await mysql.createConnection(options);
 const [[server]] = await connection.query("SELECT VERSION() AS version");
 assert.match(server.version,  /^(8\.|11\..*-MariaDB)/i,
  "This schema requires MySQL 8 or supported MariaDB 11");
 const [columns] = await connection.execute("SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?", [options.database]);
 const [indexes] = await connection.execute("SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ?", [options.database]);
 const [foreign] = await connection.execute("SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL", [options.database]);
 // Check customer prerequisites first so a baseline-only deployment cannot be
 // mistaken for a working registration service.
 for(const table of ["customer_accounts","customer_verification_tokens","customer_sessions","notifications","cab_rate_limits"])
  assert(columns.some(row=>row.TABLE_NAME===table),"Missing registration table: "+table+" (customer schema is defined in migration 007; baseline tables in 001)");
 assert(columns.some(row=>row.TABLE_NAME==="schema_migrations"&&row.COLUMN_NAME==="version"),"Migration ledger is missing its version column");
 const recordsNames=columns.some(row=>row.TABLE_NAME==="schema_migrations"&&row.COLUMN_NAME==="migration_name");
 const files = (await readdir("database/migrations")).filter(name => /^\d+_[a-z0-9_-]+\.sql$/i.test(name)).sort();
 assert(files.length>0,"No migration files found");
 let count=0;
 for (const file of files) {
 const sql = await readFile("database/migrations/"+file, "utf8");
 for (const match of sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\) ENGINE/g)) {
  const [,table,body] = match; count++;
  for(const line of body.split("\n").map(s=>s.trim()).filter(Boolean)) {
   const col=line.match(/^(\w+) (?:CHAR|VARCHAR|TEXT|MEDIUMTEXT|LONGTEXT|JSON|BOOLEAN|TINYINT|SMALLINT|INT|BIGINT|DECIMAL|DATETIME)/i)?.[1];
   if(col) assert(columns.some(r=>r.TABLE_NAME===table && r.COLUMN_NAME===col), "Missing column " + table + "." + col);
   const key=line.match(/^(UNIQUE )?KEY (\w+) \(([^)]+)\)/);
   if(key) for(const col of key[3].split(",").map(s=>s.trim())) assert(indexes.some(r=>r.TABLE_NAME===table && r.INDEX_NAME===key[2] && r.COLUMN_NAME===col && (!key[1] || r.NON_UNIQUE===0)), "Missing index " + key[2]);
   const fk=line.match(/^CONSTRAINT (\w+) FOREIGN KEY \(([^)]+)\) REFERENCES (\w+)\s*\(([^)]+)\)/);
   if(fk) {
    const local=fk[2].split(",").map(s=>s.trim()),parent=fk[4].split(",").map(s=>s.trim());
    for(let i=0;i<local.length;i++) assert(foreign.some(r=>r.TABLE_NAME===table && r.CONSTRAINT_NAME===fk[1] && r.COLUMN_NAME===local[i] && r.REFERENCED_TABLE_NAME===fk[3] && r.REFERENCED_COLUMN_NAME===parent[i]), "Missing foreign key " + fk[1]);
   }
  }
 }
 const [applied] = await connection.execute(recordsNames?"SELECT migration_name FROM schema_migrations WHERE version=?":"SELECT version FROM schema_migrations WHERE version=?",[file.split("_")[0]]);
 assert.equal(applied.length,1,"Migration not recorded: "+file);
 if(recordsNames)assert.equal(applied[0].migration_name,file,"Migration filename mismatch: "+file);
 }
 const [[lock]] = await connection.query("SELECT COUNT(*) AS n FROM cab_state_lock WHERE lock_id=1");
 assert.equal(Number(lock.n),1);
 const [categories] = await connection.query("SELECT category_id FROM cab_categories WHERE is_enabled=TRUE");
 assert(categories.length>0,"No request categories enabled");
 console.log("PASS: database connectivity, " + count + " required tables/columns, indexes, foreign keys, lock, categories and all " + files.length + " migrations. No records changed.");
}
 catch (error) {
  const safeCodes = new Set(["ER_NO_SUCH_TABLE","ER_BAD_FIELD_ERROR","ER_ACCESS_DENIED_ERROR","ER_DBACCESS_DENIED_ERROR","ER_BAD_DB_ERROR","ECONNREFUSED","ENOTFOUND","ETIMEDOUT"]);
  console.error("Database verification failed: " + (error instanceof assert.AssertionError ? error.message : safeCodes.has(error?.code) ? error.code : "DATABASE_CHECK_UNAVAILABLE"));
  process.exitCode = 1;
}

finally { if(connection) await connection.end(); }
