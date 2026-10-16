import { BOOKING } from "@/lib/business";
import { fullSlots, readLedger, type SlotKey } from "@/lib/slots";
import { ledgerStore, withDeadline } from "@/lib/slotStore";

export const dynamic = "force-dynamic";

// The edge caches the answer for a few seconds, but any query string skips that cache;
// this keeps a burst of such requests from turning into a storage read each.
let recent: { at: number; full: SlotKey[] } | null = null;
const RECENT_MS = 3000;

/** Times that are already full, so the booking page can show them as taken. */
export async function GET() {
  const store = ledgerStore();
  if (!store) return Response.json({ checking: false, full: [] });
  try {
    if (!recent || Date.now() - recent.at > RECENT_MS) {
      recent = { at: Date.now(), full: fullSlots(await withDeadline(readLedger(store), 5000), BOOKING.perSlot) };
    }
    // a few seconds at the edge is plenty: holding a place re-checks the time anyway
    return Response.json({ checking: true, full: recent.full }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=20" } });
  } catch (err) {
    console.error("Couldn't read the booked times", err);
    return Response.json({ checking: false, full: [] });
  }
}
