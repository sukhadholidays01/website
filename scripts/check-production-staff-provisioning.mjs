import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { provisionProductionStaff } from "./provision-production-staff.mjs";
import { verifyPassword } from "../src/lib/auth/passwords.mjs";

const environment = { ADMIN_EMAIL_1: "first@example.invalid", ADMIN_EMAIL_2: " SECOND@example.invalid ", DB_HOST: "fixture.invalid", DB_USER: "fixture", DB_PASSWORD: "fixture-only", DB_NAME: "u947357357_sukhad_prod" };
const password = randomBytes(32).toString("base64url");
const input = { apply: true, emailVariable: "ADMIN_EMAIL_1", approvedDatabase: environment.DB_NAME, role: "OWNER", password, confirmation: password };
const neverConnect = async () => { throw Error("Unexpected database connection"); };
for (const changes of [{ apply: false }, { approvedDatabase: "wrong" }, { emailVariable: "INFO_EMAIL" }, { role: "CUSTOMER" }, { role: undefined }, { password: "short", confirmation: "short" }, { confirmation: "wrong" }])
  await assert.rejects(provisionProductionStaff(environment, { ...input, ...changes }, neverConnect));
await assert.rejects(provisionProductionStaff({ ...environment, DB_NAME: "wrong" }, input, neverConnect));
await assert.rejects(provisionProductionStaff({ ...environment, ADMIN_EMAIL_2: environment.ADMIN_EMAIL_1 }, input, neverConnect));

function fixture({ selected = true, duplicate = false, insertFailure = false } = {}) {
  const events = [], inserts = [];
  return { events, inserts, connect: async () => ({
    execute: async (sql, args) => {
      if (sql.startsWith("SELECT DATABASE()")) { events.push("target"); return [[{ matches_expected: Number(selected) }]]; }
      if (sql.startsWith("SELECT user_id FROM users")) {
        assert(sql.includes("LOWER(TRIM(email))") && sql.endsWith("FOR UPDATE")); assert.equal(args[0], args[1]);
        events.push("lookup"); return [duplicate ? [{ user_id: "fixture" }] : []];
      }
      assert(sql.startsWith("INSERT INTO users "));assert.equal(args.length, 4);events.push("insert");
      if (insertFailure) throw Object.assign(new Error("Sensitive driver details"), { code: "ER_DUP_ENTRY" });
      inserts.push(args); return [{ affectedRows: 1 }];
    },
    beginTransaction: async () => { events.push("begin"); },
    commit: async () => { events.push("commit"); },
    rollback: async () => { events.push("rollback"); },
    end: async () => { events.push("end"); },
  }) };
}
for (const [slot, role] of [[1, "OWNER"], [2, "VIEWER"]]) {
  const db = fixture();
  const result = await provisionProductionStaff(environment, { ...input, emailVariable: `ADMIN_EMAIL_${slot}`, role }, db.connect);
  assert.deepEqual(result, { created: true, slot, role });
  assert.deepEqual(db.events, ["target", "begin", "lookup", "insert", "commit", "end"]);
  const [id, email, encoded, storedRole] = db.inserts[0];
  assert.match(id, /^[a-f0-9-]{36}$/);assert.equal(email, environment[`ADMIN_EMAIL_${slot}`].trim().toLowerCase());
  assert(await verifyPassword(password, encoded));assert.notEqual(encoded, password);assert.equal(storedRole, role);
  for (const sensitive of [email, password, encoded, environment.DB_PASSWORD]) assert(!JSON.stringify(result).includes(sensitive));
}
for (const [options, code, expected] of [
  [{ selected: false }, "DATABASE_TARGET_MISMATCH", ["target", "end"]],
  [{ duplicate: true }, "STAFF_ACCOUNT_ALREADY_EXISTS", ["target", "begin", "lookup", "rollback", "end"]],
  [{ insertFailure: true }, "ER_DUP_ENTRY", ["target", "begin", "lookup", "insert", "rollback", "end"]],
]) {
  const db = fixture(options);
  await assert.rejects(provisionProductionStaff(environment, input, db.connect), error => error.code === code);
  assert.deepEqual(db.events, expected);assert.equal(db.inserts.length, 0);
}
const cliArgs = ["scripts/provision-production-staff.mjs", "--apply", "--approved-db", environment.DB_NAME, "--email-env", "ADMIN_EMAIL_1", "--role", "OWNER"];
for (const [args, code] of [[cliArgs, "INTERACTIVE_TERMINAL_REQUIRED"], [[...cliArgs, "--password", password], "INVALID_ARGUMENTS"]]) {
  const run = spawnSync(process.execPath, args, { env: { ...process.env, ...environment }, encoding: "utf8", windowsHide: true });
  assert.equal(run.status, 1);assert.equal(JSON.parse(run.stderr).code, code);
  assert(!run.stdout.includes(password) && !run.stderr.includes(password));
}
console.log("PASS staff provisioning: both allowlisted slots, real password hashing, approval/target/role/password guards, normalized duplicates, transactional rollback and cleanup. Simulated database only; no accounts created.");
