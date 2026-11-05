"use client";
import { useState } from "react";
import {
  cabBalance,
  cabMoney,
  tripLabels,
  type PublicCabBooking,
} from "@/lib/cab/types";
import type { CabOperationsData } from "@/lib/cab/models";
import { FareDetails } from "./CabBookingFlow";
import "./cab-live.css";
const fields = (form: HTMLFormElement) =>
  Object.fromEntries(new FormData(form));
export function BookingOperations({
  booking: b,
  run,
  busy,
  operations,
}: {
  booking: PublicCabBooking;
  run: (action: unknown) => Promise<void>;
  busy: boolean;
  operations: CabOperationsData;
}) {
  const balance = cabBalance(b);
  const [tab, setTab] = useState<"quote" | "assignment" | "payment" | "cancel">(
    "quote",
  );
  const [paymentType, setPaymentType] = useState("receipt");
  const preConfirmation = ["REQUESTED", "QUOTED", "ACCEPTED"].includes(
    b.status,
  );
  return (
    <div className="cb-operation-detail">
      <div className="cb-op-detail-heading">
        <span className="cb-status-badge">{b.status.replaceAll("_", " ")}</span>
        <h2>
          {b.journey.origin.label} → {b.journey.destination.label}
        </h2>
        <p>{b.id}</p>
      </div>
      <dl className="cb-details">
        <div>
          <dt>Customer</dt>
          <dd>
            {b.customer.name}
            <br />
            <a href={"tel:" + b.customer.phone}>{b.customer.phone}</a>
            <br />
            {b.customer.email}
          </dd>
        </div>
        <div>
          <dt>Journey</dt>
          <dd>
            {tripLabels[b.journey.tripType]} · {b.journey.vehicle}
            <br />
            {b.journey.passengers} passenger(s)
            <br />
            {b.journey.departure.replace("T", " ")} IST
            {b.journey.tripType === "round-trip" && (
              <>
                <br />
                Return: {b.journey.returnAt?.replace("T", " ")} IST
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Exact pickup</dt>
          <dd>{b.journey.pickupAddress}</dd>
        </div>
        <div>
          <dt>Exact drop</dt>
          <dd>{b.journey.dropAddress}</dd>
        </div>
        <div>
          <dt>Flight / requirements</dt>
          <dd>
            {b.journey.flightNumber || "No flight number"}
            <br />
            {b.customer.notes || "No additional requirements"}
          </dd>
        </div>
        <div>
          <dt>Road distance</dt>
          <dd>
            {b.route
              ? `${b.route.distanceKm} km outward${b.route.returnDistanceKm !== undefined ? ` / ${b.route.returnDistanceKm} km return` : ""}`
              : "Not verified — check before quoting"}
          </dd>
        </div>
      </dl>
      <FareDetails fare={b.fare} />
      <div className="cb-payment-grid">
        <div>
          <span>Total</span>
          <strong>
            {b.fare.total === null ? "Awaiting quote" : cabMoney(b.fare.total)}
          </strong>
        </div>
        <div>
          <span>Net received</span>
          <strong>{cabMoney(balance.paid)}</strong>
        </div>
        <div>
          <span>Balance</span>
          <strong>{balance.due === null ? "—" : cabMoney(balance.due)}</strong>
        </div>
      </div>
      {b.assignment && (
        <p className="cb-callout">
          Assigned: {b.assignment.driver} · {b.assignment.phone} ·{" "}
          {b.assignment.vehicle}
        </p>
      )}
      <div className="cb-actions cb-op-lifecycle">
        {b.status === "ACCEPTED" && (
          <button
            className="cb-btn cb-primary"
            disabled={busy}
            onClick={() => void run({ action: "confirm" })}
          >
            Confirm availability & booking
          </button>
        )}
        {b.status === "ASSIGNED" && (
          <button
            className="cb-btn cb-primary"
            disabled={busy}
            onClick={() => void run({ action: "start" })}
          >
            Start trip
          </button>
        )}
        {b.status === "IN_PROGRESS" && (
          <button
            className="cb-btn cb-primary"
            disabled={busy}
            onClick={() => void run({ action: "complete" })}
          >
            Complete trip
          </button>
        )}
      </div>
      <div className="cb-tabs">
        {(["quote", "assignment", "payment", "cancel"] as const).map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t === "quote"
              ? "Issue quote"
              : t === "assignment"
                ? "Assign ride"
                : t === "payment"
                  ? "Record payment"
                  : "Cancellation"}
          </button>
        ))}
      </div>
      {tab === "quote" &&
        (preConfirmation ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = fields(e.currentTarget);
              void run({
                action: "quote",
                amount: Number(f.amount),
                inclusions: f.inclusions,
                exclusions: f.exclusions,
              });
            }}
          >
            <p className="cb-note">
              Issue the final total after checking addresses, availability and
              extras. Reissuing a quote clears previous acceptance. Ask the
              customer to refresh their private booking page.
            </p>
            <div className="cb-fields">
              <label className="cb-full">
                <span>Final total · INR</span>
                <input
                  type="number"
                  name="amount"
                  min="0.01"
                  step="0.01"
                  max="10000000"
                  required
                  defaultValue={b.fare.total ?? ""}
                />
              </label>
              <label>
                <span>Included in total</span>
                <textarea
                  name="inclusions"
                  minLength={3}
                  maxLength={500}
                  required
                  defaultValue={b.fare.total === null ? "" : b.fare.inclusions}
                />
              </label>
              <label>
                <span>Extra / excluded charges</span>
                <textarea
                  name="exclusions"
                  minLength={3}
                  maxLength={500}
                  required
                  defaultValue={b.fare.total === null ? "" : b.fare.exclusions}
                />
              </label>
            </div>
            <button className="cb-btn cb-primary" disabled={busy}>
              Send quote to booking page
            </button>
          </form>
        ) : (
          <p className="cb-note">
            Quotes can be issued before confirmation. Confirmed fares remain
            fixed.
          </p>
        ))}
      {tab === "assignment" &&
        (["CONFIRMED", "ASSIGNED"].includes(b.status) ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = fields(e.currentTarget);
              void run({
                action: "assign",
                driverId: f.driverId,
                vehicleId: f.vehicleId,
              });
            }}
          >
            <p className="cb-note">
              Verify the vehicle category, capacity and luggage space.
              Overlapping driver/vehicle assignments are checked against this
              cab system.
            </p>
            <div className="cb-fields">
              <label>
                <span>Registered driver</span>
                <select
                  name="driverId"
                  required
                  defaultValue={b.assignment?.driverId || ""}
                >
                  <option value="">Select an approved on-duty driver</option>
                  {operations.drivers.map((d) => (
                    <option
                      key={d.id}
                      value={d.id}
                      disabled={
                        !d.active ||
                        !d.approved ||
                        d.availability !== "available"
                      }
                    >
                      {d.name} · {d.approved ? "approved" : "unverified"} ·{" "}
                      {d.availability}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Assignment checks</span>
                <p className="cb-note">
                  Category, capacity, route restrictions, approval, duty status,
                  booking overlap and turnaround buffer are checked on the
                  server.
                </p>
              </label>
              <label className="cb-full">
                <span>Registered vehicle</span>
                <select
                  name="vehicleId"
                  required
                  defaultValue={b.assignment?.vehicleId || ""}
                >
                  <option value="">
                    Select a compatible registered vehicle
                  </option>
                  {operations.vehicles.map((v) => (
                    <option
                      key={v.id}
                      value={v.id}
                      disabled={
                        !v.active ||
                        v.availability !== "available" ||
                        v.category !== b.journey.vehicle ||
                        v.seats < b.journey.passengers
                      }
                    >
                      {v.name} · {v.registration} · {v.seats} seats ·{" "}
                      {v.availability}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="cb-btn cb-primary" disabled={busy}>
              Save assignment
            </button>
          </form>
        ) : (
          <p className="cb-note">
            Confirm the accepted booking before assigning a driver.
          </p>
        ))}
      {tab === "payment" && (
        <>
          <p className="cb-callout">
            Manual accounting only. Record a payment or refund you have already
            verified. This does not move money or call a payment gateway.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = fields(e.currentTarget);
              void run({
                action: "payment",
                amount: Number(f.amount),
                type: f.type,
                method: f.method,
                reference: f.reference,
                note: f.note,
              });
            }}
          >
            <div className="cb-fields">
              <label>
                <span>Entry type</span>
                <select
                  name="type"
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                >
                  <option value="receipt">Receipt</option>
                  <option value="refund">Refund</option>
                </select>
              </label>
              <label>
                <span>Amount · INR</span>
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={
                    paymentType === "refund" ? balance.paid : (balance.due ?? 0)
                  }
                  required
                />
              </label>
              <label>
                <span>Payment method</span>
                <select name="method">
                  <option>Cash</option>
                  <option>Bank transfer</option>
                  <option>UPI</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                <span>Unique receipt / transaction reference</span>
                <input
                  name="reference"
                  required
                  minLength={3}
                  maxLength={100}
                />
              </label>
              <label className="cb-full">
                <span>Verification note</span>
                <textarea name="note" required minLength={3} maxLength={500} />
              </label>
            </div>
            <button
              className="cb-btn cb-primary"
              disabled={
                busy ||
                (paymentType === "receipt"
                  ? ![
                      "CONFIRMED",
                      "ASSIGNED",
                      "IN_PROGRESS",
                      "COMPLETED",
                    ].includes(b.status)
                  : balance.paid <= 0)
              }
            >
              Record verified {paymentType}
            </button>
          </form>
          <div className="cb-payment-list">
            {b.payments.map((p) => (
              <div key={p.id}>
                <strong>
                  {p.type} · {cabMoney(p.amount)} · {p.method}
                </strong>
                <span>
                  {p.reference} · {p.note}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {tab === "cancel" &&
        (!["CANCELLED", "COMPLETED", "IN_PROGRESS"].includes(b.status) ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = fields(e.currentTarget);
              void run({ action: "cancel", reason: f.reason });
            }}
          >
            <p className="cb-note">
              Cancellation releases this assignment. It does not create a
              refund. Record any verified refund separately.
            </p>
            <label>
              <span>Cancellation reason</span>
              <textarea name="reason" required minLength={5} maxLength={500} />
            </label>
            <button className="cb-btn cb-danger" disabled={busy}>
              Confirm cancellation
            </button>
          </form>
        ) : (
          <p className="cb-note">
            Cancellation is unavailable for this booking status.
          </p>
        ))}
      <section className="cb-history">
        <h3>Activity history</h3>
        <ol>
          {[...b.history].reverse().map((h, i) => (
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
  );
}
