"use client";
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FlightCard } from "./FlightCard";
import { FlightFilters, emptyFilters } from "./FlightFilters";
import type {
  FlightFilter,
  FlightItinerary,
  FlightSortOrder,
} from "@/types/flights";
export function FlightResults({
  options,
  travellers,
  onSelect,
  filters,
  setFilters,
  sort,
  setSort,
}: {
  filters: FlightFilter;
  setFilters: (f: FlightFilter) => void;
  sort: FlightSortOrder;
  setSort: (s: FlightSortOrder) => void;
  options: FlightItinerary[];
  travellers: number;
  onSelect: (i: FlightItinerary) => void;
}) {
  const ceiling = Math.max(
    1000,
    ...options.map((i) => Math.ceil(i.total / 100) * 100),
  );
  const [draft, setDraft] = useState(filters);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const airlines = [
    ...new Set(options.flatMap((i) => i.legs.map((l) => l.flight.airline))),
  ];
  const departureRanges: Record<string, [number, number]> = {
    morning: [6, 12],
    afternoon: [12, 18],
    evening: [18, 24],
    night: [0, 6],
  };
  const visible = options
    .filter((itinerary) => {
      if (itinerary.total > filters.maxPrice) return false;
      const matchingLegs = itinerary.legs.every(
        ({ flight }) =>
          (filters.stops === "all" || flight.stops === Number(filters.stops)) &&
          (!filters.airlines.length ||
            filters.airlines.includes(flight.airline)),
      );
      const hour = Number(itinerary.legs[0].flight.departure.split(":")[0]);
      const range = departureRanges[filters.departure];
      return matchingLegs && (!range || (hour >= range[0] && hour < range[1]));
    })
    .sort((a, b) => {
      if (sort === "price") return a.total - b.total;
      if (sort === "duration") return a.duration - b.duration;
      if (sort === "departure")
        return a.legs[0].flight.departure.localeCompare(
          b.legs[0].flight.departure,
        );
      return a.legs[0].flight.rank - b.legs[0].flight.rank;
    });
  const close = () => {
    dialog.current?.close();
    opener.current?.focus();
  };
  return (
    <div className="grid items-start gap-6 md:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="hidden rounded-2xl border border-border bg-white p-5 md:block">
        {
          <FlightFilters
            value={filters}
            onChange={setFilters}
            airlines={airlines}
            ceiling={ceiling}
          />
        }
      </aside>
      <section className="min-w-0" aria-label="Flight results">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div aria-live="polite">
            <h2 className="text-lg font-semibold text-brand-navy">
              {visible.length} demo flight options
            </h2>
            <p className="text-xs text-secondary">
              {options.length} illustrative itineraries · no live availability
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              className="md:hidden"
              variant="secondary"
              onClick={(e) => {
                opener.current = e.currentTarget;
                setDraft(filters);
                dialog.current?.showModal();
              }}
            >
              <SlidersHorizontal size={16} />
              Filters
            </Button>
            <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
              <span>Sort</span>
              <select
                aria-label="Sort flights"
                className="flight-input"
                value={sort}
                onChange={(e) => setSort(e.target.value as FlightSortOrder)}
              >
                <option value="recommended">Recommended</option>
                <option value="price">Lowest Price</option>
                <option value="duration">Shortest Duration</option>
                <option value="departure">Earliest Departure</option>
              </select>
            </label>
          </div>
        </div>
        <div className="space-y-4">
          {visible.map((i) => (
            <FlightCard
              key={i.id}
              itinerary={i}
              travellers={travellers}
              onSelect={() => onSelect(i)}
            />
          ))}
        </div>
        {!visible.length && (
          <div className="flight-console py-12 text-center">
            <h3 className="text-xl font-semibold text-brand-navy">
              {options.length
                ? "No options match these filters"
                : "This route isn’t in our demo collection yet"}
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-secondary">
              {options.length
                ? "Try a wider price range, another airline or any stops."
                : "Try Delhi to one of the discovery destinations. For multi-city, try Delhi → Mumbai → Delhi. This does not indicate real flight availability."}
            </p>
            {!!options.length && (
              <Button
                className="mt-5"
                variant="secondary"
                onClick={() =>
                  setFilters({ ...emptyFilters, maxPrice: ceiling })
                }
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </section>
      <dialog
        ref={dialog}
        aria-labelledby="filter-title"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
            ),
          ).filter((element) => element.getClientRects().length > 0);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90svh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-border bg-white p-0 text-primary backdrop:bg-brand-navy/40 md:inset-0 md:m-auto md:max-w-md md:rounded-2xl"
      >
        <motion.div
          initial={reduced ? false : { y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.22 }}
          className="p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 id="filter-title" className="text-lg font-semibold">
              Refine your journey
            </h2>
            <Button variant="ghost" onClick={close} aria-label="Close filters">
              <X size={20} />
            </Button>
          </div>
          <FlightFilters
            value={draft}
            onChange={setDraft}
            airlines={airlines}
            ceiling={ceiling}
          />
          <Button
            className="mt-5 w-full"
            onClick={() => {
              setFilters(draft);
              close();
            }}
          >
            Apply Filters
          </Button>
        </motion.div>
      </dialog>
    </div>
  );
}
