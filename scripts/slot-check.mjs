// Checks the double-booking protection on the live site, without emailing anyone: holds
// the same time once more than it takes, checks the extra one is refused and the time
// shows as full, then frees every hold it made. Runs on GitHub Actions
// (.github/workflows/booking-check.yml, check: slots).
//
//   SITE   the site to check (default https://truck-tire-pro.vercel.app)
import { BOOKING, HOURS, TIME_ZONE } from "../lib/business.ts";
import { openDays, slotsFor } from "../lib/booking.ts";

const SITE = process.env.SITE || "https://truck-tire-pro.vercel.app";
const json = { "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// the server keeps its answer for 3 seconds, so wait that out before each read
const fullTimes = async () => {
  await sleep(3500);
  return (await fetch(`${SITE}/api/slots?check=${Date.now()}`, { cache: "no-store" })).json();
};
const fail = (msg) => {
  console.log(`::error::${msg}`);
  process.exitCode = 1;
};

const first = await fullTimes();
if (!first.checking) {
  fail("The site isn't checking for full times: the Blob store isn't connected to the project (no BLOB_READ_WRITE_TOKEN), or it can't be reached.");
  process.exit();
}

// the last time on the last open day: the least likely to clash with a real booking
const now = new Date();
const day = openDays(now, HOURS, TIME_ZONE, BOOKING).at(-1);
const time = slotsFor(day, now, HOURS, TIME_ZONE, BOOKING).at(-1).value;
const key = `${day.iso}T${time}`;
console.log(`Checking ${key}, which takes ${BOOKING.perSlot} bookings.`);

const holds = [];
try {
  const answers = [];
  for (let i = 0; i <= BOOKING.perSlot; i++) {
    const res = await fetch(`${SITE}/api/book`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ day: day.iso, time, name: "Slot check (automatic, freed right away)", phone: "9105550100", service: "Test" }),
    });
    const data = await res.json().catch(() => ({}));
    answers.push(res.status);
    if (data.id) holds.push({ slot: data.slot, id: data.id, sig: data.sig });
    if (res.ok && !data.checked) fail("A hold came back unchecked: the bookings couldn't be read or saved.");
  }
  console.log(`Holding it ${BOOKING.perSlot + 1} times answered: ${answers.join(", ")}`);
  const want = [...Array(BOOKING.perSlot).fill(200), 409];
  if (answers.join() !== want.join()) fail(`Expected ${want.join(", ")}.`);
  // existing bookings at this time would make it fill sooner; that's fine, but say so
  if (holds.length < BOOKING.perSlot) console.log(`::warning::Only ${holds.length} holds fit: the time already had real bookings.`);

  const during = await fullTimes();
  if (!during.full.includes(key)) fail("The time didn't show as full.");
  else console.log("The time shows as full.");

  // a confirmed hold (the booking email went out) stays until it's freed
  if (holds[0]) {
    const res = await fetch(`${SITE}/api/confirm`, { method: "POST", headers: json, body: JSON.stringify(holds[0]) });
    if (!res.ok) fail(`Confirming a hold answered ${res.status}.`);
    else console.log("Confirming a hold works.");
  }
} finally {
  for (const h of holds) {
    const res = await fetch(`${SITE}/api/release`, { method: "POST", headers: json, body: JSON.stringify(h) });
    const data = await res.json().catch(() => ({}));
    if (!data.removed) fail(`Couldn't free hold ${h.id}: ${res.status} ${JSON.stringify(data)}`);
  }
  console.log(`Freed ${holds.length} holds.`);
}

const after = await fullTimes();
if (holds.length === BOOKING.perSlot && after.full.includes(key)) fail("The time still shows as full after freeing it.");
if (!process.exitCode) console.log("RESULT: double-booking protection works.");
