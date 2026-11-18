import { z } from "zod";
export const bookingPolicies = [
  { id: "cab-booking-terms", version: "2026-11-14.1", category: "booking_terms", text: "Submitting a cab request does not confirm availability, the vehicle or final fare. Operations will review the request and issue a quotation. Review inclusions, exclusions and cancellation conditions before accepting the quotation. Payment arrangements become available only after operations confirms the booking. Provide accurate journey and contact details. Contact support for changes or cancellation; cancellation does not automatically create a refund." },
  { id: "cab-privacy-notice", version: "2026-11-14.1", category: "privacy_notice", text: "Your contact and journey details are used to process this request, communicate updates and arrange the journey. Assigned operational staff may access the information needed to fulfil it. A private booking link allows limited journey access; mobile verification protects sensitive actions. Do not share access links or codes. Contact support to request access, correction or deletion, subject to applicable retention obligations. See the website Privacy Policy for the broader notice." },
  { id: "cab-id-processing", version: "2026-11-14.1", category: "id_processing", text: "If identification is required for this journey, the uploaded document will be stored privately and reviewed only by authorised operations staff. It is not published or automatically attached to messages. Upload only an accepted document, redact unrelated information where permitted and do not send documents through ordinary email. The configured retention period is shown before upload. Contact support for correction or deletion requests." },
] as const;
export type PolicyAcceptance = { id: string; version: string; category: string; text: string; source: string };
export const consentInput = z.array(z.object({ id: z.string().max(64), version: z.string().max(40), accepted: z.literal(true) }).strict()).max(3);
export function validatePolicyAcceptance(input: unknown, categories: string[], source = "cab-web-review"): PolicyAcceptance[] {
  const entries = consentInput.parse(input);
  if (new Set(entries.map(entry => entry.id)).size !== entries.length) throw Error("Duplicate policy consent.");
  const accepted = entries.map(entry => {
    const policy = bookingPolicies.find(p => p.id === entry.id && p.version === entry.version);
    if (!policy) throw Error("The policy version changed. Review the current policy before submitting.");
    return { ...policy, source };
  });
  if (categories.some(category => !accepted.some(p => p.category === category))) throw Error("Review and accept each required policy separately.");
  return accepted;
}
export function normalisePhone(value: string) {
  const trimmed = value.trim(), digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return "+91" + digits; // Backward-compatible Indian local input.
  if (trimmed.startsWith("00")) return "+" + digits.slice(2);
  return "+" + digits;
}
