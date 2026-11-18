// App-wide reactive state: the hash route plus UI overlays.
import type { Capture, ListContext } from './types';

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

  constructor() {
    addEventListener('hashchange', () => (this.hash = location.hash.slice(1)));
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => (this.reducedMotion = e.matches));
  }

  go(h: string) {
    const clean = h.replace(/^#/, '');
    if (location.hash.slice(1) !== clean) location.hash = clean;
  }

  get overlayOpen() {
    return this.palette || this.sheet !== '' || this.lightbox !== null;
  }
}

export const app = new AppState();
