// Data lint: the content rules every branch must meet before it ships.
// The registry (src/branches/registry.ts) refuses broken structure at load (ids, leaves, routes);
// this checks what the registry cannot see: evidence on every rating, a credit on every image and a
// caption on every capture, a valid https URL on every source, covers that resolve to an image,
// image files present, route phases whose covers resolve, figures with a known basis and publisher,
// credited payload lines and matrix rows with known publishers, and no orphaned media anywhere under public/media.
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
// Particles.svelte's modes (types.ts Ambient); a class without `ambient` falls back to its own id
const AMBIENTS = new Set(['land', 'sea', 'sky', 'gold', 'abyss', 'sift']);

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
  // a plate with a `base` takes the fields it leaves out from that plate, as src/branches/registry.ts does
  const raw = Object.fromEntries(dirs.map((d) => [d, read(`src/branches/${d}/entries.json`)]));
  const REF = /^[a-z0-9-]+\/[a-z0-9-]+$/; // exactly "branch/entry"
  const find = (ref) => { if (!REF.test(String(ref))) return undefined; const [b, id] = String(ref).split('/'); return raw[b]?.find((e) => e.id === id); };
  const INHERIT = ['kind', 'region', 'area', 'requires', 'routes', 'location', 'notes', 'variants', 'media', 'since'];

  for (const id of dirs) {
    const def = read(`src/branches/${id}/branch.json`);
    const entries = raw[id].map((e) => {
      const src = e.base ? find(e.base) : null;
      if (!src) return e;
      const out = { ...e };
      for (const k of INHERIT) if (out[k] === undefined) out[k] = src[k];
      const urls = new Set((e.sources ?? []).map((s) => s.url));
      out.sources = [...(e.sources ?? []), ...src.sources.filter((s) => !urls.has(s.url))];
      return out;
    });
    let images = 0, ratings = 0;
    const bad = (where, msg) => problems.push(`${id}/${where}: ${msg}`);
    const text = (where, v, field) => { if (typeof v !== 'string' || !v.trim()) bad(where, `${field} is empty`); };

    const image = (where, m, role, needCaption) => {
      if (!m) return;
      images++;
      if (typeof m.from === 'string' && m.from.startsWith('local:')) {
        // an in-game screenshot kept in tools/sources: a bare file name that exists there, nothing else
        const name = m.from.slice('local:'.length);
        if (!name || /[\\/]/.test(name) || name.includes('..')) bad(where, `${role} local source "${name}" must be a file name in tools/sources`);
        else if (!existsSync(join(ROOT, 'tools/sources', name))) bad(where, `${role} local source tools/sources/${name} is missing`);
      }
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

    for (const c of def.classes) {
      const mode = c.ambient ?? c.id;
      if (!AMBIENTS.has(mode)) bad(`class ${c.id}`, `ambient "${mode}" is not one of ${[...AMBIENTS].join(', ')}${c.ambient ? '' : ' (set ambient)'}`);
    }
    for (const e of entries) {
      for (const ref of [...(e.base ? [e.base] : []), ...(e.also ?? [])]) {
        if (!REF.test(String(ref))) bad(e.id, `"${ref}" is not "branch/entry"`);
        else if (String(ref).split('/')[0] === id) bad(e.id, `"${ref}" points into its own branch; cross-branch links name another branch`);
        else if (!find(ref)) bad(e.id, `"${ref}" names no plate`);
      }
      if (e.base && find(e.base)?.base) bad(e.id, `base "${e.base}" has a base of its own; point at the source plate`);
      if (!e.media) { bad(e.id, 'no media (and no base to take it from)'); continue; }
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
        if ('v' in v && 'note' in v) {
          // a patch-history step names its version, what changed, and who reported it
          if (!credits.publishers[v.by]) bad(e.id, `${where} publisher "${v.by}" is not in src/core/credits.json`);
          text(e.id, v.note, `${where} note`);
        }
        // any credited object names a known publisher; a credited line of text has text
        if (typeof v.by === 'string' && !credits.publishers[v.by]) bad(e.id, `${where} publisher "${v.by}" is not in src/core/credits.json`);
        if ('text' in v && 'by' in v) text(e.id, v.text, `${where} text`);
        // a payload `ref` is a plate in another branch (Materials' vessels); a payload `entry` is a plate here
        if (typeof v.ref === 'string' && (!REF.test(v.ref) || v.ref.split('/')[0] === id || !find(v.ref))) bad(e.id, `${where}.ref "${v.ref}" names no plate in another branch`);
        if (typeof v.entry === 'string' && !entries.some((o) => o.id === v.entry)) bad(e.id, `${where}.entry names unknown entry "${v.entry}"`);
        if ('label' in v && 'value' in v && 'basis' in v) {
          if (!BASES.has(v.basis)) bad(e.id, `${where} basis "${v.basis}" is not one of ${[...BASES].join(', ')}`);
          if (!credits.publishers[v.by]) bad(e.id, `${where} publisher "${v.by}" is not in src/core/credits.json`);
          text(e.id, v.value, `${where} value`);
        }
        for (const [k, x] of Object.entries(v)) {
          if ((k === 'stacks' || k === 'pairs') && Array.isArray(x)) for (const id of x) { if (!entries.some((o) => o.id === id)) bad(e.id, `${where}.${k} names unknown entry "${id}"`); }
          else payload(x, `${where}.${k}`);
        }
      };
      // a plate's inherited fields were checked on their own branch; only its own payload is checked here
      const own = raw[id].find((x) => x.id === e.id);
      for (const [k, v] of Object.entries(own)) if (!['media', 'tiers', 'sources', 'routes', 'base', 'also'].includes(k)) payload(v, k);
    }

    // a branch with kits.json (Mounts): every plate says what it carries and wears through a profile
    // that exists; every profile names its pieces, credits each line to a known publisher and links
    // its sources; a profile with no slots says why in a note; no profile sits unused
    if (existsSync(join(ROOT, 'src/branches', id, 'kits.json'))) {
      const { profiles } = read(`src/branches/${id}/kits.json`);
      const pub = (where, by) => { if (!credits.publishers[by]) bad(where, `publisher "${by}" is not in src/core/credits.json`); };
      for (const [pid, k] of Object.entries(profiles)) {
        const where = `kit ${pid}`;
        text(where, k.title, 'title');
        if (!k.carry || !('slots' in k.carry)) bad(where, 'no carry (say what it holds, or that nothing is documented)');
        text(where, k.carry?.label, 'carry label');
        for (const l of k.carry?.lines ?? []) { text(where, l.text, 'carry line'); pub(where, l.by); }
        for (const s of k.slots) {
          text(where, s.slot, 'slot name');
          text(where, s.raises, `${s.slot} effect`);
          pub(`${where}/${s.slot}`, s.by);
          if (!s.best && !s.early && !s.items?.length) bad(where, `${s.slot} names no piece`);
        }
        if (!k.slots.length && !k.notes.length) bad(where, 'no slots and no note saying why');
        if (!k.sources.length) bad(where, 'no sources');
        for (const s of k.sources) { pub(where, s.by); if (!/^https:\/\//.test(s.url)) bad(where, `source "${s.url}" is not https`); }
      }
      const usedKits = new Set();
      for (const e of raw[id]) {
        const pid = typeof e.kit === 'string' ? e.kit : e.kit?.profile;
        if (!pid) { bad(e.id, 'no kit: say what it carries and wears'); continue; }
        if (!profiles[pid]) { bad(e.id, `kit "${pid}" is not a profile in kits.json`); continue; }
        usedKits.add(pid);
        if (typeof e.kit === 'object' && e.kit.note !== undefined) text(e.id, e.kit.note, 'kit note');
      }
      for (const pid of Object.keys(profiles)) if (!usedKits.has(pid)) bad(`kit ${pid}`, 'no plate uses this profile');
    }

    // a branch with matrix.json (Materials' Sorter): the registry checks its structure; this checks its
    // evidence. Every mark is explained, every row credits a publisher and names its items once, every cell
    // credit is known and every note has text; a plate's manifest names a real column and real rows
    const mpath = join(ROOT, 'src/branches', id, 'matrix.json');
    if (existsSync(mpath)) {
      const mx = read(`src/branches/${id}/matrix.json`);
      text('matrix', mx.title, 'title');
      text('matrix', mx.blurb, 'blurb');
      for (const k of mx.marks) { text(`matrix mark ${k.id}`, k.label, 'label'); text(`matrix mark ${k.id}`, k.text, 'text'); }
      const colIds = new Set(mx.cols.map((c) => c.id));
      for (const c of mx.cols) if (c.entry && !entries.some((o) => o.id === c.entry)) bad(`matrix/${c.id}`, `column names unknown entry "${c.entry}"`);
      const rowIds = new Set();
      for (const sh of mx.sheets) {
        text(`matrix/${sh.id}`, sh.blurb, 'sheet blurb');
        for (const r of sh.rows) {
          const where = `matrix/${sh.id}/${r.id}`;
          rowIds.add(r.id);
          text(where, r.label, 'row label');
          if (!credits.publishers[r.by]) bad(where, `publisher "${r.by}" is not in src/core/credits.json`);
          if (r.note !== undefined) text(where, r.note, 'row note');
          if (r.stack !== undefined && !(Number.isInteger(r.stack) && r.stack > 0)) bad(where, `stack ${r.stack} is not a whole number of items`);
          for (const [it, n] of Object.entries(r.stackOf ?? {})) {
            if (!(Number.isInteger(n) && n > 0)) bad(where, `stackOf "${it}" ${n} is not a whole number of items`);
            if (n === r.stack) bad(where, `stackOf "${it}" repeats the family's stack`);
          }
          const seen = new Set();
          for (const it of r.items ?? []) {
            text(where, it, 'item');
            if (seen.has(it)) bad(where, `item "${it}" listed twice`);
            seen.add(it);
          }
          for (const [c, cell] of Object.entries(r.cells)) {
            if (typeof cell === 'string') continue;
            if (cell.by !== undefined && !credits.publishers[cell.by]) bad(`${where}/${c}`, `publisher "${cell.by}" is not in src/core/credits.json`);
            if (cell.note !== undefined) text(`${where}/${c}`, cell.note, 'cell note');
          }
        }
      }
      for (const e of raw[id]) {
        const man = e.manifest;
        if (!man) continue;
        if (man.col !== undefined && !colIds.has(man.col)) bad(e.id, `manifest.col "${man.col}" is not a matrix column`);
        for (const r of man.rows ?? []) if (!rowIds.has(r)) bad(e.id, `manifest.rows names unknown matrix row "${r}"`);
        if (man.col && !mx.cols.some((c) => c.id === man.col && c.entry === e.id)) bad(e.id, `manifest.col "${man.col}" is a column that names another plate`);
      }
    }

    // a cover resolves the way core/tree.ts coverFrom does: its own file, or an entry's capture,
    // portrait or hero (falling back to the portrait); it must end at an image
    const byId = new Map(entries.map((e) => [e.id, e]));
    const cover = (where, c) => {
      if (!c || (!c.src && !c.entry && !c.from)) return bad(where, 'no cover');
      if (c.src || c.from) return image(where, c, 'cover');
      const e = byId.get(c.entry);
      if (!e) return bad(where, `cover entry "${c.entry}" does not exist`);
      if (!e.media) return bad(where, `cover entry "${c.entry}" has no media`);
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
