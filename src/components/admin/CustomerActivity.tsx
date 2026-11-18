"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { customerRequest } from "@/lib/auth/customer-client";
import { useToast } from "@/components/notifications/ToastProvider";
type Activity={unread:number;notifications:{id:string;title:string;createdAt:string;read:boolean;href:string}[]};
export function CustomerActivity() {
  const [data,setData]=useState<Activity>({unread:0,notifications:[]}),[error,setError]=useState(false),router=useRouter(),{notify}=useToast();
  const refresh=useCallback(async(signal?:AbortSignal)=>{try{const result=await customerRequest<Activity>("admin/notifications",undefined,signal);if(!signal?.aborted){setData(result);setError(false);}}catch{if(!signal?.aborted)setError(true);}},[]);
  useEffect(()=>{const controller=new AbortController();const initial=setTimeout(()=>void refresh(controller.signal),0);const update=()=>{if(!document.hidden)void refresh(controller.signal);};const timer=setInterval(update,30000);window.addEventListener("focus",update);return()=>{controller.abort();clearTimeout(initial);clearInterval(timer);window.removeEventListener("focus",update);};},[refresh]);
  return <details className="customer-activity"><summary aria-label={`Customer activity, ${data.unread} unread`}><Bell size={18}/>{data.unread>0&&<span aria-live="polite">{data.unread>99?"99+":data.unread}</span>}</summary><div className="customer-activity-panel"><div className="customer-activity-title"><strong>Customer activity</strong><button type="button" onClick={()=>void refresh()}>Refresh</button></div>{error?<p role="status">Activity could not be loaded. Please retry.</p>:data.notifications.length?<ul>{data.notifications.map(item=><li key={item.id} className={item.read?"":"is-unread"}><Link href={item.href} onClick={async event=>{event.preventDefault();try{await customerRequest("admin/notifications",{id:item.id});await refresh();}catch{notify({kind:"error",title:"Activity could not be marked read",description:"Please try again."});}router.push(item.href);}}><strong>{item.title}</strong><time dateTime={item.createdAt}>{new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(item.createdAt))} IST</time></Link></li>)}</ul>:<p>No customer activity yet.</p>}</div></details>;
}
