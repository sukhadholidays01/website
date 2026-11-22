import { handleCommercialApi } from "@/lib/cab/commercial-api";
import { handleAutomationApi } from '@/lib/jobs/api';
import { advanceSummary, currentAdvance } from "@/lib/cab/commercial";
import { cabOperationsActor } from "@/lib/cab/security";
import { handleGuestApi, guestReadAccess, customerVisibleBooking } from "@/lib/cab/guest-api";
import { withGuestGrant } from "@/lib/cab/guest-context";
import { checkConfirmationRequirements, requireBookingConsent } from "@/lib/cab/guest-documents";
import { cookies } from "next/headers";
import {
  cabErrorResponse,
  CabError,
  limitRequest,
  privateJson,
  readBody,
  readRawBody,
  requireCabAdmin,
  requireSameOrigin,
  requireCabPermission,
  hash,
} from "@/lib/cab/security";
import { adminLogin, adminLogout, adminSession } from "@/lib/auth/admin-session";
import { testAdminEmail } from "@/lib/email/admin-test";
import { handleAdminPasswordReset, type ResetAction } from "@/lib/auth/password-reset-api";
import { cabStorageMode, changeCabState, readCabState } from "@/lib/cab/store";
import {
  authorizeBooking,
  createCabBooking,
  customerAction,
  getBooking,
  operateBooking,
  prepareJourney,
  publicBooking,
  searchCabJourney,
} from "@/lib/cab/service";
import { searchCabPlaces } from "@/lib/cab/maps";
import { configSchema } from "@/lib/cab/validation";
import {
  previewManagedRoute,
  publicCatalogue,
  resolveManagedRoute,
  saveOperationalEntity,
} from "@/lib/cab/operations";
import { emailConfiguration, processCabEmails } from "@/lib/cab/notifications";
import {
  initiateCabPayment,
  paymentConfiguration,
  simulateCabPayment,
} from "@/lib/cab/payments";
import { routingProvider } from "@/lib/cab/routing";
import { createRazorpayOrder, verifyCheckout, razorpayWebhook, razorpayConfiguration, publicPaymentSettings, reconcileOrder, requestRefund } from "@/lib/cab/razorpay";
import { auditCab, issueDriverAccess, authorizeDriver, updateDriverLocation, customerTracking, trackingSnapshot } from "@/lib/cab/tracking";
import { saveVehicleImage } from "@/lib/cab/media";
import { assertAssignment } from "@/lib/cab/assignments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
const token = (request: Request) =>
  request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
