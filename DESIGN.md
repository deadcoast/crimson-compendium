# Design record

The global design for the Crimson Compendium. Every branch builds on this; decisions made while building a branch are written back here.

## Purpose — why anyone opens this instead of a wiki

Existing guides (Game8, Fextralife, GameRant) spread one mount across a long article, show the map capture at thumbnail size, and never compare mounts against each other. The compendium answers three questions in one place, each one click deep:

| Question | Answer in the app |
|---|---|
| Where is it? | **Where**: the in-game map capture and on-site capture, full width, with a loupe for map labels and a zoomable lightbox. |
| How do I get it? | **How**: requirement chips, numbered steps, alternate routes, field notes. |
| Is it worth it? | **Seals** on every plate and the **Tier Ladder** ranking everything per metric. |

Plus job-first navigation (**Ride for** lenses: Long haul, Battle, Deep water, Flight, Cliffs & drops, Cargo), `/` search across names, traits and places, and keyboard stepping (`J`/`K`, `←`/`→`, `L`).

## Consumption model — reader, not dashboard

Three columns on desktop: **Spine** (the tree) · **Index** (the leaf or lens) · **Plate** (one entry, read top to bottom). No KPI tiles, no chart panels. Numbers appear as typography (Bodoni numerals, roman tiers, pip rows) inside an editorial plate. Phones get the same model as a stack: list → plate, with the tree in a drawer.

## Visual language

- **Palette**: warm ink blacks, bone text, one signal colour (crimson). Leaves carry an accent (Legendary crimson, Rare ember, Stable bone, Engineered brass, Fleeting ash); terrain classes take their colours from the in-game map (ochre land, map-water teal, pale sky). All tokens live in `src/styles/tokens.css`.
- **Type**: Bodoni Moda for names, numerals and section titles; Archivo (variable width) for UI, condensed and tracked for eyebrow labels; JetBrains Mono for counts and credits. Large Bodoni numerals use a low optical size (`opsz 8`) so the hairline in the 4 stays visible.
- **Imagery**: only real in-game captures and in-game knowledge-entry art, each credited to the guide that took it. Portraits are square and shown round everywhere (index, ladder, search) so mixed sources read as one set.
- **Edges**: a column's background ends at its border line; nothing spills past a frame.

## Motion system

Motion is a reveal language, not decoration. Easing `cubic-bezier(.16,1,.3,1)`.

| Element | Motion |
|---|---|
| Plate hero | Crimson blade slash across the frame, image unveils behind it, slow Ken Burns drift, pointer parallax |
| Entry name | Letters rise from blur in sequence; breaks only between words |
| Terrain layer | Canvas particles by class: embers (land), bubbles + light shafts (sea), wind streaks (sky); pauses off-screen and in hidden tabs |
| Tier seals | Rungs fill bottom-up, Tier I numeral stamps in with a breathing crimson glow |
| Index | Rows cascade in; the selection slab glides between rows |
| Spine | Crimson "sap" travels down the trunk to the active node |
| Ladder | Tokens fly between rungs when the metric changes (crossfade + FLIP) |
| Map capture | Unfolds from the centre line; loupe follows the pointer |
| Stats | Numbers count between Lv 1 and Lv 5 |

`prefers-reduced-motion` turns off particles, drift and staggers.

## Data model

`TREE → BRANCH → LEAF → ENTRY`. A branch is data (`branch.json`, `entries.json`) plus optional plate sections. Core reads only generic fields; branch-specific payloads (mount `stats`, `skills`) are read by that branch's own section component. Routes are hash names (`#mounts`, `#mounts-rare`, `#mounts-for-battle`, `#mounts-ladder`, `#mounts-royler`) so every view is a shareable link.

## Tier system

Defined by the brief: **I** best in class (only the best of the best) · **II** not as good as I, better than everything else · **III** average · **IV** below average · **V** not good. Metrics for Mounts: Speed, Stamina, Travel, Combat (Travel and Combat as defined in the brief).

Rules added while building the Mounts branch (Claude's calls, not in the brief):

1. **Class = terrain.** Each mount is ranked against its own class (Land, Sea, Sky). A Tier I sea mount is the best swimmer, not the best mount overall.
2. **Horses are rated at Lv 5**, their max level; beasts and machines arrive at full strength.
3. **Trait overrides** follow the brief's caveat: no fall damage lifts Travel (Leaping Kuku Bird), a unique attack lifts Combat (Pink Manta Ray's shockwave).
4. **Every rating stores its basis**, shown when you tap a seal. Where no source compares a mount, it sits at III and says so.
5. **"Not rated"** for metrics that do not apply (Stamina on a balloon, mech or wagon).

## Mounts branch — decisions

- **Leaves.** The brief named Legendary and Rare. Three more were needed to place every mount without bending those definitions: **Stable** (the five buyable horse breeds), **Engineered** (crafted machines), **Fleeting** (temporary rides). Rare keeps the brief's definition: not sold at stables, can be made permanent.
- **Snowwhite Deer stamina.** The brief's example gives it "Best Stamina". The recorded figures disagree: 300 Stamina, while Royler has 315 at Lv 1 and 390 at Lv 5, and Elantrima reaches 330. It is rated Stamina II with the trait "Top stamina of the beast legendaries"; Speed II matches the brief.
- **Giant Red Iguana** trait (the brief's TODO): long-range spit that staggers enemies.
- **Conflicting sources** follow the source with in-game evidence (Game8 stat screens over Fextralife's copied stat templates). Stat blocks Fextralife lists with an identical template (400/300/25/50) are not shown unless a second source confirms them.
- **Post-launch changes are current**: patch 1.10 Kuku Chick and Wyvern growth paths, Charting the Unknown sea mounts (November 2026).

## Known gaps

Left out for lack of reliable data or real imagery: Scout Automation and Golden Star Mech (mechanical), Marni's Mechahorse, the Delesyia Train, cattle, and soldier/race horses (temporary). Several common sea mounts have no documented fixed spawn; their plates say so.
