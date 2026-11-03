# Kiro usage

## The central case: the loop we teach is the loop we used

## Spec-driven development

## Steering

## Hooks

- `.kiro/hooks/evidence-log.json` (`Stop`): appends one metadata record each time the agent stops to
  `docs/evidence/kiro-log/`, the source for the hook numbers in `metrics.md`.
- `.kiro/hooks/ptuf.json` (`SessionStart` + `PreToolUse`): cloud sessions start from a fresh clone,
  so `SessionStart` installs the pinned [ptuf](https://github.com/watany-dev/ptuf) binary, and
  `PreToolUse` sends every tool call to it. ptuf allows, asks or denies by rule (`.ptuf.yaml`),
  not by asking a model. If the binary is missing, the hook blocks the call instead of letting it
  through.

## Property-based testing

## Custom agents

## MCP

## Powers

## Surfaces: IDE, CLI, Web, Crew

## Numbers (from `docs/evidence/metrics.md`)

## What didn't work
