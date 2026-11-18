// The compendium's data model. TREE → BRANCH → LEAF → ENTRY.
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
  /** branch-specific payload, read only by that branch's own sections */
  [extra: string]: unknown;
}

export interface Metric { id: string; label: string; blurb: string }
export interface ClassDef { id: string; label: string }

export interface LeafCover {
  entry?: string;
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
  cover: LeafCover;
}

export interface Lens {
  id: string;
  label: string;
  blurb: string;
  where: { cls?: string[]; tags?: string[]; atMost?: { metric: string; tier: number } };
  sortBy: string;
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
}

/** A plate section a branch adds below the generic ones (e.g. mount stats). */
export type PlateSection = Component<{ entry: Entry; branch: Branch }>;

export interface Branch extends BranchDef {
  entries: Entry[];
  byId: Map<string, Entry>;
  sections: PlateSection[];
}

/** What the index column is listing. */
export type ListContext = { kind: 'leaf'; id: string } | { kind: 'lens'; id: string };

export type View =
  | { kind: 'leaf'; branch: Branch; leaf: Leaf }
  | { kind: 'lens'; branch: Branch; lens: Lens }
  | { kind: 'ladder'; branch: Branch }
  | { kind: 'entry'; branch: Branch; entry: Entry };
