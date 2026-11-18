"use client";
import { useEffect, useRef, useState } from "react";
import { cabApi } from "@/lib/cab/client";
import "./cab-live.css";
type DriverBooking = { id: string; origin: string; destination: string; departure: string; status: string };
export function CabDriverPortal() {
  const [booking, setBooking] = useState<DriverBooking>();
  const [message, setMessage] = useState("Checking driver access…");
  const [sharing, setSharing] = useState(false);
  const watch = useRef<number | undefined>(undefined);
  const stop = () => { if (watch.current !== undefined) navigator.geolocation.clearWatch(watch.current); watch.current = undefined; setSharing(false); };
  useEffect(() => {
    let disposed = false;
    async function login() {
      const token = new URLSearchParams(location.hash.slice(1)).get("access");
      if (token) { await cabApi("driver/session", { method: "POST", body: { token } }); history.replaceState(null, "", location.pathname); }
      const result = await cabApi<{ booking: DriverBooking }>("driver/session");
      if (!disposed) { setBooking(result.booking); setMessage("Access is restricted to this assigned trip. Start sharing only while on duty."); }
    }
    void login().catch(e => { if (!disposed) setMessage(e.message); });
    return () => { disposed = true; if (watch.current !== undefined) navigator.geolocation.clearWatch(watch.current); };
  }, []);
  function start() {
    if (!booking || !navigator.geolocation) { setMessage("GPS is unavailable in this browser."); return; }
    let last = 0, sending = false;
    setSharing(true);
    watch.current = navigator.geolocation.watchPosition(position => {
      if (Date.now() - last < 15000 || sending) return;
      last = Date.now(); sending = true;
      void cabApi("driver/location", { method: "POST", body: { bookingId: booking.id, lat: position.coords.latitude, lon: position.coords.longitude, accuracy: position.coords.accuracy } }).then(() => setMessage("GPS update received at " + new Date().toLocaleTimeString("en-IN") + ". Keep this page open; browser backgrounding can pause GPS." )).catch(e => { setMessage(e.message); stop(); }).finally(() => { sending = false; });
    }, error => { setMessage(error.message); stop(); }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
  }
  return <div className="cab-live"><div className="cb-container cb-driver-portal"><section className="cb-main-card"><p className="cb-eyebrow">SUKHAD HOLIDAYS · DRIVER</p><h1>Assigned journey</h1><p role="status" className="cb-callout">{message}</p>{booking && <><h2>{booking.origin} → {booking.destination}</h2><p>{booking.id}</p><p>{booking.departure.replace("T", " ")} IST · {booking.status}</p><p className="cb-note">Sharing sends only your latest GPS position to this booking’s authorised customer and operations team. It stops when you stop sharing or close the page. HTTPS and location permission are required.</p><div className="cb-actions"><button className="cb-btn" onClick={async () => { try { await cabApi("driver/on-way", { method: "POST", body: { bookingId: booking.id } }); setMessage("Operations and the customer can see that you are on the way."); } catch(e) { setMessage((e as Error).message); } }}>I am on the way to pickup</button><button className="cb-btn cb-primary" disabled={sharing} onClick={start}>Start GPS sharing</button><button className="cb-btn" disabled={!sharing} onClick={stop}>Stop sharing</button><button className="cb-btn" onClick={async () => { stop(); await cabApi("driver/session", { method: "DELETE" }); setBooking(undefined); setMessage("Signed out. Driver access was revoked."); }}>Sign out</button></div></>}</section></div></div>;
}
