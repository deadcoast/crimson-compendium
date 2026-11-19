// The TREE: resolves routes, lists and media across every registered branch.
import { branches } from '../branches/registry';
import { matches, tierOf } from './select';
import type { Branch, Category, Entry, Leaf, LeafCover, Lens, ListContext, MediaItem, View } from './types';
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
     #mounts-royler              → entry
   Retired names (branch.json "redirects") resolve to their replacement.            */
export function resolve(hash: string): View {
  const fallback = branches[0];
  const branch = branches.find((b) => hash === b.id || hash.startsWith(b.id + '-')) ?? fallback;
  let rest = hash.startsWith(branch.id + '-') ? hash.slice(branch.id.length + 1) : '';
  rest = branch.redirects?.[rest] ?? rest;
  if (rest === 'ladder') return { kind: 'ladder', branch };
  // a branch with a route opens on it: the plan is the front door, the catalogue sits behind it
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
  entry: (b: Branch, entryId: string) => `#${b.id}-${entryId}`,
  ctx: (b: Branch, ctx: ListContext) =>
    ctx.kind === 'leaf' ? href.leaf(b, ctx.id) : ctx.kind === 'lens' ? href.lens(b, ctx.id) : href.cat(b, ctx.id, ctx.leaf),
};

export const leafOf = (b: Branch, e: Entry): Leaf => b.leaves.find((l) => l.id === e.leaf) ?? b.leaves[0];
export const catOf = (b: Branch, id: string): Category | undefined => b.categories.find((c) => c.id === id);

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
