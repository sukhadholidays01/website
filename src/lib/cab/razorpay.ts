import "server-only";
import { currentAdvance } from "./commercial";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { CabError } from "./security";
import { cabStorageMode, changeCabState, readCabState } from "./store";
import { authorizeBooking, getBooking } from "./service";
import { cabBalance, type CabState } from "./types";
import type { CabSettings, PaymentAttempt } from "./models";
import { verifyRazorpaySignature, verifyRazorpayWebhook } from "./payment-signatures";
import { queueCabEmail } from "./notifications";
import { auditCab } from "./tracking";

export const defaultPaymentPolicy = { full: false, advance: false, advanceType: "percent" as const, advanceValue: 25, payLater: false };
export function razorpayConfiguration() {
  const key = process.env.RAZORPAY_KEY_ID || "";
  const mode = key.startsWith("rzp_test_") ? "test" : key.startsWith("rzp_live_") ? "live" : "disabled";
  const configured = mode !== "disabled" && Boolean(process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET);
  const liveEnabled = mode === "live" && process.env.NODE_ENV === "production" && process.env.CAB_RAZORPAY_LIVE_ENABLED === "true";
  return { mode, configured, liveEnabled, enabled: configured && (mode === "test" || liveEnabled) && cabStorageMode() === "mysql" };
}
function requireGateway() {
  if (!razorpayConfiguration().enabled) throw new CabError("Online payment is not enabled. Contact operations; no payment was initiated.", 503);
}
const providerId = z.string().regex(/^[a-z]+_[A-Za-z0-9]+$/);
export async function razorpayRequest(path: string, method = "GET", body?: unknown): Promise<Record<string, unknown>> {
  requireGateway();
  const response = await fetch("https://api.razorpay.com/v1/" + path, { method, cache: "no-store", signal: AbortSignal.timeout(15000), headers: { Authorization: "Basic " + Buffer.from(process.env.RAZORPAY_KEY_ID + ":" + process.env.RAZORPAY_KEY_SECRET).toString("base64"), "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw Object.assign(new CabError("Payment provider response was not confirmed. Reconcile this attempt before retrying.", 502),{providerHttpStatus:response.status});
  return await response.json();
}
export function payableAmount(state: CabState, bookingId: string, option: "full" | "advance") {
  const b = getBooking(state, bookingId);
  if (!["CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(b.status) || b.fare.total === null) throw new CabError("Operations must confirm the final quote before payment.", 409);
  const policy = state.operations.settings.payments || defaultPaymentPolicy;
  const advance=currentAdvance(b);
  if(option==="advance"&&b.commercial){if(!advance?.requestedAt||advance.cancelledAt||advance.quoteVersion!==b.fare.version||(advance.deadline&&Date.parse(advance.deadline)<=Date.now()))throw new CabError("No current payable advance request. Contact operations.",409);}
  if (!(option==="advance"&&advance?.requestedAt) && !policy[option]) throw new CabError("This payment option is not enabled by operations.", 409);
  const { due, paid } = cabBalance(b);
  const target = option === "full" ? due! : Math.min(due!, Math.max(0, (advance?.amount ?? (policy.advanceType === "percent" ? b.fare.total * policy.advanceValue / 100 : policy.advanceValue)) - paid));
  const paise = Math.round(target * 100);
  if (!Number.isSafeInteger(paise) || paise < 100 || paise > Math.round(due! * 100)) throw new CabError("No eligible payment amount remains for this option.", 409);
  return paise;
}
export async function createRazorpayOrder(bookingId: string, token: string, input: unknown) {
  requireGateway();
  const { option } = z.object({ option: z.enum(["full", "advance"]) }).strict().parse(input);
  let reserved = false;
  const attempt = await changeCabState(state => {
    authorizeBooking(getBooking(state, bookingId), token);
    const amountPaise = payableAmount(state, bookingId, option);
    const existing = state.operations.paymentAttempts.find(a => a.bookingId === bookingId && a.provider === "razorpay" && ["CREATING", "PENDING", "FAILED", "RECONCILIATION_REQUIRED"].includes(a.status));
    if (existing) {
      if (!["PENDING", "FAILED"].includes(existing.status)) throw new CabError("An earlier order needs reconciliation. Do not start another payment.", 409);
      if (existing.amountPaise !== amountPaise) throw new CabError("Finish or reconcile the existing payment before changing options.", 409);
      existing.status = "PENDING";
      return existing;
    }
    reserved = true;
    const id = randomUUID(), now = new Date().toISOString();
    const b=getBooking(state,bookingId),advance=currentAdvance(b);
    const context={quoteVersion:b.fare.version,quotationAmount:b.fare.total!,...(option==="advance"&&advance?{advanceId:advance.id,advanceRevision:advance.revision}:{})};
    const a: PaymentAttempt = { context, id, bookingId, amount: amountPaise / 100, amountPaise, currency: "INR", status: "CREATING", provider: "razorpay", orderId: "reserved_" + id, eventIds: ["environment:" + razorpayConfiguration().mode], createdAt: now, updatedAt: now };
    state.operations.paymentAttempts.unshift(a);
    auditCab(state, "CUSTOMER", "Reserved Razorpay " + option + " order", bookingId);
    return a;
  });
  let result = attempt;
  if (reserved) {
    try {
      const order = await razorpayRequest("orders", "POST", { amount: attempt.amountPaise, currency: "INR", receipt: attempt.id, partial_payment: false, notes: { booking_reference: bookingId } });
      if (order.amount !== attempt.amountPaise || order.currency !== "INR") throw new CabError("Provider order amount did not match.", 502);
      const orderId = providerId.parse(order.id);
      result = await changeCabState(state => { const a = state.operations.paymentAttempts.find(p => p.id === attempt.id)!; a.orderId = orderId; a.status = "PENDING"; a.updatedAt = new Date().toISOString(); return a; });
    } catch {
      await changeCabState(state => { const a = state.operations.paymentAttempts.find(p => p.id === attempt.id)!; a.status = "RECONCILIATION_REQUIRED"; auditCab(state, "SYSTEM", "Razorpay order outcome requires reconciliation", bookingId); });
      throw new CabError("Order creation was not confirmed. Operations must reconcile before another attempt.", 502);
    }
  }
  return { attempt: result, keyId: process.env.RAZORPAY_KEY_ID!, mode: razorpayConfiguration().mode };
}

export async function reconcilePayment(orderId: string, paymentId: string, eventId: string) {
  providerId.parse(orderId); providerId.parse(paymentId);
  const payment = await razorpayRequest("payments/" + paymentId);
  const order = await razorpayRequest("orders/" + orderId);
  return changeCabState(state => {
    const a = state.operations.paymentAttempts.find(p => p.provider === "razorpay" && p.orderId === orderId);
    if (!a) throw new CabError("Unknown payment order.", 404);
    if (!a.eventIds.includes("environment:" + razorpayConfiguration().mode)) throw new CabError("Use the gateway mode that created this order for reconciliation.", 409);
    if (payment.order_id !== a.orderId || payment.id !== paymentId || payment.amount !== a.amountPaise || payment.currency !== a.currency || order.id !== a.orderId || order.amount !== a.amountPaise || order.currency !== a.currency) throw new CabError("Payment amount, currency or order did not match.", 409);
    if (a.eventIds.includes(eventId)) return a;
    const b = getBooking(state, a.bookingId);
    if(a.context&&(a.context.quoteVersion!==b.fare.version||a.context.quotationAmount!==b.fare.total||(a.context.advanceId&&!b.commercial?.advances.some(r=>r.id===a.context!.advanceId&&r.revision===a.context!.advanceRevision))))throw new CabError("Payment context requires operations reconciliation.",409);
    if (payment.status === "captured" && payment.captured === true && order.status === "paid" && order.amount_paid === a.amountPaise) {
      if (a.paymentId && a.paymentId !== paymentId) throw new CabError("Another payment is already associated with this order.", 409);
      if (a.status !== "SUCCESSFUL" && a.status !== "REFUNDED") {
        if (state.bookings.some(other => other.payments.some(p => p.mode === "razorpay" && p.reference === paymentId))) throw new CabError("Payment was already recorded against a booking.", 409);
        if (Math.round((cabBalance(b).due || 0) * 100) < a.amountPaise) { a.status = "RECONCILIATION_REQUIRED"; auditCab(state, "SYSTEM", "Captured payment requires balance review", b.id); return a; }
        b.payments.push({ id: randomUUID(), type: "receipt", amount: a.amount, method: razorpayConfiguration().mode === "test" ? "Razorpay test" : "Razorpay", reference: paymentId, note: "Captured amount verified against Razorpay order and payment APIs.", mode: "razorpay", at: new Date().toISOString() });
        a.status = "SUCCESSFUL"; a.paymentId = paymentId;
        b.updatedAt = new Date().toISOString();
        b.history.push({ at: b.updatedAt, actor: "operations", message: "Razorpay payment captured and reconciled." });
        queueCabEmail(state, b, "payment-success");queueCabEmail(state,b,"admin-payment");
        auditCab(state, "RAZORPAY", "Verified captured payment", b.id);
      }
    } else if (payment.status === "failed" && !["SUCCESSFUL", "REFUNDED"].includes(a.status)) {
      // A failed payment does not close an order: Checkout can retry that same order.
      b.updatedAt = new Date().toISOString();
      a.status = "FAILED";
      queueCabEmail(state, b, "payment-failure");queueCabEmail(state,b,"admin-payment-failure");
      auditCab(state, "RAZORPAY", "Payment failed; order remains payable", b.id);
    }
    // Authorisation may precede capture. Do not consume its callback id while pending.
    if (["SUCCESSFUL", "REFUNDED"].includes(a.status) || payment.status === "failed") a.eventIds.push(eventId);
    a.updatedAt = new Date().toISOString();
    return a;
  });
}
export async function verifyCheckout(input: unknown, token: string) {
  const p = z.object({ bookingId: z.string().max(80), orderId: providerId, paymentId: providerId, signature: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(input);
  const state = await readCabState();
  authorizeBooking(getBooking(state, p.bookingId), token);
  if (!state.operations.paymentAttempts.some(a => a.bookingId === p.bookingId && a.orderId === p.orderId && a.provider === "razorpay")) throw new CabError("Order does not belong to this booking.", 403);
  if (!verifyRazorpaySignature(p.orderId, p.paymentId, p.signature, process.env.RAZORPAY_KEY_SECRET || "")) throw new CabError("Invalid payment signature.", 401);
  return reconcilePayment(p.orderId, p.paymentId, "checkout:" + p.paymentId);
}
export async function razorpayWebhook(raw: string, signature: string, providerEventId: string) {
  if (!verifyRazorpayWebhook(raw, signature, process.env.RAZORPAY_WEBHOOK_SECRET || "")) throw new CabError("Invalid webhook signature.", 401);
  requireGateway();
  let event;
  try { event = JSON.parse(raw); } catch { throw new CabError("Invalid webhook JSON."); }
  const id = providerEventId ? z.string().max(150).regex(/^[A-Za-z0-9_-]+$/).parse(providerEventId) : createHash("sha256").update(raw).digest("hex");
  if (["payment.captured", "payment.failed", "order.paid"].includes(event.event)) {
    const p = event.payload?.payment?.entity;
    if (!p?.id || !p?.order_id) throw new CabError("Webhook payment is missing.");
    // Ignore unrelated products on the merchant account without revealing booking data.
    if (!(await readCabState()).operations.paymentAttempts.some(a => a.provider === "razorpay" && a.orderId === p.order_id)) return;
    await reconcilePayment(p.order_id, p.id, "webhook:" + id);
  } else if (["refund.processed", "refund.failed"].includes(event.event)) {
    const refundId = providerId.parse(event.payload?.refund?.entity?.id);
    await reconcileRefund(refundId);
  }
}
export async function reconcileOrder(attemptId: string, role: string) {
  const a = (await readCabState()).operations.paymentAttempts.find(p => p.id === attemptId && p.provider === "razorpay");
  if (!a) throw new CabError("Payment attempt not found.", 404);
  let orderId = a.orderId;
  if (orderId.startsWith("reserved_")) {
    const orders = await razorpayRequest("orders?receipt=" + encodeURIComponent(a.id));
    const matches = (Array.isArray(orders.items) ? orders.items : []).filter((o: Record<string, unknown>) => o.receipt === a.id && o.amount === a.amountPaise && o.currency === "INR");
    if (matches.length !== 1) throw new CabError("No unique matching provider order. Inspect Razorpay before resolving this reservation.", 409);
    orderId = providerId.parse(matches[0].id);
    await changeCabState(state => { const current = state.operations.paymentAttempts.find(p => p.id === a.id)!; current.orderId = orderId; current.status = "PENDING"; auditCab(state, role, "Recovered reserved provider order", a.bookingId); });
  }
  const payments = await razorpayRequest("orders/" + orderId + "/payments");
  for (const p of Array.isArray(payments.items) ? payments.items : []) await reconcilePayment(orderId, providerId.parse(p.id), "reconcile:" + p.id + ":" + p.status);
  return { reconciled: true };
}
export async function requestRefund(attemptId: string, role: string, input: unknown) {
  const { reason } = z.object({ reason: z.string().trim().min(5).max(500) }).strict().parse(input);
  let created = false;
  const request = await changeCabState(state => {
    const a = state.operations.paymentAttempts.find(p => p.id === attemptId && p.provider === "razorpay");
    if (!a || a.status !== "SUCCESSFUL" || !a.paymentId) throw new CabError("Only a verified captured payment can be refunded.", 409);
    if (!a.eventIds.includes("environment:" + razorpayConfiguration().mode)) throw new CabError("Use the original gateway mode for this refund.", 409);
    const existing = state.refunds?.find(r => r.attemptId === attemptId);
    if (existing) return existing;
    created = true;
    const r: NonNullable<CabState["refunds"]>[number] = { id: randomUUID(), attemptId, status: "REQUESTED", amountPaise: a.amountPaise, reason, at: new Date().toISOString() };
    (state.refunds ||= []).push(r); auditCab(state, role, "Requested full Razorpay refund", a.bookingId); return r;
  });
  const a = (await readCabState()).operations.paymentAttempts.find(p => p.id === attemptId)!;
  if (created) {
    try {
      const response = await razorpayRequest("payments/" + a.paymentId + "/refund", "POST", { amount: request.amountPaise, receipt: request.id, notes: { reason } });
      const refundId = providerId.parse(response.id);
      await changeCabState(state => { state.refunds!.find(r => r.id === request.id)!.providerId = refundId; });
      await reconcileRefund(refundId);
    } catch { throw new CabError("Refund outcome is pending reconciliation. Do not submit another refund; inspect the existing request.", 502); }
  } else if (request.providerId) await reconcileRefund(request.providerId);
  else {
    const response = await razorpayRequest("payments/" + a.paymentId + "/refunds");
    const found = (Array.isArray(response.items) ? response.items : []).find((r: Record<string, unknown>) => r.receipt === request.id);
    if (!found) throw new CabError("Refund outcome is unresolved. Check Razorpay; no second refund was sent.", 409);
    await reconcileRefund(providerId.parse(found.id));
  }
  return { requestId: request.id };
}
export async function reconcileRefund(refundId: string) {
  const refund = await razorpayRequest("refunds/" + providerId.parse(refundId));
  return changeCabState(state => {
    const r = state.refunds?.find(p => p.providerId === refundId || p.id === refund.receipt);
    if (!r) return;
    const a = state.operations.paymentAttempts.find(p => p.id === r.attemptId)!;
    if (refund.payment_id !== a.paymentId || refund.amount !== r.amountPaise || refund.currency !== "INR") throw new CabError("Refund details did not match.", 409);
    r.providerId = refundId; r.status = String(refund.status);
    const b = getBooking(state, a.bookingId);
    if (refund.status === "processed" && !b.payments.some(p => p.reference === refundId)) {
      b.payments.push({ id: randomUUID(), type: "refund", amount: r.amountPaise / 100, method: a.eventIds.includes("environment:test") ? "Razorpay test" : "Razorpay", reference: refundId, note: r.reason, mode: "razorpay", at: new Date().toISOString() });
      a.status = "REFUNDED"; a.updatedAt = new Date().toISOString(); b.updatedAt = a.updatedAt;
      b.history.push({ at: b.updatedAt, actor: "operations", message: "Razorpay refund verified as processed." });
      auditCab(state, "RAZORPAY", "Verified processed refund", b.id); queueCabEmail(state, b, "refund");
    }
  });
}
export function publicPaymentSettings(settings: CabSettings) { return settings.payments || defaultPaymentPolicy; }
