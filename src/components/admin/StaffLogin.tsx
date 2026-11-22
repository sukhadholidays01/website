"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LoaderCircle, CheckCircle2 } from "lucide-react";
import { cabApi } from "@/lib/cab/client";
import { adminApi } from "@/lib/auth/admin-client";
import { useToast } from "@/components/notifications/ToastProvider";
import { AuthFrame, PasswordField } from "./AuthFrame";
export function StaffLogin({ recovery = false }: { recovery?: boolean }) {
  const router = useRouter(), { notify } = useToast();
  const [email,setEmail]=useState(""),[password,setPassword]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [fields,setFields]=useState<Record<string,string>>({});
  useEffect(()=>{const controller=new AbortController();if(!recovery)void adminApi<{authenticated:boolean}>("session",{signal:controller.signal}).then(s=>{if(s.authenticated)router.replace("/admin/cab-operations");}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Unable to check your admin session.");});return ()=>controller.abort();},[router,recovery]);
  return <AuthFrame title={recovery ? "Forgot your password?" : "Welcome back"} description={recovery ? "Enter your admin email. If your account is eligible, we will submit a secure reset link to that same address." : "Sign in to manage your travel operations."}>
    {error && <p role="alert" className="sh-auth-notice sh-auth-error">{error}</p>}
    {message ? <div className="sh-auth-success" role="status"><CheckCircle2 size={32}/><p className="sh-auth-notice">{message}</p></div> : <form noValidate onSubmit={async e=>{
      e.preventDefault();setError("");const next:Record<string,string>={};if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))next.email="Enter a valid email address.";if(!recovery&&!password)next.password="Enter your password.";setFields(next);if(Object.keys(next).length)return;
      setBusy(true);const id=notify({kind:"loading",title:recovery ? "Submitting reset request" : "Signing in"});
      try{if(recovery){const result=await cabApi<{message:string}>("password-reset/request",{method:"POST",body:{email}});setMessage(result.message);notify({id,kind:"info",title:"Reset request received",description:result.message});}
      else{await adminApi("login",{method:"POST",body:{email,password}});setPassword("");notify({id,kind:"success",title:"Signed in successfully"});router.replace("/admin/cab-operations");}}
      catch(err){const text=err instanceof Error?err.message:"Unable to complete your request. Please try again.";setError(text);notify({id,kind:"error",title:recovery?"Reset request could not be completed":"Unable to sign in",description:text});}finally{setBusy(false);}
    }}>
      <div className="sh-auth-field"><label htmlFor="admin-email">Email address</label><input id="admin-email" type="email" autoComplete="username" maxLength={190} required value={email} onChange={e=>setEmail(e.target.value)} aria-invalid={!!fields.email} aria-describedby={fields.email?"admin-email-error":undefined}/>{fields.email&&<p id="admin-email-error" className="sh-auth-field-error">{fields.email}</p>}</div>
      {!recovery&&<PasswordField id="admin-password" label="Password" value={password} onChange={setPassword} error={fields.password}/>}
      <button className="sh-auth-submit" disabled={busy}>{busy?<LoaderCircle size={18} className="sh-spin"/>:<ArrowRight size={18}/>} {busy?"Please wait...":recovery?"Request reset link":"Sign in"}</button>
    </form>}
    <Link className="sh-auth-link" href={recovery?"/admin/login":"/admin/forgot-password"}>{recovery?"Back to sign in":"Forgot password?"}</Link>
  </AuthFrame>;
}
