/**
 * Used tires, on the lineup's worn drive tire: every one is checked before it goes on
 * the rack. A pen-style tread depth gauge comes down on the tread's front shoulder, its
 * foot bar across two lugs and its probe in the slot between them, and the scale bar
 * slides out of the barrel to read 12/32. The gauge lifts away, the camera backs off to
 * the sidewall, and a yellow tire crayon writes "12/32" and "OK" at the top of it in a
 * tech's hand. Then a pull back to a three-quarter view of the tire with its fresh marks.
 */
import * as THREE from "three";
import { LINEUP } from "../sequence";
import { FRAMES, lerp3, ramp, type CameraKey, type Vec3 } from "../shots";
import { DEPTH, DIM, outerSidewall, sidewallDecal, treadRadius } from "../tireModel";
import type { ServiceFactory } from "./types";

const X = LINEUP.used.x;
const KIND = LINEUP.used.kind;
// Turned so the outboard face looks right, across the studio: the camera on that side
// has the right rim light (behind, high) as a key from the upper right, the studio's key
// as a back light on the tire's left edge, and the tire itself on the right of the frame,
// clear of the page's text. Then a little round toward the camera for the hero.
const YAW = 1.45;
const YAW_END = 1.25;

// The probe goes in on the tread's shoulder, B round from the top toward the front of the
// studio: rubber that faces up catches both rim lights and turns a flat gray, this doesn't.
const B = 0.45;

// ---------------------------------------------------------------- where the probe goes
// The drive tread's layout (tireModel): 42 open-shoulder lugs a side, the outboard row
// half a pitch on, each lug slanting from the shoulder in toward the middle groove.
const R0 = DIM.RO - DEPTH[KIND]; // groove floor
const PITCH = (2 * Math.PI * R0) / 42;
const LUG = PITCH * 0.62, SLANT = 0.022;
const V_OUT = DIM.A + DIM.RHO * 1.02, V_IN = 0.006;
/** An outboard lug's leading and trailing edges (arc length at R0) at axial position v, for lug k. */
function lugEdges(v: number, k: number) {
  const u0 = PITCH / 2 + k * PITCH;
  const s = (V_OUT - v) / (V_OUT - V_IN);
  return [u0 + s * (SLANT + LUG * 0.18), u0 + LUG + s * (LUG * 0.86 + SLANT - LUG)];
}
const V = 0.052; // across the tread: the middle of the outboard lugs' flat tops
const gapMiddle = (k: number) => (lugEdges(V, k)[1] + lugEdges(V, k + 1)[0]) / 2;
// the gap B round from where the marks go, so they end up at the top, on a clear stretch
// of the sidewall between the molded M+S and the DOT code
const MARKS_AT = 3.0;
const K_GAP = Math.round(((MARKS_AT + B) * R0 - gapMiddle(0)) / PITCH);
const THETA = gapMiddle(K_GAP) / R0; // the gap the probe goes into, around the tire (tireModel's angles)
const ROLL = THETA - Math.PI - B; // rolls it to B short of the top (toward +z in the studio, at YAW)
const THETA_TOP = Math.PI + ROLL; // what is then the top of the tire
const GAP_HALF = (lugEdges(V, K_GAP + 1)[0] - lugEdges(V, K_GAP)[1]) / 2;

// heights in the site frame (0 is the lug tops at the probe's spot)
const R_TOP = treadRadius(KIND, true, V);
const DEPTH_AT = R_TOP - (treadRadius(KIND, false, V) - DEPTH[KIND] - 0.0004); // down to the groove floor (the casing sits 0.4 mm in)
// the foot is straight and the tread is round: it rests on the lugs' chamfered edges either
// side of the gap, a fraction of a millimeter below the curve's top
const FOOT_Y = -((GAP_HALF + 0.0022) ** 2) / (2 * R_TOP);

// ---------------------------------------------------------------- the gauge, in meters
const READING = 12; // 32nds
const U = (DEPTH_AT + FOOT_Y) / READING; // one graduation, so the probe on the floor reads 12
const MAXV = 28; // the highest number on the bar
const PMAX = (MAXV + 2) * U; // how far the probe sticks out with the bar pushed all the way in
const FOOT = { w: 0.0075, h: 0.0042, l: 0.066 };
const BARREL_R = 0.0058;
const LIP = FOOT.h + 0.064; // the barrel's top edge, where the scale is read
const PIN_R = 0.00085;
const BAR = { t: 0.0026, w: 0.0056 };
const S0 = LIP - 0.008, S1 = LIP + PMAX; // the bar, in the slider's frame (0 at the probe tip)

// ---------------------------------------------------------------- the crayon marks
// Written on the outboard sidewall at the top of the tire: "12/32" at r about 0.425, "OK"
// under it and to the right, clear of the molded DOT code. Positions are worked out on the face as if it were flat (x right, y up,
// from a point R_FACE out at the top), then bent onto it.
const R_FACE = 0.4;
const DECAL = { r0: 0.33, r1: 0.466, th0: THETA_TOP - 0.32, len: 0.64 };
const W0 = 0.56, W1 = 0.84; // u window of the writing

