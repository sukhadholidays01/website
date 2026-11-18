import "server-only";
import { z } from "zod";
const address = z.string().trim().email().max(190).transform(value => value.toLowerCase());
export class AdminConfigurationError extends Error {
  constructor() { super("Configure two distinct valid ADMIN_EMAIL_1 and ADMIN_EMAIL_2 addresses on the server."); }
}
export function adminAllowlist(): readonly [string, string] {
  const first = address.safeParse(process.env.ADMIN_EMAIL_1);
  const second = address.safeParse(process.env.ADMIN_EMAIL_2);
  if (!first.success || !second.success || first.data === second.data) throw new AdminConfigurationError();
  return [first.data, second.data];
}
export function adminAllowlistConfigured() { try { adminAllowlist(); return true; } catch { return false; } }
export function isAllowedAdminEmail(email: string) { return adminAllowlist().includes(email.trim().toLowerCase()); }
