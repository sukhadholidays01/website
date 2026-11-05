"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { enquiryCategories } from "@/data/services";

interface EnquiryFormProps {
  initialCategory?: string;
}

export function EnquiryForm({ initialCategory = "" }: EnquiryFormProps) {
  const [isPrepared, setIsPrepared] = useState(false);
  const selectedCategory = enquiryCategories.includes(initialCategory) ? initialCategory : "";

  return (
    <form
      id="enquiry-form"
      className="rounded-xl border border-border bg-white p-5 shadow-[0_16px_40px_rgba(11,55,102,0.07)] sm:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        setIsPrepared(true);
      }}
      onChange={() => setIsPrepared(false)}
    >
      <h2 className="text-2xl font-semibold text-brand-navy">Travel enquiry</h2>
      <p className="mt-2 text-sm leading-6 text-secondary">
        Prepare your journey details. Direct form delivery will be connected in a future phase.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <FormField id="name" label="Name" type="text" placeholder="Your name" />
        <FormField id="email" label="Email" type="email" placeholder="you@example.com" />
        <FormField id="phone" label="Phone" type="tel" placeholder="Your phone number" />
        <div>
          <label htmlFor="category" className="text-sm font-semibold text-brand-navy">Enquiry category</label>
          <select
            id="category"
            name="category"
            defaultValue={selectedCategory}
            className="mt-2 min-h-12 w-full rounded-lg border border-border bg-white px-3.5 text-sm outline-none transition-colors focus:border-brand-teal focus:ring-2 focus:ring-brand-light-teal"
          >
            <option value="" disabled>Select a category</option>
            {enquiryCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="message" className="text-sm font-semibold text-brand-navy">Journey details</label>
          <textarea
            id="message"
            name="message"
            rows={5}
            placeholder="Tell us where and when you would like to travel."
            className="mt-2 w-full resize-y rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none transition-colors placeholder:text-secondary/75 focus:border-brand-teal focus:ring-2 focus:ring-brand-light-teal"
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="mt-5 w-full sm:w-auto">
        <Send className="size-4" aria-hidden="true" />
        Prepare Enquiry
      </Button>

      {isPrepared ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-brand-light-teal p-3 text-sm leading-6 text-brand-navy" role="status">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-teal-hover" aria-hidden="true" />
          Your enquiry details are prepared in this form. No information has been sent yet.
        </p>
      ) : null}
    </form>
  );
}

function FormField({
  id,
  label,
  type,
  placeholder,
}: {
  id: string;
  label: string;
  type: "text" | "email" | "tel";
  placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-brand-navy">{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        className="mt-2 min-h-12 w-full rounded-lg border border-border bg-white px-3.5 text-sm outline-none transition-colors placeholder:text-secondary/75 focus:border-brand-teal focus:ring-2 focus:ring-brand-light-teal"
      />
    </div>
  );
}
