import { ArrowUpRight, BusFront, CarFront, MapPinned, Plane } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { homeTravelServices } from "@/data/travelServices";

const icons: Record<string, LucideIcon> = { flights: Plane, holidays: MapPinned, bus: BusFront, cabs: CarFront };

export function TravelServices() {
  return (
    <section className="bg-white py-16 sm:py-20 lg:py-28" aria-labelledby="services-heading">
      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.75fr_1fr] lg:items-end">
          <div><p className="text-caption font-semibold uppercase tracking-[0.18em] text-brand-teal">One journey, every detail</p><h2 id="services-heading" className="mt-3 text-heading-2 font-semibold tracking-[-0.035em] text-brand-navy">Everything for the journey.</h2></div>
          <p className="max-w-xl text-body text-secondary lg:justify-self-end">Move from an idea to a plan with connected travel services, all in one considered experience.</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-12 lg:auto-rows-[12rem]">
          {homeTravelServices.map((service) => {
            const Icon = icons[service.id] ?? MapPinned;
            const layout = service.size === "wide" ? "lg:col-span-7 lg:row-span-2" : service.size === "tall" ? "lg:col-span-5 lg:row-span-3" : "lg:col-span-7 lg:row-span-1";
            return (
              <Link key={service.id} href={service.href} className={`group relative min-h-64 overflow-hidden rounded-[1.45rem] bg-brand-navy text-white ${layout}`} aria-label={`Explore ${service.title}`}>
                <Image src={service.image} alt={service.imageAlt} fill sizes="(max-width: 768px) 100vw, 55vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(5,30,56,0.92)_0%,rgba(5,30,56,0.58)_52%,rgba(5,30,56,0.1)_100%)]" aria-hidden="true" />
                <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-7">
                  <span className="flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm"><Icon className="size-5 text-brand-teal" strokeWidth={1.8} aria-hidden="true" /></span>
                  <div><p className="text-caption font-semibold uppercase tracking-[0.15em] text-brand-teal">{service.title}</p><div className="mt-2 flex items-end justify-between gap-4"><div><h3 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{service.line}</h3><p className="mt-1 text-sm text-white/72">{service.detail}</p></div><span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/30 transition-colors group-hover:bg-white group-hover:text-brand-navy"><ArrowUpRight className="size-4" aria-hidden="true" /></span></div></div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
