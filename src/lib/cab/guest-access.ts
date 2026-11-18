import "server-only";
import { randomBytes, randomInt, randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { getDatabasePool } from "@/lib/db";
import { CabError, limitRequest } from "./security";
import { guestTransaction, digest, guestAudit, type GuestRow } from "./guest-repository";
import { normalisePhone } from "./guest-policies";
import { otpProvider } from "./otp-provider";
export const guestCookie = "cab_guest_session";
const opaque = () => randomBytes(32).toString("hex");
const goodToken = (token: string) => /^[a-f0-9]{64}$/.test(token);
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const otpDigest = (id: string, code: string) => {
  if ((process.env.CAB_SESSION_SECRET || "").length < 32) throw new CabError("Guest verification is temporarily unavailable.", 503);
  return createHmac("sha256", process.env.CAB_SESSION_SECRET!).update(id + ":" + code).digest("hex");
};
export async function ensureGuestState(bookingId: string) {
  await getDatabasePool().execute("INSERT IGNORE INTO cab_guest_state (booking_id,original_link_expires_at,document_policy,created_at) SELECT booking_id,DATE_ADD(created_at,INTERVAL 30 DAY),JSON_OBJECT(),UTC_TIMESTAMP(3) FROM bookings WHERE booking_id=?", [bookingId]);
}
async function createSession(db: import("mysql2/promise").PoolConnection, bookingId: string, assurance: "link" | "otp") {
  const token = opaque();
  await db.execute("INSERT INTO cab_guest_grants (token_hash,booking_id,grant_kind,assurance,expires_at,created_at) VALUES (?,?,'session',?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 2 HOUR),UTC_TIMESTAMP(3))", [digest(token), bookingId, assurance]);
  await guestAudit(db, bookingId, "GUEST_SESSION_" + assurance.toUpperCase());
  return token;
}
export async function setGuestCookie(token: string) { (await cookies()).set(guestCookie, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 7200 }); }
export async function guestSession(bookingId: string, sensitive = false) {
  const token = (await cookies()).get(guestCookie)?.value || "";
  if (!goodToken(token)) throw new CabError("Verify access to this booking.", 401);
  const [rows] = await getDatabasePool().execute<GuestRow[]>("SELECT assurance FROM cab_guest_grants WHERE token_hash=? AND booking_id=? AND grant_kind='session' AND revoked=FALSE AND expires_at>UTC_TIMESTAMP(3)", [digest(token), bookingId]);
  if (!rows[0] || (sensitive && rows[0].assurance !== "otp")) throw new CabError(sensitive ? "Mobile verification is required for this action." : "Booking access has expired. Verify again.", 401);
  return rows[0].assurance as "link" | "otp";
}
export async function exchangePrivateLink(bookingId: string, token: string) {
  if (!goodToken(token)) throw new CabError("This booking link is invalid or expired.", 401);
  await ensureGuestState(bookingId);
  return guestTransaction(async db => {
    const [states] = await db.execute<GuestRow[]>("SELECT b.access_token_hash,s.original_link_revoked,s.original_link_expires_at>UTC_TIMESTAMP(3) AS unexpired FROM bookings b JOIN cab_guest_state s ON s.booking_id=b.booking_id WHERE b.booking_id=? FOR UPDATE", [bookingId]);
    const [links] = await db.execute<GuestRow[]>("SELECT token_hash FROM cab_guest_grants WHERE token_hash=? AND booking_id=? AND grant_kind='link' AND revoked=FALSE AND expires_at>UTC_TIMESTAMP(3)", [digest(token), bookingId]);
    const state = states[0];
    if (!links.length && !(state && !state.original_link_revoked && state.unexpired && same(String(state.access_token_hash), digest(token)))) throw new CabError("This booking link is invalid or expired.", 401);
    return createSession(db, bookingId, "link");
  });
}
export async function replacePrivateLink(bookingId: string, revokeExisting = true) {
  await ensureGuestState(bookingId);
  return guestTransaction(async db => {
    const [rows] = await db.execute<GuestRow[]>("SELECT booking_id FROM cab_guest_state WHERE booking_id=? FOR UPDATE", [bookingId]);
    if (!rows.length) throw new CabError("Booking unavailable.", 404);
    if (revokeExisting) {
      await db.execute("UPDATE cab_guest_state SET original_link_revoked=TRUE WHERE booking_id=?", [bookingId]);
      await db.execute("UPDATE cab_guest_grants SET revoked=TRUE WHERE booking_id=?", [bookingId]);
      await db.execute("UPDATE cab_guest_otps SET consumed=TRUE WHERE booking_id=?", [bookingId]);
    }
    const token = opaque();
    await db.execute("INSERT INTO cab_guest_grants (token_hash,booking_id,grant_kind,assurance,expires_at,created_at) VALUES (?,?,'link','link',DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 30 DAY),UTC_TIMESTAMP(3))", [digest(token), bookingId]);
    await guestAudit(db, bookingId, "REPLACED_PRIVATE_LINK");
    return token;
  });
}
export async function revokeGuestAccess(bookingId: string, actor: string) {
  await ensureGuestState(bookingId);
  await guestTransaction(async db => {
    await db.execute("SELECT booking_id FROM cab_guest_state WHERE booking_id=? FOR UPDATE", [bookingId]);
    await db.execute("UPDATE cab_guest_state SET original_link_revoked=TRUE WHERE booking_id=?", [bookingId]);
    await db.execute("UPDATE cab_guest_grants SET revoked=TRUE WHERE booking_id=?", [bookingId]);
    await db.execute("UPDATE cab_guest_otps SET consumed=TRUE WHERE booking_id=?", [bookingId]);
    await guestAudit(db, bookingId, "REVOKED_GUEST_ACCESS", actor);
  });
}
const otpInput = z.object({ reference: z.string().trim().min(1).max(80), phone: z.string().trim().regex(/^\+?[0-9 ()-]{10,22}$/).transform(normalisePhone).refine(v => /^\+[1-9]\d{9,14}$/.test(v)) });
export async function requestGuestOtp(request: Request, body: unknown) {
  const input = otpInput.parse(body), provider = otpProvider();
  await limitRequest(request, "guest-otp-ip", 5, 15 * 60000);
  await limitRequest(new Request(request.url), "guest-otp-phone:" + digest(input.phone), 4, 15 * 60000);
  if (!provider.available) throw new CabError("Mobile verification delivery is not configured. Use your private tracking link or contact support.", 503);
  const id = randomUUID(), code = String(randomInt(0, 1000000)).padStart(6, "0");
  const issued = await guestTransaction(async db => {
    const [rows] = await db.execute<GuestRow[]>("SELECT b.booking_id,c.phone FROM bookings b JOIN customers c ON c.customer_id=b.customer_id WHERE b.booking_reference=? FOR UPDATE", [input.reference]);
    const b = rows[0];
    if (!b || normalisePhone(String(b.phone)) !== input.phone) return false;
    const [recent] = await db.execute<GuestRow[]>("SELECT challenge_id FROM cab_guest_otps WHERE booking_id=? AND created_at>DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 60 SECOND)", [b.booking_id]);
    if (recent.length) return false;
    await db.execute("UPDATE cab_guest_otps SET consumed=TRUE WHERE booking_id=?", [b.booking_id]);
    await db.execute("INSERT INTO cab_guest_otps (challenge_id,booking_id,phone_hash,code_hash,expires_at,created_at) VALUES (?,?,?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 5 MINUTE),UTC_TIMESTAMP(3))", [id, b.booking_id, digest(input.phone), otpDigest(id, code)]);
    await guestAudit(db, String(b.booking_id), "REQUESTED_GUEST_OTP"); return true;
  });
  if (issued) {
    let accepted = false;
    try { accepted = (await provider.send(input.phone, code)).accepted; } catch { /* Provider errors are not logged with payloads. */ }
    if (!accepted) await guestTransaction(async db=>{
      await db.execute("UPDATE cab_guest_otps SET consumed=TRUE WHERE challenge_id=?", [id]);
      const [rows]=await db.execute<GuestRow[]>("SELECT booking_id FROM cab_guest_otps WHERE challenge_id=?",[id]);
      if(rows[0])await guestAudit(db,String(rows[0].booking_id),"OTP_SUBMISSION_UNCONFIRMED");
    });
  }
  return { challengeId: id, message: "If the booking and registered mobile match and the provider accepts the request, a code will arrive. Submission does not confirm delivery." };
}
export async function verifyGuestOtp(body: unknown) {
  const input = z.object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }).parse(body);
  const result = await guestTransaction(async db => {
    const [rows] = await db.execute<GuestRow[]>("SELECT booking_id,code_hash,attempts,consumed,expires_at>UTC_TIMESTAMP(3) AS unexpired FROM cab_guest_otps WHERE challenge_id=? FOR UPDATE", [input.challengeId]);
    const row = rows[0], match = same(otpDigest(input.challengeId, input.code), String(row?.code_hash || "0".repeat(64)));
    if (!row || row.consumed || !row.unexpired || Number(row.attempts) >= 5) return null;
    await db.execute("UPDATE cab_guest_otps SET attempts=attempts+1,consumed=? WHERE challenge_id=?", [match || Number(row.attempts) >= 4, input.challengeId]);
    if (!match) return null;
    return { bookingId: String(row.booking_id), token: await createSession(db, String(row.booking_id), "otp") };
  });
  if (!result) throw new CabError("The code is invalid or expired. Request another code.", 401);
  return result;
}
