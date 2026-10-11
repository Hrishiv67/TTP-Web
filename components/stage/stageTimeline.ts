/**
 * The shot list for the tire sequence, by scroll progress p through the pinned
 * section (0 to 1). Kept free of three.js so the server and the text overlays can
 * use the beat timings without loading the 3D code.
 */
export const KINDS = ["steer", "drive", "trailer"] as const;
type Kind = (typeof KINDS)[number];

type Vec3 = [number, number, number];
export type Key = {
  p: number;
  cam: Vec3; // camera position, meters
  tgt: Vec3; // what it looks at
  fov: number;
  shift: number; // how far the subject sits right of center on wide screens, fraction of the view width
  lift: number; // how far it sits above center on wide screens, fraction of the view height
  liftTall: number; // the same on tall (portrait) screens, where text goes above or below
  backTall: number; // extra pull-back on tall screens, for shots whose subject is wide
  yaw: Record<Kind, number>; // each tire's turn, radians; 0 faces the camera
  light: Record<Kind, number>; // light on each tire; the ones out of focus drop into the dark
};

/** Where each tire stands, meters along x. */
export const TIRE_X: Record<Kind, number> = { steer: -1.34, drive: 0, trailer: 1.34 };
const shot = (cam: Vec3, tgt: Vec3, fov: number) => ({ cam, tgt, fov });
const S = {
  lineup: shot([0, 0.82, 7.6], [0, 0.5, 0], 23),
  lineupPush: shot([0, 0.78, 6.6], [0, 0.5, 0], 23),
  wide: shot([0, 1.0, 7.9], [0, 0.48, 0], 23),
  side: (x: number) => shot([x + 1.08, 0.72, 2.4], [x + 0.02, 0.52, 0], 30),
  sideHold: (x: number) => shot([x + 0.98, 0.7, 2.2], [x + 0.02, 0.52, 0], 30),
  macro: (x: number) => shot([x + 0.42, 1.18, 1.05], [x, 0.86, 0], 34),
  macroHold: (x: number) => shot([x + 0.36, 1.12, 0.96], [x, 0.84, 0], 34),
};
const LINEUP_YAW = 0.62;
const yaw = (o: Partial<Record<Kind, number>> = {}) => ({ steer: LINEUP_YAW, drive: LINEUP_YAW, trailer: LINEUP_YAW, ...o });
const light = (focus?: Kind) => ({
  steer: !focus || focus === "steer" ? 1 : 0.02,
  drive: !focus || focus === "drive" ? 1 : 0.02,
  trailer: !focus || focus === "trailer" ? 1 : 0.02,
});
type Frame = Pick<Key, "shift" | "lift" | "liftTall" | "backTall">;
// lineup: subject low, text above it; side: subject right (or up on phones), text beside (or below)
const LOW: Frame = { shift: 0, lift: -0.25, liftTall: -0.3, backTall: 1.5 };
const RIGHT: Frame = { shift: 0.16, lift: 0, liftTall: 0.17, backTall: 1 };
const RIGHT_CLOSE: Frame = { shift: 0.25, lift: 0, liftTall: 0.3, backTall: 1.75 };
const key = (p: number, s: ReturnType<typeof shot>, f: Frame, y: Key["yaw"], l: Key["light"]): Key => ({ p, ...s, ...f, yaw: y, light: l });

// Each tire gets 0.27 of the scroll: fly in to a three-quarter view, hold, turn the
// tire to show its tread while the camera closes in, hold.
const INTRO = 0.12;
const PER_TIRE = 0.27;
const start = (i: number) => INTRO + i * PER_TIRE;

export const TIMELINE: Key[] = [
  key(0, S.lineup, LOW, yaw(), light()),
  key(0.04, S.lineup, LOW, yaw(), light()),
  key(INTRO, S.lineupPush, LOW, yaw(), light()),
  ...KINDS.flatMap((kind, i) => {
    const t0 = start(i), x = TIRE_X[kind];
    return [
      key(t0 + 0.08, S.side(x), RIGHT, yaw({ [kind]: -0.22 }), light(kind)),
      key(t0 + 0.13, S.sideHold(x), RIGHT, yaw({ [kind]: -0.12 }), light(kind)),
      key(t0 + 0.21, S.macro(x), RIGHT_CLOSE, yaw({ [kind]: 1.32 }), light(kind)),
      key(t0 + 0.27, S.macroHold(x), RIGHT_CLOSE, yaw({ [kind]: 1.4 }), light(kind)),
    ];
  }),
  key(1, S.wide, LOW, yaw(), light()),
];

/** When each block of text shows: [starts fading in, fully in, starts fading out, gone]. */
export type Window = [number, number, number, number];

export const BEATS = {
  intro: [-1, 0, 0.035, 0.06] as Window,
  bridge: [0.05, 0.065, 0.1, 0.125] as Window,
  ...Object.fromEntries(
    KINDS.flatMap((kind, i) => {
      const t0 = start(i);
      return [
        [`${kind}-name`, [t0 + 0.065, t0 + 0.08, t0 + 0.13, t0 + 0.15] as Window],
        [`${kind}-tread`, [t0 + 0.195, t0 + 0.21, t0 + 0.265, t0 + 0.28] as Window],
      ];
    }),
  ),
  outro: [0.955, 0.985, 2, 3] as Window,
} as Record<string, Window>;

/** Opacity of a block of text at progress p. */
export function beatOpacity([a, b, c, d]: Window, p: number) {
  if (p <= a || p >= d) return 0;
  if (p < b) return (p - a) / (b - a);
  if (p <= c) return 1;
  return 1 - (p - c) / (d - c);
}

/** Progress at which each beat's still is taken, for the static version of the sequence. */
export const STILLS: Record<string, number> = {
  intro: 0,
  ...Object.fromEntries(KINDS.flatMap((kind, i) => [[`${kind}-name`, start(i) + 0.11], [`${kind}-tread`, start(i) + 0.25]])),
};
