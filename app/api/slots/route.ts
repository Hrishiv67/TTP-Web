import { BOOKING } from "@/lib/business";
import { fullSlots, readLedger } from "@/lib/slots";
import { ledgerStore } from "@/lib/slotStore";

export const dynamic = "force-dynamic";

/** Times that are already full, so the booking page can show them as taken. */
export async function GET() {
  const store = ledgerStore();
  if (!store) return Response.json({ checking: false, full: [] });
  try {
    const full = fullSlots(await readLedger(store), BOOKING.perSlot);
    // a few seconds at the edge is plenty: holding a place re-checks the time anyway
    return Response.json({ checking: true, full }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=20" } });
  } catch (err) {
    console.error("Couldn't read the booked times", err);
    return Response.json({ checking: false, full: [] });
  }
}
