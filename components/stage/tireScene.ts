/**
 * The 3D showroom in the hero: three tires in a black studio. Tapping a service
 * tweens the camera, the tires' turn and roll, and the light to that stop
 * (stageStates.ts). The frame is composed exactly like the poster images, scaled the
 * way CSS object-fit: cover scales them, so the swap from poster to live canvas is
 * seamless.
 */
import * as THREE from "three";
import { makeMaterials, makeTire } from "./tireModel";
import { LINEUP, STOPS, TIRES, type Shot, type StopId, type TireId, type Vec3 } from "./stageStates";

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
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const lerpRec = (a: Record<TireId, number>, b: Record<TireId, number>, t: number) =>
  Object.fromEntries(TIRES.map((k) => [k, lerp(a[k], b[k], t)])) as Record<TireId, number>;

/**
 * Screen shapes the posters are rendered for (width / height). The live frame is
 * composed for the matching one, then scaled like object-fit: cover.
 */
export const POSTER_ASPECT = { wide: 1.6, mid: 0.75, tall: 390 / 844 };
export const posterRegime = (aspect: number) => (aspect > 1.2 ? "wide" : aspect > 0.6 ? "mid" : "tall");

/** A shot worked out for one poster shape. */
type View = {
  cam: Vec3;
  tgt: Vec3;
  fov: number;
  shift: number;
  lift: number;
  yaw: Record<TireId, number>;
  roll: Record<TireId, number>;
  light: Record<TireId, number>;
};

function resolve(v: Shot, ref: number): View {
  const portrait = ref < 0.9;
  // narrow shapes pull back so the subject keeps its width, more for wide subjects...
  const tall = clamp01((1 - ref) / 0.5);
  const fit = (ref < 1.2 ? Math.min(2.1, 1 + (1.2 - ref) * 1.15) : 1) * (1 + (v.frame.backTall - 1) * tall);
  let cam = lerp3(v.tgt, v.cam, fit), tgt = v.tgt, fov = v.fov, yaw = v.yaw;
  // ...unless the shot has its own framing for tall screens, which takes over as the shape narrows
  if (v.tall && portrait) {
    const k = clamp01((1.2 - ref) / (1.2 - POSTER_ASPECT.tall));
    const t = v.tall;
    cam = lerp3(cam, t.cam, k);
    tgt = lerp3(tgt, t.tgt, k);
    fov = lerp(fov, t.fov, k);
    yaw = Object.fromEntries(TIRES.map((id) => [id, lerp(v.yaw[id], t.yaw?.[id] ?? v.yaw[id], k)])) as Record<TireId, number>;
  }
  return { cam, tgt, fov, shift: portrait ? 0 : v.frame.shift, lift: portrait ? v.frame.liftTall : v.frame.lift, yaw, roll: v.roll, light: v.light };
}

function mix(a: View, b: View, t: number): View {
  return {
    cam: lerp3(a.cam, b.cam, t),
    tgt: lerp3(a.tgt, b.tgt, t),
    fov: lerp(a.fov, b.fov, t),
    shift: lerp(a.shift, b.shift, t),
    lift: lerp(a.lift, b.lift, t),
    yaw: lerpRec(a.yaw, b.yaw, t),
    roll: lerpRec(a.roll, b.roll, t),
    light: lerpRec(a.light, b.light, t),
  };
}

const TWEEN_MS = 1500;
const SPIN_RATE = 0.9; // radians per second while a stop keeps a tire turning
const TAU = Math.PI * 2;
const nextTask = () => new Promise<void>((r) => setTimeout(r, 0));

export type TireScene = Awaited<ReturnType<typeof createTireScene>>;

