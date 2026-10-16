/**
 * Server side of the booked-times ledger (lib/slots.ts): where it's stored, and the
 * signatures on "Free up this time" links.
 *
 * In production the ledger is one private file in Vercel Blob, which needs the store's
 * BLOB_READ_WRITE_TOKEN (added when the store is connected to the project). Without it the
 * site still takes bookings, it just can't check for full times. In local development
 * (`next dev`) the ledger lives in memory.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { BlobError, BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { isSlotKey, memoryStore, WriteConflict, type LedgerStore, type SlotKey } from "./slots";

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

/** The ledger's store, or null when there's nowhere to keep it (the site then skips the check). */
export function ledgerStore(): LedgerStore | null {
  if (process.env.BLOB_READ_WRITE_TOKEN) return blobStore();
  if (process.env.NODE_ENV === "development") return (globalForStore.ttpLedger ??= memoryStore());
  return null;
}

function secret(): string {
  return process.env.BOOKING_SECRET || process.env.BLOB_READ_WRITE_TOKEN || "local development only";
}

/** Signature for a booking's "Free up this time" link. */
export function signBooking(key: SlotKey, id: string): string {
  return createHmac("sha256", secret()).update(`ttp-booking|${key}|${id}`).digest("base64url");
}

export function validSignature(key: SlotKey, id: string, sig: unknown): boolean {
  if (typeof sig !== "string" || !sig) return false;
  const want = Buffer.from(signBooking(key, id));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** A booking a signed link or request points to, or a Response saying why not. */
export function bookingRef({ slot, id, sig }: { slot: unknown; id: unknown; sig: unknown }) {
  if (!isSlotKey(slot) || typeof id !== "string" || !id) return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
  if (!validSignature(slot, id, sig)) return Response.json({ ok: false, reason: "invalid" }, { status: 403 });
  const store = ledgerStore();
  if (!store) return Response.json({ ok: false, reason: "unavailable" }, { status: 503 });
  return { slot, id, store };
}

/** A short, one-way tag for the visitor's address (never the address itself). */
export function visitorTag(req: Request): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return createHmac("sha256", secret()).update(`ttp-visitor|${ip}`).digest("base64url").slice(0, 16);
}

/** Gives up on slow storage after `ms`, so a request never hangs waiting on it. */
export function withDeadline<T>(work: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([work, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`No answer from storage in ${ms} ms`)), ms))]);
}
