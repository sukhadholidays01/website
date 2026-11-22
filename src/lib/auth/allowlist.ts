import "server-only";
import { readAdminAllowlist } from "./admin-allowlist.mjs";
export { AdminConfigurationError, type AdminConfigurationProblem } from "./admin-allowlist.mjs";
export function adminAllowlist(): readonly [string, string] {
  // Resolve the running server's environment on every call, including session validation.
  return readAdminAllowlist({ ADMIN_EMAIL_1: process.env.ADMIN_EMAIL_1, ADMIN_EMAIL_2: process.env.ADMIN_EMAIL_2 });
}
export function adminAllowlistConfigured() { try { adminAllowlist(); return true; } catch { return false; } }
export function isAllowedAdminEmail(email: string) { return adminAllowlist().includes(email.trim().toLowerCase()); }
