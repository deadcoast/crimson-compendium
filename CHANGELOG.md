# Changelog

All notable changes to the Crimson Compendium. Versions follow [Semantic Versioning](https://semver.org/); the format follows [Keep a Changelog](https://keepachangelog.com/).

## [0.2.0] — 2026-11-18

### Added
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
- GitHub packaging: this changelog, a README with screenshots, CI (type check + build), and a one-click Release workflow that builds the site and publishes the release with its zip.

### Changed
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

### Added
- The Mounts branch: 47 mounts across five leaves (Legendary, Rare, Stable, Engineered, Fleeting), each with real in-game captures, routes, field notes and Speed / Stamina / Travel / Combat tiers.
- Plates with map loupe and lightbox, a Tier Ladder, Ride-for lenses, `/` search and keyboard stepping.
- An image pipeline (`tools/media.py`) and a registry that validates every branch at load.

[0.2.0]: https://github.com/deadcoast/crimson-compendium/releases/tag/v0.2.0
[0.1.0]: https://github.com/deadcoast/crimson-compendium/commit/db6bd26
