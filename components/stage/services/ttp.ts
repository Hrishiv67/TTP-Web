/**
 * TTP Tire, the shop's own brand, on the lineup's new steer tire: it rolls out toward
 * the camera and turns to show its face, the camera pushes in on the molded "TTP TIRE"
 * and "18 PLY RATING" while a raking light sweeps across the sidewall so the raised
 * letters catch it, then pulls back round to a low three-quarter hero of tire and wheel.
 */
import * as THREE from "three";
import { LINEUP } from "../sequence";
import { FRAMES, lerp, ramp, type CameraKey, type Vec3 } from "../shots";
import { sidewallY } from "../tireModel";
import type { ServiceFactory, TirePose } from "./types";

const X = LINEUP.fresh.x;

// The roll out: a circular arc, rolling without skidding. The tire starts turned
// toward the camera (yaw PSI0) and steers round until its face is square to it (PSI1).
// It rolls "backwards" by the model's convention (negative roll), which carries it
// along (-cos yaw, 0, sin yaw): forward and to the left.
const PSI0 = 1.05;
const PSI1 = 0.25;
const L = 0.6; // meters rolled
const K = (PSI1 - PSI0) / L; // curvature, radians of yaw per meter
const MOVE: [number, number] = [0, 0.3]; // u window of the roll

// where the brand sits on the sidewall: TTP TIRE at r 0.408, 18 PLY RATING at 0.358
const R_BRAND = 0.408, R_PLY = 0.358;
const R_MID = (R_BRAND + R_PLY) / 2;

type Pose = Required<Omit<TirePose, "y">>;

