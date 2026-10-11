"use client";

import { useEffect, useRef, useState } from "react";
import { SHOP } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";
import { CalendarIcon, PhoneIcon } from "./icons";
import { KeepTogether } from "./KeepTogether";
import type { StopId } from "./stage/stageStates";
import type { TireScene } from "./stage/tireScene";

type Mode = "static" | "live";
type Focus = Exclude<StopId, "all">;

function canRunLive() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

// the same three screen shapes the scene composes for (tireScene.ts POSTER_ASPECT)
function Still({ stop, alt, priority = false }: { stop: StopId; alt: string; priority?: boolean }) {
  return (
    <picture>
      <source media="(max-aspect-ratio: 3/5)" srcSet={`/stage/hero-${stop}-tall.webp`} width={780} height={1688} />
      <source media="(max-aspect-ratio: 6/5)" srcSet={`/stage/hero-${stop}-mid.webp`} width={1200} height={1600} />
      <img
        src={`/stage/hero-${stop}-wide.webp`}
        alt={alt}
        width={2400}
        height={1500}
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? undefined : "lazy"}
        decoding="async"
      />
    </picture>
  );
}

// what each stop preselects on the booking form
const serviceName = (id: Focus) => (id === "ttp" ? COPY.ttp.name : COPY.services.main.find((s) => s.id === id)!.name);

/**
 * The hero: three tires in a black studio and a button for each main service. A tap
 * swings the camera to that service (the shop's own TTP Tire, a new tire, a used one
 * with its tread marked, a plugged puncture, a wheel turning with its balance weights)
 * and puts booking and a quote right beside it. With WebGL and motion allowed the scene is live 3D;
 * otherwise, and before the 3D has loaded, still renders of the same shots stand in.
 */
