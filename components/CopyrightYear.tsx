"use client";

import { useNow } from "@/lib/useNow";

// The page is built once and served for months, so the year comes from the
// visitor's clock; the build year shows until then.
const BUILD_YEAR = new Date().getFullYear();

export function CopyrightYear() {
  const now = useNow();
  return <>{now === null ? BUILD_YEAR : new Date(now).getFullYear()}</>;
}
