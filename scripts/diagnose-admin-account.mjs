import { pathToFileURL } from "node:url";
import mysql from "mysql2/promise";
import { readAdminAllowlist } from "../src/lib/auth/admin-allowlist.mjs";

// Process-only: run in the deployed application's environment. SELECTs only.
export async function diagnoseAdminAccounts(environment, connect = mysql.createConnection) {
  const expected = "u947357357_sukhad_prod";
  const emails = readAdminAllowlist(environment);
  if (environment.DB_NAME !== expected) throw Object.assign(new Error(), { code: "DATABASE_TARGET_MISMATCH" });
  if (["DB_HOST", "DB_USER", "DB_PASSWORD"].some(key => !environment[key])) throw Object.assign(new Error(), { code: "DATABASE_CONFIGURATION" });
  const port = Number(environment.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Object.assign(new Error(), { code: "DATABASE_CONFIGURATION" });
  const db = await connect({ host: environment.DB_HOST, port, user: environment.DB_USER,
    password: environment.DB_PASSWORD, database: environment.DB_NAME, connectTimeout: 10000,
    charset: "utf8mb4", timezone: "Z",
    ...(environment.DB_SSL === "true" ? { ssl: { rejectUnauthorized: true,
      ...(environment.DB_SSL_CA ? { ca: environment.DB_SSL_CA.replace(/\\n/g, "\n") } : {}) } } : {}) });
  try {
    const [rows] = await db.execute("SELECT DATABASE() = ? AS matches_expected", [expected]);
    if (!rows[0]?.matches_expected) throw Object.assign(new Error(), { code: "DATABASE_TARGET_MISMATCH" });
    const accounts = [];
    for (const [index, email] of emails.entries()) {
      const [matches] = await db.execute("SELECT (SELECT COUNT(*) FROM users WHERE email = ?) AS lookup_matches, (SELECT COUNT(*) FROM users WHERE LOWER(TRIM(email)) = ?) AS normalized_matches", [email, email]);
      accounts.push({ slot: index + 1, lookupMatches: Number(matches[0].lookup_matches), normalizedMatches: Number(matches[0].normalized_matches) });
    }
    return { databaseMatchesIntendedProduction: true, table: "users", accounts };
  } finally { await db.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await diagnoseAdminAccounts(process.env))); }
  catch (error) {
    const safe = new Set(["DATABASE_TARGET_MISMATCH", "DATABASE_CONFIGURATION", "ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR", "ER_ACCESS_DENIED_ERROR", "ECONNREFUSED", "ETIMEDOUT"]);
    console.error(JSON.stringify({ ok: false, code: safe.has(error?.code) ? error.code : "ADMIN_ACCOUNT_DIAGNOSTIC_FAILED" }));
    process.exitCode = 1;
  }
}
