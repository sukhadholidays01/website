import { ArrowRight, BriefcaseBusiness, CarFront, Users } from "lucide-react";
import Link from "next/link";

import { ImageReadyMedia } from "@/components/ui/ImageReadyMedia";
import { vehicles } from "@/data/vehicles";

export function VehicleShowcase() {
  return (
    <section className="overflow-hidden bg-brand-light-teal py-16 sm:py-20 lg:py-24" aria-labelledby="vehicles-heading">
      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.7fr_1fr] lg:items-end">
          <div>
            <p className="text-caption font-semibold uppercase tracking-[0.18em] text-brand-teal">
              Vehicle options
            </p>
            <h2
              id="vehicles-heading"
              className="mt-3 text-heading-2 font-semibold tracking-[-0.025em] text-brand-navy"
            >
              Travel comfortably, your way.
            </h2>
          </div>
          <p className="max-w-xl text-body text-secondary lg:justify-self-end">
            Choose from Sedan, SUV, Luxury and Tempo Traveller options for your journey.
          </p>
        </div>

        <div className="-mx-4 mt-9 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-4 lg:grid lg:w-full lg:grid-cols-4 lg:gap-5">
            {vehicles.map((vehicle, index) => (
              <article
                key={vehicle.id}
                className="w-[78vw] max-w-[21rem] shrink-0 overflow-hidden rounded-xl border border-brand-teal/20 bg-white sm:w-[20rem] lg:w-auto lg:max-w-none"
              >
                <ImageReadyMedia
                  src={vehicle.image}
                  alt={`${vehicle.name} vehicle`}
                  imageAvailable={vehicle.imageAvailable}
                  sizes="(max-width: 768px) 80vw, 25vw"
                  className="aspect-[4/3]"
                >
                  <div className="absolute inset-0" aria-hidden="true">
                    <span className="absolute left-5 top-5 text-caption font-semibold uppercase tracking-[0.16em] text-brand-blue/65">
                      Sukhad fleet
                    </span>
                    <CarFront
                      className="absolute bottom-[22%] left-1/2 size-24 -translate-x-1/2 text-brand-blue/65"
                      strokeWidth={1.15}
                    />
                    <span className="absolute bottom-4 right-5 text-4xl font-semibold text-white/75">
                      0{index + 1}
                    </span>
                  </div>
                </ImageReadyMedia>

                <div className="p-5">
                  <p className="text-caption font-semibold uppercase tracking-[0.14em] text-brand-teal">
                    {vehicle.category.replace("-", " ")}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-brand-navy">{vehicle.name}</h3>

                  {vehicle.seatingCapacity !== null || vehicle.luggageCapacity !== null ? (
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm text-secondary">
                      {vehicle.seatingCapacity !== null ? (
                        <div>
                          <dt className="flex items-center gap-1.5 text-caption font-medium">
                            <Users className="size-3.5 text-brand-teal" aria-hidden="true" /> Seats
                          </dt>
                          <dd className="mt-1 font-semibold text-primary">{vehicle.seatingCapacity}</dd>
                        </div>
                      ) : null}
                      {vehicle.luggageCapacity !== null ? (
                        <div>
                          <dt className="flex items-center gap-1.5 text-caption font-medium">
                            <BriefcaseBusiness className="size-3.5 text-brand-teal" aria-hidden="true" /> Luggage
                          </dt>
                          <dd className="mt-1 font-semibold text-primary">{vehicle.luggageCapacity}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : (
                    <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-secondary">
                      Vehicle details available on enquiry.
                    </p>
                  )}

                  <Link
                    href="/cabs"
                    className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-blue hover:text-brand-navy"
                    aria-label={`Enquire about the ${vehicle.name}`}
                  >
                    Enquire
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
