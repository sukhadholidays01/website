import { demoTaxiFareConfig } from "@/data/taxiFareConfig";
import type { TaxiFareBreakdown, TaxiTripType, Vehicle } from "@/types";

export interface FareCharge {
  label: string;
  amount: number;
}

export interface FareCalculationInput {
  baseFare: number;
  distanceKm: number;
  pricePerKm: number;
  extraCharges?: readonly FareCharge[];
}

export interface FareCalculationResult {
  baseFare: number;
  distanceKm: number;
  pricePerKm: number;
  distanceFare: number;
  extraCharges: number;
  totalFare: number;
}

function assertNonNegative(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a finite, non-negative number.`);
  }
}

function toCurrencyPrecision(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateFare({
  baseFare,
  distanceKm,
  pricePerKm,
  extraCharges = [],
}: FareCalculationInput): FareCalculationResult {
  assertNonNegative(baseFare, "baseFare");
  assertNonNegative(distanceKm, "distanceKm");
  assertNonNegative(pricePerKm, "pricePerKm");

  const extraChargesTotal = extraCharges.reduce((total, charge) => {
    assertNonNegative(charge.amount, `extra charge: ${charge.label}`);
    return total + charge.amount;
  }, 0);
  const distanceFare = distanceKm * pricePerKm;

  return {
    baseFare: toCurrencyPrecision(baseFare),
    distanceKm,
    pricePerKm: toCurrencyPrecision(pricePerKm),
    distanceFare: toCurrencyPrecision(distanceFare),
    extraCharges: toCurrencyPrecision(extraChargesTotal),
    totalFare: toCurrencyPrecision(baseFare + distanceFare + extraChargesTotal),
  };
}

export interface TaxiFareCalculationInput {
  distanceKm: number;
  vehicle: Vehicle;
  tripType: TaxiTripType;
}

export function calculateTaxiFare({
  distanceKm,
  vehicle,
  tripType,
}: TaxiFareCalculationInput): TaxiFareBreakdown {
  assertNonNegative(distanceKm, "distanceKm");

  const rule = demoTaxiFareConfig[vehicle.category];
  const estimatedDistance =
    tripType === "round-trip"
      ? distanceKm * rule.roundTripDistanceMultiplier
      : distanceKm;
  const distanceCharge = estimatedDistance * rule.pricePerKm;
  const extraChargesTotal = rule.extraCharges.reduce((total, charge) => {
    assertNonNegative(charge.amount, `extra charge: ${charge.label}`);
    return total + charge.amount;
  }, 0);

  return {
    baseFare: toCurrencyPrecision(rule.baseFare),
    distanceKm: toCurrencyPrecision(estimatedDistance),
    pricePerKm: toCurrencyPrecision(rule.pricePerKm),
    distanceCharge: toCurrencyPrecision(distanceCharge),
    extraCharges: rule.extraCharges,
    extraChargesTotal: toCurrencyPrecision(extraChargesTotal),
    totalFare: toCurrencyPrecision(rule.baseFare + distanceCharge + extraChargesTotal),
    isDemo: true,
  };
}