async function legacyHandle(request: Request, context: Context) {
  try {
    const segments = (await context.params).path;
    const route = segments.join("/");
    const method = request.method;
    if (route === "payments/razorpay/webhook" && method === "POST") {
      await razorpayWebhook(await readRawBody(request), request.headers.get("x-razorpay-signature") || "", request.headers.get("x-razorpay-event-id") || "");
      await processCabEmails().catch(() => {});
      return privateJson({ received: true });
    }
    if (method !== "GET") requireSameOrigin(request);
    const automation=await handleAutomationApi(request,segments);if(automation)return automation;
    if (route === "admin/email-test" && method === "POST") {
      const role = await requireCabPermission("settings");
      await limitRequest(request, "admin-email-test", 3, 15 * 60000);
      return privateJson(await testAdminEmail(await readBody(request), role));
    }
    if (route === "driver/session") {
      await limitRequest(request, "driver-session", 12);
      const cookieStore = await cookies();
      if (method === "POST") {
        const body = await readBody(request);
        const access = typeof body.token === "string" && /^[a-f0-9]{64}$/.test(body.token) ? body.token : "";
        authorizeDriver(await readCabState(), access);
        cookieStore.set("cab_driver_session", access, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 24 * 3600 });
        return privateJson({ authenticated: true });
      }
      const access = cookieStore.get("cab_driver_session")?.value || "";
      if (method === "DELETE") {
        await changeCabState(state => { const session = state.driverSessions?.[hash(access)]; if (session) session.revoked = true; });
        cookieStore.delete("cab_driver_session"); return privateJson({ authenticated: false });
      }
      if (method === "GET") {
        const { booking } = authorizeDriver(await readCabState(), access);
        return privateJson({ booking: { id: booking.id, status: booking.status, origin: booking.journey.origin.label, destination: booking.journey.destination.label, departure: booking.journey.departure } });
      }
    }
    if (route === "driver/location" && method === "POST") {
      await limitRequest(request, "driver-location", 12);
      return privateJson(await updateDriverLocation((await cookies()).get("cab_driver_session")?.value || "", await readBody(request)));
    }
    if (route === "driver/on-way" && method === "POST") {
      await limitRequest(request, "driver-on-way", 6);
      const access = (await cookies()).get("cab_driver_session")?.value || "";
      const body = await readBody(request);
      if (typeof body.bookingId !== "string" || body.bookingId.length > 80) throw new CabError("Choose an assigned booking.");
      await changeCabState(state => {
        const { booking } = authorizeDriver(state, access, body.bookingId);
        if (booking.status !== "ASSIGNED" || !booking.assignment) throw new CabError("This trip is not awaiting pickup.", 409);
        if (booking.assignment.onWayAt) return;
        booking.assignment.onWayAt = new Date().toISOString(); booking.updatedAt = booking.assignment.onWayAt;
        booking.history.push({ at: booking.updatedAt, actor: "driver", message: "Driver is on the way to pickup." });
        auditCab(state, "DRIVER", "Driver on the way to pickup", booking.id);
      }); return privateJson({ saved: true });
    }
    if (segments[0] === "tracking" && segments.length === 2 && method === "GET") {
      await limitRequest(request, "tracking", 30);
      return privateJson(await customerTracking(segments[1], token(request)));
    }
    if (route === "catalogue" && method === "GET")
      return privateJson(await publicCatalogue());
    if (route === "search" && method === "POST") {
      await limitRequest(request, "search", 20);
      return privateJson(
        await searchCabJourney(await readBody(request)),
      );
    }
    if (route === "payments/razorpay/verify" && method === "POST") {
      await limitRequest(request, "gateway-verify", 15);
      const attempt = await verifyCheckout(await readBody(request), token(request));
      await processCabEmails().catch(() => {});
      return privateJson({ attempt });
    }
    if (segments[0] === "payments" && segments[1] === "bookings" && segments[3] === "pay-later" && segments.length === 4 && method === "POST") {
      await limitRequest(request, "payment-choice", 10);
      await changeCabState(state => {
        const b = getBooking(state, segments[2]); authorizeBooking(b, token(request));
        if (!publicPaymentSettings(state.operations.settings).payLater || !["CONFIRMED", "ASSIGNED", "IN_PROGRESS"].includes(b.status)) throw new CabError("Pay later is not permitted for this booking.", 409);
        if (state.operations.paymentAttempts.some(a => a.bookingId === b.id && ["CREATING", "PENDING", "FAILED", "RECONCILIATION_REQUIRED"].includes(a.status))) throw new CabError("Resolve the current payment order first.", 409);
        b.fare.paymentChoice = "pay-later"; b.updatedAt = new Date().toISOString(); b.history.push({ at: b.updatedAt, actor: "customer", message: "Customer selected the enabled pay-later option. Balance remains due." });
        auditCab(state, "CUSTOMER", "Selected pay later", b.id);
      });
      return privateJson({ saved: true });
    }
    if (
      segments[0] === "payments" &&
      segments[1] === "bookings" &&
      segments.length === 3
    ) {
      const id = segments[2];
      await limitRequest(request, "payments", 15);
      if (method === "GET") {
        const state = await readCabState();
        const b=getBooking(state,id);authorizeBooking(b, token(request));
        return privateJson({
          attempts: state.operations.paymentAttempts.filter(
            (p) => p.bookingId === id,
          ),
          configuration: razorpayConfiguration(),
          policy: {...publicPaymentSettings(state.operations.settings),...(b.commercial?{advance:Boolean(currentAdvance(b)?.requestedAt),advanceType:currentAdvance(b)?.mode||"fixed",advanceValue:currentAdvance(b)?.value||0}:{})},
          advance: advanceSummary(b,state),
          balance: (await import("@/lib/cab/types")).cabBalance(getBooking(state, id)),
        });
      }
      const body = await readBody(request);
      if (method === "POST") {
        if (razorpayConfiguration().enabled) return privateJson(await createRazorpayOrder(id, token(request), body), 201);
        if (process.env.NODE_ENV !== "production" && cabStorageMode() === "development-mock") return privateJson({ attempt: await initiateCabPayment(id, token(request)) }, 201);
        throw new CabError("Online payment is not configured. Contact operations; no order was created.", 503);
      }
      if (method === "PATCH") {
        if (process.env.NODE_ENV === "production" || cabStorageMode() !== "development-mock") throw new CabError("Payment simulation is restricted to the in-memory development repository.", 403);
        const attempt = await simulateCabPayment(id, token(request), body);
        await processCabEmails();
        return privateJson({ attempt });
      }
    }
    // Compatibility for existing cab clients; one staff authentication implementation.
    if (route === "session" && method === "GET") return adminSession();
    if (route === "session" && method === "POST") return adminLogin(request);
    if (route === "session" && method === "DELETE") return adminLogout(request);
    if (route === "places" && method === "GET") {
      const query = (new URL(request.url).searchParams.get("q") || "").trim();
      if (query.length < 2 || query.length > 150)
        throw new CabError("Enter 2–150 characters to search.");
      await limitRequest(request, "places", 20);
      return privateJson({
        places: await searchCabPlaces(query),
        externalSearch: Boolean(process.env.CAB_GEOCODER_URL),
      });
    }
    if (route === "quote" && method === "POST") {
      await limitRequest(request, "quote", 15);
      return privateJson(
        await prepareJourney((await readBody(request)).journey),
      );
    }
    if (route === "bookings" && method === "POST") {
      await limitRequest(request, "bookings", 6);
      const booking = await createCabBooking(await readBody(request));
      await processCabEmails().catch(() => console.error('{"event":"cab_notification_processing_failed"}'));
      return privateJson(
        {
          booking,
          mode: cabStorageMode(),
          persistent: cabStorageMode() === "mysql",
        },
        201,
      );
    }
    if (segments[0] === "bookings" && segments.length === 2) {
      const id = segments[1];
      if (method === "GET") {
        await limitRequest(request, "booking-lookup", 30);
        const b = getBooking(await readCabState(), id);
        authorizeBooking(b, token(request), false);
        return privateJson({ booking: customerVisibleBooking(b, await guestReadAccess(request,id)) });
      }
      if (method === "PATCH") {
        await limitRequest(request, "customer-actions", 15);
        const body = await readBody(request);
        if (body.action === "accept") await requireBookingConsent(id);
        const booking = await customerAction(
          id,
          token(request),
          body.action,
          body.version,
        );
        await processCabEmails().catch(() => console.error('{"event":"cab_notification_processing_failed"}'));
        return privateJson({ booking });
      }
    }
    if (segments[0] === "admin") {
      await requireCabAdmin();
      const role = await requireCabPermission(method === "GET" || segments[1] === "bookings" ? "read" : segments[1] === "payments" ? "finance" : ["driver-access", "resend-email", "resolve-route", "preview-fare", "preview-assignment"].includes(segments[1]) ? "dispatch" : "settings");
      if (method !== "GET") await limitRequest(request, "admin-mutation", 30);
      if (route === "admin/upload-image" && method === "POST") {
        const result = await saveVehicleImage(request);
        await changeCabState(state => auditCab(state, role, "Uploaded vehicle image", result.url));
        return privateJson(result, 201);
      }
      if (route === "admin/preview-assignment" && method === "POST") {
        const input = await readBody(request);
        if (typeof input.bookingId !== "string" || typeof input.driverId !== "string" || typeof input.vehicleId !== "string" || [input.bookingId, input.driverId, input.vehicleId].some(v => v.length > 100)) throw new CabError("Choose a booking, driver and vehicle.");
        const state = await readCabState(), b = getBooking(state, input.bookingId);
        if (!["CONFIRMED", "ASSIGNED"].includes(b.status)) throw new CabError("Confirm this booking before assigning a ride.", 409);
        try { return privateJson({ assignment: assertAssignment(state, b, input.driverId, input.vehicleId) }); } catch(e) { throw new CabError((e as Error).message, 409); }
      }
      if (route === "admin/process-emails" && method === "POST") {
        await processCabEmails(); return privateJson({ processed: true, message:'Eligible messages were queued for the worker or recorded as previews. This is not delivery confirmation.' });
      }
      if (route === "admin/tracking" && method === "GET") {
        const state = await readCabState();
        return privateJson({ trips: state.bookings.filter(b => ["ASSIGNED", "IN_PROGRESS"].includes(b.status)).map(b => ({ booking: publicBooking(b), tracking: trackingSnapshot(state, b.id) })) });
      }
      if (segments[1] === "driver-access" && segments.length === 3 && method === "POST") {
        await requireCabPermission("dispatch");
        return privateJson(await issueDriverAccess(segments[2], role), 201);
      }
      if (segments[1] === "payments" && segments.length === 4 && method === "POST") {
        if (segments[3] === "reconcile") return privateJson(await reconcileOrder(segments[2], role));
        if (segments[3] === "refund") { const result = await requestRefund(segments[2], role, await readBody(request)); await processCabEmails().catch(() => {}); return privateJson(result); }
      }
      if (segments[1] === "resend-email" && segments.length === 3 && method === "POST") {
        await requireCabPermission("dispatch");
        await changeCabState(state => {
          const b = getBooking(state, segments[2]);
          if(state.operations.notifications.some(n=>n.bookingId===b.id&&(n.status==='sending'||n.status==='uncertain'||(n.status==='failed'&&n.error?.includes('not confirmed')))))throw new CabError('Review the uncertain submission with the email provider before requesting another message.',409);
          b.updatedAt = new Date().toISOString();
          // Reuse the existing outbox; never reset ambiguous SMTP outcomes.
          auditCab(state, role, "Requested booking email resend", b.id);
        });
        const { queueCabEmail } = await import("@/lib/cab/notifications");
        await changeCabState(state => { const b = getBooking(state, segments[2]); queueCabEmail(state, b, ["REQUESTED", "QUOTED", "ACCEPTED"].includes(b.status) ? "status" : "confirmation"); });
        await processCabEmails().catch(() => {}); return privateJson({ queued: true });
      }
      if (route === "admin/resolve-route" && method === "POST")
        return privateJson({
          route: await resolveManagedRoute(await readBody(request)),
        });
      if (route === "admin/preview-fare" && method === "POST")
        return privateJson({
          fare: await previewManagedRoute(await readBody(request)),
        });
      if (segments[1] === "manage" && segments.length === 3 && method === "PUT")
        return privateJson({
          operations: await saveOperationalEntity(
            segments[2],
            await readBody(request),
            (await cabOperationsActor("settings")).userId,
          ),
        });
      if (route === "admin" && method === "GET") {
        const state = await readCabState();
        return privateJson({
          bookings: state.bookings.map(publicBooking),
          config: state.config,
          storage: cabStorageMode(),
          asOf: Date.now(),
          operations: state.operations,
          role,
          audit: state.audit || [],
          refunds: state.refunds || [],
          integrations: {
            email: emailConfiguration(),
            payments: { ...paymentConfiguration(), ...razorpayConfiguration() },
            routing: {
              provider: routingProvider().name,
              configured:
                routingProvider().name === "demo"
                  ? false
                  : routingProvider().name === "osrm"
                    ? Boolean(process.env.CAB_OSRM_URL)
                    : Boolean(
                        process.env.CAB_MAPBOX_TOKEN ||
                        process.env.MAP_BOX_ACCESS_TOKEN,
                      ),
              geocodingConfigured: Boolean(process.env.CAB_GEOCODER_URL),
            },
          },
        });
      }
      if (route === "admin/config" && method === "PUT") {
        const config = configSchema.parse(await readBody(request));
        return privateJson({
          config: await changeCabState((state) => {
            if (state.config.revision !== config.revision)
              throw new CabError(
                "Rates were changed in another session. Reload before saving.",
                409,
              );
            const ids = new Set(config.manual.map((r) => r.id));
            if (ids.size !== config.manual.length)
              throw new CabError("Fare identifiers must be unique.");
            state.config = { ...config, revision: config.revision + 1 };
            auditCab(state, role, "Updated fare configuration", "cab_config");
            return state.config;
          }),
        });
      }
      if (
        segments[1] === "bookings" &&
        segments.length === 3 &&
        method === "PATCH"
      ) {
        const input = await readBody(request);
        if (input.action === "confirm") await checkConfirmationRequirements(segments[2]);
        await requireCabPermission(input.action === "payment" ? "finance" : "dispatch");
        const actor=await cabOperationsActor(input.action==="payment"?"finance":"dispatch");
        const booking = await operateBooking(
          segments[2],
          input,
          actor.role,actor.userId,
        );
        await processCabEmails().catch(() => {});
        return privateJson({ booking });
      }
    }
    throw new CabError("Cab endpoint not found.", 404);
  } catch (error) {
    return cabErrorResponse(error);
  }
}
async function handle(request:Request,context:Context) {
  try {
    const parts=(await context.params).path,route=parts.join('/');
    if (request.method === "POST" && parts.length === 2 && parts[0] === "password-reset" && ["request", "validate", "confirm"].includes(parts[1]))
      return handleAdminPasswordReset(request, parts[1] as ResetAction);
    if(request.method!=='GET'&&route!=='payments/razorpay/webhook')requireSameOrigin(request);
    const commercial=await handleCommercialApi(request,parts);if(commercial)return commercial;
    const guest=await handleGuestApi(request,parts);if(guest)return guest;
    const id=parts[0]==='tracking'&&parts.length===2?parts[1]:parts[0]==='bookings'&&parts.length===2?parts[1]:parts[0]==='payments'&&parts[1]==='bookings'?parts[2]:undefined;
    if(id){const sensitive=!(request.method==='GET'&&['tracking','bookings'].includes(parts[0]));const assurance=await guestReadAccess(request,id,sensitive);return await withGuestGrant(id,assurance,()=>legacyHandle(request,context));}
    if(route==='payments/razorpay/verify'){const body=await readBody(request.clone());const assurance=await guestReadAccess(request,String(body.bookingId||''),true);return await withGuestGrant(body.bookingId,assurance,()=>legacyHandle(request,context));}
    return await legacyHandle(request,context);
  } catch(error){return cabErrorResponse(error);}
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
