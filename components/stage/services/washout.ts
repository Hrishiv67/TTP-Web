/**
 * Trailer washout: inspect the open rear, follow a pressure-washer fan from the
 * front bulkhead toward the threshold, then hold on the clean, rinsed interior.
 * Every position and cleaning state is derived from scroll progress, including
 * the residue, so returning to an earlier frame restores that exact stage.
 */
import * as THREE from "three";
import { FRAMES, ramp } from "../shots";
import type { ServiceFactory } from "./types";

const FLOOR = 0.33;
const REAR = 0.43;
const FRONT = -1.08;
const WASH_FRAME = { ...FRAMES.right, liftTall: 0.05 };

const metal = (color: number, roughness = 0.42, metalness = 0.55) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

const service: ServiceFactory = async (ctx) => {
  const root = new THREE.Group();
  root.name = "service-washout";
  const aluminum = metal(0xb4b8ba, 0.42, 0.48);
  const ribs = metal(0xc5c8c9, 0.35, 0.6);
  const frame = metal(0x242629, 0.56, 0.35);
  const steel = metal(0x777e84, 0.32, 0.65);
  const rubber = metal(0x17181a, 0.83, 0);
  const red = metal(0xb30c14, 0.3, 0.13);
  const amber = metal(0xbe690c, 0.37, 0.15);

  function box(w: number, h: number, d: number, mat: THREE.Material,
    x: number, y: number, z: number, parent: THREE.Object3D = root) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(radius: number, length: number, mat: THREE.Material,
    x: number, y: number, z: number, parent: THREE.Object3D = root) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 16), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // A gently mottled plank texture, with grain and staggered end joints. Only
  // created once; it uses the same restrained natural floor as the reference.
  const canvas = document.createElement("canvas");
  const texSize = Math.min(ctx.small ? 256 : 512, ctx.maxTexture);
  canvas.width = canvas.height = texSize;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#927451";
  c.fillRect(0, 0, texSize, texSize);
  for (let plank = 0; plank < 12; plank++) {
    const left = (plank / 12) * texSize, width = texSize / 12;
    const tone = 107 + (plank * 17 % 37);
    c.fillStyle = `rgb(${tone + 30},${tone + 7},${tone - 23})`;
    c.fillRect(left, 0, width - 1, texSize);
    for (let line = 0; line < 10; line++) {
      const x = left + width * ((line + 0.5) / 10);
      c.strokeStyle = line % 3 ? "rgba(45,28,14,.08)" : "rgba(224,196,154,.13)";
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(x, 0);
      c.bezierCurveTo(x + 1.7, texSize * 0.3, x - 1.2, texSize * 0.7, x, texSize);
      c.stroke();
    }
    const end = texSize * (0.2 + (plank * 7 % 9) * 0.065);
    c.fillStyle = "rgba(30,24,17,.25)";
    c.fillRect(left, end, width - 1, 0.8);
  }
  const woodTexture = new THREE.CanvasTexture(canvas);
  woodTexture.colorSpace = THREE.SRGBColorSpace;
  woodTexture.anisotropy = ctx.small ? 2 : 4;
  const wood = new THREE.MeshStandardMaterial({ color: 0xc6b18f, map: woodTexture, roughness: 0.82 });
  box(1.16, 0.048, 1.54, wood, 0, FLOOR - 0.024, -0.325);

  // Thin metal skin and channels make a recognizable enclosed trailer, without
  // an expensive full vehicle model or lights added to the shared black studio.
  for (const side of [-1, 1]) {
    box(0.035, 1.43, 1.54, aluminum, side * 0.598, 1.045, -0.325);
    box(0.028, 0.17, 1.52, steel, side * 0.57, FLOOR + 0.085, -0.325);
    for (let rib = 0; rib < 10; rib++) {
      box(0.021, 1.21, 0.025, ribs, side * 0.57, 1.115, FRONT + 0.09 + rib * 0.15);
    }
    box(0.024, 0.034, 1.52, ribs, side * 0.565, 1.705, -0.325);
  }
  box(1.18, 0.027, 1.54, aluminum, 0, 1.773, -0.325);
  box(1.16, 1.42, 0.03, aluminum, 0, 1.04, FRONT - 0.005);
  for (let rib = 0; rib < 10; rib++) {
    box(1.14, 0.022, 0.031, ribs, 0, 1.744, FRONT + 0.09 + rib * 0.15);
  }
  // Reflective ceiling strips read as the trailer's existing fixtures; they do
  // not add point lights or escape the root's shared light/fade uniform.
  const fixture = new THREE.MeshStandardMaterial({ color: 0xe4e3dc, roughness: 0.28,
    emissive: 0xc9d1d3, emissiveIntensity: 0.2 });
  for (const z of [-0.9, -0.28, 0.3]) box(0.22, 0.007, 0.032, fixture, 0, 1.751, z);

  box(1.3, 0.11, 0.065, frame, 0, 1.81, REAR);
  box(1.3, 0.064, 0.075, frame, 0, FLOOR - 0.003, REAR);
  for (const side of [-1, 1]) {
    box(0.066, 1.47, 0.065, frame, side * 0.617, 1.065, REAR);
    // Rear doors are folded along the outside walls, keeping the wash opening
    // completely visible and preserving the narrow mobile composition.
    const door = new THREE.Group();
    door.position.set(side * 0.625, 1.045, REAR + 0.018);
    door.rotation.y = -side * 1.82;
    root.add(door);
    box(0.58, 1.41, 0.022, aluminum, -side * 0.29, 0, 0, door);
    for (const x of [-side * 0.02, -side * 0.56]) box(0.021, 1.4, 0.032, ribs, x, 0, 0.009, door);
    for (const y of [-0.685, 0.685]) box(0.58, 0.024, 0.036, steel, -side * 0.29, y, 0.006, door);
    cylinder(0.008, 1.26, steel, -side * 0.4, 0, 0.029, door);
    box(0.095, 0.018, 0.018, steel, -side * 0.36, -0.12, 0.044, door);
    for (const y of [0.51, 1.07, 1.61]) {
      const hinge = cylinder(0.013, 0.077, steel, side * 0.647, y, REAR + 0.011);
      hinge.castShadow = false;
    }
    // Grounded undercarriage and an underride bar, as in the rendered poster.
    box(0.036, 0.24, 0.045, frame, side * 0.39, 0.172, REAR + 0.006);
    const light = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.01, 20).rotateX(Math.PI / 2), red);
    light.position.set(side * 0.48, FLOOR - 0.006, REAR + 0.041);
    root.add(light);
    box(0.026, 0.015, 0.008, amber, side * 0.55, 1.823, REAR + 0.036);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.137, 0.042, 10, 28).rotateY(Math.PI / 2), rubber);
    wheel.position.set(side * 0.49, 0.18, -0.01);
    wheel.castShadow = true;
    root.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.084, 0.034, 20).rotateZ(Math.PI / 2), steel);
    hub.position.copy(wheel.position).setX(side * 0.513);
    root.add(hub);
  }
  box(1.12, 0.035, 0.055, steel, 0, 0.054, REAR + 0.013);
  box(1.09, 0.011, 0.008, red, 0, 0.053, REAR + 0.044);
  for (const x of [-0.054, 0, 0.054]) box(0.027, 0.016, 0.008, red, x, 1.824, REAR + 0.036);
  root.add(ctx.contact(1.4, 1.9));

  // Each residue strip has its own opacity, so the cleaned boundary follows the
  // nozzle instead of fading the whole floor at once. Mottled residue is texture,
  // not hundreds of scattered objects or a particle simulation.
  const dirtCanvas = document.createElement("canvas");
  dirtCanvas.width = 256;
  dirtCanvas.height = 64;
  const dirtContext = dirtCanvas.getContext("2d")!;
  for (let i = 0; i < 40; i++) {
    const x = (i * 71 + 23) % 256, y = (i * 29 + 11) % 64;
    const radius = 5 + i % 12;
    const gradient = dirtContext.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(58,43,26,.55)");
    gradient.addColorStop(1, "rgba(58,43,26,0)");
    dirtContext.fillStyle = gradient;
    dirtContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const dirtTexture = new THREE.CanvasTexture(dirtCanvas);
  dirtTexture.colorSpace = THREE.SRGBColorSpace;
  const dirtyRows: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>[] = [];
  const wetRows: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshPhysicalMaterial>[] = [];
  const rows = ctx.small ? 12 : 16;
  const length = 1.46 / rows;
  for (let i = 0; i < rows; i++) {
    const z = FRONT + 0.045 + (i + 0.5) * length;
    const dirt = new THREE.Mesh(new THREE.PlaneGeometry(1.095, length + 0.002).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x796340, map: dirtTexture, transparent: true,
        depthWrite: false, roughness: 0.98, opacity: 0.8 }));
    dirt.name = `washout-residue-${i}`;
    dirt.position.set(0, FLOOR + 0.0015, z);
    dirt.renderOrder = 2;
    root.add(dirt);
    dirtyRows.push(dirt);
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(1.095, length).rotateX(-Math.PI / 2),
      new THREE.MeshPhysicalMaterial({ color: 0xaab5bc, metalness: 0.12, roughness: 0.2,
        clearcoat: 0.75, clearcoatRoughness: 0.13, transparent: true, depthWrite: false, opacity: 0 }));
    wet.name = `washout-rinsed-floor-${i}`;
    wet.position.set(0, FLOOR + 0.002, z);
    wet.renderOrder = 3;
    root.add(wet);
    wetRows.push(wet);
  }

  // Tool along local -z, with its nozzle at the group origin. A recognizable
  // black/red pistol grip, brass coupling and a slim stainless lance.
  const wand = new THREE.Group();
  wand.name = "washout-pressure-washer";
  cylinder(0.009, 0.5, steel, 0, 0, 0.26, wand).rotation.x = Math.PI / 2;
  cylinder(0.015, 0.045, metal(0xae8950, 0.3, 0.6), 0, 0, 0.041, wand).rotation.x = Math.PI / 2;
  const nozzle = cylinder(0.016, 0.024, rubber, 0, 0, 0.012, wand);
  nozzle.rotation.x = Math.PI / 2;
  box(0.038, 0.051, 0.13, rubber, 0, -0.004, 0.56, wand);
  box(0.015, 0.033, 0.084, red, 0, 0.025, 0.562, wand);
  const grip = box(0.034, 0.115, 0.043, rubber, 0, -0.079, 0.594, wand);
  grip.rotation.x = -0.24;
  box(0.014, 0.036, 0.028, steel, 0, -0.047, 0.556, wand);
  root.add(wand);

  // Root-space hose follows the pistol coupling, then hangs toward the studio
  // floor under gravity. Reused segments avoid allocating tube geometry on scroll
  // and, unlike a wand-local curve, cannot rotate upward into the opening.
  const hose = new THREE.Group();
  hose.name = "washout-pressure-hose";
  const hoseSegments: THREE.Mesh[] = [];
  const hoseJoints: THREE.Mesh[] = [];
  const hoseGeometry = new THREE.CylinderGeometry(0.008, 0.008, 1, 8);
  const jointGeometry = new THREE.SphereGeometry(0.008, 8, 6);
  for (let i = 0; i < 16; i++) {
    const segment = new THREE.Mesh(hoseGeometry, rubber);
    segment.castShadow = true;
    hose.add(segment);
    hoseSegments.push(segment);
    const joint = new THREE.Mesh(jointGeometry, rubber);
    hose.add(joint);
    hoseJoints.push(joint);
  }
  root.add(hose);
  const hoseStart = new THREE.Vector3(), hoseControl = new THREE.Vector3();
  const hoseGround = new THREE.Vector3(0.55, 0.03, 1.42);
  const hoseEnd = new THREE.Vector3(0.8, 0.018, 1.58);
  const hoseA = new THREE.Vector3(), hoseB = new THREE.Vector3();
  const hoseDirection = new THREE.Vector3();
  const hosePoint = (t: number, out: THREE.Vector3) => {
    const s = 1 - t;
    return out.copy(hoseStart).multiplyScalar(s * s * s)
      .addScaledVector(hoseControl, 3 * s * s * t)
      .addScaledVector(hoseGround, 3 * s * t * t)
      .addScaledVector(hoseEnd, t * t * t);
  };
  // The tool has its own cloned materials so its gentle entrance/withdrawal
  // never fades the trailer's shared rubber, steel or reflector materials.
  const toolMaterials = new Map<THREE.Material, THREE.Material>();
  for (const prop of [wand, hose]) prop.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const originals = Array.isArray(object.material) ? object.material : [object.material];
    const copies = originals.map((original) => {
      let copy = toolMaterials.get(original);
      if (!copy) {
        const cloned: THREE.Material = original.clone();
        cloned.transparent = true;
        toolMaterials.set(original, cloned);
        copy = cloned;
      }
      return copy;
    });
    object.material = Array.isArray(object.material) ? copies : copies[0];
  });

  const spray = new THREE.Group();
  spray.name = "washout-water-fan";
  root.add(spray);
  const water = new THREE.MeshStandardMaterial({ color: 0xd6e5ea, roughness: 0.3,
    metalness: 0.03, transparent: true, opacity: 0, depthWrite: false });
  const jets: THREE.Mesh[] = [];
  const jetGeometry = new THREE.CylinderGeometry(0.0011, 0.0024, 1, 6);
  for (let i = 0; i < 11; i++) {
    const jet = new THREE.Mesh(jetGeometry, water);
    jet.castShadow = false;
    spray.add(jet);
    jets.push(jet);
  }
  // Tiny static fan-edge droplets and floor splashes move with the impact point;
  // there is no time-based jitter or random frame-to-frame particle respawning.
  const splashMat = new THREE.MeshStandardMaterial({ color: 0xc6dce3, roughness: 0.35,
    transparent: true, opacity: 0, depthWrite: false });
  const splashes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), splashMat, 24);
  splashes.name = "washout-floor-splash";
  splashes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  spray.add(splashes);
  const dummy = new THREE.Object3D();
  const tip = new THREE.Vector3(), target = new THREE.Vector3(), rayEnd = new THREE.Vector3();
  const rayDirection = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

  function update(u: number) {
    const enter = ramp(u, 0.13, 0.24), leave = ramp(u, 0.79, 0.9);
    const sweep = ramp(u, 0.25, 0.77);
    const pressure = ramp(u, 0.23, 0.28) * (1 - ramp(u, 0.76, 0.81));
    const washZ = -1.015 + sweep * 1.41;
    const x = 0.1 * Math.sin(sweep * Math.PI * 2);
    // A long, slow inward pass keeps the floor in view. The camera never enters
    // the trailer or whips around; only the jet's target progresses toward us.
    tip.set(x + (1 - enter) * 0.38 + leave * 0.46,
      0.85 + (1 - enter) * 0.2 + leave * 0.1, 0.94 + leave * 0.42);
    target.set(x * 0.24, FLOOR + 0.006, washZ);
    wand.position.copy(tip);
    // Groups face +z when using lookAt; the lance extends behind its nozzle
    // along +z, so aim that axis away from the floor impact point.
    wand.lookAt(rayEnd.copy(tip).multiplyScalar(2).sub(target));
    for (const material of toolMaterials.values()) material.opacity = enter * (1 - leave);
    wand.scale.setScalar(0.65 + enter * 0.35 - leave * 0.18);
    wand.visible = u > 0.13 && u < 0.91;
    hose.visible = wand.visible;
    hoseStart.set(0, -0.14, 0.61).multiplyScalar(wand.scale.x)
      .applyQuaternion(wand.quaternion).add(wand.position);
    hoseControl.copy(hoseStart);
    hoseControl.x += 0.015;
    hoseControl.y -= 0.43;
    hoseControl.z += 0.11;
    for (let i = 0; i < hoseSegments.length; i++) {
      hosePoint(i / hoseSegments.length, hoseA);
      hosePoint((i + 1) / hoseSegments.length, hoseB);
      hoseDirection.subVectors(hoseB, hoseA);
      const distance = hoseDirection.length();
      const segment = hoseSegments[i];
      segment.position.copy(hoseA).add(hoseB).multiplyScalar(0.5);
      segment.quaternion.setFromUnitVectors(up, hoseDirection.normalize());
      segment.scale.set(1, distance, 1);
      hoseJoints[i].position.copy(hoseA);
    }
    water.opacity = pressure * 0.33;
    splashMat.opacity = pressure * 0.28;
    spray.visible = pressure > 0.001;
    for (let i = 0; i < jets.length; i++) {
      rayEnd.set(-0.525 + i / (jets.length - 1) * 1.05, FLOOR + 0.006, washZ);
      rayDirection.subVectors(rayEnd, tip);
      const distance = rayDirection.length();
      const jet = jets[i];
      jet.position.copy(tip).add(rayEnd).multiplyScalar(0.5);
      jet.quaternion.setFromUnitVectors(up, rayDirection.normalize());
      jet.scale.set(1, distance, 1);
    }
    for (let i = 0; i < 24; i++) {
      const xx = -0.52 + (i % 12) / 11 * 1.04;
      const offset = i < 12 ? -0.012 : 0.022;
      dummy.position.set(xx, FLOOR + 0.014 + (i % 3) * 0.005, washZ + offset);
      dummy.rotation.set(0.3, i * 0.71, 0.23);
      dummy.scale.set(0.006, 0.003 + (i % 3) * 0.0014, 0.012);
      dummy.updateMatrix();
      splashes.setMatrixAt(i, dummy.matrix);
    }
    splashes.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < rows; i++) {
      const threshold = (i + 0.35) / rows;
      const clean = ramp(sweep, Math.max(0, threshold - 0.035), Math.min(1, threshold + 0.065));
      dirtyRows[i].material.opacity = 0.8 * (1 - clean);
      dirtyRows[i].visible = clean < 0.999;
      wetRows[i].material.opacity = 0.12 * clean;
      wetRows[i].visible = clean > 0.001;
    }
  }
  update(0);
  return {
    root,
    focus: [0, 0.92],
    keys: [
      { t: 0, cam: [1.2, 1.24, 4.45], tgt: [0, 0.95, -0.18], fov: 30, frame: WASH_FRAME,
        tall: { cam: [0.3, 1.2, 5.2], tgt: [0, 0.93, -0.12], fov: 34 } },
      // Settle into a rear inspection, then hold while the floor is washed.
      { t: 0.2, cam: [0.6844, 1.3784, 4.1958], tgt: [0, 0.93, -0.3], fov: 30, frame: WASH_FRAME,
        tall: { cam: [0.25, 1.18, 4.85], tgt: [0, 0.92, -0.2], fov: 34 } },
      { t: 0.77, cam: [0.531, 1.4074, 4.1286], tgt: [0, 0.9, -0.32], fov: 30, frame: WASH_FRAME,
        tall: { cam: [0.2, 1.18, 4.8], tgt: [0, 0.92, -0.2], fov: 34 } },
      { t: 0.92, cam: [0.6844, 1.3312, 4.3484], tgt: [0, 0.93, -0.23], fov: 30, frame: WASH_FRAME,
        tall: { cam: [0.26, 1.2, 4.95], tgt: [0, 0.93, -0.17], fov: 34 } },
      { t: 1, cam: [0.6844, 1.3312, 4.3484], tgt: [0, 0.93, -0.23], fov: 30, frame: WASH_FRAME,
        tall: { cam: [0.26, 1.2, 4.95], tgt: [0, 0.93, -0.17], fov: 34 } },
    ],
    update,
    rest: () => update(0),
  };
};

export default service;
