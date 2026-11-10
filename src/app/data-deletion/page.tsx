import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "Data Deletion | Sukhad Holidays",
  description:
    "Learn how to request deletion of your personal information held by Sukhad Holidays.",
  alternates: { canonical: "https://sukhadholidays.in/data-deletion" },
};

const requestEmail =
  "mailto:info@sukhadhholidays.in?subject=Data%20Deletion%20Request";

export default function DataDeletionPage() {
  return (
    <>
      <PageHeader
        eyebrow="Privacy & Data"
        title="Data Deletion"
        description="You can request deletion of personal information you have shared with Sukhad Holidays. Here is how to contact our team and what to expect."
      />
      <section className="bg-background px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <section aria-labelledby="request-heading" className="rounded-xl border border-border bg-white p-6 sm:p-8">
            <h2 id="request-heading" className="text-xl font-semibold text-primary">
              How to request data deletion
            </h2>
            <div className="mt-3 space-y-4 text-sm leading-7 text-secondary">
              <p>
                Email <a href={requestEmail} className="font-medium text-brand-blue hover:underline">info@sukhadhholidays.in</a> with
                the subject <strong>Data Deletion Request</strong>. Please include:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Your name and the email address or phone number used for your booking or enquiry.</li>
                <li>Your booking or enquiry reference, if available.</li>
                <li>Whether you want all personal information associated with you deleted, or only specific records.</li>
              </ul>
              <p>
                Please send your request from the email address you originally
                provided, where possible. Do not send passwords, payment card
                details, identity documents or private booking access links.
                If we need more information to verify your request, our team
                will contact you.
              </p>
              <a href={requestEmail} className="inline-flex rounded-lg bg-brand-blue px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue">
                Request data deletion by email
              </a>
              <p className="text-xs">This button opens your email app. Send the email to submit your request.</p>
            </div>
          </section>

          <section aria-labelledby="process-heading" className="rounded-xl border border-border bg-white p-6 sm:p-8">
            <h2 id="process-heading" className="text-xl font-semibold text-primary">What happens next</h2>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-7 text-secondary">
              <li>Our team reviews your request and may ask for information to confirm that the records belong to you.</li>
              <li>After verification, we review the associated records and delete personal information that is no longer needed for the purposes described in our Privacy Policy.</li>
              <li>We contact you with the outcome, including any information that must be retained and the reason. If additional time or details are needed, we will let you know.</li>
            </ol>
          </section>

          <section aria-labelledby="scope-heading" className="rounded-xl border border-border bg-white p-6 sm:p-8">
            <h2 id="scope-heading" className="text-xl font-semibold text-primary">Information covered by your request</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-secondary">
              <p>
                Your request can cover your name, contact details, travel enquiry
                information, pickup and drop-off details, travel preferences,
                optional notes and related correspondence held by Sukhad Holidays.
              </p>
              <p>
                Some records may need to be retained for legal, accounting,
                fraud-prevention or dispute-resolution purposes, or to complete
                an ongoing service. We will explain any applicable retention
                when responding to your request.
              </p>
              <p>
                Deleting personal information and cancelling a booking are
                separate requests. To cancel an eligible cab request, use its
                private booking page or contact our team.
              </p>
            </div>
          </section>

          <section aria-labelledby="storage-heading" className="rounded-xl border border-border bg-white p-6 sm:p-8">
            <h2 id="storage-heading" className="text-xl font-semibold text-primary">Browser storage and other providers</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-secondary">
              <p>
                You can clear cookies and site data through your browser settings
                to remove preferences stored on your device. Clearing browser
                data does not delete booking or enquiry records held by us.
              </p>
              <p>
                Other travel or service providers may hold separate records under
                their own privacy policies. You may need to contact those
                providers directly about information they retain.
              </p>
              <p>
                For more information about how we handle personal information,
                read our <Link href="/privacy-policy" className="font-medium text-brand-blue hover:underline">Privacy Policy</Link>.
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">Last updated: 10 November 2026</p>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
