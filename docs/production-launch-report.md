# Sukhd Holidays production launch report

Audit date: 5 November 2026 (Asia/Kolkata).

## Current outcome

Repository production preparation and local production-server/MySQL tests completed. **Not deployed; no verified live URL.** No production database, hosting resource, DNS entry or SSL configuration has been changed. Production migration approval has not been given. Existing working tree already contained substantial application changes; these have been preserved. No admin dashboard was built.

## Repository audit

| Area | Finding / action |
| --- | --- |
| Framework | Existing Next.js 16.4.3 / React 19.2.8, TypeScript, Tailwind; installed Next.js deployment and route-handler guides read before edits. |
| Runtime | Next.js needs Node >=20.9; target now Node 22.x in package engines and .nvmrc. Local host runs Node 20.20.0; Node 22 validation still required on Hostinger. |
| Build | Keep npm ci, npm run build, npm start. Node server required; static export cannot serve booking APIs. No custom server needed. |
| API | Fixed a discovered search payload mismatch that rejected valid customer searches with 400. src/app/api/cab/[...path]/route.ts handles catalogue, journey preparation, creation, lookup, cancellation, operations and prepared payment integrations. Node runtime, dynamic handlers, same-origin writes and private no-store responses. |
| Database | mysql2/promise, server-only shared pool; now five connections per process, queue capped at 25, ten-second connect timeout, optional certificate-verified TLS. Budget total connections across all app processes. |
| Persistence | MySQL default; production now rejects memory mode. Existing transactions serialize state changes through cab_state_lock and preserve idempotency. Parameterized values and unique request_key constraint retained. |
| Scale | Adapter reads all bookings and rewrites state on transactions, including rate limiting. Appropriate only after low-volume load testing; growth requires targeted repository queries. No high-concurrency capacity claim made. |
| Migrations | Existing 001 unchanged; additive CREATE IF NOT EXISTS and INSERT IGNORE only. New offline review, explicit apply, exact production DB approval and backup-reference gates, database advisory lock and read-only schema verifier. |
| Cab requests | No configured fare or fleet seeded into production. Category choice is a preference; status stored as REQUESTED and shown as Pending Review. No auto-confirmation or driver assignment. Unconfigured fare says Fare will be shared after confirmation. |
| Fare/fleet configuration | Existing cab_routes, fare_configurations, vehicles, drivers and website_settings plus validation support later approved configuration. Do not copy development fixtures. Verify any pre-existing live configuration before enabling public access. |
| Notifications | Existing persisted email outbox retained. New CAB_EMAIL_SEND_ENABLED live opt-in; mock opt-in only accepted for development storage. Existing settings.notifications customer/admin preferences must also be enabled. SMTP failures do not undo saved public requests or cancellations. No email delivery was attempted or claimed. |
| WhatsApp | Existing click-to-chat utility uses public NEXT_PUBLIC_WHATSAPP_PHONE. It does not send automatic acknowledgements. Automated WhatsApp Business API delivery is not connected and requires provider credentials, approved templates and separate integration before claiming delivery. |
| Storage | Public images bundled in public/ and app icon present. Cab image upload is explicitly a browser-only development preview; no durable public upload requirement in cab request flow. Existing admin document/demo storage is not production document storage. |
| Authentication | Real cab operations API uses signed, expiring, persisted session hashes, HttpOnly cookies, password and secret length checks. Production cookies now always Secure. Older browser-storage demo admin remains a demo and must not be used for real customer operations. |
| Privacy | Bearer capability hash protects booking detail endpoints; reference alone is insufficient. Access token stays in URL fragment and Authorization header. Keep full links private. No public booking-list endpoint. |
| Abuse prevention | Existing database-backed rate limits; added private lookup limit. Proxy must overwrite client-supplied X-Forwarded-For. Verify Hostinger behavior; add edge limiting if this cannot be guaranteed. |
| HTTP / logging | nosniff, DENY framing, no-referrer, disabled powered-by, limited browser capabilities. Safe JSON error events omit SQL/customer payloads. New /api/health returns only ok or unavailable; database lock check and no-store. |
| Public UI | Existing design preserved. Cab request wording clarified, pending-review label added, production terms/privacy no longer claim database records reset at restart. Final retention/contact/cancellation business policies still need owner approval. |
| SEO / assets | Existing metadata and app icon retained; metadataBase derives from CAB_SITE_ORIGIN. Supply real HTTPS origin at build and runtime. No invented domain or canonical URL. |
| Secrets | Local environment files ignored; no tracked environment/key file paths found in 21-commit history. Five known local secret values checked: zero matches in browser bundle files or commit diffs. This targeted scan cannot certify absence of every unknown credential. |

