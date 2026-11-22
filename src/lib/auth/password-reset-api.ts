import "server-only";
import { randomUUID } from "node:crypto";
import { CabError, limitRequest, readBody, requireSameOrigin } from "@/lib/cab/security";
import { confirmAdminPasswordReset, inspectAdminResetToken, requestAdminPasswordReset, resetAcknowledgement } from "./password-reset";
import { resetDiagnostic, resetFailureCode } from "./reset-diagnostics";
export type ResetAction = "request" | "validate" | "confirm";
export async function handleAdminPasswordReset(request: Request, action: ResetAction) {
  const requestId = randomUUID();
  let stage = "origin";
  if (action === "request") resetDiagnostic("admin_reset_request_received", requestId, { operation: action });
  const reply = (body: object, status = 200) => Response.json({ ...body, requestId }, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Request-ID": requestId } });
  try {
    requireSameOrigin(request);
    stage = "rate_limit";
    await limitRequest(request, "admin-reset-" + action, action === "request" ? 3 : action === "validate" ? 15 : 8, 15 * 60000);
    stage = "body";
    const body = await readBody(request);
    stage = action;
    if (action === "validate") return reply(await inspectAdminResetToken(body, requestId));
    if (action === "request") { await requestAdminPasswordReset(body, requestId); return reply({ message: resetAcknowledgement }); }
    await confirmAdminPasswordReset(body, requestId);
    return reply({ message: "Password updated. Sign in with your new password." });
  } catch (error) {
    const status = error instanceof CabError ? error.status : 503;
    resetDiagnostic("admin_reset_failure", requestId, { operation: action, stage, code: resetFailureCode(error) });
    return reply({ error: error instanceof CabError ? error.message : "Password recovery is temporarily unavailable. Please contact support.", code: status >= 500 ? "ADMIN_RESET_UNAVAILABLE" : "ADMIN_RESET_REJECTED" }, status);
  }
}
