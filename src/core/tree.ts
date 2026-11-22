// The TREE: resolves routes, lists and media across every registered branch.
import { branches } from '../branches/registry';
import { matches, tierOf } from './select';
import type { Branch, Category, CrossLink, Entry, Leaf, LeafCover, Lens, ListContext, MediaItem, View } from './types';
export { ROMAN, TIER_NAMES, mediaUrl } from './format';
export { tierOf };

export const tree = { branches };

/* Route grammar (hash, ASCII + hyphens only):
     #mounts                     → first leaf (the route instead, when the branch has one)
     #mounts-legendary           → leaf
     #mounts-underwater          → category branch
     #mounts-underwater-rare     → a leaf of that category
     #mounts-for-battle          → lens
     #mounts-ladder              → tier ladder
     #riches-route               → the branch's route, when it defines one
     #materials-sort             → the branch's matrix, under the id it declares
     #mounts-royler              → entry
   Retired names (branch.json "redirects") resolve to their replacement.            */
export function resolve(hash: string): View {
  const fallback = branches[0];
  const branch = branches.find((b) => hash === b.id || hash.startsWith(b.id + '-')) ?? fallback;
  let rest = hash.startsWith(branch.id + '-') ? hash.slice(branch.id.length + 1) : '';
  rest = branch.redirects?.[rest] ?? rest;
  if (rest === 'ladder') return { kind: 'ladder', branch };
  if (branch.matrix && rest === branch.matrix.id) return { kind: 'matrix', branch };
  // the branch root opens its front door: the matrix or the plan, with the catalogue behind it
  if (rest === '' && frontOf(branch) === 'matrix') return { kind: 'matrix', branch };
  if (branch.route && (rest === 'route' || rest === '')) return { kind: 'route', branch };
  if (rest.startsWith('for-')) {
    const lens = branch.lenses.find((l) => l.id === rest.slice(4));
    if (lens) return { kind: 'lens', branch, lens };
  }
  const leaf = branch.leaves.find((l) => l.id === rest);
  if (leaf) return { kind: 'leaf', branch, leaf };
  for (const cat of branch.categories) {
    if (rest === cat.id) return { kind: 'cat', branch, cat };
    if (rest.startsWith(cat.id + '-')) {
      const cl = cat.leaves.find((l) => l.id === rest.slice(cat.id.length + 1));
      if (cl) return { kind: 'cat', branch, cat, leaf: cl };
    }
  }
  const entry = branch.byId.get(rest);
  if (entry) return { kind: 'entry', branch, entry };
  return { kind: 'leaf', branch, leaf: branch.leaves[0] };
}

export const href = {
  branch: (b: Branch) => `#${b.id}`,
  leaf: (b: Branch, leafId: string) => `#${b.id}-${leafId}`,
  lens: (b: Branch, lensId: string) => `#${b.id}-for-${lensId}`,
  cat: (b: Branch, catId: string, leafId?: string) => `#${b.id}-${catId}${leafId ? '-' + leafId : ''}`,
  ladder: (b: Branch) => `#${b.id}-ladder`,
  route: (b: Branch) => `#${b.id}-route`,
  matrix: (b: Branch) => `#${b.id}-${b.matrix?.id ?? 'matrix'}`,
  entry: (b: Branch, entryId: string) => `#${b.id}-${entryId}`,
  ctx: (b: Branch, ctx: ListContext) =>
    ctx.kind === 'leaf' ? href.leaf(b, ctx.id) : ctx.kind === 'lens' ? href.lens(b, ctx.id) : href.cat(b, ctx.id, ctx.leaf),
};

/** The view a branch root opens: its declared front, else its route, else none (the first leaf). */
export function frontOf(b: Branch): 'matrix' | 'route' | undefined {
  if (b.front === 'matrix' && b.matrix) return 'matrix';
  if (b.front === 'route' && b.route) return 'route';
  return b.route ? 'route' : b.matrix ? 'matrix' : undefined;
}

export const leafOf = (b: Branch, e: Entry): Leaf => b.leaves.find((l) => l.id === e.leaf) ?? b.leaves[0];
export const catOf = (b: Branch, id: string): Category | undefined => b.categories.find((c) => c.id === id);

