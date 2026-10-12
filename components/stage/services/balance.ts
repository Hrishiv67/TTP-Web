/** A measured balancer run, clip-on correction, and a settled wheel. */
import * as THREE from "three";
import { FRAMES, ramp } from "../shots";
import type { ServiceFactory } from "./types";

const service: ServiceFactory = async (ctx) => {
  const RIGHT = { ...FRAMES.right, liftTall: 0.12 };
  const CLOSE = { ...FRAMES.close, liftTall: 0.12 };
  const root = new THREE.Group();
  root.name = "service-balance";
  const rig = new THREE.Group();
  rig.rotation.y = 0.38;
  root.add(rig);
  const red = new THREE.MeshStandardMaterial({ color: 0x850e16, roughness: 0.48, metalness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.57, metalness: 0.45 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xa1a5a9, roughness: 0.32, metalness: 0.6 });
  const zinc = new THREE.MeshStandardMaterial({ color: 0x92969a, roughness: 0.58, metalness: 0.45 });
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    rig.add(m);
    return m;
  };
  // The wheel is held above the floor on a horizontal shaft, with the cabinet behind it.
  box(0.54, 0.61, 0.43, red, 0, 0.345, -0.48);
  box(0.62, 0.055, 0.5, dark, 0, 0.065, -0.48);
  box(0.55, 0.04, 0.46, dark, 0, 0.67, -0.48);
  box(0.18, 0.16, 0.22, dark, 0, 0.73, -0.37);
  box(0.39, 0.38, 0.008, dark, 0, 0.36, -0.257);
  for (const x of [-0.16, 0.16]) for (const y of [0.205, 0.515]) {
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.007, 6).rotateX(Math.PI / 2), steel);
    bolt.position.set(x, y, -0.247);
    rig.add(bolt);
  }
  const axleY = 0.715;
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 24).rotateX(Math.PI / 2), steel);
  spindle.position.set(0, axleY, -0.12);
  spindle.name = "balance-spindle";
  rig.add(spindle);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.085, 0.06, 32).rotateX(Math.PI / 2), dark);
  cone.position.set(0, axleY, 0.15);
  const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.051, 0.051, 0.04, 32).rotateX(Math.PI / 2), steel);
  lock.position.set(0, axleY, 0.195);
  rig.add(cone, lock);

  const tire = ctx.newTire("steer");
  tire.pivot.name = "balance-wheel";
  tire.group.position.y = axleY;
  // A spindle-held wheel has no tire contact shadow; only the cabinet touches the floor.
  for (const child of tire.pivot.children) if (child !== tire.group) child.visible = false;
  rig.add(tire.pivot);
  const cabinetShadow = ctx.contact(0.72, 0.68);
  cabinetShadow.position.z = -0.48;
  rig.add(cabinetShadow);

  // Match the zinc clip geometry already used by the tire model, separately movable.
  const weights = [0, 1].map((i) => {
    const weight = new THREE.Group();
    weight.name = `balance-weight-${i + 1}`;
    const body = new THREE.Mesh(new THREE.BoxGeometry(i ? 0.05 : 0.07, 0.015, 0.011), zinc);
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.005, 0.017).translate(0, 0.011, -0.005), steel);
    weight.add(body, clip);
    weight.rotation.x = -Math.PI / 2;
    const mount = new THREE.Group();
    const angle = Math.PI * 0.86 + i * 0.24;
    mount.rotation.y = angle + Math.PI / 2;
    mount.position.set(0.288 * Math.sin(angle), 0.122, 0.288 * Math.cos(angle));
    mount.add(weight);
    tire.spin.add(mount);
    return weight;
  });
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material !== cabinetShadow.material) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  function update(u: number, fade: number) {
    tire.light.value = fade;
    // One complete turn is enough to read the motion; there is no time-driven spinning.
    const run = ramp(u, 0.12, 0.4);
    tire.spin.rotation.y = -run * Math.PI * 2;
    tire.group.rotation.x = Math.PI / 2 + Math.sin(run * Math.PI * 2) * Math.sin(run * Math.PI) * 0.006;
    weights.forEach((weight, i) => {
      const enter = ramp(u, 0.45 + i * 0.08, 0.61 + i * 0.08);
      weight.visible = enter > 0;
      weight.position.set(0, 0.07 * (1 - enter), 0.14 * (1 - enter));
    });
  }
  return {
    root,
    focus: [0, 0.72],
    keys: [
      { t: 0, cam: [1.2, 1.17, 3.1], tgt: [0, 0.65, -0.12], fov: 30, frame: RIGHT,
        tall: { cam: [1.5, 1.7, 4.5], tgt: [0, 0.65, -0.12], fov: 31 } },
      { t: 0.16, cam: [1.03, 1.11, 2.6], tgt: [0.03, 0.72, 0], fov: 30, frame: RIGHT },
      { t: 0.4, cam: [0.7, 1.12, 1.95], tgt: [0.1, 0.8, 0.04], fov: 30, frame: CLOSE,
        tall: { cam: [1.18, 1.67, 3.8], tgt: [0.05, 0.75, 0], fov: 31 } },
      { t: 0.73, cam: [0.7, 1.12, 1.95], tgt: [0.1, 0.8, 0.04], fov: 30, frame: CLOSE,
        tall: { cam: [1.18, 1.67, 3.8], tgt: [0.05, 0.75, 0], fov: 31 } },
      { t: 0.9, cam: [1.12, 1.19, 2.85], tgt: [0, 0.67, -0.07], fov: 30, frame: RIGHT,
        tall: { cam: [1.5, 1.7, 4.5], tgt: [0, 0.65, -0.12], fov: 31 } },
      { t: 1, cam: [1.12, 1.19, 2.85], tgt: [0, 0.67, -0.07], fov: 30, frame: RIGHT,
        tall: { cam: [1.5, 1.7, 4.5], tgt: [0, 0.65, -0.12], fov: 31 } },
    ],
    update,
    rest: () => update(0, 0),
  };
};

export default service;
