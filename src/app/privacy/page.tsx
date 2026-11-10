import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "Privacy Policy | Sukhad Holidays",
  description:
    "How Sukhad Holidays collects, uses, shares and protects information submitted through its website and cab request service.",
};

const privacySections = [
  {
    title: "Information we collect",
    paragraphs: [
      "When you submit a cab request, we collect the information needed to review and arrange your journey. This may include your name, phone number, email address, pickup and drop-off locations, travel dates and times, passenger count, vehicle preference and any notes you choose to provide.",
      "We also retain the booking reference, request status and activity required to process, update or cancel your request. Please do not include unnecessary sensitive personal information in location searches or optional notes.",
    ],
  },
  {
    title: "How we use your information",
    paragraphs: [
      "We use your information to review travel requests, contact you about fares and availability, coordinate an accepted journey, provide booking status and cancellation updates, respond to enquiries, prevent duplicate or abusive requests and maintain service and security records.",
      "Submitting a request does not confirm a vehicle or ride. Your details are used so the Sukhad Holidays team can review the request and contact you before confirmation.",
    ],
  },
  {
    title: "How information may be shared",
    paragraphs: [
      "Information may be shared with authorized Sukhad Holidays staff and, when required to arrange a service, with the relevant driver, vehicle operator, tour operator, insurance provider or other service provider. We share only the information reasonably needed for that service.",
      "Selected coordinates, map tiles or location searches may be processed by the configured mapping or geocoding provider. If email notifications are enabled, the recipient address and message content are processed by the configured email provider. Those providers process information under their own terms and privacy practices.",
    ],
  },
  {
    title: "Private booking links",
    paragraphs: [
      "Cab request details are protected by a private access link. The access key is stored in the link fragment and is required to retrieve or cancel the request. Keep the complete link private and share it only with people you trust. Anyone who obtains the full link may be able to view the request and use the customer actions available for it.",
    ],
  },
  {
    title: "Cookies and browser storage",
    paragraphs: [
      "The cab operations area uses a secure, HttpOnly session cookie for authorized staff access. The public site may use browser storage to remember non-essential interface choices, such as dismissed account prompts, offers and demonstration workspace state.",
      "Browser storage remains on your device until it expires or is cleared through your browser. Disabling it may reset those preferences but does not prevent you from submitting a cab request.",
    ],
  },
  {
    title: "Storage, security and retention",
    paragraphs: [
      "Production cab requests are stored in a server-side database. We use access controls, private booking tokens, secure staff sessions, request validation and other technical safeguards designed to protect customer information. No online payment details are collected through the current cab request flow.",
      "We retain personal information only for as long as reasonably necessary to process the request, provide the service, maintain business and security records, resolve disputes and meet applicable legal obligations. Demonstration areas may store fictional or temporary information in the browser and must not be used for real sensitive information.",
    ],
  },
  {
    title: "Your choices and requests",
    paragraphs: [
      "You may ask us to provide, correct or delete personal information associated with your request, subject to identity verification and any information we must retain for legal, accounting, fraud-prevention or dispute-resolution purposes.",
      "You may also cancel an eligible cab request through its private booking page. Cancellation of a request does not automatically erase records that must be retained for the purposes described above.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description="How Sukhad Holidays collects, uses, shares and protects information submitted through this website."
      />
      <section className="bg-background px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="rounded-xl border border-border bg-white p-6 text-sm leading-7 text-secondary sm:p-8">
            <p>
              This policy applies to information collected through the Sukhad
              Holidays website and public cab request service. By submitting
              information through the website, you acknowledge the practices
              described below.
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-primary">
              Last updated: 5 November 2026
            </p>
          </div>

          {privacySections.map((section) => {
            const headingId = `${section.title
              .toLowerCase()
              .replaceAll(" ", "-")}-heading`;

            return (
              <section
                key={section.title}
                aria-labelledby={headingId}
                className="rounded-xl border border-border bg-white p-6 sm:p-8"
              >
                <h2
                  id={headingId}
                  className="text-xl font-semibold text-primary"
                >
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-secondary">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            );
          })}

          <section className="rounded-xl border border-border bg-white p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-primary">
              Contact and policy updates
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-secondary">
              <p>
                To request deletion of your personal information, follow the steps on our{" "}
                <Link href="/data-deletion" className="font-medium text-brand-blue hover:underline">
                  Data Deletion page
                </Link>.
              </p>
              <p>
                To make a privacy request or ask a question about this policy,
                email{" "}
                <a
                  href="mailto:info@sukhadhholidays.in"
                  className="font-medium text-brand-blue hover:underline"
                >
                  info@sukhadhholidays.in
                </a>{" "}
                or use our{" "}
                <Link
                  href="/contact"
                  className="font-medium text-brand-blue hover:underline"
                >
                  contact page
                </Link>
                . We may ask for information needed to verify that the request
                concerns you.
              </p>
              <p>
                We may update this policy when our services or privacy
                practices change. The current version and its update date will
                remain available on this page. Please also review our{" "}
                <Link
                  href="/terms"
                  className="font-medium text-brand-blue hover:underline"
                >
                  Terms &amp; Conditions
                </Link>
                .
              </p>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
