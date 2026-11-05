import type { CabFare, CabJourney, CabRoute } from "./types";
import type { CabSettings, FarePolicy, ManagedRoute } from "./models";
import { indiaTime } from "./validation";

const money = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
export function validateFarePolicy(policy: FarePolicy) {
  const amounts = [
    policy.manualFare ?? 0,
    policy.baseFare,
    policy.perKm,
    policy.minimumFare,
    policy.billableKm ?? 0,
    policy.minimumKm,
    policy.minimumKmPerDay,
    policy.driverPerDay,
    policy.fixedCharge ?? 0,
    policy.tollAmount,
    policy.discount.value,
    ...policy.extras.map((e) => e.amount),
    ...policy.hourlyPackages.flatMap((p) => [
      p.fare,
      p.hours,
      p.includedKm,
      p.extraKmRate,
    ]),
  ];
  if (amounts.some((v) => !Number.isFinite(v) || v < 0))
    throw Error("Fare values must be finite and non-negative.");
  if (policy.discount.type === "percent" && policy.discount.value > 100)
    throw Error("Percentage discounts cannot exceed 100%.");
  if (policy.mode === "hybrid" && policy.manualFare === null)
    throw Error("Hybrid pricing needs an explicit manual component.");
}
/** Pure shared calculator used by customer quotes and admin fare previews. No provider or repository calls. */
export function calculateConfiguredFare(
  journey: CabJourney,
  road: CabRoute | null,
  route: ManagedRoute,
  policy: FarePolicy,
  settings: CabSettings,
): CabFare {
  validateFarePolicy(policy);
  const days =
    journey.tripType === "round-trip" && journey.returnAt
      ? Math.max(
          1,
          Math.ceil(
            (indiaTime(journey.returnAt) - indiaTime(journey.departure)) /
              86400000,
          ),
        )
      : 1;
  const distance = road
    ? money(
        road.distanceKm +
          (journey.tripType === "round-trip"
            ? (road.returnDistanceKm ?? NaN)
            : 0),
      )
    : null;
  const result: CabFare = {
    method: "quote",
    total: null,
    distanceKm: Number.isFinite(distance) ? distance : null,
    billableKm: null,
    days,
    lines: [],
    inclusions: policy.inclusions,
    exclusions: policy.exclusions,
    version: `route:${route.id}:${JSON.stringify(policy)}:${settings.fixedAdditionalCharge}`,
    development: true,
  };
  const lines: { label: string; amount: number }[] = [];
  const line = (label: string, amount: number) =>
    lines.push({ label, amount: money(amount) });
  if (policy.mode === "manual") {
    if (policy.manualFare === null) return result;
    line("Manual route fare", policy.manualFare);
  } else if (policy.mode === "hourly") {
    const pack = policy.hourlyPackages.find((p) => p.id === journey.packageId);
    if (!pack) return result;
    line(
      `${pack.name} · ${pack.hours} hours / ${pack.includedKm} km`,
      pack.fare,
    );
    if (distance !== null && distance > pack.includedKm)
      line(
        "Estimated extra kilometres",
        (distance - pack.includedKm) * pack.extraKmRate,
      );
    result.billableKm = pack.includedKm;
  } else {
    if (distance === null || !Number.isFinite(distance)) return result;
    const adjusted =
      policy.billableKm ??
      (route.billableKm !== null
        ? route.billableKm +
          (journey.tripType === "round-trip" ? road!.returnDistanceKm! : 0)
        : distance);
    const billable = money(
      Math.max(
        adjusted,
        policy.minimumKm,
        journey.tripType === "round-trip" ? policy.minimumKmPerDay * days : 0,
      ),
    );
    result.billableKm = billable;
    if (policy.mode === "hybrid")
      line("Explicit hybrid manual component", policy.manualFare!);
    line("Route base fare", policy.baseFare);
    line(
      `${billable} billable road km × ₹${policy.perKm}/km`,
      billable * policy.perKm,
    );
    if (policy.driverPerDay)
      line(`Driver allowance · ${days} day(s)`, days * policy.driverPerDay);
  }
  const subtotal = () => money(lines.reduce((sum, l) => sum + l.amount, 0));
  if (subtotal() < policy.minimumFare)
    line("Minimum fare adjustment", policy.minimumFare - subtotal());
  line(
    "Additional fixed charge",
    policy.fixedCharge ?? settings.fixedAdditionalCharge,
  );
  if (policy.tollMode === "fixed")
    line("Configured toll charges", policy.tollAmount);
  for (const extra of policy.extras) line(extra.label, extra.amount);
  if (policy.discount.enabled)
    line(
      "Configured discount",
      -Math.min(
        subtotal(),
        policy.discount.type === "percent"
          ? (subtotal() * policy.discount.value) / 100
          : policy.discount.value,
      ),
    );
  return {
    ...result,
    method: policy.mode,
    lines,
    total: Math.max(0, subtotal()),
    exclusions: [
      policy.exclusions,
      policy.tollMode === "actual"
        ? "Tolls payable at actuals; not included in this estimate."
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}
