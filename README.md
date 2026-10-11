# Truck Tire Pro — website

Single-page site for Truck Tire Pro Inc., a commercial truck tire shop at
918 Long Branch Rd, Dunn, NC. Built from the Figma design
[Truck Tire Pro — Website](https://www.figma.com/design/Q9RCoFx9WwaJuqLUnYiwP4).

## Running it

    npm install
    npm run dev          # http://localhost:3000
    npm run build        # static production build
    npm test             # hours + quote-message logic (Node's built-in runner, Node ≥ 22.18)
    npm run lint
    npm run typecheck

Next.js 16 (App Router), React 19, plain CSS. Every page is prerendered as
static HTML, so it deploys to Vercel (or any static host) with no
configuration and no environment variables.

## What's on the page

| Section | Notes |
| --- | --- |
| Utility bar | Live open/closed status against the shop's Eastern-time clock (`lib/hours.ts`). |
| Hero | Fig. 1 tire drawing; it rolls with the scroll, and stays still for reduced-motion users. |
| 01 Services | 12 services in three groups. |
| 02 Tire positions | Plan view of a tractor-trailer. Click an axle, or use the tabs (arrow keys work). |
| 03 Sizing | How to read `295/75R22.5` off a sidewall. |
| 04 How a stop works | Five steps, plus the one customer-reported turnaround figure. |
| 05 Who we work for | Owner-operators, fleets, vocational trucks, I-95 traffic. |
| Reviews | 4.8 from 77 reviews, as listed online in Oct 2026. |
| 06 Locations | Dunn (map, hours table with today highlighted) and Fayetteville. |
| 07 Get a quote | Builds a text message to (910) 230-0433 in the visitor's own messages app (`lib/quote.ts`). No server, nothing stored. |
| Phone action bar | Call / Text / Directions, fixed to the bottom on phones. |

## Changing the details

Phone numbers, addresses, hours, services, review figures and all other copy
that describes the business live in **`lib/business.ts`**. Hours are minutes
after midnight per weekday; the live status, hours table, footer and
structured data all read from there.

Things worth re-checking with the shop before launch:

- The Fayetteville location and its number, (910) 491-8142, come from directory
  listings, not from the shop.
- Roadside tire service availability.
- The review figure (4.8 / 77) goes stale as reviews come in; update `REVIEWS`
  or remove it.

## Design system

Tokens are CSS custom properties at the top of `app/globals.css`, mirrored as
Figma variables (`TTP / Color`) and text styles in the design file.

- **Paper** `#F2ECE1`, **ink** `#16130F`, **red**: the three colours of the logo.
  Interface red is `#D2121A` so cream text on it passes WCAG AA. The logo keeps its own
  `#E3161E`.
- **Type:** Barlow Condensed (display), Barlow (body), IBM Plex Mono (labels).
- Square corners, 1px rules instead of boxes, numbered sections, and technical
  drawings instead of stock photography.

## Assets

Everything visual is generated from source and is re-runnable. Needs Python
with numpy, Pillow, scipy, potracer and fonttools.

    # logo: vectorise the supplied artwork, then write the site's logo files
    python scripts/trace_logo.py assets/logo-source.webp /tmp/logo.svg
    python scripts/emit_logos.py /tmp/logo.svg .

    # drawings: tire, tractor-trailer plan, tread patterns
    python scripts/gen_drawings.py /tmp/drawings path/to/BarlowCondensed-Bold.ttf
    python scripts/emit_drawings_ts.py /tmp/drawings lib/drawings.ts

`assets/logo-source.webp` is the straight-on logo artwork that was supplied.
`assets/logo-scan.webp` is a photo of the sticker, kept for reference only;
it is skewed, so it isn't traced.

Icons use Lucide geometry (ISC licence).
