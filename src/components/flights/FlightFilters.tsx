"use client";
import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { money } from "@/data/demoFlights";
import type { FlightFilter } from "@/types/flights";
export const emptyFilters: FlightFilter = {
  stops: "all",
  airlines: [],
  maxPrice: 150000,
  departure: "all",
};
export function FlightFilters({
  value,
  onChange,
  airlines,
  ceiling,
}: {
  value: FlightFilter;
  onChange: (f: FlightFilter) => void;
  airlines: string[];
  ceiling: number;
}) {
  const stopsId = useId();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-navy">Filters</h2>
        <Button
          variant="ghost"
          onClick={() => onChange({ ...emptyFilters, maxPrice: ceiling })}
        >
          Reset
        </Button>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Stops per leg</legend>
        {[
          ["all", "Any stops"],
          ["0", "Non-stop"],
          ["1", "1 Stop"],
        ].map(([v, label]) => (
          <label
            key={v}
            className="flex min-h-11 items-center gap-3 text-sm text-secondary"
          >
            <input
              className="size-4 accent-brand-blue"
              type="radio"
              name={stopsId}
              value={v}
              checked={value.stops === v}
              onChange={() => onChange({ ...value, stops: v })}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <fieldset className="border-t border-border pt-4">
        <legend className="text-sm font-semibold">Airlines</legend>
        {airlines.map((a) => (
          <label
            key={a}
            className="flex min-h-11 items-center gap-3 text-sm text-secondary"
          >
            <input
              className="size-4 accent-brand-blue"
              type="checkbox"
              checked={value.airlines.includes(a)}
              onChange={(e) =>
                onChange({
                  ...value,
                  airlines: e.target.checked
                    ? [...value.airlines, a]
                    : value.airlines.filter((x) => x !== a),
                })
              }
            />
            {a}
          </label>
        ))}
      </fieldset>
      <label className="block border-t border-border pt-4">
        <span className="text-sm font-semibold">Maximum fare / traveller</span>
        <span className="mt-2 block text-sm text-brand-blue">
          {money(Math.min(value.maxPrice, ceiling))}
        </span>
        <input
          aria-label="Maximum fare"
          type="range"
          min={0}
          max={ceiling}
          step={100}
          value={Math.min(value.maxPrice, ceiling)}
          onChange={(e) => onChange({ ...value, maxPrice: +e.target.value })}
          className="mt-3 h-11 w-full accent-brand-blue"
        />
      </label>
      <label className="block border-t border-border pt-4">
        <span className="text-sm font-semibold">Outbound departure</span>
        <select
          aria-label="Departure time"
          className="flight-input mt-3"
          value={value.departure}
          onChange={(e) => onChange({ ...value, departure: e.target.value })}
        >
          <option value="all">Any time</option>
          <option value="morning">Morning · 06:00–12:00</option>
          <option value="afternoon">Afternoon · 12:00–18:00</option>
          <option value="evening">Evening · 18:00–24:00</option>
          <option value="night">Night · 00:00–06:00</option>
        </select>
      </label>
      <p className="text-xs leading-5 text-secondary">
        Airline and stop filters apply to every leg. Prices include all legs.
      </p>
    </div>
  );
}
