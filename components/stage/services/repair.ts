/**
 * Flat repair, on the lineup's trailer tire: a nail in the tread is pulled out with
 * pliers, a plug goes in on an insertion tool, the ends are trimmed flush with a blade,
 * and the tech circles the repair in crayon.
 */
import * as THREE from "three";
import { LINEUP } from "../sequence";
import { FRAMES, ramp } from "../shots";
import { treadRadius } from "../tireModel";
import type { ServiceFactory } from "./types";

const X = LINEUP.repaired.x;
const THETA = Math.PI; // where the nail went in, around the tire (see tireModel's angle convention)
const V = 0.0175; // and across the tread, on a rib
const ROLL = -0.95; // rolls the puncture up to the top front of the tire
const YAW = 1.32; // tread square to the camera

// fully metallic parts reflect the black studio and vanish against rubber; part-metal
// steel takes the key light as well, so small tools read
const steel = (color: number, roughness: number, metalness = 0.6) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
const plastic = (color: number, roughness: number) => new THREE.MeshStandardMaterial({ color, metalness: 0, roughness });

/** Build an object along +y from simple parts, so tools read at macro range without being heavy. */
function cyl(r0: number, r1: number, len: number, mat: THREE.Material, segs = 20) {
  return new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, segs).translate(0, len / 2, 0), mat);
}

