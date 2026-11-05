"use client";
import { useReducedMotionPreference } from "@/lib/useReducedMotionPreference";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownUp, ArrowRight, Check, MapPin, Route } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { CabRouteAnimation } from "@/components/cabs/CabRouteAnimation";
import { FareSummary } from "./FareSummary";
import { VehicleSelector } from "./VehicleSelector";
import {
  getDemoTaxiRoute,
  taxiLocations,
  demoTaxiRoutes,
} from "@/data/taxiRoutes";
import { vehicles } from "@/data/vehicles";
import { calculateTaxiFare } from "@/lib/fareCalculator";
import { taxiBookingSchema } from "@/lib/taxiBookingValidation";
import {
  configuredWhatsAppPhone,
  createTaxiBookingMessage,
  createWhatsAppUrl,
} from "@/lib/whatsapp";
import type { TaxiBookingRequest } from "@/types";
const defaults: TaxiBookingRequest = {
  pickup: "Ayodhya",
  destination: "Varanasi",
  tripType: "one-way",
  travelDate: "",
  passengers: 2,
  vehicleId: vehicles[0].id,
};
type Step = "route" | "searching" | "vehicles" | "enquiry" | "success";
export function TaxiBookingForm() {
  const [step, setStep] = useState<Step>("route");
  const [confirmed, setConfirmed] = useState<TaxiBookingRequest>();
  const [reference, setReference] = useState("");
  const [contact, setContact] = useState({ name: "", mobile: "", email: "" });
  const [contactError, setContactError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotionPreference();
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<TaxiBookingRequest>({
    resolver: zodResolver(taxiBookingSchema),
    defaultValues: defaults,
    mode: "onChange",
  });
  const watched = useWatch({ control });
  const draft = { ...defaults, ...watched } as TaxiBookingRequest;
  const booking = step === "route" || step === "searching" ? draft : confirmed ?? draft;
  const vehicle =
    vehicles.find((v) => v.id === booking.vehicleId) ?? vehicles[0];
  const route = getDemoTaxiRoute(booking.pickup, booking.destination);
  const fare = route
    ? calculateTaxiFare({
        distanceKm: route.distanceKm,
        vehicle,
        tripType: booking.tripType,
      })
    : undefined;
  useEffect(() => {
    if (step !== "searching") return;
    const timer = setTimeout(() => setStep("vehicles"), reduced ? 100 : 1100);
    return () => clearTimeout(timer);
  }, [step, reduced]);
  const whatsappUrl =
    configuredWhatsAppPhone.replace(/\D/g, "") && confirmed
      ? createWhatsAppUrl(
          configuredWhatsAppPhone,
          `${createTaxiBookingMessage({ booking, vehicleName: vehicle.name, fare })}\nName: ${contact.name}\nMobile: ${contact.mobile}\nEmail: ${contact.email}\nDemo reference: ${reference}`,
        )
      : null;
  const today = new Date().toLocaleDateString("en-CA");
  return (
    <div className="cab-shell">
      <header className="cab-intro">
        <p className="cab-eyebrow">
          <Route size={18} /> Local roots. Open roads.
        </p>
        <h1>
          Take the <span>scenic route.</span>
        </h1>
        <p>
          Your journey starts with the road.
          <br className="sm:hidden" /> Let’s find your way.
        </p>
      </header>
      <ol className="cab-progress" aria-label="Cab enquiry progress">
        {["Route", "Your ride", "Enquiry"].map((s, i) => (
          <li
            key={s}
            aria-current={
              i ===
              (step === "route" || step === "searching"
                ? 0
                : step === "vehicles"
                  ? 1
                  : 2)
                ? "step"
                : undefined
            }
          >
            <span>0{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step === "searching" ? "route" : step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
          onAnimationComplete={() => heading.current?.focus()}
        >
          {(step === "route" || step === "searching") && (
            <div className="cab-search-layout">
              <section className="cab-console">
                <div className="cab-console-title">
                  <span className="cab-eyebrow">Start with a destination</span>
                  <span>Outstation cabs</span>
                </div>
                <form
                  noValidate
                  onSubmit={handleSubmit((values) => {
                    setConfirmed(values);
                    setStep("searching");
                  })}
                >
                  <fieldset disabled={step === "searching"}>
                    <legend className="sr-only">Plan your cab route</legend>
                    <div className="cab-locations">
                      {(["pickup", "destination"] as const).map(
                        (field, index) => (
                          <div key={field} className="cab-location-field">
                            <label htmlFor={field}>
                              <MapPin size={18} />
                              {index ? "Drop" : "Pickup"}
                            </label>
                            <select
                              id={field}
                              {...register(field)}
                              aria-invalid={!!errors[field]}
                              aria-describedby={
                                errors[field] ? `${field}-error` : undefined
                              }
                            >
                              {taxiLocations.map((location) => (
                                <option key={location}>{location}</option>
                              ))}
                            </select>
                            {errors[field] && (
                              <p
                                className="cab-error"
                                id={`${field}-error`}
                                role="alert"
                              >
                                {errors[field]?.message}
                              </p>
                            )}
                          </div>
                        ),
                      )}
                      <button
                        className="cab-swap"
                        type="button"
                        aria-label="Swap pickup and drop"
                        onClick={() => {
                          setValue("pickup", draft.destination, {
                            shouldValidate: true,
                          });
                          setValue("destination", draft.pickup, {
                            shouldValidate: true,
                          });
                        }}
                      >
                        <ArrowDownUp size={20} />
                      </button>
                    </div>
                    <div className="cab-search-details">
                      <fieldset className="cab-trip">
                        <legend>Trip type</legend>
                        <div>
                          {["one-way", "round-trip"].map((value) => (
                            <label key={value}>
                              <input
                                type="radio"
                                value={value}
                                {...register("tripType")}
                              />
                              <span>
                                {value === "one-way" ? "One Way" : "Round Trip"}
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <div className="cab-input">
                        <label htmlFor="travelDate">Travel date</label>
                        <input
                          id="travelDate"
                          type="date"
                          min={today}
                          {...register("travelDate")}
                          aria-invalid={!!errors.travelDate}
                          aria-describedby={
                            errors.travelDate ? "date-error" : undefined
                          }
                        />
                        {errors.travelDate && (
                          <p className="cab-error" id="date-error" role="alert">
                            {errors.travelDate.message}
                          </p>
                        )}
                      </div>
                      <div className="cab-input">
                        <label htmlFor="passengers">Passengers</label>
                        <input
                          id="passengers"
                          type="number"
                          min={1}
                          inputMode="numeric"
                          {...register("passengers", { valueAsNumber: true })}
                          aria-invalid={!!errors.passengers}
                          aria-describedby={
                            errors.passengers ? "passengers-error" : undefined
                          }
                        />
                        {errors.passengers && (
                          <p
                            className="cab-error"
                            id="passengers-error"
                            role="alert"
                          >
                            {errors.passengers.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="cab-search-bottom">
                      <span>One road. Your own pace.</span>
                      <button className="cab-button" type="submit">
                        {step === "searching"
                          ? "Finding your ride…"
                          : "Find a Cab"}
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </fieldset>
                </form>
              </section>
              <div className="cab-search-visual">
                <CabRouteAnimation
                  key={step}
                  pickup={step === "searching" ? booking.pickup : draft.pickup}
                  destination={
                    step === "searching"
                      ? booking.destination
                      : draft.destination
                  }
                  searching={step === "searching"}
                />
                <div className="cab-live-estimate">
                  <label htmlFor="cab-preview-vehicle">Vehicle</label>
                  <select id="cab-preview-vehicle" {...register("vehicleId")}>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <FareSummary booking={draft} vehicle={vehicle} fare={fare} preview onContinue={() => {}} />
                </div>
              </div>
            </div>
          )}
          {step === "vehicles" && (
            <>
              <div className="cab-result-title">
                <h2 ref={heading} tabIndex={-1}>
                  {booking.pickup} <span>→</span> {booking.destination}
                </h2>
                <button type="button" onClick={() => { setConfirmed(undefined); setStep("route"); }}>
                  Edit journey
                </button>
              </div>
              <CabRouteAnimation
                pickup={booking.pickup}
                destination={booking.destination}
              />
              <div className="cab-results">
                <VehicleSelector
                  selectedVehicleId={booking.vehicleId}
                  onSelect={(id) => {
                    setValue("vehicleId", id);
                    setConfirmed({ ...booking, vehicleId: id });
                  }}
                />
                <FareSummary
                  booking={booking}
                  vehicle={vehicle}
                  fare={fare}
                  onContinue={() => setStep("enquiry")}
                />
              </div>
            </>
          )}
          {step === "enquiry" && (
            <section className="cab-enquiry cab-console">
              <button
                className="cab-back"
                type="button"
                onClick={() => setStep("vehicles")}
              >
                ← Back to rides
              </button>
              <p className="cab-eyebrow">Plan your ride</p>
              <h2 ref={heading} tabIndex={-1}>
                A few details.
                <br />A journey to look forward to.
              </h2>
              <div className="cab-enquiry-journey">
                <strong>
                  {booking.pickup} → {booking.destination}
                </strong>
                <p>
                  {vehicle.name} ·{" "}
                  {booking.tripType === "one-way" ? "One Way" : "Round Trip"} ·{" "}
                  {booking.passengers} Passengers ·{" "}
                  {new Date(
                    `${booking.travelDate}T00:00:00`,
                  ).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  const details = {
                    name: String(data.get("name")).trim(),
                    mobile: String(data.get("mobile")).trim(),
                    email: String(data.get("email")).trim(),
                  };
                  if (details.name.length < 2) {
                    setContactError("Please enter your full name.");
                    return;
                  }
                  if (
                    !/^\+?[\d\s()-]+$/.test(details.mobile) ||
                    details.mobile.replace(/\D/g, "").length < 7 ||
                    details.mobile.replace(/\D/g, "").length > 15
                  ) {
                    setContactError(
                      "Enter a valid mobile number with 7–15 digits.",
                    );
                    return;
                  }
                  setContact(details);
                  setReference(
                    `SH-CAB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                  );
                  setStep("success");
                }}
              >
                <div className="cab-contact-fields">
                  {(["name", "mobile", "email"] as const).map((field) => (
                    <div className="cab-input" key={field}>
                      <label htmlFor={`cab-${field}`}>
                        {field === "name"
                          ? "Name"
                          : field === "mobile"
                            ? "Mobile"
                            : "Email"}
                      </label>
                      <input
                        id={`cab-${field}`}
                        name={field}
                        type={
                          field === "email"
                            ? "email"
                            : field === "mobile"
                              ? "tel"
                              : "text"
                        }
                        autoComplete={field === "mobile" ? "tel" : field}
                        required
                        defaultValue={contact[field]}
                        aria-describedby={
                          contactError ? "cab-contact-error" : undefined
                        }
                      />
                    </div>
                  ))}
                </div>
                {contactError && (
                  <p id="cab-contact-error" className="cab-error" role="alert">
                    {contactError}
                  </p>
                )}
                <p className="cab-fare-note">
                  Demo enquiry: contact details are not sent or saved. You can
                  share your request via WhatsApp after this step when
                  configured.
                </p>
                <button className="cab-button" type="submit">
                  Send Cab Enquiry
                  <ArrowRight size={18} />
                </button>
              </form>
            </section>
          )}
          {step === "success" && (
            <section className="cab-success cab-console">
              <motion.div
                className="cab-success-icon"
                initial={{ scale: reduced ? 1 : 0.9 }}
                animate={{ scale: 1 }}
              >
                <Check size={32} />
              </motion.div>
              <p className="cab-eyebrow">Demo enquiry received</p>
              <h2 ref={heading} tabIndex={-1}>
                Cab enquiry received.
              </h2>
              <p>
                Your Sukhad Holidays travel request has been received in this
                demo.
              </p>
              <div className="cab-enquiry-journey">
                <strong>
                  {booking.pickup} → {booking.destination}
                </strong>
                <p>
                  {vehicle.name} ·{" "}
                  {booking.tripType === "one-way" ? "One Way" : "Round Trip"}
                </p>
              </div>
              <div className="cab-reference">
                <small>Enquiry reference</small>
                <strong>{reference}</strong>
              </div>
              <p className="cab-fare-note">
                Local demo reference only. No request has been delivered or
                saved, and no cab has been reserved.
              </p>
              {whatsappUrl && (
                <a className="cab-button" href={whatsappUrl}>
                  Share request on WhatsApp
                  <ArrowRight size={18} />
                </a>
              )}
              <div className="cab-success-actions">
                <button
                  type="button"
                  className="cab-button"
                  onClick={() => {
                    setStep("route");
                    setConfirmed(undefined);
                    setContact({ name: "", mobile: "", email: "" });
                    setContactError("");
                  }}
                >
                  Back to Cabs
                  <ArrowRight size={18} />
                </button>
                <Link className="cab-button cab-secondary" href="/holidays">
                  Explore Holidays
                </Link>
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>
      {step === "route" && (
        <section className="cab-popular">
          <p className="cab-eyebrow">Familiar roads. New memories.</p>
          <h2>A few favourite ways out of Ayodhya.</h2>
          <div>
            {demoTaxiRoutes.map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => {
                  setValue("pickup", r.origin, { shouldValidate: true });
                  setValue("destination", r.destination, {
                    shouldValidate: true,
                  });
                  document.getElementById("travelDate")?.focus();
                }}
              >
                <MapPin size={22} />
                <span>
                  <strong>{r.destination}</strong>
                  <small>From Ayodhya · Demo route</small>
                </span>
                <ArrowRight size={18} />
              </button>
            ))}
          </div>
          <p className="cab-fare-note">
            Planning a local ride or a different route? Share an enquiry for a
            team-confirmed fare.
          </p>
        </section>
      )}
    </div>
  );
}
