"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { COMMON_SIZES, POSITIONS, type PositionId } from "@/lib/business";
import { SectionHead } from "./SectionHead";
import { Tread, TruckPlan } from "./TruckPlan";

export function Positions() {
  const [active, setActive] = useState<PositionId>("drive");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = POSITIONS.find((p) => p.id === active) ?? POSITIONS[1];

  // standard tablist keys: arrows move and select, Home/End jump
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = POSITIONS.length;
    const next = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(POSITIONS[next].id);
    tabs.current[next]?.focus();
  };

  return (
    <section className="section section--ink" id="positions" aria-labelledby="positions-title">
      <div className="wrap">
        <SectionHead
          id="positions-title"
          index="02"
          label="Tire positions"
          title="Tell us the axle. We’ll match the tire."
          intro="Every position on a tractor-trailer asks something different of a tire. Pick one to see what goes there."
        />

        <div className="axles">
          <div className="axles__labels" aria-hidden="true">
            {POSITIONS.map((p) => (
              <span key={p.id} className={`label-s axles__label axles__label--${p.id}`} data-active={p.id === active}>
                {p.name}
              </span>
            ))}
          </div>
          <TruckPlan active={active} onPick={setActive} />
        </div>

        <div className="tabs" role="tablist" aria-label="Axle position">
          {POSITIONS.map((p, i) => (
            <button
              key={p.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${p.id}`}
              aria-selected={p.id === active}
              aria-controls="position-panel"
              tabIndex={p.id === active ? 0 : -1}
              className="tabs__tab"
              onClick={() => setActive(p.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <span className="heading-s">{p.name}</span>
              <span className="label-s">{p.meta}</span>
            </button>
          ))}
        </div>

        <div className="pos" id="position-panel" role="tabpanel" aria-labelledby={`tab-${active}`}>
          <Tread id={active} />
          <div className="pos__copy">
            <p className="label pos__meta">{current.meta}</p>
            <h3 className="display-m">{current.name}</h3>
            <p className="body-l">{current.body}</p>
            <p className="pos__sizes label-s">
              <span>Common sizes</span>
              <span>{COMMON_SIZES.join(" · ")}</span>
            </p>
          </div>
          <div className="pos__aside">
            <p>Not a tractor-trailer? We also fit dump trucks, box trucks, pickups and RVs.</p>
            <a className="link link--paper" href="#quote">
              Ask about your size <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
