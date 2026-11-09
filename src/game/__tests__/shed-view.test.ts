import { describe, expect, it } from "vite-plus/test";
import type { GameEvent } from "../../domain/events";
import { reduce } from "../../domain/reducer";
import { tools, type ToolId } from "../../domain/shed";
import { initialState, type Lang } from "../../domain/state";
import en from "../../content/strings.en.json";
import ja from "../../content/strings.ja.json";
import { messageText, resultText, wisp } from "../lane-layout";
import { wispWork } from "../shed-layout";
import { shedEnterLabel, shedView, toolName } from "../shed-view";

const strings = { ja, en };
const enter: GameEvent = { type: "StartShed" };
const pick = (tool: ToolId): GameEvent => ({ type: "PickTool", tool });
const give: GameEvent = { type: "GiveTool" };
const retry: GameEvent = { type: "RetryShed" };
const view = (lang: Lang, ...events: GameEvent[]) =>
  shedView([enter, ...events].reduce(reduce, { ...initialState, lang }));
const name = (tool: ToolId, lang: Lang) => strings[lang].shed.tools[tool];

/** The picture the table in design.md gives for each result. */
const shutPicture = { door: "shut", cat: "inside", star: false } as const;
const openPicture = { door: "open", cat: "outside", star: true } as const;

describe.each(["ja", "en"] as const)("shedView while choosing in %s", (lang) => {
  const s = strings[lang].shed;

  it("shows the guide in every stage (REQ-5.2.1)", () => {
    for (const events of [[], [pick("key")], [pick("key"), give], [pick("hammer"), give]]) {
      expect(view(lang, ...events).guide).toBe(s.guide);
    }
  });

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

    it("shows the shed locked with the cat inside and no tool tried", () => {
      expect(v.picture).toEqual({ ...shutPicture, tool: null });
    });

    it("marks no tool, fades none, and labels all three in order", () => {
      expect(v.tools.map((t) => t.id)).toEqual(["key", "broom", "hammer"]);
      expect(v.tools.map((t) => t.label)).toEqual(tools.map((t) => name(t, lang)));
      expect(v.tools.every((t) => !t.picked && t.alpha === 1)).toBe(true);
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

    it("does not use the tool: the picture is the locked shed with no tool on it, and no closing line", () => {
      expect(v.picture).toEqual({ ...shutPicture, tool: null });
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

describe.each(["ja", "en"] as const)("shedView after the hand-over in %s", (lang) => {
  const s = strings[lang].shed;

  describe("the key handed over (REQ-5.5, REQ-5.8)", () => {
    const v = view(lang, pick("key"), give);

    it("opens the door, lets the cat out and shows the star, with the key on the lock", () => {
      expect(v.picture).toEqual({ ...openPicture, tool: "key" });
    });

    it("names the key in the message, and shows the closing line as its own text", () => {
      expect(v.message).toBe(s.open.replace("{0}", name("key", lang)));
      expect(v.lesson).toBe(s.lesson.replace("{0}", name("key", lang)));
      expect(v.lesson).toContain(name("key", lang));
      expect(v.message).not.toContain(v.lesson!);
    });

    it("offers the play-again button, and puts the wisp and the message in the result places", () => {
      expect(v.button).toEqual({ text: s.again, event: { type: "RetryShed" } });
      expect(v.wispTarget).toEqual(wispWork);
      expect(v.messageAt).toEqual({ x: resultText.x, y: resultText.y });
    });

    it("locks the wisp and keeps the key marked while the others fade", () => {
      expect(v.armed).toBe(false);
      expect(v.wispAlpha).toBe(1);
      expect(v.tools.map((t) => [t.id, t.picked, t.alpha])).toEqual([
        ["key", true, 1],
        ["broom", false, 0.45],
        ["hammer", false, 0.45],
      ]);
    });
  });

  describe.each(["broom", "hammer"] as const)("the %s handed over (REQ-5.5, REQ-5.6)", (tool) => {
    const v = view(lang, pick(tool), give);

    it("leaves the door shut and the cat inside, with the tried tool on the lock and no star", () => {
      expect(v.picture).toEqual({ ...shutPicture, tool });
    });

    it("says which tool the wisp used and that the door stayed shut, with no closing line", () => {
      expect(v.message).toBe(s.shut.replace("{0}", name(tool, lang)));
      expect(v.message).toContain(name(tool, lang));
      expect(v.lesson).toBeNull();
    });

    it("invites the child to try another tool, with the same retry event as the success", () => {
      expect(v.button).toEqual({ text: s.retry, event: { type: "RetryShed" } });
      expect(v.armed).toBe(false);
      expect(v.wispTarget).toEqual(wispWork);
      expect(v.messageAt).toEqual({ x: resultText.x, y: resultText.y });
    });

    it("keeps only the handed-over tool marked", () => {
      expect(v.tools.filter((t) => t.picked).map((t) => t.id)).toEqual([tool]);
      expect(v.tools.filter((t) => t.alpha === 0.45)).toHaveLength(2);
    });
  });

  it("goes back to the first view after a retry, from a shut and from an open result", () => {
    expect(view(lang, pick("broom"), give, retry)).toEqual(view(lang));
    expect(view(lang, pick("key"), give, retry)).toEqual(view(lang));
  });
});

/** The view without its words, to compare two languages. */
const strip = (v: ReturnType<typeof shedView>) => ({
  ...v,
  guide: "",
  message: "",
  lesson: v.lesson === null ? null : "",
  button: v.button && { ...v.button, text: "" },
  tools: v.tools.map((t) => ({ ...t, label: "" })),
});

describe("shedView, the three results agree with each other (REQ-5.5.3)", () => {
  it.each(tools)("the %s: tried tool, picture, message and button name the same tool", (tool) => {
    for (const lang of ["ja", "en"] as const) {
      const v = view(lang, pick(tool), give);
      expect(v.picture.tool).toBe(tool);
      expect(v.message).toContain(name(tool, lang));
      expect(v.tools.find((t) => t.picked)?.id).toBe(tool);
      // The door is open exactly when the key was handed over.
      expect(v.picture.door === "open").toBe(tool === "key");
      expect(v.picture.cat === "outside").toBe(tool === "key");
      expect(v.picture.star).toBe(tool === "key");
      expect(v.lesson !== null).toBe(tool === "key");
      expect(v.button?.text).toBe(
        tool === "key" ? strings[lang].shed.again : strings[lang].shed.retry,
      );
    }
  });

  it("changes only the words when the language changes, never the tool or the result (REQ-5.12.4)", () => {
    for (const events of [[], [pick("hammer")], [pick("broom"), give], [pick("key"), give]]) {
      expect(strip(view("ja", ...events))).toEqual(strip(view("en", ...events)));
    }
    const asJa = [enter, pick("key"), give, { type: "SetLang", lang: "ja" } as const];
    expect(shedView(asJa.reduce(reduce, initialState)).picture).toEqual(
      view("en", pick("key"), give).picture,
    );
  });
});

describe("toolName and shedEnterLabel", () => {
  it("name every tool and the title's button in the child's language", () => {
    expect(toolName("key", "en")).toBe("key");
    expect(toolName("broom", "en")).toBe("broom");
    expect(toolName("hammer", "ja")).toBe(ja.shed.tools.hammer);
    expect(shedEnterLabel("en")).toBe("Free the cat");
    expect(shedEnterLabel("ja")).toBe(ja.shed.enter);
  });
});
