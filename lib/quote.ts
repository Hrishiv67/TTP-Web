/**
 * The quote form doesn't post anywhere. It writes a text message and hands it to
 * the visitor's own messages app, addressed to the shop. There's no server and
 * no inbox to watch, and the shop replies from the phone it already answers.
 */

export type QuoteRequest = {
  name: string;
  vehicle: string;
  service: string;
  position: string;
  size: string;
  quantity: string;
  location: string;
  notes: string;
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export function quoteMessage(q: QuoteRequest, greeting: string): string {
  const lines: [string, string][] = [
    ["Name", q.name],
    ["Vehicle", q.vehicle],
    ["Need", q.service],
    ["Position", q.position],
    ["Size", q.size.toUpperCase()],
    ["How many", q.quantity],
    ["Where", q.location],
    ["Notes", q.notes],
  ];
  const body = lines
    .map(([label, value]) => [label, clean(value)] as const)
    .filter(([, value]) => value.length > 0)
    .map(([label, value]) => `${label}: ${value}`);
  return [greeting, ...body].join("\n");
}

/**
 * `?&body=` is the one form both iOS (which wants `&`) and Android (which wants
 * `?`) accept.
 */
export function smsHref(e164: string, body: string): string {
  return `sms:${e164}?&body=${encodeURIComponent(body)}`;
}

export const telHref = (e164: string) => `tel:${e164}`;
