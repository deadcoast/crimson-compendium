// Dependency-free helpers shared by core and branch components (kept separate to avoid import cycles).
import credits from './credits.json';
export const TIER_NAMES: Record<number, string> = {
  1: 'Best in class',
  2: 'Above the rest',
  3: 'Average',
  4: 'Below average',
  5: 'Not good',
};

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

/** Media paths are stored relative to /public; the build serves them beside index.html. */
/** A built image's URL. tools/pack.mjs may inline a small image as a data: URL, which passes through. */
export const mediaUrl = (src: string) => (src.startsWith('data:') ? src : `./${src}`);

/** Image credits link to the guide that captured them; sources name their publisher. Data lives in credits.json. */
export const CREDITS: Record<string, { name: string; url: string }> = credits.images;
export const PUBLISHERS: Record<string, string> = credits.publishers;