// fully metallic parts reflect the black studio and vanish against rubber; part-metal
// steel takes the key light as well, so small tools read
const steel = (color: number, roughness: number, metalness = 0.55) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
const plastic = (color: number, roughness: number) => new THREE.MeshStandardMaterial({ color, metalness: 0, roughness });

// fixed-seed random numbers, so the hand comes out the same on every build
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cross-hatched diamonds for the barrel's knurling, as a bump map (grooves dark). */
function knurlTexture() {
  const S = 256, n = 8;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#fff";
  c.fillRect(0, 0, S, S);
  c.filter = "blur(2px)";
  c.strokeStyle = "#000";
  c.lineWidth = S / n / 3.2;
  for (let i = -n; i <= 2 * n; i++) {
    const x = (i * S) / n;
    for (const d of [S, -S]) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + d, S);
      c.stroke();
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 6);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * The scale bar's front face, from S0 to S1 up the slider: graduations every 32nd, longer
 * every 2 and 4, numbered every 4 just above the tick, so the number at the barrel's lip
 * sits fully in view. Mark k is LIP + k * U above the probe tip, so it reaches the lip
 * when the probe sticks out k 32nds.
 */
function scaleTexture(font: string) {
  const Wpx = 192, Hpx = Math.round((Wpx * (S1 - S0)) / BAR.w);
  const cv = document.createElement("canvas");
  cv.width = Wpx;
  cv.height = Hpx;
  const c = cv.getContext("2d")!;
  const pxm = Wpx / BAR.w; // pixels per meter
  const yPx = (s: number) => (S1 - s) * pxm; // canvas top is the bar's top
  c.fillStyle = "#e6e4de";
  c.fillRect(0, 0, Wpx, Hpx);
  // faint lengthwise brushing
  const rand = rng(31);
  for (let i = 0; i < 220; i++) {
    c.fillStyle = rand() < 0.5 ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.4)";
    c.fillRect(rand() * Wpx, 0, 1, Hpx);
  }
  c.fillStyle = "#121214";
  const lw = 0.00016 * pxm;
  for (let k = 0; k <= MAXV; k++) {
    const len = k % 4 === 0 ? 0.42 : k % 2 === 0 ? 0.3 : 0.2;
    c.fillRect(0, yPx(LIP + k * U) - lw / 2, len * Wpx, lw);
  }
  c.font = `700 ${2.3 * U * pxm}px ${font}`;
  c.textAlign = "right";
  c.textBaseline = "alphabetic";
  for (let k = 4; k <= MAXV; k += 4) c.fillText(String(k), Wpx * 0.94, yPx(LIP + (k + 0.35) * U));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------------------------------------------------------------- the tech's hand
type Pt = [number, number];
// letters one unit tall, drawn as a tech would: one stroke each (two for the K), each
// stroke a list of smooth runs meeting at corners
const GLYPHS: Record<string, { adv: number; strokes: Pt[][][] }> = {
  "1": { adv: 0.36, strokes: [[[[0.02, 0.78], [0.14, 0.88], [0.26, 1.02]], [[0.26, 1.02], [0.24, 0.5], [0.21, -0.01]]]] },
  "2": {
    adv: 0.74,
    strokes: [[
      [[0.04, 0.74], [0.16, 0.93], [0.4, 1.02], [0.62, 0.94], [0.67, 0.74], [0.55, 0.5], [0.3, 0.24], [0.02, 0.0]],
      [[0.02, 0.0], [0.38, 0.03], [0.74, 0.01]],
    ]],
  },
  "/": { adv: 0.46, strokes: [[[[0.52, 1.06], [0.0, -0.06]]]] },
  "3": {
    adv: 0.72,
    strokes: [[
      [[0.05, 0.86], [0.3, 1.02], [0.57, 0.97], [0.64, 0.79], [0.5, 0.62], [0.25, 0.55]],
      [[0.25, 0.55], [0.55, 0.5], [0.7, 0.31], [0.62, 0.09], [0.35, 0.0], [0.03, 0.1]],
    ]],
  },
  O: {
    adv: 0.94,
    strokes: [[[[0.56, 1.0], [0.24, 0.92], [0.05, 0.56], [0.14, 0.12], [0.46, -0.01], [0.8, 0.1], [0.93, 0.48], [0.82, 0.86], [0.52, 1.01], [0.33, 0.95]]]],
  },
  K: {
    adv: 0.78,
    strokes: [
      [[[0.12, 1.02], [0.1, 0.5], [0.08, -0.01]]],
      [[[0.76, 1.02], [0.42, 0.72], [0.12, 0.44]], [[0.12, 0.44], [0.44, 0.22], [0.8, -0.02]]],
    ],
  },
};

