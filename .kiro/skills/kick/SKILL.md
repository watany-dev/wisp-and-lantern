---
name: kick
description: >
  Fix the given GitHub issues, verify the fix on a production build, run the
  wrapup skill, open one PR that closes the issues, and keep its CI green until
  it is merged. Use when the user invokes /kick with issue numbers, for example
  "/kick #12 #34".
metadata:
  adapted-from: watany-dev/chokkin .claude/skills/kick
---

# kick

Resolve every issue the user names in a single PR. Do not open new issues
(see step 6 for the one exception).

When something is unclear, stop and ask the user, and include the answer you
recommend. Do not ask what you can find out by reading the code.

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
   test on a real phone: the maintainer does that on the PR preview. When you
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
   the step 3 results. Do not repeat what the diff shows. Leave the Device
   check boxes for the maintainer. End with a `Found, not fixed` section, one
   line per thing you noticed along the way. Commit the session's
   `docs/evidence/kiro-log/` file if one exists. Create the PR through the
   REST API: `gh api repos/{owner}/{repo}/pulls -f title=... -f body=... -f head=<branch> -f base=main`.
6. **Do not file issues.** Heavy findings go in the `Found, not fixed`
   section; the user turns the ones they want into issues. One exception, at
   most one per PR: a reproducible crash or soft-lock (a child can no longer
   finish a trial) that no open issue, spec task or roadmap item covers. Put
   the event trace or reproduction steps in the issue body.
7. **Follow up.** Every 15 minutes, check the PR
   (`gh api repos/{owner}/{repo}/pulls/<n>`, `gh run list --branch <branch>`,
   `gh run view <id> --log-failed`, review comments at
   `gh api repos/{owner}/{repo}/pulls/<n>/comments`). Keep CI green and address
   review comments. A missing `human-approved` or `device-checked` label is the
   maintainer's step: report it, do not work around it. Stop when the PR is
   merged or closed.

## Light and heavy

Light: fixable inside the module you are already changing, no spec change, no
protected path, a few dozen lines including tests. Fix light findings in the
order you find them, and repeat step 3 at most 3 times in total. Heavy:
everything else, and anything still open after 3 rounds.
