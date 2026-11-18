"use client";

import { Globe2 } from "lucide-react";
import { useId, useState } from "react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface CountrySelectorProps {
  className?: string;
  showLabel?: boolean;
  iconOnly?: boolean;
}

export function CountrySelector({ className, showLabel = false, iconOnly = false }: CountrySelectorProps) {
  const id = useId();
  const [country, setCountry] = useState<(typeof siteConfig.countries)[number]>("India");

  return (
    <div className={cn("min-w-0", className)}>
      {showLabel ? (
        <label htmlFor={id} className="mb-1.5 block text-caption font-semibold uppercase tracking-[0.12em] text-secondary">
          Country
        </label>
      ) : (
        <label htmlFor={id} className="sr-only">Country preference</label>
      )}
      <div className="relative">
        <Globe2 className={cn("pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-brand-blue",iconOnly?"left-3":"left-2.5")} aria-hidden="true" />
        <select
          id={id}
          value={country}
          onChange={(event) => setCountry(event.target.value as (typeof siteConfig.countries)[number])}
          className={cn("w-full appearance-none rounded-lg border border-border bg-white font-medium outline-none transition-colors hover:bg-brand-light-teal focus:border-brand-teal focus:ring-2 focus:ring-brand-light-teal",iconOnly?"h-10 cursor-pointer px-0 !text-transparent":"min-h-9 py-2 pl-8 pr-3 text-xs text-brand-navy")}
          aria-label={showLabel ? undefined : "Country preference"}
        >
          {siteConfig.countries.map((option) => (
            <option className="!text-brand-navy" key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
