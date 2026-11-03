---
inclusion: always
---

# Product

Wisp & Lantern is a portrait mobile web game that teaches 6-year-olds how to work with an AI
agent: a ghost helper that does nothing until you ask, does exactly what you ask, and sometimes
gets it wrong. It is a Kiroween 2026 hackathon entry.

- Players: children aged 5 to 8, playing with one finger on a phone, a parent nearby. Parents are
  the second audience and get their own screen and text (`src/content/parents.*.json`).
- Lessons L1 to L4 (tell it clearly, hand over the tools, check it, keep secrets) and the five
  trials that teach them are defined in `docs/learning-design.md`. Read it before changing a trial,
  and respect its "What we do not teach" list.
- Languages: Japanese (the primary audience) and English. Every child-facing string exists in both.
- Playtests follow `docs/playtest-protocol.md`. Playtest records are never edited.

## Hard rules

Other files refer to these by number ("hard rule 2"). Do not renumber them; append new rules at
the end.

1. Everything in the repository is English, except the files listed in `scripts/check-cjk-allowlist.txt`.
2. Japanese child-facing text: hiragana and katakana only, max 12 characters per line, max 2 lines.
   `npm run kid` enforces this.
3. `src/domain/**` must not import `phaser` or touch `Date`, `Math.random`, `crypto`, timers or browser
   globals (Oxlint enforces this through `lint` in `vite.config.ts`).
4. The game makes no network requests. Fonts and images are bundled.
5. No third-party trademarks, logos or characters. Assets are original or CC0; fonts are OFL.
6. Dependency versions are pinned exactly. Explain any new dependency in the PR. `check-licenses.mjs`
   allows only npm-registry packages with permissive licenses in shipped code.
7. Meaning is never carried by color alone. Every interaction works with one finger and with a mouse.
