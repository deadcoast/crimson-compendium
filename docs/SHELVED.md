# SHELVED

```txt
[IDENTIFIED + PLAN] -> [SHELVED] -> [TODO]
```

These are the item IDs from `IDENTIFIED.md`, placed under the milestones in `PLAN.md`. Each milestone lists them in build order, so an item comes after the items it relies on.

## M1 Ground truth `[done]`

- TECH-01: `npm run verify`, with the sweep ported into the repo; axe reports but doesn't fail yet
- SC-02: pip rating labels moved out of `<dd aria-label>`
- SC-03: `<main>` and `<nav>` landmarks
- SC-04: contrast tokens (`--ash` ≥ 4.6:1; counts and hints off `--ash-2`), after which the axe gate turns on
- CORE-02: data lint inside `npm run verify`
- TECH-02: self-hosted fonts that load from `file://`

## R1 Riches tree `[done]`

- RI-01: generic core: branch `labels` (lens folder, How/Where eyebrows) and the Route view (`#<branch>-route`)
- RI-02: Riches branch data: 8 leaves, 24 methods, every figure with its basis, every method rated or marked not rated
- RI-03: `RichesLedger.svelte` plate section: pays in, figures, costs, requires, stacks with, watch out
- RI-04: imagery: a real in-game capture for every method, credited
- RI-05: verify covers both roots; lint passes for both branches

## M2 Full roster `[done]`

- NF-06: split mounts that the game registers separately out of `variants` (Cloudcruiser, Skystreaker, Swift Wolf, Large White Wolf, High-Mobility A.T.A.G.)
- NF-07: keepable mounts missing from the data (sea turtle species, Giant Manta Ray, Grizzly Bear, Freight and Trading wagons, soldiers' and scouts' horses; the Heavy Assault A.T.A.G. stays out)
- NF-08: Ships category in Mounts (20 ships)
- ~~NF-09: fleeting rides~~ dropped: permanent mounts only (`DESIGN.md` › Revision 4)
- NF-03: re-check the remaining known gaps (Scout Automation, Golden Star Mech)

## M3 Where, for every mount `[todo]`

- NF-01: map captures for every entry without one (57 of 80 after M2)
- NF-02: heroes for every entry without one (68 of 80 after M2)

## M4 Ratings on evidence `[shelved]`

- CORE-01: replace the ratings that default to III with sourced comparisons

## M5 Compare and navigate `[shelved]`

- SC-01: split `ExplorerTree.svelte`
- QOL-01: keyboard sheet on `?`
- QOL-02: section deep links and copy link
- NF-04: compare view

## R2 Riches depth `[shelved]`

- RI-06: all 18 facilities listed with location, type and staff skill
- RI-07: island upgrades and income, once a source documents them
- RI-08: trade-route table from the in-game Trade tab
- RI-09: every method in your notes (`docs/money-methods.md`) that Riches doesn't cover yet, among them Supply Contracts through merchant trust, the Silk Crafting dispatch, Accountant dispatches, two-slot horse trading, Tinkerton Dig Site Protection, Great Coral Reef farming, and the Timberham save-and-quit duplication (listed under Watch out if it ships, as an exploit). The notes are leads: each method needs a retrievable source and an in-game capture before it ships. Their Camp Funds sums predate the 1,000-per-Silver correction, so they are re-worked, not copied

## Not yet placed

- QOL-03: hash routes trip axe `skip-link`. Accepted; no work.
- TECH-03: per-branch data loading, once a second branch exists. Riches is that second branch (R1); the bundle is 450 kB (123 kB gzip), so this waits until load time shows it matters.
- NF-05: superseded by NF-08.

## Next

When `TODO.md` is complete, its milestone is marked delivered in `PLAN.md` and tagged `[done]` here. Then `TODO.md` is rewritten from the next `[shelved]` section, which is retagged `[todo]`.
