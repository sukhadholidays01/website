import assert from "node:assert/strict";
import { adminTestContext } from "./admin-test-context.mjs";
import { verifyPassword } from "../src/lib/auth/passwords.mjs";

// In-memory boundaries only: no MySQL connection, real email, or production data.
const originalEnv = { ...process.env };
const originalError = console.error;
const logs = [];
const accounts = new Map();
const tokens = new Map();
let missing = "", failMail = false, deliveries = 0, rolledBack = 0;
const privateMarker = "PRIVATE_CUSTOMER_AND_CREDENTIAL_SENTINEL";
const connection = {
  async beginTransaction() {},
  async commit() {},
  async rollback() { rolledBack++; },
  release() {},
  async execute(sql, values = []) {
    if (missing && sql.includes(missing)) {
      throw Object.assign(new Error(privateMarker), { code: "ER_NO_SUCH_TABLE", sql: privateMarker });
    }
    if (sql.startsWith("SELECT request_count")) return [[{ request_count: 0, expires_at: new Date(Date.now() + 60000) }]];
    if (sql.startsWith("SELECT account_id FROM customer_accounts")) return [accounts.has(values[0]) ? [{ account_id: accounts.get(values[0]).id }] : []];
    if (sql.startsWith("INSERT INTO customer_accounts")) accounts.set(values[1], { id: values[0], passwordHash: values[3] });
    if (sql.startsWith("INSERT INTO customer_verification_tokens")) tokens.set(values[1], values[0]);
    if (sql.startsWith("DELETE FROM customer_verification_tokens WHERE token_hash")) {
      for (const [id, token] of tokens) if (token === values[0]) tokens.delete(id);
    }
    return [{ affectedRows: 1 }];
  },
};
const pool = { getConnection: async () => connection, execute: (...args) => connection.execute(...args) };

try {
  process.env.NODE_ENV = "production";
  process.env.CAB_SITE_ORIGIN = "https://registration.example.invalid";
  process.env.SMTP_HOST = "smtp.example.invalid";
  process.env.SMTP_USER = "test@example.invalid";
  process.env.SMTP_PASS = privateMarker;
  console.error = entry => logs.push(String(entry));
  const { load } = adminTestContext(pool, { sendSmtpEmail: async () => { if (failMail) throw Error(privateMarker); deliveries++; } });
  const routes = load("src/app/api/customer/[...path]/route");
  const client = load("src/lib/auth/customer-client");
  const password = "Registration-test-password-123";
  const signup = { fullName: "Test Customer", email: "customer@example.invalid", password, confirmation: password, consent: true };
  const post = (body = signup, origin = process.env.CAB_SITE_ORIGIN) => routes.POST(new Request(process.env.CAB_SITE_ORIGIN + "/api/customer/register", {
    method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ path: ["register"] }) });

  assert.equal((await post()).status, 202);
  assert.equal(accounts.size, 1);
  assert(await verifyPassword(password, accounts.get(signup.email).passwordHash));
  assert.match(tokens.get(accounts.get(signup.email).id), /^[a-f0-9]{64}$/);
  assert.equal((await post()).status, 202); // Duplicate email must not disclose membership.
  assert.equal(accounts.size, 1);
  assert.equal(deliveries, 1);
  assert.equal((await post({ ...signup, password: "weak" })).status, 400);
  assert.equal((await post(signup, "https://untrusted.invalid")).status, 403);

  for (const [table, stage] of [["customer_accounts", "register"], ["cab_rate_limits", "rate_limit"]]) {
    missing = table;
    const response = await post();
    assert.equal(response.status, 503);
    const body = await response.json();
    const log = JSON.parse(logs.at(-1));
    assert.equal(log.stage, stage);
    assert.equal(log.code, "ER_NO_SUCH_TABLE");
    assert.equal(log.requestId, body.requestId);
    assert(!JSON.stringify(body).includes(table));
  }
  missing = "";
  failMail = true;
  const emailFailure = await post({ ...signup, email: "mail-failure@example.invalid" });
  assert.equal(emailFailure.status, 503);
  assert.equal((await emailFailure.json()).code, "EMAIL_UNAVAILABLE");
  assert(rolledBack > 0);

  load("src/lib/auth/customer-diagnostics").logCustomerFailure({ code: privateMarker, message: privateMarker, sql: privateMarker }, "register", "test-reference");
  assert.equal(JSON.parse(logs.at(-1)).code, "UNEXPECTED");
  assert(!logs.join().includes(privateMarker));
  assert(!logs.join().includes(signup.email));
  assert(!logs.join().includes(password));

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("<html>proxy unavailable</html>", { status: 503 });
    await assert.rejects(() => client.customerRequest("register", signup), e => e.status === 503 && !e.message.includes("<html>"));
    globalThis.fetch = async () => { throw new TypeError(privateMarker); };
    await assert.rejects(() => client.customerRequest("register", signup), e => e.code === "NETWORK_ERROR" && !e.message.includes(privateMarker));
    globalThis.fetch = async () => Response.json({ error: "Check your details.", code: "VALIDATION_ERROR" }, { status: 400 });
    await assert.rejects(() => client.customerRequest("register", signup), e => e.code === "VALIDATION_ERROR" && e.status === 400);
  } finally { globalThis.fetch = originalFetch; }
  originalError("PASS: registration, scrypt, duplicate privacy, validation, origin protection, schema/rate-limit failures, SMTP failure, safe logs, and client failure handling. No database or email accessed.");
} finally {
  console.error = originalError;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
}
