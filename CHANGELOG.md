# Changelog

All notable changes to the Crimson Compendium. Versions follow [Semantic Versioning](https://semver.org/); the format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- **Materials**, a fourth branch: where every item goes and what reads it, across 20 plates in House Storage, Ship Storage and Mount Storage.
  - **The Sorter** (`#materials`, the front door): 30 item families against 12 places that hold items, and 12 mechanics against the places they read. Seven shape-coded marks (Home, Read here, Fits, Donate, Arrives, Reported, Refused). Pinned column heads with each place's portrait and slots, a crosshair and a readout that explains any cell with its source, keyboard navigation, and an item search that answers where an item goes in one card. On a phone, one card per family.
  - **Search any item from the palette**: `/` now knows the 339 items and item types the Sorter names, and picking one opens the Sorter on it.
  - **The Set-up Order**: six phases, by when the story opens each store, with what to move in.
  - **Manifest** on every plate: capacity beside what reads the store in place; the shelves of what goes in, by mark, with every item by name and a filter; where everything else goes instead; hold sizes from the Mounts plates; bills of materials; figures with their basis; tips, patch history and what to watch out for.
  - Plates include the Wardrobe, Collectibles Chest, Kuku Pot, Camp Provisions and Supply Chest; ship holds, shipbuilding stock, both outfitters' parts, the four hidden sea blueprints, ocean materials and Island Storage; horse trade slots, wagon cargo, horse feed, the Wells Military tack and Kuku mount gear.
  - Ratings: Capacity, Payoff and Unlock, I–V. Classes Storage and Supplies. A moss root accent and falling-grain ambient motion.
  - Research notes with every source: `docs/MATERIALS-RESEARCH.md`.
- A generic **matrix view** for any branch (`matrix.json`), and `front` to choose whether a branch opens on its route or its matrix.

### Changed

- The lint checks a branch's matrix (marks explained, publishers known, items listed once) and that every credited line in a plate's payload names a known publisher.
- `npm run verify` checks every matrix (sheets, marks, portraits, search, readout, palette hand-off, phone cards) and runs branches in the registry's order.

### Fixed

- Lists keyed by plate id alone (search results, Recent, cross-links) broke when two branches shared an id; they now key by branch and plate.

## [0.3.0] — 2026-11-21

Two new trees, Riches and Quality of Life, the full roster of 80 mounts with what each carries and wears, and a regression gate behind every release.

### Added

- **Inventory on every mount plate**: what the mount carries and what it wears, after its Record.
  - *Carries*: trade-goods slots or hold as a figure, with the rules beside it. Horses hold one slot of packed trade goods (Elantrima and Rokade two); a slot stacks 10 or 100 packaged goods or 5 or 50 unpackaged; calling a loaded horse loses part of the load. Ships show their hold, wagons their rank by size. Mounts with no documented cargo say so.
  - *Equipment*: a card per slot. Horse tack's five slots with what each raises, the early pieces and the best (Delesyian Saddle, Four-Leaf Horseshoes 8 Attack, Delesyian or Hagmund Champron 15 Attack, Hagmund Barding 80 Defense); each species' saddle and the saddler who sells it; Blackstar's Abyssal Dragon Armor; the A.T.A.G.'s weapons, Mk I–III plating, boots and thrusterpacks and the marine set; wagon barding; ship sails, cannons, figureheads, sterns and the teleporter with outfitter prices.
  - *Where to get it*, *Feeding and healing* for horses, and the menu path.
  - Recorded stats for 23 more mounts: the sea mounts, Ocean Drifter, iguanas, raptor, Rosehorn Deer, Kuku Bird, camel, A.T.A.G., Pywel Wagon and Cloudcart. 79 of 80 now have a Record.
- The settings plates show the game's own 2.05.01 Gameplay menu (`tools/sources`, read by `media.py` as `local:`).
- **Quality of Life**, a third branch: 46 upgrades that take the friction out of Pywel. 39 shipped with the tree; a sweep of every patch through 2.05.01 added Fast Forward Speed, Camera and Controls, Readability and Comfort, Inventory Screen Tools, Pet Sigils, Extraction and Lost Gear Recovery.
  - Nine leaves: Travel, Underwater, Inventory, Gear, Camp, Money, Facilities, Ships & Pioneering, Settings.
  - Ratings: Impact, Reach and Unlock, I–V. The classes are *Built-in* (settings, patch features, systems) and *Unlock* (things you earn, find, buy or build).
  - **Priority**, a tier list worked out from the ratings: Essential, Worthwhile, Situational.
  - **The Order** (`#qol`): ten phases from the first hour to the deep sea.
  - **Remedy** on every plate: before and after, figures with their basis, the patch history on a rail, pairs, and what to watch out for.
  - Lists: Built-in, Unlocks, When and Patched In. Shortlists: Right Now, Everywhere and Early Game.
  - A violet root accent and abyss-light ambient motion.
  - Research notes with every source: `docs/QOL-RESEARCH.md`.
- **One home per how-to**: a plate can name a plate in another branch as its `base` and take its steps, places, images and sources from it, so Royler's how-to is written once for Mounts and QOL. The registry and the lint refuse a base or link that names no plate.
- **Elsewhere in the compendium** on every plate: the plates in other branches tied to it, both ways, each led by its image, with its branch, leaf and tier-list chip. Mounts' Royler, Blackstar and Ocean Drifter now show their QOL listing.
- `media.py` can pick a frame of an animated source (`"frame": n`).
- **Potential**, a three-tier list of earning power for Riches. Every method sits in exactly one tier across both classes: **Fortune** (pays Gold Bars, or 500 Silver or more per payout), **Income** (pays money, but less) or **Groundwork** (no money of its own; it multiplies, converts, houses or unlocks). Each plate shows its tier first, as a chip that links to the tier's list. A branch can now declare a category a tier list; the registry refuses a method placed in no tier or in two.
- **Where, for every mount (M3)**: 29 plates gained world maps and 10 gained full-bleed banners. Maps still missing went from 57 to 28 and banners from 68 to 58; every plate still without one is listed in `DESIGN.md` › Known gaps with its reason.
  - Legendary ships: every blueprint spot on a map, each followed by its on-site view.
  - Sea mounts: a spawn-zone map for all 14 that lacked one, plus In action footage of the Hammerhead, Orca, Spotted Seal, Eagle Ray, Electric Ray and Sunfish. The turtle map is cut per species.
  - Vellua for the ships sold or built there; Emberwind Workshop for the Cloudcruiser and Skystreaker; Timberturner Wainwright for the Freight and Trading Wagons; Fort Windridge and Wyvern's Cradle for the Wyvern; the Sanctum of Penitence for the Brown Bear.
  - Banners for Royler, Rokade, the Lion, Red-Feathered Raptor, Giant Green Iguana, Brown Bear, Large White Wolf, Wyvern, Cloudcart and A.T.A.G.
- **Full mount roster (M2)**: 80 mounts you can keep, up from 48: 36 new plates, minus the 3 temporary rides removed and the old Sea Turtle plate, which became the Green Sea Turtle. Each new plate has a real in-game image, its sources and rated tiers.
  - **Ships**, a new category and a fourth terrain class, Surface: the four legendary ships (Flagship of the East, Assault Ship of the East, Phantom Ship, The Drunken Catfish), the Small, Medium and Large Greymane Ships your comrades build, the Hernandian, Delesyian and Demenissian ships in three sizes, and four rowboats. Each plate shows the in-game shop or fleet screen, Health and hold, and Movement Speed, Acceleration and Handling.
  - Mounts that were hidden as variants now have their own plates: Cloudcruiser, Skystreaker, Swift Wolf, Large White Wolf and High-Mobility A.T.A.G.
  - Green, Hawksbill, Loggerhead, Olive Ridley and Hydrothermal sea turtles, the Giant Manta Ray, the Grizzly Bear, the Freight and Trading Wagons, and the Hernandian Soldier's and Calphadean Scout's Horses.

- **Riches**, a second branch: an endgame economy guide for a player who has finished the main story but not started *Charting the Unknown*.
  - 24 money methods across eight leaves (Greymanes, Trade, Bank, Pailune, Real Estate, Ships, Islands, Hustles), rated I–V on Return, Effort, Setup and Scale within Management or Player Control. Return is compared in Silver; Camp Funds count at 1,000 to the Silver, the donation rate since 2.01.
  - **The Route** (`#riches`, `#riches-route`): eight phases in order, image-led, with a rail that tracks your place and every step linked to its plate.
  - **Ledger** on every Riches plate: what it pays in, each figure and cost with its basis and publisher, the multipliers that raise it, what it raises, and what to watch out for.
  - Category branches Management, Player Control, When, Multipliers and Can Lose Money; Best for lenses; gold-dust ambient motion.
  - Research notes with every source: `docs/RICHES-RESEARCH.md`.
- Branch-level wording in the shared UI: plural, lens folder, How/Where labels, tier rules, ladder note, class glyphs and ambient motion come from `branch.json`. The tier sheet, hover cards and as-of line follow the branch you are in; the ladder and route remount on a branch switch.
- An `In-game screen` capture kind for UI screenshots. The lint checks route phases, quoted figures, `stacks` lists and ambient modes; verify checks every branch's route, a ladder-to-ladder branch switch, and audits the route with axe.
- `npm run verify`: builds the site and checks it in a headless browser, failing on any problem. CI and the Release workflow run it. It covers:
  - the data lint;
  - every plate, list, redirect and the ladder;
  - explorer keys, filter, recent and outline;
  - the phone drawer;
  - accessibility (axe-core);
  - whether the site is self-contained.
- `npm run lint`: content rules for every branch.
  - Each rating needs a basis, each image a credit, each capture a caption, and each source a valid https URL.
  - Every cover must resolve to an image, and every image file must exist.
  - Nothing under `public/media` may be orphaned.

### Removed

- **Temporary rides.** The guide now lists only mounts you can keep. The Fleeting leaf is gone with the Kuku Bird Hatchling (it grows into the Leaping Kuku Bird, which stays), the wildlife-park elephant and Marni's Mechahorse. Their old links redirect.

### Changed

- **Re-blockades** now give the real menu path, Others → Settings → Gameplay → Re-Blockade Frequency, and the real options: Stable (none), Conflict (the default) and War. The plate adds how a change takes effect, the 1.08 and 1.10 changes, and the in-game screenshot.
- **Settings plates** use the 2.05.01 menu: Difficulty is the first row of Others → Settings → Gameplay; Display Toggles lists every display switch in that tab (headgear, melee and ranged weapons, sheath, each character's accessories, 3D stronghold details, guides, group icon); Map Markers adds the minimap north lock, key and anvil icons, the 1.16 map filter, 1.18 bell-revealed areas and 2.04's map focus. Tap-to-sprint moved to Camera and Controls.
- **Pets** reflect 1.11: up to 100 registered and 50 at camp, not 30; pets with a Sigil of Valor fight. **Bags** give the 240-slot carried cap.
- **Riches** wagon and ship plates link to the Mounts plates they are about, and the Mounts Cargo lens adds Rokade.
- **Sea-mount locations.** Sportskeeda's guide places spawns that the plates used to call "no fixed spawn". Electric Rays are in the Trench and the Great Trench. Eagle Rays share the manta-ray zone. Sunfish are sure at the Silent Serpent Shrine Cave by the Phragma Islands. Hammerheads and Orcas also swim the Central Waters. The Giant Manta Ray is narrowed to the manta-ray zone.
- **Fonts are self-hosted.** Bodoni Moda, Archivo and JetBrains Mono (Latin, variable) ship with the site, so the release zip renders as designed offline and from disk. The app no longer contacts a font CDN.
- **Readable secondary text meets WCAG AA.** It is now at least 4.5:1 on every ink surface. Counts, hints, credits and placeholders moved from the ornament tone to the readable one.
- **Screen-reader structure.** The index and plate sit in a `main` landmark, and pip ratings read as "n of 5".
- The planning docs live in `docs/`: `IDENTIFIED.md`, `PLAN.md`, `SHELVED.md` and `TODO.md`.

## [0.2.0] — 2026-11-18

### 0.2.0 - Added

- **Explorer**, an IDE-style tree that replaces the spine, built on the VS Code tree widget and Atom tree-view. It has three panes: Recent, Compendium and Outline (the open plate's sections, tracking where you are reading).
  - Focus is separate from selection.
  - `←` / `→` collapse or step out, and expand or step in; `Alt` folds a whole subtree.
  - Typing letters jumps to a row; `Ctrl/⌘ F` filters the tree.
  - Parent folders stay pinned at the top as you scroll, and the tree reveals whatever page you open.
  - Opening a mount from a folder keeps that folder's list in the index, including prev/next.
  - Every mount appears as a row with a portrait icon and a hover card showing all four tiers.
  - `Alt \` or `Ctrl ⇧ E` focuses the explorer from anywhere.
- **Category branches** under Mounts: Land, Underwater, Flying, Mechanical, Easter Eggs and DLC (*Charting the Unknown*). Each splits into leaves, and a mount can appear in several.
- **Marni's Mechahorse**: the only mount that never spends stamina.
- **Easter egg notes** on plates: the Kuku Bird as Crimson Desert's Chocobo, Black Desert Online's Marni, the circus lion and the wildlife-park elephant.
- High-Mobility A.T.A.G. listed as an A.T.A.G. variant, with a new A.T.A.G. action still.
- The palette (`/`) now finds branches as well as mounts, so typing `dlc` or `under` jumps to them.
- GitHub packaging: this changelog, a README with screenshots, CI (type check + build), and a one-click Release workflow that builds the site and publishes the release with its zip. Its tag input can be left blank (it releases the `package.json` version) and tolerates a stray trailing dot or missing `v`. Workflows run on the Node 24 actions (`checkout`, `setup-node`, `upload-artifact` v6).

### 0.2.0 - Changed

- **Tier colours.** Red is now reserved for the root. Legendary is orange, Rare is royal blue and Easter Eggs is cyan, following the traditional loot-tier scheme; category leaves inherit. Spec: `docs/spec/tier-colors.txt`.
- **Long haul → All Around Best.** Same members, now ranked on all four ratings together.
- **Deep water → Underwater** and **Flight → Flying** moved from Ride-for lenses to category branches. Old links redirect.
- The build ships as a single classic script, so `index.html` opens straight from disk with no server.
- Tier seals fold to a 2×2 grid whenever the plate is narrow, not only on phones.

### Fixed

- Gallery cards share one height.
- The Sources sheet reads "1 image", not "1 images".
- The footer date no longer orphans a word.

## [0.1.0] — 2026-11-18

### 0.1.0 - Added

- The Mounts branch: 47 mounts across five leaves (Legendary, Rare, Stable, Engineered, Fleeting), each with real in-game captures, routes, field notes and Speed / Stamina / Travel / Combat tiers.
- Plates with map loupe and lightbox, a Tier Ladder, Ride-for lenses, `/` search and keyboard stepping.
- An image pipeline (`tools/media.py`) and a registry that validates every branch at load.

[Unreleased]: https://github.com/deadcoast/crimson-compendium/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/deadcoast/crimson-compendium/releases/tag/v0.3.0
[0.2.0]: https://github.com/deadcoast/crimson-compendium/releases/tag/v0.2.0
[0.1.0]: https://github.com/deadcoast/crimson-compendium/commit/db6bd26
