import "server-only";
import { z } from "zod";
import {
  cabStorageMode,
  changeCabState,
  listCabCategories,
  readCabState,
} from "./store";
import { CabError } from "./security";
import {
  cabSettingsSchema,
  managedDriverSchema,
  managedRouteSchema,
  managedVehicleSchema,
} from "./operations-validation";
import { lookupCabRoute } from "./maps";
import { indiaTime, placeSchema } from "./validation";
import { assignmentWindow } from "./assignments";
import type { CabJourney, CabState } from "./types";
import { cabVehicles } from "./types";
import {
  categoryLabels,
  type ManagedRoute,
  type ManagedVehicle,
  type ManagedDriver,
} from "./models";
import { calculateConfiguredFare } from "./pricing";

export function matchManagedRoute(
  state: CabState,
  j: CabJourney,
): ManagedRoute | undefined {
  const route = state.operations.routes.find((r) =>
    j.routeId
      ? r.id === j.routeId
      : r.status === "active" &&
        r.origin.id === j.origin.id &&
        r.destination.id === j.destination.id &&
        r.tripTypes.includes(j.tripType),
  );
  if (
    j.routeId &&
    (!route ||
      route.status !== "active" ||
      !route.tripTypes.includes(j.tripType) ||
      route.origin.id !== j.origin.id ||
      route.destination.id !== j.destination.id)
  )
    throw new CabError(
      "This configured route is not available. Choose an active route or request a custom enquiry.",
      409,
    );
  return route?.status === "active" ? route : undefined;
}
export function fleetOptions(
  state: CabState,
  j: CabJourney,
  route?: ManagedRoute,
) {
  const categories = route?.categories || [
    ...new Set(
      state.operations.vehicles.filter((v) => v.active).map((v) => v.category),
    ),
  ];
  return categories.map((category) => {
    const vehicles = state.operations.vehicles.filter(
      (v) =>
        v.category === category &&
        v.active &&
        v.availability === "available" &&
        (!v.routeIds.length || Boolean(route && v.routeIds.includes(route.id))),
    );
    const start = indiaTime(j.departure);
    const end =
      j.tripType === "round-trip" && j.returnAt
        ? indiaTime(j.returnAt)
        : start +
          (j.durationHours
            ? j.durationHours * 60
            : route?.durationMinutes || 0) *
            60000;
    const scheduled = vehicles.filter(
      (v) =>
        !state.bookings.some((b) => {
          if (
            !b.assignment ||
            !["ASSIGNED", "IN_PROGRESS"].includes(b.status) ||
            b.assignment.vehicleId !== v.id
          )
            return false;
          try {
            const [otherStart, otherEnd] = assignmentWindow(b, state);
            return (
              Number.isFinite(start) &&
              end > start &&
              start < otherEnd &&
              end + state.operations.settings.assignmentBufferMinutes * 60000 >
                otherStart
            );
          } catch {
            return true;
          }
        }),
    );
    const compatible = scheduled.filter((v) => v.seats >= j.passengers);
    const example = compatible[0] || vehicles[0];
    return {
      id: category,
      name: categoryLabels[category],
      model: example?.model || "Category not configured",
      seats: Math.max(0, ...vehicles.map((v) => v.seats)),
      luggage: example?.luggage ?? null,
      amenities: example?.amenities || [],
      image: example?.image || "",
      available: compatible.length > 0,
      development: true,
    };
  });
}
export async function publicCatalogue() {
  const state = await readCabState();
  const categories = await listCabCategories();
  const configuredVehicles = state.operations.vehicles
    .filter((v) => v.active)
    .map((v) => ({
      category: v.category,
      seats: v.seats,
      model: v.model,
      image: v.image,
    }));
  const vehicles =
    cabStorageMode() === "mysql" && !configuredVehicles.length
      ? categories.map((item) => ({
          category: item.category,
          seats: item.seats,
          model: "Vehicle preference; availability to be confirmed",
          image:
            cabVehicles.find((vehicle) => vehicle.id === item.category)
              ?.image || "",
          requestOnly: true,
        }))
      : configuredVehicles;
  return {
    mode: cabStorageMode(),
    persistent: cabStorageMode() === "mysql",
    enabledTripTypes: state.operations.settings.enabledTripTypes,
    bookingPolicy: state.operations.settings.bookingPolicy,
    routes: state.operations.routes
      .filter((r) => r.status === "active")
      .map((r) => ({ ...r, notes: undefined })),
    categories: categories.map(({ category, name }) => ({
      id: category,
      name,
    })),
    vehicles,
    fixedAdditionalCharge: state.operations.settings.fixedAdditionalCharge,
  };
}
export async function saveOperationalEntity(kind: string, input: unknown) {
  const body = z
    .object({ revision: z.number().int(), record: z.unknown() })
    .parse(input);
  const record =
    kind === "routes"
      ? managedRouteSchema.parse(body.record)
      : kind === "vehicles"
        ? managedVehicleSchema.parse(body.record)
        : kind === "drivers"
          ? managedDriverSchema.parse(body.record)
          : kind === "settings"
            ? cabSettingsSchema.parse(body.record)
            : null;
  if (!record) throw new CabError("Unknown management section.");
  return changeCabState((state) => {
    if (body.revision !== state.operations.revision)
      throw new CabError(
        "Operations data changed. Reload this section before saving.",
        409,
      );
    if (kind === "settings")
      state.operations.settings = record as typeof state.operations.settings;
    else {
      const collection = state.operations[
        kind as "routes" | "vehicles" | "drivers"
      ] as (ManagedRoute | ManagedVehicle | ManagedDriver)[];
      const candidate = record as (typeof collection)[number];
      if (
        kind === "vehicles" &&
        state.operations.vehicles.some(
          (v) =>
            v.id !== candidate.id &&
            v.registration.replace(/\W/g, "").toUpperCase() ===
              (
                candidate as (typeof state.operations.vehicles)[number]
              ).registration
                .replace(/\W/g, "")
                .toUpperCase(),
        )
      )
        throw new CabError("Vehicle registration is already registered.", 409);
      if (
        kind === "drivers" &&
        state.operations.drivers.some(
          (d) =>
            d.id !== candidate.id &&
            d.phone.replace(/\D/g, "") ===
              (
                candidate as (typeof state.operations.drivers)[number]
              ).phone.replace(/\D/g, ""),
        )
      )
        throw new CabError("Driver phone is already registered.", 409);
      if (
        kind === "vehicles" &&
        (candidate as (typeof state.operations.vehicles)[number]).routeIds.some(
          (id) => !state.operations.routes.some((r) => r.id === id),
        )
      )
        throw new CabError("Vehicle contains an unknown route restriction.");
      const index = collection.findIndex((r) => r.id === candidate.id);
      if (index >= 0) collection[index] = candidate;
      else collection.unshift(candidate);
    }
    state.operations.revision++;
    return state.operations;
  });
}
export async function resolveManagedRoute(input: unknown) {
  const parsed = z
    .object({
      origin: placeSchema,
      destination: placeSchema,
      roundTrip: z.boolean().default(false),
    })
    .parse(input);
  try {
    return await lookupCabRoute({
      origin: parsed.origin,
      destination: parsed.destination,
      tripType: parsed.roundTrip ? "round-trip" : "one-way",
    } as CabJourney);
  } catch {
    throw new CabError(
      "No road route is available from the configured provider. Keep this route as a draft and retry with a configured provider.",
      422,
    );
  }
}
export async function previewManagedRoute(input: unknown) {
  const parsed = z
    .object({
      route: managedRouteSchema,
      journey: z
        .object({
          tripType: z.string(),
          departure: z.string(),
          returnAt: z.string().optional(),
          vehicle: z.string(),
          packageId: z.string().optional(),
        })
        .passthrough(),
    })
    .parse(input);
  const route = parsed.route;
  const j = {
    ...parsed.journey,
    origin: route.origin,
    destination: route.destination,
  } as CabJourney;
  const policy = (
    j.tripType === "round-trip" ? route.roundTripFares : route.fares
  )?.[j.vehicle];
  if (!policy)
    throw new CabError("Configure this vehicle and trip fare first.");
  const road =
    route.distanceKm !== null && route.durationMinutes !== null
      ? {
          distanceKm: route.distanceKm,
          durationMinutes: route.durationMinutes,
          returnDistanceKm: route.returnDistanceKm ?? undefined,
          returnDurationMinutes: route.returnDurationMinutes ?? undefined,
          geometry: [] as [number, number][],
          source:
            route.distanceSource === "unverified"
              ? ("demo" as const)
              : route.distanceSource,
        }
      : null;
  return calculateConfiguredFare(
    j,
    road,
    route,
    policy,
    (await readCabState()).operations.settings,
  );
}
