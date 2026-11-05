"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BusFront, Compass, MapPin, Plane } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const canvasCards = [
  { name: "Dubai", label: "City escape", src: "/images/international/dubai.webp", alt: "Dubai skyline at dusk", className: "right-2 top-4 h-56 w-44 sm:right-10 sm:h-64 sm:w-52 lg:right-12 lg:top-2 lg:h-72 lg:w-56" },
  { name: "Varanasi", label: "Sacred India", src: "/images/destinations/varanasi.webp", alt: "Varanasi riverfront ghats", className: "left-1 top-28 h-48 w-40 sm:left-8 sm:top-36 sm:h-56 sm:w-44 lg:left-4 lg:top-32 lg:h-60 lg:w-48" },
  { name: "Jaipur", label: "Heritage trail", src: "/images/destinations/jaipur.webp", alt: "Historic Jaipur architecture", className: "bottom-2 right-10 h-40 w-52 sm:bottom-4 sm:right-16 sm:h-44 sm:w-60 lg:bottom-1 lg:right-24" },
  { name: "Ayodhya", label: "Spiritual journey", src: "/images/destinations/ayodhya.webp", alt: "Ayodhya temples by the river", className: "bottom-20 left-6 h-28 w-32 sm:bottom-14 sm:left-28 sm:h-32 sm:w-36 lg:bottom-10 lg:left-32" },
] as const;

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#eef9fa_48%,#f8fafc_100%)]" aria-labelledby="hero-heading">
      <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(#12b5c4_0.7px,transparent_0.7px)] [background-size:22px_22px] [mask-image:linear-gradient(to_right,transparent,black,transparent)]" aria-hidden="true" />
      <div className="relative mx-auto grid min-h-[41rem] w-full max-w-[90rem] gap-8 px-4 pb-28 pt-12 sm:px-6 sm:pb-36 sm:pt-16 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-4 lg:px-8 lg:pb-40 lg:pt-14">
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.55, ease: "easeOut" }} className="relative z-10 lg:pb-12">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-teal/25 bg-white px-3 py-1.5 text-caption font-semibold uppercase tracking-[0.16em] text-brand-blue shadow-sm">
            <Compass className="size-3.5 text-brand-teal" aria-hidden="true" /> Creating Happy Memories
          </p>
          <h1 id="hero-heading" className="mt-6 max-w-[12ch] text-[clamp(2.7rem,5.5vw,4.85rem)] font-semibold leading-[1.02] tracking-[-0.052em] text-brand-navy">
            Plan the journey.<br /><span className="text-brand-blue">Create the memory.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-secondary sm:text-lg sm:leading-8">Flights, holidays, buses and cabs — designed around the way you travel.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#discover" className={buttonVariants({ size: "lg" })}>Explore India <ArrowRight className="size-4" aria-hidden="true" /></Link>
            <Link href="#discover" className={buttonVariants({ variant: "secondary", size: "lg" })}>Explore International</Link>
          </div>
        </motion.div>

        <div className="relative mx-auto h-[25rem] w-full max-w-[42rem] sm:h-[31rem] lg:h-[36rem]" aria-label="Destination inspiration: Dubai, Varanasi, Jaipur and Ayodhya">
          <RouteGraphic reduceMotion={Boolean(reduceMotion)} />
          {canvasCards.map((card, index) => (
            <motion.article key={card.name} initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : 0.12 + index * 0.08, ease: "easeOut" }} className={cn("group absolute overflow-hidden rounded-[1.35rem] border-4 border-white bg-brand-navy shadow-[0_20px_45px_rgba(11,55,102,0.18)]", card.className)}>
              <Image src={card.src} alt={card.alt} fill priority={index < 2} sizes="(max-width: 640px) 45vw, 230px" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/85 via-transparent to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 p-3.5 text-white sm:p-4"><p className="text-caption font-medium text-white/72">{card.label}</p><h2 className="mt-0.5 text-lg font-semibold tracking-[-0.02em]">{card.name}</h2></div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RouteGraphic({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="absolute inset-0 z-0 text-brand-blue" aria-hidden="true">
      <svg viewBox="0 0 680 560" className="h-full w-full overflow-visible" fill="none">
        <motion.path d="M88 92 C205 18 326 44 446 112" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 8" initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.34 }} transition={{ duration: reduceMotion ? 0 : 1.25, delay: 0.25 }} />
        <motion.path d="M190 430 C300 500 445 488 598 406" stroke="#12B5C4" strokeWidth="1.5" strokeDasharray="4 7" initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.4 }} transition={{ duration: reduceMotion ? 0 : 1.2, delay: 0.45 }} />
      </svg>
      <div className="absolute left-[7%] top-[8%] flex items-center gap-2 text-[0.65rem] font-semibold"><span className="size-2 rounded-full bg-brand-teal" /> Delhi</div>
      <motion.div className="absolute left-[43%] top-[10%] rounded-full bg-white p-2 shadow-md" animate={reduceMotion ? undefined : { x: [0, 16, 0], y: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}><Plane className="size-4 rotate-12" /></motion.div>
      <div className="absolute bottom-[8%] left-[24%] flex items-center gap-2 text-[0.65rem] font-semibold">Ayodhya <span className="size-2 rounded-full bg-brand-teal" /></div>
      <motion.div className="absolute bottom-[9%] left-[55%] rounded-full bg-white p-2 shadow-md" animate={reduceMotion ? undefined : { x: [0, 12, 0] }} transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}><BusFront className="size-4" /></motion.div>
      <MapPin className="absolute right-[4%] top-[20%] size-5 text-brand-teal" />
    </div>
  );
}
