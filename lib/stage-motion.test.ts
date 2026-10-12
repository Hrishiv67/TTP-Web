import assert from "node:assert/strict";
import test from "node:test";
import { FRAMES, resolve, sampleKeys, type CameraKey } from "../components/stage/shots.ts";
import { advanceScroll, MAX_SCROLL_SPEED } from "../components/stage/scrollMotion.ts";

const keys: CameraKey[] = [
  { t: 0, cam: [0, 1, 4], tgt: [0, 0.5, 0], fov: 30, frame: FRAMES.right },
  { t: 0.12, cam: [2, 1.5, 3], tgt: [0.2, 0.6, 0], fov: 24, frame: FRAMES.close, ease: "pass" },
  { t: 0.72, cam: [3, 1.8, 2], tgt: [0.3, 0.7, 0], fov: 26, frame: FRAMES.close, ease: "pass" },
  { t: 1, cam: [1, 1, 4], tgt: [0, 0.5, 0], fov: 30, frame: FRAMES.right },
];
const values = (view: ReturnType<typeof sampleKeys>) => [...view.cam, ...view.tgt, view.fov, view.shift, view.lift];

test("camera stays between its shots without overshooting, on wide and tall screens", () => {
  for (const aspect of [1.6, 0.75, 390 / 844]) {
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      const from = values(resolve(a, aspect)), to = values(resolve(b, aspect));
      for (let n = 0; n <= 100; n++) {
        const view = values(sampleKeys(keys, a.t + (b.t - a.t) * n / 100, aspect));
        view.forEach((value, j) => assert(value >= Math.min(from[j], to[j]) - 1e-9 && value <= Math.max(from[j], to[j]) + 1e-9));
      }
    }
  }
});

test("camera speed stays continuous across unequally spaced pass shots", () => {
  const epsilon = 1e-6;
  for (const key of keys.slice(1, -1)) {
    const before = values(sampleKeys(keys, key.t - epsilon, 1.6));
    const at = values(sampleKeys(keys, key.t, 1.6));
    const after = values(sampleKeys(keys, key.t + epsilon, 1.6));
    at.forEach((value, j) => assert(Math.abs((value - before[j]) / epsilon - (after[j] - value) / epsilon) < 0.002));
  }
});

test("a large scroll cannot rush the timeline, and stopping settles on the requested pose", () => {
  let motion = { value: 0.49, velocity: 0 };
  for (let frame = 0; frame < 900; frame++) {
    const before = motion.value;
    motion = advanceScroll(motion, 0.965, 1 / 60);
    assert(Math.abs(motion.velocity) <= MAX_SCROLL_SPEED);
    assert(motion.value >= before && motion.value <= 0.965);
    assert(motion.value - before <= MAX_SCROLL_SPEED / 60 + 1e-9);
  }
  assert.deepEqual(motion, { value: 0.965, velocity: 0 });
  assert.deepEqual(advanceScroll(motion, 0.965, 1), motion);
});

test("reversing scroll brakes before changing direction and reaches the previous pose", () => {
  let motion = { value: 0.65, velocity: MAX_SCROLL_SPEED };
  motion = advanceScroll(motion, 0.49, 1 / 60);
  assert(motion.velocity > 0 && motion.velocity < MAX_SCROLL_SPEED);
  for (let n = 0; n < 900; n++) {
    motion = advanceScroll(motion, 0.49, n % 2 ? 1 / 30 : 1 / 60);
    assert(Number.isFinite(motion.value));
    assert(Math.abs(motion.velocity) <= MAX_SCROLL_SPEED);
  }
  assert.deepEqual(motion, { value: 0.49, velocity: 0 });
});
