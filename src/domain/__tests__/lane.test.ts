import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import {
  colors,
  initialLane,
  isColor,
  isComplete,
  outcome,
  things,
  wishAt,
  type Lane,
} from "../lane";

const asked = (color: Lane["pick"]["color"], thing: Lane["pick"]["thing"], wish = 0): Lane => ({
  wish,
  pick: { color, thing },
  asked: true,
});

describe("isColor", () => {
  it("is true for every color card and false for every object card", () => {
    for (const c of colors) expect(isColor(c)).toBe(true);
    for (const t of things) expect(isColor(t)).toBe(false);
  });
});

describe("isComplete", () => {
  it("needs both a color and an object", () => {
    expect(isComplete({ color: null, thing: null })).toBe(false);
    expect(isComplete({ color: "red", thing: null })).toBe(false);
    expect(isComplete({ color: null, thing: "pumpkin" })).toBe(false);
    expect(isComplete({ color: "red", thing: "pumpkin" })).toBe(true);
  });
});

describe("wishAt", () => {
  it("returns the wish at the index", () => {
    balance.wishes.forEach((w, i) => expect(wishAt(i)).toBe(w));
  });
});

describe("outcome", () => {
  it("is choosing until the helper has searched, whatever is picked", () => {
    expect(outcome(initialLane)).toBe("choosing");
    expect(outcome({ ...asked("yellow", "lantern"), asked: false })).toBe("choosing");
  });

  it("is right only when both the color and the object are the wish", () => {
    // wish 0 is the yellow lantern.
    expect(outcome(asked("yellow", "lantern"))).toBe("right");
    expect(outcome(asked("red", "lantern"))).toBe("wrong");
    expect(outcome(asked("yellow", "pumpkin"))).toBe("wrong");
    expect(outcome(asked("red", "pumpkin"))).toBe("wrong");
  });

  it("reads the wish the lane is on", () => {
    expect(outcome(asked("red", "pumpkin", 1))).toBe("right");
    expect(outcome(asked("yellow", "lantern", 1))).toBe("wrong");
  });
});
