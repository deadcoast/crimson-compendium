// Selectors and ranking — dependency-free so the registry can resolve lists at load time.
import type { Entry, Selector } from './types';

const shares = (want: string[] | undefined, have: string[]) => !want || want.some((v) => have.includes(v));

/** Tier for sorting: a metric's tier, 'overall' for the mean of rated metrics; unrated sorts last. */
export function tierOf(e: Entry, metric: string): number {
  if (metric === 'overall') {
    const rated = Object.values(e.tiers).map((t) => t.tier).filter((t): t is NonNullable<typeof t> => t !== null);
    return rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 9;
  }
  return e.tiers[metric]?.tier ?? 9;
}

export function matches(e: Entry, w: Selector): boolean {
  return (
    shares(w.cls, [e.cls]) &&
    shares(w.domains, e.domains) &&
    shares(w.tags, e.tags) &&
    (!w.atMost || tierOf(e, w.atMost.metric) <= w.atMost.tier)
  );
}
