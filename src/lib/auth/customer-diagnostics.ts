import "server-only";

// Closed list: driver messages, SQL, stacks, and arbitrary error properties can
// contain credentials or customer data and must never enter these logs.
const safeCodes = new Set([
  "ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR", "ER_NO_DEFAULT_FOR_FIELD",
  "ER_BAD_NULL_ERROR", "ER_DATA_TOO_LONG", "ER_DUP_ENTRY",
  "ER_ACCESS_DENIED_ERROR", "ER_DBACCESS_DENIED_ERROR", "ER_BAD_DB_ERROR",
  "ER_NO_REFERENCED_ROW_2", "ER_CHECK_CONSTRAINT_VIOLATED",
  "ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT", "ER_CON_COUNT_ERROR",
  "ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT",
  "PROTOCOL_CONNECTION_LOST", "ERR_CRYPTO_INVALID_SCRYPT_PARAMS",
  "EMAIL_UNAVAILABLE",
]);

const diagnosticTables = new Set([
  "customer_accounts", "customer_verification_tokens", "customer_sessions",
  "cab_rate_limits", "notifications", "notification_reads", "users", "cab_admin_sessions",
]);

function missingTable(error: unknown) {
  if (!error || typeof error !== "object" || !("sqlMessage" in error) || typeof error.sqlMessage !== "string") return undefined;
  // Parse only the fixed missing-table grammar, then discard the database name.
  // Never log the original sqlMessage: other messages can contain parameter data.
  const match = /^Table '(?:[a-z0-9_$-]+\.)?([a-z0-9_$]+)' doesn't exist$/i.exec(error.sqlMessage);
  return match && diagnosticTables.has(match[1]) ? match[1] : undefined;
}

export type CustomerFailureStage = "session" | "origin" | "routing" | "admin"
  | "rate_limit" | "body" | "register" | "resend" | "verify" | "login" | "logout";

export function logCustomerFailure(error: unknown, stage: CustomerFailureStage, requestId: string) {
  const candidate = error && typeof error === "object" && "code" in error ? error.code : null;
  const code = typeof candidate === "string" && safeCodes.has(candidate) ? candidate : "UNEXPECTED";
  const table = code === "ER_NO_SUCH_TABLE" ? missingTable(error) : undefined;
  console.error(JSON.stringify({ event: "customer_api_failure", requestId, stage, code,
    ...(table ? { table, diagnostic: "Required database table is missing." } : {}) }));
}
