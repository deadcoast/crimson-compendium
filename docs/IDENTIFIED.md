# IDENTIFIED

```txt
[IDENTIFIED + PLAN] -> [SHELVED] -> [TODO]
```

This review was done at commit `db93c9d` (v0.2.0 released, Release workflow fixed) on 2026-11-18. Items marked *(proposal)* are my own proposals; they are not in your brief or in `DESIGN.md`.

## 1. Measured

| What | Number | How it was measured |
| --- | --- | --- |
| Source | `src/core` 693 lines over 8 modules; `src/ui` 2,781 lines over 19 components; `ExplorerTree.svelte` alone is 594 lines (21 % of the UI) | `wc -l` |
| Data | 48 entries; `entries.json` 5,296 lines; `branch.json` 308 lines | `wc -l`, node |
| Debt markers | 0 `TODO`/`FIXME`; 1 `any` | grep |
| Tests | none in the repo. CI runs `svelte-check` and `vite build` only (`ci.yml:17-19`). The behaviour sweep used in every pass (`sweep2.py`) lives outside the repo, and it prints its results without ever failing. | file listing |
| Bundle | 316.7 kB JS (90.7 kB gzip), with the data inlined | `vite build` |
| Media | 126 WebP, 7.7 MB | `du` |
| Where coverage | 23 of 48 entries have no map capture; 18 have no capture at all | node over `entries.json` |
| Hero coverage | 36 of 48 have no hero. `Hero.svelte:17-19` then shows the square portrait framed (`bleed = false`), so those plates lose the full-bleed slash and Ken Burns reveal. | node, source |
| Ratings | 192 ratings; 4 not rated; 32 (17 %, across 19 entries) say "No comparative … data — rated average" | node |
| Accessibility | axe-core 4, serious issues: `aria-prohibited-attr` ×4 (`MountRecord.svelte:88` `<dd aria-label>`); `color-contrast` on 24 nodes of the Royler plate, 4 on the ladder and 6 on phone Underwater. Moderate: `landmark-one-main` (`App.svelte:89`, no `<main>`) and `region`. | axe run on 4 routes |
| Contrast detail | `--ash #7c7469` measures 4.20–4.33:1 on ink (4.5 needed) on readable text: meta lines, metric labels, tier names, filter chips, outline labels. `--ash-2 #554e47` measures 2.07–2.44:1 on counts and empty-state hints. | axe `contrastRatio` |
| Offline fonts | with `fonts.googleapis.com` blocked, 0 web fonts load. Bodoni Moda, Archivo and JetBrains Mono all fall back to system faces. | Playwright route abort and screenshot |
| Load | first load 1.05–1.56 s; LCP 0.7–1.2 s (local preview) | Playwright, PerformanceObserver |

## 2. Current state vs intended design

| Requirement (brief, `DESIGN.md`) | State | Evidence |
| --- | --- | --- |
| TREE → BRANCH → LEAF; later branches built from the source with no scaffolded branches | met | `core/` names no branch except in route comments (`tree.ts:11-15`); a branch is one import block in `registry.ts:5-7` |
| Tiers I–V on Speed, Stamina, Travel, Combat; traits can lift a metric | met | `entries.json` tiers; overrides recorded in `DESIGN.md` |
| Every rating backed by evidence | partial | 32 of 192 ratings default to III for lack of data |
| Where is it? Map and on-site capture, full width | partial | 23 of 48 entries have no map capture, 18 no capture at all |
| How do I get it? | met | 0 entries with empty `routes` |
| Real sourced game imagery, animated plates, no dashboard UI | partial | 36 of 48 plates show a framed portrait instead of a full-bleed hero |
| Category branches with overlap; VS Code/Atom explorer | met | 25 category routes, explorer keys, filter, recent and outline all pass the sweep |
| Release formatted for GitHub | met | v0.2.0 published with its zip |
| Release zip opens from disk looking as designed (`DESIGN.md` › Build) | partial | it opens and runs, but without network every typeface falls back |
| Known gaps (`DESIGN.md`): Delesyia Train, cows/bulls, soldier and race horses, Scout Automation, Golden Star Mech | gap | none of them is in `entries.json` |
| The agent verifies its own builds | partial | the sweep is outside the repo and never fails; CI cannot catch a broken route |
| Accessible to keyboard and screen-reader users *(my standard; not in the brief)* | partial | the axe findings above |

## 3. Strengths and weaknesses

**Strengths**:

