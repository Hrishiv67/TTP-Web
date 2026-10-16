import { findBooking, isSlotKey, readLedger, removeBooking, updateLedger } from "@/lib/slots";
import { ledgerStore, validSignature } from "@/lib/slotStore";

export const dynamic = "force-dynamic";

type Ref = { slot: unknown; id: unknown; sig: unknown };

/** The booking a signed link points to, or a Response explaining why not. */
function check({ slot, id, sig }: Ref) {
  if (!isSlotKey(slot) || typeof id !== "string" || !id) return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  if (!validSignature(slot, id, sig)) return Response.json({ ok: false, reason: "invalid" }, { status: 403 });
  const store = ledgerStore();
  if (!store) return Response.json({ ok: false, reason: "unavailable" }, { status: 503 });
  return { slot, id, store };
}

/** What a "Free up this time" link points to, for the page that asks to confirm. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const ref = check({ slot: q.get("slot"), id: q.get("id"), sig: q.get("sig") });
  if (ref instanceof Response) return ref;
  try {
    const booking = findBooking(await readLedger(ref.store), ref.slot, ref.id);
    return Response.json({ ok: true, slot: ref.slot, booking: booking ? { name: booking.name, service: booking.service } : null });
  } catch (err) {
    console.error("Couldn't read the booking", err);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503 });
  }
}

/** Frees a booked place: from the shop's "Free up this time" link, or when the email didn't go out. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ref = check({ slot: body?.slot, id: body?.id, sig: body?.sig });
  if (ref instanceof Response) return ref;
  try {
    const removed = await updateLedger(ref.store, (ledger) => {
      const gone = removeBooking(ledger, ref.slot, ref.id);
      return { changed: gone, result: gone };
    });
    return Response.json({ ok: true, removed });
  } catch (err) {
    console.error("Couldn't free the time", err);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503 });
  }
}
