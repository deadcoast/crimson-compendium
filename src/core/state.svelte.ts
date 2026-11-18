// App-wide reactive state: the hash route plus UI overlays.
import type { Capture, ListContext } from './types';

/** Light per-viewer conveniences only; storage can be absent or throw, so both sides are guarded. */
export function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
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
  /** most recently opened entry ids, newest first (kept between visits when storage allows) */
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

  visit(id: string) {
    if (this.recent[0] === id) return;
    this.recent = [id, ...this.recent.filter((r) => r !== id)].slice(0, 6);
    save('cc.recent', this.recent);
  }

  get overlayOpen() {
    return this.palette || this.sheet !== '' || this.lightbox !== null;
  }
}

export const app = new AppState();