- The core is generic: 693 lines handle routing, selectors, lists, lenses, covers and the explorer model, and no mount fields leak into it.
- The registry fails loudly: duplicate routes, unknown leaves, empty categories and missing portraits all stop the load (`registry.ts`).
- Data carries its own evidence: every rating has a `basis`, every image a `credit`, every entry at least one source (2.4 on average, Game8 on 43 and Fextralife on 36).
- One classic-script bundle that opens from `file://`, a one-click release, and CI on every push.

**Weaknesses**:

- No regression gate. A broken route, explorer key or missing image passes CI as long as types check and the build succeeds.
- `ExplorerTree.svelte` holds keys, type navigation, find, sticky rows, reveal and the hover card in 594 lines. All three explorer fixes in v0.2.0 (`b34caaf`, `c4607fe`, `a637202`) landed in this one file.
- Typography depends on Google Fonts at runtime, which contradicts the offline release.
- The readable-text token sits just under WCAG AA, and counts are drawn in the decorative token.

## 4. Items

### NEW-FEATURES-AND-ADDITIONS

- **NF-01: Map captures for the entries without one** (23 before M2; 57 of 80 after it). blackstar, brown-bear, clawed-bear, wolf, rosehorn-deer, ibex, boar, wyvern, hammerhead-shark, orca, sea-turtle, sunfish, dolphin, manta-ray, eagle-ray, electric-ray, spotted-seal, herspia, priden, brianto, elantrima, numont, atag.
  - Where: `entries.json` `media.captures` (`kind: "map"`), then `tools/media.py`.
  - Why: "Where is it?" is the first question in `DESIGN.md`. Today 48 % of plates answer it in text only. Stable breeds get the stable locations. Open-ocean spawns get the region with the plate's "no fixed spawn" note.
  - Verify: "no map capture" count reaches 0, or the entry is listed with a reason in `DESIGN.md` › Known gaps; the verify suite asserts every Where image returns 200.
  - Status (M3, 2026-11-19): 29 plates gained maps; the 28 left are listed by reason in `DESIGN.md` › Known gaps.
- **NF-02: Hero captures for the entries without one** (36 before M2; 68 of 80 after it).
  - Where: `entries.json` `media.hero`.
  - Why: `Hero.svelte:17-19` falls back to a framed portrait, so the plate's reveal motion never runs for three quarters of the roster.
  - Verify: hero count; screenshots of a land, a sea and a sky plate.
  - Status (M3, 2026-11-19): 10 plates gained banners under the Revision 5 rule; the 58 left keep the framed portrait and are listed by reason in `DESIGN.md` › Known gaps.
- **NF-03: Re-check `DESIGN.md` › Known gaps against current sources** (see §5): Scout Automation, Golden Star Mech, Delesyia Train and cows/bulls.
  - Why: the compendium claims to cover every mount.
  - Verify: each one is added, or kept out with the source that says why.
  - **Outcome (M2):** still kept out. Scout Automation and Golden Star Mech have one source and no mount database lists them; the Delesyia Train and cows/bulls are not mounts you keep.
- **NF-06: One entry per separately registered mount** (§5).
  - Cloudcruiser, Skystreaker, Swift Wolf, Large White Wolf and High-Mobility A.T.A.G. are currently hidden as `variants` inside another plate, but the game registers each as its own mount with its own stats.
  - Cosmetic coats, such as the 16 Large Wolf coats, stay as variants.
  - Why: the Flying branch shows 3 mounts when you can keep 5, and the user had no way to see the other 2.
  - Verify: the Flying count, a route for each, and the lint.
  - **Outcome (M2):** all five have their own plates; Flying now lists 5.
- **NF-07: Keepable mounts missing from the data** (§5): the sea turtle species, Giant Manta Ray, Grizzly Bear, Heavy Assault A.T.A.G., and the Freight and Trading wagons.
  - Verify: the registry loads, and the verify suite covers the new routes and category membership.
  - **Outcome (M2):** added, except the Heavy Assault A.T.A.G., which you only borrow from hangars (`DESIGN.md` › Revision 4). The Hernandian Soldier's and Calphadean Scout's Horses register at stables, so they were added here under Stable.
- **NF-08: Ships** (§5). The game files ships as a mount type, so they join the Mounts branch as a Ships category: Humble Bark, and the Small, Medium and Large Hernandian Ship. This supersedes NF-05. Speed, Travel (cargo) and Combat (cannons) apply; Stamina is not rated.
  - Verify: as NF-07, plus the Ships category route.
  - **Outcome (M2):** 20 ships, not 4: the 4 legendary blueprint ships, 3 Greymane-built ships, 9 regional ships and 4 rowboats. "Humble Bark" is the Humble Rowboat in game.
