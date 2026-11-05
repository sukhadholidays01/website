"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, X, ArrowUpDown, BusFront } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BusCard } from "./BusCard";
import { BusFilters } from "./BusFilters";
import { busSortOptions, filterDemoBuses } from "@/data/demoBuses";
import type { BusFilter, BusSort, DemoBus } from "@/types/bus";
export function BusResults({
  buses,
  filters,
  onFilter,
  sort,
  onSort,
  onSelect,
  onModify,
}: {
  buses: readonly DemoBus[];
  filters: BusFilter;
  onFilter: (f: BusFilter) => void;
  sort: BusSort;
  onSort: (s: BusSort) => void;
  onSelect: (b: DemoBus) => void;
  onModify: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const dialog = useRef<HTMLDialogElement>(null);
  const visible = filterDemoBuses(buses, filters, sort);
  const filterCount =
    filters.types.length +
    filters.ac.length +
    filters.departure.length +
    Number(filters.maxPrice < 2000);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      if (element?.open) element.close();
    };
  }, [open]);
  return (
    <>
      <div className="bus-results-intro">
        <p className="bus-eyebrow">Your road, your rhythm</p>
        <h2>Find your comfortable way there.</h2>
        <p>Compare the journey. Then make the seat your own.</p>
      </div>
      <div className="bus-results-grid">
        <aside className="bus-filter-desktop bus-console">
          <BusFilters value={filters} onChange={onFilter} />
        </aside>
        <section className="bus-results-list" aria-label="Bus results">
          <div className="bus-results-toolbar">
            <p role="status">
              <strong>{visible.length}</strong> demo bus options{" "}
              {visible.length !== buses.length && (
                <small>of {buses.length} sample journeys</small>
              )}
            </p>
            <div className="bus-sort-tools">
              <Button
                variant="secondary"
                className="bus-filter-trigger"
                aria-haspopup="dialog"
                onClick={() => {
                  setDraft(filters);
                  setOpen(true);
                }}
              >
                <SlidersHorizontal size={17} aria-hidden="true" />
                Filters
                {filterCount > 0 && (
                  <span className="bus-filter-count">{filterCount}</span>
                )}
              </Button>
              <label className="bus-sort">
                <ArrowUpDown size={16} aria-hidden="true" />
                <span>Sort</span>
                <select
                  aria-label="Sort buses"
                  value={sort}
                  onChange={(e) => onSort(e.target.value as BusSort)}
                >
                  {busSortOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="bus-results-cards">
            {visible.map((b, i) => (
              <BusCard key={b.id} bus={b} index={i} onSelect={onSelect} />
            ))}
          </div>
          {visible.length === 0 && (
            <div className="bus-console bus-empty">
              <BusFront size={34} aria-hidden="true" />
              <h3>
                {buses.length
                  ? "No journeys match these filters."
                  : "No demo journeys for this route yet."}
              </h3>
              <p>
                {buses.length
                  ? "Try a different coach type, departure time or budget."
                  : "Try a Delhi journey to Ayodhya, Jaipur, Lucknow, Haridwar or Agra. Reverse routes are also included."}
              </p>
              {buses.length ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    onFilter({
                      types: [],
                      ac: [],
                      departure: [],
                      maxPrice: 2000,
                    })
                  }
                >
                  Reset filters
                </Button>
              ) : (
                <Button variant="secondary" onClick={onModify}>
                  Modify search
                </Button>
              )}
            </div>
          )}
          <p className="bus-disclaimer">
            Sample operators, schedules, fares and seat layouts for
            demonstration. Seats are not held or reserved. Confirm your journey
            with the travel team.
          </p>
        </section>
      </div>
      <dialog
        ref={dialog}
        className="bus-filter-sheet"
        aria-labelledby="bus-filter-sheet-title"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="bus-sheet-top">
            <h2 id="bus-filter-sheet-title">Refine your journey</h2>
            <Button
              variant="ghost"
              aria-label="Close filters"
              onClick={() => setOpen(false)}
            >
              <X size={21} aria-hidden="true" />
            </Button>
          </div>
          <BusFilters value={draft} onChange={setDraft} />
          <div className="bus-sheet-footer">
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                onFilter(draft);
                setOpen(false);
              }}
            >
              Apply Filters
            </Button>
          </div>
        </motion.div>
      </dialog>
    </>
  );
}
