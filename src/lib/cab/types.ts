export type CabTripType =
  "one-way" | "round-trip" | "airport" | "local" | "custom";
export type CabVehicle =
  "hatchback" | "sedan" | "suv" | "premium-mpv" | "luxury" | "tempo-traveller";
export type CabStatus =
  | "REQUESTED"
  | "QUOTED"
  | "ACCEPTED"
  | "CONFIRMED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
export interface CabPlace {
  id: string;
  label: string;
  city: string;
  lat: number;
  lon: number;
  airport?: boolean;
}
export interface CabJourney {
  tripType: CabTripType;
  airportDirection: "pickup" | "drop";
  origin: CabPlace;
  destination: CabPlace;
  departure: string;
  returnAt?: string;
  passengers: number;
  vehicle: CabVehicle;
  flightNumber?: string;
  pickupAddress: string;
  dropAddress: string;
  routeId?: string;
  packageId?: string;
  durationHours?: number;
}
export interface CabRoute {
  distanceKm: number;
  durationMinutes: number;
  geometry: [number, number][];
  source: "osrm" | "mapbox" | "demo";
  isEstimate?: boolean;
  returnDistanceKm?: number;
  returnDurationMinutes?: number;
}
export interface CabFare {
  method: "manual" | "automatic" | "hybrid" | "hourly" | "quote";
  total: number | null;
  distanceKm: number | null;
  billableKm: number | null;
  days: number;
  lines: { label: string; amount: number }[];
  inclusions: string;
  exclusions: string;
  version: string;
  development?: boolean;
}
export interface CabRule {
  id: string;
  origin: string;
  destination: string;
  tripType: CabTripType;
  vehicle: CabVehicle;
  active: boolean;
  fixedFare: number | null;
  sourceNote: string;
  inclusions: string;
  exclusions: string;
  airportDirection?: "pickup" | "drop" | "both";
}
export interface CabAutoRule {
  vehicle: CabVehicle;
  tripType: CabTripType;
  active: boolean;
  base: number | null;
  perKm: number | null;
  minimumKm: number | null;
  minimumKmPerDay: number | null;
  driverPerDay: number | null;
  inclusions: string;
  exclusions: string;
}
export interface CabConfig {
  revision: number;
  manual: CabRule[];
  automatic: CabAutoRule[];
}
export interface CabPayment {
  id: string;
  amount: number;
  type: "receipt" | "refund";
  method: string;
  reference: string;
  note: string;
  at: string;
  mode?: "manual" | "mock" | "razorpay";
}
export interface CabEvent {
  at: string;
  actor: "customer" | "operations";
  message: string;
  statusFrom?: CabStatus;
  statusTo?: CabStatus;
}
export interface CabBooking {
  id: string;
  customerId?: string;
  accessHash: string;
  requestKey: string;
  requestHash: string;
  createdAt: string;
  updatedAt: string;
  journey: CabJourney;
  route: CabRoute | null;
  fare: CabFare;
  status: CabStatus;
  acceptedVersion?: string;
  customer: { name: string; phone: string; email: string; notes: string };
  assignment?: {
    driver: string;
    phone: string;
    vehicle: string;
    driverId?: string;
    vehicleId?: string;
  };
  payments: CabPayment[];
  history: CabEvent[];
  development?: boolean;
}
export type PublicCabBooking = Omit<
  CabBooking,
  "accessHash" | "requestKey" | "requestHash" | "customerId"
>;
export interface CabState {
  config: CabConfig;
  bookings: CabBooking[];
  limits: Record<string, { count: number; until: number }>;
  sessions?: Record<string, number>;
  operations: import("./models").CabOperationsData;
}
export const cabVehicles: {
  id: CabVehicle;
  name: string;
  seats: number;
  image: string;
}[] = [
  {
    id: "sedan",
    name: "Sedan",
    seats: 4,
    image: "/images/vehicles/sedan.webp",
  },
  { id: "suv", name: "SUV", seats: 6, image: "/images/vehicles/suv.webp" },
  {
    id: "luxury",
    name: "Luxury",
    seats: 4,
    image: "/images/vehicles/luxury.webp",
  },
  {
    id: "tempo-traveller",
    name: "Tempo Traveller",
    seats: 12,
    image: "/images/vehicles/tempo-traveller.webp",
  },
];
export const tripLabels: Record<CabTripType, string> = {
  "one-way": "One-way",
  "round-trip": "Round-trip",
  airport: "Airport transfer",
  local: "Local / hourly",
  custom: "Custom route",
};
export const cabMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
export function cabBalance(booking: PublicCabBooking) {
  const paid = booking.payments.reduce(
    (sum, p) => sum + (p.type === "refund" ? -p.amount : p.amount),
    0,
  );
  return {
    paid,
    due:
      booking.fare.total === null
        ? null
        : Math.max(0, Math.round((booking.fare.total - paid) * 100) / 100),
  };
}