export function Showroom() {
  const { hero } = COPY;
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chipRefs = useRef(new Map<Focus, HTMLButtonElement>());
  const sceneRef = useRef<TireScene | null>(null);
  const kickRef = useRef<() => void>(() => {});
  const stopRef = useRef<StopId>("all");
  const [mode, setMode] = useState<Mode>("static");
  const [ready, setReady] = useState(false);
  const [stop, setStop] = useState<StopId>("all");
  const [seen, setSeen] = useState<Focus[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depends on browser capabilities, unknown during SSR
    if (canRunLive()) setMode("live");
  }, []);

  useEffect(() => {
    if (mode !== "live") return;
    const section = sectionRef.current!, canvas = canvasRef.current!;
    let scene: TireScene | null = null;
    let raf = 0;
    let visible = true;
    let disposed = false;

    const tick = (now: number) => {
      raf = 0;
      if (!scene || !visible) return;
      scene.frame(now);
      if (scene.animating) raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (scene && visible && !raf) raf = requestAnimationFrame(tick);
    };
    kickRef.current = kick;

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      kick();
    });
    io.observe(section);
    const ro = new ResizeObserver(() => {
      if (!scene) return;
      scene.resize(section.clientWidth, section.clientHeight);
      kick();
    });
    ro.observe(section);

    (async () => {
      try {
        await document.fonts.ready;
        const { createTireScene } = await import("./stage/tireScene");
        if (disposed) return;
        const small = Math.min(window.innerWidth, window.innerHeight) < 700;
        const s = await createTireScene(canvas, {
          pixelRatio: Math.min(window.devicePixelRatio || 1, small ? 1.75 : 2),
          small,
          font: getComputedStyle(document.body).fontFamily,
        });
        if (disposed) {
          s.dispose();
          return;
        }
        scene = s;
        sceneRef.current = s;
        s.resize(section.clientWidth, section.clientHeight);
        s.frame();
        // reveal once a frame is on the canvas; it matches the poster, so nothing jumps
        requestAnimationFrame(() => {
          if (disposed) return;
          setReady(true);
          // a tap that came in while the 3D was loading plays now
          if (stopRef.current !== "all") s.goTo(stopRef.current);
          kick();
        });
        if (process.env.NODE_ENV !== "production") {
          // dev hooks for rendering the stills and trying out shots
          const w = window as unknown as Record<string, unknown>;
          w.__stage = s;
          w.__stops = (await import("./stage/stageStates")).STOPS;
        }
      } catch (err) {
        console.error("Tire scene failed, showing stills instead", err);
        if (!disposed) setMode("static");
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      kickRef.current = () => {};
      sceneRef.current = null;
      scene?.dispose();
    };
  }, [mode]);

  const go = (next: StopId) => {
    stopRef.current = next;
    setStop(next);
    if (next !== "all") setSeen((s) => (s.includes(next) ? s : [...s, next]));
    const scene = sceneRef.current;
    if (scene && scene.stop !== next) {
      scene.goTo(next);
      kickRef.current();
    }
  };

  const back = () => {
    const from = stop;
    go("all");
    if (from !== "all") chipRefs.current.get(from)?.focus();
  };

  const focused = stop === "all" ? null : hero.stops.find((s) => s.id === stop)!;
  const quoteLabel = `${COPY.cta.quote}: call ${SHOP.phone.display}`;

  return (
    <section
      ref={sectionRef}
      className="show"
      data-mode={mode}
      data-ready={ready || undefined}
      data-stop={stop}
      data-header="dark"
      aria-label={hero.label}
      onKeyDown={(e) => {
        if (e.key === "Escape" && stop !== "all") back();
      }}
    >
      <div className="show__media">
        <Still stop="all" alt={hero.stillAlt.all} priority />
        {mode === "static" &&
          seen.map((id) => (
            <div key={id} className="show__still" data-active={stop === id || undefined} aria-hidden={stop !== id}>
              <Still stop={id} alt={hero.stillAlt[id]} />
            </div>
          ))}
        {mode === "live" && <canvas ref={canvasRef} className="show__canvas" aria-hidden="true" />}
      </div>

      <div className="show__ui wrap">
        <div className="show__intro" inert={stop !== "all"}>
          <h1 className="t-hero">
            <KeepTogether text={hero.headline} />
          </h1>
          <div className="show__row">
            <p className="t-lede">{hero.sub}</p>
            <div className="show__actions">
              <a className="btn" href="/book">
                <CalendarIcon />
                <span>{COPY.cta.book}</span>
              </a>
              <a className="btn btn--line" href={telHref(SHOP.phone.e164)} aria-label={quoteLabel}>
                <PhoneIcon />
                <span>{COPY.cta.quote}</span>
              </a>
            </div>
          </div>
          <p className="show__hours">{hero.hours}</p>
        </div>

        <div className="show__dock" role="group" aria-labelledby="show-pick">
          <p className="show__pick" id="show-pick">
            {hero.pick}
          </p>
          <div className="show__chips">
            {hero.stops.map((s) => (
              <button
                key={s.id}
                ref={(el) => {
                  if (el) chipRefs.current.set(s.id, el);
                  else chipRefs.current.delete(s.id);
                }}
                type="button"
                className="show__chip"
                aria-pressed={stop === s.id}
                aria-controls={`show-${s.id}`}
                onClick={() => go(stop === s.id ? "all" : s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {hero.stops.map((s) => (
          <div key={s.id} id={`show-${s.id}`} className="show__panel" data-active={stop === s.id || undefined} inert={stop !== s.id}>
            <h2 className="show__name">{s.label}</h2>
            <p className="t-lede">{s.line}</p>
            <div className="show__actions">
              <a className="btn" href={`/book?service=${encodeURIComponent(serviceName(s.id))}`}>
                <CalendarIcon />
                <span>{COPY.cta.book}</span>
              </a>
              <a className="btn btn--line" href={telHref(SHOP.phone.e164)} aria-label={quoteLabel}>
                <PhoneIcon />
                <span>{COPY.cta.quote}</span>
              </a>
            </div>
            <button type="button" className="show__back link" onClick={back}>
              {hero.back}
            </button>
          </div>
        ))}

        <p className="sr-only" aria-live="polite">
          {focused ? `${focused.label}. ${focused.line}` : ""}
        </p>
      </div>
    </section>
  );
}
