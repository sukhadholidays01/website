"use client";
import { MotionConfig, motion, animate } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotionPreference } from "@/lib/useReducedMotionPreference";

export const travelTransition = { duration: 0.4, ease: "easeOut" as const };
export function TravelMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={travelTransition}>{children}</MotionConfig>;
}
export function SectionReveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotionPreference();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0.85, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }} transition={{ ...travelTransition, duration: reduced ? 0 : 0.4 }}>{children}</motion.div>;
}
export function AnimatedAmount({ value, format }: { value: number; format: (value: number) => string }) {
  const previous = useRef(value);
  const [display, setDisplay] = useState(value);
  const reduced = useReducedMotionPreference();
  useEffect(() => {
    const controls = animate(previous.current, value, { duration: reduced ? 0 : 0.35, ease: "easeOut", onUpdate: setDisplay });
    previous.current = value;
    return () => controls.stop();
  }, [value, reduced]);
  return <span aria-label={format(value)}><span aria-hidden="true">{format(display)}</span></span>;
}

