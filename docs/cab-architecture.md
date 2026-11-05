# Cab architecture and MySQL persistence

The existing Next.js App Router / React / TypeScript stack uses MySQL 8 through `mysql2/promise`. Root `DB_*` environment variables are server-only. Public cab APIs fail explicitly if MySQL is unavailable; they do not fall back to memory.

## Boundaries

- Customer and operations components call `/api/cab/*` through `client.ts`.
- Route handlers authorize and validate input, then invoke domain services. They do not access a database directly.
- `pricing.ts` is a pure fare calculator shared by customer quotes and admin previews.
- `routing.ts` defines `RoadRoutingProvider`: demo, OSRM and Mapbox adapters. `maps.ts` retains place validation/geocoding and invokes that interface for road legs.
- `assignments.ts` validates registered fleet/driver compatibility and overlapping schedules.
- `service.ts` owns quote acceptance, booking states and manual ledger rules.
- `payments.ts` owns mock payment attempts; `payment-signatures.ts` prepares Razorpay verification. Live settlement is deliberately disabled.
- `email-templates.ts` is pure rendering; `notifications.ts` separates the transactional outbox from SMTP delivery. Preview is the safe default.
- `image-storage.ts` is the preview/upload boundary, with no permanent upload in this phase.
- `repository.ts` exposes a typed `CabRepository` snapshot/read + atomic transaction contract. The MySQL adapter maps bookings, customers, history, payments, routes, rates, vehicles, drivers, settings, sessions, rate limits and notifications to separate tables. Booking creation, idempotency, status events and notification outbox are committed in one transaction. Automated tests opt into the memory adapter explicitly.
- `src/lib/db.ts` owns the single lazy server-only connection pool. `src/config/database.js` is only a compatibility re-export and does not create another pool.
- `database/migrations/` contains additive versioned SQL. Run `npm run db:migrate`; no migration drops or recreates existing tables.

The repository currently reads a consistent snapshot and serializes writes under one MySQL lock to preserve the existing domain transaction contract. It does not put the business state in one JSON column, but is intended only for low-volume rollout; replace full snapshots with focused queries/transactions before significant traffic. API DTOs and fare calculators remain independent from SQL.

## Database entities

The additive migration creates `users`, `customers`, `cab_categories`, `vehicles`, `drivers`, `cab_routes`, `fare_configurations`, `bookings`, `booking_passengers`, `booking_status_history`, `payments`, `payment_attempts`, `cab_enquiries`, `notifications`, `reviews`, `website_settings`, `cab_admin_sessions`, `cab_rate_limits` and the repository lock. Foreign keys and indexes protect booking/customer/route/category relationships and idempotency keys.

## Integrity and launch boundaries

- Booking creation enforces unique request keys and stores customer, booking, lead passenger, status history and quote enquiry atomically. Access tokens are stored only as SHA-256 hashes.
- Approved rates and route distances are not seeded. A fresh database accepts request-only bookings with price and availability pending operations confirmation; development route/fare fixtures are not used in MySQL mode.
- The general `/admin` workspace remains browser-local and is not part of this MySQL integration. Cab operations APIs share the persistent cab repository; the admin product itself will be addressed in the next phase.
- Live Razorpay settlement, SMTP delivery, backup/recovery, production deployment, staff accounts/MFA and business-approved booking policies remain unverified.
