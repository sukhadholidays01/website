"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Car, LogOut, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { cabApi } from "@/lib/cab/client";
import {
  cabBalance,
  cabMoney,
  tripLabels,
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
import { BookingOperations } from "./CabOperations";
import { cabPlaces } from "@/data/cabPlaces";
import "./cab-live.css";
interface OperationsData {
  bookings: PublicCabBooking[];
  config: CabConfig;
  storage: string;
  asOf: number;
  operations: CabOperationsData;
  integrations: IntegrationStatus;
}
type Tab =
  | "bookings"
  | "routes"
  | "vehicles"
  | "drivers"
  | "settings"
  | "notifications"
  | "source";
function paymentStatus(b: PublicCabBooking, data: OperationsData) {
  const balance = cabBalance(b);
  if (balance.due === 0 && balance.paid > 0) return "PAID";
  if (balance.paid > 0) return "PARTIAL";
  const attempt = data.operations.paymentAttempts.find(
    (p) => p.bookingId === b.id,
  );
  return attempt?.status || "UNPAID";
}
export function CabOperations() {
  const [session, setSession] = useState<{
    authenticated: boolean;
    configured: boolean;
    storage: string;
  }>();
  const [data, setData] = useState<OperationsData>();
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("bookings");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("ALL"),
    [trip, setTrip] = useState("ALL"),
    [date, setDate] = useState(""),
    [route, setRoute] = useState("ALL"),
    [payment, setPayment] = useState("ALL"),
    [selected, setSelected] = useState("");
  const refresh = useCallback(
    async () => setData(await cabApi<OperationsData>("admin")),
    [],
  );
  useEffect(() => {
    const controller = new AbortController();
    void cabApi<{
      authenticated: boolean;
      configured: boolean;
      storage: string;
    }>("session", { signal: controller.signal })
      .then(async (s) => {
        setSession(s);
        if (s.authenticated) await refresh();
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [refresh]);
  async function perform(operation: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      await refresh();
      setMessage(success);
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
      "Development " +
        kind +
        " updated. These records reset when the server restarts.",
    );
    if (!result) throw Error("Save was not completed; review the error above.");
  }
  async function login() {
    setBusy(true);
    setError("");
    try {
      await cabApi("session", { method: "POST", body: { password } });
      setPassword("");
      setSession((s) => ({ ...s!, authenticated: true }));
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const bookings = data?.bookings || [];
  const chosen = bookings.find((b) => b.id === selected);
  const shown = bookings.filter(
    (b) =>
      (status === "ALL" || b.status === status) &&
      (trip === "ALL" || b.journey.tripType === trip) &&
      (!date || b.journey.departure.slice(0, 10) === date) &&
      (route === "ALL" || b.journey.routeId === route) &&
      (payment === "ALL" || (data && paymentStatus(b, data) === payment)) &&
      `${b.id} ${b.customer.name} ${b.customer.phone} ${b.journey.origin.label} ${b.journey.destination.label}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
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
    <main id="main-content" className="cab-live cb-operations">
      <div className="cb-container">
        <header className="cb-operations-header">
          <Link href="/admin" className="cb-ops-brand">
            <Car size={25} />
            <span>
              Sukhadh Holidays<small>Cab operations · development</small>
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
                    await cabApi("session", { method: "DELETE" });
                    setSession({ ...session, authenticated: false });
                    setData(undefined);
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
        </header>
        {error && (
          <p className="cb-alert" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="cb-message" role="status">
            {message}
          </p>
        )}
        {!session && !error && (
          <p role="status">Opening protected cab workspace…</p>
        )}
        {session && !session.authenticated && (
          <section className="cb-main-card cb-ops-login">
            <ShieldCheck size={32} />
            <p className="cb-eyebrow">RESTRICTED CAB OPERATIONS</p>
            <h1>Manage every mile.</h1>
            <p>
              Server-authenticated workspace. The older browser-demo role
              selector does not grant access.
            </p>
            {!session.configured && (
              <p className="cb-callout">
                Configure a unique CAB_ADMIN_PASSWORD (16+ characters) and
                CAB_SESSION_SECRET (32+ characters), or run node
                scripts/setup-cab-local.mjs. No default password is provided.
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void login();
              }}
            >
              <label>
                <span>Operations password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button
                className="cb-btn cb-primary"
                disabled={busy || !session.configured}
              >
                {busy ? "Signing in…" : "Sign in securely"}
              </button>
            </form>
          </section>
        )}
        {session?.authenticated && data && (
          <>
            <div className="cb-op-intro">
              <div>
                <p className="cb-eyebrow">CAB OPERATIONS</p>
                <h1>Every journey, connected.</h1>
                <p>Routes, fleet, drivers, bookings and payment simulations.</p>
              </div>
              <button
                className="cb-btn"
                disabled={busy}
                onClick={() =>
                  void perform(refresh, "Development workspace refreshed.")
                }
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>
            <p className="cb-callout">
              <strong>Temporary development data.</strong> This in-memory
              repository resets on server restart. Vehicle fixtures are not real
              inventory; email is preview-only unless explicitly enabled; mock
              payments move no money.
            </p>
            <div className="cb-metrics">
              {[
                ["Total bookings", bookings.length],
                [
                  "Upcoming",
                  bookings.filter(
                    (b) =>
                      new Date(b.journey.departure + ":00+05:30").getTime() >
                        data.asOf &&
                      !["CANCELLED", "COMPLETED"].includes(b.status),
                  ).length,
                ],
                [
                  "Pending requests",
                  bookings.filter((b) =>
                    ["REQUESTED", "QUOTED", "ACCEPTED"].includes(b.status),
                  ).length,
                ],
                [
                  "Confirmed / assigned",
                  bookings.filter((b) =>
                    ["CONFIRMED", "ASSIGNED"].includes(b.status),
                  ).length,
                ],
                [
                  "Cancelled",
                  bookings.filter((b) => b.status === "CANCELLED").length,
                ],
                [
                  "Paid / simulated paid",
                  bookings.filter((b) => paymentStatus(b, data) === "PAID")
                    .length,
                ],
                [
                  "Active routes",
                  data.operations.routes.filter((r) => r.status === "active")
                    .length,
                ],
                ["Registered vehicles", data.operations.vehicles.length],
                [
                  "Approved drivers on duty",
                  data.operations.drivers.filter(
                    (d) =>
                      d.active && d.approved && d.availability === "available",
                  ).length,
                ],
                [
                  "Outstanding estimate",
                  cabMoney(
                    bookings
                      .filter((b) => b.status !== "CANCELLED")
                      .reduce((sum, b) => sum + (cabBalance(b).due || 0), 0),
                  ),
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <p className="cb-note">
              On-duty drivers still require schedule checks. Payment state is
              independent of booking state.
            </p>
            <nav className="cb-op-tabs" aria-label="Cab operations sections">
              {(
                [
                  ["bookings", "Bookings"],
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
                    setError("");
                    setMessage("");
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
            {(["routes", "vehicles", "drivers"] as Tab[]).includes(tab) ? (
              <CabEntityManager
                key={tab}
                kind={tab as "routes" | "vehicles" | "drivers"}
                operations={data.operations}
                onSave={saveEntity}
                busy={busy}
              />
            ) : tab === "settings" ? (
              <CabSettingsEditor
                key={data.operations.revision}
                operations={data.operations}
                integrations={data.integrations}
                onSave={saveEntity}
                busy={busy}
              />
            ) : tab === "notifications" ? (
              <CabNotificationViewer operations={data.operations} />
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
            ) : (
              <>
                <section className="cb-main-card cb-filter-panel">
                  <label className="cb-search">
                    <Search size={16} />
                    <input
                      aria-label="Search bookings"
                      placeholder="Reference, customer, phone or city"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <div className="cb-filter-grid">
                    <label>
                      <span>Booking status</span>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        {[
                          "ALL",
                          "REQUESTED",
                          "QUOTED",
                          "ACCEPTED",
                          "CONFIRMED",
                          "ASSIGNED",
                          "IN_PROGRESS",
                          "COMPLETED",
                          "CANCELLED",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Trip type</span>
                      <select
                        value={trip}
                        onChange={(e) => setTrip(e.target.value)}
                      >
                        <option value="ALL">All trips</option>
                        {Object.entries(tripLabels).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Travel date · IST</span>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Configured route</span>
                      <select
                        value={route}
                        onChange={(e) => setRoute(e.target.value)}
                      >
                        <option value="ALL">
                          All routes / custom requests
                        </option>
                        {data.operations.routes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Payment state</span>
                      <select
                        value={payment}
                        onChange={(e) => setPayment(e.target.value)}
                      >
                        {[
                          "ALL",
                          "UNPAID",
                          "PENDING",
                          "PARTIAL",
                          "PAID",
                          "FAILED",
                          "REFUNDED",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>
                <div className="cb-operations-grid">
                  <section className="cb-main-card cb-booking-list">
                    <p className="cb-note">
                      {shown.length} matching request(s). Refresh to load new
                      customer activity.
                    </p>
                    {shown.map((b) => (
                      <button
                        key={b.id}
                        className={`cb-booking-row ${selected === b.id ? "selected" : ""}`}
                        onClick={() => setSelected(b.id)}
                      >
                        <span className="cb-status-badge">{b.status}</span>
                        <strong>
                          {b.journey.origin.label} →{" "}
                          {b.journey.destination.label}
                        </strong>
                        <span>
                          {b.customer.name} ·{" "}
                          {b.journey.departure.replace("T", " ")} IST
                        </span>
                        <small>
                          {b.id} · {tripLabels[b.journey.tripType]} ·{" "}
                          {paymentStatus(b, data)}
                        </small>
                      </button>
                    ))}
                    {!shown.length && (
                      <div className="cb-empty">
                        <Car size={30} />
                        <h3>No matching development bookings.</h3>
                        <p>
                          Submit a request from the customer cab page or adjust
                          the filters.
                        </p>
                      </div>
                    )}
                  </section>
                  <section className="cb-main-card">
                    {chosen ? (
                      <BookingOperations
                        key={chosen.id + chosen.updatedAt}
                        booking={chosen}
                        operations={data.operations}
                        run={async (action) => {
                          await perform(
                            () =>
                              cabApi("admin/bookings/" + chosen.id, {
                                method: "PATCH",
                                body: action,
                              }),
                            "Booking updated in temporary development data.",
                          );
                        }}
                        busy={busy}
                      />
                    ) : (
                      <div className="cb-empty">
                        <ShieldCheck size={32} />
                        <h2>Select a booking to manage its journey.</h2>
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
