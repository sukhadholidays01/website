import "server-only";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { getDatabasePool } from "@/lib/db";
import { CabError, staffRole } from "@/lib/cab/security";
import { verifyPassword } from "./passwords.mjs";
import { adminAllowlist, isAllowedAdminEmail } from "./allowlist";

const credentials = z.object({ email: z.string().trim().email().max(190).transform(v => v.toLowerCase()), password: z.string().min(1).max(1024) });
export async function authenticateAdmin(body: unknown) {
  try { adminAllowlist(); } catch { throw new CabError("Admin sign-in is temporarily unavailable. Contact support.", 503); }
  const parsed = credentials.safeParse(body);
  if (!parsed.success) throw new CabError("Enter a valid email and password.", 401);
  if (!isAllowedAdminEmail(parsed.data.email)) {
    await verifyPassword(parsed.data.password, null);
    throw new CabError("Incorrect email or password.", 401);
  }
  const [users] = await getDatabasePool().execute<RowDataPacket[]>(
    "SELECT user_id, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1", [parsed.data.email]);
  const user = users[0];
  const valid = await verifyPassword(parsed.data.password, user?.password_hash);
  const role = user ? staffRole(user.role) : null;
  if (!valid || !user?.is_active || !role) throw new CabError("Incorrect email or password.", 401);
  return { id: String(user.user_id), role };
}
