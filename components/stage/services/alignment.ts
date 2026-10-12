/** A stationary laser traces the tread as its toe angle is gently corrected. */
import * as THREE from "three";
import { FRAMES, ramp } from "../shots";
import { treadRadius } from "../tireModel";
import type { ServiceFactory } from "./types";

const service: ServiceFactory = async (ctx) => {
  const FRAME = { ...FRAMES.right, shift: 0.18, liftTall: 0.12 };
  const root = new THREE.Group();
  root.name = "service-alignment";
  const rig = new THREE.Group();
  rig.rotation.y = 0.55;
  root.add(rig);
  const tire = ctx.newTire("steer");
  tire.pivot.name = "alignment-wheel";
  tire.pivot.position.x = 0.23;
  rig.add(tire.pivot);
  const steel = new THREE.MeshStandardMaterial({ color: 0x8c9095, roughness: 0.34, metalness: 0.65 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x202226, roughness: 0.53, metalness: 0.45 });
  const red = new THREE.MeshStandardMaterial({ color: 0x840e17, roughness: 0.5, metalness: 0.2 });
  const stand = new THREE.Group();
  stand.name = "alignment-laser-stand";
  stand.position.set(-0.78, 0, 0);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 16), dark);
  post.position.y = 0.35;
  stand.add(post);
  // Splayed tripod legs and a modest metal laser head, like the existing poster.
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.31, 12), dark);
    const end = new THREE.Vector3(Math.sin(a) * 0.245, 0.018, Math.cos(a) * 0.245);
    const start = new THREE.Vector3(0, 0.16, 0);
    leg.position.copy(start).add(end).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
    stand.add(leg);
  }
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.065, 0.1), dark);
  head.position.set(0, 0.65, 0);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.158, 0.018, 0.106), steel);
  cap.position.set(0, 0.691, 0);
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.06), red);
  lens.position.set(0.078, 0.65, 0);
  stand.add(head, cap, lens);
  rig.add(stand);
  const shadow = ctx.contact(0.58, 0.6);
  shadow.position.x = -0.78;
  rig.add(shadow);

  // This is an intersection with a fixed laser plane (rig z = 0), rather than
  // a stripe rotating with the wheel. It moves toward the center as toe is corrected.
  const steps = ctx.small ? 56 : 88;
  const positions = new Float32Array((steps + 1) * 2 * 3);
  const indices: number[] = [];
  for (let i = 0; i < steps; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const scanGeo = new THREE.BufferGeometry();
  const scanPositions = new THREE.BufferAttribute(positions, 3);
  scanGeo.setAttribute("position", scanPositions);
  scanGeo.setIndex(indices);
  const laserMat = new THREE.MeshStandardMaterial({ color: 0xe8442b, emissive: 0xd52a15, emissiveIntensity: 0.8,
    roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
  const scan = new THREE.Mesh(scanGeo, laserMat);
  scan.name = "alignment-tread-scan";
  tire.spin.add(scan);

  // A faint fan makes the relationship between the source and the tread readable.
  const fanGeo = new THREE.BufferGeometry();
  fanGeo.setAttribute("position", new THREE.Float32BufferAttribute([
    -0.699, 0.65, 0, -0.24, 0.12, 0, -0.24, 0.94, 0,
  ], 3));
  const fanMat = new THREE.MeshBasicMaterial({ color: 0xc92416, transparent: true, opacity: 0.045,
    side: THREE.DoubleSide, depthWrite: false });
  const fan = new THREE.Mesh(fanGeo, fanMat);
  fan.name = "alignment-laser-fan";
  rig.add(fan);
  const reference = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.0014, 0.0025), laserMat);
  reference.position.set(-0.1, 0.002, 0);
  reference.name = "alignment-floor-reference";
  rig.add(reference);
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.parent !== tire.pivot && o !== scan && o !== fan && o !== reference && o.material !== shadow.material) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  function update(u: number, fade: number) {
    tire.light.value = fade;
    const toe = 0.14 * (1 - ramp(u, 0.3, 0.7));
    tire.pivot.rotation.y = toe;
    tire.spin.rotation.y = 0;
    for (let i = 0; i <= steps; i++) {
      const angle = -Math.PI + 0.16 + (i / steps) * (Math.PI - 0.32);
      // Axial y = radial x * tan(toe) puts each point on the stationary laser plane.
      let axial = treadRadius("steer", false, 0) * Math.sin(angle) * Math.tan(toe);
      axial = treadRadius("steer", false, axial) * Math.sin(angle) * Math.tan(toe);
      for (let edge = 0; edge < 2; edge++) {
        const y = axial + (edge ? 0.0013 : -0.0013);
        const radius = treadRadius("steer", false, y) + 0.0011;
        scanPositions.setXYZ(i * 2 + edge, radius * Math.sin(angle), y, radius * Math.cos(angle));
      }
    }
    scanPositions.needsUpdate = true;
    scanGeo.computeVertexNormals();
    scanGeo.computeBoundingSphere();
    const laserOn = ramp(u, 0.08, 0.2);
    scan.visible = laserOn > 0;
    reference.visible = laserOn > 0;
    fan.visible = laserOn > 0;
    fanMat.opacity = 0.045 * laserOn;
    laserMat.emissiveIntensity = 0.8 * laserOn;
  }
  return {
    root,
    focus: [0, 0.65],
    keys: [
      { t: 0, cam: [1.32, 1.4, 3.7], tgt: [-0.12, 0.53, 0], fov: 30, frame: FRAME,
        tall: { cam: [1.8, 2.15, 6.7], tgt: [-0.12, 0.57, 0], fov: 34 } },
      { t: 0.25, cam: [0.7, 1.29, 3.0], tgt: [-0.12, 0.6, 0], fov: 30, frame: FRAME,
        tall: { cam: [1.45, 1.95, 6.3], tgt: [-0.12, 0.57, 0], fov: 34 } },
      { t: 0.72, cam: [0.6, 1.32, 2.95], tgt: [-0.12, 0.6, 0], fov: 30, frame: FRAME,
        tall: { cam: [1.45, 1.95, 6.3], tgt: [-0.12, 0.57, 0], fov: 34 } },
      { t: 0.84, cam: [0.6, 1.32, 2.95], tgt: [-0.12, 0.6, 0], fov: 30, frame: FRAME,
        tall: { cam: [1.45, 1.95, 6.3], tgt: [-0.12, 0.57, 0], fov: 34 } },
      { t: 1, cam: [1.32, 1.4, 3.7], tgt: [-0.12, 0.53, 0], fov: 30, frame: FRAME,
        tall: { cam: [1.8, 2.15, 6.7], tgt: [-0.12, 0.57, 0], fov: 34 } },
    ],
    update,
    rest: () => update(0, 0),
  };
};

export default service;
