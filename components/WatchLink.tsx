"use client";

import type { ReactNode } from "react";
import type { ServiceId } from "./stage/sequence";
import { WATCH_EVENT } from "./Showroom";

/** "See more" on a service card: plays that service's animation in the hero. Hidden when the hero is a still. */
export function WatchLink({ service, label, children }: { service: ServiceId; label: string; children: ReactNode }) {
  return (
    <a
      className="link watch"
      href="#top"
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(WATCH_EVENT, { detail: service }));
      }}
    >
      {children}
    </a>
  );
}
