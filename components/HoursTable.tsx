"use client";

import { HOURS, TIME_ZONE } from "@/lib/business";
import { DAY_NAMES, formatRange, shopClock } from "@/lib/hours";
import { useNow } from "@/lib/useNow";

// Monday-first, the way a work week reads.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function HoursTable() {
  const now = useNow();
  const today = now === null ? -1 : shopClock(new Date(now), TIME_ZONE).day;
  return (
    <table className="hours">
      <caption className="sr-only">Opening hours, Eastern time</caption>
      <tbody>
        {ORDER.map((d) => (
          <tr key={d} data-today={d === today || undefined} data-closed={!HOURS[d] || undefined}>
            <th scope="row">
              {DAY_NAMES[d]}
              {d === today ? <span className="sr-only"> (today)</span> : null}
            </th>
            <td>{formatRange(HOURS[d])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
