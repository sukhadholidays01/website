import type { CabPlace, CabTripType, CabVehicle } from "./types";

export type FareMode = "manual" | "automatic" | "hybrid" | "hourly";
export interface FarePolicy {
  mode: FareMode;
  manualFare: number | null;
  baseFare: number;
  perKm: number;
  minimumFare: number;
  billableKm: number | null;
  minimumKm: number;
  minimumKmPerDay: number;
  driverPerDay: number;
  fixedCharge: number | null;
  tollMode: "included" | "fixed" | "actual";
  tollAmount: number;
  extras: { label: string; amount: number }[];
  discount: { enabled: boolean; type: "fixed" | "percent"; value: number };
  hourlyPackages: {
    id: string;
    name: string;
    hours: number;
    includedKm: number;
    fare: number;
    extraKmRate: number;
  }[];
  inclusions: string;
  exclusions: string;
}
export interface ManagedRoute {
  id: string;
  name: string;
  origin: CabPlace;
  destination: CabPlace;
  status: "draft" | "active" | "inactive";
  tripTypes: CabTripType[];
  categories: CabVehicle[];
  distanceKm: number | null;
  durationMinutes: number | null;
  returnDistanceKm: number | null;
  returnDurationMinutes: number | null;
  distanceSource: "demo" | "osrm" | "mapbox" | "unverified";
  billableKm: number | null;
  defaultMode: FareMode;
  fares: Partial<Record<CabVehicle, FarePolicy>>;
  roundTripFares?: Partial<Record<CabVehicle, FarePolicy>>;
  notes: string;
  development: boolean;
}
export interface ManagedVehicle {
  id: string;
  category: CabVehicle;
  name: string;
  model: string;
  registration: string;
  seats: number;
  luggage: number | null;
  amenities: string[];
  image: string;
  active: boolean;
  availability: "available" | "maintenance" | "unavailable";
  routeIds: string[];
  notes: string;
  development: boolean;
}
export interface ManagedDriver {
  id: string;
  name: string;
  phone: string;
  notes: string;
  approved: boolean;
  active: boolean;
  availability: "available" | "off-duty" | "unavailable";
  development: boolean;
}
export interface CabSettings {
  enabledTripTypes: CabTripType[];
  fixedAdditionalCharge: number;
  bookingPolicy: string;
  assignmentBufferMinutes: number;
  notifications: { customer: boolean; admin: boolean };
  mockPaymentsEnabled: boolean;
}
export interface PaymentAttempt {
  id: string;
  bookingId: string;
  amount: number;
  amountPaise: number;
  currency: "INR";
  status: "PENDING" | "SUCCESSFUL" | "FAILED" | "REFUNDED";
  provider: "mock" | "razorpay";
  orderId: string;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
  eventIds: string[];
}
export type EmailKind =
  | "request"
  | "confirmation"
  | "status"
  | "assignment"
  | "payment-success"
  | "payment-failure"
  | "admin-request";
export interface NotificationLog {
  id: string;
  bookingId: string;
  kind: EmailKind;
  audience: "customer" | "admin";
  status: "queued" | "preview" | "sending" | "sent" | "failed";
  attempts: number;
  createdAt: string;
  dedupeKey: string;
  subject: string;
  html: string;
  text: string;
  recipient: string;
  error?: string;
}
export interface CabOperationsData {
  revision: number;
  routes: ManagedRoute[];
  vehicles: ManagedVehicle[];
  drivers: ManagedDriver[];
  settings: CabSettings;
  paymentAttempts: PaymentAttempt[];
  notifications: NotificationLog[];
}
export interface VehicleOption {
  id: CabVehicle;
  name: string;
  model: string;
  seats: number;
  luggage: number | null;
  amenities: string[];
  image: string;
  available: boolean;
  development: boolean;
  requestOnly?: boolean;
  fare?: import("./types").CabFare | null;
}
export interface CabCatalogue {
  mode: string;
  persistent: boolean;
  enabledTripTypes: CabTripType[];
  bookingPolicy: string;
  routes: ManagedRoute[];
  categories: { id: string; name: string }[];
  vehicles: {
    category: CabVehicle;
    seats: number;
    model: string;
    image: string;
    requestOnly?: boolean;
  }[];
  fixedAdditionalCharge: number;
}
export const categoryLabels: Record<CabVehicle, string> = {
  hatchback: "Hatchback",
  sedan: "Sedan",
  suv: "SUV / MPV",
  "premium-mpv": "Premium MPV",
  luxury: "Premium vehicle",
  "tempo-traveller": "Tempo Traveller",
};
export const emptyFare = (): FarePolicy => ({
  mode: "manual",
  manualFare: null,
  baseFare: 0,
  perKm: 0,
  minimumFare: 0,
  billableKm: null,
  minimumKm: 0,
  minimumKmPerDay: 0,
  driverPerDay: 0,
  fixedCharge: null,
  tollMode: "actual",
  tollAmount: 0,
  extras: [],
  discount: { enabled: false, type: "fixed", value: 0 },
  hourlyPackages: [],
  inclusions: "To be confirmed by operations.",
  exclusions:
    "Tolls and parking at actuals unless included in your final quote.",
});
