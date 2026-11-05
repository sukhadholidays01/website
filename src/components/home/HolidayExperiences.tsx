import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";

import { ImageReadyMedia } from "@/components/ui/ImageReadyMedia";
import { destinations } from "@/data/destinations";
import { holidayPackages } from "@/data/holidays";

const priceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function HolidayExperiences() {
  const featuredPackages = holidayPackages.slice(0, 3);

  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24" aria-labelledby="experiences-heading">
      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-caption font-semibold uppercase tracking-[0.18em] text-brand-teal">
              Holiday experiences
            </p>
            <h2
              id="experiences-heading"
              className="mt-3 text-heading-2 font-semibold tracking-[-0.025em] text-brand-navy"
            >
              Plan Your Next Escape
            </h2>
            <p className="mt-4 max-w-2xl text-body text-secondary">
              Explore thoughtfully planned journeys with Sukhad Holidays.
            </p>
          </div>
          <Link
            href="/holidays"
            className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-brand-blue hover:text-brand-navy"
          >
            View all holidays
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {featuredPackages.map((holiday, index) => {
            const destination = destinations.find((item) => item.slug === holiday.destination);

            return (
              <article
                key={holiday.id}
                className={`group overflow-hidden rounded-xl border border-border bg-white ${index === 1 ? "md:translate-y-6" : ""}`}
              >
                <ImageReadyMedia
                  src={holiday.image}
                  alt={`${holiday.title} holiday experience`}
                  imageAvailable={holiday.imageAvailable}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="aspect-[4/3]"
                >
                  <div className="absolute inset-0" aria-hidden="true">
                    <div className="absolute inset-x-0 bottom-0 h-2/5 bg-white/45" />
                    <div className="absolute left-5 top-5 flex size-12 items-center justify-center rounded-full bg-white text-brand-blue shadow-[0_8px_20px_rgba(11,55,102,0.08)]">
                      <MapPin className="size-5" />
                    </div>
                    <span className="absolute bottom-5 right-5 text-5xl font-semibold tracking-[-0.08em] text-brand-teal/25">
                      0{index + 1}
                    </span>
                  </div>
                </ImageReadyMedia>

                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-caption font-semibold uppercase tracking-[0.12em] text-secondary">
                    <span className="text-brand-teal">{destination?.name ?? holiday.destination}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      {holiday.duration}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-brand-navy">{holiday.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-secondary">{holiday.description}</p>
                  {holiday.price !== null ? (
                    <p className="mt-4 text-sm font-semibold text-primary">
                      From {priceFormatter.format(holiday.price)}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm font-semibold text-brand-blue">Price on request</p>
                  )}
                  <Link
                    href={`/holidays/${holiday.slug}`}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-blue hover:text-brand-navy"
                  >
                    View Details
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
