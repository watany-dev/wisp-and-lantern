export type Point = { x: number; y: number };

/**
 * The next position when moving from `from` toward `target` at `speed` pixels per second for
 * `deltaMs`. Never overshoots the target. Returns null when the target is under one pixel away.
 */
export function stepToward(
  from: Point,
  target: Point,
  speed: number,
  deltaMs: number,
): Point | null {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return null;
  const step = Math.min(distance, (speed * deltaMs) / 1000);
  return { x: from.x + (dx / distance) * step, y: from.y + (dy / distance) * step };
}
