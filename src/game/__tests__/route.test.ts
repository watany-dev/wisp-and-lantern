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

describe("sceneFor for the field (REQ-6.8.2)", () => {
  it("shows the field in trial 3", () => {
    expect(sceneFor(reduce(initialState, { type: "StartField", seed: 0 }))).toBe("field");
    expect(sceneFor({ phase: "trial", trial: 3 })).toBe("field");
  });

  it("never shows the lane or the shed for trial 3, and never the field for trial 1 or 2", () => {
    expect(sceneFor({ phase: "trial", trial: 3 })).not.toBe("lane");
    expect(sceneFor({ phase: "trial", trial: 3 })).not.toBe("shed");
    expect(sceneFor({ phase: "trial", trial: 1 })).toBe("lane");
    expect(sceneFor({ phase: "trial", trial: 2 })).toBe("shed");
  });

  it("follows the phase before the trial", () => {
    expect(sceneFor({ phase: "title", trial: 3 })).toBe("title");
    expect(sceneFor({ phase: "over", trial: 3 })).toBe("over");
  });
});

describe("sceneFor for the shadows (REQ-7.8.2)", () => {
  it("shows the shadows in trial 4", () => {
    expect(sceneFor(reduce(initialState, { type: "StartShadows", seed: 0 }))).toBe("shadows");
    expect(sceneFor({ phase: "trial", trial: 4 })).toBe("shadows");
  });

  it("never shows the lane, the shed or the field for trial 4, and never the shadows for trials 1 to 3", () => {
    for (const other of ["lane", "shed", "field"]) {
      expect(sceneFor({ phase: "trial", trial: 4 })).not.toBe(other);
    }
    expect(sceneFor({ phase: "trial", trial: 1 })).toBe("lane");
    expect(sceneFor({ phase: "trial", trial: 2 })).toBe("shed");
    expect(sceneFor({ phase: "trial", trial: 3 })).toBe("field");
  });

  it("follows the phase before the trial", () => {
    expect(sceneFor({ phase: "title", trial: 4 })).toBe("title");
    expect(sceneFor({ phase: "over", trial: 4 })).toBe("over");
  });
});

describe("sceneFor for the lantern (REQ-8.10.2)", () => {
  it("shows the lantern in trial 5", () => {
    expect(sceneFor(reduce(initialState, { type: "StartLantern", seed: 0 }))).toBe("lantern");
    expect(sceneFor({ phase: "trial", trial: 5 })).toBe("lantern");
  });

  it("never shows another trial's scene for trial 5, and never the lantern for trials 1 to 4", () => {
    for (const trial of [1, 2, 3, 4]) {
      expect(sceneFor({ phase: "trial", trial })).not.toBe("lantern");
    }
    expect(sceneFor({ phase: "trial", trial: 4 })).toBe("shadows");
  });

  it("follows the phase before the trial", () => {
    expect(sceneFor({ phase: "title", trial: 5 })).toBe("title");
    expect(sceneFor({ phase: "over", trial: 5 })).toBe("over");
  });
});

describe("sceneFor for the crown (REQ-9.11.2)", () => {
  it("shows the crown in trial 6, in every stage", () => {
    expect(sceneFor(reduce(initialState, { type: "StartCrown", seed: 0 }))).toBe("crown");
    expect(sceneFor({ phase: "trial", trial: 6 })).toBe("crown");
  });

  it("never shows another trial's scene for trial 6, and never the crown for trials 1 to 5", () => {
    for (const other of ["lane", "shed", "field", "shadows", "lantern"]) {
      expect(sceneFor({ phase: "trial", trial: 6 })).not.toBe(other);
    }
    for (const trial of [1, 2, 3, 4, 5])
      expect(sceneFor({ phase: "trial", trial })).not.toBe("crown");
  });

  it("follows the phase before the trial", () => {
    expect(sceneFor({ phase: "title", trial: 6 })).toBe("title");
  });
});
