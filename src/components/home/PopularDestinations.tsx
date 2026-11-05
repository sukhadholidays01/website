import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { DestinationCard } from "@/components/travel/DestinationCard";
import { SectionHeading } from "@/components/travel/SectionHeading";
import { destinations } from "@/data/destinations";

export function PopularDestinations() {
  const [ayodhya, varanasi, jaipur] = destinations;

  return (
    <section className="bg-background py-16 sm:py-20 lg:py-28" aria-labelledby="destinations-heading">
      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div id="destinations-heading">
          <SectionHeading
            eyebrow="Popular destinations"
            title="Journeys rooted in India."
            description="From spiritual Ayodhya and Varanasi to Jaipur's royal heritage, explore journeys available through Sukhad Holidays."
            action={
              <Link href="/holidays" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-blue hover:text-brand-navy">
                Explore domestic holidays <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          />
        </div>

        <div className="mt-9 grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
          <DestinationCard destination={ayodhya} featured />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <DestinationCard destination={varanasi} />
            <DestinationCard destination={jaipur} />
          </div>
        </div>
      </div>
    </section>
  );
}
