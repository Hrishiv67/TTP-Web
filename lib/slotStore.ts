/**
 * Server side of the booked-times ledger (lib/slots.ts): where it's stored, and the keys
 * on each booking's links.
 *
 * In production the ledger is one private file in Vercel Blob (the store connected to the
 * project). Without a store the site still takes bookings, it just can't check for full
 * times. In local development (`next dev`) the ledger lives in memory.
 *
 * Each booking gets its own random key, kept only in the private ledger; its links (the
 * shop's "Free up this time", the page's confirm and release) carry that key, so nobody can
 * make a working link for a booking they didn't get one for.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { BlobError, BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { fullSlots, isSlotKey, memoryStore, readLedger, WriteConflict, type Booking, type LedgerStore, type SlotKey } from "./slots";

const PATH = "bookings/ledger.json";

function blobStore(): LedgerStore {
  return {
    async read() {
      // straight from storage, never a cached copy, so a save can't be based on old data
      const res = await get(PATH, { access: "private", useCache: false });
      if (!res || res.statusCode !== 200) return null;
      return { text: await new Response(res.stream).text(), version: res.blob.etag };
    },
    async write(text, version) {
      try {
        await put(PATH, text, {
          access: "private",
          contentType: "application/json",
          addRandomSuffix: false,
          cacheControlMaxAge: 60,
          // a first write fails if someone else created the file meanwhile; later writes fail
          // if it changed since it was read
          ...(version ? { allowOverwrite: true, ifMatch: version } : { allowOverwrite: false }),
        });
      } catch (err) {
        if (err instanceof BlobPreconditionFailedError || (!version && err instanceof BlobError)) throw new WriteConflict();
        throw err;
      }
    },
  };
}

const globalForStore = globalThis as unknown as { ttpLedger?: LedgerStore };

/**
 * The ledger's store, or null when there's nowhere to keep it (the site then skips the
 * check). A store connected to the project gives BLOB_STORE_ID (signed in through Vercel's
 * own identity) or, on older setups, BLOB_READ_WRITE_TOKEN.
 */
export function ledgerStore(): LedgerStore | null {
  if (process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN) return blobStore();
  if (process.env.NODE_ENV === "development") return (globalForStore.ttpLedger ??= memoryStore());
  return null;
}

/** A fresh random key for a booking's links. */
export const newBookingKey = () => randomBytes(24).toString("base64url");

/** Whether a link's key is the booking's own (compared in constant time). */
export function keyMatches(booking: Booking | undefined, given: unknown): boolean {
  if (!booking?.key || typeof given !== "string") return false;
  const want = Buffer.from(booking.key);
  const got = Buffer.from(given);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** The slot, booking id and key a link or request names, or a Response saying what's wrong. */
export function bookingRef({ slot, id, sig }: { slot: unknown; id: unknown; sig: unknown }) {
  if (!isSlotKey(slot) || typeof id !== "string" || !id || typeof sig !== "string" || !sig) {
    return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const store = ledgerStore();
  if (!store) return Response.json({ ok: false, reason: "unavailable" }, { status: 503 });
  return { slot, id, sig, store };
}

/** A short, one-way tag for the visitor's address (never the address itself). */
export function visitorTag(req: Request): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`ttp-visitor|${process.env.BLOB_STORE_ID ?? ""}|${ip}`).digest("base64url").slice(0, 16);
}

// The edge caches /api/slots for a few seconds, but any query string skips that cache;
// keeping the answer here for a moment stops a burst of such requests from each costing a
// storage read. Any save made by this server clears it.
// (kept on globalThis: each route can be bundled with its own copy of this module)
const recent = globalThis as unknown as { ttpRecentFull?: { at: number; full: SlotKey[] } | null };
const RECENT_MS = 3000;

/** Times that are full right now, read at most once every few seconds per server. */
export async function cachedFullSlots(store: LedgerStore, capacity: number): Promise<SlotKey[]> {
  const hit = recent.ttpRecentFull;
  if (hit && Date.now() - hit.at <= RECENT_MS) return hit.full;
  const full = fullSlots(await withDeadline(readLedger(store), 5000), capacity);
  recent.ttpRecentFull = { at: Date.now(), full };
  return full;
}

/** Call after saving a change, so the next availability read is fresh. */
export function forgetFullSlots() {
  recent.ttpRecentFull = null;
}

/** Gives up on slow storage after `ms`, so a request never hangs waiting on it. */
export function withDeadline<T>(work: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([work, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`No answer from storage in ${ms} ms`)), ms))]);
}
