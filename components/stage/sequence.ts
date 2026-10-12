/**
 * The hero's timeline, by scroll progress P through the pinned section (0 to 1), in
 * three parts:
 *
 *   intro    the three tires come up out of the dark while the camera swings round
 *   pick     a hold on the lineup while the visitor picks a service
 *   service  that service's own animation (TTP Tire if nobody picks), then a hold for
 *            the booking panel
 *
 * Free of three.js so the page can lay out the text without loading the 3D code.
 */
import type { CameraKey, Frame } from "./shots";

export const SERVICE_IDS = ["ttp", "new", "used", "repair", "balance", "alignment", "ac", "washout", "maintenance"] as const;
export type ServiceId = (typeof SERVICE_IDS)[number];
export const DEFAULT_SERVICE: ServiceId = "ttp";
export const isServiceId = (s: string): s is ServiceId => (SERVICE_IDS as readonly string[]).includes(s);

/** The lineup: a new TTP Tire (the shop's own brand), a used drive tire, a trailer tire that will be repaired. */
export const TIRES = ["fresh", "used", "repaired"] as const;
export type TireId = (typeof TIRES)[number];
export type TireKind = "steer" | "drive" | "trailer";
export const LINEUP: Record<TireId, { kind: TireKind; x: number; worn?: boolean; brand?: boolean }> = {
  fresh: { kind: "steer", x: -1.34, brand: true },
  used: { kind: "drive", x: 0, worn: true },
  repaired: { kind: "trailer", x: 1.34 },
};
export const LINEUP_YAW = 0.62;

// Scroll length of each part, in screen heights.
const LEN = { intro: 1.7, pick: 0.9, service: 3.8 };
const TOTAL = LEN.intro + LEN.pick + LEN.service;
/** Height of the pinned section, in screen heights (the scroll plus the screen itself). */
export const SECTION_SCREENS = TOTAL + 1;
export const INTRO_END = LEN.intro / TOTAL;
export const PICK_END = (LEN.intro + LEN.pick) / TOTAL;
/** Where "See another service" scrolls back to: the middle of the pick hold. */
export const PICK_REST = INTRO_END + (PICK_END - INTRO_END) * 0.55;

// Inside a service, s runs 0 to 1: the move in from the lineup, the service's own
// animation (u, 0 to 1), then a hold while the booking panel is up.
export const SERVICE_IN = 0.14;
export const SERVICE_HOLD = 0.12;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export type Phase = { part: "intro"; t: number } | { part: "pick" } | { part: "service"; s: number; inT: number; u: number };

export function phaseAt(P: number): Phase {
  if (P < INTRO_END) return { part: "intro", t: clamp01(P / INTRO_END) };
  if (P < PICK_END) return { part: "pick" };
  const s = clamp01((P - PICK_END) / (1 - PICK_END));
  return { part: "service", s, inT: clamp01(s / SERVICE_IN), u: clamp01((s - SERVICE_IN) / (1 - SERVICE_IN - SERVICE_HOLD)) };
}

/** Scroll progress at which a service's own animation is at u (for stills and tests). */
export const progressFor = (u: number) => PICK_END + (SERVICE_IN + u * (1 - SERVICE_IN - SERVICE_HOLD)) * (1 - PICK_END);
/** Scroll progress where a service starts (just after the pick hold). */
export const SERVICE_START = PICK_END + 0.004;

// ------------------------------------------------------------------ text
/** When a block of text shows: [starts fading in, fully in, starts fading out, gone]. */
export type Window = [number, number, number, number];
const I = (t: number) => t * INTRO_END;
const S = (s: number) => PICK_END + s * (1 - PICK_END);

export const BEATS = {
  intro: [-1, 0, I(0.06), I(0.2)] as Window,
  bridge: [I(0.42), I(0.52), I(0.78), I(0.9)] as Window,
  pick: [I(0.94), INTRO_END + 0.004, PICK_END - 0.006, S(0.06)] as Window,
  name: [S(0.13), S(0.18), S(0.44), S(0.49)] as Window,
  detail: [S(0.52), S(0.57), S(0.82), S(0.86)] as Window,
  end: [S(0.88), S(0.92), 2, 3] as Window,
} satisfies Record<string, Window>;
export type BeatId = keyof typeof BEATS;

export function beatOpacity([a, b, c, d]: Window, P: number) {
  if (P <= a || P >= d) return 0;
  if (P < b) return (P - a) / (b - a);
  if (P <= c) return 1;
  return 1 - (P - c) / (d - c);
}

// ------------------------------------------------------------------ the intro's camera
// low and wide, the lineup in silhouette; then round to the right as the light comes
// up; then square on, the lineup low in frame with room above for the picker
const LOW: Frame = { shift: 0, lift: -0.2, liftTall: -0.12, backTall: 1.5 };
const PICK_FRAME: Frame = { shift: 0, lift: -0.27, liftTall: -0.2, backTall: 1.5 };
// phones see the lineup from off to the right, so the three stand staggered and fill the frame
const TALL_START = { cam: [10.6, 1.5, 6.3] as [number, number, number], tgt: [-0.05, 0.5, 0] as [number, number, number], fov: 22 };
const TALL_PICK = { cam: [9.6, 2.2, 6.6] as [number, number, number], tgt: [0, 0.55, 0] as [number, number, number], fov: 23 };

export const INTRO_KEYS: CameraKey[] = [
  { t: 0, cam: [0, 0.62, 8.4], tgt: [0, 0.52, 0], fov: 22, frame: LOW, tall: TALL_START },
  { t: 0.5, cam: [3.4, 1.02, 6.4], tgt: [0.15, 0.52, 0], fov: 24, frame: LOW, ease: "pass", tall: { cam: [7.4, 1.6, 8.0], tgt: [0, 0.52, 0], fov: 23 } },
  { t: 1, cam: [0, 0.98, 7.7], tgt: [0, 0.6, 0], fov: 23, frame: PICK_FRAME, tall: TALL_PICK },
];
/** How much of the key light is up through the intro: the tires start in silhouette. */
export const introLight = (t: number) => 0.28 + 0.72 * clamp01((t - 0.08) / 0.55);
/** How the tires turn through the intro: square to the camera, then round to three-quarters. */
export const introYaw = (t: number) => 0.18 + (LINEUP_YAW - 0.18) * clamp01(t / 0.85);
