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
8. After the first deploy from `main` creates the `gh-pages` branch: Settings → Pages → Source = "Deploy from a branch", `gh-pages` / `/ (root)`. Until Pages serves the site (no Source yet, or a private repository on a plan without Pages), `scripts/pages-enabled.sh` gets a 404 from the Pages API; the `deploy` and `preview` jobs then still push to `gh-pages` but skip the wait and the live smoke with a `::warning::`, and the nightly `liveness` job is skipped. No change is needed afterwards: once the API answers, the live checks run again.
9. Settings → Environments → **production** (created by the first deploy from `main`; create it by hand
   if you do this earlier). Turn on "Deployment branches and tags" → "Selected branches and tags" and add
   two rules: branch `main`, and tag `submitted*`. Add no required reviewers (ADR 0004). A deploy from any
   other ref is then refused. The **preview** environment (PR previews) needs no rules.
10. About: set Website to the production URL and check that the MIT license is shown.
11. When the repository is public: Settings → Advanced Security → turn on Dependabot alerts and
    Private vulnerability reporting (`SECURITY.md` points reporters there). Code scanning then shows
    the Semgrep results that the `sast` job uploads; leave CodeQL default setup off.
12. Dependabot (`.github/dependabot.yml`) opens weekly pull requests. They pass the same required
    checks as any other pull request; merge them when green.

## What each required check does

| check | workflow | fails when |
|---|---|---|
| `actions` | ci | zizmor or zghalint (`.zghalint.yml`) finds a problem in `.github/workflows/` |
| `static` | ci | `npm run verify` (including licenses and package sources), `vp check` (Oxfmt formatting, Oxlint, TypeScript 7 type check), knip (unused files, exports, dependencies), `npm audit signatures`, a high or critical advisory in shipped dependencies (on a pull request only when it changes `package.json` or `package-lock.json`; the nightly audit covers the rest), or ShellCheck fails |
| `test` | ci | a unit, property, model-check or script test fails, or coverage of `src/` drops below 95% (lines, statements, functions or branches) |
| `mutation` | ci | Stryker finds a mutant of the unit-tested code that no test kills (`stryker.config.json`) |
| `sast` | ci | Semgrep (`p/default` rules) reports a finding |
| `perf` | ci | a benchmark in `src/**/__perf__/` is more than 5% slower than on the base branch |
| `build` | ci | the production build fails or exceeds the size budget (`scripts/check-size.mjs`) |
| `smoke` | ci | the Playwright smoke fails on the built site under the deploy base path |
| `secrets` | ci | gitleaks finds a secret, or a name from `PII_DENYLIST` appears |
| `guard` | guard | the title or commits break the conventions |

## Updating the pinned Semgrep and ShellCheck images

`ci.yml` runs Semgrep (`sast` job) and ShellCheck (`static` job) as `docker run image@sha256:...`.
Dependabot's `github-actions` ecosystem only sees `uses:` lines and there is no `docker` entry that
could see these digests, so **nobody gets a pull request for them**. Bump them by hand on the first
working day of each month (a recurring calendar reminder for the maintainer is enough). Keep the
digest pin: moving to a tag would weaken the pinning policy.

| tool | image | version appears in |
|---|---|---|
| Semgrep | `semgrep/semgrep` | `ci.yml` step name "Semgrep x.y.z (...)" and the `@sha256:` of that step |
| ShellCheck | `koalaman/shellcheck` | `ci.yml` step name "Shell scripts (ShellCheck x.y.z)", the `@sha256:` of that step, **and** `image=` in `scripts/lint-shell.sh` |

1. Find the latest release: <https://github.com/semgrep/semgrep/releases> and
   <https://github.com/koalaman/shellcheck/releases>. Read the release notes; a new Semgrep can add
   findings to `p/default` that fail `sast`.
2. Resolve the digest of the release tag. This is the digest of the multi-arch index, which is what
   `docker run` resolves on the runner:

   ```sh
   docker buildx imagetools inspect semgrep/semgrep:1.178.0 --format '{{.Manifest.Digest}}'
   docker buildx imagetools inspect koalaman/shellcheck:v0.11.0 --format '{{.Manifest.Digest}}'
   ```

   (Replace the tags with the new versions. `crane digest <image>:<tag>` gives the same value.)
3. Replace the `sha256:` value **and** the version in the step name in the same commit. Search with
   `grep -rn "semgrep/semgrep@\|koalaman/shellcheck@" .github scripts` and update every hit; the
   ShellCheck digest is in `.github/workflows/ci.yml` and `scripts/lint-shell.sh`.
4. Run `npm run check` (it runs ShellCheck via `scripts/lint-shell.sh` when a binary or Docker is
   available). Fix any new findings in the code; suppress only a false positive, with the reason.
5. Open the pull request. `.github/` is a protected path (`AGENTS.md`), so give the reason in the
   Decisions section; the required `actions`, `static` and `sast` checks must be green before merge.
