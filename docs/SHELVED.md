# SHELVED

```
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

## M2 Where, for every mount `[todo]`

- NF-01: map captures for the 23 entries without one
- NF-02: heroes for the 36 entries without one

## M3 Ratings on evidence `[shelved]`

- CORE-01: replace the 32 ratings that default to III with sourced comparisons

## M4 Full roster `[shelved]`

- NF-03: Delesyia Train, cows/bulls, soldier and race horses, Scout Automation, Golden Star Mech

## M5 Compare and navigate `[shelved]`

- SC-01: split `ExplorerTree.svelte`
- QOL-01: keyboard sheet on `?`
- QOL-02: section deep links and copy link
- NF-04: compare view

## M6 Branch two: Ships `[shelved]`

- NF-05: Ships branch
- TECH-03: per-branch data loading

## Not yet placed

- QOL-03: hash routes trip axe `skip-link`. Accepted; no work.

## Next

When `TODO.md` is complete, its milestone is marked delivered in `PLAN.md` and tagged `[done]` here. Then `TODO.md` is rewritten from the next `[shelved]` section, which is retagged `[todo]`.
