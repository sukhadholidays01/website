"use client";
import { useState } from "react";
import { cabApi } from "@/lib/cab/client";
import { useToast } from "@/components/notifications/ToastProvider";
export function AdminEmailTest({ onComplete }: { onComplete: () => Promise<void> }) {
  const {notify}=useToast();
  const [email,setEmail]=useState(""),[message,setMessage]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  return <section className="cb-main-card"><h2>Email service check</h2><p>Test connectivity, mailbox authentication and SMTP submission. Inbox delivery must be checked separately.</p>
    {error&&<p className="cb-alert" role="alert">{error}</p>}{message&&<p className="cb-callout" role="status">{message}</p>}
    <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");setMessage("");const id=notify({kind:"loading",title:"Testing email service"});try{const result=await cabApi<{message:string}>("admin/email-test",{method:"POST",body:{email}});setMessage(result.message);notify({id,kind:"success",title:"Test email submitted",description:result.message});}catch(err){const text=err instanceof Error?err.message:"Email test could not be completed.";setError(text);notify({id,kind:"error",title:"Email test failed",description:text});}finally{setBusy(false);await onComplete().catch(()=>{});}}}>
      <label><span>Test recipient email</span><input type="email" required maxLength={190} value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter the intended recipient"/></label><div className="cb-actions"><button className="cb-btn cb-primary" disabled={busy}>{busy?"Testing...":"Send harmless test email"}</button></div>
    </form></section>;
}
