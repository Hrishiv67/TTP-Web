/**
 * A/C work, on its own set: a truck A/C compressor lying on the studio floor, its ribbed
 * belt running up out of frame to the engine and its two refrigerant lines going up
 * after it, and a manifold gauge set standing beside it, the blue low-side and red
 * high-side hoses clipped onto the service ports on those lines. The camera arrives on
 * the compressor at rest; the clutch snaps in and the pulley, belt and clutch spin up;
 * the camera moves across the gauges as the needles climb to a normal reading (about
 * 35 psi low side, 200 high) and frost creeps over the low-side fitting and hose; then a
 * three-quarter hero of the running compressor and its gauges.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { FRAMES, clamp01, ramp, smootherstep, type CameraKey, type Vec3 } from "../shots";
import type { ServiceFactory } from "./types";

// ---------------------------------------------------------------- layout, meters
// The compressor lies on its side on its two lower mounting ears, shaft level. In its
// own frame x runs along the shaft toward the clutch, y is up and z = x × y; it is
// turned (COMP_YAW) so the clutch faces the key light, front left, and the camera.
const AXIS_H = 0.091;
const COMP_AT = new THREE.Vector3(-0.12, AXIS_H, 0);
const COMP_YAW = -2.5;
// the gauge set stands on its hoses to the right, facing the camera, leaning back a little
const GAUGE_AT = new THREE.Vector3(0.2, 0.11, 0.07);
const GAUGE_YAW = -0.2;
const GAUGE_LEAN = -0.12;
// the pulley's grooves, centered on the shaft at x = BELT_X; the belt's back, rubbing radius
const BELT_X = 0.098;
const BELT_R = 0.0667;
const BELT_TILE = 0.6; // meters of belt per repeat of its printed back

// ---------------------------------------------------------------- timeline (u)
const ENGAGE: [number, number] = [0.25, 0.262]; // the clutch plate snaps in
const GAP = 0.002; // and closes this air gap
const SPIN: [number, number] = [0.256, 0.35]; // pulley, belt and clutch spin up to speed
const RATE = Math.PI * 2 * 11; // radians per unit of u, at speed
const LOW_RISE: [number, number] = [0.41, 0.54];
const HIGH_RISE: [number, number] = [0.49, 0.62];
const LOW_PSI = 35, HIGH_PSI = 200;
const FROST: [number, number] = [0.5, 0.76];
const REACH = 0.13; // how far the frost spreads from the low-side fitting, meters

const BLUE = 0x1d4fa6, RED = 0xb3161c, YELLOW = 0xd6a215;

/** How far the pulley has turned at u: the speed eases up over SPIN (no jump), then holds. */
function spinAngle(u: number) {
  const [a, b] = SPIN;
  const t = clamp01((u - a) / (b - a));
  // the integral of smootherstep
  const F = t ** 6 - 3 * t ** 5 + 2.5 * t ** 4;
  return RATE * ((b - a) * F + Math.max(0, u - b));
}
/** A needle swinging up to its reading over [a, b], overshooting a little before it settles. */
function swing(u: number, [a, b]: [number, number]) {
  const t = smootherstep(clamp01((u - a) / (b - a))) - 1;
  return 1 + 2 * t ** 3 + t ** 2;
}

// fully metallic parts reflect the black studio and vanish; part-metal takes the key light as well
const metal = (color: number, roughness: number, metalness = 0.55, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const plastic = (color: number, roughness: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });

// fixed-seed random numbers, so the textures come out the same on every build
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

// ---------------------------------------------------------------- geometry helpers
type P = [number, number] | [number, number, 1];
/** A solid of revolution about +y from (radius, height) points, each a hard edge unless marked smooth (1). */
function lathe(pts: P[], segs: number) {
  const v: THREE.Vector2[] = [];
  pts.forEach((p, i) => {
    v.push(new THREE.Vector2(p[0], p[1]));
    // a repeated point gives the faces either side their own normals
    if (p.length === 2 && i > 0 && i < pts.length - 1) v.push(new THREE.Vector2(p[0], p[1]));
  });
  return new THREE.LatheGeometry(v, segs);
}
/** The same about +x, the compressor's shaft. */
const latheX = (pts: P[], segs: number) => lathe(pts, segs).rotateZ(-Math.PI / 2);

/** A cylinder along y with V grooves round it: knurled knobs, nuts and sleeves. */
function fluted(r: number, h: number, flutes: number, depth: number) {
  const g = new THREE.CylinderGeometry(r, r, h, flutes * 4, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    if (Math.hypot(x, z) < 1e-7) continue;
    const k = 1 - depth * Math.max(0, Math.cos(Math.atan2(x, z) * flutes));
    p.setXYZ(i, x * k, p.getY(i), z * k);
  }
  g.computeVertexNormals();
  return g;
}

/** A dome on the end of a knob, facing +y. */
const dome = (r: number, h: number) => new THREE.SphereGeometry(r, 24, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, h / r, 1);

const tube = (pts: THREE.Vector3[], r: number, segs: number, radial = 12) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), segs, r, radial);

/** A crimped hose ferrule along +y, 22 mm long. */
const ferruleGeometry = (r = 0.0079) =>
  lathe([[r - 0.0016, 0], [r - 0.0002, 0.0008], [r, 0.0055], [r - 0.0005, 0.007], [r, 0.0085], [r, 0.0135], [r - 0.0005, 0.015], [r, 0.0165], [r, 0.0205], [r - 0.0013, 0.022]], 24);

/**
 * A patch bent round the compressor's body at radius r, w along the shaft and h round
 * it, centered at xc and at angle beta0 round from the top (toward +z). Texture u reads
 * toward the rear, v up the body, so a label on it reads the right way from outside.
 */
function bentPatch(w: number, h: number, r: number, xc: number, beta0: number) {
  const g = new THREE.PlaneGeometry(w, h, 4, 16);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const b = beta0 + p.getY(i) / r;
    p.setXYZ(i, xc - p.getX(i), r * Math.cos(b), r * Math.sin(b));
  }
  g.computeVertexNormals();
  return g;
}

/**
 * The ribbed belt in the compressor's frame: down from the top of the frame, round the
 * bottom of the pulley and back up, its ribs in the grooves. s runs along it (texture u
 * is s / BELT_TILE); the printed back is geometry group 0, the rest group 1.
 */
