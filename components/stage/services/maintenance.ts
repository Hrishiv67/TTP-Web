/** A quiet pressure inspection: connect, let the gauge settle, inspect, disconnect. */
import * as THREE from "three";
import { FRAMES, ramp } from "../shots";
import type { ServiceFactory } from "./types";

const metal = (color: number, roughness: number, metalness = 0.65) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

/** A conventional gauge scale; the scene illustrates inspection, not a pressure recommendation. */
function dialTexture(font: string, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d")!;
  const center = size / 2;
  c.fillStyle = "#e3e0d9";
  c.fillRect(0, 0, size, size);
  c.strokeStyle = "#393b3d";
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI * 1.25 - i / 40 * Math.PI * 1.5;
    const r0 = size * (i % 5 ? 0.381 : 0.346), r1 = size * 0.41;
    c.lineWidth = size * (i % 5 ? 0.0015 : 0.003);
    c.beginPath();
    c.moveTo(center + Math.cos(a) * r0, center - Math.sin(a) * r0);
    c.lineTo(center + Math.cos(a) * r1, center - Math.sin(a) * r1);
    c.stroke();
  }
  c.fillStyle = "#333537";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `600 ${size * 0.051}px ${font}`;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * 1.25 - i / 8 * Math.PI * 1.5;
    c.fillText(String(i * 20), center + Math.cos(a) * size * 0.293, center - Math.sin(a) * size * 0.293);
  }
  c.font = `600 ${size * 0.044}px ${font}`;
  c.fillText("PSI", center, size * 0.7);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const service: ServiceFactory = async (ctx) => {
  const root = new THREE.Group();
  root.name = "service-maintenance";
  const tire = ctx.newTire("steer");
  tire.pivot.rotation.y = -0.08;
  root.add(tire.pivot);
  const aluminum = metal(0xc4c9ce, 0.26), chrome = metal(0xe8eaec, 0.18);
  const brass = metal(0x9b8250, 0.4), rubber = metal(0x17191b, 0.65, 0), red = metal(0x9e1821, 0.48, 0.1);
  const cylinder = (r: number, len: number, mat: THREE.Material, segs = 28) =>
    new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, segs).rotateX(Math.PI / 2), mat);
  // Valve on the outer rim, kept stationary with the wheel.
  const valve = new THREE.Group();
  valve.name = "maintenance-valve";
  valve.position.set(0.231, tire.radius + 0.145, 0.101);
  tire.pivot.add(valve);
  const seat = cylinder(0.012, 0.012, rubber);
  const stem = cylinder(0.006, 0.045, brass, 20);
  stem.position.z = 0.018;
  valve.add(seat, stem);
  for (let i = 0; i < 4; i++) {
    const thread = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0008, 4, 20), chrome);
    thread.position.z = 0.029 + i * 0.003;
    valve.add(thread);
  }
  const cap = new THREE.Group();
  cap.add(cylinder(0.0075, 0.014, rubber, 16));
  valve.add(cap);
  cap.children.forEach((o) => { const mesh = o as THREE.Mesh; mesh.material = rubber.clone(); });
  const capLight = ctx.dimmable(cap);
  const tool = new THREE.Group();
  tool.name = "maintenance-pressure-gauge";
  valve.add(tool);
  const chuck = cylinder(0.015, 0.036, aluminum);
  chuck.position.z = 0.021;
  const neck = cylinder(0.009, 0.02, brass);
  neck.position.z = 0.048;
  tool.add(chuck, neck);
  const gauge = new THREE.Group();
  gauge.position.set(0.12, 0.088, 0.14);
  tool.add(gauge);
  gauge.add(cylinder(0.091, 0.041, aluminum, ctx.small ? 48 : 72));
  const bumper = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.008, 10, 64), rubber);
  bumper.position.z = -0.012;
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.083, 0.0055, 10, 64), chrome);
  bezel.position.z = 0.026;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.08, 64),
    new THREE.MeshStandardMaterial({ map: dialTexture(ctx.font, ctx.small ? 256 : 512), roughness: 0.8, metalness: 0 }));
  face.position.z = 0.022;
  gauge.add(bumper, bezel, face);
  const needle = new THREE.Group();
  needle.position.z = 0.027;
  const pointer = new THREE.Mesh(new THREE.BoxGeometry(0.0024, 0.068, 0.0013).translate(0, 0.026, 0), red);
  const hub = cylinder(0.0055, 0.003, rubber, 20);
  hub.position.z = 0.001;
  needle.add(pointer, hub);
  gauge.add(needle);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.08, 64),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.1, transparent: true,
      opacity: 0.07, depthWrite: false }));
  glass.position.z = 0.032;
  gauge.add(glass);
  const port = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.022, 20), brass);
  port.position.y = -0.094;
  gauge.add(port);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0.056), new THREE.Vector3(0.032, -0.054, 0.105),
    new THREE.Vector3(0.104, -0.068, 0.14), new THREE.Vector3(0.12, -0.017, 0.14),
  ]), ctx.small ? 24 : 40, 0.007, 8, false), rubber);
  tool.add(hose);
  valve.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o !== glass) { o.castShadow = true; o.receiveShadow = true; }
  });
  // The disconnected tool retreats into the same studio darkness as other props.
  // Clone shared metals first so the valve and the instrument have separate light.
  tool.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      const mesh = o as THREE.Mesh;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
    }
  });
  const toolLight = ctx.dimmable(tool);
  await ctx.nextTask();
  function update(u: number, fade: number) {
    tire.light.value = fade;
    tire.spin.rotation.y = 0;
    const capAway = ramp(u, 0.1, 0.21) * (1 - ramp(u, 0.83, 0.92));
    cap.position.set(capAway * -0.045, capAway * 0.045, 0.039 + capAway * 0.09);
    cap.rotation.set(0, 0, -capAway * 0.8);
    capLight.value = fade * (1 - ramp(u, 0.18, 0.23) + ramp(u, 0.83, 0.87));
    cap.visible = capLight.value > 0.001;
    const reach = ramp(u, 0.24, 0.39), leave = ramp(u, 0.73, 0.84);
    const connected = reach * (1 - leave);
    toolLight.value = fade * (1 - ramp(u, 0.84, 0.9));
    tool.visible = toolLight.value > 0.001;
    tool.position.set(0.16 * (1 - reach) + leave * 0.38,
      -0.12 * (1 - reach) - leave * 0.36, 0.033 + 0.17 * (1 - connected));
    tool.rotation.set(0, 0, -0.12 * (1 - connected));
    // One eased reading, followed by a long still hold; no bounce or spin.
    const read = ramp(u, 0.4, 0.49) * (1 - ramp(u, 0.74, 0.82));
    needle.rotation.z = 2.35 - 3.03 * read;
  }
  update(0, 0);
  return {
    root, focus: [0.08, 0.65],
    keys: [
      { t: 0, cam: [0.9904, 1.0576, 2.406], tgt: [0.04, 0.55, 0.03], fov: 30, frame: FRAMES.right,
        tall: { cam: [1.5048, 1.842, 3.7992], tgt: [0.09, 0.6, 0.03], fov: 32 } },
      { t: 0.31, cam: [0.81, 0.91, 1.45], tgt: [0.23, 0.67, 0.1], fov: 29, frame: FRAMES.close,
        tall: { cam: [1.12, 1.35, 2.48], tgt: [0.15, 0.64, 0.08], fov: 33 } },
      { t: 0.7, cam: [0.81, 0.91, 1.45], tgt: [0.23, 0.67, 0.1], fov: 29, frame: FRAMES.close,
        tall: { cam: [1.12, 1.35, 2.48], tgt: [0.15, 0.64, 0.08], fov: 33 } },
      { t: 0.94, cam: [0.9904, 1.0576, 2.406], tgt: [0.04, 0.55, 0.03], fov: 30, frame: FRAMES.right,
        tall: { cam: [1.5048, 1.842, 3.7992], tgt: [0.09, 0.6, 0.03], fov: 32 } },
      { t: 1, cam: [0.9904, 1.0576, 2.406], tgt: [0.04, 0.55, 0.03], fov: 30, frame: FRAMES.right,
        tall: { cam: [1.5048, 1.842, 3.7992], tgt: [0.09, 0.6, 0.03], fov: 32 } },
    ],
    update, rest: () => update(0, 0),
  };
};
export default service;
