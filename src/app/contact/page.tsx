import { MessageCircle, Route } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EnquiryForm } from "@/components/contact/EnquiryForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { enquiryCategories } from "@/data/services";
import { configuredWhatsAppPhone, createWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact & Enquiry | Sukhad Holidays",
  description: "Prepare a travel enquiry for Sukhad Holidays.",
};

interface ContactPageProps {
  searchParams: Promise<{ category?: string | string[] }>;
}

const contactMessage = "Hello Sukhad Holidays, I would like to discuss a travel enquiry.";

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams;
  const requestedCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const initialCategory = requestedCategory && enquiryCategories.includes(requestedCategory)
    ? requestedCategory
    : "";
  const hasWhatsAppNumber = configuredWhatsAppPhone.length > 0;
  const whatsappHref = hasWhatsAppNumber
    ? createWhatsAppUrl(configuredWhatsAppPhone, contactMessage)
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Contact Sukhad Holidays"
        title="Tell us about your next journey."
        description="Prepare an enquiry for holidays, road travel, flights, hotels or group journeys."
      >
        <Link href="#enquiry-form" className={buttonVariants({ size: "lg" })}>
          Start an Enquiry
        </Link>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            WhatsApp
          </a>
        ) : null}
      </PageHeader>

      <section className="bg-background py-14 sm:py-16 lg:py-20">
        <div className="mx-auto grid w-full max-w-[90rem] gap-7 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <EnquiryForm initialCategory={initialCategory} />
          <aside className="rounded-xl border border-brand-teal/20 bg-brand-light-teal p-7 lg:p-8">
            <Route className="size-7 text-brand-blue" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-semibold text-brand-navy">Choose your enquiry</h2>
            <p className="mt-3 text-sm leading-7 text-secondary">
              Select the service that best matches your travel plan. No contact information is displayed until it is configured for the website.
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-2">
              {enquiryCategories.map((category) => (
                <li key={category} className="rounded-lg bg-white px-3 py-3 text-sm font-medium text-brand-navy">
                  {category}
                </li>
              ))}
            </ul>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "secondary", className: "mt-6 w-full" })}
              >
                <MessageCircle className="size-4 text-brand-blue" aria-hidden="true" />
                Continue on WhatsApp
              </a>
            ) : null}
          </aside>
        </div>
      </section>
    </>
  );
}
