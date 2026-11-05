import { ArrowUpRight, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { Destination } from "@/types";

interface DestinationCardProps {
  destination: Destination;
  featured?: boolean;
}

export function DestinationCard({ destination, featured = false }: DestinationCardProps) {
  return (
    <Link
      href={`/holidays/${destination.slug}`}
      className={`group relative block overflow-hidden rounded-2xl bg-brand-navy ${featured ? "min-h-[27rem] sm:min-h-[34rem]" : "min-h-[17rem] sm:min-h-[20rem]"}`}
      aria-label={`Explore ${destination.name}: ${destination.travelStyle}`}
    >
      <Image
        src={destination.image}
        alt={`${destination.name}, ${destination.region} — ${destination.travelStyle}`}
        fill
        sizes={featured ? "(max-width: 1024px) 100vw, 62vw" : "(max-width: 1024px) 50vw, 38vw"}
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/90 via-brand-navy/15 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
        <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.15em] text-white/72">
          <MapPin className="size-3.5 text-brand-teal" aria-hidden="true" /> {destination.region}
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h3 className={`${featured ? "text-3xl sm:text-4xl" : "text-2xl"} font-semibold tracking-[-0.025em]`}>{destination.name}</h3>
            <p className="mt-1 text-sm text-white/78">{destination.travelStyle}</p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/10 transition-colors group-hover:bg-white group-hover:text-brand-navy">
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
