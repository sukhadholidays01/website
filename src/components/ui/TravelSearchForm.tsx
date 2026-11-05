import { Search } from "lucide-react";

import { Button } from "@/components/ui/Button";

export interface TravelSearchField {
  id: string;
  label: string;
  type: "text" | "date" | "select";
  placeholder?: string;
  options?: readonly string[];
}

interface TravelSearchFormProps {
  title: string;
  description: string;
  category: string;
  submitLabel: string;
  fields: readonly TravelSearchField[];
}

export function TravelSearchForm({
  title,
  description,
  category,
  submitLabel,
  fields,
}: TravelSearchFormProps) {
  return (
    <section className="rounded-xl border border-border bg-white p-5 shadow-[0_16px_40px_rgba(11,55,102,0.07)] sm:p-7" aria-labelledby="travel-search-title">
      <div className="mb-6">
        <h2 id="travel-search-title" className="text-2xl font-semibold text-brand-navy">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-secondary">{description}</p>
      </div>
      <form action="/contact" method="get" className="grid min-w-0 gap-4 sm:grid-cols-2">
        <input type="hidden" name="category" value={category} />
        {fields.map((field) => (
          <div key={field.id} className="min-w-0">
            <label htmlFor={field.id} className="text-sm font-semibold text-brand-navy">
              {field.label}
            </label>
            {field.type === "select" ? (
              <select
                id={field.id}
                name={field.id}
                defaultValue=""
                className="mt-2 min-h-12 w-full min-w-0 rounded-lg border border-border bg-white px-3.5 text-sm outline-none transition-colors focus:border-brand-teal focus:ring-2 focus:ring-brand-light-teal"
              >
                <option value="" disabled>
                  Select {field.label.toLowerCase()}
                </option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={field.id}
                name={field.id}
                type={field.type}
                placeholder={field.placeholder}
                className="mt-2 min-h-12 w-full min-w-0 rounded-lg border border-border bg-white px-3.5 text-sm outline-none transition-colors placeholder:text-secondary/75 focus:border-brand-teal focus:ring-2 focus:ring-brand-light-teal"
              />
            )}
          </div>
        ))}
        <div className="sm:col-span-2">
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            <Search className="size-4" aria-hidden="true" />
            {submitLabel}
          </Button>
          <p className="mt-3 text-caption leading-5 text-secondary">
            This planning form continues to an enquiry; it does not display live availability.
          </p>
        </div>
      </form>
    </section>
  );
}
