import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import mysql from "mysql2/promise";
import ts from "typescript";
import { z } from "zod";
import { loadCabModule } from "./cab-test-loader.mjs";
import { hashPassword, verifyPassword } from "../src/lib/auth/passwords.mjs";
import { databaseOptions } from "./db-environment.mjs";

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const options = databaseOptions();
assert(process.env.NODE_ENV !== "production" && options.database.endsWith("_dev"), "Tests require the existing development database");
const pool = mysql.createPool(options);
const userId = randomUUID(), email = `reset-test-${userId}@example.invalid`;
const secondId=randomUUID(),secondEmail=`reset-test-${secondId}@example.invalid`;
const originalPassword = randomBytes(24).toString("hex"), newPassword = randomBytes(24).toString("hex");
const hash = value => createHash("sha256").update(value).digest("hex");
const sent = [];
const auditIds=[];
let failMail = false;
class CabError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
// Execute the real reset service against MySQL. Only SMTP delivery is intercepted;
// links remain in process memory and are never logged or sent to real mailboxes.
const source = ts.transpileModule(await readFile("src/lib/auth/password-reset.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const loaded = { exports: {} };
new Function("require", "module", "exports", source)(name => {
  if (name === "server-only") return {};
  if (name === "node:crypto") return { randomBytes, randomUUID:()=>{const id=randomUUID();auditIds.push(id);return id;} };
  if (name === "zod") return { z };
  if (name === "@/lib/db") return { getDatabasePool: () => pool };
  if (name === "@/lib/cab/security") return { CabError, hash, staffRole: role => ["OWNER", "VIEWER"].includes(role) ? role : null };
  if (name === "./allowlist") return loadCabModule("src/lib/auth/allowlist");
  if (name === "./reset-email") return loadCabModule("src/lib/auth/reset-email");
  if (name === "./passwords.mjs") return { hashPassword };
  if (name === "@/lib/email/smtp") return {
    verifySmtpConnection: async () => ({connected:true,authenticated:true}),
    safeSmtpFailure:()=>({stage:"submission",code:"TEST_FAILURE"}),
    sendSmtpEmail: async message => { if (failMail) throw new Error("Simulated SMTP failure"); sent.push(message); },
  };
  throw new Error("Unexpected test dependency");
}, loaded, loaded.exports);
const { requestAdminPasswordReset: request } = loaded.exports;
const confirm=body=>loaded.exports.confirmAdminPasswordReset({...body,confirmation:body.password});
process.env.INFO_EMAIL = email;
process.env.ADMIN_EMAIL_1=email;process.env.ADMIN_EMAIL_2=secondEmail;
process.env.CAB_SITE_ORIGIN = "http://localhost:3000";
const tokenFromMail = () => new URL(sent.at(-1).text.match(/^http[^\s]+$/m)[0]).hash.slice("#token=".length);
try {
  await pool.execute("INSERT INTO users (user_id,email,password_hash,role,is_active) VALUES (?,?,?,'OWNER',TRUE)", [userId,email,await hashPassword(originalPassword)]);
  await pool.execute("INSERT INTO users (user_id,email,password_hash,role,is_active) VALUES (?,?,?,'OWNER',TRUE)", [secondId,secondEmail,await hashPassword(originalPassword)]);
  await request({email:"unknown@example.invalid"});
  assert(sent.length === 0);
  await request({email});
  assert(sent.length === 1 && sent[0].to === email);
  const token = tokenFromMail();
  assert(/^[a-f0-9]{64}$/.test(token));
  const [stored] = await pool.execute("SELECT token_hash, TIMESTAMPDIFF(SECOND,created_at,expires_at) AS seconds FROM admin_password_resets WHERE user_id=?", [userId]);
  assert(stored.length === 1 && stored[0].token_hash === hash(token) && stored[0].token_hash !== token && Number(stored[0].seconds) === 1800);
  await request({email});
  assert(sent.length === 1, "Repeated requests should not spam email or extend expiry");
  console.log("PASS configured recipient, unknown email privacy, hashed tokens, 30-minute expiry and resend cooldown");
  await assert.rejects(loaded.exports.confirmAdminPasswordReset({token,password:newPassword,confirmation:"different"}));
  await assert.rejects(confirm({token,password:"short"}));
  await assert.rejects(confirm({token:"bad",password:newPassword}));
  await pool.execute("UPDATE admin_password_resets SET expires_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 SECOND) WHERE user_id=?", [userId]);
  await assert.rejects(confirm({token,password:newPassword}));
  const [unchanged] = await pool.execute("SELECT password_hash FROM users WHERE user_id=?", [userId]);
  assert(await verifyPassword(originalPassword,unchanged[0].password_hash));
  await pool.execute("UPDATE admin_password_resets SET expires_at=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 1 MINUTE) WHERE user_id=?",[userId]);
  await pool.execute("INSERT INTO cab_admin_sessions (session_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 1 HOUR))",[hash(randomUUID()),userId]);
  await confirm({token,password:newPassword});
  const [updated] = await pool.execute("SELECT password_hash,role FROM users WHERE user_id=?",[userId]);
  assert(await verifyPassword(newPassword,updated[0].password_hash));
  assert(!(await verifyPassword(originalPassword,updated[0].password_hash)) && updated[0].role === "OWNER");
  const [sessions] = await pool.execute("SELECT COUNT(*) AS count FROM cab_admin_sessions WHERE user_id=?",[userId]);
  assert(Number(sessions[0].count) === 0);
  await assert.rejects(confirm({token,password:originalPassword}));
  console.log("PASS invalid/expired links, password validation, hashed update, old password rejection, session revocation and single use");
  await request({email});
  const raceToken = tokenFromMail();
  const attempts = await Promise.allSettled([confirm({token:raceToken,password:newPassword}),confirm({token:raceToken,password:originalPassword})]);
  assert(attempts.filter(a=>a.status === "fulfilled").length === 1, "Concurrent use must succeed only once");
  await request({email});
  const oldToken = tokenFromMail();
  await pool.execute("UPDATE admin_password_resets SET created_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 2 MINUTE) WHERE user_id=?",[userId]);
  await request({email});
  const newestToken = tokenFromMail();
  await assert.rejects(confirm({token:oldToken,password:newPassword}));
  await pool.execute("UPDATE users SET is_active=FALSE WHERE user_id=?",[userId]);
  await assert.rejects(confirm({token:newestToken,password:newPassword}));
  const count = sent.length;
  await request({email});
  assert(sent.length === count);
  await pool.execute("UPDATE users SET is_active=TRUE WHERE user_id=?",[userId]);
  await confirm({token:newestToken,password:newPassword});
  console.log("PASS concurrent single use, replacement links and disabled-account protection");
  failMail = true;
  await request({email});
  const [failed] = await pool.execute("SELECT COUNT(*) AS count FROM admin_password_resets WHERE user_id=?",[userId]);
  assert(Number(failed[0].count) === 0);
  const [audit] = await pool.execute("SELECT COUNT(*) AS count FROM cab_audit_log WHERE entity_id=? AND action='ADMIN_PASSWORD_RESET'",[userId]);
  assert(Number(audit[0].count) === 3);
  console.log("PASS failed SMTP invalidation and password-reset audit trail; no real email sent");
  failMail=false;
  await request({email:secondEmail});
  assert(sent.at(-1).to===secondEmail);
  const secondToken=tokenFromMail();
  assert((await loaded.exports.inspectAdminResetToken({token:secondToken})).valid);
  await confirm({token:secondToken,password:newPassword});
  const [secondUser]=await pool.execute("SELECT password_hash FROM users WHERE user_id=?",[secondId]);
  assert(await verifyPassword(newPassword,secondUser[0].password_hash));
  console.log("PASS second approved admin recovery to the same address and successful new password");
} catch (error) {
  const code = /^[A-Z0-9_]+$/.test(error?.code || "") ? error.code : error?.name;
  console.error("FAIL password reset checks (" + code + "). No passwords, reset tokens or message bodies are logged.");
  process.exitCode = 1;
} finally {
  await pool.execute("DELETE FROM cab_admin_sessions WHERE user_id=?",[userId]);
  await pool.execute("DELETE FROM cab_audit_log WHERE entity_id=?",[userId]);
  await pool.execute("DELETE FROM users WHERE user_id=?",[userId]);
  await pool.execute("DELETE FROM users WHERE user_id=?",[secondId]);
  for(const id of auditIds)await pool.execute("DELETE FROM cab_audit_log WHERE event_id=?",[id]);
  await pool.end();
}
