import Link from "next/link";
import { ArrowRight, Plane, Mountain, Route } from "lucide-react";
import { vehicles } from "@/data/vehicles";
import s from "./MarketplaceHome.module.css";

export function CabJourneyRoute() {
 return <div className={s.cabProduct}>
  <p className={s.eyebrow}>YOUR JOURNEY, YOUR WAY</p>
  <h3 className={s.journeyHeading}>A ride around your plans.</h3>
  <p className={s.copy}>Choose your journey and discuss the details with our team.</p>
  <ul className={s.compactJourneys}>{[{Icon:Plane,title:"Airport transfers"},{Icon:Mountain,title:"Outstation"},{Icon:Route,title:"One-way / Round trips"}].map(({Icon,title})=><li key={title}><Icon size={20} aria-hidden="true"/><span>{title}</span></li>)}</ul>
  <p className={s.eyebrow}>VEHICLE CATEGORIES</p>
  <div className={s.compactVehicles}>{vehicles.map(vehicle=><span key={vehicle.id}>{vehicle.name}</span>)}</div>
  <p className={s.journeyNote}>Availability and final fare are confirmed during booking.</p>
  <Link href="/cabs" className={s.textLink}>Explore Cabs <ArrowRight size={17}/></Link>
 </div>;
}
