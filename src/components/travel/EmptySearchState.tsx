import { Search, Wifi } from "lucide-react";

interface EmptySearchStateProps {
  title: string;
  description: string;
}

export function EmptySearchState({ title, description }: EmptySearchStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-brand-teal/45 bg-brand-light-teal/55 px-6 py-10 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-white text-brand-blue shadow-[0_8px_24px_rgba(11,55,102,0.08)]">
        <Search className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-brand-navy">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-secondary">{description}</p>
      <p className="mt-4 inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.12em] text-brand-blue">
        <Wifi className="size-3.5" aria-hidden="true" /> Live inventory not connected
      </p>
    </div>
  );
}
