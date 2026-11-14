import { describe, expect, it } from "vite-plus/test";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import type { GameEvent } from "../../domain/events";
import { fakesOf } from "../../domain/field";
import { reduce } from "../../domain/reducer";
import { initialState, type GameState, type Lang } from "../../domain/state";
import { fieldCaption, fieldEnterLabel, fieldView, justFinished, justSorted } from "../field-view";
import { leaveLabel } from "../shed-view";

// Seed 0: round 0 has one fake star (4); round 1 has two (1 and 4). See `fakesOf` in the domain tests.
const strings = { ja: ja.field, en: en.field };
const play = (events: GameEvent[], from: GameState) => events.reduce(reduce, from);
const open = (lang: Lang) => play([{ type: "StartField", seed: 0 }], { ...initialState, lang });
const look = (index: number): GameEvent => ({ type: "InspectStar", index });
const sort = (verdict: "real" | "fake"): GameEvent => ({ type: "SortStar", verdict });
const keep: GameEvent = { type: "KeepStars" };
const retry: GameEvent = { type: "RetryField" };
const stars = [0, 1, 2, 3, 4];

/** The events that look at and rightly sort every star of the round the state is in. */
function sortAll(state: GameState): GameEvent[] {
  const fakes = fakesOf(state.field.seed, state.field.round);
  return stars.flatMap((i) => [look(i), sort(fakes.includes(i) ? "fake" : "real")]);
}
const ready = (lang: Lang) => play(sortAll(open(lang)), open(lang));
const kept = (lang: Lang) => play([keep], ready(lang));
const secondReady = (lang: Lang) => {
  const next = play([retry], kept(lang));
  return play(sortAll(next), next);
};
const secondKept = (lang: Lang) => play([keep], secondReady(lang));

describe("fieldEnterLabel and fieldCaption (REQ-6.1.1, REQ-6.1.6)", () => {
  it("are the title button's words in each language", () => {
    expect(fieldEnterLabel("ja")).toBe(ja.field.enter);
    expect(fieldEnterLabel("en")).toBe(en.field.enter);
    expect(fieldCaption("ja")).toBe(ja.field.timeAttack);
    expect(fieldCaption("en")).toBe(en.field.timeAttack);
  });
});

describe.each(["ja", "en"] as const)("fieldView in %s", (lang) => {
  const s = strings[lang];

  it("always shows the guide and five stars, one per number", () => {
    for (const state of [
      open(lang),
      play([look(1)], open(lang)),
      ready(lang),
      kept(lang),
      secondKept(lang),
    ]) {
      const view = fieldView(state);
      expect(view.guide).toBe(s.guide);
      expect(view.leave).toBe(leaveLabel(lang));
      expect(view.stars.map((star) => star.index)).toEqual(stars);
    }
  });

  it("at the start: the clue is on every star, nothing sorted, no lens, no button, the start message (REQ-6.2.3)", () => {
    const view = fieldView(open(lang));
    expect(view.message).toBe(s.start);
    expect(view.stars.map((star) => star.shine)).toEqual([
      "normal",
      "normal",
      "normal",
      "normal",
      "bright",
    ]);
    for (const star of view.stars) {
      expect(star).toMatchObject({
        mark: "unsorted",
        label: "",
        ticked: false,
        looking: false,
        alpha: 1,
      });
    }
    expect(view).toMatchObject({
      lens: null,
      lesson: null,
      buttons: [],
      verdict: null,
      finished: false,
    });
  });

  it("while looking: the lens shows the star's shine, both verdict buttons appear, and only that star is framed (REQ-6.3)", () => {
    const real = fieldView(play([look(0)], open(lang)));
    expect(real.message).toBe(s.look);
    expect(real.lens).toEqual({ shine: "normal" });
    expect(real.stars.map((star) => star.looking)).toEqual([true, false, false, false, false]);
    expect(real.buttons.map((b) => [b.id, b.text, b.slot, b.icon, b.event])).toEqual([
      ["real", s.marks.real, "left", "tick", sort("real")],
      ["fake", s.marks.fake, "right", "dots", sort("fake")],
    ]);
    const fake = fieldView(play([look(4)], open(lang)));
    expect(fake.lens).toEqual({ shine: "bright" });
    expect(fake.stars.map((star) => star.looking)).toEqual([false, false, false, false, true]);
  });

  it("keeps the clue on a star whatever happens to it: the same shine while looking, sorted and kept", () => {
    const start = fieldView(open(lang)).stars.map((star) => star.shine);
    for (const state of [
      play([look(2)], open(lang)),
      play([look(4), sort("fake")], open(lang)),
      ready(lang),
      kept(lang),
    ]) {
      expect(fieldView(state).stars.map((star) => star.shine)).toEqual(start);
    }
  });
});

