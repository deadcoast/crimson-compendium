# Design record

The global design for the Crimson Compendium. Every branch builds on this; decisions made while building a branch are written back here.

## Purpose — why anyone opens this instead of a wiki

Existing guides (Game8, Fextralife, GameRant) spread one mount across a long article, show the map capture at thumbnail size, and never compare mounts against each other. The compendium answers three questions in one place, each one click deep:

| Question | Answer in the app |
|---|---|
| Where is it? | **Where**: the in-game map capture and on-site capture, full width, with a loupe for map labels and a zoomable lightbox. |
| How do I get it? | **How**: requirement chips, numbered steps, alternate routes, field notes. |
| Is it worth it? | **Seals** on every plate and the **Tier Ladder** ranking everything per metric. |

Plus play-style navigation: **category branches** (Land, Underwater, Flying, Mechanical, Easter Eggs, DLC) for the kind of session you are about to play, **Ride for** lenses (All Around Best, Battle, Cliffs & drops, Cargo) for the job at hand, `/` search across names, traits, places and branches, and keyboard stepping (`J`/`K`, `←`/`→`, `L`).

## Consumption model — reader, not dashboard

Three columns on desktop: **Explorer** (the tree) · **Index** (the leaf, category or lens) · **Plate** (one entry, read top to bottom). No KPI tiles, no chart panels. Numbers appear as typography (Bodoni numerals, roman tiers, pip rows) inside an editorial plate. Phones get the same model as a stack: list → plate, with the tree in a drawer.

## Visual language

- **Palette**: warm ink blacks, bone text, one signal colour (crimson). Red is reserved for the root (brand, the Mounts branch, Tier I, Ride for, the ladder); the Riches root is gold (`--gold`). Text a reader needs (meta lines, counts, hints, credits, placeholders) uses `--ash` or brighter, which measures at least 4.5:1 on every ink surface (WCAG AA). `--ash-2` is for ornaments only: separators, diamonds and not-rated numerals. Leaves carry a traditional tier accent: Legendary orange (`--ember`), Rare royal blue (`--royal`), Stable bone, Engineered brass, Fleeting ash; Easter Eggs and its leaves are cyan (`--cyan`), as specified in `docs/spec/tier-colors.txt`. Terrain classes take their colours from the in-game map (ochre land, map-water teal, pale sky). All tokens live in `src/styles/tokens.css`.
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
| Explorer | Rows cascade in from the folder that opened them, others slide aside (FLIP); twisties turn; the selection slab and the focus outline glide separately; the active indent guide carries flowing "sap" in the folder's accent; sticky ancestors pin and push up; find widget drops from the pane header; entry hover card |
| Outline | Section symbols cascade in; a slab tracks the reading position down the plate |
| Ladder | Tokens fly between rungs when the metric changes (crossfade + FLIP) |
| Map capture | Unfolds from the centre line; loupe follows the pointer |
| Stats | Numbers count between Lv 1 and Lv 5 |

`prefers-reduced-motion` turns off particles, drift and staggers.

## Data model

`TREE → BRANCH → (CATEGORY BRANCH →) LEAF → ENTRY`. A branch is data (`branch.json`, `entries.json`) plus optional plate sections. Core reads only generic fields; branch-specific payloads (mount `stats` and `skills`, a Riches `ledger`) are read by that branch's own section component. Routes are hash names (`#mounts`, `#mounts-rare`, `#mounts-underwater`, `#mounts-underwater-rare`, `#mounts-for-battle`, `#mounts-ladder`, `#mounts-royler`, `#riches-route`) so every view is a shareable link. Retired names keep working through `redirects` in `branch.json`.

**Category branches** are play-style lists that sit inside a branch. Each declares a selector (`where`: terrain `domains`, `tags`, `cls`) and either `"leaves": "rarity"` — one leaf per branch leaf that has members, so Underwater › Legendary, Underwater › Rare… appear only when populated — or its own leaves with their own selectors (Easter Eggs › Nods, Oddities). Membership resolves once in the registry. **Overlap is intended**: the A.T.A.G. is Land, Underwater, Mechanical and DLC at once, because each list answers a different session ("I'm diving today", "I want machines"). The registry refuses empty categories, empty leaves and route collisions.

