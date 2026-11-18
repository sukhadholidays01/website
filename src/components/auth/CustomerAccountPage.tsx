"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, LoaderCircle, MailCheck } from "lucide-react";
import { useReducedMotionPreference } from "@/lib/useReducedMotionPreference";
import { useToast } from "@/components/notifications/ToastProvider";
import { customerLogin, customerSignup, safeCustomerReturn } from "@/lib/auth/customer-validation";
import { customerRequest, CustomerRequestError } from "@/lib/auth/customer-client";
import "./customer-auth.css";

function useResend() {
  const {notify}=useToast();
  const [cooldown,setCooldown]=useState(0),[sending,setSending]=useState(false);
  useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(value=>Math.max(0,value-1)),1000);return()=>clearTimeout(timer);},[cooldown]);
  async function resend(email:string) {
    if(sending||cooldown)return;
    setSending(true);
    try {const result=await customerRequest<{message:string;cooldown:number}>("resend",{email});setCooldown(result.cooldown);notify({kind:"info",title:"Verification email requested",description:result.message});}
    catch(error){notify({kind:"error",title:"Email request failed",description:error instanceof Error?error.message:"Please try again later."});}
    finally{setSending(false);}
  }
  return {cooldown,setCooldown,sending,resend};
}
function PasswordInput({confirmation=false,signup=false,invalid=false}:{confirmation?:boolean;signup?:boolean;invalid?:boolean}) {
  const [visible,setVisible]=useState(false),id=confirmation?"confirmation":"password";
  return <div className="customer-password"><input id={id} name={id} type={visible?"text":"password"} autoComplete={signup?"new-password":"current-password"} required minLength={signup?16:1} maxLength={128} aria-invalid={invalid} aria-describedby={signup?"password-help":undefined}/><button type="button" onClick={()=>setVisible(!visible)} aria-label={`${visible?"Hide":"Show"} ${confirmation?"confirmation ":""}password`} aria-pressed={visible}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>;
}
function AccountFrame({children,signup=false}:{children:React.ReactNode;signup?:boolean}) {
  const reduced=useReducedMotionPreference();
  return <section className="customer-auth-stage"><div className="customer-auth-accent" aria-hidden="true"><Image src={signup?"/images/domestic/rishikesh.webp":"/images/domestic/goa.webp"} alt="" fill sizes="100vw"/></div><motion.div className="customer-auth-card" initial={reduced?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.3}}>{children}</motion.div></section>;
}
export function CustomerAccountPage({mode}:{mode:"login"|"signup"}) {
  const signup=mode==="signup",router=useRouter(),{notify}=useToast(),resend=useResend();
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[fields,setFields]=useState<Record<string,string>>({}),[email,setEmail]=useState(""),[submitted,setSubmitted]=useState(false),[unverified,setUnverified]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;
    const form=new FormData(event.currentTarget),input=signup?{fullName:form.get("fullName"),email:form.get("email"),password:form.get("password"),confirmation:form.get("confirmation"),consent:form.get("consent")==="on"}:{email:form.get("email"),password:form.get("password")};
    const parsed=(signup?customerSignup:customerLogin).safeParse(input);
    setError("");setFields({});setUnverified(false);
    if(!parsed.success){const issues=Object.fromEntries(parsed.error.issues.map(i=>[String(i.path[0]),i.message]));setFields(issues);setError(parsed.error.issues[0].message);notify({kind:"error",title:"Check your details",description:parsed.error.issues[0].message});return;}
    setBusy(true);setEmail(parsed.data.email);
    try {
      if(signup){const result=await customerRequest<{message:string;cooldown:number}>("register",parsed.data);setSubmitted(true);resend.setCooldown(result.cooldown);notify({kind:"info",title:"Registration request processed",description:result.message});}
      else {const next=safeCustomerReturn(new URLSearchParams(location.search).get("next"));const result=await customerRequest<{redirect:string}>("login?"+new URLSearchParams({next}),parsed.data);notify({kind:"success",title:"Welcome back",description:"You are securely signed in."});router.replace(result.redirect);router.refresh();}
    } catch(error){const message=error instanceof Error?error.message:"A network error occurred. Please try again.";setError(message);setUnverified(error instanceof CustomerRequestError&&error.code==="EMAIL_UNVERIFIED");notify({kind:"error",title:signup?"Registration could not be completed":"Sign-in could not be completed",description:message});}
    finally{setBusy(false);}
  }
  return <AccountFrame signup={signup}>
    <p className="customer-auth-eyebrow">SUKHAD HOLIDAYS</p>
    {submitted?<><MailCheck className="customer-auth-mail" size={32} aria-hidden="true"/><h1>Check your inbox.</h1><p className="customer-auth-copy">If this address is eligible, a verification link has been submitted to <strong>{email}</strong>. Verify your email before signing in. Links expire after 30 minutes; check your spam folder too. Inbox delivery is not confirmed.</p><button className="customer-auth-submit" type="button" disabled={resend.sending||resend.cooldown>0} onClick={()=>void resend.resend(email)}>{resend.cooldown?`Resend available in ${resend.cooldown}s`:resend.sending?"Requesting...":"Resend verification email"}</button><p className="customer-auth-switch"><Link href="/login">Continue to sign in <ArrowRight size={14}/></Link></p></>:<>
      <h1>{signup?"Create your account.":"Welcome back."}</h1><p className="customer-auth-copy">{signup?"A little closer to your next journey.":"Sign in to your Sukhad Holidays account."}</p>
      <form noValidate onSubmit={submit} className="customer-auth-form"><fieldset disabled={busy}>
        {signup&&<div><label htmlFor="fullName">Full name</label><input id="fullName" name="fullName" autoComplete="name" required maxLength={100} aria-invalid={Boolean(fields.fullName)}/>{fields.fullName&&<small className="customer-field-error">{fields.fullName}</small>}</div>}
        <div><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="username" required maxLength={190} aria-invalid={Boolean(fields.email)}/>{fields.email&&<small className="customer-field-error">{fields.email}</small>}</div>
        <div><label htmlFor="password">Password</label><PasswordInput signup={signup} invalid={Boolean(fields.password)}/>{signup&&<small id="password-help">Use 16–128 characters, including uppercase, lowercase and a number.</small>}{fields.password&&<small className="customer-field-error">{fields.password}</small>}</div>
        {signup&&<><div><label htmlFor="confirmation">Confirm password</label><PasswordInput signup confirmation invalid={Boolean(fields.confirmation)}/>{fields.confirmation&&<small className="customer-field-error">{fields.confirmation}</small>}</div><label className="customer-consent"><input type="checkbox" name="consent" required aria-invalid={Boolean(fields.consent)}/><span>I agree to the <Link href="/terms">Terms &amp; Conditions</Link> and <Link href="/privacy-policy">Privacy Policy</Link>.</span></label></>}
        {error&&<p className="customer-auth-error" role="alert">{error}</p>}
        <button className="customer-auth-submit" type="submit">{busy?<><LoaderCircle size={17} className="sh-spin"/>Please wait...</>:<>{signup?"Create account":"Sign in"}<ArrowRight size={16}/></>}</button>
      </fieldset></form>
      {unverified&&<button type="button" className="customer-auth-resend" disabled={resend.sending||resend.cooldown>0} onClick={()=>void resend.resend(email)}>{resend.cooldown?`Resend available in ${resend.cooldown}s`:resend.sending?"Requesting...":"Resend verification email"}</button>}
      <p className="customer-auth-switch">{signup?"Already have an account?":"New to Sukhad Holidays?"} <Link href={signup?"/login":"/signup"}>{signup?"Sign in":"Create an account"}</Link></p>
    </>}
    <div className="customer-auth-guest"><Link href="/">Continue as guest</Link><Link href="/cabs/track">Access a guest cab booking</Link></div>
  </AccountFrame>;
}
export function CustomerSignOut() {
  const [busy,setBusy]=useState(false),router=useRouter(),{notify}=useToast();
  return <button className="customer-auth-submit" disabled={busy} onClick={async()=>{setBusy(true);try{await customerRequest("logout",{});notify({kind:"success",title:"Signed out",description:"Your customer session has been closed."});router.replace("/login");router.refresh();}catch(error){notify({kind:"error",title:"Sign-out failed",description:error instanceof Error?error.message:"Please retry."});}finally{setBusy(false);}}}>{busy?"Signing out...":"Sign out"}</button>;
}
export function CustomerEmailVerification() {
  const [token,setToken]=useState(""),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(""),{notify}=useToast(),resend=useResend();
  useEffect(()=>{const timer=setTimeout(()=>{setToken(new URLSearchParams(location.hash.slice(1)).get("token")||"");history.replaceState(null,"",location.pathname);},0);return()=>clearTimeout(timer);},[]);
  return <AccountFrame><p className="customer-auth-eyebrow">SUKHAD HOLIDAYS</p><h1>{done?"Email verified.":"Verify your email."}</h1><p className="customer-auth-copy">{done?"Your email is confirmed. Sign in to continue your journey.":"Confirm your email to activate customer sign-in. This link is single-use and expires after 30 minutes."}</p>
    {done?<Link href="/login" className="customer-auth-submit">Continue to sign in <ArrowRight size={16}/></Link>:<><button className="customer-auth-submit" disabled={busy||!token} onClick={async()=>{setBusy(true);setError("");try{const result=await customerRequest<{message:string}>("verify",{token});setDone(true);setToken("");notify({kind:"success",title:"Email verified",description:result.message});}catch(error){const message=error instanceof Error?error.message:"Verification failed. Please retry.";setError(message);notify({kind:"error",title:"Email verification failed",description:message});}finally{setBusy(false);}}}>{busy?"Verifying...":"Verify email"}</button>{error&&<p className="customer-auth-error" role="alert">{error}</p>}{!token&&<p className="customer-auth-copy">Open the full link from your email, or request another below.</p>}<form className="customer-auth-form" onSubmit={event=>{event.preventDefault();const email=String(new FormData(event.currentTarget).get("resendEmail")||"");void resend.resend(email);}}><label htmlFor="resendEmail">Need a new verification link?</label><input id="resendEmail" name="resendEmail" type="email" autoComplete="email" required maxLength={190} placeholder="Your email address"/><button type="submit" className="customer-auth-resend" disabled={resend.sending||resend.cooldown>0}>{resend.cooldown?`Resend available in ${resend.cooldown}s`:resend.sending?"Requesting...":"Resend verification email"}</button></form></>}
  </AccountFrame>;
}
