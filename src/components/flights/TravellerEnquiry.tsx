"use client";
import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FareSummary } from "./FlightDetails";
import { airport, dateLabel, tripLabel } from "@/data/demoFlights";
import type { FlightItinerary, FlightSearch } from "@/types/flights";
export function TravellerEnquiry({
  itinerary,
  search,
  onSubmit,
}: {
  itinerary: FlightItinerary;
  search: FlightSearch;
  onSubmit: () => void;
}) {
  const [error, setError] = useState("");
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flight-console">
        <span className="flight-label">The next step</span>
        <h1 className="mt-2 text-2xl font-semibold text-brand-navy">
          Complete your enquiry
        </h1>
        <p className="mt-3 text-sm leading-6 text-secondary">
          Add the lead traveller’s contact details for your travel request.
        </p>
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            if (
              !String(data.get("firstName")).trim() ||
              !String(data.get("lastName")).trim()
            ) {
              setError("Enter your first and last name.");
              return;
            }
            setError("");
            onSubmit();
          }}
        >
          <fieldset>
            <legend className="text-sm font-semibold">Lead traveller</legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                {
                  name: "firstName",
                  label: "First Name",
                  type: "text",
                  auto: "given-name",
                },
                {
                  name: "lastName",
                  label: "Last Name",
                  type: "text",
                  auto: "family-name",
                },
                { name: "mobile", label: "Mobile", type: "tel", auto: "tel" },
                { name: "email", label: "Email", type: "email", auto: "email" },
              ].map((f) => (
                <label key={f.name} className="text-sm font-medium">
                  {f.label}
                  <input
                    className="flight-input mt-2"
                    name={f.name}
                    type={f.type}
                    autoComplete={f.auto}
                    required
                    maxLength={f.type === "tel" ? 16 : 100}
                    minLength={f.type === "tel" ? 10 : undefined}
                    pattern={f.type === "tel" ? "\\+?[0-9]{10,15}" : undefined}
                    title={
                      f.type === "tel"
                        ? "Enter 10–15 digits, with an optional + country prefix"
                        : undefined
                    }
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <label className="mt-6 flex min-h-11 items-start gap-3 text-sm leading-6">
            <input
              name="consent"
              type="checkbox"
              required
              className="mt-1 size-4 shrink-0 accent-brand-blue"
            />
            I agree to be contacted regarding this travel enquiry.
          </label>
          <div className="mt-4 rounded-xl border border-border bg-background p-4 text-sm leading-6 text-secondary">
            <strong className="text-brand-navy">Demo enquiry</strong>
            <p>
              This submission is demonstrated in your browser only. Contact
              details are not sent or stored, and no request reaches our team
              yet.
            </p>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-error">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto">
            Send Enquiry
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
          <p className="mt-3 flex items-center gap-2 text-xs text-secondary">
            <LockKeyhole size={14} aria-hidden="true" />
            No payment is required.
          </p>
        </form>
      </section>
      <aside className="flight-console">
        <h2 className="text-lg font-semibold text-brand-navy">Your journey</h2>
        <p className="mt-3 text-sm">
          {airport(search.from).city} → {airport(search.to).city}
          {search.tripType === "multi-city"
            ? ` → ${airport(search.nextCity).city}`
            : search.tripType === "round-trip"
              ? ` → ${airport(search.from).city}`
              : ""}
        </p>
        <p className="mt-2 text-xs text-secondary">
          {dateLabel(search.departure)} · {tripLabel(search.tripType)}
        </p>
        <div className="my-5 border-t border-border" />
        <FareSummary
          itinerary={itinerary}
          travellers={search.adults + search.children}
        />
      </aside>
    </div>
  );
}
