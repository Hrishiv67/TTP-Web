/**
 * The studio and the camera move for the tire sequence. Scroll progress p (0 to 1
 * through the pinned section) drives everything: camera, each tire's turn and roll,
 * and which tire is lit. Text timing lives in stageTimeline.ts so the server can
 * render the copy without loading three.js.
 */
import * as THREE from "three";
import { DIM, makeMaterials, makeTire, type TireKind } from "./tireModel";
import { KINDS, TIMELINE, TIRE_X, type Key } from "./stageTimeline";

// Studio lighting baked into an environment map: an overhead softbox, two tall strip
// boxes behind the subject, cards in front, and a dim wall all round, brightest at eye
// level, so polished metal reads as metal from any angle.
function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene();
  const panel = (w: number, h: number, intensity: number, pos: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    m.material.color.setScalar(intensity);
    m.position.set(...pos);
    m.lookAt(0, 0.5, 0);
    env.add(m);
  };
  panel(5, 2.4, 5, [0, 5.5, 0.6]);
  panel(0.7, 5, 9, [-4.2, 2.2, -2.4]);
  panel(0.7, 5, 7, [4.2, 2.2, -2.4]);
  panel(7, 2.2, 1.6, [0, 2.4, 6]);
  panel(3, 0.5, 4, [1.5, 4.2, 4.5]);
  panel(1.4, 3, 2.2, [-5, 1.5, 2.5]);
  const wallGeo = new THREE.CylinderGeometry(9, 9, 12, 48, 12, true);
  const wp = wallGeo.attributes.position;
  const wc = new Float32Array(wp.count * 3);
  for (let i = 0; i < wp.count; i++) wc.fill(0.03 + 0.42 * Math.exp(-((wp.getY(i) - 0.5) ** 2) / 4), i * 3, i * 3 + 3);
  wallGeo.setAttribute("color", new THREE.BufferAttribute(wc, 3));
  const wall = new THREE.Mesh(wallGeo, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
  wall.position.y = 2;
  env.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial());
  floor.material.color.setScalar(0.06);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.6;
  env.add(floor);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.035, 0.1, 50, { position: new THREE.Vector3(0, 0.6, 0) });
  pmrem.dispose();
  env.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  return rt;
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, colorSpace: THREE.ColorSpace) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = colorSpace;
  return t;
}

// the floor fades out radially, so there is no horizon line, only the pool of light
const floorAlpha = () =>
  canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "#fff");
    g.addColorStop(0.35, "#fff");
    g.addColorStop(1, "#000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }, THREE.NoColorSpace);

// soft contact shadow under the tread: a tight dark core and a wide falloff
const contactTexture = () =>
  canvasTexture(256, 128, (ctx) => {
    for (const [rx, ry, a] of [[120, 56, 0.55], [70, 22, 0.8]]) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.translate(128, 64);
      ctx.scale(rx, ry);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, THREE.SRGBColorSpace);

const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function sample(p: number): { a: Key; b: Key; t: number } {
  p = Math.min(1, Math.max(0, p));
  let i = 0;
  while (i < TIMELINE.length - 2 && p > TIMELINE[i + 1].p) i++;
  const a = TIMELINE[i], b = TIMELINE[i + 1];
  return { a, b, t: smootherstep(Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p || 1)))) };
}

const nextTask = () => new Promise<void>((r) => setTimeout(r, 0));

export type TireScene = Awaited<ReturnType<typeof createTireScene>>;