/** Whether a list context names a list in this branch. Contexts outlive branch switches in app state. */
export function ctxIn(b: Branch, c: ListContext): boolean {
  if (c.kind === 'leaf') return b.leaves.some((l) => l.id === c.id);
  if (c.kind === 'lens') return b.lenses.some((l) => l.id === c.id);
  const cat = catOf(b, c.id);
  return !!cat && (!c.leaf || cat.leaves.some((l) => l.id === c.leaf));
}

export function entriesFor(b: Branch, ctx: ListContext): Entry[] {
  if (ctx.kind === 'leaf') return b.entries.filter((e) => e.leaf === ctx.id);
  if (ctx.kind === 'cat') {
    const cat = catOf(b, ctx.id);
    if (!cat) return [];
    return ctx.leaf ? (cat.leaves.find((l) => l.id === ctx.leaf)?.entries ?? []) : cat.entries;
  }
  const lens = b.lenses.find((l) => l.id === ctx.id);
  return lens ? lensEntries(b, lens) : [];
}

export function lensEntries(b: Branch, lens: Lens): Entry[] {
  const leafRank = (e: Entry) => b.leaves.findIndex((l) => l.id === e.leaf);
  return b.entries
    .filter((e) => matches(e, lens.where))
    .sort((a, c) => tierOf(a, lens.sortBy) - tierOf(c, lens.sortBy) || leafRank(a) - leafRank(c));
}

export interface ContextLabel {
  title: string;
  subtitle?: string;
  blurb: string;
  accent: string;
  /** breadcrumb trail below the branch: [label, href?] */
  trail: { label: string; to?: string }[];
}

export function contextLabel(b: Branch, ctx: ListContext): ContextLabel {
  if (ctx.kind === 'leaf') {
    const l = b.leaves.find((x) => x.id === ctx.id) ?? b.leaves[0];
    return { title: l.label, blurb: l.blurb, accent: l.accent, trail: [{ label: 'Leaf' }] };
  }
  if (ctx.kind === 'cat') {
    const cat = catOf(b, ctx.id);
    const cl = cat?.leaves.find((l) => l.id === ctx.leaf);
    if (cat && cl) {
      return { title: cl.label, blurb: cl.short, accent: cl.accent, trail: [{ label: cat.label, to: href.cat(b, cat.id) }] };
    }
    return { title: cat?.label ?? '', subtitle: cat?.subtitle, blurb: cat?.blurb ?? '', accent: cat?.accent ?? 'crimson', trail: [{ label: 'Branch' }] };
  }
  const lens = b.lenses.find((x) => x.id === ctx.id);
  return { title: lens?.label ?? '', blurb: lens?.blurb ?? '', accent: b.accent ?? 'crimson', trail: [{ label: b.labels?.lenses ?? 'Ride for' }] };
}

/** Resolve a cover to a concrete image — its own file, or an entry's hero, portrait or capture. */
export function coverFrom(b: Branch, c: LeafCover): MediaItem | undefined {
  if (c.src) return c as MediaItem;
  const e = c.entry ? b.byId.get(c.entry) : undefined;
  if (!e) return undefined;
  if (c.capture !== undefined) return e.media.captures[c.capture];
  return c.role === 'portrait' ? e.media.portrait : (e.media.hero ?? e.media.portrait);
}

export const coverOf = (b: Branch, leaf: Leaf) => coverFrom(b, leaf.cover);

export const classLabel = (b: Branch, id: string) => b.classes.find((c) => c.id === id)?.label ?? id;

/** Plates in other branches tied to this one: the plate it is about (base), the plates it points at (also),
 *  and, the other way round, plates elsewhere that are about this one or point at it. One row per plate. */
export function crossLinks(b: Branch, e: Entry): CrossLink[] {
  const out: CrossLink[] = [];
  const seen = new Set<string>();
  const add = (branch: Branch | undefined, entry: Entry | undefined, rel: CrossLink['rel']) => {
    if (!branch || !entry) return;
    const key = `${branch.id}/${entry.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ branch, entry, rel });
  };
  const at = (ref: string) => {
    const [bid, id] = ref.split('/');
    const branch = branches.find((x) => x.id === bid);
    return [branch, branch?.byId.get(id)] as const;
  };
  if (e.base) add(...at(e.base), 'base');
  for (const ref of e.also ?? []) add(...at(ref), 'also');
  const me = `${b.id}/${e.id}`;
  for (const other of branches) {
    if (other.id === b.id) continue;
    for (const x of other.entries) {
      if (x.base === me) add(other, x, 'source');
      else if (x.also?.includes(me)) add(other, x, 'cited');
    }
  }
  return out;
}
