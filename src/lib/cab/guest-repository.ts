import "server-only";
import { randomUUID, createHash } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDatabasePool } from "@/lib/db";
import type { PolicyAcceptance } from "./guest-policies";
export type GuestRow = RowDataPacket & Record<string, unknown>;
export const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export async function guestTransaction<T>(operation: (db: PoolConnection) => Promise<T>) {
  const db = await getDatabasePool().getConnection();
  try { await db.beginTransaction(); const result = await operation(db); await db.commit(); return result; }
  catch (error) { await db.rollback(); throw error; } finally { db.release(); }
}
export async function guestAudit(db: PoolConnection, bookingId: string, action: string, actor = "CUSTOMER") {
  await db.execute("INSERT INTO cab_audit_log (event_id,actor_role,action,entity_id,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(3))", [randomUUID(), actor, action, bookingId]);
}
export async function persistConsents(db: PoolConnection, bookingId: string, customerId: string, policies: PolicyAcceptance[]) {
  for (const p of policies) {
    const contentHash = digest(p.text);
    await db.execute("INSERT IGNORE INTO cab_policy_versions (policy_id,policy_version,category,policy_text,content_hash,created_at) VALUES (?,?,?,?,?,UTC_TIMESTAMP(3))", [p.id, p.version, p.category, p.text, contentHash]);
    const [stored] = await db.execute<GuestRow[]>("SELECT content_hash,category FROM cab_policy_versions WHERE policy_id=? AND policy_version=?", [p.id, p.version]);
    if (stored[0]?.content_hash !== contentHash || stored[0]?.category !== p.category) throw Error("Immutable policy version conflict.");
    await db.execute("INSERT IGNORE INTO cab_booking_consents (acceptance_id,booking_id,customer_id,policy_id,policy_version,category,content_hash,source_context,accepted_at) VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(3))", [randomUUID(), bookingId, customerId, p.id, p.version, p.category, contentHash, p.source]);
  }
}
