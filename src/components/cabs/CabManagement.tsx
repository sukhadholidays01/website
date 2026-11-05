"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Plus, Save, Route, Car, Users } from "lucide-react";
import { cabPlaces } from "@/data/cabPlaces";
import { cabApi } from "@/lib/cab/client";
import {
  categoryLabels,
  emptyFare,
  type CabOperationsData,
  type FarePolicy,
  type ManagedDriver,
  type ManagedRoute,
  type ManagedVehicle,
} from "@/lib/cab/models";
import {
  tripLabels,
  type CabFare,
  type CabJourney,
  type CabRoute,
  type CabVehicle,
} from "@/lib/cab/types";
import { PlacePicker } from "./PlacePicker";
import { FareDetails } from "./CabBookingFlow";
import {
  developmentImageStorage,
  type CabImagePreview,
} from "@/lib/cab/image-storage";

type SaveEntity = (kind: string, record: unknown) => Promise<void>;
export type IntegrationStatus = {
  email: {
    mode: string;
    smtpConfigured: boolean;
    mockSendingExplicitlyEnabled: boolean;
    senderPolicy: string;
  };
  payments: {
    mode: string;
    liveEnabled: boolean;
    razorpayCredentialsPresent: boolean;
    reason: string;
  };
  routing: {
    provider: string;
    configured: boolean;
    geocodingConfigured: boolean;
  };
};
function NumberField({
  label,
  value,
  onChange,
  nullable = false,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  nullable?: boolean;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        min="0"
        max="10000000"
        step="0.01"
        value={value ?? ""}
        required={!nullable}
        onChange={(e) =>
          onChange(
            e.target.value === "" && nullable ? null : Number(e.target.value),
          )
        }
      />
    </label>
  );
}
function FarePolicyForm({
  value: p,
  onChange,
}: {
  value: FarePolicy;
  onChange: (p: FarePolicy) => void;
}) {
  const update = (patch: Partial<FarePolicy>) => onChange({ ...p, ...patch });
  return (
    <>
      <label>
        <span>Active fare mode for this category and trip</span>
        <select
          value={p.mode}
          onChange={(e) =>
            update({ mode: e.target.value as FarePolicy["mode"] })
          }
        >
          <option value="manual">Manual route fare</option>
          <option value="automatic">Automatic road distance</option>
          <option value="hybrid">
            Explicit hybrid: manual component + distance
          </option>
          <option value="hourly">Hourly package</option>
        </select>
      </label>
      <p className="cb-note">
        Manual = manual fare plus configured charges. Automatic = base +
        billable km × rate + allowance. Hybrid adds its explicit manual
        component to automatic pricing. The ₹250 default charge is managed in
        Settings or overridden here.
      </p>
      <div className="cb-fields">
        {["manual", "hybrid"].includes(p.mode) && (
          <NumberField
            label="Manual component · INR"
            value={p.manualFare}
            nullable
            onChange={(manualFare) => update({ manualFare })}
          />
        )}
        {["automatic", "hybrid"].includes(p.mode) && (
          <>
            {(
              [
                ["baseFare", "Route base fare · INR"],
                ["perKm", "Per-kilometre rate · INR"],
                ["minimumKm", "Minimum billable kilometres"],
                ["minimumKmPerDay", "Round-trip minimum kilometres/day"],
                ["driverPerDay", "Driver allowance/day · INR"],
              ] as [keyof FarePolicy, string][]
            ).map(([key, label]) => (
              <NumberField
                key={key}
                label={label}
                value={p[key] as number}
                onChange={(v) => update({ [key]: v ?? 0 })}
              />
            ))}
            <NumberField
              label="Override total billable km (blank uses route distance)"
              value={p.billableKm}
              nullable
              onChange={(billableKm) => update({ billableKm })}
            />
          </>
        )}
        <NumberField
          label="Minimum fare before extras · INR"
          value={p.minimumFare}
          onChange={(v) => update({ minimumFare: v ?? 0 })}
        />
        <NumberField
          label="Additional fixed charge override (blank uses Settings)"
          value={p.fixedCharge}
          nullable
          onChange={(fixedCharge) => update({ fixedCharge })}
        />
        <label>
          <span>Toll handling</span>
          <select
            value={p.tollMode}
            onChange={(e) =>
              update({ tollMode: e.target.value as FarePolicy["tollMode"] })
            }
          >
            <option value="actual">
              Pay at actuals, excluded from estimate
            </option>
            <option value="included">Included in base / manual amount</option>
            <option value="fixed">Add a configured toll amount</option>
          </select>
        </label>
        {p.tollMode === "fixed" && (
          <NumberField
            label="Toll amount · INR"
            value={p.tollAmount}
            onChange={(v) => update({ tollAmount: v ?? 0 })}
          />
        )}
        <label>
          <span>Inclusions</span>
          <textarea
            value={p.inclusions}
            required
            minLength={3}
            maxLength={500}
            onChange={(e) => update({ inclusions: e.target.value })}
          />
        </label>
        <label>
          <span>Exclusions</span>
          <textarea
            value={p.exclusions}
            required
            minLength={3}
            maxLength={500}
            onChange={(e) => update({ exclusions: e.target.value })}
          />
        </label>
      </div>
      <details className="cb-editor-details">
        <summary>Other charges and discounts</summary>
        {p.extras.map((extra, index) => (
          <div className="cb-inline-fields" key={index}>
            <label>
              <span>Charge name</span>
              <input
                required
                maxLength={80}
                value={extra.label}
                onChange={(e) =>
                  update({
                    extras: p.extras.map((x, i) =>
                      i === index ? { ...x, label: e.target.value } : x,
                    ),
                  })
                }
              />
            </label>
            <NumberField
              label="Amount · INR"
              value={extra.amount}
              onChange={(n) =>
                update({
                  extras: p.extras.map((x, i) =>
                    i === index ? { ...x, amount: n ?? 0 } : x,
                  ),
                })
              }
            />
            <button
              type="button"
              className="cb-btn"
              onClick={() =>
                update({ extras: p.extras.filter((_, i) => i !== index) })
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          className="cb-btn"
          type="button"
          onClick={() =>
            update({
              extras: [...p.extras, { label: "Additional charge", amount: 0 }],
            })
          }
        >
          Add fixed charge
        </button>
        <label className="cb-consent">
          <input
            type="checkbox"
            checked={p.discount.enabled}
            onChange={(e) =>
              update({ discount: { ...p.discount, enabled: e.target.checked } })
            }
          />
          <span>Enable discount</span>
        </label>
        {p.discount.enabled && (
          <div className="cb-fields">
            <label>
              <span>Discount type</span>
              <select
                value={p.discount.type}
                onChange={(e) =>
                  update({
                    discount: {
                      ...p.discount,
                      type: e.target.value as "fixed" | "percent",
                    },
                  })
                }
              >
                <option value="fixed">Fixed amount</option>
                <option value="percent">Percentage</option>
              </select>
            </label>
            <NumberField
              label="Discount value"
              value={p.discount.value}
              onChange={(n) =>
                update({ discount: { ...p.discount, value: n ?? 0 } })
              }
            />
          </div>
        )}
      </details>
      {p.mode === "hourly" && (
        <section className="cb-editor-details">
          <h4>Hourly packages</h4>
          {p.hourlyPackages.map((pack, index) => (
            <div className="cb-package-editor" key={pack.id}>
              <div className="cb-fields">
                <label>
                  <span>Package name</span>
                  <input
                    required
                    value={pack.name}
                    onChange={(e) =>
                      update({
                        hourlyPackages: p.hourlyPackages.map((x, i) =>
                          i === index ? { ...x, name: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </label>
                {(
                  [
                    ["hours", "Hours"],
                    ["includedKm", "Included kilometres"],
                    ["fare", "Package fare · INR"],
                    ["extraKmRate", "Extra-km rate · INR"],
                  ] as const
                ).map(([key, label]) => (
                  <NumberField
                    key={key}
                    label={label}
                    value={pack[key]}
                    onChange={(n) =>
                      update({
                        hourlyPackages: p.hourlyPackages.map((x, i) =>
                          i === index ? { ...x, [key]: n ?? 0 } : x,
                        ),
                      })
                    }
                  />
                ))}
              </div>
              <button
                type="button"
                className="cb-text-link"
                onClick={() =>
                  update({
                    hourlyPackages: p.hourlyPackages.filter(
                      (_, i) => i !== index,
                    ),
                  })
                }
              >
                Remove package
              </button>
            </div>
          ))}
          <button
            type="button"
            className="cb-btn"
            onClick={() =>
              update({
                hourlyPackages: [
                  ...p.hourlyPackages,
                  {
                    id: crypto.randomUUID(),
                    name: "4 hours / 40 km",
                    hours: 4,
                    includedKm: 40,
                    fare: 0,
                    extraKmRate: 0,
                  },
                ],
              })
            }
          >
            Add hourly package
          </button>
        </section>
      )}
    </>
  );
}
function RouteEditor({
  initial,
  onSave,
  busy,
}: {
  initial: ManagedRoute;
  onSave: SaveEntity;
  busy: boolean;
}) {
  const [r, setRoute] = useState(initial);
  const [category, setCategory] = useState<CabVehicle>(initial.categories[0]);
  const [round, setRound] = useState(false);
  const [fare, setFare] = useState<CabFare>();
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const update = (patch: Partial<ManagedRoute>) => {
    setRoute({ ...r, ...patch });
    setFare(undefined);
  };
  const policy =
    (round ? r.roundTripFares : r.fares)?.[category] || emptyFare();
  const setPolicy = (p: FarePolicy) =>
    update(
      round
        ? { roundTripFares: { ...r.roundTripFares, [category]: p } }
        : { fares: { ...r.fares, [category]: p } },
    );
  async function resolve() {
    setWorking(true);
    setError("");
    try {
      const data = await cabApi<{ route: CabRoute }>("admin/resolve-route", {
        method: "POST",
        body: {
          origin: r.origin,
          destination: r.destination,
          roundTrip: r.tripTypes.includes("round-trip"),
        },
      });
      update({
        distanceKm: data.route.distanceKm,
        durationMinutes: data.route.durationMinutes,
        returnDistanceKm: data.route.returnDistanceKm ?? null,
        returnDurationMinutes: data.route.returnDurationMinutes ?? null,
        distanceSource: data.route.source,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  async function preview() {
    setWorking(true);
    setError("");
    try {
      const future = new Date(Date.now() + 3 * 86400000);
      const end = new Date(future.getTime() + 36 * 3600000);
      const ist = (d: Date) =>
        new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 16);
      const journey = {
        tripType: round ? "round-trip" : r.tripTypes[0],
        departure: ist(future),
        returnAt: ist(end),
        vehicle: category,
        packageId: policy.hourlyPackages[0]?.id,
      } as CabJourney;
      const data = await cabApi<{ fare: CabFare }>("admin/preview-fare", {
        method: "POST",
        body: { route: r, journey },
      });
      setFare(data.fare);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave("routes", r).catch(() => {});
      }}
    >
      <h2>{r.name}</h2>
      <p className="cb-note">
        Draft/inactive routes never appear as bookable configured routes.
        Records and tariff previews are development data.
      </p>
      {error && (
        <p className="cb-alert" role="alert">
          {error}
        </p>
      )}
      <div className="cb-fields">
        <label>
          <span>Route name</span>
          <input
            required
            minLength={3}
            maxLength={150}
            value={r.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </label>
        <label>
          <span>Status</span>
          <select
            value={r.status}
            onChange={(e) =>
              update({ status: e.target.value as ManagedRoute["status"] })
            }
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <PlacePicker
          label="Starting hub / pickup area"
          value={r.origin}
          onChange={(origin) =>
            update({
              origin,
              distanceKm: null,
              durationMinutes: null,
              returnDistanceKm: null,
              returnDurationMinutes: null,
              distanceSource: "unverified",
            })
          }
        />
        <PlacePicker
          label="Destination"
          value={r.destination}
          onChange={(destination) =>
            update({
              destination,
              distanceKm: null,
              durationMinutes: null,
              returnDistanceKm: null,
              returnDurationMinutes: null,
              distanceSource: "unverified",
            })
          }
        />
      </div>
      <details className="cb-editor-details">
        <summary>View / edit endpoint coordinates</summary>
        <p className="cb-note">
          Only enter verified coordinates. Road lookup uses these coordinates,
          not a straight-line estimate.
        </p>
        <div className="cb-fields">
          {(["origin", "destination"] as const).flatMap((endpoint) =>
            (["lat", "lon"] as const).map((axis) => (
              <label key={endpoint + axis}>
                <span>
                  {endpoint} {axis}
                </span>
                <input
                  type="number"
                  step="any"
                  min={axis === "lat" ? 6 : 68}
                  max={axis === "lat" ? 38 : 98}
                  value={r[endpoint][axis]}
                  onChange={(e) =>
                    update({
                      [endpoint]: {
                        ...r[endpoint],
                        id: "admin-" + crypto.randomUUID(),
                        [axis]: Number(e.target.value),
                      },
                      distanceKm: null,
                      durationMinutes: null,
                      distanceSource: "unverified",
                    })
                  }
                />
              </label>
            )),
          )}
        </div>
      </details>
      <fieldset className="cb-check-grid">
        <legend>Supported trip types</legend>
        {Object.entries(tripLabels).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={r.tripTypes.includes(key as CabJourney["tripType"])}
              onChange={(e) =>
                update({
                  tripTypes: e.target.checked
                    ? [...r.tripTypes, key as CabJourney["tripType"]]
                    : r.tripTypes.filter((t) => t !== key),
                })
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="cb-actions">
        <button
          type="button"
          className="cb-btn"
          disabled={working}
          onClick={() => void resolve()}
        >
          Resolve road distance & duration
        </button>
        <span className="cb-note">
          {r.distanceKm === null
            ? "Not resolved"
            : `${r.distanceKm} road km · ${r.durationMinutes} min · ${r.distanceSource}`}
          {r.returnDistanceKm !== null
            ? ` · return ${r.returnDistanceKm} km`
            : ""}
        </span>
      </div>
      <div className="cb-fields">
        <NumberField
          label="Adjusted outward billable km (blank uses road km)"
          value={r.billableKm}
          nullable
          onChange={(billableKm) => update({ billableKm })}
        />
        <label>
          <span>Default mode for newly added categories</span>
          <select
            value={r.defaultMode}
            onChange={(e) =>
              update({
                defaultMode: e.target.value as ManagedRoute["defaultMode"],
              })
            }
          >
            {["manual", "automatic", "hybrid", "hourly"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="cb-check-grid">
        <legend>Supported vehicle categories</legend>
        {Object.entries(categoryLabels).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={r.categories.includes(key as CabVehicle)}
              onChange={(e) => {
                const c = key as CabVehicle;
                update({
                  categories: e.target.checked
                    ? [...r.categories, c]
                    : r.categories.filter((x) => x !== c),
                  fares: e.target.checked
                    ? {
                        ...r.fares,
                        [c]: { ...emptyFare(), mode: r.defaultMode },
                      }
                    : r.fares,
                });
                if (e.target.checked) setCategory(c);
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="cb-fields">
        <label>
          <span>Configure category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CabVehicle)}
          >
            {r.categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </select>
        </label>
        {r.tripTypes.includes("round-trip") && (
          <label>
            <span>Trip pricing rules</span>
            <select
              value={round ? "round" : "outward"}
              onChange={(e) => setRound(e.target.value === "round")}
            >
              <option value="outward">One-way / airport rules</option>
              <option value="round">Explicit round-trip rules</option>
            </select>
          </label>
        )}
      </div>
      <FarePolicyForm value={policy} onChange={setPolicy} />
      <label>
        <span>Operations notes</span>
        <textarea
          maxLength={1000}
          value={r.notes}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </label>
      <div className="cb-actions">
        <button
          className="cb-btn"
          type="button"
          disabled={working}
          onClick={() => void preview()}
        >
          Preview shared fare calculation
        </button>
        <button className="cb-btn cb-primary" disabled={busy || working}>
          <Save size={16} />
          Save {r.status} route
        </button>
      </div>
      {fare && <FareDetails fare={fare} />}
    </form>
  );
}
function VehicleImageInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [preview, setPreview] = useState<CabImagePreview>();
  const ref = useRef<CabImagePreview | undefined>(undefined);
  const [error, setError] = useState("");
  useEffect(() => () => ref.current?.dispose(), []);
  return (
    <div>
      <label>
        <span>Existing image asset</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">No image</option>
          {["sedan", "suv", "luxury", "tempo-traveller"].map((name) => (
            <option key={name} value={`/images/vehicles/${name}.webp`}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Preview a new image (not uploaded)</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const p = await developmentImageStorage.preview(f);
              ref.current?.dispose();
              ref.current = p;
              setPreview(p);
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </label>
      {preview && (
        <>
          <Image
            src={preview.url}
            alt="Temporary vehicle image preview"
            width={260}
            height={140}
            unoptimized
          />
          <p className="cb-note">
            Local preview only. Saving keeps the selected existing asset; this
            file has not been uploaded.
          </p>
        </>
      )}
      {error && (
        <p className="cb-inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
function VehicleEditor({
  initial,
  operations,
  onSave,
  busy,
}: {
  initial: ManagedVehicle;
  operations: CabOperationsData;
  onSave: SaveEntity;
  busy: boolean;
}) {
  const [v, setVehicle] = useState(initial);
  const update = (patch: Partial<ManagedVehicle>) =>
    setVehicle({ ...v, ...patch });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave("vehicles", v).catch(() => {});
      }}
    >
      <h2>Vehicle details</h2>
      <div className="cb-fields">
        <label>
          <span>Display name</span>
          <input
            required
            minLength={2}
            value={v.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </label>
        <label>
          <span>Model</span>
          <input
            required
            minLength={2}
            value={v.model}
            onChange={(e) => update({ model: e.target.value })}
          />
        </label>
        <label>
          <span>Category</span>
          <select
            value={v.category}
            onChange={(e) => update({ category: e.target.value as CabVehicle })}
          >
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Registration</span>
          <input
            required
            minLength={4}
            maxLength={30}
            value={v.registration}
            onChange={(e) => update({ registration: e.target.value })}
          />
        </label>
        <NumberField
          label="Passenger capacity"
          value={v.seats}
          onChange={(n) => update({ seats: n ?? 1 })}
        />
        <NumberField
          label="Luggage capacity (bags, optional)"
          value={v.luggage}
          nullable
          onChange={(luggage) => update({ luggage })}
        />
        <label>
          <span>Operational availability</span>
          <select
            value={v.availability}
            onChange={(e) =>
              update({
                availability: e.target.value as ManagedVehicle["availability"],
              })
            }
          >
            <option value="available">Available for scheduling</option>
            <option value="maintenance">Maintenance</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
        <label>
          <span>Amenities (comma separated)</span>
          <input
            value={v.amenities.join(", ")}
            onChange={(e) =>
              update({
                amenities: e.target.value.split(",").map((x) => x.trim()),
              })
            }
          />
        </label>
      </div>
      <VehicleImageInput
        value={v.image}
        onChange={(image) => update({ image })}
      />
      <fieldset className="cb-check-grid">
        <legend>Restrict to routes (none = all compatible routes)</legend>
        {operations.routes.map((r) => (
          <label key={r.id}>
            <input
              type="checkbox"
              checked={v.routeIds.includes(r.id)}
              onChange={(e) =>
                update({
                  routeIds: e.target.checked
                    ? [...v.routeIds, r.id]
                    : v.routeIds.filter((id) => id !== r.id),
                })
              }
            />
            {r.name}
          </label>
        ))}
      </fieldset>
      <label className="cb-consent">
        <input
          type="checkbox"
          checked={v.active}
          onChange={(e) => update({ active: e.target.checked })}
        />
        <span>Active vehicle</span>
      </label>
      <label>
        <span>Internal notes</span>
        <textarea
          maxLength={1000}
          value={v.notes}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </label>
      <p className="cb-note">
        Fare configuration is linked through vehicle category and route.
        Scheduling also checks existing assignments.
      </p>
      <button className="cb-btn cb-primary" disabled={busy}>
        Save vehicle
      </button>
    </form>
  );
}
function DriverEditor({
  initial,
  onSave,
  busy,
}: {
  initial: ManagedDriver;
  onSave: SaveEntity;
  busy: boolean;
}) {
  const [d, setDriver] = useState(initial);
  const update = (patch: Partial<ManagedDriver>) =>
    setDriver({ ...d, ...patch });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave("drivers", d).catch(() => {});
      }}
    >
      <h2>Driver details</h2>
      <div className="cb-fields">
        <label>
          <span>Full name</span>
          <input
            required
            minLength={2}
            value={d.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </label>
        <label>
          <span>Contact phone</span>
          <input
            type="tel"
            required
            value={d.phone}
            onChange={(e) => update({ phone: e.target.value })}
          />
        </label>
        <label>
          <span>Duty status</span>
          <select
            value={d.availability}
            onChange={(e) =>
              update({
                availability: e.target.value as ManagedDriver["availability"],
              })
            }
          >
            <option value="available">Available for scheduling</option>
            <option value="off-duty">Off duty</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
      </div>
      <label className="cb-consent">
        <input
          type="checkbox"
          checked={d.active}
          onChange={(e) => update({ active: e.target.checked })}
        />
        <span>Active driver</span>
      </label>
      <label className="cb-consent">
        <input
          type="checkbox"
          checked={d.approved}
          onChange={(e) => update({ approved: e.target.checked })}
        />
        <span>Verification approved by operations</span>
      </label>
      <label>
        <span>Internal verification / driver notes</span>
        <textarea
          maxLength={1000}
          value={d.notes}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </label>
      <p className="cb-note">
        Internal notes are never published to the customer. On-duty status alone
        does not mean the driver is free at the booking time.
      </p>
      <button className="cb-btn cb-primary" disabled={busy}>
        Save driver
      </button>
    </form>
  );
}
export function CabEntityManager({
  kind,
  operations,
  onSave,
  busy,
}: {
  kind: "routes" | "vehicles" | "drivers";
  operations: CabOperationsData;
  onSave: SaveEntity;
  busy: boolean;
}) {
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<
    ManagedRoute | ManagedVehicle | ManagedDriver
  >();
  const [query, setQuery] = useState("");
  const rows = operations[kind];
  const value = draft || rows.find((r) => r.id === selected);
  const add = () => {
    setSelected("");
    const id = crypto.randomUUID();
    setDraft(
      kind === "routes"
        ? {
            id,
            name: "New route",
            origin: cabPlaces[0],
            destination: cabPlaces[1],
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
            notes: "",
            development: true,
          }
        : kind === "vehicles"
          ? {
              id,
              category: "sedan",
              name: "New vehicle",
              model: "",
              registration: "",
              seats: 4,
              luggage: null,
              amenities: [],
              image: "",
              active: false,
              availability: "unavailable",
              routeIds: [],
              notes: "",
              development: true,
            }
          : {
              id,
              name: "New driver",
              phone: "",
              notes: "",
              approved: false,
              active: false,
              availability: "off-duty",
              development: true,
            },
    );
  };
  const save: SaveEntity = async (k, record) => {
    await onSave(k, record);
    setDraft(undefined);
    setSelected((record as { id: string }).id);
  };
  return (
    <>
      <div className="cb-op-toolbar">
        <div>
          <h2>
            {kind === "routes"
              ? "Routes & fares"
              : kind === "vehicles"
                ? "Vehicle management"
                : "Driver management"}
          </h2>
          <p className="cb-note">
            Development records only. Create, edit and change operational status
            below.
          </p>
        </div>
        <button type="button" className="cb-btn cb-primary" onClick={add}>
          <Plus size={15} />
          Add {kind.slice(0, -1)}
        </button>
      </div>
      <div className="cb-operations-grid">
        <section className="cb-main-card">
          <label>
            <span>Search {kind}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {rows
            .filter((r) =>
              JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
            )
            .map((r) => (
              <button
                className={`cb-booking-row ${selected === r.id ? "selected" : ""}`}
                key={r.id}
                onClick={() => {
                  setDraft(undefined);
                  setSelected(r.id);
                }}
              >
                <strong>{r.name}</strong>
                <span>
                  {"status" in r
                    ? r.status
                    : "category" in r
                      ? `${r.category} · ${r.registration} · ${r.availability}`
                      : `${r.approved ? "Approved" : "Unverified"} · ${r.availability}`}
                </span>
                <small>{r.development ? "DEVELOPMENT DATA" : ""}</small>
              </button>
            ))}
          {!rows.length && (
            <p className="cb-empty">
              No records yet. Add the first {kind.slice(0, -1)}.
            </p>
          )}
        </section>
        <section className="cb-main-card">
          {value ? (
            kind === "routes" ? (
              <RouteEditor
                key={value.id + operations.revision}
                initial={value as ManagedRoute}
                busy={busy}
                onSave={save}
              />
            ) : kind === "vehicles" ? (
              <VehicleEditor
                key={value.id + operations.revision}
                initial={value as ManagedVehicle}
                operations={operations}
                busy={busy}
                onSave={save}
              />
            ) : (
              <DriverEditor
                key={value.id + operations.revision}
                initial={value as ManagedDriver}
                busy={busy}
                onSave={save}
              />
            )
          ) : (
            <div className="cb-empty">
              {kind === "routes" ? (
                <Route size={30} />
              ) : kind === "vehicles" ? (
                <Car size={30} />
              ) : (
                <Users size={30} />
              )}
              <h3>Select a record or add a new one.</h3>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
export function CabSettingsEditor({
  operations,
  integrations,
  onSave,
  busy,
}: {
  operations: CabOperationsData;
  integrations: IntegrationStatus;
  onSave: SaveEntity;
  busy: boolean;
}) {
  const [s, setSettings] = useState(operations.settings);
  return (
    <section className="cb-main-card">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSave("settings", s).catch(() => {});
        }}
      >
        <h2>Cab settings</h2>
        <fieldset className="cb-check-grid">
          <legend>Enabled customer trip types</legend>
          {Object.entries(tripLabels).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={s.enabledTripTypes.includes(
                  key as CabJourney["tripType"],
                )}
                onChange={(e) =>
                  setSettings({
                    ...s,
                    enabledTripTypes: e.target.checked
                      ? [...s.enabledTripTypes, key as CabJourney["tripType"]]
                      : s.enabledTripTypes.filter((t) => t !== key),
                  })
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        <p className="cb-note">
          Create an active local route with hourly packages before enabling
          local rentals. Configured custom routes require active route/fare
          records; other requests remain quote enquiries.
        </p>
        <div className="cb-fields">
          <NumberField
            label="Default additional fixed charge · INR"
            value={s.fixedAdditionalCharge}
            onChange={(n) =>
              setSettings({ ...s, fixedAdditionalCharge: n ?? 0 })
            }
          />
          <NumberField
            label="Driver/vehicle turnaround buffer · minutes"
            value={s.assignmentBufferMinutes}
            onChange={(n) =>
              setSettings({ ...s, assignmentBufferMinutes: n ?? 0 })
            }
          />
        </div>
        <label>
          <span>Booking and cancellation policy shown before submission</span>
          <textarea
            required
            minLength={10}
            maxLength={3000}
            value={s.bookingPolicy}
            onChange={(e) =>
              setSettings({ ...s, bookingPolicy: e.target.value })
            }
          />
        </label>
        <fieldset className="cb-check-grid">
          <legend>Email notification preferences</legend>
          <label>
            <input
              type="checkbox"
              checked={s.notifications.customer}
              onChange={(e) =>
                setSettings({
                  ...s,
                  notifications: {
                    ...s.notifications,
                    customer: e.target.checked,
                  },
                })
              }
            />
            Customer emails
          </label>
          <label>
            <input
              type="checkbox"
              checked={s.notifications.admin}
              onChange={(e) =>
                setSettings({
                  ...s,
                  notifications: {
                    ...s.notifications,
                    admin: e.target.checked,
                  },
                })
              }
            />
            Admin emails
          </label>
        </fieldset>
        <p className="cb-note">
          Preferences alone never send email. SMTP mode and explicit mock-send
          opt-in are also required on the server.
        </p>
        <label className="cb-consent">
          <input
            type="checkbox"
            checked={s.mockPaymentsEnabled}
            onChange={(e) =>
              setSettings({ ...s, mockPaymentsEnabled: e.target.checked })
            }
          />
          <span>
            Allow labelled development payment simulation (no money collected)
          </span>
        </label>
        <button className="cb-btn cb-primary" disabled={busy}>
          Save settings
        </button>
        <h3 className="cb-subtitle">
          Integration status (no secret values shown)
        </h3>
        <dl className="cb-details">
          <div>
            <dt>Repository</dt>
            <dd>In-memory development mock · not persistent</dd>
          </div>
          <div>
            <dt>Road provider</dt>
            <dd>
              {integrations.routing.provider} ·{" "}
              {integrations.routing.configured
                ? "credentials/endpoint present"
                : "demo/no live credentials"}
              <br />
              Address lookup:{" "}
              {integrations.routing.geocodingConfigured
                ? "configured"
                : "predefined locations only"}
            </dd>
          </div>
          <div>
            <dt>Razorpay</dt>
            <dd>
              {integrations.payments.mode} · live disabled
              <br />
              {integrations.payments.reason}
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              {integrations.email.mode} · SMTP{" "}
              {integrations.email.smtpConfigured
                ? "credentials present"
                : "not configured"}
              <br />
              {integrations.email.senderPolicy}
            </dd>
          </div>
        </dl>
      </form>
    </section>
  );
}
export function CabNotificationViewer({
  operations,
}: {
  operations: CabOperationsData;
}) {
  const [id, setId] = useState("");
  const selected = operations.notifications.find((n) => n.id === id);
  return (
    <div className="cb-operations-grid">
      <section className="cb-main-card cb-notification-list">
        <h2>Email previews & delivery log</h2>
        <p className="cb-note">
          Preview means rendered only, not sent. No email retry sends messages
          automatically.
        </p>
        {operations.notifications.map((n) => (
          <button
            className="cb-booking-row"
            key={n.id}
            onClick={() => setId(n.id)}
          >
            <span className="cb-status-badge">{n.status}</span>
            <strong>{n.subject}</strong>
            <small>
              {n.audience} · {n.kind} · {n.attempts} delivery attempts
            </small>
          </button>
        ))}
        {!operations.notifications.length && (
          <p className="cb-empty">
            Templates appear here after a development booking or status action.
          </p>
        )}
      </section>
      <section className="cb-main-card cb-notification-list">
        {selected ? (
          <>
            <h3>{selected.subject}</h3>
            <p className="cb-note">
              {selected.status} ·{" "}
              {selected.error || "No delivery error recorded."}
            </p>
            <iframe
              title="Sandboxed email rendering preview"
              sandbox=""
              srcDoc={selected.html}
              className="cb-email-preview"
            />
            <details>
              <summary>Plain-text version</summary>
              <pre className="cb-email-text">{selected.text}</pre>
            </details>
          </>
        ) : (
          <p className="cb-empty">
            Choose an email to inspect its rendered template.
          </p>
        )}
      </section>
    </div>
  );
}
