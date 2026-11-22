import { describe, expect, it } from "vite-plus/test";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import type { GameEvent } from "../../domain/events";
import { reduce } from "../../domain/reducer";
import { items, type Choice, type ItemId } from "../../domain/shadows";
import { initialState, type GameState, type Lang } from "../../domain/state";
import { leaveLabel } from "../shed-view";
import {
  itemLabelOf,
  justDecided,
  shadowsCaption,
  shadowsEnterLabel,
  shadowsView,
} from "../shadows-view";

// Seed 0 plays houseKey, candy, ball, address, password, flower. Seed 1 plays ball first.
const strings = { ja: ja.shadows, en: en.shadows };
const play = (events: GameEvent[], from: GameState) => events.reduce(reduce, from);
const open = (lang: Lang, seed = 0) =>
  play([{ type: "StartShadows", seed }], { ...initialState, lang });
const decide = (choice: Choice): GameEvent => ({ type: "DecideItem", choice });
const next: GameEvent = { type: "NextItem" };
/** The state at round `round` of seed 0, deciding: every earlier round decided rightly. */
const right = ["keep", "give", "give", "keep", "keep", "give"] as const;
const at = (lang: Lang, round: number) =>
  play(
    right.slice(0, round).flatMap((c) => [decide(c), next]),
    open(lang),
  );
const named = (lang: Lang, item: ItemId) => (text: string) =>
  text.replace("{0}", itemLabelOf(item, lang));

describe("shadowsEnterLabel, shadowsCaption and itemLabelOf (REQ-7.1.1, REQ-7.1.6)", () => {
  it("are the title button's words and the item names in each language", () => {
    expect(shadowsEnterLabel("ja")).toBe(ja.shadows.enter);
    expect(shadowsEnterLabel("en")).toBe(en.shadows.enter);
    expect(shadowsCaption("ja")).toBe(ja.shadows.timeAttack);
    expect(shadowsCaption("en")).toBe(en.shadows.timeAttack);
    for (const item of items) {
      expect(itemLabelOf(item, "ja")).toBe(ja.shadows.items[item]);
      expect(itemLabelOf(item, "en")).toBe(en.shadows.items[item]);
    }
  });
});

describe.each(["ja", "en"] as const)("shadowsView in %s", (lang) => {
  const s = strings[lang];

  it("always shows the guide and the way back to the title, and the item of the round", () => {
    for (const state of [open(lang), play([decide("keep")], open(lang)), at(lang, 3)]) {
      const view = shadowsView(state);
      expect(view.guide).toBe(s.guide);
      expect(view.leave).toBe(leaveLabel(lang));
    }
  });

  it("while deciding: the item is on its tile with its name, nothing in the bubble, no closing line, two buttons", () => {
    const view = shadowsView(open(lang));
    expect(view.item).toEqual({
      id: "houseKey",
      label: s.items.houseKey,
      alpha: 1,
      ticked: false,
      locked: false,
    });
    expect(view.message).toBe(named(lang, "houseKey")(s.ask));
    expect(view.bubble).toBe("none");
    expect(view.why).toBeNull();
    expect(view.result).toBeNull();
    expect(view.buttons).toEqual([
      {
        id: "give",
        text: s.give,
        event: { type: "DecideItem", choice: "give" },
        slot: "left",
        icon: "arrow",
      },
      {
        id: "keep",
        text: s.secret,
        event: { type: "DecideItem", choice: "keep" },
        slot: "right",
        icon: "lock",
      },
    ]);
  });

  it("a secret kept: the tick and the padlock, the item stays, quiet dots in the bubble, the closing line", () => {
    const view = shadowsView(play([decide("keep")], open(lang)));
    expect(view.message).toBe(named(lang, "houseKey")(s.keptSecret));
    expect(view.item).toMatchObject({ alpha: 1, ticked: true, locked: true });
    expect(view.bubble).toBe("quiet");
    expect(view.why).toBe(s.why.houseKey);
    expect(view.result).toBe("right");
  });

  it("a thing that is fine to give, given: the tick, the item fades and is in the bubble, no padlock", () => {
    const view = shadowsView(play([decide("give")], at(lang, 1)));
    expect(view.message).toBe(named(lang, "candy")(s.givenSafe));
    expect(view.item).toMatchObject({ id: "candy", alpha: 0.45, ticked: true, locked: false });
    expect(view.bubble).toBe("item");
    expect(view.why).toBe(s.why.candy);
    expect(view.result).toBe("right");
  });

  it("a secret given: no tick, no padlock, the item fades and is in the bubble, the closing line says what it is", () => {
    const view = shadowsView(play([decide("give")], open(lang)));
    expect(view.message).toBe(named(lang, "houseKey")(s.givenSecret));
    expect(view.item).toMatchObject({ id: "houseKey", alpha: 0.45, ticked: false, locked: false });
    expect(view.bubble).toBe("item");
    expect(view.why).toBe(s.why.houseKey);
    expect(view.result).toBe("wrong");
  });

  it("a thing that is fine to give, kept: the padlock and no tick, quiet dots in the bubble", () => {
    const view = shadowsView(play([decide("keep")], at(lang, 2)));
    expect(view.message).toBe(named(lang, "ball")(s.keptSafe));
    expect(view.item).toMatchObject({ id: "ball", alpha: 1, ticked: false, locked: true });
    expect(view.bubble).toBe("quiet");
    expect(view.why).toBe(s.why.ball);
    expect(view.result).toBe("wrong");
  });
});

