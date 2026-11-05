import type { CabConfig, CabFare, CabJourney, CabRoute } from "./types";
import { indiaTime } from "./validation";
const round = (n: number) => Math.round(n * 100) / 100;
export function calculateCabFare(
  j: CabJourney,
  route: CabRoute | null,
  config: CabConfig,
): CabFare {
  const days =
    j.tripType === "round-trip" && j.returnAt
      ? Math.max(
          1,
          Math.ceil(
            (indiaTime(j.returnAt) - indiaTime(j.departure)) / 86400000,
          ),
        )
      : 1;
  const km = route
    ? round(
        route.distanceKm +
          (j.tripType === "round-trip"
            ? (route.returnDistanceKm ?? route.distanceKm)
            : 0),
      )
    : null;
  const fare: CabFare = {
    method: "quote",
    total: null,
    distanceKm: km,
    billableKm: null,
    days,
    lines: [],
    inclusions: "To be specified in your quote.",
    exclusions: "To be specified in your quote.",
    version: `${config.revision}:${Date.now()}`,
  };
  const fixed = config.manual.find(
    (r) =>
      r.active &&
      r.origin.toLowerCase() === j.origin.city.toLowerCase() &&
      r.destination.toLowerCase() === j.destination.city.toLowerCase() &&
      r.tripType === j.tripType &&
      r.vehicle === j.vehicle &&
      r.fixedFare !== null &&
      (j.tripType !== "airport" ||
        !r.airportDirection ||
        r.airportDirection === "both" ||
        r.airportDirection === j.airportDirection),
  );
  if (fixed)
    return {
      ...fare,
      method: "manual",
      total: fixed.fixedFare,
      lines: [{ label: "Fixed route fare", amount: fixed.fixedFare! }],
      inclusions: fixed.inclusions,
      exclusions: fixed.exclusions,
    };
  const auto = config.automatic.find(
    (r) => r.active && r.vehicle === j.vehicle && r.tripType === j.tripType,
  );
  if (
    !auto ||
    km === null ||
    auto.base === null ||
    auto.perKm === null ||
    auto.driverPerDay === null ||
    auto.minimumKm === null ||
    (j.tripType === "round-trip" &&
      (auto.minimumKmPerDay === null || !route?.returnDistanceKm))
  )
    return fare;
  const billableKm = round(
    Math.max(
      km,
      auto.minimumKm,
      j.tripType === "round-trip" ? auto.minimumKmPerDay! * days : 0,
    ),
  );
  const lines = [
    { label: "Base fare", amount: auto.base },
    {
      label: `${billableKm} billable km × ₹${auto.perKm}/km`,
      amount: round(billableKm * auto.perKm),
    },
    {
      label: `Driver allowance · ${days} day(s)`,
      amount: round(days * auto.driverPerDay),
    },
  ];
  return {
    ...fare,
    method: "automatic",
    billableKm,
    total: round(lines.reduce((s, l) => s + l.amount, 0)),
    lines,
    inclusions: auto.inclusions,
    exclusions: auto.exclusions,
  };
}
