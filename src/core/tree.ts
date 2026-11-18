// The TREE: resolves routes, lists and media across every registered branch.
import { branches } from '../branches/registry';
import type { Branch, Entry, Leaf, Lens, ListContext, MediaItem, View } from './types';
export { ROMAN, TIER_NAMES, mediaUrl } from './format';

export const tree = { branches };


/* Route grammar (hash, ASCII + hyphens only):
     #mounts                → first leaf
     #mounts-legendary      → leaf
     #mounts-for-battle     → lens
     #mounts-ladder         → tier ladder
     #mounts-royler         → entry                                   */
export function resolve(hash: string): View {
  const fallback = branches[0];
  const branch = branches.find((b) => hash === b.id || hash.startsWith(b.id + '-')) ?? fallback;
  const rest = hash.startsWith(branch.id + '-') ? hash.slice(branch.id.length + 1) : '';
  if (rest === 'ladder') return { kind: 'ladder', branch };
  if (rest.startsWith('for-')) {
    const lens = branch.lenses.find((l) => l.id === rest.slice(4));
    if (lens) return { kind: 'lens', branch, lens };
  }
  const leaf = branch.leaves.find((l) => l.id === rest);
  if (leaf) return { kind: 'leaf', branch, leaf };
  const entry = branch.byId.get(rest);
  if (entry) return { kind: 'entry', branch, entry };
  return { kind: 'leaf', branch, leaf: branch.leaves[0] };
}

export const href = {
  branch: (b: Branch) => `#${b.id}`,
  leaf: (b: Branch, leafId: string) => `#${b.id}-${leafId}`,
  lens: (b: Branch, lensId: string) => `#${b.id}-for-${lensId}`,
  ladder: (b: Branch) => `#${b.id}-ladder`,
  entry: (b: Branch, entryId: string) => `#${b.id}-${entryId}`,
  ctx: (b: Branch, ctx: ListContext) => (ctx.kind === 'leaf' ? href.leaf(b, ctx.id) : href.lens(b, ctx.id)),
};

export const leafOf = (b: Branch, e: Entry): Leaf => b.leaves.find((l) => l.id === e.leaf) ?? b.leaves[0];

export const tierOf = (e: Entry, metric: string): number => e.tiers[metric]?.tier ?? 9;

export function entriesFor(b: Branch, ctx: ListContext): Entry[] {
  if (ctx.kind === 'leaf') return b.entries.filter((e) => e.leaf === ctx.id);
  const lens = b.lenses.find((l) => l.id === ctx.id);
  return lens ? lensEntries(b, lens) : [];
}

export function lensEntries(b: Branch, lens: Lens): Entry[] {
  const w = lens.where;
  const leafRank = (e: Entry) => b.leaves.findIndex((l) => l.id === e.leaf);
  return b.entries
    .filter((e) => (!w.cls || w.cls.includes(e.cls)) && (!w.tags || w.tags.some((t) => e.tags.includes(t))))
    .filter((e) => !w.atMost || tierOf(e, w.atMost.metric) <= w.atMost.tier)
    .sort((a, c) => tierOf(a, lens.sortBy) - tierOf(c, lens.sortBy) || leafRank(a) - leafRank(c));
}

export function contextLabel(b: Branch, ctx: ListContext): { title: string; blurb: string; accent: string } {
  if (ctx.kind === 'leaf') {
    const l = b.leaves.find((x) => x.id === ctx.id) ?? b.leaves[0];
    return { title: l.label, blurb: l.blurb, accent: l.accent };
  }
  const lens = b.lenses.find((x) => x.id === ctx.id);
  return { title: lens?.label ?? '', blurb: lens?.blurb ?? '', accent: 'crimson' };
}

/** Resolve a leaf's cover band to a concrete image — either its own file or an entry's media. */
export function coverOf(b: Branch, leaf: Leaf): MediaItem | undefined {
  const c = leaf.cover;
  if (c.src) return c as MediaItem;
  const e = c.entry ? b.byId.get(c.entry) : undefined;
  if (!e) return undefined;
  if (c.capture !== undefined) return e.media.captures[c.capture];
  return c.role === 'portrait' ? e.media.portrait : (e.media.hero ?? e.media.portrait);
}

export const classLabel = (b: Branch, id: string) => b.classes.find((c) => c.id === id)?.label ?? id;
