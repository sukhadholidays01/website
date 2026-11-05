import { ArrowRight, MapPin } from "lucide-react";

interface RoutePreviewProps {
  origin: string;
  destination: string;
  distanceKm?: number;
  source?: "demo" | "google-routes";
}

export function RoutePreview({ origin, destination, distanceKm, source = "demo" }: RoutePreviewProps) {
  return (
    <div className="rounded-xl border border-brand-teal/25 bg-brand-light-teal/55 p-4 sm:p-5">
      <div className="grid grid-cols-[auto_minmax(3rem,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-caption text-secondary">Origin</p>
          <p className="mt-1 truncate text-sm font-semibold text-brand-navy">{origin}</p>
        </div>
        <div className="flex items-center gap-2 text-brand-teal" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-brand-teal" />
          <span className="h-px flex-1 border-t border-dashed border-brand-teal" />
          <ArrowRight className="size-4" />
          <span className="size-2.5 rounded-full bg-brand-teal" />
        </div>
        <div className="min-w-0 text-right">
          <p className="text-caption text-secondary">Destination</p>
          <p className="mt-1 truncate text-sm font-semibold text-brand-navy">{destination}</p>
        </div>
      </div>
      {distanceKm !== undefined ? (
        <div className="mt-4 flex items-center justify-between border-t border-brand-teal/20 pt-3 text-caption">
          <span className="inline-flex items-center gap-1.5 font-semibold text-brand-blue">
            <MapPin className="size-3.5" aria-hidden="true" /> {distanceKm} km
          </span>
          <span className="text-secondary">{source === "demo" ? "Configured demo distance" : "Google Routes distance"}</span>
        </div>
      ) : null}
    </div>
  );
}
