// Minimal benchmark harness used by `src/**/__perf__/*.perf.ts`.
// `measure(name, fn)` registers a Vitest test that times `fn` and appends one JSON line
// ({ name, medianNs, samples }) to the file named by PERF_OUT, if set.
// `scripts/check-perf.mjs` compares those numbers between the base branch and a pull request.
import { appendFileSync } from "node:fs";
import { test } from "vite-plus/test";

const BATCH_NS = 10_000_000n; // each sample runs fn long enough to take at least 10 ms
const WARMUP_BATCHES = 3;
const SAMPLES = 15;

let sink: unknown;

function timeBatch(fn: () => unknown, iterations: number): bigint {
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i += 1) sink = fn();
  return process.hrtime.bigint() - start;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function measure(name: string, fn: () => unknown): void {
  test(name, ({ task }) => {
    let iterations = 1;
    while (timeBatch(fn, iterations) < BATCH_NS) iterations *= 2;
    for (let i = 0; i < WARMUP_BATCHES; i += 1) timeBatch(fn, iterations);
    const samples: number[] = [];
    for (let i = 0; i < SAMPLES; i += 1)
      samples.push(Number(timeBatch(fn, iterations)) / iterations);
    const medianNs = median(samples);
    const id = `${task.file.name} > ${name}`;
    console.log(`${id}: ${medianNs.toFixed(1)} ns/op (${iterations} ops per sample)`);
    if (process.env.PERF_OUT) {
      appendFileSync(process.env.PERF_OUT, `${JSON.stringify({ name: id, medianNs, samples })}\n`);
    }
    if (sink === Symbol.for("never")) console.log(sink);
  });
}
