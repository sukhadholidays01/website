"use client";
import { useState } from "react";
import { cabApi } from "@/lib/cab/client";
import { cabMoney, cabVehicles, type PublicCabBooking } from "@/lib/cab/types";
export function QuotationEditor({booking,run,busy}:{booking:PublicCabBooking;run:(input:unknown)=>Promise<void>;busy:boolean}){
  const [requestKey]=useState(()=>crypto.randomUUID());
  const [defaultExpiry]=useState(()=>new Date(Date.now()+86400000+330*60000).toISOString().slice(0,16));
  const [lines,setLines]=useState(booking.fare.lines.length?booking.fare.lines:[{label:'Journey quotation',amount:booking.fare.total||0}]);
  const [preview,setPreview]=useState<{amount:number;lines:typeof lines}>(),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  return <form onSubmit={async event=>{event.preventDefault();setError('');setLoading(true);const form=event.currentTarget;try{const p=await cabApi<{amount:number;lines:typeof lines}>('admin/quotation-preview',{method:'POST',body:{lines}});const f=new FormData(form);if(!preview||JSON.stringify(preview.lines)!==JSON.stringify(lines)){setPreview(p);return;}await run({action:'quote',requestKey,expectedVersion:booking.fare.version,amount:p.amount,lines:p.lines,vehicle:f.get('vehicle'),reason:f.get('reason'),notes:f.get('notes'),inclusions:f.get('inclusions'),exclusions:f.get('exclusions'),expiresAt:new Date(String(f.get('expiry'))+'+05:30').toISOString()});setPreview(undefined);}catch(e){setError((e as Error).message);}finally{setLoading(false);}}}>
    <p className="cb-note">Review the server fare above and the itinerary. Enter approved charges and negative discounts below. This is an operations quotation, not a replacement fare engine. A revised quote requires fresh customer acceptance.</p>
    {error&&<p role="alert" className="cb-alert">{error}</p>}
    <label>Quoted category<select name="vehicle" defaultValue={booking.journey.vehicle}>{cabVehicles.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
    {lines.map((line,i)=><div className="cb-fields" key={i}><label>Charge description<input required maxLength={100} value={line.label} onChange={e=>{setLines(lines.map((r,n)=>n===i?{...r,label:e.target.value}:r));setPreview(undefined);}}/></label><label>Amount · INR<input required type="number" step="0.01" min="-10000000" max="10000000" value={line.amount} onChange={e=>{setLines(lines.map((r,n)=>n===i?{...r,amount:Number(e.target.value)}:r));setPreview(undefined);}}/></label><button type="button" className="cb-btn" disabled={lines.length===1} onClick={()=>{setLines(lines.filter((_,n)=>n!==i));setPreview(undefined);}}>Remove charge</button></div>)}
    <button type="button" className="cb-btn" disabled={lines.length>=20} onClick={()=>{setLines([...lines,{label:'',amount:0}]);setPreview(undefined);}}>Add charge or discount</button>
    <div className="cb-fields"><label>Inclusions<textarea name="inclusions" required minLength={3} maxLength={500} defaultValue={booking.fare.inclusions}/></label><label>Exclusions<textarea name="exclusions" required minLength={3} maxLength={500} defaultValue={booking.fare.exclusions}/></label><label>Reason<textarea name="reason" required minLength={5} maxLength={500} defaultValue={booking.status==='REQUESTED'?'Initial quotation':''}/></label><label>Customer-facing quotation notes<textarea name="notes" maxLength={1500}/></label><label>Valid until · IST<input name="expiry" type="datetime-local" required defaultValue={defaultExpiry}/></label></div>
    {preview&&<p className="cb-callout">Server quotation preview: <strong>{cabMoney(preview.amount)}</strong>. Review the final fields before sending.</p>}
    <button className="cb-btn cb-primary" disabled={busy||loading}>{loading?'Please wait…':preview?'Send reviewed quotation':'Preview quotation'}</button>
  </form>;
}