export async function createTireScene(
  canvas: HTMLCanvasElement,
  { pixelRatio, small, font }: { pixelRatio: number; small: boolean; font: string },
) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const envTarget = studioEnvironment(renderer);
  scene.environment = envTarget.texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7, 96).rotateX(-Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0x111111, roughness: 0.92, specularIntensity: 0.2, envMapIntensity: 0.03, transparent: true, alphaMap: floorAlpha(),
    }),
  );
  floor.receiveShadow = true;
  scene.add(floor);

  // key: high, front left
  const key = new THREE.SpotLight(0xfff4e8, 240, 0, 0.32, 1, 2);
  key.position.set(-3.2, 5.6, 4.2);
  key.target.position.set(0, 0.4, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  key.shadow.camera.near = 3;
  key.shadow.camera.far = 14;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  key.shadow.radius = 6;
  // rims: behind right and behind left, to pick out the tread edges
  const rim = new THREE.SpotLight(0xe8f0ff, 650, 0, 0.5, 0.7, 2);
  rim.position.set(3.4, 3.4, -4.6);
  rim.target.position.set(0, 0.6, 0);
  const rim2 = new THREE.SpotLight(0xfff0e0, 380, 0, 0.5, 0.8, 2);
  rim2.position.set(-4.4, 2.6, -3.8);
  rim2.target.position.set(0, 0.6, 0);
  scene.add(key, key.target, rim, rim.target, rim2, rim2.target);

  const contactMat = new THREE.MeshBasicMaterial({
    map: contactTexture(), transparent: true, depthWrite: false, toneMapped: false, color: 0x000000,
  });

  // one tire per task, so building them never blocks the page for long
  const tires = {} as Record<TireKind, { pivot: THREE.Group; spin: THREE.Group; uLight: { value: number } }>;
  for (const kind of KINDS) {
    await nextTask();
    const { group, spin } = makeTire(kind, makeMaterials(), { font, maxTexture: small ? 2048 : 4096 });
    group.rotation.x = Math.PI / 2; // axle toward +Z before the yaw
    const pivot = new THREE.Group();
    pivot.add(group);
    pivot.position.set(TIRE_X[kind], DIM.RO, 0);
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.5).rotateX(-Math.PI / 2), contactMat);
    contact.position.y = -DIM.RO + 0.002;
    contact.renderOrder = 1;
    pivot.add(contact);
    scene.add(pivot);
    // every material on this tire scales its final light by one shared uniform, so a
    // tire out of focus falls into the dark, highlights included
    const uLight = { value: 1 };
    group.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.material.userData.dimmable) return;
      const m = o.material as THREE.Material;
      m.userData.dimmable = true;
      m.onBeforeCompile = (shader) => {
        shader.uniforms.uLight = uLight;
        shader.fragmentShader = "uniform float uLight;\n" + shader.fragmentShader.replace(
          "#include <tonemapping_fragment>",
          "gl_FragColor.rgb *= uLight;\n#include <tonemapping_fragment>",
        );
      };
      m.customProgramCacheKey = () => "dimmable";
    });
    tires[kind] = { pivot, spin, uLight };
  }

  const state = { target: 0, current: 0, w: 1, h: 1, dirty: true };
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();

  function apply(p: number) {
    const { a, b, t } = sample(p);
    camPos.set(lerp(a.cam[0], b.cam[0], t), lerp(a.cam[1], b.cam[1], t), lerp(a.cam[2], b.cam[2], t));
    camTgt.set(lerp(a.tgt[0], b.tgt[0], t), lerp(a.tgt[1], b.tgt[1], t), lerp(a.tgt[2], b.tgt[2], t));
    const aspect = state.w / state.h;
    const portrait = aspect < 0.9;
    // narrow screens: pull back so the subject keeps its width, more for wide subjects
    const tall = Math.min(1, Math.max(0, (1 - aspect) / 0.5));
    const fit = (aspect < 1.2 ? Math.min(2.1, 1 + (1.2 - aspect) * 1.15) : 1) * (1 + (lerp(a.backTall, b.backTall, t) - 1) * tall);
    camPos.sub(camTgt).multiplyScalar(fit).add(camTgt);
    camera.position.copy(camPos);
    camera.fov = lerp(a.fov, b.fov, t);
    camera.lookAt(camTgt);
    // move the subject within the frame to leave room for the text
    const shiftX = portrait ? 0 : lerp(a.shift, b.shift, t);
    const lift = portrait ? lerp(a.liftTall, b.liftTall, t) : lerp(a.lift, b.lift, t);
    camera.setViewOffset(state.w, state.h, -shiftX * state.w, lift * state.h, state.w, state.h);
    let lit = 0, litX = 0;
    for (const kind of KINDS) {
      const tr = tires[kind];
      const l = lerp(a.light[kind], b.light[kind], t);
      tr.pivot.rotation.y = lerp(a.yaw[kind], b.yaw[kind], t);
      tr.uLight.value = l;
      // and backs away into the dark, off the lit floor, as it dims
      tr.pivot.position.z = -4.2 * Math.min(1, (1 - l) / 0.98);
      tr.spin.rotation.y = -p * 2.4; // rolls with the scroll
      lit += l;
      litX += l * TIRE_X[kind];
    }
    // the key light follows the tire in focus and tightens on it, so the pool of
    // light moves with the camera and the other tires stand in the dark
    const focusX = litX / lit;
    const focus = Math.min(1, Math.max(0, (KINDS.length - lit) / (KINDS.length - 1)));
    key.position.x = -3.2 + focusX;
    key.target.position.x = focusX;
    key.angle = lerp(0.32, 0.17, focus);
    rim.target.position.x = rim2.target.position.x = focusX;
    rim2.position.x = -4.4 + focusX;
    rim.angle = rim2.angle = lerp(0.5, 0.2, focus);
    // the right rim light drifts with the scroll, sweeping highlights over the rubber
    rim.position.x = 3.4 + focusX + Math.sin(p * Math.PI * 6) * 1.2;
  }

  let last = performance.now();
  return {
    renderer,
    /** Set where the scroll is; `immediate` skips the easing (for stills and the first frame). */
    setProgress(p: number, immediate = false) {
      state.target = p;
      if (immediate) state.current = p;
      state.dirty = true;
    },
    get progress() {
      return state.current;
    },
    /** True while the eased progress is still catching up with the scroll. */
    get moving() {
      return state.dirty || Math.abs(state.target - state.current) > 1e-5;
    },
    resize(w: number, h: number) {
      state.w = w;
      state.h = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      state.dirty = true;
    },
    /** Advance the easing and draw. Returns the eased progress the frame was drawn at. */
    frame(now = performance.now()) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      state.current += (state.target - state.current) * (1 - Math.exp(-dt * 7));
      if (Math.abs(state.target - state.current) < 1e-5) state.current = state.target;
      state.dirty = false;
      apply(state.current);
      renderer.render(scene, camera);
      return state.current;
    },
    dispose() {
      scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
        const m = o.material as THREE.Material & Record<string, unknown>;
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      });
      envTarget.dispose();
      renderer.dispose();
    },
  };
}
