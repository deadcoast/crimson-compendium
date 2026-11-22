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

**Matrix** (core, MT1): a branch can carry a `matrix.json`, a grid of rows against places with one mark per cell, over one or more sheets, at `#<branch>-<matrix id>`. The marks, columns and sheets are data; `Matrix.svelte` draws any of them, and `Mark.svelte` draws one mark the same everywhere. A branch opens on its route or its matrix: `front` in `branch.json` names which, else the route wins (`tree.ts` `frontOf`). The registry refuses a cell in a column its sheet doesn't show, a mark the legend doesn't explain, a column naming a plate that doesn't exist, and a `front` without its view.

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

Tree order under a branch: its front view first (a matrix or a route; the other view follows it), then the original rarity leaves (unchanged), then the category branches, then **Ride for**, then the Tier ladder. Every list folder also holds its mounts as rows with portrait icons, so the explorer alone reaches every page.

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

- **Revision 5: M3 Where, for every mount** (2026-11-19):
  - *Banner rule* *(my call)*: a hero must be an in-game shot in which the mount itself is visible and named by the publishing article (its title, caption or alt text), at least 1,200 px wide. Stat panels and watermarks are clipped off (`clip`): Rokade's register panel, PowerPyx's mark on the A.T.A.G. A plate with no such shot keeps the framed portrait (`Hero.svelte`). 10 plates gained one: Royler, Rokade, Wyvern (PC Gamer), Lion, Red-Feathered Raptor (GamesRadar+), Giant Green Iguana, Cloudcart (Gfinity), Brown Bear (Beebom), Large White Wolf (GamesHedge), A.T.A.G. (PowerPyx).
  - *Map rule:* a map must mark the place the plate's Where line names, from the source that names it. 29 plates gained one; 28 are still without (Known gaps), down from 57.
    - Legendary ships: every blueprint spot on Game8's maps, each followed by its on-site view. Game8 ships map and view in one image, so each half is clipped into its own capture.
    - Sea mounts: Sportskeeda's composites put creator footage on the left and a map with the spawn zone on the right. The right half is the map; the left half, where it shows the named creature, is an In action capture. The turtle map is cut per species: Shipwreck Shore for Green, Hawksbill and Loggerhead; the Great Hydrothermal Vents for Olive Ridley and Hydrothermal. Sportskeeda marks one zone for all manta-type rays, so the Giant Manta Ray's caption says it is the group's zone, not its own spot.
    - Vellua (GamesHorizon) for the ships Hopkins sells and the ones built there; Emberwind Workshop for the Cloudcruiser and Skystreaker; Timberturner Wainwright for the Freight and Trading Wagons; Fort Windridge and Wyvern's Cradle for the Wyvern; the Sanctum of Penitence for the Brown Bear (Game8, PC Gamer).
    - Captures run map first, then on-site, then the plate's older shop or action shots.
  - *Facts the new sources settled* (Sportskeeda's section text): Electric Rays spawn in the Trench and the Great Trench. Eagle Rays share the manta zone (the Dead Coral Sea or the Great Coral Reef). Sunfish are sure at the Silent Serpent Shrine Cave by the Phragma Islands. Hammerheads and Orcas also swim the Central Waters. The Giant Manta Ray's place is narrowed to the manta zone. Those plates no longer say "no fixed spawn".
  - *Checked and left out:* GamesRadar+'s white tiger shot. Its own text says legendary animals other than horses still can't be tamed, and the shot shows Kliff climbing it in combat. PC Gamer's white goat is not the Ibex. The striped-sail ships in Pearl Abyss's Steam shots and in guides were not used: sails are customisable, so the model can't be told. Also unused: PC Gamer's tamed-Camora shot (dark, half covered by the register panel) and its covered wagon (no caption says which wagon). TH.GL stays off-limits.

- **Revision 6: Inventory, for every mount** (2026-11-21). You asked why no plate said what a mount carries. Every Mounts plate now has an **Inventory** section (`MountKit.svelte`) after Record:
  - *Carries*: the trade-goods slots or hold as a figure, with the rules beside it. A horse holds one slot of packed trade goods and nothing else; Elantrima and Rokade hold two; Royler and Camora one. A slot stacks 10 or 100 packaged goods by price, or 5 or 50 unpackaged (1.16). Calling a loaded horse drops part of the load (one player's 150 salt arrived as 55). A ship's hold is its recorded Inventory stat. Wagons are ranked Smallest, Middle, Largest because no source publishes a slot count. Every other mount reads "None documented": no guide or patch note puts cargo on it.
  - *Equipment*: one numbered card per slot. Horses: Saddle, Stirrups, Horseshoes, Champron and Barding, each with what it raises, the early pieces and the best piece. Special mounts: the one Special Mount Armor slot (1.06) and the saddles that fit it, with the saddler who sells each. Blackstar: the Abyssal Dragon Armor. A.T.A.G.: weapons, plating, boots, thrusterpack, module and the DLC marine set. Wagons: the barding the horse wears. Ships: sail, cannons, bow cannon, figurehead, stern and transporter, with outfitter prices; the Assault Ship's turtle hull and the Phantom Ship's six slots have their own layouts.
  - *Where to get it*, *Feeding and healing* (horses), notes, the menu path, and the section's own source line.
  - *Data*: one profile per gear system in `src/branches/mounts/kits.json` (21 profiles). A plate names its profile in `kit`, or `{profile, carry, carryLabel, note}` where it differs (Elantrima, Rokade, the wagons, the legendary ships). The lint requires a kit on every Mounts plate, a known profile, a publisher on every line and slot, a reason on every profile without slots, and no unused profile.
  - *Stats filled while auditing*: Health for the eleven sea mounts and the Ocean Drifter from crimsondesert.gg's mount list; Health and Stamina for the iguanas, raptor, Rosehorn Deer, Leaping Kuku Bird and Sandwalk Camel, and Health for the A.T.A.G., Pywel Wagon and Cloudcart, from GamingBolt. crimsondesert.gg prints two unlabelled numbers per card; the first matches every Health already recorded, so it is read as Health *(my inference)*. The new Stamina figures moved those plates' Stamina ratings onto the beast scale (300 → II, 100 → V). 79 of 80 plates have stats; the common boar has none published.
  - *Cargo lens* now holds Rokade beside Elantrima, the wagons and the 36-slot ships.
  - *Riches links*: Trade Wagons, Royal Trading Posts, the Small Greymane Ship and Fleetmaster Ships name the Mounts plates they are about (`also`), so each wagon and ship plate shows where it earns.

## Riches tree — decisions

You asked for Riches on 2026-11-19: an endgame economy guide for a player who has **finished the main story but not started Charting the Unknown**. Its job is to have the player arrive at the DLC rich, then turn the DLC's systems (real estate, ships, islands) into more money. It covers management mechanics and direct player control. The research, with sources, is in `docs/RICHES-RESEARCH.md`. R1 shipped it with 24 methods.

- **Where it sits.** Riches is its own root in the explorer, next to Mounts (`#riches…`), and is built from the same source as Mounts with no forked UI. You called it a TREE; in the code it is the second `branch` module, and its sub-branches are leaves. *(My call.)*
- **The Route is the front door.** `#riches` opens the Route, not the first leaf: the plan is what a reader comes for, and the catalogue sits behind it. Any branch with a `route` opens this way; Mounts has none and still opens on its first leaf. *(My call.)*
- **Two axes, as you framed them.** Every method is either *Management* (`cls: management`: it runs through camp, staff or assets) or *Player Control* (`cls: player`: Kliff does it by hand). Both are category lists. Three more lists sit beside them:
  - *When*: Before the DLC and In the DLC.
  - *Multipliers*: methods that pay nothing alone and raise every other payout.
  - *Can Lose Money*: methods where what you put in can come back smaller (lost cargo, daily upkeep, High-risk interest, bounty, buy-ins). It replaced the planned *Traps* list. The one candidate trap, the 2.01 Gold Bar Investment dispatch, has no documented cost or payout behind a retrievable source, so the route skips it and the Bank plate says why.
- **Potential: a three-tier list of earning power** (you asked on 2026-11-19 for a money list like Legendary, Rare and Stable, but not the same). It is the first category list. It ranks across both classes, where Return ranks within one, and puts every method in exactly one tier. The registry refuses a method in no tier or in two (`CategoryDef.tierList`). The plate's hero shows the tier first, as a chip that links to its list.
  - **Fortune** (gold): pays Gold Bars, or a Gold Bar's worth (500 Silver) or more per payout. Bank Investment, Gold Bar Crafting, Noble Pickpocketing, Crude Gold Circuit.
  - **Income** (bone): pays money, but less than a Gold Bar's worth per payout. Estate Security, Excavation Dispatches, Timberham Sawmill, Facility Leases, Trade Wagons, Royal Trading Posts, the card tables.
  - **Groundwork** (brass): no money of its own on record. It multiplies, converts, houses or unlocks what pays: the multipliers, supply dispatches, Grey-0 workers, castles, ships and crew, islands, Pailune, donations and the clock.
  - *Counting* *(my call)*: the figure is the one in the method's Return basis, taken at the low end of a range. A figure that a later patch is known to have cut doesn't count. So the card tables (400–600 Silver per winning session) are Income. Facility Leases are Income too: their million-a-day report predates the 2.04.02 earnings fix, and the post-fix sawmill figures are far below a bar a day. Their Return II rests on the same pre-fix report and is queued for re-rating in M4.
  - *Names and colours* *(my call)*: gold, silver-white and brass follow the coin ladder (Gold Bar, Silver, copper) that the currency notes below use. Every Fortune method pays in Silver or bars, which is the Route's thesis.
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

## Quality of Life tree — decisions

You asked for QOL on 2026-11-20: a tree of guides to the mechanics that improve quality of life. Your examples were Royler as the travel priority, the top underwater mount, financial priorities, weapon and armour sets, ship upgrades, pioneering, and facility management and purchasing. You asked me to add the rest. Q1 shipped it with 39 upgrades. The research, with sources, is in `docs/QOL-RESEARCH.md`.

- **Where it sits.** A third root in the explorer (`#qol…`), built from the same source as Mounts and Riches: `src/branches/qol/`. The title is *Quality of Life*, the noun *Upgrade* *(my call)*. Its root accent is a new `--violet` (#ac8ef4, 7.5:1 on ink-0), the one hue no class, leaf or other root uses. Red keeps its jobs.
- **Leaves** (your domains, plus the ones research added):
  - Travel (land): Abyss Nexus Network, Royler, Blackstar, Flight, Thinker's Meadow Nexus, Axiom Force.
  - Underwater (sea): Ocean Drifter, Diving Suits, Propulsion Breathing Device, Forsaken Oath Plate.
  - Inventory (brass) *(research addition)*: Sturdy Gatherables Chest, Bags, Private Storage, Pets, Extra Large Bag, Kuku Cooler, Wardrobes and Collectibles, Inventory Screen Tools, Pet Sigils.
  - Gear (ember): Refinement Tokens, Extraction, Lost Gear Recovery, Cold Immunity, Heat Immunity, Movement Speed Gear.
  - Camp (bone) *(research addition)*: Resting, Auto-Repeat Dispatch, Camp Expansion, Pailune Camp.
  - Money (gold): Camp Donations, Gold Bar Crafting, Golden Beer, Bank Investment.
  - Facilities (royal): Facility Leases, Castles.
  - Ships & Pioneering (deck): Crew and Outfitting, Ship Teleportation Device, Island Pioneering, Large Hernandian Ship. You named ship upgrades and pioneering separately. They share one leaf because pioneering is how the ship teleporter is earned, and either alone held one or two plates *(my call)*.
  - Settings (sky) *(research addition)*: Map Markers and Filters, Difficulty, Display Toggles, Re-blockades, Fast Forward Speed, Camera and Controls, Readability and Comfort.
- **Q2: the 2.05.01 menu and the patch sweep** (2026-11-21):
  - *Menu paths follow your screenshot of game version 2.05.01*: the Others tab, then Settings → Gameplay holds Game Difficulty, Re-Blockade Frequency, the display switches, Fix Minimap Rotation, Fast Forward Speed, Display All Guides and Show Group Icon in Inventory. Patch notes call it Language & Gameplay; plates use the game's current names. The screenshot is kept at `tools/sources/settings-gameplay-2.05.01.webp` and `media.py` reads `"from": "local:<file>"` from there. A local source must be a bare file name that resolves, symlinks included, inside `tools/sources`; `media.py` refuses anything else and the lint flags it. Media runs hold a lock (`tools/.cache/media.lock`) and write each image and JSON file through a per-process temp file, so two runs never interleave. Cuts of it are the menu captures on Difficulty, Re-blockades, Display Toggles, Fast Forward Speed and Inventory Screen Tools, credited "In-game screenshot · v2.05.01". Figures read off it use the *screenshot* basis with the publisher `ingame`.
  - *Re-blockades* rebuilt from the 1.05.00 notes: Stable (none), Conflict (the default, intermittent), War (frequent); changes wait for planned re-blockades; they roll only on a loading screen; 1.08 widened them to bandit camps and ruins; 1.10 reworked them.
  - *Every patch from 1.00.02 to 2.05.01 swept* for convenience features. New plates: Fast Forward Speed (1.00.02, 1.03), Camera and Controls (1.00.03 shortcuts, 1.02 Movement Controls, 1.03 camera sliders, 1.04 remapping, 1.18 lock-on modes), Readability and Comfort (1.03 Minimum Font Size, 1.04 Colorblind, Photosensitive, Chromatic Aberration, subtitles), Inventory Screen Tools (1.04 tabs, 1.16 explosives, 2.05.01 examine), Pet Sigils (1.10, 1.13), Extraction (1.06), Lost Gear Recovery (1.11). Tap-to-sprint moved from Display Toggles to Camera and Controls, where the 1.02 notes file it.
  - *Facts corrected*: Pets registered rose from 30 to 100 (50 at camp) in 1.11, and pets fight with a Sigil of Valor; Bags now give the 240-slot carried cap; Map Markers gained the minimap lock, key and anvil icons, the 1.16 map filter, the 1.18 bell-revealed areas and 2.04's L3 map focus.
  - *Counts after Q2*: 46 upgrades; Priority 19 Essential, 18 Worthwhile, 9 Situational; 24 patched in; 15 built in.
  - Weapons: no weapon has a documented convenience effect, only combat stats, so none is listed. Armour sets are listed where they remove a penalty: Frostcursed and Kuku Ice for the cold, Scorchflame and Kuku Flame for the heat, Forsaken Oath for air, Blackwing and the tailors' boots for speed.
- **Two classes** *(my call)*: *Built-in* means settings, patch features and systems everyone has once they know about them. *Unlock* means things you earn, find, buy or build. A reader can filter for "what can I turn on now". Each class has its own glyph (sliders and a key).
- **Metrics**, with Tier I always the good end:
  - **Impact**: how much friction it removes where it applies.
  - **Reach**: how much of the game it touches. Tier I is every session, Tier IV is one region or activity, Tier V is one place or fight.
  - **Unlock**: what it takes to have it.

  Three metrics, not four: a fourth (cost apart from unlock) split one judgement in two *(my call)*. Ratings compare every upgrade against every other, not within a class. Tier names keep the brief's wording.
- **Priority: a three-tier list** (`CategoryDef.tierList`, the same mechanism as Riches' Potential). Nobody tags it. A new `CategoryDef.rule` names the metrics and two thresholds, the registry works out each plate's tier from its ratings, and verify works it out again on its own to check the counts. Re-rate a plate and it moves tier by itself *(my call)*:
  - **Essential** (violet): Impact II or better and Reach II or better.
  - **Worthwhile** (bone): everything between.
  - **Situational** (ash): Impact IV or worse, or Reach IV or worse.

  Unlock does not count. Priority says what an upgrade is worth, and Unlock says what it costs, so Blackstar (Chapter 11) and Golden Beer (Chapter 8) are still Essential. Q1 counts 18 Essential, 13 Worthwhile and 8 Situational. The Ocean Drifter is the top pick in Underwater but Situational overall: everything underwater rates Reach IV (one activity). A reader who dives should get it first; one who doesn't loses nothing.
- **Order inside a leaf**: Priority, then Impact, Reach and Unlock. Royler is the second Travel plate, behind only the Nexus network.
- **One home for every how-to** (core, `Entry.base`). A QOL plate about a Mounts or Riches plate names it, as in `"base": "mounts/royler"`. The registry fills every field it leaves out from that plate: kind, region, area, requirements, routes, location, notes, variants, media and since. It merges sources, its own first. Its own summary, trait, ratings, tags and remedy say why it is in QOL. So Royler's steps and images are written once, and a fix to the Mounts plate reaches QOL. 14 of the 39 plates use it. The registry refuses a base that does not exist, that points into its own branch, or that has a base of its own. The lint resolves bases the same way; `media.py` skips plates that take their media from a base.
- **Elsewhere in the compendium** (core, `Also.svelte`). Each plate lists the plates in other branches tied to it, both ways:
  - *Full plate*: the plate it is about.
  - *See also*: plates it names in `also`.
  - *Listed in*: plates elsewhere that take it as their base.
  - *Cited in*: plates elsewhere that name it in `also`.

  Each card leads with the other plate's image, names its branch in that branch's accent, and shows its tier-list chip (Potential, Priority). The Mounts plates for Royler, Blackstar and the Ocean Drifter now show their QOL listing.
- **Remedy** (`QolRemedy.svelte`, the branch's plate section). It shows:
  - *Before → After*: the friction, muted, against the fix in the leaf's accent.
  - The figures, with the Riches basis vocabulary (patch notes, guide, screenshot, player report, sum).
  - *Patch history*: the versions that shaped the mechanic, on a rail, each with its reporter. The lint checks the publisher on each step.
  - *Pairs with*: upgrades that stack with this one, linked both ways, with each one's Priority.
  - *Watch out*.
- **The Order** (`#qol`, the front door): ten phases from the first hour to the deep sea, by when the story makes each upgrade available, in six stages: Any time, Early story, Through the story, Late story, After the story, In the DLC *(my call)*. It reuses the Riches route view.
- **Lists**: Priority; Built-in and Unlocks (by leaf); When (Base Game, In the DLC); and Patched In, the 17 upgrades a returning player has not seen yet. Shortlists: Right Now (Unlock I), Everywhere (Reach I), Early Game (Unlock II or better).
- **Ambient motion**: a new `abyss` mode. Violet motes rise and pulse, and now and then a ring opens on the ground like a Nexus waking. Both QOL classes use it.
- **Media rule additions**: `media.py` takes `"frame": n` to pick a frame of an animated source. Skill portraits are Game8's in-game skill icons cropped inside their frame, so the Game8 salmon ring stays out.
- **Calls a reader should know about**:
  - *Thinker's Meadow Nexus* is Worthwhile, not Essential. Epic's write-up says the Greymane Camp has its own Nexus, so how much the repair saves depends on which points you hold.
  - *Difficulty*: "a boss beaten on Easy paid the same reward" rests on one documented case (The Games Wiki, Mazzul's Golden Beer), and the plate says so.
  - *Propulsion Breathing Device*: the English name follows Vulkk's database. PlayNews, which is machine-translated, gives two upgrade recipes; the plate uses Vulkk's.
  - *Camp Expansion* lists the first tier at "250 silver" as KeenGamer writes it. The unit may be camp funds.

## Materials tree — decisions

You asked for Materials on 2026-11-21: a tree that speeds up the game's cluttered item screens, with three branches fixed by you: **House Storage**, **Ship Storage** and **Mount Storage**. Everything inside them was mine to design. MT1 shipped it with 20 plates and the Sorter. The research, with sources, is in `docs/MATERIALS-RESEARCH.md`.

- **What makes items convoluted** (from the research, not your brief). Thirteen places hold items, and each takes different families. Different mechanics read different places: the Smithy reads the 1.04 Gatherables Chest, cooking reads the Kuku Cooler, the camp's missions and ship builds read only Carl's donated stock, and nothing reads Private Storage. Stacks run from 1 to 100, so an insect or a fish fills a slot on its own. Patches move items between classes (1.16 made mushrooms alchemy materials). A plate per chest can't answer "where does this go?", so the tree opens on a grid that can.
- **Where it sits.** A fourth root (`#materials…`), `src/branches/materials/`. The noun is *Manifest* *(my call)*. Its accent is a new `--moss` (#a3c46c, 10.2:1 on ink-0), the one green no class, leaf or root uses. Leaves keep accents already meaning the same thing: House brass (the Inventory leaf's), Ship deck (ships), Mount land.
- **The front door is the Sorter, not a route** *(my call)*. `#materials` opens a matrix of item families against every place that holds items, on two sheets:
  - *Where it goes*: 30 item families against 12 places, with 339 items and item types named. Names and stack sizes follow Gamer Guides' database where it lists them.
  - *What reads it*: 12 mechanics (crafting, cooking, alchemy, Kuku crafting, camp builds, packing, selling, feeding, outfits, quests) against the same places plus your bag.
  - *Marks*, each a shape, so they read apart without colour: ◆ Home (built for it, and read there), ↘ Read here, ○ Fits, ▲ Donate (one-way into the camp's stock), ▼ Arrives (receive-only: the Supply Chest), dashed ○ Reported (one source, unconfirmed), ✕ Refused. A blank cell means no source puts it there; the plates never infer one.
  - *Use*: the column heads are the plates (portrait, name, slots) and stay pinned with the toolbar; the row heads stay pinned left. Hover or arrow keys draw a crosshair, and a readout pinned to the bottom says what the cell means, why, who says so, the row's items by name, and links the plate. Click pins it. A search finds the family an item belongs to and answers in one card (*Fruit Fly → Insects ×1: Fits Private Storage, Donate Camp stock, Arrives Supply Chest, Reported Gatherables Chest*). The command palette now knows every item, so `/`, "azurite" and picking the item opens the Sorter on that answer. On a phone the grid becomes one card per family.
- **The Set-up Order** (`#materials-route`): six phases by when the story opens each store, from the first chest (Chapters I–II) to holds and islands (the DLC), each naming what to move in the moment it opens. It reuses the route view.
- **No categories or lenses** *(my call)*. With 20 plates the Sorter does the cross-cutting job a category would, and the explorer stays short: The Sorter, Set-up Order, three leaves, Tier ladder.
- **Plates.** House Storage (8): Sturdy Gatherables Chest, Kuku Cooler, Private Storage, Wardrobe, Collectibles Chest, Kuku Pot, Camp Provisions, Supply Chest. Ship Storage (7): Ship Holds, Shipbuilding Stock, Ship Fittings, Sea Blueprints, Ocean Materials, Ship Teleportation Device, Island Storage. Mount Storage (5): Horse Trade Slots, Wagon Cargo, Horse Feed, Horse Tack Materials, Kuku Mount Gear. Six take their how-to from a QOL, Riches or Mounts plate through `base`, so nothing is written twice.
- **Two classes** *(my call)*: *Storage* (chest glyph) holds items; *Supplies* (crate glyph) are what storage and builds consume. Both use a new `sift` ambient mode: grains fall in thin streams and settle, now and then catching moss light.
- **Metrics**, Tier I the good end, ranked across the whole tree:
  - **Capacity**: slots at the most it can reach. I is 1,000 or more, II 240–999, III 50–239, IV 10–49, V under 10. Not rated for supplies, or where no source publishes a size (Camp Provisions, wagons, Island Storage).
  - **Payoff**: what it does beyond holding. Read in place by a mechanic is I; plain storage is III.
  - **Unlock**: what it takes to have it.
- **Manifest** (`MaterialsManifest.svelte`). A store's shelves and its *Read in place by* list are read off the Sorter's own rows, not written per plate, so the plate and the grid can't disagree. A plate shows:
  - capacity, with its basis, beside what reads the store in place (and what a source says doesn't);
  - *What goes in*: shelves by mark, each family with its stack (×1 in ember, every one a slot) and every item by name, with a filter;
  - *Doesn't go here — goes to*: every other family grouped by the place built for it, or where it fits when nothing is;
  - for a supply, its families and every place that keeps them;
  - *Each one's hold*: Mounts plates grouped by hold size, read from the Mounts data (ships 6–36, horses 1–2, five ships unpublished);
  - bills of materials, figures with the Riches basis vocabulary, tips, the patch rail and Watch out.
- **Calls a reader should know about**:
  - *Castaway's Shelter* follows the in-game banner on Game8's capture; Gaming Deputy calls it Castaways' Refuge.
  - *Wells Military* tack follows the in-game crafting screen; guides call it Wells's Warhorse Tack.
  - *Ship part names* follow gaming.tools and Vulkk; stats and prices follow Gaming Deputy. Its *Tide-Marked* sail is read as the Tidesworn Sail (same seller, same prices) *(my reading)*.
  - *Basic Kuku Cooler*: 40 slots (1.04 notes, KeenGamer, Vulkk's database), not the 50 in Vulkk's guide.
  - *Camp resources* use KeenGamer's names (Armaments, Stone, Timber, Food, Silver); All Things How's are noted on the plate.
  - *Shipbuilding reads Carl's stock*, as its own panel shows. A non-games site's claim that it reads Private Storage was not used.
  - The Wells Military Stirrups recipe was read off Gaming ProMax's in-game screenshot (basis: screenshot).
- **Core changes MT1 made**: the generic matrix view, `front`, a `grid` explorer row, `Mark.svelte`, palette item search, list keys by branch and entry (two branches now share plate ids, as `private-storage`), the lint's matrix checks and its rule that any credited payload line names a known publisher, and verify's matrix, front-door and phone-card checks, run in the registry's branch order.

## Known gaps

Left out for lack of reliable data or real imagery:

- **Scout Automation** and **Golden Star Mech**: reported by one outlet (Destructoid, March 2026), absent from Game8's and Fextralife's mount lists, and Destructoid's own Golden Star unlock never appeared. No game imagery found. Add when a second source confirms them.
- **Cows/bulls, race horses and other temporary rides**: out by Revision 4, since the player cannot keep them. The Delesyia Train is out: it is not a personal mount (Revision 3).
- **Spawns no guide pins**: the Grizzly Bear (forests and mountains). The Giant Manta Ray is narrowed to Sportskeeda's manta-ray zone, but TH.GL's single spawn is still unnamed. Their plates say so.
- **Rowboat portraits** are cropped from Game8's 728 × 410 shop screenshots, where the boat is small, so they are soft. M3 searched again; no larger in-game image of a rowboat was found.
- **Plates without a map (28)**, by reason:
  - *No single place to mark:* Blackstar (story unlock), the five stable breeds (wild herds anywhere and stable stock), the soldiers' and scouts' horses (any road), the Large Wolf (wilds across Pywel), and the Medium and Large Greymane Ships (built at any port).
  - *No published static map of the named place:* Clawed Bear (Black Bear forts, Pailune), Grizzly Bear, Swift Wolf (Howlsands Camp), Rosehorn Deer (Mistwood Hunters' patrols), Ibex (Pailune mountains), Savage Fang Boar (Savage Fang raiders), the A.T.A.G. (Zargan Tankworks), the High-Mobility A.T.A.G. (Sanctum of Exaltation), and the ships and rowboats sold at Port Delesyia, Port Demeniss and Stoneward Harbor (9 plates). TH.GL marks these, but its data is off-limits.
- **Plates without a banner (58)** keep the framed portrait. None has a wide, identified in-game shot under the Revision 5 rule:
  - *Ships (20):* guides show ships with custom sails and never name the model.
  - *Sea mounts (14):* no wide, named shot. Where Sportskeeda's 960 px half-frames show the creature, they are In action captures instead.
  - *Horses (8):* Camora, the five breeds and the two road horses; no guide names the breed of the horse in its shots.
  - *Other land and sky mounts (16):* only sub-1,200 px or unnamed shots exist (consolepulse's 960 px Leaping Kuku Bird, Game8's 728 px views).
- **Hold sizes not published**: the Large Greymane Ship and the four legendary ships. Their records show Health only and their Inventory sections say so.
- **Mount inventory facts no source pins** (each plate's Inventory section says so):
  - *Wagon slot counts.* No guide or patch note gives one, and The Games Wiki's two wagon pages disagree on whether the Freight or the Trading Wagon holds more. The tree follows the Timberturner mission order and the comrade cost.
  - *2.04 wagon equipment and the port wainwright's stock*: the patch notes add both and name neither.
  - *Saddles without item names*: the deer and warthog saddles (ConsolePulse lists them by saddlery only).
  - *No saddle documented* for the lion, tiger, raptor and common boar, and *no gear or cargo documented* for the sea mounts, the Ocean Drifter and the balloons.
  - *The Flagship of the East's and the Drunken Catfish's slot layouts*; Game8 reports the Catfish's figurehead and stern slots blank and its new sails refusing to equip.
  - *Conflicting horse-gear sources*: one Games Wiki page swaps the Stirrups and Horseshoes effects; the plates follow ConsolePulse and the wiki's item table.
  - *Stamina from one source*: the iguanas, raptor, Rosehorn Deer, Kuku Bird and camel take Stamina from GamingBolt alone, and GamingBolt's Ibex (250) disagrees with crimsondesert.gg's (200). The Leaping Kuku Bird's Health is 400 (GamingBolt) or 300 (crimsondesert.gg); its plate notes both.
- **Common boar stats**: no source publishes them.
- **QOL plates without a banner**: Kuku Cooler and Axiom Force (every wide shot is a menu or a split cutscene) and Movement Speed Gear (only item icons). They keep the framed portrait.
- **Materials facts no source pins** (the plates and the Sorter say so): wagon slot counts; Island Storage's size and how it opens (Vulkk's database is the only source); the Medium and Large shipbuilding costs; the Wells Military pieces other than the Stirrups and Barding; whether alchemy, the Workstation or a quest reads a house chest; what the Gatherables Chest refuses (cloth, reagents, insects, mushrooms and sea materials show as Reported); whether the cooler still takes mushrooms after 1.16; the Private Storage tabs promised in 1.04.
- **QOL facts no source pins**: the unit of the first camp expansion's 250 cost; the full list of islands past Auronui and what each anchorage sells; what Display All Guides changes and which patch added the accessories switches (both named only by the 2.05.01 menu); the Extraction fee (XboxPlay says Silver, Vulkk says none).

## Build and release

- **Self-contained.** Fonts ship with the site: Latin variable subsets of Bodoni Moda (opsz, wght, roman and italic), Archivo (wdth, wght) and JetBrains Mono, all OFL, through Fontsource. They load relative to the bundle, so the release renders the same offline and from `file://`, and the app makes no request off its own origin. Only the axes and styles the UI uses are shipped (230 kB).
- **Landmarks.** The explorer is a `nav`. The index and plate (or the ladder) sit in `main`, which is a real grid item with its own `index plate` columns. It doesn't use `display: contents`, which some browser and screen-reader pairs drop from the accessibility tree.
- **One classic script.** The build is a single deferred IIFE bundle with its CSS inlined, not an ES module. Module scripts are blocked on `file://`, so this lets `dist/index.html` open straight from disk as well as from any static host or sub-path (`base: './'`).
- **Releases.** One action ships a release: run the **Release** workflow (Actions → Release → Run workflow; leave the tag blank to release the `package.json` version) or push a `v*` tag. A typed tag is cleaned first (spaces and trailing dots dropped, a missing `v` added). The job checks the tag against `package.json`, type-checks, builds, zips the site as `crimson-compendium-<tag>.zip`, and creates the GitHub release with notes from `docs/releases/<tag>.md` (falling back to that version's `CHANGELOG.md` section). CI (`ci.yml`) runs the same type check and `npm run verify` on every push to `main` and on pull requests. Versions follow SemVer.
- **Verification.** `npm run verify` builds the site, serves it with missing files returning 404, and checks it in headless Chromium. It exits non-zero on any failure, and its expectations come from the data, not from fixed numbers. The checks:
  - data lint (`tools/lint.mjs`);
  - every entry plate (title, at least one image, every image served as an image, the explorer row it selects);
  - every leaf, category, category leaf and lens (title, member count, a cover that loads, explorer row), redirects and the ladder;
  - every branch route: every phase renders, every step links its plate, every cover loads, the explorer selects it, and the rail marks the phase it jumps to; the branch root opens its front view, route or matrix;
  - every matrix: each sheet shows its rows, columns and exactly its marks; column portraits load; hovering a cell explains it; a search names the row an item belongs to; an item picked in the palette opens the matrix on it; on a phone it becomes one card per row with no sideways scroll;
  - explorer keys, type navigation, filter, recent and outline, plus J/K stepping while keeping the list context;
  - the phone drawer;
  - axe-core on the first branch's four views, plus each further branch's route and matrix (desktop and phone) and one of its plates. Serious and critical findings fail. Every pane is scrolled through first so all sections have revealed, since sections at opacity 0 are invisible to axe;
  - that no request leaves the site's origin, and that `file://` with the network cut loads all four font faces.
  In CI it drives the runner's own Google Chrome (`CHROME_PATH`), because Playwright's bundled browser didn't yet support the Ubuntu 26.04 runner image when M1 shipped. It installs Playwright's Chromium only when the image has no Chrome.
  Hash routes trip axe's `skip-link` rule because they look like same-page anchors. That one is accepted (IDENTIFIED QOL-03).