/** A line of handwriting h tall, centered at (cx, cy) on the face: strokes as polylines in meters. */
function handwrite(text: string, h: number, cx: number, cy: number, rand: () => number) {
  const out: Pt[][] = [];
  let x = 0;
  for (const ch of text) {
    const g = GLYPHS[ch];
    const sx = h * (0.94 + rand() * 0.12), sy = h * (0.95 + rand() * 0.08);
    const base = (rand() - 0.5) * 0.05 * h, lean = 0.2 + (rand() - 0.5) * 0.08;
    for (const stroke of g.strokes) {
      const pts: Pt[] = [];
      for (const run of stroke) {
        const curve = new THREE.CatmullRomCurve3(run.map(([a, b]) => new THREE.Vector3(a, b, 0)), false, "centripetal");
        const n = Math.max(2, Math.round(curve.getLength() * 60));
        curve.getSpacedPoints(n).forEach((p, i) => {
          if (i === 0 && pts.length) return; // the corner is already there
          // a little wobble, as a crayon on rubber never runs quite true
          const wob = Math.sin(p.x * 9 + p.y * 7 + base * 300) * 0.012;
          pts.push([x + p.x * sx + lean * p.y * sy, base + (p.y + wob) * sy]);
        });
      }
      out.push(pts);
    }
    x += g.adv * sx + 0.15 * h;
  }
  const width = x - 0.15 * h + 0.2 * h; // the lean pushes the tops right
  return out.map((s) => s.map(([a, b]): Pt => [a - width / 2 + cx, b - h / 2 + cy]));
}

