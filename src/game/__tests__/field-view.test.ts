import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../../domain/events";
import { reduce } from "../../domain/reducer";
import { initialState, type Lang } from "../../domain/state";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import { fieldEnterLabel, fieldView, justChecked, justKept } from "../field-view";

const strings = { ja, en };
const enter: GameEvent = { type: "StartField" };
const check = (index: number): GameEvent => ({ type: "CheckStar", index });
const keep: GameEvent = { type: "KeepStars" };
const retry: GameEvent = { type: "RetryField" };
const all = [0, 1, 2, 3, 4].map(check);
const view = (lang: Lang, ...events: GameEvent[]) =>
  fieldView([enter, ...events].reduce(reduce, { ...initialState, lang }));

// Round 0 has one fake star, number 3. Round 1 has two: 0 and 2.
const real0 = (lang: Lang) => strings[lang].field.marks.real;
const fake0 = (lang: Lang) => strings[lang].field.marks.fake;

describe.each(["ja", "en"] as const)("fieldView while checking in %s", (lang) => {
  const s = strings[lang].field;

  it("shows the guide in every stage (REQ-6.2.2)", () => {
    for (const events of [[], [check(0)], all, [...all, keep], [...all, keep, retry]]) {
      expect(view(lang, ...events).guide).toBe(s.guide);
    }
  });

  describe("nothing checked yet (REQ-6.2.3)", () => {
    const v = view(lang);

    it("says the wisp brought the stars, with no button and no closing line", () => {
      expect(v.message).toBe(s.start);
      expect(v.button).toBeNull();
      expect(v.lesson).toBeNull();
      expect(v.last).toBeNull();
    });

    it("shows five stars that look exactly alike: solid, unlabeled, unticked, not faded", () => {
      expect(v.stars).toHaveLength(5);
      v.stars.forEach((star, i) => {
        expect(star).toEqual({
          index: i,
          mark: "unchecked",
          label: "",
          picture: "solid",
          ticked: false,
          alpha: 1,
        });
      });
    });
  });
});

describe.each(["ja", "en"] as const)("fieldView with some stars checked in %s", (lang) => {
  const s = strings[lang].field;

  describe("a real star checked (REQ-6.3.2)", () => {
    const v = view(lang, check(0));

    it("says that the star is real, kindly, with no button", () => {
      expect(v.message).toBe(s.real);
      expect(v.button).toBeNull();
      expect(v.lesson).toBeNull();
      expect(v.last).toBe(0);
    });

    it("shows that star solid with its label and the tick, and the others unchanged", () => {
      expect(v.stars[0]).toEqual({
        index: 0,
        mark: "real",
        label: real0(lang),
        picture: "solid",
        ticked: true,
        alpha: 1,
      });
      for (const star of v.stars.slice(1)) {
        expect(star).toMatchObject({
          mark: "unchecked",
          label: "",
          picture: "solid",
          ticked: false,
        });
      }
    });
  });

  describe("a fake star checked (REQ-6.3.2, REQ-6.4)", () => {
    const v = view(lang, check(3));

    it("says that the star is a fake and that the wisp mixed it up", () => {
      expect(v.message).toBe(s.fake);
      expect(v.button).toBeNull();
      expect(v.last).toBe(3);
    });

    it("shows that star as a hollow outline with its label and no tick, and the others unchanged", () => {
      expect(v.stars[3]).toEqual({
        index: 3,
        mark: "fake",
        label: fake0(lang),
        picture: "hollow",
        ticked: false,
        alpha: 1,
      });
      expect(v.stars.filter((star) => star.picture === "hollow")).toHaveLength(1);
      expect(v.stars.filter((star) => star.mark === "unchecked")).toHaveLength(4);
    });
  });

  it("makes the message follow the star checked last, not the one before (REQ-6.3.6)", () => {
    expect(view(lang, check(3), check(0)).message).toBe(s.real);
    expect(view(lang, check(0), check(3)).message).toBe(s.fake);
    expect(view(lang, check(0), check(3), check(1)).message).toBe(s.real);
  });

  it("keeps the message when the same star is tapped again (REQ-6.3.4)", () => {
    expect(view(lang, check(3), check(3))).toEqual(view(lang, check(3)));
  });

  it("shows a fake star found earlier as still fake after the next checks", () => {
    const v = view(lang, check(3), check(0), check(1));
    expect(v.stars[3]).toMatchObject({ mark: "fake", picture: "hollow", label: fake0(lang) });
    expect(v.stars.filter((star) => star.ticked).map((star) => star.index)).toEqual([0, 1]);
  });
});

describe.each(["ja", "en"] as const)("fieldView with all five checked in %s", (lang) => {
  const s = strings[lang].field;

  it("shows the keep button only when all five are checked, whatever the order (REQ-6.5.1)", () => {
    expect(view(lang, ...all.slice(0, 4)).button).toBeNull();
    expect(view(lang, ...all.slice(1)).button).toBeNull();
    for (const events of [all, [4, 3, 2, 1, 0].map(check), [check(3), ...all]]) {
      expect(view(lang, ...events).button).toEqual({ text: s.keep, event: { type: "KeepStars" } });
    }
  });

  it("still shows no closing line when all five are checked, and keeps the message about the last", () => {
    const v = view(lang, ...all);
    expect(v.lesson).toBeNull();
    expect(v.message).toBe(s.real);
    expect(view(lang, check(0), check(1), check(2), check(4), check(3)).message).toBe(s.fake);
    expect(v.stars.every((star) => star.alpha === 1)).toBe(true);
  });
});

