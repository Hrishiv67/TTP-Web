/**
 * New tires, on the lineup's fresh TTP Tire steer tire: straight from the mold, its
 * tread still bristling with vent spews (the little rubber hairs the mold's air vents
 * leave) and a paper label wrapped across it. The camera starts low along the tread
 * with the hairs lit from behind while the tire rolls the label up into view, holds on
 * the label and the crisp, deep tread, then pulls back to a three-quarter hero.
 */
import * as THREE from "three";
import { LINEUP, LINEUP_YAW } from "../sequence";
import { FRAMES, ramp, type CameraKey } from "../shots";
import { DEPTH, DIM, treadRadius } from "../tireModel";
import type { ServiceFactory } from "./types";

const X = LINEUP.fresh.x;
const KIND = LINEUP.fresh.kind;
// turned so the tread's front face looks into the key light and the camera, facing it,
// looks away from the rest of the lineup out in the dark; then back round for the hero
const YAW = 1.25;
const YAW_END = 0.4;
// the label's middle on the tire (see tireModel's angles): low on the tread's front face
// in the lineup, rolled ROLL further up it while it's read
const THETA_L = Math.PI * 1.5 + 0.2;
const ROLL = 0.7;
const ARC = 0.98; // the label's length around the tread, radians (about 56 degrees)
const HALF = 0.08; // half its width across the tread, meters
const LIFT = 0.0012; // paper over the block tops
const SAG = 0.0007; // how far it dips over a groove

// the steer tread's layout (tireModel): four zig-zag grooves, one zig-zag per shoulder block
const R0 = DIM.RO - DEPTH[KIND];
const PITCHES = 64;
const PITCH = (2 * Math.PI * R0) / PITCHES;
const GROOVES = [-0.066, -0.026, 0.026, 0.066];
const GW = 0.011;
const zig = (u: number) => {
  const t = (((u / PITCH) % 1) + 1) % 1;
  return 0.0032 * (t < 0.5 ? t * 4 - 1 : 3 - t * 4);
};

// fixed-seed random numbers, so the hairs come out the same on every build
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

/** How far the paper dips at (theta, y): a little over each groove, following its zig-zag. */
function sag(theta: number, y: number) {
  const z = zig(theta * R0);
  let s = 0;
  for (const g of GROOVES) {
    const d = Math.abs(y - g - z);
    if (d < GW / 2) s = Math.max(s, Math.cos((Math.PI * d) / GW) ** 2);
  }
  return s * SAG;
}

/**
 * The label: a strip on the block tops over [theta0, theta0 + ARC], -HALF to HALF across.
 * Texture s runs across the tread (outboard to the right, seen from in front of the
 * tread) and t along it from the end nearer the top, so the artwork reads upright on the
 * tread's front face.
 */
