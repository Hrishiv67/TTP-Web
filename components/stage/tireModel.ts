/**
 * Procedural 295/75R22.5 truck tire on a 10-hole 22.5 x 8.25 aluminum wheel.
 * Units are meters. The tire's axle is its local Y axis; +Y is the outboard face.
 * Everything is generated in the browser, so there are no model files to download.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type TireKind = "steer" | "drive" | "trailer";

export const DIM = {
  RO: 0.515, // outer radius (1.03 m overall diameter)
  A: 0.098, // half width of the flat part of the crown
  RHO: 0.04, // shoulder radius
};

// new tread depth by position, meters
const DEPTH: Record<TireKind, number> = { steer: 0.014, drive: 0.022, trailer: 0.01 };

type Soup = number[];
type Poly = [number, number][];

// ------------------------------------------------------------------ crown
// The tread surface is parameterised by v, the arc length across the crown
// including the rounded shoulders. Writes base radius, axial position and the
// outward normal (radial, axial) into `out`, to keep allocation out of hot loops.
const crownOut = { r: 0, y: 0, nr: 1, ny: 0 };
function crown(v: number, R0: number, out = crownOut) {
  const { A, RHO } = DIM;
  const av = Math.abs(v);
  const s = v < 0 ? -1 : 1;
  if (av <= A) {
    const t = av / A;
    out.r = R0 + 0.004 * (1 - t * t);
    out.y = v;
    out.nr = 1;
    out.ny = 0;
    return out;
  }
  const phi = (av - A) / RHO;
  out.r = R0 - RHO + RHO * Math.cos(phi);
  out.y = s * (A + RHO * Math.sin(phi));
  out.nr = Math.cos(phi);
  out.ny = s * Math.sin(phi);
  return out;
}

// ------------------------------------------------------------------ flat tread space
// Tread parts are modelled flat, in (u, v, h): u along the circumference at the
// groove floor radius R0, v across the crown, h up from the groove floor. They are
// built as triangle soup, then wrapped onto the tire. Each face's flat normal is
// carried through the local surface frame, so block tops shade as one smooth
// surface whatever the triangulation, and the walls stay crisp.
function wrap(soup: Soup, R0: number, depth: number) {
  const n = soup.length / 3;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  let k = 0;
  for (let t = 0; t < n; t += 3) {
    const o = t * 3;
    const ax0 = soup[o + 3] - soup[o], ay0 = soup[o + 4] - soup[o + 1], az0 = soup[o + 5] - soup[o + 2];
    const bx0 = soup[o + 6] - soup[o], by0 = soup[o + 7] - soup[o + 1], bz0 = soup[o + 8] - soup[o + 2];
    let fx = ay0 * bz0 - az0 * by0, fy = az0 * bx0 - ax0 * bz0, fz = ax0 * by0 - ay0 * bx0;
    const len = Math.hypot(fx, fy, fz);
    if (len < 1e-14) continue; // degenerate
    fx /= len; fy /= len; fz /= len;
    if (fz < -0.9) continue; // underside, never seen
    for (let j = 0; j < 3; j++) {
      const u = soup[o + j * 3], v = soup[o + j * 3 + 1], h = soup[o + j * 3 + 2];
      const c = crown(v, R0);
      const th = u / R0, s = Math.sin(th), co = Math.cos(th);
      const rad = c.r + h * c.nr;
      pos[k] = rad * s;
      pos[k + 1] = c.y + h * c.ny;
      pos[k + 2] = rad * co;
      // frame: Tu = (cos, 0, -sin); N = nr*radial + ny*axial; Tv = -ny*radial + nr*axial
      const radial = fz * c.nr - fy * c.ny;
      nor[k] = fx * co + radial * s;
      nor[k + 1] = fz * c.ny + fy * c.nr;
      nor[k + 2] = -fx * s + radial * co;
      // fake ambient occlusion toward the groove floor
      const a = 0.42 + 0.58 * Math.pow(Math.min(1, Math.max(0, h / depth)), 0.65);
      col[k] = col[k + 1] = col[k + 2] = a;
      // texture space for the rubber grain: one tile per 20 cm
      uv[(k / 3) * 2] = u * 5;
      uv[(k / 3) * 2 + 1] = (v + h) * 5;
      k += 3;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos.slice(0, k), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor.slice(0, k), 3));
  g.setAttribute("color", new THREE.BufferAttribute(col.slice(0, k), 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv.slice(0, (k / 3) * 2), 2));
  return g;
}

// split triangles whose edges are longer than maxLen so wrapping follows the curvature
function subdivide(arr: Soup, maxLen: number): Soup {
  let p = arr;
  const d = (i: number, j: number) => Math.hypot(p[i] - p[j], p[i + 1] - p[j + 1], p[i + 2] - p[j + 2]);
  for (let pass = 0; pass < 6; pass++) {
    const out: Soup = [];
    let changed = false;
    for (let i = 0; i < p.length; i += 9) {
      const a = i, b = i + 3, c = i + 6;
      const ab = d(a, b), bc = d(b, c), ca = d(c, a);
      const mx = Math.max(ab, bc, ca);
      const put = (...idx: number[]) => { for (const q of idx) out.push(p[q], p[q + 1], p[q + 2]); };
      const mid = (m: number, q: number) => [(p[m] + p[q]) / 2, (p[m + 1] + p[q + 1]) / 2, (p[m + 2] + p[q + 2]) / 2];
      if (mx <= maxLen) { put(a, b, c); continue; }
      changed = true;
      if (mx === ab) { const m = mid(a, b); put(a); out.push(...m); put(c); out.push(...m); put(b, c); }
      else if (mx === bc) { const m = mid(b, c); put(a, b); out.push(...m); put(a); out.push(...m); put(c); }
      else { const m = mid(c, a); put(a, b); out.push(...m, ...m); put(b, c); }
    }
    p = out;
    if (!changed) break;
  }
  return p;
}

// A lug or block: flat polygon extruded to `depth` with a chamfered top edge.
// Every block in a pattern has the same outline, so one is built and repeated
// `count` times around the tire, `pitch` apart.
function block(poly: Poly, depth: number, soup: Soup, ch = 0.0018, count = 1, pitch = 0) {
  const shape = new THREE.Shape(poly.map(([u, v]) => new THREE.Vector2(u, v)));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(depth - ch, 0.001),
    bevelEnabled: true,
    bevelThickness: ch,
    bevelSize: ch,
    bevelOffset: -ch, // keep the footprint, chamfer inward
    bevelSegments: 2,
    curveSegments: 1,
  });
  // ExtrudeGeometry bevels both ends; flatten the bottom bevel onto the groove floor
  const p = (g.index ? g.toNonIndexed() : g).attributes.position.array;
  g.dispose();
  const arr = Array.from(p, (x, i) => (i % 3 === 2 ? Math.max(0, x) : x));
  const one = subdivide(arr, 0.01);
  for (let k = 0; k < count; k++) {
    const du = k * pitch;
    for (let i = 0; i < one.length; i += 3) soup.push(one[i] + du, one[i + 1], one[i + 2]);
  }
}

// A rib running all the way around, with edges vl(u) and vr(u) (zig-zag allowed).
function rib(vl: (u: number) => number, vr: (u: number) => number, depth: number, C: number, segs: number, soup: Soup, ch = 0.0016) {
  // profile across the rib, left to right: [edge, dv, h]
  const prof: ["L" | "R", number, number][] = [
    ["L", 0, 0], ["L", 0, depth - ch], ["L", ch, depth], ["R", -ch, depth], ["R", 0, depth - ch], ["R", 0, 0],
  ];
  const at = (i: number, k: number) => {
    const u = (i / segs) * C;
    const [e, dv, h] = prof[k];
    return [u, (e === "L" ? vl(u) : vr(u)) + dv, h];
  };
  for (let i = 0; i < segs; i++) {
    for (let k = 0; k < prof.length - 1; k++) {
      const a = at(i, k), b = at(i + 1, k), c = at(i + 1, k + 1), d = at(i, k + 1);
      soup.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]);
    }
  }
}

const zig = (period: number, amp: number) => (u: number) => {
  const t = (((u / period) % 1) + 1) % 1;
  return amp * (t < 0.5 ? t * 4 - 1 : 3 - t * 4);
};

// ------------------------------------------------------------------ tread patterns
function treadGeometry(kind: TireKind, wear = 1) {
  // a worn tire keeps its casing (R0) and loses tread height
  const R0 = DIM.RO - DEPTH[kind];
  const depth = DEPTH[kind] * wear;
  const C = 2 * Math.PI * R0;
  const soup: Soup = [];
  const { A, RHO } = DIM;
  const vEdge = A + RHO * 0.95; // how far the tread wraps onto the shoulder

  if (kind === "steer") {
    // four zig-zag grooves, three ribs between them, notched shoulder ribs
    const gw = 0.011;
    const z = zig(C / 64, 0.0032);
    const grooves = [-0.066, -0.026, 0.026, 0.066];
    for (let k = 0; k < 3; k++) {
      const g0 = grooves[k], g1 = grooves[k + 1];
      rib((u) => g0 + gw / 2 + z(u), (u) => g1 - gw / 2 + z(u), depth, C, 64 * 8, soup);
    }
    // the zig-zag repeats once per shoulder block, so every block has the same outline
    const P = 64, pitch = C / P, slot = 0.004;
    const u1 = pitch - slot, um = pitch / 2;
    const inL = grooves[0] - gw / 2, inR = grooves[3] + gw / 2;
    block([[0, -vEdge], [u1, -vEdge], [u1, inL + z(u1)], [um, inL + z(um)], [0, inL + z(0)]], depth, soup, undefined, P, pitch);
    block([[0, inR + z(0)], [um, inR + z(um)], [u1, inR + z(u1)], [u1, vEdge], [0, vEdge]], depth, soup, undefined, P, pitch);
  }

  if (kind === "drive") {
    // open-shoulder lugs, staggered half a pitch side to side
    const P = 42, pitch = C / P;
    const lugLen = pitch * 0.62;
    const slant = 0.022;
    const vOut = A + RHO * 1.02;
    const vIn = 0.006;
    for (const side of [-1, 1]) {
      const u0 = side > 0 ? pitch / 2 : 0;
      const o = side * vOut, n = side * vIn;
      const poly: Poly = [[u0, o], [u0 + lugLen, o], [u0 + lugLen * 0.86 + slant, n], [u0 + slant + lugLen * 0.18, n]];
      if (side > 0) poly.reverse();
      block(poly, depth, soup, 0.0022, P, pitch);
    }
  }

  if (kind === "trailer") {
    // four straight ribs, shoulder ribs cut by fine sipes
    const gw = 0.0075;
    const grooves = [-0.07, -0.035, 0, 0.035, 0.07];
    for (let k = 0; k < 4; k++) {
      const g0 = grooves[k], g1 = grooves[k + 1];
      rib(() => g0 + gw / 2, () => g1 - gw / 2, depth, C, 720, soup);
    }
    const P = 90, pitch = C / P, u1 = pitch - 0.0022;
    block([[0, -vEdge], [u1, -vEdge], [u1, grooves[0] - gw / 2], [0, grooves[0] - gw / 2]], depth, soup, 0.0012, P, pitch);
    block([[0, grooves[4] + gw / 2], [u1, grooves[4] + gw / 2], [u1, vEdge], [0, vEdge]], depth, soup, 0.0012, P, pitch);
  }

  return wrap(soup, R0, depth);
}

// ------------------------------------------------------------------ carcass
// Lathe around Y with UVs: u = angle / 2pi, v = arc length along the profile, 0 to 1.
// `flip` reverses the winding so the faces point the other way.
function lathe(points: THREE.Vector2[], segs: number, flip = false) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const lens = [0];
  for (let j = 1; j < points.length; j++) lens.push(lens[j - 1] + points[j].distanceTo(points[j - 1]));
  const total = lens[lens.length - 1];
  for (let i = 0; i <= segs; i++) {
    const th = (i / segs) * Math.PI * 2;
    const s = Math.sin(th), c = Math.cos(th);
    for (let j = 0; j < points.length; j++) {
      pos.push(points[j].x * s, points[j].y, points[j].x * c);
      uv.push(i / segs, lens[j] / total);
    }
  }
  const n = points.length;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j, b = a + n, c = a + 1, d = b + 1;
      if (flip) idx.push(a, c, b, c, d, b);
      else idx.push(a, b, c, c, b, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, length: total };
}

// sidewall profile from the end of the shoulder down to the bead, on the +y or -y side
function sidewallCurve(R0: number, sign: number) {
  const { A, RHO } = DIM;
  const phiMax = 1.25;
  const rs = R0 - RHO + RHO * Math.cos(phiMax);
  const ys = A + RHO * Math.sin(phiMax);
  const pts = [
    [rs, ys], [0.452, 0.1452], [0.41, 0.1475], [0.368, 0.1448], [0.335, 0.1365], [0.313, 0.1235], [0.302, 0.111], [0.298, 0.104],
  ].map(([r, y]) => new THREE.Vector3(r, sign * y, 0));
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  return curve.getPoints(48).map((p) => new THREE.Vector2(p.x, p.y));
}

function carcass(kind: TireKind) {
  const R0 = DIM.RO - DEPTH[kind];
  const { A, RHO } = DIM;
  // crown and shoulders, under the tread; the profile runs -y to +y after the flip
  const crownPts: THREE.Vector2[] = [];
  const vMax = A + RHO * 1.25;
  for (let i = 0; i <= 80; i++) {
    const c = crown(vMax - (i / 80) * 2 * vMax, R0);
    crownPts.push(new THREE.Vector2(c.r - 0.0004, c.y));
  }
  const crownMesh = lathe(crownPts, 256, true);
  // outboard sidewall: profile from the bead up to the shoulder, so texture v grows outward
  const outPts = sidewallCurve(R0, 1).reverse();
  const outer = lathe(outPts, 360, true);
  const inner = lathe(sidewallCurve(R0, -1), 256, true);
  return { crown: crownMesh.geo, outer: outer.geo, outerLength: outer.length, inner: inner.geo, outPts };
}

// ------------------------------------------------------------------ sidewall lettering (bump map)
let stipple: HTMLCanvasElement | undefined;
function stippleTile() {
  if (stipple) return stipple;
  stipple = document.createElement("canvas");
  stipple.width = stipple.height = 128;
  const ctx = stipple.getContext("2d")!;
  const img = ctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.random() * 5;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return stipple;
}

function sidewallTexture(outPts: THREE.Vector2[], length: number, kind: TireKind, font: string, maxSize: number, brand = false) {
  const W = Math.min(4096, maxSize), H = W / 4;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  // faint molded stipple so the sidewall isn't perfectly smooth
  ctx.fillStyle = ctx.createPattern(stippleTile(), "repeat")!;
  ctx.fillRect(0, 0, W, H);
  // arc length along the profile at a given radius
  const lens = [0];
  for (let j = 1; j < outPts.length; j++) lens.push(lens[j - 1] + outPts[j].distanceTo(outPts[j - 1]));
  const sAt = (r: number) => {
    for (let j = 1; j < outPts.length; j++) {
      const a = outPts[j - 1], b = outPts[j];
      if ((r - a.x) * (r - b.x) <= 0) return lens[j - 1] + ((r - a.x) / (b.x - a.x || 1)) * (lens[j] - lens[j - 1]);
    }
    return r < outPts[0].x ? 0 : length;
  };
  const yPx = (r: number) => (sAt(r) / length) * H;
  const px = W / 4096; // line widths were tuned at 4096
  // concentric molded rings
  ctx.strokeStyle = "#fff";
  ctx.globalAlpha = 0.9;
  for (const [r, w] of [[0.322, 3], [0.336, 2], [0.47, 2], [0.477, 1]]) {
    ctx.lineWidth = w * px;
    ctx.beginPath();
    ctx.moveTo(0, yPx(r));
    ctx.lineTo(W, yPx(r));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // fine radial serrations near the shoulder
  ctx.lineWidth = 2 * px;
  for (let x = 0; x < W; x += 9 * px) {
    ctx.beginPath();
    ctx.moveTo(x, yPx(0.482));
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  // lettering, stretched so it comes out undistorted at its radius
  const label = (text: string, rText: number, uCenter: number, sizeM: number, weight = 800) => {
    const mPerPxX = (2 * Math.PI * rText) / W;
    const mPerPxY = length / H; // close enough: the profile is nearly radial here
    ctx.save();
    ctx.translate(uCenter * W, yPx(rText));
    ctx.scale(mPerPxY / mPerPxX, 1);
    // texture v grows outward and u runs counter-clockwise, so glyphs go in rotated 180°
    ctx.scale(-1, -1);
    ctx.font = `${weight} ${sizeM / mPerPxY}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };
  for (const off of [0, 0.5]) {
    const u = 0.25 + off;
    label("295/75R22.5", 0.405, u % 1, 0.034);
    label(brand ? "LOAD RANGE H" : "LOAD RANGE G", 0.37, (u + 0.115) % 1, 0.014, 700);
    label("TUBELESS", 0.37, (u - 0.11 + 1) % 1, 0.014, 700);
    label("STEEL BELTED RADIAL", 0.44, u % 1, 0.013, 700);
    label(kind === "drive" ? "M+S" : "REGROOVABLE", 0.44, (u + 0.16) % 1, 0.012, 700);
    label("DOT  TT4R  2026", 0.355, (u + 0.28) % 1, 0.011, 700);
  }
  // the shop's own brand, between the size markings, upright at the top when the tire hasn't rolled
  if (brand) {
    for (const u of [0, 0.5]) {
      label("TTP TIRE", 0.408, u, 0.052, 900);
      label("18 PLY RATING", 0.358, u, 0.014, 700);
      label("MADE IN MALAYSIA", 0.448, u, 0.012, 700);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.flipY = false; // canvas row y maps to v = y / H, matching yPx()
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// tire-crayon marks on a used tire's sidewall: the tread depth a tech wrote on it after
// inspecting it. A color map laid out like the bump map (same profile coordinates).
function sidewallCrayon(outPts: THREE.Vector2[], length: number, font: string, maxSize: number) {
  const W = Math.min(4096, maxSize), H = W / 4;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#121212"; // the sidewall's own rubber color, so only the marks show
  ctx.fillRect(0, 0, W, H);
  const lens = [0];
  for (let j = 1; j < outPts.length; j++) lens.push(lens[j - 1] + outPts[j].distanceTo(outPts[j - 1]));
  const sAt = (r: number) => {
    for (let j = 1; j < outPts.length; j++) {
      const a = outPts[j - 1], b = outPts[j];
      if ((r - a.x) * (r - b.x) <= 0) return lens[j - 1] + ((r - a.x) / (b.x - a.x || 1)) * (lens[j] - lens[j - 1]);
    }
    return r < outPts[0].x ? 0 : length;
  };
  const mark = (text: string, r: number, u: number, sizeM: number, tilt: number) => {
    const mx = (2 * Math.PI * r) / W, my = length / H;
    ctx.save();
    ctx.translate(u * W, (sAt(r) / length) * H);
    ctx.scale(my / mx, 1);
    ctx.scale(-1, -1);
    ctx.rotate(tilt);
    ctx.font = `italic 700 ${sizeM / my}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // several faint, slightly offset passes read as waxy crayon rather than print
    ctx.fillStyle = "#efe6c4";
    for (let i = 0; i < 7; i++) {
      ctx.globalAlpha = 0.32;
      ctx.fillText(text, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    }
    ctx.restore();
  };
  mark("12/32", 0.425, 0.43, 0.036, -0.08);
  mark("OK", 0.37, 0.47, 0.026, 0.05);
  // gaps where the crayon skipped over the rubber's texture
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "#121212";
  for (let i = 0; i < W * 3; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping;
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// a repair plug in the tread, frayed where it was trimmed, with the tech's crayon circle round it
function plugParts(R: number, theta: number, v: number) {
  const radial = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta));
  const align = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), radial);
  const at = (r: number) => radial.clone().multiplyScalar(r).add(new THREE.Vector3(0, v, 0));
  const plug = new THREE.CylinderGeometry(0.0034, 0.0036, 0.016, 16, 1).applyQuaternion(align).translate(...at(R - 0.004).toArray());
  const tips: THREE.BufferGeometry[] = [plug];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const tip = new THREE.ConeGeometry(0.0011, 0.006, 5)
      .rotateX(0.5 + Math.random() * 0.4)
      .rotateY(a)
      .translate(Math.cos(a) * 0.0018, 0.0035, Math.sin(a) * 0.0018)
      .applyQuaternion(align)
      .translate(...at(R + 0.002).toArray());
    tips.push(tip);
  }
  const ring = new THREE.TorusGeometry(0.021, 0.0012, 6, 48)
    .rotateX(Math.PI / 2) // into the tangent plane at the top of the tire
    .applyQuaternion(align)
    .translate(...at(R + 0.0006).toArray());
  return { plug: mergeGeometries(tips.map((g) => (g.index ? g.toNonIndexed() : g)))!, ring };
}

// clip-on balance weights on the outboard rim flange, truck sized (about 7 and 5 cm long)
function weightParts(theta: number) {
  const parts: THREE.BufferGeometry[] = [];
  for (const [dt, len] of [[0, 0.07], [0.24, 0.05]] as const) {
    const a = theta + dt;
    const body = new THREE.BoxGeometry(len, 0.015, 0.011);
    const clip = new THREE.BoxGeometry(0.013, 0.005, 0.017).translate(0, 0.011, -0.005);
    for (const g of [body, clip]) {
      // local x along the rim, y outward, z along the axle; then place on the flange
      g.rotateX(-Math.PI / 2);
      g.rotateY(a + Math.PI / 2);
      g.translate(0.288 * Math.sin(a), 0.122, 0.288 * Math.cos(a));
      parts.push(g.toNonIndexed());
    }
  }
  return mergeGeometries(parts)!;
}

// ------------------------------------------------------------------ wheel
function wheelGeometry() {
  // rim barrel
  const prof = [
    [0.301, 0.112], [0.297, 0.116], [0.29, 0.111], [0.287, 0.1], [0.286, 0.085], [0.27, 0.074], [0.262, 0.06],
    [0.258, 0.0], [0.258, -0.06], [0.268, -0.075], [0.286, -0.088], [0.287, -0.1], [0.29, -0.111], [0.297, -0.116], [0.301, -0.112],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const barrel = lathe(prof, 180).geo;
  barrel.deleteAttribute("uv");

  // outboard disc with ten hand holes and the center bore
  const disc = new THREE.Shape();
  disc.absarc(0, 0, 0.262, 0, Math.PI * 2, false);
  for (let k = 0; k < 10; k++) {
    const a0 = (k / 10) * Math.PI * 2 + Math.PI / 10;
    const half = 0.17, r1 = 0.158, r2 = 0.222, steps = 10;
    const hole = new THREE.Path();
    for (let i = 0; i <= steps; i++) {
      const a = a0 - half + (i / steps) * 2 * half;
      if (i === 0) hole.moveTo(r2 * Math.cos(a), r2 * Math.sin(a));
      else hole.lineTo(r2 * Math.cos(a), r2 * Math.sin(a));
    }
    for (let i = 0; i <= steps; i++) {
      const a = a0 + half * 0.82 - (i / steps) * 2 * half * 0.82;
      hole.lineTo(r1 * Math.cos(a), r1 * Math.sin(a));
    }
    hole.closePath();
    disc.holes.push(hole);
  }
  const bore = new THREE.Path();
  bore.absarc(0, 0, 0.11, 0, Math.PI * 2, true);
  disc.holes.push(bore);
  const discGeo = new THREE.ExtrudeGeometry(disc, {
    depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3, curveSegments: 64,
  });
  discGeo.rotateX(-Math.PI / 2); // extrusion axis to +Y
  discGeo.translate(0, 0.058, 0);
  discGeo.deleteAttribute("uv");

  // hub pilot and cap
  const hubProf = [[0.11, 0.06], [0.112, 0.07], [0.108, 0.076], [0.085, 0.082], [0.06, 0.098], [0.058, 0.104], [0.0, 0.106]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const hub = lathe(hubProf, 96).geo;
  hub.deleteAttribute("uv");

  // hex nuts and stud ends on the 285.75 mm bolt circle, between the hand holes
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const x = 0.142875 * Math.cos(a), z = 0.142875 * Math.sin(a);
    const nut = new THREE.CylinderGeometry(0.0165, 0.0175, 0.026, 6, 1).translate(x, 0.083, z);
    const stud = new THREE.CylinderGeometry(0.0095, 0.0095, 0.022, 20, 1).translate(x, 0.1, z);
    parts.push(nut.toNonIndexed(), stud.toNonIndexed());
    nut.dispose();
    stud.dispose();
  }
  for (const g of parts) g.deleteAttribute("uv");
  const studs = mergeGeometries(parts)!;
  return { barrel, disc: discGeo, hub, studs };
}

// ------------------------------------------------------------------ materials
// soft value noise: random light and dark dots, tiled
function grainTexture(size = 512) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size * 0.06; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = 0.6 + Math.random() * 1.6;
    const l = Math.random() < 0.5 ? 40 : 215;
    ctx.fillStyle = `rgba(${l},${l},${l},0.25)`;
    for (const [dx, dy] of [[0, 0], [size, 0], [0, size], [-size, 0], [0, -size]]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

let grain: THREE.Texture | undefined;

export type TireMaterials = ReturnType<typeof makeMaterials>;

export function makeMaterials() {
  grain ??= grainTexture();
  const rubber = { color: 0x101010, roughness: 0.88, metalness: 0, envMapIntensity: 0.28 };
  return {
    rubber: new THREE.MeshStandardMaterial({ ...rubber }),
    groove: new THREE.MeshStandardMaterial({ ...rubber, color: 0x0c0c0c, roughness: 0.9 }),
    treadRubber: new THREE.MeshStandardMaterial({ ...rubber, color: 0x0e0e0e, vertexColors: true, roughness: 0.92, bumpMap: grain, bumpScale: 0.12 }),
    sidewall: (bump: THREE.Texture, map?: THREE.Texture) =>
      new THREE.MeshStandardMaterial({ ...rubber, color: map ? 0xffffff : 0x121212, map, roughness: 0.62, bumpMap: bump, bumpScale: 6 }),
    // worn tread: drier, scuffed rubber
    wornTread: new THREE.MeshStandardMaterial({ ...rubber, color: 0x171615, vertexColors: true, roughness: 0.97, bumpMap: grain, bumpScale: 0.2 }),
    plug: new THREE.MeshStandardMaterial({ color: 0x2b2018, roughness: 0.85, envMapIntensity: 0.3 }),
    crayon: new THREE.MeshStandardMaterial({ color: 0xe9d46a, roughness: 0.95, envMapIntensity: 0.4 }),
    // dull zinc, so the weights stand out against the polished rim
    weight: new THREE.MeshStandardMaterial({ color: 0x5f6266, metalness: 0.6, roughness: 0.5, envMapIntensity: 1 }),
    aluminum: new THREE.MeshStandardMaterial({ color: 0xdcdcdc, metalness: 1, roughness: 0.2, envMapIntensity: 1.3 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08, envMapIntensity: 1.4 }),
    hub: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.4 }),
    inside: new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 }),
  };
}

// ------------------------------------------------------------------ assembly
export type TireOptions = {
  font: string;
  maxTexture: number;
  worn?: boolean; // a used tire: shallower tread, scuffed rubber, crayon marks
  plug?: boolean; // a repaired puncture
  weights?: boolean; // balance weights on the rim
  brand?: boolean; // the shop's own TTP Tire lettering on the sidewall
};

/** Tread lost on a worn tire, as a fraction of new depth. */
const WORN = 0.55;

