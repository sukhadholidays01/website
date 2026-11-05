"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { cabPlaces } from "@/data/cabPlaces";
import { cabApi } from "@/lib/cab/client";
import type { CabPlace } from "@/lib/cab/types";
export function PlacePicker({
  label,
  value,
  onChange,
  airport = false,
}: {
  label: string;
  value: CabPlace;
  onChange: (value: CabPlace) => void;
  airport?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CabPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const places = cabPlaces.filter((p) => (airport ? p.airport : !p.airport));
  const options = [
    ...places,
    ...results.filter((p) => !places.some((s) => s.id === p.id)),
  ];
  if (!options.some((p) => p.id === value.id)) options.push(value);
  async function search() {
    if (query.trim().length < 2) {
      setMessage("Enter at least two characters.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const data = await cabApi<{
        places: CabPlace[];
        externalSearch: boolean;
      }>("places?q=" + encodeURIComponent(query));
      const matches = data.places.filter((p) =>
        airport ? p.airport : !p.airport,
      );
      setResults(matches);
      setMessage(
        !data.externalSearch
          ? "Search is currently limited to listed cities and airports. You can enter the exact address below."
          : matches.length
            ? "Choose a matching location below."
            : "No matching location. Try a nearby city or airport.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cb-place">
      <label>
        <span>{label}</span>
        <select
          value={value.id}
          onChange={(e) => {
            const place = options.find((p) => p.id === e.target.value);
            if (place) onChange(place);
          }}
        >
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <details>
        <summary>Search another {airport ? "airport" : "location"}</summary>
        <div className="cb-search-inline">
          <input
            aria-label={`Search ${label.toLowerCase()}`}
            value={query}
            maxLength={150}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search();
              }
            }}
            placeholder="City, area or landmark"
          />
          <button
            type="button"
            className="cb-icon-btn"
            aria-label={`Find ${label.toLowerCase()}`}
            disabled={busy}
            onClick={() => void search()}
          >
            <Search size={17} />
          </button>
        </div>
        {message && (
          <p className="cb-note" role="status">
            {message}
          </p>
        )}
      </details>
    </div>
  );
}
