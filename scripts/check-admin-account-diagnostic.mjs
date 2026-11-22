import assert from "node:assert/strict";
import { diagnoseAdminAccounts } from "./diagnose-admin-account.mjs";
const env = { ADMIN_EMAIL_1: "first@example.invalid", ADMIN_EMAIL_2: "second@example.invalid", DB_NAME: "u947357357_sukhad_prod", DB_HOST: "fixture.invalid", DB_USER: "fixture", DB_PASSWORD: "fixture" };
let closed = false, calls = 0;
const connect = async () => ({ execute: async (sql, args) => {
  assert(sql.startsWith("SELECT ")); calls++;
  if (sql.includes("DATABASE()")) return [[{ matches_expected: 1 }]];
  assert.equal(args[0], args[1]);assert.equal(args[0], args[2]);
  assert(sql.includes("FROM customer_accounts WHERE LOWER(TRIM(email)) = ?"));
  return [[{ lookup_matches: calls === 2 ? 0 : 1, normalized_matches: calls === 2 ? 0 : 1, customer_matches: calls === 2 ? 1 : 0 }]];
}, end: async () => { closed = true; } });
const result = await diagnoseAdminAccounts(env, connect);
assert.deepEqual(result.accounts, [{ slot: 1, lookupMatches: 0, normalizedMatches: 0, customerAccountMatches: 1 }, { slot: 2, lookupMatches: 1, normalizedMatches: 1, customerAccountMatches: 0 }]);
assert(closed); assert(!JSON.stringify(result).includes("@"));
await assert.rejects(diagnoseAdminAccounts({ ...env, DB_NAME: "wrong" }, () => { throw Error("Must not connect"); }), e => e.code === "DATABASE_TARGET_MISMATCH");
closed = false;
await assert.rejects(diagnoseAdminAccounts(env, async () => ({ execute: async () => [[{ matches_expected: 0 }]], end: async () => { closed = true; } })), e => e.code === "DATABASE_TARGET_MISMATCH");
assert(closed);
console.log("PASS read-only admin diagnostic: SELECT-only, normalized matches, production target guard, cleanup, no addresses in output. No database connection made.");
