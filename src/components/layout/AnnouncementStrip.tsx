"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { useReducedMotionPreference } from "@/lib/useReducedMotionPreference";
import offers from "@/data/offers.json";

export interface Announcement {
  id: string; enabled: boolean; title: string; message: string; label: string;
  buttonText: string; link: string; priority: number; startDate: string | null;
  endDate: string | null; displayDuration: number; repeatAfter: number;
}
export function eligibleOffers(source: unknown[], now: number): Announcement[] {
  return source.filter((value): value is Announcement => {
    if (!value || typeof value !== "object") return false;
    const offer = value as Announcement;
    if (offer.enabled !== true || ![offer.id,offer.title,offer.message,offer.label,offer.buttonText,offer.link].every(v=>typeof v === "string" && v.trim())) return false;
    // Only site-relative destinations; no script URLs or protocol-relative redirects.
    if (!/^\/(?!\/|\\)/.test(offer.link) || /[\s\\]/.test(offer.link)) return false;
    if (!Number.isFinite(offer.priority)) return false;
    const start = offer.startDate == null ? -Infinity : Date.parse(offer.startDate);
    const end = offer.endDate == null ? Infinity : Date.parse(offer.endDate);
    return !Number.isNaN(start) && !Number.isNaN(end) && start <= end && start <= now && now <= end;
  }).filter((offer,index,all)=>all.findIndex(item=>item.id===offer.id)===index).sort((a,b)=>a.priority-b.priority);
}

const storageKey = "sukhad-announcements-v1";
type History = { dismissed: string[]; seen: Record<string,number>; closed?: boolean };
const emptyHistory = (): History => ({ dismissed: [], seen: {} });

export function AnnouncementStrip() {
  const [active,setActive] = useState<Announcement | null>(null);
  const [ready,setReady] = useState(false);
  const history = useRef<History>(emptyHistory());
  const current = useRef<Announcement | null>(null);
  const started = useRef(0);
  const elapsed = useRef(0);
  const panel = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionPreference();
  const save = () => { try { sessionStorage.setItem(storageKey,JSON.stringify(history.current)); } catch { /* In-memory session state still works. */ } };
  useEffect(()=>{
    try {
      const stored = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (stored && Array.isArray(stored.dismissed) && stored.seen && typeof stored.seen === "object") history.current = stored;
    } catch { /* Invalid or unavailable storage is ignored. */ }
    let timer: ReturnType<typeof setTimeout>;
    function tick() {
      if (history.current.closed) { setReady(true); return; }
      if (document.hidden) return;
      const now = Date.now();
      const valid = eligibleOffers(offers,now).filter(offer=>!history.current.dismissed.includes(offer.id));
      const duration = (Number.isFinite(current.current?.displayDuration) ? Math.max(8,current.current!.displayDuration) : 10)*1000;
      if (current.current && (!valid.some(o=>o.id===current.current!.id) || now-started.current+elapsed.current >= duration)) {
        history.current.seen[current.current.id] = now;
        current.current = null; elapsed.current = 0; save();
      }
      if (!current.current) {
        const next = valid.filter(offer=>{
          const seen = history.current.seen[offer.id];
          return !seen || now-seen >= Math.max(0,Number.isFinite(offer.repeatAfter)?offer.repeatAfter:3600)*1000;
        }).sort((a,b)=>(history.current.seen[a.id]||0)-(history.current.seen[b.id]||0)||a.priority-b.priority)[0];
        if (next) { current.current = next; started.current = now; elapsed.current = 0; history.current.seen[next.id]=now; save(); }
        setActive(current.current);
      }
      setReady(true);
      // No polling when everything is disabled, expired or dismissed. Otherwise
      // recheck future starts/cooldowns while the persistent shell stays mounted.
      if (valid.length || offers.some(offer=>offer.enabled && !history.current.dismissed.includes(offer.id) && offer.startDate && Date.parse(offer.startDate)>now)) timer=setTimeout(tick,1000);
    }
    function visibility() {
      clearTimeout(timer);
      if (document.hidden) { if (current.current) elapsed.current += Date.now()-started.current; }
      else { started.current=Date.now(); tick(); }
    }
    tick();document.addEventListener("visibilitychange",visibility);
    return ()=>{clearTimeout(timer);document.removeEventListener("visibilitychange",visibility);};
  },[]);
  useEffect(()=>{
    const element=panel.current;if(!element)return;
    const measure=()=>document.documentElement.style.setProperty("--announcement-height",`${element.getBoundingClientRect().height}px`);
    const observer=new ResizeObserver(measure);observer.observe(element);measure();
    return ()=>{observer.disconnect();document.documentElement.style.removeProperty("--announcement-height");};
  },[]);
  function dismiss() {
    if (!current.current) return;
    history.current.dismissed.push(current.current.id);history.current.closed=true;save();
    current.current=null;elapsed.current=0;setActive(null);
  }
  return <div ref={panel} className="announcement-shell" data-ready={ready}>
    <AnimatePresence initial={false} mode="wait">{active && <motion.aside key={active.id} className="announcement-strip" aria-label="Website announcement" initial={reduced?false:{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?0:.2}}>
      <div className="announcement-content"><span className="announcement-label">{active.label}</span><p><strong>{active.title}.</strong> {active.message}</p><Link href={active.link}>{active.buttonText}<ArrowRight size={14}/></Link><button type="button" onClick={dismiss} aria-label="Dismiss announcement"><X size={16}/></button></div>
    </motion.aside>}</AnimatePresence>
  </div>;
}
