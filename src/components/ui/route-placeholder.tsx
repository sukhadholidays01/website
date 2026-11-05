interface RoutePlaceholderProps {
  title: string;
  description?: string;
}

export function RoutePlaceholder({
  title,
  description = "This route is ready for its next implementation phase.",
}: RoutePlaceholderProps) {
  return (
    <section className="flex min-h-[calc(100svh-4.5rem)] items-center justify-center px-4 py-16 sm:px-6 lg:min-h-[calc(100svh-5rem)] lg:px-8">
      <section className="mx-auto w-full max-w-2xl text-center" aria-labelledby="page-title">
        <p className="text-small font-medium uppercase tracking-[0.16em] text-brand-teal">
          Sukhad Holidays
        </p>
        <h1 id="page-title" className="mt-3 text-heading-1 font-semibold text-primary">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-body text-secondary">{description}</p>
      </section>
    </section>
  );
}
