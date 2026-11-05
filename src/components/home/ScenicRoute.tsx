"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CarFront, Check, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/Button";
import { vehicles } from "@/data/vehicles";

const vehicleNotes: Record<string, string> = {
  sedan: "Comfortable point-to-point travel",
  suv: "More room for longer road journeys",
  luxury: "An elevated arrival experience",
  "tempo-traveller": "A practical choice for group travel",
};

export function ScenicRoute() {
  const [vehicleId, setVehicleId] = useState(vehicles[0].id);
  const reduceMotion = useReducedMotion();
  const selected = vehicles.find((vehicle) => vehicle.id === vehicleId) ?? vehicles[0];

  return (
    <section className="overflow-hidden bg-brand-navy py-16 text-white sm:py-20 lg:py-24" aria-labelledby="route-heading">
      <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-8">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.18em] text-brand-teal">Outstation cabs</p>
          <h2 id="route-heading" className="mt-3 text-heading-2 font-semibold tracking-[-0.035em]">Take the scenic route.</h2>
          <p className="mt-4 max-w-lg text-body text-white/68">From airport transfers to Ayodhya–Varanasi and Ayodhya–Prayagraj journeys, choose the vehicle that feels right for the road ahead.</p>

          <div className="mt-8 rounded-[1.4rem] border border-white/15 bg-white/[0.06] p-5 sm:p-6">
            <div className="relative mx-auto h-44 max-w-xl sm:h-28">
              <svg viewBox="0 0 620 120" className="absolute inset-0 hidden h-full w-full sm:block" fill="none" aria-hidden="true">
                <motion.path d="M45 60 H575" stroke="white" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="6 8" initial={reduceMotion ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0 : 1 }} />
              </svg>
              <div className="absolute left-1/2 top-3 h-[8.5rem] -translate-x-1/2 border-l-2 border-dashed border-white/25 sm:left-0 sm:top-1/2 sm:h-auto sm:w-full sm:translate-x-0 sm:-translate-y-1/2 sm:border-l-0 sm:border-t-0" aria-hidden="true" />
              <RouteStop className="left-0 top-0 sm:top-1/2 sm:-translate-y-1/2" city="Ayodhya" />
              <RouteStop className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" city="Prayagraj" />
              <RouteStop className="bottom-0 left-0 sm:bottom-auto sm:left-auto sm:right-0 sm:top-1/2 sm:-translate-y-1/2" city="Varanasi" />
              <motion.span className="absolute left-[calc(50%_-_1.1rem)] top-[38%] flex size-9 items-center justify-center rounded-full bg-brand-teal text-brand-navy shadow-lg sm:left-[10%] sm:top-[calc(50%_-_1.1rem)]" animate={reduceMotion ? undefined : { y: [0, 94, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}><CarFront className="size-4 sm:hidden" aria-hidden="true" /><motion.span className="hidden sm:block" animate={{ x: [0, 440, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}><CarFront className="size-4" aria-hidden="true" /></motion.span></motion.span>
            </div>
            <p className="mt-4 text-xs text-white/50">Route visual is illustrative. Current calculator distances use configured demo values, not live Google Maps data.</p>
          </div>
        </div>

        <div className="rounded-[1.6rem] bg-white p-5 text-primary shadow-[0_28px_70px_rgba(0,0,0,0.2)] sm:p-7">
          <div className="flex items-center justify-between gap-4"><div><p className="text-caption font-semibold uppercase tracking-[0.16em] text-brand-teal">Choose your ride</p><h3 className="mt-1 text-2xl font-semibold text-brand-navy">Made for your kind of journey</h3></div><MapPin className="size-6 text-brand-teal" aria-hidden="true" /></div>
          <div className="-mx-2 mt-5 flex gap-2 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Cab vehicle categories">
            {vehicles.map((vehicle) => <button key={vehicle.id} type="button" role="tab" aria-selected={vehicle.id === vehicleId} onClick={() => setVehicleId(vehicle.id)} className={`min-h-11 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors ${vehicle.id === vehicleId ? "bg-brand-navy text-white" : "border border-border bg-background text-brand-navy hover:border-brand-teal"}`}>{vehicle.name}</button>)}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={selected.id} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} className="mt-4 grid gap-5 rounded-2xl bg-background p-4 sm:grid-cols-[1fr_0.9fr] sm:items-center">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-white"><Image src={selected.image} alt={`${selected.name} cab category`} fill sizes="(max-width: 640px) 100vw, 30vw" className="object-cover" /></div>
              <div><p className="text-caption font-semibold uppercase tracking-[0.14em] text-brand-teal">{selected.name}</p><p className="mt-2 text-lg font-semibold text-brand-navy">{vehicleNotes[selected.category]}</p><ul className="mt-4 space-y-2 text-sm text-secondary"><li className="flex items-center gap-2"><Check className="size-4 text-brand-teal" aria-hidden="true" /> One-way or round-trip</li><li className="flex items-center gap-2"><Check className="size-4 text-brand-teal" aria-hidden="true" /> Enquiry-led booking</li></ul></div>
            </motion.div>
          </AnimatePresence>
          <Link href="/cabs" className={buttonVariants({ size: "lg", className: "mt-5 w-full sm:w-auto" })}>Explore Cabs <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}

function RouteStop({ city, className }: { city: string; className: string }) {
  return <div className={`absolute flex items-center gap-2 text-xs font-semibold ${className}`}><span className="size-3 rounded-full border-2 border-white bg-brand-teal" />{city}</div>;
}
