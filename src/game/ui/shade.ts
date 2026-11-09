/** `color` made darker (`k` below 1) or lighter (`k` above 1), channel by channel. */
export function shade(color: number, k: number): number {
  const channel = (shift: number) => Math.min(255, Math.round(((color >> shift) & 0xff) * k));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
