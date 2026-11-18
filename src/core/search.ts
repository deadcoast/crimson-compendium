// Tiny ranked search across every branch: name first, then trait, kind and place.
import type { Branch, Entry } from './types';

export interface Hit { branch: Branch; entry: Entry; score: number }

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, ' ');

export function search(branches: Branch[], query: string, limit = 12): Hit[] {
  const q = norm(query).trim();
  if (!q) return [];
  const terms = q.split(/\s+/);
  const hits: Hit[] = [];
  for (const branch of branches) {
    for (const entry of branch.entries) {
      const name = norm(entry.name);
      const body = norm([entry.trait, entry.kind, entry.region, entry.area, entry.leaf, entry.cls, entry.tags.join(' '), entry.variants.join(' ')].join(' '));
      let score = 0;
      for (const t of terms) {
        if (name.startsWith(t)) score += 12;
        else if (name.split(' ').some((w) => w.startsWith(t))) score += 8;
        else if (name.includes(t)) score += 5;
        else if (body.includes(t)) score += 2;
        else { score = 0; break; }
      }
      if (score) hits.push({ branch, entry, score });
    }
  }
  return hits.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name)).slice(0, limit);
}
