import "server-only";
import { roadLeg } from "./routing";
import { cabPlaces } from "@/data/cabPlaces";
import type { CabJourney, CabPlace, CabRoute } from "./types";
import { CabError } from "./security";
import { createHmac } from "node:crypto";

const placeCache = new Map<string, { until: number; value: CabPlace[] }>();
const mapSecret = () => process.env.CAB_SESSION_SECRET || "";
function placeSignature(p: Omit<CabPlace, "id">) {
  return createHmac("sha256", mapSecret())
    .update(JSON.stringify([p.label, p.city, p.lat, p.lon, Boolean(p.airport)]))
    .digest("hex");
}
export function canonicalPlace(place: CabPlace): CabPlace {
  const known = cabPlaces.find((p) => p.id === place.id);
  if (known) return known;
  if (!mapSecret() || place.id !== "osm-" + placeSignature(place))
    throw new CabError("Search for and select this location again.");
  return place;
}
const leg = roadLeg;
export async function lookupCabRoute(journey: CabJourney): Promise<CabRoute> {
  const outbound = await leg(journey.origin, journey.destination);
  if (journey.tripType !== "round-trip") return outbound;
  const inbound = await leg(journey.destination, journey.origin);
  return {
    ...outbound,
    returnDistanceKm: inbound.distanceKm,
    returnDurationMinutes: inbound.durationMinutes,
  };
}
export async function searchCabPlaces(query: string): Promise<CabPlace[]> {
  const local = cabPlaces.filter((p) =>
    `${p.label} ${p.city}`.toLowerCase().includes(query.toLowerCase()),
  );
  const base = process.env.CAB_GEOCODER_URL;
  // No default public Nominatim integration: operator must deliberately configure a suitable service.
  if (!base || query.length < 3) return local;
  if (!mapSecret())
    throw new CabError("Address search requires a server session secret.", 503);
  const cached = placeCache.get(query.toLowerCase());
  if (cached && cached.until > Date.now()) return [...local, ...cached.value];
  if (new URL(base).hostname === "nominatim.openstreetmap.org")
    throw new CabError(
      "Use a hosted or self-hosted geocoder for this booking service. The public Nominatim endpoint is not enabled.",
      503,
    );
  const url = new URL(base.replace(/\/$/, "") + "/search");
  url.search = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "5",
    countrycodes: "in",
    addressdetails: "1",
  }).toString();
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent":
        process.env.CAB_MAP_USER_AGENT || "SukhadHolidays-CabPlanner/1.0",
    },
    cache: "no-store",
  });
  if (!response.ok)
    throw new CabError(
      "Address search is temporarily unavailable. Select a listed city or airport.",
      503,
    );
  const rows = await response.json();
  if (!Array.isArray(rows))
    throw new CabError("Address search returned an invalid response.", 503);
  const places: CabPlace[] = rows
    .slice(0, 5)
    .map((r) => {
      const p = {
        label: String(r.display_name).slice(0, 200),
        city: String(
          r.address?.city ||
            r.address?.town ||
            r.address?.village ||
            r.address?.county ||
            r.name ||
            "",
        ).slice(0, 100),
        lat: Number(r.lat),
        lon: Number(r.lon),
        airport: r.type === "aerodrome",
      };
      return { ...p, id: "osm-" + placeSignature(p) };
    })
    .filter(
      (p) =>
        p.city &&
        Number.isFinite(p.lat) &&
        p.lat >= 6 &&
        p.lat <= 38 &&
        p.lon >= 68 &&
        p.lon <= 98,
    );
  if (placeCache.size > 500) placeCache.clear();
  placeCache.set(query.toLowerCase(), {
    until: Date.now() + 86400000,
    value: places,
  });
  return [...local, ...places];
}
