import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { sendSmtpEmail } from "@/lib/email/smtp";
import type { CabBooking, CabState } from "./types";
import type { EmailKind } from "./models";
import { renderCabEmail } from "./email-templates";
import { cabStorageMode, changeCabState, readCabState } from "./store";
const bookingStorageIsDevelopment = () => cabStorageMode() !== "mysql";
/** Reuse the existing notification centre for persisted platform events, without sending extra emails. */
export function queuePlatformNotification(state: CabState, input: { kind: "flight-enquiry" | "holiday-enquiry" | "custom-trip-enquiry" | "email-failure" | "system-event"; reference: string; subject: string; description: string }) {
  const dedupeKey=`platform:${input.kind}:${input.reference}`;
  if(state.operations.notifications.some(n=>n.dedupeKey===dedupeKey))return;
  const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
  state.operations.notifications.unshift({id:randomUUID(),bookingId:"",kind:input.kind,audience:"admin",status:"preview",attempts:0,createdAt:new Date().toISOString(),dedupeKey,subject:input.subject,text:input.description,html:`<p>${escape(input.description)}</p>`,recipient:process.env.INFO_EMAIL||""});
}

export function queueCabEmail(
  state: CabState,
  booking: CabBooking,
  kind: EmailKind,
  eventKey?: string,
) {
  const audience = (kind.startsWith("admin-")||["assignment-conflict","id-review"].includes(kind)) ? "admin" : kind === "driver-assignment" ? "driver" : "customer";
  const driverEmail = state.operations.drivers.find(d => d.id === booking.assignment?.driverId)?.email;
  if (audience === "driver" && !driverEmail) return;
  const rawDedupeKey = [
    booking.id,
    kind,
    booking.updatedAt,
    booking.fare.version,
    ...(eventKey?[eventKey]:[]),
    ...(kind === "access-link" ? [randomUUID()] : []),
  ].join(":");
  // Configured fare versions can contain an entire policy; keep the existing index bounded.
  const dedupeKey = rawDedupeKey.length > 255 ? "sha256:" + createHash("sha256").update(rawDedupeKey).digest("hex") : rawDedupeKey;
  if (state.operations.notifications.some((n) => n.dedupeKey === dedupeKey))
    return;
  const template = renderCabEmail(kind, booking);
  state.operations.notifications.unshift({
    id: randomUUID(),
    bookingId: booking.id,
    kind,
    audience,
    status: "queued",
    attempts: 0,
    createdAt: new Date().toISOString(),
    dedupeKey,
    ...template,
    recipient:
      audience === "driver" ? driverEmail! : audience === "customer"
        ? booking.customer.email
        : process.env.BOOKING_EMAIL || "booking@sukhadhholidays.in",
  });
}
export function emailConfiguration() {
  return {
    mode: process.env.CAB_EMAIL_MODE === "smtp" ? "smtp" : "preview",
    smtpConfigured: Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
    ),
    mockSendingExplicitlyEnabled:
      process.env.CAB_ALLOW_MOCK_EMAIL_SEND === "true",
    senderPolicy:
      "Authenticated main mailbox only. Hostinger aliases are notification destinations / reply-to, not independent SMTP accounts.",
  };
}
/** Email failures never roll back bookings/payments. No automatic retry after an ambiguous SMTP result. */
export async function processCabEmails(bookingId?:string) {
  if(cabStorageMode()==='mysql')return (await import('./outbox')).processTargetedOutbox(bookingId);
  const pending = (await readCabState()).operations.notifications
    .filter((n) => n.status === "queued" && (!bookingId || n.bookingId===bookingId))
    .slice(0, 20);
  for (const item of pending) {
    const claimed = await changeCabState((state) => {
      const n = state.operations.notifications.find((n) => n.id === item.id);
      if (!n || n.status !== "queued") return false;
      const prefs = state.operations.settings.notifications;
      const live =
        process.env.CAB_EMAIL_MODE === "smtp" &&
        (process.env.CAB_EMAIL_SEND_ENABLED === "true" ||
          (bookingStorageIsDevelopment() && process.env.CAB_ALLOW_MOCK_EMAIL_SEND === "true")) &&
        (n.audience === "admin" ? prefs.admin : n.audience === "driver" ? prefs.driver === true : prefs.customer);
      n.status = live ? "sending" : "preview";
      if (live) n.attempts++;
      return live;
    });
    if (!claimed) continue;
    try {
      let message = {subject:item.subject,text:item.text,html:item.html};
      if (item.kind === "access-link" || item.kind === "initial-access-link") {
        const origin = new URL(process.env.CAB_SITE_ORIGIN || process.env.APP_URL || "");
        if (origin.username || origin.password || (origin.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && ["localhost","127.0.0.1"].includes(origin.hostname)))) throw Error("Trusted link origin required.");
        const {replacePrivateLink}=await import("./guest-access");
        const token=await replacePrivateLink(item.bookingId,item.kind === "access-link");
        const link=origin.origin+"/cabs/booking/"+encodeURIComponent(item.bookingId)+"#access="+token;
        // Materialise in memory only: the persisted outbox never contains the link token.
        message={subject:"Your private Sukhadh Holidays tracking link",text:"Use this private tracking link within 30 days: "+link+"\nMobile verification is required for sensitive actions. "+(item.kind === "access-link"?"Previous links have been revoked. ":"")+"Never forward this message.",html:""};
      }
      await sendSmtpEmail({
        to: item.recipient,
        replyTo: process.env.INFO_EMAIL || "info@sukhadhholidays.in",
        ...message,
        messageId: `<${item.id}@sukhadhholidays.in>`,
      });
      await changeCabState((state) => {
        const n = state.operations.notifications.find((n) => n.id === item.id)!;
        n.status = "sent";
      });
    } catch {
      await changeCabState((state) => {
        const n = state.operations.notifications.find((n) => n.id === item.id)!;
        n.status = "failed";
        n.error =
          "SMTP delivery was not confirmed. Check provider logs before manually retrying.";
        queuePlatformNotification(state,{kind:"email-failure",reference:item.id,subject:"Booking email submission failed",description:"An email submission was not confirmed. Review the delivery log and safe SMTP diagnostics before retrying."});
      });
      console.warn("Cab email delivery not confirmed", {
        notificationId: item.id,
        kind: item.kind,
      });
    }
  }
}