## Explorer — the main browser window

Built on the VS Code tree widget and Atom tree-view, read from their source (`microsoft/vscode` `abstractTree.ts`, `listWidget.ts`, `tree.css`, `paneview.css`; `atom/tree-view` `tree-view.less`, `tree-view.cson`) and translated onto this theme.

| Standard | Source | Here |
|---|---|---|
| View panes | VS Code paneview: 22 px uppercase headers, actions shown on hover/focus, animated height | **Recent** (last opened mounts), **Compendium** (the tree, takes the free height), **Outline** (sections of the open plate, tracks reading position). Open/closed state persists. Side panes cap their height on short screens so the tree keeps its room. |
| Rows | VS Code list: fixed 22 px rows, 16 px twistie, indent per level | 22 px rows, 12 px indent (VS Code's default is 8; 12 keeps guides legible beside portrait icons). Touch and phone layouts use 32 px rows. |
| Focus ≠ selection | VS Code list | The selection slab marks the open route; a separate outline marks the keyboard cursor. Arrows move focus only; Enter opens. |
| Keys | VS Code `onLeftArrow` / `onRightArrow` / `onSpace`, Atom keymap | ↑ ↓ PgUp PgDn Home End move · → expands, or steps into the first child · ← collapses, or steps out to the parent · Alt+→/← expand/collapse a whole subtree (Atom) · Space folds (Alt: subtree) · Enter opens · Esc leaves the tree (Atom `unfocus`) · Alt+\ or Ctrl+Shift+E focus the explorer from anywhere |
| Type navigation | VS Code `TypeNavigationController`, 800 ms buffer | Letters jump to the next row whose name starts with what you typed. `/` stays reserved for the command palette. |
| Find / filter | VS Code tree find widget (filter mode), slides from the top in 0.3 s | Ctrl/⌘+F or the filter action. Matches are highlighted; ancestors of matches open; the count reads in mounts, not rows. Enter opens the first matching mount. |
| Indent guides | VS Code: shown on hover, active guide = focused open folder or the focused row's parent | Same rule; the active guide is drawn in the folder's accent with a flowing "sap" pulse. |
| Sticky scroll | VS Code sticky tree rows | Up to three ancestor rows pin to the top and are pushed up by the next folder; click one to jump to it. |
| Auto reveal | `explorer.autoReveal` | Any route change (palette, index, J/K) opens the path to its row and scrolls it into view. |
| Collapse all, reveal | VS Code explorer actions, Atom `reveal-active-file` | Pane actions: Filter, Reveal the open page, Collapse folders. |
| Hover | VS Code hover widget, delayed | Entry rows show a card after ~0.5 s: portrait, kind, trait and all four tiers. |

Tree order under a branch: the original rarity leaves first (unchanged), then the category branches, then **Ride for**, then the Tier ladder. Every list folder also holds its mounts as rows with portrait icons, so the explorer alone reaches every page.

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

- **Revision 2 — category branches and renames** (Claude's calls where the brief was silent):
  - *Long haul → All Around Best.* Membership unchanged (land mounts rated Travel I–II); the order now follows all four ratings together (`"sortBy": "overall"`, mean of rated metrics) so the name is true. Index and explorer show the rounded overall tier.
  - *Deep water → Underwater* and *Flight → Flying* moved from lenses to category branches with the same membership plus anything else that works in that terrain (`domains`), so Underwater also lists the A.T.A.G. (marine refit) and Marni's Mechahorse. Old links redirect.
  - *Mechanical* = machines you pilot: A.T.A.G., Cloudcart, Marni's Mechahorse. The Pywel Wagon is horse-drawn and stays out.
  - *Easter Eggs* split into **Nods** (references to other games: the Kuku Bird as Crimson Desert's Chocobo per GameRant and TheGamer; Marni, a Black Desert Online inventor) and **Oddities** (the circus lion, the wildlife-park elephant). Each carries an `egg` note shown on its plate and as its list line.
  - *DLC: Charting the Unknown* (alias DLC) = the fourteen sea mounts plus the A.T.A.G. marine refit. Ships are excluded: Game8 and Fextralife list ships separately from mounts, with their own stat model (hull, cargo, movement/acceleration/handling) — they would be a branch of their own.
  - *Marni's Mechahorse* added (Fleeting, Machine): Stamina I — the only mount that never spends stamina — Speed not rated, Travel III (spawns only at Delesyia, lost on fast travel), Combat V.
  - *High-Mobility A.T.A.G.* recorded as an A.T.A.G. variant (Vulkk).

- **Revision 3: full roster** (decided 2026-11-19 after the roster audit in `docs/IDENTIFIED.md` §5; built in M2):
  - *One entry per registered mount.* A mount the game registers under its own name, with its own stats, gets its own plate: Cloudcruiser, Skystreaker, Swift Wolf, Large White Wolf, High-Mobility A.T.A.G. and each sea turtle species. Cosmetic coats with the same stats stay as `variants`, such as the 16 Large Wolf coats. Folding registered mounts into variants hid two of the five flying mounts you can keep.
  - *Ships are mounts.* This reverses the Revision 2 exclusion. The game files ships as a mount type (thegameswiki, G2A), so Humble Bark and the Small, Medium and Large Hernandian Ship join Mounts as a Ships category. They are rated on Speed, Travel (cargo) and Combat (cannons); Stamina is not rated.
  - *Not mounts:* the Mountain God Boar is a boss encounter (thegameswiki, Gaming ProMax), and the Delesyia Train is fixed-route transport (Game8, thegameswiki).

## Riches tree — decisions

You asked for Riches on 2026-11-19: an endgame economy guide for a player who has **finished the main story but not started Charting the Unknown**. Its job is to have the player arrive at the DLC rich, then turn the DLC's systems (real estate, ships, islands) into more money. It covers management mechanics and direct player control. The research, with sources, is in `docs/RICHES-RESEARCH.md`. R1 shipped it with 24 methods.

- **Where it sits.** Riches is its own root in the explorer, next to Mounts (`#riches…`), and is built from the same source as Mounts with no forked UI. You called it a TREE; in the code it is the second `branch` module, and its sub-branches are leaves. *(My call.)*
- **The Route is the front door.** `#riches` opens the Route, not the first leaf: the plan is what a reader comes for, and the catalogue sits behind it. Any branch with a `route` opens this way; Mounts has none and still opens on its first leaf. *(My call.)*
- **Two axes, as you framed them.** Every method is either *Management* (`cls: management`: it runs through camp, staff or assets) or *Player Control* (`cls: player`: Kliff does it by hand). Both are category lists. Three more lists sit beside them:
  - *When*: Before the DLC and In the DLC.
  - *Multipliers*: methods that pay nothing alone and raise every other payout.
  - *Can Lose Money*: methods where what you put in can come back smaller (lost cargo, daily upkeep, High-risk interest, bounty, buy-ins). It replaced the planned *Traps* list. The one candidate trap, the 2.01 Gold Bar Investment dispatch, has no documented cost or payout behind a retrievable source, so the route skips it and the Bank plate says why.
- **Leaves** (your sub-branches, plus the ones research added): Greymanes (bone), Trade (royal) *(research addition)*, Bank (gold) *(research addition)*, Pailune (sky), Real Estate (brass), Ships (sea), Islands (cyan), Hustles (ember). Hustles holds the hand-done money that belongs to no system. It is not named Player Control, so that name stays free for the class and its category. The root accent is a new `--gold`. The Riches root, its Best for lenses and the Route use it. Red keeps its jobs from the palette rule: brand, the Mounts root, Tier I and the ladder.
- **Tiers rate methods, not mounts.** Same I–V scale and evidence rule as Mounts. The metrics:
  - **Return:** what it pays next to the other methods, on the best documented figure.
  - **Effort:** hands-on time per payout; I means it runs while you're away.
  - **Setup:** funds, quests and staff needed to start; I means available now and cheap.
  - **Scale:** how far it grows when you reinvest or stack multipliers.

  A method with no documented income (castles, islands, ships, Pailune) is not rated on Return. It does not get a default III. Multipliers are rated on what they add: Golden Beer doubles every payout, so its Return is I.
- **Currencies.**
  - Copper → Silver (100:1) → Gold Bar (500 Silver at a bank; about 190 at a merchant).
  - Camp Funds buy ships, leases, Blessings and dispatch fees.
  - Since patch 2.01, 1 Silver donates as 10 Camp Funds (it was 1:1; Vulkk).
  - The Games Wiki measured a donated Gold Bar at **50,000 Camp Funds** before 2.01. That is ten times its 500 Silver at the new rate (5,000), and the wiki marks it unconfirmed for the current build. The Route therefore says to donate one bar, read the counter, and donate whole bars if it holds. This is the guide's biggest single lever, and it is flagged as unconfirmed everywhere it appears.
  - One Hernand Bond is 10 Gold Bars; Bonds need 10 (100 bars) to invest.
- **Every figure carries its basis.** The ledger labels each figure:
  - *Patch notes*.
  - *Guide*.
  - *Screenshot*: read off an in-game screenshot a guide published.
  - *Player report*: shown in ember italics as one player's result.
  - *Sum shown*: my arithmetic, with the sum printed, for example 84,450 × 10 = 844,500.

  When sources disagree, the plate shows both. One example is the facility lease: 15,000, listed as Copper by Vulkk and as Camp Funds by Xbox Play. Facility income is shown three ways: screenshot figures from a young sawmill (48,422 over 40 hours open; a 7-hour day earning 18,094 against 33,660 in wages and upkeep), the player-reported million a day, and NeonLights' note that patch 2.04.02 fixed inflated facility earnings.
- **The Route** (`#riches-route`) is a generic branch view (`BranchDef.route`). It is an ordered plan of phases. Each phase has a stage, a reason, a cover, steps that link to plates, and optional *meanwhile* loops (player-control work to do while timers run). It is the "targeted strategy" you asked for:
  1. Arm the multipliers.
  2. Build the dispatch engine.
  3. Open the trade routes.
  4. Convert at the best rate.
  5. Finish Pailune.
  6. Lease before you sail.
  7. Build the first ship, buy the second.
  8. Pioneer the islands.

  The ship call in phase 7 comes from the data: the quest-built Small Greymane Ship holds 14 slots, the same as the 40,000 Small Hernandian, so the Route skips that purchase and saves for the Medium (22 slots, 1.2M).
- **Route view design.** It is image-led:
  - Each phase opens on its cover. The cover desaturates into full colour as it enters view, and an outlined phase numeral rises into the corner.
  - A sticky rail lists the phases, marks the current one, and has a spine that fills with scroll. The current phase is measured on scroll against a line 40% down the view, so tracking holds at any window shape.
  - A stage line marks where the DLC starts.

  Phases use 01–08 so they never read as tiers (which use I–V). *(My call.)*
- **Ledger** (`RichesLedger.svelte`, the branch's own plate section): what it pays in, its cycle, each figure and each cost with its basis and publisher, *Raised by* (the multipliers that stack on it) and *Raises* (the methods that name it in their `stacks`), both linked, and *Watch out* (nerfs, bugs, losses, unconfirmed figures).
- **Ambient motion.** Riches plates float gold dust (slow motes that flash as they turn) instead of land embers. It is a new `gold` mode in `Particles.svelte`, chosen per class through `ClassDef.ambient`.
- **Branch switches.** App keys the ladder and the route by branch, so their selections never carry one branch's metric into another. The remembered list (`app.ctx`) is reused only if it names a list in the current branch (`ctxIn`). Leaf ids may not be `ladder`, `route` or start with `for-`.
- **Core stayed generic.** Everything Riches needed from the shared UI is branch data now: `plural`, `labels` (lens folder, How/Where eyebrows, outline label, roam text, class axis), `rules` (the tier sheet's rules), `ladderNote`, `accent`, class `glyph` and `ambient`, and `route`. The tier sheet, hover cards and the footer's as-of line follow the branch you are in. A capture can be `menu` ("In-game screen") for UI screenshots, so a dispatch screen is never labelled "On site".
- **Gaps (R2).** All 18 facilities by name, location and staff skill. Island upgrade tiers and island income, which no source documents yet. A trade-route table from the in-game Trade tab.

## Known gaps

Left out for lack of reliable data or real imagery:
- **Scout Automation** and **Golden Star Mech**: reported by one outlet (Destructoid, March 2026), absent from Game8's and Fextralife's mount lists, and Destructoid's own Golden Star unlock never appeared. No game imagery found. Add when a second source confirms them.
- **Cows/bulls**: confirmed by Game8, but no hostable in-game capture was found. They are now part of M2 (NF-09) and go in Fleeting once imagery exists. The Delesyia Train is out: it is not a personal mount (Revision 3).
- Soldier and race horses (temporary). Several common sea mounts have no documented fixed spawn; their plates say so.

## Build and release

- **Self-contained.** Fonts ship with the site: Latin variable subsets of Bodoni Moda (opsz, wght, roman and italic), Archivo (wdth, wght) and JetBrains Mono, all OFL, through Fontsource. They load relative to the bundle, so the release renders the same offline and from `file://`, and the app makes no request off its own origin. Only the axes and styles the UI uses are shipped (230 kB).
- **Landmarks.** The explorer is a `nav`. The index and plate (or the ladder) sit in `main`, which is a real grid item with its own `index plate` columns. It doesn't use `display: contents`, which some browser and screen-reader pairs drop from the accessibility tree.
- **One classic script.** The build is a single deferred IIFE bundle with its CSS inlined, not an ES module. Module scripts are blocked on `file://`, so this lets `dist/index.html` open straight from disk as well as from any static host or sub-path (`base: './'`).
- **Releases.** One action ships a release: run the **Release** workflow (Actions → Release → Run workflow; leave the tag blank to release the `package.json` version) or push a `v*` tag. A typed tag is cleaned first (spaces and trailing dots dropped, a missing `v` added). The job checks the tag against `package.json`, type-checks, builds, zips the site as `crimson-compendium-<tag>.zip`, and creates the GitHub release with notes from `docs/releases/<tag>.md` (falling back to that version's `CHANGELOG.md` section). CI (`ci.yml`) runs the same type check and `npm run verify` on every push to `main` and on pull requests. Versions follow SemVer.
- **Verification.** `npm run verify` builds the site, serves it with missing files returning 404, and checks it in headless Chromium. It exits non-zero on any failure, and its expectations come from the data, not from fixed numbers. The checks:
  - data lint (`tools/lint.mjs`);
  - every entry plate (title, at least one image, every image served as an image, the explorer row it selects);
  - every leaf, category, category leaf and lens (title, member count, a cover that loads, explorer row), redirects and the ladder;
  - every branch route: the branch root opens it, every phase renders, every step links its plate, every cover loads, the explorer selects it, and the rail marks the phase it jumps to;
  - explorer keys, type navigation, filter, recent and outline, plus J/K stepping while keeping the list context;
  - the phone drawer;
  - axe-core on the first branch's four views, plus each further branch's route (desktop and phone) and one of its plates. Serious and critical findings fail. Every pane is scrolled through first so all sections have revealed, since sections at opacity 0 are invisible to axe;
  - that no request leaves the site's origin, and that `file://` with the network cut loads all four font faces.
  In CI it drives the runner's own Google Chrome (`CHROME_PATH`), because Playwright's bundled browser didn't yet support the Ubuntu 26.04 runner image when M1 shipped. It installs Playwright's Chromium only when the image has no Chrome.
  Hash routes trip axe's `skip-link` rule because they look like same-page anchors. That one is accepted (IDENTIFIED QOL-03).
