import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../../domain/events";
import { reduce } from "../../domain/reducer";
import { answerOf, puzzles, tools, type PuzzleId, type ToolId } from "../../domain/shed";
import { initialState, type Lang } from "../../domain/state";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import { messageText, resultText, wisp } from "../lane-layout";
import { wispWork } from "../shed-layout";
import {
  justTried,
  leaveLabel,
  shedCaption,
  shedEnterLabel,
  shedView,
  toolName,
} from "../shed-view";

const strings = { ja, en };
// Seed `n` starts its order at puzzle `n`: lock, leaves, boards, rope, roof. With no seed it is the lock.
const enter = (seed?: number): GameEvent =>
  seed === undefined ? { type: "StartShed" } : { type: "StartShed", seed };
const pick = (tool: ToolId): GameEvent => ({ type: "PickTool", tool });
const give: GameEvent = { type: "GiveTool" };
const retry: GameEvent = { type: "RetryShed" };
const view = (lang: Lang, ...events: GameEvent[]) =>
  shedView([enter(), ...events].reduce(reduce, { ...initialState, lang }));
const viewOf = (lang: Lang, seed: number, ...events: GameEvent[]) =>
  shedView([enter(seed), ...events].reduce(reduce, { ...initialState, lang }));
const name = (tool: ToolId, lang: Lang) => strings[lang].shed.tools[tool];
const other = (puzzle: PuzzleId): ToolId => tools.find((t) => t !== answerOf(puzzle))!;
const firstOf = (seed: number): PuzzleId => puzzles[seed]!;

describe.each(["ja", "en"] as const)("shedView while choosing in %s", (lang) => {
  const s = strings[lang].shed;

  it("shows the round's guide in every stage (REQ-5.2.1)", () => {
    for (const events of [[], [pick("key")], [pick("key"), give], [pick("hammer"), give]]) {
      expect(view(lang, ...events).guide).toBe(s.puzzles.lock.guide);
    }
  });

  it.each([0, 1, 2, 3, 4])(
    "shows the guide of the puzzle that seed %i starts with (REQ-5.2.3)",
    (seed) => {
      expect(viewOf(lang, seed).guide).toBe(s.puzzles[firstOf(seed)].guide);
    },
  );

  describe("choosing with nothing picked (REQ-5.2.3, REQ-5.4.3)", () => {
    const v = view(lang);

    it("invites the child to pick a tool, kindly, and shows no button", () => {
      expect(v.message).toBe(s.pick);
      expect(v.button).toBeNull();
      expect(v.lesson).toBeNull();
    });

    it("dims the wisp, shows no ask ring, and keeps the wisp at home with the message below it", () => {
      expect(v.armed).toBe(false);
      expect(v.wispAlpha).toBe(0.55);
      expect(v.wispTarget).toEqual(wisp);
      expect(v.messageAt).toEqual({ x: messageText.x, y: messageText.y });
    });

    it("shows the puzzle unsolved with no tool tried and no star", () => {
      expect(v.picture).toEqual({ puzzle: "lock", solved: false, tool: null, star: false });
    });

    it("marks no tool, fades none, and labels all five in order", () => {
      expect(v.tools.map((t) => t.id)).toEqual([...tools]);
      expect(v.tools.map((t) => t.label)).toEqual(tools.map((t) => name(t, lang)));
      expect(v.tools.every((t) => !t.picked && t.alpha === 1)).toBe(true);
    });

    it("always offers the way back to the title", () => {
      expect(v.leave).toBe(s.leave);
    });
  });

  describe.each(tools)("choosing with the %s picked (REQ-5.3, REQ-5.4.2)", (tool) => {
    const v = view(lang, pick(tool));

    it("names the picked tool in the message and arms the wisp", () => {
      expect(v.message).toBe(s.ready.replace("{0}", name(tool, lang)));
      expect(v.message).toContain(name(tool, lang));
      expect(v.armed).toBe(true);
      expect(v.wispAlpha).toBe(1);
      expect(v.button).toBeNull();
    });

    it("marks only that tool, and fades none", () => {
      expect(v.tools.filter((t) => t.picked).map((t) => t.id)).toEqual([tool]);
      expect(v.tools.every((t) => t.alpha === 1)).toBe(true);
    });

    it("does not use the tool: the puzzle is as it was, no tool on it, no closing line", () => {
      expect(v.picture).toEqual({ puzzle: "lock", solved: false, tool: null, star: false });
      expect(v.lesson).toBeNull();
      expect(v.wispTarget).toEqual(wisp);
    });
  });

  it("moves the mark when the pick is replaced, never marking two (REQ-5.3.2)", () => {
    const v = view(lang, pick("key"), pick("hammer"));
    expect(v.tools.filter((t) => t.picked).map((t) => t.id)).toEqual(["hammer"]);
    expect(v.message).toContain(name("hammer", lang));
  });
});

