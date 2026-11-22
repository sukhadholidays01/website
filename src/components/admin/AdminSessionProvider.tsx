"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { adminApi } from "@/lib/auth/admin-client";
import { useToast } from "@/components/notifications/ToastProvider";
import { ErrorState, LoadingState } from "./ui";

export type AdminRole = "OWNER" | "DISPATCHER" | "ACCOUNTANT" | "VIEWER";
type Session = { authenticated: boolean; role: AdminRole | null };
type ContextValue = { role: AdminRole; logout: () => Promise<boolean>; signingOut: boolean };
const Context = createContext<ContextValue | null>(null);
const roles: readonly string[] = ["OWNER", "DISPATCHER", "ACCOUNTANT", "VIEWER"];

/** UI consumes the existing server session. It never grants API authorisation. */
export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname(), router = useRouter(), { notify } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0), [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function check() {
      if (pending) return;
      pending = true;
      try {
        const result = await adminApi<Session>("session", { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!result.authenticated || !result.role || !roles.includes(result.role)) {
          setSession(null); router.replace("/admin/login"); router.refresh();
          return;
        }
        setSession(result); setError("");
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "We could not verify your admin session. Please retry.");
      } finally { pending = false; }
    }
    void check();
    const focus = () => { if (!document.hidden) void check(); };
    const timer = window.setInterval(focus, 30000);
    window.addEventListener("focus", focus); window.addEventListener("pageshow", focus);
    document.addEventListener("visibilitychange", focus);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", focus); window.removeEventListener("pageshow", focus); document.removeEventListener("visibilitychange", focus); };
  }, [pathname, attempt, router]);
  const logout = useCallback(async () => {
    if (signingOut) return false;
    setSigningOut(true);
    try {
      await adminApi("logout", { method: "POST" });
      setSession(null);
      notify({ kind: "success", title: "Signed out securely" });
      window.location.replace("/admin/login");
      return true;
    } catch (error) {
      notify({ kind: "error", title: "Sign-out could not be completed", description: error instanceof Error ? error.message + " Your session has not been confirmed as revoked." : "Please retry. Your session has not been confirmed as revoked." });
      return false;
    } finally { setSigningOut(false); }
  }, [notify, signingOut]);
  if (error) return <div className="admin-root a-session-state"><ErrorState description={error} onRetry={() => setAttempt(value => value + 1)}/></div>;
  if (!session?.role) return <div className="admin-root a-session-state"><LoadingState label="Verifying your admin session"/></div>;
  return <Context.Provider value={{ role: session.role, logout, signingOut }}>{children}</Context.Provider>;
}
export function useAdminSession() {
  const value = useContext(Context);
  if (!value) throw Error("The authenticated admin session provider is required.");
  return value;
}
