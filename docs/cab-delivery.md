# Cab development-phase delivery

## Current database update

The public cab path now uses a normalized MySQL 8 schema and a server-only pool. Run `npm run db:migrate` to apply the additive migration to the configured development database. The repository keeps booking requests, customer data, status history, quotes, payment records/attempts, notification outbox, sessions and rate limits in SQL tables. The current public booking is a request until business routes, fare policies, inventory and availability are configured. The earlier development-mock descriptions below are historical where they conflict with this update.

## Implemented

The existing Next.js App Router cab module was extended in place. No second framework, production database, hosting account or deployment was introduced. Earlier `.cab-data` files and unrelated travel/demo modules remain untouched.

- Configuration-driven one-way, round-trip and airport flow; local/hourly and configured custom trip types can be enabled in Settings. Client/server validation, registered route selection, custom quote enquiries, category/model/capacity/luggage/amenity cards, shared fare breakdown and final contact/trip review.
- Manual, automatic, explicit hybrid and hourly pricing. Configurable ₹250 default fixed charge, route/category distance adjustments, minimum fares/km/day, driver allowance, toll handling, extra charges and fixed/percentage discounts. Explicit round-trip policies and independent road legs.
- Provider-independent demo/OSRM/Mapbox road-routing adapters, validation, cache, errors/timeouts and no guessed-distance fallback. Predefined points remain usable without credentials. External geocoding still needs a configured provider.
- Protected cab workspace with dashboard, booking search/status/date/route/trip/payment filters, quote/customer-acceptance transitions, registered assignments, route/fare CRUD/status workflow, driver/vehicle management and settings.
- Secure booking references/private tokens, idempotent submissions, atomic mock repository changes, session revocation, same-origin authorization and sensitive endpoint limits.
- Separate mock payment orders and pending/success/failed/refunded states, manual test ledger and duplicate protections. Razorpay signature/webhook verification structure, with live settlement deliberately disabled.
- Seven branded escaped HTML/plain-text email templates, transactional preview outbox, sandboxed previews, safe delivery logs and gated Nodemailer/Hostinger SMTP adapter. No real emails are sent by default; no WhatsApp notification integration.
- Existing asset selection and a clearly labelled local image preview adapter, without pretending that files were permanently uploaded.

## Relevant file changes

| Area | Files |
| --- | --- |
| Domain / development data | `src/lib/cab/types.ts`, `models.ts`, `development.ts`, `validation.ts`, `operations-validation.ts` |
| Repository boundary | `src/lib/cab/repository.ts`, `store.ts` |
| Shared services | `src/lib/cab/pricing.ts`, `routing.ts`, `maps.ts`, `operations.ts`, `assignments.ts`, `service.ts`, `security.ts` |
| Payments / emails / images | `src/lib/cab/payments.ts`, `payment-signatures.ts`, `email-templates.ts`, `notifications.ts`, `image-storage.ts` |
| Existing API extension | `src/app/api/cab/[...path]/route.ts` |
| Customer UI | `src/components/cabs/CabBookingFlow.tsx`, `CabBookingStatus.tsx`, `CabPaymentPanel.tsx`, `CabMap.tsx` |
| Cab operations UI | `src/components/cabs/CabOperations.tsx`, `CabOperationsWorkspace.tsx`, `CabManagement.tsx`, `src/app/admin/cab-operations/page.tsx` |
| Styling and accurate development notices | `src/components/cabs/cab-live.css`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` |
| Test / project integration | `scripts/check-cab-system.mjs`, `check-cab-system-browser.mjs`, `cab-test-loader.mjs`, `package.json`, lockfile, `.gitignore`, `eslint.config.mjs` |
| Documentation | `README.md`, `docs/cab-booking.md`, `cab-architecture.md`, `cab-environment.example`, this delivery note |

ESLint now ignores generated headless-browser profile directories; it still checks the application and regression scripts. Nodemailer and its types were the only new application integration dependencies. The Next.js/React stack was retained.

## Run and validate

```sh
npm install
node scripts/setup-cab-local.mjs
npm run dev
```

Open `http://localhost:3000/cabs` and `http://localhost:3000/admin/cab-operations`. The setup script preserves existing local credentials; retrieve CAB_ADMIN_PASSWORD from the ignored `.env.local` privately. No public/default password exists.

```sh
npm run lint
npm run typecheck
npm run build
npm run test:cabs -- --browser
```

The isolated test server uses port 3116, generated credentials, fictional data, demo routing, forced email-preview mode and no PostgreSQL/Supabase credentials. See `artifacts/cab-system/verification.json` for the actual completed checks and `artifacts/cab-system/` for screenshots. Browser coverage includes customer-to-admin booking, quote acceptance, confirmation/assignment, manual receipts, mock payment failure/success/refund, all management tabs, fare preview and sandboxed email rendering at mobile/tablet/desktop widths. Browser profiles are ignored and not application source.

## Intentionally incomplete integrations

The local database is now persistent, but production deployment, database backups/recovery, final business routes and rates, and a production-scale query model are not configured. Do not use category preferences as evidence of actual fleet inventory. The 51 client fare-sheet rows remain unpublished; paired amounts need business clarification before importing approved rates.

Live Razorpay order creation/provider capture/settlement/refunds and durable webhook transactions are not enabled; valid signatures alone never mark a real payment successful. SMTP delivery/alias sending is not live-verified; Hostinger SMTP uses the authenticated main mailbox, with aliases treated as destinations rather than independent sender accounts. SMTP credentials alone do not send messages. Permanent image storage, production routing-provider accounts/SLA, individual staff accounts/MFA, multi-instance persistent sessions/rate limits, retention/backups, customer recovery and final client policies remain future work.

Follow `docs/cab-architecture.md` for the current MySQL repository boundaries. Keep live email/payment delivery disabled until credentials, provider policy and client-approved operating rules are verified.