## Hostinger compatibility

User identified hosting only as ?web hosting?; exact tier/account capabilities are **not verified**. Integration discovery found Hostinger Mail, not a hosting-management connector. No SSH destination, authenticated hosting session or domain supplied.

Official sources checked:
- https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- https://www.hostinger.com/support/how-to-select-the-node-js-version-for-your-application/
- https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/
- https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/

Hostinger currently documents managed Node apps on Business/Unlimited and Cloud plans with Next.js support and GitHub/ZIP deployment. Supported version choices include 22.x. If current plan lacks Node.js Apps, ask for the incremental cost of the lowest compatible Business Node plan first; no purchase authorized. VPS is only needed if required capabilities cannot be supplied by managed Node hosting. Exact cheapest option depends on the account's region, renewal and upgrade quote.

| Capability | Required for launch | Verification |
| --- | --- | --- |
| Node 22, persistent Next.js server, SSR, API routes | Yes | Documented platform support; verify actual plan and deployment settings. |
| MySQL 8 TCP connectivity | Yes | Verify database engine/version and actual host from inside deployed app. Current Hostinger same-host guide specifies 127.0.0.1; use only if applicable to this account. Remote access uses account-provided remote host and allowlist. |
| Environment variables | Yes | Supported deployment settings; configure without uploading local env files. |
| GitHub import or ZIP | Yes, one method | Documented; no remote push or upload performed. |
| SSH | Helpful for reviewed migration | Account access unverified. If unavailable, arrange approved migration via phpMyAdmin or an authorized external migration runner. |
| Workers / cron | No core cab dependency | Optional outbox recovery/backup scheduling needs separate plan verification. Do not assume persistent workers. |
| WebSockets | No | No public booking dependency found. |
| Persistent uploads | No for public cab request | Admin previews are not durable storage. |
| Domain / HTTPS | Yes | Domain not supplied; DNS and certificate not verified. |

## Migration review ? approval required before production execution

File: database/migrations/001_public_cab_schema.sql
SHA-256: bfda2aa2b48781922b89f5c75ba535e162265d6af26572e03a89f68506fdb718
21 additive statements create 19 application tables if absent, insert the serialization lock and six request categories if absent. Runner also creates schema_migrations (20 tables on a fresh database). No fares, drivers, vehicles, customer test records or routes seeded. Existing rows preserved. IF NOT EXISTS does not repair incompatible existing tables; run db:verify and inspect drift before opening public traffic. MySQL DDL auto-commits; partial failures require inspection, not a claim of transactional rollback.

Before approval: record actual production name/host/MySQL version, take a consistent backup including routines/triggers as applicable, verify backup readability and test restoration into a separate database. On a new empty DB, record verified empty-state backup/provisioning evidence. Save backup outside the web root with restricted access and encryption. Record migration hash and approved target. Use a dedicated migration account for DDL, then remove DDL grants; runtime account needs only schema-scoped SELECT/INSERT/UPDATE/DELETE. No DROP privileges required. Use provider-supported grants; do not widen grants to global privileges.

After explicit approval only, in a controlled runner with production environment already set:

~~~text
npm run db:review
npm run db:migrate -- --production --apply
npm run db:verify -- --production
~~~

Set CAB_MIGRATION_APPROVED_DB to the exact approved DB name and CAB_BACKUP_REFERENCE to the verified backup identifier for the apply command only. Remove those values afterward. Never include migration in build/start or automatic Git deploy hooks. No production migration has been executed.

