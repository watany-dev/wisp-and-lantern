import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../../domain/events";
import { balance } from "../../domain/balance";
import { colors, isColor, things, type CardId, type Lane } from "../../domain/lane";
import { reduce } from "../../domain/reducer";
import { initialState, type Lang } from "../../domain/state";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import { buttonRect, messageText, resultText, slotCenter, wisp } from "../lane-layout";
import { cardLabel, colorArt, hudView, itemArt, itemName, laneView, thingArt } from "../lane-view";

const strings = { ja, en };
const pick = (...cards: Extract<GameEvent, { type: "PickCard" }>["card"][]): GameEvent[] =>
  cards.map((card) => ({ type: "PickCard", card }));
const ask: GameEvent = { type: "Ask" };
const view = (lang: Lang, ...events: GameEvent[]) =>
  laneView(events.reduce(reduce, { ...initialState, lang, phase: "trial" as const, trial: 1 }));

// The first wish is the yellow lantern; red lantern is a different request.
const right = [...pick("yellow", "lantern"), ask];
const wrong = [...pick("red", "lantern"), ask];
const wish = { color: "yellow", thing: "lantern" } as const;

describe.each(["ja", "en"] as const)(
  "laneView messages in %s (REQ-2.4, REQ-2.6, REQ-2.7)",
  (lang) => {
    const s = strings[lang];

    it("invites the child to pick a card when none is picked, without saying which kind (REQ-3.2.2)", () => {
      expect(view(lang).message).toBe(s.lane.pickAny);
    });

    it("asks the child to tap the wisp once a card is picked, one or two (REQ-3.1.7)", () => {
      expect(view(lang, ...pick("blue")).message).toBe(s.lane.ready);
      expect(view(lang, ...pick("pumpkin")).message).toBe(s.lane.ready);
      expect(view(lang, ...pick("blue", "pumpkin")).message).toBe(s.lane.ready);
    });

    it("names what a one-card request brought, without saying it was as asked (REQ-3.4)", () => {
      // The first wish is the yellow lantern: red only brings the red pumpkin.
      const name = itemName({ color: "red", thing: "pumpkin" }, lang);
      const { message } = view(lang, ...pick("red"), ask);
      expect(message).toBe(s.lane.vague.replace("{0}", name));
      expect(message).toContain(name);
    });

    it("says the item is found after the right request, naming it", () => {
      const name = itemName(wish, lang);
      expect(view(lang, ...right).message).toBe(s.lane.right.replace("{0}", name));
      expect(view(lang, ...right).message).toContain(name);
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

describe("laneView names what was asked (REQ-2.5)", () => {
  it.each(["ja", "en"] as const)(
    "in %s, whatever pair is asked, the message names exactly that item and leaves no placeholder",
    (lang) => {
      for (const color of colors) {
        for (const thing of things) {
          const { message } = view(lang, ...pick(color, thing), ask);
          expect(message, `${color} ${thing}`).toContain(itemName({ color, thing }, lang));
          expect(message).not.toContain("{0}");
        }
      }
    },
  );
});

describe("laneView state (REQ-2.2, REQ-2.3, REQ-2.5)", () => {
  it("arms the wisp with one card or two, and not with none or after the search (REQ-3.1.5)", () => {
    expect(view("en").armed).toBe(false);
    expect(view("en", ...pick("blue")).armed).toBe(true);
    expect(view("en", ...pick("pumpkin")).armed).toBe(true);
    expect(view("en", ...pick("blue", "pumpkin")).armed).toBe(true);
    expect(view("en", ...wrong).armed).toBe(false);
    expect(view("en", ...pick("red"), ask).armed).toBe(false);
  });

  it("lists every card with its label, marking the picked ones", () => {
    const { cards } = view("en", ...pick("red", "lantern", "blue"));
    expect(cards.map((c) => c.id)).toEqual(["red", "blue", "yellow", "pumpkin", "lantern"]);
    expect(cards.map((c) => c.label)).toEqual(["red", "blue", "yellow", "pumpkin", "lantern"]);
    expect(cards.filter((c) => c.picked).map((c) => c.id)).toEqual(["blue", "lantern"]);
    expect(cards.every((c) => c.alpha === 1)).toBe(true);
    expect(view("ja").cards[0]?.label).toBe("\u3042\u304b\u3044");
  });

  it("locks the cards after the search and fades the ones that were not picked", () => {
    expect(view("en", ...pick("red", "lantern")).locked).toBe(false);
    const asked = view("en", ...wrong);
    expect(asked.locked).toBe(true);
    expect(asked.cards.map((c) => [c.id, c.alpha])).toEqual([
      ["red", 1],
      ["blue", 0.45],
      ["yellow", 0.45],
      ["pumpkin", 0.45],
      ["lantern", 1],
    ]);
  });

  it("fades the wisp only while no card is picked, and not once it can be sent or has searched (REQ-3.1.6)", () => {
    expect(view("en").wispAlpha).toBe(0.55);
    expect(view("en", ...pick("red")).wispAlpha).toBe(1);
    expect(view("en", ...pick("lantern")).wispAlpha).toBe(1);
    expect(view("en", ...pick("red", "lantern")).wispAlpha).toBe(1);
    expect(view("en", ...wrong).wispAlpha).toBe(1);
    expect(view("en", ...pick("red"), ask).wispAlpha).toBe(1);
  });

  it("lights the slot of what a one-card request brought, and flies the wisp there (REQ-3.3.6)", () => {
    // The first wish is the yellow lantern: lantern only brings the red lantern.
    const v = view("en", ...pick("lantern"), ask);
    expect(v.lit).toEqual({ color: "red", thing: "lantern" });
    expect(v.wispTarget).toEqual(slotCenter("red", "lantern"));
    expect(v.cards.filter((c) => c.picked).map((c) => c.id)).toEqual(["lantern"]);
    expect(v.star).toBe(false);
    expect(v.lesson).toBeNull();
    expect(v.button).toEqual({ text: en.retry, event: { type: "Retry" } });
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
    expect(again.cards.some((c) => c.picked)).toBe(false);
    expect(again.message).toBe(en.lane.pickAny);
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

// These states are built directly, so the view is tested on the lane alone, for every wish.
const resultView = (lang: Lang, wishIndex: number, pickCards: Lane["pick"]) =>
  laneView({
    ...initialState,
    lang,
    phase: "trial",
    trial: 1,
    lane: { wish: wishIndex, pick: pickCards, asked: true },
  });
const only = (card: CardId): Lane["pick"] =>
  isColor(card) ? { color: card, thing: null } : { color: null, thing: card };
const singleCards: CardId[] = [...colors, ...things];

describe("laneView shows the item that was brought, not the pick (REQ-3.3.6, REQ-3.4.1)", () => {
  // Wish 1 is the red pumpkin: red only brings the red lantern; pumpkin only brings the blue pumpkin.
  it.each([
    ["red", { color: "red", thing: "lantern" }],
    ["pumpkin", { color: "blue", thing: "pumpkin" }],
  ] as const)("for the red pumpkin wish, %s only lights %o", (card, item) => {
    const v = resultView("en", 1, only(card));
    expect(v.lit).toEqual(item);
    expect(v.wispTarget).toEqual(slotCenter(item.color, item.thing));
    expect(v.message).toBe(en.lane.vague.replace("{0}", itemName(item, "en")));
    expect(v.star).toBe(false);
    expect(v.button).toEqual({ text: en.retry, event: { type: "Retry" } });
  });

  it("names the brought item for every wish and every single card, in both languages", () => {
    for (const lang of ["ja", "en"] as const) {
      for (const [index, goal] of balance.wishes.entries()) {
        for (const card of singleCards) {
          const v = resultView(lang, index, only(card));
          const at = `${lang} / ${goal.color} ${goal.thing} / ${card}`;
          expect(v.lit, at).not.toBeNull();
          expect(v.lit, at).not.toEqual(goal);
          expect(v.message, at).toBe(
            strings[lang].lane.vague.replace("{0}", itemName(v.lit!, lang)),
          );
          expect(v.message, at).not.toContain("{0}");
          expect(v.wispTarget, at).toEqual(slotCenter(v.lit!.color, v.lit!.thing));
          expect(v.wish, at).toEqual(goal);
        }
      }
    }
  });

  it("marks only the cards the child picked, never the card the wisp filled in (REQ-3.3.6)", () => {
    const v = resultView("en", 1, only("red"));
    expect(v.cards.filter((c) => c.picked).map((c) => c.id)).toEqual(["red"]);
    expect(v.cards.find((c) => c.id === "lantern")).toMatchObject({ picked: false, alpha: 0.45 });
    expect(v.locked).toBe(true);
  });

  it("says 'as you asked' only for a complete request", () => {
    expect(resultView("en", 0, { color: "red", thing: "lantern" }).message).toBe(
      en.lane.wrong.replace("{0}", "red lantern"),
    );
    expect(resultView("en", 0, only("red")).message).toBe(
      en.lane.vague.replace("{0}", "red pumpkin"),
    );
  });

  it("is the same whatever the language, apart from the words (REQ-3.3.7)", () => {
    const a = resultView("ja", 2, only("yellow"));
    const b = resultView("en", 2, only("yellow"));
    expect([a.lit, a.wispTarget, a.star]).toEqual([b.lit, b.wispTarget, b.star]);
  });
});

describe("laneView closing line (REQ-3.5.1, REQ-3.5.2)", () => {
  it.each(["ja", "en"] as const)(
    "in %s, shows only on the right result, as its own text",
    (lang) => {
      const found = view(lang, ...pick("yellow", "lantern"), ask);
      expect(found.lesson).toBe(strings[lang].lane.lesson);
      expect(found.message).not.toContain(strings[lang].lane.lesson);
      expect(found.star).toBe(true);
      expect(view(lang, ...pick("red", "lantern"), ask).lesson).toBeNull();
      expect(resultView(lang, 0, only("yellow")).lesson).toBeNull();
      expect(view(lang).lesson).toBeNull();
      expect(view(lang, ...pick("yellow", "lantern")).lesson).toBeNull();
    },
  );

  it("goes away with the retry, and the next wish starts without it", () => {
    expect(view("en", ...right, { type: "Retry" }).lesson).toBeNull();
  });
});

const at = (p: { x: number; y: number }) => ({ x: p.x, y: p.y });

describe("laneView message position (REQ-3.5.4)", () => {
  it("keeps the message below the wisp while choosing and moves it into the wisp's spot after a result", () => {
    expect(view("en").messageAt).toEqual(at(messageText));
    expect(view("en", ...pick("red")).messageAt).toEqual(at(messageText));
    for (const events of [
      [...wrong],
      [...right],
      [...pick("red"), ask],
      [...pick("lantern"), ask],
    ]) {
      expect(view("en", ...events).messageAt).toEqual(at(resultText));
    }
    expect(view("en", ...right, { type: "Retry" }).messageAt).toEqual(at(messageText));
  });

  it("puts the result message where the retry button is not", () => {
    expect(resultText.y + resultText.height / 2).toBeLessThan(buttonRect.y - buttonRect.height / 2);
  });
});

const tick = (ms: number): GameEvent => ({ type: "Tick", ms });

describe.each(["ja", "en"] as const)("hudView in %s (REQ-4.2, REQ-4.7)", (lang) => {
  const hud = (...events: GameEvent[]) =>
    hudView(events.reduce(reduce, { ...initialState, lang, phase: "trial" as const, trial: 1 }));

  it("starts at 60 seconds with a full bar and no score", () => {
    expect(hud()).toEqual({
      seconds: 60,
      fraction: 1,
      score: strings[lang].run.score.replace("{0}", "0"),
    });
  });

  it("shows whole seconds, rounded up, so the last second reads 1 and not 0", () => {
    expect(hud(tick(1)).seconds).toBe(60);
    expect(hud(tick(1_000)).seconds).toBe(59);
    expect(hud(tick(58_999)).seconds).toBe(2);
    expect(hud(tick(59_999)).seconds).toBe(1);
  });

  it("empties the bar in proportion to the time used", () => {
    expect(hud(tick(15_000)).fraction).toBe(0.75);
    expect(hud(tick(30_000)).fraction).toBe(0.5);
  });

  it("shows the score after a find", () => {
    expect(hud(...right).score).toBe(strings[lang].run.score.replace("{0}", "100"));
  });
});
