# Homepage visual verification

The homepage uses `MarketplaceHome.tsx` and its scoped CSS module. Replace images and destination copy in `src/data/marketplace.ts`; assets are served locally through Next.js Image.

Verified viewport widths: 360, 375, 390, 430, and 1440 pixels. Screenshots are `home-{width}.png`. `browser-report.json` records page widths, image loads, and runtime errors. `interaction-report.json` records the search animation and destination route for all four services.

Additional photography downloaded from Unsplash:
- Kerala: https://images.unsplash.com/photo-1602216056096-3b40cc0c9944
- Thailand: https://images.unsplash.com/photo-1528181304800-259b08848526
- Switzerland: https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99
- Flight: https://images.unsplash.com/photo-1436491865332-7a61a109cc05
- Bus: https://images.unsplash.com/photo-1570125909232-eb263c188f7e

Existing destination and vehicle imagery was retained. Offers remain labelled as sample data.

Validation commands: `npm run lint`, `npm run build`. Browser checks in `scripts/check-browser.mjs` and `scripts/check-interactions.mjs` use the running localhost:3000 development server and a local Chrome debugging endpoint on port 9224. Run sequentially because they share a browser tab.
