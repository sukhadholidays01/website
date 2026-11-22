import "server-only";
import { z } from "zod";
const address = z.string().trim().email().max(190).transform(value => value.toLowerCase());
export type AdminConfigurationProblem = "ADMIN_EMAIL_1_MISSING" | "ADMIN_EMAIL_1_INVALID" | "ADMIN_EMAIL_2_MISSING" | "ADMIN_EMAIL_2_INVALID" | "ADMIN_EMAILS_DUPLICATE";
export class AdminConfigurationError extends Error {
  constructor(readonly configurationProblems: readonly AdminConfigurationProblem[] = []) { super("Configure two distinct valid ADMIN_EMAIL_1 and ADMIN_EMAIL_2 addresses on the server."); }
}
export function adminAllowlist(): readonly [string, string] {
  const first = address.safeParse(process.env.ADMIN_EMAIL_1);
  const second = address.safeParse(process.env.ADMIN_EMAIL_2);
  if (!first.success || !second.success || first.data === second.data) {
    const problems: AdminConfigurationProblem[] = [];
    if (!first.success) problems.push(process.env.ADMIN_EMAIL_1?.trim() ? "ADMIN_EMAIL_1_INVALID" : "ADMIN_EMAIL_1_MISSING");
    if (!second.success) problems.push(process.env.ADMIN_EMAIL_2?.trim() ? "ADMIN_EMAIL_2_INVALID" : "ADMIN_EMAIL_2_MISSING");
    if (first.success && second.success && first.data === second.data) problems.push("ADMIN_EMAILS_DUPLICATE");
    throw new AdminConfigurationError(problems);
  }
  return [first.data, second.data];
}
export function adminAllowlistConfigured() { try { adminAllowlist(); return true; } catch { return false; } }
export function isAllowedAdminEmail(email: string) { return adminAllowlist().includes(email.trim().toLowerCase()); }
