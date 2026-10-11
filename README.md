# Truck Tire Pro: website

Single-page site for Truck Tire Pro Inc., a commercial truck tire shop at
918 Long Branch Rd, Dunn, NC.

## Running it

    npm install
    npm run dev          # http://localhost:3000
    npm run build        # static production build
    npm test             # hours + quote-message logic (Node's built-in runner, Node 22.18 or later)
    npm run lint
    npm run typecheck

Next.js 16 (App Router), React 19, three.js, plain CSS. The page is prerendered
as static HTML, so it deploys to Vercel (or any static host) with no
configuration and no environment variables.

## What's on the page

| Section | Notes |
| --- | --- |
| Tire sequence | A 3D studio scene (three.js) pinned to the screen while you scroll: the three tire positions, each with a three-quarter view and a close-up of its tread. `components/stage/`. |
| Services | 12 services in two groups. |
| Reading a tire size | What each part of `295/75R22.5` means. |
| How a visit goes | Five steps and the one customer-reported turnaround figure. |
| Who comes in | Owner-operators, fleets, vocational trucks, I-95 traffic. |
| Reviews | 4.8 from 77 reviews, as listed online in October 2026. |
| Hours and location | Map, hours table with today marked, live open/closed status (`lib/hours.ts`), and Fayetteville. |
| Get a quote by text | Builds a text message to (910) 230-0433 in the visitor's own messages app (`lib/quote.ts`). No server, nothing stored. |
| Phone action bar | Call, text, directions; fixed to the bottom on phones. |

## Changing the words

- **`lib/copy.ts`** holds every sentence on the page.
- **`lib/business.ts`** holds the facts: phone numbers, addresses, hours (minutes after
  midnight per weekday) and the review figure. The copy, the live status, the hours
  table, the footer and the structured data all read from there.

Things worth re-checking with the shop before launch:

- The Fayetteville location and its number, (910) 491-8142, come from directory
  listings, not from the shop.
- Roadside tire service availability.
- The review figure (4.8 from 77) goes stale as reviews come in; update `REVIEWS`
  or remove it.

## The tire sequence

Everything in it is generated in the browser from code; there are no model
files or videos to download.

- `components/stage/tireModel.ts` builds a 295/75R22.5 tire on a 10-hole aluminum
  wheel: the tread patterns (zig-zag rib steer, open-shoulder lug drive, straight rib
  trailer) are modelled flat and wrapped onto the crown, and the sidewall lettering
  is a bump map drawn on a canvas.
- `components/stage/tireScene.ts` is the studio: lights, floor, and the camera.
  The key light follows the tire in focus while the others back away into the dark.
- `components/stage/stageTimeline.ts` is the shot list: camera position, lens and
  framing at each point of the scroll, and when each block of text shows.
- `components/stage/TireStage.tsx` pins the section, feeds it the scroll position,
  and fades the text.

With reduced motion turned on, without WebGL, or before JavaScript runs, the same
text shows as ordinary blocks over still renders in `public/stage/`. If you change
the scene, re-render the stills from the dev server (the page exposes the scene as
`window.__stage` in development) and replace those files.

## Design

Tokens are CSS custom properties at the top of `app/globals.css`.

- **Colors:** ink `#16130F`, white, black for the tire studio and the footer, and the
  logo red. Buttons use `#D2121A` so white text on them passes WCAG AA; the logo keeps
  its own `#E3161E`. Text is always full ink or full white, never grey.
- **Type:** Besley (a Clarendon slab, the face of wood-type posters and shop signs) for
  headlines, Libre Franklin (a Franklin Gothic revival) for everything else.

## Assets

The logo files are generated from the supplied artwork and are re-runnable
(needs Python with numpy, Pillow, scipy and potracer):

    python scripts/trace_logo.py assets/logo-source.webp /tmp/logo.svg
    python scripts/emit_logos.py /tmp/logo.svg .

`assets/logo-source.webp` is the straight-on logo artwork that was supplied.
`assets/logo-scan.webp` is a photo of the sticker, kept for reference only;
it is skewed, so it isn't traced.

Icons use Lucide geometry (ISC licence).
