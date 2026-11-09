import { describe, expect, it } from "vite-plus/test";
import { balance } from "../balance";
import {
  finishRun,
  initialRun,
  pointsFor,
  restartRun,
  runDown,
  scoreSearch,
  type Run,
} from "../run";

const run = (patch: Partial<Run> = {}): Run => ({ ...initialRun, ...patch });

describe("initialRun", () => {
  it("REQ-4.1: starts with a full 60-second clock, no score, no streak and no best", () => {
    expect(initialRun).toEqual({
      remainingMs: 60_000,
      score: 0,
      streak: 0,
      best: 0,
      record: false,
    });
    expect(balance.runMs).toBe(60_000);
  });
});

describe("pointsFor (REQ-4.3)", () => {
  it("is 100 for a first find and grows by 50 for each find in a row", () => {
    expect([0, 1, 2, 3, 4].map(pointsFor)).toEqual([100, 150, 200, 250, 300]);
  });

  it("stops growing after four finds in a row", () => {
    expect([5, 6, 20].map(pointsFor)).toEqual([300, 300, 300]);
  });
});

describe("scoreSearch (REQ-4.3)", () => {
  it("a find adds the points for the streak and extends the streak", () => {
    expect(scoreSearch(run(), true)).toEqual(run({ score: 100, streak: 1 }));
    expect(scoreSearch(run({ score: 100, streak: 1 }), true)).toEqual(
      run({ score: 250, streak: 2 }),
    );
  });

  it("any other result keeps the score and ends the streak", () => {
    expect(scoreSearch(run({ score: 250, streak: 2 }), false)).toEqual(
      run({ score: 250, streak: 0 }),
    );
  });

  it("keeps the clock and the best score as they are", () => {
    const before = run({ remainingMs: 1234, best: 700 });
    expect(scoreSearch(before, true)).toMatchObject({ remainingMs: 1234, best: 700 });
    expect(scoreSearch(before, false)).toMatchObject({ remainingMs: 1234, best: 700 });
  });
});

describe("runDown (REQ-4.2)", () => {
  it("takes the milliseconds off the clock", () => {
    expect(runDown(run(), 16.5).remainingMs).toBe(59_983.5);
  });

  it("stops at zero", () => {
    expect(runDown(run({ remainingMs: 10 }), 10).remainingMs).toBe(0);
    expect(runDown(run({ remainingMs: 10 }), 5_000).remainingMs).toBe(0);
  });

  it("changes nothing else", () => {
    expect(runDown(run({ score: 300, streak: 2, best: 900 }), 1)).toMatchObject({
      score: 300,
      streak: 2,
      best: 900,
    });
  });
});

describe("finishRun (REQ-4.5)", () => {
  it("a score above the best becomes the best and is a record", () => {
    expect(finishRun(run({ score: 300, best: 200 }))).toMatchObject({ best: 300, record: true });
    expect(finishRun(run({ score: 100, best: 0 }))).toMatchObject({ best: 100, record: true });
  });

  it("a score equal to or below the best keeps the best and is not a record", () => {
    expect(finishRun(run({ score: 200, best: 200 }))).toMatchObject({ best: 200, record: false });
    expect(finishRun(run({ score: 100, best: 200 }))).toMatchObject({ best: 200, record: false });
  });

  it("a run with no score is never a record, even the first one", () => {
    expect(finishRun(run())).toMatchObject({ best: 0, record: false });
  });

  it("keeps the score", () => {
    expect(finishRun(run({ score: 300 })).score).toBe(300);
  });
});

describe("restartRun (REQ-4.6)", () => {
  it("is a fresh run that keeps only the best score", () => {
    const over = run({ remainingMs: 0, score: 500, streak: 3, best: 500, record: true });
    expect(restartRun(over)).toEqual(run({ best: 500 }));
  });
});
