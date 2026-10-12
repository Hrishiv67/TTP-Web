// Placeholder until this service's animation is built.
import * as THREE from "three";
import { FRAMES } from "../shots";
import type { ServiceFactory } from "./types";

const service: ServiceFactory = async (ctx) => {
  const root = new THREE.Group();
  const tire = ctx.newTire("steer");
  tire.pivot.rotation.y = 0.5;
  root.add(tire.pivot);
  return {
    root,
    keys: [
      { t: 0, cam: [1.1, 0.75, 2.5], tgt: [0, 0.52, 0], fov: 30, frame: FRAMES.right },
      { t: 1, cam: [0.8, 0.7, 2.2], tgt: [0, 0.52, 0], fov: 30, frame: FRAMES.right },
    ],
    update(u) {
      tire.spin.rotation.y = -u * Math.PI;
    },
  };
};

export default service;
