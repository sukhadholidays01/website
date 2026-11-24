"use client";
import { useToastFeedback } from "@/components/notifications/ToastProvider";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
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
import { CabTracking } from "./CabTracking";
import { GuestBookingAccess } from "./GuestBookingAccess";
import { GuestCommercial } from "./CabCommercial";
import { GuestDocuments } from "./GuestDocuments";
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
export function CabBookingStatus({id}:{id:string}) { return <GuestBookingAccess id={id}>{access=><BookingStatusContent key={access.assurance} id={id} assurance={access.assurance} privateLink={access.privateLink}/>}</GuestBookingAccess>; }
function BookingStatusContent({id,assurance,privateLink}:{id:string;assurance:"link"|"otp";privateLink:string}) {
  const verified = true;
  const token = useSyncExternalStore(subscribeHash, accessSnapshot, () => "");
  const [booking, setBooking] = useState<PublicCabBooking>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useToastFeedback(error, message, "info");
  const [accepted, setAccepted] = useState(false);
  const [cancel, setCancel] = useState(false);
  const currentStatus = booking?.status;
  useEffect(() => {
    if ((!verified && !token) || !currentStatus || ["COMPLETED", "CANCELLED"].includes(currentStatus)) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      if (document.hidden) return;
      void cabApi<{ booking: PublicCabBooking }>("bookings/" + id, { token, signal: controller.signal }).then(data => { if (!controller.signal.aborted) setBooking(data.booking); }).catch(() => {});
    }, 15000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [id, token, currentStatus, verified]);
  const load = useCallback(async () => {
    if (!verified && !token) return;
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
  }, [id, token, verified]);
  useEffect(() => {
    if (!verified && !token) return;
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
  }, [id, token, verified]);
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
    (!verified && !token
      ? "Open the complete private booking link, including its access code."
      : "");
  return (
    <div className="cab-live cb-receipt">
      <div className="cb-container">
        <div className="cb-status-top">
          <Link href="/cabs" className="cb-text-link">
            ← Plan another journey
          </Link>
          <button
            className="cb-btn"
            disabled={busy}
            onClick={() => void load()}
          >
            <RefreshCw size={15} />
            Refresh status
          </button>
        </div>
        <p className="cb-callout">
          {booking?.development ? (
            <>
              <strong>Development record.</strong> This record is labelled for development;
              it does not establish a live booking or payment.
            </>
          ) : (
            <>
              <strong>Booking status.</strong>{" "}
              {!booking ? "Checking the latest booking status…" : booking.status === "CANCELLED"
                ? "This booking is cancelled. Refunds and balances are reviewed separately."
                : booking.status === "COMPLETED"
                  ? "This journey is complete. Payment balances remain tracked separately."
                  : ["CONFIRMED", "ASSIGNED", "IN_PROGRESS"].includes(booking.status)
                    ? "Operations has confirmed this booking. Payment collection, assignment and journey progress are tracked separately."
                    : "Your request is pending confirmation. Operations must confirm the accepted quotation and availability before payment arrangements become available."}
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
                disabled={!privateLink}
                onClick={async () => {
                  try {
                    if (!privateLink) throw Error("Use mobile verification to request a replacement private link.");
                    await navigator.clipboard.writeText(privateLink);
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
                    {["round-trip", "multi-day"].includes(booking.journey.tripType) && (
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
                  {booking.journey.itinerary && <section aria-label="Travel itinerary"><h3>Multi-day itinerary</h3><ol>{booking.journey.itinerary.stops.map((stop,index)=><li key={index}>{stop.place.label}{stop.overnight ? " · Overnight stay" : ""}{stop.notes ? " · "+stop.notes : ""}</li>)}</ol>{booking.journey.itinerary.requirements && <p>{booking.journey.itinerary.requirements}</p>}</section>}
                  {assurance==="otp"?<FareDetails fare={booking.fare}/>:<p className="cb-callout">Verify your registered mobile to review quotations, acceptance actions and payment details.</p>}
                  {assurance === "otp" && <GuestCommercial key={booking.updatedAt} bookingId={booking.id}/>}
                  {assurance === "otp" && booking.status === "QUOTED" && (
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
                  {assurance === "otp" ? <><h3 className="cb-subtitle">Payment summary</h3>
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
                      : "Verified online payments and approved offline receipts appear here. Booking status and payment status are tracked separately."}
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
                  </> : <p className="cb-callout">Verify your mobile above to review payment details, accept quotations or change this request.</p>}
                  {assurance === "otp" && ["REQUESTED", "QUOTED", "ACCEPTED"].includes(
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
                {assurance === "otp" && <GuestDocuments bookingId={id}/>}
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
                <CabTracking booking={booking} token={token} />
                <div className="cb-route-info">
                  <ShieldCheck size={24} />
                  <h3>Keep your booking link safe.</h3>
                  <p className="cb-note">
                    This private link shows journey updates. Mobile verification protects quotation and payment details.
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
