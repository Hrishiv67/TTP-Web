"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { SHOP } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";
import { BEATS, DEFAULT_SERVICE, PICK_REST, SECTION_SCREENS, SERVICE_START, SERVICE_END, beatOpacity, isServiceId, type BeatId, type ServiceId } from "./stage/sequence";
import type { Showroom as Scene } from "./stage/scene";
import { CalendarIcon, PhoneIcon } from "./icons";
import { KeepTogether } from "./KeepTogether";

type Mode = "auto" | "live" | "static";
type Playback = "intro" | "service" | "picker" | "resume";
const H = COPY.hero;
const byId = (id: ServiceId) => H.services.find((s) => s.id === id)!;
/** Fired by the service cards' "See more" links: play that service in the hero. */
export const WATCH_EVENT = "ttp:watch";

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

/**
 * The hero: the logo leads into the picker, and choosing a service plays its existing
 * scroll timeline automatically. Moving the scroll by hand takes control, including
 * playing it backward. Each service ends on its booking panel.
 * With reduced motion, without WebGL,
 * or before JavaScript runs, it is a single screen over a poster, with the picker
 * linking to the service cards below.
 */
export function Showroom() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const playRef = useRef<(part: Playback) => void>(() => {});
  const stopRef = useRef<() => void>(() => {});
  const selectionRef = useRef(0);
  const interactedRef = useRef(false);
  const pendingServiceRef = useRef(false);
  const [mode, setMode] = useState<Mode>("auto");
  const [ready, setReady] = useState(false);
  const [service, setService] = useState<ServiceId>(DEFAULT_SERVICE);
  const serviceRef = useRef<ServiceId>(DEFAULT_SERVICE); // the same, for the scene while it loads
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    const update = () => {
      const live = canRunLive();
      setMode(live ? "live" : "static");
      document.documentElement.dataset.stage = live ? "live" : "static";
    };
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    update();
    motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, []);

  const returnToPicker = useCallback(() => {
    interactedRef.current = true;
    pendingServiceRef.current = false;
    selectionRef.current++;
    stopRef.current();
    playRef.current("picker");
  }, []);

  const choose = useCallback(
    (id: ServiceId) => {
      stopRef.current();
      const selection = ++selectionRef.current;
      interactedRef.current = true;
      pendingServiceRef.current = true;
      serviceRef.current = id;
      setService(id);
      setPicked(true);
      sceneRef.current?.setService(id).then(() => {
        if (selection !== selectionRef.current) return;
        pendingServiceRef.current = false;
        playRef.current("service");
      }).catch((err) => console.error("Service scene could not load", err));
    },
    [],
  );

  // the cards further down the page play their service here
  useEffect(() => {
    if (mode !== "live") return;
    const onWatch = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (isServiceId(id)) choose(id);
    };
    window.addEventListener(WATCH_EVENT, onWatch);
    return () => window.removeEventListener(WATCH_EVENT, onWatch);
  }, [mode, choose]);

  useEffect(() => {
    if (mode !== "live") return;
    const section = sectionRef.current!, canvas = canvasRef.current!;
    const beats = new Map(
      [...section.querySelectorAll<HTMLDivElement>("[data-beat]")].map((el) => [el.dataset.beat as BeatId, el] as const),
    );
    let scene: Scene | null = null;
    let raf = 0;
    let visible = true;
    let disposed = false;
    let playback = 0;
    let startedAt = 0;

    const progress = () => {
      const r = section.getBoundingClientRect();
      const run = r.height - window.innerHeight;
      return run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0;
    };

    const paint = (P: number) => {
      for (const [id, el] of beats) {
        const o = beatOpacity(BEATS[id], P);
        const w = BEATS[id];
        // text drifts up as it arrives and keeps drifting as it leaves
        const y = P < w[1] ? (1 - o) * 24 : P > w[2] ? -(1 - o) * 24 : 0;
        el.style.opacity = o.toFixed(3);
        el.style.transform = o > 0 && o < 1 ? `translate3d(0, ${y.toFixed(1)}px, 0)` : "";
        const hidden = o < 0.05;
        if (el.dataset.hidden !== String(hidden)) {
          el.dataset.hidden = String(hidden);
          el.inert = hidden;
        }
      }
      if (P < SERVICE_START || P >= SERVICE_END - 0.01) delete section.dataset.paused;
    };

    // Animate the actual scroll position: autoplay and manual/reverse scrolling use
    // exactly the same scene state, so stopping never swaps to a different timeline.
    const stop = () => {
      cancelAnimationFrame(playback);
      playback = 0;
      delete section.dataset.playing;
      delete section.dataset.paused;
    };
    stopRef.current = stop;
    const play = (part: Playback) => {
      stop();
      const from = progress();
      const fromY = window.scrollY;
      const first = part === "resume" ? from : part === "service" ? SERVICE_START : PICK_REST;
      const approach = part === "resume" ? 0 : part === "intro" ? 4200 : 850;
      const duration = part === "resume" ? 14000 * Math.max(0, SERVICE_END - from) / (SERVICE_END - SERVICE_START) : part === "service" ? 14000 : 0;
      startedAt = 0;
      section.dataset.playing = part === "resume" ? "service" : part;
      const advance = (now: number) => {
        if (disposed) return stop();
        // Freeze the clock while the tab is hidden instead of skipping the animation.
        if (!startedAt) startedAt = now;
        const elapsed = now - startedAt;
        const t = approach ? Math.min(1, elapsed / approach) : 1;
        const eased = t * t * (3 - 2 * t);
        const P = elapsed < approach ? from + (first - from) * eased
          : duration ? first + (SERVICE_END - first) * Math.min(1, (elapsed - approach) / duration) : first;
        const top = section.getBoundingClientRect().top + window.scrollY;
        const run = section.offsetHeight - window.innerHeight;
        const scrollY = elapsed < approach ? fromY + (top + first * run - fromY) * eased : top + P * run;
        window.scrollTo({ top: scrollY, behavior: "instant" });
        // Autoplay already eases its approach. Avoid easing a second time, which
        // makes the scene trail the playback clock on slower devices.
        scene?.setProgress(progress(), true);
        if (!raf && visible) raf = requestAnimationFrame(tick);
        if (elapsed < approach + duration) playback = requestAnimationFrame(advance);
        else {
          stop();
          paint(duration ? SERVICE_END : first);
          // Keep keyboard focus on a visible control after the picker becomes inert.
          if (part === "picker" || part === "intro") {
            if (part === "picker") {
              const selected = section.querySelector<HTMLAnchorElement>('.show__chip[aria-current="true"]');
              (selected ?? section.querySelector<HTMLAnchorElement>(".show__chip"))?.focus({ preventScroll: true });
            }
          } else section.querySelector<HTMLAnchorElement>("[data-beat='end'] .btn")?.focus({ preventScroll: true });
        }
      };
      playback = requestAnimationFrame(advance);
    };
    playRef.current = play;
    const interrupt = () => {
      interactedRef.current = true;
      pendingServiceRef.current = false;
      selectionRef.current++;
      const wasService = section.dataset.playing === "service" || section.dataset.paused === "true";
      stop();
      if (wasService && progress() >= SERVICE_START && progress() < SERVICE_END - 0.01) section.dataset.paused = "true";
    };
    const onPointer = (event: Event) => {
      // Let playback controls receive their click before changing their visibility.
      if (event.target instanceof Element && event.target.closest(".show__playback, .show__skip, .show__chip")) return;
      interrupt();
    };
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Escape", "Tab"].includes(event.key)) interrupt();
    };
    let hiddenAt = 0;
    const selections = selectionRef;
    const onVisibility = () => {
      if (document.hidden) hiddenAt = performance.now();
      else if (hiddenAt) {
        if (startedAt) startedAt += performance.now() - hiddenAt;
        hiddenAt = 0;
        kick();
      }
    };
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("touchstart", onPointer, { passive: true });
    window.addEventListener("touchmove", interrupt, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);

    const tick = (now: number) => {
      raf = 0;
      if (!scene || !visible) return;
      paint(scene.frame(now));
      if (scene.moving) raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!scene) return paint(progress());
      scene.setProgress(progress());
      if (!raf && visible) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    io.observe(section);
    const resize = () => {
      if (!scene) return;
      scene.resize(canvas.clientWidth, canvas.clientHeight);
      kick();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("scroll", kick, { passive: true });
    paint(progress());

    (async () => {
      try {
        await document.fonts.ready;
        const { createShowroom } = await import("./stage/scene");
        if (disposed) return;
        const small = Math.min(window.innerWidth, window.innerHeight) < 700;
        const s = await createShowroom(canvas, {
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
        s.resize(canvas.clientWidth, canvas.clientHeight);
        await s.setService(serviceRef.current);
        s.setProgress(progress(), true);
        paint(s.frame());
        // reveal once a frame is on the canvas; it matches the poster, so nothing jumps
        requestAnimationFrame(() => !disposed && setReady(true));
        if (process.env.NODE_ENV !== "production") {
          const w = window as unknown as Record<string, unknown>;
          w.__stage = s;
          w.__seq = await import("./stage/sequence");
        }
        kick();
        if (pendingServiceRef.current) {
          pendingServiceRef.current = false;
          play("service");
        } else if (!interactedRef.current && progress() < 0.015 && !window.location.hash) play("intro");
        s.prebuild().catch((err) => console.warn("Service preloading paused", err));
      } catch (err) {
        console.error("Hero scene failed, showing the poster instead", err);
        if (!disposed) {
          setMode("static");
          document.documentElement.dataset.stage = "static";
        }
      }
    })();

    return () => {
      disposed = true;
      selections.current++;
      stop();
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", kick);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchstart", onPointer);
      window.removeEventListener("touchmove", interrupt);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      playRef.current = () => {};
      stopRef.current = () => {};
      sceneRef.current = null;
      scene?.dispose();
      for (const el of beats.values()) {
        el.style.opacity = "";
        el.style.transform = "";
        el.inert = false;
        delete el.dataset.hidden;
      }
    };
  }, [mode]);

  const current = byId(service);
  const bookHref = `/book?service=${encodeURIComponent(current.book)}`;

  return (
    <section
      ref={sectionRef}
      className="show"
      data-mode={mode}
      data-ready={ready || undefined}
      data-header="dark"
      aria-label={H.label}
      style={{ "--screens": SECTION_SCREENS } as React.CSSProperties}
    >
      {/* without JavaScript nothing can play, so the hero is one screen and the picker links down the page */}
      <noscript>
        <style>{`.show{height:auto!important}.show .show__pin{position:relative!important;height:auto!important;overflow:visible!important}.show .show__media{inset:0 0 auto!important;height:max(560px,100svh)!important}.show .beat{position:relative!important;opacity:1!important;pointer-events:auto!important}.show .beat--mid,.show .beat--side,.show .beat--logo,.show .show__playback,.show .show__scroll{display:none!important}.show .beat--intro{min-height:max(560px,100svh)!important;visibility:visible!important}`}</style>
      </noscript>
      <div className="show__pin">
        <div className="show__media">
          <picture>
            <source media="(max-aspect-ratio: 3/5)" srcSet="/stage/hero-intro-tall.webp" width={780} height={1688} />
            <source media="(max-aspect-ratio: 6/5)" srcSet="/stage/hero-intro-mid.webp" width={1200} height={1600} />
            <img src="/stage/hero-intro-wide.webp" alt={H.posterAlt} width={2400} height={1500} fetchPriority="high" decoding="async" />
          </picture>
          {mode === "live" && <canvas ref={canvasRef} className="show__canvas" aria-hidden="true" />}
        </div>

        <div className="beat beat--logo" data-beat="logo">
          <Image src="/logo-reverse.svg" width={1022} height={784} alt="Truck Tire Pro" className="show__logo" unoptimized priority />
          <button type="button" className="link show__skip" onClick={returnToPicker}>{H.choose}</button>
        </div>

        <div className="beat beat--top beat--intro" data-beat="intro">
          <div className="wrap">
            <h1 className="t-hero">
              <KeepTogether text={H.headline} />
            </h1>
            <div className="show__row">
              <p className="t-lede">{H.sub}</p>
              <div className="show__actions">
                <a className="btn" href="/book">
                  <CalendarIcon />
                  <span>{COPY.cta.book}</span>
                </a>
                <a className="btn btn--line" href={telHref(SHOP.phone.e164)} aria-label={`${COPY.cta.quote}: call ${SHOP.phone.display}`}>
                  <PhoneIcon />
                  <span>{COPY.cta.quote}</span>
                </a>
              </div>
            </div>
            <p className="show__hours">{H.hours}</p>
          </div>
          <p className="show__scroll" aria-hidden="true">
            {H.scroll}
          </p>
        </div>

        <div className="beat beat--top beat--mid" data-beat="bridge">
          <div className="wrap">
            <p className="show__bridge">{H.bridge}</p>
          </div>
        </div>

        <div className="beat beat--top beat--pick" data-beat="pick">
          <div className="wrap">
            <h2 className="t-h2 show__pickHeading">{H.pickHeading}</h2>
            <p className="t-lede">{H.pickSub}</p>
            <ul className="show__chips">
              {H.services.map((s) => (
                <li key={s.id}>
                  <a
                    className="show__chip"
                    href={s.id === "ttp" ? "#ttp-tire" : `#svc-${s.id}`}
                    aria-current={picked && service === s.id ? "true" : undefined}
                    onClick={(e) => {
                      if (mode !== "live") return;
                      e.preventDefault();
                      choose(s.id);
                    }}
                  >
                    {s.chip}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="beat beat--side" data-beat="name">
          <div className="wrap">
            <div className="show__panel">
              <h2 className="show__name">{current.name}</h2>
              <p className="t-lede">{current.line}</p>
            </div>
          </div>
        </div>

        <div className="beat beat--side" data-beat="detail">
          <div className="wrap">
            <div className="show__panel">
              <p className="show__detail">{current.detail}</p>
            </div>
          </div>
        </div>

        <div className="beat beat--side" data-beat="end">
          <div className="wrap">
            <div className="show__panel">
              <h2 className="show__name">{current.name}</h2>
              <p className="t-lede">{current.line}</p>
              <div className="show__actions">
                <a className="btn" href={bookHref}>
                  <CalendarIcon />
                  <span>{COPY.cta.book}</span>
                </a>
                <button type="button" className="link" onClick={returnToPicker}>
                  {H.another}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="show__playback">
          <button type="button" className="link show__pause" onClick={() => {
            stopRef.current();
            if (sectionRef.current) sectionRef.current.dataset.paused = "true";
          }}>{H.pause}</button>
          <button type="button" className="link show__resume" onClick={() => playRef.current("resume")}>{H.resume}</button>
          <button type="button" className="link" onClick={returnToPicker}>{H.another}</button>
        </div>
      </div>
    </section>
  );
}
