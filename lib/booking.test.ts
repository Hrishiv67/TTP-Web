import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingSummary, openDays, slotsFor, validPhone } from "./booking.ts";
import { BOOKING, HOURS, TIME_ZONE } from "./business.ts";

const days = (iso: string) => openDays(new Date(iso), HOURS, TIME_ZONE, BOOKING);

test("starts today when there's still time, and skips Sundays", () => {
  const d = days("2026-10-16T13:00:00Z"); // Fri 09:00 EDT
  assert.equal(d.length, BOOKING.daysAhead);
  assert.equal(d[0].iso, "2026-10-16");
  assert.match(d[0].label, /^Today/);
  assert.equal(d[1].iso, "2026-10-17"); // Saturday
  assert.equal(d[2].iso, "2026-10-19"); // Sunday skipped
  assert.ok(d.every((x) => x.weekday !== 0));
});

test("rolls to the next open day after the last bookable slot", () => {
  const d = days("2026-10-17T19:45:00Z"); // Sat 15:45: last slot 16:30 is under an hour away
  assert.equal(d[0].iso, "2026-10-19");
  assert.equal(d[0].short, "Monday, October 19");
});

test("uses the shop's date, not the viewer's", () => {
  // 02:00 UTC Saturday is still Friday evening in Dunn
  const d = days("2026-10-17T02:00:00Z");
  assert.equal(d[0].iso, "2026-10-17");
  assert.match(d[0].label, /^Tomorrow/);
});

test("offers half-hour slots and drops today's past ones", () => {
  const now = new Date("2026-10-16T13:00:00Z"); // Fri 09:00
  const [today, sat] = days("2026-10-16T13:00:00Z");
  const t = slotsFor(today, now, HOURS, TIME_ZONE, BOOKING);
  assert.equal(t[0].label, "10 AM");
  assert.equal(t[t.length - 1].label, "4:30 PM");
  const s = slotsFor(sat, now, HOURS, TIME_ZONE, BOOKING);
  assert.equal(s[0].value, "08:00");
  assert.equal(s.length, 18);
});

test("summarizes a request and checks phone numbers", () => {
  const msg = bookingSummary({
    service: "Flat repair", vehicle: "Semi tractor", size: "295/75r22.5", day: "Monday, October 19", time: "9 AM",
    name: " Dale ", phone: "910 555 0100", email: "", notes: "",
  });
  assert.equal(msg, "Service: Flat repair\nVehicle: Semi tractor\nTire size: 295/75R22.5\nDay: Monday, October 19\nTime: 9 AM\nName: Dale\nPhone: 910 555 0100");
  assert.ok(validPhone("(910) 555-0100"));
  assert.ok(validPhone("+1 910 555 0100"));
  assert.ok(!validPhone("555-0100"));
});
