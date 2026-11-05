import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { databaseOptions } from "./db-environment.mjs";
let connection;
try {
 const options = databaseOptions();
 connection = await mysql.createConnection(options);
 const [[server]] = await connection.query("SELECT VERSION() AS version");
 assert.match(server.version, /^8\./, "This schema requires MySQL 8 (not MariaDB)");
 const [columns] = await connection.execute("SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?", [options.database]);
 const [indexes] = await connection.execute("SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ?", [options.database]);
 const [foreign] = await connection.execute("SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL", [options.database]);
 const sql = await readFile("database/migrations/001_public_cab_schema.sql", "utf8");
 let count=0;
 for (const match of sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\) ENGINE/g)) {
  const [,table,body] = match; count++;
  for(const line of body.split("\n").map(s=>s.trim()).filter(Boolean)) {
   const col=line.match(/^(\w+) (?:CHAR|VARCHAR|TEXT|LONGTEXT|JSON|BOOLEAN|TINYINT|INT|BIGINT|DECIMAL|DATETIME)/i)?.[1];
   if(col) assert(columns.some(r=>r.TABLE_NAME===table && r.COLUMN_NAME===col), "Missing column " + table + "." + col);
   const key=line.match(/^(UNIQUE )?KEY (\w+) \(([^)]+)\)/);
   if(key) for(const col of key[3].split(",").map(s=>s.trim())) assert(indexes.some(r=>r.TABLE_NAME===table && r.INDEX_NAME===key[2] && r.COLUMN_NAME===col && (!key[1] || r.NON_UNIQUE===0)), "Missing index " + key[2]);
   const fk=line.match(/^CONSTRAINT (\w+) FOREIGN KEY \((\w+)\) REFERENCES (\w+) \((\w+)\)/);
   if(fk) assert(foreign.some(r=>r.TABLE_NAME===table && r.CONSTRAINT_NAME===fk[1] && r.COLUMN_NAME===fk[2] && r.REFERENCED_TABLE_NAME===fk[3] && r.REFERENCED_COLUMN_NAME===fk[4]), "Missing foreign key " + fk[1]);
  }
 }
 const [[lock]] = await connection.query("SELECT COUNT(*) AS n FROM cab_state_lock WHERE lock_id=1");
 assert.equal(Number(lock.n),1);
 const [categories] = await connection.query("SELECT category_id FROM cab_categories WHERE is_enabled=TRUE");
 assert(categories.length>0,"No request categories enabled");
 const [migrations] = await connection.query("SELECT version FROM schema_migrations WHERE version='001'");
 assert.equal(migrations.length,1,"Migration 001 not recorded");
 console.log("PASS: MySQL 8 connectivity, " + count + " required tables/columns, indexes, foreign keys, lock, categories and migration 001. No records changed.");
} catch(error) { console.error(error?.code || error.message); process.exitCode=1; }
finally { if(connection) await connection.end(); }
