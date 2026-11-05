# Phase D - Bus booking experience

Phase D is complete. Implementation is limited to the bus experience, bus data/types, a bus-only image, and verification artifacts. Homepage, flights, holidays, cabs, navbar, authentication, global CSS, configuration and dependencies were not edited in this phase.

## Files changed

- src/app/bus/page.tsx
- src/components/bus/BusSearchForm.tsx (existing entry point preserved as a re-export)
- src/components/bus/BusExperience.tsx
- src/components/bus/BusSearchPanel.tsx
- src/components/bus/BusSearchAnimation.tsx
- src/components/bus/BusResults.tsx
- src/components/bus/BusFilters.tsx
- src/components/bus/BusCard.tsx
- src/components/bus/BusSeatSelection.tsx
- src/components/bus/BusEnquiry.tsx
- src/components/bus/BusSuccess.tsx
- src/components/bus/bus.css
- src/data/demoBuses.ts
- src/types/bus.ts
- scripts/check-bus.mjs
- public/images/bus/open-road.webp
- public/images/bus/README.md (photo source and licence)
- artifacts/bus/*.png, artifacts/bus/browser-report.json, and this report

## Features implemented

Search, route swap, travel date and 1-6 travellers; popular route chips; approximately 1.1-second moving-bus route animation; results with functional coach-type, AC, departure-period and maximum-price filters; recommended, price, duration and departure sorts; mobile draft/apply filter sheet with keyboard focus and Escape dismissal; premium journey cards; 2+1 sleeper berth layouts and 2+2 seated layouts; keyboard-accessible seats with selected/check and unavailable/cross indicators; traveller-count selection guards; live local fare calculation; desktop journey summary; mobile fixed seat/fare/continue bar; lead-traveller enquiry with contact validation and consent; clearly labelled demo success references; back navigation; reduced-motion support; local optimised road photography.

Each stage renders independently. Shared Button styling, navigation and authentication components are reused.

## Demo inventory

80 typed sample journeys, each marked isDemo: true. Eight sample services per route in each direction for Delhi/Ayodhya, Delhi/Jaipur, Delhi/Lucknow, Delhi/Haridwar and Delhi/Agra. Sample operator names include Demo. Sleeper, seater and semi-sleeper coaches include AC/non-AC examples, duration, overnight arrival offsets, illustrative INR fares, amenities, boarding/dropping points and sample unavailable seats.

The dataset and pure search/filter functions are separate from UI components for replacement by a future inventory source. Search dates are enquiry preferences; the sample schedules do not represent date-specific operations.

## Validation

Passed:
- npx next typegen
- npx tsc --noEmit
- npm run lint (no errors or warnings)
- npm run build

Chrome checks passed for search, results, seat selection, enquiry and success at 1440, 1280, 768, 360, 375, 390 and 430 pixels. Additional mobile filter and seated-coach checks bring the total to 37 layout/state checks. No page overflow, broken bus images, or seat targets below 44px were found. Actual screenshots were visually inspected.

Verified: exclusive states; moving search animation; all filter groups; price range; all sort orders; blocked unavailable seats; exact traveller-count selection; changing totals; enquiry and success; preserved seats on enquiry/back; search values on modify; mobile draft/apply filters; dialog focus; Escape close; native Enter keyboard seat selection; unsupported-route empty state; reduced motion.

HTTP 200 regression checks: /bus, /, /flights, /holidays, /holidays/ayodhya, /holidays/ayodhya-essentials, /cabs and /taxi.

Browser evidence: artifacts/bus/browser-report.json and artifacts/bus/*.png. The browser test script uses the local dev server on port 3000 and a dedicated Chrome debugging session on port 9227.

## Remaining limitations

No live bus API, delivery backend, persistence, payment or ticket generation. Enquiries are explicitly demonstrated locally; personal information is not transmitted or stored. Seats are preferences and are not reserved. Operator names, coach layouts, routes, schedules, amenities, boarding points and fares are sample data. Fares are displayed in INR; existing global currency selection remains a display preference. Actual services and availability require confirmation by the travel team.

Phase E was not started.
