import nextEnv from "@next/env";
import mysql from "mysql2/promise";
import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "../src/lib/auth/passwords.mjs";
import { loadCabModule } from "./cab-test-loader.mjs";
import { databaseOptions } from "./db-environment.mjs";
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const { adminAllowlist } = loadCabModule("src/lib/auth/allowlist");
const roles = ["OWNER","SUPER_ADMIN","DISPATCHER","OPERATIONS_MANAGER","BOOKING_EXECUTIVE","ACCOUNTANT","VIEWER"];
let db;
try {
  const emails = adminAllowlist(), options = databaseOptions();
  if (process.env.NODE_ENV === "production" || !options.database.endsWith("_dev")) throw new Error("This reconciliation tool is restricted to the existing local development database.");
  db = await mysql.createConnection(options);
  await db.beginTransaction();
  const [records] = await db.execute("SELECT user_id, email, role, is_active FROM users WHERE email IN (?, ?) OR role IN ('OWNER','SUPER_ADMIN','DISPATCHER','OPERATIONS_MANAGER','BOOKING_EXECUTIVE','ACCOUNTANT','VIEWER') FOR UPDATE", emails);
  const extra = records.filter(user => roles.includes(user.role) && !emails.includes(user.email.trim().toLowerCase()));
  console.log(JSON.stringify({ approvedAccounts: emails.map(email => { const user=records.find(u=>u.email.trim().toLowerCase()===email); return {email,exists:!!user,active:!!user?.is_active,role:user?.role||null}; }), additionalAdminAccounts: extra.map(u=>({email:u.email,active:!!u.is_active,role:u.role})) }));
  if (process.argv.includes("--apply")) {
    if (extra.length && !process.argv.includes("--acknowledge-extra-admins")) throw new Error("Owner approval is required for extra admin reconciliation. Review the records first; no users were changed.");
    for (const email of emails) {
      const user = records.find(u => u.email.trim().toLowerCase() === email);
      if (user && (!roles.includes(user.role) || !user.is_active)) throw new Error("An approved address belongs to an inactive or non-admin record. Explicit owner reconciliation is required; no users were changed.");
      if (!user) {
        const passwordHash = await hashPassword(randomBytes(48).toString("base64url"));
        await db.execute("INSERT INTO users (user_id,email,password_hash,role,is_active) VALUES (?,?,?,'OWNER',TRUE)",[randomUUID(),email,passwordHash]);
      }
    }
    await db.commit();
    console.log("Two approved active admin accounts reconciled. Existing passwords and unrelated records preserved. New accounts must set their password through email recovery.");
  } else { await db.rollback(); console.log("Review only. Apply requires --apply after owner confirmation of both addresses."); }
} catch(error) { if(db)await db.rollback(); console.error(error?.code ? "Admin reconciliation failed; no credentials were logged." : error.message);process.exitCode=1; }
finally { if(db)await db.end(); }
