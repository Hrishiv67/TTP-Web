"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BEATS, beatOpacity } from "./stageTimeline";
import type { TireScene } from "./tireScene";

export type StageBeat = {
  id: string; // a key of BEATS
  layout: "top" | "side"; // top: text above the subject; side: text beside it (below on phones)
  still?: string; // image for the static version
  interactive?: boolean; // has links, so it is made inert while it can't be seen
  children: ReactNode;
};

type Mode = "static" | "live";

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
 * The tire sequence. With WebGL and motion allowed, the section pins to the
 * screen while it scrolls and a 3D studio scene follows the scroll, with each
 * block of text fading in as the camera settles on its shot. Otherwise (and in
 * the server-rendered HTML) the same text stacks as ordinary blocks over still
 * renders of the same shots.
 */
export function TireStage({ id, label, beats, poster }: { id: string; label: string; beats: StageBeat[]; poster: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beatRefs = useRef(new Map<string, HTMLDivElement>());
  const [mode, setMode] = useState<Mode>("static");
  const [ready, setReady] = useState(false);

  // decide once on the client whether the live version can run
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depends on browser capabilities, unknown during SSR
    if (canRunLive()) setMode("live");
  }, []);

  useEffect(() => {
    if (mode !== "live") return;
    const section = sectionRef.current!, pin = pinRef.current!, canvas = canvasRef.current!;
    const beatEls = beatRefs.current;
    let scene: TireScene | null = null;
    let raf = 0;
    let visible = true;
    let disposed = false;

    const progress = () => {
      const r = section.getBoundingClientRect();
      const run = r.height - window.innerHeight;
      return run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0;
    };

    const paintBeats = (p: number) => {
      for (const [id, el] of beatEls) {
        const w = BEATS[id];
        if (!w) continue;
        const o = beatOpacity(w, p);
        // text drifts up as it arrives and keeps drifting as it leaves
        const y = p < w[1] ? (1 - o) * 28 : p > w[2] ? -(1 - o) * 28 : 0;
        el.style.opacity = o.toFixed(3);
        el.style.transform = o > 0 && o < 1 ? `translate3d(0, ${y.toFixed(1)}px, 0)` : "";
        const hidden = o < 0.02;
        if (el.dataset.hidden !== String(hidden)) {
          el.dataset.hidden = String(hidden);
          if (el.dataset.interactive) el.inert = hidden;
        }
      }
    };

    const tick = (now: number) => {
      raf = 0;
      if (!scene || !visible) return;
      const p = scene.frame(now);
      paintBeats(p);
      if (scene.moving) raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!scene) {
        paintBeats(progress());
        return;
      }
      scene.setProgress(progress());
      if (!raf && visible) raf = requestAnimationFrame(tick);
    };

    const resize = () => {
      if (!scene) return;
      scene.resize(pin.clientWidth, pin.clientHeight);
      kick();
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    io.observe(section);
    const ro = new ResizeObserver(resize);
    ro.observe(pin);
    window.addEventListener("scroll", kick, { passive: true });
    paintBeats(progress());

    (async () => {
      try {
        await document.fonts.ready;
        const { createTireScene } = await import("./tireScene");
        if (disposed) return;
        const small = Math.min(window.innerWidth, window.innerHeight) < 700;
        const font = `${getComputedStyle(document.body).fontFamily}`;
        const s = await createTireScene(canvas, {
          pixelRatio: Math.min(window.devicePixelRatio || 1, small ? 1.75 : 2),
          small,
          font,
        });
        if (disposed) {
          s.dispose();
          return;
        }
        scene = s;
        s.resize(pin.clientWidth, pin.clientHeight);
        s.setProgress(progress(), true);
        s.frame();
        // three.js compiles shaders on the first frame; show the canvas once one has drawn
        requestAnimationFrame(() => !disposed && setReady(true));
        if (process.env.NODE_ENV !== "production") (window as unknown as Record<string, unknown>).__stage = s;
        kick();
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
      window.removeEventListener("scroll", kick);
      scene?.dispose();
      for (const el of beatEls.values()) {
        el.style.opacity = "";
        el.style.transform = "";
        el.inert = false;
        delete el.dataset.hidden;
      }
    };
  }, [mode]);

  return (
    <section
      ref={sectionRef}
      id={id}
      className="stage"
      data-mode={mode}
      data-ready={ready || undefined}
      data-header="dark"
      aria-label={label}
    >
      <div ref={pinRef} className="stage__pin">
        <div className="stage__poster">{poster}</div>
        {mode === "live" && <canvas ref={canvasRef} className="stage__canvas" aria-hidden="true" />}
        {beats.map((b) => (
          <div
            key={b.id}
            ref={(el) => {
              if (el) beatRefs.current.set(b.id, el);
              else beatRefs.current.delete(b.id);
            }}
            className={`beat beat--${b.layout}`}
            data-beat={b.id}
            data-interactive={b.interactive || undefined}
          >
            {b.still && (
              // eslint-disable-next-line @next/next/no-img-element -- static fallback only, never loaded in the live version
              <img className="beat__still" src={b.still} alt="" loading="lazy" decoding="async" width={1600} height={1000} />
            )}
            <div className="beat__copy wrap">{b.children}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
