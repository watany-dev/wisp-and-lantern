---
name: kick
description: >
  Fix the given GitHub issues, verify the fix on a production build, run the
  wrapup skill, open one PR that closes the issues, keep its CI green and merge
  it. Use when the user invokes /kick with issue numbers, for example
  "/kick #12 #34".
metadata:
  adapted-from: watany-dev/chokkin .claude/skills/kick
---

# kick

Resolve every issue the user names in a single PR. Do not open new issues
(see step 6 for the one exception).

When something is unclear, do not stop: take the answer you would have
recommended and record the question and your choice in the PR's Decisions
section. Do not guess what you can find out by reading the code.

`AGENTS.md` applies throughout: hard rules, protected paths, never push to
`main`, never force-push, never edit playtest records.

## Steps

1. **Read.** Read each issue (`gh api repos/{owner}/{repo}/issues/<n>` and its
   `/comments`), the related `.kiro/specs/<spec>/` requirements and tasks,
   `.kiro/steering/` and `docs/adr/`. Write down acceptance criteria per issue.
2. **Fix.** For each issue, write a failing test first, then fix it, and make
   one commit per issue. Rules go in `src/domain/` and are tested there
   (ADR 0001); a bug report is an event list, so reproduce it as a reducer test
   or a `*.model.test.ts` trace when you can. If behavior changes, update the
   spec in `.kiro/specs/` too. Player-facing text goes in `src/content/`; run
   `npm run kid` and `npm run font` after changing strings. `npm run check`
   must pass.
3. **Verify on a build.** Run `npm run build && npm run smoke`. Reproduce the
   issue against the built site (`?judge=1`, `?trial=n`, `window.__game`),
   with Playwright if needed, and confirm it is gone. If the change touches
   `src/domain/`, also run `npm run mutation` and `npm run bench`. You cannot
   test on a real phone; the Playwright smoke covers mobile and desktop, and
   real devices are covered by the weekly pass in `docs/device-checklist.md`. When you
   notice a nearby bug or something you cannot explain, fix light ones on the
   spot (separate commit) and repeat step 3.
4. **Run the `wrapup` skill** (read `.kiro/skills/wrapup/SKILL.md` and follow
   it). If it led to changes, repeat step 3.
5. **Open the PR.** Branch: `<spec>/<task>` when the issues map to a spec
   task, otherwise `fix/<issue numbers>`, for example `fix/12-34`. If the
   session already has a non-default branch checked out, use it. Title: an
   English conventional commit. Body: English, every section of
   `.github/pull_request_template.md`, `Closes #<n>` for each issue. Focus on
   what the issues do not tell: decisions, intent, rejected options. Include
   the step 3 results. Do not repeat what the diff shows. End with a
   `Found, not fixed` section, one
   line per thing you noticed along the way. Commit the session's
   `docs/evidence/kiro-log/` file if one exists. Create the PR through the
   REST API: `gh api repos/{owner}/{repo}/pulls -f title=... -f body=... -f head=<branch> -f base=main`.
6. **File issues for heavy findings.** After the PR is open, open one issue
   per heavy item in `Found, not fixed` that no open issue, spec task or
   roadmap item already covers, and link it from that line. Put the event
   trace or reproduction steps in the issue body. Do not fix them in this PR.
7. **Merge.** Check the PR (`gh api repos/{owner}/{repo}/pulls/<n>`,
   `gh run list --branch <branch>`, `gh run view <id> --log-failed`, review
   comments at `gh api repos/{owner}/{repo}/pulls/<n>/comments`). Keep CI green
   and address review comments. If the branch is behind `main`, update it with
   `gh api -X PUT repos/{owner}/{repo}/pulls/<n>/update-branch` and wait for CI
   again. When every required check is green, squash-merge it:
   `gh api -X PUT repos/{owner}/{repo}/pulls/<n>/merge -f merge_method=squash`.
   Never merge with a failing or pending check. Stop when the PR is merged or
   closed.

## Light and heavy

Light: fixable inside the module you are already changing, no spec change, no
protected path, a few dozen lines including tests. Fix light findings in the
order you find them, and repeat step 3 at most 3 times in total. Heavy:
everything else, and anything still open after 3 rounds.
