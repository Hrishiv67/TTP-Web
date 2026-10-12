/**
 * Used tires, on the lineup's worn drive tire: every one is checked before it goes on
 * the rack. A pen-style tread depth gauge comes down on the tread, its foot bar across
 * two lugs and its probe in the groove between them, and the scale bar slides out of the
 * barrel to read 12/32. The gauge lifts away, the camera drops to the sidewall, and a
 * yellow tire crayon writes "12/32" and "OK" there in a tech's hand. Then a pull back to
 * a three-quarter view of the tire with its fresh marks.
 */
import * as THREE from "three";
import { LINEUP } from "../sequence";
import { FRAMES, lerp3, ramp, type CameraKey, type Vec3 } from "../shots";
import { DEPTH, DIM, outerSidewall, sidewallDecal, treadRadius } from "../tireModel";
import type { ServiceFactory } from "./types";

const X = LINEUP.used.x;
const KIND = LINEUP.used.kind;
// turned so the outboard face looks toward the key light (front left, high), which then
// lights the gauge's scale and the sidewall; back round toward the camera for the hero
const YAW = -1.45;
const YAW_END = -0.6;
// The probe goes in on the tread's front shoulder, BETA forward of the top: the two rim
// lights behind the tire put a gray sheen on any rubber that faces up, and miss this.
const BETA = 0.5;

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
const K_GAP = Math.round((Math.PI * R0 - gapMiddle(0)) / PITCH);
const THETA = gapMiddle(K_GAP) / R0; // the gap the probe goes into, around the tire (tireModel's angles)
const ROLL = THETA - Math.PI + BETA; // rolls it up to BETA short of the top, toward the front
const THETA_TOP = Math.PI + ROLL; // what is then the top of the tire
const GAP_HALF = (lugEdges(V, K_GAP + 1)[0] - lugEdges(V, K_GAP)[1]) / 2;

// heights in the site frame (0 is the lug tops at the probe's spot)
const R_TOP = treadRadius(KIND, true, V);
const DEPTH_AT = R_TOP - (treadRadius(KIND, false, V) - DEPTH[KIND] - 0.0004); // down to the groove floor (the casing sits 0.4 mm in)
// the foot is straight and the tread is round: it rests on the lugs' chamfered edges either
// side of the gap, a fraction of a millimeter below the curve's top
const FOOT_Y = -((GAP_HALF + 0.0022) ** 2) / (2 * R_TOP);

// ---------------------------------------------------------------- the gauge, in mm-ish meters
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
// Written on the outboard sidewall, round the top of the tire as it stands rolled: "12/32" at r about 0.425, "OK" under it. Positions are worked out on the face as
// if it were flat (x right, y up, from a point R_FACE out at the top), then bent onto it.
const R_FACE = 0.4;
const DECAL = { r0: 0.343, r1: 0.462, th0: THETA_TOP - 0.3, len: 0.6 };
const W0 = 0.56, W1 = 0.84; // u window of the writing

