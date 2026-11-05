# Phase C: Holiday discovery and package experience

Implemented only holiday routes, holiday components, and holiday-specific data/assets. Shared navigation, authentication, buttons, homepage, flights, bus, cabs and taxi were not edited.

## Files
- src/app/holidays/page.tsx
- src/app/holidays/[slug]/page.tsx
- src/components/holidays/HolidayDiscovery.tsx
- src/components/holidays/HolidayDetail.tsx
- src/components/holidays/holidays.css
- src/data/holidayDestinations.ts
- src/data/demoHolidayPackages.ts
- src/data/holidayPhotoCredits.json
- src/types/holidays.ts
- scripts/check-holidays.mjs
- public/images/holidays/*.webp (15 optimised photographs)

## Experience
Editorial discovery header; animated India/World switch; local destination/package search; seven selectable travel moods; asymmetric desktop destination mosaic; horizontal mobile discovery; destination listings with duration, budget, style and sorting; varied package images; package galleries with lightbox and mobile scrolling; compact facts; proposed itinerary timelines; data-backed inclusion/exclusion sections; sticky desktop enquiry form; mobile CTA and native dialog; form validation; demo success reference; photo credits; reduced-motion support.

## Demo content and existing data
16 discovery destinations and four added demo packages (Ayodhya River & Rituals, Goa Slow Escape, Dubai Slow Escape, Bali Slow Escape). All composed holiday records use isDemo: true. Three original packages remain with their original data and prices on request; illustrative itineraries are supplied separately. No inclusions are invented for the original packages. Added demo package inclusions are defined in their separate typed demo data.

## Preserved routes
All original destination and package slugs remain reachable. Destination slugs now show package listings; package slugs show details. /holidays/ayodhya and /holidays/ayodhya-essentials are distinct discovery and detail pages.

## Verification
- next typegen: passed
- tsc --noEmit: passed
- npm run lint: passed
- npm run build: passed
- Chrome rendering inspected at desktop and mobile widths 360, 375, 390 and 430.
- 15 viewport/holiday-route combinations checked: no page overflow or broken images.
- India/World, search, moods, duration filter, enquiry submission/success, gallery, dialog keyboard focus, Escape dismissal, mobile gallery scrolling and reduced motion passed.
- /, /flights, /bus, /cabs, /taxi and original/new package detail URLs return HTTP 200.
- Screenshots are stored in artifacts/holidays-*.png; browser interaction results in artifacts/holiday-browser-report.json.

## Limitations
No delivery backend exists. Enquiry submission is explicitly a local demo, with no saved personal information, booking or payment. Existing contact enquiry links are retained. Prices are illustrative INR amounts, and final services and availability need confirmation. Discovery destinations without a configured package offer an enquiry rather than fictional inventory.
