"use client";
import { motion, useReducedMotion } from "framer-motion";
import { BusFront } from "lucide-react";
import type { BusSearch } from "@/types/bus";
export function BusSearchAnimation({ search }: { search: BusSearch }) {
  const reduced = useReducedMotion();
  return (
    <section
      className="bus-loading bus-console"
      role="status"
      aria-live="polite"
    >
      <p className="bus-eyebrow">A journey taking shape</p>
      <div className="bus-loading-road">
        <div className="bus-loading-labels">
          <strong>{search.from}</strong>
          <strong>{search.to}</strong>
        </div>
        <div className="bus-road-track">
          <span />
          <motion.div
            className="bus-road-fill"
            initial={reduced ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.25 }}
          />
          <span />
        </div>
        <motion.div
          className="bus-moving-coach"
          initial={reduced ? false : { left: "3%", opacity: 0 }}
          animate={{ left: reduced ? "50%" : "90%", opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.85, ease: "easeInOut" }}
        >
          <BusFront size={34} strokeWidth={1.5} aria-hidden="true" />
        </motion.div>
      </div>
      <h1>Finding buses</h1>
      <p>
        {search.from} to {search.to}
      </p>
      <small>Exploring demo journey options</small>
    </section>
  );
}
