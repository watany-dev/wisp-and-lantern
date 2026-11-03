---
name: cleanup-comments
description: >
  Sweep every code comment in the change, delete what restates the code, keep
  only the "why" that cannot be reconstructed from the code, and turn TODO-like
  comments into GitHub issues. Use only when the user invokes
  /cleanup-comments or when the wrapup skill applies it.
metadata:
  adapted-from: watany-dev/chokkin .claude/skills/cleanup-comments
---

# cleanup-comments

Look at every comment and **keep only the "why" that the code cannot tell;
delete the rest**. Do not touch code. Make it a comment-only change in its own
commit, separate from functional changes.

## Criteria

- Delete: what the code already says. Step-by-step narration, doc comments
  that restate the name or signature, section banners, step descriptions
  inside tests.
- Keep: reasons. External constraints, issue references, why the obvious
  approach was not taken, where a constant comes from, fail-open or
  fail-closed choices, ordering dependencies, the intent of a test.
- When a comment mixes both, keep only the "why" sentences.
- When unsure, ask: "If I delete this, will the next developer ask why?"

Specific to this repository:

- Never delete or reword suppression comments: `// Stryker disable ...: <why>`,
  `// nosemgrep: <rule-id> <why>`, `# shellcheck disable=...`. CI and reviewers
  rely on them and on their reasons.
- Keep the header comment of each `scripts/check-*` gate; it documents what the
  gate enforces. Those files are protected paths, so leave them alone unless
  the change already has `human-approved`.
- Keep JSDoc on exported types and functions in `src/domain/` and
  `src/domain/__tests__/support/` when it states intent or limits, for example
  what an option bounds or which temporal property a check stands for.
- Comments stay in English (`AGENTS.md` hard rule 1).

## TODO

For comments that mark unfinished work or a pending decision (`TODO`,
`FIXME`, `not yet`, `follow-up`, `temporary`), search existing issues first;
if there is none, open one (`gh api repos/{owner}/{repo}/issues -f title=... -f body=...`)
and rewrite the comment to reference the issue number.

## Steps

1. Delete comments. Confirm in the diff that nothing but comments changed.
2. Pass `npm run check` and commit.
3. Turn TODOs into issues, commit the reference rewrites separately, and push.