function labelGeometry(theta0: number, segs: number, rows: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const th = theta0 + (i / segs) * ARC;
    for (let j = 0; j <= rows; j++) {
      const y = -HALF + (j / rows) * 2 * HALF;
      const r = treadRadius(KIND, false, y) + LIFT - sag(th, y);
      pos.push(r * Math.sin(th), y, r * Math.cos(th));
      uv.push(j / rows, i / segs);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < rows; j++) {
    const a = i * (rows + 1) + j, b = a + rows + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1); // facing outward
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The label's artwork, laid out in millimeters on a W x H canvas (160 by about 507 mm). */
function labelTexture(font: string, W: number, H: number) {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d")!;
  const mm = W / 160;
  const LEN = H / mm;
  const rand = rng(7);
  // paper, faintly mottled
  c.fillStyle = "#d9d6cd";
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < W * H * 0.004; i++) {
    c.fillStyle = rand() < 0.5 ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.5)";
    c.fillRect(rand() * W, rand() * H, 1 + rand() * 2, 1 + rand() * 2);
  }
  const red = "#940b14", ink = "#16171a";
  // text fitted into a width, centered at x (mm)
  const text = (s: string, x: number, y: number, size: number, weight: number, color: string, maxW = 144, spacing = 0) => {
    c.save();
    c.fillStyle = color;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `${weight} ${size * mm}px ${font}`;
    c.letterSpacing = `${spacing * mm}px`;
    const w = c.measureText(s).width;
    const k = Math.min(1, (maxW * mm) / w);
    c.translate(x * mm, y * mm);
    c.scale(k, 1);
    c.fillText(s, 0, 0);
    c.restore();
  };
  const rule = (y: number, h: number, color: string, x0 = 8, x1 = 152) => {
    c.fillStyle = color;
    c.fillRect(x0 * mm, y * mm, (x1 - x0) * mm, h * mm);
  };
  // the red band with the brand
  rule(12, 96, red, 0, 160);
  text("TTP TIRE", 80, 50, 40, 900, "#fff", 140);
  rule(76, 0.8, "rgba(255,255,255,0.7)", 22, 138);
  text("COMMERCIAL TRUCK RADIAL", 80, 90, 7.2, 700, "#fff", 128, 0.9);
  // what it is
  text("STEER  ·  ALL POSITION", 80, 124, 7.5, 700, ink, 140, 1.2);
  text("295/75R22.5", 80, 158, 30, 900, ink, 146);
  text("18PR  LOAD RANGE H", 80, 190, 11, 800, ink, 146);
  text("146/143L   TUBELESS", 80, 208, 7.5, 600, "#3a3b3f", 140, 0.6);
  rule(222, 1.2, red);
  // a little drawing of the tread: four zig-zag grooves
  c.strokeStyle = ink;
  c.lineWidth = 2.2 * mm;
  c.lineJoin = "miter";
  for (const gx of [-0.066, -0.026, 0.026, 0.066]) {
    c.beginPath();
    for (let k = 0; k <= 8; k++) c.lineTo((80 + gx * 520 + (k % 2 ? 3 : -3)) * mm, (236 + k * 7.5) * mm);
    c.stroke();
  }
  c.lineWidth = 1.2 * mm;
  c.strokeRect(36 * mm, 232 * mm, 88 * mm, 68 * mm);
  // barcode and its number
  const bx0 = 22, bx1 = 138, by = 318, bh = 52;
  let x = bx0;
  const bars: [number, number][] = [];
  const unit = (bx1 - bx0) / 190; // narrowest bar
  for (const g of [2, 1, 1, 2]) bars.push([g, 1]); // start guard
  while (x < bx1 - 12 * unit) {
    const bw = 1 + Math.floor(rand() * 4), gap = 1 + Math.floor(rand() * 3);
    bars.push([bw, gap]);
    x += (bw + gap) * unit;
  }
  x = bx0;
  c.fillStyle = ink;
  for (const [bw, gap] of bars) {
    if (x + bw * unit > bx1) break;
    c.fillRect(x * mm, by * mm, bw * unit * mm, bh * mm);
    x += (bw + gap) * unit;
  }
  text("0  84712  29575  6", 80, by + bh + 7, 7, 600, ink, 120, 0.8);
  text("TT4R 22S  ·  DOT  2026", 80, by + bh + 20, 6, 600, "#4a4b50", 120, 0.6);
  // a closing band at the far end
  rule(LEN - 34, 22, red, 0, 160);
  text("TTP TIRE", 80, LEN - 23, 11, 900, "#fff", 120, 2);
  // die-cut with rounded corners: everything outside goes transparent
  const cr = 7 * mm;
  c.globalCompositeOperation = "destination-in";
  c.beginPath();
  c.moveTo(cr, 0);
  c.arcTo(W, 0, W, H, cr);
  c.arcTo(W, H, 0, H, cr);
  c.arcTo(0, H, 0, 0, cr);
  c.arcTo(0, 0, W, 0, cr);
  c.closePath();
  c.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false; // canvas row 0 is t = 0, the end nearer the top
  tex.anisotropy = 8;
  return tex;
}

