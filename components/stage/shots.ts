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

// Catmull-Rom through four points, so a path through several keys bends smoothly
const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
const cr3 = (a: Vec3, b: Vec3, c: Vec3, d: Vec3, t: number): Vec3 => [cr(a[0], b[0], c[0], d[0], t), cr(a[1], b[1], c[1], d[1], t), cr(a[2], b[2], c[2], d[2], t)];

// Hermite easing with a chosen start and end speed (0: from or to a halt, 1: moving)
const hermite = (t: number, s0: number, s1: number) => {
  const t2 = t * t, t3 = t2 * t;
  return (t3 - 2 * t2 + t) * s0 + (-2 * t3 + 3 * t2) + (t3 - t2) * s1;
};

/** The view at time t on a list of keys (sorted by t), for a poster shape. */
export function sampleKeys(keys: CameraKey[], t: number, ref: number): View {
  if (t <= keys[0].t) return resolve(keys[0], ref);
  const last = keys[keys.length - 1];
  if (t >= last.t) return resolve(last, ref);
  let i = 0;
  while (keys[i + 1].t < t) i++;
  const a = keys[i], b = keys[i + 1];
  const local = (t - a.t) / (b.t - a.t || 1);
  const e = hermite(local, a.ease === "pass" ? 1 : 0, b.ease === "pass" ? 1 : 0);
  const va = resolve(a, ref), vb = resolve(b, ref);
  const v0 = i > 0 ? resolve(keys[i - 1], ref) : va;
  const v3 = i + 2 < keys.length ? resolve(keys[i + 2], ref) : vb;
  return {
    cam: cr3(v0.cam, va.cam, vb.cam, v3.cam, e),
    tgt: cr3(v0.tgt, va.tgt, vb.tgt, v3.tgt, e),
    fov: lerp(va.fov, vb.fov, e),
    shift: lerp(va.shift, vb.shift, e),
    lift: lerp(va.lift, vb.lift, e),
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
