import "server-only";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getDatabasePool } from "@/lib/db";
import { hash, type WhatsAppEvent } from "@/lib/whatsapp-webhook";

/** Atomic acceptance: duplicates, customer/enquiry links and notifications commit together. */
export async function acceptWhatsAppEvents(events: WhatsAppEvent[]) {
  if (!events.length) return { accepted: 0, duplicates: 0 };
  const connection = await getDatabasePool().getConnection();
  let accepted = 0, duplicates = 0;
  try {
    await connection.beginTransaction();
    // Share the existing cab writer lock so customer links cannot race its writes.
    const [locks] = await connection.execute<RowDataPacket[]>("SELECT lock_id FROM cab_state_lock WHERE lock_id = 1 FOR UPDATE");
    if (!locks.length) throw new Error("MISSING_STATE_LOCK");
    for (const event of events) {
      const [existing] = await connection.execute<RowDataPacket[]>("SELECT event_key FROM whatsapp_events WHERE event_key = ?", [event.key]);
      if (existing.length) { duplicates++; continue; }
      let conversationKey: string | null = null;
      if (event.kind === "message") {
        conversationKey = hash([event.phoneNumberId, event.sender]);
        const [conversations] = await connection.execute<RowDataPacket[]>("SELECT conversation_key FROM whatsapp_conversations WHERE conversation_key = ?", [conversationKey]);
        if (!conversations.length) {
          // Only reuse an unambiguous exact international number, never infer country codes.
          const [customers] = await connection.execute<RowDataPacket[]>("SELECT customer_id FROM customers WHERE phone IN (?, ?) ORDER BY created_at LIMIT 2", [event.sender, "+" + event.sender]);
          const customerId = customers.length === 1 ? String(customers[0].customer_id) : randomUUID();
          if (customers.length !== 1) await connection.execute("INSERT INTO customers (customer_id, full_name, phone, email) VALUES (?, ?, ?, ?)", [customerId, "WhatsApp customer", "+" + event.sender, ""]);
          const enquiryId = randomUUID();
          await connection.execute("INSERT INTO cab_enquiries (enquiry_id, customer_id, booking_id, enquiry_type, enquiry_status, payload, created_at, updated_at) VALUES (?, ?, NULL, 'whatsapp', 'new', ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))", [enquiryId, customerId, JSON.stringify({ source: "whatsapp", conversationKey })]);
          await connection.execute("INSERT INTO whatsapp_conversations (conversation_key, phone_number_id, sender_wa_id, customer_id, enquiry_id) VALUES (?, ?, ?, ?, ?)", [conversationKey, event.phoneNumberId, event.sender, customerId, enquiryId]);
          await connection.execute("INSERT INTO notifications (notification_id, booking_id, notification_kind, audience, delivery_status, attempts, created_at, dedupe_key, subject, html_body, text_body, recipient) VALUES (?, NULL, 'system-event', 'admin', 'preview', 0, UTC_TIMESTAMP(3), ?, ?, '', ?, '')", [randomUUID(), "whatsapp:" + conversationKey, "New WhatsApp enquiry", "A WhatsApp enquiry was received. Reference: " + enquiryId]);
        }
      }
      await connection.execute("INSERT INTO whatsapp_events (event_key, event_kind, phone_number_id, message_id, conversation_key, event_timestamp, details) VALUES (?, ?, ?, ?, ?, ?, ?)", [event.key, event.kind, event.phoneNumberId, event.messageId, conversationKey, event.timestamp, JSON.stringify(event.details)]);
      accepted++;
    }
    await connection.commit();
    return { accepted, duplicates };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}
