// Sends one test booking through the booking page in a real browser and reports what the
// email service (FormSubmit) answered. Runs on GitHub Actions (.github/workflows/booking-check.yml).
//
//   BOOK_URL      the booking page, e.g. https://truck-tire-pro.vercel.app/book
//   BOOK_TO       where the test booking goes. If the site sends bookings somewhere else, this
//                 one request is delivered to BOOK_TO instead; everything else about it is
//                 exactly what a customer's browser sends from the live site, so another inbox
//                 can be tried without changing the site.
//   WAIT_MINUTES  how long to wait for a new deploy that sends through FormSubmit (default 10)
//   OPEN_URL      instead of booking, open this link (the "Activate Form" link from FormSubmit)
import { chromium } from "playwright";

const { BOOK_URL, BOOK_TO = "", OPEN_URL = "", WAIT_MINUTES = "10" } = process.env;
const FORM_SERVICE = /^https:\/\/formsubmit\.co\/ajax\//;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("requestfailed", (req) => {
  if (/formsubmit/.test(req.url())) console.log(`The request to FormSubmit failed: ${req.failure()?.errorText}`);
});

if (OPEN_URL) {
  await page.goto(OPEN_URL, { waitUntil: "load", timeout: 60_000 });
  // some activation pages ask for one more click
  const confirm = page.getByRole("button", { name: /activate|confirm/i }).or(page.getByRole("link", { name: /activate|confirm/i }));
  if (await confirm.count()) {
    await confirm.first().click();
    await page.waitForLoadState("load");
  }
  // the log is public, so only the gist of the page
  console.log("Opened the link. The page says: " + (await page.innerText("body")).replace(/\s+/g, " ").slice(0, 200));
  await browser.close();
  process.exit(0);
}

let siteTo = null; // where the site itself sends bookings
await page.route(FORM_SERVICE, (route) => {
  const url = new URL(route.request().url());
  siteTo = decodeURIComponent(url.pathname.replace("/ajax/", ""));
  if (BOOK_TO && siteTo.toLowerCase() !== BOOK_TO.toLowerCase()) {
    url.pathname = `/ajax/${BOOK_TO}`;
    return route.continue({ url: url.toString() });
  }
  return route.continue();
});

/** One attempt: fill the form, submit, and say what happened. */
async function attempt() {
  siteTo = null;
  await page.goto(`${BOOK_URL}?service=${encodeURIComponent("Tire repair")}&check=${Date.now()}`, { waitUntil: "load" });
  await page.locator('input[name="day"]').first().check({ timeout: 30_000 });
  await page.locator('input[name="time"]').first().check();
  await page.getByLabel("Tire size").fill("295/75R22.5");
  await page.locator('[data-field="name"]').fill("Website test");
  await page.locator('[data-field="phone"]').fill("(910) 555-0100");
  await page.getByLabel("Anything else").fill("This is a test booking sent by the website check. Please ignore it.");
  let sent = false;
  const onRequest = (req) => {
    if (FORM_SERVICE.test(req.url())) sent = true;
  };
  page.on("request", onRequest);
  const replied = page
    .waitForResponse((res) => FORM_SERVICE.test(res.url()), { timeout: 30_000 })
    .then(async (res) => ({ status: res.status(), body: await res.text().catch(() => "") }))
    .catch(() => null);
  await page.locator('form button[type="submit"]').click();

  const reply = await replied;
  page.off("request", onRequest);
  await page.locator(".bk__result").waitFor({ timeout: 20_000 }).catch(() => {});
  const shown = (await page.locator(".bk__result").innerText().catch(() => "")).replace(/\s+/g, " ").trim();
  return { reply, shown, sent };
}

const deadline = Date.now() + Number(WAIT_MINUTES) * 60_000;
let result;
for (;;) {
  result = await attempt();
  if (result.reply) break;
  // a booking went out but no answer came back: don't send another and risk a second email
  if (result.sent) {
    console.log(`::error::The booking was sent to FormSubmit but no answer came back. The page showed: ${result.shown || "(nothing)"}`);
    await browser.close();
    process.exit(1);
  }
  if (Date.now() > deadline) {
    console.log(`::error::Gave up: the page never sent the booking to FormSubmit. It showed: ${result.shown || "(nothing)"}`);
    await browser.close();
    process.exit(1);
  }
  console.log("The page didn't send the booking to FormSubmit (an older deploy?). Trying again in 30 seconds.");
  await sleep(30_000);
}

const { reply, shown } = result;
let data = {};
try {
  data = JSON.parse(reply.body);
} catch {}
console.log(`The site sends bookings to ${siteTo}${BOOK_TO && siteTo.toLowerCase() !== BOOK_TO.toLowerCase() ? "; this test went to the address you typed instead" : ""}.`);
console.log(`Email service answered HTTP ${reply.status}: ${reply.body}`);
console.log(`The page showed: ${shown}`);
await browser.close();

if (data.success === true || data.success === "true") {
  console.log("RESULT: sent. The booking email is on its way.");
} else if (/activat/i.test(String(data.message))) {
  console.log("::warning::RESULT: needs activation. The address got an email from FormSubmit with an Activate Form button; bookings arrive once it's clicked.");
} else {
  console.log("::error::RESULT: failed.");
  process.exit(1);
}
