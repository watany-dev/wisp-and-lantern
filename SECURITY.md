# Security policy

## Supported versions

Only the production site built from `main` (and the `submitted` tag during judging) is supported.
Pull request previews under `/pr-preview/` are temporary and removed when the pull request closes.

## What the game does and does not do

- It is a static site on GitHub Pages. There is no server, no account and no analytics.
- It makes no network requests after loading: fonts and images are bundled (AGENTS.md rule 4).
- It sends nothing about the player anywhere. Playtest records in `docs/evidence/` hold no names,
  contact details or faces, and CI rejects e-mail addresses, phone numbers and a private list of
  names.

## Reporting a vulnerability

Please report privately through GitHub: **Security → Report a vulnerability** on this repository.
Do not open a public issue. Include the URL, the browser and device, and the steps to reproduce.

Fixes ship through the normal pull request flow; after the submission deadline they need the
`hotfix` label (see `docs/maintainer-setup.md`).

## How the repository guards itself

- Dependencies are pinned exactly, come only from the npm registry with integrity hashes, and pass
  a license policy (`scripts/check-licenses.mjs`); `npm audit` runs on every pull request and nightly.
- Dependabot proposes updates weekly, at least 7 days after a release.
- Workflows pin third-party actions to commit SHAs and are checked by zizmor and zghalint.
- Semgrep scans every pull request; gitleaks scans for secrets.
- Changes to workflows, checks and test configuration need the maintainer's `human-approved` label.
