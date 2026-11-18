import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { databaseOptions } from "./db-environment.mjs";
import { loadCabModule } from "./cab-test-loader.mjs";
const options = databaseOptions();
assert(options.database.endsWith("_dev") && process.env.NODE_ENV !== "production", "Development database only");
process.env.CAB_STORAGE_MODE="mysql";
const { getDatabasePool }=loadCabModule("src/lib/db");
const security=loadCabModule("src/lib/cab/security");
const { mysqlCabRepository }=loadCabModule("src/lib/cab/mysql-repository");
const pool=getDatabasePool(), session=String(Date.now()+60000)+"."+randomBytes(32).toString("hex"), bucket=security.hash(randomBytes(32).toString("hex"));
const fixtureUser=randomUUID();
try {
 await pool.execute("INSERT INTO users (user_id,email,password_hash,role,is_active) VALUES (?,?,'unusable-fixture','CUSTOMER',FALSE)",[fixtureUser,`persistence-${fixtureUser}@example.invalid`]);
 await security.registerCabSession(session,fixtureUser);
 let [rows]=await pool.execute("SELECT session_hash FROM cab_admin_sessions WHERE session_hash=?",[security.hash(session)]);
 assert.equal(rows.length,1);
 await security.revokeCabSession(session);
 [rows]=await pool.execute("SELECT session_hash FROM cab_admin_sessions WHERE session_hash=?",[security.hash(session)]);
 assert.equal(rows.length,0);
 console.log("PASS actual MySQL session registration and durable revocation");
 const statements=[]; const original=pool.getConnection.bind(pool);
 pool.getConnection=async()=>{const connection=await original();return new Proxy(connection,{get(target,key){if(key==="execute")return async(sql,params)=>{statements.push(sql);return target.execute(sql,params);};const value=Reflect.get(target,key);return typeof value==="function"?value.bind(target):value;}});};
 try { await mysqlCabRepository.transaction(state=>{state.limits[bucket]={count:1,until:Date.now()+60000};}); }
 finally {pool.getConnection=original;}
 assert(statements.some(s=>s.startsWith("INSERT INTO cab_rate_limits")));
 assert(!statements.some(s=>/^(INSERT INTO (bookings|customers|vehicles|drivers|payments|website_settings|fare_configurations)|UPDATE fare_configurations)/.test(s)),"Small mutations must not rewrite unchanged business records");
 console.log("PASS MySQL delta persistence does not rewrite unchanged bookings, customers, fleet, payments, fares or settings");
 const [migrations]=await pool.execute("SELECT version FROM schema_migrations WHERE version='002'");assert.equal(migrations.length,1);
 console.log("PASS additive tracking/audit/refund migration applied");
} finally {
 await pool.execute("DELETE FROM cab_admin_sessions WHERE session_hash=?",[security.hash(session)]);
 await pool.execute("DELETE FROM users WHERE user_id=?",[fixtureUser]);
 await pool.execute("DELETE FROM cab_rate_limits WHERE bucket_key=?",[bucket]);
 await pool.end();
}
