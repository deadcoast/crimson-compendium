// The compendium's data model. TREE → BRANCH → (CATEGORY BRANCH →) LEAF → ENTRY.
// A branch is pure data (branch.json + entries.json) plus optional plate sections;
// nothing in core knows what a "mount" is.
import type { Component } from 'svelte';

export type TierNum = 1 | 2 | 3 | 4 | 5;

export interface MediaItem {
  src: string;
  w: number;
  h: number;
  credit: string;
  from?: string;
  focus?: string;
  crop?: number[];
  matte?: boolean;
}

export interface Capture extends MediaItem {
  kind: 'map' | 'overworld' | 'action' | 'variant';
  caption: string;
}

export interface EntryMedia {
  portrait: MediaItem;
  hero?: MediaItem;
  captures: Capture[];
  gallery: Capture[];
}

export interface TierRating {
  tier: TierNum | null;
  basis: string;
}

export interface SourceRef {
  by: string;
  url: string;
  title: string;
}

export interface Route {
  label?: string;
  steps: string[];
}

export interface Entry {
  id: string;
  name: string;
  leaf: string;
  cls: string;
  domains: string[];
  kind: string;
  region: string;
  area: string;
  trait: string;
  summary: string;
  tiers: Record<string, TierRating>;
  tags: string[];
  requires: string[];
  routes: Route[];
  location: string;
  notes: string[];
  variants: string[];
  media: EntryMedia;
  sources: SourceRef[];
  since: string;
  /** what the entry winks at, shown on its plate when it sits in an Easter Eggs leaf */
  egg?: string;
  /** branch-specific payload, read only by that branch's own sections */
  [extra: string]: unknown;
}

export interface Metric { id: string; label: string; blurb: string }
export interface ClassDef { id: string; label: string }

export interface LeafCover {
  entry?: string;
  focus?: string;
  role?: 'hero' | 'portrait';
  capture?: number;
  from?: string;
  src?: string;
  credit?: string;
  w?: number;
  h?: number;
}

export interface Leaf {
  id: string;
  label: string;
  accent: string;
  blurb: string;
  /** one line defining the leaf, reused when a category derives its leaves from these */
  short: string;
  cover: LeafCover;
}

/** Which entries a list holds. Every given field must match; list fields match on any shared value. */
export interface Selector {
  cls?: string[];
  domains?: string[];
  tags?: string[];
  atMost?: { metric: string; tier: number };
}

export interface Lens {
  id: string;
  label: string;
  blurb: string;
  where: Selector;
  /** a metric id, or 'overall' for the mean of every rated metric */
  sortBy: string;
}

/** A leaf of a category branch, as written in branch.json. */
export interface CategoryLeafDef {
  id: string;
  label: string;
  accent: string;
  short: string;
  where: Selector;
}

/** A category branch inside a branch (Land, Underwater, DLC…). Lists overlap on purpose. */
export interface CategoryDef {
  id: string;
  label: string;
  subtitle?: string;
  glyph: string;
  accent: string;
  blurb: string;
  where: Selector;
  /** 'rarity' derives one leaf per branch leaf that has members; otherwise its own leaves */
  leaves: 'rarity' | CategoryLeafDef[];
  cover: LeafCover;
  /** which entry field the list's third line shows instead of the trait */
  line?: 'egg';
}

/** A category leaf after registry resolution: concrete members, in rank order. */
export interface CategoryLeaf {
  id: string;
  label: string;
  accent: string;
  short: string;
  entries: Entry[];
}

export interface Category extends Omit<CategoryDef, 'leaves'> {
  leaves: CategoryLeaf[];
  entries: Entry[];
}

export interface BranchDef {
  id: string;
  title: string;
  singular: string;
  tagline: string;
  asOf: string;
  metrics: Metric[];
  classes: ClassDef[];
  leaves: Leaf[];
  lenses: Lens[];
  categories: CategoryDef[];
  /** retired route names → their replacement, so old links keep working */
  redirects?: Record<string, string>;
}

/** A plate section a branch adds below the generic ones (e.g. mount stats). */
export type PlateSection = Component<{ entry: Entry; branch: Branch }>;

export interface Branch extends Omit<BranchDef, 'categories'> {
  categories: Category[];
  entries: Entry[];
  byId: Map<string, Entry>;
  sections: PlateSection[];
}

/** What the index column is listing. A category context may narrow to one of its leaves. */
export type ListContext =
  | { kind: 'leaf'; id: string }
  | { kind: 'lens'; id: string }
  | { kind: 'cat'; id: string; leaf?: string };

export type View =
  | { kind: 'leaf'; branch: Branch; leaf: Leaf }
  | { kind: 'lens'; branch: Branch; lens: Lens }
  | { kind: 'cat'; branch: Branch; cat: Category; leaf?: CategoryLeaf }
  | { kind: 'ladder'; branch: Branch }
  | { kind: 'entry'; branch: Branch; entry: Entry };
