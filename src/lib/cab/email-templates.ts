import type { CabBooking } from "./types";
import { cabMoney, tripLabels } from "./types";
import type { EmailKind } from "./models";
export const escapeEmail = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const titles: Record<EmailKind, string> = {
  request: "Your cab request is received",
  confirmation: "Your cab booking is confirmed",
  status: "Your journey status has changed",
  assignment: "Your driver and vehicle details",
  "payment-success": "Payment confirmation",
  "payment-failure": "Payment was not completed",
  "admin-request": "New cab booking request",
};
export function renderCabEmail(kind: EmailKind, booking: CabBooking) {
  const title = titles[kind];
  const text = [
    `Sukhadh Holidays — ${title}`,
    booking.development
      ? "DEVELOPMENT PREVIEW — no live booking or payment implied."
      : "",
    `Reference: ${booking.id}`,
    `Traveller: ${booking.customer.name}`,
    `Trip: ${tripLabels[booking.journey.tripType]} · ${booking.journey.origin.label} → ${booking.journey.destination.label}`,
    `Pickup: ${booking.journey.departure.replace("T", " ")} IST`,
    booking.journey.returnAt
      ? `Return arrival: ${booking.journey.returnAt.replace("T", " ")} IST`
      : "",
    `Pickup address: ${booking.journey.pickupAddress}`,
    `Drop address: ${booking.journey.dropAddress}`,
    `Vehicle category: ${booking.journey.vehicle} · ${booking.journey.passengers} passengers`,
    `Status: ${booking.status}`,
    `Quote: ${booking.fare.total === null ? "Awaiting final quote" : cabMoney(booking.fare.total)}`,
    ...booking.fare.lines.map(
      (line) => `${line.label}: ${cabMoney(line.amount)}`,
    ),
    `Includes: ${booking.fare.inclusions}`,
    `Excludes: ${booking.fare.exclusions}`,
    kind === "assignment" && booking.assignment
      ? `Driver: ${booking.assignment.driver} · ${booking.assignment.phone}\nVehicle: ${booking.assignment.vehicle}`
      : "",
    kind === "payment-failure"
      ? "Your booking status has not been changed. You can retry payment from your private booking page."
      : "Use your saved private booking link to review the latest details.",
    "Questions? Contact info@sukhadhholidays.in.",
  ]
    .filter(Boolean)
    .join("\n");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeEmail(title)}</title></head><body style="margin:0;background:#f4f7f7;font-family:Arial,sans-serif;color:#15364b"><table role="presentation" style="width:100%;max-width:620px;margin:24px auto;background:white;border:1px solid #dbe5e8;border-radius:12px"><tr><td style="padding:26px;background:#15364b;color:white;font-size:22px">Sukhadh Holidays<br><small style="font-size:12px;color:#8fdbd8">Creating Happy Memories</small></td></tr><tr><td style="padding:26px"><h1 style="font-size:24px">${escapeEmail(title)}</h1>${text
    .split("\n")
    .slice(1)
    .map(
      (line) =>
        `<p style="font-size:14px;line-height:1.7">${escapeEmail(line)}</p>`,
    )
    .join(
      "",
    )}</td></tr><tr><td style="padding:20px 26px;border-top:1px solid #dbe5e8;font-size:12px">sukhadhholidays.in · info@sukhadhholidays.in</td></tr></table></body></html>`;
  return {
    subject: `${booking.development ? "[DEVELOPMENT] " : ""}${title} · ${booking.id}`,
    html,
    text,
  };
}
