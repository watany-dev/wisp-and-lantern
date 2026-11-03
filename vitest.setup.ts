import fc from "fast-check";

fc.configureGlobal({
  numRuns: Number(process.env.FC_RUNS ?? 100),
  ...(process.env.FC_SEED ? { seed: Number(process.env.FC_SEED) } : {}),
});