export async function createTireScene(
  canvas: HTMLCanvasElement,
  { pixelRatio, small, font, start = "all" }: { pixelRatio: number; small: boolean; font: string; start?: StopId },
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

  const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 60);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7, 96).rotateX(-Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0x111111, roughness: 0.92, specularIntensity: 0.2, envMapIntensity: 0.03, transparent: true, alphaMap: floorAlpha(),
    }),
  );
  floor.receiveShadow = true;
  scene.add(floor);

  // key: high, front left; it follows the tire in focus
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
  const tires = {} as Record<TireId, { pivot: THREE.Group; spin: THREE.Group; uLight: { value: number }; x: number }>;
  for (const id of TIRES) {
    await nextTask();
    const spec = LINEUP[id];
    const { group, spin, radius } = makeTire(spec.kind, makeMaterials(), {
      font, maxTexture: small ? 2048 : 4096, worn: spec.worn, plug: spec.plug, weights: spec.weights, brand: spec.brand,
    });
    group.rotation.x = Math.PI / 2; // axle toward +Z before the yaw
    group.position.y = radius;
    const pivot = new THREE.Group();
    pivot.add(group);
    pivot.position.set(spec.x, 0, 0);
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.5).rotateX(-Math.PI / 2), contactMat);
    contact.position.y = 0.002;
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
    tires[id] = { pivot, spin, uLight, x: spec.x };
  }

  const view = { w: 1, h: 1 };
  let shown: Shot = STOPS[start]; // the stop on screen, or being moved to
  let target: StopId = start;
  let tween: { from: View; t0: number } | null = null;
  let arrived = performance.now();
  let spinAngle = 0;
  let dirty = true;
  const camTgt = new THREE.Vector3();
  const ref = () => POSTER_ASPECT[posterRegime(view.w / view.h)];

  function apply(v: View, spinBy: Partial<Record<TireId, number>>) {
    const aspect = view.w / view.h;
    const r = ref();
    camTgt.set(...v.tgt);
    camera.position.set(...v.cam);
    camera.lookAt(camTgt);
    // fill this screen the way object-fit: cover fills it with the poster
    let fov = v.fov, shiftPx: number, liftPx: number;
    if (aspect > r) {
      fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(v.fov) / 2) * (r / aspect)));
      shiftPx = v.shift * view.w;
      liftPx = v.lift * (aspect / r) * view.h;
    } else {
      shiftPx = v.shift * (r / aspect) * view.w;
      liftPx = v.lift * view.h;
    }
    camera.fov = fov;
    camera.setViewOffset(view.w, view.h, -shiftPx, liftPx, view.w, view.h);

    let lit = 0, litX = 0;
    for (const id of TIRES) {
      const tr = tires[id];
      const l = v.light[id];
      tr.pivot.rotation.y = v.yaw[id];
      tr.spin.rotation.y = -(v.roll[id] + (spinBy[id] ?? 0));
      tr.uLight.value = l;
      // a dimmed tire backs away into the dark, off the lit floor
      tr.pivot.position.z = -4.2 * Math.min(1, (1 - l) / 0.98);
      lit += l;
      litX += l * tr.x;
    }
    // the key light follows the tire in focus and tightens on it; the rims follow too
    const focusX = litX / Math.max(lit, 1e-3);
    const focus = clamp01((TIRES.length - lit) / (TIRES.length - 1));
    key.position.x = -3.2 + focusX;
    key.target.position.x = focusX;
    key.angle = lerp(0.32, 0.17, focus);
    rim.target.position.x = rim2.target.position.x = focusX;
    rim2.position.x = -4.4 + focusX;
    rim.angle = rim2.angle = lerp(0.5, 0.2, focus);
    rim.position.x = 3.4 + focusX;
  }

  function current(now: number): { v: View; spinBy: Partial<Record<TireId, number>> } {
    const to = resolve(shown, ref());
    if (tween) {
      const t = clamp01((now - tween.t0) / TWEEN_MS);
      const v = mix(tween.from, to, smootherstep(t));
      if (t >= 1) {
        tween = null;
        arrived = now;
      }
      return { v, spinBy: {} };
    }
    const spinning = STOPS[target].spin;
    return { v: to, spinBy: spinning ? { [spinning]: spinAngle } : {} };
  }

  let last = performance.now();
  const api = {
    renderer,
    get stop() {
      return target;
    },
    /** True while something is moving and frames are needed. */
    get animating() {
      return dirty || tween !== null || !!STOPS[target].spin;
    },
    /** Move to a stop; `immediate` jumps there (stills, reduced motion). */
    goTo(id: StopId, immediate = false) {
      const now = performance.now();
      // start from exactly what's on screen, including any spin in progress, unwound to
      // the nearest whole turn so leaving takes the short way round
      let from: View;
      if (tween) from = current(now).v;
      else {
        from = resolve(shown, ref());
        const spinning = STOPS[target].spin;
        if (spinning) {
          const to = STOPS[id].roll[spinning];
          const off = (((from.roll[spinning] + spinAngle - to) % TAU) + TAU + Math.PI) % TAU - Math.PI;
          from = { ...from, roll: { ...from.roll, [spinning]: to + off } };
        }
      }
      spinAngle = 0;
      target = id;
      shown = STOPS[id];
      tween = immediate ? null : { from, t0: now };
      dirty = true;
    },
    resize(w: number, h: number) {
      view.w = w;
      view.h = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      dirty = true;
    },
    /** Draw one frame. */
    frame(now = performance.now()) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!tween && STOPS[target].spin) {
        // ease into the spin after arriving
        spinAngle += SPIN_RATE * dt * Math.min(1, (now - arrived) / 1000);
      }
      const { v, spinBy } = current(now);
      apply(v, spinBy);
      renderer.render(scene, camera);
      dirty = false;
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

  // compile every shader before the first visible frame, so revealing the canvas
  // doesn't stall the page
  apply(resolve(STOPS[start], ref()), {});
  await renderer.compileAsync(scene, camera);
  return api;
}

