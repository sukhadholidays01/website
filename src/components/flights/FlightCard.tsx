"use client";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Plane } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { airport, dateLabel, durationLabel, money } from "@/data/demoFlights";
import type { FlightItinerary } from "@/types/flights";
export function FlightCard({
  itinerary,
  travellers,
  onSelect,
}: {
  itinerary: FlightItinerary;
  travellers: number;
  onSelect: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.article
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      whileHover={reduced ? undefined : { y: -2 }}
      className="rounded-2xl border border-border bg-white p-4 transition-colors hover:border-brand-teal/60 sm:p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-brand-navy">
            {itinerary.legs[0].flight.airline}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {itinerary.legs.length > 1
              ? "Complete demo itinerary"
              : itinerary.legs[0].flight.number}{" "}
            · Economy
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold tracking-tight text-brand-navy">
            {money(itinerary.total)}
          </p>
          <p className="text-xs text-secondary">/ traveller · demo fare</p>
        </div>
      </div>
      <div className="space-y-4">
        {itinerary.legs.map(({ flight, date }, i) => (
          <div
            key={flight.id}
            className={i ? "border-t border-border pt-4" : ""}
          >
            <div className="mb-2 flex flex-wrap justify-between gap-1 text-xs text-secondary">
              <span>
                {i ? "Onward" : "Outbound"} · {dateLabel(date)}
              </span>
              {itinerary.legs.length > 1 && (
                <span>
                  {flight.airline} · {flight.number}
                </span>
              )}
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <div>
                <p className="text-xl font-semibold text-primary">
                  {flight.departure}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  {flight.from}{" "}
                  <span className="hidden sm:inline">
                    · {airport(flight.from).city}
                  </span>
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-secondary">
                  {durationLabel(flight.duration)}
                </p>
                <div className="relative mx-2 my-2 h-px bg-border">
                  <Plane
                    size={14}
                    className="absolute right-0 -top-1.5 bg-white text-brand-teal"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-xs text-brand-blue">
                  {flight.stops ? `1 stop · ${flight.connection}` : "Non-stop"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-primary">
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
                <p className="mt-1 text-xs text-secondary">
                  {flight.to}{" "}
                  <span className="hidden sm:inline">
                    · {airport(flight.to).city}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs leading-5 text-secondary">
          Cabin & checked baggage included in demo
          <br />
          {travellers > 1
            ? `${money(itinerary.total * travellers)} for ${travellers} travellers`
            : "Taxes & fees included"}
        </p>
        <Button onClick={onSelect}>
          Select Flight
          <ArrowRight size={17} aria-hidden="true" />
        </Button>
      </div>
    </motion.article>
  );
}
