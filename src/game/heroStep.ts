export type Point = { x: number; y: number };

/**
 * One movement step from `hero` toward `target`, at `speed` units per second over `deltaMs`.
 * Never overshoots the target. Returns null when the target is less than 1 unit away.
 */
export function stepToward(
  hero: Point,
  target: Point,
  deltaMs: number,
  speed: number,
): Point | null {
  const dx = target.x - hero.x;
  const dy = target.y - hero.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return null;
  const step = Math.min(distance, (speed * deltaMs) / 1000);
  return { x: hero.x + (dx / distance) * step, y: hero.y + (dy / distance) * step };
}
