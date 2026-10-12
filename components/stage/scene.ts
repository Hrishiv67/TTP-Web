/**
 * The hero's 3D scene: the lineup of three tires in the studio and each service's
 * animation, all driven by scroll progress (sequence.ts). Services load on demand
 * (services/). Every frame is composed like the matching poster image and scaled
 * like CSS object-fit: cover, so the swap from poster to live canvas doesn't jump.
 */
import * as THREE from "three";
import { createStudio, makeDimmable } from "./studio";
import { makeMaterials, makeTire, type TireOptions } from "./tireModel";
import {
  DEFAULT_SERVICE, INTRO_KEYS, LINEUP, LINEUP_YAW, TIRES, introLight, introYaw, phaseAt,
  type ServiceId, type TireId, type TireKind,
} from "./sequence";
import { POSTER_ASPECT, clamp01, lerp, mixViews, posterRegime, pulledBack, sampleKeys, smootherstep, type View } from "./shots";
import { ON_LINEUP, SERVICES } from "./services";
import type { ServiceContext, ServiceSet, TireHandle } from "./services/types";
import { advanceScroll } from "./scrollMotion";

const nextTask = () => new Promise<void>((r) => setTimeout(r, 0));
const BACK = 4.2; // how far a tire out of focus backs away into the dark, meters

export type Showroom = Awaited<ReturnType<typeof createShowroom>>;
type LoadedSet = ServiceSet & { fade: { value: number } };
type Pose = { yaw: number; roll: number; x: number; y: number; z: number; light: number; visible: boolean };

