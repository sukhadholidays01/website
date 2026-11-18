"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cabApi } from "@/lib/cab/client";
import { useToastFeedback } from "@/components/notifications/ToastProvider";
export function GuestBookingAccess({id,children}:{id:string;children?:(access:{assurance:"link"|"otp";privateLink:string})=>ReactNode}) {
  const router=useRouter();
  const linkToken=useRef("");
  const [attempt,setAttempt]=useState(0);
  const [assurance,setAssurance]=useState<"link"|"otp"|null>(null),[privateLink,setPrivateLink]=useState("");
  const [reference,setReference]=useState(id),[phone,setPhone]=useState(""),[code,setCode]=useState(""),[challenge,setChallenge]=useState("");
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(Boolean(id)),[error,setError]=useState(""),[message,setMessage]=useState("");
  useToastFeedback(error,message,"info");
  useEffect(()=>{
    if(!id)return;
    const abort=new AbortController();
    async function open(){try{
      const token=linkToken.current||new URLSearchParams(location.hash.slice(1)).get("access");
      if(token){linkToken.current=token;setPrivateLink(location.origin+location.pathname+"#access="+token);await cabApi("guest/link/exchange",{method:"POST",body:{reference:id,token},signal:abort.signal});if(!abort.signal.aborted)history.replaceState(null,"",location.pathname);}
      const access=await cabApi<{assurance:"link"|"otp"}>("guest/bookings/"+encodeURIComponent(id),{signal:abort.signal});if(!abort.signal.aborted)setAssurance(access.assurance);
    }catch{if(!abort.signal.aborted)setError("Open your private link or verify the registered mobile to access this booking.");}finally{if(!abort.signal.aborted)setLoading(false);}}
    void open();return()=>abort.abort();
  },[id,attempt]);
  return <>
    <section className="cab-live cb-guest-access"><div className="cb-container"><div className="cb-main-card">
      <h2>{assurance==="otp"?"Mobile verified":assurance==="link"?"Private tracking access":"Access your cab booking"}</h2>
      <p className="cb-note">No account required. Private links show journey updates. Mobile verification protects documents, quotation actions and payment details.</p>
      {loading&&<p role="status">Checking private booking access…</p>}
      {error&&<p className="cb-alert" role="alert">{error}</p>}{message&&<p className="cb-message" role="status">{message}</p>}
      {error&&privateLink&&<button className="cb-btn" disabled={busy||loading} onClick={()=>{setError("");setLoading(true);setAttempt(value=>value+1);}}>Retry private link access</button>}
      {assurance!=="otp"&&<form className="cb-guest-form" onSubmit={async event=>{event.preventDefault();setBusy(true);setError("");setMessage("");try{
        if(!challenge){const result=await cabApi<{challengeId:string;message:string}>("guest/otp/request",{method:"POST",body:{reference,phone}});setChallenge(result.challengeId);setMessage(result.message);}
        else{const result=await cabApi<{bookingId:string}>("guest/otp/verify",{method:"POST",body:{challengeId:challenge,code}});setCode("");if(result.bookingId!==id)router.push("/cabs/booking/"+encodeURIComponent(result.bookingId));else{setAssurance("otp");setError("");setMessage("Mobile verified for this booking.");}}
      }catch(e){setError(e instanceof Error?e.message:"Verification could not be completed.");}finally{setBusy(false);}}}>
        <label>Booking reference<input required maxLength={80} value={reference} readOnly={Boolean(id)} onChange={e=>setReference(e.target.value)}/></label>
        <label>Registered mobile, with country code<input type="tel" autoComplete="tel" required placeholder="+91…" maxLength={22} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
        {challenge&&<label>Verification code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value)}/></label>}
        <div className="cb-actions"><button className="cb-btn cb-primary" disabled={busy||loading}>{busy?"Please wait…":challenge?"Verify mobile":"Request code"}</button>{challenge&&<button type="button" className="cb-btn" disabled={busy} onClick={()=>{setChallenge("");setCode("");setMessage("Request another code after the resend cooldown.");}}>Request another code</button>}</div>
      </form>}
      {assurance==="otp"&&<div className="cb-actions"><button className="cb-btn" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{const result=await cabApi<{message:string}>("guest/bookings/"+encodeURIComponent(id)+"/request-link",{method:"POST",body:{}});setMessage(result.message);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Request replacement link by email</button><button className="cb-btn" disabled={busy} onClick={async()=>{setBusy(true);try{await cabApi("guest/logout",{method:"POST",body:{}});setAssurance(null);setPrivateLink("");setMessage("Booking session closed.");}catch{setError("Sign-out was not confirmed. Please retry.");}finally{setBusy(false);}}}>Close booking session</button></div>}
      <p className="cb-note"><Link href="/contact">Contact support</Link> if you cannot access your registered mobile. Codes are never displayed on this website.</p>
    </div></div></section>
    {assurance&&children?.({assurance,privateLink})}
  </>;
}
