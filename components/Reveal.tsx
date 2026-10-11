"use client";

import { useEffect } from "react";

/**
 * Fades blocks marked data-reveal up into place as they scroll into view. Blocks
 * already on screen when the page loads are left as they are, and without
 * JavaScript nothing is ever hidden.
 */
export function Reveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.in = "";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const el of els) {
      if (el.getBoundingClientRect().top < window.innerHeight) el.dataset.in = "";
      else io.observe(el);
    }
    document.documentElement.dataset.reveal = "";
    return () => io.disconnect();
  }, []);
  return null;
}
