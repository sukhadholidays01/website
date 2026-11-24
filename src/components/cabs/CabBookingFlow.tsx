"use client";
import { useRouter } from "next/navigation";
import { useToastFeedback, useToast } from "@/components/notifications/ToastProvider";
import { useEffect, useRef, useState } from "react";
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
  Route,
  CalendarDays,
  Repeat2,
  Navigation,
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
import "./cab-planner.css";
import { PlacePicker } from "./PlacePicker";
import Link from "next/link";
import type { CabCatalogue, VehicleOption } from "@/lib/cab/models";
import { journeySchema, customerSchema } from "@/lib/cab/validation";
import { bookingPolicies } from "@/lib/cab/guest-policies";
import { MultiDayItinerary } from "./MultiDayItinerary";
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
const journeyModes = {
  "one-way": { icon: Navigation, hint: "City to city" },
  "round-trip": { icon: Repeat2, hint: "Go and return" },
  airport: { icon: Plane, hint: "Arrivals & departures" },
  custom: { icon: Route, hint: "Your own journey" },
  "multi-day": { icon: CalendarDays, hint: "Stops & overnight stays" },
  local: { icon: Clock3, hint: "Hourly packages" },
};
type Quote = {
  journey: CabJourney;
  route: CabRoute | null;
  fare: CabFare;
  routingWarning: string;
  previewRoute?: CabRoute | null;
  previewWarning?: string;
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
                ? "Journey estimate"
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
export function CabBookingFlow({prefill={}}:{prefill?:Record<string,string>}={}) {
  const router = useRouter();
  const { notify } = useToast();
  const [journey, setJourney] = useState<CabJourney>(()=>{
    const place=(value:string)=>cabPlaces.find(p=>p.label.toLowerCase()===value?.toLowerCase()||p.city.toLowerCase()===value?.toLowerCase());
    const date=(value:string)=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value||'')?value:'';
    const passengers=Number(prefill.travellers);
    return {...initial,origin:place(prefill.from)||initial.origin,destination:place(prefill.to)||initial.destination,departure:date(prefill.departure),returnAt:prefill.tripType==='Round trip'?date(prefill.return):'',tripType:prefill.tripType==='Round trip'?'round-trip':'one-way',passengers:Number.isInteger(passengers)&&passengers>=1&&passengers<=6?passengers:initial.passengers};
  });
  const [step, setStep] = useState<"journey" | "ride" | "fare" | "passenger" | "payment" | "review">("journey");
  const [quote, setQuote] = useState<Quote>();
  const [selectedLocation, setSelectedLocation] = useState<CabJourney["origin"]>();
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
  const [privacyConsent,setPrivacyConsent]=useState(false);
  const [busy, setBusy] = useState(false);
  const journeyRevision = useRef(0);
  const previewRequest = useRef<{ input: string; result: Quote; until: number } | undefined>(undefined);
  const [error, setError] = useState("");
  useToastFeedback(error || catalogueError);
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
    journeyRevision.current++;
    previewRequest.current = undefined;
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
      itinerary: type === "multi-day" ? {stops:[{place:cabPlaces[2],overnight:false,notes:""}],requirements:""} : undefined,
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
      go("fare");
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  }
  async function searchJourney(previewOnly = false) {
    const revision = journeyRevision.current;
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
      const searchInput = JSON.stringify({ journey: { ...journey, vehicle: compatible } });
      const result = previewRequest.current?.input === searchInput && previewRequest.current.until > Date.now() ? previewRequest.current.result : await cabApi<Quote>("search", {
        method: "POST",
        body: { journey: { ...journey, vehicle: compatible } },
      });
      if (revision !== journeyRevision.current) return;
      previewRequest.current = { input: JSON.stringify({ journey: result.journey }), result, until: Date.now() + 30000 };
      setSearchResult(result);
      setJourney(result.journey);
      if (!previewOnly) go("ride");
    } catch (e) {
      if (revision === journeyRevision.current) setError(formatError(e));
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
            consents: [
              {id:bookingPolicies[0].id,version:bookingPolicies[0].version,accepted:consent},
              {id:bookingPolicies[1].id,version:bookingPolicies[1].version,accepted:privacyConsent},
            ],
            requestKey: request.current.key,
            accessToken: request.current.token,
          },
        },
      );
      const link = `/cabs/booking/${booking.id}#access=${request.current.token}`;
      await cabApi("guest/link/exchange", {
        method: "POST",
        body: { reference: booking.id, token: request.current.token },
      });
      notify({kind:"success",title:"Booking request received",description:"Your reference is ready. The team will confirm your fare and availability."});
      router.push(link);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  }
  const currentStep = ["journey", "ride", "fare", "passenger", "payment", "review"].indexOf(step);
  const airport = journey.tripType === "airport";
  const availableOptions = searchResult?.options || [];
  const activeRoute = catalogue?.routes.find((r) => r.id === journey.routeId);
  const visualRoute = quote?.previewRoute || searchResult?.previewRoute || quote?.route || searchResult?.route;
  const packages = activeRoute?.fares[journey.vehicle]?.hourlyPackages || [];
  return (
    <div className="cab-live cb-booking cb-planner" data-booking-step={step}>
      <div className="cb-container">
        <header className="cb-hero">
          <div>
            <p className="cb-eyebrow">
              <Car size={17} /> SUKHADH HOLIDAYS / CAB JOURNEYS
            </p>
            <h1 ref={heading} tabIndex={-1}>
              Your journey, <em>beautifully planned.</em>
            </h1>
            <p>
              Choose your route. Find your ride. Leave the rest to our team.
            </p>
          </div>
          <Link href="/cabs/track" className="cb-btn cb-existing-booking">Access an existing booking</Link>
        </header>
        <p className="cb-callout" role="status">
          {catalogue?.persistent ? (
            <>
              <ShieldCheck size={18} aria-hidden="true" /><span><strong>Your request comes first.</strong> Our team confirms the final fare and vehicle availability. No payment collected now.</span>
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
          {["Journey", "Vehicle", "Fare", "Passengers", "Payment plan", "Review", "Confirmation"].map(
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
                <span className="cb-step-label">{label}</span>
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
              <form id="cab-journey-form" aria-busy={busy}
                onSubmit={(e) => {
                  e.preventDefault();
                  void searchJourney();
                }}
              >
                <div className="cb-section-top">
                  <p className="cb-eyebrow">THE JOURNEY</p>
                  <h2>Where would you like to go?</h2>
                </div>
                <div className="cb-tabs" role="group" aria-label="Trip type">
                  {(catalogue?.enabledTripTypes || []).map((type) => {
                    const ModeIcon = journeyModes[type].icon;
                    return (
                    <button
                      type="button"
                      aria-label={tripLabels[type]}
                      aria-pressed={journey.tripType === type}
                      className={journey.tripType === type ? "selected" : ""}
                      key={type}
                      onClick={() => trip(type)}
                    >
                      <ModeIcon size={18} aria-hidden="true" />
                      <span>{tripLabels[type]}<small>{journeyModes[type].hint}</small></span>
                      {journey.tripType === type && <Check size={14} className="cb-mode-check" aria-hidden="true" />}
                    </button>
                  );})}
                </div>
                {!catalogue && !catalogueError && (
                  <p role="status">Loading configured trips…</p>
                )}
                {catalogue && (
                  <label>
                    <span>Choose a listed route <small>(optional)</small></span>
                    <select
                      aria-label="Configured route"
                      value={journey.routeId || ""}
                      onChange={(e) => {
                        const r = catalogue.routes.find(
                          (r) => r.id === e.target.value,
                        );
                        if (r) {
                          journeyRevision.current++;
                          previewRequest.current = undefined;
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
                        Plan with your own locations
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
                {journey.tripType === "multi-day" && journey.itinerary && <MultiDayItinerary value={journey.itinerary} onChange={itinerary=>change({itinerary})}/>}
                <div className="cb-location-grid">
                  <PlacePicker
                    label={
                      airport && journey.airportDirection === "pickup"
                        ? "Pickup airport"
                        : "Pickup city / location"
                    }
                    value={journey.origin}
                    proximity={selectedLocation}
                    airport={airport && journey.airportDirection === "pickup"}
                    onChange={(p) => { setSelectedLocation(p); change({ origin: p }); }}
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
                    proximity={selectedLocation}
                    airport={airport && journey.airportDirection === "drop"}
                    onChange={(p) => { setSelectedLocation(p); change({ destination: p }); }}
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
                  {["round-trip","multi-day"].includes(journey.tripType) && (
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
                  <label><span>Luggage or return/arrival instructions (optional)</span><input maxLength={200} value={journey.luggage||""} onChange={e=>change({luggage:e.target.value})}/></label>
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
                  Planning somewhere else? Choose your locations for a
                  personal quote, or{" "}
                  <Link href="/custom-routes">plan a custom journey</Link>.
                </p>
                <div className="cb-actions cb-journey-actions">
                <button type="button" className="cb-btn" disabled={busy || !catalogue} onClick={() => void searchJourney(true)}>
                  <Route size={17} aria-hidden="true" />{busy ? "Checking journey…" : "Preview route"}
                </button>
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
                </div>
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
                {!availableOptions.length && <p className="cb-empty">No vehicle categories are available for this journey. Try another route or contact the cab team for a quote.</p>}
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
                      {v.fare?.total !== null && v.fare?.total !== undefined && <span className="cb-estimate-label">Estimated fare · subject to confirmation</span>}
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
            {step === "fare" && quote && <section><div className="cb-section-top"><p className="cb-eyebrow">03 / FARE REVIEW</p><h2>A clear view of your fare.</h2><p>{journey.origin.label} → {journey.destination.label} · {journey.passengers} passengers</p></div><FareDetails fare={quote.fare}/>{quote.routingWarning && <p className="cb-callout">{quote.routingWarning}</p>}<p className="cb-note">This estimate comes from the server. Operations must issue the final quote, obtain your acceptance and confirm availability before payment. Additional stops are requests until explicitly included in the final quote.</p><div className="cb-actions"><button type="button" className="cb-btn" onClick={() => go("ride")}>Change vehicle</button><button type="button" className="cb-btn cb-primary" onClick={() => go("passenger")}>Continue to passenger details <ArrowRight size={17}/></button></div></section>}
            {step === "passenger" && quote && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const validation=customerSchema.safeParse(customer);
                  if(!validation.success){setFieldErrors(Object.fromEntries(validation.error.issues.map(issue=>[String(issue.path[0]),issue.message])));setError("Please check the passenger details.");return;}
                  setFieldErrors({});go("payment");
                }}
              >
                <div className="cb-section-top">
                  <p className="cb-eyebrow">04 / PASSENGER DETAILS</p>
                  <h2>Let’s make a plan.</h2>
                  <p>
                    {catalogue?.persistent
                      ? "Your request will be saved for the cab team. This is not a confirmed ride; the team must confirm the final fare and availability."
                      : "Your request goes to the development preview. A booking is confirmed only after you accept the final quote and the team checks availability."}
                  </p>
                </div>
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
                <p className="cb-note">Passengers: {journey.passengers}. <button type="button" className="cb-text-link" onClick={() => go("journey")}>Edit journey</button> · Please do not enter identity document numbers or other unnecessary sensitive information.</p>
                <p className="cb-note">
                  Review before submitting: {customer.name || "Your name"} ·{" "}
                  {customer.phone || "Your phone"} ·{" "}
                  {customer.email || "Your email"}.{" "}
                  {catalogue?.persistent
                    ? "The request will be stored for follow-up but is not a confirmed ride."
                    : "Development data is temporary and is not a permanent booking."}
                </p>
                {Object.entries(fieldErrors).map(([field,message])=><p key={field} className="cb-inline-error" role="alert">{message}</p>)}
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
                    disabled={busy}
                  >
                    Continue to payment arrangement
                    <ArrowRight size={17} />
                  </button>
                </div>
              </form>
            )}
            {step === "payment" && quote && <section><div className="cb-section-top"><p className="cb-eyebrow">05 / PAYMENT ARRANGEMENT</p><h2>Confirm first. Pay with clarity.</h2><p>No payment is collected when you send this request.</p></div><div className="cb-payment-plan"><ShieldCheck size={28}/><div><h3>Payment after admin confirmation</h3><p>The team will confirm your fare and vehicle availability. Any enabled full-payment, advance or pay-later options will then appear on your private booking page.</p><p>Your payment options and amount are determined by the confirmed booking policy.</p></div></div><div className="cb-actions"><button type="button" className="cb-btn" onClick={()=>go("passenger")}>Back to passengers</button><button type="button" className="cb-btn cb-primary" onClick={()=>go("review")}>Review your request <ArrowRight size={17}/></button></div></section>}
            {step === "review" && quote && <section><div className="cb-section-top"><p className="cb-eyebrow">06 / FINAL REVIEW</p><h2>Everything in place?</h2><p>Check your journey before sending it to our cab team. A request is not a confirmed booking.</p></div>
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

                <dl className="cb-details"><div><dt>Passenger</dt><dd>{customer.name}<br/>{customer.phone}<br/>{customer.email}</dd></div><div><dt>Special requirements</dt><dd>{customer.notes || "None added"}</dd></div></dl>
                {journey.itinerary && <section><h3>Multi-day itinerary</h3><p>{journey.returnAt} · {quote.fare.days} day(s)</p><ol>{journey.itinerary.stops.map((stop,index)=><li key={index}>{stop.place.label}{stop.overnight?" · overnight requested":""} · {stop.notes}</li>)}</ol><p>{journey.itinerary.requirements}</p></section>}
                <details><summary>Booking terms · {bookingPolicies[0].version}</summary><p className="cb-note">{bookingPolicies[0].text}</p></details>
                <label className="cb-consent"><input type="checkbox" required checked={privacyConsent} onChange={e=>setPrivacyConsent(e.target.checked)}/>I acknowledge the separate privacy notice for processing this request.</label>
                <details><summary>Privacy notice · {bookingPolicies[1].version}</summary><p className="cb-note">{bookingPolicies[1].text}</p></details>
                <p className="cb-note">ID may be requested under the configured journey policy or by operations. Documents are uploaded only after booking through mobile-verified private access; the request itself is not rejected for an absent ID.</p>
                <label className="cb-consent">
                  <input
                    required
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    I accept the booking terms above and share these details to
                    arrange this journey. I understand this is a request, the
                    final quote requires my acceptance, and no online payment is
                    being collected.
                  </span>
                </label>
                <p className="cb-note">By submitting, you accept the <Link href="/terms" target="_blank">Terms &amp; Conditions</Link> and acknowledge the <Link href="/privacy-policy" target="_blank">Privacy Policy</Link>.</p>
                <p className="cb-callout">
                  <ShieldCheck size={20} />
                  <span>
                    <strong>No payment collected now.</strong> Enabled full, advance or pay-later options will appear on your private booking page after operations confirms your booking.
                  </span>
                </p>

                <div className="cb-actions"><button type="button" className="cb-btn" disabled={busy} onClick={()=>go("journey")}>Edit journey</button><button type="button" className="cb-btn" disabled={busy} onClick={()=>go("passenger")}>Edit passenger details</button><button type="button" className="cb-btn cb-primary" disabled={busy||!consent||!privacyConsent} onClick={()=>void submit()}>{busy?"Saving your request...":"Send booking request"}<ArrowRight size={17}/></button></div>
            </section>}
          </section>
          <aside className="cb-aside" aria-label="Your trip summary">
            <div className="cb-aside-heading">
              <p className="cb-eyebrow">YOUR JOURNEY AT A GLANCE</p>
              <span>{tripLabels[journey.tripType]}</span>
            </div>
            <CabMap
              origin={journey.origin}
              destination={journey.destination}
              route={visualRoute}
              stops={journey.itinerary?.stops.map(stop => stop.place)}
              useMapbox
              focusPlace={selectedLocation}
              onConfirmPin={step === "journey" ? async (target, coordinates) => {
                const revision = journeyRevision.current;
                const { place } = await cabApi<{ place: CabJourney["origin"] }>("places", { method: "POST", body: { place: journey[target], ...coordinates } });
                if (revision !== journeyRevision.current) throw Error("Journey changed during pin confirmation");
                setSelectedLocation(place); change({ [target]: place });
              } : undefined}
            />
            <div className="cb-preview-status" role="status" aria-live="polite">
              {busy ? "Checking your journey. Road routing may take a moment…" : quote?.previewWarning || searchResult?.previewWarning ? "Some road segments could not be verified. Our team will check the complete route." : visualRoute?.source === "demo" ? "Development route fixture; no live road route is shown." : visualRoute?.geometry.length ? "Road route shown for your selected map locations." : searchResult || quote ? "The road preview is unavailable. Our team will verify the route with your quote." : "Your selected locations are on the map. Add your addresses and travel dates, then preview the road route."}
            </div>
            {(quote?.previewWarning || searchResult?.previewWarning) && <p className="cb-note" role="status">{quote?.previewWarning || searchResult?.previewWarning}</p>}
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
              {visualRoute && visualRoute.source !== "demo" && (
                <div className="cb-route-stats">
                  <span>{visualRoute.distanceKm} km outward</span>
                  <span>
                    <Clock3 size={14} />
                    {Math.floor(visualRoute.durationMinutes / 60)}h{" "}
                    {visualRoute.durationMinutes % 60}m
                  </span>
                  {visualRoute.returnDistanceKm !== undefined && (
                    <span>{visualRoute.returnDistanceKm} km return</span>
                  )}
                </div>
              )}
              <dl className="cb-summary-facts">
                <div><dt>Pickup · IST</dt><dd>{journey.departure ? journey.departure.replace("T", " · ") : "Choose a date & time"}</dd></div>
                {journey.returnAt && <div><dt>Return · IST</dt><dd>{journey.returnAt.replace("T", " · ")}</dd></div>}
                <div><dt>Your group</dt><dd>{journey.passengers} {journey.passengers === 1 ? "passenger" : "passengers"}</dd></div>
                {journey.luggage && <div><dt>Luggage / instructions</dt><dd>{journey.luggage}</dd></div>}
                {quote && <div><dt>Vehicle preference</dt><dd>{availableOptions.find(option => option.id === journey.vehicle)?.name || journey.vehicle}</dd></div>}
                {quote && <div><dt>{quote.fare.total === null ? "Fare status" : "Estimated fare"}</dt><dd>{quote.fare.total === null ? "Quote required" : cabMoney(quote.fare.total)}</dd></div>}
              </dl>
              <p className="cb-note">
                Route estimates use your selected map points. Your final quote
                confirms the exact pickup and drop addresses. Traffic, tolls and
                stops can affect the journey.
              </p>
            </div>
            <details className="cb-next">
              <summary>What happens after your request?</summary>
              <ol>
                <li>Send your journey request</li>
                <li>Review and accept your final quote</li>
                <li>Receive confirmation and driver details</li>
                <li>Choose an enabled payment arrangement</li>
              </ol>
            </details>
          </aside>
        </div>
        <p className="cb-footer-note">
          Your journey. A team that cares. Sukhad Holidays.
          {" "}<Link href="/cabs/track" className="cb-text-link">Access an existing booking</Link>
        </p>
      </div>
    </div>
  );
}
