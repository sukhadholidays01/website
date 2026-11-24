import "server-only";
import type { CabPlace } from "./types";
import { CabError } from "./security";

export const inIndiaBounds = (lat: number, lon: number) => Number.isFinite(lat) && Number.isFinite(lon) && lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98;
type Value = Record<string, unknown>;
const obj = (v: unknown): Value => v && typeof v === "object" && !Array.isArray(v) ? v as Value : {};
const text = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
export function mapboxSearchEnabled() { return process.env.CAB_GEOCODING_PROVIDER === "mapbox"; }
export function requireMapboxGeocoding() {
  const token = process.env.CAB_MAPBOX_TOKEN || process.env.MAP_BOX_ACCESS_TOKEN;
  if (!token || !/^(pk|sk)\.[A-Za-z0-9._-]+$/.test(token)) throw new CabError("Address search is not configured. Select a listed location and enter the exact address.", 503);
  if (process.env.CAB_MAPBOX_PERMANENT_GEOCODING !== "true") throw new CabError("Permanent address search is not enabled. Select a listed location and enter the exact address.", 503);
  if (!/^pk\.[A-Za-z0-9._-]+$/.test(process.env.NEXT_PUBLIC_CAB_MAPBOX_TOKEN || "")) throw new CabError("The address confirmation map is not configured. Select a listed location.", 503);
  return token;
}
export function parseMapboxGeocoding(payload: unknown): Omit<CabPlace, "id">[] {
  const root = obj(payload);
  if (root.type !== "FeatureCollection" || !Array.isArray(root.features)) throw new CabError("Address search returned an invalid response. Please retry.", 503);
  const results: Omit<CabPlace, "id">[] = [];
  for (const feature of root.features.slice(0, 5)) {
    const f = obj(feature), p = obj(f.properties), geometry = obj(f.geometry), context = obj(p.context);
    const coordinates = geometry.coordinates;
    const featureType = text(p.feature_type, 32);
    if (geometry.type !== "Point" || !Array.isArray(coordinates) || typeof coordinates[0] !== "number" || typeof coordinates[1] !== "number" || !inIndiaBounds(coordinates[1], coordinates[0])) continue;
    if (text(obj(context.country).country_code, 3).toLowerCase() !== "in") continue;
    if (!["address", "secondary_address", "street", "neighborhood", "locality", "postcode", "place", "district", "region"].includes(featureType)) continue;
    const name = text(p.name_preferred || p.name, 100);
    const label = text(p.full_address, 200) || [name, text(p.place_formatted, 150)].filter(Boolean).join(", ").slice(0, 200);
    const city = text(obj(context.place).name || obj(context.locality).name || obj(context.district).name || name, 100);
    if (name.length < 2 || label.length < 2 || city.length < 2) continue;
    results.push({ label, city, lon: coordinates[0], lat: coordinates[1], name, context: text(p.place_formatted, 200), featureType, accuracy: text(obj(p.coordinates).accuracy, 32) || "unspecified", airport: false });
  }
  return results;
}
export async function mapboxForward(query: string, proximity?: { lat: number; lon: number }): Promise<Omit<CabPlace, "id">[]> {
  const token = requireMapboxGeocoding();
  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.search = new URLSearchParams({ q: query, country: "in", language: "en,hi", limit: "5", autocomplete: "true", permanent: "true", types: "address,secondary_address,street,locality,neighborhood,district,place,postcode,region", access_token: token }).toString();
  if (proximity && inIndiaBounds(proximity.lat, proximity.lon)) url.searchParams.set("proximity", `${proximity.lon},${proximity.lat}`);
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (response.status === 429) throw new CabError("Address search is busy. Wait a moment and retry, or select a listed location.", 429);
    if (!response.ok) throw new CabError("Address search is temporarily unavailable. Retry or select a listed location.", 503);
    return parseMapboxGeocoding(await response.json());
  } catch (error) {
    if (error instanceof CabError) throw error;
    // Never include provider errors, request URLs or tokens in public errors/logs.
    throw new CabError("Address search is temporarily unavailable. Retry or select a listed location.", 503);
  }
}
