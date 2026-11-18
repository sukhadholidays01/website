import "server-only";
import { changeCabState } from "./store";
import { getBooking } from "./service";
import { queueCabEmail } from "./notifications";
async function documentEvent(id:string,event:string,customer=false){try{await changeCabState(state=>{const b=getBooking(state,id);queueCabEmail(state,b,"admin-id-review",event);if(customer)queueCabEmail(state,b,"id-status",event);});}catch{console.warn("cab_id_notification_queue_unconfirmed");}}
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getDatabasePool } from "@/lib/db";
import { CabError } from "./security";
import { guestTransaction, guestAudit, persistConsents, digest, type GuestRow } from "./guest-repository";
import { documentBytes, privateDocumentStorage } from "./private-storage";
import { bookingPolicies, validatePolicyAcceptance } from "./guest-policies";
import { readGuestPolicy, detectNight, guestPolicySchema } from "./guest-policy";
import { ensureGuestState } from "./guest-access";
export async function bookingFoundation(bookingId: string) {
  const db = getDatabasePool();
  const [state] = await db.execute<GuestRow[]>("SELECT document_policy,admin_id_required FROM cab_guest_state WHERE booking_id=?", [bookingId]);
  const [docs] = await db.execute<GuestRow[]>("SELECT document_id,document_type,mime_type,byte_size,review_status,rejection_reason,created_at,reviewed_at,delete_after FROM cab_private_documents WHERE booking_id=? AND deleted_at IS NULL ORDER BY created_at DESC", [bookingId]);
  const [consents] = await db.execute<GuestRow[]>("SELECT a.category,a.policy_id,a.policy_version,a.accepted_at,p.policy_text FROM cab_booking_consents a JOIN cab_policy_versions p ON p.policy_id=a.policy_id AND p.policy_version=a.policy_version WHERE a.booking_id=? ORDER BY a.accepted_at", [bookingId]);
  const raw = state[0]?.document_policy;
  const policy = raw ? typeof raw === "string" ? JSON.parse(raw) : raw : {};
  return { policy, idRequired: Boolean(policy.idRequired || state[0]?.admin_id_required), documents: docs, consents, storageConfigured: Boolean(process.env.CAB_PRIVATE_DOCUMENT_DIR) };
}
export async function acceptBookingPolicies(bookingId: string, input: unknown) {
  let policies;
  try { policies = validatePolicyAcceptance(input,["booking_terms","privacy_notice"]); } catch { throw new CabError("Review and accept the current booking terms and privacy notice separately."); }
  await guestTransaction(async db => {
    const [rows] = await db.execute<GuestRow[]>("SELECT customer_id FROM bookings WHERE booking_id=? FOR UPDATE", [bookingId]);
    if (!rows[0]) throw new CabError("Booking unavailable.",404);
    await persistConsents(db,bookingId,String(rows[0].customer_id),policies);
    await guestAudit(db,bookingId,"RECORDED_BOOKING_CONSENT");
  });
}
export async function uploadBookingDocument(request: Request, bookingId: string) {
  const type = z.enum(["passport","driving-licence","government-id"]).parse(request.headers.get("x-document-type"));
  const policy = bookingPolicies.find(p=>p.category==="id_processing")!;
  if (request.headers.get("x-document-consent") !== policy.version) throw new CabError("Review and accept ID processing consent before upload.");
  const foundation = await bookingFoundation(bookingId);
  if (!foundation.idRequired) throw new CabError("ID has not been requested for this booking. Do not upload unnecessary documents.",409);
  const settings = guestPolicySchema.parse(Object.fromEntries(Object.entries(foundation.policy).filter(([key])=>!["idRequired","nightDetected"].includes(key))));
  if (!settings.documentTypes.includes(type)) throw new CabError("Select a document type accepted for this booking.");
  const {bytes,mime} = await documentBytes(request), key = await privateDocumentStorage.put(bytes);
  try {
    const result=await guestTransaction(async db => {
      const [bookings] = await db.execute<GuestRow[]>("SELECT customer_id,COALESCE(return_at,departure_at) AS last_trip_at FROM bookings WHERE booking_id=? FOR UPDATE",[bookingId]);
      const [count] = await db.execute<GuestRow[]>("SELECT COUNT(*) AS total FROM cab_private_documents WHERE booking_id=? AND deleted_at IS NULL",[bookingId]);
      if (!bookings[0] || Number(count[0].total) >= 5) throw new CabError("Document upload limit reached. Contact support.",409);
      await persistConsents(db,bookingId,String(bookings[0].customer_id),[{...policy,source:"cab-private-document-upload"}]);
      await db.execute("UPDATE cab_private_documents SET review_status='superseded' WHERE booking_id=? AND review_status IN ('pending','rejected')",[bookingId]);
      const id = randomUUID(), end = new Date(bookings[0].last_trip_at as string | Date).getTime();
      const deadline = new Date(Math.max(Date.now(),end) + settings.retentionDays*86400000);
      await db.execute("INSERT INTO cab_private_documents (document_id,booking_id,storage_key,document_type,mime_type,byte_size,content_hash,review_status,delete_after,created_at) VALUES (?,?,?,?,?,?,?,'pending',?,UTC_TIMESTAMP(3))",[id,bookingId,key,type,mime,bytes.length,digest(bytes),deadline]);
      await guestAudit(db,bookingId,"UPLOADED_PRIVATE_ID");
      return { documentId:id,status:"pending" };
    });
    await documentEvent(bookingId,result.documentId);return result;
  } catch(error) { await privateDocumentStorage.remove(key); throw error; }
}
export async function reviewDocument(bookingId: string, documentId: string, body: unknown, actor: string, actorUserId?:string) {
  const input = z.object({status:z.enum(["approved","rejected"]),reason:z.string().trim().max(500).default("")}).refine(v=>v.status!=="rejected"||v.reason.length>=5).parse(body);
  await guestTransaction(async db => {
    const [rows]=await db.execute<GuestRow[]>("SELECT review_status FROM cab_private_documents WHERE document_id=? AND booking_id=? AND deleted_at IS NULL AND delete_after>UTC_TIMESTAMP(3) FOR UPDATE",[documentId,bookingId]);
    if (!rows[0] || !["pending","rejected"].includes(String(rows[0].review_status))) throw new CabError("Document is not awaiting review.",409);
    await db.execute("UPDATE cab_private_documents SET review_status=?,rejection_reason=?,reviewed_at=UTC_TIMESTAMP(3) WHERE document_id=?",[input.status,input.status==="rejected"?input.reason:"",documentId]);
    await guestAudit(db,bookingId,"ID_REVIEW_"+input.status.toUpperCase()+(actorUserId?" by "+actorUserId:""),actor);
  });
  await documentEvent(bookingId,documentId+":"+input.status,true);
}
export async function requireBookingId(bookingId: string, actor: string) {
  await ensureGuestState(bookingId);
  const policy = await readGuestPolicy();
  await guestTransaction(async db => {
    const [rows]=await db.execute<GuestRow[]>("SELECT journey_snapshot FROM bookings WHERE booking_id=? FOR UPDATE",[bookingId]);
    if(!rows[0])throw new CabError("Booking unavailable.",404);
    const j=typeof rows[0].journey_snapshot==="string"?JSON.parse(rows[0].journey_snapshot):rows[0].journey_snapshot as {departure:string};
    await db.execute("UPDATE cab_guest_state SET admin_id_required=TRUE,document_policy=? WHERE booking_id=?",[JSON.stringify(detectNight(j.departure,policy)),bookingId]);
    await guestAudit(db,bookingId,"ADMIN_REQUESTED_ID",actor);
  });
}
export async function checkConfirmationRequirements(bookingId: string) {
  await requireBookingConsent(bookingId);
  const foundation = await bookingFoundation(bookingId);
  if (foundation.idRequired && foundation.policy.enforcement!=="advisory" && !foundation.documents.some(d=>d.review_status==="approved" && new Date(d.delete_after as string|Date).getTime()>Date.now())) throw new CabError("Required ID must be approved before confirmation.",409);
}
export async function requireBookingConsent(bookingId:string) {
  const [rows]=await getDatabasePool().execute<GuestRow[]>("SELECT DISTINCT category FROM cab_booking_consents WHERE booking_id=? AND category IN ('booking_terms','privacy_notice')",[bookingId]);
  if(!["booking_terms","privacy_notice"].every(category=>rows.some(row=>row.category===category)))throw new CabError("The customer must separately acknowledge booking terms and the privacy notice through verified booking access.",409);
}
const ticketMac = (value:string) => createHmac("sha256",process.env.CAB_SESSION_SECRET!).update(value).digest("hex");
export function downloadTicket(bookingId:string,documentId:string,binding:string) {
  const expiry=String(Date.now()+60000),value=[bookingId,documentId,binding,expiry].join(":");
  return expiry+"."+ticketMac(value);
}
export async function downloadDocument(bookingId:string,documentId:string,ticket:string,binding:string,actor:string) {
  const [expiry,mac]=ticket.split("."),expected=ticketMac([bookingId,documentId,binding,expiry].join(":"));
  if(!/^\d+$/.test(expiry||"")||Number(expiry)<Date.now()||Number(expiry)>Date.now()+60000||!mac||mac.length!==expected.length||!timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))throw new CabError("Download permission expired. Request it again.",401);
  const [rows]=await getDatabasePool().execute<GuestRow[]>("SELECT storage_key,mime_type FROM cab_private_documents WHERE booking_id=? AND document_id=? AND deleted_at IS NULL AND delete_after>UTC_TIMESTAMP(3)",[bookingId,documentId]);
  if(!rows[0])throw new CabError("Document unavailable.",404);
  const bytes=await privateDocumentStorage.get(String(rows[0].storage_key));
  await guestTransaction(db=>guestAudit(db,bookingId,"DOWNLOADED_PRIVATE_ID",actor));
  return new Response(new Uint8Array(bytes),{headers:{"Content-Type":String(rows[0].mime_type),"Content-Disposition":"attachment; filename=identity-document","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox"}});
}
export async function purgeExpiredDocuments(actor:string, onlyDocumentIds?:string[], expectedBookingId?:string) {
  if(onlyDocumentIds && !onlyDocumentIds.length)return {deleted:0};
  if(onlyDocumentIds&&onlyDocumentIds.length>50)throw new CabError('Retention batch is limited to 50 records.');
  const scope=onlyDocumentIds?" AND document_id IN ("+onlyDocumentIds.map(()=>"?").join(",")+")":"";
  const [rows]=await getDatabasePool().execute<GuestRow[]>("SELECT document_id,booking_id,storage_key FROM cab_private_documents WHERE delete_after<=UTC_TIMESTAMP(3) AND deleted_at IS NULL"+scope+" LIMIT 50",onlyDocumentIds||[]);
  let deleted=0;
  for(const row of rows){await guestTransaction(async db=>{
    const [current]=await db.execute<GuestRow[]>('SELECT document_id,booking_id,storage_key FROM cab_private_documents WHERE document_id=? AND booking_id=? AND delete_after<=UTC_TIMESTAMP(3) AND deleted_at IS NULL FOR UPDATE',[row.document_id,expectedBookingId||row.booking_id]);
    if(!current[0]||current[0].storage_key!==row.storage_key)return;
    // Preserve metadata on filesystem failure. If commit fails after unlink, retry safely handles ENOENT.
    await privateDocumentStorage.remove(String(current[0].storage_key));
    await db.execute("UPDATE cab_private_documents SET review_status='deleted',deleted_at=UTC_TIMESTAMP(3) WHERE document_id=? AND booking_id=?",[row.document_id,current[0].booking_id]);
    await guestAudit(db,String(current[0].booking_id),'DELETED_EXPIRED_ID',actor);deleted++;
  });}
  return {deleted};
}
