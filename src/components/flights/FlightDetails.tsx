"use client";
import { ArrowRight, Luggage, PlaneTakeoff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { airport, dateLabel, durationLabel, money } from "@/data/demoFlights";
import type { FlightItinerary } from "@/types/flights";
export function FareSummary({
  itinerary,
  travellers,
}: {
  itinerary: FlightItinerary;
  travellers: number;
}) {
  const fare =
    itinerary.legs.reduce((n, l) => n + l.flight.fare, 0) * travellers;
  const taxes =
    itinerary.legs.reduce((n, l) => n + l.flight.taxes, 0) * travellers;
  return (
    <>
      <h2 className="text-lg font-semibold text-brand-navy">Fare summary</h2>
      <p className="mt-1 text-xs text-secondary">
        {travellers} {travellers === 1 ? "traveller" : "travellers"} · all legs
        included
      </p>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-secondary">Flight fare</dt>
          <dd>{money(fare)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-secondary">Taxes & fees</dt>
          <dd>{money(taxes)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-border pt-4 text-lg font-semibold text-brand-navy">
          <dt>Total</dt>
          <dd>{money(fare + taxes)}</dd>
        </div>
      </dl>
      <p className="mt-4 rounded-lg bg-brand-light-teal p-3 text-xs leading-5 text-brand-blue">
        Illustrative INR fare only. Children use the same demo fare. Our team
        must confirm pricing, baggage and airline conditions.
      </p>
    </>
  );
}
export function FlightDetails({
  itinerary,
  travellers,
  onContinue,
}: {
  itinerary: FlightItinerary;
  travellers: number;
  onContinue: () => void;
}) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section>
        <h1 className="mb-5 text-2xl font-semibold text-brand-navy">
          Your flight, in detail
        </h1>
        <div className="space-y-5">
          {itinerary.legs.map(({ flight, date }, i) => (
            <article key={flight.id} className="flight-console">
              <div className="flex items-center justify-between gap-3">
                <span className="flight-label">
                  <PlaneTakeoff size={16} aria-hidden="true" />
                  {i ? "Onward flight" : "Outbound flight"}
                </span>
                <span className="text-xs text-secondary">
                  {dateLabel(date)} · Demo schedule
                </span>
              </div>
              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-brand-navy">
                    {airport(flight.from).city}
                  </h2>
                  <p className="mt-1 text-sm text-secondary">{flight.from}</p>
                  <p className="mt-3 text-xl font-semibold">
                    {flight.departure}
                  </p>
                </div>
                <div className="text-center">
                  <ArrowRight
                    className="mx-auto text-brand-teal"
                    size={22}
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-xs text-secondary">
                    {durationLabel(flight.duration)}
                  </p>
                  <p className="mt-1 text-xs text-brand-blue">
                    {flight.stops ? "1 stop" : "Non-stop"}
                  </p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-semibold text-brand-navy">
                    {airport(flight.to).city}
                  </h2>
                  <p className="mt-1 text-sm text-secondary">{flight.to}</p>
                  <p className="mt-3 text-xl font-semibold">
                    {flight.arrival}
                    {flight.arrivalDayOffset > 0 && (
                      <sup
                        className="ml-1 text-xs font-medium"
                        title="Arrives on the following day"
                      >
                        +{flight.arrivalDayOffset}d
                      </sup>
                    )}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-secondary">
                Times are local to each airport.
                {flight.connection
                  ? ` Illustrative connection via ${flight.connection}; connection timing is not provided.`
                  : ""}
              </p>
              <h3 className="mt-6 border-t border-border pt-5 text-base font-semibold">
                Flight details
              </h3>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                {[
                  ["Airline", flight.airline],
                  ["Flight number", flight.number],
                  ["Aircraft", flight.aircraft],
                  ["Cabin", flight.cabin],
                  ["Baggage", flight.baggage],
                  ["Refundability", flight.refundability],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-secondary">{label}</dt>
                    <dd className="mt-1 leading-6">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-secondary">
          <Luggage size={16} className="shrink-0" aria-hidden="true" />
          These details are illustrative, not an airline offer or a confirmed
          reservation.
        </div>
      </section>
      <aside className="flight-console lg:sticky lg:top-28">
        <FareSummary itinerary={itinerary} travellers={travellers} />
        <Button className="mt-6 w-full" onClick={onContinue}>
          Continue to Traveller Details
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </aside>
    </div>
  );
}
