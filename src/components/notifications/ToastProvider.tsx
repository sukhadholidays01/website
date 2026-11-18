"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, LoaderCircle, X } from "lucide-react";
import "./toasts.css";
type Kind = "success" | "error" | "warning" | "info" | "loading";
type Notice = { id?: string; title: string; description?: string; kind?: Kind; duration?: number };
export const notificationConfig = { maxQueued: 4, maxVisible: 3, duration: 6000, errorDuration: 9000 };
type Toast = Notice & { id: string; kind: Kind };
const Context = createContext<{ notify: (notice: Notice) => string; dismiss: (id: string) => void } | null>(null);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Toast[]>([]);
  const dismiss = useCallback((id: string) => setQueue(items => items.filter(item => item.id !== id)), []);
  const notify = useCallback((notice: Notice) => {
    const id = notice.id || crypto.randomUUID(), kind = notice.kind || "info";
    setQueue(items => {
      if (items.some(item => item.id === id)) {
        if(items.some(item=>item.id!==id&&item.title===notice.title&&item.description===notice.description&&item.kind===kind))return items.filter(item=>item.id!==id);
        return items.map(item => item.id === id ? { ...notice, id, kind } : item);
      }
      if (items.some(item => item.title === notice.title && item.description === notice.description && item.kind === kind)) return items;
      return [...items, { ...notice, id, kind }].slice(-notificationConfig.maxQueued);
    });
    return id;
  }, []);
  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);
  return <Context.Provider value={value}>{children}<div className="sh-toast-region" aria-label="Notifications">
    {queue.slice(0,notificationConfig.maxVisible).map(item=><ToastItem key={item.id} item={item} dismiss={dismiss}/>)}
  </div></Context.Provider>;
}
function ToastItem({item,dismiss}:{item:Toast;dismiss:(id:string)=>void}) {
  useEffect(()=>{if(item.kind==='loading')return;const duration=Number.isFinite(item.duration)?Math.max(1000,Math.min(30000,item.duration!)):(item.kind==='error'?notificationConfig.errorDuration:notificationConfig.duration);const timer=setTimeout(()=>dismiss(item.id),duration);return()=>clearTimeout(timer);},[item,dismiss]);
  const Icon=item.kind==='loading'?LoaderCircle:item.kind==='success'?CheckCircle2:item.kind==='info'?Info:AlertCircle;
  return <div className={'sh-toast sh-toast-'+item.kind} role={item.kind==='error'?'alert':'status'} aria-atomic="true"><Icon size={17} className={item.kind==='loading'?'sh-spin':''}/><div><strong>{item.title}</strong>{item.description&&<p>{item.description}</p>}</div><button type="button" aria-label="Dismiss notification" onClick={()=>dismiss(item.id)}><X size={15}/></button></div>;
}

export function useToast() { const value = useContext(Context); if (!value) throw new Error("ToastProvider is required."); return value; }
export function useToastFeedback(error: string, message = "", kind: Kind = "success") {
  const { notify } = useToast();
  useEffect(() => { if (error) notify({ kind: "error", title: "Please check your request", description: error }); }, [error, notify]);
  useEffect(() => { if (message) notify({ kind, title: kind === "success" ? "Update saved" : "Booking update", description: message }); }, [message, kind, notify]);
}
