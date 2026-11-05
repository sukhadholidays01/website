export type BusType = "Sleeper" | "Seater" | "Semi Sleeper";
export type SeatStatus = "available" | "selected" | "unavailable";
export interface BusSeat {
  id: string;
  row: number;
  column: number;
  status: SeatStatus;
}
export interface DemoBus {
  id: string;
  operator: string;
  coach: string;
  busType: BusType;
  ac: boolean;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  arrivalDayOffset: number;
  durationMinutes: number;
  price: number;
  amenities: readonly string[];
  seats: readonly BusSeat[];
  boarding: string;
  dropping: string;
  isDemo: true;
}
export interface BusSearch {
  from: string;
  to: string;
  date: string;
  travellers: number;
}
export type DeparturePeriod = "Morning" | "Afternoon" | "Evening" | "Night";
export interface BusFilter {
  types: BusType[];
  ac: ("AC" | "Non AC")[];
  departure: DeparturePeriod[];
  maxPrice: number;
}
export type BusSort = "recommended" | "price" | "duration" | "departure";
