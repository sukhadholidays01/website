import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { adminAllowlist, AdminConfigurationError } from "./allowlist";
import { authenticateAdmin } from "./admin";
import { cabStorageMode } from "@/lib/cab/store";
import { CabError, issueAdminSession, limitRequest, readBody, registerCabSession, revokeCabSession, requireSameOrigin, validateAdminSession } from "@/lib/cab/security";

type Operation = "admin_login" | "admin_session_check" | "admin_logout";
class ConfigurationFailure extends CabError {
  constructor(readonly category: string) {
    super("Admin sign-in is temporarily unavailable. Please contact support.", 503);
  }
}
function requireConfiguration() {
  try { adminAllowlist(); } catch (error) {
    if (error instanceof AdminConfigurationError) throw new ConfigurationFailure("ADMIN_ALLOWLIST_CONFIGURATION");
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
function failure(error: unknown, operation: Operation, requestId: string) {
  const value = error as { code?: unknown; sqlMessage?: unknown } | null;
  const code = error instanceof ConfigurationFailure ? error.category : typeof value?.code === "string" && databaseCodes.has(value.code) ? value.code : "UNEXPECTED";
  const status = error instanceof CabError ? error.status : 503;
  if (status >= 500) {
    const match = code === "ER_NO_SUCH_TABLE" && typeof value?.sqlMessage === "string"
      ? /^Table '(?:[a-z0-9_$-]+\.)?([a-z0-9_$]+)' doesn't exist$/i.exec(value.sqlMessage) : null;
    // Only a closed-list table identifier is retained; never log raw driver messages or SQL.
    console.error(JSON.stringify({ event: "admin_api_failure", requestId, operation, code,
      ...(match && tables.has(match[1]) ? { table: match[1] } : {}) }));
  }
  return reply({ error: error instanceof CabError ? error.message : "Admin sign-in is temporarily unavailable. Please contact support.", code: status >= 500 ? "ADMIN_SERVICE_UNAVAILABLE" : "ADMIN_REQUEST_REJECTED" }, requestId, status);
}
function reply(body: object, requestId: string, status = 200) {
  return Response.json({ ...body, requestId }, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Request-ID": requestId } });
}
async function execute(operation: Operation, work: (requestId: string) => Promise<Response>) {
  const requestId = randomUUID();
  try { return await work(requestId); } catch (error) { return failure(error, operation, requestId); }
}
export async function adminSession() {
  return execute("admin_session_check", async requestId => {
    requireConfiguration();
    const role = await validateAdminSession((await cookies()).get("cab_ops_session")?.value || "");
    return reply({ authenticated: Boolean(role), role, configured: true, storage: cabStorageMode() }, requestId);
  });
}
export async function adminLogin(request: Request) {
  return execute("admin_login", async requestId => {
    requireSameOrigin(request);
    requireConfiguration();
    // Share the existing bucket with the compatibility cab-session endpoint.
    await limitRequest(request, "login", 8, 15 * 60000);
    const account = await authenticateAdmin(await readBody(request));
    const token = issueAdminSession(account.role);
    await registerCabSession(token, account.id);
    (await cookies()).set("cab_ops_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 8 * 3600 });
    return reply({ authenticated: true, role: account.role }, requestId);
  });
}
export async function adminLogout(request: Request) {
  return execute("admin_logout", async requestId => {
    requireSameOrigin(request);
    const jar = await cookies();
    await revokeCabSession(jar.get("cab_ops_session")?.value || "");
    jar.set("cab_ops_session", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
    return reply({ authenticated: false }, requestId);
  });
}
