import type {
  BusFilter,
  BusSearch,
  BusSort,
  BusType,
  DemoBus,
  DeparturePeriod,
} from "@/types/bus";
export const busCities = [
  { name: "Delhi", code: "DEL", stop: "Kashmere Gate" },
  { name: "Ayodhya", code: "AYD", stop: "Ayodhya bus stand" },
  { name: "Jaipur", code: "JAI", stop: "Sindhi Camp" },
  { name: "Lucknow", code: "LKO", stop: "Alambagh" },
  { name: "Haridwar", code: "HWR", stop: "Haridwar bus stand" },
  { name: "Agra", code: "AGR", stop: "ISBT Agra" },
] as const;
export const popularBusJourneys = [
  "Ayodhya",
  "Jaipur",
  "Lucknow",
  "Haridwar",
  "Agra",
].map((to) => ({ from: "Delhi", to, isDemo: true as const }));
const routePlans = [
  { to: "Ayodhya", minutes: 510, fare: 899 },
  { to: "Jaipur", minutes: 300, fare: 549 },
  { to: "Lucknow", minutes: 450, fare: 799 },
  { to: "Haridwar", minutes: 330, fare: 599 },
  { to: "Agra", minutes: 240, fare: 449 },
];
const coachPlans: readonly {
  operator: string;
  coach: string;
  type: BusType;
  ac: boolean;
  departure: string;
  extraMinutes: number;
  extraFare: number;
}[] = [
  {
    operator: "Horizon Demo Coaches",
    coach: "Volvo Multi-Axle",
    type: "Sleeper",
    ac: true,
    departure: "21:30",
    extraMinutes: 0,
    extraFare: 0,
  },
  {
    operator: "Northway Demo Travels",
    coach: "Premium Intercity",
    type: "Seater",
    ac: true,
    departure: "06:15",
    extraMinutes: 30,
    extraFare: -150,
  },
  {
    operator: "Citylink Demo Express",
    coach: "Comfort Coach",
    type: "Semi Sleeper",
    ac: true,
    departure: "14:00",
    extraMinutes: 15,
    extraFare: -50,
  },
  {
    operator: "Horizon Demo Coaches",
    coach: "Volvo Multi-Axle",
    type: "Sleeper",
    ac: true,
    departure: "22:45",
    extraMinutes: -15,
    extraFare: 250,
  },
  {
    operator: "Roadline Demo Travels",
    coach: "Standard Intercity",
    type: "Seater",
    ac: false,
    departure: "08:30",
    extraMinutes: 60,
    extraFare: -250,
  },
  {
    operator: "Northway Demo Travels",
    coach: "Premium Intercity",
    type: "Semi Sleeper",
    ac: true,
    departure: "17:00",
    extraMinutes: 0,
    extraFare: 100,
  },
  {
    operator: "Citylink Demo Express",
    coach: "Comfort Coach",
    type: "Sleeper",
    ac: false,
    departure: "20:15",
    extraMinutes: 45,
    extraFare: -100,
  },
  {
    operator: "Roadline Demo Travels",
    coach: "Executive Coach",
    type: "Seater",
    ac: true,
    departure: "23:30",
    extraMinutes: 15,
    extraFare: -75,
  },
];
export const busFare = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
export const busDuration = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`.trim();
export function busToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function busDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date + "T12:00:00Z"));
}
export const emptyBusFilters: BusFilter = {
  types: [],
  ac: [],
  departure: [],
  maxPrice: 2000,
};
export const busSortOptions: readonly { value: BusSort; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price", label: "Lowest price" },
  { value: "duration", label: "Shortest duration" },
  { value: "departure", label: "Earliest departure" },
];
export function departurePeriod(time: string): DeparturePeriod {
  const h = Number(time.split(":")[0]);
  return h >= 5 && h < 12
    ? "Morning"
    : h >= 12 && h < 17
      ? "Afternoon"
      : h >= 17 && h < 21
        ? "Evening"
        : "Night";
}
export const demoBuses: readonly DemoBus[] = routePlans.flatMap((route, r) =>
  [false, true].flatMap((reverse) =>
    coachPlans.map((coach, i) => {
      const from = reverse ? route.to : "Delhi";
      const to = reverse ? "Delhi" : route.to;
      const durationMinutes = route.minutes + coach.extraMinutes;
      const start =
        Number(coach.departure.slice(0, 2)) * 60 +
        Number(coach.departure.slice(3));
      const end = start + durationMinutes;
      const columns = coach.type === "Sleeper" ? 3 : 4;
      return {
        id: `demo-${r}-${reverse ? "return" : "out"}-${i}`,
        operator: coach.operator,
        coach: coach.coach,
        busType: coach.type,
        ac: coach.ac,
        from,
        to,
        departure: coach.departure,
        arrival: `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
        arrivalDayOffset: Math.floor(end / 1440),
        durationMinutes,
        price: route.fare + coach.extraFare,
        amenities: coach.ac
          ? ["AC", "Charging", "Water"]
          : ["Charging", "Water"],
        boarding: busCities.find((c) => c.name === from)!.stop,
        dropping: busCities.find((c) => c.name === to)!.stop,
        isDemo: true as const,
        seats: Array.from({ length: 8 * columns }, (_, s) => ({
          id: String(s + 1).padStart(2, "0"),
          row: Math.floor(s / columns),
          column: s % columns,
          status: ([3, 7, 12, 18, 23].includes(s)
            ? "unavailable"
            : "available") as "unavailable" | "available",
        })),
      };
    }),
  ),
);
export function findDemoBuses(search: BusSearch) {
  return demoBuses.filter((b) => b.from === search.from && b.to === search.to);
}
export function filterDemoBuses(
  buses: readonly DemoBus[],
  filters: BusFilter,
  sort: BusSort,
) {
  return buses
    .filter(
      (b) =>
        (!filters.types.length || filters.types.includes(b.busType)) &&
        (!filters.ac.length || filters.ac.includes(b.ac ? "AC" : "Non AC")) &&
        (!filters.departure.length ||
          filters.departure.includes(departurePeriod(b.departure))) &&
        b.price <= filters.maxPrice,
    )
    .toSorted((a, b) =>
      sort === "price"
        ? a.price - b.price
        : sort === "duration"
          ? a.durationMinutes - b.durationMinutes
          : sort === "departure"
            ? a.departure.localeCompare(b.departure)
            : 0,
    );
}
