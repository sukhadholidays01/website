import "server-only";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { changeCabState, readCabState } from "./store";
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
  Boolean(
    process.env.CAB_ADMIN_PASSWORD &&
    process.env.CAB_ADMIN_PASSWORD.length >= 16 &&
    secret().length >= 32,
  );
export function issueAdminSession() {
  if (!adminConfigured())
    throw new CabError(
      "Set a cab admin password (16+ characters) and session secret (32+ characters) on the server.",
      503,
    );
  const value = `${Date.now() + 8 * 3600000}.${randomBytes(16).toString("hex")}`;
  return value + "." + sign(value);
}
export async function hasCabAdmin() {
  if (!adminConfigured()) return false;
  const token = (await cookies()).get("cab_ops_session")?.value || "";
  const [expiry, nonce, signature] = token.split(".");
  if (!(
    expiry &&
    nonce &&
    signature &&
    Number(expiry) > Date.now() &&
    equal(signature, sign(expiry + "." + nonce))
  ))
    return false;
  return ((await readCabState()).sessions?.[hash(token)] || 0) > Date.now();
}
export async function registerCabSession(token: string) {
  await changeCabState((state) => {
    state.sessions ||= {};
    for (const [key, expiry] of Object.entries(state.sessions))
      if (expiry < Date.now()) delete state.sessions[key];
    state.sessions[hash(token)] = Number(token.split(".")[0]);
  });
}
export async function revokeCabSession(token: string) {
  if (token)
    await changeCabState((state) => {
      if (state.sessions) delete state.sessions[hash(token)];
    });
}
export async function requireCabAdmin() {
  if (!(await hasCabAdmin()))
    throw new CabError("Sign in to cab operations.", 401);
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