- **NF-09: Fleeting rides missing from the data** (§5): soldier, scout and race horses, Captured Bear, Circus Lion, Gristle Wolf, Helms Hyena, Misthorn Branhok, Giant Bison, cattle, camels and the Worn Wagon. Each needs real imagery before it ships.
  - Verify: as NF-07.
  - **Outcome (M2): dropped.** You ruled that mounts the player cannot keep don't belong in the guide, and the Fleeting leaf was removed with its three plates (`DESIGN.md` › Revision 4).
- **NF-04: Compare view** *(proposal)*. Pin two or three mounts and see their seals, stats, traits and Where side by side at a route such as `#mounts-compare-royler+camora`.
  - Why: `DESIGN.md` says existing guides "never compare mounts against each other". The ladder compares one metric at a time, never two mounts across all four.
  - Verify: route sweep, keyboard path, screenshots.
- **NF-05: Branch two: Ships** *(proposal)*. Superseded by NF-08: the game files ships as mounts, so they belong in the Mounts branch.

### SOURCE-CODE-CHANGES

- **SC-01: Split `ExplorerTree.svelte`** into a find widget, a hover card and a keys module, with the tree component keeping rows and selection.
  - Why: one 594-line component took every explorer fix.
  - Verify: line counts; the explorer checks in the verify suite are unchanged.
- **SC-02: Move the pip ratings' label** out of `<dd aria-label>` (`MountRecord.svelte:88`) into visually hidden text.
  - Why: `aria-label` is not allowed on a definition, so screen readers drop it (axe serious ×4).
  - Verify: axe reports no `aria-prohibited-attr`.
- **SC-03: Landmarks.** The index and plate go in `<main>` and the explorer in `<nav>` (`App.svelte:89`).
  - Why: screen-reader users have no "main" to jump to (axe `landmark-one-main`, `region`).
  - Verify: axe reports no landmark findings.
- **SC-04: Contrast tokens.**
  - Lift `--ash` to ≥ 4.6:1 on every ink surface.
  - Draw counts and empty-state hints in `--ash`, and keep `--ash-2` for ornaments.
  - Why: readable data sits at 4.20–4.33:1 and counts at 2.07–2.44:1. The hierarchy stays: bone titles, then ash data, then ash-2 decoration.
  - Verify: axe reports no `color-contrast` on the four audited routes; screenshots confirm the hierarchy still reads.

### QOL-ENHANCEMENTS

- **QOL-01: Keyboard sheet on `?`** *(proposal)*.
  - Why: about 20 shortcuts (`App.svelte:62-83` plus the explorer keymap) are documented only in the README.
  - Verify: `?` opens the sheet and Esc closes it; the verify suite checks both.
- **QOL-02: Section deep links** such as `#mounts-royler/where`, plus a copy-link action on plate sections *(proposal)*.
  - Why: players share "where is X" more often than the whole plate, and the Outline already knows the sections.
  - Verify: the route opens scrolled to the section; the verify suite checks it.
- **QOL-03: Hash routes trip axe `skip-link` (17 anchors).** Accepted, not changed. The anchors are routes, not skip links. I'm recording it so later audits don't flag it again.

### CORE-FUNCTION-IMPROVEMENTS

- **CORE-01: Replace the 32 ratings that default to III** with sourced comparisons, for example Game8 stat screens or speed tests. The 19 entries are pink-dolphin, pink-manta-ray, leaping-kuku-bird, both iguanas, red-feathered-raptor, rosehorn-deer, sandwalk-camel, the sea commons and elephant.
  - Also: the Speed basis for brown-bear and clawed-bear is just "Slow.", with no source named, and the Game8 page they cite says nothing about bear speed. The M1 data lint caught it.
  - Why: "Is it worth it?" currently answers "unknown" for 17 % of ratings.
  - Verify: the defaulted count, and every new basis names its source.
- **CORE-02: Data lint as code.**
  - Before shipping, check that every rating has a basis or is marked not rated, every capture has a caption and credit, every source has a URL, and every image file exists.
  - Why: the registry checks structure at load, but the content rules live only in my passes.
  - Verify: the lint runs in `npm run verify` and CI, and a seeded bad entry fails it.

### TECHNICAL-MODULE-ENHANCEMENTS

