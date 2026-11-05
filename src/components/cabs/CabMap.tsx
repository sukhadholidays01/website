"use client";
import { useEffect, useRef, useState } from "react";
import type { CabPlace, CabRoute } from "@/lib/cab/types";
import "leaflet/dist/leaflet.css";
export function CabMap({
  origin,
  destination,
  route,
}: {
  origin: CabPlace;
  destination: CabPlace;
  route?: CabRoute | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    void import("leaflet")
      .then((L) => {
        if (disposed || !container.current) return;
        map = L.map(container.current, { scrollWheelZoom: false });
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
        ).addTo(map);
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
    };
  }, [origin, destination, route]);
  return (
    <div className="cb-map-wrap">
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
