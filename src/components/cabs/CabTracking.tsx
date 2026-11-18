"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { cabApi } from "@/lib/cab/client";
import type { PublicCabBooking } from "@/lib/cab/types";
const CabMap = dynamic(() => import("./CabMap").then(m => m.CabMap), { ssr: false, loading: () => <p role="status">Loading journey map…</p> });
export interface TrackingData { active: boolean; stale: boolean; location: { lat: number; lon: number; accuracy: number; at: string } | null; status: string; timeline?: PublicCabBooking["history"] }
export function CabTracking({ booking, token, admin = false }: { booking: PublicCabBooking; token?: string; admin?: boolean }) {
  const [tracking, setTracking] = useState<TrackingData>();
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (document.hidden) { timer = setTimeout(poll, 15000); return; }
      try {
        let current: TrackingData;
        if (admin) {
          const data = await cabApi<{ trips: { booking: PublicCabBooking; tracking: TrackingData }[] }>("admin/tracking", { signal: controller.signal });
          current = data.trips.find(t => t.booking.id === booking.id)?.tracking || { active: false, stale: true, location: null, status: booking.status };
        } else current = await cabApi<TrackingData>("tracking/" + booking.id, { token, signal: controller.signal });
        if (controller.signal.aborted) return;
        setTracking(current); setError("");
        if (!["COMPLETED", "CANCELLED"].includes(current.status)) timer = setTimeout(poll, current.active ? 15000 : 30000);
      } catch (e) { if (!controller.signal.aborted) { setError((e as Error).message); setTracking(previous => previous ? { ...previous, stale: true } : previous); timer = setTimeout(poll, 30000); } }
    }
    void poll(); return () => { controller.abort(); clearTimeout(timer); };
  }, [booking.id, booking.status, token, admin]);
  const stale = tracking?.stale;
  return <section className="cb-tracking" aria-label="Booking tracking">
    <div className="cb-section-top"><p className="cb-eyebrow">YOUR JOURNEY</p><h2>Track your cab</h2></div>
    <p className="cb-callout" role="status">{!tracking ? "Checking tracking availability…" : !tracking.active ? "GPS tracking is unavailable until an assigned trip is active, and stops when the trip closes." : !tracking.location ? "Waiting for the assigned driver to share GPS. Live location is not available yet." : stale ? "Location is stale. This marker is the last received position." : "Receiving the assigned driver’s GPS updates."}</p>
    {error && <p role="alert" className="cb-alert">{error}</p>}
    <CabMap origin={booking.journey.origin} destination={booking.journey.destination} route={booking.route} driver={tracking?.location} />
    {tracking?.location && <p className="cb-note">Last GPS update: {new Date(tracking.location.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST · Accuracy ±{Math.round(tracking.location.accuracy)} m. {stale ? "Do not rely on this position for arrival time." : "Arrival time is unavailable; GPS alone does not establish ETA."}</p>}
    <div className="cb-details"><div><dt>Reference</dt><dd>{booking.id}</dd></div><div><dt>Pickup · IST</dt><dd>{booking.journey.departure.replace("T", " ")}</dd></div><div><dt>Driver</dt><dd>{booking.assignment ? <>{booking.assignment.driver}<br/><a href={"tel:" + booking.assignment.phone}>{booking.assignment.phone}</a><br/>{booking.assignment.vehicle}</> : "Not assigned"}</dd></div></div>
    <ol className="cb-tracking-timeline">{(tracking?.timeline || booking.history).filter(h => (h.statusTo && h.statusTo !== h.statusFrom) || h.message === "Driver is on the way to pickup.").map((h, i) => <li key={i}><strong>{h.statusTo?.replaceAll("_", " ") || "DRIVER ON THE WAY"}</strong><span>{new Date(h.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</span></li>)}</ol>
  </section>;
}
