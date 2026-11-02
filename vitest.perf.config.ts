import { defineConfig } from "vitest/config";

// Performance benchmarks (`src/**/__perf__/*.perf.ts`, written with `perf/harness.ts`).
// `scripts/check-perf.mjs` runs them against the base branch and the pull request.
export default defineConfig({
  test: {
    include: ["src/**/__perf__/*.perf.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 120_000,
  },
});
