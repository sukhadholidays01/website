import type { CabBooking, CabState } from "./types";
import { indiaTime } from "./validation";

export function assignmentWindow(
  booking: CabBooking,
  state: CabState,
): [number, number] {
  const start = indiaTime(booking.journey.departure);
  const configured = state.operations.routes.find(
    (r) => r.id === booking.journey.routeId,
  );
  const minutes = booking.journey.durationHours
    ? booking.journey.durationHours * 60
    : (booking.route?.durationMinutes ?? configured?.durationMinutes);
  const end =
    booking.journey.tripType === "round-trip" && booking.journey.returnAt
      ? indiaTime(booking.journey.returnAt)
      : minutes
        ? start + minutes * 60000
        : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw Error(
      "Verify trip duration or select an hourly package before assignment.",
    );
  return [
    start,
    end + state.operations.settings.assignmentBufferMinutes * 60000,
  ];
}
export function assertAssignment(
  state: CabState,
  booking: CabBooking,
  driverId: string,
  vehicleId: string,
) {
  const driver = state.operations.drivers.find((d) => d.id === driverId);
  const vehicle = state.operations.vehicles.find((v) => v.id === vehicleId);
  if (
    !driver ||
    !driver.active ||
    !driver.approved ||
    driver.availability !== "available"
  )
    throw Error("Choose an active, approved driver who is on duty.");
  if (!vehicle || !vehicle.active || vehicle.availability !== "available")
    throw Error("Choose an active vehicle with operational availability.");
  if (
    vehicle.category !== booking.journey.vehicle ||
    vehicle.seats < booking.journey.passengers
  )
    throw Error(
      "Vehicle category or passenger capacity does not match this booking.",
    );
  if (
    vehicle.routeIds.length &&
    (!booking.journey.routeId ||
      !vehicle.routeIds.includes(booking.journey.routeId))
  )
    throw Error("This vehicle is not enabled for the requested route.");
  const [start, end] = assignmentWindow(booking, state);
  for (const other of state.bookings) {
    if (
      other.id === booking.id ||
      !other.assignment ||
      !["ASSIGNED", "IN_PROGRESS"].includes(other.status)
    )
      continue;
    const [otherStart, otherEnd] = assignmentWindow(other, state);
    if (
      start < otherEnd &&
      end > otherStart &&
      (other.assignment.driverId === driverId ||
        other.assignment.vehicleId === vehicleId ||
        other.assignment.phone.replace(/\D/g, "") ===
          driver.phone.replace(/\D/g, "") ||
        other.assignment.vehicle.replace(/\W/g, "").toUpperCase() ===
          vehicle.registration.replace(/\W/g, "").toUpperCase())
    )
      throw Error(
        "Driver or vehicle has a conflicting booking, including the configured turnaround buffer.",
      );
  }
  return {
    driver: driver.name,
    phone: driver.phone,
    vehicle: vehicle.registration,
    driverId,
    vehicleId,
  };
}
