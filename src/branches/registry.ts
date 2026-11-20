// Branch registry — the only file that changes when a branch is added to the tree.
// A branch = branch.json (leaves, categories, metrics, lenses) + entries.json (data) + optional plate sections.
import type { Branch, BranchDef, Category, CategoryLeaf, Entry, PlateSection } from '../core/types';
import { matches } from '../core/select';
import mountsDef from './mounts/branch.json';
import mountsEntries from './mounts/entries.json';
import MountRecord from './mounts/MountRecord.svelte';
import richesDef from './riches/branch.json';
import richesEntries from './riches/entries.json';
import RichesLedger from './riches/RichesLedger.svelte';

const ID = /^[a-z0-9-]+$/;

/** Category branches resolve once, here: members, leaves and order are fixed at load. */
function categories(def: BranchDef, entries: Entry[]): Category[] {
  return def.categories.map((c) => {
    const members = entries.filter((e) => matches(e, c.where));
    const leaves: CategoryLeaf[] =
      c.leaves === 'rarity'
        ? def.leaves
            .map((l) => ({ id: l.id, label: l.label, accent: l.accent, short: l.short, entries: members.filter((e) => e.leaf === l.id) }))
            .filter((l) => l.entries.length)
        : c.leaves.map((l) => ({ id: l.id, label: l.label, accent: l.accent, short: l.short, entries: members.filter((e) => matches(e, l.where)) }));
    const ordered = [...new Set(leaves.flatMap((l) => l.entries))];
    return { ...c, leaves, entries: ordered };
  });
}

function define(def: BranchDef, entries: Entry[], sections: PlateSection[] = []): Branch {
  const fail = (where: string, msg: string) => { throw new Error(`${def.id}/${where}: ${msg}`); };
  const leaves = new Set(def.leaves.map((l) => l.id));
  const cats = new Set(def.categories.map((c) => c.id));
  const reserved = new Set(['ladder', 'route', ...leaves, ...cats]);
  const classes = new Set(def.classes.map((c) => c.id));
  const metrics = def.metrics.map((m) => m.id);
  const byId = new Map<string, Entry>();

  const VIEWS = new Set(['ladder', 'route']);
  for (const l of def.leaves) {
    if (!ID.test(l.id) || VIEWS.has(l.id) || l.id.startsWith('for-')) fail(l.id, 'leaf id collides with a route name');
  }
  if (leaves.size !== def.leaves.length) fail('leaves', 'duplicate leaf id');
  for (const c of def.categories) {
    if (!ID.test(c.id) || leaves.has(c.id) || VIEWS.has(c.id) || c.id.startsWith('for-')) fail(c.id, 'category id collides with a route name');
  }
  if (cats.size !== def.categories.length) fail('categories', 'duplicate category id');

  for (const e of entries) {
    if (byId.has(e.id)) fail(e.id, 'duplicate id');
    if (reserved.has(e.id) || e.id.startsWith('for-')) fail(e.id, 'id collides with a route name');
    if (!ID.test(e.id)) fail(e.id, 'ids are lowercase ASCII and hyphens');
    if (!leaves.has(e.leaf)) fail(e.id, `unknown leaf "${e.leaf}"`);
    if (!classes.has(e.cls)) fail(e.id, `unknown class "${e.cls}"`);
    for (const m of metrics) if (!e.tiers[m]) fail(e.id, `missing tier "${m}"`);
    if (!e.media.portrait?.src) fail(e.id, 'portrait not built — run npm run media');
    byId.set(e.id, e);
  }

  // every route name the branch answers to, so any two that collide fail here rather than resolve to the wrong page
  const routes = new Set([...reserved, ...byId.keys()]);
  const claim = (route: string, what: string) => {
    if (routes.has(route)) fail(route, `${what} route collides with another route`);
    routes.add(route);
  };
  for (const l of def.lenses) claim(`for-${l.id}`, 'lens');

  const resolved = categories(def, entries);
  for (const c of resolved) {
    if (!c.entries.length) fail(c.id, 'category matches no entries');
    for (const l of c.leaves) {
      const route = `${c.id}-${l.id}`;
      if (!ID.test(l.id)) fail(route, 'category leaf ids are lowercase ASCII and hyphens');
      if (!l.entries.length) fail(route, 'category leaf matches no entries');
      claim(route, 'category leaf');
    }
    if (c.tierList) {
      for (const e of entries) {
        const n = c.leaves.filter((l) => l.entries.includes(e)).length;
        if (n !== 1) fail(c.id, `tier list puts "${e.id}" in ${n} tiers; it needs exactly one`);
      }
    }
  }

  // a route step that names a plate must name a real one; a phase cover must resolve like a leaf cover
  for (const ph of def.route?.phases ?? []) {
    for (const s of [...ph.steps, ...(ph.meanwhile ?? [])]) if (s.entry && !byId.has(s.entry)) fail(`route/${ph.id}`, `unknown entry "${s.entry}"`);
    if (ph.cover?.entry && !byId.has(ph.cover.entry)) fail(`route/${ph.id}`, `cover entry "${ph.cover.entry}" does not exist`);
  }

  for (const [from, to] of Object.entries(def.redirects ?? {})) {
    if (routes.has(from)) fail(from, 'redirect shadows a live route');
    if (!routes.has(to)) fail(from, `redirect target "${to}" does not exist`);
  }

  return { ...def, categories: resolved, entries, byId, sections };
}

export const branches: Branch[] = [
  define(mountsDef as unknown as BranchDef, mountsEntries as unknown as Entry[], [MountRecord]),
  define(richesDef as unknown as BranchDef, richesEntries as unknown as Entry[], [RichesLedger]),
];
