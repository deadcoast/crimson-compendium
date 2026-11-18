# Crimson Compendium

A field reference for *Crimson Desert*, built as a TREE of BRANCHES. Branch one is **Mounts**: 48 mounts across five rarity leaves and six category branches (Land, Underwater, Flying, Mechanical, Easter Eggs, DLC), each with real in-game captures of where to find it, how to make it yours, and tier ratings for Speed, Stamina, Travel and Combat.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ — runs from any host or sub-path
npm run media      # fetch + convert images for any entry that references a new "from" URL
```

Requires Node 18+ and, for `npm run media`, Python 3 with Pillow.

## Layout

```
src/
  core/            engine — knows nothing about mounts
    types.ts       TREE → BRANCH → (CATEGORY) → LEAF → ENTRY data model
    tree.ts        routing (#mounts-royler, #mounts-underwater-rare), lists, lenses, covers
    select.ts      selectors and tier ranking shared with the registry
    explorer.ts    the explorer's tree model: rows, filter, sticky rows, auto-reveal
    state.svelte.ts  hash route, overlays, recent history
    search.ts  motion.ts  format.ts
  ui/              shared components every branch renders through
  branches/
    registry.ts    the one file that lists branches (and validates them)
    mounts/
      branch.json  leaves, category branches, metrics, terrain classes, "ride for" lenses, redirects
      entries.json the 48 mounts
      MountRecord.svelte   mount-only plate section (stats, skills, coats)
  styles/          tokens.css (every colour, font, easing) + base.css
public/media/<branch>/<entry>/   generated WebP files
tools/media.py     image pipeline
```

## Add a mount (a new entry)

1. Append an object to `src/branches/mounts/entries.json`. Copy a neighbour: `id`, `name`, `leaf`, `cls`, `tiers` (all four metrics, each with a `basis`), `routes`, `media`, `sources`.
2. For each image give a `from` URL and a `credit`; leave out `src`, `w`, `h`.
3. `npm run media` downloads, crops and converts the images and writes `src`, `w`, `h` back into the JSON.
4. `npm run dev`. The registry refuses to start if an id collides with a route, a leaf or class is unknown, a tier is missing, or a portrait was never built.

## Add a leaf

Add an object to `leaves` in `branch.json` (`id`, `label`, `accent`, `blurb`, `short`, `cover`). The explorer, index, ladder filter, routes and every `"rarity"` category pick it up.

## Add a category branch

Add an object to `categories` in `branch.json`:

```json
{ "id": "underwater", "label": "Underwater", "glyph": "sea", "accent": "sea",
  "blurb": "…", "where": { "domains": ["sea"] }, "leaves": "rarity",
  "cover": { "entry": "ocean-drifter", "role": "hero" } }
```

`where` takes `domains`, `tags`, `cls` (any shared value matches). `"leaves": "rarity"` makes one leaf per rarity leaf that has members; or list your own leaves, each with its own `where`. Overlap with other categories is expected. Optional: `subtitle` (shown in italics), `line: "egg"` (list line shows the entry's `egg` note). The registry rejects empty categories and route collisions.

## Add a branch

1. `src/branches/<id>/branch.json` + `entries.json` (same schema; define your own `metrics` and `classes`).
2. Optional: Svelte components for plate sections only that branch needs.
3. One line in `src/branches/registry.ts`.
4. `npm run media <id>`.

Nothing in `core/` or `ui/` changes. See `DESIGN.md` for the design system and the reasoning behind the ratings.
