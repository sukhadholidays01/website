import "server-only";
import { z } from "zod";
import { getDatabasePool } from "@/lib/db";
import type { GuestRow } from "./guest-repository";
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const guestPolicySchema = z.object({ nightStart: clock.default("22:00"), nightEnd: clock.nullable().default(null), automaticNightId: z.boolean().default(false), documentTypes: z.array(z.enum(["passport", "driving-licence", "government-id"])).min(1).max(3).default(["government-id"]), retentionDays: z.number().int().min(1).max(365).default(30), enforcement: z.enum(["before-confirmation", "advisory"]).default("before-confirmation") }).strict().superRefine((value, ctx) => { if (value.automaticNightId && (!value.nightEnd || value.nightEnd === value.nightStart)) ctx.addIssue({ code: "custom", message: "Configure a distinct night end time before enabling automatic ID requirements." }); });
export type GuestDocumentPolicy = z.infer<typeof guestPolicySchema> & { nightDetected: boolean; idRequired: boolean };
export async function readGuestPolicy() {
  const [rows] = await getDatabasePool().execute<GuestRow[]>("SELECT setting_value FROM website_settings WHERE setting_key='cab_guest_policy'");
  return guestPolicySchema.parse(rows[0] ? typeof rows[0].setting_value === "string" ? JSON.parse(rows[0].setting_value) : rows[0].setting_value : {});
}
export function detectNight(departure: string, policy: z.infer<typeof guestPolicySchema>) {
  const time = departure.slice(11,16);
  // Without an end time, only the explicitly defined late-evening threshold is detected.
  const nightDetected = policy.nightEnd ? policy.nightEnd < policy.nightStart ? time >= policy.nightStart || time < policy.nightEnd : time >= policy.nightStart && time < policy.nightEnd : time >= policy.nightStart;
  return { ...policy, nightDetected, idRequired: policy.automaticNightId && nightDetected };
}