export function makeTire(kind: TireKind, materials: TireMaterials, opts: TireOptions) {
  const group = new THREE.Group();
  group.name = `tire-${kind}`;
  const body = carcass(kind);
  const w = wheelGeometry();
  const bump = sidewallTexture(body.outPts, body.outerLength, kind, opts.font, opts.maxTexture, opts.brand);
  const side = opts.worn
    ? materials.sidewall(bump, sidewallCrayon(body.outPts, body.outerLength, opts.font, opts.maxTexture))
    : materials.sidewall(bump);
  const wear = opts.worn ? WORN : 1;
  const meshes = [
    new THREE.Mesh(treadGeometry(kind, wear), opts.worn ? materials.wornTread : materials.treadRubber),
    new THREE.Mesh(body.crown, materials.groove),
    new THREE.Mesh(body.outer, side),
    new THREE.Mesh(body.inner, materials.rubber),
    new THREE.Mesh(w.barrel, materials.aluminum),
    new THREE.Mesh(w.disc, materials.aluminum),
    new THREE.Mesh(w.hub, materials.hub),
    new THREE.Mesh(w.studs, materials.chrome),
  ];
  for (const m of meshes) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  // the dark inside of the wheel, seen through the hand holes
  const backing = new THREE.Mesh(new THREE.CircleGeometry(0.26, 64).rotateX(-Math.PI / 2).translate(0, 0.02, 0), materials.inside);
  // the tire rolls inside this group, so rolling and presentation turns don't interfere
  const spin = new THREE.Group();
  spin.add(...meshes, backing);
  if (opts.plug) {
    const p = plugParts(DIM.RO - DEPTH[kind] * (1 - wear), Math.PI, 0.0175);
    spin.add(new THREE.Mesh(p.plug, materials.plug), new THREE.Mesh(p.ring, materials.crayon));
  }
  if (opts.weights) spin.add(new THREE.Mesh(weightParts(Math.PI * 0.82), materials.weight));
  group.add(spin);
  // a worn tire is a little smaller, so it sits that much lower to touch the floor
  return { group, spin, radius: DIM.RO - DEPTH[kind] * (1 - wear) };
}
