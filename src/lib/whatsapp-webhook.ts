import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

type ObjectValue = Record<string, unknown>;
const object = (v: unknown): ObjectValue => v !== null && typeof v === "object" && !Array.isArray(v) ? v as ObjectValue : {};
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const string = (v: unknown, max = 255): string => typeof v === "string" ? v.slice(0, max) : "";
export const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
export interface WhatsAppEvent {
  key: string; kind: "message" | "status"; phoneNumberId: string; messageId: string;
  sender: string; timestamp: string; details: ObjectValue;
}
export function validSignature(raw: Uint8Array, signature: string | null, secret: string): boolean {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac("sha256", secret).update(raw).digest(), Buffer.from(signature.slice(7), "hex"));
}
export function extractEvents(payload: unknown): WhatsAppEvent[] {
  const root = object(payload);
  if (root.object !== "whatsapp_business_account") return [];
  const events: WhatsAppEvent[] = [];
  for (const entry of list(root.entry)) for (const change of list(object(entry).changes)) {
    if (object(change).field !== "messages") continue;
    const value = object(object(change).value);
    const phoneNumberId = string(object(value.metadata).phone_number_id, 64);
    if (!/^\d+$/.test(phoneNumberId)) continue;
    for (const kind of ["message", "status"] as const) for (const item of list(value[kind === "message" ? "messages" : "statuses"])) {
      const row = object(item), messageId = string(row.id);
      const sender = string(kind === "message" ? row.from : row.recipient_id, 24);
      const timestamp = string(row.timestamp, 12);
      if (!messageId || !/^\d{1,20}$/.test(sender) || !/^\d{1,12}$/.test(timestamp)) continue;
      const type = string(kind === "message" ? row.type : row.status, 32);
      const details: ObjectValue = { type };
      if (kind === "status") {
        if (!["sent", "delivered", "read", "failed"].includes(type)) continue;
        details.errorCodes = list(row.errors).map(e => object(e).code).filter(e => typeof e === "number").slice(0, 10);
        details.conversationId = string(object(row.conversation).id);
      } else {
        if (type === "text") details.text = string(object(row.text).body, 16384);
        if (["image", "document", "audio", "video", "sticker"].includes(type)) {
          const media = object(row[type]);
          details.media = { id: string(media.id), mimeType: string(media.mime_type, 100), sha256: string(media.sha256, 100), caption: string(media.caption, 4096), filename: string(media.filename), voice: media.voice === true };
        }
        if (type === "interactive") {
          const interactive = object(row.interactive), reply = object(interactive.button_reply || interactive.list_reply);
          details.interactive = { type: string(interactive.type, 32), id: string(reply.id), title: string(reply.title), description: string(reply.description, 1024) };
        }
        if (type === "button") details.button = { text: string(object(row.button).text), payload: string(object(row.button).payload) };
        details.replyToMessageId = string(object(row.context).id);
      }
      events.push({ key: hash(kind === "message" ? [phoneNumberId, kind, messageId] : [phoneNumberId, kind, messageId, type, timestamp]), kind, phoneNumberId, messageId, sender, timestamp, details });
      if (events.length > 500) throw new Error("EVENT_LIMIT");
    }
  }
  return events;
}
