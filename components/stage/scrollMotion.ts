/** Damped scroll tracking with limits on speed and acceleration, in timeline units. */
export type ScrollMotion = { value: number; velocity: number };
export const MAX_SCROLL_SPEED = 0.16;
export const MAX_SCROLL_ACCELERATION = 0.65;
const clamp = (x: number, limit: number) => Math.max(-limit, Math.min(limit, x));

export function advanceScroll(motion: ScrollMotion, target: number, elapsed: number): ScrollMotion {
  let value = motion.value, velocity = motion.velocity;
  // Small integration steps keep the spring stable even after a dropped frame.
  let remaining = Math.min(0.1, Math.max(0, elapsed));
  while (remaining > 1e-9) {
    const dt = Math.min(1 / 120, remaining);
    const error = target - value;
    const acceleration = clamp(36 * error - 12 * velocity, MAX_SCROLL_ACCELERATION);
    velocity = clamp(velocity + acceleration * dt, MAX_SCROLL_SPEED);
    const next = value + velocity * dt;
    if (error * (target - next) <= 0 && error * velocity > 0) {
      value = target;
      velocity = 0;
    } else {
      value = Math.max(0, Math.min(1, next));
      if (value !== next) velocity = 0;
    }
    remaining -= dt;
  }
  if (Math.abs(target - value) < 1e-5 && Math.abs(velocity) < 1e-4) return { value: target, velocity: 0 };
  return { value, velocity };
}
