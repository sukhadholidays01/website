import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "Terms & Conditions | Sukhad Holidays",
  description:
    "Terms and conditions for cab requests, insurance services and tours offered through Sukhad Holidays.",
};

const policySections = [
  {
    title: "Cab services",
    description:
      "These conditions apply to cab booking requests and journeys arranged through Sukhad Holidays.",
    terms: [
      {
        title: "Liability and accidents",
        body: "The company acts as a booking platform and is not liable for any injury, accident, loss or damage occurring during transit. Passengers are strongly advised to have personal travel insurance.",
      },
      {
        title: "Third-party operators",
        body: "While we strive for high-quality service, the company is not responsible for the conduct or vehicle condition of third-party operators.",
      },
      {
        title: "One-way cab availability",
        body: "One-way bookings are subject to vehicle availability. If a vehicle is unavailable, a full refund will be processed without further liability.",
      },
      {
        title: "Restricted access zones",
        body: "In cities with specific religious or heritage zones, pick-up and drop-off might be arranged at the nearest authorized point due to local regulations.",
      },
    ],
  },
  {
    title: "Insurance",
    description:
      "These conditions apply when an insurance product is made available through Sukhad Holidays.",
    terms: [
      {
        title: "Insurance provider responsibility",
        body: "All insurance policies are provided directly by the designated insurance company. The company acts only as an intermediary and is not responsible for claim processing, settlement or any disputes related to the policy. Any support required must be directed to the insurance provider's customer care.",
      },
    ],
  },
  {
    title: "Tours",
    description:
      "These conditions apply to tours and tour packages arranged through Sukhad Holidays.",
    terms: [
      {
        title: "Force majeure",
        body: "The company is not liable for any failure to perform its obligations where such failure results from causes beyond its reasonable control, including natural disasters, severe weather, strikes or acts of government.",
      },
      {
        title: "Health and safety",
        body: "Customers are responsible for their own health and safety during the trip. The company is not responsible for any personal injury or health issues that may arise during the tour.",
      },
      {
        title: "Itinerary limitations",
        body: "The tour package includes only the services specifically listed in the itinerary. Any additional expenses or activities are not covered.",
      },
      {
        title: "Restricted access",
        body: "In certain religious or restricted zones, vehicle access may be limited by local regulations. In such cases, pick-up and drop-off will be arranged at the nearest authorized point.",
      },
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms & Conditions"
        description="Please review the conditions that apply to cab services, insurance and tours arranged through Sukhad Holidays."
      />
      <section className="bg-background px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="rounded-xl border border-border bg-white p-6 text-sm leading-7 text-secondary sm:p-8">
            <h2 className="text-xl font-semibold text-primary">
              Cab booking requests
            </h2>
            <p className="mt-3">
              Submitting a cab request does not confirm a ride. Fares and
              vehicle availability must be reviewed and confirmed by the Sukhad
              Holidays team. Route distances and journey times are estimates,
              and no online payment is collected through the current request
              flow.
            </p>
          </div>

          {policySections.map((section) => {
            const headingId = `${section.title
              .toLowerCase()
              .replaceAll(" ", "-")}-heading`;

            return (
              <section
                key={section.title}
                aria-labelledby={headingId}
                className="rounded-xl border border-border bg-white p-6 sm:p-8"
              >
                <header className="border-b border-border pb-5">
                  <h2
                    id={headingId}
                    className="text-2xl font-semibold text-primary"
                  >
                    {section.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-secondary">
                    {section.description}
                  </p>
                </header>

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {section.terms.map((term) => (
                    <article key={term.title} className="space-y-2">
                      <h3 className="text-base font-semibold text-primary">
                        {term.title}
                      </h3>
                      <p className="text-sm leading-7 text-secondary">
                        {term.body}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </>
  );
}