describe.each(["ja", "en"] as const)("fieldView, verdicts and rounds in %s", (lang) => {
  const s = strings[lang];

  it("after a right verdict on a real star: the star has its word and tick, the message confirms it, the lens closes", () => {
    const view = fieldView(play([look(0), sort("real")], open(lang)));
    expect(view.message).toBe(s.sortedReal);
    expect(view.stars[0]).toMatchObject({
      mark: "real",
      label: s.marks.real,
      ticked: true,
      alpha: 1,
    });
    expect(view).toMatchObject({ lens: null, buttons: [], verdict: { star: 0, right: true } });
  });

  it("after a right verdict on a fake star: the star has its word, no tick and fades; the message says the wisp mixed it up", () => {
    const view = fieldView(play([look(4), sort("fake")], open(lang)));
    expect(view.message).toBe(s.sortedFake);
    expect(view.stars[4]).toMatchObject({
      mark: "fake",
      label: s.marks.fake,
      ticked: false,
      alpha: 0.5,
    });
    expect(view.verdict).toEqual({ star: 4, right: true });
  });

  it("after a wrong verdict: the star stays unsorted with no word, the message says what happened, and the lens is closed (REQ-6.3.4)", () => {
    const calledReal = fieldView(play([look(4), sort("real")], open(lang)));
    expect(calledReal.message).toBe(s.missFake);
    expect(calledReal.stars[4]).toMatchObject({
      mark: "unsorted",
      label: "",
      ticked: false,
      alpha: 1,
    });
    expect(calledReal).toMatchObject({
      lens: null,
      buttons: [],
      verdict: { star: 4, right: false },
    });
    const calledFake = fieldView(play([look(0), sort("fake")], open(lang)));
    expect(calledFake.message).toBe(s.missReal);
    expect(calledFake.stars[0]).toMatchObject({ mark: "unsorted", label: "", ticked: false });
    expect(calledFake.verdict).toEqual({ star: 0, right: false });
  });

  it("looking again after a wrong verdict shows the look message and drops the verdict", () => {
    const view = fieldView(play([look(4), sort("real"), look(4)], open(lang)));
    expect(view.message).toBe(s.look);
    expect(view.verdict).toBeNull();
    expect(view.lens).toEqual({ shine: "bright" });
  });
});

