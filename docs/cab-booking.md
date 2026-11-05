# Sukhadh Holidays cab system — development phase

This extends the existing Next.js App Router website. Customer flow: `/cabs`; private booking tracking: `/cabs/booking/[id]`; protected cab operations: `/admin/cab-operations`. The cab API uses MySQL 8 through one server-only connection pool. No public hosting or deployment is configured by this repository.

## Run locally

1. Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` in the ignored root `.env.development` file.
2. Run `npm install`.
3. Run `npm run db:migrate`. This applies only versioned, additive migrations; it does not drop, reset or recreate the database.
4. Run `node scripts/setup-cab-local.mjs` if cab-admin credentials are missing. It adds unique credentials to ignored `.env.local`, preserves existing values and prints no secrets.
5. Run `npm run dev` and open `http://localhost:3000/cabs` and `/admin/cab-operations`.

The configured database is `sukhad_holidays_website_dev`. Do not point local scripts at a production database. The application defaults to MySQL; only automated tests explicitly set `CAB_STORAGE_MODE=memory`. A MySQL connection or migration failure is reported and never silently falls back to temporary storage.

Cab requests, customer contacts, statuses, quotes, history, payment attempts, email outbox, sessions and rate limits persist in normalized MySQL tables. Booking requests are not confirmations. The new schema starts without company routes, actual fleet inventory, or approved fare policies, so the public flow accepts a vehicle preference and stores a quote enquiry; operations must verify the route, fare and availability. Do not enter invented prices or advertise a vehicle as available.

The general `/admin` workspace is still a local browser-storage demo and is not connected to this database. The separate cab operations workspace remains the only staff interface for the cab API; broader admin work is intentionally deferred. Sign in using the generated operations password. `CAB_SESSION_SECRET` must be at least 32 characters and the password at least 16 characters. The legacy `database/cab-state.sql` is inactive; do not run it.

## Customer workflow

Choose an enabled trip type and an active configured route, or enter locations for a custom quote enquiry. Enter exact addresses, pickup time in IST and passenger count; round trips need a return arrival time, and local rentals need a configured hourly package. Only enabled trip types are shown. New MySQL settings allow one-way, round-trip, airport and custom requests; local hourly rentals stay disabled until a package is approved.

When approved route and fleet configuration exists, search returns route-specific vehicle categories and server-calculated fares. With a fresh database, categories are request preferences only; the system does not claim inventory or invent prices. Server-side checks remain authoritative if data changes after search.

Review the trip, contact details, fare status and booking policy before submission. Full name, valid phone and email are required. A unique booking reference and private URL-fragment access token are generated; only its hash is stored. The database stores the request and its status history. Save the private link yourself; do not put it in public messages.

Flow: REQUESTED → QUOTED → ACCEPTED → CONFIRMED → ASSIGNED → IN_PROGRESS → COMPLETED. Re-quoting invalidates previous acceptance. Confirmation requires the latest accepted quote. Customers can cancel before confirmation; operations can cancel later pre-trip bookings with a reason. Cancellation does not imply refund, and trip completion does not imply payment.

## Routes, fares and inventory

The cab operations interface covers bookings, routes/fares, vehicles, drivers, settings and email previews. It uses the cab API; the general `/admin` site remains a local demo.

The 51 rows from the supplied fare sheet are not migrated into the fresh MySQL schema. Paired values are not interpreted as vehicle/trip prices. Add only business-approved routes, distances and fare policies. Draft/inactive routes never appear as configured bookable routes. Unconfigured routes can only receive a custom quote enquiry.

Route creation supports named endpoints, coordinate inspection/editing, explicit provider lookup, outward/return road distance and duration, billable-distance adjustment, status and notes. The admin preview and customer quote use the same pure service in `src/lib/cab/pricing.ts`.

Fare modes:

- Manual: manual route amount, minimum-fare adjustment if applicable, then configured charges/discount.
- Automatic: base + billable road kilometres × rate + driver allowance × started 24-hour periods, subject to minimum fare.
- Hybrid: an explicitly configured manual component **plus** automatic base/distance/allowance. It is never selected implicitly.
- Hourly: a configured package amount and included hours/kilometres. Estimated extra-kilometre charges apply only if a route distance is supplied. Actual overtime/excess usage is not tracked automatically in this phase.

Round trips use independently resolved outbound and return road legs, not a blindly doubled one-way fare. Each category needs explicit round-trip pricing before activation. For automatic round trips, billable km is the maximum of the configured distance adjustment, minimum km and minimum km/day × started 24-hour periods. A route-level adjustment is outward km; the return leg is added. A policy-level override is total billable km.

An additional fixed charge is configurable and is not hardcoded in public calculations. The fresh MySQL settings have no extra charge or approved fare by default. Tolls may be included, a fixed addition or payable at actuals when configured. Other charges, minimum fare and fixed/percentage discounts are supported. Discounts cannot make totals negative. The final operations quote is explicit and requires customer acceptance.

Vehicle records include category, model, registration, passenger/luggage capacity, amenities, active/operational status, image asset and route restrictions. Existing image assets can be saved. A new image file has a clear local-preview-only interface (JPEG/PNG/WebP, up to 2 MB); no permanent upload is claimed. `image-storage.ts` is the replacement boundary for future object storage.

Drivers have name, contact, private notes, active/on-duty and approval status. Assignment requires registered IDs and checks approval/status, vehicle category/capacity, route restrictions and overlapping booking windows, including the configurable turnaround buffer. On duty does not imply schedule availability. Customer output contains only assigned driver contact and vehicle identification, not internal notes. Unverified/custom routes require an established trip duration before assignment.

Booking filters cover reference/name/phone text, trip type, date, route, booking status and payment state. Dashboard summaries are development-data counts and label on-duty staff separately from schedule availability.

## Routing and location search

`RoadRoutingProvider` is the provider-independent interface in `routing.ts`:

- Default `demo`: explicit pre-defined road-distance fixtures for the isolated memory test mode only. MySQL-backed requests never use demo routes or invented distances. Unknown routes lead to a quote enquiry. No straight-line calculation is presented as road distance.
- `CAB_ROUTING_PROVIDER=osrm` plus server-only `CAB_OSRM_URL` enables an OSRM-compatible provider.
- `CAB_ROUTING_PROVIDER=mapbox` plus server-only `CAB_MAPBOX_TOKEN` enables Mapbox Directions. The existing `MAP_BOX_ACCESS_TOKEN` name is also accepted server-side. Merely having a token does not enable live requests by itself.

Missing coordinates, no-route responses, invalid geometry, provider errors and timeouts fail clearly. A failed live request is never replaced with a guessed/demo distance. Successful road legs are cached in memory for an hour. Leaflet displays map endpoints and returned road geometry; demo fixtures have no pretend road polyline.

Predefined cities and airports work without geocoding credentials. Explicit address searches can use `CAB_GEOCODER_URL` with a hosted/self-hosted Nominatim-compatible service; this is not autocomplete. The public Nominatim endpoint is deliberately not enabled. See https://operations.osmfoundation.org/policies/nominatim/ . Optional public `NEXT_PUBLIC_CAB_TILE_URL` / `NEXT_PUBLIC_CAB_TILE_ATTRIBUTION` configure map tiles. The default OSM tiles retain visible attribution and normal caching; see https://operations.osmfoundation.org/policies/tiles/ . Choose suitable commercial providers before public traffic. Provider secrets never appear in browser configuration.

## Payments

Payment attempts are distinct from booking status and have PENDING, SUCCESSFUL, FAILED and REFUNDED states. A valid confirmed booking with a final outstanding balance can initiate a **mock** order. The customer explicitly simulates success/failure/refund; each page says no money moves and no card/banking details are collected. This is a development tool, not a live checkout.

The server owns amounts/currency, validates state transitions and deduplicates event IDs/ledger entries. Manual test receipts/refunds remain available in admin with unique references, overpayment/refund checks and an activity history.

