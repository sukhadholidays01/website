"use client";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "framer-motion";
import { ArrowLeft, ChevronRight, PlaneTakeoff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FlightSearchPanel } from "./FlightSearchPanel";
import { FlightSearchAnimation } from "./FlightSearchAnimation";
import { emptyFilters } from "./FlightFilters";
import { FlightResults } from "./FlightResults";
import { FlightDetails } from "./FlightDetails";
import { TravellerEnquiry } from "./TravellerEnquiry";
import { FlightSuccess } from "./FlightSuccess";
import {
  airport,
  dateLabel,
  findItineraries,
  tripLabel,
} from "@/data/demoFlights";
import type {
  FlightSearch,
  FlightItinerary,
  FlightFilter,
  FlightSortOrder,
} from "@/types/flights";
import "./flights.css";

type Stage =
  "search" | "searching" | "results" | "details" | "traveller" | "success";
export function FlightExperience() {
  const [stage, setStage] = useState<Stage>("search");
  const [search, setSearch] = useState<FlightSearch>({
    scope: "domestic",
    tripType: "round-trip",
    from: "DEL",
    to: "BOM",
    departure: "2026-10-12",
    returnDate: "2026-10-18",
    nextCity: "DEL",
    nextDate: "2026-10-18",
    adults: 2,
    children: 0,
  });
  const [selected, setSelected] = useState<FlightItinerary | null>(null);
  const [filters, setFilters] = useState<FlightFilter>(emptyFilters);
  const [sort, setSort] = useState<FlightSortOrder>("recommended");
  const [reference, setReference] = useState("");
  const heading = useRef<HTMLDivElement>(null);
  const initial = useRef(true);
  const reduced = useReducedMotion();
  const travellers = search.adults + search.children;
  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({
      behavior: reduced ? "instant" : "smooth",
      block: "start",
    });
  }, [stage, reduced]);
  useEffect(() => {
    if (stage !== "searching") return;
    const timer = setTimeout(() => setStage("results"), reduced ? 150 : 1050);
    return () => clearTimeout(timer);
  }, [stage, reduced]);
  const route = `${airport(search.from).city} → ${airport(search.to).city}${search.tripType === "multi-city" ? ` → ${airport(search.nextCity).city}` : ""}`;
  return (
    <MotionConfig reducedMotion="user">
      <div className="flight-experience mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:py-12">
        <div
          ref={heading}
          tabIndex={-1}
          role="region"
          aria-label={`Flights: ${stage}`}
          className="scroll-mt-28 outline-none"
        >
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex items-center gap-2 text-xs text-secondary"
          >
            <Link href="/">Home</Link>
            <ChevronRight size={12} aria-hidden="true" />
            <span aria-current="page">Flights</span>
          </nav>
        </div>
        {stage !== "search" && stage !== "searching" && stage !== "success" && (
          <div className="mb-6">
            <Button
              variant="ghost"
              className="-ml-4 mb-3"
              onClick={() =>
                setStage(
                  stage === "results"
                    ? "search"
                    : stage === "details"
                      ? "results"
                      : "details",
                )
              }
            >
              <ArrowLeft size={17} aria-hidden="true" />
              {stage === "results"
                ? "Modify Search"
                : stage === "details"
                  ? "Back to results"
                  : "Back to flight details"}
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-4">
              <div>
                {stage === "results" ? (
                  <h1 className="font-semibold text-brand-navy sm:text-xl">
                    {route}
                  </h1>
                ) : (
                  <p className="font-semibold text-brand-navy sm:text-xl">
                    {route}
                  </p>
                )}
                <p className="mt-1 text-xs leading-5 text-secondary">
                  {dateLabel(search.departure)}
                  {search.tripType === "round-trip"
                    ? ` – ${dateLabel(search.returnDate)}`
                    : search.tripType === "multi-city"
                      ? ` / ${dateLabel(search.nextDate)}`
                      : ""}{" "}
                  · {tripLabel(search.tripType)} · {travellers} Travellers
                </p>
              </div>
              <span className="rounded-full bg-brand-light-teal px-3 py-1 text-xs text-brand-blue">
                Demo itinerary
              </span>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stage}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -6 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
          >
            {stage === "search" && (
              <>
                <header className="mb-7">
                  <p className="flight-label">
                    <PlaneTakeoff size={16} aria-hidden="true" />
                    Domestic & international
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-brand-navy sm:text-4xl">
                    Find your next flight.
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-secondary sm:text-base">
                    Fly across India or beyond with a simple, flexible search.
                  </p>
                </header>
                <FlightSearchPanel
                  search={search}
                  onChange={setSearch}
                  onSearch={() => {
                    setSelected(null);
                    setFilters(emptyFilters);
                    setSort("recommended");
                    setStage("searching");
                  }}
                />
              </>
            )}
            {stage === "searching" && (
              <FlightSearchAnimation
                from={airport(search.from).city}
                to={airport(search.to).city}
              />
            )}
            {stage === "results" && (
              <FlightResults
                filters={filters}
                setFilters={setFilters}
                sort={sort}
                setSort={setSort}
                options={findItineraries(search)}
                travellers={travellers}
                onSelect={(i) => {
                  setSelected(i);
                  setStage("details");
                }}
              />
            )}
            {stage === "details" && selected && (
              <FlightDetails
                itinerary={selected}
                travellers={travellers}
                onContinue={() => setStage("traveller")}
              />
            )}
            {stage === "traveller" && selected && (
              <TravellerEnquiry
                search={search}
                itinerary={selected}
                onSubmit={() => {
                  setReference(
                    `SH-FLT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                  );
                  setStage("success");
                }}
              />
            )}
            {stage === "success" && (
              <FlightSuccess
                search={search}
                reference={reference}
                onBack={() => {
                  setSelected(null);
                  setStage("search");
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
