import { describe, expect, it } from "vite-plus/test";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import { slipAt, toolFor, wishAt, type Thing } from "../../domain/crown";
import type { GameEvent } from "../../domain/events";
import type { LookId } from "../../domain/lantern";
import { reduce } from "../../domain/reducer";
import { initialState, type GameState } from "../../domain/state";
import { oneButton, tellButton, tellCard, thingTile, twoButtons } from "../crown-layout";
import { crownCaption, crownEnterLabel, crownView, justLit, type CrownView } from "../crown-view";

// Trial 6's view (spec 09-trial-hollow-crown, REQ-9.2 to REQ-9.10). Seed 0, chain 0: the wish is a pointy roof and
// a candle, leaves block the door, the things are the broom, the hammer and the house key, and the wisp makes a round
// roof.

const play = (events: GameEvent[], from: GameState = initialState) => events.reduce(reduce, from);
const say = (look: LookId): GameEvent => ({ type: "SayLook", look });
const tell: GameEvent = { type: "Tell" };
const give = (thing: Thing): GameEvent => ({ type: "GiveItem", thing });
const go: GameEvent = { type: "Go" };
const check = (same: boolean): GameEvent => ({ type: "CheckLamp", same });
const point = (part: "roof" | "light"): GameEvent => ({ type: "PointLamp", part });
const fix = (look: LookId): GameEvent => ({ type: "FixLamp", look });
const next: GameEvent = { type: "NextLamp" };

const visit = (lang: "ja" | "en" = "en") =>
  play([
    { type: "SetLang", lang },
    { type: "StartCrown", seed: 0 },
  ]);
const chain = (seed: number, n: number): GameEvent[] => {
  const wish = wishAt(seed, n);
  const slip = slipAt(seed, n);
  return [
    say(wish.roof),
    say(wish.light),
    tell,
    give(toolFor(seed, n)),
    go,
    check(false),
    point(slip),
    fix(wish[slip]),
    check(true),
  ];
};
const at = (events: GameEvent[], lang: "ja" | "en" = "en") => crownView(play(events, visit(lang)));
const marks = (view: CrownView) => view.steps.map((s) => s.mark);
const ids = (view: CrownView) => view.controls.map((c) => c.id);

describe("crownView: the row of steps (REQ-9.3.3)", () => {
  it("names the five steps in order in each language", () => {
    expect(at([]).steps.map((s) => s.word)).toEqual(["Tell", "Give", "Go", "Check", "Fix"]);
    expect(at([], "ja").steps.map((s) => s.word)).toEqual(Object.values(ja.crown.steps));
  });

  it("frames the step the child is on, ticks the ones done, and leaves the rest plain", () => {
    expect(marks(at([]))).toEqual(["now", "later", "later", "later", "later"]);
    expect(marks(at(chain(0, 0).slice(0, 3)))).toEqual(["done", "now", "later", "later", "later"]);
    expect(marks(at(chain(0, 0).slice(0, 4)))).toEqual(["done", "done", "now", "later", "later"]);
    expect(marks(at(chain(0, 0).slice(0, 5)))).toEqual(["done", "done", "done", "now", "later"]);
    expect(marks(at(chain(0, 0).slice(0, 6)))).toEqual(["done", "done", "done", "done", "now"]);
    expect(marks(at(chain(0, 0).slice(0, 8)))).toEqual(["done", "done", "done", "now", "later"]);
    expect(marks(at(chain(0, 0)))).toEqual(["done", "done", "done", "done", "done"]);
  });
});

