"use client";
import { useEffect, useRef, useState } from "react";
import type { CabPlace, CabRoute } from "@/lib/cab/types";
import "leaflet/dist/leaflet.css";
export function CabMap({
  origin,
  destination,
  route,
  driver,
  stops = [],
  useMapbox = false,
  focusPlace,
  onConfirmPin,
}: {
  origin: CabPlace;
  destination: CabPlace;
  route?: CabRoute | null;
  driver?: { lat: number; lon: number; at: string } | null;
  stops?: CabPlace[];
  useMapbox?: boolean;
  focusPlace?: CabPlace;
  onConfirmPin?: (target: "origin" | "destination", coordinates: { lat: number; lon: number }) => Promise<void>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState<"origin" | "destination" | null>(null);
  const [draft, setDraft] = useState<{ lat: number; lon: number }>();
  const [savingPin, setSavingPin] = useState(false);
  const pinMarker = useRef<import("leaflet").Marker | null>(null);
  const publicToken = process.env.NEXT_PUBLIC_CAB_MAPBOX_TOKEN || "";
  const mapbox = origin.id.startsWith("mapbox-") || destination.id.startsWith("mapbox-") || stops.some(p => p.id.startsWith("mapbox-")) || (useMapbox && publicToken.startsWith("pk."));
  const instance = useRef<import("leaflet").Map | null>(null);
  const driverMarker = useRef<import("leaflet").CircleMarker | null>(null);
  const latestDriver = useRef(driver);
  const mapDefinition = JSON.stringify({ origin, destination, route, stops, mapbox, focusPlace, editing });
  const validPin = (p: { lat: number; lon: number }) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && p.lat >= 6 && p.lat <= 38 && p.lon >= 68 && p.lon <= 98;
  function moveDraft(p: { lat: number; lon: number }) { setDraft(p); if (validPin(p)) pinMarker.current?.setLatLng([p.lat, p.lon]); }
  const recenter = () => {
    const points: [number, number][] = [[origin.lat, origin.lon], [destination.lat, destination.lon]];
    points.push(...stops.map((place): [number, number] => [place.lat, place.lon]));
    if (route?.source !== "demo") points.push(...(route?.geometry || []).map(([lon, lat]): [number, number] => [lat, lon]));
    if (driver) points.push([driver.lat, driver.lon]);
    instance.current?.fitBounds(points, { padding: [35, 35], maxZoom: 14, animate: false });
  };
  useEffect(() => {
    latestDriver.current = driver;
    if (!ready || !instance.current) return;
    void import("leaflet").then(L => {
      if (!instance.current) return;
      driverMarker.current?.remove(); driverMarker.current = null;
      if (driver) driverMarker.current = L.circleMarker([driver.lat, driver.lon], { radius: 10, color: "#fff", weight: 3, fillColor: "#0b3766", fillOpacity: 1 }).addTo(instance.current).bindTooltip("Assigned driver · last received GPS position");
    });
  }, [driver, ready]);
  useEffect(() => {
    const { origin, destination, route, stops, mapbox, focusPlace, editing } = JSON.parse(mapDefinition) as { origin: CabPlace; destination: CabPlace; route?: CabRoute | null; stops: CabPlace[]; mapbox: boolean; focusPlace?: CabPlace; editing: "origin" | "destination" | null };
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    void import("leaflet")
      .then((L) => {
        if (disposed || !container.current) return;
        setError("");
        map = L.map(container.current, { scrollWheelZoom: false, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false });
        instance.current = map;
        const location = latestDriver.current;
        if (location) driverMarker.current = L.circleMarker([location.lat, location.lon], { radius: 10, color: "#fff", weight: 3, fillColor: "#0b3766", fillOpacity: 1 }).addTo(map).bindTooltip("Assigned driver · last received GPS position");
        if (mapbox && !/^pk\.[A-Za-z0-9._-]+$/.test(publicToken)) throw Error("Public map token unavailable");
        L.tileLayer(
          mapbox ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}?access_token=${encodeURIComponent(publicToken)}` : process.env.NEXT_PUBLIC_CAB_TILE_URL ||
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            ...(mapbox ? { tileSize: 512, zoomOffset: -1 } : {}),
            referrerPolicy: "strict-origin-when-cross-origin",
            attribution:
              mapbox ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> <a href="https://www.mapbox.com/map-feedback/">Improve this map</a>' : process.env.NEXT_PUBLIC_CAB_TILE_ATTRIBUTION ||
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        ).on("tileerror", () => setError("Map tiles are unavailable. Booking and GPS details remain available.")).addTo(map);
        if (mapbox) {
          const logo = new L.Control({ position: "bottomleft" });
          logo.onAdd = () => {
            const element = L.DomUtil.create("div", "cb-mapbox-wordmark");
            element.innerHTML = '<a href="https://www.mapbox.com/" aria-label="Mapbox"><img src="/images/mapbox-wordmark.svg" alt="Mapbox" width="88" height="23"></a>';
            L.DomEvent.disableClickPropagation(element);
            return element;
          };
          logo.addTo(map);
        }
        const start: L.LatLngTuple = [origin.lat, origin.lon],
          end: L.LatLngTuple = [destination.lat, destination.lon];
        const pickupLabel = document.createElement("span");
        pickupLabel.textContent = "Pickup: " + origin.label;
        const dropLabel = document.createElement("span");
        dropLabel.textContent = "Drop: " + destination.label;
        L.circleMarker(start, {
          radius: 8,
          color: "#fff",
          weight: 3,
          fillColor: "#087f8c",
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip(pickupLabel);
        L.circleMarker(end, {
          radius: 8,
          color: "#fff",
          weight: 3,
          fillColor: "#e68a37",
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip(dropLabel);
        stops.forEach((place, index) => {
          const label = document.createElement("span");
          label.textContent = `Stop ${index + 1}: ${place.label}`;
          L.circleMarker([place.lat, place.lon], { radius: 7, color: "#fff", weight: 3, fillColor: "#15364b", fillOpacity: 1 }).addTo(map!).bindTooltip(label);
        });
        if (route?.source !== "demo" && route?.geometry.length) {
          const line = L.polyline(
            route.geometry.map(([lon, lat]): L.LatLngTuple => [lat, lon]),
            { color: "#087f8c", weight: 5, opacity: 0.85 },
          ).addTo(map);
          map.fitBounds(line.getBounds(), { padding: [30, 30], maxZoom: 14, animate: false });
        } else
          map.fitBounds(L.latLngBounds([start, ...stops.map((place): L.LatLngTuple => [place.lat, place.lon]), end]), {
            padding: [35, 35],
            maxZoom: 12,
            animate: false,
          });
        if (focusPlace) map.setView([focusPlace.lat, focusPlace.lon], 16, { animate: false });
        if (editing) {
          const place = editing === "origin" ? origin : destination;
          const marker = L.marker([place.lat, place.lon], { draggable: true, icon: L.divIcon({ className: "cb-confirm-pin", html: '<span aria-hidden="true">●</span>', iconSize: [36, 36], iconAnchor: [18, 18] }) }).addTo(map).bindTooltip("Drag to your entrance");
          pinMarker.current = marker;
          marker.on("dragend", () => { const point = marker.getLatLng(); setDraft({ lat: point.lat, lon: point.lng }); });
          map.on("click", event => { marker.setLatLng(event.latlng); setDraft({ lat: event.latlng.lat, lon: event.latlng.lng }); });
          map.setView([place.lat, place.lon], 17, { animate: false });
        }
        const resize = new ResizeObserver(() => { if (!disposed) map?.invalidateSize(); });
        setReady(true);
        resize.observe(container.current);
        map.on("unload", () => resize.disconnect());
      })
      .catch(() =>
        setError(
          "Map could not load. Your journey details remain available below.",
        ),
      );
    return () => {
      disposed = true;
      map?.stop();
      map?.remove();
      instance.current = null;
      driverMarker.current = null;
      pinMarker.current = null;
    };
  }, [mapDefinition, publicToken]);
  return (
    <div className="cb-map-wrap">
      <div className="cb-map-toolbar"><span>{ready ? driver ? "Trip map" : "Route preview · not live tracking" : "Loading map…"}</span><button type="button" className="cb-btn" onClick={recenter} disabled={!ready}>Recenter</button></div>
      <div
        className="cb-map"
        ref={container}
        role="region"
        aria-label={`Map from ${origin.label} to ${destination.label}`}
      />
      {error && <p role="status">{error}</p>}
      {onConfirmPin && <div className="cb-pin-controls">
        <p className="cb-note">Confirm the exact entrance. A street or locality result may be approximate.</p>
        <div className="cb-actions">{(["origin", "destination"] as const).map(target => <button key={target} type="button" className="cb-btn" disabled={savingPin} onClick={() => { setError(""); setEditing(target); const place = target === "origin" ? origin : destination; moveDraft({ lat: place.lat, lon: place.lon }); }}>{target === "origin" ? "Adjust pickup pin" : "Adjust drop pin"}</button>)}</div>
        {editing && draft && <fieldset disabled={savingPin}><legend>{editing === "origin" ? "Pickup" : "Drop"}: {editing === "origin" ? origin.label : destination.label}</legend>
          <p className="cb-note">Drag the marker or tap the map at the entrance. The address label stays unchanged; the adjusted pin is your chosen point.</p>
          <div className="cb-fields"><label>Pin latitude<input type="number" step="any" min="6" max="38" value={Number.isFinite(draft.lat) ? draft.lat : ""} onChange={event => moveDraft({ ...draft, lat: event.target.value === "" ? NaN : Number(event.target.value) })} /></label><label>Pin longitude<input type="number" step="any" min="68" max="98" value={Number.isFinite(draft.lon) ? draft.lon : ""} onChange={event => moveDraft({ ...draft, lon: event.target.value === "" ? NaN : Number(event.target.value) })} /></label></div>
          <div className="cb-actions"><button type="button" className="cb-btn cb-primary" disabled={!validPin(draft)} onClick={async () => { setSavingPin(true); setError(""); try { await onConfirmPin(editing, draft); setEditing(null); } catch { setError("Could not confirm this pin. Retry or keep the selected location and enter your exact address."); } finally { setSavingPin(false); } }}>{savingPin ? "Confirming pin…" : "Confirm this pin"}</button><button type="button" className="cb-btn" onClick={() => setEditing(null)}>Cancel pin adjustment</button></div>
        </fieldset>}
      </div>}
      <p className="cb-map-credit">
        Routing: {route?.source || "not requested"}
        {route?.source === "demo" ? " · development estimate" : ""} · Map data:{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          OpenStreetMap contributors
        </a>{" "}
        ·{" "}
        <a
          href="https://www.openstreetmap.org/fixthemap"
          target="_blank"
          rel="noreferrer"
        >
          Report a map issue
        </a>
      </p>
    </div>
  );
}
