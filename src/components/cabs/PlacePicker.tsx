"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cabPlaces } from "@/data/cabPlaces";
import { cabApi } from "@/lib/cab/client";
import type { CabPlace } from "@/lib/cab/types";

export function PlacePicker({ label, value, onChange, airport = false, proximity }: {
  label: string; value: CabPlace; onChange: (value: CabPlace) => void; airport?: boolean;
  proximity?: { lat: number; lon: number };
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CabPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [retry, setRetry] = useState(0);
  const [armed, setArmed] = useState(false);
  const suggestions = useId();
  const searchField = useRef<HTMLInputElement>(null);
  const resultList = useRef<HTMLUListElement>(null);
  const revision = useRef(0);
  const proximityLat = proximity?.lat, proximityLon = proximity?.lon;
  useEffect(() => {
    if (!armed || query.trim().length < 3) return;
    const controller = new AbortController();
    const current = ++revision.current;
    const timer = setTimeout(() => {
      setBusy(true); setFailed(false); setMessage("");
      const params = new URLSearchParams({ q: query.trim() });
      if (proximityLat !== undefined && proximityLon !== undefined) params.set("proximity", `${proximityLon},${proximityLat}`);
      void cabApi<{ places: CabPlace[]; externalSearch: boolean }>("places?" + params, { signal: controller.signal })
        .then(data => {
          if (controller.signal.aborted || current !== revision.current) return;
          const matches = data.places.filter(p => airport ? p.airport : !p.airport);
          setResults(matches); setShowResults(true);
          setMessage(!matches.length ? "No matching address. Try the street, sector or locality, or choose a listed location and enter the full address below." : airport ? "Choose a listed airport. Add the terminal and entrance in the address field." : data.externalSearch ? "Choose a result, then confirm the entrance on the map. Hotel and landmark names may need a street or locality search." : "Choose a listed location and add your full address below.");
        })
        .catch(() => {
          if (controller.signal.aborted || current !== revision.current) return;
          setFailed(true); setResults([]); setShowResults(true);
          setMessage("Address search is unavailable. Retry, or select a listed location and add your exact address below.");
        })
        .finally(() => { if (!controller.signal.aborted && current === revision.current) setBusy(false); });
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, airport, proximityLat, proximityLon, retry, armed]);
  const listed = cabPlaces.filter(p => airport ? p.airport : !p.airport);
  const options = [...listed, ...results.filter(p => !listed.some(s => s.id === p.id))];
  if (!options.some(p => p.id === value.id)) options.push(value);
  function choose(place: CabPlace) {
    revision.current++;
    onChange(place); setArmed(false); setShowResults(false); setBusy(false);
    setMessage(place.featureType && !["address", "secondary_address"].includes(place.featureType) ? "This result identifies an area or street, not an exact entrance. Adjust the map pin and enter your full address." : "Location selected. Confirm the entrance on the map and add your full address.");
    searchField.current?.focus();
  }
  function dismiss() { revision.current++; setArmed(false); setShowResults(false); setBusy(false); searchField.current?.focus(); }
  return <div className="cb-place">
    <label><span>{label}</span><select value={value.id} onChange={event => { const place = options.find(p => p.id === event.target.value); if (place) choose(place); }}>{options.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
    <details open>
      <summary>Search another {airport ? "airport" : "location"}</summary>
      <div className="cb-search-inline">
        <input ref={searchField} aria-label={`Search ${label.toLowerCase()}`} aria-controls={suggestions} value={query} maxLength={150}
          onChange={event => { revision.current++; setArmed(true); setQuery(event.target.value); setResults([]); setBusy(false); setMessage(""); setFailed(false); setShowResults(false); }}
          onKeyDown={event => {
            if (event.key === "ArrowDown") { event.preventDefault(); resultList.current?.querySelector("button")?.focus(); }
            if (event.key === "Escape") dismiss();
            if (event.key === "Enter") { event.preventDefault(); if (query.trim().length >= 3) { setArmed(true); setRetry(n => n + 1); } else setMessage("Enter at least 3 characters to search."); }
          }} placeholder={airport ? "Airport name; add terminal below" : "House number, street, sector or locality"} />
        <button type="button" className="cb-icon-btn" aria-label={`Find ${label.toLowerCase()}`} disabled={busy || query.trim().length < 3} onClick={() => { setArmed(true); setRetry(n => n + 1); }}><Search size={17} /></button>
      </div>
      {busy && <p className="cb-note" role="status">Searching addresses…</p>}
      <ul ref={resultList} id={suggestions} className="cb-location-suggestions" aria-label="Matching locations" aria-busy={busy} hidden={!showResults} onKeyDown={event => {
        const buttons = Array.from(resultList.current?.querySelectorAll("button") || []), index = buttons.indexOf(event.target as HTMLButtonElement);
        if (event.key === "ArrowDown") { event.preventDefault(); buttons[Math.min(index + 1, buttons.length - 1)]?.focus(); }
        if (event.key === "ArrowUp") { event.preventDefault(); if (index <= 0) searchField.current?.focus(); else buttons[index - 1]?.focus(); }
        if (event.key === "Escape") { event.preventDefault(); dismiss(); }
      }}>{results.slice(0, 6).map(place => <li key={place.id}><button type="button" onClick={() => choose(place)}>
        <strong>{place.name || place.label}</strong><small>{place.context || place.city} · {place.airport ? "Airport" : place.featureType || "Listed location"}</small>
        {place.featureType && (place.featureType !== "address" || !["rooftop", "parcel", "point"].includes(place.accuracy || "")) && <small>Approximate location — confirm your entrance pin</small>}
      </button></li>)}</ul>
      {message && <p className="cb-note" role="status">{message}</p>}
      {(failed || (showResults && !results.length && !busy)) && <button type="button" className="cb-text-link" disabled={busy} onClick={() => { setArmed(true); setRetry(n => n + 1); }}>Retry address search</button>}
    </details>
  </div>;
}
