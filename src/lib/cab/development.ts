import { cabPlaces } from "@/data/cabPlaces";
import {
  emptyFare,
  type CabOperationsData,
  type FarePolicy,
  type ManagedRoute,
} from "./models";
import type { CabVehicle } from "./types";

// Explicit fictional fixtures, not client inventory or approved commercial prices.
export function developmentOperations(): CabOperationsData {
  const categories: CabVehicle[] = [
    "sedan",
    "suv",
    "premium-mpv",
    "tempo-traveller",
  ];
  const fares = Object.fromEntries(
    categories.map((c, i) => [
      c,
      {
        ...emptyFare(),
        mode: "automatic",
        baseFare: 300 + i * 150,
        perKm: 12 + i * 4,
        minimumKm: 100,
        minimumKmPerDay: 250,
        driverPerDay: 250,
        inclusions: "DEVELOPMENT ESTIMATE: vehicle and fuel.",
        exclusions:
          "Tolls and parking at actuals; prices require operations confirmation.",
      } satisfies FarePolicy,
    ]),
  );
  const make = (
    id: string,
    origin: string,
    destination: string,
    distanceKm: number,
    durationMinutes: number,
  ): ManagedRoute => ({
    id,
    name: `Demo ${origin} to ${destination}`,
    origin: cabPlaces.find((p) => p.id === origin)!,
    destination: cabPlaces.find((p) => p.id === destination)!,
    status: "active",
    tripTypes: ["one-way", "round-trip"],
    categories,
    distanceKm,
    durationMinutes,
    returnDistanceKm: distanceKm + 5,
    returnDurationMinutes: durationMinutes + 10,
    distanceSource: "demo",
    billableKm: null,
    defaultMode: "automatic",
    fares: structuredClone(fares),
    roundTripFares: structuredClone(fares),
    notes:
      "Fictional development route and tariffs. Replace or deactivate before launch.",
    development: true,
  });
  const airport = make("demo-airport", "ayodhya-airport", "varanasi", 220, 240);
  airport.tripTypes = ["airport"];
  return {
    revision: 1,
    routes: [
      make("demo-ayodhya-varanasi", "ayodhya", "varanasi", 220, 240),
      make("demo-ayodhya-prayagraj", "ayodhya", "prayagraj", 170, 210),
      airport,
    ],
    vehicles: categories.map((category, i) => ({
      id: `demo-vehicle-${i}`,
      category,
      name: `Demo ${category}`,
      model: [
        "Example compact sedan",
        "Example 6-seat MPV",
        "Example premium MPV",
        "Example 12-seat traveller",
      ][i],
      registration: `DEMO-CAB-${i + 1}`,
      seats: [4, 6, 6, 12][i],
      luggage: [2, 3, 4, 8][i],
      amenities: ["Air conditioning", "Seat belts"],
      image: `/images/vehicles/${category === "premium-mpv" ? "luxury" : category}.webp`,
      active: true,
      availability: "available",
      routeIds: [],
      notes: "Development vehicle; not real inventory.",
      development: true,
    })),
    drivers: [
      {
        id: "demo-driver-1",
        name: "Demo Driver One",
        phone: "9000000001",
        notes: "Fictional approved driver for development.",
        active: true,
        approved: true,
        availability: "available",
        development: true,
      },
      {
        id: "demo-driver-2",
        name: "Demo Driver Two",
        phone: "9000000002",
        notes: "Fictional driver awaiting approval.",
        active: true,
        approved: false,
        availability: "available",
        development: true,
      },
    ],
    settings: {
      enabledTripTypes: ["one-way", "round-trip", "airport"],
      fixedAdditionalCharge: 250,
      assignmentBufferMinutes: 30,
      bookingPolicy:
        "Development booking only. Operations confirms the final quote and availability. Cancellation/refund terms must be agreed before confirmation.",
      notifications: { customer: false, admin: false },
      mockPaymentsEnabled: true,
    },
    paymentAttempts: [],
    notifications: [],
  };
}
