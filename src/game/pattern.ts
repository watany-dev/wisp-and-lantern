// The patterns that tell colors apart without color (REQ-2.10, hard rule 7), as plain marks.
// Coordinates are relative to the center of a square of side `size`; the scene only paints them.

export type Mark =
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "dot"; x: number; y: number; r: number };

const stripeCount = 4;

function stripes(size: number): Mark[] {
  const gap = size / stripeCount;
  return Array.from({ length: stripeCount }, (_, i) => {
    const x = (i - (stripeCount - 1) / 2) * gap;
    return { kind: "line", x1: x, y1: -size / 2, x2: x, y2: size / 2 };
  });
}

/** Four dots at the corners and one in the middle, like the five on a die. */
function dots(size: number): Mark[] {
  const r = size / 10;
  const d = size / 4;
  return [
    [-d, -d],
    [d, -d],
    [0, 0],
    [-d, d],
    [d, d],
  ].map(([x, y]) => ({ kind: "dot", x: x!, y: y!, r }));
}

/** `stripes-v` and `dots` draw marks; `plain` and anything unknown draw none. */
export function patternMarks(pattern: string, size: number): Mark[] {
  if (pattern === "stripes-v") return stripes(size);
  if (pattern === "dots") return dots(size);
  return [];
}

/** The ten corner points of a five-point star of outer radius `r`, starting at the top. */
export function starPoints(r: number): { x: number; y: number }[] {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r / 2;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
}
