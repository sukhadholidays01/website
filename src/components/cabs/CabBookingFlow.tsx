"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  ArrowLeft,
  ArrowDownUp,
  Car,
  Check,
  Clock3,
  MapPin,
  Plane,
  ShieldCheck,
} from "lucide-react";
import { cabPlaces } from "@/data/cabPlaces";
import { cabApi } from "@/lib/cab/client";
import {
  cabMoney,
  tripLabels,
  type CabFare,
  type CabJourney,
  type CabRoute,
  type CabTripType,
  type PublicCabBooking,
} from "@/lib/cab/types";
import "./cab-live.css";
import { PlacePicker } from "./PlacePicker";
import Link from "next/link";
import type { CabCatalogue, VehicleOption } from "@/lib/cab/models";
import { journeySchema } from "@/lib/cab/validation";
const CabMap = dynamic(() => import("./CabMap").then((m) => m.CabMap), {
  ssr: false,
  loading: () => (
    <div className="cb-map cb-map-loading">Loading route map…</div>
  ),
});
const initial: CabJourney = {
  tripType: "one-way",
  airportDirection: "pickup",
  origin: cabPlaces[0],
  destination: cabPlaces[1],
  departure: "",
  returnAt: "",
  passengers: 2,
  vehicle: "sedan",
  pickupAddress: "",
  dropAddress: "",
  flightNumber: "",
};
type Quote = {
  journey: CabJourney;
  route: CabRoute | null;
  fare: CabFare;
  routingWarning: string;
  options: VehicleOption[];
};
function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}
export function FareDetails({ fare }: { fare: CabFare }) {
  return (
    <div className="cb-fare">
      <div className="cb-fare-heading">
        <span>
          {fare.method === "quote"
            ? "Personal quote"
            : fare.method === "manual"
              ? "Fixed route fare"
              : fare.method === "hybrid"
                ? "Explicit hybrid estimate"
                : fare.method === "hourly"
                  ? "Hourly package estimate"
                  : "Distance-based estimate"}
        </span>
        <strong>
          {fare.total === null ? "Fare will be shared after confirmation" : cabMoney(fare.total)}
        </strong>
      </div>
      {fare.lines.map((line, i) => (
        <div className="cb-line" key={i}>
          <span>{line.label}</span>
          <span>{cabMoney(line.amount)}</span>
        </div>
      ))}
      {fare.billableKm !== null && (
        <p className="cb-note">
          {fare.method==='hourly'?`Package includes ${fare.billableKm} km. Actual excess use must be confirmed by operations.`:`Billable distance: ${fare.billableKm} km · ${fare.days} day(s). Days are counted in started 24-hour periods.`}
        </p>
      )}
      <p>
        <b>Includes:</b> {fare.inclusions}
      </p>
      <p>
        <b>Excludes:</b> {fare.exclusions}
      </p>
    </div>
  );
}
export function CabBookingFlow() {
  const router = useRouter();
  const [journey, setJourney] = useState<CabJourney>(initial);
  const [step, setStep] = useState<"journey" | "ride" | "review">("journey");
  const [quote, setQuote] = useState<Quote>();
  const [searchResult, setSearchResult] = useState<Quote>();
  const [catalogue, setCatalogue] = useState<CabCatalogue>();
  const [catalogueError, setCatalogueError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    const abort = new AbortController();
    void cabApi<CabCatalogue>("catalogue", { signal: abort.signal })
      .then((data) => {
        setCatalogue(data);
        setJourney((j) =>
          data.enabledTripTypes.includes(j.tripType)
            ? j
            : {
                ...j,
                tripType: data.enabledTripTypes[0],
                origin:
                  data.enabledTripTypes[0] === "airport"
                    ? cabPlaces.find((p) => p.id === "ayodhya-airport")!
                    : cabPlaces[0],
              },
        );
      })
      .catch((e) => {
        if (!abort.signal.aborted) setCatalogueError(e.message);
      });
    return () => abort.abort();
  }, []);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const request = useRef<
    { key: string; token: string; payload: string } | undefined
  >(undefined);
  const go = (s: typeof step) => {
    setStep(s);
    setError("");
    window.scrollTo({ top: 0, behavior: "instant" });
    setTimeout(() => heading.current?.focus(), 0);
  };
  const change = (patch: Partial<CabJourney>) => {
    setJourney((j) => ({
      ...j,
      ...patch,
      ...("origin" in patch || "destination" in patch ? { routeId: "" } : {}),
    }));
    setQuote(undefined);
    if (Object.keys(patch).some((key) => key !== "vehicle"))
      setSearchResult(undefined);
    setFieldErrors({});
    setError("");
  };
  function trip(type: CabTripType) {
    const airport = cabPlaces.find((p) => p.id === "ayodhya-airport")!;
    change({
      tripType: type,
      origin: type === "airport" ? airport : cabPlaces[0],
      destination: cabPlaces[1],
      airportDirection: "pickup",
      pickupAddress: "",
      dropAddress: "",
      returnAt: "",
    });
  }
  async function getQuote() {
    setBusy(true);
    setError("");
    try {
      const result = await cabApi<Quote>("quote", {
        method: "POST",
        body: { journey },
      });
      setQuote(result);
      go("review");
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  }
  async function searchJourney() {
    setBusy(true);
    setError("");
    setFieldErrors({});
    const compatible =
      catalogue?.vehicles.find(
        (v) =>
          v.category === journey.vehicle && v.seats >= journey.passengers,
      )?.category ||
      catalogue?.vehicles.find((v) => v.seats >= journey.passengers)
        ?.category ||
      journey.vehicle;
    const parsed = journeySchema.safeParse({ ...journey, vehicle: compatible });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        errors[String(issue.path[0])] = issue.message;
      setFieldErrors(errors);
      setError(parsed.error.issues[0].message);
      setBusy(false);
      return;
    }
    try {
      const result = await cabApi<Quote>("search", {
        method: "POST",
        body: { journey: { ...journey, vehicle: compatible } },
      });
      setSearchResult(result);
      setJourney(result.journey);
      go("ride");
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const payload = JSON.stringify({ journey, customer });
      if (!request.current || request.current.payload !== payload)
        request.current = {
          key: crypto.randomUUID(),
          token: Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map((v) => v.toString(16).padStart(2, "0"))
            .join(""),
          payload,
        };
      const { booking } = await cabApi<{ booking: PublicCabBooking }>(
        "bookings",
        {
          method: "POST",
          body: {
            journey,
            customer,
            consent,
            requestKey: request.current.key,
            accessToken: request.current.token,
          },
        },
      );
      const link = `/cabs/booking/${booking.id}#access=${request.current.token}`;
      router.push(link);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  }
  const currentStep = ["journey", "ride", "review"].indexOf(step);
  const airport = journey.tripType === "airport";
  const availableOptions = searchResult?.options || [];
  const activeRoute = catalogue?.routes.find((r) => r.id === journey.routeId);
  const packages = activeRoute?.fares[journey.vehicle]?.hourlyPackages || [];
  return (
    <div className="cab-live">
      <div className="cb-container">
        <header className="cb-hero">
          <div>
            <p className="cb-eyebrow">
              <Car size={17} /> SUKHAD ROAD JOURNEYS
            </p>
            <h1 ref={heading} tabIndex={-1}>
              Every mile.
              <br />
              <em>Your way.</em>
            </h1>
            <p>
              One-way journeys, return trips and airport transfers.
              <br />
              Plan your ride. We’ll take care of the road.
            </p>
          </div>
          <div className="cb-hero-note">
            <ShieldCheck size={28} />
            <strong>Request a Cab.</strong>
            <span>
              Review your fare before accepting. Your team confirms availability
              before your booking is final.
            </span>
          </div>
        </header>
        <p className="cb-callout" role="status">
          {catalogue?.persistent ? (
            <>
              <strong>Booking request, not confirmation.</strong> Your request
              is saved securely. The team will confirm the fare and vehicle
              availability before the ride is final. No payment is collected
              online.
            </>
          ) : catalogue ? (
            <>
              <strong>Development booking preview.</strong> Routes, vehicles
              and prices may be mock data. Requests are held in temporary
              memory and reset when the server restarts. No live payment is
              collected.
            </>
          ) : (
            <>
              <strong>Cab booking is not ready.</strong> Please retry loading
              the cab configuration before sending a request.
            </>
          )}
        </p>
        {catalogueError && (
          <div className="cb-alert" role="alert">
            {catalogueError}{" "}
            <button
              type="button"
              className="cb-text-link"
              onClick={() => window.location.reload()}
            >
              Retry loading cab configuration
            </button>
          </div>
        )}
        <ol className="cb-steps" aria-label="Booking progress">
          {["Your journey", "Choose a ride", "Review & request"].map(
            (label, i) => (
              <li
                key={label}
                className={i <= currentStep ? "active" : ""}
                aria-current={i === currentStep ? "step" : undefined}
              >
                <span>
                  {i < currentStep ? (
                    <Check size={14} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                {label}
              </li>
            ),
          )}
        </ol>
        {error && (
          <div className="cb-alert" role="alert">
            {error}
          </div>
        )}
        <div className="cb-layout">
          <section className="cb-main-card">
            {step === "journey" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void searchJourney();
                }}
              >
                <div className="cb-section-top">
                  <p className="cb-eyebrow">01 / THE JOURNEY</p>
                  <h2>Where are we taking you?</h2>
                </div>
                <div className="cb-tabs" aria-label="Trip type">
                  {(catalogue?.enabledTripTypes || []).map((type) => (
                    <button
                      type="button"
                      aria-pressed={journey.tripType === type}
                      className={journey.tripType === type ? "selected" : ""}
                      key={type}
                      onClick={() => trip(type)}
                    >
                      {type === "airport" && <Plane size={15} />}{" "}
                      {tripLabels[type]}
                    </button>
                  ))}
                </div>
                {!catalogue && !catalogueError && (
                  <p role="status">Loading configured trips…</p>
                )}
                {catalogue && (
                  <label>
                    <span>Configured route</span>
                    <select
                      aria-label="Configured route"
                      value={journey.routeId || ""}
                      onChange={(e) => {
                        const r = catalogue.routes.find(
                          (r) => r.id === e.target.value,
                        );
                        if (r) {
                          setJourney((j) => ({
                            ...j,
                            routeId: r.id,
                            origin: r.origin,
                            destination: r.destination,
                            vehicle: r.categories[0],
                            packageId:
                              r.fares[r.categories[0]]?.hourlyPackages[0]?.id,
                          }));
                          setSearchResult(undefined);
                          setQuote(undefined);
                        } else change({ routeId: "" });
                      }}
                    >
                      <option value="">
                        Choose locations / custom quote enquiry
                      </option>
                      {catalogue.routes
                        .filter((r) => r.tripTypes.includes(journey.tripType))
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                            {r.development ? " · DEMO" : ""}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                {airport && (
                  <fieldset className="cb-airport-direction">
                    <legend>Airport service</legend>
                    {(["pickup", "drop"] as const).map((direction) => (
                      <label key={direction}>
                        <input
                          type="radio"
                          name="airport-direction"
                          checked={journey.airportDirection === direction}
                          onChange={() => {
                            if (journey.airportDirection !== direction)
                              change({
                                airportDirection: direction,
                                origin: journey.destination,
                                destination: journey.origin,
                                pickupAddress: journey.dropAddress,
                                dropAddress: journey.pickupAddress,
                              });
                          }}
                        />
                        {direction === "pickup"
                          ? "Pickup from airport"
                          : "Drop at airport"}
                      </label>
                    ))}
                  </fieldset>
                )}
                <div className="cb-location-grid">
                  <PlacePicker
                    label={
                      airport && journey.airportDirection === "pickup"
                        ? "Pickup airport"
                        : "Pickup city / location"
                    }
                    value={journey.origin}
                    airport={airport && journey.airportDirection === "pickup"}
                    onChange={(p) => change({ origin: p })}
                  />
                  {!airport && (
                    <button
                      className="cb-swap"
                      type="button"
                      aria-label="Swap pickup and drop"
                      onClick={() =>
                        change({
                          origin: journey.destination,
                          destination: journey.origin,
                          pickupAddress: journey.dropAddress,
                          dropAddress: journey.pickupAddress,
                        })
                      }
                    >
                      <ArrowDownUp size={18} />
                    </button>
                  )}
                  <PlacePicker
                    label={
                      airport && journey.airportDirection === "drop"
                        ? "Drop airport"
                        : "Drop city / location"
                    }
                    value={journey.destination}
                    airport={airport && journey.airportDirection === "drop"}
                    onChange={(p) => change({ destination: p })}
                  />
                </div>
                <div className="cb-fields">
                  {journey.tripType === "local" && (
                    <label>
                      <span>Hourly package</span>
                      <select
                        required
                        value={journey.packageId || ""}
                        onChange={(e) => change({ packageId: e.target.value })}
                      >
                        <option value="">
                          Select a package on a configured route
                        </option>
                        {packages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {p.hours} hours / {p.includedKm} km
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    <span>Exact pickup address / terminal</span>
                    <input
                      required
                      minLength={5}
                      maxLength={400}
                      value={journey.pickupAddress}
                      onChange={(e) =>
                        change({ pickupAddress: e.target.value })
                      }
                      placeholder="Hotel, street address or airport terminal"
                    />
                  </label>
                  <label>
                    <span>Exact drop address / terminal</span>
                    <input
                      required
                      minLength={5}
                      maxLength={400}
                      value={journey.dropAddress}
                      onChange={(e) => change({ dropAddress: e.target.value })}
                      placeholder="Hotel, street address or airport terminal"
                    />
                  </label>
                  <label>
                    <span>Pickup date & time · IST</span>
                    <input
                      required
                      type="datetime-local"
                      value={journey.departure}
                      onChange={(e) => change({ departure: e.target.value })}
                    />
                  </label>
                  {journey.tripType === "round-trip" && (
                    <label>
                      <span>Return arrival date & time · IST</span>
                      <input
                        required
                        type="datetime-local"
                        min={journey.departure}
                        value={journey.returnAt}
                        onChange={(e) => change({ returnAt: e.target.value })}
                      />
                    </label>
                  )}
                  <label>
                    <span>Passengers</span>
                    <select
                      value={journey.passengers}
                      onChange={(e) =>
                        change({ passengers: Number(e.target.value) })
                      }
                    >
                      {Array.from(
                        {
                          length: Math.max(
                            1,
                            ...(catalogue?.vehicles.map((v) => v.seats) || [
                              12,
                            ]),
                          ),
                        },
                        (_, i) => (
                          <option key={i} value={i + 1}>
                            {i + 1} {i === 0 ? "passenger" : "passengers"}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  {airport && (
                    <label>
                      <span>
                        Flight number <small>(optional)</small>
                      </span>
                      <input
                        maxLength={20}
                        value={journey.flightNumber}
                        onChange={(e) =>
                          change({ flightNumber: e.target.value })
                        }
                        placeholder="For example, 6E 123"
                      />
                    </label>
                  )}
                </div>
                <p className="cb-note">
                  Choose a pickup at least 15 minutes ahead. All booking times
                  use India Standard Time. Flight details help coordination;
                  automatic flight tracking is not included.
                </p>
                {Object.entries(fieldErrors).map(([field, message]) => (
                  <p key={field} className="cb-inline-error" role="alert">
                    {field}: {message}
                  </p>
                ))}
                <p className="cb-note">
                  No suitable configured route? Enter your locations for a
                  custom quote, or{" "}
                  <Link href="/custom-routes">plan a custom journey</Link>.
                </p>
                <button
                  className="cb-btn cb-primary"
                  type="submit"
                  disabled={
                    busy ||
                    !catalogue ||
                    !catalogue.enabledTripTypes.includes(journey.tripType)
                  }
                >
                  {busy ? "Checking configured rides…" : "Choose your ride"}{" "}
                  <ArrowRight size={17} />
                </button>
              </form>
            )}
            {step === "ride" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void getQuote();
                }}
              >
                <div className="cb-section-top">
                  <p className="cb-eyebrow">02 / YOUR RIDE</p>
                  <h2>A little comfort goes a long way.</h2>
                  <p>
                    Choose a vehicle category. Your team will confirm the
                    specific vehicle and luggage space.
                  </p>
                </div>
                <div className="cb-vehicle-grid">
                  {availableOptions.map((v) => (
                    <label
                      key={v.id}
                      className={`cb-vehicle ${journey.vehicle === v.id ? "selected" : ""} ${!v.available ? "unavailable" : ""}`}
                    >
                      <input
                        type="radio"
                        name="vehicle"
                        value={v.id}
                        checked={journey.vehicle === v.id}
                        disabled={
                          !v.available ||
                          (!v.requestOnly && journey.passengers > v.seats)
                        }
                        onChange={() => change({ vehicle: v.id })}
                      />
                      {v.image && (
                        <Image
                          src={v.image}
                          alt={v.name}
                          width={260}
                          height={150}
                        />
                      )}
                      <span className="cb-vehicle-title">
                        {v.name}
                        <span className="cb-radio" />
                      </span>
                      <span>
                        {v.requestOnly
                          ? "Passenger capacity confirmed by operations"
                          : `Up to ${v.seats} passengers`}
                      </span>
                      <span>{v.model}</span>
                      <span>
                        {v.luggage === null
                          ? "Luggage capacity to be confirmed"
                          : `${v.luggage} bags`}{" "}
                        · {v.amenities.join(" · ")}
                      </span>
                      <strong>
                        {v.fare?.total !== null && v.fare?.total !== undefined
                          ? cabMoney(v.fare.total)
                          : "Request a quote"}
                      </strong>
                      <small>
                        {!v.requestOnly && journey.passengers > v.seats
                          ? "Too few seats for your group"
                          : !v.available
                            ? "No configured vehicle free for this selection"
                            : v.requestOnly
                              ? "Preference only · availability and fare pending confirmation"
                              : "Availability and final fare are confirmed by operations"}
                      </small>
                      {v.fare && (
                        <details onClick={(e) => e.stopPropagation()}>
                          <summary>Fare details</summary>
                          <FareDetails fare={v.fare} />
                        </details>
                      )}
                    </label>
                  ))}
                </div>
                <div className="cb-actions">
                  <button
                    type="button"
                    className="cb-btn"
                    disabled={busy}
                    onClick={() => go("journey")}
                  >
                    <ArrowLeft size={16} />
                    Edit journey
                  </button>
                  <button
                    className="cb-btn cb-primary"
                    disabled={
                      busy ||
                      !availableOptions.some(
                        (v) =>
                          v.id === journey.vehicle &&
                          v.available &&
                          (v.requestOnly || journey.passengers <= v.seats),
                      )
                    }
                  >
                    {busy ? "Checking your route…" : "Get fare & continue"}
                    <ArrowRight size={17} />
                  </button>
                </div>
              </form>
            )}
            {step === "review" && quote && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <div className="cb-section-top">
                  <p className="cb-eyebrow">03 / READY FOR THE ROAD</p>
                  <h2>Let’s make a plan.</h2>
                  <p>
                    {catalogue?.persistent
                      ? "Your request will be saved for the cab team. This is not a confirmed ride; the team must confirm the final fare and availability."
                      : "Your request goes to the development preview. A booking is confirmed only after you accept the final quote and the team checks availability."}
                  </p>
                </div>
                <dl className="cb-details">
                  <div>
                    <dt>Trip</dt>
                    <dd>
                      {tripLabels[journey.tripType]} · {journey.passengers}{" "}
                      passengers · {journey.vehicle}
                    </dd>
                  </div>
                  <div>
                    <dt>Pickup / return · IST</dt>
                    <dd>
                      {journey.departure.replace("T", " ")}
                      {journey.returnAt && (
                        <>
                          <br />
                          {journey.returnAt.replace("T", " ")}
                        </>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Pickup</dt>
                    <dd>
                      {journey.origin.label}
                      <br />
                      {journey.pickupAddress}
                    </dd>
                  </div>
                  <div>
                    <dt>Drop</dt>
                    <dd>
                      {journey.destination.label}
                      <br />
                      {journey.dropAddress}
                    </dd>
                  </div>
                </dl>
                <FareDetails fare={quote.fare} />
                {quote.routingWarning && (
                  <p className="cb-callout">{quote.routingWarning}</p>
                )}
                <div className="cb-fields">
                  <label>
                    <span>Your name</span>
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                      value={customer.name}
                      onChange={(e) =>
                        setCustomer({ ...customer, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>Mobile number</span>
                    <input
                      required
                      type="tel"
                      autoComplete="tel"
                      minLength={10}
                      maxLength={16}
                      value={customer.phone}
                      onChange={(e) =>
                        setCustomer({ ...customer, phone: e.target.value })
                      }
                    />
                  </label>
                  <label className="cb-full">
                    <span>Email address</span>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      maxLength={150}
                      value={customer.email}
                      onChange={(e) =>
                        setCustomer({ ...customer, email: e.target.value })
                      }
                    />
                  </label>
                  <label className="cb-full">
                    <span>
                      Anything we should know? <small>(optional)</small>
                    </span>
                    <textarea
                      rows={3}
                      maxLength={1500}
                      placeholder="Luggage, child seats, accessibility needs or additional stops"
                      value={customer.notes}
                      onChange={(e) =>
                        setCustomer({ ...customer, notes: e.target.value })
                      }
                    />
                  </label>
                </div>
                <p className="cb-callout">{catalogue?.bookingPolicy}</p>
                <p className="cb-note">
                  Review before submitting: {customer.name || "Your name"} ·{" "}
                  {customer.phone || "Your phone"} ·{" "}
                  {customer.email || "Your email"}.{" "}
                  {catalogue?.persistent
                    ? "The request will be stored for follow-up but is not a confirmed ride."
                    : "Development data is temporary and is not a permanent booking."}
                </p>
                <label className="cb-consent">
                  <input
                    required
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    I agree to share these details with Sukhad Holidays to
                    arrange this journey. I understand this is a request, the
                    final quote requires my acceptance, and no online payment is
                    being collected.
                  </span>
                </label>
                <p className="cb-callout">
                  <ShieldCheck size={20} />
                  <span>
                    <strong>No payment collected now.</strong> Online payments
                    will be added later. Operations will agree payment
                    arrangements after confirmation.
                  </span>
                </p>
                <div className="cb-actions">
                  <button
                    type="button"
                    className="cb-btn"
                    disabled={busy}
                    onClick={() => go("ride")}
                  >
                    <ArrowLeft size={16} />
                    Change ride
                  </button>
                  <button
                    className="cb-btn cb-primary"
                    disabled={busy || !consent}
                  >
                    {busy
                      ? catalogue?.persistent
                        ? "Saving your request…"
                        : "Recording development request…"
                      : "Send booking request"}
                    <ArrowRight size={17} />
                  </button>
                </div>
              </form>
            )}
          </section>
          <aside className="cb-aside">
            <div className="cb-aside-heading">
              <p className="cb-eyebrow">YOUR ROAD AHEAD</p>
              <span>{tripLabels[journey.tripType]}</span>
            </div>
            <CabMap
              origin={journey.origin}
              destination={journey.destination}
              route={quote?.route || searchResult?.route}
            />
            <div className="cb-route-info">
              <p>
                <MapPin size={16} />
                <strong>{journey.origin.label}</strong>
              </p>
              <span className="cb-route-dash" />
              <p>
                <MapPin size={16} />
                <strong>{journey.destination.label}</strong>
              </p>
              {quote?.route && (
                <div className="cb-route-stats">
                  <span>{quote.route.distanceKm} km outward</span>
                  <span>
                    <Clock3 size={14} />
                    {Math.floor(quote.route.durationMinutes / 60)}h{" "}
                    {quote.route.durationMinutes % 60}m
                  </span>
                  {quote.route.returnDistanceKm !== undefined && (
                    <span>{quote.route.returnDistanceKm} km return</span>
                  )}
                </div>
              )}
              <p className="cb-note">
                Route estimates use your selected map points. Your final quote
                confirms the exact pickup and drop addresses. Traffic, tolls and
                stops can affect the journey.
              </p>
            </div>
            <div className="cb-next">
              <strong>What happens next?</strong>
              <ol>
                <li>Send your journey request</li>
                <li>Review and accept your final quote</li>
                <li>Receive confirmation and driver details</li>
                <li>Travel, then settle the agreed balance</li>
              </ol>
            </div>
          </aside>
        </div>
        <p className="cb-footer-note">
          Your journey. A team that cares. Sukhad Holidays.
        </p>
      </div>
    </div>
  );
}
