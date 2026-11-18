"use client";

import { Coins } from "lucide-react";
import { useId, useState } from "react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface CurrencySelectorProps {
  className?: string;
  showLabel?: boolean;
  iconOnly?: boolean;
}

export function CurrencySelector({ className, showLabel = false, iconOnly = false }: CurrencySelectorProps) {
  const id = useId();
  const [currency, setCurrency] = useState<(typeof siteConfig.currencies)[number]["code"]>("INR");

  return (
    <div className={cn("min-w-0", className)}>
      {showLabel ? (
        <label htmlFor={id} className="mb-1.5 block text-caption font-semibold uppercase tracking-[0.12em] text-secondary">
          Currency
        </label>
      ) : (
        <label htmlFor={id} className="sr-only">Currency display preference</label>
      )}
      <div className="relative">
        <Coins className={cn("pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-brand-blue",iconOnly?"left-3":"left-2.5")} aria-hidden="true" />
        <select
          id={id}
          value={currency}
          onChange={(event) => setCurrency(event.target.value as (typeof siteConfig.currencies)[number]["code"])}
          className={cn("w-full appearance-none rounded-lg border border-border bg-white font-medium outline-none transition-colors hover:bg-brand-light-teal focus:border-brand-teal focus:ring-2 focus:ring-brand-light-teal",iconOnly?"h-10 cursor-pointer px-0 !text-transparent":"min-h-9 py-2 pl-8 pr-3 text-xs text-brand-navy")}
          aria-label={showLabel ? undefined : "Currency display preference"}
        >
          {siteConfig.currencies.map((option) => (
            <option className="!text-brand-navy" key={option.code} value={option.code}>{option.label}</option>
          ))}
        </select>
      </div>
      {showLabel ? (
        <p className="mt-1.5 text-caption leading-5 text-secondary">Display preference only; no conversion is applied.</p>
      ) : null}
    </div>
  );
}
