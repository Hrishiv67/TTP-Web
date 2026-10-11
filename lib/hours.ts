/**
 * Live open/closed status. The page is static, so this runs in the visitor's
 * browser, but against the shop's clock rather than theirs: a driver in Ohio
 * looking at a Dunn shop needs Eastern time.
 */

export type Schedule = Record<number, { open: number; close: number } | null>;

export type Status = {
  open: boolean;
  /** Full form, for the hours section. */
  label: string;
  /** Compact form, for the header. */
  short: string;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekday (0 = Sunday) and minutes after midnight on the shop's wall clock. */
export function shopClock(date: Date, timeZone: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: WEEKDAY_ABBR.indexOf(get("weekday")),
    minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
  };
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

export function formatRange(hours: { open: number; close: number } | null): string {
  return hours ? `${formatTime(hours.open)} to ${formatTime(hours.close)}` : "Closed";
}

export function shopStatus(schedule: Schedule, date: Date, timeZone: string): Status {
  const { day, minutes } = shopClock(date, timeZone);
  const today = schedule[day];

  if (today && minutes >= today.open && minutes < today.close) {
    const left = today.close - minutes;
    if (left <= 60) {
      return { open: true, label: `Open now, closes in ${left} min`, short: `Open, closes in ${left} min` };
    }
    const at = formatTime(today.close);
    return { open: true, label: `Open now, closes at ${at}`, short: `Open until ${at}` };
  }

  if (today && minutes < today.open) {
    const at = formatTime(today.open);
    return { open: false, label: `Closed, opens today at ${at}`, short: `Closed, opens ${at}` };
  }

  for (let i = 1; i <= 7; i++) {
    const next = (day + i) % 7;
    const hours = schedule[next];
    if (!hours) continue;
    const at = formatTime(hours.open);
    const when = i === 1 ? "tomorrow" : DAY_NAMES[next];
    const whenShort = i === 1 ? "tomorrow" : WEEKDAY_ABBR[next];
    return { open: false, label: `Closed, opens ${when} at ${at}`, short: `Closed, opens ${whenShort} ${at}` };
  }

  return { open: false, label: "Closed", short: "Closed" };
}

export { DAY_NAMES };
