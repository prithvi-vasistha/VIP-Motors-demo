# VIP Motors

A responsive Next.js dealership website with a six-car hero carousel, inventory filters, a browser-persisted Wishlist, vehicle galleries, Concierge, seller valuations, finance calculations and showroom information.

## Run locally

Requires Node.js 24 and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Open http://localhost:3001. Use `pnpm dev` for development. The `scripts/pnpm.sh` wrapper also supports the Codex desktop runtime.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` checks and exports the application, then deploys it through GitHub Pages. Enable Pages with **GitHub Actions** as the source. Pushes to `main` republish the site.

To reproduce the project-site export:

```sh
GITHUB_PAGES=true NEXT_PUBLIC_BASE_PATH=/VIP-Motors-demo pnpm build
```

Serve `out/` under `/VIP-Motors-demo/`. Every vehicle has a pre-rendered detail page. Search parameters are restored in small client boundaries; no Node server is needed on GitHub Pages. Images and fonts are local. Normal local builds continue to use the Next.js server.

## Key source locations

- `src/lib/reference-catalogue.json`: vehicle records and ordered image metadata.
- `public/cars/`, `public/showroom/`: vehicle and showroom photographs.
- `public/brand/vip-motors.png`: owner-approved dealer logo.
- `public/social/`: recognisable Instagram PNG and WhatsApp glyph.
- `src/lib/dealership.ts`: contact information and destination URLs.
- `src/components/hero-carousel.tsx`: five-second indicator fill and carousel clock.
- `src/components/wishlist.tsx`: saved-car state, heart controls and collection.
- `src/lib/valuation.ts`, `quote-references.ts`: indicative valuation rules and references.
- `src/lib/finance.ts`: finance calculation and URL parameters.

The Wishlist stores vehicle slugs locally in the current browser. Personal enquiry details and uploaded photos remain in memory. Enquiries can be prepared and copied; there is no lead-delivery integration. Concierge uses three curated answers with a processing state. Valuations use saved references and formulas, rather than live AI or a current market feed. The WhatsApp button currently opens only https://www.whatsapp.com/.

## Verification

```sh
pnpm lint
pnpm build
pnpm typecheck
node tests/finance.mjs
node tests/valuation.mjs
```

`tests/github_pages.py` exercises the static deployment, carousel progress, Wishlist persistence, filter URLs, valuation and finance journeys, mobile filters and reduced motion using Python Playwright. Set `VIP_TEST_URL` and `CHROMIUM_PATH` for your environment. Screenshots and test outputs are excluded from Git.

For a fresh intro, open the home page in a new browser tab. Returning home in that tab skips it. Reduced motion settles immediately, and keyboard interaction dismisses the decorative layer.

Image licences are available at `/legal/`. Asset provenance is retained in `docs/`.
