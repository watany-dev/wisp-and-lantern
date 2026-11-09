import { describe, expect, it } from "vite-plus/test";
import { patternMarks, starPoints } from "../pattern";

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

describe("starPoints (REQ-2.6)", () => {
  it("alternates outer and inner corners, starting at the top and turning clockwise", () => {
    const expected = [
      [0, -10],
      [2.9389, -4.0451],
      [9.5106, -3.0902],
      [4.7553, 1.5451],
      [5.8779, 8.0902],
      [0, 5],
      [-5.8779, 8.0902],
      [-4.7553, 1.5451],
      [-9.5106, -3.0902],
      [-2.9389, -4.0451],
    ];
    const points = starPoints(10);
    expect(points).toHaveLength(10);
    points.forEach((p, i) => {
      expect(p.x).toBeCloseTo(expected[i]![0]!, 3);
      expect(p.y).toBeCloseTo(expected[i]![1]!, 3);
    });
  });

  it("scales with the radius", () => {
    expect(starPoints(20)[2]!.x).toBeCloseTo(19.0211, 3);
  });
});
