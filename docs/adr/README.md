# Architecture decision records

One file per decision that is expensive to reverse or easy to forget the reason for. A record is
not edited after it is accepted; a later record supersedes it and says so.

| # | Decision | Status |
|---|---|---|
| [0001](0001-pure-domain-reducer.md) | Game rules are a pure reducer, separate from Phaser | Accepted |
| [0002](0002-static-pages-with-previews.md) | Static GitHub Pages site with a preview per pull request | Accepted |
| [0003](0003-quality-gates.md) | Which quality gates block a merge, and which we left out | Accepted; Process gates superseded by 0004 |
| [0004](0004-no-human-gates.md) | No pull request waits for a human | Accepted |

## Format

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context
## Decision
## Consequences
```
