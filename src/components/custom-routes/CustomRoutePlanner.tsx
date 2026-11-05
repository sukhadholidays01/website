"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowRight, Check, Compass, MapPin, Minus, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { customRouteIdeas, customRouteStyles } from "@/data/customRoutes";
import { useReducedMotionPreference } from "@/lib/useReducedMotionPreference";
import { configuredWhatsAppPhone, createWhatsAppUrl } from "@/lib/whatsapp";
import { SectionReveal } from "@/components/motion/TravelMotion";
import "./custom-routes.css";

interface Stop { id: string; name: string }
type Stage = "builder" | "building" | "summary" | "enquiry" | "success";
export function CustomRoutePlanner({ initialOrigin = "Delhi" }: { initialOrigin?: string }) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [stops, setStops] = useState<Stop[]>([{ id: "agra", name: "Agra" }, { id: "jaipur", name: "Jaipur" }]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [travellers, setTravellers] = useState(2);
  const [style, setStyle] = useState("Heritage");
  const [stage, setStage] = useState<Stage>("builder");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const reduced = useReducedMotionPreference();
  const heading = useRef<HTMLHeadingElement>(null);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const route = [origin, ...stops.map(s => s.name)];
  const days = start && end ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1 : 0;
  useEffect(() => {
    if (stage !== "building") return;
    const timer = setTimeout(() => setStage("summary"), reduced ? 0 : 1000);
    return () => clearTimeout(timer);
  }, [stage, reduced]);
  useEffect(() => { if (["summary", "enquiry", "success"].includes(stage)) heading.current?.focus(); }, [stage]);
  function reorder(index: number, direction: number) {
    setStops(current => { const next = [...current]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; });
  }
  const preview = <aside className="custom-preview" aria-label="Journey route preview">
    <p className="custom-eyebrow">Your journey, taking shape</p><h2>A little further.<br /><em>A little more you.</em></h2>
    <div className="custom-route-visual">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><motion.path key={stage + stops.map(s => s.id).join()} d="M 12 4 C 12 25, 85 25, 85 48 S 12 75, 12 96" fill="none" stroke="currentColor" strokeWidth="0.7" strokeDasharray="2 2" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : 0.8 }} /></svg>
      <ol>{route.map((name, i) => <motion.li layout={!reduced} key={i === 0 ? "origin" : stops[i-1].id} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }}><span>{String(i+1).padStart(2,"0")}</span><strong>{name.trim() || "Your next destination"}</strong><MapPin size={18} aria-hidden="true" /></motion.li>)}</ol>
    </div><p className="custom-note">A visual journey sketch, not a map or distance estimate.</p>
    {stage === "building" && <p role="status" className="custom-planning">Planning your journey…</p>}
  </aside>;
  return <div className="custom-page"><div className="custom-container">
    <header className="custom-intro"><p className="custom-eyebrow"><Compass size={18} /> Personalised journeys</p><h1>YOUR JOURNEY.<br /><em>YOUR WAY.</em></h1><p>Tell us where you want to go.<br />We’ll help shape the journey around you.</p></header>
    <AnimatePresence mode="wait" initial={false}><motion.div key={stage === "building" ? "builder" : stage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {(stage === "builder" || stage === "building") ? <form className="custom-layout" onSubmit={e => {
        e.preventDefault(); setError("");
        const names = route.map(n => n.trim().toLowerCase());
        if (names.some(n => n.length < 2)) { setError("Enter a starting location and at least one destination, using two or more characters."); return; }
        if (new Set(names).size !== names.length) { setError("Each destination should be different. Use the additional requirements to describe return visits."); return; }
        if (start < today || end < start || !Number.isFinite(days) || days < 1) { setError("Choose a future start date and an end date on or after it."); return; }
        setStage("building");
      }}>
        <fieldset className="custom-builder" disabled={stage === "building"}><legend className="sr-only">Build your journey</legend><p className="custom-eyebrow">01 / Your journey</p>
          <label htmlFor="custom-origin">Starting from</label><input id="custom-origin" value={origin} onChange={e => setOrigin(e.target.value)} required minLength={2} maxLength={80} autoComplete="address-level2" />
          <div className="custom-label">Stops <small>Up to eight destinations</small></div>
          <ol className="custom-stops"><AnimatePresence initial={false}>{stops.map((stop, i) => <motion.li key={stop.id} layout={!reduced} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <span className="custom-stop-number">{i+1}</span><input aria-label={`Destination ${i+1}`} value={stop.name} required minLength={2} maxLength={80} onChange={e => setStops(current => current.map(s => s.id === stop.id ? {...s, name: e.target.value} : s))} />
            <div className="custom-stop-actions"><button type="button" disabled={i === 0} onClick={() => reorder(i,-1)} aria-label={`Move destination ${i+1} up`}><ArrowUp size={16}/></button><button type="button" disabled={i === stops.length-1} onClick={() => reorder(i,1)} aria-label={`Move destination ${i+1} down`}><ArrowDown size={16}/></button><button type="button" disabled={stops.length === 1} onClick={() => setStops(current => current.filter(s => s.id !== stop.id))} aria-label={`Remove destination ${i+1}`}><X size={16}/></button></div>
          </motion.li>)}</AnimatePresence></ol>
          <Button variant="secondary" disabled={stops.length >= 8} onClick={() => setStops(current => [...current, {id: crypto.randomUUID(), name: ""}])}><Plus size={18}/> Add destination</Button>
          <div className="custom-dates"><div><label htmlFor="custom-start">Start date</label><input id="custom-start" type="date" required min={today} value={start} onChange={e => setStart(e.target.value)}/></div><div><label htmlFor="custom-end">End date</label><input id="custom-end" type="date" required min={start || today} value={end} onChange={e => setEnd(e.target.value)}/></div></div>
          <div className="custom-travellers"><span>Travellers</span><div><Button variant="secondary" disabled={travellers <= 1} aria-label="Fewer travellers" onClick={() => setTravellers(n => n-1)}><Minus size={16}/></Button><output aria-live="polite">{travellers}</output><Button variant="secondary" disabled={travellers >= 50} aria-label="More travellers" onClick={() => setTravellers(n => n+1)}><Plus size={16}/></Button></div></div>
          <fieldset className="custom-styles"><legend>Travel style</legend>{customRouteStyles.map(s => <button type="button" key={s} aria-pressed={style === s} onClick={() => setStyle(s)}>{s}</button>)}</fieldset>
        </fieldset>
        {preview}<div className="custom-build-action">{error && <p className="custom-error" role="alert">{error}</p>}<Button size="lg" type="submit" disabled={stage === "building"}>{stage === "building" ? "Planning your journey…" : "Build My Journey"}<ArrowRight size={18}/></Button><p className="custom-note">We’ll prepare a summary for your enquiry. Your itinerary is planned by the travel team.</p></div>
      </form> : <section className="custom-summary">
        {stage === "success" ? <><div className="custom-check"><Check size={32}/></div><p className="custom-eyebrow">Demo enquiry received</p><h2 ref={heading} tabIndex={-1}>Your custom journey request has been received in this demo.</h2><p className="custom-reference">{reference}</p><p className="custom-note">Local demo reference only. No information has been sent or saved and no travel has been booked.</p>{configuredWhatsAppPhone.replace(/\D/g, "") && <a className="custom-share" href={createWhatsAppUrl(configuredWhatsAppPhone, message)}>Share request on WhatsApp <ArrowRight size={18}/></a>}<Button onClick={() => {setStage("builder");setReference("");setMessage("");}}>Plan another journey</Button></> : <>
          <p className="custom-eyebrow">Your custom journey</p><h2 ref={heading} tabIndex={-1}>{stage === "enquiry" ? "Let’s make it yours." : "A journey shaped around you."}</h2><ol className="custom-summary-route">{route.map((name,i) => <li key={i}><MapPin size={18}/>{name}</li>)}</ol><p>{travellers} Travellers · {days} {days === 1 ? "Day" : "Days"} · {style}</p><p className="custom-note">{start} → {end} · Route inspiration, subject to the team’s feasibility review.</p>
          {stage === "summary" ? <div className="custom-summary-actions"><Button size="lg" onClick={() => setStage("enquiry")}>Request This Journey <ArrowRight size={18}/></Button><Button variant="secondary" onClick={() => setStage("builder")}>Edit journey</Button></div> : <form className="custom-enquiry" onSubmit={e => {e.preventDefault();setError("");const data = new FormData(e.currentTarget);const mobile = String(data.get("mobile")).trim();if(String(data.get("name")).trim().length < 2 || !/^\+?[\d\s()-]+$/.test(mobile) || mobile.replace(/\D/g,"").length < 7 || mobile.replace(/\D/g,"").length > 15) {setError("Enter your full name and a mobile number with 7–15 digits.");return;}const ref = `SH-CUSTOM-${crypto.randomUUID().slice(0,8).toUpperCase()}`;setReference(ref);setMessage(`Custom journey: ${route.join(" → ")}\n${travellers} travellers · ${style}\nDates: ${start} to ${end}\nPreferred date: ${data.get("date")}\nName: ${data.get("name")}\nMobile: ${mobile}\nEmail: ${data.get("email")}\nRequirements: ${data.get("requirements")}\nReference: ${ref}`);setStage("success");}}>
            <div className="custom-dates">{[{name:"name",label:"Name",type:"text"},{name:"mobile",label:"Mobile",type:"tel"},{name:"email",label:"Email",type:"email"},{name:"date",label:"Preferred travel date",type:"date"}].map(f => <div key={f.name}><label htmlFor={`custom-${f.name}`}>{f.label}</label><input id={`custom-${f.name}`} name={f.name} type={f.type} required min={f.type === "date" ? today : undefined} defaultValue={f.name === "date" ? start : undefined} autoComplete={f.name === "mobile" ? "tel" : f.name === "date" ? "off" : f.name}/></div>)}</div><label htmlFor="custom-requirements">Additional requirements</label><textarea id="custom-requirements" name="requirements" rows={4} maxLength={2000} placeholder="Interests, accessibility needs, accommodation preferences…"/>{error && <p role="alert" className="custom-error">{error}</p>}<p className="custom-note">Demo enquiry: details are not sent or saved. A WhatsApp handoff is available when configured.</p><div className="custom-summary-actions"><Button type="submit" size="lg">Send Enquiry <ArrowRight size={18}/></Button><Button variant="secondary" onClick={() => setStage("summary")}>Back to summary</Button></div>
          </form>}
        </>}
      </section>}
    </motion.div></AnimatePresence>
    {stage === "builder" && <SectionReveal className="custom-ideas"><p className="custom-eyebrow">A starting point for your imagination</p><h2>Choose a route. Make it your own.</h2><p className="custom-note">Journey inspiration, not live bookable routes.</p><div>{customRouteIdeas.map(idea => <button type="button" key={idea.id} onClick={() => {setOrigin(idea.stops[0]);setStops(idea.stops.slice(1).map(name => ({id:crypto.randomUUID(),name})));setStyle(idea.style);setError("");document.getElementById("custom-origin")?.focus();}}><strong>{idea.title}</strong><span>{idea.stops.join(" → ")}</span><ArrowRight size={18}/></button>)}</div></SectionReveal>}
  </div></div>;
}