describe("crownView: the tell step (REQ-9.4)", () => {
  it("shows six cards and Tell, with the guide and the question, and the told panel", () => {
    const view = at([]);
    expect(view.guide).toBe(en.crown.guide.tell);
    expect(view.message).toBe(en.crown.tell);
    expect(view.wishLabel).toBe(en.crown.wish);
    expect(view.panelLabel).toBe(en.crown.panel.told);
    expect(view.wish).toEqual({ roof: "pointy", light: "candle" });
    expect(view.panel).toEqual({ kind: "told", told: { roof: null, light: null } });
    expect(ids(view)).toEqual(["pointy", "round", "flat", "candle", "star", "moon", "tell"]);
    expect(view.controls[1]).toEqual({
      id: "round",
      text: "round",
      event: { type: "SayLook", look: "round" },
      rect: tellCard("roof", 1),
      icon: "round",
      picked: false,
    });
    expect(view.controls[5]!.rect).toEqual(tellCard("light", 2));
    expect(view.controls[6]).toEqual({
      id: "tell",
      text: "Tell",
      event: { type: "Tell" },
      rect: tellButton,
      icon: "none",
      picked: false,
    });
  });

  it("marks the picked card of each part and shows what was told so far", () => {
    const view = at([say("flat"), say("star")]);
    expect(view.controls.filter((c) => c.picked).map((c) => c.id)).toEqual(["flat", "star"]);
    expect(view.panel).toEqual({ kind: "told", told: { roof: "flat", light: "star" } });
  });

  it("says which part the wisp is asking for after a Tell with one card", () => {
    expect(at([say("flat"), tell]).message).toBe("Which light?\nThe wisp is asking");
    expect(at([tell]).message).toBe("Which roof?\nThe wisp is asking");
    expect(at([tell], "ja").message).toBe(ja.crown.missing.replace("{0}", ja.lantern.parts.roof));
  });
});

describe("crownView: the give and go steps (REQ-9.5)", () => {
  it("shows the three things in their places, the shed with its job and the job's guide", () => {
    const view = at(chain(0, 0).slice(0, 3));
    expect(view.guide).toBe(en.shed.puzzles.leaves.guide);
    expect(view.panelLabel).toBe(en.crown.panel.shed);
    expect(view.panel).toEqual({ kind: "shed", job: "leaves", tool: null });
    expect(view.message).toBe(en.crown.give);
    expect(view.controls).toEqual([
      {
        id: "broom",
        text: "broom",
        event: give("broom"),
        rect: thingTile(0),
        icon: "broom",
        picked: false,
      },
      {
        id: "hammer",
        text: "hammer",
        event: give("hammer"),
        rect: thingTile(1),
        icon: "hammer",
        picked: false,
      },
      {
        id: "houseKey",
        text: "house key",
        event: give("houseKey"),
        rect: thingTile(2),
        icon: "houseKey",
        picked: false,
      },
    ]);
    expect(at(chain(0, 0).slice(0, 3), "ja").controls.map((c) => c.text)).toEqual([
      ja.shed.tools.broom,
      ja.shed.tools.hammer,
      ja.shadows.items.houseKey,
    ]);
  });

  it("says a secret is a secret, and that a tool that does not fit left the job there", () => {
    const told = chain(0, 0).slice(0, 3);
    expect(at([...told, give("houseKey")]).message).toBe(
      "The house key is a secret\nGive a tool instead",
    );
    expect(at([...told, give("hammer"), go]).message).toBe(
      en.shed.puzzles.leaves.stuck.replace("{0}", "hammer"),
    );
    expect(at([...told, give("hammer"), go], "ja").message).toBe(
      ja.shed.puzzles.leaves.stuck.replace("{0}", ja.shed.tools.hammer),
    );
  });

  it("shows Go! with the tool the wisp holds", () => {
    const view = at(chain(0, 0).slice(0, 4));
    expect(view.guide).toBe(en.crown.guide.go);
    expect(view.panelLabel).toBe(en.crown.panel.shed);
    expect(view.panel).toEqual({ kind: "shed", job: "leaves", tool: "broom" });
    expect(view.message).toBe("You gave the broom\nThe wisp holds it");
    expect(view.controls).toEqual([
      { id: "go", text: "Go!", event: go, rect: oneButton, icon: "none", picked: false },
    ]);
  });
});

