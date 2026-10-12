/**
 * Wheel balancing, on its own set: a steer tire and wheel on a truck wheel balancer in
 * the black studio. The wheel spins up on the balancer's shaft with a shake in it while
 * the screen works out how much weight each side needs, then spins down and stops with
 * the spot at the top. Two clip-on weights go on there, one on each rim flange, and the
 * wheel spins again, smooth this time, while the screen reads 0.00, 0.00 and OK.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { FRAMES, clamp01, ramp, smootherstep, type CameraKey, type Vec3 } from "../shots";
import { DEPTH, DIM, treadRadius } from "../tireModel";
import type { ServiceFactory } from "./types";

// ---------------------------------------------------------------- layout, meters
// The cabinet stands to the right; its shaft comes out of the left side at SHAFT height
// and the wheel hangs on it, outboard face to the left (-x), toward the key light and
// the camera, which looks on from the front left.
const SHAFT = 0.8;
const WX = -0.45; // the wheel's center plane
const FACE = WX + 0.1475 + 0.22; // the cabinet's left side: past the tire's inner sidewall, a hand's width of room
const CAB = { w: 0.9, d: 0.6 };
const CX = FACE + CAB.w / 2;
const DECK = 1.01; // the top of the cabinet
// the display head on its stalk at the back of the deck, turned a little toward the wheel side
const HEAD = new THREE.Vector3(CX + 0.2, 1.44, -0.2);
const HEAD_YAW = -0.14, HEAD_TILT = -0.12;
// The whole machine is turned so the wheel's face looks toward the key light, front left,
// and away from the bright rim light behind on the left, which would flood it and glare
// off the rubber. Everything above is in the machine's own frame, before this turn.
const TURN = 0.75;

// where the weights go on the rim (tireModel's wheel): the flange tips, radius and axial
const FLANGE_R = 0.299, FLANGE_Y = 0.114;

// ---------------------------------------------------------------- the spins
// The wheel's roll is the integral of a speed curve: up over [a, b], flat out to c, down
// to a stop at d, eased with smootherstep. Integrated exactly, so any u lands on the same
// angle however the scroll gets there.
const S = (x: number) => x * x * x * x * (x * (x - 3) + 2.5); // the integral of smootherstep, 0 to x
function spinWindow(a: number, b: number, c: number, d: number) {
  const speed = (u: number) => ramp(u, a, b) * (1 - ramp(u, c, d));
  const dist = (u: number) => {
    const x = clamp01((u - c) / (d - c));
    return (b - a) * S(clamp01((u - a) / (b - a))) + Math.max(0, Math.min(u, c) - b) + (d - c) * (x - S(x));
  };
  return { speed, dist, total: dist(d) };
}
const SPIN1 = spinWindow(0.03, 0.1, 0.29, 0.38); // the measuring spin, out of balance
const SPIN2 = spinWindow(0.645, 0.7, 0.79, 0.86); // the check spin, balanced
const TURNS1 = 7, TURNS2 = 4;
const DIR = -1; // the top of the wheel runs away from the operator
const END = 0.5; // the weights' final place, round from the top toward the back, where the hero sees them square on
/**
 * The wheel's roll at u. The spot where the weights go is theta 0 on the wheel, so it is
 * at the top (roll PI) while the wheel stands between the spins.
 */
const roll = (u: number) =>
  Math.PI + DIR * 2 * Math.PI * TURNS1 * (SPIN1.dist(u) / SPIN1.total - 1) + (DIR * 2 * Math.PI * TURNS2 + END) * (SPIN2.dist(u) / SPIN2.total);
const speedAt = (u: number) => SPIN1.speed(u) + SPIN2.speed(u);
const WOBBLE = 0.038; // radians of shake at full speed, out of balance

// ---------------------------------------------------------------- materials
// fully metallic parts reflect the black studio and vanish; part-metal steel takes the key light as well
const steel = (color: number, roughness: number, metalness = 0.55) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
// dark plastics and paint take less of the studio's overhead softbox, like the tire's rubber
const plastic = (color: number, roughness: number, envMapIntensity = 0.4) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0, roughness, envMapIntensity });

/** A box with rounded edges, its center at the origin. */
const rbox = (w: number, h: number, d: number, r: number, segs = 3) => new RoundedBoxGeometry(w, h, d, segs, r);

