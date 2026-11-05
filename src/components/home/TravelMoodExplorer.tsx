"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Compass } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { travelMoods } from "@/data/travelMoods";
import type { TravelMoodId } from "@/data/travelMoods";

export function TravelMoodExplorer() {
  const [activeMood, setActiveMood] = useState<TravelMoodId>("spiritual");
  const reduceMotion = useReducedMotion();
  const selected = travelMoods.find((mood) => mood.id === activeMood) ?? travelMoods[0];

  return (
    <section className="bg-brand-light-teal/55 py-16 sm:py-20 lg:py-24" aria-labelledby="mood-heading">
      <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-8">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.18em] text-brand-teal">Travel by feeling</p>
          <h2 id="mood-heading" className="mt-3 text-heading-2 font-semibold tracking-[-0.035em] text-brand-navy">What are you travelling for?</h2>
          <p className="mt-4 max-w-md text-body text-secondary">Choose the feeling first. We’ll surface a few places that match the moment.</p>
        </div>

        <div className="min-w-0">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Travel moods">
            {travelMoods.map((mood) => {
              const active = mood.id === activeMood;
              return <button key={mood.id} type="button" role="tab" aria-selected={active} onClick={() => setActiveMood(mood.id)} className={`min-h-11 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${active ? "border-brand-navy bg-brand-navy text-white" : "border-brand-teal/20 bg-white text-brand-navy hover:border-brand-teal"}`}>{mood.label}</button>;
            })}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={selected.id} initial={reduceMotion ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10 }} transition={{ duration: reduceMotion ? 0 : 0.22 }} className="mt-3 rounded-[1.5rem] border border-brand-teal/20 bg-white p-6 shadow-[0_15px_40px_rgba(11,55,102,0.07)] sm:p-8">
              <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-brand-light-teal text-brand-blue"><Compass className="size-5" aria-hidden="true" /></span><div><p className="text-caption font-semibold uppercase tracking-[0.15em] text-brand-teal">{selected.label} inspiration</p><p className="mt-1 font-semibold text-brand-navy">{selected.prompt}</p></div></div>
              <div className="mt-6 flex flex-wrap gap-3">
                {selected.destinations.map((destination, index) => <motion.span key={destination} initial={reduceMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : index * 0.04 }} className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-brand-navy">{String(index + 1).padStart(2, "0")} <span className="ml-2 text-primary">{destination}</span></motion.span>)}
              </div>
              <Link href="/holidays" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-blue hover:text-brand-navy">Discover holiday ideas <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

