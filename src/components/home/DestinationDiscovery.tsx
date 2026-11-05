"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Globe2, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { destinationNames, homeDestinations } from "@/data/homeDestinations";
import type { HomeDestination } from "@/data/homeDestinations";
import type { TravelScope } from "@/types";

export function DestinationDiscovery() {
  const [scope, setScope] = useState<TravelScope>("domestic");
  const reduceMotion = useReducedMotion();
  const shown = homeDestinations.filter((destination) => destination.scope === scope);
  const names = destinationNames[scope];

  return (
    <section id="discover" className="scroll-mt-24 overflow-hidden bg-white py-16 sm:py-20 lg:py-28" aria-labelledby="discovery-heading">
      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <p className="text-caption font-semibold uppercase tracking-[0.18em] text-brand-teal">Destination inspiration</p>
            <h2 id="discovery-heading" className="mt-3 text-heading-2 font-semibold tracking-[-0.035em] text-brand-navy">Where does your next story take you?</h2>
            <p className="mt-4 text-body text-secondary">Move between familiar favourites and ideas from around the world. Every journey begins with a little curiosity.</p>
          </div>

          <div className="inline-flex w-fit rounded-full border border-border bg-background p-1" role="tablist" aria-label="Choose destination region">
            {(["domestic", "international"] as const).map((value) => {
              const selected = scope === value;
              return (
                <button key={value} type="button" role="tab" aria-selected={selected} onClick={() => setScope(value)} className={`relative min-h-11 rounded-full px-5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${selected ? "text-white" : "text-secondary hover:text-brand-navy"}`}>
                  {selected ? <motion.span layoutId="scope-pill" className="absolute inset-0 rounded-full bg-brand-navy" transition={{ duration: reduceMotion ? 0 : 0.22 }} /> : null}
                  <span className="relative flex items-center gap-2">{value === "domestic" ? <MapPin className="size-3.5" aria-hidden="true" /> : <Globe2 className="size-3.5" aria-hidden="true" />}{value === "domestic" ? "India" : "World"}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={scope} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }} transition={{ duration: reduceMotion ? 0 : 0.25 }}>
            <div className="mt-10 grid auto-rows-[11rem] gap-4 sm:grid-cols-2 sm:auto-rows-[13rem] lg:grid-cols-4 lg:auto-rows-[12rem]">
              {shown.map((destination, index) => <DiscoveryCard key={destination.id} destination={destination} index={index} />)}
            </div>
            <div className="mt-7 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={`${scope} destination ideas`}>
              {names.map((name) => <span key={name} className="whitespace-nowrap rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-brand-navy">{name}</span>)}
            </div>
            <p className="mt-3 text-xs text-secondary">Discovery ideas shown for inspiration; enquire for current trip planning options.</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function DiscoveryCard({ destination, index }: { destination: HomeDestination; index: number }) {
  const layout = ["sm:col-span-1 sm:row-span-2 lg:col-span-2", "", "sm:row-span-2", ""][index] ?? "";
  return (
    <Link href={destination.href} className={`group relative min-h-0 overflow-hidden rounded-[1.35rem] bg-brand-navy ${layout}`} aria-label={`Explore ${destination.name}: ${destination.descriptor}`}>
      <Image src={destination.src} alt={destination.alt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 30vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/90 via-brand-navy/10 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white">
        <div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-brand-teal">{destination.location}</p><h3 className="mt-1 text-2xl font-semibold tracking-[-0.025em]">{destination.name}</h3><p className="mt-1 text-sm text-white/72">{destination.descriptor}</p></div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/10 transition-colors group-hover:bg-white group-hover:text-brand-navy"><ArrowUpRight className="size-4" aria-hidden="true" /></span>
      </div>
    </Link>
  );
}