const service: ServiceFactory = async (ctx) => {
  const tire = ctx.lineup.fresh;
  const R = tire.radius;

  /** The tire's pose after rolling s meters along the arc; ends on roll 0, TTP TIRE upright at the top. */
  const along = (s: number): Pose => {
    const yaw = PSI0 + K * s;
    return {
      yaw,
      x: X - (Math.sin(yaw) - Math.sin(PSI0)) / K,
      z: -(Math.cos(yaw) - Math.cos(PSI0)) / K,
      roll: (L - s) / R,
    };
  };
  const pose = (u: number): TirePose => along(L * ramp(u, ...MOVE));

  // a frame on the tire's face, at the hub: +x to the right and +y up as seen from
  // outboard (with the tire unrolled), +z out of the face along the axle; it rolls with
  // the tire. In the tire's own frame the top (theta = PI) is -z and outboard is +y.
  const face = new THREE.Group();
  face.name = "ttp-face";
  face.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)),
  );
  tire.spin.add(face);

  // the face frame in scene coordinates with the tire in a given pose (then put back),
  // level (unrolled), so camera positions can be worked out on the face
  const pivot = tire.pivot;
  const faceMatrix = (p: Pose) => {
    const saved = { yaw: pivot.rotation.y, x: pivot.position.x, z: pivot.position.z, roll: tire.spin.rotation.y };
    pivot.rotation.y = p.yaw;
    pivot.position.x = p.x;
    pivot.position.z = p.z;
    tire.spin.rotation.y = 0;
    pivot.updateMatrixWorld(true);
    const m = face.matrixWorld.clone();
    pivot.rotation.y = saved.yaw;
    pivot.position.x = saved.x;
    pivot.position.z = saved.z;
    tire.spin.rotation.y = saved.roll;
    pivot.updateMatrixWorld(true);
    return m;
  };
  const endM = faceMatrix(along(L));
  const w = (x: number, y: number, z: number): Vec3 => {
    const v = new THREE.Vector3(x, y, z).applyMatrix4(endM);
    return [v.x, v.y, v.z];
  };
  // a camera off the face's axis by angle a (positive: toward the face's left, where
  // the tread leads as it rolls), at distance d and height h above the axle
  const orbit = (a: number, d: number, h: number) => w(-Math.sin(a) * d, h, Math.cos(a) * d);
  // the hub in scene coordinates at a point on the roll
  const hub = (s: number): Vec3 => {
    const p = along(s);
    return [p.x, R, p.z];
  };

  // the sidewall surface where the brand is molded
  const zBrand = sidewallY(tire.kind, R_BRAND);
  const brand = (dx = 0, r = R_MID): Vec3 => w(dx, r, zBrand);

  // The raking light: it stays low over the sidewall (ELEV above its plane) and swings
  // round over the top of the lettering, upper left to upper right, its pool sliding
  // across the letters, so first their left edges catch it, then their tops, then their
  // right edges. For the hero it comes back softly from the upper left, a sheen on the
  // sidewall that picks out the brand.
  const rake = new THREE.SpotLight(0xeef3ff, 0, 0, 0.26, 0.8, 2);
  rake.name = "ttp-rake";
  ctx.scene.add(rake, rake.target);
  const RHO = 0.85, ELEV = 0.12, PEAK = 60, ACCENT = 26;
  const lp = new THREE.Vector3();

  function update(u: number) {
    if (u < 0.72) {
      const sweep = ramp(u, 0.4, 0.68);
      const a = lerp(-1.45, 1.45, sweep);
      lp.set(Math.sin(a) * Math.cos(ELEV) * RHO, R_MID + Math.cos(a) * Math.cos(ELEV) * RHO, zBrand + Math.sin(ELEV) * RHO);
      rake.target.position.set(lerp(-0.15, 0.15, sweep), R_MID, zBrand);
      rake.intensity = PEAK * ramp(u, 0.4, 0.47) * (1 - ramp(u, 0.62, 0.69));
    } else {
      lp.set(-0.55, 0.95, 0.3);
      rake.target.position.set(0, R_MID, zBrand);
      rake.intensity = ACCENT * ramp(u, 0.8, 0.96);
    }
    rake.position.copy(lp.applyMatrix4(endM));
    rake.target.position.applyMatrix4(endM);
    rake.target.updateMatrixWorld();
  }

  // The camera hardly moves while the tire rolls up to it: it stands square to the
  // tire's face where it stops, and pans to follow it in.
  const square = orbit(0, 2.85, 0.04);
  const follow = (s: number, back: number): Pick<CameraKey, "cam" | "tgt"> => {
    const h = hub(s);
    const c = new THREE.Vector3(...square).sub(new THREE.Vector3(...h)).multiplyScalar(back).add(new THREE.Vector3(...h));
    return { cam: [c.x, c.y, c.z], tgt: [h[0], h[1] - 0.01, h[2]] };
  };
  // the push in goes from the whole tire to the lettering; the framing moves with it, and
  // on phones the letters sit high, the crown just in frame
  const NEAR = { shift: 0.2, lift: 0, liftTall: 0.25, backTall: 1.25 };
  const CLOSE = { ...FRAMES.close, liftTall: 0.28 };
  // straight back from the lettering, for the phones' own framing
  const tallAt = (d: number, r: number, tgtR = r) => ({ cam: w(0.02, r, zBrand + d), tgt: brand(0, tgtR), fov: 30 });

  // (the camera path is a Catmull-Rom curve through the keys, which overshoots where a
  // short hop sits next to a long one, so the push in is in equal steps, each closing the
  // distance by the same fraction; where the camera turns back from the lettering, the
  // keys either side are in the same place, so it stops dead and reverses)
  const nearer = w(-0.03, 0.3, 1.09);
  const keys: CameraKey[] = [
    // three-quarters on as it waits to go, tread leading
    { t: 0, ...follow(0, 1.08), fov: 30, frame: FRAMES.right },
    { t: 0.15, ...follow(L / 2, 1.03), fov: 30, frame: FRAMES.right, ease: "pass" },
    // square on to its face as it stops, TTP TIRE upright at the top
    { t: 0.3, cam: square, tgt: w(0, -0.01, 0.06), fov: 30, frame: FRAMES.right },
    // a slow push in on the brand
    { t: 0.38, cam: w(-0.05, 0.1, 2.05), tgt: w(0, 0.12, 0.1), fov: 30, frame: NEAR, ease: "pass", tall: tallAt(2.9, 0.18, 0.2) },
    { t: 0.46, cam: w(-0.05, 0.22, 1.47), tgt: w(0, 0.26, 0.13), fov: 30, frame: NEAR, ease: "pass", tall: tallAt(1.75, 0.3, 0.35) },
    { t: 0.55, cam: nearer, tgt: brand(0, 0.36), fov: 30, frame: CLOSE, ease: "pass", tall: tallAt(1.45, 0.34, 0.385) },
    { t: 0.65, cam: w(0.05, 0.34, 0.8), tgt: brand(0.01, 0.381), fov: 30, frame: CLOSE, tall: tallAt(1.3, 0.36, 0.395) },
    // pull back, then round to the right, low, to the hero
    { t: 0.74, cam: nearer, tgt: brand(0, 0.3), fov: 30, frame: CLOSE, ease: "pass", tall: tallAt(2.0, 0.3, 0.3) },
    { t: 0.86, cam: orbit(-0.55, 2.2, -0.1), tgt: w(0.03, 0, 0.04), fov: 30, frame: FRAMES.right, ease: "pass" },
    { t: 1, cam: orbit(-0.8, 2.6, -0.24), tgt: w(0.04, -0.02, 0), fov: 30, frame: FRAMES.right },
  ];

  return {
    tire: "fresh",
    keys,
    pose,
    update,
    rest: () => update(0),
  };
};

export default service;
