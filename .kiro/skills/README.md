# Kiro skills

Workflow skills adapted from [watany-dev/chokkin](https://github.com/watany-dev/chokkin)
for this repository. In the Kiro IDE and CLI each folder is a slash command,
for example `/kick #12 #34` or `/wrapup`. On Kiro Web, ask for the skill by
name ("run kick on #12") and Kiro activates it from its description.

```text
kick
├── wrapup
│   ├── ponytail-review
│   ├── formal-spec-extraction (when rules or state transitions change, or `/wrapup formal`)
│   └── cleanup-comments
└── update-docs (when documentation needs syncing)
```

When a skill applies another skill, the agent reads
`.kiro/skills/<name>/SKILL.md` and follows it in the current task.

- `formal-spec-extraction` is an English translation of
  [mizchi's playbook](https://gist.github.com/mizchi/db7817e6fc077d567c41cd9d41bb1c53).
  Here it runs on `checkModel`, `checkProperty` and Stryker instead of Z3 or
  TLA+ (ADR 0003).
- `ponytail-review` is copied unchanged from
  [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) at
  `bd6176a`, under the MIT license in its folder.
