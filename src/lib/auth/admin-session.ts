import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { adminAllowlist, AdminConfigurationError, type AdminConfigurationProblem } from "./allowlist";
import { authenticateAdmin } from "./admin";
import { cabStorageMode } from "@/lib/cab/store";
import { adminConfigured, CabError, issueAdminSession, limitRequest, readBody, registerCabSession, revokeCabSession, requireSameOrigin, validateAdminSession } from "@/lib/cab/security";

type Operation = "admin_login" | "admin_session_check" | "admin_logout";
type Stage = "request" | "cookie_read" | "origin" | "configuration" | "rate_limit" | "body" | "account_authentication" | "session_lookup" | "session_create" | "session_revoke" | "cookie_write";
class ConfigurationFailure extends CabError {
  constructor(readonly category: string, readonly configurationProblems?: readonly AdminConfigurationProblem[]) {
    super("Admin sign-in is temporarily unavailable. Please contact support.", 503);
  }
}
function requireConfiguration() {
  try { adminAllowlist(); } catch (error) {
    if (error instanceof AdminConfigurationError) throw new ConfigurationFailure("ADMIN_ALLOWLIST_CONFIGURATION", error.configurationProblems);
    throw error;
  }
  if ((process.env.CAB_SESSION_SECRET || "").length < 32) throw new ConfigurationFailure("ADMIN_SESSION_CONFIGURATION");
  if (cabStorageMode() !== "mysql") throw new ConfigurationFailure("ADMIN_STORAGE_CONFIGURATION");
  if (["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].some(key => !process.env[key])) throw new ConfigurationFailure("DATABASE_CONFIGURATION");
  const port = Number(process.env.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ConfigurationFailure("DATABASE_CONFIGURATION");
}
const databaseCodes = new Set([
  "ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR", "ER_ACCESS_DENIED_ERROR", "ER_DBACCESS_DENIED_ERROR", "ER_BAD_DB_ERROR",
  "ER_BAD_NULL_ERROR", "ER_NO_DEFAULT_FOR_FIELD", "ER_DUP_ENTRY", "ER_NO_REFERENCED_ROW_2",
  "ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT", "ER_CON_COUNT_ERROR", "ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "PROTOCOL_CONNECTION_LOST",
]);
const tables = new Set(["users", "cab_admin_sessions", "cab_rate_limits"]);
function failure(error: unknown, operation: Operation, requestId: string, stage: Stage) {
  const value = error as { code?: unknown; sqlMessage?: unknown } | null;
  const code = error instanceof ConfigurationFailure ? error.category : typeof value?.code === "string" && databaseCodes.has(value.code) ? value.code : "UNEXPECTED";
  const status = error instanceof CabError ? error.status : 503;
  if (status >= 500) {
    const match = code === "ER_NO_SUCH_TABLE" && typeof value?.sqlMessage === "string"
      ? /^Table '(?:[a-z0-9_$-]+\.)?([a-z0-9_$]+)' doesn't exist$/i.exec(value.sqlMessage) : null;
    // Only a closed-list table identifier is retained; never log raw driver messages or SQL.
    console.error(JSON.stringify({ event: "admin_api_failure", requestId, operation, stage, code,
      ...(error instanceof ConfigurationFailure && error.configurationProblems?.length ? { configurationProblems: error.configurationProblems } : {}),
      ...(match && tables.has(match[1]) ? { table: match[1] } : {}) }));
  }
  return reply({ error: error instanceof CabError ? error.message : "Admin sign-in is temporarily unavailable. Please contact support.", code: status >= 500 ? "ADMIN_SERVICE_UNAVAILABLE" : "ADMIN_REQUEST_REJECTED" }, requestId, status);
}
function reply(body: object, requestId: string, status = 200) {
  return Response.json({ ...body, requestId }, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Request-ID": requestId } });
}
async function execute(operation: Operation, work: (requestId: string, setStage: (stage: Stage) => void) => Promise<Response>) {
  const requestId = randomUUID();
  let stage: Stage = "request";
  try { return await work(requestId, value => { stage = value; }); } catch (error) { return failure(error, operation, requestId, stage); }
}
export async function adminSession() {
  return execute("admin_session_check", async (requestId, setStage) => {
    setStage("cookie_read");
    const token = (await cookies()).get("cab_ops_session")?.value || "";
    // Session discovery is not an infrastructure readiness probe. No cookie means
    // no session to validate; login still requires the complete configuration.
    if (!token) return reply({ authenticated: false, role: null, configured: adminConfigured(), storage: cabStorageMode() }, requestId);
    setStage("configuration");
    requireConfiguration();
    setStage("session_lookup");
    const role = await validateAdminSession(token);
    return reply({ authenticated: Boolean(role), role, configured: true, storage: cabStorageMode() }, requestId);
  });
}
export async function adminLogin(request: Request) {
  return execute("admin_login", async (requestId, setStage) => {
    setStage("origin");
    requireSameOrigin(request);
    setStage("configuration");
    requireConfiguration();
    // Share the existing bucket with the compatibility cab-session endpoint.
    setStage("rate_limit");
    await limitRequest(request, "login", 8, 15 * 60000);
    setStage("body");
    const body = await readBody(request);
    setStage("account_authentication");
    const account = await authenticateAdmin(body);
    setStage("session_create");
    const token = issueAdminSession(account.role);
    await registerCabSession(token, account.id);
    setStage("cookie_write");
    (await cookies()).set("cab_ops_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 8 * 3600 });
    return reply({ authenticated: true, role: account.role }, requestId);
  });
}
export async function adminLogout(request: Request) {
  return execute("admin_logout", async (requestId, setStage) => {
    setStage("origin");
    requireSameOrigin(request);
    setStage("cookie_read");
    const jar = await cookies();
    setStage("session_revoke");
    await revokeCabSession(jar.get("cab_ops_session")?.value || "");
    setStage("cookie_write");
    jar.set("cab_ops_session", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
    return reply({ authenticated: false }, requestId);
  });
}
