// App-wide reactive state: the hash route plus UI overlays.
import { untrack } from 'svelte';
import type { Capture, ListContext } from './types';

/** Light per-viewer conveniences only; storage can be absent or throw, so both sides are guarded. */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v: unknown = JSON.parse(raw);
    // a value of the wrong shape (another app on this origin, an old format) falls back instead of crashing
    if (Array.isArray(fallback)) return (Array.isArray(v) && v.every((x) => typeof x === 'string') ? v : fallback) as T;
    if (fallback && typeof fallback === 'object') {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return fallback;
      const out = { ...fallback } as Record<string, unknown>;
      for (const [k, d] of Object.entries(fallback)) {
        const got = (v as Record<string, unknown>)[k];
        if (typeof got === typeof d) out[k] = got;
      }
      return out as T;
    }
    return typeof v === typeof fallback ? (v as T) : fallback;
  } catch { return fallback; }
}
export function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode or blocked: keep in memory */ }
}

class AppState {
  hash = $state(location.hash.slice(1));
  /** what the index column lists; survives opening an entry so lens browsing keeps its order */
  ctx = $state<ListContext>({ kind: 'leaf', id: '' });
  /** class filter inside a leaf (land/sea/sky), '' = all */
  cls = $state('');
  palette = $state(false);
  sheet = $state<'' | 'sources' | 'tiers'>('');
  lightbox = $state<{ items: Capture[]; index: number } | null>(null);
  reducedMotion = $state(matchMedia('(prefers-reduced-motion: reduce)').matches);
  /** most recently opened entries as "branch/entry", newest first (kept between visits when storage allows) */
  recent = $state<string[]>(load('cc.recent', []));

  constructor() {
    addEventListener('hashchange', () => (this.hash = location.hash.slice(1)));
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => (this.reducedMotion = e.matches));
  }

  go(h: string) {
    const clean = h.replace(/^#/, '');
    // update state in the same tick as any ctx change, so the view never sees one without the other
    this.hash = clean;
    if (location.hash.slice(1) !== clean) location.hash = clean;
  }

  visit(branch: string, entry: string) {
    const key = `${branch}/${entry}`;
    // called from an effect: read untracked, so writing the list never re-triggers the caller
    untrack(() => {
      if (this.recent[0] === key) return;
      // merge with what other tabs stored since this one loaded
      const stored = load<string[]>('cc.recent', []);
      this.recent = [key, ...[...this.recent, ...stored].filter((r, i, all) => r !== key && all.indexOf(r) === i)].slice(0, 6);
      save('cc.recent', this.recent);
    });
  }

  get overlayOpen() {
    return this.palette || this.sheet !== '' || this.lightbox !== null;
  }
}

export const app = new AppState();
