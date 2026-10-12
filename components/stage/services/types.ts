/**
 * What every service animation provides to the hero scene. Each service lives in its
 * own module in this folder and is loaded only when needed.
 *
 * Time: a service's animation runs on u, 0 to 1, driven by the scroll (scrolling back
 * plays it backwards), so everything must be a pure function of u. The scene handles
 * the move in from the lineup before u starts and the hold after it ends.
 *
 * Two kinds of service:
 * - Featuring a lineup tire (`tire` set): the other two tires fall into the dark, the
 *   camera moves from the lineup to keys[0], and `pose` can turn, roll or move the
 *   featured tire. Props usually attach to that tire's `spin` group, so they roll with it.
 * - A separate set (`root` set): the whole lineup fades out as the camera pushes in, then
 *   `root` (placed at the origin, on the same floor) fades up as the camera arrives at
 *   keys[0] out of the dark.
 */
import type * as THREE from "three";
import type { CameraKey } from "../shots";
import type { TireId, TireKind } from "../sequence";
import type { TireOptions } from "../tireModel";

export type TireHandle = {
  kind: TireKind;
  worn: boolean;
  pivot: THREE.Group; // stands on the floor at the tire's spot; turns about y (yaw), carries the contact shadow
  group: THREE.Group; // the tire, axle along the pivot's z; its own y axis is the axle (outboard +y)
  spin: THREE.Group; // rolls about the axle (the tire's local y); attach things here to roll with the tire
  radius: number; // tread radius, so pivot height of the axle
  light: { value: number }; // 0 to 1, how much light the tire gets
};

export type ServiceContext = {
  scene: THREE.Scene;
  font: string; // CSS font-family for lettering drawn on canvases
  small: boolean; // phone-class device: keep textures and geometry modest
  maxTexture: number; // largest texture side to use
  lineup: Record<TireId, TireHandle>;
  /** A separate tire for a set, standing at the origin, axle along z, facing +z. */
  newTire(kind: TireKind, opts?: Partial<Omit<TireOptions, "font" | "maxTexture">>): TireHandle;
  /** Make everything under root fade with a 0 to 1 uniform (returned). */
  dimmable(root: THREE.Object3D, uniform?: { value: number }): { value: number };
  /** A soft contact shadow, w by d meters, lying on the floor. */
  contact(w: number, d: number): THREE.Mesh;
  /** Yield to the browser between expensive steps, so building never blocks the page. */
  nextTask(): Promise<void>;
};

export type TirePose = Partial<{ yaw: number; roll: number; x: number; z: number; y: number }>;

export type ServiceSet = {
  /** The lineup tire this service features. */
  tire?: TireId;
  /** A separate set's objects, added to the scene by the core and shown only while active. */
  root?: THREE.Object3D;
  /** Camera keys over u (0 to 1). */
  keys: CameraKey[];
  /** The featured tire's turn (yaw), roll and position at u, if it moves. Omitted values stay as in the lineup. */
  pose?(u: number): TirePose;
  /** Where the studio key light aims, x and y in meters (default: the featured tire, or the origin). */
  focus?: [number, number];
  /** Bring the props to their state at u. fade is how much the set is lit (0 to 1) while it comes out of the dark. */
  update(u: number, fade: number): void;
  /** Put the props back as they should look while the service isn't playing. */
  rest?(): void;
};

export type ServiceFactory = (ctx: ServiceContext) => Promise<ServiceSet>;
