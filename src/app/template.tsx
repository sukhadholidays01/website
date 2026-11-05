"use client";
import { useReducedMotionPreference } from "@/lib/useReducedMotionPreference";

import { motion } from "framer-motion";

export default function RouteTemplate({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
