"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LayoutDashboard, Car, Inbox, NotebookPen, Users, Palmtree, MapPin, Plane, Bus, Navigation, Tags, Files, MessageSquare, ChartNoAxesCombined, ShieldCheck, Settings, History, LogOut, Menu, X, ArrowUpRight, Compass, Wallet, ContactRound, CalendarDays, Route, Hotel } from "lucide-react";
import { CustomerActivity } from "./CustomerActivity";
import { AdminProvider, useAdmin } from "./AdminProvider";
import { AdminSessionProvider, useAdminSession } from "./AdminSessionProvider";
import { Breadcrumbs, ConfirmDialog, EmptyState, LoadingState } from "./ui";

const operational = [["dashboard","Dashboard",LayoutDashboard],["bookings","Bookings & quotations",CalendarDays],["routes","Routes & fares",Route],["drivers","Drivers",ContactRound],["vehicles","Vehicles",Car],["payments","Payments",Wallet],["tracking","Trip tracking",MapPin],["notifications","Notifications & email log",Inbox],["settings","Cab settings",Settings]] as const;
const demos = [["enquiries","Enquiries",Inbox],["trips","Travel trips",Route],["itineraries","Itineraries",NotebookPen],["packages","Holiday packages",Palmtree],["destinations","Destinations",MapPin],["hotels","Hotels",Hotel],["flights","Flight enquiries",Plane],["bus","Bus enquiries",Bus],["custom-routes","Custom routes",Navigation],["offers","Offers",Tags],["documents","Documents",Files],["reviews","Reviews",MessageSquare],["reports","Reports",ChartNoAxesCombined],["users","Users & roles",ShieldCheck],["activity","Activity",History]] as const;
const isOperational = (path: string) => path === "/admin" || path.startsWith("/admin/cab-operations") || path.startsWith("/admin/customers");
const demoLabel = (path: string) => demos.find(([key]) => path.startsWith("/admin/"+key))?.[1] || "Demo workspace";

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const path = usePathname(), { role, logout, signingOut } = useAdminSession();
  const [confirm, setConfirm] = useState(false);
  const close = useCallback(() => setConfirm(false), []);
  return <>
    <Link href="/admin" className="a-brand" onClick={onNavigate}><span><Compass size={27}/></span><div><strong>Sukhadh Holidays</strong><small>Travel operations</small></div></Link>
    <div className="a-nav-label">CAB OPERATIONS · DATABASE</div>
    <nav aria-label="Operational navigation" className="a-nav">
      {operational.map(([key,label,Icon]) => <Link key={key} href={key === "dashboard" ? "/admin" : "/admin/cab-operations?view="+key} onClick={onNavigate} aria-current={key==="dashboard" && path==="/admin" ? "page" : undefined}><Icon size={17}/><span>{label}</span></Link>)}
      <Link href="/admin/customers" onClick={onNavigate} className={path.startsWith("/admin/customers")?"active":""} aria-current={path.startsWith("/admin/customers")?"page":undefined}><Users size={17}/><span>Customer accounts</span></Link>
    </nav>
    <div className="a-nav-label">TRAVEL MODULES · DEMO PREVIEWS</div>
    <nav aria-label="Demo module navigation" className="a-nav">{demos.map(([key,label,Icon])=><Link key={key} href={"/admin/"+key} onClick={onNavigate} className={path.startsWith("/admin/"+key)?"active":""} aria-current={path.startsWith("/admin/"+key)?"page":undefined}><Icon size={17}/><span>{label}</span><small className="a-nav-preview">Demo</small></Link>)}</nav>
    <div className="a-profile"><span className="a-avatar"><ShieldCheck size={18}/></span><div><strong>Authenticated admin</strong><small>{role.replaceAll("_"," ")}</small></div><button disabled={signingOut} aria-label="Sign out of admin" onClick={()=>setConfirm(true)}><LogOut size={18}/></button></div>
    {confirm && <ConfirmDialog title="Sign out of admin?" description="This will revoke your current server session across the admin workspace." confirmLabel={signingOut?"Signing out…":"Sign out"} cancelLabel="Stay signed in" busy={signingOut} onClose={close} onConfirm={()=>{void logout().then(ok=>{if(ok)setConfirm(false);});}}/>}
  </>;
}
function LegacyWorkspace({ children }: { children: ReactNode }) {
  return <AdminProvider><LegacyContent>{children}</LegacyContent></AdminProvider>;
}
function LegacyContent({ children }: { children: ReactNode }) {
  const { can, ready } = useAdmin(), path = usePathname();
  if (!ready) return <LoadingState label="Loading demo preview"/>;
  return <><div className="a-demo-banner" role="note"><span className="a-dot"/><div><strong>Demo module · not connected to MySQL.</strong> These are fictional records. Edits remain in this browser and do not change real bookings, payments or staff access. Use cab operations for real cab records.</div></div>{can(path.split("/")[2] || "dashboard") ? children : <EmptyState title="This preview is unavailable for your role" description="Your existing server role remains in effect. Use an authorised operational module."/>}</>;
}
function Workspace({ children }: { children: ReactNode }) {
  const path = usePathname(), [drawer,setDrawer] = useState(false);
  const dialog = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(()=>setDrawer(false),[]);
  useEffect(()=>{
    if(!drawer)return;
    const before=document.activeElement as HTMLElement, overflow=document.body.style.overflow, triggerButton=trigger.current;
    document.body.style.overflow="hidden"; dialog.current?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==="Escape")setDrawer(false);
      if(event.key!=="Tab")return;
      const nodes=dialog.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),[tabindex="0"]');
      if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener("keydown",key);
    const media=window.matchMedia("(min-width:901px)");const desktop=()=>{if(media.matches)setDrawer(false);};media.addEventListener("change",desktop);
    return()=>{document.body.style.overflow=overflow;document.removeEventListener("keydown",key);media.removeEventListener("change",desktop);(before?.isConnected?before:triggerButton)?.focus();};
  },[drawer]);
  const real=isOperational(path);
  return <div className="admin-root a-foundation">
    <aside className="a-desktop-sidebar"><Sidebar onNavigate={close}/></aside>
    {drawer && <div className="a-drawer-backdrop" onClick={close}><div ref={dialog} tabIndex={-1} className="a-mobile-drawer" role="dialog" aria-modal="true" aria-label="Admin navigation" onClick={e=>e.stopPropagation()}><button className="a-drawer-close" onClick={close} aria-label="Close navigation"><X size={22}/></button><Sidebar onNavigate={close}/></div></div>}
    <div className="a-workspace"><header className="a-header"><div className="a-header-left"><button ref={trigger} className="a-menu-toggle" onClick={()=>setDrawer(true)} aria-label="Open admin navigation" aria-expanded={drawer}><Menu size={22}/></button><Breadcrumbs items={["Admin",path==="/admin"?"Overview":path.startsWith("/admin/customers")?"Customer accounts":real?"Cab operations":demoLabel(path)]}/></div><div className="a-header-right"><CustomerActivity/><span className={real?"a-data-source":"a-demo"}>{real?"DATABASE RECORDS":"DEMO PREVIEW"}</span><Link href="/" target="_blank" rel="noopener noreferrer">View website <ArrowUpRight size={14}/></Link></div></header>
      <main id="main-content" className="a-main">{real?children:<LegacyWorkspace>{children}</LegacyWorkspace>}</main>
    </div>
  </div>;
}
export function AdminShell({ children }: { children: ReactNode }) {
  const path=usePathname();
  if(["/admin/login","/admin/forgot-password","/admin/reset-password"].includes(path))return <>{children}</>;
  return <AdminSessionProvider><Workspace>{children}</Workspace></AdminSessionProvider>;
}
