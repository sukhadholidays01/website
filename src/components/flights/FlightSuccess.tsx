"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/Button";
import { airport, dateLabel } from "@/data/demoFlights";
import type { FlightSearch } from "@/types/flights";
export function FlightSuccess({
  search,
  reference,
  onBack,
}: {
  search: FlightSearch;
  reference: string;
  onBack: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <section className="flight-console mx-auto max-w-2xl py-10 text-center sm:py-14">
      <motion.div
        initial={reduced ? false : { scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-light-teal text-brand-blue"
      >
        <Check size={30} aria-hidden="true" />
      </motion.div>
      <p className="mt-6 flight-label justify-center">Demo enquiry complete</p>
      <h1 className="mt-2 text-3xl font-semibold text-brand-navy">
        Enquiry received
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-secondary">
        Your Sukhad Holidays travel request has been prepared in this demo. Our
        team can help you with the next steps when enquiry services are
        connected.
      </p>
      <div className="mx-auto mt-6 max-w-md rounded-xl bg-background p-5">
        <p className="font-semibold text-brand-navy">
          {airport(search.from).city} → {airport(search.to).city}
          {search.tripType === "multi-city"
            ? ` → ${airport(search.nextCity).city}`
            : search.tripType === "round-trip"
              ? ` → ${airport(search.from).city}`
              : ""}
        </p>
        <p className="mt-2 text-sm text-secondary">
          {dateLabel(search.departure)} · {search.adults + search.children}{" "}
          travellers
        </p>
        <p className="mt-4 text-xs text-secondary">Demo reference</p>
        <p className="mt-1 font-mono text-sm font-semibold text-brand-blue">
          {reference}
        </p>
      </div>
      <p className="mt-5 text-xs leading-5 text-secondary">
        No enquiry was transmitted. This reference is local to this demo and
        does not confirm a booking.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button onClick={onBack}>Back to Flights</Button>
        <Link
          href="/holidays"
          className={buttonVariants({ variant: "secondary" })}
        >
          Explore Holidays
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
