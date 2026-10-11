/**
 * The hero's shots. Each stop in the showroom is a camera shot plus each tire's turn,
 * roll and light. The scene tweens between them when a visitor taps a service. Kept
 * free of three.js so the page can use the stop ids without loading the 3D code.
 */
export const TIRES = ["fresh", "used", "repaired"] as const;
export type TireId = (typeof TIRES)[number];
export type StopId = "all" | "ttp" | "new" | "used" | "repair" | "balance";

export type Vec3 = [number, number, number];
export type Frame = {
  shift: number; // how far the subject sits right of center on wide screens, fraction of the view width
  lift: number; // how far it sits above center on wide screens, fraction of the view height
  liftTall: number; // the same on tall (portrait) screens, where the text goes underneath
  backTall: number; // extra pull-back on tall screens, for wide subjects
};
export type Shot = {
  cam: Vec3;
  tgt: Vec3;
  fov: number;
  frame: Frame;
  yaw: Record<TireId, number>; // each tire's turn, radians; 0 faces the camera
  roll: Record<TireId, number>; // each tire's roll about its axle, radians
  light: Record<TireId, number>; // light on each tire; the ones out of focus drop into the dark
  spin?: TireId; // a tire that keeps turning while the shot holds (balancing)
  // its own framing for tall (phone) screens, composed for the tall poster
  tall?: { cam: Vec3; tgt: Vec3; fov: number; yaw?: Partial<Record<TireId, number>> };
};

/** The three tires: a new TTP Tire (the shop's own brand), a used drive tire, a repaired trailer tire. */
export const LINEUP: Record<
  TireId,
  { kind: "steer" | "drive" | "trailer"; x: number; worn?: boolean; plug?: boolean; weights?: boolean; brand?: boolean }
> = {
  fresh: { kind: "steer", x: -1.34, weights: true, brand: true },
  used: { kind: "drive", x: 0, worn: true },
  repaired: { kind: "trailer", x: 1.34, plug: true },
};

const LOW: Frame = { shift: 0, lift: -0.25, liftTall: -0.14, backTall: 1.5 };
const RIGHT: Frame = { shift: 0.16, lift: 0, liftTall: 0.21, backTall: 1.15 };
const RIGHT_CLOSE: Frame = { shift: 0.25, lift: 0, liftTall: 0.24, backTall: 1.4 };

const YAW = 0.62;
const each = <T>(v: T, o: Partial<Record<TireId, T>> = {}): Record<TireId, T> => ({ fresh: v, used: v, repaired: v, ...o });
const focus = (id?: TireId) => each(1, id ? Object.fromEntries(TIRES.filter((t) => t !== id).map((t) => [t, 0])) : {});

const X = (id: TireId) => LINEUP[id].x;

export const STOPS: Record<StopId, Shot> = {
  all: {
    cam: [0, 0.82, 7.6], tgt: [0, 0.5, 0], fov: 23, frame: LOW,
    yaw: each(YAW), roll: each(0), light: focus(),
    // phones: from off to the right, so the three stand staggered and fill the narrow frame
    tall: { cam: [10.2, 1.8, 5.9], tgt: [-0.05, 0.5, 0], fov: 22, yaw: each(0.7) },
  },
  // facing the camera, the TTP TIRE lettering upright at the top of the sidewall
  ttp: {
    cam: [X("fresh") + 0.46, 0.95, 2.55], tgt: [X("fresh") + 0.03, 0.64, 0], fov: 28, frame: RIGHT_CLOSE,
    yaw: each(YAW, { fresh: -0.12 }), roll: each(0), light: focus("fresh"),
  },
  new: {
    cam: [X("fresh") + 1.08, 0.72, 2.4], tgt: [X("fresh") + 0.02, 0.52, 0], fov: 30, frame: RIGHT,
    yaw: each(YAW, { fresh: -0.22 }), roll: each(0, { fresh: 0.6 }), light: focus("fresh"),
  },
  used: {
    cam: [X("used") + 0.9, 0.62, 2.05], tgt: [X("used") + 0.02, 0.6, 0], fov: 30, frame: RIGHT,
    yaw: each(YAW, { used: -0.05 }), roll: each(0), light: focus("used"),
  },
  // the plug rolled up to the top of the tread, facing the camera
  repair: {
    cam: [X("repaired") - 0.03, 1.08, 0.88], tgt: [X("repaired") - 0.09, 0.81, 0.41], fov: 30, frame: RIGHT_CLOSE,
    yaw: each(YAW, { repaired: 1.32 }), roll: each(0, { repaired: -0.95 }), light: focus("repaired"),
  },
  // the whole wheel turning, the balance weights coming round on the rim
  balance: {
    cam: [X("fresh") + 0.62, 0.86, 2.62], tgt: [X("fresh") + 0.1, 0.52, 0.05], fov: 30, frame: RIGHT_CLOSE,
    yaw: each(YAW, { fresh: -0.35 }), roll: each(0, { fresh: 0.45 }), light: focus("fresh"), spin: "fresh",
  },
};

