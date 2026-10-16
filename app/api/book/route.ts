import { randomUUID } from "node:crypto";
import { BOOKING, HOURS, TIME_ZONE } from "@/lib/business";
import { openDays, shopToday, slotsFor, validPhone } from "@/lib/booking";
import { addBooking, HOLD_MINUTES, prune, slotKey, updateLedger, visitorCount } from "@/lib/slots";
import { ledgerStore, signBooking, visitorTag, withDeadline } from "@/lib/slotStore";

export const dynamic = "force-dynamic";

/** More places than one visitor could need (a fleet booking several trucks still fits). */
const MAX_PER_VISITOR = 6;

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/**
 * Holds a place at a time while the booking email goes out; the page confirms it once the
 * email is sent (/api/confirm), and an unconfirmed hold lapses after HOLD_MINUTES.
 * Answers 409 when the time is full, 400 when it isn't bookable (passed, closed, or not a
 * real time), and 429 when one visitor already holds MAX_PER_VISITOR places. If the bookings
 * can't be reached it still says yes, marked unchecked, so a storage hiccup never turns a
 * customer away.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const day = text(body?.day, 10);
  const time = text(body?.time, 5);
  const name = text(body?.name, 80);
  const phone = text(body?.phone, 30);
  const service = text(body?.service, 80);

  const now = new Date();
  const open = openDays(now, HOURS, TIME_ZONE, BOOKING).find((d) => d.iso === day);
  const bookable = !!open && slotsFor(open, now, HOURS, TIME_ZONE, BOOKING).some((s) => s.value === time);
  if (!bookable) return Response.json({ ok: false, reason: "unavailable" }, { status: 400 });
  if (!name || !validPhone(phone)) return Response.json({ ok: false, reason: "invalid" }, { status: 400 });

  const store = ledgerStore();
  if (!store) return Response.json({ ok: true, checked: false });
  const key = slotKey(day, time);
  const id = randomUUID();
  const visitor = visitorTag(req);
  const until = new Date(now.getTime() + HOLD_MINUTES * 60_000).toISOString();
  try {
    const answer = await withDeadline(
      updateLedger(store, (ledger) => {
        const pruned = prune(ledger, shopToday(now, TIME_ZONE), now.getTime());
        if (visitorCount(ledger, visitor, now.getTime()) >= MAX_PER_VISITOR) return { changed: pruned, result: "busy" as const };
        const added = addBooking(ledger, key, { id, name, phone, service, at: now.toISOString(), visitor, until }, BOOKING.perSlot, now.getTime());
        return { changed: added || pruned, result: added ? ("held" as const) : ("full" as const) };
      }),
    );
    if (answer === "full") return Response.json({ ok: false, reason: "full" }, { status: 409 });
    if (answer === "busy") return Response.json({ ok: false, reason: "busy" }, { status: 429 });
    return Response.json({ ok: true, checked: true, slot: key, id, sig: signBooking(key, id) });
  } catch (err) {
    console.error("Couldn't hold the time", err);
    return Response.json({ ok: true, checked: false });
  }
}
