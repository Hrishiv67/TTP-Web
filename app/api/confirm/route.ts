import { confirmBooking, findBooking, updateLedger } from "@/lib/slots";
import { bookingRef, forgetFullSlots, keyMatches, withDeadline } from "@/lib/slotStore";

export const dynamic = "force-dynamic";

/** The booking email went out: keep the held place for good instead of letting it lapse. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ref = bookingRef({ slot: body?.slot, id: body?.id, sig: body?.sig });
  if (ref instanceof Response) return ref;
  try {
    const answer = await withDeadline(
      updateLedger(ref.store, (ledger) => {
        const booking = findBooking(ledger, ref.slot, ref.id);
        if (!booking) return { changed: false, result: "gone" as const };
        if (!keyMatches(booking, ref.sig)) return { changed: false, result: "denied" as const };
        return { changed: confirmBooking(ledger, ref.slot, ref.id).changed, result: "kept" as const };
      }),
    );
    forgetFullSlots();
    if (answer === "denied") return Response.json({ ok: false, reason: "invalid" }, { status: 403 });
    return Response.json({ ok: answer === "kept" }, { status: answer === "kept" ? 200 : 404 });
  } catch (err) {
    console.error("Couldn't confirm the booking", err);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503 });
  }
}
