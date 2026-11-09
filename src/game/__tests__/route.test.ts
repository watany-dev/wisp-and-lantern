import { describe, expect, it } from "vite-plus/test";
import { reduce } from "../../domain/reducer";
import { initialState } from "../../domain/state";
import { sceneFor } from "../route";

describe("sceneFor (REQ-5.9.2)", () => {
  it("shows the title before anything starts", () => {
    expect(sceneFor(initialState)).toBe("title");
  });

  it("shows the lane in trial 1 and the shed in trial 2", () => {
    expect(sceneFor(reduce(initialState, { type: "Start" }))).toBe("lane");
    expect(sceneFor(reduce(initialState, { type: "StartShed" }))).toBe("shed");
  });

  it("shows the end screen when the run is over", () => {
    const over = [{ type: "Start" }, { type: "Tick", ms: 60_000 }] as const;
    expect(sceneFor(over.reduce(reduce, initialState))).toBe("over");
  });

  it("never shows the lane for a state with trial 2, and never the shed for trial 1", () => {
    expect(sceneFor({ phase: "trial", trial: 2 })).toBe("shed");
    expect(sceneFor({ phase: "trial", trial: 1 })).toBe("lane");
  });

  it("follows the phase before the trial", () => {
    expect(sceneFor({ phase: "title", trial: 2 })).toBe("title");
    expect(sceneFor({ phase: "over", trial: 2 })).toBe("over");
  });
});
