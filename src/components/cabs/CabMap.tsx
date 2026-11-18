"use client";
import { useEffect, useRef, useState } from "react";
import type { CabPlace, CabRoute } from "@/lib/cab/types";
import "leaflet/dist/leaflet.css";
export function CabMap({
  origin,
  destination,
  route,
  driver,
}: {
  origin: CabPlace;
  destination: CabPlace;
  route?: CabRoute | null;
  driver?: { lat: number; lon: number; at: string } | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const instance = useRef<import("leaflet").Map | null>(null);
  const driverMarker = useRef<import("leaflet").CircleMarker | null>(null);
  const latestDriver = useRef(driver);
  const mapDefinition = JSON.stringify({ origin, destination, route });
  const recenter = () => {
    const points: [number, number][] = [[origin.lat, origin.lon], [destination.lat, destination.lon]];
    if (driver) points.push([driver.lat, driver.lon]);
    instance.current?.fitBounds(points, { padding: [35, 35], maxZoom: 14 });
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
    const { origin, destination, route } = JSON.parse(mapDefinition) as { origin: CabPlace; destination: CabPlace; route?: CabRoute | null };
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    void import("leaflet")
      .then((L) => {
        if (disposed || !container.current) return;
        map = L.map(container.current, { scrollWheelZoom: false });
        instance.current = map;
        const location = latestDriver.current;
        if (location) driverMarker.current = L.circleMarker([location.lat, location.lon], { radius: 10, color: "#fff", weight: 3, fillColor: "#0b3766", fillOpacity: 1 }).addTo(map).bindTooltip("Assigned driver · last received GPS position");
        L.tileLayer(
          process.env.NEXT_PUBLIC_CAB_TILE_URL ||
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            referrerPolicy: "strict-origin-when-cross-origin",
            attribution:
              process.env.NEXT_PUBLIC_CAB_TILE_ATTRIBUTION ||
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        ).on("tileerror", () => setError("Map tiles are unavailable. Booking and GPS details remain available.")).addTo(map);
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
        if (route?.geometry.length) {
          const line = L.polyline(
            route.geometry.map(([lon, lat]): L.LatLngTuple => [lat, lon]),
            { color: "#087f8c", weight: 5, opacity: 0.85 },
          ).addTo(map);
          map.fitBounds(line.getBounds(), { padding: [30, 30], maxZoom: 14 });
        } else
          map.fitBounds(L.latLngBounds([start, end]), {
            padding: [35, 35],
            maxZoom: 12,
          });
        const resize = new ResizeObserver(() => map?.invalidateSize());
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
      map?.remove();
      instance.current = null;
      driverMarker.current = null;
    };
  }, [mapDefinition]);
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
