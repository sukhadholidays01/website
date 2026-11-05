import type { TaxiFareExtraCharge, VehicleCategory } from "@/types";

export interface DemoVehicleFareRule {
  baseFare: number;
  pricePerKm: number;
  roundTripDistanceMultiplier: number;
  extraCharges: readonly TaxiFareExtraCharge[];
}

export const demoTaxiFareConfig: Readonly<Record<VehicleCategory, DemoVehicleFareRule>> = {
  hatchback: {
    baseFare: 400,
    pricePerKm: 10,
    roundTripDistanceMultiplier: 2,
    extraCharges: [{ label: "Demo service charge", amount: 100 }],
  },
  sedan: {
    baseFare: 500,
    pricePerKm: 12,
    roundTripDistanceMultiplier: 2,
    extraCharges: [{ label: "Demo service charge", amount: 100 }],
  },
  suv: {
    baseFare: 700,
    pricePerKm: 16,
    roundTripDistanceMultiplier: 2,
    extraCharges: [{ label: "Demo service charge", amount: 150 }],
  },
  luxury: {
    baseFare: 1000,
    pricePerKm: 24,
    roundTripDistanceMultiplier: 2,
    extraCharges: [{ label: "Demo service charge", amount: 200 }],
  },
  "tempo-traveller": {
    baseFare: 1200,
    pricePerKm: 22,
    roundTripDistanceMultiplier: 2,
    extraCharges: [{ label: "Demo service charge", amount: 200 }],
  },
};
