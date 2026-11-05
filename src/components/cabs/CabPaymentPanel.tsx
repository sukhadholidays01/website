"use client";
import { useCallback, useEffect, useState } from "react";
import { cabApi } from "@/lib/cab/client";
import { cabMoney } from "@/lib/cab/types";
import type { PaymentAttempt } from "@/lib/cab/models";
export function CabPaymentPanel({
  bookingId,
  token,
  onUpdate,
}: {
  bookingId: string;
  token: string;
  onUpdate: () => Promise<void>;
}) {
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const data = await cabApi<{ attempts: PaymentAttempt[] }>(
      "payments/bookings/" + bookingId,
      { token },
    );
    setAttempts(data.attempts);
  }, [bookingId, token]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    void cabApi<{ attempts: PaymentAttempt[] }>(
      "payments/bookings/" + bookingId,
      { token },
    )
      .then((data) => {
        if (active) setAttempts(data.attempts);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [bookingId, token]);
  async function start() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await cabApi("payments/bookings/" + bookingId, {
        method: "POST",
        token,
        body: { action: "initiate" },
      });
      await load();
      setMessage(
        "Development payment order created. Choose a simulated result below. No payment details are collected.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function simulate(
    attempt: PaymentAttempt,
    result: "success" | "failure" | "refund",
  ) {
    setBusy(true);
    setError("");
    try {
      await cabApi("payments/bookings/" + bookingId, {
        method: "PATCH",
        token,
        body: { attemptId: attempt.id, result, eventId: crypto.randomUUID() },
      });
      await load();
      await onUpdate();
      setMessage(
        `Development ${result} recorded. No money moved; your booking status was not automatically changed.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="cb-mock-payment">
      <h3>Development payment checkout</h3>
      <p className="cb-callout">
        MOCK MODE — no Razorpay checkout, real charge, card information or
        banking credentials. Use this to review payment states while hosting and
        persistence are undecided.
      </p>
      {error && (
        <p role="alert" className="cb-alert">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="cb-message">
          {message}
        </p>
      )}
      <button
        className="cb-btn cb-primary"
        disabled={busy}
        onClick={() => void start()}
      >
        Start development payment
      </button>
      {attempts.map((attempt) => (
        <div className="cb-payment-attempt" key={attempt.id}>
          <span className="cb-status-badge">{attempt.status} · MOCK</span>
          <p>
            {cabMoney(attempt.amount)} · {attempt.orderId}
          </p>
          <div className="cb-actions">
            {attempt.status === "PENDING" && (
              <>
                <button
                  className="cb-btn"
                  disabled={busy}
                  onClick={() => void simulate(attempt, "success")}
                >
                  Simulate successful payment
                </button>
                <button
                  className="cb-btn"
                  disabled={busy}
                  onClick={() => void simulate(attempt, "failure")}
                >
                  Simulate failed payment
                </button>
              </>
            )}
            {attempt.status === "SUCCESSFUL" && (
              <button
                className="cb-btn"
                disabled={busy}
                onClick={() => void simulate(attempt, "refund")}
              >
                Simulate refund
              </button>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
