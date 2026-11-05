"use client";

import { motion } from "framer-motion";
import { useReducedMotionPreference } from "@/lib/useReducedMotionPreference";
import { ArrowRight, CarFront } from "lucide-react";
import s from "./CabJourneyRoute.module.css";

type Point = { x: number; y: number };
function cubic(a: Point, b: Point, c: Point, d: Point, t: number): Point {
  const n = 1 - t;
  return { x: n ** 3 * a.x + 3 * n ** 2 * t * b.x + 3 * n * t ** 2 * c.x + t ** 3 * d.x,
    y: n ** 3 * a.y + 3 * n ** 2 * t * b.y + 3 * n * t ** 2 * c.y + t ** 3 * d.y };
}
const desktop = {
  start: { x: 65, y: 62 }, stop: { x: 415, y: 62 }, end: { x: 440, y: 172 },
  bend1: { x: 415, y: 126 }, bend2: { x: 252, y: 172 },
  main: "M65 62 H415", branch: "M415 62 C415 126 252 172 440 172", viewBox: "0 0 520 220",
};
const mobile = {
  start: { x: 55, y: 45 }, stop: { x: 55, y: 133 }, end: { x: 268, y: 207 },
  bend1: { x: 55, y: 204 }, bend2: { x: 169, y: 207 },
  main: "M55 45 V133", branch: "M55 133 C55 204 169 207 268 207", viewBox: "0 0 340 255",
};
function routeFrames(route: typeof desktop) {
  const main = Array.from({ length: 25 }, (_, index) => {
    const t = index / 24;
    return { x: route.start.x + (route.stop.x - route.start.x) * t, y: route.start.y + (route.stop.y - route.start.y) * t };
  });
  // A short pause at Prayagraj before continuing along the curved road.
  const branch = Array.from({ length: 31 }, (_, index) => cubic(route.stop, route.bend1, route.bend2, route.end, index / 30));
  const points = [...main, route.stop, ...branch];
  const distances = points.map((point, index) => index ? Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y) + (index === 25 ? 35 : .01) : 0);
  const total = distances.reduce((sum, distance) => sum + distance, 0);
  let travelled = 0;
  const times = distances.map(distance => (travelled += distance) / total);
  return { x: points.map(point => point.x), y: points.map(point => point.y), times };
}

export function CabJourneyRoute() {
  const reduced = useReducedMotionPreference(true);
  return <div className={s.route}>
    <div className={s.header}><p>OUTSTATION</p><span>Road journey</span></div>
    <RouteDrawing mobileLayout={false} reduced={Boolean(reduced)}/>
    <RouteDrawing mobileLayout reduced={Boolean(reduced)}/>
    <div className={s.itinerary} aria-label="Road journey from Ayodhya through Prayagraj to Varanasi"><span>Ayodhya</span><ArrowRight size={12} aria-hidden="true"/><span>Prayagraj</span><ArrowRight size={12} aria-hidden="true"/><span>Varanasi</span></div>
  </div>;
}

function RouteDrawing({ mobileLayout, reduced }: { mobileLayout: boolean; reduced: boolean }) {
  const route = mobileLayout ? mobile : desktop;
  const frames = routeFrames(route);
  const car = <><rect x="-19" y="-19" width="38" height="38" rx="13" fill="white" stroke="#cae0db"/><CarFront x={-11} y={-11} width={22} height={22} color="#087f83" strokeWidth={1.8}/></>;
  return <svg data-cab-route={mobileLayout ? "mobile" : "desktop"} className={mobileLayout ? s.mobile : s.desktop} viewBox={route.viewBox} role="img" aria-label="Ayodhya to Prayagraj, continuing along a curved road to Varanasi">
    <path d={`${route.main} ${route.branch}`} fill="none" stroke="#edf3f1" strokeWidth="9" strokeLinecap="round"/>
    <path d={route.main} stroke="#15858a" strokeWidth="2.5" fill="none"/>
    <path d={route.branch} stroke="#8cb5af" strokeWidth="2.5" strokeDasharray="5 5" fill="none"/>
    {[route.start, route.stop, route.end].map((point, index) => <g key={index}><circle cx={point.x} cy={point.y} r="10" fill="white"/><circle cx={point.x} cy={point.y} r="5" fill="#087f83"/></g>)}
    <g className={s.labels} fill="#153e4b" fontSize="16" fontWeight="600">
      {mobileLayout ? <><text x="79" y="50">Ayodhya</text><text x="79" y="138">Prayagraj</text><text x="229" y="241">Varanasi</text></> : <><text x="31" y="37">Ayodhya</text><text x="373" y="37">Prayagraj</text><text x="402" y="207">Varanasi</text></>}
    </g>
    {reduced ? <g data-route-car="static" transform={`translate(${route.start.x},${route.start.y})`}>{car}</g> : <motion.g data-route-car="animated" initial={{ x: route.start.x, y: route.start.y }} animate={{ x: frames.x, y: frames.y }} transition={{ duration: 16, times: frames.times, repeat: Infinity, repeatDelay: 7, ease: "linear" }}>{car}</motion.g>}
  </svg>;
}
