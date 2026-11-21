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

export type CustomerFailureStage = "session" | "origin" | "routing" | "admin"
  | "rate_limit" | "body" | "register" | "resend" | "verify" | "login" | "logout";

export function logCustomerFailure(error: unknown, stage: CustomerFailureStage, requestId: string) {
  const candidate = error && typeof error === "object" && "code" in error ? error.code : null;
  const code = typeof candidate === "string" && safeCodes.has(candidate) ? candidate : "UNEXPECTED";
  console.error(JSON.stringify({ event: "customer_api_failure", requestId, stage, code }));
}
