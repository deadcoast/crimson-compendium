// Data lint: the content rules every branch must meet before it ships.
// The registry (src/branches/registry.ts) refuses broken structure at load (ids, leaves, routes);
// this checks what the registry cannot see: evidence on every rating, a credit on every image and a
// caption on every capture, a valid https URL on every source, covers that resolve to an image,
// image files present, route phases whose covers resolve, figures with a known basis and publisher,
// and no orphaned media anywhere under public/media.
//
//   node tools/lint.mjs        run alone (npm run verify runs it first)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const KINDS = new Set(['map', 'overworld', 'action', 'variant', 'menu']);
// what a quoted figure stands on: patch notes, guide text, a guide's in-game screenshot, one player's report, or a sum shown
const BASES = new Set(['patch', 'guide', 'screenshot', 'player', 'sum']);

const shares = (want, have) => !want || want.some((v) => have.includes(v));
function tierOf(e, metric) {
  if (metric === 'overall') {
    const rated = Object.values(e.tiers).map((t) => t.tier).filter((t) => t !== null);
    return rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 9;
  }
  return e.tiers[metric]?.tier ?? 9;
}
const matches = (e, w) =>
  shares(w.cls, [e.cls]) && shares(w.domains, e.domains) && shares(w.tags, e.tags) && (!w.atMost || tierOf(e, w.atMost.metric) <= w.atMost.tier);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Lints every branch under src/branches. Returns per-branch counts and a flat list of problems. */
