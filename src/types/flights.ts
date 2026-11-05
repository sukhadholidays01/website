import type { FlightTripType, TravelScope } from "@/types";

export interface Airport {
  code: string;
  city: string;
  name: string;
  scope: TravelScope;
}
export interface FlightSearch {
  scope: TravelScope;
  tripType: FlightTripType;
  from: string;
  to: string;
  departure: string;
  returnDate: string;
  nextCity: string;
  nextDate: string;
  adults: number;
  children: number;
}
export interface DemoFlight {
  id: string;
  isDemo: true;
  from: string;
  to: string;
  airline: string;
  number: string;
  departure: string;
  arrival: string;
  arrivalDayOffset: number;
  duration: number;
  stops: 0 | 1;
  connection?: string;
  fare: number;
  taxes: number;
  aircraft: string;
  baggage: string;
  cabin: string;
  refundability: string;
  rank: number;
}
export interface FlightItinerary {
  id: string;
  legs: { flight: DemoFlight; date: string }[];
  total: number;
  duration: number;
}
export interface FlightFilter {
  stops: string;
  airlines: string[];
  maxPrice: number;
  departure: string;
}
export type FlightSortOrder =
  "recommended" | "price" | "duration" | "departure";