function beltGeometry(top: number, arcSegs: number) {
  const W = 0.0285, N = 8, PITCH = W / N;
  const RIB = 0.0641, BACK = BELT_R + 0.0027;
  // the section (across, radius), round its edge: a side, the back, the other side, the ribs
  const sec: [number, number][] = [[W / 2, BELT_R], [W / 2, BACK], [-W / 2, BACK], [-W / 2, BELT_R]];
  for (let i = 0; i < N; i++) sec.push([-W / 2 + i * PITCH + PITCH / 2, RIB], [-W / 2 + (i + 1) * PITCH, BELT_R]);
  // stations along it: [s, position of a section point]
  type Station = { s: number; at: (b: number, d: number) => THREE.Vector3 };
  const st: Station[] = [];
  for (const y of [top, top * 0.4, 0.12, 0.03, 0]) st.push({ s: top - y, at: (b, d) => new THREE.Vector3(BELT_X + b, y, d) });
  for (let i = 1; i < arcSegs; i++) {
    const phi = (i / arcSegs) * Math.PI;
    st.push({ s: top + BELT_R * phi, at: (b, d) => new THREE.Vector3(BELT_X + b, -d * Math.sin(phi), d * Math.cos(phi)) });
  }
  for (const y of [0, 0.03, 0.12, top * 0.4, top]) st.push({ s: top + Math.PI * BELT_R + y, at: (b, d) => new THREE.Vector3(BELT_X + b, y, -d) });
  const pos: number[] = [], uv: number[] = [], back: number[] = [], rest: number[] = [];
  for (let k = 0; k < sec.length; k++) {
    const e0 = sec[k], e1 = sec[(k + 1) % sec.length];
    const base = pos.length / 3;
    for (const s of st) {
      for (const [b, d] of [e0, e1]) {
        pos.push(...s.at(b, d).toArray());
        uv.push(s.s / BELT_TILE, (b + W / 2) / W);
      }
    }
    const idx = k === 1 ? back : rest;
    for (let j = 0; j < st.length - 1; j++) {
      const a = base + j * 2, c = a + 2;
      idx.push(a, c, a + 1, a + 1, c, c + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([...back, ...rest]);
  g.addGroup(0, back.length, 0);
  g.addGroup(back.length, rest.length, 1);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- textures
function canvas(w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  return { cv, c: cv.getContext("2d")! };
}
function texture(cv: HTMLCanvasElement, color = true) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The skin of a die casting, for a bump map: soft mottling and fine pits, tiled. */
function castingGrain(n: number) {
  const { cv, c } = canvas(n, n);
  const rand = rng(17);
  c.fillStyle = "#808080";
  c.fillRect(0, 0, n, n);
  for (let i = 0; i < 140; i++) {
    const x = rand() * n, y = rand() * n, r = n * (0.03 + rand() * 0.07);
    const v = rand() < 0.5 ? 0 : 255;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${v},${v},${v},0.07)`);
    g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    c.fillStyle = g;
    c.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (let i = 0; i < n * n * 0.05; i++) {
    const v = rand() < 0.6 ? 60 : 200;
    c.fillStyle = `rgba(${v},${v},${v},0.4)`;
    c.fillRect(rand() * n, rand() * n, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
  const t = texture(cv, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * The clutch's armature plate, face on: turned steel with two staggered rows of slots.
 * Spinning, every slot smears into a ring, as dark as the share of the ring that is slot.
 */
function plateFace(n: number, spinning: boolean) {
  const { cv, c } = canvas(n, n);
  const R = n / 2;
  c.translate(R, R);
  const rand = rng(5);
  c.fillStyle = "#aeb1b4";
  c.fillRect(-R, -R, n, n);
  // the turned finish: fine rings of slightly different shine
  for (let r = R * 0.3; r < R; r += 1.4) {
    const v = 120 + rand() * 120;
    c.strokeStyle = `rgba(${v},${v},${v},0.16)`;
    c.lineWidth = 1;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.stroke();
  }
  // a chamfer round the edge
  c.strokeStyle = "rgba(40,40,40,0.5)";
  c.lineWidth = R * 0.02;
  c.beginPath();
  c.arc(0, 0, R * 0.99, 0, Math.PI * 2);
  c.stroke();
  const w = R * 0.052;
  for (const row of [{ r: 0.87, n: 4, off: 0.25 }, { r: 0.745, n: 4, off: 0.25 + Math.PI / 4 }]) {
    const gap = 0.32; // radians of bridge between slots
    if (spinning) {
      const share = 1 - (gap * row.n) / (Math.PI * 2);
      for (let k = 0; k < 5; k++) {
        c.strokeStyle = `rgba(14,14,14,${(share * 0.75) / 5 + 0.04})`;
        c.lineWidth = w * (0.6 + k * 0.25);
        c.beginPath();
        c.arc(0, 0, R * row.r, 0, Math.PI * 2);
        c.stroke();
      }
    } else {
      c.strokeStyle = "#101010";
      c.lineWidth = w;
      c.lineCap = "round";
      for (let i = 0; i < row.n; i++) {
        const a0 = row.off + (i * Math.PI * 2) / row.n + gap / 2;
        c.beginPath();
        c.arc(0, 0, R * row.r, a0, a0 + (Math.PI * 2) / row.n - gap);
        c.stroke();
      }
    }
  }
  return texture(cv);
}

/** The belt's back: black rubber with the maker's code printed every 30 cm; smeared along it when spinning. */
function beltBack(font: string, w: number, h: number, spinning: boolean) {
  const { cv, c } = canvas(w, h);
  c.fillStyle = "#0e0e0f";
  c.fillRect(0, 0, w, h);
  const rand = rng(41);
  for (let i = 0; i < w * h * 0.03; i++) {
    const v = 18 + rand() * 26;
    c.fillStyle = `rgb(${v},${v},${v})`;
    c.fillRect(rand() * w, rand() * h, 1 + rand(), 1);
  }
  c.font = `600 ${Math.round(h * 0.4)}px ${font}`;
  c.textBaseline = "middle";
  const print = (dx: number, alpha: number) => {
    c.fillStyle = `rgba(206,206,200,${alpha})`;
    for (const x0 of [0.05, 0.55]) c.fillText("8PK1525   EPDM   26 12", x0 * w + dx, h * 0.53);
  };
  if (spinning) for (let k = 0; k < 16; k++) print(k * w * 0.005, 0.07);
  else print(0, 0.8);
  const t = texture(cv);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** The foil label on the compressor's body, 50 by 36 mm. */
function labelTexture(font: string, w: number) {
  const h = Math.round((w * 36) / 50);
  const { cv, c } = canvas(w, h);
  const mm = w / 50;
  const rand = rng(23);
  c.fillStyle = "#d3d5d7";
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    c.fillStyle = `rgba(255,255,255,${rand() * 0.18})`;
    c.fillRect(0, rand() * h, w, 1);
  }
  c.fillStyle = "#17181b";
  c.fillRect(0, 0, w, 8 * mm);
  const text = (s: string, x: number, y: number, size: number, weight: number, color: string, align: CanvasTextAlign = "left") => {
    c.fillStyle = color;
    c.font = `${weight} ${size * mm}px ${font}`;
    c.textAlign = align;
    c.textBaseline = "middle";
    c.fillText(s, x * mm, y * mm);
  };
  text("A/C COMPRESSOR", 3, 4.2, 4, 800, "#f2f2f2");
  text("R-134a", 3, 14.5, 9.5, 900, "#141518");
  text("PAG 46   ·   12 V", 3, 22, 3.6, 700, "#26272b");
  // a barcode and its serial
  let x = 3;
  c.fillStyle = "#141518";
  while (x < 40) {
    const bw = 0.25 + Math.floor(rand() * 3) * 0.25;
    c.fillRect(x * mm, 25.5 * mm, bw * mm, 6 * mm);
    x += bw + 0.25 + Math.floor(rand() * 3) * 0.25;
  }
  text("SN 26 0412 3381", 3, 33.6, 2.6, 600, "#3a3b40");
  return texture(cv);
}

// R-134a: saturation temperature (°F) against gauge pressure (psi), for the gauges' inner scale
const R134A: [number, number][] = [
  [-10, 2], [0, 6.5], [10, 11.9], [20, 18.4], [30, 26.1], [40, 35], [50, 45.4], [60, 57.4], [70, 71.1], [80, 86.7],
  [90, 104.3], [100, 124.1], [110, 146.3], [120, 171.1], [130, 198.7], [140, 229.2], [150, 262.8], [160, 299.8],
];
// where a pressure sits on each dial, degrees clockwise from 12 o'clock: the low side reads
// 30 inHg of vacuum to 0 over the first 30 degrees, then 0 to 120 psi; the high side 0 to 500
const LOW_DIAL = (psi: number) => -105 + psi * 2;
const HIGH_DIAL = (psi: number) => -135 + psi * 0.54;

/** A gauge face: the psi scale, a green band for the normal running range, and the R-134a temperatures inside. */
function gaugeFace(font: string, n: number, high: boolean) {
  const { cv, c } = canvas(n, n);
  const R = n / 2;
  c.translate(R, R);
  const ink = "#17181b";
  const hue = high ? "#bf1a20" : "#1d4fae";
  const dial = high ? HIGH_DIAL : LOW_DIAL;
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const polar = (deg: number, r: number): [number, number] => [Math.cos(rad(deg)) * r, Math.sin(rad(deg)) * r];
  const g = c.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, "#fbfbf8");
  g.addColorStop(0.8, "#f2f2ee");
  g.addColorStop(0.95, "#d9d9d3");
  g.addColorStop(1, "#8f8f8b");
  c.fillStyle = g;
  c.fillRect(-R, -R, n, n);
  const arc = (r: number, d0: number, d1: number, width: number, color: string) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.arc(0, 0, r, rad(d0), rad(d1));
    c.stroke();
  };
  const tick = (deg: number, r0: number, r1: number, width: number, color = ink) => {
    const [x0, y0] = polar(deg, r0), [x1, y1] = polar(deg, r1);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
  };
  const label = (s: string, deg: number, r: number, size: number, weight: number, color: string) => {
    const [x, y] = polar(deg, r);
    c.fillStyle = color;
    c.font = `${weight} ${size}px ${font}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(s, x, y);
  };
  // the normal running range
  const [b0, b1] = high ? [150, 250] : [25, 45];
  arc(R * 0.84, dial(b0), dial(b1), R * 0.06, "rgba(40,150,66,0.92)");
  // the psi scale
  arc(R * 0.9, -135, 135, R * 0.008, ink);
  const top = high ? 500 : 120, minor = high ? 10 : 2, major = high ? 50 : 10;
  for (let i = 0; i * minor <= top; i++) {
    const p = i * minor;
    const big = p % major === 0, half = !big && p % (major / 2) === 0;
    tick(dial(p), R * 0.9, big ? R * 0.785 : half ? R * 0.82 : R * 0.85, big ? R * 0.017 : R * 0.008);
  }
  for (let p = 0; p <= top; p += major) label(String(p), dial(p), R * 0.665, R * (high ? 0.1 : 0.098), 700, ink);
  if (!high) {
    // the vacuum, in inches of mercury
    for (let v = 5; v <= 30; v += 5) tick(-105 - v, R * 0.9, v % 10 === 0 ? R * 0.8 : R * 0.85, R * 0.01, "#a3151b");
    label("30", -135, R * 0.665, R * 0.078, 700, "#a3151b");
  }
  // inside: the R-134a saturation temperature for each pressure, °F
  const inside = R134A.filter(([, p]) => p <= top * 0.99);
  arc(R * 0.53, dial(inside[0][1]), dial(inside[inside.length - 1][1]), R * 0.006, hue);
  for (const [T, p] of inside) {
    const big = T % 20 === 0;
    tick(dial(p), R * 0.53, big ? R * 0.6 : R * 0.57, R * (big ? 0.012 : 0.007), hue);
    if (big) label(String(T), dial(p), R * 0.45, R * 0.07, 700, hue);
  }
  label(high ? "HIGH" : "LOW", 180, R * 0.62, R * 0.15, 800, hue);
  label("psi", 0, R * 0.2, R * 0.085, 600, ink);
  label("R-134a  °F", 180, R * 0.27, R * 0.062, 700, hue);
  label("CL 1.6", 180, R * 0.8, R * 0.048, 600, "#55565b");
  return texture(cv);
}

// ---------------------------------------------------------------- frost
// a little value noise for the frost's crystals and its ragged edge
const NOISE = /* glsl */ `
float acHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float acNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(acHash(i), acHash(i + vec3(1, 0, 0)), f.x), mix(acHash(i + vec3(0, 1, 0)), acHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(acHash(i + vec3(0, 0, 1)), acHash(i + vec3(1, 0, 1)), f.x), mix(acHash(i + vec3(0, 1, 1)), acHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
`;

/**
 * Frost on the cold low side: within uFrost * REACH of the fitting (with a ragged edge)
 * the surface goes white and rough, a fine crystal grain in its color and normal.
 */
function frosty(m: THREE.MeshStandardMaterial, frost: { value: number }, at: { value: THREE.Vector3 }) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uFrost = frost;
    shader.uniforms.uFrostAt = at;
    shader.vertexShader = "varying vec3 vFrostPos;\n" + shader.vertexShader.replace(
      "#include <project_vertex>",
      "#include <project_vertex>\nvFrostPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
    );
    shader.fragmentShader = "uniform float uFrost;\nuniform vec3 uFrostAt;\nvarying vec3 vFrostPos;\n" + NOISE + shader.fragmentShader
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float frostGrain = acNoise(vFrostPos * 1500.0) * 0.6 + acNoise(vFrostPos * 420.0) * 0.4;
        float frostEdge = uFrost * ${REACH.toFixed(3)} - distance(vFrostPos, uFrostAt) + (acNoise(vFrostPos * 90.0) - 0.5) * 0.035;
        float frostCover = smoothstep(0.0, 0.01, frostEdge) * smoothstep(0.0, 0.12, uFrost);
        frostCover *= 0.75 + 0.25 * smoothstep(0.25, 0.6, frostGrain);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.83, 0.88) * (0.7 + 0.5 * frostGrain), frostCover);`,
      )
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.82, frostCover);")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.0, frostCover);")
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec3 frostJit = vec3(acNoise(vFrostPos * 2300.0), acNoise(vFrostPos * 2300.0 + 17.0), acNoise(vFrostPos * 2300.0 + 41.0)) - 0.5;
        normal = normalize(normal + frostCover * 0.9 * frostJit);`,
      );
  };
  m.customProgramCacheKey = () => "ac-frost";
  return m;
}