export async function createShowroom(
  canvas: HTMLCanvasElement,
  { pixelRatio, small, font }: { pixelRatio: number; small: boolean; font: string },
) {
  const studio = createStudio(canvas, { pixelRatio, small });
  const { renderer, scene, camera } = studio;
  const maxTexture = small ? 2048 : 4096;

  function newTire(kind: TireKind, opts: Partial<Omit<TireOptions, "font" | "maxTexture">> = {}): TireHandle {
    const t = makeTire(kind, makeMaterials(), { font, maxTexture, ...opts });
    t.group.rotation.x = Math.PI / 2; // axle toward +z before the yaw
    t.group.position.y = t.radius;
    const pivot = new THREE.Group();
    pivot.add(t.group, studio.contact(1.15, 0.5));
    return { kind, worn: !!opts.worn, pivot, group: t.group, spin: t.spin, radius: t.radius, light: makeDimmable(t.group) };
  }

  // the lineup, one tire per task so building never blocks the page for long
  const lineup = {} as Record<TireId, TireHandle>;
  for (const id of TIRES) {
    await nextTask();
    const spec = LINEUP[id];
    // the used tire's crayon marks are drawn by its service, as an animation
    const t = newTire(spec.kind, { worn: spec.worn, brand: spec.brand, crayon: false });
    t.pivot.position.x = spec.x;
    scene.add(t.pivot);
    lineup[id] = t;
  }

  const ctx: ServiceContext = {
    scene, font, small, maxTexture, lineup, newTire, nextTask,
    dimmable: makeDimmable,
    contact: studio.contact,
  };

  const sets = new Map<ServiceId, LoadedSet>();
  const pending = new Map<ServiceId, Promise<void>>();
  const state = { target: 0, current: 0, velocity: 0, service: DEFAULT_SERVICE as ServiceId, w: 1, h: 1, dirty: true };
  let active: LoadedSet | null = null; // the set whose props are out of their resting state

  /** Load and build a service (once), and compile its shaders before it first shows. */
  function ensure(id: ServiceId): Promise<void> {
    if (sets.has(id)) return Promise.resolve();
    let p = pending.get(id);
    if (!p) {
      p = (async () => {
        const { default: factory } = await SERVICES[id]();
        const set = await factory(ctx);
        const fade = { value: 0 };
        // props a service hung on a lineup tire fade with that tire
        if (set.tire) makeDimmable(lineup[set.tire].group, lineup[set.tire].light);
        set.rest?.();
        if (set.root) {
          makeDimmable(set.root, fade);
          scene.add(set.root);
          set.root.visible = true;
        }
        const compiled = renderer.compileAsync(scene, camera);
        if (set.root) set.root.visible = false;
        await compiled;
        sets.set(id, { ...set, fade });
        state.dirty = true;
      })();
      pending.set(id, p);
    }
    return p;
  }

  const view = { w: 1, h: 1 };
  const ref = () => POSTER_ASPECT[posterRegime(state.w / state.h)];
  const restPose = (id: TireId): Pose => ({ yaw: LINEUP_YAW, roll: 0, x: LINEUP[id].x, y: 0, z: 0, light: 1, visible: true });

  function apply(P: number) {
    const r = ref();
    const ph = phaseAt(P);
    const pickView = sampleKeys(INTRO_KEYS, 1, r);
    const pose = Object.fromEntries(TIRES.map((id) => [id, restPose(id)])) as Record<TireId, Pose>;
    let v: View = pickView;
    let shown: LoadedSet | null = null; // a separate set on screen
    let focusX = 0, focusY = 0.45, tight = 0, level = 1;
    const set = ph.part === "service" ? sets.get(state.service) : undefined;

    if (ph.part === "intro") {
      v = sampleKeys(INTRO_KEYS, ph.t, r);
      for (const id of TIRES) pose[id].yaw = introYaw(ph.t);
      level = introLight(ph.t);
    } else if (ph.part === "service" && set) {
      const { inT, u } = ph;
      if (set.tire) {
        // the featured tire turns into its first pose while the others fall into the dark
        const e = smootherstep(inT);
        v = inT < 1 ? mixViews(pickView, sampleKeys(set.keys, 0, r), e) : sampleKeys(set.keys, u, r);
        const p = set.pose?.(u) ?? {};
        const f = pose[set.tire];
        f.yaw = lerp(f.yaw, p.yaw ?? f.yaw, e);
        f.roll = lerp(0, p.roll ?? 0, e);
        f.x = lerp(f.x, p.x ?? f.x, e);
        f.y = lerp(0, p.y ?? 0, e);
        f.z = lerp(0, p.z ?? 0, e);
        for (const id of TIRES) if (id !== set.tire) pose[id].light = 1 - e;
        focusX = lerp(0, set.focus?.[0] ?? f.x, e);
        focusY = lerp(0.45, set.focus?.[1] ?? 0.45, e);
        tight = e;
      } else if (inT < 0.5) {
        // push in on the lineup as it falls into the dark...
        const e = smootherstep(inT / 0.5);
        v = mixViews(pickView, pulledBack(pickView, 0.6), e);
        for (const id of TIRES) pose[id].light = 1 - e;
        tight = e;
      } else {
        // ...then the set comes up out of the dark as the camera arrives on its first shot
        const e = smootherstep((inT - 0.5) / 0.5);
        const first = sampleKeys(set.keys, 0, r);
        v = inT < 1 ? mixViews(pulledBack(first, 1.6), first, e) : sampleKeys(set.keys, u, r);
        for (const id of TIRES) pose[id].visible = false;
        shown = set;
        set.fade.value = e;
        focusX = set.focus?.[0] ?? 0;
        focusY = set.focus?.[1] ?? 0.45;
        tight = 1;
      }
    }

    // props: the playing service shows its state at u, every other one rests
    const playing = ph.part === "service" && set ? set : null;
    if (active && active !== playing) active.rest?.();
    active = playing;
    if (playing && ph.part === "service") playing.update(ph.u, playing.root ? playing.fade.value : 1);
    for (const s of sets.values()) if (s.root) s.root.visible = s === shown;

    for (const id of TIRES) {
      const t = lineup[id], f = pose[id];
      t.pivot.visible = f.visible;
      t.pivot.rotation.y = f.yaw;
      t.spin.rotation.y = -f.roll;
      t.light.value = f.light;
      // a tire out of focus backs away into the dark, off the lit floor
      t.pivot.position.set(f.x, f.y, f.z - BACK * clamp01((1 - f.light) / 0.98));
    }
    studio.aim(focusX, tight, level, focusY);

    // compose for the poster's shape, then fill this screen the way object-fit: cover does
    const aspect = view.w / view.h;
    camera.position.set(...v.cam);
    camera.lookAt(...v.tgt);
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
  }

  let last = performance.now();
  const api = {
    renderer,
    scene, // for the render harness and debugging
    camera,
    /** Point the scene at a scroll progress; `immediate` jumps there instead of easing. */
    setProgress(P: number, immediate = false) {
      state.target = P;
      if (immediate) {
        state.current = P;
        state.velocity = 0;
        last = performance.now();
      }
      state.dirty = true;
    },
    get progress() {
      return state.current;
    },
    /** True while frames are needed: the drawn progress is still catching up, or something changed. */
    get moving() {
      return state.dirty || state.current !== state.target || state.velocity !== 0;
    },
    get service() {
      return state.service;
    },
    /** Choose the service that plays after the pick hold. Resolves once it's ready to show. */
    setService(id: ServiceId) {
      if (state.service !== id) {
        state.service = id;
        state.dirty = true;
      }
      return ensure(id).then(() => {
        state.dirty = true;
      });
    },
    /** Build a service ahead of time (when its button is pointed at, say). */
    ensure,
    /** Fetch its code without constructing models or compiling GPU shaders. */
    preload(id: ServiceId) {
      return SERVICES[id]();
    },
    resize(w: number, h: number) {
      state.w = view.w = w;
      state.h = view.h = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      state.dirty = true;
    },
    /** Advance the easing and draw. Returns the progress the frame was drawn at. */
    frame(now = performance.now()) {
      const dt = (now - last) / 1000;
      last = now;
      const motion = advanceScroll({ value: state.current, velocity: state.velocity }, state.target, dt);
      state.current = motion.value;
      state.velocity = motion.velocity;
      state.dirty = false;
      apply(state.current);
      renderer.render(scene, camera);
      return state.current;
    },
    dispose() {
      studio.dispose();
    },
  };

  // the services that put props on the lineup are part of its look, so build them first
  for (const id of ON_LINEUP) await ensure(id);
  apply(0);
  await renderer.compileAsync(scene, camera);
  return api;
}
