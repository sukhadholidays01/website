# Sukhad Holidays — Phase F handoff

The approved homepage layout and the existing flight, holiday, bus and cab workflows have been retained. Custom Routes is now the fifth service in desktop navigation, mobile navigation and the footer. The logo remains the home link.

## Implementation

- Custom Routes: a multi-stop planner with add/remove and up/down controls, up to eight stops, start/end dates, 1–50 travellers, travel styles, an animated visual route, approximately one-second build animation, inclusive day count, editable summary, validated contact enquiry, and SH-CUSTOM references. Seven typed route ideas can populate the builder. Destination inspiration links prefill the origin. The interface explicitly labels browser-only enquiries.
- Cab fares: the existing calculateTaxiFare engine and fare configuration remain the only source of prices. A fare breakdown is now visible while editing the initial route. Route, vehicle and trip changes update prices automatically; date/passenger changes update the journey summary without inventing surcharges. Editing a confirmed journey clears its stale snapshot. Fare totals animate over 350ms. Unknown routes retain the quotation-on-request state. Existing demo/google-routes types and /taxi redirect remain intact.
- Motion: shared TravelMotion defaults, once-only SectionReveal and AnimatedAmount components; 400ms page entrance; reduced-motion support; shared button lift; holiday timeline line reveal; animated bus seat totals; preserved plane/bus/car search animations. Sections remain readable before their reveal completes.
- Mobile: planner fields → route preview → CTA ordering, 44px stop controls, single-column summary actions, larger shared small-button targets, improved homepage small text, balanced five-service desktop navigation, mobile menu before account icon, and cab panels that no longer stretch into empty space.
- Content: 36 Indian and 18 international destinations with typed region, country, scope, concise descriptions and theme mappings. Existing travel moods were extended to mountain, romantic, luxury, wildlife, wellness, international, road trip and honeymoon. Homepage inspiration and holiday discovery use these datasets without inventing package inventory. Existing package slugs are retained.
- Images: destination-specific Kashmir, Darjeeling and Meghalaya photos, rendered through the existing Next/Image architecture. Attribution and CC BY-SA 4.0 license links are available in footer photo credits. New image sources are recorded in inspirationPhotoCredits.json. Text encoding issues in edited legacy copy were corrected.
- Metadata: descriptive homepage title and description; Custom Travel Routes metadata; existing service-specific titles and accurate demo descriptions retained.

## Files created

- src/app/custom-routes/page.tsx
- src/components/custom-routes/CustomRoutePlanner.tsx
- src/components/custom-routes/custom-routes.css
- src/components/motion/TravelMotion.tsx
- src/data/customRoutes.ts
- src/data/destinationInspiration.ts
- src/data/inspirationPhotoCredits.json
- public/images/holidays/kashmir.jpg
- public/images/holidays/darjeeling.jpg
- public/images/holidays/meghalaya.jpg
- scripts/check-phase-f.mjs
- scripts/check-phase-f-workflows.mjs
- scripts/check-phase-f-flights.mjs
- scripts/check-phase-f-bus.mjs
- scripts/check-phase-f-holidays.mjs

## Existing files updated

- src/app/layout.tsx
- src/app/template.tsx
- src/app/globals.css
- src/app/holidays/page.tsx
- src/config/site.ts
- src/components/layout/Navbar.tsx
- src/components/layout/Footer.tsx
- src/components/taxi/TaxiBookingForm.tsx
- src/components/taxi/FareSummary.tsx
- src/components/cabs/cabs.css
- src/components/ui/Button.tsx
- src/components/home/MarketplaceHome.tsx
- src/components/home/MarketplaceHome.module.css
- src/components/holidays/HolidayDiscovery.tsx
- src/components/holidays/HolidayDetail.tsx
- src/components/holidays/holidays.css
- src/components/bus/BusSeatSelection.tsx
- src/data/holidayDestinations.ts
- src/data/marketplace.ts
- src/data/travelMoods.ts

The workspace had extensive pre-existing uncommitted and untracked changes. Those were preserved; the list above describes this phase rather than the entire git status.

## Validation

- npx next typegen: passed.
- npx tsc --noEmit: passed.
- npm run lint: passed.
- npm run build: passed.
- Custom journey: addition, reordering, dates, build animation, duration, summary, enquiry and success passed.
- Cab automatic fares: Sedan Ayodhya–Varanasi ₹3,240; changing to Prayagraj ₹2,640; round trip ₹4,680; switching to SUV ₹6,290. Date/passenger summary changes and editing a confirmed journey passed.
- Mobile menu, Escape handling, login dialog, country/currency preferences and reduced-motion custom journey passed.
- Flight regression checks: search validation and animation, all sorts and filters, flight details, traveller enquiry and success, unsupported routes, multi-city, mobile filter sheet, Escape/focus return and reduced motion passed; no browser exceptions.
- Bus regression checks: search, results, seat selection guards, animated fares, enquiry and success at 360, 375, 390, 430, 768, 1280 and 1440px; mobile filters and seater map passed. Seat controls met 44px targets.
- Holiday regression checks: India/World, search and mood filters, duration filter, mobile enquiry sheet focus and keyboard navigation, success, gallery navigation/Escape, horizontal gallery and reduced motion passed.
- Responsive route matrix: see responsive-report.json and saved desktop/mobile screenshots in this folder. Intentional horizontally scrollable card tracks can contain cards outside the visible track; page-level overflow is checked separately.
- /taxi: HTTP 308 with Location /cabs.

A development-server Turbopack hot-reload panic left one malformed generated .next/dev/types/validator.ts file. The generated file was removed, validation was rerun successfully, and final browser checks used the production server.

## Limits retained honestly

Authentication is a UI foundation, not a connected account service. Country/currency selectors remain preferences; they do not convert demo fares. Enquiries and references are browser-only and are not sent or persisted. WhatsApp handoff appears only when a phone is configured. Flights, bus seats/schedules, cab distances/fares and package prices are illustrative. The custom planner creates an enquiry summary, not an AI itinerary. Google Places/Routes are not integrated. Vehicle capacity remains unspecified where the existing data has no configured capacity.

## Content and photo provenance

General destination descriptions use stable landmark and geographic information. Tourism sources consulted include [Incredible India](https://www.incredibleindia.gov.in/en), [Darjeeling tourism](https://www.incredibleindia.gov.in/en/west-bengal/darjeeling), [Meghalaya tourism](https://www.incredibleindia.gov.in/en/meghalaya), [Visit Dubai](https://www.visitdubai.com/en), and [Vietnam Tourism](https://vietnam.travel/places-to-go). Photo authors and licenses are recorded separately in src/data/inspirationPhotoCredits.json and linked in the website footer.
A final visual check also found stylesheet byte-order marks preventing the homepage root color variables and planner page wrapper styles from applying. The marks were removed, all validation commands passed again, the homepage primary button color was confirmed as rgb(9, 133, 138), and both affected pages were rechecked at every required width.
