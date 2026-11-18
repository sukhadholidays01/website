import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { getDatabasePool } from "@/lib/db";
import { CabError, hash, staffRole } from "@/lib/cab/security";
import { hashPassword } from "./passwords.mjs";
import { sendSmtpEmail, verifySmtpConnection, safeSmtpFailure } from "@/lib/email/smtp";
import { adminAllowlist, isAllowedAdminEmail } from "./allowlist";
import { resetEmail } from "./reset-email";

export const resetAcknowledgement = "Your request has been received. If this is an authorised active admin account and email submission succeeds, a reset link will arrive at that address. Check your inbox and spam folder. Delivery is not confirmed.";
const emailSchema = z.string().trim().email().max(190).transform(v => v.toLowerCase());
const resetSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: z.string().min(16).max(1024), confirmation: z.string() }).refine(value => value.password === value.confirmation, "Passwords do not match.");
async function recordMailFailure(error: unknown) {
  const details = safeSmtpFailure(error);
  console.warn(JSON.stringify({ event: "admin_reset_email_failed", ...details }));
  await getDatabasePool().execute("INSERT INTO cab_audit_log (event_id,actor_role,action,entity_id,created_at) VALUES (?,'SYSTEM',?,'email-service',UTC_TIMESTAMP(3))",[randomUUID(),`SMTP_${details.stage.toUpperCase()}_FAILED`]);
}
function resetOrigin() {
  let origin: URL;
  try { origin = new URL(process.env.CAB_SITE_ORIGIN || process.env.APP_URL || ""); }
  catch { throw new CabError("Password recovery is not configured. Contact your administrator.", 503); }
  const local = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (origin.username || origin.password || origin.search || origin.hash || (origin.protocol !== "https:" && !(local && origin.protocol === "http:")))
    throw new CabError("Password recovery requires a secure configured site URL.", 503);
  return origin.origin;
}
export async function inspectAdminResetToken(body: unknown) {
  const input = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(body);
  if (!input.success) return { valid: false, reason: "invalid" };
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>("SELECT u.email,u.role,u.is_active,r.expires_at > UTC_TIMESTAMP(3) AS unexpired FROM admin_password_resets r JOIN users u ON u.user_id=r.user_id WHERE r.token_hash=?",[hash(input.data.token)]);
  const row=rows[0];
  if (!row?.is_active || !staffRole(row.role) || !isAllowedAdminEmail(row.email)) return { valid: false, reason: "invalid" };
  return row.unexpired ? { valid: true } : { valid: false, reason: "expired" };
}

export async function requestAdminPasswordReset(body: unknown) {
  const input = z.object({ email: emailSchema }).safeParse(body);
  if (!input.success) throw new CabError("Enter a valid email address.");
  try { adminAllowlist(); } catch { throw new CabError("Password recovery is temporarily unavailable. Contact support.", 503); }
  const recipient = input.data.email, origin = resetOrigin();
  // Validate SMTP for every valid input, so configuration errors do not disclose accounts.
  try { await verifySmtpConnection(); }
  catch (error) { await recordMailFailure(error); throw new CabError("Email service is temporarily unavailable. Please try again later or contact support.", 503); }
  if (!isAllowedAdminEmail(recipient)) return;
  const db = await getDatabasePool().getConnection();
  const token = randomBytes(32).toString("hex"), tokenHash = hash(token);
  let issued = false;
  try {
    await db.beginTransaction();
    const [users] = await db.execute<RowDataPacket[]>("SELECT user_id, role, is_active FROM users WHERE email = ? FOR UPDATE", [recipient]);
    const user = users[0];
    if (!user?.is_active || !staffRole(user.role)) { await db.rollback(); return; }
    const [recent] = await db.execute<RowDataPacket[]>("SELECT token_hash FROM admin_password_resets WHERE user_id = ? AND created_at > DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 MINUTE)", [user.user_id]);
    if (recent.length) { await db.rollback(); return; }
    await db.execute("DELETE FROM admin_password_resets WHERE user_id = ?", [user.user_id]);
    await db.execute("INSERT INTO admin_password_resets (token_hash, user_id, expires_at, created_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 30 MINUTE), UTC_TIMESTAMP(3))", [tokenHash, user.user_id]);
    await db.commit(); issued = true;
  } catch (error) { await db.rollback(); throw error; }
  finally { db.release(); }
  if (issued) {
    // A fragment keeps the token out of HTTP URLs, server access logs and referrers.
    const link = `${origin}/admin/reset-password#token=${token}`;
    try {
      await sendSmtpEmail({ to: recipient, ...resetEmail(link) });
    } catch (error) {
      await getDatabasePool().execute("DELETE FROM admin_password_resets WHERE token_hash = ?", [tokenHash]);
      await recordMailFailure(error);
      // Recipient-specific failures remain private to prevent account enumeration.
      // The public acknowledgement never claims that an email was sent.
    }
  }
}

export async function confirmAdminPasswordReset(body: unknown) {
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) throw new CabError("Use a valid reset link and a password between 16 and 1024 characters.");
  try { adminAllowlist(); } catch { throw new CabError("Password recovery is temporarily unavailable. Contact support.", 503); }
  const tokenHash = hash(parsed.data.token);
  const passwordHash = await hashPassword(parsed.data.password);
  const db = await getDatabasePool().getConnection();
  const invalid = () => new CabError("This reset link is invalid or expired. Request a new link.");
  try {
    await db.beginTransaction();
    const [tokens] = await db.execute<RowDataPacket[]>("SELECT user_id FROM admin_password_resets WHERE token_hash = ?", [tokenHash]);
    if (!tokens[0]) throw invalid();
    // Request and confirmation lock the user first to serialize reset requests.
    const [users] = await db.execute<RowDataPacket[]>("SELECT user_id, email, role, is_active FROM users WHERE user_id = ? FOR UPDATE", [tokens[0].user_id]);
    const user = users[0];
    if (!user?.is_active || !staffRole(user.role) || !isAllowedAdminEmail(user.email)) throw invalid();
    const [valid] = await db.execute<RowDataPacket[]>("SELECT token_hash FROM admin_password_resets WHERE token_hash = ? AND user_id = ? AND expires_at > UTC_TIMESTAMP(3) FOR UPDATE", [tokenHash, user.user_id]);
    if (!valid.length) throw invalid();
    await db.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", [passwordHash, user.user_id]);
    await db.execute("DELETE FROM cab_admin_sessions WHERE user_id = ?", [user.user_id]);
    await db.execute("DELETE FROM admin_password_resets WHERE user_id = ?", [user.user_id]);
    await db.execute("INSERT INTO cab_audit_log (event_id, actor_role, action, entity_id, created_at) VALUES (?, ?, 'ADMIN_PASSWORD_RESET', ?, UTC_TIMESTAMP(3))", [randomUUID(), staffRole(user.role), user.user_id]);
    await db.commit();
  } catch (error) { await db.rollback(); throw error; }
  finally { db.release(); }
}