// fully metallic parts reflect the black studio and vanish against rubber; part-metal
// steel takes the key light as well, so small tools read
const steel = (color: number, roughness: number, metalness = 0.5) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
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
  const bright = steel(0xc4c8cc, 0.24, 0.72);
  const footShape = new THREE.Shape([
    [-FOOT.l / 2, 0], [FOOT.l / 2, 0], [FOOT.l / 2, FOOT.h * 0.55], [FOOT.l / 2 - 0.003, FOOT.h], [-FOOT.l / 2 + 0.003, FOOT.h], [-FOOT.l / 2, FOOT.h * 0.55],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  const footGeo = new THREE.ExtrudeGeometry(footShape, {
    depth: FOOT.w, bevelEnabled: true, bevelThickness: 0.0005, bevelSize: 0.0005, bevelOffset: -0.0005, bevelSegments: 2, curveSegments: 1,
  }).translate(0, 0, -FOOT.w / 2).rotateY(Math.PI / 2);
  const foot = new THREE.Mesh(footGeo, steel(0xb4b8bc, 0.3, 0.7));
  // the barrel: smooth collars at either end, knurled between
  const lathe = (pts: Pt[], mat: THREE.Material) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 40), mat);
  const K0 = FOOT.h + 0.013, K1 = LIP - 0.011;
  const lower = lathe([[0, FOOT.h], [0.0042, FOOT.h], [0.0042, FOOT.h + 0.0025], [0.0062, FOOT.h + 0.004], [0.0062, K0 - 0.0006], [BARREL_R, K0]], bright);
  const knurl = new THREE.Mesh(
    new THREE.CylinderGeometry(BARREL_R, BARREL_R, K1 - K0, 48, 1, true).translate(0, (K0 + K1) / 2, 0),
    Object.assign(steel(0xa9adb2, 0.42, 0.66), { bumpMap: knurlTexture(), bumpScale: 2.2 }),
  );
  const upper = lathe([[BARREL_R, K1], [0.0062, K1 + 0.0006], [0.0062, LIP - 0.0013], [0.005, LIP], [0, LIP]], bright);
  // a pocket clip down the side, seen in profile
  const clipMat = steel(0xc4c8cc, 0.22, 0.72);
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.0028, 0.034, 0.0007).translate(0, LIP - 0.006 - 0.017, BARREL_R + 0.0014), clipMat);
  const clipFoot = new THREE.Mesh(new THREE.BoxGeometry(0.0028, 0.004, 0.0016).translate(0, LIP - 0.005, BARREL_R + 0.0006), clipMat);
  const clipTip = new THREE.Mesh(new THREE.SphereGeometry(0.0016, 12, 8).scale(1, 1.4, 0.6).translate(0, LIP - 0.04, BARREL_R + 0.0012), clipMat);
  gauge.add(foot, lower, knurl, upper, clip, clipFoot, clipTip);

  // the slider: the probe and the scale bar in one piece, origin at the probe's tip
  const slider = new THREE.Group();
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(PIN_R, PIN_R, S0 + 0.002, 16).translate(0, (S0 + 0.002) / 2 + 0.0004, 0), steel(0xd5d8db, 0.2, 0.7));
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
  // a stubby hexagonal yellow tire crayon, half an inch thick, its writing end worn round
  // and blunt; tip at the origin, along +y
  const crayon = new THREE.Group();
  crayon.name = "used-crayon";
  const HEX = 0.0074;
  const wax = plastic(0xf2c230, 0.5);
  const worn = new THREE.Mesh(new THREE.LatheGeometry(
    [[0, 0], [HEX * 0.42, 0.0004], [HEX * 0.72, 0.0016], [HEX * 0.92, 0.0036], [HEX, 0.0058]].map(([r, y]) => new THREE.Vector2(r, y)), 6,
  ), plastic(0xf4d260, 0.62));
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(HEX, HEX, 0.084, 6).translate(0, 0.0058 + 0.042, 0), wax);
  // a paper band round the back half, plain, with a dark stripe
  const band = new THREE.Mesh(new THREE.CylinderGeometry(HEX * 1.04, HEX * 1.04, 0.044, 6).translate(0, 0.07, 0), plastic(0x1d1d1f, 0.7));
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(HEX * 1.05, HEX * 1.05, 0.004, 6).translate(0, 0.056, 0), plastic(0xe9e3d0, 0.7));
  crayon.add(worn, stick, band, stripe);
  tire.spin.add(crayon);

  for (const o of [gauge, crayon]) {
    o.traverse((m) => {
      if ((m as THREE.Mesh).isMesh) m.castShadow = m.receiveShadow = true;
    });
  }

  // ---------------------------------------------------------------- the marks
  const rand = rng(1207);
  const strokes = [...handwrite("12/32", 0.034, -0.004, 0.025, rand), ...handwrite("OK", 0.027, 0.014, -0.031, rand)];
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
    for (const d of downs) if (T <= d.t1) {
      if (T >= d.t0) return { p: along(d, (T - d.t0) / (d.t1 - d.t0)), up: 0 };
      const m = ups.find((e) => e.t1 <= d.t0 + 1e-9 && e.t1 >= d.t0 - 1e-9)!;
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
  const WIDTH = 0.0034 * pxPerM; // the crayon's line, about 3.4 mm
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
  cc.strokeStyle = "#f4dc6e";
  const wr = rng(77);
  for (const s of pathPx) {
    for (let pass = 0; pass < 12; pass++) {
      const ox = (wr() - 0.5) * WIDTH * 0.26, oy = (wr() - 0.5) * WIDTH * 0.26;
      cc.globalAlpha = 0.22 + wr() * 0.1;
      cc.lineWidth = WIDTH * (0.5 + wr() * 0.5);
      cc.beginPath();
      s.forEach(([x, y], i) => (i ? cc.lineTo(x + ox, y + oy) : cc.moveTo(x + ox, y + oy)));
      cc.stroke();
    }
  }
  cc.globalCompositeOperation = "destination-out";
  for (const s of pathPx) {
    for (let k = 0; k < 9; k++) {
      const off = (wr() - 0.5) * WIDTH * 0.95;
      cc.globalAlpha = 0.1 + wr() * 0.22;
      cc.lineWidth = 0.8 + wr() * 1.4;
      cc.setLineDash([2 + wr() * 9, 2 + wr() * 7]);
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
  for (let i = 0; i < W * H * 0.02; i++) {
    cc.globalAlpha = 0.3 + wr() * 0.6;
    cc.fillRect(wr() * W, wr() * H, 1 + wr() * 1.5, 1 + wr() * 1.5);
  }
  await ctx.nextTask();

  // when each bit of the marks goes on, 0 to 1 as gray (white: never), for the reveal.
  // Drawn latest first, wider than the color, so a pixel keeps the time the crayon first got there.
  const [timeCv, tc] = mkCanvas();
  tc.fillStyle = "#fff";
  tc.fillRect(0, 0, W, H);
  tc.lineCap = "round";
  tc.lineWidth = WIDTH * 1.7;
  for (let si = downs.length - 1; si >= 0; si--) {
    const d = downs[si], s = pathPx[si];
    for (let j = s.length - 1; j > 0; j--) {
      // the time the crayon reaches this point: invert the pace by search along the samples
      const g = Math.round(250 * (d.t0 + (d.t1 - d.t0) * timeAtLength(d, j)));
      tc.strokeStyle = `rgb(${g},${g},${g})`;
      tc.beginPath();
      tc.moveTo(s[j - 1][0], s[j - 1][1]);
      tc.lineTo(s[j][0], s[j][1]);
      tc.stroke();
    }
  }
  /** The fraction of a stroke's time at which the crayon passes its j-th point. */
  function timeAtLength(d: Down, j: number) {
    const target = d.cum[j] / d.cum[d.cum.length - 1];
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (pace(mid) < target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
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
    map: colorTex, transparent: true, premultipliedAlpha: true, depthWrite: false, roughness: 0.78, metalness: 0,
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
  const twist = new THREE.Quaternion().setFromAxisAngle(Y, 0.4);
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
    D.copy(N).multiplyScalar(0.55).addScaledVector(R, 0.42).addScaledVector(Up, -0.72).normalize();
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
    gauge.position.set(0, h + lift * 0.24, 0.05 * (1 - come) - lift * 0.06);
    gauge.rotation.set(-0.35 * (1 - come) - lift * 0.4, 0, 0.18 * (1 - come));

    // crayon: comes in to the start of the first stroke, writes, lifts away
    const T = THREE.MathUtils.clamp((u - W0) / (W1 - W0), 0, 1);
    reveal.value = T;
    marks.visible = T > 0;
    crayon.visible = u > 0.5 && u < 0.9;
    if (crayon.visible) {
      const { p: at, up } = penAt(T);
      const inn = ramp(u, 0.5, W0), out = ramp(u, W1, 0.9);
      placeCrayon(at, 0.005 * up + 0.012 * (1 - inn) + 0.01 * out, 0.12 * (1 - inn) + 0.14 * out);
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
  // and a level frame at the site, for camera offsets: x outboard, y up, z toward the front
  const out = new THREE.Vector3().setFromMatrixColumn(siteMatrix, 0).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const front = new THREE.Vector3().crossVectors(up, out);
  const near = (p: Vec3, x: number, y: number, z: number): Vec3 => {
    const v = new THREE.Vector3(...p).addScaledVector(out, x).addScaledVector(up, y).addScaledVector(front, z);
    return [v.x, v.y, v.z];
  };
  const O = w(0, 0, 0);
  const READ = w(0, LIP + 0.007, 0); // the scale, just above the barrel's lip
  const MID = w(0, 0.03, 0); // halfway up the gauge, between the probe and the bar

  // a key part way along the straight line between two others: either side of a hold, so
  // the path through the hold doesn't swing out toward the shots before and after it
  const guard = (t: number, a: CameraKey, b: CameraKey, k: number): CameraKey => ({
    t, cam: lerp3(a.cam, b.cam, k), tgt: lerp3(a.tgt, b.tgt, k), fov: a.fov + (b.fov - a.fov) * k, frame: a.frame, ease: "pass",
  });
  const press: CameraKey = { t: 0.34, cam: near(MID, 0.21, -0.012, 0.03), tgt: near(MID, 0, 0.004, 0), fov: 30, frame: FRAMES.close };
  const read0: CameraKey = { t: 0.395, cam: near(READ, 0.088, 0.004, 0.016), tgt: READ, fov: 30, frame: FRAMES.close };
  const read1: CameraKey = { t: 0.45, cam: near(READ, 0.082, 0.004, 0.015), tgt: READ, fov: 30, frame: FRAMES.close };
  const side0: CameraKey = { t: 0.56, cam: f(0.015, 0.035, 0.42), tgt: f(0.005, 0, 0), fov: 30, frame: FRAMES.close };

  const keys: CameraKey[] = [
    // the worn tread on the tire's front shoulder, from the outboard side and above
    { t: 0, cam: near(O, 0.85, 0.3, 0.42), tgt: near(O, 0, -0.1, -0.04), fov: 30, frame: FRAMES.right },
    // down level with the lugs, looking into the open shoulder slots
    { t: 0.15, cam: near(MID, 0.3, -0.035, 0.035), tgt: near(MID, 0, -0.012, 0), fov: 30, frame: FRAMES.close },
    { t: 0.27, cam: near(MID, 0.27, -0.03, 0.035), tgt: near(MID, 0, -0.01, 0), fov: 30, frame: FRAMES.close, ease: "pass" },
    press,
    // in on the scale, 12 at the lip
    guard(0.37, press, read0, 0.7),
    read0,
    read1,
    guard(0.48, read1, side0, 0.25),
    // down to the sidewall for the crayon
    side0,
    { t: 0.84, cam: f(0.04, 0.015, 0.4), tgt: f(0.012, -0.005, 0), fov: 30, frame: FRAMES.close },
    // back to a three-quarter view of the tire, the marks at the top of its face
    { t: 1, cam: [X + 0.25, 1.15, 2.45], tgt: [X - 0.02, 0.55, 0], fov: 30, frame: FRAMES.right },
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
