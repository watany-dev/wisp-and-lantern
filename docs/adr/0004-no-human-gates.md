# 0004. No pull request waits for a human

- Status: Accepted
- Date: 2026-11-03
- Supersedes: the `device-checked` gate in 0002 and the Process gates in 0003

## Context

0002 and 0003 made the maintainer part of every merge: the `human-approved` label for protected
paths, the `device-checked` label and ticked Device check for device-facing paths, the `hotfix`
label after the deadline, and the merge itself. Agents also stopped to ask, and waited for labels
and merges. With one maintainer, these steps decided how fast work moved. Any new device-facing
commit removed the label, so one change could need several device checks.

## Decision

- `guard` keeps only the title and commit message conventions. It still runs from the base branch.
- The `device-gate` check, the `human-approved` and `hotfix` labels and the post-deadline freeze
  are removed.
- Agents merge their own pull request (squash, through the REST API) once every required check is
  green. Questions they would have asked go in the pull request's Decisions section with the
  answer they chose. Heavy findings become issues that the agent files.
- Real devices are checked in a weekly pass on production (`docs/device-checklist.md`), not per
  pull request.
- All automated checks from 0003 stay required.

## Consequences

- A change that passes CI reaches production without anyone looking at it. Problems that only a
  real phone shows (touch, audio, the iOS Safari layout) are found up to a week later.
- Protected paths are guarded only by the rule "never change them to make a check pass". An agent
  can change a workflow, a check script or a threshold in the same pull request that needs it.
- Nothing stops merges after the submission deadline. A change after 2026-12-04 22:00 UTC reaches
  the site the judges see.
- Playtest records are no longer guarded by CI; the rule "never edit playtest records" remains.
