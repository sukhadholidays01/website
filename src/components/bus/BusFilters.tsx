"use client";
import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { busFare, emptyBusFilters } from "@/data/demoBuses";
import type { BusFilter, BusType, DeparturePeriod } from "@/types/bus";
export function BusFilters({
  value,
  onChange,
}: {
  value: BusFilter;
  onChange: (f: BusFilter) => void;
}) {
  const id = useId();
  const toggle = <T extends string>(items: T[], item: T) =>
    items.includes(item) ? items.filter((i) => i !== item) : [...items, item];
  return (
    <div className="bus-filter-controls">
      <div className="bus-filter-heading">
        <h2>Filters</h2>
        <Button
          variant="ghost"
          onClick={() => onChange({ ...emptyBusFilters })}
        >
          Reset
        </Button>
      </div>
      <fieldset>
        <legend>Bus type</legend>
        {(["Sleeper", "Seater", "Semi Sleeper"] as BusType[]).map((t) => (
          <label key={t}>
            <input
              type="checkbox"
              checked={value.types.includes(t)}
              onChange={() =>
                onChange({ ...value, types: toggle(value.types, t) })
              }
            />
            {t}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Air conditioning</legend>
        {(["AC", "Non AC"] as const).map((t) => (
          <label key={t}>
            <input
              type="checkbox"
              checked={value.ac.includes(t)}
              onChange={() => onChange({ ...value, ac: toggle(value.ac, t) })}
            />
            {t}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Departure</legend>
        {(
          ["Morning", "Afternoon", "Evening", "Night"] as DeparturePeriod[]
        ).map((t, i) => (
          <label key={t}>
            <input
              type="checkbox"
              checked={value.departure.includes(t)}
              onChange={() =>
                onChange({ ...value, departure: toggle(value.departure, t) })
              }
            />
            <span>
              {t}
              <small>
                {
                  [
                    "05:00 - 11:59",
                    "12:00 - 16:59",
                    "17:00 - 20:59",
                    "21:00 - 04:59",
                  ][i]
                }
              </small>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="bus-price-filter">
        <label htmlFor={id + "-price"}>
          Maximum price <strong>{busFare(value.maxPrice)}</strong>
        </label>
        <input
          id={id + "-price"}
          aria-label="Maximum price"
          type="range"
          min={200}
          max={2000}
          step={50}
          value={value.maxPrice}
          onChange={(e) =>
            onChange({ ...value, maxPrice: Number(e.target.value) })
          }
        />
        <div>
          <span>INR 200</span>
          <span>INR 2,000</span>
        </div>
      </div>
    </div>
  );
}
