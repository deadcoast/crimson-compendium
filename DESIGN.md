# Design record

The global design for the Crimson Compendium. Every branch builds on this; decisions made while building a branch are written back here.

## Purpose — why anyone opens this instead of a wiki

Existing guides (Game8, Fextralife, GameRant) spread one mount across a long article, show the map capture at thumbnail size, and never compare mounts against each other. The compendium answers three questions in one place, each one click deep:

| Question | Answer in the app |
| --- | --- |
| Where is it? | **Where**: the in-game map capture and on-site capture, full width, with a loupe for map labels and a zoomable lightbox. |
| How do I get it? | **How**: requirement chips, numbered steps, alternate routes, field notes. |
| Is it worth it? | **Seals** on every plate and the **Tier Ladder** ranking everything per metric. |

Plus play-style navigation: **category branches** (Land, Underwater, Flying, Mechanical, Easter Eggs, DLC) for the kind of session you are about to play, **Ride for** lenses (All Around Best, Battle, Cliffs & drops, Cargo) for the job at hand, `/` search across names, traits, places and branches, and keyboard stepping (`J`/`K`, `←`/`→`, `L`).

## Consumption model — reader, not dashboard

Three columns on desktop: **Explorer** (the tree) · **Index** (the leaf, category or lens) · **Plate** (one entry, read top to bottom). No KPI tiles, no chart panels. Numbers appear as typography (Bodoni numerals, roman tiers, pip rows) inside an editorial plate. Phones get the same model as a stack: list → plate, with the tree in a drawer.

## Visual language

- **Palette**: warm ink blacks, bone text, one signal colour (crimson). Red is reserved for the root (brand, the Mounts branch, Tier I, Ride for, the ladder); the Riches root is gold (`--gold`). Text a reader needs (meta lines, counts, hints, credits, placeholders) uses `--ash` or brighter, which measures at least 4.5:1 on every ink surface (WCAG AA). `--ash-2` is for ornaments only: separators, diamonds and not-rated numerals. Leaves carry a traditional tier accent: Legendary orange (`--ember`), Rare royal blue (`--royal`), Stable bone, Engineered brass; Easter Eggs and its leaves are cyan (`--cyan`), as specified in `docs/spec/tier-colors.txt`. Terrain classes take their colours from the in-game map (ochre land, map-water teal, pale sky); Surface, the ships' class, is verdigris (`--deck`). All tokens live in `src/styles/tokens.css`.
- **Type**: Bodoni Moda for names, numerals and section titles; Archivo (variable width) for UI, condensed and tracked for eyebrow labels; JetBrains Mono for counts and credits. Large Bodoni numerals use a low optical size (`opsz 8`) so the hairline in the 4 stays visible.
- **Imagery**: only real in-game captures and in-game knowledge-entry art, each credited to the guide that took it. Portraits are square and shown round everywhere (index, ladder, search) so mixed sources read as one set.
- **Edges**: a column's background ends at its border line; nothing spills past a frame.

## Motion system

Motion is a reveal language, not decoration. Easing `cubic-bezier(.16,1,.3,1)`.

| Element | Motion |
| --- | --- |
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
| --- | --- | --- |
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

1. **Class = terrain.** Each mount is ranked against its own class (Land, Sea, Sky, Surface). A Tier I sea mount is the best swimmer, not the best mount overall; a Tier I ship is the best ship.
2. **Horses are rated at Lv 5**, their max level; beasts and machines arrive at full strength.
3. **Trait overrides** follow the brief's caveat: no fall damage lifts Travel (Leaping Kuku Bird), a unique attack lifts Combat (Pink Manta Ray's shockwave).
4. **Every rating stores its basis**, shown when you tap a seal. Where no source compares a mount, it sits at III and says so.
5. **"Not rated"** for metrics that do not apply (Stamina on a balloon, mech, wagon or ship).

## Mounts branch — decisions

