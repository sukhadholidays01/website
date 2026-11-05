export type BookingType = "holidays" | "cabs" | "bus" | "flights";

export type TravelScope = "domestic" | "international";

export interface TravelImage {
  src: string;
  alt: string;
  title: string;
  location: string;
  category: string;
}

export type FlightTripType = "one-way" | "round-trip" | "multi-city";

export interface FlightSearchRequest {
  scope: TravelScope;
  tripType: FlightTripType;
  from: string;
  to: string;
  departureDate: string;
  returnDate?: string;
  travellers: number;
  cabinClass: string;
}

export interface Destination {
  id: string;
  name: string;
  slug: string;
  description: string;
  region: string;
  travelStyle: string;
  image: string;
  imageAvailable: boolean;
  featured: boolean;
}

export interface HolidayPackage {
  id: string;
  title: string;
  slug: string;
  destination: Destination["slug"];
  duration: string;
  price: number | null;
  image: string;
  imageAvailable: boolean;
  description: string;
  featured: boolean;
  scope: TravelScope;
}

export type VehicleCategory = "hatchback" | "sedan" | "suv" | "luxury" | "tempo-traveller";

export interface Vehicle {
  id: string;
  name: string;
  category: VehicleCategory;
  seatingCapacity: number | null;
  luggageCapacity: number | null;
  pricePerKm: number | null;
  image: string;
  imageAvailable: boolean;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: `/${string}`;
  bookingType?: BookingType;
}

export type TaxiTripType = "one-way" | "round-trip";

export interface TaxiBookingRequest {
  pickup: string;
  pickupPlaceId?: string;
  destination: string;
  destinationPlaceId?: string;
  tripType: TaxiTripType;
  travelDate: string;
  passengers: number;
  vehicleId: string;
}

export interface TravelLocationReference {
  label: string;
  placeId?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
}

export interface TaxiRouteLookupRequest {
  origin: TravelLocationReference;
  destination: TravelLocationReference;
}

export type TaxiRouteSource = "demo" | "google-routes";

export interface TaxiRoute {
  id: string;
  origin: string;
  destination: string;
  distanceKm: number;
  durationMinutes: number | null;
  encodedPolyline?: string;
  source: TaxiRouteSource;
  isDemo: boolean;
}

export interface TaxiFareExtraCharge {
  label: string;
  amount: number;
}

export interface TaxiFareBreakdown {
  baseFare: number;
  distanceKm: number;
  pricePerKm: number;
  distanceCharge: number;
  extraCharges: readonly TaxiFareExtraCharge[];
  extraChargesTotal: number;
  totalFare: number;
  isDemo: true;
}
