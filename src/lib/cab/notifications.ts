import "server-only";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import type { CabBooking, CabState } from "./types";
import type { EmailKind } from "./models";
import { renderCabEmail } from "./email-templates";
import { cabStorageMode, changeCabState, readCabState } from "./store";
const bookingStorageIsDevelopment = () => cabStorageMode() !== "mysql";

export function queueCabEmail(
  state: CabState,
  booking: CabBooking,
  kind: EmailKind,
) {
  const audience = kind === "admin-request" ? "admin" : "customer";
  const dedupeKey = [
    booking.id,
    kind,
    booking.updatedAt,
    booking.fare.version,
  ].join(":");
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
      audience === "customer"
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
export async function processCabEmails() {
  const pending = (await readCabState()).operations.notifications
    .filter((n) => n.status === "queued")
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
        (n.audience === "admin" ? prefs.admin : prefs.customer);
      n.status = live ? "sending" : "preview";
      if (live) n.attempts++;
      return live;
    });
    if (!claimed) continue;
    try {
      if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASS
      )
        throw Error("SMTP configuration is incomplete.");
      const sender = process.env.SMTP_USER;
      if (!/^[^\s<>@]+@[^\s<>@]+$/.test(sender))
        throw Error("SMTP_USER must be the authenticated mailbox address.");
      const port = Number(process.env.SMTP_PORT || 465);
      if (![465, 587].includes(port))
        throw Error("Use SMTP TLS port 465 or STARTTLS port 587.");
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        requireTLS: true,
        auth: { user: sender, pass: process.env.SMTP_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      try {
        await transport.sendMail({
          from: { name: "Sukhadh Holidays", address: sender },
          to: item.recipient,
          replyTo: "info@sukhadhholidays.in",
          subject: item.subject,
          text: item.text,
          html: item.html,
          messageId: `<${item.id}@sukhadhholidays.in>`,
        });
      } finally {
        transport.close();
      }
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
      });
      console.warn("Cab email delivery not confirmed", {
        notificationId: item.id,
        kind: item.kind,
      });
    }
  }
}