/** Paper fiber, for the label's bump map: soft speckle, tiled. */
function paperGrain() {
  const n = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = n;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#808080";
  c.fillRect(0, 0, n, n);
  const rand = rng(99);
  for (let i = 0; i < n * n * 0.08; i++) {
    const v = rand() < 0.5 ? 60 : 200;
    c.fillStyle = `rgba(${v},${v},${v},0.18)`;
    c.fillRect(rand() * n, rand() * n, 1 + rand() * 3, 1 + rand() * 1.5);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 10);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** A hair along +y, base at the origin: a thin tapered cylinder, slightly bent. Scaled to length per instance. */
function hairGeometry() {
  const g = new THREE.CylinderGeometry(0.00017, 0.00035, 1, 6, 4, true).translate(0, 0.5, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + 0.0011 * p.getY(i) ** 2);
  g.computeVertexNormals();
  return g;
}

/**
 * Thin rubber hairs glow when a light shines through them from behind, which a plain
 * cylinder can't do (a rim light behind it only grazes its far side). This adds that
 * glow for the studio's two rim lights: strongest looking straight into a light, and
 * only for hairs the light can reach, judged by which way each hair stands out of the
 * tire (a hair on the near face of the tread is in the tire's shadow).
 */
function backlit(mat: THREE.MeshStandardMaterial, strength = 1.6) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uBack = { value: new THREE.Color(0.92, 0.96, 1).multiplyScalar(strength) };
    shader.vertexShader = "varying vec3 vHairWorld;\nvarying vec3 vHairAxis;\n" + shader.vertexShader.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      {
        mat4 hm = modelMatrix;
        #ifdef USE_INSTANCING
          hm = hm * instanceMatrix;
        #endif
        vHairWorld = (hm * vec4(transformed, 1.0)).xyz;
        vHairAxis = (hm * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
      }`,
    );
    shader.fragmentShader = "uniform vec3 uBack;\nvarying vec3 vHairWorld;\nvarying vec3 vHairAxis;\n" + shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `{
        // looking into the two rim lights behind the subject (studio.ts), the right one
        // brighter; their beams and the strip boxes reflected round them are wide and reach
        // higher than the lamps, so a hair still catches them a little past the top
        vec3 toEye = normalize(cameraPosition - vHairWorld);
        vec3 ax = normalize(vHairAxis);
        const vec3 L1 = vec3(0.537, 0.427, -0.727), H1 = vec3(0.45, 0.65, -0.6);
        const vec3 L2 = vec3(-0.719, 0.31, -0.621), H2 = vec3(-0.6, 0.6, -0.52);
        float glow = pow(max(0.0, dot(-toEye, L1)), 6.0) * smoothstep(-0.35, 0.15, dot(ax, H1))
          + 0.6 * pow(max(0.0, dot(-toEye, L2)), 6.0) * smoothstep(-0.35, 0.15, dot(ax, H2));
        // and only where the hair stands against the light, out at the tire's edge: one on
        // the face turned toward us has the tire between it and the lamps
        glow *= smoothstep(0.4, 0.05, dot(ax, toEye));
        float edge = 1.0 - abs(dot(normal, normalize(vViewPosition)));
        outgoingLight += uBack * glow * (0.4 + 0.6 * edge);
      }
      #include <opaque_fragment>`,
    );
  };
  mat.customProgramCacheKey = () => "ttp-new-hairs";
  return mat;
}

