import { test } from "node:test";
import assert from "node:assert/strict";
import { formatRange, formatTime, shopClock, shopStatus, weekHours } from "./hours.ts";
import { HOURS, TIME_ZONE } from "./business.ts";

// October dates are EDT (UTC-4); January is EST (UTC-5).
const at = (iso: string) => shopStatus(HOURS, new Date(iso), TIME_ZONE);

test("reads the shop's wall clock, not UTC", () => {
  assert.deepEqual(shopClock(new Date("2026-10-12T14:30:00Z"), TIME_ZONE), { day: 1, minutes: 10 * 60 + 30 });
  assert.deepEqual(shopClock(new Date("2027-01-15T13:00:00Z"), TIME_ZONE), { day: 5, minutes: 8 * 60 });
});

test("open mid-morning on a weekday", () => {
  const s = at("2026-10-12T14:00:00Z"); // Mon 10:00
  assert.equal(s.open, true);
  assert.equal(s.label, "Open now, closes at 5 PM");
});

test("counts down the last hour", () => {
  assert.equal(at("2026-10-12T20:35:00Z").label, "Open now, closes in 25 min"); // Mon 16:35
});

test("closed before opening on a weekday", () => {
  const s = at("2026-10-12T11:15:00Z"); // Mon 07:15
  assert.equal(s.open, false);
  assert.equal(s.label, "Closed, opens today at 8 AM");
});

test("closed at 5 sharp, opens tomorrow midweek", () => {
  const s = at("2026-10-13T21:00:00Z"); // Tue 17:00
  assert.equal(s.open, false);
  assert.equal(s.label, "Closed, opens tomorrow at 8 AM");
});

test("open Saturdays; Saturday evening and Sunday roll to Monday", () => {
  assert.equal(at("2026-10-16T22:00:00Z").label, "Closed, opens tomorrow at 8 AM"); // Fri 18:00
  assert.equal(at("2026-10-17T15:00:00Z").open, true); // Sat 11:00
  assert.equal(at("2026-10-17T22:00:00Z").label, "Closed, opens Monday at 8 AM"); // Sat 18:00
  assert.equal(at("2026-10-18T15:00:00Z").short, "Closed, opens tomorrow 8 AM"); // Sun 11:00
  assert.equal(at("2026-10-17T22:00:00Z").short, "Closed, opens Mon 8 AM"); // Sat 18:00
  assert.equal(at("2026-10-12T00:30:00Z").label, "Closed, opens tomorrow at 8 AM"); // Sun 20:30
});

test("standard time is handled the same way", () => {
  assert.equal(at("2027-01-15T13:00:00Z").open, true); // Fri 08:00 EST
  assert.equal(at("2027-01-15T12:59:00Z").open, false); // Fri 07:59 EST
});

test("formats times and ranges", () => {
  assert.equal(formatTime(8 * 60), "8 AM");
  assert.equal(formatTime(17 * 60 + 30), "5:30 PM");
  assert.equal(formatTime(0), "12 AM");
  assert.equal(formatTime(12 * 60), "12 PM");
  assert.equal(formatRange(HOURS[1]), "8 AM to 5 PM");
  assert.equal(formatRange(HOURS[0]), "Closed");
});

test("summarizes the week", () => {
  assert.deepEqual(weekHours(HOURS), { open: "Monday to Saturday, 8 AM to 5 PM", closed: "Sunday" });
  const weekdays = { ...HOURS, 6: null };
  assert.deepEqual(weekHours(weekdays), { open: "Monday to Friday, 8 AM to 5 PM", closed: "Saturday and Sunday" });
});
