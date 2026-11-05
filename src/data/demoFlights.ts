import type {
  Airport,
  DemoFlight,
  FlightItinerary,
  FlightSearch,
} from "@/types/flights";

export const airports: Airport[] = [
  {
    code: "DEL",
    city: "Delhi",
    name: "Indira Gandhi International",
    scope: "domestic",
  },
  {
    code: "BOM",
    city: "Mumbai",
    name: "Chhatrapati Shivaji Maharaj International",
    scope: "domestic",
  },
  {
    code: "GOX",
    city: "Goa",
    name: "Manohar International",
    scope: "domestic",
  },
  {
    code: "BLR",
    city: "Bangalore",
    name: "Kempegowda International",
    scope: "domestic",
  },
  {
    code: "JAI",
    city: "Jaipur",
    name: "Jaipur International",
    scope: "domestic",
  },
  {
    code: "DXB",
    city: "Dubai",
    name: "Dubai International",
    scope: "international",
  },
  { code: "SIN", city: "Singapore", name: "Changi", scope: "international" },
  {
    code: "BKK",
    city: "Bangkok",
    name: "Suvarnabhumi",
    scope: "international",
  },
  {
    code: "DPS",
    city: "Bali",
    name: "Ngurah Rai International",
    scope: "international",
  },
];
export const airport = (code: string) => airports.find((a) => a.code === code)!;
export const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
export const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
export const tripLabel = (type: FlightSearch["tripType"]) =>
  ({
    "round-trip": "Round Trip",
    "one-way": "One Way",
    "multi-city": "Multi City",
  })[type];
export const durationLabel = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
// Illustrative schedules and fare fixtures, independent of date. Never represents availability.
const routes = [
  { to: "BOM", duration: 135, price: 5400, offset: 0 },
  { to: "GOX", duration: 155, price: 6200, offset: 0 },
  { to: "BLR", duration: 170, price: 6700, offset: 0 },
  { to: "JAI", duration: 60, price: 3200, offset: 0 },
  { to: "DXB", duration: 235, price: 18450, offset: -90 },
  { to: "SIN", duration: 345, price: 23800, offset: 150 },
  { to: "BKK", duration: 265, price: 19800, offset: 90 },
  { to: "DPS", duration: 660, price: 32600, offset: 150 },
];
const time = (minutes: number) =>
  `${String(Math.floor(((minutes + 1440) % 1440) / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export const demoFlights: readonly DemoFlight[] = routes.flatMap((route, r) =>
  [false, true].flatMap((reverse) =>
    Array.from({ length: 6 }, (_, i): DemoFlight => {
      const stops = route.to === "DPS" || i % 3 === 2 ? 1 : 0;
      const duration =
        route.duration + (stops && route.to !== "DPS" ? 140 : 0) + i * 5;
      const departure = 375 + i * 155;
      const total = route.price + i * 850 - (stops ? 1200 : 0);
      return {
        id: `${reverse ? route.to : "DEL"}-${reverse ? "DEL" : route.to}-${i}`,
        isDemo: true,
        from: reverse ? route.to : "DEL",
        to: reverse ? "DEL" : route.to,
        airline: [
          "IndiGo",
          "Air India",
          route.to === "DXB" ? "Emirates" : "Air India",
        ][i % 3],
        number: `${["6E", "AI", route.to === "DXB" ? "EK" : "AI"][i % 3]} ${140 + r * 17 + i + (reverse ? 200 : 0)}`,
        departure: time(departure),
        arrival: time(
          departure + duration + (reverse ? -route.offset : route.offset),
        ),
        arrivalDayOffset: Math.floor(
          (departure + duration + (reverse ? -route.offset : route.offset)) /
            1440,
        ),
        duration,
        stops,
        connection: stops
          ? route.to === "DPS"
            ? "Singapore"
            : route.to === "BOM"
              ? "Hyderabad"
              : "Mumbai"
          : undefined,
        fare: total - 1550,
        taxes: 1550,
        aircraft:
          i % 3 === 2 && route.to === "DXB"
            ? "Boeing 777 (demo)"
            : "Airbus A320 (demo)",
        baggage: "7 kg cabin · 15 kg checked (illustrative)",
        cabin: "Economy",
        refundability:
          "Illustrative fare: changes and cancellation subject to airline terms; confirm with our team.",
        rank: i,
      };
    }),
  ),
);
export function findItineraries(search: FlightSearch): FlightItinerary[] {
  const pairs = [{ from: search.from, to: search.to, date: search.departure }];
  if (search.tripType === "round-trip")
    pairs.push({ from: search.to, to: search.from, date: search.returnDate });
  if (search.tripType === "multi-city")
    pairs.push({ from: search.to, to: search.nextCity, date: search.nextDate });
  const options = pairs.map((pair) =>
    demoFlights.filter((f) => f.from === pair.from && f.to === pair.to),
  );
  if (options.some((list) => !list.length)) return [];
  return options[0].map((_, i) => {
    const legs = pairs.map((pair, leg) => ({
      flight: options[leg][i % options[leg].length],
      date: pair.date,
    }));
    return {
      id: legs.map((l) => l.flight.id).join("/"),
      legs,
      total: legs.reduce((sum, l) => sum + l.flight.fare + l.flight.taxes, 0),
      duration: legs.reduce((sum, l) => sum + l.flight.duration, 0),
    };
  });
}
