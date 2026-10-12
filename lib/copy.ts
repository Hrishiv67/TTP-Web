/**
 * Every sentence on the site. Facts that change (phone, hours, addresses, the
 * review figure) come from business.ts so they're only ever typed once.
 *
 * House style, so edits stay consistent: plain sentences in the shop's own
 * voice, sentence case, straight apostrophes, numerals for counts, no dashes
 * in prose. Claims come from business.ts or from the shop's own earlier website
 * (top brands at competitive prices, used tires from a fraction of new, repairs
 * often the same day). The TTP Tire facts and the promise come from the shop. Prices
 * aren't published: the shop prefers that customers call.
 */
import { HOURS, REVIEWS, SECOND_LOCATION, SHOP } from "./business";
import { weekHours } from "./hours";

const PHONE = SHOP.phone.display;
const TTP_SIZES = ["295/75R22.5", "11R22.5"] as const;
const WEEK = weekHours(HOURS);

export const COPY = {
  meta: {
    title: "Truck Tire Pro | Semi truck tires in Dunn, NC",
    description: `Semi truck tires in Dunn, NC, near I-95: steer, drive and trailer tires, hundreds of sizes in stock, and our own TTP Tire. Flat repair, balancing and alignment too. Open ${WEEK.open}. Call ${PHONE} for pricing.`,
  },

  // { open: "Monday to Saturday, 8 AM to 5 PM", closed: "Sunday" }, plus a short form for the header
  hours: { ...WEEK, compact: "Mon to Sat, 8 AM to 5 PM" },

  nav: [
    { href: "/#ttp-tire", label: "TTP Tire" },
    { href: "/#services", label: "Services" },
    { href: "/#reviews", label: "Reviews" },
    { href: "/#location", label: "Hours and location" },
  ],

  cta: {
    book: "Book an Appointment",
    bookShort: "Book",
    quote: "Get a Quote",
    bookTime: "Book a time",
    seeMore: "See more",
  },

  hero: {
    label: "Truck Tire Pro",
    headline: "Semi truck tires in Dunn, near I-95",
    sub: "Steer, drive and trailer tires, with hundreds of sizes in stock at both locations. Call for pricing.",
    hours: `Open ${WEEK.open}`,
    scroll: "Scroll to see what we do",
    bridge: "New tires, used tires and our own TTP Tire, plus the repairs that keep a truck on the road.",
    pickHeading: "Choose your service",
    pickSub: "Choose a service, then scroll to explore.",
    choose: "Choose a service",
    continue: "Scroll to continue",
    another: "Choose another service",
    // the services in the 3D sequence; ids match components/stage/sequence.ts, and `book`
    // is the name the booking form preselects
    services: [
      {
        id: "ttp", chip: "TTP Tire", book: "TTP Tire",
        name: "TTP Tire",
        line: "Our own brand of tire, made in Malaysia.",
        detail: "18 ply, with a smoother ride. Built for long haul and short haul, dump trucks and over-the-road trucks.",
      },
      {
        id: "new", chip: "New tires", book: "New tires",
        name: "New tires",
        line: "Top truck tire brands at competitive prices.",
        detail: "Fresh off the truck, label still on the tread. Sizes for semis, box trucks, pickups and trailers.",
      },
      {
        id: "used", chip: "Used tires", book: "Used tires",
        name: "Used tires",
        line: "Start at a fraction of the price of new.",
        detail: "Every one is checked before it goes on the rack. We measure the tread and mark it on the sidewall.",
      },
      {
        id: "repair", chip: "Flat repair", book: "Tire repair",
        name: "Flat repair",
        line: "Punctures and slow leaks, often fixed the same day.",
        detail: "We pull out what went in, plug the hole and trim it flush, then circle the repair so you know it was done.",
      },
      {
        id: "balance", chip: "Balancing", book: "Wheel balancing",
        name: "Wheel balancing",
        line: "Stops the shake you feel at speed.",
        detail: "We spin the wheel, find the heavy spot and clip on weights until it runs true. Balanced tires last longer.",
      },
      {
        id: "alignment", chip: "Alignment", book: "Alignment",
        name: "Alignment",
        line: "So the truck tracks straight.",
        detail: "Tires that point the right way wear evenly and save fuel.",
      },
      {
        id: "ac", chip: "A/C work", book: "A/C work",
        name: "A/C work",
        line: "Semi truck A/C, diagnosed and repaired.",
        detail: "We recharge the system and put in new compressors, so you stay cool on the road.",
      },
      {
        id: "washout", chip: "Trailer washouts", book: "Trailer washouts",
        name: "Trailer washouts",
        line: "Debris, residue and buildup, washed out between loads.",
        detail: "Quick turnaround, so you stay on schedule.",
      },
      {
        id: "maintenance", chip: "Maintenance", book: "General maintenance",
        name: "General maintenance",
        line: "Rotations, pressure checks and tread inspections.",
        detail: "For one truck or a whole fleet.",
      },
    ],
    posterAlt: "A new TTP Tire, a used tire and a trailer tire standing in a dark studio",
  },

  ttp: {
    name: "TTP Tire",
    sizes: TTP_SIZES,
    kicker: "Our own brand",
    body: "Our own tire, built for long haul, short haul and vocational trucks, with a smoother ride.",
    facts: [
      ["Sizes", TTP_SIZES.join(" and ")],
      ["Ply rating", "18 ply"],
      ["Made in", "Malaysia"],
    ],
    pricePrefix: "Call",
    priceSuffix: "for pricing.",
    watch: "See it in 3D",
    alt: "A TTP Tire on an aluminum wheel, with TTP TIRE and 18 PLY RATING on the sidewall",
  },

  stock: {
    heading: "Hundreds of sizes in stock",
    body: "We mostly sell semi truck tires: steer, drive and trailer. Both locations carry hundreds of sizes.",
    popularHeading: "Most popular",
    popular: ["295/75R22.5", "11R22.5", "11R24.5"],
    promise: "We promise quality and satisfaction with every tire.",
  },

  services: {
    heading: "Everything for your truck's tires",
    intro: "New and used tires, flat repair, balancing, alignment and maintenance, plus A/C work and trailer washouts.",
    main: [
      { id: "new", name: "New tires", body: "We stock top truck tire brands and our own TTP Tire, in sizes for semis, box trucks, pickups and trailers.", alt: "A new truck tire on an aluminum wheel" },
      { id: "used", name: "Used tires", body: "Every used tire is inspected before it goes on the rack, and they start at a fraction of the price of new.", alt: "A used truck tire with its tread depth marked in crayon" },
      { id: "repair", name: "Tire repair", body: "Flats, punctures and slow leaks, often fixed the same day.", alt: "A plug sealing a puncture in a tire's tread" },
      { id: "balance", name: "Wheel balancing", body: "Balancing stops the vibration you feel at speed and helps your tires last longer.", alt: "Balance weights clipped to the rim of a truck wheel" },
      { id: "alignment", name: "Alignment", body: "We set the alignment so the truck tracks straight. That keeps the tires from wearing unevenly and saves fuel.", alt: "A red alignment laser line across a steer tire's tread" },
      { id: "ac", name: "A/C work", body: "We diagnose and repair semi truck A/C, recharge the system and put in new compressors, so you stay cool on the road.", alt: "A truck A/C compressor" },
      { id: "washout", name: "Trailer washouts", body: "Debris, residue and buildup washed out between loads, with a quick turnaround.", alt: "The clean inside of a trailer with its rear doors open" },
      { id: "maintenance", name: "General maintenance", body: "Rotations, pressure checks and tread inspections for one truck or a whole fleet.", alt: "A pressure gauge on a truck tire's valve stem" },
    ],
    alsoHeading: "We also do",
    also: [
      ["Mounting and installation", "We mount the tire on the rim and put the wheel back on your truck."],
      ["Roadside tire service", `Call ${PHONE} from the road and we'll see if someone can come out to you.`],
      ["Trailer brake repair", "We repair trailer brakes."],
      ["Minor repairs", "We put on new mudflaps and replace the hardware that holds them."],
    ],
    other: `For anything that isn't listed here, call ${PHONE} and ask.`,
  },

  reviews: {
    heading: "Reviews",
    ratingLine: `${REVIEWS.rating} average from ${REVIEWS.count} reviews`,
    mentions: "Customers often mention quick turnaround and fair prices.",
    link: "Read the reviews",
    asOf: `As listed online in ${REVIEWS.asOf}.`,
  },

  bookBand: {
    heading: "Need tires or a repair?",
    body: `Book a time online, or call ${PHONE} for a quote.`,
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

  visit: {
    heading: "How a visit goes",
    steps: [
      ["Book or pull in", `Book a time online, call ${PHONE}, or pull in ${WEEK.open}. Calling first lets us check whether we have your size.`],
      ["Tell us about the tire", "Give us the size and which axle it's on. If it went flat or got damaged, tell us what happened."],
      ["We look at it", "A tech inspects the tire to see if it can be safely repaired."],
      ["You get a price", "We tell you the cost before any work starts."],
      ["We do the work", "When it's done, you pay and get back on the road."],
    ],
    turnaround: {
      figure: "One customer had 8 tires changed in about 45 minutes.",
      note: "That's from one customer's review, not a promise. Ask how long your job will take when you book.",
    },
  },

  tireHelp: {
    heading: "Not sure what tire you need?",
    intro: "Read us the size off the sidewall, or text a photo of it, and we'll tell you what fits.",
    textPhoto: "Text us a photo of your sidewall",
    sizing: {
      heading: "Reading a tire size",
      code: "295/75R22.5",
      parts: [
        ["295", "Section width", "The tire is 295 millimeters wide."],
        ["75", "Aspect ratio", "The sidewall height is 75 percent of the width."],
        ["R", "Construction", "R means the tire is a radial."],
        ["22.5", "Rim diameter", "It fits a 22.5-inch rim."],
      ],
      note: "There's no aspect ratio in a size like 11R22.5, which is an 11-inch-wide radial for a 22.5-inch rim.",
    },
    positions: {
      heading: "Tire positions on a tractor-trailer",
      rows: [
        ["Steer", "Front axle, 2 tires. Rib tread, for steering and even wear. They should be the best tires on the truck."],
        ["Drive", "Powered tandem axles, 8 tires. Lug or block tread with deep grooves for traction."],
        ["Trailer", "Trailer tandem, 8 tires. Rib tread, built to carry the load and stand up to scrub in tight turns."],
      ],
      sizes: "Our most popular sizes are 295/75R22.5, 11R22.5 and 11R24.5.",
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

  booking: {
    title: `Book an appointment | ${SHOP.name}`,
    description: `Pick a day and time for new or used tires, flat repair, balancing, alignment and more at ${SHOP.name} in Dunn, NC.`,
    heading: "Book an appointment",
    intro: "Pick a day and time and tell us what the truck needs. We'll call to confirm.",
    fields: {
      service: { label: "What you need" },
      vehicle: { label: "Vehicle" },
      size: { label: "Tire size", hint: "If you know it, for example 295/75R22.5" },
      day: { label: "Day" },
      time: { label: "Time" },
      name: { label: "Your name", hint: "First name is fine" },
      phone: { label: "Phone number", hint: "We'll call this number to confirm" },
      email: { label: "Email", hint: "Optional" },
      notes: { label: "Anything else", hint: "Optional: what happened, how many tires" },
    },
    loadingDays: "Loading open days",
    pickDay: "Pick a day first",
    submit: "Request appointment",
    sending: "Sending",
    errors: {
      service: "Pick what you need.",
      day: "Pick a day.",
      time: "Pick a time.",
      name: "Tell us your name.",
      phone: "Enter a 10-digit phone number.",
    },
    success: {
      heading: "Request sent",
      body: (phone: string, day: string, time: string) =>
        `We'll call you at ${phone} to confirm ${day} at ${time}. If it's urgent, call ${PHONE}.`,
      another: "Book another",
    },
    failed: {
      heading: "Your request didn't go through",
      body: `Please send it as a text instead, or call ${PHONE}.`,
      text: "Send as a text",
      call: `Call ${PHONE}`,
    },
    noKey: {
      heading: "Send your request by text",
      body: `Text your request to the shop, or call ${PHONE}. We'll confirm your appointment.`,
    },
    smsIntro: "Hi, I'd like to book an appointment.",
    side: {
      hoursHeading: "Hours",
      whereHeading: "Where",
      callHeading: "Rather call?",
    },
  },

  actionBar: { quote: "Get a Quote", book: "Book", directions: "Directions" },

  sms: {
    greeting: "Hi, this is a quote request from your website.",
    sidewall: "Hi, here's a photo of my tire's sidewall. Can you tell me what fits?",
  },

  footer: {
    blurb: "We opened in 2020. The main shop is on Long Branch Road in Dunn.",
    visit: "Visit",
    call: "Call",
    hours: "Hours",
    links: "On this site",
    backToTop: "Back to top",
  },

  notFound: {
    heading: "Page not found",
    body: "The link may be old or mistyped.",
    home: "Go to the home page",
  },
} as const;

/** Every service, for the structured data. */
export const SERVICE_NAMES = [...COPY.services.main.map((s) => s.name), ...COPY.services.also.map(([name]) => name)];

/** What a customer can ask for in the quote and booking forms: the house tire, then every service. */
export const ALL_SERVICES = [COPY.ttp.name, ...SERVICE_NAMES];
