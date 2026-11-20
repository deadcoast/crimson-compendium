# PLAN

This is the single global plan. Each milestone has one theme, and its items live in `SHELVED.md`. Decisions made while building go into `DESIGN.md`. Milestones marked *(proposal)* are my own proposals; they are not in your brief.

## Docs chain

```txt
[IDENTIFIED + PLAN] -> [SHELVED] -> [TODO]
```

- `IDENTIFIED.md`: the review, with IDs on every item.
- `PLAN.md`: this file; the milestones in order.
- `SHELVED.md`: the item IDs for each milestone, in build order.
- `TODO.md`: the milestone being built now.

A milestone is delivered when its TODO is complete, `npm run verify` and CI are green, and its decisions are written into `DESIGN.md`. When none is left shelved, IDENTIFY runs again.

## Milestones

| # | Milestone | Theme | Status |
| --- | --- | --- | --- |
| M0 | Mounts branch (v0.1) and Explorer & category branches (v0.2.0) | the first branch | delivered |
| M1 | Ground truth | a regression gate in the repo; the offline release renders as designed; accessible to keyboard and screen readers | delivered: `npm run verify` in CI and Release; see `DESIGN.md` › Build and release |
| R1 | Riches tree | an endgame economy guide beside Mounts: methods rated I–V, the Route, a ledger on every plate (`DESIGN.md` › Riches) | delivered: 24 methods, the Route, the ledger; see `DESIGN.md` › Riches tree |
| M2 | Full roster | every mount you can keep, one entry per registered mount, ships included (IDENTIFIED §5) | delivered: 80 mounts, 36 added and 3 temporary rides removed; see `DESIGN.md` › Revision 4 |
| M3 | Where, for every mount | map and on-site captures and full-bleed heroes for the whole roster | in progress → `SHELVED.md` › M3 |
| M4 | Ratings on evidence | no rating defaults to III for lack of data | shelved → `SHELVED.md` › M4 |
| M5 | Compare and navigate *(proposal)* | compare mounts side by side, section links, keyboard sheet, explorer split | shelved → `SHELVED.md` › M5 |
| R2 | Riches depth | all 18 facilities with location and staff skill, island upgrades and income once sources publish them, a trade-route table | shelved → `SHELVED.md` › R2 |

Order: M1 comes first because every later milestone changes data or UI and needs a gate that fails. On 2026-11-19 the roster audit (IDENTIFIED §5) moved Full roster ahead of Where and Ratings. Imagery and ratings built for an incomplete roster would have to be redone for every mount added afterwards. M5 adds surface area last. Ships moved into Mounts (NF-08), so the separate Ships branch is gone. On 2026-11-19 you asked for the Riches tree, so R1 runs ahead of M2. It is the first second-root build, and it uses the generic branch path, which M2's additions also rely on. On 2026-11-19 you ruled that only mounts the player can keep belong in the guide, so M2 dropped NF-09 (temporary rides) and removed the Fleeting leaf.

## Next

`SHELVED.md` lists each milestone's items in build order.