/**
 * A turned part: each strip of (radius, height) points is lathed round the y axis with
 * smooth normals along it, and the strips meet with a hard edge, like a machined part.
 */
function turned(strips: [number, number][][], segs: number) {
  return mergeGeometries(strips.map((s) => new THREE.LatheGeometry(s.map(([r, y]) => new THREE.Vector2(r, y)), segs)))!;
}

/** Bend a part made along x round an axis R below it (parallel to z), so a straight bar follows the rim. */
function bend(g: THREE.BufferGeometry, R: number) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), phi = x / R;
    p.setXY(i, (R + y) * Math.sin(phi), (R + y) * Math.cos(phi) - R);
  }
  p.needsUpdate = true;
  return g;
}

/**
 * A clip-on weight's cast body, centered: len along x, 16 mm tall (y), 11 mm thick (z),
 * every edge soft, curved to follow the flange.
 */
function weightBody(len: number) {
  const b = 0.0022, hy = 0.008 - b, hz = 0.0055 - b, cr = 0.0012;
  const s = new THREE.Shape();
  s.moveTo(-hz + cr, -hy);
  s.lineTo(hz - cr, -hy);
  s.quadraticCurveTo(hz, -hy, hz, -hy + cr);
  s.lineTo(hz, hy - cr);
  s.quadraticCurveTo(hz, hy, hz - cr, hy);
  s.lineTo(-hz + cr, hy);
  s.quadraticCurveTo(-hz, hy, -hz, hy - cr);
  s.lineTo(-hz, -hy + cr);
  s.quadraticCurveTo(-hz, -hy, -hz + cr, -hy);
  const g = new THREE.ExtrudeGeometry(s, { depth: len - 2 * b, steps: 12, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 3 });
  g.translate(0, 0, -(len - 2 * b) / 2);
  g.rotateY(Math.PI / 2); // the length along x
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  const m = bend(mergeVertices(g), FLANGE_R - 0.0115);
  m.computeVertexNormals();
  return m;
}

// fixed-seed random numbers, so the tray comes out the same on every build
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

// ---------------------------------------------------------------- the screen
type Readout = {
  status: string;
  tone: string; // the status color
  inn: string;
  out: string;
  arrows: number; // position arrows lit: 0 none, 1 and 2 closing in, 3 in position
  progress?: number; // the measuring bar, 0 to 1
  ok?: boolean;
  foot?: string;
};

const DIM_TXT = "#38525e", LABEL = "#8fb2c2", RED = "#ff4b38", GREEN = "#45e07a", AMBER = "#ffb23e";