describe.each(["ja", "en"] as const)("fieldView, keeping and the next round in %s", (lang) => {
  const s = strings[lang];

  it("when all five are sorted: the message is still about the last star (a fake one keeps the wisp's mix-up), and the one wide keep button shows, nothing kept yet (REQ-6.5.1)", () => {
    const view = fieldView(ready(lang));
    expect(view.message).toBe(s.sortedFake);
    expect(view.buttons).toEqual([
      { id: "keep", text: s.keep, event: keep, slot: "single", icon: "none" },
    ]);
    expect(view).toMatchObject({ lesson: null, finished: false });
    expect(view.stars.map((star) => star.ticked)).toEqual([true, true, true, true, false]);
  });

  it("before then, no keep button is shown, whatever has been sorted", () => {
    const partial = play(sortAll(open(lang)).slice(0, 8), open(lang));
    expect(fieldView(partial).buttons).toEqual([]);
    expect(fieldView(play([look(4)], partial)).buttons.map((b) => b.id)).toEqual(["real", "fake"]);
  });

  it("after the keep: the number of real stars, the closing line, and the next button (REQ-6.5.3, REQ-6.6)", () => {
    const view = fieldView(kept(lang));
    expect(view.message).toBe(s.kept.replace("{0}", "4"));
    expect(view.buttons).toEqual([
      { id: "next", text: s.next, event: retry, slot: "single", icon: "none" },
    ]);
    expect(view).toMatchObject({ lesson: s.lesson, lens: null, finished: true, verdict: null });
    expect(view.stars.map((star) => star.alpha)).toEqual([1, 1, 1, 1, 0.5]);
  });

  it("the second round has two fake stars and keeps three", () => {
    const view = fieldView(secondReady(lang));
    expect(view.stars.map((star) => star.shine)).toEqual([
      "normal",
      "bright",
      "normal",
      "normal",
      "bright",
    ]);
    expect(fieldView(secondKept(lang)).message).toBe(s.kept.replace("{0}", "3"));
  });

  it("after the keep of the second round: the same next button and the closing line, with three kept (there is no clear panel: only the clock ends the trial)", () => {
    const view = fieldView(secondKept(lang));
    expect(view.lesson).toBe(s.lesson);
    expect(view.buttons.map((b) => b.id)).toEqual(["next"]);
    expect(view.finished).toBe(true);
  });

  it("shows the closing line after a kept round only, not while sorting", () => {
    for (const state of [open(lang), play([look(0)], open(lang)), ready(lang)]) {
      expect(fieldView(state).lesson).toBeNull();
    }
  });
});

describe.each(["ja", "en"] as const)("fieldView, the way back to the title in %s", (lang) => {
  it("always has the label of the way back to the title, in every stage", () => {
    for (const state of [open(lang), play([look(0)], open(lang)), ready(lang), kept(lang)]) {
      expect(fieldView(state).leave).toBe({ ja: ja.shed.leave, en: en.shed.leave }[lang]);
    }
  });
});

describe("what changed since the last view (the flourish)", () => {
  const start = fieldView(open("en"));
  const looked = fieldView(play([look(0)], open("en")));
  const right = fieldView(play([look(0), sort("real")], open("en")));
  const wrong = fieldView(play([look(0), sort("fake")], open("en")));

  it("justSorted gives the verdict that is new, and nothing for the same verdict again", () => {
    expect(justSorted(looked, right)).toEqual({ star: 0, right: true });
    expect(justSorted(looked, wrong)).toEqual({ star: 0, right: false });
    expect(justSorted(undefined, right)).toEqual({ star: 0, right: true });
    expect(justSorted(right, right)).toBeNull();
    expect(justSorted(start, looked)).toBeNull();
    expect(justSorted(wrong, start)).toBeNull();
  });

  it("justSorted sees a new verdict on another star, or a different one on the same star", () => {
    const other = fieldView(play([look(0), sort("real"), look(1), sort("real")], open("en")));
    expect(justSorted(right, other)).toEqual({ star: 1, right: true });
    expect(justSorted(right, { ...right, verdict: { star: 0, right: false } })).toEqual({
      star: 0,
      right: false,
    });
    expect(justSorted(right, { ...right, verdict: { star: 1, right: true } })).toEqual({
      star: 1,
      right: true,
    });
  });

  it("justFinished is true once, when the round is kept", () => {
    const done = fieldView(kept("en"));
    expect(justFinished(fieldView(ready("en")), done)).toBe(true);
    expect(justFinished(undefined, done)).toBe(true);
    expect(justFinished(done, done)).toBe(false);
    expect(justFinished(start, looked)).toBe(false);
    expect(justFinished(undefined, start)).toBe(false);
  });
});