export function lint() {
  const credits = read('src/core/credits.json');
  const problems = [];
  const summary = [];
  const used = new Set(); // every media path any branch references
  const dirs = readdirSync(join(ROOT, 'src/branches')).filter((d) => existsSync(join(ROOT, 'src/branches', d, 'branch.json')));

  for (const id of dirs) {
    const def = read(`src/branches/${id}/branch.json`);
    const entries = read(`src/branches/${id}/entries.json`);
    let images = 0, ratings = 0;
    const bad = (where, msg) => problems.push(`${id}/${where}: ${msg}`);
    const text = (where, v, field) => { if (typeof v !== 'string' || !v.trim()) bad(where, `${field} is empty`); };

    const image = (where, m, role, needCaption) => {
      if (!m) return;
      images++;
      if (!m.src) return bad(where, `${role} has no built file (run npm run media)`);
      used.add(m.src);
      if (!existsSync(join(ROOT, 'public', m.src))) bad(where, `${role} file missing: public/${m.src}`);
      if (!credits.images[m.credit]) bad(where, `${role} credit "${m.credit}" is not in src/core/credits.json`);
      if (!(m.w > 0 && m.h > 0)) bad(where, `${role} has no size`);
      if (needCaption) {
        if (!KINDS.has(m.kind)) bad(where, `${role} kind "${m.kind}" is not one of ${[...KINDS].join(', ')}`);
        text(where, m.caption, `${role} caption`);
      }
    };

    for (const e of entries) {
      for (const f of ['name', 'kind', 'region', 'trait', 'summary', 'since']) text(e.id, e[f], f);
      for (const m of def.metrics) {
        const t = e.tiers[m.id];
        ratings++;
        if (!t) { bad(e.id, `no ${m.id} rating`); continue; }
        if (!(t.tier === null || [1, 2, 3, 4, 5].includes(t.tier))) bad(e.id, `${m.id} tier ${t.tier} is not I–V or not rated`);
        if (typeof t.basis !== 'string' || !t.basis.trim()) bad(e.id, `${m.id} rating has no basis`);
      }
      if (!e.routes?.length || e.routes.some((r) => !r.steps?.length || r.steps.some((s) => !String(s).trim()))) bad(e.id, 'how-to-get route missing or has an empty step');
      if (!e.sources?.length) bad(e.id, 'no sources');
      for (const s of e.sources ?? []) {
        if (!credits.publishers[s.by]) bad(e.id, `source publisher "${s.by}" is not in src/core/credits.json`);
        let url = null;
        try { url = new URL(s.url); } catch {}
        if (!url || url.protocol !== 'https:' || !url.hostname.includes('.') || /\s/.test(s.url)) bad(e.id, `source "${s.title}" has no valid https URL (${s.url || 'empty'})`);
        text(e.id, s.title, 'source title');
      }
      image(e.id, e.media.portrait, 'portrait');
      if (!e.media.portrait) bad(e.id, 'no portrait');
      image(e.id, e.media.hero, 'hero');
      e.media.captures.forEach((c, i) => image(e.id, c, `capture ${i + 1}`, true));
      e.media.gallery.forEach((c, i) => image(e.id, c, `gallery ${i + 1}`, true));
      // branch payloads: any object holding a quoted figure (label + value + basis) names a known basis
      // and publisher; any `stacks` list names entries of the same branch
      const payload = (v, where) => {
        if (Array.isArray(v)) return v.forEach((x, i) => payload(x, `${where}[${i}]`));
        if (!v || typeof v !== 'object') return;
        if ('label' in v && 'value' in v && 'basis' in v) {
          if (!BASES.has(v.basis)) bad(e.id, `${where} basis "${v.basis}" is not one of ${[...BASES].join(', ')}`);
          if (!credits.publishers[v.by]) bad(e.id, `${where} publisher "${v.by}" is not in src/core/credits.json`);
          text(e.id, v.value, `${where} value`);
        }
        for (const [k, x] of Object.entries(v)) {
          if (k === 'stacks' && Array.isArray(x)) for (const id of x) { if (!entries.some((o) => o.id === id)) bad(e.id, `${where}.stacks names unknown entry "${id}"`); }
          else payload(x, `${where}.${k}`);
        }
      };
      for (const [k, v] of Object.entries(e)) if (!['media', 'tiers', 'sources', 'routes'].includes(k)) payload(v, k);
    }

    // a cover resolves the way core/tree.ts coverFrom does: its own file, or an entry's capture,
    // portrait or hero (falling back to the portrait); it must end at an image
    const byId = new Map(entries.map((e) => [e.id, e]));
    const cover = (where, c) => {
      if (!c || (!c.src && !c.entry && !c.from)) return bad(where, 'no cover');
      if (c.src || c.from) return image(where, c, 'cover');
      const e = byId.get(c.entry);
      if (!e) return bad(where, `cover entry "${c.entry}" does not exist`);
      const m = c.capture !== undefined ? e.media.captures[c.capture] : c.role === 'portrait' ? e.media.portrait : (e.media.hero ?? e.media.portrait);
      if (!m?.src) bad(where, c.capture !== undefined ? `cover capture ${c.capture} does not exist on ${e.id} (${e.media.captures.length} captures)` : `cover resolves to no image on ${e.id}`);
    };
    for (const l of def.leaves) cover(`leaf ${l.id}`, l.cover);
    for (const ph of def.route?.phases ?? []) {
      text(`route/${ph.id}`, ph.why, 'phase reason');
      if (ph.cover) cover(`route/${ph.id}`, ph.cover);
      if (!ph.steps?.length) bad(`route/${ph.id}`, 'phase has no steps');
      for (const st of [...(ph.steps ?? []), ...(ph.meanwhile ?? [])]) {
        text(`route/${ph.id}`, st.text, 'step text');
        if (st.entry && !byId.has(st.entry)) bad(`route/${ph.id}`, `step names unknown entry "${st.entry}"`);
      }
    }
    for (const c of def.categories) {
      cover(`category ${c.id}`, c.cover);
      if (c.line === 'egg') for (const e of entries.filter((e) => matches(e, c.where))) text(e.id, e.egg, `egg note (listed in ${c.label})`);
    }

    summary.push({ branch: id, entries: entries.length, ratings, images });
  }
  // every file under public/media is referenced by some branch's data; anything else (including a
  // folder left by a removed branch) is dead weight in the release
  for (const f of walk(join(ROOT, 'public/media'))) {
    const rel = relative(join(ROOT, 'public'), f).split('\\').join('/');
    if (!used.has(rel)) problems.push(`media: orphaned file public/${rel}`);
  }
  return { summary, problems };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { summary, problems } = lint();
  for (const s of summary) console.log(`${s.branch}: ${s.entries} entries, ${s.ratings} ratings, ${s.images} images`);
  for (const p of problems) console.log(`  ${p}`);
  console.log(problems.length ? `${problems.length} problem(s)` : 'clean');
  process.exit(problems.length ? 1 : 0);
}