/** The balancer's screen for one state, drawn on a 16:10 canvas laid out at 1024 wide. */
function readout(font: string, W: number, s: Readout) {
  const H = Math.round(W * 0.625);
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d")!;
  const k = W / 1024;
  const text = (str: string, x: number, y: number, size: number, weight: number, color: string, align: CanvasTextAlign = "left") => {
    c.font = `${weight} ${size * k}px ${font}`;
    c.fillStyle = color;
    c.textAlign = align;
    c.textBaseline = "middle";
    c.fillText(str, x * k, y * k);
  };
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    c.beginPath();
    c.roundRect(x * k, y * k, w * k, h * k, r * k);
  };
  // the glass: deep blue-black, a little lighter at the top
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0d1a21");
  g.addColorStop(1, "#04080a");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // header: the wheel type and size, and what the machine is doing
  c.fillStyle = "#13242d";
  c.fillRect(0, 0, W, 80 * k);
  text("TRUCK", 34, 41, 32, 800, "#b4cad4");
  text("22.5 × 8.25", 168, 41, 28, 600, "#6f8b98");
  text(s.status, 990, 41, 34, 800, s.tone, "right");
  // the two planes: inner and outer flange
  ([["IN", s.inn], ["OUT", s.out]] as const).forEach(([label, value], i) => {
    const x0 = 30 + i * 488, y0 = 104, w = 476, h = 396;
    rr(x0, y0, w, h, 20);
    c.fillStyle = "#0a1920";
    c.fill();
    c.lineWidth = 3 * k;
    c.strokeStyle = s.ok ? "#1d6b3c" : "#1c3644";
    c.stroke();
    text(label, x0 + 30, y0 + 48, 42, 800, LABEL);
    const blank = value.startsWith("-");
    text(value, x0 + w - 98, y0 + 176, 144, 800, blank ? DIM_TXT : s.ok ? GREEN : "#ffffff", "right");
    text("oz", x0 + w - 28, y0 + 200, 44, 700, LABEL, "right");
    // position arrows: chevrons from each side close in on the bar in the middle
    const cy = y0 + 318, cx = x0 + w / 2;
    if (s.ok) {
      rr(cx - 96, cy - 42, 192, 84, 42);
      c.fillStyle = "#1c9a49";
      c.fill();
      text("OK", cx, cy + 3, 60, 900, "#effff3", "center");
      return;
    }
    const on = s.arrows >= 3 ? GREEN : RED, off = "#16303b";
    for (let j = 0; j < 3; j++) {
      c.fillStyle = j < s.arrows ? on : off;
      for (const side of [-1, 1]) {
        const x = cx + side * (72 + (2 - j) * 46);
        c.beginPath();
        c.moveTo((x - side * 18) * k, (cy - 30) * k);
        c.lineTo((x + side * 10) * k, cy * k);
        c.lineTo((x - side * 18) * k, (cy + 30) * k);
        c.lineTo((x - side * 36) * k, (cy + 30) * k);
        c.lineTo((x - side * 8) * k, cy * k);
        c.lineTo((x - side * 36) * k, (cy - 30) * k);
        c.closePath();
        c.fill();
      }
    }
    c.fillStyle = s.arrows >= 3 ? GREEN : off;
    rr(cx - 9, cy - 38, 18, 76, 6);
    c.fill();
  });
  // footer: progress while measuring, or a line of instruction
  if (s.progress !== undefined) {
    rr(30, 540, 964, 22, 11);
    c.fillStyle = "#13242d";
    c.fill();
    rr(30, 540, 964 * s.progress, 22, 11);
    c.fillStyle = AMBER;
    c.fill();
  }
  if (s.foot) text(s.foot, 512, 592, 30, 700, s.ok ? GREEN : "#9fb7c2", "center");
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// the screen through the animation, in order, with the u each one starts at
const READOUTS: [number, Readout][] = [
  [0, { status: "READY", tone: "#b4cad4", inn: "-.--", out: "-.--", arrows: 0, foot: "SPIN TO MEASURE" }],
  [0.05, { status: "MEASURING", tone: AMBER, inn: "-.--", out: "-.--", arrows: 0, progress: 0.35 }],
  [0.11, { status: "MEASURING", tone: AMBER, inn: "-.--", out: "-.--", arrows: 0, progress: 0.75 }],
  [0.17, { status: "OUT OF BALANCE", tone: RED, inn: "2.50", out: "1.75", arrows: 0, foot: "HEAVY SPOT FOUND" }],
  [0.31, { status: "OUT OF BALANCE", tone: RED, inn: "2.50", out: "1.75", arrows: 1, foot: "FINDING POSITION" }],
  [0.34, { status: "OUT OF BALANCE", tone: RED, inn: "2.50", out: "1.75", arrows: 2, foot: "FINDING POSITION" }],
  [0.37, { status: "IN POSITION", tone: GREEN, inn: "2.50", out: "1.75", arrows: 3, foot: "CLIP WEIGHTS ON AT THE TOP" }],
  [0.65, { status: "CHECKING", tone: AMBER, inn: "-.--", out: "-.--", arrows: 0, progress: 0.6 }],
  [0.72, { status: "BALANCED", tone: GREEN, inn: "0.00", out: "0.00", arrows: 0, ok: true, foot: "RUNS TRUE" }],
];

