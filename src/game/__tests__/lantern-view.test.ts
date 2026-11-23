import { beforeEach, describe, expect, it } from "vite-plus/test";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import type { GameEvent } from "../../domain/events";
import { broughtAt, looksOf, parts, wishAt, type LookId, type PartId } from "../../domain/lantern";
import { reduce } from "../../domain/reducer";
import { initialState, type GameState, type Lang } from "../../domain/state";
import {
  justFixed,
  lanternCaption,
  lanternEnterLabel,
  lanternView,
  lookWord,
  partWord,
  type PartMark,
} from "../lantern-view";
import { leaveLabel } from "../shed-view";

// Seed 0, round 0: the wish is a ring, a pointy roof and a candle; the wisp brings a bell for the ring, so the
// handle flickers and its cards are the ring (right) and the bow. Round 1: the roof flickers.
const strings = { ja: ja.lantern, en: en.lantern };
const play = (events: GameEvent[], from: GameState) => events.reduce(reduce, from);
const open = (lang: Lang) => play([{ type: "StartLantern", seed: 0 }], { ...initialState, lang });
const tap = (part: PartId): GameEvent => ({ type: "TapPart", part });
const fix = (look: LookId): GameEvent => ({ type: "FixPart", look });
const marks = (state: GameState): PartMark[] => lanternView(state).parts.map((p) => p.mark);
const looks = (state: GameState): LookId[] => lanternView(state).parts.map((p) => p.look);

describe("the words of the title button, the parts and the looks (REQ-8.1.6, REQ-8.13.1)", () => {
  it("are the content's words in each language", () => {
    for (const lang of ["ja", "en"] as const) {
      expect(lanternEnterLabel(lang)).toBe(strings[lang].enter);
      expect(lanternCaption(lang)).toBe(strings[lang].timeAttack);
      for (const part of parts) {
        expect(partWord(part, lang)).toBe(strings[lang].parts[part]);
        for (const look of looksOf[part])
          expect(lookWord(look, lang)).toBe(strings[lang].looks[look]);
      }
    }
  });
});

