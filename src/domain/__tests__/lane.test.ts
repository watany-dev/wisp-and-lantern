import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import {
  canAsk,
  colors,
  deliver,
  delivered,
  hasPick,
  initialLane,
  isColor,
  isComplete,
  outcome,
  things,
  wishAt,
  type CardId,
  type Lane,
  type Pick,
  type Wish,
} from "../lane";

const asked = (color: Lane["pick"]["color"], thing: Lane["pick"]["thing"], wish = 0): Lane => ({
  wish,
  pick: { color, thing },
  asked: true,
});

const choosing = (color: Lane["pick"]["color"], thing: Lane["pick"]["thing"]): Lane => ({
  ...initialLane,
  pick: { color, thing },
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

describe("canAsk", () => {
  it("is true only with both cards picked and no search yet", () => {
    expect(canAsk(initialLane)).toBe(false);
    expect(canAsk(choosing("red", null))).toBe(false);
    expect(canAsk(choosing(null, "lantern"))).toBe(false);
    expect(canAsk(choosing("red", "lantern"))).toBe(true);
    expect(canAsk(asked("red", "lantern"))).toBe(false);
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

describe("hasPick (REQ-3.1)", () => {
  it("is true as soon as one card is picked, whichever row it is in", () => {
    expect(hasPick({ color: null, thing: null })).toBe(false);
    expect(hasPick({ color: "red", thing: null })).toBe(true);
    expect(hasPick({ color: null, thing: "pumpkin" })).toBe(true);
    expect(hasPick({ color: "red", thing: "pumpkin" })).toBe(true);
  });
});

const allWishes: Wish[] = colors.flatMap((color) => things.map((thing) => ({ color, thing })));

/** "red pumpkin" as an item; the table below is written out by hand, not computed with the rule. */
const item = (text: string): Wish => {
  const found = allWishes.find((w) => `${w.color} ${w.thing}` === text);
  if (!found) throw new Error(`not a lane item: ${text}`);
  return found;
};
const single = (card: CardId): Pick =>
  isColor(card) ? { color: card, thing: null } : { color: null, thing: card };

// wish -> [red only, blue only, yellow only, pumpkin only, lantern only] (REQ-3.3.3, REQ-3.3.4):
// a color brings that color with the other object; an object brings that object with the color
// after the wish's color (red, blue, yellow, then red again).
const vagueTable: [string, string[]][] = [
  [
    "red pumpkin",
    ["red lantern", "blue lantern", "yellow lantern", "blue pumpkin", "blue lantern"],
  ],
  [
    "red lantern",
    ["red pumpkin", "blue pumpkin", "yellow pumpkin", "blue pumpkin", "blue lantern"],
  ],
  [
    "blue pumpkin",
    ["red lantern", "blue lantern", "yellow lantern", "yellow pumpkin", "yellow lantern"],
  ],
  [
    "blue lantern",
    ["red pumpkin", "blue pumpkin", "yellow pumpkin", "yellow pumpkin", "yellow lantern"],
  ],
  [
    "yellow pumpkin",
    ["red lantern", "blue lantern", "yellow lantern", "red pumpkin", "red lantern"],
  ],
  [
    "yellow lantern",
    ["red pumpkin", "blue pumpkin", "yellow pumpkin", "red pumpkin", "red lantern"],
  ],
];
const singleCards: CardId[] = ["red", "blue", "yellow", "pumpkin", "lantern"];
describe("deliver: one card (REQ-3.3)", () => {
  it.each(
    vagueTable.flatMap(([w, row]) => singleCards.map((card, i) => [w, card, row[i]!] as const)),
  )("for the %s wish, %s only brings the %s", (wish, card, brought) => {
    expect(deliver(single(card), item(wish))).toEqual(item(brought));
  });

  it("covers every wish and every single card in the table", () => {
    expect(vagueTable.map(([w]) => w).sort()).toEqual(
      allWishes.map((w) => `${w.color} ${w.thing}`).sort(),
    );
    for (const [, row] of vagueTable) expect(row).toHaveLength(singleCards.length);
  });

  it("keeps what the child picked and never brings the wish (REQ-3.3.5)", () => {
    for (const wish of allWishes) {
      for (const card of singleCards) {
        const brought = deliver(single(card), wish);
        expect(
          brought[isColor(card) ? "color" : "thing"],
          `${wish.color} ${wish.thing} / ${card}`,
        ).toBe(card);
        expect(brought).not.toEqual(wish);
      }
    }
  });
});

describe("deliver: both cards or none (REQ-3.3.2)", () => {
  it("brings the pair itself for every pair and every wish, even when it is not the wish", () => {
    for (const wish of allWishes) {
      for (const pair of allWishes) expect(deliver(pair, wish)).toEqual(pair);
    }
  });

  it("brings the wish when the pair is the wish, so a complete request is not corrected", () => {
    for (const wish of allWishes) expect(deliver(wish, wish)).toEqual(wish);
  });

  it("fills in both cards by the same rule when none is picked (never reached: Ask needs a card)", () => {
    expect(deliver({ color: null, thing: null }, item("red pumpkin"))).toEqual(
      item("blue lantern"),
    );
    expect(deliver({ color: null, thing: null }, item("yellow lantern"))).toEqual(
      item("red pumpkin"),
    );
  });

  it("is deterministic: the same request and wish give the same item every time (REQ-3.3.7)", () => {
    const pick = single("lantern");
    const wish = item("blue pumpkin");
    expect(deliver(pick, wish)).toEqual(deliver({ ...pick }, { ...wish }));
    expect(deliver(pick, wish)).toEqual(deliver(pick, wish));
  });

  it("does not change the pick it is given", () => {
    const pick = Object.freeze({ color: "red", thing: null } as const);
    expect(() => deliver(pick, item("red pumpkin"))).not.toThrow();
    expect(pick).toEqual({ color: "red", thing: null });
  });
});

describe("delivered", () => {
  it("is null until the wisp has searched, whatever is picked", () => {
    expect(delivered(initialLane)).toBeNull();
    expect(
      delivered({ wish: 1, pick: { color: "red", thing: "pumpkin" }, asked: false }),
    ).toBeNull();
  });

  it("is what the wisp brings for the wish the lane is on", () => {
    // wish 0 is the yellow lantern, wish 1 the red pumpkin, wish 2 the blue lantern.
    const red: Pick = { color: "red", thing: null };
    expect(delivered({ wish: 0, pick: red, asked: true })).toEqual(item("red pumpkin"));
    expect(delivered({ wish: 1, pick: red, asked: true })).toEqual(item("red lantern"));
    expect(delivered({ wish: 2, pick: single("pumpkin"), asked: true })).toEqual(
      item("yellow pumpkin"),
    );
    expect(delivered(asked("red", "lantern"))).toEqual(item("red lantern"));
  });
});
