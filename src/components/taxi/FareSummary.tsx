"use client";
import { useReducedMotionPreference } from "@/lib/useReducedMotionPreference";
import { AnimatedAmount } from "@/components/motion/TravelMotion";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { TaxiBookingRequest, TaxiFareBreakdown, Vehicle } from "@/types";
export const cabCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
export function FareSummary({
  booking,
  vehicle,
  fare,
  onContinue,
  preview = false,
}: {
  booking: TaxiBookingRequest;
  vehicle: Vehicle;
  fare?: TaxiFareBreakdown;
  onContinue: () => void;
  preview?: boolean;
}) {
  const reduced = useReducedMotionPreference();
  return (
    <motion.aside
      id="cab-fare"
      className="cab-fare"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.3 }}
      aria-labelledby="cab-fare-title"
    >
      <p className="cab-eyebrow">Your journey</p>
      <h2 id="cab-fare-title">Every detail, clear.</h2>
      <div className="cab-mini-route">
        <strong>● {booking.pickup}</strong>
        <span />
        <strong>● {booking.destination}</strong>
      </div>
      <p className="cab-fare-details">
        {vehicle.name} ·{" "}
        {booking.tripType === "one-way" ? "One Way" : "Round Trip"}
        <br />
        {booking.passengers}{" "}
        {booking.passengers === 1 ? "Passenger" : "Passengers"} ·{" "}
        {booking.travelDate ? new Date(`${booking.travelDate}T00:00:00`).toLocaleDateString(
          "en-IN",
          { day: "numeric", month: "short" },
        ) : "Choose your date"}
      </p>
      {fare ? (
        <>
          <dl>
            <div>
              <dt>
                Distance <small>DEMO</small>
              </dt>
              <dd>
                {fare.distanceKm} km
                {booking.tripType === "round-trip" ? " total" : ""}
              </dd>
            </div>
            <div>
              <dt>Base fare</dt>
              <dd>{cabCurrency(fare.baseFare)}</dd>
            </div>
            <div>
              <dt>
                Vehicle charge <small>{cabCurrency(fare.pricePerKm)}/km</small>
              </dt>
              <dd>{cabCurrency(fare.distanceCharge)}</dd>
            </div>
            {fare.extraCharges.map((c) => (
              <div key={c.label}>
                <dt>{c.label}</dt>
                <dd>{cabCurrency(c.amount)}</dd>
              </div>
            ))}
          </dl>
          <div className="cab-fare-total">
            <span>
              Estimated fare<strong><AnimatedAmount value={fare.totalFare} format={cabCurrency} /></strong>
            </span>
            <small>Demo estimate</small>
          </div>
        </>
      ) : (
        <p className="cab-unpriced">
          The team will confirm the fare for this route. No demo distance is
          configured.
        </p>
      )}
      <p className="cab-fare-note">
        Demo route data. Final fare and vehicle availability to be confirmed.
      </p>
      {!preview && <><button className="cab-button" type="button" disabled={!!vehicle.seatingCapacity && booking.passengers > vehicle.seatingCapacity} onClick={onContinue}>
        Continue to Enquiry
        <ArrowRight size={18} />
      </button>
      <div className="cab-sticky">
        <div>
          <small>{vehicle.name} · Estimated fare</small>
          <strong>{fare ? cabCurrency(fare.totalFare) : "On request"}</strong>
        </div>
        <button className="cab-button" type="button" disabled={!!vehicle.seatingCapacity && booking.passengers > vehicle.seatingCapacity} onClick={onContinue}>
          Continue
          <ArrowRight size={18} />
        </button>
      </div></>}
      {!!vehicle.seatingCapacity && booking.passengers > vehicle.seatingCapacity && <p className="cab-error" role="alert">Choose a vehicle with room for {booking.passengers} passengers. This category seats {vehicle.seatingCapacity}.</p>}
    </motion.aside>
  );
}
