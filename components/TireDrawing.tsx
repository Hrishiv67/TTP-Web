"use client";

import { useEffect, useRef } from "react";
import { TIRE } from "@/lib/drawings";

/**
 * Fig. 1. The wheel rolls as the page scrolls — about a quarter turn per
 * screen — which is the only motion in the hero, and none at all for anyone
 * who has asked for reduced motion.
 */
export function TireDrawing({ className = "" }: { className?: string }) {
  const wheel = useRef<SVGGElement>(null);

  useEffect(() => {
    const g = wheel.current;
    if (!g || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      g.style.transform = `rotate(${(window.scrollY * 0.09).toFixed(2)}deg)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg className={`tire ${className}`} viewBox="0 0 800 800" role="img" aria-labelledby="fig1-title">
      <title id="fig1-title">Drawing of a 295/75R22.5 truck tire on a ten-lug wheel</title>
      <g ref={wheel} className="tire__wheel">
        <path className="t-paper" d={TIRE.rimFace} />
        <path className="t-line" strokeWidth="1.5" d={TIRE.rimRing} />
        <path className="t-line" strokeWidth="1" d={TIRE.rimDrop} />
        <path className="t-line" strokeWidth="1" strokeDasharray="3 5" d={TIRE.boltCircle} />
        <path className="t-ink" d={TIRE.handHoles} />
        <path className="t-line" strokeWidth="2" d={TIRE.hubRing} />
        <path className="t-ink" d={TIRE.lugNuts} />
        <path className="t-paper" d={TIRE.nutDots} />
        <path className="t-ink" d={TIRE.bore} />
        <path className="t-paperline" strokeWidth="1.5" d={TIRE.boreRing} />
        <path className="t-red" d={TIRE.valve} />
        <path className="t-ink" fillRule="evenodd" d={TIRE.tread} />
        <path className="t-paperline" strokeOpacity=".28" strokeWidth="1.5" d={TIRE.shoulder} />
        <path className="t-paperline" strokeOpacity=".18" strokeWidth="1" d={TIRE.sidewallRib} />
        <path className="t-paperline" strokeOpacity=".35" strokeWidth="1.2" d={TIRE.bead} />
        <path className="t-red" d={TIRE.size} />
        <path className="t-paper" fillOpacity=".82" d={TIRE.sidewallText} />
      </g>
    </svg>
  );
}
