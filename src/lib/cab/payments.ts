import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { cabBalance } from "./types";
import { changeCabState } from "./store";
import { authorizeBooking, getBooking } from "./service";
import { CabError } from "./security";
import { queueCabEmail } from "./notifications";
import {
  verifyRazorpaySignature,
  verifyRazorpayWebhook,
} from "./payment-signatures";

export function paymentConfiguration() {
  return {
    mode: "mock",
    razorpayCredentialsPresent: Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
    ),
    liveEnabled: false,
    reason:
      "Live money movement requires persistent booking/payment transactions and an approved hosting configuration.",
  };
}
export async function initiateCabPayment(bookingId: string, token: string) {
  return changeCabState((state) => {
    const b = getBooking(state, bookingId);
    authorizeBooking(b, token);
    if (!state.operations.settings.mockPaymentsEnabled)
      throw new CabError("Development payment simulation is disabled.", 409);
    if (
      !["CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(
        b.status,
      ) ||
      b.fare.total === null
    )
      throw new CabError(
        "Confirm the booking and final fare before starting payment.",
        409,
      );
    const due = cabBalance(b).due!;
    if (due <= 0) throw new CabError("There is no outstanding balance.", 409);
    const previous = state.operations.paymentAttempts.find(
      (p) => p.bookingId === bookingId && p.status === "PENDING",
    );
    if (previous) return previous;
    const now = new Date().toISOString();
    const attempt = {
      id: randomUUID(),
      bookingId,
      amount: due,
      amountPaise: Math.round(due * 100),
      currency: "INR" as const,
      status: "PENDING" as const,
      provider: "mock" as const,
      orderId: "mock_order_" + randomUUID(),
      createdAt: now,
      updatedAt: now,
      eventIds: [],
    };
    state.operations.paymentAttempts.unshift(attempt);
    return attempt;
  });
}
export async function simulateCabPayment(
  bookingId: string,
  token: string,
  input: unknown,
) {
  const op = z
    .object({
      attemptId: z.string().uuid(),
      result: z.enum(["success", "failure", "refund"]),
      eventId: z.string().uuid(),
    })
    .parse(input);
  return changeCabState((state) => {
    const b = getBooking(state, bookingId);
    authorizeBooking(b, token);
    if (!state.operations.settings.mockPaymentsEnabled)
      throw new CabError("Mock payment simulation is disabled.", 409);
    const attempt = state.operations.paymentAttempts.find(
      (p) =>
        p.id === op.attemptId && p.bookingId === b.id && p.provider === "mock",
    );
    if (!attempt)
      throw new CabError("Development payment attempt not found.", 404);
    if (attempt.eventIds.includes(op.eventId)) return attempt;
    if (op.result === "refund") {
      if (attempt.status !== "SUCCESSFUL")
        throw new CabError(
          "Only a successful simulated payment can be refunded.",
          409,
        );
      if (cabBalance(b).paid < attempt.amount)
        throw new CabError("This amount has already been refunded.", 409);
      b.payments.push({
        id: randomUUID(),
        amount: attempt.amount,
        type: "refund",
        method: "Mock gateway",
        reference: "mock_refund_" + attempt.id,
        note: "Development simulation — no money moved.",
        at: new Date().toISOString(),
        mode: "mock",
      });
      attempt.status = "REFUNDED";
    } else {
      if (attempt.status !== "PENDING")
        throw new CabError(
          "This simulated payment has already been resolved.",
          409,
        );
      if (op.result === "success") {
        if (
          !["CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(
            b.status,
          )
        )
          throw new CabError("Booking is no longer payable.", 409);
        if (cabBalance(b).due! < attempt.amount)
          throw new CabError(
            "The balance changed. Cancel this attempt and start again.",
            409,
          );
        b.payments.push({
          id: randomUUID(),
          amount: attempt.amount,
          type: "receipt",
          method: "Mock gateway",
          reference: "mock_payment_" + attempt.id,
          note: "Development simulation — no money collected.",
          at: new Date().toISOString(),
          mode: "mock",
        });
        attempt.status = "SUCCESSFUL";
        attempt.paymentId = "mock_payment_" + attempt.id;
      } else attempt.status = "FAILED";
    }
    attempt.updatedAt = new Date().toISOString();
    attempt.eventIds.push(op.eventId);
    b.updatedAt = attempt.updatedAt;
    b.history.push({
      at: b.updatedAt,
      actor: "customer",
      message: `DEVELOPMENT payment simulation: ${attempt.status}. No money moved; booking status is unchanged.`,
    });
    queueCabEmail(
      state,
      b,
      attempt.status === "FAILED" ? "payment-failure" : "payment-success",
    );
    return attempt;
  });
}
export function validatePreparedRazorpayCallback(input: unknown) {
  const p = z
    .object({
      orderId: z.string().min(1),
      paymentId: z.string().min(1),
      signature: z.string(),
    })
    .parse(input);
  if (
    !verifyRazorpaySignature(
      p.orderId,
      p.paymentId,
      p.signature,
      process.env.RAZORPAY_KEY_SECRET || "",
    )
  )
    throw new CabError("Invalid payment signature.", 401);
  // Signature alone does not establish capture/amount/currency or durable idempotency.
  throw new CabError(
    "Razorpay settlement is intentionally disabled until persistent storage is implemented. No payment was recorded.",
    503,
  );
}
export function validatePreparedRazorpayWebhook(
  rawBody: string,
  signature: string,
) {
  if (
    !verifyRazorpayWebhook(
      rawBody,
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET || "",
    )
  )
    throw new CabError("Invalid webhook signature.", 401);
  throw new CabError(
    "Verified webhook not processed: persistent transaction handling is not enabled.",
    503,
  );
}
