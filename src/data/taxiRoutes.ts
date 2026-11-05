import type { TaxiRoute } from "@/types";

export const taxiLocations = [
  "Ayodhya",
  "Varanasi",
  "Prayagraj",
  "Lucknow Airport",
] as const;

export const demoTaxiRoutes: readonly TaxiRoute[] = [
  {
    id: "ayodhya-varanasi",
    origin: "Ayodhya",
    destination: "Varanasi",
    distanceKm: 220,
    durationMinutes: null,
    source: "demo",
    isDemo: true,
  },
  {
    id: "ayodhya-prayagraj",
    origin: "Ayodhya",
    destination: "Prayagraj",
    distanceKm: 170,
    durationMinutes: null,
    source: "demo",
    isDemo: true,
  },
  {
    id: "ayodhya-lucknow-airport",
    origin: "Ayodhya",
    destination: "Lucknow Airport",
    distanceKm: 150,
    durationMinutes: null,
    source: "demo",
    isDemo: true,
  },
];

export const taxiServiceOptions = [
  "Ayodhya to Varanasi",
  "Ayodhya to Prayagraj",
  "Ayodhya to Lucknow Airport",
  "Ayodhya Char Dham Yatra",
  "Ayodhya Airport Pickup & Drop",
  "Ayodhya One-Way Taxi Service",
  "Ayodhya Round Trip Taxi Service",
] as const;

export function getDemoTaxiRoute(pickup: string, destination: string): TaxiRoute | undefined {
  return demoTaxiRoutes.find(
    (route) =>
      (route.origin === pickup && route.destination === destination) ||
      (route.origin === destination && route.destination === pickup),
  );
}