describe.each(["ja", "en"] as const)(
  "shedView after the right tool in %s (REQ-5.5, REQ-5.8)",
  (lang) => {
    const s = strings[lang].shed;

    describe.each([0, 1, 2, 3, 4])("seed %i, whose first puzzle has its own answer", (seed) => {
      const puzzle = firstOf(seed);
      const tool = answerOf(puzzle);
      const v = viewOf(lang, seed, pick(tool), give);

      it("frees the cat: the obstacle is gone, the star shows, the tried tool is on the puzzle", () => {
        expect(v.picture).toEqual({ puzzle, solved: true, tool, star: true });
      });

      it("names the tool in the message, and shows the puzzle's closing line as its own text", () => {
        expect(v.message).toBe(s.free.replace("{0}", name(tool, lang)));
        expect(v.lesson).toBe(s.puzzles[puzzle].lesson.replace("{0}", name(tool, lang)));
        expect(v.lesson).toContain(name(tool, lang));
        expect(v.message).not.toContain(v.lesson!);
      });

      it("offers the next-puzzle button, and puts the wisp and the message in the result places", () => {
        expect(v.button).toEqual({ text: s.next, event: { type: "RetryShed" } });
        expect(v.wispTarget).toEqual(wispWork);
        expect(v.messageAt).toEqual({ x: resultText.x, y: resultText.y });
      });

      it("locks the wisp and keeps the tool marked while the others fade", () => {
        expect(v.armed).toBe(false);
        expect(v.wispAlpha).toBe(1);
        expect(v.tools.map((t) => [t.id, t.picked, t.alpha])).toEqual(
          tools.map((id) => [id, id === tool, id === tool ? 1 : 0.45]),
        );
      });

      it("goes on to the next puzzle after the button, with a new guide and nothing picked", () => {
        const next = viewOf(lang, seed, pick(tool), give, retry);
        expect(next.guide).toBe(s.puzzles[puzzles[(seed + 1) % 5]!].guide);
        expect(next.guide).not.toBe(v.guide);
        expect(next.message).toBe(s.pick);
        expect(next.picture.solved).toBe(false);
      });
    });
  },
);

describe.each(["ja", "en"] as const)(
  "shedView after another tool in %s (REQ-5.5, REQ-5.6)",
  (lang) => {
    const s = strings[lang].shed;

    describe.each([0, 1, 2, 3, 4])("seed %i", (seed) => {
      const puzzle = firstOf(seed);
      const tool = other(puzzle);
      const v = viewOf(lang, seed, pick(tool), give);

      it("leaves the puzzle as it was, with the tried tool on it and no star", () => {
        expect(v.picture).toEqual({ puzzle, solved: false, tool, star: false });
      });

      it("says which tool the wisp used and what is still there, with no closing line", () => {
        expect(v.message).toBe(s.puzzles[puzzle].stuck.replace("{0}", name(tool, lang)));
        expect(v.message).toContain(name(tool, lang));
        expect(v.lesson).toBeNull();
      });

      it("invites the child to try another tool, with the same retry event as the success", () => {
        expect(v.button).toEqual({ text: s.retry, event: { type: "RetryShed" } });
        expect(v.armed).toBe(false);
        expect(v.wispTarget).toEqual(wispWork);
        expect(v.messageAt).toEqual({ x: resultText.x, y: resultText.y });
      });

      it("keeps only the handed-over tool marked, and fades the other four", () => {
        expect(v.tools.filter((t) => t.picked).map((t) => t.id)).toEqual([tool]);
        expect(v.tools.filter((t) => t.alpha === 0.45)).toHaveLength(4);
      });

      it("stays on the same puzzle after the button, with the same guide", () => {
        const again = viewOf(lang, seed, pick(tool), give, retry);
        expect(again).toEqual(viewOf(lang, seed));
        expect(again.guide).toBe(v.guide);
      });
    });
  },
);

