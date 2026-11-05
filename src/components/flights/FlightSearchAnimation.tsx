"use client";
import { motion, useReducedMotion } from "framer-motion";
import { PlaneTakeoff } from "lucide-react";
export function FlightSearchAnimation({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div
      role="status"
      className="flight-console flex min-h-80 flex-col items-center justify-center py-12"
    >
      <span className="flight-label">Your journey starts here</span>
      <h1 className="mt-3 text-2xl font-semibold text-brand-navy">
        Finding flights
      </h1>
      <p className="mt-2 text-secondary">
        {from} → {to}
      </p>
      <div
        className="mt-10 flex w-full max-w-lg items-center gap-3 px-4"
        aria-hidden="true"
      >
        <span className="size-3 shrink-0 rounded-full bg-brand-teal" />
        <div className="relative h-10 flex-1">
          <motion.div
            className="absolute top-5 h-px w-full origin-left bg-brand-teal/50"
            initial={reduced ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            className="absolute top-1 rounded-full bg-white p-1 text-brand-blue"
            initial={{ left: reduced ? "45%" : "0%" }}
            animate={{ left: reduced ? "45%" : "85%" }}
            transition={{ duration: 0.95, ease: "easeInOut" }}
          >
            <PlaneTakeoff size={28} />
          </motion.div>
        </div>
        <span className="size-3 shrink-0 rounded-full bg-brand-teal" />
      </div>
      <p className="mt-7 text-xs text-secondary">
        Preparing demo flight options
      </p>
    </div>
  );
}
