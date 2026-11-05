"use client";

import { BusFront, CarFront, MapPin, Plane } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export type JourneyAnimationType = "flight" | "bus" | "cab" | "holiday";

interface JourneyLoadingAnimationProps {
  type: JourneyAnimationType;
  origin?: string;
  destination?: string;
}

const animationDetails = {
  flight: { icon: Plane, message: "Preparing your flight search" },
  bus: { icon: BusFront, message: "Checking your route" },
  cab: { icon: CarFront, message: "Preparing your cab journey" },
  holiday: { icon: MapPin, message: "Finding travel inspiration" },
} as const;

export function JourneyLoadingAnimation({
  type,
  origin = "Your city",
  destination = "Next stop",
}: JourneyLoadingAnimationProps) {
  const reduceMotion = useReducedMotion();
  const { icon: Icon, message } = animationDetails[type];

  return (
    <div className="flex min-h-56 flex-col justify-center rounded-xl bg-brand-navy px-5 py-8 text-white sm:px-10" role="status" aria-live="polite">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-center text-sm font-semibold text-white/80">{message}</p>
        <div className="mt-8 grid grid-cols-[auto_minmax(5rem,1fr)_auto] items-center gap-3">
          <div className="max-w-24">
            <span className="block size-3 rounded-full border-2 border-white bg-brand-teal" />
            <span className="mt-2 block truncate text-caption font-semibold text-white/80">{origin}</span>
          </div>
          <div className="relative h-14">
            <motion.span
              className="absolute left-0 right-0 top-1/2 h-px origin-left bg-white/35"
              initial={reduceMotion ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.55, ease: "easeOut" }}
            />
            <motion.span
              className="absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-brand-blue shadow-lg"
              initial={reduceMotion ? { left: "calc(50% - 1.25rem)" } : { left: 0, opacity: 0, scale: 0.85 }}
              animate={reduceMotion ? undefined : { left: "calc(100% - 2.5rem)", opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <Icon className={`size-5 ${type === "flight" ? "rotate-12" : ""}`} aria-hidden="true" />
            </motion.span>
          </div>
          <div className="max-w-24 text-right">
            <span className="ml-auto block size-3 rounded-full border-2 border-white bg-brand-teal" />
            <span className="mt-2 block truncate text-caption font-semibold text-white/80">{destination}</span>
          </div>
        </div>
        <div className="mx-auto mt-6 h-1 w-32 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
          <motion.div
            className="h-full rounded-full bg-brand-teal"
            initial={reduceMotion ? false : { x: "-100%" }}
            animate={{ x: reduceMotion ? 0 : "100%" }}
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}
