# 0005. Mutation testing in shards, and only the changed files on a pull request

- Status: Accepted
- Date: 2026-11-23
- Supersedes: the "Diff-only mutation testing" item that 0003 left out

## Context

0003 runs Stryker over all unit-tested code on every pull request and left diff-only mutation testing out
"until the whole run passes 10 minutes". With four trials the CI job took about 28 minutes against its
30-minute limit, and the pull request for trial 5 timed out once. Building shared test states inside the
tests (#85) cut the static mutants from 64% to 14% of the total; the CI job still took 21 to 22 minutes, and
each new trial adds a few.

## Decision

- The `mutation` job of `ci.yml` is three `mutation-shard` jobs that run side by side and a `mutation` job
  that passes only when all three passed. `mutation` stays the required check.
- `scripts/mutation-targets.mjs` chooses the files. On a pull request it takes the files Stryker mutates
  (`stryker.config.json`) that changed since the merge base, and the source file a changed test belongs to
  by name; when the test or Stryker config, the test support code, the dependencies or the script itself
  changed, it takes every file. On a push to `main` it takes every file. It then splits them into three
  shards of about the same size, the same way every time.
- A shard with nothing to mutate passes at once. The break threshold stays 100: any surviving mutant in the
  files that run fails.
- `npm run check` still mutates every file, as before.

## Consequences

- A pull request that changes only documents or code outside `mutate` runs no mutants. One that changes a
  few files runs only their mutants.
- A change in one file can let a mutant in another, unchanged file survive (a test that covered it is
  weakened through a shared helper the script does not know about). The pull request does not see it; the
  full run on `main` does, and because `deploy` needs `mutation`, it fails before production. The fix is a
  follow-up pull request.
- Three shards use about the same total runner time as one job, plus the setup of three runners.