const service: ServiceFactory = async (ctx) => {
  const root = new THREE.Group();
  root.name = "ac";
  const seg = ctx.small ? 64 : 96;
  const texN = Math.min(ctx.maxTexture, ctx.small ? 512 : 1024);
  const noShadow = new Set<THREE.Object3D>();
  const frost = { value: 0 };
  const frostAt = { value: new THREE.Vector3() };
  const Y = new THREE.Vector3(0, 1, 0);

  // ---------------------------------------------------------------- materials
  const grain = castingGrain(512);
  grain.repeat.set(6, 3);
  const casting = metal(0x92959a, 0.52, 0.5, { bumpMap: grain, bumpScale: 0.35 });
  const machined = metal(0xb6b9bd, 0.3, 0.55);
  const pulleySteel = metal(0x8a8d91, 0.3, 0.6);
  const blackOxide = metal(0x26272a, 0.45, 0.45);
  const zinc = metal(0xc3c6ca, 0.3, 0.55);
  const chrome = metal(0xd9dce0, 0.16, 0.6);
  const brass = metal(0xb89458, 0.3, 0.55);
  const rubber = plastic(0x0f0f10, 0.62);
  const anodized = (color: number) => metal(color, 0.34, 0.45);

  // ---------------------------------------------------------------- the compressor
  const comp = new THREE.Group();
  comp.name = "ac-compressor";
  comp.position.copy(COMP_AT);
  comp.rotation.y = COMP_YAW;
  root.add(comp);
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // the casting, rear head to nose: a rounded rear edge, the joints between its three
  // parts, two cast bands round the cylinder block, the front housing rounding in to
  // the nose that carries the pulley's bearing
  add(comp, latheX([
    [0, -0.1], [0.047, -0.1],
    [0.055, -0.0992, 1], [0.0598, -0.0972, 1], [0.0622, -0.0935, 1], [0.0628, -0.089],
    [0.0628, -0.0675], [0.0611, -0.0662], [0.0611, -0.0638], [0.0619, -0.0628],
    [0.0619, -0.0515], [0.0647, -0.0503], [0.0647, -0.0457], [0.0619, -0.0445],
    [0.0619, 0.0105], [0.0647, 0.0117], [0.0647, 0.0163], [0.0619, 0.0175],
    [0.0619, 0.034], [0.0602, 0.0352], [0.0602, 0.0378], [0.0613, 0.039],
    [0.0613, 0.0495], [0.0596, 0.0555, 1], [0.0562, 0.0605, 1], [0.0512, 0.0638, 1], [0.0465, 0.0655],
    [0.034, 0.0655], [0.0268, 0.0672], [0.0268, 0.0935], [0.0225, 0.0955], [0, 0.0955],
  ], seg), casting);
  // six bolts round the rear head
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    add(comp, new THREE.CylinderGeometry(0.0062, 0.0062, 0.005, 6).rotateZ(Math.PI / 2), zinc, -0.1025, Math.cos(a) * 0.046, Math.sin(a) * 0.046);
  }
  // the field coil, tucked into the back of the pulley
  add(comp, latheX([[0.0345, 0.0665], [0.0552, 0.0665], [0.0552, 0.1005], [0.0345, 0.1005], [0.0345, 0.0665]], seg), blackOxide);

  // the pulley: eight V grooves for the ribbed belt, a recess behind for the coil
  const pulley = new THREE.Group();
  comp.add(pulley);
  {
    const PITCH = 0.0285 / 8, x0 = BELT_X - 0.0285 / 2;
    const ribs: P[] = [];
    for (let i = 0; i < 8; i++) {
      ribs.push([0.0639, x0 + (i + 0.5) * PITCH]);
      if (i < 7) ribs.push([0.0665, x0 + (i + 1) * PITCH - 0.0002], [0.0665, x0 + (i + 1) * PITCH + 0.0002]);
    }
    add(pulley, latheX([
      [0.0585, 0.08], [0.0645, 0.08], [0.0668, 0.0815], [0.0668, x0], ...ribs, [0.0668, x0 + 0.0285], [0.0668, 0.1145], [0.0645, 0.116],
      [0.0315, 0.116], [0.03, 0.115], [0.03, 0.0905], [0.0335, 0.09], [0.0335, 0.1025], [0.0585, 0.1025], [0.0585, 0.08],
    ], ctx.small ? 96 : 144), pulleySteel);
  }

  // the clutch: the armature plate on its hub, which the coil pulls back against the
  // pulley's face when it engages; it spins with the shaft
  const clutch = new THREE.Group();
  comp.add(clutch);
  add(clutch, latheX([[0.027, 0.1185], [0.0566, 0.1185], [0.0576, 0.1195], [0.0576, 0.1236], [0.0566, 0.1246]], seg), metal(0x9a9da0, 0.32, 0.55));
  const faceGeo = new THREE.CircleGeometry(0.0567, seg).rotateY(Math.PI / 2).translate(0.1246, 0, 0);
  add(clutch, faceGeo, metal(0xffffff, 0.3, 0.55, { map: plateFace(texN, false) }));
  const faceBlur = metal(0xffffff, 0.3, 0.55, {
    map: plateFace(texN, true), transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
  noShadow.add(add(clutch, faceGeo, faceBlur));
  // the hub's three-armed spider riveted to the plate, and the shaft nut
  const spiderShape = new THREE.Shape();
  for (let i = 0; i <= 180; i++) {
    const a = (i / 180) * Math.PI * 2;
    const r = 0.0195 + 0.0195 * (0.5 + 0.5 * Math.cos(3 * a)) ** 5;
    if (i === 0) spiderShape.moveTo(r * Math.cos(a), r * Math.sin(a));
    else spiderShape.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  const spiderMat = metal(0x2a2b2e, 0.4, 0.5, { transparent: true });
  const rivetMat = metal(0xc0c3c6, 0.3, 0.55, { transparent: true });
  add(clutch, new THREE.ExtrudeGeometry(spiderShape, {
    depth: 0.0032, bevelEnabled: true, bevelThickness: 0.0005, bevelSize: 0.0005, bevelSegments: 2, curveSegments: 4,
  }).rotateY(Math.PI / 2).translate(0.1251, 0, 0), spiderMat);
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3;
    add(clutch, dome(0.0034, 0.0018).rotateZ(-Math.PI / 2), rivetMat, 0.1288, 0.034 * Math.sin(a), -0.034 * Math.cos(a));
  }
  const ghostMat = metal(0x2a2b2e, 0.4, 0.5, { transparent: true, opacity: 0, depthWrite: false });
  noShadow.add(add(clutch, new THREE.RingGeometry(0.0195, 0.0405, 64).rotateY(Math.PI / 2), ghostMat, 0.1289));
  add(clutch, latheX([[0.0165, 0.1284], [0.0165, 0.1312], [0.0148, 0.1322], [0, 0.1322]], 48), blackOxide);
  add(clutch, new THREE.CylinderGeometry(0.0105, 0.0105, 0.0012, 32).rotateZ(Math.PI / 2), zinc, 0.1328);
  add(clutch, new THREE.CylinderGeometry(0.0086, 0.0086, 0.0072, 6).rotateZ(Math.PI / 2), zinc, 0.1334 + 0.0036);
  add(clutch, new THREE.CylinderGeometry(0.0045, 0.0045, 0.003, 16).rotateZ(Math.PI / 2), metal(0x8d9094, 0.35, 0.55), 0.1406 + 0.0015);

  // mounting ears: front top and bottom, rear bottom and side, each bored along the shaft
  const ear = (x0: number, x1: number, beta: number) => {
    const g = new THREE.Group();
    add(g, new THREE.BoxGeometry(x1 - x0, 0.03, 0.024), casting, (x0 + x1) / 2, 0.064, 0);
    add(g, latheX([
      [0.0064, x0], [0.0124, x0], [0.0132, x0 + 0.0008], [0.0132, x1 - 0.0008], [0.0124, x1], [0.0064, x1],
      [0.0059, x1 - 0.0006], [0.0059, x0 + 0.0006], [0.0064, x0],
    ], 32), casting, 0, 0.078, 0);
    g.rotation.x = beta;
    comp.add(g);
  };
  ear(0.03, 0.056, 0);
  ear(0.03, 0.056, Math.PI);
  ear(-0.095, -0.069, Math.PI);
  ear(-0.095, -0.069, 1.25);

  // the port pad on top of the rear head, the hose block bolted to it, and its bolt
  add(comp, new RoundedBoxGeometry(0.04, 0.03, 0.054, 2, 0.004), casting, -0.077, 0.058, 0);
  add(comp, new RoundedBoxGeometry(0.042, 0.018, 0.058, 2, 0.003), machined, -0.078, 0.082, 0);
  add(comp, new THREE.CylinderGeometry(0.0098, 0.0098, 0.0012, 24), zinc, -0.078, 0.0917, 0);
  add(comp, new THREE.CylinderGeometry(0.0075, 0.0075, 0.0062, 6), zinc, -0.078, 0.0954, 0);

  // the refrigerant lines: aluminum pipes back out of the hose block and up, crimped
  // into rubber hoses that run up out of frame with the belt. The suction line (low
  // side, the bigger one) is on the camera's side; each has a service port on top.
  const SUCTION_Z = -0.014, DISCHARGE_Z = 0.014;
  const suctionPipe = frosty(metal(0xaeb1b5, 0.34, 0.5), frost, frostAt);
  const lines: { z: number; r: number; port: number; mat: THREE.MeshStandardMaterial }[] = [
    { z: SUCTION_Z, r: 0.008, port: -0.117, mat: suctionPipe },
    { z: DISCHARGE_Z, r: 0.0064, port: -0.137, mat: metal(0xaeb1b5, 0.34, 0.5) },
  ];
  for (const { z, r, port, mat } of lines) {
    const pts: THREE.Vector3[] = [];
    for (let x = -0.096; x > -0.174; x -= 0.012) pts.push(new THREE.Vector3(x, 0.082, z));
    for (let i = 0; i <= 8; i++) {
      const a = ((i / 8) * Math.PI) / 2;
      pts.push(new THREE.Vector3(-0.176 - Math.sin(a) * 0.024, 0.082 + (1 - Math.cos(a)) * 0.024, z));
    }
    for (const y of [0.125, 0.15, 0.175]) pts.push(new THREE.Vector3(-0.2, y, z));
    add(comp, tube(pts, r, 64, 16), mat);
    add(comp, ferruleGeometry(r + 0.0048).scale(1, 1.4, 1), mat === suctionPipe ? suctionPipe : machined, -0.2, 0.165, z);
    // the hose leans back a little as it goes up, away from the camera
    const hose: THREE.Vector3[] = [];
    for (const [y, lean] of [[0.17, 0], [0.3, 0], [0.55, 0.02], [1.2, 0.1], [2.2, 0.28], [3.4, 0.55]] as const) {
      hose.push(new THREE.Vector3(-0.2 - lean * 0.55, y, z + lean * 0.8));
    }
    add(comp, tube(hose, r + 0.0042, 80, 16), rubber);
    // the service port: a boss on the pipe and the valve's threaded stem
    add(comp, new THREE.CylinderGeometry(0.0068, 0.0068, 0.015, 20), mat, port, 0.0895, z);
    add(comp, new THREE.CylinderGeometry(0.0052, 0.0052, 0.008, 20), mat, port, 0.101, z);
  }

  // the clutch's wire: out of the coil to a connector on the body's side, and the
  // truck's harness from there down under the compressor
  const onBody = (x: number, beta: number, r: number) => new THREE.Vector3(x, r * Math.cos(beta), r * Math.sin(beta));
  add(comp, tube([onBody(0.072, -2.35, 0.054), onBody(0.066, -2.25, 0.062), onBody(0.054, -2.12, 0.0685), onBody(0.044, -2.06, 0.07)], 0.0022, 20, 8), rubber);
  const plug = new THREE.Group();
  plug.position.copy(onBody(0.033, -2.04, 0.0705));
  plug.rotation.x = -2.04;
  add(plug, new RoundedBoxGeometry(0.018, 0.012, 0.011, 2, 0.002), plastic(0x1a1a1b, 0.5));
  add(plug, new RoundedBoxGeometry(0.014, 0.0105, 0.0098, 2, 0.002), plastic(0x6a6c70, 0.55), -0.0145, 0, 0);
  comp.add(plug);
  add(comp, tube([
    onBody(0.012, -2.04, 0.0705), onBody(0.0, -2.1, 0.075), new THREE.Vector3(-0.012, -0.072, -0.068), new THREE.Vector3(-0.02, -0.0875, -0.05),
    new THREE.Vector3(-0.025, -0.0875, 0.0), new THREE.Vector3(-0.035, -0.0875, 0.1), new THREE.Vector3(-0.05, -0.0875, 0.2),
  ], 0.0028, 48, 8), rubber);
  // the oil fill plug, and the label
  add(comp, new THREE.CylinderGeometry(0.0095, 0.0095, 0.004, 24).rotateX(Math.PI / 2 + 0.38), casting, -0.022, 0.0215, -0.0585);
  {
    const m = add(comp, new THREE.CylinderGeometry(0.0072, 0.0072, 0.0055, 6).rotateX(Math.PI / 2 + 0.38), zinc, -0.022, 0.023, -0.0625);
    m.rotation.order = "XYZ";
  }
  add(comp, bentPatch(0.05, 0.036, 0.0621, -0.017, -1.05), metal(0xffffff, 0.42, 0.25, {
    map: labelTexture(ctx.font, ctx.small ? 384 : 512), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  }));
  await ctx.nextTask();

  // ---------------------------------------------------------------- the belt
  const beltTex = beltBack(ctx.font, ctx.small ? 1024 : 2048, ctx.small ? 64 : 128, false);
  const beltBlur = beltBack(ctx.font, ctx.small ? 1024 : 2048, ctx.small ? 64 : 128, true);
  const beltMat = plastic(0xffffff, 0.62, { map: beltTex, side: THREE.DoubleSide });
  add(comp, beltGeometry(3.3 - AXIS_H, 48), [beltMat, plastic(0x121213, 0.7, { side: THREE.DoubleSide })] as unknown as THREE.Material);

  // ---------------------------------------------------------------- the manifold gauge set
  const gauges = new THREE.Group();
  gauges.name = "ac-gauges";
  gauges.position.copy(GAUGE_AT);
  gauges.rotation.set(GAUGE_LEAN, GAUGE_YAW, 0, "YXZ");
  root.add(gauges);
  add(gauges, new RoundedBoxGeometry(0.15, 0.046, 0.04, 3, 0.005), metal(0xb7babe, 0.3, 0.5));
  // the sight glass in the middle of its face
  add(gauges, new THREE.TorusGeometry(0.0088, 0.0015, 8, 32), chrome, 0, 0, 0.0203);
  add(gauges, new THREE.CircleGeometry(0.0088, 32), metal(0x1b2329, 0.06, 0.2), 0, 0, 0.0204);
  // the valve knobs on its ends, blue for the low side and red for the high
  for (const side of [-1, 1]) {
    const knobMat = plastic(side < 0 ? BLUE : RED, 0.42);
    add(gauges, new THREE.CylinderGeometry(0.0045, 0.0045, 0.008, 16).rotateZ(Math.PI / 2), chrome, side * 0.078, 0, -0.002);
    add(gauges, fluted(0.0168, 0.026, 20, 0.07).rotateZ(Math.PI / 2), knobMat, side * 0.095, 0, -0.002);
    add(gauges, dome(0.0158, 0.004).rotateZ(-side * Math.PI / 2), knobMat, side * 0.108, 0, -0.002);
  }
  // the hook it hangs by, standing up between the gauges
  add(gauges, new THREE.CylinderGeometry(0.0042, 0.0042, 0.008, 16), chrome, 0, 0.027, -0.012);
  {
    const hook: THREE.Vector3[] = [new THREE.Vector3(0, 0.03, -0.012), new THREE.Vector3(0, 0.09, -0.012), new THREE.Vector3(0, 0.135, -0.012)];
    for (let i = 1; i <= 8; i++) {
      const a = (i / 8) * Math.PI;
      hook.push(new THREE.Vector3(0, 0.135 + Math.sin(a) * 0.018, -0.03 + Math.cos(a) * 0.018));
    }
    hook.push(new THREE.Vector3(0, 0.122, -0.048));
    add(gauges, tube(hook, 0.0022, 48, 8), chrome);
    add(gauges, new THREE.SphereGeometry(0.0032, 12, 8), chrome, 0, 0.121, -0.048);
  }
  // the gauges: a rubber boot, a chrome bezel, the face, the needle and the glass
  const bootGeo = lathe([
    [0, -0.031], [0.03, -0.031], [0.0365, -0.0295, 1], [0.041, -0.0262, 1], [0.0432, -0.021, 1], [0.0438, -0.015, 1],
    [0.0438, -0.004, 1], [0.0432, 0.0012, 1], [0.0418, 0.0038, 1], [0.0398, 0.005, 1], [0.0378, 0.0047, 1], [0.0366, 0.0034, 1],
    [0.0362, 0.0015], [0.0362, -0.001],
  ], seg).rotateX(Math.PI / 2);
  const needleShape = new THREE.Shape();
  needleShape.moveTo(-0.0013, -0.0075);
  needleShape.lineTo(0.0013, -0.0075);
  needleShape.lineTo(0.00085, 0);
  needleShape.lineTo(0.0002, 0.0328);
  needleShape.lineTo(-0.0002, 0.0328);
  needleShape.lineTo(-0.00085, 0);
  needleShape.closePath();
  const needleGeo = new THREE.ExtrudeGeometry(needleShape, { depth: 0.0005, bevelEnabled: false });
  const needleMat = metal(0x141416, 0.35, 0.3);
  // the glass adds only its reflections of the studio's lights
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x000000, roughness: 0.05, metalness: 0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 1.5,
  });
  const gauge = (x: number, face: THREE.Texture, color: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0.079, 0.002);
    add(g, bootGeo, plastic(color, 0.55));
    add(g, new THREE.TorusGeometry(0.0356, 0.0011, 8, seg), chrome, 0, 0, 0.0018);
    add(g, new THREE.CircleGeometry(0.0358, seg), new THREE.MeshStandardMaterial({ map: face, roughness: 0.5, metalness: 0 }));
    const needle = new THREE.Group();
    needle.position.z = 0.0008;
    add(needle, needleGeo, needleMat);
    add(needle, new THREE.CircleGeometry(0.0026, 20), needleMat, 0, -0.0068, 0.00052);
    g.add(needle);
    add(g, new THREE.CylinderGeometry(0.0036, 0.0042, 0.0014, 24).rotateX(Math.PI / 2), needleMat, 0, 0, 0.002);
    add(g, dome(0.0036, 0.0012).rotateX(Math.PI / 2), chrome, 0, 0, 0.0027);
    noShadow.add(add(g, new THREE.CircleGeometry(0.0364, seg), glassMat, 0, 0, 0.0036));
    // its stem down into the manifold
    add(gauges, new THREE.CylinderGeometry(0.0042, 0.0042, 0.016, 16), brass, x, 0.031, -0.01);
    add(gauges, new THREE.CylinderGeometry(0.0072, 0.0072, 0.006, 6), brass, x, 0.027, -0.01);
    gauges.add(g);
    return { g, needle };
  };
  const low = gauge(-0.052, gaugeFace(ctx.font, texN, false), BLUE);
  await ctx.nextTask();
  const high = gauge(0.052, gaugeFace(ctx.font, texN, true), RED);

  // hose ends: a crimped ferrule from an attach point along a direction, in a group's frame
  const ferrule = (parent: THREE.Object3D, at: THREE.Vector3, dir: THREE.Vector3, mat: THREE.Material) => {
    const m = add(parent, ferruleGeometry(), mat, at.x, at.y, at.z);
    m.quaternion.setFromUnitVectors(Y, dir);
    // where the hose comes out of it, and its direction, in scene coordinates
    parent.updateMatrixWorld(true);
    return {
      at: parent.localToWorld(at.clone().addScaledVector(dir, 0.018)),
      dir: dir.clone().transformDirection(parent.matrixWorld),
    };
  };
  // the manifold's three ports underneath: low (blue), utility (yellow), high (red)
  const ends: Record<"low" | "mid" | "high", { at: THREE.Vector3; dir: THREE.Vector3 }> = {} as never;
  const lowHose = frosty(plastic(BLUE, 0.5), frost, frostAt);
  const hoseMat = { low: lowHose, mid: plastic(YELLOW, 0.5), high: plastic(RED, 0.5) };
  for (const [k, x] of [["low", -0.045], ["mid", 0], ["high", 0.045]] as const) {
    add(gauges, new THREE.CylinderGeometry(0.005, 0.005, 0.009, 16), brass, x, -0.027, 0);
    add(gauges, fluted(0.0088, 0.016, 18, 0.06), chrome, x, -0.037, 0);
    ends[k] = ferrule(gauges, new THREE.Vector3(x, -0.045, 0), new THREE.Vector3(0, -1, 0), chrome);
  }
  void hoseMat;

  // ---------------------------------------------------------------- the couplers
  // quick couplers snapped onto the service ports: a knurled sleeve, the body with its
  // side outlet, and the valve's knob on top. The low side's frosts.
  const coupler = (port: number, z: number, out: [number, number], color: number, cold: boolean) => {
    const g = new THREE.Group();
    g.position.set(port, 0.098, z);
    g.rotation.y = Math.atan2(-out[1], out[0]);
    comp.add(g);
    const ice = (m: THREE.MeshStandardMaterial) => (cold ? frosty(m, frost, frostAt) : m);
    const body = ice(anodized(color));
    const knob = ice(plastic(color, 0.42));
    const steelPart = ice(metal(0xd2d5d9, 0.22, 0.55));
    add(g, fluted(0.0116, 0.015, 24, 0.07), body, 0, 0.0075, 0);
    add(g, lathe([[0.0086, 0.015], [0.0099, 0.0158], [0.0099, 0.0375], [0.0106, 0.0385], [0.0106, 0.0432], [0.0092, 0.0442], [0, 0.0442]], 48), body);
    add(g, new THREE.CylinderGeometry(0.0052, 0.0052, 0.014, 16).rotateZ(Math.PI / 2), body, 0.013, 0.027, 0);
    add(g, new THREE.CylinderGeometry(0.0074, 0.0074, 0.008, 6).rotateZ(Math.PI / 2), steelPart, 0.023, 0.027, 0);
    add(g, fluted(0.0112, 0.0135, 16, 0.09), knob, 0, 0.0442 + 0.00675, 0);
    add(g, dome(0.0108, 0.003), knob, 0, 0.0577, 0);
    return { g, end: ferrule(g, new THREE.Vector3(0.027, 0.027, 0), new THREE.Vector3(1, 0, 0), steelPart) };
  };
  // outlets turned toward the gauges, in the compressor's frame
  const lowC = coupler(lines[0].port, SUCTION_Z, [-0.25, -0.97], BLUE, true);
  const highC = coupler(lines[1].port, DISCHARGE_Z, [-0.55, -0.83], RED, false);
  lowC.g.updateMatrixWorld(true);
  frostAt.value.copy(lowC.g.localToWorld(new THREE.Vector3(0, 0.02, 0)));
  await ctx.nextTask();

  // ---------------------------------------------------------------- the hoses
  const F = 0.0064; // a hose's centerline lying on the floor
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const hose = (a: { at: THREE.Vector3; dir: THREE.Vector3 }, mid: THREE.Vector3[], b: { at: THREE.Vector3; dir: THREE.Vector3 } | null, mat: THREE.Material) => {
    const pts = [a.at, a.at.clone().addScaledVector(a.dir, 0.02), ...mid];
    if (b) pts.push(b.at.clone().addScaledVector(b.dir, 0.03), b.at.clone().addScaledVector(b.dir, 0.012), b.at);
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    add(root, new THREE.TubeGeometry(curve, 160, 0.0062, 14), mat);
    return curve;
  };
  const la = ends.low.at, ha = ends.high.at, ma = ends.mid.at, lb = lowC.end.at, hb = highC.end.at;
  const curves = [
    // low side: down to the floor, along it toward the compressor, up into the coupler
    hose(ends.low, [V(la.x - 0.006, 0.02, la.z + 0.012), V(la.x - 0.03, F, la.z + 0.032), V(la.x - 0.09, F, la.z + 0.03),
      V(lb.x + 0.075, 0.03, lb.z + 0.06), V(lb.x + 0.08, 0.12, lb.z + 0.02)], lowC.end, lowHose),
    // high side: down, round behind the gauge set and up into its coupler from behind
    hose(ends.high, [V(ha.x + 0.006, 0.02, ha.z - 0.01), V(ha.x + 0.01, F, ha.z - 0.045), V(ha.x - 0.06, F, ha.z - 0.13),
      V(hb.x + 0.11, 0.04, hb.z - 0.05), V(hb.x + 0.08, 0.13, hb.z - 0.02)], highC.end, plastic(RED, 0.5)),
    // the utility hose, off across the floor toward the recovery machine
    hose(ends.mid, [V(ma.x + 0.002, 0.02, ma.z + 0.012), V(ma.x + 0.02, F, ma.z + 0.05), V(ma.x + 0.2, F, ma.z + 0.09),
      V(ma.x + 0.45, F, ma.z - 0.05), V(ma.x + 0.75, F, ma.z - 0.35)], null, plastic(YELLOW, 0.5)),
  ];

  // ---------------------------------------------------------------- shadows
  const under = ctx.contact(0.36, 0.2);
  under.position.set(COMP_AT.x, 0.002, COMP_AT.z);
  under.rotation.y = COMP_YAW;
  const underGauges = ctx.contact(0.26, 0.11);
  underGauges.position.set(GAUGE_AT.x, 0.002, GAUGE_AT.z + 0.01);
  underGauges.rotation.y = GAUGE_YAW;
  root.add(under, underGauges);
  noShadow.add(under).add(underGauges);
  // a soft line of shadow wherever a hose lies on the floor
  const lineMat = (under.material as THREE.MeshBasicMaterial).clone();
  lineMat.opacity = 0.55;
  for (const c of curves) {
    const n = Math.ceil(c.getLength() / 0.02);
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = c.getPointAt(t);
      if (p.y > 0.009 || p.length() > 1.2) continue;
      const d = c.getTangentAt(t);
      const m = ctx.contact(0.05, 0.026);
      m.material = lineMat;
      m.position.set(p.x, 0.0025, p.z);
      m.rotation.y = Math.atan2(-d.z, d.x);
      root.add(m);
      noShadow.add(m);
    }
  }
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || noShadow.has(m)) return;
    m.castShadow = true;
    m.receiveShadow = true;
  });

  // ---------------------------------------------------------------- the animation
  function update(u: number) {
    // the clutch snaps in, then everything spins up together, clockwise seen from the front
    clutch.position.x = -GAP * ramp(u, ...ENGAGE);
    const a = -spinAngle(u);
    clutch.rotation.x = pulley.rotation.x = a;
    // the belt runs with the pulley's rim
    const speed = ramp(u, ...SPIN);
    beltTex.offset.x = beltBlur.offset.x = -(BELT_R * a) / BELT_TILE;
    beltMat.map = speed > 0.55 ? beltBlur : beltTex;
    // at speed the plate's slots and the hub's arms blur into rings
    const blur = ramp(speed, 0.35, 0.9);
    faceBlur.opacity = blur;
    spiderMat.opacity = rivetMat.opacity = 1 - 0.8 * blur;
    ghostMat.opacity = 0.5 * blur;
    // the gauges come up to a normal reading
    low.needle.rotation.z = -THREE.MathUtils.degToRad(LOW_DIAL(LOW_PSI * swing(u, LOW_RISE)));
    high.needle.rotation.z = -THREE.MathUtils.degToRad(HIGH_DIAL(HIGH_PSI * swing(u, HIGH_RISE)));
    // and frost creeps out over the low side
    frost.value = ramp(u, ...FROST);
  }
  update(0);

  // ---------------------------------------------------------------- the camera
  root.updateMatrixWorld(true);
  const W = (o: THREE.Object3D, x = 0, y = 0, z = 0) => o.localToWorld(new THREE.Vector3(x, y, z));
  const v3 = (v: THREE.Vector3): Vec3 => [v.x, v.y, v.z];
  /** A camera looking at a point from a direction (scene coordinates), some distance off. */
  const look = (tgt: THREE.Vector3, dir: THREE.Vector3 | [number, number, number], dist: number, fov = 30) => {
    const d = (Array.isArray(dir) ? new THREE.Vector3(...dir) : dir.clone()).normalize();
    return { cam: v3(tgt.clone().addScaledVector(d, dist)), tgt: v3(tgt), fov };
  };
  const xc = new THREE.Vector3(1, 0, 0).transformDirection(comp.matrixWorld); // along the shaft, toward the clutch
  const zc = new THREE.Vector3(0, 0, 1).transformDirection(comp.matrixWorld);
  const faceN = new THREE.Vector3(0, 0, 1).transformDirection(gauges.matrixWorld);
  const clutchAt = W(comp, 0.125, 0, 0);
  const lowAt = W(low.g), highAt = W(high.g);
  const frostView = W(lowC.g, 0, 0.03, 0);
  const center = new THREE.Vector3(-0.02, 0.125, 0.01);
  // the clutch, seen from in front and a little to the side and above
  const onClutch = xc.clone().addScaledVector(zc, -0.55).add(new THREE.Vector3(0, 0.5, 0));

  const keys: CameraKey[] = [
    // the whole set from the front left, the light on the clutch
    { t: 0, ...look(center, [-0.62, 0.36, 0.7], 1.15), frame: FRAMES.right },
    { t: 0.12, ...look(new THREE.Vector3(-0.12, 0.11, 0.04), [-0.6, 0.36, 0.72], 0.78), frame: FRAMES.right, ease: "pass" },
    // in on the clutch as it engages and spins up
    { t: 0.24, ...look(clutchAt, onClutch, 0.36), frame: FRAMES.close },
    { t: 0.33, ...look(clutchAt, onClutch.clone().addScaledVector(zc, -0.08), 0.34), frame: FRAMES.close },
    // across to the gauges: the low side, then the high
    { t: 0.41, ...look(new THREE.Vector3(0.08, 0.17, 0.03), [-0.3, 0.3, 0.9], 0.5), frame: FRAMES.close, ease: "pass" },
    { t: 0.48, ...look(lowAt, faceN.clone().add(new THREE.Vector3(-0.12, 0.06, 0)), 0.27), frame: FRAMES.close },
    { t: 0.58, ...look(highAt, faceN.clone().add(new THREE.Vector3(0.06, 0.06, 0)), 0.27), frame: FRAMES.close },
    // the low-side fitting frosting over
    { t: 0.66, ...look(frostView, [0.35, 0.45, 0.82], 0.3), frame: FRAMES.close },
    { t: 0.73, ...look(frostView, [0.3, 0.48, 0.82], 0.29), frame: FRAMES.close },
    // back out round to the hero
    { t: 0.86, ...look(center, [-0.45, 0.38, 0.8], 0.95), frame: FRAMES.right, ease: "pass" },
    { t: 1, ...look(center, [-0.42, 0.34, 0.84], 1.22), frame: FRAMES.right },
  ];

  return {
    root,
    keys,
    focus: [0, 0.14],
    update,
    rest: () => update(0),
  };
};

export default service;