const service: ServiceFactory = async (ctx) => {
  const tire = ctx.lineup.used;

  // a frame at the gap the probe goes into: +x across the tread toward the outboard side,
  // +y out of the tread, +z along it; it rolls with the tire. The gauge is built in it.
  const n = new THREE.Vector3(Math.sin(THETA), 0, Math.cos(THETA));
  const a = new THREE.Vector3(0, 1, 0);
  const t = new THREE.Vector3().crossVectors(a, n);
  const site = new THREE.Group();
  site.name = "used-site";
  site.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, n, t));
  site.position.copy(n).multiplyScalar(R_TOP).addScaledVector(a, V);
  tire.spin.add(site);

  // ---------------------------------------------------------------- the gauge
  // origin at the middle of the foot's underside, barrel up +y, foot along z, scale facing +x
  const gauge = new THREE.Group();
  gauge.name = "used-gauge";
  // satin chrome: metal enough to show the studio's dark reflections, not so much it goes black
  const bright = steel(0xa9adb2, 0.28, 0.6);
  const footShape = new THREE.Shape([
    [-FOOT.l / 2, 0], [FOOT.l / 2, 0], [FOOT.l / 2, FOOT.h * 0.55], [FOOT.l / 2 - 0.003, FOOT.h], [-FOOT.l / 2 + 0.003, FOOT.h], [-FOOT.l / 2, FOOT.h * 0.55],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  const footGeo = new THREE.ExtrudeGeometry(footShape, {
    depth: FOOT.w, bevelEnabled: true, bevelThickness: 0.0005, bevelSize: 0.0005, bevelOffset: -0.0005, bevelSegments: 2, curveSegments: 1,
  }).translate(0, 0, -FOOT.w / 2).rotateY(Math.PI / 2);
  const foot = new THREE.Mesh(footGeo, steel(0x9da1a6, 0.32, 0.6));
  // the barrel: smooth collars at either end, knurled between
  const lathe = (pts: Pt[], mat: THREE.Material) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 40), mat);
  const K0 = FOOT.h + 0.013, K1 = LIP - 0.011;
  const lower = lathe([[0, FOOT.h], [0.0042, FOOT.h], [0.0042, FOOT.h + 0.0025], [0.0062, FOOT.h + 0.004], [0.0062, K0 - 0.0006], [BARREL_R, K0]], bright);
  const knurl = new THREE.Mesh(
    new THREE.CylinderGeometry(BARREL_R, BARREL_R, K1 - K0, 48, 1, true).translate(0, (K0 + K1) / 2, 0),
    Object.assign(steel(0x8f9398, 0.4, 0.6), { bumpMap: knurlTexture(), bumpScale: 2.2 }),
  );
  const upper = lathe([[BARREL_R, K1], [0.0062, K1 + 0.0006], [0.0062, LIP - 0.0013], [0.005, LIP], [0, LIP]], bright);
  // a pocket clip down the side, seen in profile
  const clipMat = steel(0xb0b4b8, 0.24, 0.6);
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.0028, 0.034, 0.0007).translate(0, LIP - 0.006 - 0.017, BARREL_R + 0.0014), clipMat);
  const clipFoot = new THREE.Mesh(new THREE.BoxGeometry(0.0028, 0.004, 0.0016).translate(0, LIP - 0.005, BARREL_R + 0.0006), clipMat);
  const clipTip = new THREE.Mesh(new THREE.SphereGeometry(0.0016, 12, 8).scale(1, 1.4, 0.6).translate(0, LIP - 0.04, BARREL_R + 0.0012), clipMat);
  gauge.add(foot, lower, knurl, upper, clip, clipFoot, clipTip);

  // the slider: the probe and the scale bar in one piece, origin at the probe's tip
  const slider = new THREE.Group();
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(PIN_R, PIN_R, S0 + 0.002, 16).translate(0, (S0 + 0.002) / 2 + 0.0004, 0), steel(0xd5d8db, 0.2, 0.6));
  const pinTip = new THREE.Mesh(new THREE.SphereGeometry(PIN_R, 16, 8).scale(1, 0.5, 1).translate(0, 0.0004, 0), pin.material);
  const barMat = new THREE.MeshStandardMaterial({ color: 0xdedcd6, metalness: 0.25, roughness: 0.4 });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(BAR.t, S1 - S0, BAR.w).translate(0, (S0 + S1) / 2, 0), barMat);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(BAR.w, S1 - S0).rotateY(Math.PI / 2).translate(BAR.t / 2 + 0.00004, (S0 + S1) / 2, 0),
    new THREE.MeshStandardMaterial({ map: scaleTexture(ctx.font), metalness: 0.2, roughness: 0.42 }),
  );
  // a red push button on the end of the bar, to set it back to zero
  const capShape = new THREE.Shape();
  const cw = (BAR.w + 0.0012) / 2, cr = 0.0009;
  capShape.moveTo(-cw, 0);
  capShape.lineTo(cw, 0);
  capShape.lineTo(cw, 0.0032 - cr);
  capShape.quadraticCurveTo(cw, 0.0032, cw - cr, 0.0032);
  capShape.lineTo(-cw + cr, 0.0032);
  capShape.quadraticCurveTo(-cw, 0.0032, -cw, 0.0032 - cr);
  const capGeo = new THREE.ExtrudeGeometry(capShape, {
    depth: BAR.t + 0.0006, bevelEnabled: true, bevelThickness: 0.0004, bevelSize: 0.0004, bevelOffset: -0.0004, bevelSegments: 2, curveSegments: 4,
  }).translate(0, 0, -(BAR.t + 0.0006) / 2).rotateY(Math.PI / 2).translate(0, S1 - 0.0004, 0);
  const cap = new THREE.Mesh(capGeo, plastic(0x8e0c12, 0.42));
  slider.add(pin, pinTip, bar, face, cap);
  gauge.add(slider);
  site.add(gauge);
  await ctx.nextTask();

  // ---------------------------------------------------------------- the crayon
  // a yellow lumber crayon: a hexagonal stick of wax, half an inch across, its writing end
  // worn down to a blunt, rounded point; tip at the origin, along +y. Flat shaded, so the
  // six faces catch the light one by one.
  const crayon = new THREE.Group();
  crayon.name = "used-crayon";
  const HEX = 0.0084, LEN = 0.09;
  const wax = new THREE.MeshStandardMaterial({ color: 0xf0b81c, roughness: 0.48, metalness: 0, flatShading: true });
  const wornWax = new THREE.MeshStandardMaterial({ color: 0xf6d25a, roughness: 0.62, metalness: 0, flatShading: true });
  const TIP = 0.011;
  const worn = new THREE.Mesh(new THREE.LatheGeometry(
    [[0, 0], [HEX * 0.3, 0.0003], [HEX * 0.55, 0.0016], [HEX * 0.78, 0.0042], [HEX * 0.93, 0.0075], [HEX, TIP]].map(([r, y]) => new THREE.Vector2(r, y)), 6,
  ), wornWax);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(HEX, HEX, LEN - TIP, 6, 1).translate(0, TIP + (LEN - TIP) / 2, 0), wax);
  // the back end, cut square with its edges softened by handling
  const butt = new THREE.Mesh(new THREE.CylinderGeometry(HEX * 0.86, HEX, 0.0012, 6, 1).translate(0, LEN + 0.0006, 0), wax);
  crayon.add(worn, stick, butt);
  tire.spin.add(crayon);

  for (const o of [gauge, crayon]) {
    o.traverse((m) => {
      if ((m as THREE.Mesh).isMesh) m.castShadow = m.receiveShadow = true;
    });
  }

  // ---------------------------------------------------------------- the marks
  const rand = rng(1207);
  const strokes = [...handwrite("12/32", 0.042, 0.0, 0.026, rand), ...handwrite("OK", 0.036, 0.036, -0.034, rand)];
  // timing: each stroke drawn at a steady pace that eases in and out, a short lift and move
  // between strokes, a longer one down to the second line
  const len = (s: Pt[]) => s.reduce((acc, p, i) => (i ? acc + Math.hypot(p[0] - s[i - 1][0], p[1] - s[i - 1][1]) : 0), 0);
  type Down = { t0: number; t1: number; pts: Pt[]; cum: number[] };
  type Up = { t0: number; t1: number; from: Pt; to: Pt };
  const downs: Down[] = [], ups: Up[] = [];
  let clock = 0;
  strokes.forEach((s, i) => {
    if (i) {
      const from = strokes[i - 1][strokes[i - 1].length - 1], to = s[0];
      const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
      ups.push({ t0: clock, t1: clock + 0.012 + d * 0.45, from, to });
      clock += 0.012 + d * 0.45;
    }
    const cum = [0];
    for (let j = 1; j < s.length; j++) cum.push(cum[j - 1] + Math.hypot(s[j][0] - s[j - 1][0], s[j][1] - s[j - 1][1]));
    downs.push({ t0: clock, t1: clock + len(s), pts: s, cum });
    clock += len(s);
  });
  for (const d of [...downs, ...ups]) {
    d.t0 /= clock;
    d.t1 /= clock;
  }
  const pace = (f: number) => 0.6 * f + 0.4 * f * f * (3 - 2 * f); // a stroke starts and ends a little slower
  /** Where along a stroke the crayon is at a fraction f of its time. */
  const along = (d: Down, f: number): Pt => {
    const s = pace(f) * d.cum[d.cum.length - 1];
    let j = 1;
    while (j < d.cum.length - 1 && d.cum[j] < s) j++;
    const k = (s - d.cum[j - 1]) / (d.cum[j] - d.cum[j - 1] || 1);
    return [d.pts[j - 1][0] + (d.pts[j][0] - d.pts[j - 1][0]) * k, d.pts[j - 1][1] + (d.pts[j][1] - d.pts[j - 1][1]) * k];
  };
  /** The crayon's point on the face at writing time T (0 to 1), and how far it's lifted off. */
  const penAt = (T: number): { p: Pt; up: number } => {
    for (let i = 0; i < downs.length; i++) {
      const d = downs[i];
      if (T > d.t1) continue;
      if (T >= d.t0 || i === 0) return { p: along(d, THREE.MathUtils.clamp((T - d.t0) / (d.t1 - d.t0), 0, 1)), up: 0 };
      const m = ups[i - 1]; // the move from the stroke before
      const f = ramp(T, m.t0, m.t1);
      return { p: [m.from[0] + (m.to[0] - m.from[0]) * f, m.from[1] + (m.to[1] - m.from[1]) * f], up: Math.sin(Math.PI * Math.min(1, (T - m.t0) / (m.t1 - m.t0))) };
    }
    const last = downs[downs.length - 1];
    return { p: last.pts[last.pts.length - 1], up: 0 };
  };

  // the face is near enough flat over the marks to lay them out as if it were, then bend
  // them onto it: a point x right and y up of the top, R_FACE out
  const polar = ([x, y]: Pt) => ({ r: Math.hypot(x, R_FACE + y), th: THETA_TOP - Math.atan2(x, R_FACE + y) });
  const W = Math.min(2048, ctx.maxTexture), H = W / 2;
  const toPx = (p: Pt): Pt => {
    const { r, th } = polar(p);
    return [(1 - (th - DECAL.th0) / DECAL.len) * W, ((r - DECAL.r0) / (DECAL.r1 - DECAL.r0)) * H];
  };
  const pxPerM = H / (DECAL.r1 - DECAL.r0);
  const WIDTH = 0.0058 * pxPerM; // the crayon's line, a blunt point's width
  const mkCanvas = () => {
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    return [cv, cv.getContext("2d")!] as const;
  };
  const pathPx = strokes.map((s) => s.map(toPx));

  // the waxy color: several faint, slightly offset passes, then gaps where the crayon
  // skipped over the rubber's grain, and streaks along the stroke
  const [colorCv, cc] = mkCanvas();
  cc.lineCap = cc.lineJoin = "round";
  const wr = rng(77);
  for (const s of pathPx) {
    for (let pass = 0; pass < 14; pass++) {
      const ox = (wr() - 0.5) * WIDTH * 0.3, oy = (wr() - 0.5) * WIDTH * 0.3;
      cc.strokeStyle = wr() < 0.5 ? "#f5dc66" : "#ecca45";
      cc.globalAlpha = 0.24 + wr() * 0.12;
      cc.lineWidth = WIDTH * (0.45 + wr() * 0.55);
      cc.beginPath();
      s.forEach(([x, y], i) => (i ? cc.lineTo(x + ox, y + oy) : cc.moveTo(x + ox, y + oy)));
      cc.stroke();
    }
  }
  cc.globalCompositeOperation = "destination-out";
  for (const s of pathPx) {
    for (let k = 0; k < 12; k++) {
      const off = (wr() - 0.5) * WIDTH * 1.0;
      cc.globalAlpha = 0.12 + wr() * 0.3;
      cc.lineWidth = 0.8 + wr() * 1.8;
      cc.setLineDash([2 + wr() * 10, 2 + wr() * 8]);
      cc.beginPath();
      s.forEach(([x, y], i) => {
        // offset sideways, across the stroke's direction
        const [px, py] = s[Math.max(0, i - 1)], [nx, ny] = s[Math.min(s.length - 1, i + 1)];
        const dl = Math.hypot(nx - px, ny - py) || 1;
        const qx = x - ((ny - py) / dl) * off, qy = y + ((nx - px) / dl) * off;
        if (i) cc.lineTo(qx, qy);
        else cc.moveTo(qx, qy);
      });
      cc.stroke();
    }
  }
  cc.setLineDash([]);
  // the rubber's grain shows through: specks and short streaks where the wax didn't take
  for (let i = 0; i < W * H * 0.03; i++) {
    cc.globalAlpha = 0.3 + wr() * 0.7;
    cc.fillRect(wr() * W, wr() * H, 1 + wr() * 2, 1 + wr() * 1.5);
  }
  await ctx.nextTask();

  // when each bit of the marks goes on, 0 to 1 as gray (white: never), for the reveal.
  // Drawn latest first, wider than the color, so a pixel keeps the time the crayon first got there.
  const [timeCv, tc] = mkCanvas();
  tc.fillStyle = "#fff";
  tc.fillRect(0, 0, W, H);
  tc.lineCap = "round";
  tc.lineWidth = WIDTH * 1.7;
  /** The fraction of a stroke's time at which the crayon passes its j-th point. */
  const timeAtLength = (d: Down, j: number) => {
    const target = d.cum[j] / d.cum[d.cum.length - 1];
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (pace(mid) < target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  for (let si = downs.length - 1; si >= 0; si--) {
    const d = downs[si], s = pathPx[si];
    for (let j = s.length - 1; j > 0; j--) {
      const g = Math.round(250 * (d.t0 + (d.t1 - d.t0) * timeAtLength(d, j)));
      tc.strokeStyle = `rgb(${g},${g},${g})`;
      tc.beginPath();
      tc.moveTo(s[j - 1][0], s[j - 1][1]);
      tc.lineTo(s[j][0], s[j][1]);
      tc.stroke();
    }
  }

  const colorTex = new THREE.CanvasTexture(colorCv);
  colorTex.flipY = false; // canvas row y is v = y / H, from r0 out
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.premultiplyAlpha = true;
  colorTex.anisotropy = 8;
  const timeTex = new THREE.CanvasTexture(timeCv);
  timeTex.flipY = false;
  timeTex.colorSpace = THREE.NoColorSpace;
  timeTex.magFilter = timeTex.minFilter = THREE.NearestFilter;
  timeTex.generateMipmaps = false;
  const reveal = { value: 0 };
  const markMat = new THREE.MeshStandardMaterial({
    map: colorTex, transparent: true, premultipliedAlpha: true, depthWrite: false, roughness: 0.8, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  markMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWrite = { value: timeTex };
    shader.uniforms.uReveal = reveal;
    shader.fragmentShader = "uniform sampler2D uWrite;\nuniform float uReveal;\n" + shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      // the crayon hasn't got here yet
      if (uReveal < 1.0 && texture2D(uWrite, vMapUv).r * (255.0 / 250.0) > uReveal) discard;`,
    );
  };
  markMat.customProgramCacheKey = () => "ttp-used-marks";
  const marks = sidewallDecal(KIND, DECAL.r0, DECAL.r1, DECAL.th0, DECAL.len, markMat, { segs: 96, rings: 24, lift: 0.0008, flipU: true });
  marks.name = "used-marks";
  marks.receiveShadow = true;
  tire.spin.add(marks);

  // the sidewall's height and slope at a radius, for putting the crayon on it
  const prof = outerSidewall(KIND);
  const sideAt = (r: number) => {
    for (let j = 1; j < prof.length; j++) {
      const p = prof[j - 1], q = prof[j];
      if ((r - p.x) * (r - q.x) <= 0) {
        const slope = (q.y - p.y) / (q.x - p.x || 1);
        return { y: p.y + (r - p.x) * slope, slope };
      }
    }
    return { y: prof[prof.length - 1].y, slope: 0 };
  };

  const tmp = { P: new THREE.Vector3(), N: new THREE.Vector3(), R: new THREE.Vector3(), Up: new THREE.Vector3(), D: new THREE.Vector3() };
  const Y = new THREE.Vector3(0, 1, 0);
  const twist = new THREE.Quaternion().setFromAxisAngle(Y, 0.3);
  /** Put the crayon's tip on the face at p, lifted `up` off it, then moved `away` back along its own length. */
  function placeCrayon(p: Pt, up: number, away: number) {
    const { r, th } = polar(p);
    const s = sideAt(r);
    const { P, N, R, Up, D } = tmp;
    P.set(r * Math.sin(th), s.y + 0.0008, r * Math.cos(th));
    N.set(-s.slope * Math.sin(th), 1, -s.slope * Math.cos(th)).normalize();
    R.set(-Math.cos(th), 0, Math.sin(th));
    Up.set(Math.sin(th), 0, Math.cos(th));
    // held like a pencil: leaning out of the face and down to the right, where the hand is
    D.copy(N).multiplyScalar(0.62).addScaledVector(R, 0.45).addScaledVector(Up, -0.64).normalize();
    crayon.position.copy(P).addScaledVector(N, up).addScaledVector(D, away);
    crayon.quaternion.setFromUnitVectors(Y, D).multiply(twist);
  }

  function update(u: number) {
    // gauge: comes down on the tread, its probe finds the groove floor, the barrel presses
    // on till the foot sits on the lugs and the bar has slid out; then it lifts away, the
    // bar held where it stopped
    const hc = PMAX - DEPTH_AT; // the foot's height when the probe touches the floor
    const come = ramp(u, 0.15, 0.255), press = ramp(u, 0.255, 0.34), lift = ramp(u, 0.45, 0.53);
    gauge.visible = u > 0.15 && u < 0.53;
    const h = u < 0.255 ? hc + 0.006 + 0.2 * (1 - come) : hc + 0.006 + (FOOT_Y - hc - 0.006) * press;
    const p = lift > 0 ? DEPTH_AT + FOOT_Y : Math.min(PMAX, h + DEPTH_AT);
    slider.position.y = -p;
    gauge.position.set(0.03 * (1 - come) + lift * 0.02, h + lift * 0.24, -0.04 * (1 - come) - lift * 0.05);
    gauge.rotation.set(0.3 * (1 - come) + lift * 0.35, 0, -0.16 * (1 - come) - lift * 0.1);

    // crayon: comes in to the start of the first stroke, writes, lifts away
    const T = THREE.MathUtils.clamp((u - W0) / (W1 - W0), 0, 1);
    reveal.value = T;
    marks.visible = T > 0;
    crayon.visible = u > 0.5 && u < 0.88;
    if (crayon.visible) {
      const { p: at, up } = penAt(T);
      const inn = ramp(u, 0.5, W0), out = ramp(u, W1, 0.88);
      placeCrayon(at, 0.006 * up + 0.02 * (1 - inn) + 0.04 * out, 0.2 * (1 - inn) + 0.32 * out);
    }
  }

  // camera positions are worked out in two frames on the tire in its final pose, then
  // turned into scene coordinates: the site (x across the tread toward the outboard side,
  // y out of it, z along it) and the face over the marks (x right, y up, z out of it)
  const faceFrame = new THREE.Group();
  faceFrame.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    new THREE.Vector3(-Math.cos(THETA_TOP), 0, Math.sin(THETA_TOP)), new THREE.Vector3(Math.sin(THETA_TOP), 0, Math.cos(THETA_TOP)), a.clone(),
  ));
  faceFrame.position.set(R_FACE * Math.sin(THETA_TOP), sideAt(R_FACE).y, R_FACE * Math.cos(THETA_TOP));
  tire.spin.add(faceFrame);
  const pivot = tire.pivot;
  const saved = { yaw: pivot.rotation.y, x: pivot.position.x, roll: tire.spin.rotation.y };
  pivot.rotation.y = YAW;
  pivot.position.x = X;
  tire.spin.rotation.y = -ROLL;
  pivot.updateMatrixWorld(true);
  const siteMatrix = site.matrixWorld.clone(), faceMatrix = faceFrame.matrixWorld.clone();
  pivot.rotation.y = saved.yaw;
  pivot.position.x = saved.x;
  tire.spin.rotation.y = saved.roll;
  pivot.updateMatrixWorld(true);
  tire.spin.remove(faceFrame);
  const inFrame = (m: THREE.Matrix4) => (x: number, y: number, z: number): Vec3 => {
    const v = new THREE.Vector3(x, y, z).applyMatrix4(m);
    return [v.x, v.y, v.z];
  };
  const w = inFrame(siteMatrix), f = inFrame(faceMatrix);
  // and a level frame at the site, for camera offsets: x outboard, y up, z screen right
  // as seen from the outboard side (toward the back of the studio); the gauge shots look
  // from about 25 degrees round toward the front, at rubber that faces away from the rims
  const out = new THREE.Vector3().setFromMatrixColumn(siteMatrix, 0).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const front = new THREE.Vector3().crossVectors(up, out);
  const near = (p: Vec3, x: number, y: number, z: number): Vec3 => {
    const v = new THREE.Vector3(...p).addScaledVector(out, x).addScaledVector(up, y).addScaledVector(front, z);
    return [v.x, v.y, v.z];
  };
  const O = w(0, 0, 0);
  const READ = w(0, LIP + 0.007, 0); // the scale, just above the barrel's lip

  // a key part way along the straight line between two others: either side of a hold, so
  // the path through the hold doesn't swing out toward the shots before and after it
  const guard = (t: number, a: CameraKey, b: CameraKey, k: number): CameraKey => ({
    t, cam: lerp3(a.cam, b.cam, k), tgt: lerp3(a.tgt, b.tgt, k), fov: a.fov + (b.fov - a.fov) * k, frame: a.frame, ease: "pass",
    ...(a.tall && b.tall ? { tall: { cam: lerp3(a.tall.cam, b.tall.cam, k), tgt: lerp3(a.tall.tgt, b.tall.tgt, k), fov: a.tall.fov + (b.tall.fov - a.tall.fov) * k } } : {}),
  });
  const press: CameraKey = {
    t: 0.34, cam: near(O, 0.22, 0.055, -0.06), tgt: near(O, 0, 0.04, 0.002), fov: 30, frame: FRAMES.close,
    tall: { cam: near(O, 0.45, 0.08, -0.18), tgt: near(O, 0, 0.052, 0), fov: 30 },
  };
  const read0: CameraKey = {
    t: 0.395, cam: near(READ, 0.083, 0.004, -0.022), tgt: READ, fov: 30, frame: FRAMES.close,
    tall: { cam: near(READ, 0.165, 0.01, -0.055), tgt: near(READ, 0, 0.006, 0), fov: 30 },
  };
  const read1: CameraKey = {
    t: 0.45, cam: near(READ, 0.078, 0.003, -0.021), tgt: READ, fov: 30, frame: FRAMES.close,
    tall: { cam: near(READ, 0.158, 0.009, -0.053), tgt: near(READ, 0, 0.006, 0), fov: 30 },
  };
  const side0: CameraKey = {
    t: 0.56, cam: f(0.13, 0.06, 1.18), tgt: f(-0.06, -0.11, 0), fov: 30, frame: FRAMES.close,
    tall: { cam: f(0.03, 0.06, 1.15), tgt: f(0, -0.03, 0), fov: 30 },
  };
  const side1Tall = { cam: f(0.05, 0.05, 1.1), tgt: f(0.005, -0.03, 0), fov: 30 };
  const side1: CameraKey = { t: 0.84, cam: f(0.16, 0.05, 1.14), tgt: f(-0.055, -0.11, 0), fov: 30, frame: FRAMES.close, tall: side1Tall };

  const heroTall = { cam: [X + 3.6, 1.6, 2.83] as Vec3, tgt: [X, 0.5, 0] as Vec3, fov: 30 };
  const HERO: CameraKey = { t: 1, cam: [X + 1.77, 1.08, 1.39], tgt: [X - 0.07, 0.54, 0], fov: 30, frame: FRAMES.right, tall: heroTall };

  const keys: CameraKey[] = [
    // on the outboard side, above the crown: the worn lugs on the skyline, low in the frame
    {
      t: 0, cam: near(O, 0.56, 0.2, -0.18), tgt: near(O, -0.05, 0.07, 0), fov: 30, frame: FRAMES.close,
      tall: { cam: near(O, 0.82, 0.3, -0.32), tgt: near(O, 0, 0.01, 0), fov: 30 },
    },
    // down closer, level with the lugs, looking into the open shoulder slots
    {
      t: 0.15, cam: near(O, 0.33, 0.1, -0.1), tgt: near(O, 0, 0.05, 0.004), fov: 30, frame: FRAMES.close,
      tall: { cam: near(O, 0.5, 0.1, -0.2), tgt: near(O, 0, 0.05, 0), fov: 30 },
    },
    {
      t: 0.27, cam: near(O, 0.26, 0.105, -0.08), tgt: near(O, 0, 0.045, 0.003), fov: 30, frame: FRAMES.close, ease: "pass",
      tall: { cam: near(O, 0.47, 0.09, -0.19), tgt: near(O, 0, 0.05, 0), fov: 30 },
    },
    press,
    // in on the scale, 12 at the lip
    guard(0.37, press, read0, 0.7),
    read0,
    read1,
    guard(0.48, read1, side0, 0.25),
    // back to the sidewall for the crayon
    side0,
    side1,
    // back to a three-quarter view of the tire, the marks at the top of its face; pulling
    // well back before the aim drops to the wheel, so the tire stays clear of the text
    {
      t: 0.92, cam: lerp3(side1.cam, HERO.cam, 0.55), tgt: lerp3(side1.tgt, HERO.tgt, 0.35), fov: 30, frame: FRAMES.close, ease: "pass",
      tall: { cam: lerp3(side1Tall.cam, heroTall.cam, 0.55), tgt: lerp3(side1Tall.tgt, heroTall.tgt, 0.35), fov: 30 },
    },
    HERO,
  ];

  return {
    tire: "used",
    focus: [X, 0.8],
    keys,
    pose: (u) => ({ yaw: YAW + (YAW_END - YAW) * ramp(u, 0.85, 1), roll: ROLL }),
    update,
    rest: () => update(0),
  };
};

export default service;
