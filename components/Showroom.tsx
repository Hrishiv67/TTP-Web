"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { SHOP } from "@/lib/business";
import { COPY } from "@/lib/copy";
import { telHref } from "@/lib/quote";
import { BEATS, DEFAULT_SERVICE, PICK_REST, SECTION_SCREENS, SERVICE_REST, SERVICE_END, beatOpacity, isServiceId, type BeatId, type ServiceId } from "./stage/sequence";
import type { Showroom as Scene } from "./stage/scene";
import { CalendarIcon, PhoneIcon } from "./icons";
import { KeepTogether } from "./KeepTogether";

type Mode = "auto" | "live" | "static";
type Destination = "service" | "picker";
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
 * Scroll controls the logo, picker and service timeline, including playing backward.
 * Choosing a service or returning to the picker uses a short fade, never a fast rewind.
 * With reduced motion, without WebGL,
 * or before JavaScript runs, it is a single screen over a poster, with the picker
 * linking to the service cards below.
 */
export function Showroom() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigateRef = useRef<(destination: Destination, id?: ServiceId) => void>(() => {});
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
    navigateRef.current("picker");
  }, []);

  const choose = useCallback(
    (id: ServiceId) => {
      navigateRef.current("service", id);
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
    const pin = section.querySelector<HTMLElement>(".show__pin")!;
    const veil = section.querySelector<HTMLElement>(".show__transition")!;
    const beats = new Map(
      [...section.querySelectorAll<HTMLDivElement>("[data-beat]")].map((el) => [el.dataset.beat as BeatId, el] as const),
    );
    let scene: Scene | null = null;
    let raf = 0;
    let visible = true;
    let disposed = false;
    let request = 0;
    let fade: Animation | null = null;
    let resolveScene: (scene: Scene | null) => void = () => {};
    const sceneReady = new Promise<Scene | null>((resolve) => { resolveScene = resolve; });

    const progress = () => {
      const r = section.getBoundingClientRect();
      const run = r.height - window.innerHeight;
      return run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0;
    };
    const paint = (P: number) => {
      for (const [id, el] of beats) {
        const o = beatOpacity(BEATS[id], P);
        // Opacity only: text stays in place instead of bobbing with each scroll step.
        el.style.opacity = o.toFixed(3);
        const hidden = o < 0.05;
        if (el.dataset.hidden !== String(hidden)) {
          el.dataset.hidden = String(hidden);
          el.inert = hidden;
        }
      }
      section.toggleAttribute("data-exploring", P >= SERVICE_REST - 0.001 && P < SERVICE_END - 0.01);
    };
    const tick = (now: number) => {
      raf = 0;
      if (!scene || !visible || document.hidden || section.hasAttribute("data-transitioning")) return;
      paint(scene.frame(now));
      if (scene.moving) raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!scene) return paint(progress());
      scene.setProgress(progress());
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const release = () => {
      pin.inert = false;
      section.removeAttribute("aria-busy");
      delete section.dataset.transitioning;
    };
    const fadeTo = async (opacity: number) => {
      const from = getComputedStyle(veil).opacity;
      fade?.cancel();
      fade = veil.animate([{ opacity: from }, { opacity }], {
        duration: 280, easing: "ease-in-out", fill: "forwards",
      });
      await fade.finished.catch(() => {});
    };
    const navigate = async (destination: Destination, id?: ServiceId) => {
      const ticket = ++request;
      section.setAttribute("aria-busy", "true");
      try {
        // Prepare the selected scene while the current view stays still. Do not
        // switch services until the black veil covers the old scene and wording.
        const s = destination === "service" ? await sceneReady : scene;
        if (disposed || ticket !== request) return;
        if (destination === "service") {
          if (!s || !id) return release();
          await s.ensure(id);
          if (disposed || ticket !== request) return;
        }
        pin.inert = true;
        section.dataset.transitioning = "true";
        await fadeTo(1);
        if (disposed || ticket !== request) return;
        if (destination === "service" && s && id) {
          await s.setService(id);
          if (disposed || ticket !== request) return;
          serviceRef.current = id;
          setService(id);
          setPicked(true);
        }
        const P = destination === "service" ? SERVICE_REST : PICK_REST;
        const top = section.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + P * (section.offsetHeight - window.innerHeight), behavior: "instant" });
        scene?.setProgress(P, true);
        paint(scene ? scene.frame() : P);
        // Let React update the selected service text underneath the veil.
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (disposed || ticket !== request) return;
        await fadeTo(0);
        if (disposed || ticket !== request) return;
        release();
        if (destination === "picker") {
          const selected = section.querySelector<HTMLAnchorElement>('.show__chip[aria-current="true"]');
          (selected ?? section.querySelector<HTMLAnchorElement>(".show__chip"))?.focus({ preventScroll: true });
        } else section.querySelector<HTMLElement>("[data-beat='name'] h2")?.focus({ preventScroll: true });
        kick();
      } catch (err) {
        if (ticket !== request || disposed) return;
        console.error("Service scene could not load", err);
        fade?.cancel();
        release();
        kick();
      }
    };
    navigateRef.current = (destination, id) => { void navigate(destination, id); };
    const interrupt = () => {
      if (!section.hasAttribute("aria-busy")) return;
      request++;
      // User input always wins; cancel queued navigation and reveal the current pose.
      fade?.cancel();
      release();
      kick();
    };
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Escape", "Tab"].includes(event.key)) interrupt();
    };
    const onVisibility = () => { if (!document.hidden) kick(); };
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("touchmove", interrupt, { passive: true });
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", kick, { passive: true });

    const io = new IntersectionObserver(([entry]) => {
      const wasVisible = visible;
      visible = entry.isIntersecting;
      if (visible) {
        // Returning from further down the page should not replay a stale camera move.
        if (!wasVisible) scene?.setProgress(progress(), true);
        kick();
      }
    });
    io.observe(canvas);
    const resize = () => {
      scene?.resize(canvas.clientWidth, canvas.clientHeight);
      kick();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    paint(progress());

    (async () => {
      try {
        await document.fonts.ready;
        const { createShowroom } = await import("./stage/scene");
        if (disposed) return;
        const small = Math.min(window.innerWidth, window.innerHeight) < 700;
        const s = await createShowroom(canvas, {
          pixelRatio: Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5),
          small,
          font: getComputedStyle(document.body).fontFamily,
        });
        if (disposed) {
          s.dispose();
          return;
        }
        scene = s;
        s.resize(canvas.clientWidth, canvas.clientHeight);
        await s.setService(serviceRef.current);
        s.setProgress(progress(), true);
        paint(s.frame());
        requestAnimationFrame(() => !disposed && setReady(true));
        if (process.env.NODE_ENV !== "production") {
          const w = window as unknown as Record<string, unknown>;
          w.__stage = s;
          w.__seq = await import("./stage/sequence");
        }
        resolveScene(s);
        kick();
        // Remaining services load only when selected, avoiding background shader
        // compilation and model construction while the visitor is scrolling.
      } catch (err) {
        resolveScene(null);
        console.error("Hero scene failed, showing the poster instead", err);
        if (!disposed) {
          setMode("static");
          document.documentElement.dataset.stage = "static";
        }
      }
    })();

    return () => {
      disposed = true;
      request++;
      resolveScene(null);
      fade?.cancel();
      release();
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", kick);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchmove", interrupt);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      navigateRef.current = () => {};
      scene?.dispose();
      section.removeAttribute("data-exploring");
      for (const el of beats.values()) {
        el.style.opacity = "";
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
        <style>{`.show{height:auto!important}.show .show__pin{position:relative!important;height:auto!important;overflow:visible!important}.show .show__media{inset:0 0 auto!important;height:max(560px,100svh)!important}.show .beat{position:relative!important;opacity:1!important;pointer-events:auto!important}.show .beat--mid,.show .beat--side,.show .beat--logo,.show .show__guidance,.show .show__transition,.show .show__scroll{display:none!important}.show .beat--intro{min-height:max(560px,100svh)!important;visibility:visible!important}`}</style>
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
          <p className="show__continue">{H.continue}</p>
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
              <h2 className="show__name" tabIndex={-1}>{current.name}</h2>
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
              <h2 className="show__name" tabIndex={-1}>{current.name}</h2>
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
        <div className="show__guidance">
          <p>{H.continue}</p>
          <button type="button" className="link" onClick={returnToPicker}>{H.another}</button>
        </div>
        <div className="show__transition" aria-hidden="true" />
      </div>
    </section>
  );
}
