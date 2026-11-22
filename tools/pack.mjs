// Pack the built site for a host that caps how many files one version may hold (the claude.ai artifact takes
// 512). Run after `npm run build`: `npm run pack [-- --max 500]` writes dist-pack/.
//
//   1. Identical images keep one file: every other path that held the same bytes is rewritten in the bundle
//      to the one kept (several plates share a source and crop, e.g. a vents map).
//   2. If the site still has more files than --max, the smallest images are inlined into the bundle as
//      data: URLs, smallest first, until it fits. core/format.ts mediaUrl passes data: URLs through.
//
// Nothing is dropped or re-encoded: every image the bundle names is checked to exist (or to be inlined)
// before the script reports success, and the page is otherwise byte-identical to dist/.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'dist');
const OUT = join(ROOT, 'dist-pack');
const arg = process.argv.indexOf('--max');
const MAX = arg > 0 ? Number(process.argv[arg + 1]) : 500;

if (!existsSync(join(SRC, 'index.html'))) { console.error('pack: no dist/ — run npm run build first'); process.exit(1); }
rmSync(OUT, { recursive: true, force: true });
cpSync(SRC, OUT, { recursive: true });

const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const rel = (p) => relative(OUT, p).split('\\').join('/');
const texts = walk(OUT).filter((p) => /\.(js|html|css)$/.test(p));
let code = Object.fromEntries(texts.map((p) => [p, readFileSync(p, 'utf8')]));
const images = () => walk(join(OUT, 'media')).filter((p) => p.endsWith('.webp'));
// a path is replaced only where it stands as a whole string value, so no path can hit part of another
const swap = (from, to) => {
  const pat = new RegExp(`(["'\`])${from.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(["'\`])`, 'g');
  let n = 0;
  for (const p of texts) code[p] = code[p].replace(pat, (_, a, b) => { n++; return `${a}${to}${b}`; });
  return n;
};

// 1. one file per distinct image
const byHash = new Map();
for (const p of images().sort()) {
  const h = createHash('sha256').update(readFileSync(p)).digest('hex');
  if (!byHash.has(h)) byHash.set(h, []);
  byHash.get(h).push(p);
}
let merged = 0;
for (const [keep, ...dupes] of byHash.values()) {
  for (const d of dupes) {
    if (!swap(rel(d), rel(keep))) { console.error(`pack: ${rel(d)} is not named in the bundle`); process.exit(1); }
    rmSync(d);
    merged++;
  }
}

// 2. inline the smallest images until the file count fits
let count = walk(OUT).length;
let inlined = 0;
for (const p of images().sort((a, b) => statSync(a).size - statSync(b).size)) {
  if (count <= MAX) break;
  const uri = `data:image/webp;base64,${readFileSync(p).toString('base64')}`;
  if (!swap(rel(p), uri)) { console.error(`pack: ${rel(p)} is not named in the bundle`); process.exit(1); }
  rmSync(p);
  count--;
  inlined++;
}
for (const p of texts) writeFileSync(p, code[p]);

// every image path the bundle still names must exist
const named = new Set(Object.values(code).flatMap((t) => t.match(/media\/[a-z0-9_/.-]+\.webp/g) ?? []));
const missing = [...named].filter((m) => !existsSync(join(OUT, m)));
if (missing.length) { console.error(`pack: ${missing.length} images named but missing, e.g. ${missing[0]}`); process.exit(1); }
if (count > MAX) { console.error(`pack: ${count} files, over the ${MAX} limit`); process.exit(1); }
console.log(`pack: dist-pack/ · ${count} files (≤ ${MAX}) · ${merged} duplicate images merged · ${inlined} small images inlined`);
