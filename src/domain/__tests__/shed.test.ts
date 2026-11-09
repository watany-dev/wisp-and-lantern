import { describe, expect, it } from "vite-plus/test";
import type { ShedEvent } from "../events";
import {
  canGive,
  initialShed,
  opensDoor,
  reduceShed,
  shedOutcome,
  tools,
  triedTool,
  type Shed,
  type ToolId,
} from "../shed";

const picked = (pick: ToolId | null): Shed => ({ stage: "choosing", pick });
const tried = (tool: ToolId): Shed => ({ stage: "tried", tool });
const pick = (tool: ToolId): ShedEvent => ({ type: "PickTool", tool });
const give: ShedEvent = { type: "GiveTool" };
const retry: ShedEvent = { type: "RetryShed" };
const play = (events: ShedEvent[], from: Shed = initialShed) => events.reduce(reduceShed, from);

describe("the shed rule (REQ-5.5)", () => {
  it("has the three tools: key, broom and hammer", () => {
    expect([...tools]).toEqual(["key", "broom", "hammer"]);
  });

  it("opens the door with the key and with nothing else", () => {
    expect(opensDoor("key")).toBe(true);
    expect(opensDoor("broom")).toBe(false);
    expect(opensDoor("hammer")).toBe(false);
  });

  it("starts with nothing picked", () => {
    expect(initialShed).toEqual({ stage: "choosing", pick: null });
  });
});

describe("shedOutcome and triedTool", () => {
  it("choosing has no tried tool and no result, whatever is picked", () => {
    for (const shed of [picked(null), ...tools.map(picked)]) {
      expect(triedTool(shed)).toBeNull();
      expect(shedOutcome(shed)).toBe("choosing");
    }
  });

  it("a tried key is open; a tried broom or hammer is shut (the table in design.md)", () => {
    expect(triedTool(tried("key"))).toBe("key");
    expect(shedOutcome(tried("key"))).toBe("open");
    expect(triedTool(tried("broom"))).toBe("broom");
    expect(shedOutcome(tried("broom"))).toBe("shut");
    expect(triedTool(tried("hammer"))).toBe("hammer");
    expect(shedOutcome(tried("hammer"))).toBe("shut");
  });
});

describe("canGive (REQ-5.4)", () => {
  it("is true only while choosing with a tool picked", () => {
    expect(canGive(picked(null))).toBe(false);
    for (const tool of tools) {
      expect(canGive(picked(tool))).toBe(true);
      expect(canGive(tried(tool))).toBe(false);
    }
  });
});

describe("PickTool (REQ-5.3)", () => {
  it.each(tools)("picks the %s from an empty hand", (tool) => {
    expect(reduceShed(initialShed, pick(tool))).toEqual(picked(tool));
  });

  it("replaces the pick: a later tool takes the place of the earlier one, never both", () => {
    expect(play([pick("key"), pick("broom")])).toEqual(picked("broom"));
    expect(play([pick("broom"), pick("hammer"), pick("key")])).toEqual(picked("key"));
  });

  it("keeps the same tool when it is picked again, and returns the same object", () => {
    const keyPicked = picked("key");
    expect(reduceShed(keyPicked, pick("key"))).toBe(keyPicked);
  });

  it("does not hand the tool over or use it", () => {
    for (const tool of tools) {
      expect(reduceShed(initialShed, pick(tool)).stage).toBe("choosing");
      expect(shedOutcome(reduceShed(initialShed, pick(tool)))).toBe("choosing");
    }
  });

  it("is ignored once a tool was tried, until the retry", () => {
    for (const first of tools) {
      const done = tried(first);
      for (const other of tools) expect(reduceShed(done, pick(other))).toBe(done);
    }
  });
});

describe("GiveTool (REQ-5.4, REQ-5.5)", () => {
  it.each(tools)("tries exactly the %s that was picked, and nothing else", (tool) => {
    expect(play([pick(tool), give])).toEqual(tried(tool));
  });

  it("tries the tool that is picked at that moment, after a pick was replaced", () => {
    expect(play([pick("key"), pick("hammer"), give])).toEqual(tried("hammer"));
    expect(play([pick("hammer"), pick("key"), give])).toEqual(tried("key"));
  });

  it("with no tool picked changes nothing and returns the same object", () => {
    expect(reduceShed(initialShed, give)).toBe(initialShed);
  });

  it("is locked while a result shows: a second hand-over changes nothing", () => {
    for (const tool of tools) {
      const done = tried(tool);
      expect(reduceShed(done, give)).toBe(done);
    }
  });

  it("opens the door only for the key", () => {
    expect(shedOutcome(play([pick("key"), give]))).toBe("open");
    expect(shedOutcome(play([pick("broom"), give]))).toBe("shut");
    expect(shedOutcome(play([pick("hammer"), give]))).toBe("shut");
  });
});

describe("RetryShed (REQ-5.6, REQ-5.7)", () => {
  it.each(tools)("after the %s goes back to a fresh choosing with nothing picked", (tool) => {
    expect(play([pick(tool), give, retry])).toEqual(initialShed);
  });

  it("while choosing changes nothing and returns the same object", () => {
    expect(reduceShed(initialShed, retry)).toBe(initialShed);
    const keyPicked = picked("key");
    expect(reduceShed(keyPicked, retry)).toBe(keyPicked);
  });

  it("has no limit and no cost: the key opens the door after any number of broom and hammer tries", () => {
    let shed = initialShed;
    for (let i = 0; i < 20; i += 1) {
      shed = play([pick(i % 2 === 0 ? "broom" : "hammer"), give, retry], shed);
      expect(shed).toEqual(initialShed);
    }
    expect(shedOutcome(play([pick("key"), give], shed))).toBe("open");
  });

  it("after a success plays the shed again, and the key opens it again", () => {
    const again = play([pick("key"), give, retry, pick("key"), give]);
    expect(again).toEqual(tried("key"));
    expect(shedOutcome(again)).toBe("open");
  });
});
