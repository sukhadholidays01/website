"use client";

import { Globe2 } from "lucide-react";
import { useId, useState } from "react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface CountrySelectorProps {
  className?: string;
  showLabel?: boolean;
}

export function CountrySelector({ className, showLabel = false }: CountrySelectorProps) {
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
        <Globe2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-blue" aria-hidden="true" />
        <select
          id={id}
          value={country}
          onChange={(event) => setCountry(event.target.value as (typeof siteConfig.countries)[number])}
          className="min-h-10 w-full appearance-none rounded-lg border border-border bg-white py-2 pl-9 pr-7 text-sm font-medium text-brand-navy outline-none transition-colors hover:bg-brand-light-teal focus:border-brand-teal focus:ring-2 focus:ring-brand-light-teal"
          aria-label={showLabel ? undefined : "Country preference"}
        >
          {siteConfig.countries.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
