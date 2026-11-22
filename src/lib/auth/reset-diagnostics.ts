import "server-only";
const codes = new Set(["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR", "ER_ACCESS_DENIED_ERROR", "ER_DBACCESS_DENIED_ERROR", "ER_BAD_DB_ERROR", "ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT", "ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT"]);
export function resetFailureCode(error: unknown) {
  const value = error as { code?: unknown } | null;
  return typeof value?.code === "string" && codes.has(value.code) ? value.code : "UNEXPECTED";
}
export type ResetSkipReason = "email_not_allowlisted" | "account_missing" | "account_inactive" | "account_role_ineligible" | "cooldown_active";
type Details = { operation?: "request" | "validate" | "confirm"; stage?: string; status?: "attempted" | "accepted" | "failed" | "skipped"; valid?: boolean; reason?: "invalid" | "expired" | ResetSkipReason; smtpConfigured?: boolean; originConfigured?: boolean; configurationProblems?: string[]; code?: string; responseCode?: number };
/** Call sites pass only fixed statuses/codes, never request bodies, tokens or recipients. */
export function resetDiagnostic(event: "admin_reset_request_received" | "admin_reset_configuration" | "admin_reset_email_result" | "admin_reset_token_validation" | "admin_reset_failure", requestId: string, details: Details = {}) {
  const entry = JSON.stringify({ event, requestId, ...details });
  if (details.status === "failed" || event === "admin_reset_failure") console.warn(entry);
  else console.info(entry);
}
