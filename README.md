# Truck Tire Pro: website

Website for Truck Tire Pro Inc., a commercial truck tire shop at
918 Long Branch Rd, Dunn, NC: the home page and an appointment page at `/book`.

## Running it

    npm install
    npm run dev          # http://localhost:3000
    npm run build        # static production build
    npm test             # hours, booking slots and quote-message logic (Node's built-in runner, Node 22.18 or later)
    npm run lint
    npm run typecheck

Next.js 16 (App Router), React 19, three.js, plain CSS. The pages are prerendered
as static HTML, so they deploy to Vercel (or any static host) with no
configuration and no environment variables.

## Booking emails (set this up once)

`/book` sends each appointment request to the shop's inbox through
[Web3Forms](https://web3forms.com), a free form-to-email service, straight from the
visitor's browser. There's no server to run.

1. Go to web3forms.com, enter the shop's email address, and they email an access key
   to that inbox.
2. Paste the key into `BOOKING.accessKey` in `lib/business.ts` and deploy.

Until a key is set, the form still works: after the customer fills it in, it offers
to send the same request as a text message to (910) 230-0433. It does the same if
Web3Forms is ever unreachable. The access key is meant to be public; Web3Forms only
ever sends to the address it was created for.

Open days and times come from `HOURS` in `lib/business.ts` (shop time, America/New_York).
`BOOKING` sets the slot length, how far ahead people can book, and the notice needed
for a same-day slot. Requests are requests: the shop calls to confirm.

## What's on the page

| Section | Notes |
| --- | --- |
| Showroom (hero) | Three tires in a 3D studio (three.js) and a button for each main service: TTP Tire, new, used, flat repair, balancing. A tap moves the camera to that service and shows booking and quote buttons beside it. `components/Showroom.tsx`, `components/stage/`. |
| TTP Tire | The shop's own brand: sizes, 18 ply, made in Malaysia. Prices aren't published; it says to call. |
| Hundreds of sizes in stock | Steer, drive and trailer; the three most popular sizes; the shop's promise. |
| Services | 8 main services with a render each, linking to `/book` with the service filled in, plus 4 smaller ones. |
| Reviews | 4.8 from 77 reviews, as listed online in October 2026. |
| Booking band | Book an Appointment and Get a Quote. |
| Hours and location | Map, hours table with today marked, live open/closed status (`lib/hours.ts`), and Fayetteville. |
| How a visit goes | Five steps and the one customer-reported turnaround figure. |
| Not sure what tire you need? | Reading a tire size, tire positions, a button to text a photo of the sidewall. |
| Who comes in | Owner-operators, fleets, vocational trucks, I-95 traffic. |
| Get a quote by text | Builds a text message to (910) 230-0433 in the visitor's own messages app (`lib/quote.ts`). No server, nothing stored. |
| Phone action bar | Get a Quote (calls the shop), Book, Directions; fixed to the bottom on phones. |

"Get a Quote" buttons everywhere call (910) 230-0433. "Book an Appointment" buttons
go to `/book`.

## Changing the words

- **`lib/copy.ts`** holds every sentence on the site.
- **`lib/business.ts`** holds the facts: phone numbers, addresses, hours (minutes after
  midnight per weekday), the review figure and the booking settings. The copy, the
  live status, the hours table, the booking page, the footer and the structured data
  all read from there.

Things worth re-checking with the shop before launch:

- The Fayetteville location and its number, (910) 491-8142, come from directory
  listings, not from the shop.
- Roadside tire service availability.
- The review figure (4.8 from 77) goes stale as reviews come in; update `REVIEWS`
  or remove it.
- The TTP Tire in the 3D scene has a rib tread. If the real tire's tread looks
  different, the model can be changed to match a photo.

## The 3D showroom

Everything in it is generated in the browser from code; there are no model
files or videos to download.

- `components/stage/tireModel.ts` builds a 295/75R22.5 tire on a 10-hole aluminum
  wheel: the tread patterns (zig-zag rib steer, open-shoulder lug drive, straight rib
  trailer) are modelled flat and wrapped onto the crown, and the sidewall lettering
  is a bump map drawn on a canvas. Options add the TTP TIRE lettering, wear and
  crayon marks, a repair plug, and balance weights.
- `components/stage/stageStates.ts` is the shot list: for each stop, the camera,
  lens and framing, and each tire's turn, roll and light. Phones get their own
  framing for the opening shot.
- `components/stage/tireScene.ts` is the studio (lights, floor, camera) and moves
  between stops. Each frame is composed exactly like the matching poster image and
  scaled the way CSS `object-fit: cover` scales it, so the swap from the poster to the
  live scene doesn't jump.

With reduced motion turned on, without WebGL, or before the 3D has loaded, still
renders in `public/stage/` stand in (`hero-<stop>-<wide|mid|tall>.webp`). If you change
the scene, re-render them from the dev server (in development the page exposes the
scene as `window.__stage` and the shots as `window.__stops`) and replace those files.
The service pictures in `public/services/` were rendered in the same studio.

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
