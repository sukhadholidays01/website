import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import mysql from "mysql2/promise";
import { readAdminAllowlist } from "../src/lib/auth/admin-allowlist.mjs";
import { hashPassword } from "../src/lib/auth/passwords.mjs";

const productionDatabase = "u947357357_sukhad_prod";
const fail = code => { throw Object.assign(new Error("Staff provisioning refused."), { code }); };

function approvedInput(environment, input) {
  if (!input.apply || input.approvedDatabase !== productionDatabase || environment.DB_NAME !== productionDatabase)
    fail("DATABASE_APPROVAL_REQUIRED");
  if (!["ADMIN_EMAIL_1", "ADMIN_EMAIL_2"].includes(input.emailVariable)) fail("APPROVED_EMAIL_REQUIRED");
  const allowlist = readAdminAllowlist(environment);
  const email = environment[input.emailVariable]?.trim().toLowerCase();
  if (!allowlist.includes(email)) fail("APPROVED_EMAIL_REQUIRED");
  if (!["OWNER", "DISPATCHER", "ACCOUNTANT", "VIEWER"].includes(input.role)) fail("EXPLICIT_STAFF_ROLE_REQUIRED");
  const port = Number(environment.DB_PORT || 3306);
  if (["DB_HOST", "DB_USER", "DB_PASSWORD"].some(key => !environment[key]) || !Number.isInteger(port) || port < 1 || port > 65535)
    fail("DATABASE_CONFIGURATION");
  return { email, port };
}

// No environment-file loading, automatic execution, upsert, password reset or customer writes.
export async function provisionProductionStaff(environment, input, connect = mysql.createConnection) {
  const { email, port } = approvedInput(environment, input);
  if (typeof input.password !== "string" || input.password.length < 16 || input.password.length > 1024 || input.password !== input.confirmation)
    fail("PASSWORD_REQUIREMENTS");
  const passwordHash = await hashPassword(input.password);
  const db = await connect({ host: environment.DB_HOST, port, user: environment.DB_USER,
    password: environment.DB_PASSWORD, database: environment.DB_NAME, charset: "utf8mb4", timezone: "Z", connectTimeout: 10000,
    ...(environment.DB_SSL === "true" ? { ssl: { rejectUnauthorized: true,
      ...(environment.DB_SSL_CA ? { ca: environment.DB_SSL_CA.replace(/\\n/g, "\n") } : {}) } } : {}) });
  let transaction = false;
  try {
    const [selected] = await db.execute("SELECT DATABASE() = ? AS matches_expected", [productionDatabase]);
    if (!selected[0]?.matches_expected) fail("DATABASE_TARGET_MISMATCH");
    await db.beginTransaction(); transaction = true;
    // Lock matches and reject legacy whitespace/case variants as well as exact duplicates.
    const [existing] = await db.execute("SELECT user_id FROM users WHERE email = ? OR LOWER(TRIM(email)) = ? FOR UPDATE", [email, email]);
    if (existing.length) fail("STAFF_ACCOUNT_ALREADY_EXISTS");
    await db.execute("INSERT INTO users (user_id,email,password_hash,role,is_active) VALUES (?,?,?,?,TRUE)", [randomUUID(), email, passwordHash, input.role]);
    await db.commit(); transaction = false;
    return { created: true, slot: input.emailVariable === "ADMIN_EMAIL_1" ? 1 : 2, role: input.role };
  } catch (error) {
    if (transaction) await db.rollback();
    throw error;
  } finally { await db.end(); }
}

async function hiddenInput(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) fail("INTERACTIVE_TERMINAL_REQUIRED");
  process.stdout.write(prompt);
  const muted = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const rl = createInterface({ input: process.stdin, output: muted, terminal: true, historySize: 0 });
  const controller = new AbortController();
  rl.on("SIGINT", () => controller.abort());
  try { return await rl.question("", { signal: controller.signal }); }
  finally { rl.close(); muted.end(); process.stdout.write("\n"); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let input;
  try {
    const args = process.argv.slice(2), options = {};
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--apply" && !options.apply) options.apply = true;
      else if (["--email-env", "--approved-db", "--role"].includes(args[i]) && !Object.hasOwn(options, args[i]) && args[i + 1] && !args[i + 1].startsWith("--")) {
        options[args[i]] = args[i + 1]; i++;
      }
      else fail("INVALID_ARGUMENTS");
    }
    input = { apply: options.apply, emailVariable: options["--email-env"], approvedDatabase: options["--approved-db"], role: options["--role"] };
    approvedInput(process.env, input);
    input.password = await hiddenInput("New staff password (16–1024 characters; hidden): ");
    input.confirmation = await hiddenInput("Confirm staff password (hidden): ");
    console.log(JSON.stringify(await provisionProductionStaff(process.env, input)));
  } catch (error) {
    const codes = new Set(["DATABASE_APPROVAL_REQUIRED", "APPROVED_EMAIL_REQUIRED", "EXPLICIT_STAFF_ROLE_REQUIRED", "DATABASE_CONFIGURATION", "PASSWORD_REQUIREMENTS", "DATABASE_TARGET_MISMATCH", "STAFF_ACCOUNT_ALREADY_EXISTS", "INTERACTIVE_TERMINAL_REQUIRED", "INVALID_ARGUMENTS", "ER_DUP_ENTRY", "ER_NO_SUCH_TABLE", "ER_ACCESS_DENIED_ERROR", "ER_LOCK_DEADLOCK"]);
    console.error(JSON.stringify({ created: false, code: codes.has(error?.code) ? error.code : "STAFF_PROVISIONING_FAILED" }));
    process.exitCode = 1;
  } finally {
    // JS strings cannot be securely erased; drop references promptly and exit.
    if (input) { input.password = undefined; input.confirmation = undefined; }
  }
}