- **TECH-01: `npm run verify`.** Port the sweep to Node Playwright inside the repo.
  - It covers every entry and category route, redirects, explorer keys, filter, recent, outline, console errors and axe, and exits non-zero on any failure. CI runs it.
  - Why: today CI cannot catch a behaviour regression, and the sweep cannot fail.
  - Verify: CI is green; deliberately breaking a route makes it fail.
- **TECH-02: Self-hosted fonts in the bundle.**
  - Use Latin subsets of Bodoni Moda (opsz, wght, italic), Archivo (wdth, wght) and JetBrains Mono, inlined so they also load from `file://`.
  - Why: the offline release currently falls back to system faces, and Bodoni numerals carry the tier system.
  - Verify: open `dist/index.html` from `file://` with the network blocked; `document.fonts` reports all three families loaded; compare screenshots.
- **TECH-03: Per-branch data loading.** Revisit when a second branch lands, because the 316.7 kB bundle inlines all data.
  - Verify: bundle size per branch.

## 5. Roster audit (2026-11-19)

You challenged the roster, and you were right. The app lists 48 mounts. Current guides list 58 (crimsondesert.gg) to 66 (GamingBolt) by name, and GamingBolt puts the full count near a hundred once every rideable is included. Below is what is missing, by how you keep it. "Hidden" means the mount is in the data, but only as a variant line on another plate.

| Mount | Kept how | State in the app | Sources |
| --- | --- | --- | --- |
| Cloudcruiser, Skystreaker | permanent flying (Cloudcart upgrades via research) | hidden in Cloudcart | thegameswiki Cloudcart and Cloudcruiser; crimsondesert.gg; GamingBolt |
| Swift Wolf, Large White Wolf | permanent special mount since 1.07 | hidden in Large Wolf | thegameswiki Large White Wolf; crimsondesert.gg; GamingBolt |
| High-Mobility A.T.A.G. | permanent mech | hidden in A.T.A.G. | Vulkk; GamingBolt |
| Heavy Assault A.T.A.G. | permanent mech | missing | GamingBolt; consolepulse (A.T.A.G Heavy) |
| Green, Hawksbill, Hydrothermal, Loggerhead and Olive Ridley sea turtles | DLC, tamed | 1 "Sea Turtle" entry | crimsondesert.gg; Sportskeeda (turtle types) |
| Giant Manta Ray | DLC, tamed | missing | crimsondesert.gg (needs a second source) |
| Grizzly Bear | special mount (1.07 bear types) | missing | GamingBolt; Vulkk; thegameswiki Special Mounts |
| Freight Wagon, Trading Wagon | permanent wagon tiers | missing | GamingBolt |
| Humble Bark; Small, Medium and Large Hernandian Ship | DLC ships (a mount type) | missing (excluded by my earlier call) | thegameswiki Ships; Playnews; G2A |
| Hernandian Soldier's Horse, Calphadean Scout's Horse, Race Horse | fleeting | missing | crimsondesert.gg; GamingBolt |
| Captured Bear, Circus Lion, Gristle Wolf, Helms Hyena, Misthorn Branhok, Giant Bison | fleeting | missing | GamingBolt; crimsondesert.gg |
| Cattle (bull, calf, buffalo, White-Striped Longhorn) and camels (camel, calf, two-humped) | fleeting | missing | GamingBolt; Game8; consolepulse |
| Worn Wagon | basic wagon | missing | GamingBolt |

Checked and kept out:

- **Mountain God Boar** is a boss fight added in 1.05, not a mount, per thegameswiki and Gaming ProMax. One outlet, consolepulse, lists it as a mount.
- **Delesyia Train** is fixed-route transport, not a personal mount, per Game8 and thegameswiki.

Flying, as you can keep it: Blackstar (a summon on a cooldown), Wyvern, Cloudcart, Cloudcruiser and Skystreaker. The Leaping Kuku Bird glides.

### M2 result (2026-11-19)

80 mounts: 48, plus 36 new plates, minus 3 temporary rides and the old Sea Turtle plate (now the Green Sea Turtle). Every new plate has a real in-game image (crimsondesert.gg, The Games Wiki and Fextralife icons, Game8 ship screens, GamesHedge map and on-site shots) and at least two sources. `DESIGN.md` › Revision 4 records the decisions.

## Next

`docs/SHELVED.md` places these items under the milestones in `docs/PLAN.md`; `docs/TODO.md` holds the milestone in progress.
