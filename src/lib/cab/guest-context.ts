import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
const grants = new AsyncLocalStorage<{ bookingId: string; assurance: "link" | "otp" }>();
/** Called only after the server has validated a stored, unrevoked guest session. */
export function withGuestGrant<T>(bookingId: string, assurance: "link" | "otp", operation: () => T): T {
  return grants.run({ bookingId, assurance }, operation);
}
export function guestGrantAllows(bookingId: string, sensitive = true) {
  const grant = grants.getStore();
  return grant?.bookingId === bookingId && (!sensitive || grant.assurance === "otp");
}
