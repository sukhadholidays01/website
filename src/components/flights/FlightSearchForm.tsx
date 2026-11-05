"use client";

import { CalendarDays, MapPin, Plane, Search, Users } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useState } from "react";

import { EmptySearchState } from "@/components/travel/EmptySearchState";
import { JourneyLoadingAnimation } from "@/components/travel/JourneyLoadingAnimation";
import { Button } from "@/components/ui/Button";
import type { FlightTripType, TravelScope } from "@/types";

const scopeOptions: readonly { value: TravelScope; label: string }[] = [
  { value: "domestic", label: "Domestic" },
  { value: "international", label: "International" },
];

const tripOptions: readonly { value: FlightTripType; label: string }[] = [
  { value: "one-way", label: "One Way" },
  { value: "round-trip", label: "Round Trip" },
  { value: "multi-city", label: "Multi City" },
];

export function FlightSearchForm() {
  const [scope, setScope] = useState<TravelScope>("domestic");
  const [tripType, setTripType] = useState<FlightTripType>("one-way");
  const [searchState, setSearchState] = useState<"idle" | "searching" | "ready">("idle");
  const [route, setRoute] = useState({ origin: "Origin", destination: "Destination" });
  const reduceMotion = useReducedMotion();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="rounded-xl border border-border bg-white p-5 shadow-[0_16px_40px_rgba(11,55,102,0.07)] sm:p-7" aria-labelledby="flight-search-title">
      <div>
        <h2 id="flight-search-title" className="text-2xl font-semibold text-brand-navy">Search flight options</h2>
        <p className="mt-2 text-sm leading-6 text-secondary">
          Prepare domestic or international travel details. Live fares and availability are not connected.
        </p>
      </div>

      <form
        className="mt-6 space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          setRoute({
            origin: String(formData.get("from") || "Origin"),
            destination: String(formData.get("to") || "Destination"),
          });
          setSearchState("searching");
          await new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 120 : 1000));
          setSearchState("ready");
        }}
      >
        <input type="hidden" name="category" value="Flight Tickets" />

        <fieldset>
          <legend className="text-sm font-semibold text-brand-navy">Travel scope</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {scopeOptions.map((option) => (
              <label key={option.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value={option.value}
                  checked={scope === option.value}
                  onChange={() => setScope(option.value)}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-secondary transition-colors peer-checked:border-brand-teal peer-checked:bg-brand-light-teal peer-checked:text-brand-navy peer-focus-visible:ring-2 peer-focus-visible:ring-brand-teal peer-focus-visible:ring-offset-2">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-brand-navy">Trip type</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {tripOptions.map((option) => (
              <label key={option.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="tripType"
                  value={option.value}
                  checked={tripType === option.value}
                  onChange={() => setTripType(option.value)}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-secondary transition-colors peer-checked:border-brand-teal peer-checked:bg-brand-light-teal peer-checked:text-brand-navy peer-focus-visible:ring-2 peer-focus-visible:ring-brand-teal peer-focus-visible:ring-offset-2">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SearchField id="flight-from" name="from" label="From" placeholder="Departure city or airport" icon={MapPin} />
          <SearchField id="flight-to" name="to" label="To" placeholder="Arrival city or airport" icon={Plane} />
          <DateField id="flight-departure" name="departureDate" label="Departure" min={today} />
          {tripType === "round-trip" ? (
            <DateField id="flight-return" name="returnDate" label="Return" min={today} />
          ) : null}
          <SelectField
            id="flight-travellers"
            name="travellers"
            label="Travellers"
            icon={Users}
            options={["1 traveller", "2 travellers", "3 travellers", "4+ travellers"]}
          />
          <SelectField
            id="flight-cabin"
            name="cabinClass"
            label="Cabin Class"
            icon={Plane}
            options={["Economy", "Premium Economy", "Business", "First"]}
          />
        </div>

        {tripType === "multi-city" ? (
          <p className="rounded-lg bg-brand-light-teal p-3 text-sm leading-6 text-brand-navy">
            Multi-city leg management is prepared as a search type and will be connected with the flight inventory integration.
          </p>
        ) : null}

        <div>
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            <Search className="size-4" aria-hidden="true" /> Search Flights
          </Button>
          <p className="mt-3 text-caption leading-5 text-secondary">
            This planning form continues to an enquiry and does not show live flight results.
          </p>
        </div>
      </form>

      {searchState === "searching" ? (
        <div className="mt-7"><JourneyLoadingAnimation type="flight" origin={route.origin} destination={route.destination} /></div>
      ) : null}
      {searchState === "ready" ? (
        <div className="mt-7">
          <EmptySearchState
            title="Flight results will appear here when live inventory is connected."
            description="The results experience is prepared for airline, departure, arrival, duration, stops, baggage, fare details and pricing data from a future provider."
          />
        </div>
      ) : null}
    </section>
  );
}

interface FieldProps {
  id: string;
  name: string;
  label: string;
}

function SearchField({ id, name, label, placeholder, icon: Icon }: FieldProps & { placeholder: string; icon: typeof MapPin }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
        <Icon className="size-4 text-brand-teal" aria-hidden="true" /> {label}
      </label>
      <input id={id} name={name} type="text" placeholder={placeholder} className="mt-2 min-h-12 w-full min-w-0 rounded-lg border border-border bg-white px-3.5 text-sm outline-none placeholder:text-secondary/75 focus:border-brand-teal focus:ring-2 focus:ring-brand-light-teal" />
    </div>
  );
}

function DateField({ id, name, label, min }: FieldProps & { min: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
        <CalendarDays className="size-4 text-brand-teal" aria-hidden="true" /> {label}
      </label>
      <input id={id} name={name} type="date" min={min} className="mt-2 min-h-12 w-full min-w-0 rounded-lg border border-border bg-white px-3.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-light-teal" />
    </div>
  );
}

function SelectField({ id, name, label, options, icon: Icon }: FieldProps & { options: readonly string[]; icon: typeof Plane }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
        <Icon className="size-4 text-brand-teal" aria-hidden="true" /> {label}
      </label>
      <select id={id} name={name} defaultValue="" className="mt-2 min-h-12 w-full min-w-0 rounded-lg border border-border bg-white px-3.5 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-light-teal">
        <option value="" disabled>Select {label.toLowerCase()}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}
