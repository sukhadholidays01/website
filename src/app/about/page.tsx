import { ArrowRight, CarFront, Hotel, Landmark, MapPinned, Plane, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { siteConfig } from "@/config/site";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "About | Sukhad Holidays",
  description: "Learn about the travel services available from Sukhad Holidays.",
};

const serviceIcons: Record<string, LucideIcon> = {
  CarFront,
  Hotel,
  Landmark,
  MapPinned,
  Plane,
  UsersRound,
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow={siteConfig.tagline}
        title="Travel planning shaped around your journey."
        description="Sukhad Holidays brings together road travel, holiday experiences and journey assistance in one calm, approachable service."
      >
        <Link href="/contact" className={buttonVariants({ size: "lg" })}>
          Plan Your Journey
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <Link href="/holidays" className={buttonVariants({ variant: "secondary", size: "lg" })}>
          Explore Holidays
        </Link>
      </PageHeader>

      <section className="bg-background py-14 sm:py-16 lg:py-20" aria-labelledby="about-services-heading">
        <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.75fr_1fr] lg:items-end">
            <div>
              <p className="text-caption font-semibold uppercase tracking-[0.18em] text-brand-teal">What we help with</p>
              <h2 id="about-services-heading" className="mt-3 text-heading-2 font-semibold text-brand-navy">
                Travel services in one place.
              </h2>
            </div>
            <p className="max-w-2xl text-body text-secondary lg:justify-self-end">
              Explore the supported Sukhad Holidays offerings without unsupported claims or invented company history.
            </p>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const Icon = serviceIcons[service.icon] ?? MapPinned;

              return (
                <article key={service.id} className="rounded-xl border border-border bg-white p-6">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-brand-light-teal text-brand-blue">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold text-brand-navy">{service.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-secondary">{service.description}</p>
                  <Link
                    href={service.href}
                    className={buttonVariants({ variant: "ghost", size: "sm", className: "mt-4" })}
                  >
                    Explore
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
