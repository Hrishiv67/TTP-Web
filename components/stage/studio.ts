/**
 * The black studio every 3D shot is filmed in: environment lighting, the floor and
 * its pool of light, a key light and two rims, soft contact shadows, and a way to
 * fade any object into the dark. Shared by the lineup and every service's set.
 */
import * as THREE from "three";

// Studio lighting baked into an environment map: an overhead softbox, two tall strip
// boxes behind the subject, cards in front, and a dim wall all round, brightest at eye
// level, so polished metal reads as metal from any angle.
export function studioEnvironment(renderer: THREE.WebGLRenderer) {
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

export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, colorSpace: THREE.ColorSpace) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = colorSpace;
  return t;
}

// the floor fades out radially, so there is no horizon line, only the pool of light
export const floorAlpha = () =>
  canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "#fff");
    g.addColorStop(0.35, "#fff");
    g.addColorStop(1, "#000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }, THREE.NoColorSpace);

// soft contact shadow under the tread: a tight dark core and a wide falloff
export const contactTexture = () =>
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

/**
 * Every material under `root` scales its final light by one shared uniform, so a whole
 * object can fall into the dark, highlights included. Returns the uniform (value 0 to 1).
 */
export function makeDimmable(root: THREE.Object3D, uniform: { value: number } = { value: 1 }) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (m.userData.dimmable) continue;
      m.userData.dimmable = true;
      const prev = m.onBeforeCompile;
      m.onBeforeCompile = (shader, renderer) => {
        prev.call(m, shader, renderer);
        shader.uniforms.uLight = uniform;
        shader.fragmentShader = "uniform float uLight;\n" + shader.fragmentShader.replace(
          "#include <tonemapping_fragment>",
          "gl_FragColor.rgb *= uLight;\n#include <tonemapping_fragment>",
        );
      };
      const prevKey = m.customProgramCacheKey.bind(m);
      m.customProgramCacheKey = () => prevKey() + "|dimmable";
    }
  });
  return uniform;
}

export type Studio = ReturnType<typeof createStudio>;

export function createStudio(canvas: HTMLCanvasElement, { pixelRatio, small }: { pixelRatio: number; small: boolean }) {
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

  const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 80);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(9, 96).rotateX(-Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0x111111, roughness: 0.92, specularIntensity: 0.2, envMapIntensity: 0.03, transparent: true, alphaMap: floorAlpha(),
    }),
  );
  floor.receiveShadow = true;
  scene.add(floor);

  // key: high, front left, aimed at whatever is in focus; rims behind, to pick out edges
  const KEY = 240, RIM = 650, RIM2 = 380;
  const key = new THREE.SpotLight(0xfff4e8, KEY, 0, 0.32, 1, 2);
  key.position.set(-3.2, 5.6, 4.2);
  key.target.position.set(0, 0.4, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  key.shadow.camera.near = 3;
  key.shadow.camera.far = 16;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  key.shadow.radius = 6;
  const rim = new THREE.SpotLight(0xe8f0ff, RIM, 0, 0.5, 0.7, 2);
  rim.position.set(3.4, 3.4, -4.6);
  rim.target.position.set(0, 0.6, 0);
  const rim2 = new THREE.SpotLight(0xfff0e0, RIM2, 0, 0.5, 0.8, 2);
  rim2.position.set(-4.4, 2.6, -3.8);
  rim2.target.position.set(0, 0.6, 0);
  scene.add(key, key.target, rim, rim.target, rim2, rim2.target);

  /**
   * Aim the lights. focusX: where along x the subject is. tight: 0 lights the whole
   * lineup, 1 a single subject. level: how much of the key light is up (0 to 1).
   */
  function aim(focusX: number, tight: number, level = 1, focusY = 0.45) {
    key.position.x = -3.2 + focusX;
    key.target.position.set(focusX, focusY, 0);
    key.angle = THREE.MathUtils.lerp(0.32, 0.17, tight);
    key.intensity = KEY * level;
    rim.target.position.x = rim2.target.position.x = focusX;
    rim.position.x = 3.4 + focusX;
    rim2.position.x = -4.4 + focusX;
    rim.angle = rim2.angle = THREE.MathUtils.lerp(0.5, 0.2, tight);
  }

  const contactMat = new THREE.MeshBasicMaterial({
    map: contactTexture(), transparent: true, depthWrite: false, toneMapped: false, color: 0x000000,
  });
  /** A soft contact shadow, w by d meters, lying on the floor. */
  function contact(w: number, d: number) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), contactMat);
    m.position.y = 0.002;
    m.renderOrder = 1;
    return m;
  }

  function dispose() {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      }
    });
    envTarget.dispose();
    renderer.dispose();
  }

  return { renderer, scene, camera, floor, key, rim, rim2, aim, contact, dispose };
}
