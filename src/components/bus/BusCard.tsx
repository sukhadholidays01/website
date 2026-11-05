"use client";
import {
  ArrowRight,
  Armchair,
  BusFront,
  Droplets,
  PlugZap,
  Snowflake,
  Wind,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { busDuration, busFare } from "@/data/demoBuses";
import type { DemoBus } from "@/types/bus";
export function BusCard({
  bus,
  index,
  onSelect,
}: {
  bus: DemoBus;
  index: number;
  onSelect: (b: DemoBus) => void;
}) {
  const icons = { AC: Snowflake, Charging: PlugZap, Water: Droplets };
  return (
    <motion.article
      className={"bus-card " + (index === 0 ? "bus-card-featured" : "")}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.035, 0.18) }}
    >
      <div className="bus-card-top">
        <div className="bus-coach-icon">
          <BusFront size={24} strokeWidth={1.6} aria-hidden="true" />
        </div>
        <div>
          <p className="bus-operator">{bus.operator}</p>
          <h3>{bus.coach}</h3>
          <div className="bus-card-tags">
            <span>
              {bus.ac ? "AC" : "Non AC"} {bus.busType}
            </span>
            <span>Demo service</span>
          </div>
        </div>
        {index === 0 && (
          <span className="bus-card-pick">Suggested journey</span>
        )}
      </div>
      <div className="bus-card-main">
        <div className="bus-time">
          <strong>{bus.departure}</strong>
          <span>{bus.from}</span>
          <small>{bus.boarding}</small>
        </div>
        <div className="bus-duration">
          <span>{busDuration(bus.durationMinutes)}</span>
          <div>
            <i />
            <span />
            <i />
          </div>
          <small>Direct journey</small>
        </div>
        <div className="bus-time bus-arrival">
          <strong>
            {bus.arrival}
            {bus.arrivalDayOffset > 0 && <sup>+{bus.arrivalDayOffset} day</sup>}
          </strong>
          <span>{bus.to}</span>
          <small>{bus.dropping}</small>
        </div>
        <div className="bus-card-fare">
          <strong>{busFare(bus.price)}</strong>
          <span>/ traveller</span>
          <small>Illustrative INR fare</small>
        </div>
      </div>
      <div className="bus-card-bottom">
        <div className="bus-amenities">
          {bus.amenities.map((a) => {
            const Icon = icons[a as keyof typeof icons] ?? Wind;
            return (
              <span key={a}>
                <Icon size={16} aria-hidden="true" />
                {a}
              </span>
            );
          })}
          <span>
            <Armchair size={16} aria-hidden="true" />
            Choose your seat
          </span>
        </div>
        <Button size="lg" onClick={() => onSelect(bus)}>
          Select Seat
          <ArrowRight size={17} aria-hidden="true" />
        </Button>
      </div>
    </motion.article>
  );
}
