// How a star looks: the clue that tells a fake from a real star before the child decides (REQ-6.2). The
// numbers are plain data so that a test can prove the clue exists without color and without sound: a fake
// star shines brighter (a larger, stronger, paler halo and a whiter body) and its rim is a ring of separate
// dots where a real star's rim is one unbroken line. The art in `ui/field-art.ts` only paints these numbers.
// Spec: .kiro/specs/06-trial-verify-stars/design.md, "The clue".

import type { Shine } from "../domain/field";

export type Look = {
  /** The star's body, its edge, and the pale core, as 0xRRGGBB. */
  body: number;
  edge: number;
  core: number;
  /** The halo: filled circles from the star outward, as [radius in star radii, alpha], and their color. */
  halo: readonly (readonly [number, number])[];
  haloColor: number;
  /** The rim: one unbroken ring, or a ring of separate dots. */
  rim: "line" | "dots";
  rimColor: number;
};

export const looks: Record<Shine, Look> = {
  normal: {
    body: 0xffd54a,
    edge: 0xb8962f,
    core: 0xfff3b0,
    halo: [
      [1.9, 0.07],
      [1.55, 0.1],
    ],
    haloColor: 0xffd54a,
    rim: "line",
    rimColor: 0xe8d9a0,
  },
  bright: {
    body: 0xfffbe6,
    edge: 0xfff3b0,
    core: 0xffffff,
    halo: [
      [2.3, 0.16],
      [1.9, 0.22],
      [1.55, 0.3],
    ],
    haloColor: 0xfffbe0,
    rim: "dots",
    rimColor: 0xffffff,
  },
};

/** The rim sits this many star radii from the middle. 12 dots, each this many star radii wide. */
export const rim = { radius: 1.5, dots: 12, dotRadius: 0.12, lineWidth: 0.14 } as const;

/** The slot behind a lit star (`palette.lit` in `ui/art.ts`, which imports Phaser). */
export const slotColor = 0x2a2a4a;

const channel = (hex: number, shift: number) => (hex >> shift) & 255;

/** Brightness 0 to 255 of a color, by the usual weights. The same value a grayscale screen would show. */
export function luma(hex: number): number {
  return 0.2126 * channel(hex, 16) + 0.7152 * channel(hex, 8) + 0.0722 * channel(hex, 0);
}

/** How much of the halo covers a point `radii` star radii from the middle: 0 (none) to 1 (all). */
export function haloCover(look: Look, radii: number): number {
  return 1 - look.halo.reduce((left, [reach, alpha]) => left * (radii <= reach ? 1 - alpha : 1), 1);
}

/** The brightness (0 to 255) of the slot's panel at a point `radii` star radii out, halo included. */
export function glowLuma(look: Look, radii: number): number {
  const cover = haloCover(look, radii);
  return luma(slotColor) * (1 - cover) + luma(look.haloColor) * cover;
}

/** The dots of a dotted rim: the angle of each in radians, from the right, going round. */
export const dotAngles: readonly number[] = Array.from(
  { length: rim.dots },
  (_, k) => (k * 2 * Math.PI) / rim.dots,
);