const service: ServiceFactory = async (ctx) => {
  const tire = ctx.lineup.repaired;
  const R = treadRadius(tire.kind, tire.worn, V);

  // a frame at the puncture: +x across the tread toward the outboard side, +y out of the
  // tread, +z along the tread; it rolls with the tire
  const n = new THREE.Vector3(Math.sin(THETA), 0, Math.cos(THETA));
  const a = new THREE.Vector3(0, 1, 0);
  const t = new THREE.Vector3().crossVectors(a, n);
  const site = new THREE.Group();
  site.name = "repair-site";
  site.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, n, t));
  site.position.copy(n).multiplyScalar(R).addScaledVector(a, V);
  tire.spin.add(site);

  // the nail: head on the tread, shank in the tire
  const nail = new THREE.Group();
  const nailMat = steel(0xa7aaae, 0.34);
  // the head stands a little proud of the rubber, the way a nail picked up on the road does
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.0064, 0.0062, 0.0022, 28).translate(0, 0.0013, 0), steel(0xd2d5d8, 0.3, 0.45));
  const shank = cyl(0.0006, 0.0017, 0.051, nailMat, 12);
  shank.position.y = -0.05;
  nail.add(head, shank);
  site.add(nail);

  // pliers: jaws meet at the group's origin, handles run back along +x and up
  const pliers = new THREE.Group();
  const jawMat = steel(0x9a9ea3, 0.3);
  const grip = plastic(0x9e0e14, 0.5);
  const jaws: THREE.Group[] = [];
  for (const side of [1, -1]) {
    const arm = new THREE.Group();
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.006).translate(0.025, 0, 0), jawMat);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.007, 0.009).translate(0.105, 0, 0), grip);
    handle.rotation.z = 0.06 * side;
    arm.add(jaw, handle);
    arm.userData.side = side;
    pliers.add(arm);
    jaws.push(arm);
  }
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.012, 16).rotateX(Math.PI / 2).translate(0.05, 0, 0), jawMat);
  pliers.add(pin);
  site.add(pliers);

  // the insertion tool: a T handle and a needle with an eye, the plug strip threaded through it
  const tool = new THREE.Group();
  const needle = cyl(0.0012, 0.0019, 0.075, steel(0xe6e6e6, 0.14), 16);
  // the T bar runs across the tread, so it reads as a T from the camera's side
  const tee = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.1, 20).rotateZ(Math.PI / 2).translate(0, 0.084, 0), plastic(0x1a1a1a, 0.5));
  const collar = cyl(0.006, 0.006, 0.012, plastic(0x9e0e14, 0.5));
  collar.position.y = 0.068;
  tool.add(needle, tee, collar);
  site.add(tool);

  // the plug: a sticky brown strip folded in half, two tails sticking back out of the hole
  const plugMat = plastic(0x22160e, 0.62);
  const plug = new THREE.Group();
  const tails: THREE.Mesh[] = [];
  for (const side of [1, -1]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.0042, 1, 0.0018).translate(0, 0.5, 0), plugMat);
    tail.userData.side = side;
    plug.add(tail);
    tails.push(tail);
  }
  site.add(plug);
  // the bits the blade trims off
  const offcuts = tails.map(() => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.0042, 0.012, 0.0018), plugMat);
    site.add(m);
    return m;
  });

  const blade = new THREE.Group();
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.0006, 0.03), steel(0xd9dcdf, 0.12));
  const bladeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.009, 0.08).translate(0, 0.004, 0.055), plastic(0xe0a21a, 0.55));
  blade.add(edge, bladeHandle);
  site.add(blade);

  // the crayon circle round the repair, drawn on as the crayon goes round
  const RING = 0.021;
  const ringGeo = new THREE.TorusGeometry(RING, 0.00125, 6, 72).rotateX(Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, plastic(0xead56b, 0.95));
  ring.position.y = 0.0012;
  site.add(ring);
  const crayon = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.085, 6).translate(0, 0.05, 0), plastic(0xf0c02a, 0.85));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0065, 0.009, 6).rotateX(Math.PI).translate(0, 0.0045, 0), plastic(0xead56b, 0.9));
  crayon.add(stick, tip);
  site.add(crayon);

  for (const o of [nail, pliers, tool, plug, blade, ring, crayon, ...offcuts]) {
    o.traverse((m) => {
      if ((m as THREE.Mesh).isMesh) m.castShadow = true;
    });
  }

  function update(u: number) {
    // nail: pliers come in, close on the head, pull it out and carry it away
    const reach = ramp(u, 0.16, 0.26), close = ramp(u, 0.26, 0.3), pull = ramp(u, 0.3, 0.4), away = ramp(u, 0.4, 0.47);
    nail.visible = u < 0.47;
    const carry = new THREE.Vector3(0.16, 0.14, 0.02).multiplyScalar(away);
    nail.position.set(0, pull * 0.05, 0).add(carry);
    nail.rotation.set(0, 0, -away * 0.6);
    pliers.visible = u > 0.16 && u < 0.47;
    pliers.position.set(0.17 * (1 - reach), 0.15 * (1 - reach) + 0.0035 + pull * 0.05, 0).add(carry);
    pliers.rotation.set(0, 0, 0.55 - away * 0.6);
    for (const j of jaws) j.rotation.y = j.userData.side * (0.32 * (1 - close) + 0.035);

    // plug: the tool comes in, pushes the strip into the hole, pulls out and leaves it
    const inn = ramp(u, 0.47, 0.54), push = ramp(u, 0.54, 0.62), out = ramp(u, 0.62, 0.69);
    tool.visible = u > 0.47 && u < 0.69;
    const depth = 0.018 * push;
    tool.position.set(0.09 * (1 - inn), 0.2 * (1 - inn) - depth + out * 0.22, 0.03 * out);
    tool.rotation.set(0, 0, 0.35 * (1 - inn) - 0.35 * out);
    plug.visible = u > 0.47;
    const trim = ramp(u, 0.715, 0.735);
    const len = 0.032 - 0.0125 * trim; // the trim leaves a couple of millimeters showing
    if (u < 0.62) plug.position.copy(tool.position).setY(tool.position.y + 0.002);
    else plug.position.set(0, -0.018 + 0.002, 0);
    plug.rotation.copy(u < 0.62 ? tool.rotation : new THREE.Euler());
    for (const tl of tails) {
      tl.scale.y = len;
      tl.rotation.z = tl.userData.side * (0.05 + 0.33 * out * (1 - trim * 0.7));
    }

    // trim: a blade sweeps across the tails; the offcuts fly off
    blade.visible = u > 0.69 && u < 0.79;
    const sweep = ramp(u, 0.7, 0.76);
    blade.position.set(0.004, 0.0016 + ramp(u, 0.76, 0.79) * 0.08, 0.05 - sweep * 0.1);
    blade.rotation.set(0, 0.25, 0);
    const fly = ramp(u, 0.725, 0.8);
    offcuts.forEach((o, i) => {
      const side = i ? -1 : 1;
      o.visible = u > 0.725 && u < 0.8;
      o.position.set(side * (0.004 + fly * 0.03), 0.008 + fly * 0.05, -fly * 0.02);
      o.rotation.set(fly * 2 * side, 0, side * (0.4 + fly * 3));
      o.scale.setScalar(1 - fly * 0.6);
    });

    // crayon: comes down to the ring, goes round once, lifts away
    const draw = ramp(u, 0.79, 0.87);
    ring.visible = draw > 0;
    ringGeo.setDrawRange(0, Math.round(draw * 72) * 36);
    crayon.visible = u > 0.77 && u < 0.905;
    const down = ramp(u, 0.77, 0.79), lift = ramp(u, 0.87, 0.905);
    const ang = draw * Math.PI * 2;
    crayon.position.set(RING * Math.cos(ang), 0.0012 + (1 - down) * 0.06 + lift * 0.08, -RING * Math.sin(ang));
    crayon.rotation.set(0.5, 0, -0.45);
  }

  // camera positions are worked out in the puncture's own frame (x across the tread, y out
  // of it, z along it), with the tire in its final pose, then turned into scene coordinates
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
  const p = w(0, 0.004, 0);

  return {
    tire: "repaired",
    focus: [X, 0.7],
    keys: [
      // the top of the tire, the nail head catching the light
      { t: 0, cam: w(0.3, 0.6, -1.05), tgt: w(0, -0.02, 0), fov: 30, frame: FRAMES.right },
      // down low across the tread, so the tools come in from above
      { t: 0.15, cam: w(0.15, 0.17, -0.38), tgt: p, fov: 30, frame: FRAMES.close, ease: "pass" },
      { t: 0.24, cam: w(0.11, 0.1, -0.25), tgt: w(0, 0.012, 0), fov: 30, frame: FRAMES.close },
      { t: 0.5, cam: w(0.07, 0.1, -0.26), tgt: w(0, 0.016, 0), fov: 30, frame: FRAMES.close, ease: "pass" },
      { t: 0.76, cam: w(0.03, 0.11, -0.25), tgt: w(0, 0.01, 0), fov: 30, frame: FRAMES.close },
      // up over the repair to see the crayon go round
      { t: 0.84, cam: w(0.05, 0.21, -0.17), tgt: p, fov: 30, frame: FRAMES.close },
      // a moment on the finished repair before pulling back
      { t: 0.92, cam: w(0.045, 0.215, -0.16), tgt: p, fov: 30, frame: FRAMES.close },
      { t: 1, cam: [X + 1.0, 0.86, 2.2], tgt: [X - 0.04, 0.56, 0.12], fov: 30, frame: FRAMES.right },
    ],
    pose: (u) => ({ yaw: YAW - ramp(u, 0.9, 1) * 0.3, roll: ROLL }),
    update,
    rest: () => update(0),
  };
};

export default service;
