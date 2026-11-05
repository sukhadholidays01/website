"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Check, Copy, RefreshCw, ShieldCheck } from "lucide-react";
import { cabApi } from "@/lib/cab/client";
import {
  cabBalance,
  cabMoney,
  tripLabels,
  type CabStatus,
  type PublicCabBooking,
} from "@/lib/cab/types";
import { FareDetails } from "./CabBookingFlow";
import "./cab-live.css";
import { CabPaymentPanel } from "./CabPaymentPanel";
const CabMap = dynamic(() => import("./CabMap").then((m) => m.CabMap), {
  ssr: false,
});
const subscribeHash = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
const accessSnapshot = () =>
  new URLSearchParams(window.location.hash.slice(1)).get("access") || "";
const statusText: Record<CabStatus, { title: string; description: string }> = {
  REQUESTED: {
    title: "Your request is received.",
    description:
      "The cab team will contact you to confirm the fare and vehicle availability. Your ride is pending review. Keep your private booking link.",
  },
  QUOTED: {
    title: "Your quote is ready.",
    description:
      "Review the fare, inclusions and exclusions below. Accept it to ask the team to confirm availability.",
  },
  ACCEPTED: {
    title: "Quote accepted. Thank you.",
    description:
      "Your team is checking availability. This booking is awaiting confirmation.",
  },
  CONFIRMED: {
    title: "Your ride is confirmed.",
    description:
      "Cab operations has confirmed availability. Driver and vehicle details will appear here once assigned.",
  },
  ASSIGNED: {
    title: "Meet your driver.",
    description:
      "Your driver and vehicle have been assigned. Check your pickup details below.",
  },
  IN_PROGRESS: {
    title: "You’re on your way.",
    description: "Your journey has started. Have a comfortable trip.",
  },
  COMPLETED: {
    title: "Thank you for travelling with us.",
    description:
      "Your trip is complete. Your payment summary remains available below.",
  },
  CANCELLED: {
    title: "This booking is cancelled.",
    description:
      "Cancellation does not automatically refund a payment. Contact operations about any outstanding refund.",
  },
};
export function CabBookingStatus({ id }: { id: string }) {
  const token = useSyncExternalStore(subscribeHash, accessSnapshot, () => "");
  const [booking, setBooking] = useState<PublicCabBooking>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [cancel, setCancel] = useState(false);
  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const data = await cabApi<{ booking: PublicCabBooking }>(
        "bookings/" + id,
        { token },
      );
      setBooking(data.booking);
      setAccepted(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [id, token]);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void cabApi<{ booking: PublicCabBooking }>("bookings/" + id, {
      token,
      signal: controller.signal,
    })
      .then((data) => {
        setBooking(data.booking);
        setAccepted(false);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id, token]);
  async function act(action: string) {
    if (!booking) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await cabApi<{ booking: PublicCabBooking }>(
        "bookings/" + id,
        {
          method: "PATCH",
          token,
          body: { action, version: booking.fare.version },
        },
      );
      setBooking(data.booking);
      setAccepted(false);
      setCancel(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const balance = booking ? cabBalance(booking) : null;
  const visibleError =
    error ||
    (!token
      ? "Open the complete private booking link, including its access code."
      : "");
  return (
    <div className="cab-live">
      <div className="cb-container">
        <div className="cb-status-top">
          <Link href="/cabs" className="cb-text-link">
            ← Plan another journey
          </Link>
          <button
            className="cb-btn"
            disabled={busy || !token}
            onClick={() => void load()}
          >
            <RefreshCw size={15} />
            Refresh status
          </button>
        </div>
        <p className="cb-callout">
          {booking?.development ? (
            <>
              <strong>Development preview.</strong> This request is temporary
              mock data and resets when the development server restarts.
            </>
          ) : (
            <>
              <strong>Request status.</strong> This is not a confirmed ride.
              Operations must confirm the fare and availability. No online
              payment is collected.
            </>
          )}
        </p>
        {visibleError && (
          <div className="cb-alert" role="alert">
            {visibleError}
          </div>
        )}
        {!booking && !error && <p role="status">Opening your booking…</p>}
        {booking && (
          <>
            <header className="cb-status-hero">
              <span className="cb-success-icon">
                <Check size={28} />
              </span>
              <p className="cb-eyebrow">
                {booking.status === "REQUESTED" ? "Pending Review" : booking.status.replaceAll("_", " ")}
              </p>
              <h1>{statusText[booking.status].title}</h1>
              <p>{statusText[booking.status].description}</p>
              <div className="cb-reference">{booking.id}</div>
              <button
                className="cb-btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setMessage(
                      "Private booking link copied. Keep it safe; anyone with this link can view this request.",
                    );
                  } catch {
                    setMessage(
                      "Copy the full address from your browser to save this booking link.",
                    );
                  }
                }}
              >
                <Copy size={15} />
                Copy private booking link
              </button>
              {message && (
                <p role="status" className="cb-note">
                  {message}
                </p>
              )}
            </header>
            <div className="cb-layout">
              <div>
                <section className="cb-main-card">
                  <div className="cb-section-top">
                    <p className="cb-eyebrow">YOUR BOOKING</p>
                    <h2>
                      {booking.journey.origin.label} →{" "}
                      {booking.journey.destination.label}
                    </h2>
                    <p>
                      {tripLabels[booking.journey.tripType]} ·{" "}
                      {booking.journey.vehicle.replaceAll("-", " ")} ·{" "}
                      {booking.journey.passengers} passenger(s)
                    </p>
                  </div>
                  <dl className="cb-details">
                    <div>
                      <dt>Pickup · India time</dt>
                      <dd>{booking.journey.departure.replace("T", " at ")}</dd>
                    </div>
                    {booking.journey.tripType === "round-trip" && (
                      <div>
                        <dt>Return arrival · India time</dt>
                        <dd>
                          {booking.journey.returnAt?.replace("T", " at ")}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>Pickup address</dt>
                      <dd>{booking.journey.pickupAddress}</dd>
                    </div>
                    <div>
                      <dt>Drop address</dt>
                      <dd>{booking.journey.dropAddress}</dd>
                    </div>
                    {booking.journey.flightNumber && (
                      <div>
                        <dt>Flight</dt>
                        <dd>{booking.journey.flightNumber}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Traveller</dt>
                      <dd>
                        {booking.customer.name} · {booking.customer.phone}
                      </dd>
                    </div>
                  </dl>
                  <FareDetails fare={booking.fare} />
                  {booking.status === "QUOTED" && (
                    <div className="cb-quote-accept">
                      <label className="cb-consent">
                        <input
                          type="checkbox"
                          checked={accepted}
                          onChange={(e) => setAccepted(e.target.checked)}
                        />
                        <span>
                          I accept this final quote, including the stated
                          inclusions and exclusions. I understand that
                          operations must still confirm availability.
                        </span>
                      </label>
                      <button
                        className="cb-btn cb-primary"
                        disabled={!accepted || busy}
                        onClick={() => void act("accept")}
                      >
                        Accept quote & request confirmation
                      </button>
                    </div>
                  )}
                  {booking.assignment && (
                    <div className="cb-driver">
                      <p className="cb-eyebrow">YOUR DRIVER & VEHICLE</p>
                      <h3>{booking.assignment.driver}</h3>
                      <a href={"tel:" + booking.assignment.phone}>
                        {booking.assignment.phone}
                      </a>
                      <p>{booking.assignment.vehicle}</p>
                    </div>
                  )}
                  <h3 className="cb-subtitle">Payment summary</h3>
                  <div className="cb-payment-grid">
                    <div>
                      <span>Agreed total</span>
                      <strong>
                        {booking.fare.total === null
                          ? "Awaiting quote"
                          : cabMoney(booking.fare.total)}
                      </strong>
                    </div>
                    <div>
                      <span>Net received</span>
                      <strong>{cabMoney(balance!.paid)}</strong>
                    </div>
                    <div>
                      <span>Balance due</span>
                      <strong>
                        {balance!.due === null ? "—" : cabMoney(balance!.due)}
                      </strong>
                    </div>
                  </div>
                  <p className="cb-note">
                    {booking.development
                      ? "This development summary includes manual test records and simulated payments/refunds. No money moves in the development flow."
                      : "Payments are not collected online. Any payment or refund shown here must be confirmed directly with Sukhad Holidays."}
                  </p>
                  {[
                    "CONFIRMED",
                    "ASSIGNED",
                    "IN_PROGRESS",
                    "COMPLETED",
                  ].includes(booking.status) && (
                    <CabPaymentPanel
                      bookingId={booking.id}
                      token={token}
                      onUpdate={load}
                    />
                  )}
                  {booking.payments.length > 0 && (
                    <div className="cb-payment-list">
                      {booking.payments.map((p) => (
                        <div key={p.id}>
                          <strong>
                            {p.type === "refund" ? "Refund" : "Receipt"} ·{" "}
                            {cabMoney(p.amount)}
                          </strong>
                          <span>
                            {p.method} · {p.reference} ·{" "}
                            {new Date(p.at).toLocaleDateString("en-IN", {
                              timeZone: "Asia/Kolkata",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {["REQUESTED", "QUOTED", "ACCEPTED"].includes(
                    booking.status,
                  ) && (
                    <div className="cb-cancel">
                      {!cancel ? (
                        <button
                          className="cb-text-link"
                          onClick={() => setCancel(true)}
                        >
                          Cancel this request
                        </button>
                      ) : (
                        <>
                          <p>Cancel this booking request?</p>
                          <div className="cb-actions">
                            <button
                              className="cb-btn"
                              disabled={busy}
                              onClick={() => setCancel(false)}
                            >
                              Keep request
                            </button>
                            <button
                              className="cb-btn cb-danger"
                              disabled={busy}
                              onClick={() => void act("cancel")}
                            >
                              Yes, cancel request
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </section>
                <section className="cb-main-card cb-history">
                  <h2>Journey updates</h2>
                  <ol>
                    {[...booking.history].reverse().map((h, i) => (
                      <li key={i}>
                        <span />
                        <div>
                          <p>{h.message}</p>
                          <small>
                            {new Date(h.at).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                            })}{" "}
                            IST · {h.actor}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
              <aside className="cb-aside">
                <CabMap
                  origin={booking.journey.origin}
                  destination={booking.journey.destination}
                  route={booking.route}
                />
                <div className="cb-route-info">
                  <ShieldCheck size={24} />
                  <h3>Keep your booking link safe.</h3>
                  <p className="cb-note">
                    This private link gives access to your journey and quote.
                    Save it yourself.                     Email templates and delivery previews are available to
                    operations; messages are not sent unless delivery is
                    explicitly configured.
                  </p>
                  <p className="cb-note">
                    Refresh this page to see the latest quote, driver details
                    and payment records.
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
