/**
 * Appointment days and times, on the shop's clock. The booking page offers the next
 * open days and, for each, the half-hour starts from opening until 30 minutes before
 * closing, skipping times that are already past (with an hour's notice) today.
 */
import { formatTime, shopClock, type Schedule } from "./hours.ts";

export type BookingRules = { slotMinutes: number; lastSlotBeforeClose: number; leadMinutes: number; daysAhead: number };
export type Day = { iso: string; weekday: number; label: string; short: string };
export type Slot = { value: string; label: string };

/** The shop's calendar date for a moment, as [year, month (1-12), day]. */
function shopDate(date: Date, timeZone: string): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return [get("year"), get("month"), get("day")];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Slots on a given weekday, as minutes after midnight. */
function daySlots(schedule: Schedule, weekday: number, rules: BookingRules): number[] {
  const hours = schedule[weekday];
  if (!hours) return [];
  const out: number[] = [];
  for (let m = hours.open; m <= hours.close - rules.lastSlotBeforeClose; m += rules.slotMinutes) out.push(m);
  return out;
}

/** The next `rules.daysAhead` open days, starting today if any slot is still bookable. */
export function openDays(now: Date, schedule: Schedule, timeZone: string, rules: BookingRules): Day[] {
  const [y, mo, d] = shopDate(now, timeZone);
  const clock = shopClock(now, timeZone);
  const days: Day[] = [];
  for (let k = 0; days.length < rules.daysAhead && k < 60; k++) {
    // calendar arithmetic at noon UTC, so DST and the viewer's time zone can't shift the date
    const noon = new Date(Date.UTC(y, mo - 1, d + k, 12));
    const weekday = noon.getUTCDay();
    let slots = daySlots(schedule, weekday, rules);
    if (k === 0) slots = slots.filter((m) => m >= clock.minutes + rules.leadMinutes);
    if (!slots.length) continue;
    const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...o }).format(noon);
    days.push({
      iso: `${noon.getUTCFullYear()}-${pad(noon.getUTCMonth() + 1)}-${pad(noon.getUTCDate())}`,
      weekday,
      label: k === 0 ? `Today, ${fmt({ month: "short", day: "numeric" })}` : k === 1 ? `Tomorrow, ${fmt({ month: "short", day: "numeric" })}` : fmt({ weekday: "short", month: "short", day: "numeric" }),
      short: fmt({ weekday: "long", month: "long", day: "numeric" }),
    });
  }
  return days;
}

/** Bookable start times on a day (from openDays), with today's past times removed. */
export function slotsFor(day: Day, now: Date, schedule: Schedule, timeZone: string, rules: BookingRules): Slot[] {
  const [y, mo, d] = shopDate(now, timeZone);
  const todayIso = `${y}-${pad(mo)}-${pad(d)}`;
  const nowMin = shopClock(now, timeZone).minutes;
  return daySlots(schedule, day.weekday, rules)
    .filter((m) => day.iso !== todayIso || m >= nowMin + rules.leadMinutes)
    .map((m) => ({ value: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`, label: formatTime(m) }));
}

export type BookingRequest = {
  service: string;
  vehicle: string;
  size: string;
  day: string; // Day.short
  time: string; // Slot.label
  name: string;
  phone: string;
  email: string;
  notes: string;
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Plain-text summary, used for the text-message fallback. */
export function bookingSummary(r: BookingRequest): string {
  const rows: [string, string][] = [
    ["Service", r.service],
    ["Vehicle", r.vehicle],
    ["Tire size", r.size.toUpperCase()],
    ["Day", r.day],
    ["Time", r.time],
    ["Name", r.name],
    ["Phone", r.phone],
    ["Email", r.email],
    ["Notes", r.notes],
  ];
  return rows
    .map(([k, v]) => [k, clean(v)] as const)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

/** US phone numbers: 10 digits, optionally with a leading 1. */
export const validPhone = (s: string) => /^1?\d{10}$/.test(s.replace(/\D/g, ""));
