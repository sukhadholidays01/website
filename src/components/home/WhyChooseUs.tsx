import { BadgeIndianRupee, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ConfidencePoint {
  title: string;
  description: string;
  icon: LucideIcon;
}

const confidencePoints: readonly ConfidencePoint[] = [
  {
    title: "Experienced Drivers",
    description: "Professional support for comfortable road journeys.",
    icon: ShieldCheck,
  },
  {
    title: "24/7 Support",
    description: "Travel assistance available around the clock.",
    icon: Clock3,
  },
  {
    title: "Transparent Pricing",
    description: "Clear pricing for informed travel planning.",
    icon: BadgeIndianRupee,
  },
  {
    title: "Sanitized Vehicles",
    description: "Clean vehicles prepared for your journey.",
    icon: Sparkles,
  },
];

export function WhyChooseUs() {
  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24" aria-labelledby="confidence-heading">
      <div className="mx-auto grid w-full max-w-[90rem] gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-brand-light-teal p-7 sm:p-10 lg:min-h-[30rem] lg:p-12">
          <div className="absolute -bottom-24 -left-20 size-72 rounded-full border border-brand-teal/25" aria-hidden="true" />
          <div className="relative">
            <p className="text-caption font-semibold uppercase tracking-[0.18em] text-brand-teal">
              Why choose us
            </p>
            <h2
              id="confidence-heading"
              className="mt-4 max-w-md text-heading-2 font-semibold tracking-[-0.025em] text-brand-navy"
            >
              Travel with confidence.
            </h2>
            <p className="mt-5 max-w-md text-body text-secondary">
              Thoughtful travel support from the first enquiry through the journey.
            </p>
          </div>
          <p className="relative mt-14 max-w-xs text-sm font-medium leading-6 text-brand-blue sm:mt-20 lg:absolute lg:bottom-12 lg:left-12">
            Sukhad Holidays — Creating Happy Memories
          </p>
        </div>

        <div className="self-center">
          {confidencePoints.map((point, index) => {
            const Icon = point.icon;

            return (
              <article
                key={point.title}
                className="grid grid-cols-[auto_1fr_auto] gap-4 border-b border-border py-5 first:pt-0 sm:items-center sm:gap-6 sm:py-6"
              >
                <span className="flex size-11 items-center justify-center rounded-full border border-brand-teal/30 bg-brand-light-teal text-brand-blue">
                  <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-brand-navy sm:text-lg">{point.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-secondary">{point.description}</p>
                </div>
                <span className="text-caption font-semibold tracking-[0.14em] text-brand-teal/70" aria-hidden="true">
                  0{index + 1}
                </span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
