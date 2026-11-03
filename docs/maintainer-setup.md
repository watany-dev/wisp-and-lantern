# Maintainer setup

Settings that GitHub Actions cannot apply. Do them in this order.

1. **Rename the repository to `wisp-and-lantern`** (before setting up Pages).
2. Local clone: add `doc/` and `.claude/` to `.git/info/exclude`.
3. Settings → General: allow **squash merging only**; default squash commit message = "Pull request title". Turn on "Automatically delete head branches".
4. Settings → Rules → Rulesets
   - **main**: restrict deletions, block force pushes, require linear history, require a pull request (0 approvals), required status checks `actions` `static` `test` `mutation` `sast` `perf` `build` `smoke` `secrets` `guard`, "Require branches to be up to date before merging" on, no bypass.
   - **tags `submitted*`**: restrict creations, updates and deletions; only Repository admin may bypass.
5. Settings → Actions → General: default workflow permissions = "Read repository contents and packages". Leave "Allow GitHub Actions to create and approve pull requests" **off**.
6. Labels: none to create. (`nightly`, `liveness` and `production` are created by `scripts/report-failure.sh`.)
7. Secrets: `PII_DENYLIST` — children's real names and nicknames, one per line. Never commit this list.
8. After the first deploy from `main` creates the `gh-pages` branch: Settings → Pages → Source = "Deploy from a branch", `gh-pages` / `/ (root)`.
9. About: set Website to the production URL and check that the MIT license is shown.
10. When the repository is public: Settings → Advanced Security → turn on Dependabot alerts and
    Private vulnerability reporting (`SECURITY.md` points reporters there). Code scanning then shows
    the Semgrep results that the `sast` job uploads; leave CodeQL default setup off.
11. Dependabot (`.github/dependabot.yml`) opens weekly pull requests. They pass the same required
    checks as any other pull request; merge them when green.

## What each required check does

| check | workflow | fails when |
|---|---|---|
| `actions` | ci | zizmor or zghalint (`.zghalint.yml`) finds a problem in `.github/workflows/` |
| `static` | ci | `npm run verify` (including licenses and package sources), `vp check` (Oxfmt formatting, Oxlint, TypeScript 7 type check), knip (unused files, exports, dependencies), `npm audit signatures`, a high or critical advisory in shipped dependencies, or ShellCheck fails |
| `test` | ci | a unit, property, model-check or script test fails, or coverage of `src/` drops below 95% (lines, statements, functions or branches) |
| `mutation` | ci | Stryker finds a mutant of the unit-tested code that no test kills (`stryker.config.json`) |
| `sast` | ci | Semgrep (`p/default` rules) reports a finding |
| `perf` | ci | a benchmark in `src/**/__perf__/` is more than 5% slower than on the base branch |
| `build` | ci | the production build fails or exceeds the size budget (`scripts/check-size.mjs`) |
| `smoke` | ci | the Playwright smoke fails on the built site under the deploy base path |
| `secrets` | ci | gitleaks finds a secret, or a name from `PII_DENYLIST` appears |
| `guard` | guard | the title or commits break the conventions |