const service: ServiceFactory = async (ctx) => {
  const tire = ctx.lineup.fresh;

  // ---------------------------------------------------------------- the label
  const W = ctx.small ? 512 : 640; // about 2000 long
  const H = Math.min(ctx.maxTexture, Math.round((W * ARC * (R0 + DEPTH[KIND])) / (2 * HALF)));
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTexture(ctx.font, W, H), alphaTest: 0.5, roughness: 0.6, metalness: 0, envMapIntensity: 0.6,
    bumpMap: paperGrain(), bumpScale: 0.25,
  });
  const label = new THREE.Mesh(labelGeometry(THETA_L - ARC / 2, ctx.small ? 120 : 200, ctx.small ? 80 : 128), labelMat);
  label.name = "new-label";
  label.receiveShadow = true;
  tire.spin.add(label);
  await ctx.nextTask();

  // ---------------------------------------------------------------- the vent spews
  // a few on every pitch of the tread: on the three ribs and the shoulder blocks, and
  // now and then round on the shoulder itself; none under the label
  const rand = rng(1234);
  const spots: { theta: number; v: number }[] = [];
  const slot = 0.004;
  for (let p = 0; p < PITCHES; p++) {
    const at = (f: number) => (p + f) * PITCH; // arc length along the tread
    const put = (u: number, v: number) => spots.push({ theta: u / R0, v });
    // middle rib, one or two
    for (let k = 0; k < (rand() < 0.75 ? 2 : 1); k++) {
      const u = at(0.1 + rand() * 0.8);
      put(u, zig(u) + (rand() - 0.5) * 0.03);
    }
    // the two side ribs
    for (const side of [-1, 1]) {
      if (rand() < 0.95) {
        const u = at(0.1 + rand() * 0.8);
        put(u, side * 0.046 + zig(u) + (rand() - 0.5) * 0.018);
      }
      // the shoulder block's flat top
      if (rand() < 0.9) {
        const u = at(0.15 + rand() * (0.7 - slot / PITCH));
        put(u, side * (0.084 + rand() * 0.01) + zig(u) * 0.3);
      }
      // round on the shoulder
      if (rand() < 0.3) {
        const u = at(0.15 + rand() * (0.7 - slot / PITCH));
        put(u, side * (0.104 + rand() * 0.022));
      }
    }
  }
  const keep = spots.filter(({ theta, v }) => {
    const d = Math.abs(((theta - THETA_L + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    return !(d < ARC / 2 + 0.015 && Math.abs(v) < HALF + 0.004);
  });
  const hairMat = backlit(new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.42, metalness: 0, envMapIntensity: 0.6 }));
  const hairs = new THREE.InstancedMesh(hairGeometry(), hairMat, keep.length);
  hairs.name = "new-hairs";
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), tilt = new THREE.Quaternion(), turn = new THREE.Quaternion();
  const pos = new THREE.Vector3(), nrm = new THREE.Vector3(), scl = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  const { A, RHO } = DIM;
  keep.forEach(({ theta, v }, i) => {
    const s = Math.sin(theta), c = Math.cos(theta);
    let rad: number, y: number, nr = 1, ny = 0;
    if (Math.abs(v) <= A) {
      rad = treadRadius(KIND, false, v);
      y = v;
    } else {
      // round the shoulder: the crown's arc (tireModel), block tops a tread depth out
      const phi = (Math.abs(v) - A) / RHO, sg = Math.sign(v);
      nr = Math.cos(phi);
      ny = sg * Math.sin(phi);
      rad = R0 - RHO + RHO * nr + DEPTH[KIND] * nr;
      y = sg * (A + RHO * Math.sin(phi)) + DEPTH[KIND] * ny;
    }
    nrm.set(nr * s, ny, nr * c);
    pos.set(rad * s, y, rad * c).addScaledVector(nrm, -0.0005); // rooted in the rubber
    q.setFromUnitVectors(Y, nrm);
    tilt.setFromAxisAngle(new THREE.Vector3(rand() - 0.5, 0, rand() - 0.5).normalize(), rand() * 0.3);
    turn.setFromAxisAngle(Y, rand() * Math.PI * 2);
    q.multiply(tilt).multiply(turn);
    scl.set(1, 0.005 + rand() * 0.003, 1);
    hairs.setMatrixAt(i, m.compose(pos, q, scl));
  });
  hairs.instanceMatrix.needsUpdate = true;
  hairs.computeBoundingSphere();
  hairs.receiveShadow = true;
  tire.spin.add(hairs);

  // a frame at the middle of the label: +x across the tread toward the outboard side,
  // +y out of the tread, +z along it (down the tread's front face, once rolled into place)
  const n = new THREE.Vector3(Math.sin(THETA_L), 0, Math.cos(THETA_L));
  const a = new THREE.Vector3(0, 1, 0);
  const t = new THREE.Vector3().crossVectors(a, n);
  const R = treadRadius(KIND, false, 0);
  const site = new THREE.Group();
  site.name = "new-site";
  site.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, n, t));
  site.position.copy(n).multiplyScalar(R);
  tire.spin.add(site);

  // the props never change: the label and the hairs are just how a new tire looks
  function update() {}

  // camera positions are worked out in the label's own frame, with the tire in its
  // final pose, then turned into scene coordinates
  const pivot = tire.pivot;
  const saved = { yaw: pivot.rotation.y, x: pivot.position.x, roll: tire.spin.rotation.y };
  pivot.rotation.y = YAW;
  pivot.position.x = X;
  tire.spin.rotation.y = -ROLL;
  pivot.updateMatrixWorld(true);
  const siteMatrix = site.matrixWorld.clone();
  pivot.rotation.y = saved.yaw;
  pivot.position.x = saved.x;
  tire.spin.rotation.y = saved.roll;
  pivot.updateMatrixWorld(true);
  const w = (x: number, y: number, z: number): [number, number, number] => {
    const v = new THREE.Vector3(x, y, z).applyMatrix4(siteMatrix);
    return [v.x, v.y, v.z];
  };
  // a point h out from the tread at an angle phi above the label's middle, x across
  const up = (phi: number, h: number, x = 0) => w(x, (R + h) * Math.cos(phi) - R, -(R + h) * Math.sin(phi));

  // the label, framed close on wide screens; on phones it sits a little lower, so all
  // of it fits above the text
  const LABEL = { ...FRAMES.close, liftTall: 0.2 };
  const hold = (t0: number, t1: number, k: Omit<CameraKey, "t" | "frame">): CameraKey[] => [
    { ...k, t: t0, frame: LABEL },
    { ...k, t: t1, frame: LABEL },
  ];

  return {
    tire: "fresh",
    focus: [X, 0.66],
    keys: [
      // low against the tread's front face, looking up it to where the crown rolls away,
      // the hairs on the skyline lit from behind
      { t: 0, cam: up(-0.35, 0.3, -0.08), tgt: up(0.78, 0, -0.05), fov: 18, frame: FRAMES.close,
        tall: { cam: up(-0.35, 0.3, -0.04), tgt: up(0.78, 0.02, 0), fov: 24 } },
      // backing off and tipping down as the label comes up the face
      { t: 0.12, cam: up(-0.3, 0.42, -0.07), tgt: up(0.45, 0, -0.04), fov: 20, frame: FRAMES.close, ease: "pass",
        tall: { cam: up(-0.3, 0.46, -0.04), tgt: up(0.5, 0.02, 0), fov: 27 } },
      { t: 0.24, cam: up(-0.16, 0.64, -0.02), tgt: up(0.12, 0, 0), fov: 24, frame: FRAMES.close, ease: "pass",
        tall: { cam: up(-0.15, 1.12, -0.02), tgt: up(-0.06, 0, 0), fov: 33 } },
      // square on the label, from a little above so the floor behind stays near and dark;
      // each end of the drift is keyed twice, so the path between is a straight, eased line
      // rather than a curve swinging out toward the shots either side
      ...hold(0.36, 0.38, { cam: w(0, 0.95, 0), tgt: w(0, 0, 0), fov: 28, tall: { cam: w(0, 1.46, 0.01), tgt: w(0, 0, 0.01), fov: 34 } }),
      ...hold(0.7, 0.72, { cam: w(0.1, 0.8, -0.1), tgt: w(0, 0, -0.04), fov: 27, tall: { cam: w(0.06, 1.34, -0.03), tgt: w(0, 0, 0.035), fov: 34 } }),
      // back to a three-quarter view of the whole tire as it turns back toward us; from
      // above, so the floor fills in behind it, and in line with the rest of the lineup
      // out in the dark, so the tire hides them
      { t: 1, cam: [X - 0.9, 1.3, 2.1], tgt: [X - 0.14, 0.5, 0], fov: 29, frame: FRAMES.right,
        tall: { cam: [X - 1.45, 3.1, 3.5], tgt: [X - 0.04, 0.5, 0], fov: 30 } },
    ],
    pose: (u) => ({ yaw: YAW + (YAW_END - YAW) * ramp(u, 0.7, 1), roll: ROLL * ramp(u, 0.02, 0.34) }),
    update,
    rest: () => update(),
  };
};

export default service;
