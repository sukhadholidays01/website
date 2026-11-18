import nextEnv from "@next/env";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { hashPassword } from "../src/lib/auth/passwords.mjs";
import { databaseOptions } from "./db-environment.mjs";
import { loadCabModule } from "./cab-test-loader.mjs";

// Local bootstrap only. Credentials never travel in command arguments or logs.
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
let connection;
try {
  if (process.env.NODE_ENV === "production") throw new Error("Use an approved staff-account provisioning process in production.");
  const emailVariable = process.argv[process.argv.indexOf("--email-env") + 1];
  if (process.argv.includes("--email-env") && !["ADMIN_EMAIL_1", "ADMIN_EMAIL_2", "INFO_EMAIL"].includes(emailVariable))
    throw new Error("Choose ADMIN_EMAIL_1, ADMIN_EMAIL_2 or INFO_EMAIL for --email-env.");
  const email = (process.argv.includes("--email-env") ? process.env[emailVariable] : process.argv.includes("--email") ? process.argv[process.argv.indexOf("--email") + 1] : "")?.trim().toLowerCase();
  if (!email || email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Provide --email or --email-env with the intended owner email address.");
  if (!loadCabModule("src/lib/auth/allowlist").isAllowedAdminEmail(email)) throw new Error("Account is not on the owner-approved two-address allowlist.");
  const options = databaseOptions();
  if (!options.database.endsWith("_dev")) throw new Error("This setup command is restricted to the existing development database.");
  const passwordHash = await hashPassword(process.env.CAB_ADMIN_PASSWORD);
  connection = await mysql.createConnection(options);
  await connection.beginTransaction();
  const [existing] = await connection.execute("SELECT user_id,role,is_active FROM users WHERE email = ? FOR UPDATE", [email]);
  if (existing.length) {
    if(!existing[0].is_active || !["OWNER","SUPER_ADMIN","DISPATCHER","OPERATIONS_MANAGER","BOOKING_EXECUTIVE","ACCOUNTANT","VIEWER"].includes(existing[0].role)) throw new Error("Owner reconciliation is required for inactive or non-admin accounts.");
    if (!process.argv.includes("--reset")) throw new Error("Account already exists. Use --reset only for an authorized local password reset.");
    await connection.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", [passwordHash, existing[0].user_id]);
    await connection.execute("DELETE FROM cab_admin_sessions WHERE user_id = ?", [existing[0].user_id]);
  } else {
    await connection.execute("INSERT INTO users (user_id, email, password_hash, role, is_active) VALUES (?, ?, ?, 'OWNER', TRUE)", [randomUUID(), email, passwordHash]);
  }
  await connection.commit();
  console.log("Local admin account saved. Sign in at /admin/login using the selected email and your existing local password. No credentials were printed.");
} catch (error) {
  if (connection) await connection.rollback();
  console.error(error?.code ? "Admin setup failed. Check local database availability and schema." : error.message);
  process.exitCode = 1;
} finally { if (connection) await connection.end(); }
