import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const SCRIPTS = resolve(import.meta.dirname, "..");

export type Files = Record<string, string | Buffer>;
export type Result = { status: number | null; out: string };

/** Creates a fresh directory holding `files` (paths relative to it) and returns its path. */
export function fixture(files: Files): string {
  const dir = mkdtempSync(join(tmpdir(), "wl-script-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

/** Runs `command` in `cwd` without the CI summary file, so tests never write to it. */
export function run(cwd: string, command: string, args: string[], input?: string): Result {
  const env = { ...process.env, GITHUB_STEP_SUMMARY: "" };
  const r = spawnSync(command, args, { cwd, env, input, encoding: "utf8" });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

/** Runs scripts/<name> (a .mjs with node, a .sh with bash) inside `cwd`. */
export function runScript(cwd: string, name: string, input?: string): Result {
  const command = name.endsWith(".sh") ? "bash" : process.execPath;
  return run(cwd, command, [join(SCRIPTS, name)], input);
}

/** Turns `dir` into a git repository with every file committed, as CI sees a checkout. */
export function gitInit(dir: string): void {
  const git = (...args: string[]) => run(dir, "git", ["-c", "commit.gpgsign=false", ...args]);
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("-c", "user.name=test", "-c", "user.email=test@example.invalid", "commit", "-qm", "init");
}