describe.each(["ja", "en"] as const)("lanternView in %s", (lang) => {
  const s = strings[lang];
  let looking: GameState, pointing: GameState, fine: GameState, said: GameState, lit: GameState;
  beforeEach(() => {
    looking = open(lang);
    pointing = play([tap("handle")], looking);
    fine = play([tap("light")], looking);
    said = play([fix("bow")], pointing);
    lit = play([fix("ring")], pointing);
  });

  it("always shows the guide, both labels, the wish of the round and the way back to the title", () => {
    for (const state of [looking, pointing, fine, said, lit]) {
      const view = lanternView(state);
      expect(view.guide).toBe(s.guide);
      expect(view.wishLabel).toBe(s.wish);
      expect(view.lanternLabel).toBe(s.brought);
      expect(view.leave).toBe(leaveLabel(lang));
      expect(view.wish).toEqual(wishAt(0, 0));
    }
  });

  it("while looking: the lantern the wisp brought, a frame of dots on the part that flickers, the light dim, no buttons", () => {
    const view = lanternView(looking);
    expect(view.message).toBe(s.look);
    expect(view.parts).toEqual([
      { part: "handle", look: "bell", mark: "dots" },
      { part: "roof", look: "pointy", mark: "none" },
      { part: "light", look: "candle", mark: "none" },
    ]);
    expect(looks(looking)).toEqual(parts.map((p) => broughtAt(0, 0)[p]));
    expect(view.lit).toBe(false);
    expect(view.buttons).toEqual([]);
    expect(view.result).toBeNull();
  });

  it("after a tap on a steady part: it says that part is fine, and nothing else changes", () => {
    const view = lanternView(fine);
    expect(view.message).toBe(s.fine.replace("{0}", s.parts.light));
    expect(marks(fine)).toEqual(["dots", "none", "none"]);
    expect(view.buttons).toEqual([]);
    expect(view.result).toBeNull();
  });

  it("while pointing: a solid frame on the part, the question, and its two cards with their pictures and words", () => {
    const view = lanternView(pointing);
    expect(view.message).toBe(s.point.replace("{0}", s.parts.handle));
    expect(marks(pointing)).toEqual(["solid", "none", "none"]);
    expect(view.buttons).toEqual([
      { id: "ring", text: s.looks.ring, event: fix("ring"), slot: "left", icon: "ring" },
      { id: "bow", text: s.looks.bow, event: fix("bow"), slot: "right", icon: "bow" },
    ]);
    expect(view.lit).toBe(false);
    expect(view.result).toBeNull();
  });

  it("after a wrong card: the part has the look the child said, it still has its frame of dots, and the message says so", () => {
    const view = lanternView(said);
    expect(view.message).toBe(s.said.replace("{0}", s.looks.bow));
    expect(view.parts[0]).toEqual({ part: "handle", look: "bow", mark: "dots" });
    expect(view.buttons).toEqual([]);
    expect(view.lit).toBe(false);
    expect(view.result).toBe("said");
  });

  it("once lit: the wish's looks, no frame, the light bright, the message names the look, and Next", () => {
    const view = lanternView(lit);
    expect(view.message).toBe(s.lit.replace("{0}", s.looks.ring));
    expect(looks(lit)).toEqual(parts.map((p) => wishAt(0, 0)[p]));
    expect(marks(lit)).toEqual(["none", "none", "none"]);
    expect(view.lit).toBe(true);
    expect(view.buttons).toEqual([
      { id: "next", text: s.next, event: { type: "NextLantern" }, slot: "single", icon: "none" },
    ]);
    expect(view.result).toBe("lit");
  });

  it("the next round shows its own wish, and the flicker on the roof, with cards that follow its look", () => {
    const second = play([{ type: "NextLantern" }], lit);
    const view = lanternView(second);
    expect(view.wish).toEqual(wishAt(0, 1));
    expect(marks(second)).toEqual(["none", "dots", "none"]);
    expect(view.message).toBe(s.look);
    const cards = lanternView(play([tap("roof")], second)).buttons.map((b) => b.id);
    expect(cards).toEqual(["round", "flat"]);
  });
});

describe("lanternView and the language (REQ-8.13.4)", () => {
  it("changes only the words when the language changes", () => {
    const state = play([tap("handle")], open("en"));
    const inEnglish = lanternView(state);
    const inJapanese = lanternView({ ...state, lang: "ja" });
    expect(inJapanese.parts).toEqual(inEnglish.parts);
    expect(inJapanese.wish).toEqual(inEnglish.wish);
    expect(inJapanese.buttons.map((b) => b.event)).toEqual(inEnglish.buttons.map((b) => b.event));
    expect(inJapanese.message).not.toBe(inEnglish.message);
  });
});

describe("justFixed (REQ-8.5.6)", () => {
  let looking: GameState, pointing: GameState, said: GameState, lit: GameState;
  beforeEach(() => {
    looking = open("en");
    pointing = play([tap("handle")], looking);
    said = play([fix("bow")], pointing);
    lit = play([fix("ring")], pointing);
  });
  const view = lanternView;

  it("is true when a card has just lit the lantern or been said, and false otherwise", () => {
    expect(justFixed(view(pointing), view(lit))).toBe(true);
    expect(justFixed(view(pointing), view(said))).toBe(true);
    expect(justFixed(undefined, view(lit))).toBe(true);
    expect(justFixed(view(looking), view(pointing))).toBe(false);
    expect(justFixed(undefined, view(looking))).toBe(false);
  });

  it("is false when the result was already there, as after a language change", () => {
    expect(justFixed(view(lit), view({ ...lit, lang: "ja" }))).toBe(false);
    expect(justFixed(view(said), view({ ...said, lang: "ja" }))).toBe(false);
  });

  it("plays again for a second wrong card, because a point comes between", () => {
    const again = play([tap("handle"), fix("bell")], said);
    expect(justFixed(view(play([tap("handle")], said)), view(again))).toBe(true);
  });
});
