/**
 * Booked appointment times, so no time takes more trucks than the shop can handle
 * (BOOKING.perSlot). The bookings live in one small JSON file (the "ledger"); every change
 * reads it, edits it and writes it back only if nobody else wrote in between, retrying
 * when someone did. The storage itself is passed in: Vercel Blob in production
 * (lib/slotStore.ts), or memory for tests and local development.
 */

/** "2026-10-16T08:00": a day (Day.iso) and a start time (Slot.value), on the shop's clock. */
export type SlotKey = string;
export const slotKey = (dayIso: string, time: string): SlotKey => `${dayIso}T${time}`;
export const isSlotKey = (s: unknown): s is SlotKey => typeof s === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s);

export type Booking = {
  id: string;
  name: string;
  phone: string;
  service: string;
  at: string;
  /** a hash of the visitor's address, to cap how many places one visitor can hold */
  visitor?: string;
  /** the random key in this booking's links (confirm, free up); never sent anywhere else */
  key?: string;
  /**
   * Set while the booking email goes out: the place lapses at this time unless the page
   * confirms the email was sent, so a closed tab or a lost email can't keep it forever.
   */
  until?: string;
};
export type Ledger = { slots: Record<SlotKey, Booking[]> };

/** How long a place is held while the booking email goes out. */
export const HOLD_MINUTES = 15;

/** A booking still counts unless it was a hold that lapsed. */
export const isLive = (b: Booking, now: number) => !b.until || Date.parse(b.until) > now;
const liveIn = (list: Booking[] | undefined, now: number) => (list ?? []).filter((b) => isLive(b, now));

/** Times that already have `capacity` bookings. */
export function fullSlots(ledger: Ledger, capacity: number, now = Date.now()): SlotKey[] {
  return Object.entries(ledger.slots)
    .filter(([, list]) => liveIn(list, now).length >= capacity)
    .map(([key]) => key)
    .sort();
}

/** How many places one visitor holds right now. */
export function visitorCount(ledger: Ledger, visitor: string, now = Date.now()): number {
  return Object.values(ledger.slots).reduce((n, list) => n + liveIn(list, now).filter((b) => b.visitor === visitor).length, 0);
}

/** Drops days before `todayIso` and lapsed holds, so the file only holds what still counts. */
export function prune(ledger: Ledger, todayIso: string, now = Date.now()): boolean {
  let changed = false;
  for (const key of Object.keys(ledger.slots)) {
    const kept = key.slice(0, 10) < todayIso ? [] : liveIn(ledger.slots[key], now);
    if (kept.length !== ledger.slots[key].length) changed = true;
    if (kept.length) ledger.slots[key] = kept;
    else {
      delete ledger.slots[key];
      changed = true;
    }
  }
  return changed;
}

/**
 * Adds a booking if the time has room. Adding the same booking (same id) twice is a no-op
 * that still answers yes, so a save retried after it actually went through can't double it.
 */
export function addBooking(ledger: Ledger, key: SlotKey, booking: Booking, capacity: number, now = Date.now()): boolean {
  const list = (ledger.slots[key] ??= []);
  if (list.some((b) => b.id === booking.id)) return true;
  if (liveIn(list, now).length >= capacity) return false;
  list.push(booking);
  return true;
}

/** The booking email went out: keep the place for good. False if the booking isn't there. */
export function confirmBooking(ledger: Ledger, key: SlotKey, id: string): { found: boolean; changed: boolean } {
  const b = ledger.slots[key]?.find((x) => x.id === id);
  if (!b) return { found: false, changed: false };
  if (!b.until) return { found: true, changed: false };
  delete b.until;
  return { found: true, changed: true };
}

/** Removes a booking; false if it wasn't there (already freed, or the day has passed). */
export function removeBooking(ledger: Ledger, key: SlotKey, id: string): boolean {
  const list = ledger.slots[key];
  const i = list ? list.findIndex((b) => b.id === id) : -1;
  if (i < 0) return false;
  list.splice(i, 1);
  if (!list.length) delete ledger.slots[key];
  return true;
}

export function findBooking(ledger: Ledger, key: SlotKey, id: string): Booking | undefined {
  return ledger.slots[key]?.find((b) => b.id === id);
}

export function parseLedger(text: string | null): Ledger {
  try {
    const data = text ? JSON.parse(text) : null;
    if (data && typeof data.slots === "object" && data.slots) return { slots: data.slots };
  } catch {}
  return { slots: {} };
}

// ------------------------------------------------------------------ storage

/** Where the ledger lives. `write` must fail with a WriteConflict if the file changed since `read`. */
export type LedgerStore = {
  read(): Promise<{ text: string; version: string } | null>;
  write(text: string, version: string | null): Promise<void>;
};

export class WriteConflict extends Error {
  constructor() {
    super("The bookings changed while saving");
  }
}

/**
 * Reads the ledger, lets `change` edit it, and saves it if `change` says it changed.
 * When someone else saved in between, it starts over from a fresh read.
 */
export async function updateLedger<T>(
  store: LedgerStore,
  change: (ledger: Ledger) => { changed: boolean; result: T },
  attempts = 8,
): Promise<T> {
  for (let n = 1; ; n++) {
    const current = await store.read();
    const ledger = parseLedger(current?.text ?? null);
    const { changed, result } = change(ledger);
    if (!changed) return result;
    try {
      await store.write(JSON.stringify(ledger), current?.version ?? null);
      return result;
    } catch (err) {
      if (!(err instanceof WriteConflict) || n >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 40 * n + Math.random() * 120));
    }
  }
}

export async function readLedger(store: LedgerStore): Promise<Ledger> {
  return parseLedger((await store.read())?.text ?? null);
}

/** A ledger in memory, with the same conflict rule as the real store. */
export function memoryStore(): LedgerStore {
  let file: { text: string; version: string } | null = null;
  let n = 0;
  return {
    async read() {
      return file && { ...file };
    },
    async write(text, version) {
      if ((file?.version ?? null) !== version) throw new WriteConflict();
      file = { text, version: String(++n) };
    },
  };
}
