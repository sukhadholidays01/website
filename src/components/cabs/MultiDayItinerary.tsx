"use client";
import { cabPlaces } from "@/data/cabPlaces";
import type { CabJourney } from "@/lib/cab/types";
import { PlacePicker } from "./PlacePicker";
export function MultiDayItinerary({value,onChange}:{value:NonNullable<CabJourney["itinerary"]>;onChange:(value:NonNullable<CabJourney["itinerary"]>)=>void}) {
  function move(index:number,offset:number){const stops=[...value.stops];[stops[index],stops[index+offset]]=[stops[index+offset],stops[index]];onChange({...value,stops});}
  return <fieldset className="cb-itinerary"><legend>Multi-day destinations & intermediate stops</legend><p className="cb-note">List stops in travel order between pickup and final destination. Overnight stays are requests, not hotel reservations.</p>{value.stops.map((stop,index)=><div className="cb-itinerary-stop" key={index}>
    <PlacePicker label={"Stop "+(index+1)} value={stop.place} onChange={place=>onChange({...value,stops:value.stops.map((s,i)=>i===index?{...s,place}:s)})}/>
    <label><input type="checkbox" checked={stop.overnight} onChange={e=>onChange({...value,stops:value.stops.map((s,i)=>i===index?{...s,overnight:e.target.checked}:s)})}/>Overnight stay requested</label>
    <label>Stop/itinerary notes<input maxLength={300} value={stop.notes} onChange={e=>onChange({...value,stops:value.stops.map((s,i)=>i===index?{...s,notes:e.target.value}:s)})}/></label>
    <div className="cb-actions"><button type="button" className="cb-btn" disabled={index===0} onClick={()=>move(index,-1)} aria-label={"Move stop "+(index+1)+" up"}>Move up</button><button type="button" className="cb-btn" disabled={index===value.stops.length-1} onClick={()=>move(index,1)} aria-label={"Move stop "+(index+1)+" down"}>Move down</button><button type="button" className="cb-btn" disabled={value.stops.length===1} onClick={()=>onChange({...value,stops:value.stops.filter((_,i)=>i!==index)})}>Remove stop</button></div>
  </div>)}<button type="button" className="cb-btn" disabled={value.stops.length>=12} onClick={()=>onChange({...value,stops:[...value.stops,{place:cabPlaces.find(p=>!value.stops.some(s=>s.place.id===p.id))||cabPlaces[0],overnight:false,notes:""}]})}>Add destination</button>
  <label>Approximate daily distance (optional, km)<input type="number" min={1} max={1000} value={value.dailyDistanceKm||""} onChange={e=>onChange({...value,dailyDistanceKm:e.target.value?Number(e.target.value):undefined})}/></label><label>Itinerary and special requirements<textarea maxLength={1500} value={value.requirements} onChange={e=>onChange({...value,requirements:e.target.value})}/></label><p className="cb-note">Operations will prepare an explicit multi-day quotation. No production tariff is assumed.</p></fieldset>;
}
