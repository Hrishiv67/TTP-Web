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
| Hero | The scroll-driven 3D sequence: intro, pick a service, that service's animation, then booking. See "The 3D hero" below. |
| Tires we sell | The shop's own TTP Tire (sizes, 18 ply, made in Malaysia; prices aren't published, it says to call), then hundreds of sizes in stock, the three most popular, and the shop's promise. |
| Services | 8 main services with a picture each; "See more" plays that service in the hero. Plus 4 smaller ones. |
| Reviews | 4.8 from 77 reviews, as listed online in October 2026. |
| Booking band | Book an Appointment. |
| Hours and location | Map, hours table with today marked, live open/closed status (`lib/hours.ts`), and Fayetteville. |
| How a visit goes | Five steps and the one customer-reported turnaround figure. |
| Not sure what tire you need? | Reading a tire size, tire positions, a button to text a photo of the sidewall. |
| Who comes in | Owner-operators, fleets, vocational trucks, I-95 traffic. |
| Get a quote by text | Builds a text message to (910) 230-0433 in the visitor's own messages app (`lib/quote.ts`). No server, nothing stored. |
| Phone action bar | Get a Quote (calls the shop), Book, Directions; fixed to the bottom on phones. |

"Get a Quote" (in the header, the hero, the footer and the phone bar) calls
(910) 230-0433. "Book an Appointment" buttons go to `/book`.

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

## The 3D hero

A scroll-driven sequence in a black studio. The section pins to the screen and the
scroll plays it, in three parts (`components/stage/sequence.ts`):

1. **Intro**: the three tires (a new TTP Tire, a used tire, a trailer tire) come up out
   of the dark while the camera swings round.
2. **Pick**: a hold on the lineup with a button for each service.
3. **Service**: the chosen service's own animation (TTP Tire if nobody picks), then a
   panel with Book an Appointment and "See another service". Each service card further
   down has "See more", which plays that service here.

Everything is generated in the browser from code; there are no model files or videos.

- `components/Showroom.tsx` pins the section, feeds the scene the scroll position, and
  fades the text in and out.
- `components/stage/scene.ts` is the scene: the lineup, the move from the lineup into a
  service, and loading each service when it's needed.
- `components/stage/services/` has one file per service. Each one builds its props and
  describes its camera moves and animation as a function of how far the scroll has got
  (`services/types.ts` explains the contract; `repair.ts` is a readable example).
- `components/stage/tireModel.ts` builds a 295/75R22.5 tire on a 10-hole aluminum
  wheel, with the shop's TTP TIRE lettering, wear, and helpers for marks on the tread
  and sidewall. `studio.ts` is the lights, floor and contact shadows; `shots.ts` is the
  camera maths, including composing each frame exactly like the poster images so the
  swap from poster to live scene doesn't jump.

With reduced motion turned on, without WebGL, or before JavaScript runs, the hero is one
screen over the poster (`public/stage/hero-intro-<wide|mid|tall>.webp`) and the picker
links to the service cards. If you change the scene, re-render the posters and the card
pictures in `public/services/` from the dev server (in development the page exposes the
scene as `window.__stage` and the timeline as `window.__seq`).

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
