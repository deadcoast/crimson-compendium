// npm run verify: the regression gate. It builds first, then checks the built site in a headless
// browser and exits non-zero on any failure. CI and the Release workflow run it.
//
//   data lint     content rules on every branch (tools/lint.mjs)
//   routes        every entry plate, leaf, category, category leaf, lens, redirect, the ladder and a
//                 branch's route, each checked for the right title, member count, images that load
//                 and the explorer row it selects
//   explorer      focus, arrows, Enter, type navigation, expand, filter, Esc; recent and outline;
//                 the phone drawer
//   accessibility axe-core on the first branch's four views plus every route and one plate per
//                 further branch; serious and critical findings fail
//   self-contained the site makes no request off its own origin and renders with its own fonts
//                 from file:// with the network cut
//
// CHROME_PATH points at a local Chrome when Playwright's own browser is not installed.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
import { preview } from 'vite';
import { chromium } from 'playwright';
import { lint } from './lint.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const AXE = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
/** QOL-03 in docs/IDENTIFIED.md: hash routes read as same-page links to axe; accepted. */
const AXE_ACCEPTED = new Set(['skip-link']);

// ── output ──────────────────────────────────────────────────────────────────────────────────
const tty = process.stdout.isTTY || !!process.env.CI;
const paint = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const dim = paint('2'), bold = paint('1'), red = paint('31'), green = paint('32'), crimson = paint('38;5;160');
const W = 78;
const t0 = Date.now();
const results = [];
function row(name, detail, problems) {
  const ok = problems.length === 0;
  results.push({ name, ok });
  const mark = ok ? green('ok') : red('FAIL');
  const lead = ` ${name.padEnd(14)} ${detail} `;
  const dots = '.'.repeat(Math.max(2, W - lead.length - 5));
  console.log(`${lead}${dim(dots)} ${mark}`);
  for (const p of problems.slice(0, 12)) console.log(`   ${red('·')} ${p}`);
  if (problems.length > 12) console.log(`   ${red('·')} ${dim(`…and ${problems.length - 12} more`)}`);
}
const rule = () => console.log(dim(' ' + '─'.repeat(W - 1)));

