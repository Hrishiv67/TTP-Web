import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteMessage, smsHref, type QuoteRequest } from "./quote.ts";

const base: QuoteRequest = {
  name: "",
  vehicle: "Semi tractor",
  service: "New tires",
  position: "",
  size: "",
  quantity: "",
  location: "",
  notes: "",
};

test("skips empty fields", () => {
  assert.equal(
    quoteMessage(base, "Truck Tire Pro"),
    "Hi Truck Tire Pro, quote request from your website.\nVehicle: Semi tractor\nNeed: New tires",
  );
});

test("includes everything that was filled in, tidied", () => {
  const msg = quoteMessage(
    { ...base, name: "  Dale ", position: "Drive", size: "295/75r22.5", quantity: "2", location: "I-95 exit 73", notes: "Blew one\n on the inside dual" },
    "Truck Tire Pro",
  );
  assert.match(msg, /^Name: Dale$/m);
  assert.match(msg, /^Size: 295\/75R22\.5$/m);
  assert.match(msg, /^How many: 2$/m);
  assert.match(msg, /^Where: I-95 exit 73$/m);
  assert.match(msg, /^Notes: Blew one on the inside dual$/m);
});

test("builds an sms link both iOS and Android accept", () => {
  const href = smsHref("+19102300433", "Size: 11R22.5 & 2 tires");
  assert.equal(href, "sms:+19102300433?&body=Size%3A%2011R22.5%20%26%202%20tires");
});
