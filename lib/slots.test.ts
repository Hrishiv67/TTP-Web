import assert from "node:assert/strict";
import test from "node:test";
import {
  addBooking, findBooking, fullSlots, isSlotKey, memoryStore, parseLedger, prune, readLedger, removeBooking, slotKey,
  updateLedger, WriteConflict, type Booking, type Ledger,
} from "./slots.ts";

const booking = (id: string): Booking => ({ id, name: `Driver ${id}`, phone: "9105550100", service: "Tire repair", at: "2026-10-15T12:00:00Z" });
const KEY = slotKey("2026-10-16", "08:00");

test("a time takes three trucks, then it's full", () => {
  const ledger: Ledger = { slots: {} };
  assert.equal(addBooking(ledger, KEY, booking("a"), 3), true);
  assert.equal(addBooking(ledger, KEY, booking("b"), 3), true);
  assert.deepEqual(fullSlots(ledger, 3), []);
  assert.equal(addBooking(ledger, KEY, booking("c"), 3), true);
  assert.deepEqual(fullSlots(ledger, 3), [KEY]);
  assert.equal(addBooking(ledger, KEY, booking("d"), 3), false);
  assert.equal(ledger.slots[KEY].length, 3);
});

test("freeing a booking opens the time again, once", () => {
  const ledger: Ledger = { slots: {} };
  for (const id of ["a", "b", "c"]) addBooking(ledger, KEY, booking(id), 3);
  assert.equal(removeBooking(ledger, KEY, "b"), true);
  assert.equal(findBooking(ledger, KEY, "b"), undefined);
  assert.deepEqual(fullSlots(ledger, 3), []);
  assert.equal(removeBooking(ledger, KEY, "b"), false);
  assert.equal(removeBooking(ledger, slotKey("2026-10-17", "09:00"), "a"), false);
});

test("past days are dropped, upcoming ones kept", () => {
  const ledger: Ledger = { slots: { "2026-10-14T08:00": [booking("old")], [KEY]: [booking("new")], "2026-10-17T09:00": [] } };
  assert.equal(prune(ledger, "2026-10-16"), true);
  assert.deepEqual(Object.keys(ledger.slots), [KEY]);
  assert.equal(prune(ledger, "2026-10-16"), false);
});

test("a damaged or missing file reads as no bookings", () => {
  assert.deepEqual(parseLedger(null), { slots: {} });
  assert.deepEqual(parseLedger("not json"), { slots: {} });
  assert.deepEqual(parseLedger('{"other":1}'), { slots: {} });
});

test("slot keys", () => {
  assert.equal(KEY, "2026-10-16T08:00");
  assert.equal(isSlotKey(KEY), true);
  for (const bad of ["2026-10-16", "2026-10-16T8:00", "../ledger", 42, null]) assert.equal(isSlotKey(bad), false);
});

test("ten people booking the same time at once: exactly three get it", async () => {
  const store = memoryStore();
  const tries = Array.from({ length: 10 }, (_, i) =>
    updateLedger(store, (ledger) => {
      const added = addBooking(ledger, KEY, booking(String(i)), 3);
      return { changed: added, result: added };
    }, 50),
  );
  const results = await Promise.all(tries);
  assert.equal(results.filter(Boolean).length, 3);
  const ledger = await readLedger(store);
  assert.equal(ledger.slots[KEY].length, 3);
  assert.equal(new Set(ledger.slots[KEY].map((b) => b.id)).size, 3);
});

test("a save based on an old read is refused", async () => {
  const store = memoryStore();
  await store.write("{}", null);
  const first = await store.read();
  await store.write('{"slots":{}}', first!.version);
  await assert.rejects(store.write("{}", first!.version), WriteConflict);
  await assert.rejects(store.write("{}", null), WriteConflict);
});

test("an unchanged ledger isn't written", async () => {
  let writes = 0;
  const inner = memoryStore();
  const store = { read: () => inner.read(), write: (t: string, v: string | null) => (writes++, inner.write(t, v)) };
  const found = await updateLedger(store, (ledger) => ({ changed: false, result: findBooking(ledger, KEY, "x") }));
  assert.equal(found, undefined);
  assert.equal(writes, 0);
});
