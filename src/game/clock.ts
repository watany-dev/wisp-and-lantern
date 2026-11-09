/** The longest stretch of play time one frame may add to the run's clock. */
export const maxTickMs = 250;

/**
 * The play time a frame of `deltaMs` adds. A frame that comes after a stall, for example when the
 * tab was in the background, counts as at most `maxTickMs`, so a pause never eats the run.
 */
export function tickMs(deltaMs: number): number {
  return Math.min(Math.max(deltaMs, 0), maxTickMs);
}
