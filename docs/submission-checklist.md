# Submission checklist

- [ ] Public repository, MIT, license shown in About, `/.kiro` at the root and not ignored
- [ ] `scripts/check-submission.sh` and `scripts/check-kid-strings.mjs` pass; evidence logs and playtest records contain no secrets, personal data or children's names
- [ ] Video under 3 minutes, public on YouTube, shows a real phone, no third-party marks or music, no child's face
- [ ] Description, write-up, README and `.kiro/` are in English; the game has an English toggle
- [ ] Following only README "For judges", a third person reaches trials 1, 3, 6 and the parent screen on desktop within 4 minutes
- [ ] Trial 1 is solvable in grayscale
- [ ] Thumbnail GIF uploaded
- [ ] `docs/evidence/pbt/` has results for all 6 trials and matches the PBT section of the write-up
- [ ] Numbers in the write-up match `docs/evidence/metrics.md` right after `npm run metrics` (plus `environment.md` and `reviewer-log.md`); "What didn't work" cites at least 2 entries from `didnt-work.md`
- [ ] Production is green in the nightly liveness check
- [ ] Category = Costume Contest; the description explains what the spookiness does in each trial
- [ ] Bonuses: blog post published (mentions Kiroween 2026), social posts start with `#KiroweenHackathon26`, Ghost of Kiroween Past if registered in 2025
- [ ] Video, description and implementation agree
- [ ] URL and video checked on another device and network while signed out
- [ ] Credits redeemed by 2026-12-04
- [ ] Tag `submitted` on the deployed commit (`git tag -a submitted -m "Devpost submission" && git push origin submitted`)