describe.each(["ja", "en"] as const)("fieldView after the keep in %s", (lang) => {
  const s = strings[lang].field;
  const v = view(lang, ...all, keep);

  it("names the number of real stars kept, and shows the closing line as its own text (REQ-6.5.3, REQ-6.6)", () => {
    expect(v.message).toBe(s.kept.replace("{0}", "4"));
    expect(v.lesson).toBe(s.lesson);
    expect(v.message).not.toContain(v.lesson!);
    expect(v.last).toBeNull();
  });

  it("offers the next stars button with the retry event", () => {
    expect(v.button).toEqual({ text: s.again, event: { type: "RetryField" } });
  });

  it("keeps the real stars ticked and solid, and fades the fake one but still shows it", () => {
    expect(v.stars.map((star) => [star.index, star.mark, star.ticked, star.alpha])).toEqual([
      [0, "real", true, 1],
      [1, "real", true, 1],
      [2, "real", true, 1],
      [3, "fake", false, 0.3],
      [4, "real", true, 1],
    ]);
    expect(v.stars[3]).toMatchObject({ picture: "hollow", label: fake0(lang) });
    expect(v.stars[0]).toMatchObject({ picture: "solid", label: real0(lang) });
  });

  it("names 3 when the round has two fake stars (round 1)", () => {
    const second = view(lang, ...all, keep, retry, ...all, keep);
    expect(second.message).toBe(s.kept.replace("{0}", "3"));
    expect(second.stars.filter((star) => star.alpha === 0.3).map((star) => star.index)).toEqual([
      0, 2,
    ]);
  });
});

describe("the next round (REQ-6.7.1)", () => {
  it("starts again with nothing checked, no button and no closing line, and the other fake stars", () => {
    const v = view("en", ...all, keep, retry);
    expect(v.message).toBe(en.field.start);
    expect(v.button).toBeNull();
    expect(v.lesson).toBeNull();
    expect(v.last).toBeNull();
    expect(v.stars.every((star) => star.mark === "unchecked" && star.alpha === 1)).toBe(true);
    // Round 1: star 0 is a fake and star 3 is real.
    expect(view("en", ...all, keep, retry, check(0)).message).toBe(en.field.fake);
    expect(view("en", ...all, keep, retry, check(3)).message).toBe(en.field.real);
  });
});

describe("the language changes the words and nothing else (REQ-6.11.4)", () => {
  it("gives the same shapes, marks and buttons in Japanese and English", () => {
    for (const events of [[], [check(3)], all, [...all, keep]]) {
      const a = view("ja", ...events);
      const b = view("en", ...events);
      expect(a.stars.map((x) => [x.mark, x.picture, x.ticked, x.alpha])).toEqual(
        b.stars.map((x) => [x.mark, x.picture, x.ticked, x.alpha]),
      );
      expect(a.button?.event).toEqual(b.button?.event);
      expect(a.last).toBe(b.last);
      expect(a.lesson === null).toBe(b.lesson === null);
    }
  });

  it("labels the title's button in the child's language", () => {
    expect(fieldEnterLabel("en")).toBe(en.field.enter);
    expect(fieldEnterLabel("ja")).toBe(ja.field.enter);
  });
});

describe("justChecked and justKept (the scene's flourish)", () => {
  const fresh = view("en");
  const one = view("en", check(0));
  const two = view("en", check(0), check(3));

  it("justChecked names the star that was checked since the view before", () => {
    expect(justChecked(fresh, one)).toBe(0);
    expect(justChecked(one, two)).toBe(3);
    expect(justChecked(undefined, one)).toBe(0);
  });

  it("justChecked is null when nothing was checked since", () => {
    expect(justChecked(fresh, fresh)).toBeNull();
    expect(justChecked(one, one)).toBeNull();
    // The same star again, and it is not star 0: nothing new, whatever its number.
    expect(justChecked(view("en", check(3)), view("en", check(3)))).toBeNull();
    expect(justChecked(view("en", check(4)), view("en", check(4)))).toBeNull();
    expect(justChecked(undefined, fresh)).toBeNull();
    expect(justChecked(two, view("en", ...all, keep))).toBeNull();
    expect(justChecked(view("en", ...all, keep), view("en", ...all, keep, retry))).toBeNull();
  });

  it("justKept is true for the first view with the closing line only", () => {
    const done = view("en", ...all, keep);
    expect(justKept(view("en", ...all), done)).toBe(true);
    expect(justKept(undefined, done)).toBe(true);
    expect(justKept(done, done)).toBe(false);
    expect(justKept(fresh, one)).toBe(false);
    expect(justKept(undefined, fresh)).toBe(false);
    expect(justKept(done, view("en", ...all, keep, retry))).toBe(false);
  });
});