// ---------------------------------------------------------------- the set
const service: ServiceFactory = async (ctx) => {
  const root = new THREE.Group();
  root.name = "balance";
  const machine = new THREE.Group();
  machine.rotation.y = TURN;
  root.add(machine);
  const segs = ctx.small ? 48 : 80;

  // ---------------------------------------------------------------- the cabinet
  const powder = new THREE.MeshStandardMaterial({ color: 0x1f2227, roughness: 0.48, metalness: 0.12, envMapIntensity: 0.6 });
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.52, metalness: 0.12, envMapIntensity: 0.6 });
  const trim = plastic(0x0b0b0c, 0.82);
  const tray = plastic(0x17181b, 0.86);
  const red = plastic(0x9e0e14, 0.45);
  const zinc = steel(0x7d8186, 0.5, 0.5); // dull zinc
  const clipMat = steel(0xa4a9ae, 0.32, 0.6);
  const shaftMat = steel(0xd6d9dc, 0.16, 0.62);
  const darkSteel = steel(0x232527, 0.45, 0.45);
  const coneMat = steel(0x8f9499, 0.3, 0.55);

  const cab = new THREE.Group();
  cab.name = "balance-cabinet";
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = cab) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  // a dark plinth, the body, and a molded top deck that overhangs it a little
  add(rbox(CAB.w - 0.04, 0.06, CAB.d - 0.04, 0.012, 2), trim, CX, 0.03, 0);
  add(rbox(CAB.w, 0.9, CAB.d, 0.04), powder, CX, 0.51, 0);
  add(rbox(CAB.w + 0.04, 0.05, CAB.d + 0.04, 0.022), trim, CX, DECK - 0.025, 0);
  // the front: an inset panel with a red pinstripe across its top
  add(rbox(CAB.w - 0.12, 0.7, 0.01, 0.012, 2), panelMat, CX, 0.5, CAB.d / 2 + 0.002);
  add(new THREE.BoxGeometry(CAB.w - 0.12, 0.012, 0.006), red, CX, 0.885, CAB.d / 2 + 0.004);
  // the foot pedal that locks the shaft
  const pedal = add(rbox(0.17, 0.026, 0.11, 0.008, 2), trim, CX - 0.2, 0.05, CAB.d / 2 + 0.05);
  pedal.rotation.x = 0.12;
  // pegs on the front with spare cones on them, big to small
  [[0.075, CX + 0.05], [0.062, CX + 0.2], [0.05, CX + 0.33]].forEach(([r, x]) => {
    const peg = new THREE.CylinderGeometry(0.011, 0.011, 0.11, 20).rotateX(Math.PI / 2);
    add(peg, shaftMat, x, 0.7, CAB.d / 2 + 0.055);
    const cone = turned([
      [[0.016, 0.0], [r, 0.0]],
      [[r, 0.0], [r, 0.008]],
      [[r, 0.008], [r * 0.55, 0.05]],
      [[r * 0.55, 0.05], [0.016, 0.05]],
    ], 48).rotateX(Math.PI / 2);
    add(cone, coneMat, x, 0.7, CAB.d / 2 + 0.035);
  });
  // where the shaft comes out of the side: a round housing
  const boss = turned([[[0.09, 0], [0.09, 0.035]], [[0.09, 0.035], [0.07, 0.05]], [[0.07, 0.05], [0.03, 0.05]]], segs).rotateZ(Math.PI / 2);
  add(boss, darkSteel, FACE, SHAFT, 0);
  machine.add(cab);

  // the weight tray on the deck: a dozen compartments with loose weights in them
  const TRAY = { x: CX - 0.1, z: 0.13, w: 0.6, d: 0.25, h: 0.028, t: 0.008 };
  const trayParts: THREE.BufferGeometry[] = [new THREE.BoxGeometry(TRAY.w, 0.006, TRAY.d).translate(0, 0.003, 0)];
  for (let i = 0; i <= 6; i++) trayParts.push(new THREE.BoxGeometry(TRAY.t, TRAY.h, TRAY.d).translate(-TRAY.w / 2 + (i * TRAY.w) / 6, TRAY.h / 2, 0));
  for (const z of [-TRAY.d / 2, 0, TRAY.d / 2]) trayParts.push(new THREE.BoxGeometry(TRAY.w + TRAY.t, TRAY.h, TRAY.t).translate(0, TRAY.h / 2, z));
  add(mergeGeometries(trayParts)!, tray, TRAY.x, DECK, TRAY.z);
  const rand = rng(31);
  const loose: THREE.Matrix4[] = [];
  const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
    const size = 0.7 + ((i * 2 + j) % 5) * 0.14; // each compartment holds one size
    const n = 2 + Math.floor(rand() * 3);
    for (let m = 0; m < n; m++) {
      const cx = TRAY.x - TRAY.w / 2 + (i + 0.5) * (TRAY.w / 6), cz = TRAY.z + (j - 0.5) * (TRAY.d / 2);
      // lying in rows across the compartment, as they get dropped back in
      p.set(cx + (rand() - 0.5) * 0.012, DECK + 0.0115 + (rand() < 0.2 ? 0.006 : 0), cz + (m - (n - 1) / 2) * 0.022 + (rand() - 0.5) * 0.004);
      e.set(-Math.PI / 2 + (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.3 + (rand() < 0.5 ? Math.PI : 0), 0, "YXZ");
      loose.push(new THREE.Matrix4().compose(p, q.setFromEuler(e), sc.set(size, 1, 1)));
    }
  }
  // (plain soft boxes: at this distance the curve of a weight doesn't show)
  const trayWeights = new THREE.InstancedMesh(rbox(0.05, 0.016, 0.011, 0.0025, 1), zinc, loose.length);
  loose.forEach((mx, i) => trayWeights.setMatrixAt(i, mx));
  trayWeights.instanceMatrix.needsUpdate = true;
  trayWeights.computeBoundingSphere();
  cab.add(trayWeights);

  // the display head on a short stalk
  add(rbox(0.07, 0.3, 0.07, 0.012, 2), trim, HEAD.x, DECK + 0.15, HEAD.z - 0.02);
  const head = new THREE.Group();
  head.name = "balance-head";
  head.position.copy(HEAD);
  head.rotation.set(HEAD_TILT, HEAD_YAW, 0, "YXZ");
  cab.add(head);
  add(rbox(0.54, 0.4, 0.08, 0.026), trim, 0, 0, 0, head);
  const SW = 0.46, SH = SW * 0.625;
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 1.05, roughness: 0.12, metalness: 0, envMapIntensity: 0.6 });
  const screen = add(new THREE.PlaneGeometry(SW, SH), screenMat, 0, 0.03, 0.0405, head);
  screen.name = "balance-screen";
  // a row of keys under the screen
  for (let i = 0; i < 6; i++) {
    const key = add(new THREE.CylinderGeometry(0.011, 0.011, 0.006, 20).rotateX(Math.PI / 2), i === 5 ? steel(0x1e8a45, 0.4, 0.2) : darkSteel, -0.15 + i * 0.06, -0.163, 0.041, head);
    key.castShadow = false;
  }
  await ctx.nextTask();

  // ---------------------------------------------------------------- the wheel on its shaft
  // The shaft, wheel and everything clamped to them hang from the bearing in the cabinet's
  // side (the rotor), which is what shakes when the wheel is out of balance.
  const rotor = new THREE.Group();
  rotor.name = "balance-rotor";
  rotor.position.set(FACE, SHAFT, 0);
  machine.add(rotor);
  const tire = ctx.newTire("steer", { brand: true });
  // it hangs in the air, so lose the contact shadow it came with
  for (const c of [...tire.pivot.children]) if (c !== tire.group) tire.pivot.remove(c);
  tire.pivot.position.set(WX - FACE, -tire.radius, 0);
  tire.pivot.rotation.y = -Math.PI / 2; // outboard face to -x
  rotor.add(tire.pivot);
  const spin = tire.spin;
  // the wheel's own parts, in the order tireModel builds them: the hub cap comes off so
  // the shaft can go through the center bore; the sidewall's lettering blurs at speed
  const parts = spin.children as THREE.Mesh[];
  const hubCap = parts[6];
  if ((hubCap.material as THREE.MeshStandardMaterial).color.getHex() === 0x2a2a2a) hubCap.visible = false;
  // the inner sidewall faces the bright rim light behind; plain rubber with less sheen keeps it dark
  const innerWall = parts[3];
  innerWall.material = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0c, roughness: 0.9, specularIntensity: 0.35, envMapIntensity: 0.2 });
  ctx.dimmable(innerWall, tire.light);
  const sidewall = parts.find((m) => (m.material as THREE.MeshStandardMaterial).bumpScale === 6)?.material as THREE.MeshStandardMaterial | undefined;
  await ctx.nextTask();

  // in the tire's frame: the axle is y, outboard +y; the cabinet's side is at -AX
  const AX = FACE - WX;
  const shaftParts: [THREE.BufferGeometry, THREE.Material][] = [
    // the shaft from the bearing to past the nut
    [new THREE.CylinderGeometry(0.02, 0.02, AX + 0.1, 32).translate(0, (0.1 - AX) / 2, 0), shaftMat],
    // the collar at the bearing and the backing flange the wheel's mounting face sits on
    [turned([[[0.045, -AX], [0.045, -AX + 0.035]], [[0.045, -AX + 0.035], [0.02, -AX + 0.035]]], segs), darkSteel],
    [turned([[[0.03, -0.06], [0.03, 0.02]], [[0.03, 0.02], [0.12, 0.03]], [[0.12, 0.03], [0.12, 0.052]], [[0.12, 0.052], [0.02, 0.052]]], segs), darkSteel],
    // the threaded end the nut runs on
    [turned([Array.from({ length: 41 }, (_, i): [number, number] => [i % 2 ? 0.0212 : 0.0188, 0.1 + i * 0.0026])], 24), shaftMat],
    // the centering cone, seated in the wheel's center bore from the outside
    [turned([
      [[0.022, 0.046], [0.084, 0.046]],
      [[0.084, 0.046], [0.11, 0.074], [0.128, 0.093]],
      [[0.128, 0.093], [0.128, 0.102]],
      [[0.128, 0.102], [0.06, 0.102]],
      [[0.06, 0.102], [0.06, 0.104]],
      [[0.06, 0.104], [0.022, 0.104]],
    ], segs), coneMat],
  ];
  for (const [g, m] of shaftParts) add(g, m, 0, 0, 0, spin);
  // the quick-release wing nut: a turned body and two handles with red grips
  const nutBody = turned([
    [[0.024, 0.104], [0.062, 0.104]],
    [[0.062, 0.104], [0.062, 0.112]],
    [[0.062, 0.112], [0.05, 0.12]],
    [[0.05, 0.12], [0.044, 0.172]],
    [[0.044, 0.172], [0.034, 0.18], [0.024, 0.181]],
  ], segs);
  add(nutBody, steel(0xa3a7ac, 0.26, 0.6), 0, 0, 0, spin);
  const wingMat = steel(0x2d3034, 0.42, 0.35);
  const gripMat = red.clone();
  for (const side of [-1, 1]) {
    add(rbox(0.1, 0.018, 0.03, 0.007), wingMat, side * 0.085, 0.15, 0, spin);
    add(rbox(0.04, 0.024, 0.036, 0.01), gripMat, side * 0.13, 0.15, 0, spin);
  }

  // ---------------------------------------------------------------- blur at speed
  // A wheel spinning at several turns a second is a blur to a camera: the tread smooths
  // into a band, the holes in the disc and the nuts fill in, the lettering goes. These
  // shells over the wheel fade in with the speed and hide the detail that would strobe.
  const { A, RHO } = DIM;
  const R0 = DIM.RO - DEPTH.steer;
  const band: THREE.Vector2[] = [];
  const vMax = A + RHO * 1.2;
  for (let i = 0; i <= 32; i++) {
    const v = -vMax + (2 * vMax * i) / 32;
    if (Math.abs(v) <= A) band.push(new THREE.Vector2(treadRadius("steer", false, v) + 0.0009, v));
    else {
      const phi = (Math.abs(v) - A) / RHO, sg = Math.sign(v), rr = RHO + DEPTH.steer + 0.0009;
      band.push(new THREE.Vector2(R0 - RHO + rr * Math.cos(phi), sg * (A + rr * Math.sin(phi))));
    }
  }
  const blurMats: THREE.Material[] = [];
  const blurMat = (base: THREE.MeshStandardMaterial) => {
    const m = base.clone();
    m.transparent = true;
    m.depthWrite = false;
    m.opacity = 0;
    blurMats.push(m);
    return m;
  };
  const treadBlur = blurMat(new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.86, metalness: 0, envMapIntensity: 0.28 }));
  add(new THREE.LatheGeometry(band, 128), treadBlur, 0, 0, 0, spin);
  const discBlur = blurMat(new THREE.MeshStandardMaterial({ color: 0xdcdcdc, metalness: 1, roughness: 0.2, envMapIntensity: 1.3 }));
  add(new THREE.RingGeometry(0.15, 0.229, 96).rotateX(-Math.PI / 2).translate(0, 0.0755, 0), discBlur, 0, 0, 0, spin);
  const nutBlur = blurMat(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08, envMapIntensity: 1.4 }));
  add(turned([[[0.161, 0.07], [0.161, 0.097]], [[0.161, 0.097], [0.125, 0.097]]], 96), nutBlur, 0, 0, 0, spin);
  const wingBlur = blurMat(wingMat);
  add(new THREE.RingGeometry(0.044, 0.15, 64).rotateX(-Math.PI / 2).translate(0, 0.15, 0), wingBlur, 0, 0, 0, spin);
  for (const m of [wingMat, gripMat]) m.transparent = true;

  // ---------------------------------------------------------------- the weights
  // A frame at each flange tip at the spot (theta 0 on the wheel): +x along the rim, +y
  // out from the axle, +z out of the wheel, away from its middle. The weight sits on the
  // flange's outer face with its spring clip hooked over the tip.
  const weights: THREE.Group[] = [];
  for (const [side, len] of [[-1, 0.065], [1, 0.05]] as const) {
    const n = new THREE.Vector3(0, 0, 1);
    const a = new THREE.Vector3(0, side, 0);
    const t = new THREE.Vector3().crossVectors(n, a);
    const site = new THREE.Group();
    site.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(t, n, a));
    site.position.set(0, side * FLANGE_Y, FLANGE_R);
    spin.add(site);
    const w = new THREE.Group();
    w.name = side < 0 ? "balance-weight-in" : "balance-weight-out";
    add(weightBody(len), zinc, 0, -0.0115, 0.0085, w);
    add(new THREE.BoxGeometry(0.012, 0.0012, 0.019), clipMat, 0, 0.0031, 0.0005, w);
    add(new THREE.BoxGeometry(0.012, 0.0085, 0.0012), clipMat, 0, -0.0006, 0.0094, w);
    add(new THREE.BoxGeometry(0.012, 0.011, 0.0012), clipMat, 0, -0.0018, -0.0084, w);
    site.add(w);
    weights.push(w);
  }
  const [weightIn, weightOut] = weights;

  // ---------------------------------------------------------------- shadows
  const floorShadow = ctx.contact(1.3, 0.95);
  floorShadow.position.x = CX;
  const wheelShadow = ctx.contact(0.75, 1.35);
  wheelShadow.material = (wheelShadow.material as THREE.MeshBasicMaterial).clone();
  (wheelShadow.material as THREE.MeshBasicMaterial).opacity = 0.55;
  wheelShadow.position.x = WX + 0.05;
  machine.add(floorShadow, wheelShadow);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m === floorShadow || m === wheelShadow) return;
    m.castShadow = !blurMats.includes(m.material as THREE.Material) && m !== screen;
    m.receiveShadow = true;
  });

  // ---------------------------------------------------------------- the screen's states
  const texW = ctx.small ? 640 : 1024;
  const screens: [number, THREE.Texture][] = [];
  for (const [u0, r] of READOUTS) {
    screens.push([u0, readout(ctx.font, texW, r)]);
    await ctx.nextTask();
  }

  // a weight comes in from the side, settles over the flange tip and is pressed home
  function place(w: THREE.Group, u: number, t0: number, side: number) {
    const come = ramp(u, t0, t0 + 0.05), press = ramp(u, t0 + 0.05, t0 + 0.07);
    w.visible = u > t0;
    const r = 1 - come;
    // (+x along the rim is toward the front on the outer flange, the back on the inner)
    w.position.set(0.03 * side * r, 0.012 + 0.16 * r - 0.012 * press - 0.0012 * Math.sin(Math.PI * press), 0.004 + 0.07 * r * r - 0.004 * press);
    w.rotation.set(0.6 * r, -0.3 * side * r, 0.2 * side * r);
  }

  function update(u: number, fade = 1) {
    // the tire came with its own light level, so it fades with the set by hand
    tire.light.value = fade;
    const r = roll(u);
    spin.rotation.y = r;
    // out of balance, the shaft shakes round with the wheel; balanced, it runs true
    const shake = WOBBLE * SPIN1.speed(u);
    rotor.rotation.set(0, shake * Math.sin(r + 0.7), shake * Math.cos(r + 0.7));
    // the blur comes in with the speed
    const blur = smootherstep(clamp01((speedAt(u) - 0.2) / 0.6));
    treadBlur.opacity = 0.9 * blur;
    discBlur.opacity = 0.5 * blur;
    nutBlur.opacity = 0.45 * blur;
    wingBlur.opacity = 0.4 * blur;
    wingMat.opacity = gripMat.opacity = 1 - 0.8 * blur;
    if (sidewall) sidewall.bumpScale = 6 * (1 - blur);
    // the weights: the inner one first, then the outer
    place(weightOut, u, 0.445, 1);
    place(weightIn, u, 0.565, -1);
    // the screen
    let tex = screens[0][1];
    for (const [u0, t] of screens) if (u >= u0) tex = t;
    screenMat.emissiveMap = tex;
  }
  update(0);

  // ---------------------------------------------------------------- the camera
  // keys are worked out in the machine's own frame (shaft along -x), then turned with it
  const Y = new THREE.Vector3(0, 1, 0);
  const V = (x: number, y: number, z: number): Vec3 => new THREE.Vector3(x, y, z).applyAxisAngle(Y, TURN).toArray();
  // a camera looking at a point from a direction, some distance off, in the machine's frame
  const look = (at: THREE.Vector3, dir: [number, number, number], dist: number, fov: number) => {
    const cam = new THREE.Vector3(...dir).normalize().multiplyScalar(dist).add(at);
    return { cam: V(cam.x, cam.y, cam.z), tgt: V(at.x, at.y, at.z), fov };
  };
  const top = SHAFT + FLANGE_R - 0.015; // just under the flange tips at the top of the wheel
  const inner = new THREE.Vector3(WX + 0.12, top, 0), outer = new THREE.Vector3(WX - 0.12, top, 0);
  // a medium shot of the machine from the front left, the subject right of center; phones
  // see it from further back along the same line, centered on wheel and cabinet together
  const medium = (t: number, cam: Vec3, tgt: Vec3, ease?: "pass"): CameraKey => {
    const mid = new THREE.Vector3(-0.1, tgt[1] + 0.02, tgt[2]);
    const back = new THREE.Vector3(...cam).sub(new THREE.Vector3(...tgt)).multiplyScalar(2.2).add(mid);
    return {
      t, cam: V(...cam), tgt: V(...tgt), fov: 30, frame: FRAMES.right, ease,
      tall: { cam: V(back.x, back.y, back.z), tgt: V(mid.x, mid.y, mid.z), fov: 30 },
    };
  };
  const up = (v: THREE.Vector3, dy: number) => v.clone().setY(v.y + dy);
  const keys: CameraKey[] = [
    // the whole machine from the front left, drifting up while the wheel spins
    { t: 0, cam: V(-2.3, 1.45, 2.75), tgt: V(-0.03, 0.8, 0), fov: 30, frame: FRAMES.right },
    medium(0.14, [-2.2, 1.52, 2.66], [-0.03, 0.86, 0], "pass"),
    medium(0.26, [-2.1, 1.6, 2.56], [-0.06, 0.94, 0], "pass"),
    // the top of the wheel and the screen as it stops: how much weight, and where
    medium(0.37, [-1.98, 1.72, 2.45], [-0.06, 1.02, -0.02]),
    // in close on the top of the rim from outside, where the outer weight goes on...
    { t: 0.445, ...look(outer, [-0.62, 0.46, 0.64], 0.74, 30), frame: FRAMES.close, tall: look(up(outer, 0.05), [-0.62, 0.46, 0.64], 0.95, 32) },
    { t: 0.515, ...look(outer, [-0.6, 0.47, 0.66], 0.7, 30), frame: FRAMES.close, tall: look(up(outer, 0.05), [-0.6, 0.47, 0.66], 0.9, 32) },
    // ...up over the wheel, looking down on it and the gap beside the cabinet...
    { t: 0.545, cam: V(-0.3, 2.4, 0.95), tgt: V(-0.22, 1.05, 0), fov: 30, frame: FRAMES.close, ease: "pass" },
    // ...and down on the inner flange from above the cabinet
    { t: 0.575, ...look(inner, [0.62, 0.52, 0.6], 0.62, 30), frame: FRAMES.close, tall: look(inner, [0.62, 0.52, 0.6], 0.85, 32) },
    { t: 0.635, ...look(inner, [0.6, 0.5, 0.64], 0.6, 30), frame: FRAMES.close, tall: look(inner, [0.6, 0.5, 0.64], 0.82, 32) },
    // up and back out to watch it spin, smooth now, and read the screen
    medium(0.69, [-1.0, 2.4, 2.9], [-0.06, 1.0, -0.05], "pass"),
    medium(0.77, [-2.05, 1.55, 2.62], [-0.04, 0.9, 0], "pass"),
    medium(0.88, [-2.2, 1.3, 2.66], [-0.03, 0.84, 0], "pass"),
    // the hero: low, the balanced wheel and the machine
    { t: 1, cam: V(-2.25, 1.08, 2.6), tgt: V(-0.03, 0.78, 0), fov: 30, frame: FRAMES.right },
  ];
  const focus = V(-0.2, 0.85, 0);

  return {
    root,
    keys,
    focus: [focus[0], focus[1]],
    update,
    rest: () => update(0),
  };
};

export default service;
