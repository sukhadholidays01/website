import "server-only";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { cabStorageMode, changeCabState } from "./store";
import { getDatabasePool } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";
import { adminAllowlistConfigured, isAllowedAdminEmail } from "@/lib/auth/allowlist";
export class CabError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
const secret = () => process.env.CAB_SESSION_SECRET || "";
const sign = (value: string) =>
  createHmac("sha256", secret()).update(value).digest("hex");
export const adminConfigured = () =>
  secret().length >= 32 && cabStorageMode() === "mysql" && adminAllowlistConfigured();
export type CabRole = "OWNER" | "DISPATCHER" | "ACCOUNTANT" | "VIEWER";
export const staffRoles: Record<string, CabRole> = { OWNER: "OWNER", SUPER_ADMIN: "OWNER", DISPATCHER: "DISPATCHER", OPERATIONS_MANAGER: "DISPATCHER", BOOKING_EXECUTIVE: "DISPATCHER", ACCOUNTANT: "ACCOUNTANT", VIEWER: "VIEWER" };
export function staffRole(value: string): CabRole | null { return Object.hasOwn(staffRoles, value) ? staffRoles[value] : null; }
export function issueAdminSession(role: CabRole = "OWNER") {
  if (!adminConfigured())
    throw new CabError(
      "Configure MySQL and CAB_SESSION_SECRET (32+ characters) for admin login.",
      503,
    );
  const value = `${Date.now() + 8 * 3600000}.${role}~staff~${randomBytes(16).toString("hex")}`;
  return value + "." + sign(value);
}
export async function validateAdminSession(token: string): Promise<CabRole | null> {
  if (!adminConfigured()) return null;
  const [expiry, nonce, signature] = token.split(".");
  if (!(
    expiry &&
    nonce &&
    signature &&
    nonce.split("~")[1] === "staff" &&
    Number(expiry) > Date.now() &&
    equal(signature, sign(expiry + "." + nonce))
  ))
    return null;
  if (cabStorageMode() === "mysql") {
    const [rows] = await getDatabasePool().execute<RowDataPacket[]>("SELECT u.role, u.email FROM cab_admin_sessions s JOIN users u ON u.user_id = s.user_id WHERE s.session_hash = ? AND s.expires_at > UTC_TIMESTAMP(3) AND u.is_active = TRUE", [hash(token)]);
    return rows[0] && isAllowedAdminEmail(rows[0].email) ? staffRole(rows[0].role) : null;
  }
  return null;
}
async function currentAdminRole() { return validateAdminSession((await cookies()).get("cab_ops_session")?.value || ""); }
export async function hasCabAdmin() { return (await currentAdminRole()) !== null; }
export async function registerCabSession(token: string, userId?: string) {
  if (cabStorageMode() === "mysql") {
    if (!userId) throw new CabError("An individual admin account is required.", 401);
    await getDatabasePool().execute("INSERT INTO cab_admin_sessions (session_hash, user_id, expires_at) VALUES (?, ?, ?)", [hash(token), userId, new Date(Number(token.split(".")[0]))]);
    return;
  }
  await changeCabState((state) => {
    state.sessions ||= {};
    for (const [key, expiry] of Object.entries(state.sessions))
      if (expiry < Date.now()) delete state.sessions[key];
    state.sessions[hash(token)] = Number(token.split(".")[0]);
  });
}
export async function revokeCabSession(token: string) {
  if (cabStorageMode() === "mysql") {
    if (token) await getDatabasePool().execute("DELETE FROM cab_admin_sessions WHERE session_hash = ?", [hash(token)]);
    return;
  }
  if (token)
    await changeCabState((state) => {
      if (state.sessions) delete state.sessions[hash(token)];
    });
}
export async function requireCabAdmin() {
  if (!(await hasCabAdmin()))
    throw new CabError("Sign in to cab operations.", 401);
}
export async function cabAdminRole(): Promise<CabRole> {
  const role = await currentAdminRole();
  if (!role) throw new CabError("Sign in with your admin account.", 401);
  return role;
}
export async function requireCabPermission(permission: "read" | "dispatch" | "finance" | "settings") {
  const role = await cabAdminRole();
  const allowed = permission === "read" || role === "OWNER" || (permission === "dispatch" && role === "DISPATCHER") || (permission === "finance" && role === "ACCOUNTANT");
  if (!allowed) throw new CabError("Your operations role does not permit this action.", 403);
  return role;
}
/** Existing staff session remains the authorization source; identity is for audited operations. */
export async function cabOperationsActor(permission:"read"|"dispatch"|"finance"|"settings") {
  const role=await requireCabPermission(permission);
  const token=(await cookies()).get("cab_ops_session")?.value||"";
  const [rows]=await getDatabasePool().execute<RowDataPacket[]>("SELECT user_id FROM cab_admin_sessions WHERE session_hash=? AND expires_at>UTC_TIMESTAMP(3)",[hash(token)]);
  if(!rows[0]?.user_id)throw new CabError("An individual administrator session is required.",401);
  return {userId:String(rows[0].user_id),role};
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = process.env.CAB_SITE_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== allowed)
    throw new CabError("Request origin was not accepted.", 403);
}
export async function readRawBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 1500000)
    throw new CabError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new CabError("Request body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 1500000) {
        await reader.cancel();
        throw new CabError("Request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw;
}
export async function readBody(request: Request) {
  const raw = await readRawBody(request);
  try {
    return JSON.parse(raw);
  } catch {
    throw new CabError("Invalid request body.");
  }
}
export async function limitRequest(
  request: Request,
  action: string,
  maximum: number,
  windowMs = 60000,
) {
  // Production reverse proxy must replace forwarded-for, not append untrusted client values.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const key = hash(action + ":" + ip);
  if (cabStorageMode() === "mysql") {
    const connection = await getDatabasePool().getConnection();
    try {
      await connection.beginTransaction();
      const now = new Date(), until = new Date(now.getTime() + windowMs);
      await connection.execute("INSERT INTO cab_rate_limits (bucket_key, request_count, expires_at) VALUES (?, 0, ?) ON DUPLICATE KEY UPDATE bucket_key=VALUES(bucket_key)", [key, until]);
      const [rows] = await connection.execute<RowDataPacket[]>("SELECT request_count, expires_at FROM cab_rate_limits WHERE bucket_key=? FOR UPDATE", [key]);
      const expired = new Date(rows[0].expires_at).getTime() <= now.getTime();
      if (!expired && Number(rows[0].request_count) >= maximum) throw new CabError("Too many requests. Please try again shortly.", 429);
      await connection.execute("UPDATE cab_rate_limits SET request_count=?, expires_at=? WHERE bucket_key=?", [expired ? 1 : Number(rows[0].request_count) + 1, expired ? until : rows[0].expires_at, key]);
      await connection.commit();
    } catch(e) { await connection.rollback(); throw e; } finally { connection.release(); }
    return;
  }
  await changeCabState((state) => {
    const now = Date.now();
    for (const [k, v] of Object.entries(state.limits))
      if (v.until < now) delete state.limits[k];
    const entry = state.limits[key];
    if (entry && entry.until > now && entry.count >= maximum)
      throw new CabError("Too many requests. Please try again shortly.", 429);
    state.limits[key] =
      entry && entry.until > now
        ? { ...entry, count: entry.count + 1 }
        : { count: 1, until: now + windowMs };
  });
}
export function cabErrorResponse(error: unknown) {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: { message: string }[] }).issues;
    return Response.json(
      {
        error: issues
          .slice(0, 3)
          .map((i) => i.message)
          .join(" "),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const known = error instanceof CabError;
  if (!known)
    console.error(JSON.stringify({
      event: "cab_api_failure",
      at: new Date().toISOString(),
      // Database messages can contain query parameters and customer information.
      code: error && typeof error === "object" && "code" in error
        && /^[A-Z0-9_]+$/.test(String(error.code)) ? String(error.code) : "UNEXPECTED",
    }));
  return Response.json(
    {
      error: known
        ? error.message
        : "Cab service is temporarily unavailable. Please retry or contact operations.",
    },
    {
      status: known ? error.status : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export function privateJson(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
