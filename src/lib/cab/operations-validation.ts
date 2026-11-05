import { z } from "zod";
import {
  placeSchema,
  phoneSchema,
  tripSchema,
  vehicleSchema,
} from "./validation";
const amount = z.number().finite().min(0).max(10000000);
const text = (max = 200) => z.string().trim().max(max);
export const farePolicySchema = z
  .object({
    mode: z.enum(["manual", "automatic", "hybrid", "hourly"]),
    manualFare: amount.nullable(),
    baseFare: amount,
    perKm: amount,
    minimumFare: amount,
    billableKm: amount.nullable(),
    minimumKm: amount,
    minimumKmPerDay: amount,
    driverPerDay: amount,
    fixedCharge: amount.nullable(),
    tollMode: z.enum(["included", "fixed", "actual"]),
    tollAmount: amount,
    extras: z.array(z.object({ label: text(80).min(2), amount })).max(20),
    discount: z.object({
      enabled: z.boolean(),
      type: z.enum(["fixed", "percent"]),
      value: amount,
    }),
    hourlyPackages: z
      .array(
        z.object({
          id: text(100).min(1),
          name: text(100).min(2),
          hours: z.number().int().min(1).max(24),
          includedKm: amount,
          fare: amount,
          extraKmRate: amount,
        }),
      )
      .max(20),
    inclusions: text(500).min(3),
    exclusions: text(500).min(3),
  })
  .superRefine((p, c) => {
    if (p.discount.type === "percent" && p.discount.value > 100)
      c.addIssue({
        code: "custom",
        message: "Discount percentage cannot exceed 100.",
      });
  });
export const managedRouteSchema = z
  .object({
    id: text(100).min(1),
    name: text(150).min(3),
    origin: placeSchema,
    destination: placeSchema,
    status: z.enum(["draft", "active", "inactive"]),
    tripTypes: z.array(tripSchema).min(1).max(5),
    categories: z.array(vehicleSchema).min(1).max(6),
    distanceKm: amount.nullable(),
    durationMinutes: amount.nullable(),
    returnDistanceKm: amount.nullable(),
    returnDurationMinutes: amount.nullable(),
    distanceSource: z.enum(["unverified", "demo", "osrm", "mapbox"]),
    billableKm: amount.nullable(),
    defaultMode: z.enum(["manual", "automatic", "hybrid", "hourly"]),
    fares: z.partialRecord(vehicleSchema, farePolicySchema),
    roundTripFares: z.partialRecord(vehicleSchema, farePolicySchema).optional(),
    notes: text(1000),
    development: z.boolean(),
  })
  .superRefine((r, c) => {
    if (
      new Set(r.categories).size !== r.categories.length ||
      new Set(r.tripTypes).size !== r.tripTypes.length
    )
      c.addIssue({
        code: "custom",
        message: "Remove duplicate trip types or categories.",
      });
    if (
      r.origin.id === r.destination.id &&
      !r.tripTypes.every((t) => t === "local")
    )
      c.addIssue({
        code: "custom",
        message: "Select different endpoints except for local rentals.",
      });
    if (r.status === "active")
      for (const category of r.categories) {
        if (!r.fares[category])
          c.addIssue({
            code: "custom",
            message: `Configure a fare for ${category} before activation.`,
          });
        if (r.tripTypes.includes("round-trip") && !r.roundTripFares?.[category])
          c.addIssue({
            code: "custom",
            message: `Configure explicit round-trip pricing for ${category}.`,
          });
        const policies = [
          r.fares[category],
          ...(r.tripTypes.includes("round-trip")
            ? [r.roundTripFares?.[category]]
            : []),
        ];
        for (const p of policies) {
          if (!p) continue;
          if (["manual", "hybrid"].includes(p.mode) && p.manualFare === null)
            c.addIssue({
              code: "custom",
              message: "Set the manual amount before activation.",
            });
          if (
            ["automatic", "hybrid"].includes(p.mode) &&
            (p.perKm <= 0 ||
              r.distanceKm === null ||
              !r.durationMinutes ||
              r.distanceSource === "unverified")
          )
            c.addIssue({
              code: "custom",
              message:
                "Automatic/hybrid routes need verified or demo road data and a positive per-kilometre rate.",
            });
          if (p.mode === "hourly" && !p.hourlyPackages.length)
            c.addIssue({
              code: "custom",
              message: "Configure an hourly package before activation.",
            });
        }
        if (
          r.tripTypes.includes("local") &&
          (r.tripTypes.length !== 1 || r.fares[category]?.mode !== "hourly")
        )
          c.addIssue({
            code: "custom",
            message:
              "Local routes need their own hourly-package fares and cannot share an outstation route record.",
          });
      }
  });
export const managedVehicleSchema = z
  .object({
    id: text(100).min(1),
    category: vehicleSchema,
    name: text(100).min(2),
    model: text(100).min(2),
    registration: text(30).min(4),
    seats: z.number().int().min(1).max(30),
    luggage: z.number().int().min(0).max(50).nullable(),
    amenities: z.array(text(80).min(1)).max(20),
    image: text(500),
    active: z.boolean(),
    availability: z.enum(["available", "maintenance", "unavailable"]),
    routeIds: z.array(text(100)).max(100),
    notes: text(1000),
    development: z.boolean(),
  })
  .superRefine((v, c) => {
    if (v.image && !/^\/images\/[a-zA-Z0-9/_.-]+$/.test(v.image))
      c.addIssue({
        code: "custom",
        message:
          "Select an existing image asset. External uploads are preview-only in development.",
      });
  });
export const managedDriverSchema = z.object({
  id: text(100).min(1),
  name: text(100).min(2),
  phone: phoneSchema,
  notes: text(1000),
  approved: z.boolean(),
  active: z.boolean(),
  availability: z.enum(["available", "off-duty", "unavailable"]),
  development: z.boolean(),
});
export const cabSettingsSchema = z.object({
  enabledTripTypes: z.array(tripSchema).min(1).max(5),
  fixedAdditionalCharge: amount,
  bookingPolicy: text(3000).min(10),
  assignmentBufferMinutes: z.number().int().min(0).max(240),
  notifications: z.object({ customer: z.boolean(), admin: z.boolean() }),
  mockPaymentsEnabled: z.boolean(),
});
