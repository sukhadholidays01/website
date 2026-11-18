"use client";
import { useReducedMotionPreference } from "@/lib/useReducedMotionPreference";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Plane, MapPin, CarFront, BusFront, Compass, ShieldCheck, Headphones, BadgeIndianRupee, Route } from "lucide-react";
import { marketplaceDestinations as destinations, marketplaceServices, moodDestinations, type MarketplaceDestination } from "@/data/marketplace";
import { destinationInspiration } from "@/data/destinationInspiration";
import { SectionReveal } from "@/components/motion/TravelMotion";
import { GoogleReviews } from "./GoogleReviews";
import { TravelSearchPanel } from "@/components/travel/TravelSearchPanel";
import { getHolidayDestination } from '@/data/holidayDestinations';
import { holidayPackages } from '@/data/holidays';
import s from "./MarketplaceHome.module.css";
import { CabJourneyRoute } from "./CabJourneyRoute";

const find = (name: string) => destinations.find(d => d.title === name)!;
function Photo({ destination, eager=false }: {destination: MarketplaceDestination; eager?: boolean}) {
 return <Image src={destination.src} alt={destination.alt} fill sizes="(max-width: 600px) 75vw, (max-width: 1000px) 45vw, 550px" loading={eager ? "eager" : "lazy"} className={s.photo} />;
}
function Destination({name, className="", eager=false, compact=false}: {name:string;className?:string;eager?:boolean;compact?:boolean}) {
 const d=find(name);
 const detail=getHolidayDestination(name.toLowerCase()),itinerary=holidayPackages.find(p=>p.destination===name.toLowerCase());
 const href=detail?'/holidays/'+detail.slug:'/holidays?destination='+encodeURIComponent(name);
 return <article className={`${s.destination} ${className} ${!compact?s.withActions:''}`}><Link href={href} className={s.destinationLink} aria-label={`Explore ${name}`}><Photo destination={d} eager={eager}/><div className={s.shade}/><div className={s.destinationText}><div><span>{d.category}</span><h3>{name}</h3>{!compact && <p>{itinerary?`${itinerary.duration} · itinerary idea`:d.note}</p>}</div><ArrowUpRight size={20} aria-hidden="true"/></div></Link>{!compact&&<Link className={s.enquire} href={'/contact?category=Holiday%20Packages&journey='+encodeURIComponent('I would like to enquire about '+name+'.')} aria-label={`Enquire about ${name}`}>Enquire now <ArrowRight size={14}/></Link>}</article>;
}
function SectionTitle({eyebrow,title,copy}: {eyebrow:string;title:string;copy?:string}) {return <div><p className={s.eyebrow}>{eyebrow}</p><h2 className={s.heading}>{title}</h2>{copy && <p className={s.copy}>{copy}</p>}</div>;}