const version = read('package.json').version;
let sha = '';
try { sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch {}
console.log(`\n ${crimson(bold('CRIMSON'))} ${bold('COMPENDIUM')}  ${dim('verify')}${' '.repeat(Math.max(1, W - 33 - version.length - sha.length))}${dim(`v${version}${sha ? ' · ' + sha : ''}`)}`);
rule();

// ── data lint ───────────────────────────────────────────────────────────────────────────────
{
  const { summary, problems } = lint();
  const s = summary.map((b) => `${b.branch} · ${b.entries} entries · ${b.ratings} ratings · ${b.images} images`).join('; ');
  row('data lint', s, problems);
}

// ── expectations from the data, resolved the way the registry resolves them ─────────────────
const shares = (want, have) => !want || want.some((v) => have.includes(v));
const tierOf = (e, m) => {
  if (m === 'overall') {
    const r = Object.values(e.tiers).map((t) => t.tier).filter((t) => t !== null);
    return r.length ? r.reduce((a, b) => a + b, 0) / r.length : 9;
  }
  return e.tiers[m]?.tier ?? 9;
};
const matches = (e, w) => shares(w.cls, [e.cls]) && shares(w.domains, e.domains) && shares(w.tags, e.tags) && (!w.atMost || tierOf(e, w.atMost.metric) <= w.atMost.tier);

const branches = readdirSync(join(ROOT, 'src/branches'))
  .filter((d) => existsSync(join(ROOT, 'src/branches', d, 'branch.json')))
  .map((id) => {
    const def = read(`src/branches/${id}/branch.json`);
    const entries = read(`src/branches/${id}/entries.json`);
    const lists = []; // [route, title, count]
    for (const l of def.leaves) lists.push([l.id, l.label, entries.filter((e) => e.leaf === l.id).length]);
    for (const c of def.categories) {
      const mem = entries.filter((e) => matches(e, c.where));
      lists.push([c.id, c.label, mem.length]);
      const leaves = c.leaves === 'rarity'
        ? def.leaves.map((l) => [l.id, l.label, mem.filter((e) => e.leaf === l.id).length])
        : c.leaves.map((l) => [l.id, l.label, mem.filter((e) => matches(e, l.where)).length]);
      for (const [lid, label, n] of leaves) if (n) lists.push([`${c.id}-${lid}`, label, n]);
    }
    for (const l of def.lenses) lists.push([`for-${l.id}`, l.label, entries.filter((e) => matches(e, l.where)).length]);
    return { id, def, entries, lists };
  });

// ── browser ─────────────────────────────────────────────────────────────────────────────────
// appType 'mpa': a missing file is a 404, not the SPA fallback page with a 200
const server = await preview({ root: ROOT, appType: 'mpa', logLevel: 'silent', preview: { port: 4317, strictPort: false, open: false } });
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const origin = new URL(base).origin;
let browser;
try {
  browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
} catch (e) {
  console.log(`\n ${red('no browser to verify with.')} Run ${bold('npx playwright install chromium')} once, or set CHROME_PATH to a Chrome binary.\n ${dim(String(e.message ?? e).split('\n')[0])}\n`);
  await new Promise((r) => server.httpServer.close(r));
  process.exit(1);
}
const external = [];
const errors = [];

async function open(viewport) {
  const ctx = await browser.newContext({ viewport });
  // the site must not reach off its own origin: anything else is recorded and refused
  await ctx.route('**/*', (r) => {
    const u = r.request().url();
    let own = u.startsWith('data:');
    try { own ||= new URL(u).origin === origin; } catch {}
    if (own) return r.continue();
    external.push(u);
    return r.abort();
  });
  const pg = await ctx.newPage();
  pg.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  pg.on('pageerror', (e) => errors.push(String(e)));
  return pg;
}
const go = async (pg, hash) => pg.evaluate((h) => { location.hash = h; }, hash);
const text = (pg, sel) => pg.evaluate((s) => document.querySelector(s)?.textContent.trim() ?? null, sel);
const waitText = (pg, sel, want) =>
  pg.waitForFunction(([s, w]) => document.querySelector(s)?.textContent.trim() === w, [sel, want], { timeout: 6000 }).then(() => true, () => false);

let failed = false;
try {
  const pg = await open({ width: 1440, height: 900 });
  await pg.goto(`${base}/#${branches[0].id}`, { waitUntil: 'networkidle' });

  for (const b of branches) {
    // entry plates
    {
      const problems = [];
      let images = 0;
      for (const e of b.entries) {
        await go(pg, `${b.id}-${e.id}`);
        const ok = await pg
          .waitForFunction((n) => document.querySelector('.hero h2')?.getAttribute('aria-label') === n, e.name, { timeout: 6000 })
          .then(() => true, () => false);
        if (!ok) { problems.push(`${e.id}: plate title is "${await pg.evaluate(() => document.querySelector('.hero h2')?.getAttribute('aria-label'))}"`); continue; }
        const codes = await pg.evaluate(async () =>
          Promise.all([...document.querySelectorAll('.plate img')].map((i) => fetch(i.getAttribute('src'))
            .then((r) => [i.getAttribute('src'), r.ok && (r.headers.get('content-type') ?? '').startsWith('image/') ? 'ok' : `${r.status} ${r.headers.get('content-type')}`]))));
        images += codes.length;
        if (!codes.length) problems.push(`${e.id}: plate shows no images`);
        for (const [src, got] of codes) if (got !== 'ok') problems.push(`${e.id}: ${src} → ${got}`);
        const sel = await text(pg, '[role=tree] [aria-selected=true]');
        if (!sel?.includes(e.name)) problems.push(`${e.id}: explorer selects "${sel}"`);
      }
      row('plates', `${b.id} · ${b.entries.length} plates · ${images} images load`, problems);
    }

    // lists: leaves, categories, category leaves, lenses
    {
      const problems = [];
      for (const [route, title, n] of b.lists) {
        await go(pg, `${b.id}-${route}`);
        if (!(await waitText(pg, '.index .title', title))) { problems.push(`${route}: title "${await text(pg, '.index .title')}", want "${title}"`); continue; }
        const items = await pg.evaluate(() => document.querySelectorAll('.index .item').length);
        if (items !== n) problems.push(`${route}: ${items} rows, want ${n}`);
        // the cover decodes after the title lands, so wait for it rather than sampling once
        const cover = await pg
          .waitForFunction(() => { const i = document.querySelector('.index .cover img'); return !!i && i.complete && i.naturalWidth > 0; }, null, { timeout: 6000 })
          .then(() => true, () => false);
        if (!cover) problems.push(`${route}: cover image missing or did not load (${await pg.evaluate(() => document.querySelector('.index .cover img')?.getAttribute('src') ?? 'no <img>')})`);
        const sel = await text(pg, '[role=tree] [aria-selected=true]');
        if (!sel?.startsWith(title)) problems.push(`${route}: explorer selects "${sel}"`);
      }
      row('lists', `${b.id} · ${b.lists.length} leaves, categories and lenses`, problems);
    }

    // redirects and the ladder
    {
      const problems = [];
      const titles = new Map(b.lists.map(([r, t]) => [r, t]));
      const names = new Map(b.entries.map((e) => [e.id, e.name]));
      for (const [from, to] of Object.entries(b.def.redirects ?? {})) {
        await go(pg, `${b.id}-${from}`);
        if (names.has(to)) {
          // a retired plate redirects to the plate that replaced it
          const ok = await pg
            .waitForFunction((n) => document.querySelector('.hero h2')?.getAttribute('aria-label') === n, names.get(to), { timeout: 6000 })
            .then(() => true, () => false);
          if (!ok) problems.push(`${from}: lands on plate "${await pg.evaluate(() => document.querySelector('.hero h2')?.getAttribute('aria-label'))}", want "${names.get(to)}"`);
        } else if (!(await waitText(pg, '.index .title', titles.get(to)))) problems.push(`${from}: lands on "${await text(pg, '.index .title')}", want "${titles.get(to)}"`);
      }
      await go(pg, `${b.id}-ladder`);
      if (!(await waitText(pg, '.ladder h1', 'Tier Ladder'))) problems.push('ladder did not open');
      const tokens = await pg.evaluate(() => document.querySelectorAll('.ladder img').length);
      if (!tokens) problems.push('ladder shows no tokens');
      row('redirects', `${b.id} · ${Object.keys(b.def.redirects ?? {}).length} redirects · ladder ${tokens} tokens`, problems);
    }

    // the route: the branch root opens on it, every phase renders with its cover, every step links its plate
    if (b.def.route) {
      const problems = [];
      const r = b.def.route;
      await go(pg, `${b.id}-route`);
      await go(pg, b.id);
      if (!(await waitText(pg, '.route h1', r.title))) problems.push(`#${b.id} does not open the route (h1 "${await text(pg, '.route h1')}")`);
      // phases in order, and each phase's links in its own step order (steps, then meanwhile)
      const got = await pg.evaluate(() => [...document.querySelectorAll('.route .phase')].map((p) => ({
        label: p.querySelector('h2')?.textContent.trim(),
        links: [...p.querySelectorAll('.steps a[href], .meanwhile a[href]')].map((a) => a.getAttribute('href')),
      })));
      if (got.length !== r.phases.length) problems.push(`${got.length} phases, want ${r.phases.length}`);
      let want = 0;
      r.phases.forEach((ph, i) => {
        if (got[i]?.label !== ph.label) problems.push(`phase ${i + 1} reads "${got[i]?.label}", want "${ph.label}"`);
        const links = [...ph.steps, ...(ph.meanwhile ?? [])].filter((st) => st.entry).map((st) => `#${b.id}-${st.entry}`);
        want += links.length;
        if (JSON.stringify(got[i]?.links) !== JSON.stringify(links)) problems.push(`phase ${i + 1} links ${JSON.stringify(got[i]?.links)}, want ${JSON.stringify(links)}`);
      });
      // covers load lazily: scroll the route through, then require every cover to have decoded
      await pg.evaluate(async () => {
        const p = document.querySelector('.route');
        for (let y = 0; y <= p.scrollHeight; y += p.clientHeight * 0.6) { p.scrollTop = y; await new Promise((res) => setTimeout(res, 120)); }
      });
      const covers = await pg
        .waitForFunction((n) => [...document.querySelectorAll('.route .cover img')].filter((i) => i.complete && i.naturalWidth > 0).length === n,
          r.phases.filter((ph) => ph.cover).length, { timeout: 8000 })
        .then(() => true, () => false);
      if (!covers) problems.push(`covers did not all load (${await pg.evaluate(() => [...document.querySelectorAll('.route .cover img')].filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.getAttribute('src')).join(', '))})`);
      const sel = await text(pg, '[role=tree] [aria-selected=true]');
      if (!sel?.startsWith(r.title)) problems.push(`explorer selects "${sel}"`);
      // the rail follows the reader: back at the top the first phase is current; a rail click jumps
      // to the last phase, and the rail marks it once the scroll lands
      await pg.evaluate(() => { const p = document.querySelector('.route'); p.style.scrollBehavior = 'auto'; p.scrollTop = 0; p.style.scrollBehavior = ''; });
      const current = (n) => pg.waitForFunction((k) => document.querySelector(`.rail li:nth-child(${k}) button`)?.getAttribute('aria-current') === 'step', n, { timeout: 5000 }).then(() => true, () => false);
      if (!(await current(1))) problems.push('rail does not mark phase 1 at the top');
      else {
        await pg.click('.rail li:last-child button');
        if (!(await current(r.phases.length))) problems.push('rail does not mark the phase it jumps to');
        const top = await pg.evaluate(() => document.querySelector('.route').scrollTop);
        if (top < 200) problems.push('rail click did not scroll the route');
      }
      row('route', `${b.id} · ${got.length} phases in order · ${want} step links`, problems);
    }
  }

  // switching branches straight from one ladder or route to another's keeps each on its own data
  if (branches.length > 1) {
    const problems = [];
    for (const [from, to] of [[branches[0], branches[1]], [branches[1], branches[0]]]) {
      await go(pg, `${from.id}-ladder`);
      await waitText(pg, '.ladder h1', 'Tier Ladder');
      await go(pg, `${to.id}-ladder`);
      const tab = to.def.metrics[0].label;
      if (!(await waitText(pg, '.ladder .metrics [aria-selected=true]', tab))) problems.push(`${from.id} → ${to.id} ladder selects "${await text(pg, '.ladder .metrics [aria-selected=true]')}", want "${tab}"`);
    }
    // a list remembered in one branch is not reused in the other: L from a ladder returns to a list of this branch
    const r = branches.find((x) => x.def.route);
    if (r) {
      await go(pg, `${branches[0].id}-${branches[0].def.leaves.at(-1).id}`);
      await waitText(pg, '.index .title', branches[0].def.leaves.at(-1).label);
      await go(pg, `${r.id}-ladder`);
      await waitText(pg, '.ladder h1', 'Tier Ladder');
      await pg.keyboard.press('l');
      if (!(await waitText(pg, '.index .title', r.def.leaves[0].label))) problems.push(`L from the ${r.id} ladder lands on "${await text(pg, '.index .title')}", want "${r.def.leaves[0].label}"`);
    }
    row('branch switch', `ladders keep their own metrics · L returns within the branch`, problems);
  }

  // explorer and stepping (first branch; the explorer is shared)
  {
    const b = branches[0];
    const problems = [];
    const expect = (cond, msg) => { if (!cond) problems.push(msg); };
    // J and K step through the open list and keep its context (the title stays the list's)
    const firstCat = b.def.categories[0];
    await go(pg, `${b.id}-${firstCat.id}`);
    await waitText(pg, '.index .title', firstCat.label);
    const plateName = () => pg.evaluate(() => document.querySelector('.hero h2')?.getAttribute('aria-label'));
    const n0 = await plateName();
    await pg.keyboard.press('j');
    await pg.waitForFunction((n) => document.querySelector('.hero h2')?.getAttribute('aria-label') !== n, n0, { timeout: 3000 }).catch(() => {});
    const n1 = await plateName();
    expect(n1 && n1 !== n0, `J does not step to the next mount (still "${n0}")`);
    expect((await text(pg, '.index .title')) === firstCat.label, `J left the ${firstCat.label} list`);
    await pg.keyboard.press('k');
    await pg.waitForFunction((n) => document.querySelector('.hero h2')?.getAttribute('aria-label') === n, n0, { timeout: 3000 }).catch(() => {});
    expect((await plateName()) === n0, `K does not step back to "${n0}"`);
    expect((await text(pg, '.index .title')) === firstCat.label, `K left the ${firstCat.label} list`);

    const leaf = b.def.leaves[0];
    await go(pg, `${b.id}-${leaf.id}`);
    await waitText(pg, '.index .title', leaf.label);
    await pg.keyboard.press('Alt+\\');
    await pg.waitForTimeout(200);
    const active = () => pg.evaluate(() => document.querySelector('[role=tree]').getAttribute('aria-activedescendant'));
    expect((await pg.evaluate(() => document.activeElement?.getAttribute('role'))) === 'tree', 'Alt+\\ does not focus the tree');
    const a0 = await active();
    await pg.keyboard.press('ArrowDown');
    await pg.keyboard.press('ArrowDown');
    const a1 = await active();
    expect(a0 && a1 && a0 !== a1, 'arrows do not move the focused row');
    const before = await pg.evaluate(() => location.hash);
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(300);
    expect((await pg.evaluate(() => location.hash)) !== before, 'Enter does not open the focused row');
    await pg.keyboard.press('ArrowLeft');
    await pg.keyboard.press('ArrowLeft');
    await pg.waitForTimeout(150);
    expect((await active()) === a0, '← ← does not return to the parent folder');
    const target = b.def.categories.find((c) => c.label.length > 3) ?? firstCat;
    await pg.keyboard.type(target.label.slice(0, 3).toLowerCase());
    await pg.waitForTimeout(150);
    const typed = await pg.evaluate(() => document.getElementById(document.querySelector('[role=tree]').getAttribute('aria-activedescendant'))?.textContent.trim());
    expect(typed?.startsWith(target.label), `typing "${target.label.slice(0, 3).toLowerCase()}" focuses "${typed}"`);
    await pg.keyboard.press('ArrowRight');
    await pg.waitForTimeout(200);
    const expanded = await pg.evaluate(() => document.getElementById(document.querySelector('[role=tree]').getAttribute('aria-activedescendant'))?.getAttribute('aria-expanded'));
    expect(expanded === 'true', '→ does not expand the focused folder');

    const probe = b.entries.find((e) => e.name.split(' ').length > 1) ?? b.entries[0];
    const word = probe.name.split(' ').pop().toLowerCase();
    const rowsBefore = await pg.evaluate(() => document.querySelectorAll('[role=tree] [role=treeitem]').length);
    await pg.keyboard.press('Control+f');
    await pg.waitForTimeout(250);
    await pg.keyboard.type(word);
    await pg.waitForTimeout(300);
    const marks = await pg.evaluate(() => document.querySelectorAll('[role=tree] mark').length);
    expect(marks > 0, `filter "${word}" marks nothing`);
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(400);
    const opened = await pg.evaluate(() => location.hash.slice(1));
    expect(b.entries.some((e) => opened === `${b.id}-${e.id}` && e.name.toLowerCase().includes(word)), `filter Enter opens "${opened}"`);
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(250);
    const rowsAfter = await pg.evaluate(() => document.querySelectorAll('[role=tree] [role=treeitem]').length);
    expect(rowsAfter >= rowsBefore - 1, `Esc leaves the tree filtered (${rowsAfter} rows, ${rowsBefore} before)`);

    const recent = await pg.evaluate(() => [...document.querySelectorAll('.recent .nm')].map((e) => e.textContent));
    const openedName = b.entries.find((e) => opened === `${b.id}-${e.id}`)?.name;
    expect(recent[0] === openedName, `recent starts with "${recent[0]}", want "${openedName}"`);
    const outline = await pg.evaluate(() => [...document.querySelectorAll('.outline .row .label')].map((e) => e.textContent));
    expect(outline[0] === openedName && outline.length >= 4, `outline reads ${JSON.stringify(outline)}`);
    row('explorer', 'keys · type-nav · filter · recent · outline · J/K', problems);
  }

  // phone: the explorer is a drawer
  {
    const problems = [];
    const ph = await open({ width: 390, height: 844 });
    const b = branches[0];
    await ph.goto(`${base}/#${b.id}-${b.entries[0].id}`, { waitUntil: 'networkidle' });
    const shown = () => ph.evaluate(() => { const r = document.querySelector('[role=tree]')?.getBoundingClientRect(); return !!r && r.right > 0 && r.left < innerWidth; });
    if (await shown()) problems.push('drawer is open before it is asked for');
    await ph.click('button[aria-label="Open tree"]');
    await ph.waitForTimeout(500);
    if (!(await shown())) problems.push('Open tree does not show the explorer');
    await ph.keyboard.press('Escape');
    await ph.waitForTimeout(500);
    if (await shown()) problems.push('Esc does not close the drawer');
    await ph.keyboard.press('Alt+\\');
    await ph.waitForTimeout(500);
    if (!(await shown())) problems.push('Alt+\\ does not open the drawer');
    row('phone', '390 × 844 · drawer opens, closes, summons', problems);
    await ph.context().close();
  }

  // accessibility
  {
    const problems = [];
    const b = branches[0];
    const views = [
      [`${b.id}-${b.entries[0].id}`, { width: 1440, height: 900 }],
      [`${b.id}-ladder`, { width: 1440, height: 900 }],
      [`${b.id}-${b.def.categories[0].id}`, { width: 390, height: 844 }],
      [`${b.id}-${b.def.categories.at(-1).id}`, { width: 1440, height: 900 }],
      // every further branch: its route on desktop and phone, and a plate with its own sections
      ...branches.slice(1).flatMap((o) => [
        ...(o.def.route ? [[`${o.id}-route`, { width: 1440, height: 900 }], [`${o.id}-route`, { width: 390, height: 844 }]] : []),
        [`${o.id}-${o.entries[0].id}`, { width: 1440, height: 900 }],
      ]),
    ];
    let checked = 0;
    for (const [hash, vp] of views) {
      const a = await open(vp);
      await a.goto(`${base}/#${hash}`, { waitUntil: 'networkidle' });
      await a.waitForTimeout(1500);
      // sections reveal as they scroll into view (opacity 0 until then, which axe skips), so scroll
      // every pane through to the end and let the reveals finish before auditing
      await a.evaluate(async () => {
        const panes = [...document.querySelectorAll('.plate, .ladder, .route, .index .scroll')].filter((p) => p.scrollHeight > p.clientHeight);
        for (const p of panes) {
          // jump, don't glide: a smooth-scrolling pane (the route) can still be travelling when the sweep ends
          p.style.scrollBehavior = 'auto';
          for (let y = 0; y <= p.scrollHeight; y += p.clientHeight * 0.7) { p.scrollTop = y; await new Promise((r) => setTimeout(r, 140)); }
          p.scrollTop = p.scrollHeight;
          await new Promise((r) => setTimeout(r, 140));
        }
      });
      await a.waitForTimeout(1200);
      const hidden = await a.evaluate(() => [...document.querySelectorAll('.reveal')].filter((n) => getComputedStyle(n).opacity === '0' && n.getClientRects().length).map((n) => n.getAttribute('data-outline') ?? n.className.split(' ')[0]));
      if (hidden.length) problems.push(`${hash} @${vp.width}: ${hidden.length} section(s) never revealed, so axe could not read them (${hidden.join(', ')})`);
      await a.addScriptTag({ content: AXE });
      const v = await a.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations
        .map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, at: x.nodes[0]?.target.join(' ') })));
      for (const x of v) {
        if (AXE_ACCEPTED.has(x.id) || !['serious', 'critical'].includes(x.impact)) continue;
        problems.push(`${hash} @${vp.width}: ${x.impact} ${x.id} ×${x.n} (${x.at})`);
      }
      checked++;
      await a.context().close();
    }
    row('accessibility', `axe-core · ${checked} views · serious and critical`, problems);
  }

  // self-contained: no off-origin requests anywhere above; fonts load from file:// with no network
  {
    const problems = [...new Set(external)].map((u) => `requested ${u}`);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.route(/^https?:/, (r) => r.abort());
    const f = await ctx.newPage();
    const ferr = [];
    f.on('pageerror', (e) => ferr.push(String(e)));
    await f.goto(pathToFileURL(join(ROOT, 'dist/index.html')).href + `#${branches[0].id}-${branches[0].entries[0].id}`);
    await f.waitForTimeout(1500);
    const fonts = await f.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((x) => x.status === 'loaded').map((x) => `${x.family} ${x.style}`); });
    for (const want of ['Bodoni Moda normal', 'Bodoni Moda italic', 'Archivo normal', 'JetBrains Mono normal']) if (!fonts.includes(want)) problems.push(`file:// did not load ${want}`);
    if (!(await f.evaluate(() => !!document.querySelector('.hero h2')))) problems.push('file:// did not render a plate');
    for (const e of ferr) problems.push(`file:// ${e}`);
    row('self-contained', `no off-origin requests · file:// offline · ${fonts.length} faces`, problems);
    await ctx.close();
  }

  row('console', 'errors across every page above', [...new Set(errors)]);
} catch (e) {
  failed = true;
  console.log(`\n ${red('verify crashed:')} ${e.stack ?? e}`);
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}

rule();
const bad = results.filter((r) => !r.ok).length;
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(` ${results.length} checks · ${bad ? red(`${bad} failed`) : green('0 failed')} · ${secs}s\n`);
process.exit(bad || failed ? 1 : 0);
