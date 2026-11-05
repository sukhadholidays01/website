import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";

export default function HolidayNotFound() {
  return (
    <section className="flex min-h-[60svh] items-center justify-center bg-background px-4 py-16 text-center">
      <div className="max-w-xl">
        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-brand-teal">Sukhad Holidays</p>
        <h1 className="mt-3 text-heading-1 font-semibold text-brand-navy">Holiday not found</h1>
        <p className="mt-4 text-body text-secondary">
          The holiday package you requested is not available in our current collection.
        </p>
        <Link href="/holidays" className={buttonVariants({ variant: "secondary", size: "lg", className: "mt-7" })}>
          Browse Holidays
        </Link>
      </div>
    </section>
  );
}
