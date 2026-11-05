import { cookies } from "next/headers";
import {
  adminConfigured,
  cabErrorResponse,
  CabError,
  equal,
  hasCabAdmin,
  issueAdminSession,
  limitRequest,
  privateJson,
  readBody,
  readRawBody,
  registerCabSession,
  revokeCabSession,
  requireCabAdmin,
  requireSameOrigin,
} from "@/lib/cab/security";
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
  validatePreparedRazorpayCallback,
  validatePreparedRazorpayWebhook,
} from "@/lib/cab/payments";
import { routingProvider } from "@/lib/cab/routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
const token = (request: Request) =>
  request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
async function handle(request: Request, context: Context) {
  try {
    const segments = (await context.params).path;
    const route = segments.join("/");
    const method = request.method;
    if (route === "payments/razorpay/webhook" && method === "POST") {
      validatePreparedRazorpayWebhook(
        await readRawBody(request),
        request.headers.get("x-razorpay-signature") || "",
      );
    }
    if (method !== "GET") requireSameOrigin(request);
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
      validatePreparedRazorpayCallback(await readBody(request));
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
        authorizeBooking(getBooking(state, id), token(request));
        return privateJson({
          attempts: state.operations.paymentAttempts.filter(
            (p) => p.bookingId === id,
          ),
          configuration: paymentConfiguration(),
        });
      }
      const body = await readBody(request);
      if (method === "POST")
        return privateJson(
          { attempt: await initiateCabPayment(id, token(request)) },
          201,
        );
      if (method === "PATCH") {
        const attempt = await simulateCabPayment(id, token(request), body);
        await processCabEmails();
        return privateJson({ attempt });
      }
    }
    if (route === "session" && method === "GET") {
      return privateJson({
        authenticated: await hasCabAdmin(),
        configured: adminConfigured(),
        storage: cabStorageMode(),
      });
    }
    if (route === "session" && method === "POST") {
      if (!adminConfigured())
        throw new CabError(
          "Cab operations access is not configured. Follow docs/cab-booking.md to set the server password and secret.",
          503,
        );
      await limitRequest(request, "login", 8, 15 * 60000);
      const body = await readBody(request);
      if (
        typeof body.password !== "string" ||
        !equal(body.password, process.env.CAB_ADMIN_PASSWORD!)
      )
        throw new CabError("Incorrect operations password.", 401);
      const session = issueAdminSession();
      await registerCabSession(session);
      (await cookies()).set("cab_ops_session", session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 8 * 3600,
      });
      return privateJson({ authenticated: true });
    }
    if (route === "session" && method === "DELETE") {
      await revokeCabSession(
        (await cookies()).get("cab_ops_session")?.value || "",
      );
      (await cookies()).delete("cab_ops_session");
      return privateJson({ authenticated: false });
    }
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
        authorizeBooking(b, token(request));
        return privateJson({ booking: publicBooking(b) });
      }
      if (method === "PATCH") {
        await limitRequest(request, "customer-actions", 15);
        const body = await readBody(request);
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
          integrations: {
            email: emailConfiguration(),
            payments: paymentConfiguration(),
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
            return state.config;
          }),
        });
      }
      if (
        segments[1] === "bookings" &&
        segments.length === 3 &&
        method === "PATCH"
      ) {
        const booking = await operateBooking(
          segments[2],
          await readBody(request),
        );
        await processCabEmails();
        return privateJson({ booking });
      }
    }
    throw new CabError("Cab endpoint not found.", 404);
  } catch (error) {
    return cabErrorResponse(error);
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
