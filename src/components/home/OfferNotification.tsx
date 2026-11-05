'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { publicOffers, invalidateDatabase } from '@/lib/admin/repository';
import type { Promotion } from '@/types/admin';
import { useReducedMotionPreference } from '@/lib/useReducedMotionPreference';
import s from './OfferNotification.module.css';
export function OfferNotification() {
 const [offers,setOffers]=useState<Promotion[]>([]);
 const [dismissed,setDismissed]=useState<string[]>([]);
 const [index,setIndex]=useState(0);
 const [visible,setVisible]=useState(false);
 const [hover,setHover]=useState(false);
 const [focus,setFocus]=useState(false);
 const [obstructed,setObstructed]=useState(false);
 const [progress,setProgress]=useState(0);
 const elapsed=useRef(0);
 const reduced=useReducedMotionPreference();
 const available=offers.filter(p=>!dismissed.includes(p.id));
 const current=available[index % Math.max(available.length,1)];
 useEffect(()=>{
  const refresh=()=>{setOffers(publicOffers());};
  const externalRefresh=()=>{invalidateDatabase();refresh();};
  const timer=setTimeout(()=>{refresh();try {const saved:unknown=JSON.parse(sessionStorage.getItem('sukhad-offer-dismissed-v3')||'[]');if(Array.isArray(saved))setDismissed(saved.filter((id):id is string=>typeof id==='string'));}catch{}},0);
  const interval=setInterval(refresh,60000);
  window.addEventListener('storage',externalRefresh);window.addEventListener('sukhad-admin-change',refresh);
  return()=>{clearTimeout(timer);clearInterval(interval);window.removeEventListener('storage',externalRefresh);window.removeEventListener('sukhad-admin-change',refresh);};
 },[]);
 useEffect(()=>{
  const check=()=>{
   const mobile=innerWidth<=700;
   const lane={left:mobile?(innerWidth-Math.min(380,innerWidth-24))/2:innerWidth-374,top:innerHeight-122,right:innerWidth-12,bottom:innerHeight};
   const modal=!!document.querySelector('[role="dialog"][aria-modal="true"],dialog[open]');
   const editing=document.activeElement?.matches('input,textarea,select');
   const covered=[...document.querySelectorAll<HTMLElement>('#booking, main button, main a')].some(el=>{if(el.closest('[data-travel-offers]'))return false;const r=el.getBoundingClientRect();return r.width>0&&r.bottom>lane.top&&r.top<lane.bottom&&r.right>lane.left&&r.left<lane.right;});
   setObstructed(modal||!!editing||covered||document.hidden);
  };
  check();const timer=setInterval(check,300);
  window.addEventListener('scroll',check,{passive:true});window.addEventListener('resize',check);document.addEventListener('visibilitychange',check);
  return()=>{clearInterval(timer);window.removeEventListener('scroll',check);window.removeEventListener('resize',check);document.removeEventListener('visibilitychange',check);};
 },[]);
 useEffect(()=>{
  if(!current||hover||focus||obstructed)return;
  const timer=setInterval(()=>{
   elapsed.current+=100;
   const duration=visible?Math.max(3,Math.min(30,current.displayDuration))*1000:1500;
   setProgress(visible?Math.min(1,elapsed.current/duration):0);
   if(elapsed.current>=duration){elapsed.current=0;if(visible){setVisible(false);setIndex(i=>(i+1)%available.length);}else setVisible(true);}
  },100);
  return()=>clearInterval(timer);
 },[current,available.length,hover,focus,obstructed,visible]);
 function dismiss(){if(!current)return;const next=[...dismissed,current.id];setDismissed(next);try{sessionStorage.setItem('sukhad-offer-dismissed-v3',JSON.stringify(next));}catch{}elapsed.current=0;setProgress(0);setVisible(false);setFocus(false);setHover(false);}
 return <aside data-travel-offers aria-label="Travel discovery" className={`${s.group} ${obstructed?s.hidden:''}`} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setFocus(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocus(false);}}>
 <AnimatePresence mode="wait" initial={false}>{visible&&current&&<motion.div key={current.id} data-offer-id={current.id} className={s.card} initial={reduced?false:{opacity:0,y:10,scale:.985}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:reduced?0:6,scale:reduced?1:.985}} transition={{duration:reduced?0:.22}}>
 <Link href={current.href} className={s.link}><Image src={current.image||'/images/holidays/agra.webp'} alt="" width={56} height={56} className={s.image} unoptimized/><span className={s.content}><span className={s.eyebrow}>{current.category}{current.isDemo&&<span>DEMO</span>}</span><strong>{current.title}</strong><span className={s.action}>{current.cta}<ArrowRight size={13}/></span></span></Link>
 <button type="button" className={s.close} onClick={dismiss} aria-label={`Dismiss ${current.title}`}><X size={15}/></button><span className={s.progress} style={{width:`${progress*100}%`}}/>
 </motion.div>}</AnimatePresence></aside>;
}

