# Sukhad Holidays — travel operations demo

Open `/admin`. Without a local demo session, the client boundary takes you to `/admin/login`. Choose a role and enter the workspace. This is explicitly a UI demo boundary, not secure authentication.

## Files and architecture

- `src/app/admin/layout.tsx`, `page.tsx`, `admin.css`: dedicated workspace layout, dashboard and scoped design system.
- `src/app/admin/*/page.tsx` and `*/[id]/page.tsx`: operations modules and record detail screens.
- `src/components/admin/`: shared shell, provider, dashboard/reports, schema-driven module tables/forms, accessible dialogs, assignment workflow, itinerary builder and customer preview.
- `src/types/admin.ts`: entity models, repository contracts, status unions and role permissions.
- `src/data/admin/seed.ts`, `config.ts`, `offers.ts`: central fictional fixtures, module schemas and typed promotions.
- `src/lib/admin/repository.ts`: versioned local mock repository, public offer selection and financial calculations.
- `src/components/layout/WebsiteShell.tsx`: separates the public shell from the admin layout.
- `src/components/home/OfferNotification.tsx` and `.module.css`: single promotion queue shared with admin-managed offers.
- `src/app/itinerary-demo/[id]/page.tsx`: public rendering of the same customer itinerary component used in admin preview.

## Routes

Dashboard `/admin`; `/admin/login`; bookings, enquiries, trips, itineraries, customers, drivers, vehicles, packages, destinations, hotels, flights, bus, cabs, custom-routes, offers, payments, documents, reviews, reports, users, settings and activity under `/admin/`.

All record modules have detail routes. Itineraries use a dedicated studio with `?booking=`, `?preview=` and `?new=1`.

## Workflows

- Create/edit/search/filter/page/export records. Packages support duplicate, publish/unpublish and archive. Reviews begin empty and require consent before publication.
- Quote an enquiry, record customer confirmation, then convert once into a pending booking.
- Assignment validates availability, trip dates, capacity and conflicting assignments. Assigning creates the corresponding trip. Cancellation retains history and releases fleet resources.
- Payments are manual records; booking balances derive from non-pending, non-refunded receipts. Pending balance is calculated per active booking so cancelled receipts do not reduce another booking's balance.
- Documents accept PDF, JPEG, PNG, WebP and text up to 2 MB. Local previews are sandboxed. Downloads use local browser data, not remote storage.
- Itineraries support editable day details and activities, drag-and-drop day ordering, keyboard reorder arrows, deletion, saved drafts and customer preview.
- Homepage offers use active/date eligibility and rotation order, one visible card, configurable display duration, a 1.5-second gap, hover/focus pause, session dismissal, reduced motion and protected-control avoidance.

## Demo limitations and integration

Records and uploaded files live in `localStorage` under `sukhad-operations-demo-v1`; session role and offer dismissal use `sessionStorage`. Changes are confined to the same browser and origin. Browser storage quotas apply; memory-only fallback is labelled. Never use these stores for sensitive production traveller documents.

Offers are wired to the homepage in the same browser, including cross-tab updates. Other public content retains its existing approved local sources. There is no shared database, supplier inventory, authentication provider, payment gateway, notification delivery, remote document storage or live availability. Invoice actions generate a clearly labelled printable demo preview only.

For production, replace the mock repository with API-backed services and server-side validation; add authenticated sessions, enforce roles on the server, create an immutable audit log and integrate durable document storage. The DRIVER demo role filters trips to its selected driver profile, but client checks are not a security mechanism.

## Validation

Run `npx next typegen`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

Browser regression scripts: `scripts/check-admin.mjs` and `scripts/check-admin-notifications.mjs`. They use a running dev server on port 3000 and an isolated Chrome debugging endpoint on port 9224. They modify the isolated browser's demo records. Results/screenshots are under `artifacts/admin/`.

The route suite checks all operations modules, booking/driver detail, public routes and the existing `/taxi` 308 redirect to `/cabs`. Core admin layouts and notifications are exercised at 360, 375, 390, 430, 768, 1024, 1280 and 1440 pixels.
