import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../../domain/events";
import { reduce } from "../../domain/reducer";
import { initialState, type Lang } from "../../domain/state";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import { buttonRect, slotCenter, wisp } from "../lane-layout";
import { cardLabel, colorArt, itemArt, itemName, laneView, thingArt } from "../lane-view";

const strings = { ja, en };
const pick = (...cards: Extract<GameEvent, { type: "PickCard" }>["card"][]): GameEvent[] =>
  cards.map((card) => ({ type: "PickCard", card }));
const ask: GameEvent = { type: "Ask" };
const view = (lang: Lang, ...events: GameEvent[]) =>
  laneView(events.reduce(reduce, { ...initialState, lang, phase: "trial" as const, trial: 1 }));

// The first wish is the yellow lantern; red lantern is a different request.
const right = [...pick("yellow", "lantern"), ask];
const wrong = [...pick("red", "lantern"), ask];

describe.each(["ja", "en"] as const)(
  "laneView messages in %s (REQ-2.4, REQ-2.6, REQ-2.7)",
  (lang) => {
    const s = strings[lang];

    it("invites the child to pick, saying what is still missing", () => {
      expect(view(lang).message).toBe(s.lane.pickBoth);
      expect(view(lang, ...pick("blue")).message).toBe(s.lane.pickThing);
      expect(view(lang, ...pick("pumpkin")).message).toBe(s.lane.pickColor);
    });

    it("asks the child to tap the wisp once both cards are picked", () => {
      expect(view(lang, ...pick("blue", "pumpkin")).message).toBe(s.lane.ready);
    });

    it("says the item is found after the right request", () => {
      expect(view(lang, ...right).message).toBe(s.lane.right);
    });

    it("names exactly what was asked after a different request", () => {
      const name = itemName({ color: "red", thing: "lantern" }, lang);
      expect(view(lang, ...wrong).message).toBe(s.lane.wrong.replace("{0}", name));
      expect(view(lang, ...wrong).message).toContain(name);
    });

    it("offers no button until the helper has searched, then a retry", () => {
      expect(view(lang).button).toBeNull();
      expect(view(lang, ...pick("blue", "pumpkin")).button).toBeNull();
      expect(view(lang, ...wrong).button).toEqual({ text: s.retry, event: { type: "Retry" } });
      expect(view(lang, ...right).button).toEqual({ text: s.lane.again, event: { type: "Retry" } });
    });

    it("shows the villager's wish text", () => {
      expect(view(lang).wishText).toBe(s.lane.wish);
    });
  },
);

describe("laneView state (REQ-2.2, REQ-2.3, REQ-2.5)", () => {
  it("arms the wisp only with both cards picked and no search yet", () => {
    expect(view("en").armed).toBe(false);
    expect(view("en", ...pick("blue")).armed).toBe(false);
    expect(view("en", ...pick("blue", "pumpkin")).armed).toBe(true);
    expect(view("en", ...wrong).armed).toBe(false);
  });

  it("marks the picked cards, and locks them after the search", () => {
    expect(view("en", ...pick("red", "lantern", "blue")).picked).toEqual({
      color: "blue",
      thing: "lantern",
    });
    expect(view("en", ...pick("red", "lantern")).locked).toBe(false);
    expect(view("en", ...wrong).locked).toBe(true);
  });

  it("lights exactly the asked slot and flies the wisp there; before that the wisp stays home", () => {
    expect(view("en", ...pick("red", "lantern")).lit).toBeNull();
    expect(view("en", ...pick("red", "lantern")).wispTarget).toEqual(wisp);
    const asked = view("en", ...wrong);
    expect(asked.lit).toEqual({ color: "red", thing: "lantern" });
    expect(asked.wispTarget).toEqual(slotCenter("red", "lantern"));
  });

  it("shows the star only for the right result", () => {
    expect(view("en", ...right).star).toBe(true);
    expect(view("en", ...wrong).star).toBe(false);
    expect(view("en").star).toBe(false);
  });

  it("shows the wish the lane is on, moving on after a right result", () => {
    expect(view("en").wish).toEqual({ color: "yellow", thing: "lantern" });
    expect(view("en", ...wrong, { type: "Retry" }).wish).toEqual({
      color: "yellow",
      thing: "lantern",
    });
    expect(view("en", ...right, { type: "Retry" }).wish).toEqual({
      color: "red",
      thing: "pumpkin",
    });
  });

  it("goes back to choosing after the retry", () => {
    const again = view("en", ...wrong, { type: "Retry" });
    expect(again.button).toBeNull();
    expect(again.lit).toBeNull();
    expect(again.picked).toEqual({ color: null, thing: null });
    expect(again.message).toBe(en.lane.pickBoth);
  });

  it("keeps the retry button where the layout puts it", () => {
    expect(buttonRect.y).toBeGreaterThan(wisp.y);
  });
});

describe("card text and art (REQ-2.10)", () => {
  it("labels cards and items in the child's language", () => {
    // Hiragana, written as escapes because the repository is English-only (hard rule 1).
    expect(cardLabel("red", "ja")).toBe("\u3042\u304b\u3044");
    expect(cardLabel("lantern", "en")).toBe("lantern");
    expect(itemName({ color: "yellow", thing: "pumpkin" }, "ja")).toBe(
      "\u304d\u3044\u308d\u3044 \u304b\u307c\u3061\u3083",
    );
    expect(itemName({ color: "blue", thing: "lantern" }, "en")).toBe("blue lantern");
  });

  it("gives each color a fill, a shape and a pattern", () => {
    expect(colorArt("red")).toEqual({ fill: "#d33", shape: "circle", pattern: "stripes-v" });
    expect(colorArt("blue")).toEqual({ fill: "#36c", shape: "square", pattern: "dots" });
    expect(colorArt("yellow")).toEqual({ fill: "#ec3", shape: "triangle", pattern: "plain" });
  });

  it("gives each object a silhouette in a neutral fill", () => {
    expect(thingArt("pumpkin")).toEqual({ fill: "#ccc", silhouette: "pumpkin" });
    expect(thingArt("lantern")).toEqual({ fill: "#ccc", silhouette: "lantern" });
  });

  it("draws an item as the object's silhouette in the color's fill, pattern and shape", () => {
    expect(itemArt({ color: "blue", thing: "pumpkin" })).toEqual({
      fill: "#36c",
      pattern: "dots",
      badge: "square",
      silhouette: "pumpkin",
    });
    expect(itemArt({ color: "yellow", thing: "lantern" })).toEqual({
      fill: "#ec3",
      pattern: "plain",
      badge: "triangle",
      silhouette: "lantern",
    });
  });
});
