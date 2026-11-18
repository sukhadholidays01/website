"use client";
import { ArrowRight, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useReducedMotionPreference } from "@/lib/useReducedMotionPreference";
import "./customer-auth.css";

export function LoginModal({isOpen,onDismiss}:{isOpen:boolean;onDismiss:()=>void}) {
  const dialogRef=useRef<HTMLDialogElement>(null),reduced=useReducedMotionPreference();
  useEffect(()=>{
    const dialog=dialogRef.current;if(!dialog||!isOpen)return;
    const overflow=document.body.style.overflow,rootOverflow=document.documentElement.style.overflow,padding=document.body.style.paddingRight;
    const gutter=window.innerWidth-document.documentElement.clientWidth;
    if(gutter>0)document.body.style.paddingRight=String(parseFloat(getComputedStyle(document.body).paddingRight)+gutter)+'px';
    document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';if(!dialog.open)dialog.showModal();
    return ()=>{if(dialog.open)dialog.close();document.body.style.overflow=overflow;document.documentElement.style.overflow=rootOverflow;document.body.style.paddingRight=padding;};
  },[isOpen]);
  return <dialog ref={dialogRef} aria-labelledby="login-modal-title" aria-describedby="login-modal-description" onCancel={event=>{event.preventDefault();onDismiss();}} onClick={event=>{if(event.target===dialogRef.current)onDismiss();}} className="travel-welcome customer-invitation">
    {isOpen&&<motion.div className="travel-welcome-scene" initial={reduced?false:{opacity:0,y:12,scale:.98}} animate={{opacity:1,y:0,scale:1}} transition={{duration:reduced?0:.25}}>
      <div className="travel-welcome-photo" aria-hidden="true"><Image src="/images/domestic/kerala.jpg" alt="" fill sizes="460px" className="object-cover"/></div>
      <motion.div className="customer-invitation-wash" aria-hidden="true" initial={reduced?false:{opacity:.2}} animate={{opacity:.7}} transition={{duration:reduced?0:2}}/>
      <button type="button" onClick={onDismiss} aria-label="Close welcome dialog" className="travel-welcome-close"><X size={18}/></button>
      <div className="travel-welcome-copy"><p className="customer-auth-eyebrow">SUKHAD HOLIDAYS</p><h2 id="login-modal-title">Your next journey starts here.</h2><p id="login-modal-description">Create an account or sign in. You can always keep exploring as a guest.</p>
      <div className="travel-welcome-actions"><Link href="/signup" onClick={onDismiss} className="travel-welcome-primary">Create account <ArrowRight size={16}/></Link><Link href="/login" onClick={onDismiss} className="travel-welcome-secondary">Sign in</Link></div>
      <button type="button" onClick={onDismiss} className="travel-welcome-guest">Continue as guest</button></div>
    </motion.div>}
  </dialog>;
}
