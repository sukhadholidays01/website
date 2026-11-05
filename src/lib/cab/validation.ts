import { z } from "zod";

export const tripSchema = z.enum([
  "one-way",
  "round-trip",
  "airport",
  "local",
  "custom",
]);
export const vehicleSchema = z.enum([
  "sedan",
  "suv",
  "luxury",
  "tempo-traveller",
  "hatchback",
  "premium-mpv",
]);
const text = (max = 200) => z.string().trim().max(max);
export const placeSchema = z.object({
  id: text(100).min(1),
  label: text().min(2),
  city: text(100).min(2),
  lat: z.number().min(6).max(38),
  lon: z.number().min(68).max(98),
  airport: z.boolean().optional(),
});
// datetime-local is explicitly interpreted in India time on the server.
export function indiaTime(value: string) {
  return Date.parse(value + ":00+05:30");
}
const datetime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  .refine(
    (v) =>
      Number.isFinite(indiaTime(v)) &&
      new Date(indiaTime(v) + 330 * 60000).toISOString().slice(0, 16) === v,
    "Enter a valid date and time.",
  );
export const journeySchema = z
  .object({
    tripType: tripSchema,
    airportDirection: z.enum(["pickup", "drop"]),
    origin: placeSchema,
    destination: placeSchema,
    departure: datetime,
    returnAt: z.union([datetime, z.literal("")]).optional(),
    passengers: z.number().int().min(1).max(30),
    vehicle: vehicleSchema,
    flightNumber: text(20).optional(),
    routeId: text(100).optional(),
    packageId: text(100).optional(),
    durationHours: z.number().int().min(1).max(720).optional(),
    pickupAddress: text(400).min(5, "Enter your pickup address or terminal."),
    dropAddress: text(400).min(5, "Enter your drop address or terminal."),
  })
  .superRefine((j, c) => {
    if (indiaTime(j.departure) < Date.now() + 15 * 60000)
      c.addIssue({
        code: "custom",
        path: ["departure"],
        message: "Choose a pickup at least 15 minutes from now (India time).",
      });
    if (
      j.tripType !== "local" &&
      j.origin.lat === j.destination.lat &&
      j.origin.lon === j.destination.lon
    )
      c.addIssue({
        code: "custom",
        path: ["destination"],
        message: "Choose different pickup and drop locations.",
      });
    if (
      j.tripType === "round-trip" &&
      (!j.returnAt || indiaTime(j.returnAt) <= indiaTime(j.departure))
    )
      c.addIssue({
        code: "custom",
        path: ["returnAt"],
        message: "Return time must be after pickup time.",
      });
    if (
      j.returnAt &&
      indiaTime(j.returnAt) - indiaTime(j.departure) > 30 * 86400000
    )
      c.addIssue({
        code: "custom",
        path: ["returnAt"],
        message: "For trips longer than 30 days, contact operations.",
      });
    if (
      j.tripType === "airport" &&
      (!(j.airportDirection === "pickup" ? j.origin : j.destination).airport ||
        (j.airportDirection === "pickup" ? j.destination : j.origin).airport)
    )
      c.addIssue({
        code: "custom",
        path: ["origin"],
        message: "Select one airport and one city/address for this transfer.",
      });
  });
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{10,20}$/, "Enter a valid phone number.")
  .refine((v) => {
    const digits = v.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }, "Enter a valid phone number.");
export const customerSchema = z.object({
  name: text(100).min(2),
  phone: phoneSchema,
  email: z.email().max(150),
  notes: text(1500),
});
const amount = z
  .number()
  .finite()
  .min(0)
  .multipleOf(0.01)
  .max(10000000)
  .nullable();
export const configSchema = z
  .object({
    revision: z.number().int().positive(),
    manual: z
      .array(
        z.object({
          id: text(100).min(1),
          origin: text(100).min(2),
          destination: text(100).min(2),
          tripType: tripSchema,
          vehicle: vehicleSchema,
          active: z.boolean(),
          fixedFare: amount,
          sourceNote: text(500),
          inclusions: text(500),
          exclusions: text(500),
          airportDirection: z.enum(["pickup", "drop", "both"]).optional(),
        }),
      )
      .max(1000),
    automatic: z
      .array(
        z.object({
          vehicle: vehicleSchema,
          tripType: tripSchema,
          active: z.boolean(),
          base: amount,
          perKm: amount,
          minimumKm: amount,
          minimumKmPerDay: amount,
          driverPerDay: amount,
          inclusions: text(500),
          exclusions: text(500),
        }),
      )
      .max(30),
  })
  .superRefine((config, c) => {
    const keys = new Set<string>();
    for (const r of config.manual) {
      if (!r.active) continue;
      if (
        r.fixedFare === null ||
        r.fixedFare <= 0 ||
        !r.inclusions ||
        !r.exclusions
      )
        c.addIssue({
          code: "custom",
          message:
            "Active fixed fares need a positive fare and inclusion/exclusion details.",
        });
      const directions =
        r.tripType === "airport"
          ? !r.airportDirection || r.airportDirection === "both"
            ? ["pickup", "drop"]
            : [r.airportDirection]
          : [""];
      for (const direction of directions) {
        const key = [
          r.origin.toLowerCase(),
          r.destination.toLowerCase(),
          r.tripType,
          r.vehicle,
          direction,
        ].join("|");
        if (keys.has(key))
          c.addIssue({
            code: "custom",
            message:
              "Duplicate active fixed fare for the same route, trip, vehicle and airport direction.",
          });
        keys.add(key);
      }
    }
    const autoKeys = new Set<string>();
    for (const r of config.automatic) {
      const key = r.tripType + r.vehicle;
      if (autoKeys.has(key))
        c.addIssue({
          code: "custom",
          message: "Duplicate automatic fare rule.",
        });
      autoKeys.add(key);
      if (
        r.active &&
        (r.base === null ||
          r.perKm === null ||
          r.perKm <= 0 ||
          r.minimumKm === null ||
          r.driverPerDay === null ||
          (r.tripType === "round-trip" && r.minimumKmPerDay === null) ||
          !r.inclusions ||
          !r.exclusions)
      )
        c.addIssue({
          code: "custom",
          message:
            "Complete the rates, minimum kilometres, allowances and inclusion/exclusion details before activating automatic pricing.",
        });
    }
  });
