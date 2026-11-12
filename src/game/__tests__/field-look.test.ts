import { describe, expect, it } from "vite-plus/test";
import { dotAngles, glowLuma, haloCover, looks, luma, rim, slotColor } from "../field-look";

// The clue (REQ-6.2): a fake star must differ from a real one by more than color, and the difference must
// survive a grayscale screen (it is measured in brightness) and a silent game (it is a picture).

describe("luma", () => {
  it("is 0 for black, 255 for white, and weights green most", () => {
    expect(luma(0x000000)).toBe(0);
    expect(luma(0xffffff)).toBeCloseTo(255, 5);
    expect(luma(0x00ff00)).toBeGreaterThan(luma(0xff0000));
    expect(luma(0xff0000)).toBeGreaterThan(luma(0x0000ff));
    expect(luma(0x0000ff)).toBeCloseTo(0.0722 * 255, 5);
  });
});

describe("the halo", () => {
  it("covers nothing beyond its largest circle and something inside it", () => {
    expect(haloCover(looks.normal, 2)).toBe(0);
    expect(haloCover(looks.bright, 2.4)).toBe(0);
    expect(haloCover(looks.normal, 1)).toBeGreaterThan(0);
    expect(haloCover(looks.bright, 1)).toBeGreaterThan(0);
  });

  it("covers more the closer to the star, never above 1", () => {
    for (const look of Object.values(looks)) {
      let last = 0;
      for (let radii = 2.4; radii >= 0.5; radii -= 0.1) {
        const cover = haloCover(look, radii);
        expect(cover).toBeGreaterThanOrEqual(last);
        expect(cover).toBeLessThan(1);
        last = cover;
      }
    }
  });

  it("combines the circles the way stacked translucent layers do", () => {
    expect(haloCover(looks.normal, 1.5)).toBeCloseTo(1 - (1 - 0.07) * (1 - 0.1), 10);
    expect(haloCover(looks.bright, 1.5)).toBeCloseTo(1 - (1 - 0.16) * (1 - 0.22) * (1 - 0.3), 10);
    expect(haloCover(looks.bright, 2.2)).toBeCloseTo(0.16, 10);
  });
});

const reach = (look: (typeof looks)["normal"]) => Math.max(...look.halo.map(([r]) => r));

describe("the halo's edge and the brightness at a point", () => {
  it("includes a circle at exactly its radius and nothing beyond it", () => {
    expect(haloCover(looks.normal, 1.9)).toBeCloseTo(0.07, 10);
    expect(haloCover(looks.normal, 1.9001)).toBe(0);
    expect(haloCover(looks.normal, 1.55)).toBeCloseTo(1 - 0.93 * 0.9, 10);
    expect(haloCover(looks.bright, 2.3)).toBeCloseTo(0.16, 10);
    expect(haloCover(looks.bright, 2.3001)).toBe(0);
  });

  it("mixes the slot's brightness (44.31) and the halo's by the cover", () => {
    // The slot is 0x2a2a4a, the real star's halo gold 0xffd54a (211.89), the fake star's 0xfffbe0.
    expect(glowLuma(looks.normal, 3)).toBeCloseTo(44.3104, 3);
    const real = 1 - 0.93 * 0.9;
    expect(glowLuma(looks.normal, 1.3)).toBeCloseTo(44.3104 * (1 - real) + 211.8934 * real, 3);
    const fake = 1 - 0.84 * 0.78 * 0.7;
    const white = 0.2126 * 255 + 0.7152 * 251 + 0.0722 * 224;
    expect(glowLuma(looks.bright, 1.3)).toBeCloseTo(44.3104 * (1 - fake) + white * fake, 3);
  });
});

describe("a fake star shines brighter than a real one (REQ-6.2.2)", () => {
  it("has a whiter body and core, which survives losing color", () => {
    expect(luma(looks.bright.body)).toBeGreaterThan(luma(looks.normal.body) + 20);
    expect(luma(looks.bright.core)).toBeGreaterThan(luma(looks.normal.core));
  });

  it("has a stronger and wider halo: brighter by 40 of 255 at the probe, and further out", () => {
    for (const radii of [1.3, 1.5, 1.7]) {
      expect(glowLuma(looks.bright, radii) - glowLuma(looks.normal, radii)).toBeGreaterThan(40);
    }
    expect(reach(looks.bright)).toBeGreaterThan(reach(looks.normal));
  });

  it("measures the halo against the slot's own panel", () => {
    expect(glowLuma(looks.normal, 3)).toBeCloseTo(luma(slotColor), 8);
    expect(glowLuma(looks.bright, 1.3)).toBeGreaterThan(luma(slotColor));
  });

  it("differs by the edge too, not only by brightness: a line for a real star, dots for a fake one", () => {
    expect(looks.normal.rim).toBe("line");
    expect(looks.bright.rim).toBe("dots");
  });

  it("keeps the rim colors bright enough to read against the slot in grayscale", () => {
    for (const look of Object.values(looks)) {
      expect(luma(look.rimColor) - luma(slotColor)).toBeGreaterThan(100);
    }
  });
});

describe("the dotted rim", () => {
  it("has twelve dots, evenly round the star, that do not touch each other", () => {
    expect(dotAngles).toHaveLength(rim.dots);
    const step = (2 * Math.PI) / rim.dots;
    dotAngles.forEach((angle, k) => expect(angle).toBeCloseTo(k * step, 10));
    const between = 2 * rim.radius * Math.sin(step / 2);
    expect(between).toBeGreaterThan(2 * rim.dotRadius + 0.3);
  });
});
