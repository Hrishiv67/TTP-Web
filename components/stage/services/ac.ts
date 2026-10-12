/** A/C compressor: uncover the service ports, connect, inspect, disconnect, recap. */
import * as THREE from "three";
import { FRAMES, ramp } from "../shots";
import type { ServiceFactory } from "./types";

const material = (color: number, roughness: number, metalness = 0.65) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

const service: ServiceFactory = async (ctx) => {
  const root = new THREE.Group();
  root.name = "service-ac";
  const aluminum = material(0xbac0c5, 0.36), edge = material(0xd8dbdf, 0.24);
  const steel = material(0x70757a, 0.3), black = material(0x16191c, 0.48, 0.3);
  const rubber = material(0x151517, 0.7, 0), brass = material(0xa58b51, 0.38);
  const red = material(0x89141c, 0.5, 0.12);
  const cylinder = (r: number, len: number, mat: THREE.Material, segs = 40) =>
    new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, segs), mat);
  const body = new THREE.Group();
  body.name = "ac-compressor";
  body.position.y = 0.37;
  root.add(body);
  // Axis points toward +z. Cooling rings follow the cast housing in the reference.
  const axial = (r: number, len: number, z: number, mat: THREE.Material) => {
    const m = cylinder(r, len, mat, 64);
    m.rotation.x = Math.PI / 2;
    m.position.z = z;
    body.add(m);
  };
  axial(0.235, 0.46, -0.075, aluminum);
  axial(0.23, 0.028, -0.32, steel);
  axial(0.245, 0.038, 0.155, edge);
  axial(0.2, 0.052, 0.194, black);
  for (let i = 0; i < 10; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.234, 0.005, 6, ctx.small ? 48 : 72), aluminum);
    rib.position.z = -0.29 + i * 0.041;
    body.add(rib);
  }
  for (const side of [-1, 1]) {
    for (const z of [-0.235, 0.095]) {
      const lug = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.12, 0.074), aluminum);
      lug.position.set(side * 0.258, -0.07, z);
      const bolt = cylinder(0.014, 0.018, edge, 6);
      bolt.position.set(side * 0.258, -0.001, z);
      body.add(lug, bolt);
    }
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.41), steel);
    foot.position.set(side * 0.17, -0.325, -0.04);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.49), black);
    rail.position.set(side * 0.17, -0.352, -0.04);
    body.add(foot, rail);
  }
  const pulley = new THREE.Group();
  pulley.name = "ac-pulley";
  pulley.position.z = 0.264;
  body.add(pulley);
  const disc = cylinder(0.228, 0.072, black, ctx.small ? 64 : 96);
  disc.rotation.x = Math.PI / 2;
  pulley.add(disc);
  for (let i = 0; i < 4; i++) {
    const groove = new THREE.Mesh(new THREE.TorusGeometry(0.226, 0.0035, 6, 64), steel);
    groove.position.z = -0.027 + i * 0.016;
    pulley.add(groove);
  }
  const clutch = cylinder(0.177, 0.018, black, 64);
  clutch.rotation.x = Math.PI / 2;
  clutch.position.z = 0.043;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.0035, 8, 64), edge);
  rim.position.z = 0.052;
  pulley.add(clutch, rim);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const bolt = cylinder(0.012, 0.02, steel, 24);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(Math.cos(a) * 0.113, Math.sin(a) * 0.113, 0.06);
    pulley.add(bolt);
  }
  const nut = cylinder(0.027, 0.026, edge, 6);
  nut.rotation.x = Math.PI / 2;
  nut.position.z = 0.065;
  pulley.add(nut);
  await ctx.nextTask();

  const caps: THREE.Group[] = [], couplings: THREE.Group[] = [];
  const capSet = new THREE.Group(), couplingSet = new THREE.Group();
  body.add(capSet, couplingSet);
  for (const [i, x] of [-0.11, 0.11].entries()) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.072, 0.08), aluminum);
    base.position.set(x, 0.229, -0.2);
    const port = cylinder(0.023, 0.05, edge, 24);
    port.position.set(x, 0.287, -0.2);
    body.add(base, port);
    for (let j = 0; j < 4; j++) {
      const thread = new THREE.Mesh(new THREE.TorusGeometry(0.023, 0.0013, 4, 24).rotateX(Math.PI / 2), steel);
      thread.position.set(x, 0.302 - j * 0.005, -0.2);
      body.add(thread);
    }
    const cap = new THREE.Group();
    const shell = cylinder(0.027, 0.027, black, 24);
    shell.position.y = 0.0135;
    cap.add(shell);
    for (let j = 0; j < 16; j++) {
      const a = j * Math.PI / 8;
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.021, 0.003), black);
      grip.position.set(Math.cos(a) * 0.027, 0.013, Math.sin(a) * 0.027);
      cap.add(grip);
    }
    capSet.add(cap);
    caps.push(cap);
    const coupling = new THREE.Group();
    coupling.name = `ac-service-coupling-${i}`;
    const socket = cylinder(0.028, 0.058, brass, 24);
    socket.position.y = 0.029;
    const sleeve = cylinder(0.031, 0.024, i ? red : black, 24);
    sleeve.position.y = 0.019;
    const elbow = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.058, 0), new THREE.Vector3(0, 0.092, 0), new THREE.Vector3(0.031, 0.106, 0),
    ]), 12, 0.012, 8, false), steel);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.031, 0.106, 0), new THREE.Vector3(0.14, 0.1, -0.015),
      new THREE.Vector3(0.3 + i * 0.035, 0.045, -0.12), new THREE.Vector3(0.44 + i * 0.04, -0.1, -0.25),
      new THREE.Vector3(0.42 + i * 0.04, -0.29, -0.39),
    ]), ctx.small ? 32 : 48, 0.013, 8, false), rubber);
    coupling.add(socket, sleeve, elbow, hose);
    couplingSet.add(coupling);
    couplings.push(coupling);
  }
  const shadow = ctx.contact(0.9, 0.85);
  root.add(shadow);
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o !== shadow) { o.castShadow = true; o.receiveShadow = true; }
  });
  // Separate light envelopes bring small tools out of the studio darkness without
  // changing the compressor's materials or flashing objects on at a scroll boundary.
  for (const group of [capSet, couplingSet]) group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      const mesh = o as THREE.Mesh;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
    }
  });
  const capLight = ctx.dimmable(capSet), couplingLight = ctx.dimmable(couplingSet);
  function update(u: number, fade = 1) {
    const capAway = ramp(u, 0.12, 0.25) * (1 - ramp(u, 0.77, 0.89));
    const connected = ramp(u, 0.29, 0.43) * (1 - ramp(u, 0.65, 0.77));
    caps.forEach((cap, i) => {
      cap.position.set((i ? 0.11 : -0.11) - capAway * 0.22, 0.307 + capAway * 0.125, -0.2 - capAway * 0.11);
      cap.rotation.set(0, capAway * 0.9, capAway * 0.12);
      cap.visible = true;
    });
    couplings.forEach((coupling, i) => {
      coupling.position.set((i ? 0.11 : -0.11) + (1 - connected) * 0.16,
        0.307 + (1 - connected) * 0.22, -0.2 - (1 - connected) * 0.08);
      coupling.rotation.set(0, 0, (1 - connected) * -0.16);
      coupling.visible = true;
    });
    capLight.value = fade * (1 - ramp(u, 0.21, 0.26) + ramp(u, 0.77, 0.81));
    couplingLight.value = fade * ramp(u, 0.26, 0.29) * (1 - ramp(u, 0.77, 0.81));
    // Zero-light meshes would still occlude the charcoal backdrop as silhouettes.
    // Hide only after their eased envelopes have reached darkness.
    capSet.visible = capLight.value > 0.001;
    couplingSet.visible = couplingLight.value > 0.001;
    pulley.rotation.z = -0.85 * ramp(u, 0.9, 0.99);
  }
  update(0, 0);
  return {
    root, focus: [0, 0.46],
    keys: [
      { t: 0, cam: [1.05, 1.05, 1.9], tgt: [0, 0.37, -0.02], fov: 29, frame: FRAMES.right,
        tall: { cam: [1.6, 1.7, 3.05], tgt: [0.06, 0.42, -0.03], fov: 32 } },
      { t: 0.27, cam: [0.8, 1.13, 1.62], tgt: [0.02, 0.5, -0.05], fov: 29, frame: FRAMES.right,
        tall: { cam: [1.45, 1.9, 2.9], tgt: [0.06, 0.48, -0.04], fov: 32 } },
      { t: 0.66, cam: [0.8, 1.13, 1.62], tgt: [0.02, 0.5, -0.05], fov: 29, frame: FRAMES.right,
        tall: { cam: [1.45, 1.9, 2.9], tgt: [0.06, 0.48, -0.04], fov: 32 } },
      { t: 0.9, cam: [0.95, 0.91, 1.85], tgt: [0, 0.36, 0.02], fov: 29, frame: FRAMES.right,
        tall: { cam: [1.55, 1.65, 3.05], tgt: [0, 0.39, 0.02], fov: 32 } },
      { t: 1, cam: [0.95, 0.91, 1.85], tgt: [0, 0.36, 0.02], fov: 29, frame: FRAMES.right,
        tall: { cam: [1.55, 1.65, 3.05], tgt: [0, 0.39, 0.02], fov: 32 } },
    ],
    update, rest: () => update(0, 0),
  };
};
export default service;
