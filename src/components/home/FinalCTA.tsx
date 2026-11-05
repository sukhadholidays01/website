"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";

const fragments = [
  { name: "Ayodhya", src: "/images/destinations/ayodhya.webp", className: "-left-4 top-8 h-24 w-20 -rotate-6 sm:left-8 sm:h-32 sm:w-28" },
  { name: "Dubai", src: "/images/international/dubai.webp", className: "-right-3 top-7 h-28 w-24 rotate-6 sm:right-10 sm:h-36 sm:w-32" },
  { name: "Goa", src: "/images/domestic/goa.webp", className: "bottom-5 left-[12%] h-20 w-28 rotate-3 sm:left-[19%] sm:h-24 sm:w-36" },
  { name: "Varanasi", src: "/images/destinations/varanasi.webp", className: "bottom-4 right-[10%] h-20 w-24 -rotate-3 sm:right-[20%] sm:h-24 sm:w-32" },
] as const;

export function FinalCTA() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="overflow-hidden bg-background px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24" aria-labelledby="final-cta-heading">
      <div className="relative mx-auto flex min-h-[25rem] w-full max-w-[90rem] items-center justify-center overflow-hidden rounded-[1.75rem] bg-brand-light-teal px-8 py-20 text-center sm:min-h-[29rem]">
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(#0B3766_0.65px,transparent_0.65px)] [background-size:20px_20px] [mask-image:radial-gradient(circle_at_center,transparent_10%,black_90%)]" aria-hidden="true" />
        {fragments.map((fragment, index) => <motion.div key={fragment.name} initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : index * 0.06 }} className={`absolute overflow-hidden rounded-2xl border-4 border-white shadow-[0_16px_36px_rgba(11,55,102,0.17)] ${fragment.className}`}><Image src={fragment.src} alt={`${fragment.name} destination inspiration`} fill sizes="150px" className="object-cover" /><span className="absolute inset-x-0 bottom-0 bg-brand-navy/75 px-2 py-1.5 text-[0.65rem] font-semibold text-white">{fragment.name}</span></motion.div>)}
        <div className="relative z-10 mx-auto max-w-2xl rounded-3xl bg-brand-light-teal/90 px-5 py-8 backdrop-blur-sm sm:px-12">
          <p className="text-caption font-semibold uppercase tracking-[0.18em] text-brand-teal">Your next chapter</p>
          <h2 id="final-cta-heading" className="mt-4 text-heading-1 font-semibold tracking-[-0.045em] text-brand-navy">Where will you go next?</h2>
          <p className="mt-4 text-body text-secondary">Your next memory is somewhere out there.</p>
          <Link href="#booking" className={buttonVariants({ size: "lg", className: "mt-7" })}>Start Planning <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}
