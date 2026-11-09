import { describe, expect, it } from "vite-plus/test";
import { patternMarks } from "../pattern";

describe("patternMarks (REQ-2.10)", () => {
  it("stripes-v draws four vertical lines across the square, centered", () => {
    expect(patternMarks("stripes-v", 40)).toEqual([
      { kind: "line", x1: -15, y1: -20, x2: -15, y2: 20 },
      { kind: "line", x1: -5, y1: -20, x2: -5, y2: 20 },
      { kind: "line", x1: 5, y1: -20, x2: 5, y2: 20 },
      { kind: "line", x1: 15, y1: -20, x2: 15, y2: 20 },
    ]);
  });

  it("dots draws five dots like a die, each a tenth of the size wide in radius", () => {
    expect(patternMarks("dots", 40)).toEqual([
      { kind: "dot", x: -10, y: -10, r: 4 },
      { kind: "dot", x: 10, y: -10, r: 4 },
      { kind: "dot", x: 0, y: 0, r: 4 },
      { kind: "dot", x: -10, y: 10, r: 4 },
      { kind: "dot", x: 10, y: 10, r: 4 },
    ]);
  });

  it("scales with the size", () => {
    expect(patternMarks("dots", 80)[0]).toEqual({ kind: "dot", x: -20, y: -20, r: 8 });
    expect(patternMarks("stripes-v", 80)[3]).toEqual({
      kind: "line",
      x1: 30,
      y1: -40,
      x2: 30,
      y2: 40,
    });
  });

  it("plain and unknown patterns draw nothing", () => {
    expect(patternMarks("plain", 40)).toEqual([]);
    expect(patternMarks("zigzag", 40)).toEqual([]);
  });
});
