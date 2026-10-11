"use client";

import { HOURS, TIME_ZONE } from "@/lib/business";
import { shopStatus } from "@/lib/hours";
import { useNow } from "@/lib/useNow";

/**
 * Open/closed against the shop's Eastern-time clock. Until the browser takes
 * over it shows the plain weekly hours, which are true at any hour.
 */
export function LiveStatus({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const now = useNow();
  const status = now === null ? null : shopStatus(HOURS, new Date(now), TIME_ZONE);
  const state = status === null ? "unknown" : status.open ? "open" : "closed";
  const text = status === null ? "Mon–Fri · 8 AM – 5 PM" : compact ? status.short : status.label;

  return (
    <p className={`status ${className}`} data-state={state}>
      <span className="status__dot" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}