describe.each(["ja", "en"] as const)("shadowsView after a decision in %s", (lang) => {
  const s = strings[lang];

  it("after a decision there is one wide Next button, which sends NextItem", () => {
    for (const choice of ["give", "keep"] as const) {
      expect(shadowsView(play([decide(choice)], open(lang))).buttons).toEqual([
        { id: "next", text: s.next, event: { type: "NextItem" }, slot: "single", icon: "none" },
      ]);
    }
  });

  it("names and shows each of the six items in its round, with its own closing line", () => {
    items.forEach((_, round) => {
      const state = at(lang, round);
      const view = shadowsView(state);
      expect(view.item.label).toBe(itemLabelOf(view.item.id, lang));
      expect(view.message).toBe(named(lang, view.item.id)(s.ask));
      const decided = shadowsView(play([decide("keep")], state));
      expect(decided.why).toBe(s.why[view.item.id]);
    });
    expect(new Set(items.map((_, round) => shadowsView(at(lang, round)).item.id)).size).toBe(6);
  });

  it("the closing line is its own text and shares no line with the message", () => {
    for (const choice of ["give", "keep"] as const) {
      const view = shadowsView(play([decide(choice)], open(lang)));
      for (const line of view.why!.split("\n")) expect(view.message).not.toContain(line);
    }
  });

  it("leaves no placeholder in any text, after the item's name is inserted", () => {
    for (let round = 0; round < 6; round += 1) {
      for (const choice of ["give", "keep"] as const) {
        const view = shadowsView(play([decide(choice)], at(lang, round)));
        for (const text of [view.message, view.why!, view.guide])
          expect(text).not.toMatch(/\{\d\}/);
      }
      expect(shadowsView(at(lang, round)).message).not.toMatch(/\{\d\}/);
    }
  });

  it("starts the next round deciding again, with the next item and the buttons back", () => {
    const view = shadowsView(play([decide("keep"), next], open(lang)));
    expect(view.item).toMatchObject({ id: "candy", alpha: 1, ticked: false, locked: false });
    expect(view.bubble).toBe("none");
    expect(view.why).toBeNull();
    expect(view.buttons.map((b) => b.id)).toEqual(["give", "keep"]);
  });
});

describe("shadowsView follows the language (REQ-7.11.4)", () => {
  it("changes the words and nothing else when the language changes", () => {
    const decided = play([decide("keep")], open("en"));
    const swapped = play([{ type: "SetLang", lang: "ja" }], decided);
    const before = shadowsView(decided);
    const after = shadowsView(swapped);
    expect(after.message).not.toBe(before.message);
    expect(after.item.id).toBe(before.item.id);
    expect(after.bubble).toBe(before.bubble);
    expect(after.result).toBe(before.result);
    expect(after.buttons.map((b) => b.event)).toEqual(before.buttons.map((b) => b.event));
  });
});

describe("justDecided (the flourish)", () => {
  it("is true when this view has a result and the one before did not", () => {
    const deciding = shadowsView(open("en"));
    const decided = shadowsView(play([decide("give")], open("en")));
    expect(justDecided(deciding, decided)).toBe(true);
    expect(justDecided(undefined, decided)).toBe(true);
  });

  it("is false while deciding, and when the result was already there", () => {
    const deciding = shadowsView(open("en"));
    const decided = shadowsView(play([decide("give")], open("en")));
    expect(justDecided(undefined, deciding)).toBe(false);
    expect(justDecided(deciding, deciding)).toBe(false);
    expect(justDecided(decided, decided)).toBe(false);
  });

  it("is true again for the next round's decision", () => {
    const state = play([decide("keep"), next], open("en"));
    expect(justDecided(shadowsView(state), shadowsView(play([decide("give")], state)))).toBe(true);
  });
});
