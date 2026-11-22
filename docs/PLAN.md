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
| M2 | Full roster | every mount you can keep, one entry per registered mount, ships included (IDENTIFIED §5) | delivered: 80 mounts (36 new plates; 3 temporary rides removed; the Sea Turtle became the Green Sea Turtle); see `DESIGN.md` › Revision 4 |
| M3 | Where, for every mount | map and on-site captures and full-bleed heroes for the whole roster | delivered: 29 plates gained maps and 10 gained banners; every plate still without one is listed with its reason; see `DESIGN.md` › Revision 5 |
| Q1 | Quality of Life tree | a third root: guides to every mechanic that improves quality of life, a computed Priority list, the Order, and one home per how-to across branches | delivered: 39 upgrades; see `DESIGN.md` › Quality of Life tree |
| Q2 | Mount inventory and the 2.05.01 sweep | what every mount carries and wears; settings plates on the current menu; every patch through 2.05.01 checked for convenience features | delivered: Inventory on all 80 mount plates, 23 more Records, 7 new upgrades, re-blockades and settings rebuilt; see `DESIGN.md` › Revision 6 and › Q2 |
| MT1 | Materials tree | a fourth root: where every item goes and what reads it, across house, ship and mount storage, in one grid and 20 plates | delivered: the Sorter (2 sheets, 31 families, 12 mechanics), the Set-up Order, 20 manifests; see `DESIGN.md` › Materials tree |
| M4 | Ratings on evidence | no rating defaults to III for lack of data | in progress → `SHELVED.md` › M4 |
| M5 | Compare and navigate *(proposal)* | compare mounts side by side, section links, keyboard sheet, explorer split | shelved → `SHELVED.md` › M5 |
| R2 | Riches depth | all 18 facilities with location and staff skill, island upgrades and income once sources publish them, a trade-route table | shelved → `SHELVED.md` › R2 |

Order: M1 comes first because every later milestone changes data or UI and needs a gate that fails. On 2026-11-19 the roster audit (IDENTIFIED §5) moved Full roster ahead of Where and Ratings. Imagery and ratings built for an incomplete roster would have to be redone for every mount added afterwards. M5 adds surface area last. Ships moved into Mounts (NF-08), so the separate Ships branch is gone. On 2026-11-19 you asked for the Riches tree, so R1 runs ahead of M2. It is the first second-root build, and it uses the generic branch path, which M2's additions also rely on. On 2026-11-19 you ruled that only mounts the player can keep belong in the guide, so M2 dropped NF-09 (temporary rides) and removed the Fleeting leaf. After M3, you asked for a three-tier money list; it shipped as Riches' Potential list (`DESIGN.md` › Riches tree) ahead of M4. On 2026-11-20 you asked for the Quality of Life tree; Q1 ran ahead of M4 for the same reason R1 did. On 2026-11-21 you found mount inventory missing and the re-blockade menu wrong; Q2 fixed both and audited the trees. Release v0.3.0 (2026-11-21) ships M1, R1, M2, M3, Q1 and Q2. Later on 2026-11-21 you asked for the Materials tree; MT1 ran ahead of M4 for the same reason R1 and Q1 did. Release v0.4.0 (2026-11-21) ships MT1.

## Next

`SHELVED.md` lists each milestone's items in build order.