## Validation performed

- TypeScript check: passed.
- ESLint: passed.
- Production build: passed; 65 static generation entries and dynamic cab/health routes.
- Read-only local MySQL 8 schema check: passed for 19 required application tables, required columns, named indexes, foreign keys, migration 001, enabled categories and serialization lock.
- Local MySQL service test: passed unconfigured fare, invalid passenger details, creation, idempotency, changed-payload conflict rejection, private token enforcement, persisted cancellation. Controlled cancelled record retained: SH-CAB-1C9CA1A3DFFD2A81B016ECA0.
- Local production HTTP server: passed homepage, about, contact, cabs, taxi, flights, bus, holidays, sample holiday detail, custom routes, privacy, terms and favicon; security headers; MySQL health; journey search with unconfigured fares; invalid customer; booking POST; duplicate; unauthorized lookup; authorized lookup; confirmation route; cancellation; cross-origin rejection; unauthenticated admin rejection; independent MySQL persistence check. Controlled cancelled record retained: SH-CAB-38A77CAA2DEE4DAE01AFEC0E.
- Durable HTTP evidence: docs/production-local-test-results.json.
- Production connectivity, production migration, live workflow, HTTPS, DNS and public URL: not run; access/approval absent.
- Headless Chrome browser regression: passed request submission, acknowledgement, quote/acceptance and operational transitions in isolated development storage; responsive checks at 360, 390, 768 and 1440 pixels; zero recorded runtime exceptions. This verifies browser UI in development, independently of production/MySQL HTTP tests. Live host/mobile-browser QA remains required.
- Existing cab regression suite: 17 check groups passed after fixing the public search payload mismatch, covering fare configuration, routing, idempotency, email previews, authorization, cancellation/quote transitions and disabled live payment behavior. Legacy development fixture scripts now launch next dev because production intentionally blocks in-memory bookings. New production-local test uses next start and MySQL.

## Environment

See docs/production-environment.example. Required: NODE_ENV=production, CAB_STORAGE_MODE=mysql, CAB_SITE_ORIGIN=https://real-domain, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD. Optional DB_SSL/DB_SSL_CA for TLS; optional CAB_ADMIN_PASSWORD/CAB_SESSION_SECRET to enable existing secure operations access. Secret also required if optional external geocoding enabled. Optional SMTP and notification opt-ins, business recipient mailbox, public WhatsApp number. No payment provider needed for request-only launch; leave prepared payment secrets unset.

## Exact launch steps / owner actions