export function MarketplaceHome() {
 const reduced=useReducedMotionPreference();
 const [region,setRegion]=useState<"india"|"world">("india");
 const [mood,setMood]=useState("Spiritual");
 const carousel=useRef<HTMLDivElement>(null);
 const [edges,setEdges]=useState({start:true,end:false});
 useEffect(()=>{const el=carousel.current;if(!el)return;const update=()=>setEdges({start:el.scrollLeft<2,end:el.scrollLeft+el.clientWidth>=el.scrollWidth-2});const frame=requestAnimationFrame(()=>{el.scrollLeft=0;update();});const observer=new ResizeObserver(update);observer.observe(el);el.addEventListener('scroll',update,{passive:true});return()=>{cancelAnimationFrame(frame);observer.disconnect();el.removeEventListener('scroll',update);};},[region]);
 function scrollDestinations(direction:number){const el=carousel.current,card=el?.firstElementChild;if(!el||!card)return;const step=card.getBoundingClientRect().width+parseFloat(getComputedStyle(el).columnGap||'0');el.scrollBy({left:direction*step,behavior:reduced?'instant':'smooth'});}
 const shown=destinations.filter(d=>d.region===region);
 const entrance={initial:reduced ? false as const : {opacity:0,y:16},animate:{opacity:1,y:0},transition:{duration:reduced?0:.4}};
 function explore(value:"india"|"world") {setRegion(value);document.getElementById("discover")?.scrollIntoView({behavior:reduced?"instant":"smooth"});}
 return <div className={s.home}>
  <section className={s.hero} aria-labelledby="hero-heading"><div className={`${s.container} ${s.heroGrid}`}>
   <div className={s.heroCopy}>
     <motion.h1 id="hero-heading" initial={reduced?false:"hidden"} animate="visible" variants={{hidden:{},visible:{transition:{staggerChildren:reduced?0:.16,delayChildren:reduced?0:.08}}}}>
      <motion.span className={s.headlineLine} variants={{hidden:{opacity:0,y:26},visible:{opacity:1,y:0,transition:{duration:reduced?0:.75,ease:[.22,1,.36,1]}}}}>Plan the journey.</motion.span>
      <motion.span className={s.headlineLine} variants={{hidden:{opacity:0,y:26},visible:{opacity:1,y:0,transition:{duration:reduced?0:.75,ease:[.22,1,.36,1]}}}}>Create the memory.</motion.span>
     </motion.h1>
     <motion.p {...entrance} transition={{delay:reduced?0:.35,duration:reduced?0:.65}} className={s.heroDescription}>Flights, holidays, buses and cabs —<br/>designed around the way you travel.</motion.p>
     <motion.div {...entrance} transition={{delay:reduced?0:.5,duration:reduced?0:.65}} className={s.heroButtons}><button className={s.primary} onClick={()=>explore("india")}>Explore India <ArrowRight size={17}/></button><button className={s.secondary} onClick={()=>explore("world")}>Explore International <ArrowUpRight size={17}/></button></motion.div>
     <motion.p {...entrance} transition={{delay:reduced?0:.65,duration:reduced?0:.4}} className={s.heroTrust}><ShieldCheck size={14} aria-hidden="true"/>Journey planning with a personal touch.</motion.p>
   </div>
   <div className={s.canvas} aria-label="Find inspiration in Varanasi, Dubai, Jaipur and Ayodhya">{["Varanasi","Dubai","Jaipur","Ayodhya"].map((name,i)=><motion.div key={name} className={`${s.heroCard} ${s[`heroCard${i}`]}`} initial={reduced?false:{opacity:0,scale:.96,y:28}} animate={{opacity:1,scale:1,y:0}} transition={{delay:reduced?0:.18+i*.12,duration:reduced?0:.85,ease:[.22,1,.36,1]}}><Destination name={name} eager compact/></motion.div>)}</div>
  </div></section>
  <div className={s.booking}><TravelSearchPanel/></div>
  <section id="discover" className={`${s.section} ${s.discovery}`} aria-labelledby="discover-title"><div className={s.container}><div className={s.sectionTop}><div><p className={s.eyebrow}>A WORLD OF POSSIBILITIES</p><h2 id="discover-title" className={s.heading}>Where does your next story take you?</h2><p className={s.copy}>Sacred mornings, city lights, or a little time by the sea.</p></div><div className={s.segment} aria-label="Destination region">{(["india","world"] as const).map(r=><button key={r} aria-pressed={region===r} onClick={()=>setRegion(r)}>{r==="india"?<MapPin size={15}/>:<Compass size={15}/>} {r==="india"?"India":"World"}</button>)}</div></div><div className={s.carouselControls}><button type="button" aria-label="Previous destinations" disabled={edges.start} onClick={()=>scrollDestinations(-1)}><ChevronLeft size={19}/></button><button type="button" aria-label="Next destinations" disabled={edges.end} onClick={()=>scrollDestinations(1)}><ChevronRight size={19}/></button></div><div ref={carousel} className={s.discoveryStrip} aria-label={`${region=== "india"?"India":"World"} destinations`}>{shown.map(d=><Destination key={d.title} name={d.title} compact/>)}</div>
   <nav className={s.destinationNav} aria-label="Explore by destination"><span>Explore by destination</span><div className="home-inspiration-links">{destinationInspiration.filter(d=>d.scope===(region==="india"?"domestic":"international")).map(d=><Link key={d.id} href={"/holidays?destination="+encodeURIComponent(d.name)}>{d.name}</Link>)}</div></nav><div className={s.editorialTop}><div><p className={s.eyebrow}>GO SOMEWHERE THAT MOVES YOU</p><h3>Extraordinary places. Your kind of escape.</h3></div><Link href="/holidays" className={s.textLink}>All holiday ideas <ArrowRight size={17}/></Link></div><div className={s.editorial}>{(region==="india"?["Kerala","Ayodhya","Udaipur","Goa","Rishikesh"]:["Dubai","Bali","Singapore","Maldives","Switzerland"]).map((name,i)=><Destination key={name} name={name} className={s[`editorial${i}`]}/>)}</div>
  </div></section>
  <SectionReveal><section className={`${s.section} ${s.moods}`}><div className={s.container}><div className={s.sectionTop}><SectionTitle eyebrow="FOLLOW YOUR FEELING" title="What are you travelling for?" copy="The best journeys begin with what you love."/><Link href="/holidays" className={s.textLink}>Find your escape <ArrowRight size={17}/></Link></div><div className={s.moodTabs} aria-label="Travel mood">{Object.keys(moodDestinations).map(m=><button key={m} aria-pressed={mood===m} onClick={()=>setMood(m)}>{m}</button>)}</div><motion.div key={mood} initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.24}} className={s.moodCards} aria-live="polite">{destinations.filter(d=>moodDestinations[mood]?.includes(d.title)).map(d=><Destination key={d.title} name={d.title}/>)}{!destinations.some(d=>moodDestinations[mood]?.includes(d.title))&&<p className={s.empty}>No matching itinerary ideas yet. <Link href="/contact?category=Holiday%20Packages">Ask us to plan your trip</Link>.</p>}</motion.div></div></section></SectionReveal>
  <section className={s.section}><div className={s.container}><div className={s.sectionTop}><SectionTitle eyebrow="ONE JOURNEY. EVERY DETAIL." title="Everything for the journey."/><p className={s.sideCopy}>From the first flight to the last mile,<br/>we help bring your plans together.</p></div><div className={s.services}>{marketplaceServices.map((service,i)=>{const Icon=[Plane,Compass,BusFront,CarFront][i];return <Link key={service.title} href={service.href} className={`${s.service} ${s[`service${i}`]}`}><div className={s.servicePhoto}><Image src={service.image} alt={service.alt} fill sizes="(max-width: 600px) 90vw, 45vw" className={s.photo}/></div><div className={s.serviceContent}><Icon size={22}/><span className={s.serviceLabel}>{service.title}</span><h3>{service.line}</h3><p>{service.note}</p><span className={s.serviceArrow}>Explore {service.title=== "Holiday Packages"?"Holidays":service.title}<ArrowUpRight size={18}/></span></div></Link>})}</div></div></section>
  <section className={`${s.section} ${s.cabs}`} aria-labelledby="cab-heading"><div className={`${s.container} ${s.cabGrid}`}><div className={s.cabIntro}><p className={s.eyebrow}>GOOD COMPANY. GREAT ROADS.</p><h2 id="cab-heading" className={s.heading}>Take the scenic route.</h2><p className={s.copy}>From airport transfers to outstation journeys, travel comfortably with a ride planned around your route.</p><Link href="/cabs" className={s.primary}>Explore Cabs <ArrowRight size={17}/></Link><figure className={s.roadImage}><Image src="/images/hero/himalayan-road-trip.webp" alt="Travellers beside a vehicle overlooking a Himalayan mountain valley" fill sizes="(max-width: 767px) 90vw, 560px" className={s.photo}/><figcaption>Make the journey part of the memory.</figcaption></figure></div><CabJourneyRoute/></div></section>
  <section className={s.trust} aria-label="Travel with confidence"><div className={s.container}>{[{Icon:ShieldCheck,title:"Cab Planning",copy:"Choose your route and ride"},{Icon:Headphones,title:"Travel Assistance",copy:"Discuss your plans with us"},{Icon:BadgeIndianRupee,title:"Transparent Pricing",copy:"Clarity before you travel"},{Icon:Route,title:"Personal Journeys",copy:"Travel around your interests"}].map(({Icon,title,copy})=><div key={title}><Icon size={25}/><span><strong>{title}</strong><small>{copy}</small></span></div>)}</div></section>
  <GoogleReviews/>
  <section className={s.final}><div className={`${s.container} ${s.finalInner}`}><div className={s.finalPhotos}><Destination name="Ayodhya" compact/><Destination name="Goa" compact/></div><div className={s.finalCopy}><p className={s.eyebrow}>THE NEXT CHAPTER IS YOURS</p><h2>Where will you go next?</h2><p>Your next memory is somewhere out there.</p><Link href="/contact" className={s.primary}>Start planning <ArrowRight size={17}/></Link></div><div className={s.finalPhotos}><Destination name="Dubai" compact/><Destination name="Varanasi" compact/></div></div></section>
 </div>;
}

