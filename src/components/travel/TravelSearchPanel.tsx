"use client";
import {AnimatePresence,motion} from 'framer-motion';
import {ArrowLeftRight,BusFront,CalendarDays,CarFront,LoaderCircle,MapPin,MapPinned,Plane,Search,Users,Info,Minus,Plus,ChevronDown} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {useEffect,useState,useTransition} from 'react';
import {Button} from '@/components/ui/Button';
import {useReducedMotionPreference} from '@/lib/useReducedMotionPreference';
import {useToast} from '@/components/notifications/ToastProvider';
import {cabPlaces} from '@/data/cabPlaces';
import {airports} from '@/data/demoFlights';
import {destinationInspiration} from '@/data/destinationInspiration';
import type {BookingType} from '@/types';
interface Field{id:string;label:string;type:'text'|'date'|'month'|'datetime-local'|'select';icon:LucideIcon;options?:string[];placeholder?:string}
const location=(id:string,label:string):Field=>({id,label,type:'text',icon:id==='from'?MapPin:MapPinned,placeholder:label});
const date=(id:string,label:string,type:Field['type']='date'):Field=>({id,label,type,icon:CalendarDays});
const travellers:Field={id:'travellers',label:'Travellers',type:'select',icon:Users,options:['1','2','3','4','5','6']};
const tabs:{id:BookingType;label:string;icon:LucideIcon;fields:Field[]}[]=[
 {id:'flights',label:'Flights',icon:Plane,fields:[location('from','From'),location('to','To'),date('departure','Departure'),date('return','Return (optional)'),travellers]},
 {id:'holidays',label:'Holiday Packages',icon:MapPinned,fields:[location('to','Destination'),date('departure','Travel month','month'),travellers,{id:'style',label:'Travel style',type:'select',icon:MapPin,options:['Family','Couple','Spiritual','Adventure','Weekend']}]},
 {id:'bus',label:'Bus',icon:BusFront,fields:[location('from','From'),location('to','To'),date('departure','Travel date'),travellers]},
 {id:'cabs',label:'Cabs',icon:CarFront,fields:[location('from','Pickup'),location('to','Destination'),{id:'tripType',label:'Trip type',type:'select',icon:CarFront,options:['One way','Round trip']},date('departure','Pickup date & time','datetime-local'),{...travellers,label:'Passengers'}]},
];
function FieldHelp({label,text}:{label:string;text:string}) {return <details className="marketplace-help" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))event.currentTarget.open=false;}} onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}><summary aria-label={'Help for '+label}><Info size={14}/></summary><p role="note">{text}</p></details>;}
function TravellerPicker({count,label,disabled,onChange}:{count:string;label:string;disabled:boolean;onChange:(value:string)=>void}) {
 return <details className="marketplace-travellers" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))event.currentTarget.open=false;}} onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}>
  <summary aria-label={label+': '+count} aria-disabled={disabled} onClick={event=>{if(disabled)event.preventDefault();}}>{count} {label.toLowerCase()}<ChevronDown size={15}/></summary><input id="marketplace-travellers" name="travellers" type="hidden" value={count}/>
  <div className="marketplace-traveller-panel"><span>{label}<small>Choose between 1 and 6</small></span><div className="marketplace-stepper"><button type="button" aria-label={'Decrease '+label.toLowerCase()} disabled={disabled||Number(count)<=1} onClick={()=>onChange(String(Number(count)-1))}><Minus size={16}/></button><output aria-live="polite">{count}</output><button type="button" aria-label={'Increase '+label.toLowerCase()} disabled={disabled||Number(count)>=6} onClick={()=>onChange(String(Number(count)+1))}><Plus size={16}/></button></div></div>
 </details>;
}
export function TravelSearchPanel(){
 const [active,setActive]=useState<BookingType>('flights'),[drafts,setDrafts]=useState<Partial<Record<BookingType,Record<string,string>>>>({}),[error,setError]=useState(''),[today,setToday]=useState('');
 const [pending,startTransition]=useTransition(),router=useRouter(),reduced=useReducedMotionPreference(),{notify}=useToast();
 useEffect(()=>{const timer=setTimeout(()=>setToday(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})),0);return()=>clearTimeout(timer);},[]);
 const tab=tabs.find(t=>t.id===active)!,values=drafts[active]||{};
 const fields=active==='cabs'&&values.tripType==='Round trip'?[...tab.fields,date('return','Return date & time','datetime-local')]:tab.fields;
 const value=(f:Field)=>values[f.id]??(f.type==='select'?(f.id==='travellers'?'2':f.options?.[0]||''):'');
 function change(id:string,v:string){setDrafts(all=>({...all,[active]:{...all[active],[id]:v}}));setError('');}
 function fail(message:string){setError(message);notify({id:'home-search-validation',kind:'error',title:'Check your journey',description:message});}
 function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(pending)return;
  const data=Object.fromEntries(fields.map(f=>[f.id,value(f).trim()]));
  if(fields.some(f=>(f.id!=='return'||active==='cabs')&&!data[f.id]))return fail('Complete all required journey fields.');
  if(data.from&&data.from.toLowerCase()===data.to?.toLowerCase())return fail('Pickup and destination must be different.');
  if(data.departure<today.slice(0,data.departure.length===7?7:10))return fail('Please choose a current or future travel date.');
  if(data.return&&(active==='cabs'?data.return<=data.departure:data.return<data.departure))return fail('Return must be after departure.');
  let href='';
  if(active==='cabs'){
   if(Date.parse(data.departure+':00+05:30')<=new Date().getTime())return fail('Please choose a future pickup time.');
   const matches=(v:string)=>cabPlaces.some(p=>p.label.toLowerCase()===v.toLowerCase()||p.city.toLowerCase()===v.toLowerCase());
   if(!matches(data.from)||!matches(data.to))return fail('Choose a supported location from the suggestions, or open Cabs to plan another route.');
   href='/cabs?'+new URLSearchParams(data);
  }
  else{const summary=[tab.label+' enquiry',...fields.map(f=>f.label+': '+data[f.id])].filter(Boolean).join('\n');href='/contact?'+new URLSearchParams({category:active==='flights'?'Flight Tickets':active==='holidays'?'Holiday Packages':'Bus',journey:summary})+'#enquiry-form';}
  startTransition(()=>{try{router.push(href);}catch{fail('We could not open the next step. Please try again.');}});
 }
 function keyDown(e:React.KeyboardEvent<HTMLButtonElement>,i:number){let next=i;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();setActive(tabs[next].id);setError('');document.getElementById('travel-tab-'+tabs[next].id)?.focus();}
 return <section id="booking" className="relative z-20 mx-auto -mt-20 w-full max-w-[90rem] scroll-mt-28 px-4 pb-10 sm:px-6" aria-label="Search travel services"><div className="rounded-2xl border border-border bg-white shadow-sm"><div className="marketplace-tab-scroll"><div className="flex min-w-max" role="tablist" aria-label="Travel services">{tabs.map((t,i)=><button key={t.id} type="button" id={'travel-tab-'+t.id} role="tab" aria-selected={active===t.id} aria-controls="travel-search-panel" tabIndex={active===t.id?0:-1} disabled={pending} onKeyDown={e=>keyDown(e,i)} onClick={()=>{setActive(t.id);setError('');}} className="relative flex items-center whitespace-nowrap"><t.icon size={20} className={active===t.id?'text-brand-teal':''} aria-hidden="true"/>{t.label}{active===t.id&&<motion.span layoutId="search-tab" transition={{duration:reduced?0:.2}} className="absolute inset-x-0 inset-y-0 -z-10 rounded-full bg-[#e5f2ed]"/>}</button>)}</div></div>
 <div className="marketplace-form-body"><AnimatePresence mode="wait" initial={false}><motion.form key={active} id="travel-search-panel" role="tabpanel" aria-labelledby={'travel-tab-'+active} aria-describedby="home-search-note" aria-busy={pending} onSubmit={submit} onInvalidCapture={event=>{const field=event.target as HTMLInputElement;fail(field.validationMessage||'Check your journey details.');}} initial={reduced?false:{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:reduced?0:.15}} className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-service={active}>
 {fields.map(f=><div key={f.id} className="marketplace-field relative min-w-0 rounded-xl border border-border bg-white px-3 py-3 focus-within:ring-2 focus-within:ring-brand-light-teal"><label htmlFor={'marketplace-'+f.id} className="flex items-center gap-2 text-xs font-semibold text-secondary"><f.icon size={15} className="text-brand-teal" aria-hidden="true"/>{f.label}</label>{f.id==='from'&&<button type="button" aria-label="Swap origin and destination" disabled={pending} className="marketplace-swap" onClick={()=>setDrafts(all=>({...all,[active]:{...all[active],from:values.to||'',to:values.from||''}}))}><ArrowLeftRight size={16}/></button>}
 {['departure','return','travellers'].includes(f.id)&&<FieldHelp label={f.label} text={f.id==='travellers'?'Select 1 to 6 travellers. Vehicle suitability is confirmed during cab booking.':f.id==='return'?'Leave blank for a one-way flight. A return date is required for round-trip cabs.':'Choose a future travel date. Cab pickup times use Indian Standard Time.'}/>}
 {f.id==='travellers'?<TravellerPicker count={value(f)} label={f.label} disabled={pending} onChange={v=>change(f.id,v)}/>:f.type==='select'?<select id={'marketplace-'+f.id} name={f.id} value={value(f)} onChange={e=>change(f.id,e.target.value)} disabled={pending} className="mt-2 min-h-9 w-full min-w-0 bg-transparent text-sm" required>{f.options?.map(o=><option key={o} value={o}>{f.id==='travellers'?o+' '+(active==='cabs'?'passenger':'traveller')+(o==='1'?'':'s'):o}</option>)}</select>:<input id={'marketplace-'+f.id} name={f.id} type={f.type} value={value(f)} onChange={e=>change(f.id,e.target.value)} list={f.type==='text'?(active==='cabs'?'homepage-cab-places':active==='flights'?'homepage-airports':'homepage-destinations'):undefined} autoComplete={f.type==='text'?'off':undefined} maxLength={f.type==='text'?100:undefined} min={f.id==='return'&&values.departure?values.departure:f.type==='date'?today:f.type==='month'?today.slice(0,7):f.type==='datetime-local'?today+'T00:00':undefined} placeholder={f.placeholder} required={f.id!=='return'||active==='cabs'} disabled={pending} className="mt-2 min-h-9 w-full min-w-0 bg-transparent text-sm outline-none"/>}</div>)}
 <Button type="submit" size="lg" disabled={pending} className="marketplace-search-cta">{pending?<LoaderCircle size={18} className="animate-spin"/>:<Search size={18}/>} {pending?'Opening…':active==='cabs'?'Request a cab':'Enquire now'}</Button>
 </motion.form></AnimatePresence><datalist id="homepage-cab-places">{cabPlaces.map(p=><option value={p.label} key={p.id}/>)}</datalist><datalist id="homepage-airports">{airports.map(a=><option key={a.code} value={a.city}>{a.code} - {a.name}</option>)}</datalist><datalist id="homepage-destinations">{destinationInspiration.map(d=><option key={d.id} value={d.name}/>)}</datalist>{error&&<p role="alert" className="mt-3 text-sm text-error">{error}</p>}<p id="home-search-note" className="mt-4 text-xs leading-5 text-secondary">Every great journey starts with a plan.</p></div></div></section>;
}
