"use client";
import { useToastFeedback, useToast } from "@/components/notifications/ToastProvider";
import { useCallback, useEffect, useState } from "react";
import { cabApi } from "@/lib/cab/client";
import { cabMoney } from "@/lib/cab/types";
import type { CabSettings, PaymentAttempt } from "@/lib/cab/models";
type CheckoutResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type Checkout = { open: () => void; on: (event: string, callback: () => void) => void };
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => Checkout } }
type PaymentData = { advance?:{status:string;advance?:{amount:number;remaining:number;deadline?:string}}; attempts: PaymentAttempt[]; configuration: { enabled: boolean; mode: string }; policy: NonNullable<CabSettings["payments"]>; balance: { paid: number; due: number | null } };
let checkoutScript: Promise<void> | undefined;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return checkoutScript ||= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.async = true;
    script.onload = () => resolve(); script.onerror = () => { checkoutScript = undefined; script.remove(); reject(Error("Checkout could not load. Please retry.")); }; document.head.appendChild(script);
  });
}
export function CabPaymentPanel({ bookingId, token, onUpdate }: { bookingId: string; token: string; onUpdate: () => Promise<void> }) {
  const { notify } = useToast();
  const [data, setData] = useState<PaymentData>();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  useToastFeedback("", message, "info");
  const load = useCallback(async () => setData(await cabApi<PaymentData>("payments/bookings/" + bookingId, { token })), [bookingId, token]);
  useEffect(() => { let active = true; void cabApi<PaymentData>("payments/bookings/" + bookingId, { token }).then(d => { if (active) setData(d); }).catch(e => { if (active) setMessage(e.message); }); return () => { active = false; }; }, [bookingId, token]);
  async function pay(option: "full" | "advance" | "pay-later") {
    setBusy(true); setMessage("");
    try {
      if (option === "pay-later") { await cabApi("payments/bookings/" + bookingId + "/pay-later", { method: "POST", token, body: {} }); setMessage("Pay later selected under the current booking policy. The balance remains payable."); await onUpdate(); return; }
      await loadCheckout();
      const result = await cabApi<{ attempt: PaymentAttempt; keyId: string; mode: string }>("payments/bookings/" + bookingId, { method: "POST", token, body: { option } });
      if (!window.Razorpay || !result.keyId) throw Error("Online checkout is unavailable.");
      const checkout = new window.Razorpay({ key: result.keyId, order_id: result.attempt.orderId, amount: result.attempt.amountPaise, currency: "INR", name: "Sukhad Holidays", description: "Cab booking " + bookingId, theme: { color: "#0b3766" }, modal: { ondismiss: () => { setBusy(false); setMessage("Checkout closed. No success is assumed; pending payments will be reconciled."); void load(); } }, handler: async (p: CheckoutResult) => {
        try { const response = await cabApi<{ attempt: PaymentAttempt }>("payments/razorpay/verify", { method: "POST", token, body: { bookingId, orderId: p.razorpay_order_id, paymentId: p.razorpay_payment_id, signature: p.razorpay_signature } }); setMessage(response.attempt.status === "SUCCESSFUL" ? "Payment captured and verified. Your balance has been updated." : "Payment is pending capture or reconciliation. Please do not pay again."); await load(); await onUpdate(); }
        catch (e) { setMessage((e as Error).message + " Do not pay again until the existing order has been checked."); }
        finally { setBusy(false); }
      } });
      checkout.on("payment.failed", () => { notify({kind:"error",title:"Payment failed",description:"Check the existing order before trying again."}); setMessage("Payment failed. Retry within the same checkout, or contact operations to reconcile the order."); void load(); });
      checkout.open();
    } catch (e) { setMessage((e as Error).message); setBusy(false); }
    finally { if (option === "pay-later") setBusy(false); }
  }
  return <section className="cb-payment-checkout"><h3>Payment options</h3>{message && <p className="cb-callout" role="status">{message}</p>}{!data ? <p role="status">Loading authorised payment options…</p> : <>
    <p>Outstanding balance: <strong>{data.balance.due === null ? "Awaiting final fare" : cabMoney(data.balance.due)}</strong></p>
    {data.advance?.advance&&<p>Requested advance: <strong>{cabMoney(data.advance.advance.amount)}</strong> ? Advance remaining {cabMoney(data.advance.advance.remaining)} ? {data.advance.status.replaceAll("_"," ")}{data.advance.advance.deadline?" ? Deadline "+new Date(data.advance.advance.deadline).toLocaleString("en-IN"):""}</p>}
    {data.configuration.mode === "test" && <p className="cb-callout">Razorpay TEST MODE · use test payment details only.</p>}
    {!data.configuration.enabled && <p className="cb-note">Online payments are not enabled. Contact operations about approved payment arrangements.</p>}
    <div className="cb-actions">{data.policy.full && <button className="cb-btn cb-primary" disabled={busy || !data.configuration.enabled || !data.balance.due} onClick={() => void pay("full")}>Pay outstanding amount</button>}{data.policy.advance && <button className="cb-btn" disabled={busy || !data.configuration.enabled || !data.balance.due || Boolean(data.advance&&["CONFIGURED","EXPIRED","CANCELLED","ADVANCE_PAID","REFUNDED"].includes(data.advance.status))} onClick={() => void pay("advance")}>Pay advance ({data.policy.advanceType === "percent" ? data.policy.advanceValue + "% of fare" : cabMoney(data.policy.advanceValue)})</button>}{data.policy.payLater && <button className="cb-btn" disabled={busy || !data.balance.due} onClick={() => void pay("pay-later")}>Choose pay later</button>}</div>
    <p className="cb-note">Amounts are validated by the server. A checkout confirmation is recorded only after capture and amount reconciliation.</p>
    {data.attempts.map(a => <div className="cb-payment-attempt" key={a.id}><span className="cb-status-badge">{a.status.replaceAll("_", " ")}</span><p>{cabMoney(a.amount)} · {a.provider}</p><small>{new Date(a.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</small></div>)}
  </>}</section>;
}
