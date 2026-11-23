import { describe, expect, it } from "vite-plus/test";
import { join } from "node:path";
import { fixture, gitInit, run, runScript, SCRIPTS, type Files } from "./run";

// scripts/mutation-targets.mjs: which files the mutation job of CI mutates (ADR 0005).

const config = JSON.stringify({
  mutate: ["src/**/*.ts", "!src/**/__tests__/**", "!src/game/ui/**"],
});
const base: Files = {
  "stryker.config.json": config,
  "src/domain/a.ts": "export const a = 1;\n",
  "src/domain/b.ts": "export const b = 2;\n".repeat(20),
  "src/domain/__tests__/a.test.ts": "// a\n",
  "src/domain/__tests__/support/pbt.ts": "// support\n",
  "src/game/view.ts": "export const v = 3;\n".repeat(5),
  "src/game/ui/art.ts": "// not mutated\n",
  "docs/notes.md": "notes\n",
};

const lines = (out: string) => out.trim();
const script = join(SCRIPTS, "mutation-targets.mjs");

/** A repository with `base` on main, then `change` committed on a branch, and the script's answer. */
function changedAfter(change: Files, remove: string[] = [], extra: string[] = []) {
  const dir = fixture(base);
  gitInit(dir);
  const git = (...args: string[]) => run(dir, "git", ["-c", "commit.gpgsign=false", ...args]);
  git("checkout", "-q", "-b", "pr");
  const write = fixture(change);
  run(dir, "cp", ["-R", `${write}/.`, "."]);
  for (const f of remove) run(dir, "git", ["rm", "-q", f]);
  git("add", "-A");
  git("-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-qm", "change");
  return run(dir, process.execPath, [script, "--changed", "main", ...extra]);
}

describe("mutation-targets --changed", () => {
  it("names the mutated files a pull request changed, and nothing it did not change", () => {
    const r = changedAfter({ "src/domain/b.ts": "export const b = 9;\n" });
    expect(r.status).toBe(0);
    expect(lines(r.out)).toBe("src/domain/b.ts");
  });

  it("names the source a changed test belongs to, for unit, property and model tests", () => {
    for (const test of ["a.test.ts", "a.pbt.test.ts", "a.model.test.ts"]) {
      const r = changedAfter({ [`src/domain/__tests__/${test}`]: "// changed\n" });
      expect(lines(r.out), test).toBe("src/domain/a.ts");
    }
  });

  it("prints nothing when no mutated file changed: docs, excluded code, a deleted file", () => {
    expect(lines(changedAfter({ "docs/notes.md": "more\n" }).out)).toBe("");
    expect(lines(changedAfter({ "src/game/ui/art.ts": "// changed\n" }).out)).toBe("");
    expect(lines(changedAfter({}, ["src/domain/a.ts"]).out)).toBe("");
  });

  it("names every mutated file when the config, the support code or the dependencies changed", () => {
    const all = "src/domain/a.ts,src/domain/b.ts,src/game/view.ts";
    for (const f of [
      "stryker.config.json",
      "vite.config.ts",
      "package-lock.json",
      "src/domain/__tests__/support/pbt.ts",
    ]) {
      const content =
        f === "stryker.config.json"
          ? JSON.stringify({ ...JSON.parse(config), concurrency: 2 })
          : "// changed\n";
      expect(lines(changedAfter({ [f]: content }).out), f).toBe(all);
    }
  });
});

describe("mutation-targets --changed --shard", () => {
  it("splits only the changed files", () => {
    const change = { "src/domain/a.ts": "// a2\n", "src/game/view.ts": "// v2\n".repeat(9) };
    const parts = ["1/2", "2/2"].map((s) => lines(changedAfter(change, [], ["--shard", s]).out));
    expect(parts).toEqual(["src/game/view.ts", "src/domain/a.ts"]);
    expect(lines(changedAfter({ "docs/notes.md": "x\n" }, [], ["--shard", "1/2"]).out)).toBe("");
  });
});

describe("mutation-targets --shard", () => {
  const dir = fixture(base);
  const shard = (spec: string) => run(dir, process.execPath, [script, "--shard", spec]);

  it("splits every mutated file into parts that together are all of them, once each", () => {
    const parts = ["1/2", "2/2"].map((s) => lines(shard(s).out).split(",").filter(Boolean));
    expect(parts.flat().sort()).toEqual(["src/domain/a.ts", "src/domain/b.ts", "src/game/view.ts"]);
    expect(new Set(parts.flat()).size).toBe(3);
    // b.ts is the largest, so it is alone in the first part.
    expect(parts[0]).toEqual(["src/domain/b.ts"]);
  });

  it("gives the same split every time, and all files for 1/1", () => {
    expect(shard("2/2").out).toBe(shard("2/2").out);
    expect(lines(shard("1/1").out)).toBe("src/domain/a.ts,src/domain/b.ts,src/game/view.ts");
  });

  it("refuses a shard that does not exist, and an unknown flag", () => {
    for (const spec of ["0/2", "3/2", "x", ""]) {
      const r = shard(spec);
      expect(r.status, spec).toBe(2);
      expect(r.out).toContain("--shard needs i/n");
    }
    const r = run(dir, process.execPath, [script, "--all"]);
    expect(r.status).toBe(2);
    expect(r.out).toContain("usage");
  });

  it("prints every mutated file with no flag", () => {
    expect(lines(runScript(dir, "mutation-targets.mjs").out)).toBe(
      "src/domain/a.ts,src/domain/b.ts,src/game/view.ts",
    );
  });
});
