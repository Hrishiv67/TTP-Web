import { findBooking, isLive, readLedger, removeBooking, updateLedger } from "@/lib/slots";
import { bookingRef, withDeadline } from "@/lib/slotStore";

export const dynamic = "force-dynamic";

/** What a "Free up this time" link points to, for the page that asks to confirm. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const ref = bookingRef({ slot: q.get("slot"), id: q.get("id"), sig: q.get("sig") });
  if (ref instanceof Response) return ref;
  try {
    const booking = findBooking(await withDeadline(readLedger(ref.store)), ref.slot, ref.id);
    const live = booking && isLive(booking, Date.now());
    return Response.json({ ok: true, slot: ref.slot, booking: live ? { name: booking.name, service: booking.service } : null });
  } catch (err) {
    console.error("Couldn't read the booking", err);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503 });
  }
}

/** Frees a booked place: from the shop's "Free up this time" link, or when the email didn't go out. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ref = bookingRef({ slot: body?.slot, id: body?.id, sig: body?.sig });
  if (ref instanceof Response) return ref;
  try {
    const removed = await withDeadline(
      updateLedger(ref.store, (ledger) => {
        const gone = removeBooking(ledger, ref.slot, ref.id);
        return { changed: gone, result: gone };
      }),
    );
    return Response.json({ ok: true, removed });
  } catch (err) {
    console.error("Couldn't free the time", err);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503 });
  }
}
