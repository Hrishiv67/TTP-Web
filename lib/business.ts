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

export const SECOND_LOCATION = {
  label: "Fayetteville",
  phone: { display: "(910) 491-8142", e164: "+19104918142" },
  address: {
    street: "715-719 Mockernut Dr",
    city: "Fayetteville",
    region: "NC",
    postalCode: "28312",
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
  url: `https://www.google.com/search?q=${encodeURIComponent(`${SHOP.name} ${oneLine(SHOP.address)} reviews`)}`,
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
 * Appointment requests from /book are emailed to the shop through Web3Forms
 * (web3forms.com). The access key is tied to the inbox it was created for and is
 * meant to sit in public website code. Until it's set, the form offers to send the
 * request as a text message instead.
 */
export const BOOKING = {
  endpoint: "https://api.web3forms.com/submit",
  accessKey: "",
  // appointments start on the half hour, the last one 30 minutes before closing,
  // and same-day requests need at least an hour's notice
  slotMinutes: 30,
  lastSlotBeforeClose: 30,
  leadMinutes: 60,
  daysAhead: 12,
};
