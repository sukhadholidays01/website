"use client";
import { useReducedMotionPreference } from "@/lib/useReducedMotionPreference";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { CarFront } from "lucide-react";
import { useEffect } from "react";
export function CabRouteAnimation({
  pickup,
  destination,
  searching = false,
}: {
  pickup: string;
  destination: string;
  searching?: boolean;
}) {
  const reduced = useReducedMotionPreference();
  const progress = useMotionValue(65);
  const offsetDistance = useTransform(progress, (value) => `${value}%`);
  useEffect(() => {
    if (!searching || reduced) {
      progress.set(searching ? 100 : 65);
      return;
    }
    progress.set(0);
    const movement = animate(progress, 100, {
      duration: 0.75,
      delay: 0.2,
      ease: "easeInOut",
    });
    return () => movement.stop();
  }, [progress, reduced, searching]);
  return (
    <section
      className="cab-route"
      aria-label={`Illustrative route from ${pickup} to ${destination}`}
    >
      <div className="cab-route-heading">
        <span className="cab-eyebrow">The road ahead</span>
        <span>Illustrative route</span>
      </div>
      <div className="cab-route-stage">
        <motion.div
          className="cab-route-label cab-origin"
          initial={{ opacity: searching && !reduced ? 0 : 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.15 }}
        >
          <small>PICKUP</small>
          <strong>{pickup}</strong>
        </motion.div>
        <motion.div
          className="cab-route-label cab-destination"
          initial={{ opacity: searching && !reduced ? 0 : 1 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: reduced ? 0 : 0.15,
            delay: reduced ? 0 : 0.15,
          }}
        >
          <small>DESTINATION</small>
          <strong>{destination}</strong>
        </motion.div>
        <svg
          className="cab-route-svg"
          viewBox="0 0 600 150"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 35 35 C 160 35 125 115 260 115 L 565 115"
            fill="none"
            stroke="#d6e7ee"
            strokeWidth="8"
          />
          <motion.path
            d="M 35 35 C 160 35 125 115 260 115 L 565 115"
            fill="none"
            stroke="#12B5C4"
            strokeWidth="3"
            initial={{ pathLength: searching && !reduced ? 0 : 1 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: reduced ? 0 : 0.6,
              delay: searching ? 0.15 : 0,
            }}
          />
        </svg>
        <motion.span
          className="cab-road-dot cab-road-start"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.15 }}
        />
        <motion.span
          className="cab-road-dot cab-road-end"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: reduced ? 0 : 0.15,
            delay: reduced ? 0 : 0.15,
          }}
        />
        <div className="cab-route-vertical" aria-hidden="true">
          <motion.div
            initial={{ scaleY: searching && !reduced ? 0 : 1 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: reduced ? 0 : 0.6 }}
          />
        </div>
        <motion.div
          className="cab-moving-car"
          style={{ offsetDistance }}
          aria-hidden="true"
        >
          <CarFront size={24} />
        </motion.div>
      </div>
      <motion.p
        className="cab-route-caption"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduced ? 0 : 0.35 }}
        role="status"
      >
        {searching
          ? "Finding your ride"
          : "A good journey begins with the right ride"}
        <span>
          {pickup} → {destination}
        </span>
      </motion.p>
    </section>
  );
}
