// Branch registry — the only file that changes when a branch is added to the tree.
// A branch = branch.json (leaves, metrics, lenses) + entries.json (data) + optional plate sections.
import type { Branch, BranchDef, Entry, PlateSection } from '../core/types';
import mountsDef from './mounts/branch.json';
import mountsEntries from './mounts/entries.json';
import MountRecord from './mounts/MountRecord.svelte';

function define(def: BranchDef, entries: Entry[], sections: PlateSection[] = []): Branch {
  const reserved = new Set(['ladder', ...def.leaves.map((l) => l.id)]);
  const leaves = new Set(def.leaves.map((l) => l.id));
  const classes = new Set(def.classes.map((c) => c.id));
  const metrics = def.metrics.map((m) => m.id);
  const byId = new Map<string, Entry>();
  for (const e of entries) {
    const where = `${def.id}/${e.id}`;
    if (byId.has(e.id)) throw new Error(`${where}: duplicate id`);
    if (reserved.has(e.id) || e.id.startsWith('for-')) throw new Error(`${where}: id collides with a route name`);
    if (!/^[a-z0-9-]+$/.test(e.id)) throw new Error(`${where}: ids are lowercase ASCII and hyphens`);
    if (!leaves.has(e.leaf)) throw new Error(`${where}: unknown leaf "${e.leaf}"`);
    if (!classes.has(e.cls)) throw new Error(`${where}: unknown class "${e.cls}"`);
    for (const m of metrics) if (!e.tiers[m]) throw new Error(`${where}: missing tier "${m}"`);
    if (!e.media.portrait?.src) throw new Error(`${where}: portrait not built — run npm run media`);
    byId.set(e.id, e);
  }
  return { ...def, entries, byId, sections };
}

export const branches: Branch[] = [
  define(mountsDef as BranchDef, mountsEntries as unknown as Entry[], [MountRecord]),
];
