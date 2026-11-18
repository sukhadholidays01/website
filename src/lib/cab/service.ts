import "server-only";
import { assertQuoteValid, commercialState, assertAdvanceCollection } from "./commercial";
import type { OperationsActor } from "./commercial-types";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { guestGrantAllows } from "./guest-context";
import { consentInput, validatePolicyAcceptance } from "./guest-policies";
import { readGuestPolicy, detectNight } from "./guest-policy";
import {
  cabStorageMode,
  changeCabState,
  listCabCategories,
  readCabState,
} from "./store";
import { CabError, equal, hash } from "./security";
import { canonicalPlace, lookupCabRoute } from "./maps";
import { routingProvider } from "./routing";
import { calculateCabFare } from "./fare";
import { calculateConfiguredFare } from "./pricing";
import { fleetOptions, matchManagedRoute } from "./operations";
import { assertAssignment } from "./assignments";
import { queueCabEmail } from "./notifications";
import { auditCab } from "./tracking";
import { customerSchema, indiaTime, journeySchema, vehicleSchema } from "./validation";
import {
  cabBalance,
  cabVehicles,
  type CabBooking,
  type CabJourney,
  type CabRoute,
  type CabState,
  type PublicCabBooking,
} from "./types";
export const publicBooking = (b: CabBooking): PublicCabBooking => {
  const { accessHash, requestKey, requestHash, customerId, policyAcceptances, documentPolicy, commercial, ...visible } = b;
  void commercial; void policyAcceptances; void documentPolicy;
  void accessHash;
  void requestKey;
  void requestHash;
  void customerId;
  return visible;
};
export function getBooking(state: CabState, id: string) {
  const b = state.bookings.find((b) => b.id === id);
  if (!b) throw new CabError("Booking not found.", 404);
  return b;
}
export function authorizeBooking(b: CabBooking, token: string, sensitive = true) {
  if (guestGrantAllows(b.id,sensitive)) return;
  if (!token || !equal(b.accessHash, hash(token)))
    throw new CabError("Booking access link is invalid.", 403);
}
export async function prepareJourney(input: unknown) {
  const candidate = journeySchema.parse(input);
  const state = await readCabState();
  if (candidate.tripType !== "multi-day" && !state.operations.settings.enabledTripTypes.includes(candidate.tripType))
    throw new CabError("This trip type is not currently enabled.");
  const knownManagedPlace = (place: CabJourney["origin"]) =>
    state.operations.routes
      .flatMap((r) => [r.origin, r.destination])
      .find((p) => p.id === place.id) || canonicalPlace(place);
  const journey: CabJourney = {
    ...candidate,
    origin: knownManagedPlace(candidate.origin),
    destination: knownManagedPlace(candidate.destination),
    ...(candidate.itinerary ? {itinerary:{...candidate.itinerary,stops:candidate.itinerary.stops.map(stop=>({...stop,place:knownManagedPlace(stop.place)}))}} : {}),
  };
  // Revalidate after resolving trusted place identities, including airport direction checks.
  journeySchema.parse(journey);
  const managed = journey.tripType === "multi-day" ? undefined : matchManagedRoute(state, journey);
  if (journey.tripType === "multi-day") delete journey.routeId;
  if (managed) journey.routeId = managed.id;
  const persistent = cabStorageMode() === "mysql";
  const configuredOptions = fleetOptions(state, journey, managed);
  const options =
    persistent &&
    (!managed || !configuredOptions.some((option) => option.available))
      ? (await listCabCategories())
          .filter(
            (category) =>
              !managed || managed.categories.includes(category.category),
          )
          .map((category) => ({
            id: category.category,
            name: category.name,
            model: "Vehicle preference; availability to be confirmed",
            seats: category.seats,
            luggage: null,
            amenities: [],
            image:
              cabVehicles.find((vehicle) => vehicle.id === category.category)
                ?.image || "",
            available: true,
            development: false,
            requestOnly: true,
          }))
      : configuredOptions.map((option) => ({
          ...option,
          requestOnly: persistent && !managed,
        }));
  if (!options.some((v) => v.id === journey.vehicle && v.available))
    throw new CabError(
      "Choose a vehicle category configured for this request.",
    );
  const selectedCapacity = options.find(v=>v.id===journey.vehicle)?.seats;
  if (!selectedCapacity || journey.passengers>selectedCapacity) throw new CabError("Passenger count exceeds the selected vehicle category capacity.");
  let route: CabRoute | null = null;
  let previewRoute: CabRoute | null = null;
  let previewWarning = "";
  let routingWarning = "";
  if (persistent) {
    if (
      managed?.distanceKm &&
      managed.distanceKm > 0 &&
      managed.distanceSource !== "demo" &&
      managed.distanceSource !== "unverified" &&
      managed.durationMinutes
    ) {
      route = {
        distanceKm: managed.distanceKm,
        durationMinutes: managed.durationMinutes,
        geometry: managed.geometry || [],
        source: managed.distanceSource,
        ...(managed.returnDistanceKm
          ? { returnDistanceKm: managed.returnDistanceKm }
          : {}),
        ...(managed.returnDurationMinutes
          ? { returnDurationMinutes: managed.returnDurationMinutes }
          : {}),
      };
    } else {
      routingWarning =
        "Road distance is not configured for this route. Operations will verify it before confirming the fare.";
    }
  } else {
    try {
      if (journey.tripType !== "local") route = await lookupCabRoute(journey);
    } catch {
      routingWarning =
        "Road distance could not be verified. Operations will check the route before confirming.";
    }
  }
  if (
    route &&
    journey.tripType === "round-trip" &&
    journey.returnAt &&
    indiaTime(journey.returnAt) - indiaTime(journey.departure) <
      (route.durationMinutes +
        (route.returnDurationMinutes || route.durationMinutes)) *
        60000
  )
    throw new CabError(
      "Allow enough time for the outward and return drives. Choose a later return arrival.",
    );
  const policy = (
    journey.tripType === "round-trip" ? managed?.roundTripFares : managed?.fares
  )?.[journey.vehicle];
  if (journey.tripType === "local") {
    const pack =
      policy?.hourlyPackages.find((p) => p.id === journey.packageId) ||
      policy?.hourlyPackages.find((p) => p.hours === journey.durationHours);
    if (!pack) throw new CabError("Select a configured hourly package.");
    journey.durationHours = pack.hours;
    journey.packageId = pack.id;
  }
  if (route?.source === "demo")
    routingWarning =
      "Development road-distance fixture. This is an estimate, not a live road-routing response.";
  if (!managed)
    routingWarning +=
      " No active configured route matches. This will be a custom quote enquiry.";
  if (persistent && journey.tripType !== "local" && routingProvider().name !== "demo") {
    try {
      if (journey.tripType === "multi-day") {
        const points=[journey.origin,...journey.itinerary!.stops.map(s=>s.place),journey.destination];
        for(let index=1;index<points.length;index++){
          if(points[index].lat===points[index-1].lat&&points[index].lon===points[index-1].lon)continue;
          const part=await lookupCabRoute({...journey,tripType:"one-way",origin:points[index-1],destination:points[index]});
          previewRoute=previewRoute?{...part,distanceKm:previewRoute.distanceKm+part.distanceKm,durationMinutes:previewRoute.durationMinutes+part.durationMinutes,geometry:[...previewRoute.geometry,...part.geometry]}:part;
        }
      } else previewRoute = await lookupCabRoute(journey);
    }
    catch { previewWarning = "The live road preview is unavailable. Your selected locations remain on the map; operations will verify the route."; }
  }
  const fare = journey.tripType === "multi-day" ? {method:"quote" as const,total:null,distanceKm:null,billableKm:null,days:Math.ceil((indiaTime(journey.returnAt!)-indiaTime(journey.departure))/86400000),lines:[],inclusions:"Itinerary and availability to be reviewed by operations.",exclusions:"Final inclusions and exclusions will accompany the quotation.",version:"multi-day-quote-v1",development:!persistent} :
    policy && managed
      ? calculateConfiguredFare(
          journey,
          route,
          managed,
          policy,
          state.operations.settings,
        )
      : {
          ...calculateCabFare(journey, route, {
            ...state.config,
            manual: [],
            automatic: [],
          }),
          development: !persistent,
        };
  return {
    journey,
    route,
    fare,
    routingWarning,
    previewRoute,
    previewWarning,
    development: !persistent,
    persistent,
    options: options.map((v) => ({
      ...v,
      fare: managed
        ? (journey.tripType === "round-trip"
            ? managed.roundTripFares
            : managed.fares)?.[v.id]
          ? calculateConfiguredFare(
              {
                ...journey,
                vehicle: v.id,
                ...(journey.tripType === "local"
                  ? {
                      packageId: managed.fares[v.id]?.hourlyPackages.find(
                        (p) => p.hours === journey.durationHours,
                      )?.id,
                    }
                  : {}),
              },
              route,
              managed,
              (journey.tripType === "round-trip"
                ? managed.roundTripFares
                : managed.fares)![v.id]!,
              state.operations.settings,
            )
          : null
        : null,
    })),
  };
}
export async function searchCabJourney(input: unknown) {
  const body = z
    .object({ journey: journeySchema })
    .parse(input);
  return prepareJourney(body.journey);
}
export async function createCabBooking(input: unknown) {
  const parsed = z
    .object({
      journey: journeySchema,
      customer: customerSchema,
      requestKey: z.string().uuid(),
      accessToken: z.string().regex(/^[a-f0-9]{64}$/),
      consent: z.literal(true),
      consents: consentInput.optional(),
    })
    .parse(input);
  const requestHash = hash(
    JSON.stringify({ journey: parsed.journey, customer: parsed.customer }),
  );
  const existing = (await readCabState()).bookings.find(
    (b) => b.requestKey === parsed.requestKey,
  );
  if (existing) {
    authorizeBooking(existing, parsed.accessToken);
    if (existing.requestHash !== requestHash)
      throw new CabError(
        "This request key belongs to different trip details. Start a new request.",
        409,
      );
    return publicBooking(existing);
  }
  const { journey, route, fare } = await prepareJourney(parsed.journey);
  let policyAcceptances;
  if (parsed.consents) {
    try { policyAcceptances=validatePolicyAcceptance(parsed.consents,["booking_terms","privacy_notice"]); }
    catch { throw new CabError("Review the current booking terms and privacy notice separately."); }
  }
  const now = new Date().toISOString();
  const record: CabBooking = {
    id: "SH-CAB-" + randomBytes(12).toString("hex").toUpperCase(),
    customerId: randomUUID(),
    accessHash: hash(parsed.accessToken),
    requestKey: parsed.requestKey,
    requestHash,
    createdAt: now,
    updatedAt: now,
    journey,
    route,
    fare,
    status: "REQUESTED",
    ...(policyAcceptances ? {policyAcceptances, documentPolicy:detectNight(journey.departure,await readGuestPolicy())} : {}),
    customer: parsed.customer,
    payments: [],
    history: [
      {
        at: now,
        actor: "customer",
        message:
          "Booking request submitted. Availability and final quote pending.",
        statusTo: "REQUESTED",
      },
    ],
    development: cabStorageMode() !== "mysql",
  };
  return changeCabState((state) => {
    const duplicate = state.bookings.find(
      (b) => b.requestKey === parsed.requestKey,
    );
    if (duplicate) {
      authorizeBooking(duplicate, parsed.accessToken);
      if (duplicate.requestHash !== requestHash)
        throw new CabError("Request details changed.", 409);
      return publicBooking(duplicate);
    }
    // A preview is never customer acceptance. Operations must issue a final quote.
    if (state.bookings.some((b) => b.id === record.id))
      throw new CabError("Reference conflict. Retry the request.", 409);
    state.bookings.unshift(record);
    queueCabEmail(state, record, "request");
    if (record.policyAcceptances) queueCabEmail(state, record, "initial-access-link");
    queueCabEmail(state, record, "admin-request");
    return publicBooking(record);
  });
}
export async function customerAction(
  id: string,
  token: string,
  action: string,
  version?: string,
) {
  return changeCabState((state) => {
    const b = getBooking(state, id);
    authorizeBooking(b, token);
    const previousStatus = b.status;
    if (action === "accept") {
      if (
        b.status !== "QUOTED" ||
        b.fare.total === null ||
        version !== b.fare.version
      )
        throw new CabError(
          "The quote changed. Refresh and review the latest quote.",
          409,
        );
      assertQuoteValid(b);
      const revision=b.commercial?.quotations.at(-1);if(revision)revision.acceptedAt=new Date().toISOString();
      b.acceptedVersion = b.fare.version;
      b.status = "ACCEPTED";
    } else if (action === "cancel") {
      if (
        !["REQUESTED", "QUOTED", "ACCEPTED"].includes(b.status) ||
        cabBalance(b).paid > 0
      )
        throw new CabError(
          "Contact operations to cancel a confirmed or paid booking.",
          409,
        );
      b.status = "CANCELLED";
    } else throw new CabError("Unknown booking action.");
    b.updatedAt = new Date().toISOString();
    b.history.push({
      at: b.updatedAt,
      actor: "customer",
      message:
        action === "accept"
          ? "Customer accepted the final quote. Awaiting availability confirmation."
          : "Customer cancelled the request.",
      statusFrom: previousStatus,
      statusTo: b.status,
    });
    queueCabEmail(state, b, action === "accept" ? "accepted" : "cancelled");
    if(action==="accept"){queueCabEmail(state,b,"admin-accepted");auditCab(state,"CUSTOMER","Accepted quotation "+b.fare.version,id);}
    return publicBooking(b);
  });
}
const operationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("quote"),
    requestKey:z.string().uuid().optional(),
    expectedVersion:z.string().max(50000).optional(),
    vehicle:vehicleSchema.optional(),
    reason:z.string().trim().min(5).max(500).optional(),
    notes:z.string().trim().max(1500).default(""),
    expiresAt:z.string().datetime().optional(),
    lines:z.array(z.object({label:z.string().trim().min(1).max(100),amount:z.number().finite().multipleOf(0.01).min(-10000000).max(10000000)})).min(1).max(20).optional(),
    amount: z.number().min(0.01).multipleOf(0.01).max(10000000),
    inclusions: z.string().trim().min(3).max(500),
    exclusions: z.string().trim().min(3).max(500),
  }),
  z.object({ action: z.literal("confirm") }),
  z.object({
    action: z.literal("assign"),
    reason:z.string().trim().min(5).max(500).optional(),
    driverId: z.string().min(1).max(100),
    vehicleId: z.string().min(1).max(100),
  }),
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("complete") }),
  z.object({
    action: z.literal("cancel"),
    reason: z.string().trim().min(5).max(500),
  }),
  z.object({
    action: z.literal("payment"),
    amount: z.number().min(0.01).multipleOf(0.01).max(10000000),
    type: z.enum(["receipt", "refund"]),
    method: z.enum(["Cash", "Bank transfer", "UPI", "Other"]),
    reference: z.string().trim().min(3).max(100),
    note: z.string().trim().min(3).max(500),
  }),
]);
export async function operateBooking(id: string, input: unknown, actorRole = "OWNER", actorId = "legacy-service") {
  const op = operationSchema.parse(input);
  const quoteCategories=op.action==="quote"&&op.vehicle?await listCabCategories():[];
  return changeCabState((state) => {
    const b = getBooking(state, id);
    let message = "";
    const previousStatus = b.status;
    if (["payment", "cancel", "quote"].includes(op.action) && state.operations.paymentAttempts.some(a => a.bookingId === id && a.provider === "razorpay" && ["CREATING", "PENDING", "FAILED", "RECONCILIATION_REQUIRED"].includes(a.status))) throw new CabError("Resolve the outstanding Razorpay order before changing the fare, payment ledger or cancellation.", 409);
    const now = new Date().toISOString();
    const actor:OperationsActor={userId:actorId,role:actorRole};
    const eligible = (statuses: string[]) => {
      if (!statuses.includes(b.status))
        throw new CabError(
          `This action is unavailable while the booking is ${b.status.toLowerCase()}.`,
          409,
        );
    };
    if (op.action === "quote") {
      if(op.requestKey){const previous=b.commercial?.quotations.find(q=>q.requestKey===op.requestKey);if(previous){if(previous.requestHash!==hash(JSON.stringify(op)))throw new CabError("Quotation request key was reused with different details.",409);return publicBooking(b);}}
      eligible(["REQUESTED", "QUOTED", "ACCEPTED"]);
      if(op.expectedVersion!==undefined&&op.expectedVersion!==b.fare.version)throw new CabError("Quotation changed while editing. Reload before issuing a revision.",409);
      if(b.status!=="REQUESTED"&&!op.reason)throw new CabError("A quotation revision reason is required.");
      if(op.expiresAt&&Date.parse(op.expiresAt)<=Date.now())throw new CabError("Quotation expiry must be in the future.");
      if(op.lines&&Math.round(op.lines.reduce((sum,line)=>sum+line.amount,0)*100)!==Math.round(op.amount*100))throw new CabError("Quotation breakdown must equal the final amount.");
      const previousVehicle=b.journey.vehicle;
      if(op.vehicle){const capacity=quoteCategories.find(v=>v.category===op.vehicle)?.seats;if(!capacity||capacity<b.journey.passengers)throw new CabError("Quoted category cannot carry this passenger count.");b.journey.vehicle=op.vehicle;}
      const previousAmount=b.fare.total,previousFare=structuredClone(b.fare);
      b.fare = {
        ...b.fare,
        method: "manual",
        total: Math.round(op.amount * 100) / 100,
        lines: op.lines || [
          {
            label: "Operations quote",
            amount: Math.round(op.amount * 100) / 100,
          },
        ],
        inclusions: op.inclusions,
        exclusions: op.exclusions,
        version: randomUUID(),
      };
      const history=commercialState(b).quotations;
      history.push({requestKey:op.requestKey,requestHash:hash(JSON.stringify(op)),number:history.length+1,vehicle:b.journey.vehicle,previousVehicle,version:b.fare.version,previousAmount,previousFare,fare:structuredClone(b.fare),reason:op.reason||"Initial quotation",notes:op.notes,actor,createdAt:now,expiresAt:op.expiresAt||new Date(Date.now()+86400000).toISOString()});
      b.status = "QUOTED";
      b.acceptedVersion = undefined;
      message = "Final quote issued. Customer acceptance required.";
    } else if (op.action === "confirm") {
      eligible(["ACCEPTED"]);
      if (!b.acceptedVersion || b.acceptedVersion !== b.fare.version)
        throw new CabError("Customer must accept the latest quote first.", 409);
      assertQuoteValid(b);
      b.status = "CONFIRMED";
      message = "Availability checked; booking confirmed by operations.";
    } else if (op.action === "assign") {
      eligible(["CONFIRMED", "ASSIGNED"]);
      assertAdvanceCollection(state,b,"assignment");
      if(b.assignment&&!op.reason)throw new CabError("A reassignment reason is required.");
      const previous=b.assignment?structuredClone(b.assignment):undefined;
      try {
        b.assignment = assertAssignment(state, b, op.driverId, op.vehicleId);
      } catch (error) {
        throw new CabError((error as Error).message, 409);
      }
      commercialState(b).assignments.push({at:now,actor,reason:op.reason||"Initial assignment",previous,current:structuredClone(b.assignment)});
      if(previous){delete commercialState(b).driverConfirmedAt;for(const session of Object.values(state.driverSessions||{}))if(session.bookingId===id)session.revoked=true;if(state.locations)delete state.locations[id];}
      b.status = "ASSIGNED";
      message = `Driver and vehicle assigned: ${b.assignment.driver} · ${b.assignment.vehicle}.`;
    } else if (op.action === "start") {
      eligible(["ASSIGNED"]);
      assertAdvanceCollection(state,b,"dispatch");
      try{assertAssignment(state,b,b.assignment!.driverId!,b.assignment!.vehicleId!);}catch(error){throw new CabError((error as Error).message,409);}
      b.status = "IN_PROGRESS";
      message = "Trip started.";
    } else if (op.action === "complete") {
      eligible(["IN_PROGRESS"]);
      b.status = "COMPLETED";
      message = "Trip completed. Payment balance is tracked separately.";
    } else if (op.action === "cancel") {
      eligible(["REQUESTED", "QUOTED", "ACCEPTED", "CONFIRMED", "ASSIGNED"]);
      b.status = "CANCELLED";
      message = `Booking cancelled: ${op.reason}. Any refund must be recorded separately.`;
    } else if (op.action === "payment") {
      const paid = cabBalance(b).paid;
      const amount = Math.round(op.amount * 100) / 100;
      if (amount <= 0) throw new CabError("Payment must be at least ₹0.01.");
      if (
        b.payments.some(
          (p) => p.reference.toLowerCase() === op.reference.toLowerCase(),
        )
      )
        throw new CabError("This payment reference is already recorded.", 409);
      if (op.type === "receipt") {
        eligible(["CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"]);
        if (b.fare.total === null || amount > b.fare.total - paid + 0.001)
          throw new CabError("Receipt exceeds the outstanding balance.");
      } else {
        const offlinePaid = b.payments.filter(p => !p.mode || p.mode === "manual").reduce((sum,p) => sum + (p.type === "receipt" ? p.amount : -p.amount), 0);
        if (amount > Math.min(paid, offlinePaid) + 0.001) throw new CabError("Offline refunds cannot exceed offline receipts. Use verified gateway refunds for Razorpay payments.");
      }
      b.payments.push({
        id: randomUUID(),
        amount,
        type: op.type,
        method: op.method,
        reference: op.reference,
        note: op.note,
        mode: "manual",
        at: now,
      });
      message = `Manual ${op.type} recorded: ₹${amount} via ${op.method}. Reference: ${op.reference}.`;
    }
    b.updatedAt = now;
    b.history.push({
      at: now,
      actor: "operations",
      message,
      statusFrom: previousStatus,
      statusTo: b.status,
    });
    queueCabEmail(
      state,
      b,
      op.action === "confirm"
        ? "confirmation"
        : op.action === "assign"
          ? "assignment"
          : op.action === "payment" ? (op.type === "refund" ? "refund" : "payment-success")
            : op.action === "quote" ? "quote" : op.action === "start" ? "started" : op.action === "complete" ? "completed" : op.action === "cancel" ? "cancelled" : "status",
    );
    if (op.action === "assign") queueCabEmail(state, b, "driver-assignment");
    auditCab(state, actorRole, "Booking action: " + op.action+" by "+actorId, id);
    return publicBooking(b);
  }).catch(async(error)=>{if(op.action==="assign")await changeCabState(state=>{const b=getBooking(state,id);queueCabEmail(state,b,"assignment-conflict");auditCab(state,actorRole,"Assignment denied by "+actorId,id);}).catch(()=>{});throw error;});
}
