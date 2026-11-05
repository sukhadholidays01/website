import { Clock3, IndianRupee, ShieldCheck, Sparkles } from "lucide-react";

const trustItems = [
  { label: "Experienced Drivers", icon: ShieldCheck },
  { label: "24/7 Support", icon: Clock3 },
  { label: "Transparent Pricing", icon: IndianRupee },
  { label: "Sanitized Vehicles", icon: Sparkles },
] as const;

export function TrustStrip() {
  return (
    <section className="border-y border-border bg-white" aria-label="Why travel with Sukhad Holidays">
      <ul className="mx-auto grid w-full max-w-[90rem] grid-cols-2 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        {trustItems.map(({ label, icon: Icon }, index) => <li key={label} className={`flex min-h-28 items-center gap-3 py-5 ${index % 2 ? "pl-4 sm:pl-6" : "pr-4 sm:pr-6"} lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0`}><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-light-teal text-brand-blue"><Icon className="size-5" strokeWidth={1.8} aria-hidden="true" /></span><span className="text-sm font-semibold text-brand-navy sm:text-base">{label}</span></li>)}
      </ul>
    </section>
  );
}
