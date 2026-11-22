"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {CheckCircle2,LoaderCircle} from "lucide-react";
import {passwordResetApi} from "@/lib/auth/password-reset-client";
import {useToast} from "@/components/notifications/ToastProvider";
import {AuthFrame,PasswordField} from "./AuthFrame";
export function ResetPassword(){
 const router=useRouter(),{notify}=useToast();
 const [token,setToken]=useState(""),[status,setStatus]=useState<"loading"|"valid"|"invalid"|"expired"|"success">("loading");
 const [password,setPassword]=useState(""),[confirmation,setConfirmation]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const [fields,setFields]=useState<Record<string,string>>({});
 useEffect(()=>{const abort=new AbortController();const timer=setTimeout(()=>{const value=new URLSearchParams(window.location.hash.slice(1)).get("token")||"";window.history.replaceState(null,"",window.location.pathname);if(!/^[a-f0-9]{64}$/.test(value)){setStatus("invalid");return;}setToken(value);void passwordResetApi<{valid:boolean;reason?:string}>("validate",{token:value},abort.signal).then(result=>{if(abort.signal.aborted)return;if(result.valid)setStatus("valid");else{setStatus(result.reason==="expired"?"expired":"invalid");notify({kind:"warning",title:result.reason==="expired"?"Reset link expired":"Reset link is invalid",description:"Request a new link to reset your password."});}}).catch(error=>{if(!abort.signal.aborted){setStatus("invalid");setError(error instanceof Error?error.message:"Unable to validate this link. Please request a new one.");}});},0);return()=>{clearTimeout(timer);abort.abort();};},[notify]);
 useEffect(()=>{if(status!=="success")return;const timer=setTimeout(()=>router.replace("/admin/login"),2500);return()=>clearTimeout(timer);},[status,router]);
 const guidance=password.length>=24?"Strong length. Use a unique password you do not use elsewhere.":password.length>=16?"Minimum length met. A longer passphrase is even better.":"Use at least 16 characters, such as a memorable unique passphrase.";
 return <AuthFrame title={status==="success"?"Password updated":"Choose a new password"} description="Set a unique password to keep your admin account secure.">
 {status==="loading"?<p role="status"><LoaderCircle className="sh-spin" size={20}/> Checking your reset link...</p>:status==="success"?<div className="sh-auth-success" role="status"><CheckCircle2 size={34}/><p>Your password is updated. Previous sessions have been signed out. Returning to sign in...</p></div>:status!=="valid"?<p role="alert" className="sh-auth-notice sh-auth-error">{status==="expired"?"This reset link has expired.":"This reset link is invalid, already used or no longer available."} Request a new link to continue.</p>:<>
 {error&&<p role="alert" className="sh-auth-notice sh-auth-error">{error}</p>}
 <form noValidate onSubmit={async e=>{e.preventDefault();setError("");const next:Record<string,string>={};if(password.length<16||password.length>1024)next.password="Use between 16 and 1024 characters.";if(password!==confirmation)next.confirmation="Passwords do not match.";setFields(next);if(Object.keys(next).length)return;setBusy(true);const id=notify({kind:"loading",title:"Updating your password"});try{await passwordResetApi("confirm",{token,password,confirmation});setToken("");setPassword("");setConfirmation("");setStatus("success");notify({id,kind:"success",title:"Password updated",description:"Sign in with your new password. Previous sessions have been revoked."});}catch(err){const text=err instanceof Error?err.message:"Unable to update your password.";setError(text);notify({id,kind:"error",title:"Password was not updated",description:text});}finally{setBusy(false);}}}>
 <PasswordField id="reset-password" label="New password" value={password} onChange={setPassword} newPassword error={fields.password}/>
 <div className="sh-auth-requirements"><div className="sh-auth-strength" aria-hidden="true"><span style={{width:Math.min(100,password.length/24*100)+"%"}}/></div>{guidance}</div>
 <PasswordField id="reset-confirmation" label="Confirm new password" value={confirmation} onChange={setConfirmation} newPassword error={fields.confirmation}/>
 <button className="sh-auth-submit" disabled={busy}>{busy&&<LoaderCircle size={18} className="sh-spin"/>}{busy?"Updating password...":"Update password"}</button></form></>}
 <Link className="sh-auth-link" href={status==="invalid"||status==="expired"?"/admin/forgot-password":"/admin/login"}>{status==="invalid"||status==="expired"?"Request a new reset link":"Back to sign in"}</Link>
 </AuthFrame>;
}
