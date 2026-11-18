import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { CabError, hash } from "./security";
import { changeCabState, readCabState } from "./store";
import { authorizeBooking, getBooking } from "./service";
import type { CabState } from "./types";

export function auditCab(state: CabState, role: string, action: string, entityId: string) {
  (state.audit ||= []).unshift({ id: randomUUID(), role, action, entityId, at: new Date().toISOString() });
}
const active = (status: string) => ["ASSIGNED", "IN_PROGRESS"].includes(status);
export function authorizeDriver(state: CabState, token: string, bookingId?: string) {
  const session = state.driverSessions?.[hash(token)];
  if (!token || !session || session.revoked || Date.parse(session.expiresAt) <= Date.now() || (bookingId && session.bookingId !== bookingId)) throw new CabError("Driver access has expired or is invalid.", 401);
  const booking = getBooking(state, session.bookingId);
  const driver = state.operations.drivers.find(d => d.id === session.driverId);
  if (booking.assignment?.driverId !== session.driverId || !driver?.active || !driver.approved || !active(booking.status)) throw new CabError("This driver is not assigned to an active trip.", 403);
  return { session, booking };
}
export async function issueDriverAccess(bookingId: string, role: string) {
  const token = randomBytes(32).toString("hex");
  return changeCabState(state => {
    const booking = getBooking(state, bookingId);
    if (!booking.assignment?.driverId || !active(booking.status)) throw new CabError("Assign a driver to an active booking first.", 409);
    for (const session of Object.values(state.driverSessions || {})) if (session.bookingId === bookingId) session.revoked = true;
    const expiresAt = new Date(Math.min(Date.now() + 24 * 3600000, Date.parse(booking.journey.returnAt ? booking.journey.returnAt + ":00+05:30" : booking.journey.departure + ":00+05:30") + 24 * 3600000)).toISOString();
    (state.driverSessions ||= {})[hash(token)] = { bookingId, driverId: booking.assignment.driverId, expiresAt, revoked: false };
    auditCab(state, role, "Issued booking-scoped driver access", bookingId);
    return { token, expiresAt };
  });
}
export const locationSchema = z.object({ bookingId: z.string().min(1).max(80), lat: z.number().finite().min(-90).max(90), lon: z.number().finite().min(-180).max(180), accuracy: z.number().finite().min(0).max(10000) }).strict();
export async function updateDriverLocation(token: string, input: unknown) {
  const location = locationSchema.parse(input);
  return changeCabState(state => {
    const { session } = authorizeDriver(state, token, location.bookingId);
    const latest = { driverId: session.driverId, lat: location.lat, lon: location.lon, accuracy: location.accuracy, at: new Date().toISOString() };
    (state.locations ||= {})[location.bookingId] = latest;
    return { at: latest.at };
  });
}
export function trackingSnapshot(state: CabState, bookingId: string) {
  const b = getBooking(state, bookingId);
  const latest = state.locations?.[bookingId];
  const location = active(b.status) && latest?.driverId === b.assignment?.driverId ? latest : null;
  return { bookingId, status: b.status, active: active(b.status), location, stale: !location || Date.now() - Date.parse(location.at) > 120000, timeline: b.history.filter(h => (h.statusTo && h.statusFrom !== h.statusTo) || h.message === "Driver is on the way to pickup.") };
}
export async function customerTracking(bookingId: string, token: string) {
  const state = await readCabState();
  authorizeBooking(getBooking(state, bookingId), token, false);
  const snapshot=trackingSnapshot(state, bookingId);
  return {...snapshot,location:snapshot.location?{lat:snapshot.location.lat,lon:snapshot.location.lon,accuracy:snapshot.location.accuracy,at:snapshot.location.at}:null,timeline:snapshot.timeline.map(event=>({...event,message:event.statusTo?"Booking status: "+event.statusTo.replaceAll("_"," "):"Driver is on the way to pickup."}))};
}