1. In hPanel, provide exact plan name, intended domain and whether Add website ? Node.js Apps exists. Confirm Node 22 and MySQL 8 availability. Do not share passwords in chat; set secrets in hPanel or an approved local secret channel.
2. Provide authorized hosting access through an available secure connection, or perform hPanel actions below. No purchase, external configuration or production migration is authorized yet.
3. After approval, create/select a separate prefixed production database and dedicated user. Do not reuse sukhad_holidays_website_dev or copy local data. Confirm actual connection host from the deployment environment; 127.0.0.1 is acceptable only for Hostinger's documented internal topology.
4. Record and approve the migration review above and a verified backup. Execute controlled migration and schema verification using production environment, never .env.development. If using phpMyAdmin for migration SQL, review all statements first and arrange ledger recording/schema verification with a controlled runner before launch.
5. Prepare clean deployment source from repository root. Include src, public, database, scripts, package.json, package-lock.json, next.config.ts, tsconfig.json, eslint/postcss config and generated Next type support as needed. Exclude .env*, .git, .next, node_modules, artifacts, screenshots, local data, backups and test output containing customer information. Run npm ci on the Linux host; do not upload Windows node_modules. Review existing uncommitted work before creating/pushing a release commit.
6. After external-change approval, choose Node.js Apps ? GitHub import or ZIP ? Next.js ? Node 22 ? npm ci / npm run build / npm start as applicable to hPanel's detected settings. Use platform PORT, do not hardcode it. Configure secrets and origin at build/runtime. Do not choose static export. Do not start using next dev or run migrations in build.
7. Start/restart the app. Check /api/health returns 200 and {status:ok}; run db:verify from the authorized production environment. Health intentionally does not expose host, credentials, customer data or stack traces.
8. After DNS approval, follow Hostinger's app-specific domain target; preserve mail MX/TXT entries and unrelated records. Enable/verify SSL and HTTPS redirect. Test apex/www and select one canonical origin; redirect the other before booking requests. Check proxy IP header overwrite behavior, then apply appropriate edge limits. Enable HSTS at the HTTPS proxy after SSL is verified; do not guess DNS IPs or force HSTS on an unverified domain.
9. With owner-approved controlled production test details, submit a uniquely tagged real request through live UI, verify exact production row, retry same request, check invalid inputs/private access/cancellation and mobile form. Confirm fare null, Pending Review, no fake driver, no emails claimed. Retain a cancelled tagged test unless owner approves cleanup of precisely identified test records; never remove real customer records.
10. Configure notifications only after verifying mailbox ownership/SMTP TLS and approved business recipient, enable settings.notifications and CAB_EMAIL_SEND_ENABLED, then confirm actual provider delivery. Booking page remains primary acknowledgement. No automatic WhatsApp delivery without separate provider setup.
11. Set automated encrypted database backups at a frequency matching acceptable data loss (proposed daily plus before migrations), verify retention with owner and run restore drills. Monitor health failures, safe application error events, host resource limits and failed/sending outbox entries. Reconcile ambiguous email delivery before manual retry. Roll back code to last known release on failure; preserve additive schema and customer rows.
12. Approve final business privacy/retention/contact/cancellation wording, confirm who monitors requests and return contact time, then open public traffic after live verification.

## Deployment source artifact

artifacts/production-deployment/sukhd-holidays-source.zip contains the app/public source, build configuration, lockfile and reviewed migration utilities. It excludes .env files, dependencies, build output, Git history, customer/test artifacts and backups. Archive inspection: 311 entries; zero forbidden environment/dependency/Git/customer-artifact paths; SHA-256 bdeb1cbe7a66837dc0754aaac18e2717c5b1d7a9c88508bed0c0c131eb5e0977. This is an upload candidate, not a deployment; build on Hostinger after access and approval.

## Files changed in this task

- next.config.ts: HTTP headers and powered-by suppression.
- package.json, package-lock.json, .nvmrc: Node 22 target and review/verification/test commands.
- src/lib/db.ts: bounded pool, timeout and optional verified TLS.
- src/lib/cab/store.ts: production MySQL enforcement.
- src/lib/cab/security.ts: safe error events.
- src/lib/cab/notifications.ts: explicit live send opt-in distinct from mock send setting.
- src/app/api/cab/[...path]/route.ts: lookup rate limit, notification isolation for public request/cancellation and secure cookies.
- src/app/api/health/route.ts: new database-backed health endpoint.
- src/components/cabs/CabBookingFlow.tsx, CabBookingStatus.tsx: request/fare/status copy.
- src/app/cabs/page.tsx, src/app/layout.tsx, src/app/privacy/page.tsx, src/app/terms/page.tsx: metadata and accurate storage disclosures.
- scripts/db-migrate.mjs: guarded additive execution/offline review.
- scripts/db-environment.mjs, db-verify.mjs: safe environment selection and read-only verification.
- scripts/check-cab-mysql.mjs, check-production-local.mjs: controlled dev-database workflow tests.
- scripts/check-cab-system.mjs, check-cab-live.mjs: keep mock tests in development runtime. scripts/check-cab-system-browser.mjs: align stale acknowledgement assertion with current request/pending-review UI.
- docs/production-environment.example, production-launch-report.md, production-local-test-results.json: launch configuration, audit and evidence.

## Remaining blockers

Exact hosting tier/capabilities; authorized hosting access; production DB and secrets; explicit migration/backup approval; domain/DNS/SSL approval and actual configuration; Node 22 host verification; live-host mobile/browser QA; final business policies and request-monitoring owner; production load/proxy checks; live public-URL/end-to-end verification. Optional email and WhatsApp delivery remain unverified and are not required to save requests.
