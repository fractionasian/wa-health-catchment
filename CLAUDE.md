@~/.claude/principles/coding.md

# Canonical source — read CONSUMERS.md before changing data

This repo is the canonical source for WA cancer-patient suburb-to-hospital routing.
Other tools (notably Quorum) consume `data/postcodes.json` via pull/re-fetch — there
is no push pipeline.

Before editing `data/postcodes.json` or routing rules in `app.js`:

1. Read `CONSUMERS.md` — see who pulls from here and what they're pinned to
2. Make the change
3. Update `CONSUMERS.md` if a consumer needs a re-fetch trigger

Provenance, source-data details, and open data questions: see
`~/clippy/work/wa-health-catchment.md`.
