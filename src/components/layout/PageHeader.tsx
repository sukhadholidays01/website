import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <header className="relative overflow-hidden border-b border-border bg-white">
      <div className="absolute inset-y-0 right-0 hidden w-[32%] bg-brand-light-teal/60 lg:block" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-[90rem] px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <p className="text-caption font-semibold uppercase tracking-[0.18em] text-brand-teal">
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl text-heading-1 font-semibold tracking-[-0.03em] text-brand-navy">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-body text-secondary sm:text-lg sm:leading-8">
          {description}
        </p>
        {children ? <div className="mt-7 flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </header>
  );
}
