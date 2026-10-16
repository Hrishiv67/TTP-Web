import { confirmBooking, updateLedger } from "@/lib/slots";
import { bookingRef, withDeadline } from "@/lib/slotStore";

export const dynamic = "force-dynamic";

/** The booking email went out: keep the held place for good instead of letting it lapse. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ref = bookingRef({ slot: body?.slot, id: body?.id, sig: body?.sig });
  if (ref instanceof Response) return ref;
  try {
    const found = await withDeadline(
      updateLedger(ref.store, (ledger) => {
        const { found, changed } = confirmBooking(ledger, ref.slot, ref.id);
        return { changed, result: found };
      }),
    );
    return Response.json({ ok: found }, { status: found ? 200 : 404 });
  } catch (err) {
    console.error("Couldn't confirm the booking", err);
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503 });
  }
}
