"use client";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeftRight,
  CalendarDays,
  MapPin,
  PlaneTakeoff,
  Users,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { airports, airport, tripLabel } from "@/data/demoFlights";
import type { FlightSearch } from "@/types/flights";
import type { TravelScope, FlightTripType } from "@/types";

export function FlightSearchPanel({
  search,
  onChange,
  onSearch,
}: {
  search: FlightSearch;
  onChange: (s: FlightSearch) => void;
  onSearch: () => void;
}) {
  const [error, setError] = useState("");
  const reduced = useReducedMotion();
  const update = (patch: Partial<FlightSearch>) => {
    setError("");
    onChange({ ...search, ...patch });
  };
  const destinations = airports.filter((a) => a.scope === search.scope);
  const scope = (value: TravelScope) =>
    update({
      scope: value,
      from: "DEL",
      to: value === "domestic" ? "BOM" : "DXB",
      nextCity: "DEL",
    });
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  function cityField(
    label: string,
    value: string,
    change: (code: string) => void,
    options = search.scope === "domestic"
      ? airports.filter((a) => a.scope === "domestic")
      : airports,
  ) {
    return (
      <label className="flight-field">
        <span className="flight-label">
          <MapPin size={15} aria-hidden="true" />
          {label}
        </span>
        <select
          aria-label={label}
          value={value}
          onChange={(e) => change(e.target.value)}
        >
          {options.map((a) => (
            <option key={a.code} value={a.code}>
              {a.city}
            </option>
          ))}
        </select>
        <span
          className="truncate text-xs text-secondary"
          title={airport(value).name}
        >
          {value} · {airport(value).name}
        </span>
      </label>
    );
  }
  function dateField(
    label: string,
    value: string,
    min: string,
    change: (date: string) => void,
  ) {
    return (
      <label className="flight-field">
        <span className="flight-label">
          <CalendarDays size={15} aria-hidden="true" />
          {label}
        </span>
        <input
          aria-label={label}
          type="date"
          required
          min={min}
          value={value}
          onChange={(e) => change(e.target.value)}
        />
        <span className="text-xs text-secondary">
          {value
            ? new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
                weekday: "long",
              })
            : "Choose a date"}
        </span>
      </label>
    );
  }
  return (
    <>
      <div className="mb-6 flex gap-2" role="group" aria-label="Travel scope">
        {(["domestic", "international"] as const).map((s) => (
          <Button
            key={s}
            variant={search.scope === s ? "primary" : "secondary"}
            aria-pressed={search.scope === s}
            onClick={() => scope(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>
      <form
        className="flight-console"
        onSubmit={(e) => {
          e.preventDefault();
          if (
            search.from === search.to ||
            (search.tripType === "multi-city" && search.to === search.nextCity)
          ) {
            setError("Choose different airports for each leg.");
            return;
          }
          if (
            search.departure < today ||
            (search.tripType === "round-trip" &&
              search.returnDate < search.departure) ||
            (search.tripType === "multi-city" &&
              search.nextDate < search.departure)
          ) {
            setError(
              "Check your travel dates. Each onward date must follow departure.",
            );
            return;
          }
          onSearch();
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label="Trip type"
          >
            {(["round-trip", "one-way", "multi-city"] as FlightTripType[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={type === search.tripType}
                  onClick={() => update({ tripType: type })}
                  className={`relative min-h-11 rounded-lg px-3 text-sm font-semibold ${type === search.tripType ? "bg-brand-light-teal text-brand-navy" : "text-secondary hover:bg-background"}`}
                >
                  {type === search.tripType && (
                    <motion.span
                      layoutId="flight-tab"
                      className="absolute inset-x-3 bottom-0 h-0.5 bg-brand-teal"
                      transition={{ duration: reduced ? 0 : 0.2 }}
                    />
                  )}
                  {tripLabel(type)}
                </button>
              ),
            )}
          </div>
          <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-secondary">
            Demo search · INR fares
          </span>
        </div>
        <motion.div
          key={search.tripType}
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="relative mt-5 grid grid-cols-2 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
            {cityField(
              search.tripType === "multi-city" ? "City 1" : "From",
              search.from,
              (from) => update({ from }),
            )}
            <button
              type="button"
              aria-label="Swap departure and destination"
              className="absolute left-1/2 top-1/2 z-10 mx-auto flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-brand-blue hover:bg-brand-light-teal sm:static sm:translate-x-0 sm:translate-y-0"
              onClick={() => update({ from: search.to, to: search.from })}
            >
              <ArrowLeftRight size={18} />
            </button>
            {cityField(
              search.tripType === "multi-city" ? "City 2" : "To",
              search.to,
              (to) => update({ to }),
              destinations.concat(
                airports.filter(
                  (a) => a.code === "DEL" && search.scope === "international",
                ),
              ),
            )}
          </div>
          {search.tripType === "multi-city" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="flight-field">
                <span className="flight-label">Leg 2 · From</span>
                <strong className="mt-2 text-lg">
                  {airport(search.to).city}
                </strong>
                <span className="text-xs text-secondary">{search.to}</span>
              </div>
              {cityField("City 3", search.nextCity, (nextCity) =>
                update({ nextCity }),
              )}
              {dateField(
                "Second departure",
                search.nextDate,
                search.departure,
                (nextDate) => update({ nextDate }),
              )}
            </div>
          )}
          <div className="flight-date-row mt-3 grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_1.2fr_auto]">
            {dateField("Departure", search.departure, today, (departure) =>
              update({
                departure,
                returnDate:
                  search.returnDate < departure ? departure : search.returnDate,
                nextDate:
                  search.nextDate < departure ? departure : search.nextDate,
              }),
            )}
            {search.tripType === "round-trip" ? (
              dateField(
                "Return",
                search.returnDate,
                search.departure,
                (returnDate) => update({ returnDate }),
              )
            ) : (
              <div className="hidden items-center rounded-xl bg-background p-4 text-sm text-secondary lg:flex">
                {search.tripType === "multi-city"
                  ? "Two cities. One simple enquiry."
                  : "A little freedom for your next journey."}
              </div>
            )}
            <div className="flight-field col-span-2 lg:col-span-1">
              <span className="flight-label">
                <Users size={15} aria-hidden="true" />
                Travellers
              </span>
              <div className="flex gap-2">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Adults</span>
                  <select
                    aria-label="Adults"
                    value={search.adults}
                    onChange={(e) => update({ adults: +e.target.value })}
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "Adult" : "Adults"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Children</span>
                  <select
                    aria-label="Children"
                    value={search.children}
                    onChange={(e) => update({ children: +e.target.value })}
                  >
                    {[0, 1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "Child" : "Children"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <span className="text-xs text-secondary">
                Economy · Children aged 2–11
              </span>
            </div>
            <Button
              type="submit"
              size="lg"
              className="col-span-2 self-center text-base lg:col-span-1 motion-safe:hover:-translate-y-0.5"
            >
              <PlaneTakeoff size={20} aria-hidden="true" />
              Search Flights
            </Button>
          </div>
        </motion.div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-error">
            {error}
          </p>
        )}
        <p className="mt-5 text-xs leading-5 text-secondary">
          Explore illustrative flight options. Schedules, fares and baggage are
          demo data; availability is not connected.
        </p>
      </form>
      <section className="mt-10" aria-labelledby="popular-routes">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2
            id="popular-routes"
            className="text-xl font-semibold text-brand-navy"
          >
            Explore popular routes
          </h2>
          <p className="text-xs text-secondary">
            Inspiration from our demo routes
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {destinations
            .filter((a) => a.code !== "DEL")
            .map((a, i) => (
              <button
                key={a.code}
                onClick={() => update({ from: "DEL", to: a.code })}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-white p-3 text-left transition-colors hover:border-brand-teal"
              >
                {search.scope === "domestic" &&
                (a.code === "BOM" || a.code === "BLR") ? (
                  <span
                    className="flex h-15 w-13 shrink-0 items-center justify-center rounded-lg bg-brand-light-teal text-brand-blue"
                    aria-hidden="true"
                  >
                    <PlaneTakeoff size={24} />
                  </span>
                ) : (
                  <Image
                    src={
                      search.scope === "international"
                        ? [
                            "/images/international/dubai.webp",
                            "/images/international/singapore.webp",
                            "/images/international/thailand.jpg",
                            "/images/international/bali.webp",
                          ][i]
                        : a.code === "GOX"
                          ? "/images/domestic/goa.webp"
                          : a.code === "JAI"
                            ? "/images/destinations/jaipur.webp"
                            : "/images/domestic/delhi.webp"
                    }
                    alt=""
                    width={52}
                    height={60}
                    className="hidden h-15 w-13 rounded-lg object-cover sm:block"
                  />
                )}
                <span className="min-w-0">
                  <span className="block text-xs text-secondary">
                    From Delhi
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-brand-navy">
                    {a.city}
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                  <span className="text-xs text-secondary">DEL → {a.code}</span>
                </span>
              </button>
            ))}
        </div>
      </section>
    </>
  );
}
