/**
 * The facts about the business: name, numbers, addresses, hours, reviews. A
 * change of hours or phone number is a one-line edit here; the page copy in
 * copy.ts reads from this file.
 */

export const SHOP = {
  name: "Truck Tire Pro",
  legalName: "Truck Tire Pro Inc.",
  founded: 2020,
  phone: { display: "(910) 230-0433", e164: "+19102300433" },
  address: {
    street: "918 Long Branch Rd",
    city: "Dunn",
    region: "NC",
    postalCode: "28334",
  },
} as const;

type Address = { street: string; city: string; region: string; postalCode: string };

export const oneLine = (a: Address) => `${a.street}, ${a.city}, ${a.region} ${a.postalCode}`;

// Google takes plain-text addresses for both search and directions; no API key needed.
export const directionsUrl = (a: Address) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(oneLine(a))}`;

export const mapEmbedUrl = (a: Address) =>
  `https://www.google.com/maps?q=${encodeURIComponent(`${SHOP.name}, ${oneLine(a)}`)}&output=embed`;

// As listed online when the site was built; update or remove as reviews come in.
export const REVIEWS = {
  rating: 4.8,
  count: 77,
  asOf: "October 2026",
  url: "https://www.google.com/maps/place/Truck+Tire+Pro/@35.2688672,-78.6158895,1155m/data=!3m1!1e3!4m8!3m7!1s0x89ab83cbd219154d:0xed4025352682d073!8m2!3d35.2688672!4d-78.6158895!9m1!1b1!16s%2Fg%2F11vwndr3hj?hl=en-US&entry=ttu&g_ep=EgoyMDI2MTAwNy4wIKXMDSoASAFQAw%3D%3D",
};

/** Opening hours by JS weekday (0 = Sunday), as minutes after midnight, shop-local time. */
export const HOURS: Record<number, { open: number; close: number } | null> = {
  0: null,
  1: { open: 8 * 60, close: 17 * 60 },
  2: { open: 8 * 60, close: 17 * 60 },
  3: { open: 8 * 60, close: 17 * 60 },
  4: { open: 8 * 60, close: 17 * 60 },
  5: { open: 8 * 60, close: 17 * 60 },
  6: { open: 8 * 60, close: 17 * 60 },
};

export const TIME_ZONE = "America/New_York";

/**
 * Appointment requests from /book are emailed straight to `email` by FormSubmit
 * (formsubmit.co), from the visitor's browser. The first request to a new address sends
 * it an "Activate Form" email instead, and requests are delivered once that button is
 * clicked. If a request can't be sent, the form offers to send it as a text message.
 * NEXT_PUBLIC_BOOKING_EMAIL overrides the address at build time (the booking check on
 * GitHub Actions uses it to test with another inbox).
 */
export const BOOKING = {
  email: process.env.NEXT_PUBLIC_BOOKING_EMAIL || "trucktirespros@gmail.com",
  endpoint: "https://formsubmit.co/ajax/",
  // appointments start on the half hour, the last one 30 minutes before closing,
  // and same-day requests need at least an hour's notice
  slotMinutes: 30,
  lastSlotBeforeClose: 30,
  leadMinutes: 60,
  daysAhead: 12,
};