/** Raw private link exists only in this returned in-memory SMTP message. */
export async function materializeCabMessage(item:Pick<import('./models').NotificationLog,'kind'|'bookingId'|'subject'|'text'|'html'>){
  if(item.kind!=='access-link'&&item.kind!=='initial-access-link')return {subject:item.subject,text:item.text,html:item.html};
  const origin=new URL(process.env.CAB_SITE_ORIGIN||process.env.APP_URL||'');
  if(origin.username||origin.password||(origin.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1'].includes(origin.hostname))))throw new Error('Trusted origin required');
  const {replacePrivateLink}=await import('./guest-access');const token=await replacePrivateLink(item.bookingId,item.kind==='access-link');
  const link=origin.origin+'/cabs/booking/'+encodeURIComponent(item.bookingId)+'#access='+token;
  return {subject:'Your private Sukhadh Holidays tracking link',text:'Use this private tracking link within 30 days: '+link+'\nMobile verification is required for sensitive actions. Never forward this message.',html:''};
}

/** Called by an authorized operational action/worker; queue acceptance is not delivery. */
export function queueOperationalReminders(state:CabState,hours:number){
  const now=Date.now(),end=now+hours*3600000;let considered=0;for(const b of state.bookings){const q=b.commercial?.quotations.at(-1);if(b.status==="QUOTED"&&q&&Date.parse(q.expiresAt)>now&&Date.parse(q.expiresAt)<=end){queueCabEmail(state,b,"quote-expiring");considered++;}
  const start=new Date(b.journey.departure+":00+05:30").getTime();if(start>=now&&start<=end&&["REQUESTED","QUOTED","ACCEPTED","CONFIRMED"].includes(b.status)){queueCabEmail(state,b,"admin-upcoming");considered++;}}return considered;
}
