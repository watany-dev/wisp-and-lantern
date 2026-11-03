// Performance gate: fail when any benchmark is more than 5% slower than on the base branch.
//
// Usage: node scripts/check-perf.mjs <base-dir>
//   <base-dir> is a checkout of the base commit with its dependencies installed
//   (CI: `git worktree add` of the pull request's base SHA, then `npm ci` inside it).
//
// Benchmarks are `src/**/__perf__/*.perf.ts` files written with `perf/harness.ts`. Each side runs
// its own benchmarks with its own code. Runs alternate between base and head (ABBA order) so that
// drift on a shared CI machine hits both sides equally, and each benchmark is compared by the
// median over rounds. If a benchmark looks slower, more rounds run before the verdict, so a single
// noisy round cannot fail the build.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const THRESHOLD = 0.05;
const ROUNDS = 5;
const EXTRA_ROUNDS = 6;
const CONFIG = "vitest.perf.config.ts";

const baseDir = process.argv[2] && resolve(process.argv[2]);
const headDir = process.cwd();
if (!baseDir) {
  console.error("usage: node scripts/check-perf.mjs <base-dir>");
  process.exit(2);
}
if (!existsSync(join(baseDir, CONFIG))) {
  console.log(
    `check-perf: skip (the base has no ${CONFIG}, so there is nothing to compare against)`,
  );
  process.exit(0);
}

const work = mkdtempSync(join(tmpdir(), "perf-"));
const results = { base: new Map(), head: new Map() }; // name -> number[] (ns/op, one per round)

function run(side, round) {
  const dir = side === "base" ? baseDir : headDir;
  const out = join(work, `${side}-${round}.jsonl`);
  const vitest = join(dir, "node_modules", "vitest", "vitest.mjs");
  const r = spawnSync(process.execPath, [vitest, "run", "--config", CONFIG, "--reporter=dot"], {
    cwd: dir,
    env: { ...process.env, PERF_OUT: out, CI: "1" },
    encoding: "utf8",
  });
  if (r.status !== 0) {
    process.stderr.write(`${r.stdout}${r.stderr}\n`);
    console.error(`::error::check-perf: the ${side} benchmarks failed to run`);
    process.exit(1);
  }
  if (!existsSync(out)) return;
  for (const line of readFileSync(out, "utf8").split("\n").filter(Boolean)) {
    const { name, medianNs } = JSON.parse(line);
    if (!results[side].has(name)) results[side].set(name, []);
    results[side].get(name).push(medianNs);
  }
}

function rounds(from, count) {
  for (let i = from; i < from + count; i += 1) {
    const order = i % 2 === 0 ? ["base", "head"] : ["head", "base"];
    for (const side of order) run(side, i);
    process.stdout.write(`round ${i + 1} done\n`);
  }
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function compare() {
  const names = [...new Set([...results.base.keys(), ...results.head.keys()])].sort((a, b) =>
    a.localeCompare(b, "en"),
  );
  return names.map((name) => {
    const b = results.base.get(name);
    const h = results.head.get(name);
    if (!b) return { name, status: "new", head: median(h) };
    if (!h) return { name, status: "removed", base: median(b) };
    const base = median(b);
    const head = median(h);
    const change = head / base - 1;
    return { name, base, head, change, status: change > THRESHOLD ? "slower" : "ok" };
  });
}

rounds(0, ROUNDS);
let rows = compare();
let total = ROUNDS;
if (rows.some((r) => r.status === "slower")) {
  console.log(`Possible regression; running ${EXTRA_ROUNDS} more rounds to confirm.`);
  rounds(ROUNDS, EXTRA_ROUNDS);
  total += EXTRA_ROUNDS;
  rows = compare();
}

const ns = (v) =>
  v === undefined
    ? "—"
    : v >= 1e6
      ? `${(v / 1e6).toFixed(2)} ms`
      : v >= 1e3
        ? `${(v / 1e3).toFixed(2)} µs`
        : `${v.toFixed(1)} ns`;
const pct = (c) => (c === undefined ? "—" : `${c >= 0 ? "+" : ""}${(c * 100).toFixed(1)}%`);
const icon = { ok: "ok", slower: "**slower**", new: "new", removed: "removed" };
const summary = [
  "### Performance vs base",
  "",
  `Median time per operation over ${total} alternating rounds. Fails above +${THRESHOLD * 100}%.`,
  "",
  "| benchmark | base | head | change | status |",
  "|---|---|---|---|---|",
  ...rows.map(
    (r) => `| ${r.name} | ${ns(r.base)} | ${ns(r.head)} | ${pct(r.change)} | ${icon[r.status]} |`,
  ),
  "",
].join("\n");
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);

for (const r of rows.filter((x) => x.status === "removed")) {
  console.log(`::warning::Benchmark removed: ${r.name}. Explain why in the pull request.`);
}
const slower = rows.filter((r) => r.status === "slower");
if (slower.length) {
  for (const r of slower)
    console.log(
      `::error::${r.name} is ${pct(r.change)} slower than the base (limit +${THRESHOLD * 100}%).`,
    );
  process.exit(1);
}
console.log("check-perf: ok");
