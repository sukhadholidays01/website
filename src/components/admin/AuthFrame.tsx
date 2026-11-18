"use client";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, ShieldCheck, ArrowLeft, KeyRound, Route } from "lucide-react";
import { useState, type ReactNode } from "react";
import "./auth.css";
export function AuthFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main id="main-content" className="sh-auth"><header className="sh-auth-brand"><Link href="/" aria-label="Sukhadh Holidays home"><Image src="/brand/logo.png" alt="Sukhadh Holidays" width={180} height={62} priority /></Link><span>Travel operations</span></header>
    <div className="sh-auth-layout"><aside className="sh-auth-story"><span className="sh-auth-eyebrow">THE PEOPLE BEHIND EVERY JOURNEY</span><h2>A thoughtful journey.<br /><em>A trusted team.</em></h2><p>One workspace to keep your journeys, bookings and cab operations moving.</p><ul><li><ShieldCheck size={21} /> Authorised staff access</li><li><Route size={21} /> Connected travel operations</li><li><KeyRound size={21} /> Secure account recovery</li></ul></aside>
      <section className="sh-auth-card" aria-labelledby="auth-heading"><span className="sh-auth-icon"><ShieldCheck size={25} /></span><p className="sh-auth-eyebrow">SUKHADH HOLIDAYS ADMIN</p><h1 id="auth-heading">{title}</h1><p className="sh-auth-description">{description}</p>{children}</section>
    </div><footer><Link href="/"><ArrowLeft size={15} /> Back to website</Link><span>Sukhadh Holidays · Travel Operations</span></footer></main>;
}
export function PasswordField({ id, label, value, onChange, newPassword = false, error }: { id: string; label: string; value: string; onChange: (value: string) => void; newPassword?: boolean; error?: string }) {
  const [visible, setVisible] = useState(false);
  return <div className="sh-auth-field"><label htmlFor={id}>{label}</label><div className="sh-password"><input id={id} type={visible ? "text" : "password"} autoComplete={newPassword ? "new-password" : "current-password"} maxLength={1024} required value={value} onChange={e=>onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} /><button type="button" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div>{error && <p id={`${id}-error`} className="sh-auth-field-error">{error}</p>}</div>;
}