- **Leaves.** The brief named Legendary and Rare. Two more were needed to place every mount without bending those definitions: **Stable** (horses that register at a stable: the five buyable breeds plus the soldiers' and scouts' horses) and **Engineered** (built or bought: balloons, mechs, wagons, ships). Rare keeps the brief's definition: not sold at stables, can be made permanent. A third extra leaf, Fleeting, held temporary rides until Revision 4 removed them.
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

- **Revision 4: permanent mounts only; M2 built** (2026-11-19):
  - *Only mounts you can keep.* Your rule: a mount the player cannot keep or tame permanently is out of the guide. The Fleeting leaf is gone with its three plates: the Kuku Bird Hatchling (it grows into the Leaping Kuku Bird, which stays), the wildlife-park elephant and Marni's Mechahorse. Old links redirect: `#mounts-kuku-bird-hatchling` to the Leaping Kuku Bird, `-elephant` to Land, `-marnis-mechahorse` to Mechanical, `-fleeting` to Rare. NF-09 (race horses, Captured Bear, Circus Lion, cattle, camels, the Worn Wagon and other temporary rides) is dropped, not built.
  - *Stable* also holds the Hernandian Soldier's Horse and the Calphadean Scout's Horse. You take them off the road and register them at a stable, and they share the Priden's level table (The Games Wiki). *(My call: they register like stable horses, so Stable rather than Rare.)*
  - *Surface* is a fourth class for ships: glyph a sail over a hull, ambient sea, colour verdigris (`--deck`, a hue no class or leaf used). Ships are ranked against ships only. *(My call.)*
  - *Ship ratings* *(my call)*: Speed from the in-game Movement Speed pips (5 → I … 1 → V); Travel from Movement, Acceleration and hold together; Combat from Health (14,000 I; 10,000–12,000 II; 7,500–9,200 III; 5,000 IV; rowboats V), because cannons are fitted parts any ship can swap; Stamina not rated. The record shows Health and Inventory, then Movement Speed, Acceleration and Handling as pips. Hairlines compare a ship only with ships (`stats.kind: "ship"`).
  - *Ship figures follow the in-game screens.* Each ship's portrait and record come from Game8's Buy Ship or Manage Ships screenshot. Where Game8's text disagrees with its own screenshot, the screenshot wins: the Phantom Ship has 9,200 Health (the text says 14,000). The Large Delesyian and Demenissian Ships cost 6,000,000 Camp Funds, as the in-game shop lists show; Game8's text says 60,000,000. Revision 3's "Humble Bark" is the Humble Rowboat in game.
  - *Ships category*, after Flying, split by rarity: 4 Legendary (built from blueprints) and 16 Engineered (3 Greymane ships your comrades build, 9 regional ships and 4 rowboats sold by Ship Managers). The Sturdy Tawny and Sand-Colored Rowboats each come in a second colour, recorded as variants.
  - *Sea turtles by species* (Revision 3's rule): Green, Hawksbill, Loggerhead, Olive Ridley and Hydrothermal, plus the Giant Manta Ray. `#mounts-sea-turtle` opens the Green Sea Turtle, which keeps Game8's action shot captioned as an unnamed species.
  - *Kept out after checking:* the Heavy Assault A.T.A.G. is borrowed from Gorthak hangars and no blueprint builds one (Gaming ProMax lists three craftable variants). The Race Horse and Black Bear have no source showing they can be kept; Game8's "Black Bear" is the Clawed Bear.
  - *Counts after M2:* 80 mounts: 48, plus 36 new plates, minus 3 temporary rides and the old Sea Turtle plate (now the Green Sea Turtle). DLC: 19 sea mounts, 20 ships and the A.T.A.G. refit. Flying: Blackstar, the Wyvern and three balloons. Mechanical: two mechs and three balloons. The Easter Eggs cover moved to the Leaping Kuku Bird.

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

  A method with no documented income (castles, islands, ships, Pailune) is not rated on Return. It does not get a default III. Multipliers are rated on what they add, in Silver: Golden Beer doubles dispatch payouts, but those are Camp Funds, so its Return is III.
- **Currencies.** *(Corrected after R1 shipped: the first version read the 2.01 rate as 1 Silver → 10 Camp Funds.)*
  - Copper → Silver (100:1) → Gold Bar (500 Silver at a bank; about 190 at a merchant).
  - Camp Funds are counted in copper. Before 2.01, one donated copper gave one Camp Fund (100 per Silver); patch 2.01 multiplied donated Silver by ten, so **one Silver now gives 1,000 Camp Funds** and a Gold Bar, exchanged and donated, gives 500,000. Sources: Vulkk (the ×10 and the old 1:1), All Things How (100 per Silver before 2.01), and the Camp-Funds-Withdraw mod, which inverts the game's own donation and states the current rate.
  - The Games Wiki's 50,000 Camp Funds per donated Gold Bar is the pre-2.01 copper value of 500 Silver. The Route says to exchange bars for Silver first and never donate a bar whole.
  - **Silver is the yardstick for Return.** Camp Funds count at 1,000 to the Silver, so methods that pay Camp Funds rate low next to the Silver earners (pickpocketing, Gold Bar crafting, the bank). Those Camp Funds methods are dispatch, facilities and wagon trading. Packaged trade goods are bought and sold in Camp Funds: Whisper of the House's write-up calls its sums Silver, but its screenshots show the Camp Funds icon, the same one a facility's earnings use. The DLC's Camp Funds prices fall to a few Gold Bars: the 6,000,000 Large Hernandian Ship is 6,000 Silver.
  - One Hernand Bond is 10 Gold Bars; Bonds need 10 (100 bars) to invest.
- **Every figure carries its basis.** The ledger labels each figure:
  - *Patch notes*.
  - *Guide*.
  - *Screenshot*: read off an in-game screenshot a guide published.
  - *Player report*: shown in ember italics as one player's result.
  - *Sum shown*: my arithmetic, with the sum printed, for example 84,450 × 1,000 = 84,450,000.

  When sources disagree, the plate shows both. Facility income is shown three ways: screenshot figures from a young sawmill (48,422 over 40 hours open; a 7-hour day earning 18,094 against 33,660 in wages and upkeep), the player-reported million a day, and NeonLights' note that patch 2.04.02 fixed inflated facility earnings.
- **The Route** (`#riches-route`) is a generic branch view (`BranchDef.route`). It is an ordered plan of phases. Each phase has a stage, a reason, a cover, steps that link to plates, and optional *meanwhile* loops (player-control work to do while timers run). It is the "targeted strategy" you asked for:
  1. Make Silver.
  2. Put the bars to work.
  3. Convert only what you spend.
  4. Arm the multipliers.
  5. Build the materials engine.
  6. Finish Pailune.
  7. Build the first ship, buy the big one.
  8. Lease, pioneer, build.

  The order follows the corrected exchange rate. Silver earners lead because one Silver buys 1,000 Camp Funds. Dispatch stays for the materials (food, stone, timber, weapons) that castles, shipbuilding and Grey-0 workers consume. Trading pays Camp Funds, so it runs alongside, never as a phase of its own.

  The ship call in phase 7 comes from the data. The quest-built Small Greymane Ship holds 14 slots, the same as the 40,000 Small Hernandian, so the Route skips that purchase. At the 2.01 donation rate the Large (36 slots, 6,000,000) costs 6,000 Silver, twelve Gold Bars, so the Route buys it outright and keeps the Medium as the fallback.
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
- **Cows/bulls, race horses and other temporary rides**: out by Revision 4, since the player cannot keep them. The Delesyia Train is out: it is not a personal mount (Revision 3).
- **Spawns no guide pins**: the Giant Manta Ray (TH.GL maps one spawn, unnamed), the Grizzly Bear (forests and mountains) and several common sea mounts. Their plates say so.
- **Rowboat portraits** are cropped from Game8's 728 × 410 shop screenshots, where the boat is small, so they are soft. No larger in-game image of a rowboat was found.
- **Large Greymane Ship hold size**: Game8 does not list it, so its record shows Health only.

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
