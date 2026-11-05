import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  align?: "left" | "center";
}

export function SectionHeading({ eyebrow, title, description, action, align = "left" }: SectionHeadingProps) {
  return (
    <div className={`flex flex-col gap-5 ${align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"}`}>
      <div className="max-w-2xl">
        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-brand-teal">{eyebrow}</p>
        <h2 className="mt-3 text-heading-2 font-semibold tracking-[-0.03em] text-brand-navy">{title}</h2>
        {description ? <p className="mt-4 text-body text-secondary">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