`payment-signatures.ts` implements Razorpay checkout HMAC (`order_id|payment_id`) and raw-body webhook HMAC checks using constant-time comparison. Prepared callback/webhook routes reject invalid signatures. Even a valid signature does **not** mark a payment paid: live processing intentionally returns 503 until durable transactions, provider fetch/capture/amount checks and the hosting decision are implemented. No live Razorpay order creation or funds movement is enabled. Environment credentials alone cannot turn this on. Future integration must bind callback order IDs to stored attempts, verify captured provider state/amount/currency and handle unique webhook/provider-payment IDs transactionally.

## Hostinger email and safe previews

The intended main authenticated mailbox is `info@sukhadhholidays.in`. `booking@`, `payments@` and `noreply@` are aliases of that mailbox, not independent accounts/passwords. Hostinger documents alias sending through its Mail Web App, not external email apps: https://www.hostinger.com/support/4469114-differences-and-applications-of-catch-all-forwarder-and-email-alias-at-hostinger/ . Accordingly SMTP uses the authenticated mailbox as From, not an unverified alias sender. `MAIL_FROM` does not override this policy. Aliases can receive admin notifications; Reply-To is the main mailbox. Confirm the actual hosting/email plan before enabling delivery.

Reusable escaped HTML/plain-text templates cover request received, confirmation, status change, assignment, payment success/failure and new-booking admin notification. HTML previews are sandboxed. Templates are separate from business actions; queue entries are added with those actions and deduplicated. Delivery failures never roll back a booking or payment. Console logs contain notification IDs/status, not SMTP passwords or customer addresses. Failed/ambiguous SMTP results are not automatically resent; SMTP cannot guarantee exactly-once delivery after a crash.

Default: `CAB_EMAIL_MODE=preview`. Templates and delivery statuses are visible in Email previews; **no SMTP connection or real message** occurs even if SMTP credentials already exist. To deliberately test delivery later, all three are required: `CAB_EMAIL_MODE=smtp`, `CAB_ALLOW_MOCK_EMAIL_SEND=true`, and the relevant customer/admin preference enabled in Settings. This can send real messages from development actions; do not enable it casually. Use SMTP_HOST, SMTP_PORT (465 TLS or 587 STARTTLS), SMTP_USER (the real mailbox), SMTP_PASS and optionally BOOKING_EMAIL (default booking alias). Existing environment values are preserved and never displayed in admin. No WhatsApp notification channel is used.

## Security and launch limits

Protected cab operations use the generated password and an eight-hour signed HttpOnly session with MySQL-backed revocation and rate limiting, same-origin mutation checks, streamed request size limits and Zod validation. Rotate CAB_SESSION_SECRET to invalidate sessions. The testing-only CAB_ALLOW_LOCAL_STORAGE flag permits HTTP test cookies; do not use it on public hosting. A trusted reverse proxy must overwrite forwarded-for headers for meaningful IP limits. The repository snapshots and serializes cab writes under one MySQL lock, intended for low-volume rollout; replace full snapshots with focused transactions before significant traffic. Individual staff accounts/MFA, audit actor attribution, retention, backups and customer recovery remain outstanding.

## Verification and delivery

Run `npm run db:migrate`, `npm run typecheck`, `npm run lint`, `npm run build`, then `npm run test:cabs`. Add `-- --browser` for installed Chrome/Edge browser coverage (`CAB_TEST_CHROME` can select its executable). Cab tests use generated credentials, fictional travellers, an isolated local server on port 3116, forced email-preview mode and explicit memory storage; they do not write into the configured database. Reports/screenshots are under `artifacts/cab-system/`.

Not ready for public production: approved routes/rates/capacities and actual fleet records, online payment settlement/refunds, production-verified email delivery, routing/geocoding provider SLA, admin accounts/MFA, audit actor attribution, database backups/recovery, privacy retention and final booking/cancellation policies. The local MySQL integration is active, but production hosting, credentials, migration deployment and backups have not been verified. See `docs/cab-architecture.md`.
