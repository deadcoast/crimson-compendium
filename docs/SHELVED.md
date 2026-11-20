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

## M2 Full roster `[todo]`

- NF-06: split mounts that the game registers separately out of `variants` (Cloudcruiser, Skystreaker, Swift Wolf, Large White Wolf, High-Mobility A.T.A.G.)
- NF-07: keepable mounts missing from the data (sea turtle species, Giant Manta Ray, Grizzly Bear, Heavy Assault A.T.A.G., Freight and Trading wagons)
- NF-08: Ships category in Mounts (Humble Bark; Small, Medium and Large Hernandian Ship)
- NF-09: fleeting rides (soldier, scout and race horses, Captured Bear, Circus Lion, Gristle Wolf, Helms Hyena, Misthorn Branhok, Giant Bison, cattle, camels, Worn Wagon)
- NF-03: re-check the remaining known gaps (Scout Automation, Golden Star Mech)

## M3 Where, for every mount `[shelved]`

- NF-01: map captures for every entry without one (23 before M2; recounted after it)
- NF-02: heroes for every entry without one (36 before M2; recounted after it)

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
- RI-09: methods from your notes in `docs/money-methods.md` not yet in Riches: Supply Contracts through merchant trust, the Silk Crafting dispatch, Accountant dispatches, two-slot horse trading, Tinkerton Dig Site Protection; each needs a retrievable source and an in-game capture before it ships

## Not yet placed

- QOL-03: hash routes trip axe `skip-link`. Accepted; no work.
- TECH-03: per-branch data loading, once a second branch exists. Riches is that second branch (R1); the bundle is 450 kB (123 kB gzip), so this waits until load time shows it matters.
- NF-05: superseded by NF-08.

## Next

When `TODO.md` is complete, its milestone is marked delivered in `PLAN.md` and tagged `[done]` here. Then `TODO.md` is rewritten from the next `[shelved]` section, which is retagged `[todo]`.
