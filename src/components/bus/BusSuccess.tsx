"use client";
import { motion } from "framer-motion";
import { ArrowRight, BusFront, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/Button";
import { busDateLabel, busFare } from "@/data/demoBuses";
import type { BusSearch, DemoBus } from "@/types/bus";
export function BusSuccess({
  bus,
  search,
  seats,
  reference,
  onReset,
}: {
  bus: DemoBus;
  search: BusSearch;
  seats: readonly string[];
  reference: string;
  onReset: () => void;
}) {
  return (
    <motion.section
      className="bus-console bus-success"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-labelledby="bus-success-title"
    >
      <div className="bus-success-icon">
        <CheckCircle2 size={38} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <p className="bus-eyebrow">Demo enquiry received</p>
      <h1 id="bus-success-title">
        Bus enquiry received<span>.</span>
      </h1>
      <p>Your Sukhad Holidays travel request has been received in this demo.</p>
      <div className="bus-success-journey">
        <BusFront size={24} aria-hidden="true" />
        <div>
          <strong>
            {bus.from}
            <ArrowRight size={17} aria-hidden="true" />
            {bus.to}
          </strong>
          <p>
            {busDateLabel(search.date)} / Seats {seats.join(", ")}
          </p>
          <small>
            {bus.coach} / {bus.ac ? "AC" : "Non AC"} {bus.busType}
          </small>
        </div>
        <span>
          {busFare(bus.price * seats.length)}
          <small>Illustrative total</small>
        </span>
      </div>
      <div className="bus-success-reference">
        <span>Enquiry reference</span>
        <strong>{reference}</strong>
      </div>
      <p className="bus-disclaimer">
        Local demo reference only. No information has been delivered or saved.
        Seats are not reserved, and no ticket or booking has been confirmed.
      </p>
      <div className="bus-success-actions">
        <Button size="lg" onClick={onReset}>
          Back to Buses
          <ArrowRight size={18} aria-hidden="true" />
        </Button>
        <Link
          href="/holidays"
          className={buttonVariants({ variant: "secondary", size: "lg" })}
        >
          Explore Holidays
        </Link>
      </div>
    </motion.section>
  );
}
