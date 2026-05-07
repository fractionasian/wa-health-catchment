# Consumers of `data/postcodes.json`

This repo is the **canonical source** for WA cancer-patient suburb-to-hospital routing.
Downstream tools **pull** from here — there is no push pipeline.

When `data/postcodes.json` (or the routing rules in `app.js`) changes, the consumers
listed below need to re-fetch and re-pin. Update the **Last sync** column when each
consumer is brought up to date.

## Consumers

| Consumer | What it consumes | How | Pinned to | Last sync | Owner / contact |
|---|---|---|---|---|---|
| `wa-health-catchment` (this repo) | `data/postcodes.json` directly | Same-repo fetch via `app.js` | HEAD | — | Peter |
| `quorum` | `data/postcodes.json` → seed for conclude-flow referral pathway suggestions (spec only — see `~/clippy/docs/superpowers/specs/2026-05-07-quorum-referral-pathway-suggestions.md`) | Vendored to `~/quorum/data/wa-catchment/postcodes.json` (no runtime fetch; pilot needs to survive Peter's GH account being unavailable) | `429cc01` | 2026-05-07 | Peter |

## Update protocol

1. Make change in this repo. Note in commit message what routing rules changed.
2. Bump `git log` — the commit hash IS the version. No separate version file.
3. For each consumer above whose **Pinned to** column is older than HEAD:
   - Re-fetch / rebuild
   - Update **Pinned to** and **Last sync** in this table
   - Commit that update here

## Open data questions blocking consumers

These are flagged in `~/clippy/work/wa-health-catchment.md` and should be resolved
before Quorum surfaces routing suggestions to clinicians outside Peter:

- ICON Midland RT billing model (bulk-bill vs schedule fee) — affects realism of private-RT recommendation for unfunded patients
- Peel private RT provider — GenesisCare Mandurah vs ICON Rockingham (ask Mirko Hessel, CNC RadOnc RkPG, 045 850 5527)
- DoH external-sharing approval for SMHS Epidemiology map data — currently OK for personal/clinician use, re-ask under multi-institution Quorum pilot threat model (contact: Donald Wu, SMHS Epidemiology)
