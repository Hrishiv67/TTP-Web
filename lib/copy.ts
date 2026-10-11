/**
 * Every sentence on the page. Facts that change (phone, hours, addresses, the
 * review figure) come from business.ts so they're only ever typed once.
 *
 * House style, so edits stay consistent: plain sentences in the shop's own
 * voice, sentence case, straight apostrophes, numerals for counts, no dashes
 * in prose, and no claim that isn't in business.ts or confirmed by the shop.
 */
import { REVIEWS, SECOND_LOCATION, SHOP } from "./business";

const PHONE = SHOP.phone.display;

export const COPY = {
  meta: {
    title: "Truck Tire Pro | Commercial truck tires in Dunn, NC",
    description: `We sell and repair commercial truck tires at our shop in Dunn, NC, near I-95. Open Monday to Friday, 8 AM to 5 PM. Call ${PHONE}.`,
  },

  nav: [
    { href: "#tires", label: "Tires" },
    { href: "#services", label: "Services" },
    { href: "#visit", label: "How a visit goes" },
    { href: "#location", label: "Hours and location" },
    { href: "#quote", label: "Get a quote" },
  ],

  hero: {
    headline: "Commercial truck tires in Dunn, near I-95",
    sub: "We sell new and used tires for semis, box trucks, pickups and trailers, and we fix flats. The shop is on Long Branch Road and is open Monday to Friday, 8 AM to 5 PM.",
    call: `Call ${PHONE}`,
    text: "Text us your tire size for a quote",
  },

  tires: {
    label: "Tires by position",
    intro: "The tire you need for a tractor-trailer depends on which of the 3 positions it goes in.",
    positions: [
      {
        kind: "steer",
        name: "Steer tires",
        line: "The 2 tires up front should be the best ones on the truck.",
        body: "Steer tires go on the front axle. Their rib tread is made for steering and for even wear.",
        facts: [
          ["Position", "Front axle, 2 tires"],
          ["Tread", "Rib, for steering and even wear"],
          ["Common sizes", "11R22.5, 295/75R22.5, 11R24.5, 285/75R24.5"],
        ],
      },
      {
        kind: "drive",
        name: "Drive tires",
        line: "These are the tires the engine turns.",
        body: "They have a lug or block tread, with deep grooves for traction.",
        facts: [
          ["Position", "Powered tandem axles, 8 tires"],
          ["Tread", "Lug or block, deep grooves for traction"],
          ["Common sizes", "11R22.5, 295/75R22.5, 11R24.5, 285/75R24.5"],
        ],
      },
      {
        kind: "trailer",
        name: "Trailer tires",
        line: "They carry the load and roll free behind the tractor.",
        body: "In a tight turn, trailer tires get dragged sideways across the pavement. That's called scrub, and their rib tread is built to stand up to it.",
        facts: [
          ["Position", "Trailer tandem, 8 tires"],
          ["Tread", "Rib, for carrying load and resisting scrub"],
          ["Common sizes", "11R22.5, 295/75R22.5, 11R24.5, 285/75R24.5"],
        ],
      },
    ],
    outro: "We also do tires for box trucks, dump trucks and pickups.",
  },

  services: {
    heading: "Services",
    intro: `For anything that isn't listed here, call ${PHONE} and ask.`,
    groups: [
      {
        name: "Tires and wheels",
        items: [
          ["New tires", "We sell steer, drive and trailer tires, and tires for box trucks and pickups."],
          ["Used tires", "We inspect every used tire before we sell it, and they cost less than new."],
          ["Mounting and installation", "We mount the tire on the rim and put the wheel back on your truck."],
          ["Flat repair", "We check the puncture or slow leak first and fix it if it's safe to repair. If it isn't, we replace the tire."],
          ["Wheel balancing", "We balance truck and trailer wheels."],
          ["Wheel alignment", "Uneven wear on the steer tires can mean the alignment is off. We check it and set it back."],
          ["Tire maintenance", "We do rotations and pressure checks."],
          ["Roadside tire service", `Call ${PHONE} from the road and we'll see if someone can come out to you.`],
        ],
      },
      {
        name: "Truck and trailer repair",
        items: [
          ["Truck A/C repair", "We find A/C problems, recharge the system, fix broken parts and put in new compressors."],
          ["Trailer brake repair", "We repair trailer brakes."],
          ["Minor repairs", "We put on new mudflaps and replace the hardware that holds them."],
          ["Trailer washouts", "We clean out the inside of your trailer between loads."],
        ],
      },
    ],
  },

  sizing: {
    heading: "Reading a tire size",
    intro: "Every tire has its size molded into the sidewall. 295/75R22.5 is a common tractor-trailer size, and this is how it breaks down.",
    code: "295/75R22.5",
    parts: [
      ["295", "Section width", "The tire is 295 millimeters wide."],
      ["75", "Aspect ratio", "The sidewall height is 75 percent of the width."],
      ["R", "Construction", "R means the tire is a radial."],
      ["22.5", "Rim diameter", "It fits a 22.5-inch rim."],
    ],
    note: "There's no aspect ratio in a size like 11R22.5, which is an 11-inch-wide radial for a 22.5-inch rim. If you can't tell what you have, read us the sidewall over the phone.",
  },

  visit: {
    heading: "How a visit goes",
    steps: [
      ["Call or pull in", "We're open Monday to Friday, 8 AM to 5 PM. Calling first lets us check whether we have your size."],
      ["Tell us about the tire", "Give us the size and which axle it's on. If it went flat or got damaged, tell us what happened."],
      ["We look at it", "A tech inspects the tire to see if it can be safely repaired."],
      ["You get a price", "We tell you the cost before any work starts."],
      ["We do the work", "When it's done, you pay and get back on the road."],
    ],
    turnaround: {
      figure: "One customer had 8 tires changed in about 45 minutes.",
      note: "That's from one customer's review, not a promise. Ask how long your job will take when you call.",
    },
  },

  who: {
    heading: "Who comes in",
    items: [
      ["Owner-operators", "Used tires cost less than new, so ask what we have in your size."],
      ["Fleets", "We handle rotations and pressure checks for fleet trucks and replace tires as they wear out."],
      ["Dump trucks and vocational trucks", "We put tires on these and fix their flats."],
      ["Drivers on I-95", `The shop is close to the interstate in Dunn. Call ${PHONE} and tell us you're on the way.`],
    ],
    note: "We mostly work on commercial vehicles, so call before you bring in a car.",
  },

  reviews: {
    heading: "Reviews",
    ratingLine: `${REVIEWS.rating} average from ${REVIEWS.count} reviews`,
    mentions: "Customers often mention quick turnaround and fair prices.",
    link: "Read the reviews",
    asOf: `As listed online in ${REVIEWS.asOf}.`,
  },

  location: {
    heading: "Hours and location",
    dunnLabel: "Dunn, main shop",
    fayettevilleLabel: SECOND_LOCATION.label,
    fayettevilleNote: `Call ${SECOND_LOCATION.phone.display} to check this location's hours.`,
    directions: "Get directions",
    openMap: "Open in Google Maps",
    hoursHeading: "Hours",
  },

  quote: {
    heading: "Get a quote by text",
    intro: "Fill in what you know about the tire and the truck. Anything else can go in the notes.",
    callLine: "You can also call us at",
    fields: {
      name: { label: "Your name", hint: "First name is fine" },
      vehicle: { label: "Vehicle" },
      service: { label: "What you need" },
      size: { label: "Tire size", hint: "For example, 295/75R22.5" },
      position: { label: "Tire position", notSure: "Not sure" },
      quantity: { label: "How many tires" },
      location: { label: "Where you are", hint: "Town, or the I-95 exit you're near" },
      notes: { label: "Anything else", hint: "What happened to the tire and when you need it done" },
    },
    vehicles: ["Semi tractor", "Trailer", "Box truck", "Dump truck", "Pickup", "Other"],
    positions: ["Steer", "Drive", "Trailer"],
    submit: "Open text message",
    fine: "This opens your messages app with the text written out. Nothing is sent until you press send, and standard messaging rates apply.",
    result: {
      heading: "If your messages app didn't open",
      body: `On a computer, copy the message and text it to ${PHONE} from your phone.`,
      again: "Try again",
      copy: "Copy message",
      copied: "Copied",
      call: `Call ${PHONE}`,
    },
  },

  actionBar: { call: "Call", text: "Text", directions: "Directions" },

  sms: {
    greeting: "Hi, this is a quote request from your website.",
    actionBarBody: "Hi, I'm looking for a tire quote. Size and position: ",
  },

  footer: {
    blurb: "We opened in 2020. The main shop is on Long Branch Road in Dunn.",
    visit: "Visit",
    call: "Call",
    hours: "Hours",
    links: "On this page",
    backToTop: "Back to top",
  },

  notFound: {
    heading: "Page not found",
    body: "The link may be old or mistyped.",
    home: "Go to the home page",
  },
} as const;

/** Service names, for the quote form and the structured data. */
export const ALL_SERVICES = COPY.services.groups.flatMap((g) => g.items.map(([name]) => name));
