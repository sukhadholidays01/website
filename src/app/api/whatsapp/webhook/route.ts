import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { extractEvents, validSignature } from "@/lib/whatsapp-webhook";
import { acceptWhatsAppEvents } from "@/lib/whatsapp-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (text: string, status = 200) => new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  const token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!token) return reply("Service unavailable", 503);
  const params = new URL(request.url).searchParams;
  const supplied = params.get("hub.verify_token"), challenge = params.get("hub.challenge");
  if (!supplied || !challenge || !params.get("hub.mode")) return reply("Missing verification parameters", 400);
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (params.get("hub.mode") !== "subscribe" || !timingSafeEqual(digest(token), digest(supplied))) return reply("Forbidden", 403);
  return reply(challenge);
}
export async function POST(request: Request) {
  const requestId = randomUUID();
  const log = (outcome: string, counts = {}) => console.info(JSON.stringify({ event: "whatsapp_webhook", requestId, outcome, ...counts }));
  const secret = process.env.META_APP_SECRET;
  if (!secret) { log("configuration_unavailable"); return reply("Service unavailable", 503); }
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    const reader = request.body?.getReader();
    if (reader) while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) { await reader.cancel(); log("body_limit"); return reply("Payload too large", 413); }
      chunks.push(value);
    }
  } catch { log("body_invalid"); return reply("Invalid request", 400); }
  const raw = Buffer.concat(chunks);
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"), secret)) { log("signature_rejected"); return reply("Forbidden", 403); }
  let events;
  try {
    const payload: unknown = JSON.parse(raw.toString("utf8"));
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("INVALID_PAYLOAD");
    events = extractEvents(payload);
  } catch { log("payload_invalid"); return reply("Invalid payload", 400); }
  try {
    const counts = await acceptWhatsAppEvents(events);
    log("accepted", counts);
    return reply("EVENT_RECEIVED");
  } catch {
    log("storage_unavailable");
    return reply("Service unavailable", 503);
  }
}