/** The view without its words, to compare two languages. */
const strip = (v: ReturnType<typeof shedView>) => ({
  ...v,
  guide: "",
  message: "",
  lesson: v.lesson === null ? null : "",
  button: v.button && { ...v.button, text: "" },
  tools: v.tools.map((t) => ({ ...t, label: "" })),
  leave: "",
});

describe("shedView, the results agree with each other (REQ-5.5.3)", () => {
  it.each(tools)(
    "the %s in the first puzzle: tried tool, picture, message and button name the same tool",
    (tool) => {
      for (const lang of ["ja", "en"] as const) {
        const v = view(lang, pick(tool), give);
        const freed = tool === answerOf("lock");
        expect(v.picture.tool).toBe(tool);
        expect(v.message).toContain(name(tool, lang));
        expect(v.tools.find((t) => t.picked)?.id).toBe(tool);
        expect(v.picture.solved).toBe(freed);
        expect(v.picture.star).toBe(freed);
        expect(v.lesson !== null).toBe(freed);
        expect(v.button?.text).toBe(freed ? strings[lang].shed.next : strings[lang].shed.retry);
      }
    },
  );

  it("changes only the words when the language changes, never the tool or the result (REQ-5.12.4)", () => {
    for (const events of [[], [pick("hammer")], [pick("broom"), give], [pick("key"), give]]) {
      expect(strip(view("ja", ...events))).toEqual(strip(view("en", ...events)));
    }
    const asJa = [enter(), pick("key"), give, { type: "SetLang", lang: "ja" } as const];
    expect(shedView(asJa.reduce(reduce, initialState)).picture).toEqual(
      view("en", pick("key"), give).picture,
    );
  });
});

describe("the words of the title and the end screen", () => {
  it("name every tool, the title's button and its caption, and the way back, in the child's language", () => {
    expect(toolName("key", "en")).toBe("key");
    expect(toolName("scissors", "en")).toBe("scissors");
    expect(toolName("hammer", "ja")).toBe(ja.shed.tools.hammer);
    expect(toolName("ladder", "ja")).toBe(ja.shed.tools.ladder);
    expect(shedEnterLabel("en")).toBe("Free the cat");
    expect(shedEnterLabel("ja")).toBe(ja.shed.enter);
    expect(shedCaption("en")).toBe(en.shed.timeAttack);
    expect(shedCaption("ja")).toBe(ja.shed.timeAttack);
    expect(leaveLabel("en")).toBe("Title");
    expect(leaveLabel("ja")).toBe(ja.shed.leave);
  });
});

describe("justTried", () => {
  it("is true only on the first view that has a tried tool", () => {
    const choosing = view("en", pick("key"));
    const tried = view("en", pick("key"), give);
    expect(justTried(undefined, tried)).toBe(true);
    expect(justTried(choosing, tried)).toBe(true);
    for (const tool of tools) {
      expect(justTried(tried, view("en", pick(tool), give))).toBe(false);
    }
    expect(justTried(undefined, view("en"))).toBe(false);
    expect(justTried(tried, choosing)).toBe(false);
    expect(justTried(choosing, view("en", pick("broom")))).toBe(false);
  });

  it("is false when only the language changes after the hand-over", () => {
    const tried = view("en", pick("hammer"), give);
    expect(justTried(tried, view("ja", pick("hammer"), give))).toBe(false);
  });
});
