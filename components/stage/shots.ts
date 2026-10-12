/**
 * Camera keys and the maths that turns them into a view for one screen. Free of
 * three.js so the page and the service timelines can use it without loading 3D.
 */
export type Vec3 = [number, number, number];

/** Where the subject sits on screen, so the text has room beside or under it. */
export type Frame = {
  shift: number; // right of center on wide screens, fraction of the view width
  lift: number; // above center on wide screens, fraction of the view height
  liftTall: number; // above center on tall (phone) screens, where the text goes underneath
  backTall: number; // extra pull-back on tall screens, for wide subjects
};

export type CameraKey = {
  t: number; // time on its timeline, 0 to 1
  cam: Vec3; // camera position, meters
  tgt: Vec3; // the point it looks at
  fov: number; // vertical field of view on the wide poster shape, degrees
  frame: Frame;
  // its own framing for phones, composed for the tall poster shape; replaces cam, tgt
  // and fov there (and blends in on in-between shapes)
  tall?: { cam: Vec3; tgt: Vec3; fov: number };
  // "stop": the camera eases to a halt on this key (the default); "pass": it moves
  // through without stopping
  ease?: "stop" | "pass";
};

/** A key worked out for one poster shape. */
export type View = { cam: Vec3; tgt: Vec3; fov: number; shift: number; lift: number };

/**
 * Screen shapes the poster images are rendered for (width / height). The live frame
 * is composed for the matching one, then scaled like object-fit: cover, so the swap
 * from poster to live canvas doesn't jump.
 */
export const POSTER_ASPECT = { wide: 1.6, mid: 0.75, tall: 390 / 844 };
export type Regime = keyof typeof POSTER_ASPECT;
export const posterRegime = (aspect: number): Regime => (aspect > 1.2 ? "wide" : aspect > 0.6 ? "mid" : "tall");

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
/** 0 to 1 over [a, b], eased in and out. */
export const ramp = (t: number, a: number, b: number) => smootherstep(clamp01((t - a) / (b - a)));

/** The key composed for a poster shape (ref = its width / height). */
export function resolve(k: Pick<CameraKey, "cam" | "tgt" | "fov" | "frame" | "tall">, ref: number): View {
  const portrait = ref < 0.9;
  // narrow shapes pull back so the subject keeps its width, more for wide subjects...
  const tall = clamp01((1 - ref) / 0.5);
  const fit = (ref < 1.2 ? Math.min(2.1, 1 + (1.2 - ref) * 1.15) : 1) * (1 + (k.frame.backTall - 1) * tall);
  let cam = lerp3(k.tgt, k.cam, fit), tgt = k.tgt, fov = k.fov;
  // ...unless the key has its own framing for tall screens, which takes over as the shape narrows
  if (k.tall && portrait) {
    const w = clamp01((1.2 - ref) / (1.2 - POSTER_ASPECT.tall));
    cam = lerp3(cam, k.tall.cam, w);
    tgt = lerp3(tgt, k.tall.tgt, w);
    fov = lerp(fov, k.tall.fov, w);
  }
  return { cam, tgt, fov, shift: portrait ? 0 : k.frame.shift, lift: portrait ? k.frame.liftTall : k.frame.lift };
}

export function mixViews(a: View, b: View, t: number): View {
  return {
    cam: lerp3(a.cam, b.cam, t),
    tgt: lerp3(a.tgt, b.tgt, t),
    fov: lerp(a.fov, b.fov, t),
    shift: lerp(a.shift, b.shift, t),
    lift: lerp(a.lift, b.lift, t),
  };
}

/** The camera pulled back along its line of sight, for approaching a shot out of the dark. */
export function pulledBack(v: View, by: number): View {
  return { ...v, cam: lerp3(v.tgt, v.cam, by) };
}

// Shape-preserving Hermite interpolation respects the time between shots. A
// camera coordinate cannot overshoot either shot, and "pass" keys share one
// tangent on both sides instead of changing speed at a key boundary.
function tangent(before: number, at: number, after: number, h0: number, h1: number) {
  const d0 = (at - before) / h0, d1 = (after - at) / h1;
  if (d0 * d1 <= 0) return 0;
  const w0 = 2 * h1 + h0, w1 = h1 + 2 * h0;
  return (w0 + w1) / (w0 / d0 + w1 / d1);
}

function curve(a: number, b: number, m0: number, m1: number, span: number, t: number) {
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * a + (t3 - 2 * t2 + t) * span * m0
    + (-2 * t3 + 3 * t2) * b + (t3 - t2) * span * m1;
}

/** The view at time t on a list of keys (sorted by t), for a poster shape. */
export function sampleKeys(keys: CameraKey[], t: number, ref: number): View {
  if (t <= keys[0].t) return resolve(keys[0], ref);
  const last = keys[keys.length - 1];
  if (t >= last.t) return resolve(last, ref);
  let i = 0;
  while (keys[i + 1].t < t) i++;
  const a = keys[i], b = keys[i + 1];
  const local = (t - a.t) / (b.t - a.t || 1);
  const va = resolve(a, ref), vb = resolve(b, ref);
  const prev = i > 0 ? keys[i - 1] : null;
  const next = i + 2 < keys.length ? keys[i + 2] : null;
  const v0 = prev ? resolve(prev, ref) : va;
  const v3 = next ? resolve(next, ref) : vb;
  const span = b.t - a.t;
  const sample = (p0: number, p1: number, p2: number, p3: number) => {
    const slope = (p2 - p1) / span;
    const m0 = a.ease === "pass" ? (prev ? tangent(p0, p1, p2, a.t - prev.t, span) : slope) : 0;
    const m1 = b.ease === "pass" ? (next ? tangent(p1, p2, p3, span, next.t - b.t) : slope) : 0;
    return curve(p1, p2, m0, m1, span, local);
  };
  const vector = (p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3): Vec3 =>
    [sample(p0[0], p1[0], p2[0], p3[0]), sample(p0[1], p1[1], p2[1], p3[1]), sample(p0[2], p1[2], p2[2], p3[2])];
  return {
    cam: vector(v0.cam, va.cam, vb.cam, v3.cam),
    tgt: vector(v0.tgt, va.tgt, vb.tgt, v3.tgt),
    fov: sample(v0.fov, va.fov, vb.fov, v3.fov),
    shift: sample(v0.shift, va.shift, vb.shift, v3.shift),
    lift: sample(v0.lift, va.lift, vb.lift, v3.lift),
  };
}

/**
 * Common framings. right: subject right of center on wide screens (text on the left)
 * and above center on phones (text underneath). close: the same for a subject that
 * fills more of the frame. low: subject low in frame, text above.
 */
export const FRAMES = {
  right: { shift: 0.16, lift: 0, liftTall: 0.21, backTall: 1.15 },
  close: { shift: 0.25, lift: 0, liftTall: 0.24, backTall: 1.4 },
  low: { shift: 0, lift: -0.25, liftTall: -0.14, backTall: 1.5 },
} satisfies Record<string, Frame>;
