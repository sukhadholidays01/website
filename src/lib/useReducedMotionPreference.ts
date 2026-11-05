"use client";

import { useSyncExternalStore } from "react";

function subscribe(update: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
const getSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getAnimatedServerSnapshot = () => false;
const getStaticServerSnapshot = () => true;

/** Match server and hydration markup, then track the user's motion preference. */
export function useReducedMotionPreference(staticOnServer = false) {
  return useSyncExternalStore(subscribe, getSnapshot, staticOnServer ? getStaticServerSnapshot : getAnimatedServerSnapshot);
}
