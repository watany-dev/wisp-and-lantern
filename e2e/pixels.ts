// Reads the pixels of a Playwright screenshot. The game draws all its text on a canvas, so the DOM
// has no copy of it: a smoke that only reads `window.__game` would pass even if the text never
// appeared. These helpers let a test look at what is on the screen, with no new dependency.

import { inflateSync } from "node:zlib";

export type Rgb = [number, number, number];
export type Image = { width: number; height: number; data: Buffer };

const png = { signature: 8, chunkOverhead: 12, rgb: 2, rgba: 6 } as const;

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Undoes the PNG row filter in place; `prev` is the previous, already unfiltered row. */
function unfilter(line: Buffer, prev: Buffer, filter: number, bpp: number): void {
  for (let i = 0; i < line.length; i += 1) {
    const a = i >= bpp ? line[i - bpp]! : 0;
    const b = prev[i]!;
    const c = i >= bpp ? prev[i - bpp]! : 0;
    const add = [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter];
    if (add === undefined) throw new Error(`unknown PNG filter ${filter}`);
    line[i] = (line[i]! + add) & 255;
  }
}

/** Decodes an 8-bit, non-interlaced RGB or RGBA PNG, which is what Playwright writes. */
export function decodePng(file: Buffer): Image {
  let width = 0;
  let height = 0;
  let channels = 0;
  const parts: Buffer[] = [];
  for (let pos = png.signature; pos < file.length;) {
    const length = file.readUInt32BE(pos);
    const type = file.toString("ascii", pos + 4, pos + 8);
    const body = file.subarray(pos + 8, pos + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [depth, colorType, , , interlace] = [body[8], body[9], body[10], body[11], body[12]];
      if (depth !== 8 || interlace !== 0) throw new Error("unsupported PNG");
      if (colorType !== png.rgb && colorType !== png.rgba) throw new Error("unsupported PNG color");
      channels = colorType === png.rgba ? 4 : 3;
    }
    if (type === "IDAT") parts.push(body);
    pos += length + png.chunkOverhead;
  }
  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  const data = Buffer.alloc(width * height * 4, 255);
  let prev: Buffer = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const start = y * (stride + 1);
    const line = Buffer.from(raw.subarray(start + 1, start + 1 + stride));
    unfilter(line, prev, raw[start]!, channels);
    for (let x = 0; x < width; x += 1) {
      line.copy(data, (y * width + x) * 4, x * channels, x * channels + 3);
    }
    prev = line;
  }
  return { width, height, data };
}

export function pixelAt(image: Image, x: number, y: number): Rgb {
  const i = (Math.round(y) * image.width + Math.round(x)) * 4;
  return [image.data[i]!, image.data[i + 1]!, image.data[i + 2]!];
}

export const near = (a: Rgb, b: Rgb, tolerance: number) =>
  a.every((v, i) => Math.abs(v - b[i]!) <= tolerance);

/** "#f4efe1" as [244, 239, 225]. */
export function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** How many pixels of the image satisfy `test`. */
export function countMatching(image: Image, test: (pixel: Rgb) => boolean): number {
  let count = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    if (test([image.data[i]!, image.data[i + 1]!, image.data[i + 2]!])) count += 1;
  }
  return count;
}
