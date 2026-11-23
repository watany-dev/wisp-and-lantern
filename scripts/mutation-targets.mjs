// Which files Stryker mutates in CI (ADR 0005). Prints one line: a comma-separated list for
// `stryker run --mutate`, or nothing when there is nothing to mutate.
//
//   node scripts/mutation-targets.mjs [--changed <base-ref>] [--shard <i>/<n>]
//
// The mutated files are the ones `stryker.config.json` names in `mutate` (patterns, `!` excludes).
// `--changed` keeps the mutated files changed since the merge base with <base-ref>, and the source
// file a changed test belongs to (`src/a/__tests__/b.test.ts`, `b.pbt.test.ts`, `b.model.test.ts`
// belong to `src/a/b.ts`). When something every test depends on changed (the test or Stryker
// config, the test support code, the dependencies, this script), it keeps every mutated file.
// `--shard` then splits the files into n parts of about the same size, the same way each time, and
// prints part i. Without it, all of them.
import { execFileSync } from "node:child_process";
import { globSync, readFileSync, statSync } from "node:fs";
import { matchesGlob } from "node:path";

/** A change to one of these can change the result for any mutant, so the whole run is needed. */
const WHOLE_RUN = [
  "stryker.config.json",
  "vite.config.ts",
  "vitest.setup.ts",
  "tsconfig.json",
  "package.json",
  "package-lock.json",
  ".nvmrc",
  "src/**/__tests__/support/*.ts",
  "scripts/mutation-targets.mjs",
];

const byName = (a, b) => a.localeCompare(b);

function fail(message) {
  console.error(`mutation-targets: ${message}`);
  process.exit(2);
}

function mutatedFiles() {
  const { mutate } = JSON.parse(readFileSync("stryker.config.json", "utf8"));
  const include = mutate.filter((p) => !p.startsWith("!"));
  const exclude = mutate.filter((p) => p.startsWith("!")).map((p) => p.slice(1));
  const files = new Set(include.flatMap((p) => globSync(p)));
  return [...files].filter((f) => !exclude.some((p) => matchesGlob(f, p))).sort(byName);
}

/** The source file a test file belongs to, by name: `src/a/__tests__/b.pbt.test.ts` is `src/a/b.ts`. */
function sourceOf(file) {
  const m = /^(src\/.+)\/__tests__\/([^/]+?)(?:\.pbt|\.model)?\.test\.ts$/.exec(file);
  return m ? `${m[1]}/${m[2]}.ts` : null;
}

function changed(base) {
  const all = mutatedFiles();
  const out = execFileSync("git", ["diff", "--name-only", "--diff-filter=d", `${base}...HEAD`], {
    encoding: "utf8",
  });
  const files = out.split("\n").filter(Boolean);
  if (files.some((f) => WHOLE_RUN.some((p) => matchesGlob(f, p)))) return all;
  const wanted = new Set(files.flatMap((f) => [f, sourceOf(f)]));
  return all.filter((f) => wanted.has(f));
}

function parseShard(spec) {
  const m = /^(\d+)\/(\d+)$/.exec(spec ?? "");
  const [i, n] = m ? [Number(m[1]), Number(m[2])] : [0, 0];
  if (!(n >= 1 && i >= 1 && i <= n)) fail(`--shard needs i/n with 1 <= i <= n, got "${spec}"`);
  return { i, n };
}

/** Part i of n: largest file first into the lightest part; ties by name, so every run splits the same way. */
function shard(files, { i, n }) {
  const sized = files
    .map((f) => ({ f, size: statSync(f).size }))
    .sort((a, b) => b.size - a.size || a.f.localeCompare(b.f));
  const parts = Array.from({ length: n }, () => ({ size: 0, files: [] }));
  for (const { f, size } of sized) {
    const lightest = parts.reduce((a, b) => (b.size < a.size ? b : a));
    lightest.size += size;
    lightest.files.push(f);
  }
  return parts[i - 1].files.sort(byName);
}

const options = { changed: null, shard: null };
const args = process.argv.slice(2);
while (args.length > 0) {
  const flag = args.shift();
  if (flag === "--changed" && args.length > 0) options.changed = args.shift();
  else if (flag === "--shard") options.shard = parseShard(args.shift());
  else fail("usage: [--changed <base-ref>] [--shard <i>/<n>]");
}
const files = options.changed === null ? mutatedFiles() : changed(options.changed);
console.log((options.shard === null ? files : shard(files, options.shard)).join(","));
