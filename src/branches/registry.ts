// Branch registry — the only file that changes when a branch is added to the tree.
// A branch = branch.json (leaves, categories, metrics, lenses) + entries.json (data) + optional plate sections.
import type { Branch, BranchDef, Category, CategoryLeaf, Entry, PlateSection, RatingRule } from '../core/types';
import { matches } from '../core/select';
import mountsDef from './mounts/branch.json';
import mountsEntries from './mounts/entries.json';
import MountRecord from './mounts/MountRecord.svelte';
import richesDef from './riches/branch.json';
import richesEntries from './riches/entries.json';
import RichesLedger from './riches/RichesLedger.svelte';
import qolDef from './qol/branch.json';
import qolEntries from './qol/entries.json';
import QolRemedy from './qol/QolRemedy.svelte';

/** Fields a plate with a `base` takes from the plate it is about when it leaves them out. Its own
 *  summary, trait, ratings, tags and payload are always its own: they say why it sits in this branch. */
const INHERIT = ['kind', 'region', 'area', 'requires', 'routes', 'location', 'notes', 'variants', 'media', 'since'] as const;

/** Raw entries of every branch, by branch id, for resolving `base` and `also` across branches. */
const RAW: Record<string, Entry[]> = {
  mounts: mountsEntries as unknown as Entry[],
  riches: richesEntries as unknown as Entry[],
  qol: qolEntries as unknown as Entry[],
};

/** A cross-branch reference is exactly "branch/entry", both parts ids; anything else names no plate. */
export const REF = /^[a-z0-9-]+\/[a-z0-9-]+$/;

function findRaw(ref: string): Entry | undefined {
  if (!REF.test(ref)) return undefined;
  const [b, id] = ref.split('/');
  return RAW[b]?.find((e) => e.id === id);
}

/** Fill a plate's missing fields from its base. Sources are merged: its own first, then the base's. */
function inherit(branchId: string, entries: Entry[]): Entry[] {
  return entries.map((e) => {
    if (!e.base) return e;
    if (!REF.test(e.base)) throw new Error(`${branchId}/${e.id}: base "${e.base}" is not "branch/entry"`);
    const src = findRaw(e.base);
    if (!src) throw new Error(`${branchId}/${e.id}: base "${e.base}" does not exist`);
    if (src.base) throw new Error(`${branchId}/${e.id}: base "${e.base}" has a base of its own; point at the source plate`);
    const out: Entry = { ...e };
    for (const k of INHERIT) if (out[k] === undefined) (out as Record<string, unknown>)[k] = src[k];
    const urls = new Set(e.sources?.map((s) => s.url) ?? []);
    out.sources = [...(e.sources ?? []), ...src.sources.filter((s) => !urls.has(s.url))];
    return out;
  });
}

const ID = /^[a-z0-9-]+$/;

/** Which of a rule's three leaves an entry falls in: 0 best, 2 worst, 1 between. Unrated counts as worst. */
function ruleTier(r: RatingRule, e: Entry): number {
  const tiers = r.metrics.map((m) => e.tiers[m]?.tier ?? 5);
  if (tiers.every((t) => t <= r.best)) return 0;
  if (tiers.some((t) => t >= r.worst)) return 2;
  return 1;
}

/** Category branches resolve once, here: members, leaves and order are fixed at load. */
function categories(def: BranchDef, entries: Entry[]): Category[] {
  return def.categories.map((c) => {
    const members = entries.filter((e) => matches(e, c.where));
    const leaves: CategoryLeaf[] =
      c.leaves === 'rarity'
        ? def.leaves
            .map((l) => ({ id: l.id, label: l.label, accent: l.accent, short: l.short, entries: members.filter((e) => e.leaf === l.id) }))
            .filter((l) => l.entries.length)
        : c.leaves.map((l, i) => ({ id: l.id, label: l.label, accent: l.accent, short: l.short,
            entries: members.filter((e) => (c.rule ? ruleTier(c.rule, e) === i : matches(e, l.where ?? {}))) }));
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
    if (c.rule) {
      if (!c.tierList || c.leaves === 'rarity' || c.leaves.length !== 3) fail(c.id, 'a rule derives a tier list of exactly three leaves');
      for (const m of c.rule.metrics) if (!metrics.includes(m)) fail(c.id, `rule names unknown metric "${m}"`);
      if (!(c.rule.best < c.rule.worst)) fail(c.id, 'rule needs best < worst');
    } else if (c.leaves !== 'rarity') {
      for (const l of c.leaves) if (!l.where) fail(`${c.id}-${l.id}`, 'category leaf has no where');
    }
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
  define(mountsDef as unknown as BranchDef, inherit('mounts', RAW.mounts), [MountRecord]),
  define(richesDef as unknown as BranchDef, inherit('riches', RAW.riches), [RichesLedger]),
  define(qolDef as unknown as BranchDef, inherit('qol', RAW.qol), [QolRemedy]),
];

// every cross-branch pointer names a real plate in another branch
for (const b of branches) {
  for (const e of b.entries) {
    for (const ref of [...(e.base ? [e.base] : []), ...(e.also ?? [])]) {
      if (!REF.test(ref)) throw new Error(`${b.id}/${e.id}: "${ref}" is not "branch/entry"`);
      const [bid, id] = ref.split('/');
      const target = branches.find((x) => x.id === bid);
      if (!target || target.id === b.id) throw new Error(`${b.id}/${e.id}: "${ref}" must name a plate in another branch`);
      if (!target.byId.has(id)) throw new Error(`${b.id}/${e.id}: "${ref}" does not exist`);
    }
  }
}
