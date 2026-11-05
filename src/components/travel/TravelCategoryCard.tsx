import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface TravelCategoryCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: string;
}

export function TravelCategoryCard({ title, description, href, icon: Icon, accent }: TravelCategoryCardProps) {
  return (
    <Link href={href} className="group relative min-h-48 overflow-hidden rounded-2xl border border-border bg-white p-5 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-brand-teal/45 hover:shadow-[0_16px_38px_rgba(11,55,102,0.08)] sm:p-6">
      <span className={`absolute right-0 top-0 h-28 w-28 rounded-bl-[5rem] ${accent}`} aria-hidden="true" />
      <span className="relative flex size-11 items-center justify-center rounded-xl bg-brand-light-teal text-brand-blue">
        <Icon className="size-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
      <h3 className="relative mt-6 text-xl font-semibold text-brand-navy">{title}</h3>
      <p className="relative mt-2 max-w-xs text-sm leading-6 text-secondary">{description}</p>
      <ArrowUpRight className="absolute bottom-5 right-5 size-5 text-brand-teal transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  );
}
