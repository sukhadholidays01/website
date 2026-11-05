import { ArrowRight, Globe2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "@/components/travel/SectionHeading";
import { internationalTravelImages } from "@/data/travelImages";

const travelStyles = ["Luxury & City Escape", "Family & City Experience", "Beach Escape"] as const;

export function InternationalTravel() {
  return (
    <section className="overflow-hidden bg-brand-navy py-16 text-white sm:py-20 lg:py-28" aria-labelledby="international-heading">
      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div id="international-heading" className="[&_h2]:text-white [&_p:last-child]:text-white/68">
          <SectionHeading
            eyebrow="International discovery"
            title="See where the world could take you."
            description="Explore destination inspiration for future international holidays. Packages are enquiry-based until inventory is configured."
            action={
              <Link href="/contact?category=International%20Holidays" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-teal hover:text-white">
                Enquire about international travel <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          />
        </div>

        <div className="-mx-4 mt-9 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-4 lg:grid lg:w-full lg:grid-cols-3">
            {internationalTravelImages.map((image, index) => (
              <article key={image.title} className="group relative min-h-[25rem] w-[82vw] max-w-sm shrink-0 overflow-hidden rounded-2xl bg-white/5 lg:w-auto lg:max-w-none">
                <Image src={image.src} alt={image.alt} fill sizes="(max-width: 1024px) 82vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.045]" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/90 via-transparent to-transparent" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.14em] text-brand-teal">
                    <Globe2 className="size-3.5" aria-hidden="true" /> {image.location}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">{image.title}</h3>
                  <p className="mt-1 text-sm text-white/72">{travelStyles[index]}</p>
                  <span className="mt-4 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-caption font-semibold text-white/78">Available on request</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
