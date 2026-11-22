"use client";
import { adminApi } from "@/lib/auth/admin-client";
import { useToastFeedback } from "@/components/notifications/ToastProvider";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminEmailTest } from "@/components/admin/AdminEmailTest";
import { AdvancePolicySettings } from "./CabCommercial";
import { OperationalBookings } from "./OperationalBookings";
import { OperationsOverview } from "./OperationsOverview";
import { OperationsAutomation } from './OperationsAutomation';
import { GuestPolicySettings } from "./GuestPolicySettings";
import { Car, LogOut, RefreshCw } from "lucide-react";
import { cabApi } from "@/lib/cab/client";
import {
  type CabConfig,
  type PublicCabBooking,
} from "@/lib/cab/types";
import {
  emptyFare,
  type CabOperationsData,
  type ManagedRoute,
} from "@/lib/cab/models";
import {
  CabEntityManager,
  CabNotificationViewer,
  CabSettingsEditor,
  type IntegrationStatus,
} from "./CabManagement";
import { cabPlaces } from "@/data/cabPlaces";
import "./cab-live.css";
import { CabPaymentManagement, CabTrackingManagement } from "./CabOperationsPanels";
export interface OperationsData {
  role?: string;
  audit?: { id: string; role: string; action: string; entityId: string; at: string }[];
  refunds?: { attemptId: string; status: string }[];
  bookings: PublicCabBooking[];
  config: CabConfig;
  storage: string;
  asOf: number;
  operations: CabOperationsData;
  integrations: IntegrationStatus;
}
type Tab = "dashboard" | "payments" | "tracking"
  | "automation"
  | "bookings"
  | "routes"
  | "vehicles"
  | "drivers"
  | "settings"
  | "notifications"
  | "source";
