/**
 * Everything the site says about the business lives here, so a change of hours
 * or phone number is a one-line edit rather than a hunt through components.
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
    street: "715–719 Mockernut Dr",
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

export const REVIEWS = {
  rating: 4.8,
  count: 77,
  asOf: "Oct 2026",
  themes: ["Fast turnaround", "Fair prices", "Techs who actually help"],
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
  6: null,
};

export const TIME_ZONE = "America/New_York";

export const NAV = [
  { href: "#services", label: "Services" },
  { href: "#positions", label: "Tire positions" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#locations", label: "Locations" },
  { href: "#quote", label: "Get a quote" },
] as const;

export type Service = { n: string; name: string; description: string; tag: string };

export const SERVICE_GROUPS: { letter: string; name: string; services: Service[] }[] = [
  {
    letter: "A",
    name: "Tires",
    services: [
      { n: "01", name: "New tires", description: "Steer, drive and trailer tires for semis, box trucks, pickups and trailers.", tag: "Steer · Drive · Trailer" },
      { n: "02", name: "Used tires", description: "Inspected secondhand tires for when a new one doesn’t fit the job or the budget.", tag: "Lower cost" },
      { n: "03", name: "Mounting & installation", description: "Old tire off, new tire mounted, wheel back on the axle.", tag: "All positions" },
      { n: "04", name: "Flat repair", description: "Punctures, slow leaks and pressure loss. Repaired when it’s safe, replaced when it isn’t.", tag: "Inspected first" },
      { n: "05", name: "Wheel balancing", description: "Balanced wheel-and-tire assemblies to stop vibration and uneven wear.", tag: "Less vibration" },
      { n: "06", name: "Tire maintenance", description: "Rotations, pressure checks and tread inspections before a worn tire turns into a roadside call.", tag: "Preventive" },
    ],
  },
  {
    letter: "B",
    name: "Truck & trailer repair",
    services: [
      { n: "07", name: "Wheel alignment", description: "Wheel angles set so the truck tracks straight and the tires wear evenly.", tag: "Even wear" },
      { n: "08", name: "Truck A/C repair", description: "Diagnosis, refrigerant recharge, component repair and compressor replacement.", tag: "Cab comfort" },
      { n: "09", name: "Trailer brakes", description: "Trailer brake components repaired or replaced.", tag: "Trailer" },
      { n: "10", name: "Minor repairs", description: "Mudflaps, brackets and the small hardware that goes with them.", tag: "Hardware" },
    ],
  },
  {
    letter: "C",
    name: "On the road",
    services: [
      { n: "11", name: "Roadside tire service", description: "Tire repair or replacement away from the shop. Call with your location and tire size.", tag: "Call first" },
      { n: "12", name: "Trailer washouts", description: "Trailer interiors cleaned out — residue, debris and odor — before the next load.", tag: "Between loads" },
    ],
  },
];

export const ALL_SERVICES = SERVICE_GROUPS.flatMap((g) => g.services.map((s) => s.name));

export type PositionId = "steer" | "drive" | "trailer";

export const POSITIONS: { id: PositionId; name: string; meta: string; body: string }[] = [
  {
    id: "steer",
    name: "Steer",
    meta: "Front axle · 2 tires",
    body: "Rib tread for steering response and even wear. Steer tires carry the front of the truck and do all of the steering — they should be the best tires on the rig.",
  },
  {
    id: "drive",
    name: "Drive",
    meta: "Drive tandem · 8 tires",
    body: "Lug tread with deep grooves that bite for traction. These are the tires that put the engine’s power on the road, eight of them on a tandem tractor.",
  },
  {
    id: "trailer",
    name: "Trailer",
    meta: "Trailer tandem · 8 tires",
    body: "Rib tread built to carry the load and stand up to scrub in tight turns. Free-rolling: no steering, no drive, just weight.",
  },
];

export const COMMON_SIZES = ["11R22.5", "295/75R22.5", "11R24.5", "285/75R24.5"];

export const STEPS = [
  { n: "01", title: "Call or pull in", body: "Tell us the size, the position and what happened. Calling ahead lets us check the rack." },
  { n: "02", title: "We look first", body: "A tech checks the tire and tells you straight whether it can be safely repaired." },
  { n: "03", title: "Price up front", body: "You hear the price before anyone picks up a tool." },
  { n: "04", title: "The work", body: "Mount, balance, repair — or whatever else you came in for." },
  { n: "05", title: "Back on the road", body: "Final check, pay, and you’re rolling." },
];

export const AUDIENCES = [
  { title: "Owner-operators", body: "Your truck, your money. Straight answers on repair versus replace, and used tires when they make sense." },
  { title: "Fleets", body: "Repeat tire purchases, installs and inspections across your trucks. Call to set up how you’d like to work with us." },
  { title: "Dump & work trucks", body: "Tires for dump trucks and vocational rigs that run hard and can’t afford to sit." },
  { title: "Drivers on I-95", body: "Passing through North Carolina with a tire problem? Dunn is right off the interstate." },
];

export const VEHICLES = ["Semi tractor", "Trailer", "Box truck", "Dump truck", "Pickup", "RV", "Other"];
