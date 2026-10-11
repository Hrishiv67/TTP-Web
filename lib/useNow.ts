"use client";

import { useSyncExternalStore } from "react";

const STEP = 30_000;

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, STEP);
  // a backgrounded tab can sleep through several ticks; catch up when it returns
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onChange);
  };
}

// Rounded so the snapshot is stable between renders inside one 30s window.
const getSnapshot = () => Math.floor(Date.now() / STEP) * STEP;

/**
 * The current time, refreshed every 30 seconds, or null during server render
 * and hydration — so time-dependent copy never mismatches the static HTML.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