export function CabOperations({ embedded = false, view = "dashboard" }: { embedded?: boolean; view?: string }) {
  const router = useRouter();
  const [session, setSession] = useState<{
    authenticated: boolean;
    configured: boolean;
    storage: string;
  }>();
  const [data, setData] = useState<OperationsData>();
  const [noticeTime, setNoticeTime] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useToastFeedback(error, message);
  const refresh = useCallback(
    async () => setData(await cabApi<OperationsData>(["dashboard","bookings","automation"].includes(tab)?"admin/bootstrap":"admin")),
    [tab],
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      if (["dashboard", "bookings", "payments", "tracking", "routes", "vehicles", "drivers", "settings", "notifications", "source","automation"].includes(view)) setTab(view as Tab);
    }, 0);
    return () => clearTimeout(timer);
  }, [view]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 8000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    const controller = new AbortController();
    void adminApi<{
      authenticated: boolean;
      configured: boolean;
      storage: string;
    }>("session", { signal: controller.signal })
      .then(async (s) => {
        setSession(s);
        if (s.authenticated) await refresh();
        else router.replace("/admin/login");
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [refresh, router]);
  async function perform(operation: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      await refresh();
      setMessage(success);
      setNoticeTime(new Date().toISOString());
      return true;
    } catch (e) {
      setError((e as Error).message);
      window.scrollTo({ top: 0, behavior: "instant" });
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveEntity(kind: string, record: unknown) {
    if (!data) return;
    const result = await perform(
      () =>
        cabApi("admin/manage/" + kind, {
          method: "PUT",
          body: { revision: data.operations.revision, record },
        }),
      kind + " saved to the operations repository.",
    );
    if (!result) throw Error("Save was not completed; review the error above.");
  }
  const bookings = data?.bookings || [];
  async function importDraft(index: number) {
    if (!data) return;
    const source = data.config.manual[index];
    const origin = cabPlaces.find(
        (p) => p.city === source.origin && !p.airport,
      ),
      destination = cabPlaces.find(
        (p) => p.city === source.destination && !p.airport,
      );
    if (!origin || !destination) {
      setError(
        "Resolve the endpoints in route management before importing this source row.",
      );
      return;
    }
    const record: ManagedRoute = {
      id: crypto.randomUUID(),
      name: `${source.origin} to ${source.destination}`,
      origin,
      destination,
      status: "draft",
      tripTypes: ["one-way"],
      categories: ["sedan"],
      distanceKm: null,
      durationMinutes: null,
      returnDistanceKm: null,
      returnDurationMinutes: null,
      distanceSource: "unverified",
      billableKm: null,
      defaultMode: "manual",
      fares: { sedan: emptyFare() },
      notes:
        source.sourceNote +
        " Vehicle/trip are placeholders; no price was inferred.",
      development: true,
    };
    try {
      await saveEntity("routes", record);
      setTab("routes");
    } catch {}
  }
  return (
    <section className={"cab-live cb-operations" + (embedded ? " cb-embedded" : "")} aria-label="Cab operations">
      <div className="cb-container">
        {!embedded && <header className="cb-operations-header">
          <Link href="/admin/cab-operations" className="cb-ops-brand">
            <Car size={25} />
            <span>
              Sukhadh Holidays<small>Cab operations</small>
            </span>
          </Link>
          <div className="cb-actions">
            <Link href="/cabs" className="cb-btn">
              Customer cab website
            </Link>
            {session?.authenticated && (
              <button
                className="cb-btn"
                disabled={busy}
                onClick={async () => {
                  try {
                    await adminApi("logout", { method: "POST" });
                    setSession({ ...session, authenticated: false });
                    setData(undefined);
                    router.replace("/admin/login");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <LogOut size={15} />
                Sign out
              </button>
            )}
          </div>
        </header>}
        {error && (
          <p className="cb-alert" role="alert">
            {error}
          </p>
        )}
        {message && !error && (
          <p className="cb-message" role="status">
            {message} {noticeTime && <time dateTime={noticeTime}>{new Date(noticeTime).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST</time>}
          </p>
        )}
        {!session && !error && (
          <p role="status">Opening protected cab workspace…</p>
        )}
        {session && !session.authenticated && <p role="status">Opening admin sign in...</p>}
        {session?.authenticated && data && (
          <>
            <div className="cb-op-intro">
              <div>
                <p className="cb-eyebrow">CAB OPERATIONS</p>
                <h1>Every journey, connected.</h1>
                <p>Routes, fleet, bookings and verified payment records.</p>
              </div>
              <button
                className="cb-btn"
                disabled={busy}
                onClick={() =>
                  void perform(refresh, "Operations refreshed.")
                }
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>
            <p className="cb-callout">
              <strong>{data.storage === "mysql" ? "Persistent MySQL operations." : "Development workspace."}</strong> Booking and payment states are tracked separately. Availability is validated before assignment. Server role: {data.role || "OWNER"}.
            </p>
            <div className="cb-admin-layout"><nav className="cb-op-tabs" aria-label="Cab operations sections">
              {(
                [
                  ["dashboard", "Dashboard"],
                  ["automation", "Automation"],
                  ["bookings", "Bookings"],
                  ["payments", "Payments"],
                  ["tracking", "Tracking"],
                  ["routes", "Routes & fares"],
                  ["vehicles", "Vehicles"],
                  ["drivers", "Drivers"],
                  ["settings", "Settings"],
                  ["notifications", "Email previews"],
                  ["source", "Source fare sheet"],
                ] as [Tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  className={tab === key ? "active" : ""}
                    onClick={(event) => {
                      event.currentTarget.scrollIntoView({block:'nearest',inline:'nearest'});
                    setTab(key);
                    if (embedded) router.replace("/admin/cab-operations?view=" + key, { scroll: false });
                    setError("");
                    setMessage("");
                  }}
                >
                  {label}
                </button>
              ))}
            </nav><div className="cb-admin-content">
            {tab === "automation" ? <OperationsAutomation role={data.role||"VIEWER"}/> : tab === "dashboard" ? <OperationsOverview/> : tab === "bookings" ? <OperationalBookings operations={data.operations} role={data.role||"VIEWER"}/> : tab === "payments" ? <CabPaymentManagement data={data} refresh={refresh}/> : tab === "tracking" ? <CabTrackingManagement data={data}/> : (["routes", "vehicles", "drivers"] as Tab[]).includes(tab) ? (
              <CabEntityManager
                key={tab}
                kind={tab as "routes" | "vehicles" | "drivers"}
                bookings={bookings}
                operations={data.operations}
                onSave={saveEntity}
                busy={busy}
              />
            ) : tab === "settings" ? (
              <>{data.role === "OWNER" && <><GuestPolicySettings/><AdvancePolicySettings/></>}<CabSettingsEditor
                key={data.operations.revision}
                operations={data.operations}
                integrations={data.integrations}
                onSave={saveEntity}
                busy={busy}
              /></>
            ) : tab === "notifications" ? (
              <><section className="cb-main-card"><h2>System activity</h2>{(data.audit || []).filter(event => event.action.includes("SMTP") || event.action.includes("PASSWORD")).slice(0,20).map(event=><p key={event.id}><strong>{event.action.replaceAll("_"," ")}</strong> ? {new Date(event.at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST</p>)}</section>{data.role === "OWNER" && <AdminEmailTest onComplete={refresh}/>}<CabNotificationViewer operations={data.operations}/></>
            ) : tab === "source" ? (
              <section className="cb-main-card">
                <h2>Original fare-sheet drafts</h2>
                <p className="cb-note">
                  All 51 source rows remain unpublished. Paired amounts are
                  preserved as notes, without guessing vehicle or trip meanings.
                  Import a row to route management to configure coordinates,
                  categories and prices.
                </p>
                <div className="cb-table-wrap">
                  <table className="cb-table">
                    <thead>
                      <tr>
                        <th>Hub</th>
                        <th>Destination</th>
                        <th>Source note</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.config.manual.map((r, i) => (
                        <tr key={r.id}>
                          <td>{r.origin}</td>
                          <td>{r.destination}</td>
                          <td>{r.sourceNote}</td>
                          <td>
                            <button
                              className="cb-btn"
                              disabled={busy}
                              onClick={() => void importDraft(i)}
                            >
                              Create draft route
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div></div></>
        )}
      </div>
    </section>
  );
}