describe("crownView: the check and fix steps (REQ-9.6, REQ-9.7)", () => {
  it("shows the made lamp with nothing marked, and Same and Different", () => {
    const view = at(chain(0, 0).slice(0, 5));
    expect(view.guide).toBe(en.crown.guide.check);
    expect(view.panelLabel).toBe(en.crown.panel.lamp);
    expect(view.panel).toEqual({
      kind: "lamp",
      lamp: { roof: "round", light: "candle" },
      lit: false,
      pointed: null,
    });
    expect(view.message).toBe(en.crown.made);
    const [left, right] = twoButtons;
    expect(view.controls).toEqual([
      { id: "same", text: "Same", event: check(true), rect: left, icon: "tick", picked: false },
      {
        id: "different",
        text: "Different",
        event: check(false),
        rect: right,
        icon: "dots",
        picked: false,
      },
    ]);
  });

  it("asks to look again after a check that is not right", () => {
    expect(at([...chain(0, 0).slice(0, 5), check(true)]).message).toBe(en.crown.again);
  });

  it("asks where in the fix step, with no cards until a part is pointed at", () => {
    const view = at(chain(0, 0).slice(0, 6));
    expect(view.guide).toBe(en.crown.guide.fix);
    expect(view.message).toBe(en.crown.fix);
    expect(view.controls).toEqual([]);
    expect(view.panel).toEqual({
      kind: "lamp",
      lamp: { roof: "round", light: "candle" },
      lit: false,
      pointed: null,
    });
    expect(view.panelLabel).toBe(en.crown.panel.lamp);
  });

  it("opens the two cards of the pointed part and frames it", () => {
    const view = at(chain(0, 0).slice(0, 7));
    expect(view.message).toBe("Which roof?\nLook at the lamp you want");
    expect(view.panel).toEqual({
      kind: "lamp",
      lamp: { roof: "round", light: "candle" },
      lit: false,
      pointed: "roof",
    });
    const [left, right] = twoButtons;
    expect(view.controls).toEqual([
      { id: "fix-flat", text: "flat", event: fix("flat"), rect: left, icon: "flat", picked: false },
      {
        id: "fix-pointy",
        text: "pointy",
        event: fix("pointy"),
        rect: right,
        icon: "pointy",
        picked: false,
      },
    ]);
  });

  it("says a part is the same, and after a card what the child said", () => {
    expect(at([...chain(0, 0).slice(0, 6), point("light")]).message).toBe(
      "The light is the same\nTap the other part",
    );
    expect(at(chain(0, 0).slice(0, 8)).message).toBe("You said: pointy\nIs it the same now?");
    expect(at(chain(0, 0).slice(0, 8), "ja").message).toBe(
      ja.crown.said.replace("{0}", ja.lantern.looks.pointy),
    );
  });
});

describe("crownView: the lit lamp, the town and the clear (REQ-9.9, REQ-9.10)", () => {
  it("shows the lit wish, Next, and the town's first lamp on", () => {
    const view = at(chain(0, 0));
    expect(view.guide).toBe(en.crown.guide.lit);
    expect(view.message).toBe(en.crown.lit);
    expect(view.panel).toEqual({ kind: "lamp", lamp: view.wish, lit: true, pointed: null });
    expect(view.controls).toEqual([
      { id: "next", text: "Next", event: next, rect: oneButton, icon: "none", picked: false },
    ]);
    expect(view.town).toEqual([true, false, false]);
    expect(view.result).toBe("lit");
  });

  it("keeps the lamps lit from chain to chain, and lights all three on the clear", () => {
    const first = [...chain(0, 0), next];
    expect(at(first).town).toEqual([true, false, false]);
    expect(at(first).result).toBeNull();
    expect(at([...first, ...chain(0, 1)]).town).toEqual([true, true, false]);
    const clear = at([...first, ...chain(0, 1), next, ...chain(0, 2), next]);
    expect(clear.town).toEqual([true, true, true]);
    expect(clear.guide).toBe(en.crown.guide.clear);
    expect(clear.message).toBe(en.crown.clear);
    expect(clear.result).toBe("clear");
    expect(clear.wish).toEqual(wishAt(0, 2));
    expect(clear.controls).toEqual([
      {
        id: "again",
        text: "Play again",
        event: { type: "StartCrown", seed: 0 },
        rect: oneButton,
        icon: "none",
        picked: false,
      },
    ]);
    expect(at([]).town).toEqual([false, false, false]);
  });

  it("always has the word of the way back to the title", () => {
    expect(at([]).leave).toBe(en.shed.leave);
    expect(at([], "ja").leave).toBe(ja.shed.leave);
  });

  it("tells the scene when a lamp has just been lit or the trial just cleared, and only then", () => {
    const lit = at(chain(0, 0));
    const before = at(chain(0, 0).slice(0, 8));
    expect(justLit(before, lit)).toBe(true);
    expect(justLit(lit, lit)).toBe(false);
    expect(justLit(undefined, lit)).toBe(true);
    expect(justLit(undefined, before)).toBe(false);
    expect(justLit(lit, before)).toBe(false);
    const clear = { ...lit, result: "clear" as const };
    expect(justLit(lit, clear)).toBe(true);
  });
});

describe("the title's words for trial 6 (REQ-9.1.6)", () => {
  it("names the button and says it is three lamps", () => {
    expect(crownEnterLabel("en")).toBe(en.crown.enter);
    expect(crownCaption("ja")).toBe(ja.crown.caption);
  });
});
