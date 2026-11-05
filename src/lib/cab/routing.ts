import "server-only";
import type { CabPlace, CabRoute } from "./types";
import { cabPlaces } from "@/data/cabPlaces";

export interface RoadRoutingProvider {
  readonly name: "demo" | "osrm" | "mapbox";
  route(origin: CabPlace, destination: CabPlace): Promise<CabRoute>;
}
export function validCoordinates(p: CabPlace) {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lon >= -180 &&
    p.lon <= 180
  );
}
function validate(origin: CabPlace, destination: CabPlace) {
  if (!validCoordinates(origin) || !validCoordinates(destination))
    throw Error("Valid coordinates are required for road routing.");
}
export class DemoRoadProvider implements RoadRoutingProvider {
  readonly name = "demo" as const;
  async route(origin: CabPlace, destination: CabPlace): Promise<CabRoute> {
    validate(origin, destination);
    const fixtures: { a: string; b: string; km: number; minutes: number }[] = [
      { a: "ayodhya", b: "varanasi", km: 220, minutes: 240 },
      { a: "ayodhya", b: "prayagraj", km: 170, minutes: 210 },
      { a: "ayodhya-airport", b: "varanasi", km: 220, minutes: 240 },
      { a: "ayodhya", b: "lucknow-airport", km: 150, minutes: 180 },
      { a: "ayodhya-airport", b: "ayodhya", km: 12, minutes: 30 },
    ];
    const match = fixtures.find(
      (r) =>
        (r.a === origin.id && r.b === destination.id) ||
        (r.b === origin.id && r.a === destination.id),
    );
    if (!match)
      throw Error(
        "No demo road route exists for these locations. Request a custom quote.",
      );
    return {
      distanceKm: match.km + (origin.id === match.b ? 5 : 0),
      durationMinutes: match.minutes,
      geometry: [],
      source: "demo",
      isEstimate: true,
    };
  }
}
class HttpRoadProvider implements RoadRoutingProvider {
  constructor(readonly name: "osrm" | "mapbox") {}
  async route(origin: CabPlace, destination: CabPlace): Promise<CabRoute> {
    validate(origin, destination);
    const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
    const token =
      process.env.CAB_MAPBOX_TOKEN || process.env.MAP_BOX_ACCESS_TOKEN;
    if (this.name === "mapbox" && !token)
      throw Error("Mapbox routing is not configured.");
    if (this.name === "osrm" && !process.env.CAB_OSRM_URL)
      throw Error("OSRM routing endpoint is not configured.");
    const url =
      this.name === "mapbox"
        ? new URL(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`,
          )
        : new URL(
            `${process.env.CAB_OSRM_URL!.replace(/\/$/, "")}/route/v1/driving/${coords}`,
          );
    url.search = new URLSearchParams({
      overview: "simplified",
      geometries: "geojson",
      steps: "false",
      ...(this.name === "mapbox" ? { access_token: token! } : {}),
    }).toString();
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
      headers: { "User-Agent": "SukhadhHolidays-CabPlanner/2.0" },
    });
    if (!response.ok) throw Error("Road routing provider is unavailable.");
    const body = await response.json();
    const found = body.routes?.[0];
    if (
      body.code !== "Ok" ||
      !found ||
      !Number.isFinite(found.distance) ||
      found.distance <= 0 ||
      !Number.isFinite(found.duration) ||
      found.duration <= 0 ||
      !Array.isArray(found.geometry?.coordinates)
    )
      throw Error("No valid road route was returned.");
    const geometry = found.geometry.coordinates;
    if (
      !geometry.every(
        (p: unknown) =>
          Array.isArray(p) &&
          p.length >= 2 &&
          Number.isFinite(p[0]) &&
          Number.isFinite(p[1]),
      )
    )
      throw Error("Routing geometry is invalid.");
    return {
      distanceKm: Math.round(found.distance / 10) / 100,
      durationMinutes: Math.ceil(found.duration / 60),
      geometry,
      source: this.name,
      isEstimate: true,
    };
  }
}
export function routingProvider(): RoadRoutingProvider {
  const provider =
    process.env.CAB_ROUTING_PROVIDER ||
    (process.env.CAB_OSRM_URL ? "osrm" : "demo");
  if (provider === "demo") return new DemoRoadProvider();
  if (provider === "mapbox" || provider === "osrm")
    return new HttpRoadProvider(provider);
  throw Error("Unsupported routing provider configuration.");
}
const cache = new Map<string, { until: number; route: CabRoute }>();
export async function roadLeg(origin: CabPlace, destination: CabPlace) {
  const provider = routingProvider();
  const key = JSON.stringify([
    provider.name,
    origin.id,
    destination.id,
    origin.lat,
    origin.lon,
    destination.lat,
    destination.lon,
  ]);
  const previous = cache.get(key);
  if (previous && previous.until > Date.now())
    return structuredClone(previous.route);
  const route = await provider.route(origin, destination);
  if (cache.size > 500) cache.clear();
  cache.set(key, { until: Date.now() + 3600000, route });
  return route;
}
export const knownCabPlace = (id: string) => cabPlaces.find((p) => p.id === id);
