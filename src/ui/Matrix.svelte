<script lang="ts">
  // A branch's matrix (#<branch>-<id>): rows against columns, one mark per cell, over one or more sheets.
  // Materials uses it as the Sorter: item families against every place that holds items ("where it goes")
  // and mechanics against the same places ("what reads it"). A search finds the row an item belongs to and
  // answers in one line; a readout pinned to the bottom explains whatever cell the pointer or the keyboard is
  // on. Column heads are the plates that explain each place. On a phone the grid becomes one card per row.
  // Naval uses it as the Slipway: value cells (a number printed, shaded against its column), heads that sort,
  // rows that link to their plates, and a search that also finds a column and totals it.
  import { app } from '../core/state.svelte';
  import { href, mediaUrl } from '../core/tree';
  import { PUBLISHERS } from '../core/format';
  import type { Branch, MatrixCell, MatrixCol, MatrixRow, MatrixSheet } from '../core/types';
  import Glyph from './Glyph.svelte';
  import Mark from './Mark.svelte';

  let { branch }: { branch: Branch } = $props();

  const m = $derived(branch.matrix!);
  let sheetId = $state(''); // '' is the first sheet
  const sheet = $derived(m.sheets.find((s) => s.id === sheetId) ?? m.sheets[0]);
  const cols = $derived((sheet.cols ?? m.cols.map((c) => c.id)).map((id) => m.cols.find((c) => c.id === id)!).filter(Boolean));
  const findCols = $derived(!!m.find?.cols);
  const searchable = $derived(sheet.rows.some((r) => r.items?.length) || findCols);
  const blank = $derived(m.blank ?? 'No source puts it here.');
  const itemCount = $derived(sheet.rows.reduce((n, r) => n + (r.items?.length ?? 0), 0));

  // the palette can hand over an item to look up; take it once, on the sheet that names it (the reader may
  // be on a sheet with no items, and this view stays mounted while the branch does)
  let q = $state(app.matrixQuery);
  $effect(() => {
    const want = app.matrixQuery;
    if (!want) return;
    const named = (sh: MatrixSheet) => sh.rows.some((r) => r.items?.some((i) => norm(i) === norm(want)));
    const withItems = (sh: MatrixSheet) => sh.rows.some((r) => r.items?.length);
    const target = m.sheets.find(named) ?? m.sheets.find(withItems);
    if (target && target.id !== sheet.id) sheetId = target.id;
    q = want;
    app.matrixQuery = '';
  });

  const markOf = (c?: MatrixCell) => (!c ? '' : typeof c === 'string' ? c : c.mark);
  const noteOf = (c?: MatrixCell) => (c && typeof c === 'object' ? c.note : undefined);
  const byOf = (r: MatrixRow, c?: MatrixCell) => (c && typeof c === 'object' && c.by) || r.by;
  const valOf = (c?: MatrixCell) => (c && typeof c === 'object' ? c.v : undefined);
  const numOf = (c?: MatrixCell) => (c && typeof c === 'object' ? c.n : undefined);
  const markDef = (id: string) => m.marks.find((x) => x.id === id);
  const entryOf = (c: MatrixCol) => (c.entry ? branch.byId.get(c.entry) : undefined);
  const rowEntry = (r: MatrixRow) => (r.entry ? branch.byId.get(r.entry) : undefined);

  const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ­]/g, '').replace(/[’‘]/g, "'").trim();
  /** rows the query matches, each with the item names it matched (or none when the family name matched) */
  const matches = $derived.by(() => {
    const t = norm(q);
    if (!t || !searchable) return new Map<string, string[]>();
    const out = new Map<string, string[]>();
    for (const r of sheet.rows) {
      const items = (r.items ?? []).filter((i) => norm(i).includes(t));
      if (items.length || norm(r.label).includes(t)) out.set(r.id, items);
    }
    return out;
  });
  const answers = $derived(sheet.rows.filter((r) => matches.has(r.id)).slice(0, 4));
  /** columns the query names (a material), each with the rows that have a cell there and their total */
  const colHits = $derived.by(() => {
    const t = norm(q);
    if (!t || !findCols) return [];
    return cols
      .filter((c) => named(c, t))
      .map((c) => {
        const rows = sheet.rows.filter((r) => r.cells[c.id]);
        return { col: c, rows, total: c.sum ? rows.reduce((n, r) => n + (numOf(r.cells[c.id]) ?? 0), 0) : undefined };
      })
      .filter((h) => h.rows.length)
      .slice(0, 2);
  });
  const lit = (r: MatrixRow) => matches.has(r.id) || colHits.some((h) => r.cells[h.col.id]);
  const named = (c: MatrixCol, t: string) => norm(c.label).includes(t) || (!!c.short && norm(c.short).includes(t));
  /** other sheets with a column the query names, when this sheet has none (a material asked on the stats) */
  const elsewhere = $derived.by(() => {
    const t = norm(q);
    if (!t || !findCols || colHits.length) return [];
    return m.sheets.filter((sh) => sh.id !== sheet.id && (sh.cols ?? m.cols.map((c) => c.id)).some((id) => { const c = m.cols.find((x) => x.id === id); return !!c && named(c, t); }));
  });
  const found = (c: MatrixCol) => colHits.some((h) => h.col.id === c.id);
  const miss = $derived(m.find ? m.find.miss.replace('{q}', q) : `Nothing named “${q}”. Try a family: “ore”, “fish”, “meal”.`);

  // sorting: a head cycles from its better end (largest, or smallest for a cost) to the other, then off
  let sortBy = $state<{ col: string; dir: 1 | -1 } | null>(null);
  function sortOn(c: MatrixCol) {
    const first: 1 | -1 = c.low ? 1 : -1;
    if (!sortBy || sortBy.col !== c.id) sortBy = { col: c.id, dir: first };
    else if (sortBy.dir === first) sortBy = { col: c.id, dir: first === 1 ? -1 : 1 };
    else sortBy = null;
  }
  /** row indices in display order: the sheet's, or by the sorted column's numbers with blanks last */
  const order = $derived.by(() => {
    const idx = sheet.rows.map((_, i) => i);
    if (!sortBy) return idx;
    const { col, dir } = sortBy;
    return idx.sort((a, b) => {
      const x = numOf(sheet.rows[a].cells[col]);
      const y = numOf(sheet.rows[b].cells[col]);
      if (x === undefined || y === undefined) return x === y ? a - b : x === undefined ? 1 : -1;
      return (x - y) * dir || a - b;
    });
  });
  const sortLabel = (c: MatrixCol) => (sortBy?.col !== c.id ? '↕' : sortBy.dir === 1 ? '↑' : '↓');
  // the phone cards have no heads, so a select picks the column, from its better end
  const sortKey = $derived(sortBy ? `${sortBy.col}:${sortBy.dir}` : '');
  function sortPick(v: string) {
    if (!v) { sortBy = null; return; }
    const [col, d] = v.split(':');
    sortBy = { col, dir: d === '1' ? 1 : -1 };
  }

  // shading: each value against the largest in its column
  const colMax = $derived.by(() => {
    const out: Record<string, number> = {};
    if (sheet.heat) for (const c of cols) out[c.id] = Math.max(0, ...sheet.rows.map((r) => numOf(r.cells[c.id]) ?? 0));
    return out;
  });
  const heatOf = (r: MatrixRow, c: MatrixCol) => {
    const n = numOf(r.cells[c.id]);
    return n !== undefined && colMax[c.id] ? n / colMax[c.id] : undefined;
  };

  // rows in display order, with a group heading wherever the group changes (none while sorted)
  type Line = { kind: 'group'; label: string } | { kind: 'row'; row: MatrixRow; i: number };
  const lines = $derived.by(() => {
    const out: Line[] = [];
    let last: string | undefined;
    for (const i of order) {
      const row = sheet.rows[i];
      if (!sortBy && row.group && row.group !== last) out.push({ kind: 'group', label: row.group });
      last = row.group;
      out.push({ kind: 'row', row, i });
    }
    return out;
  });

  /** a row's placements by mark, in the legend's order, for answers and phone cards */
  function placements(r: MatrixRow) {
    return m.marks
      .map((mk) => ({ mark: mk, cols: cols.filter((c) => markOf(r.cells[c.id]) === mk.id) }))
      .filter((p) => p.cols.length);
  }

  // the cell under the pointer or the keyboard; a click pins it
  let hover = $state<{ r: number; c: number } | null>(null);
  let pinned = $state<{ r: number; c: number } | null>(null);
  let focus = $state({ r: 0, c: 0 });
  const at = $derived(hover ?? pinned);
  const atRow = $derived(at ? sheet.rows[at.r] : undefined);
  const atCol = $derived(at ? cols[at.c] : undefined);
  const atCell = $derived(atRow && atCol ? atRow.cells[atCol.id] : undefined);
  $effect(() => { void sheetId; void m; hover = null; pinned = null; focus = { r: 0, c: 0 }; sortBy = null; });

  let table: HTMLTableElement | undefined = $state();
  // the toolbar's real height (it wraps on narrow screens), so the column heads pin right under it
  let barH = $state(54);
  function move(ev: KeyboardEvent) {
    const d: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    let next: { r: number; c: number } | undefined;
    // up and down follow the rows as shown, which a sort reorders
    const pos = order.indexOf(focus.r);
    if (d[ev.key]) next = { r: order[Math.max(0, Math.min(order.length - 1, pos + d[ev.key][0]))], c: Math.max(0, Math.min(cols.length - 1, focus.c + d[ev.key][1])) };
    else if (ev.key === 'Home') next = { r: focus.r, c: 0 };
    else if (ev.key === 'End') next = { r: focus.r, c: cols.length - 1 };
    if (!next) return;
    ev.preventDefault();
    focus = next;
    pinned = next;
    table?.querySelector<HTMLButtonElement>(`button[data-r="${next.r}"][data-c="${next.c}"]`)?.focus();
  }
  function pick(r: number, c: number) {
    focus = { r, c };
    pinned = pinned && pinned.r === r && pinned.c === c ? null : { r, c };
  }
  // the search jumps to the first row it finds
  $effect(() => {
    const first = answers[0];
    if (!first || !table) return;
    const r = sheet.rows.indexOf(first);
    queueMicrotask(() => table?.querySelector(`tr[data-row="${r}"]`)?.scrollIntoView({ block: 'nearest', behavior: app.reducedMotion ? 'auto' : 'smooth' }));
  });

  const stackLabel = (r: MatrixRow) => (r.stack ? `×${r.stack}` : '');
  /** an item's stack: its own where it differs from the family's */
  const stackOf = (r: MatrixRow, item: string) => r.stackOf?.[item] ?? r.stack;
  /** "item family" → "item families", "mechanic" → "mechanics" */
  const plural = (w: string, n: number) => (n === 1 ? w : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : /(s|x|ch|sh)$/.test(w) ? `${w}es` : `${w}s`);
</script>


<section class="matrix" aria-label={m.title} data-accent={branch.accent ?? 'crimson'} style:--bar-h="{barH}px">
  <header class="head">
    <p class="eyebrow crumbs"><a href={href.branch(branch)}>{branch.title}</a><span>/</span><span>{sheet.label}</span></p>
    <h1 class="display">{m.title}</h1>
    <p class="blurb">{m.blurb}</p>
    <ol class="legend" aria-label="Marks">
      {#each m.marks as mk, i (mk.id)}
        <li style:--i={i}><Mark id={mk.id} /><b>{mk.label}</b><span>{mk.text}</span></li>
      {/each}
      <li style:--i={m.marks.length}><span class="blank" aria-hidden="true"></span><b>Blank</b><span>{blank}</span></li>
    </ol>
  </header>

  <div class="bar" bind:offsetHeight={barH}>
    <div class="tabs" role="tablist" aria-label="Sheets">
      {#each m.sheets as s (s.id)}
        <button role="tab" aria-selected={s.id === sheet.id} class:on={s.id === sheet.id} onclick={() => (sheetId = s.id)}>
          {s.label}<span class="mono">{s.rows.length}</span>
        </button>
      {/each}
    </div>
    {#if searchable}
      <label class="find">
        <Glyph name="search" size={15} />
        <span class="sr-only">{m.find ? 'Find' : 'Find an item'}</span>
        <input bind:value={q} placeholder={m.find?.placeholder ?? 'Find an item — “fruit fly”, “azurite”, “hay”'} autocomplete="off" spellcheck="false" />
        {#if q}<button class="clear" onclick={() => (q = '')} aria-label="Clear search"><Glyph name="close" size={13} /></button>{/if}
      </label>
    {/if}
    {#if sheet.sort}
      <label class="sortby">
        <span class="eyebrow">Sort</span>
        <select value={sortKey} onchange={(ev) => sortPick(ev.currentTarget.value)}>
          <option value="">As listed</option>
          {#each cols as c (c.id)}<option value="{c.id}:{c.low ? 1 : -1}">{c.label}, {c.low ? 'least' : 'most'} first</option>{/each}
        </select>
      </label>
    {/if}
    <p class="count mono">{sheet.rows.length} {plural(sheet.rowLabel.toLowerCase(), sheet.rows.length)} · {cols.length} {plural(sheet.colLabel ?? 'place', cols.length)}{itemCount ? ` · ${itemCount} items named` : ''}</p>
  </div>

  <p class="sheet-blurb">{sheet.blurb}</p>

  {#if q && searchable}
    <div class="answers" aria-live="polite">
      {#each colHits as h (h.col.id)}
        <div class="answer">
          <p class="what">
            {#if h.col.entry}<a class="cname" href={href.entry(branch, h.col.entry)}>{h.col.label}</a>{:else}<b>{h.col.label}</b>{/if}<span class="arrow">→</span>
            <span class="fam">{h.rows.length} {plural(sheet.rowLabel.toLowerCase(), h.rows.length)}{#if h.total !== undefined} · <b class="tot mono">{h.total.toLocaleString('en-US')}</b> in all{/if}</span>
          </p>
          <ul class="vals">
            {#each h.rows as r (r.id)}
              {@const re = rowEntry(r)}
              <li>{#if re}<a href={href.entry(branch, re.id)}>{r.label}</a>{:else}<span>{r.label}</span>{/if}<span class="mono">{valOf(r.cells[h.col.id]) ?? markDef(markOf(r.cells[h.col.id]))?.label}</span></li>
            {/each}
          </ul>
        </div>
      {/each}
      {#each answers as r (r.id)}
        {@const got = matches.get(r.id) ?? []}
        {@const st = got.length === 1 ? stackOf(r, got[0]) : r.stack}
        <div class="answer">
          <p class="what">
            {#if got.length}<b>{got.slice(0, 3).join(', ')}{got.length > 3 ? ` +${got.length - 3}` : ''}</b><span class="arrow">→</span>{/if}
            <span class="fam">{r.label}</span>{#if st}<span class="stk mono" class:hog={st === 1} title={st === 1 ? 'Does not stack: each one takes a slot' : `${st} to a slot`}>×{st}</span>{/if}
          </p>
          <ul class="where">
            {#each placements(r) as p (p.mark.id)}
              <li data-mark={p.mark.id}>
                <Mark id={p.mark.id} size={13} /><span class="ml">{p.mark.label}</span>
                {#each p.cols as c, ci (c.id)}{#if ci}<span class="sep">·</span>{/if}{#if c.entry}<a href={href.entry(branch, c.entry)}>{c.label}</a>{:else}<span>{c.label}</span>{/if}{#if valOf(r.cells[c.id])}<span class="val mono">{valOf(r.cells[c.id])}</span>{/if}{/each}
              </li>
            {/each}
          </ul>
        </div>
      {/each}
      {#each elsewhere as sh (sh.id)}
        <p class="none">“{q}” is a column on {sh.label}. <button type="button" class="jump" onclick={() => (sheetId = sh.id)}>Show it there</button></p>
      {/each}
      {#if !answers.length && !colHits.length && !elsewhere.length}<p class="none">{miss}</p>{/if}
    </div>
  {/if}

  <!-- desktop: the grid -->
  <table class="grid" role="grid" bind:this={table} onkeydown={move} onmouseleave={() => (hover = null)} style:--n={cols.length}>
    <caption class="sr-only">{sheet.label}: {sheet.blurb}</caption>
    <thead>
      <tr>
        <th scope="col" class="corner"><span class="eyebrow">{sheet.rowLabel}</span></th>
        {#each cols as c, ci (c.id)}
          {@const e = entryOf(c)}
          <th scope="col" class:hot={at?.c === ci} class:found={found(c)} style:--i={ci} aria-sort={sortBy?.col === c.id ? (sortBy.dir === 1 ? 'ascending' : 'descending') : undefined}>
            {#if e}
              <a href={href.entry(branch, e.id)} title={c.label}>
                <span class="pt"><img src={mediaUrl(e.media.portrait.src)} alt="" loading="lazy" /></span>
                <span class="cl">{c.short ?? c.label}</span>
              </a>
            {:else}
              <span class="pt none"><Glyph name="stack" size={15} /></span>
              <span class="cl">{c.short ?? c.label}</span>
            {/if}
            {#if c.slots}<span class="slots mono">{c.slots}</span>{/if}
            {#if sheet.sort}
              <button class="sort mono" class:on={sortBy?.col === c.id} onclick={() => sortOn(c)} aria-label="Sort by {c.label}">{sortLabel(c)}</button>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each lines as l (l.kind === 'group' ? `g:${l.label}` : l.row.id)}
        {#if l.kind === 'group'}
          <tr class="group"><th colspan={cols.length + 1} scope="colgroup"><span>{l.label}</span></th></tr>
        {:else}
          {@const r = l.row}
          {@const hit = lit(r)}
          {@const re = rowEntry(r)}
          <tr data-row={l.i} class:hot={at?.r === l.i} class:hit class:dim={!!q && searchable && !hit} style:--i={l.i}>
            <th scope="row">
              {#if re}
                <a class="rlink" href={href.entry(branch, re.id)}><span class="rp"><img src={mediaUrl(re.media.portrait.src)} alt="" loading="lazy" /></span><span class="rl">{r.label}</span></a>
              {:else}
                <span class="rl">{r.label}</span>
              {/if}
              <span class="meta">
                {#if r.stack}<span class="stk mono" class:hog={r.stack === 1} title={r.stack === 1 ? 'Does not stack: each one takes a slot' : `${r.stack} to a slot`}>{stackLabel(r)}</span>{/if}
                {#if r.items?.length}<span class="n mono">{r.items.length}</span>{/if}
              </span>
            </th>
            {#each cols as c, ci (c.id)}
              {@const mk = markOf(r.cells[c.id])}
              {@const v = valOf(r.cells[c.id])}
              {@const heat = heatOf(r, c)}
              <td class:hot={at?.c === ci} class:found={found(c)} class:heat={heat !== undefined} class:pin={pinned?.r === l.i && pinned?.c === ci} data-mark={mk || 'blank'} style:--heat={heat}>
                <button
                  data-r={l.i}
                  data-c={ci}
                  tabindex={focus.r === l.i && focus.c === ci ? 0 : -1}
                  aria-label="{r.label} in {c.label}: {v ? `${v}, ` : ''}{mk ? markDef(mk)?.label : blank.toLowerCase()}{noteOf(r.cells[c.id]) ? `. ${noteOf(r.cells[c.id])}` : ''}"
                  aria-pressed={pinned?.r === l.i && pinned?.c === ci}
                  onmouseenter={() => (hover = { r: l.i, c: ci })}
                  onfocus={(ev) => {
                    focus = { r: l.i, c: ci };
                    // keyboard focus pins the cell; a mouse press focuses too, and its click does the pinning
                    if (ev.currentTarget.matches(':focus-visible')) { hover = null; pinned = { r: l.i, c: ci }; }
                  }}
                  onclick={() => pick(l.i, ci)}
                >
                  {#if v}<span class="v">{v}</span>{:else if mk}<Mark id={mk} />{/if}
                  {#if noteOf(r.cells[c.id])}<i class="noted" aria-hidden="true"></i>{/if}
                </button>
              </td>
            {/each}
          </tr>
        {/if}
      {/each}
    </tbody>
  </table>

  <!-- phone: one card per row -->
  <ol class="cards">
    {#each order.map((i) => sheet.rows[i]) as r (r.id)}
      {@const hit = lit(r)}
      {@const re = rowEntry(r)}
      <li class:dim={!!q && searchable && !hit}>
        <p class="ct">{#if re}<a href={href.entry(branch, re.id)}><b>{r.label}</b></a>{:else}<b>{r.label}</b>{/if}{#if r.stack}<span class="stk mono" class:hog={r.stack === 1}>{stackLabel(r)}</span>{/if}</p>
        <ul class="where">
          {#each placements(r) as p (p.mark.id)}
            <li data-mark={p.mark.id}>
              <Mark id={p.mark.id} size={13} /><span class="ml">{p.mark.label}</span>
              {#each p.cols as c, ci (c.id)}{#if ci}<span class="sep">·</span>{/if}{#if c.entry}<a href={href.entry(branch, c.entry)}>{c.short ?? c.label}</a>{:else}<span>{c.short ?? c.label}</span>{/if}{#if valOf(r.cells[c.id])}<span class="val mono">{valOf(r.cells[c.id])}</span>{/if}{/each}
            </li>
          {/each}
        </ul>
        {#if r.note}<p class="cn">{r.note}</p>{/if}
      </li>
    {/each}
  </ol>

  <footer class="readout" class:on={!!at} aria-live="polite">
    {#if atRow && atCol}
      {@const mk = markOf(atCell)}
      <div class="ro-where">
        {#if mk}<Mark id={mk} size={18} />{:else}<span class="blank" aria-hidden="true"></span>{/if}
        <p><b>{atRow.label}</b><span class="in">in</span><b>{atCol.label}</b>{#if valOf(atCell)}<span class="val mono">{valOf(atCell)}</span>{/if}{#if atCol.slots}<span class="mono">{atCol.slots}</span>{/if}</p>
      </div>
      <p class="ro-says">
        {#if mk}<em>{markDef(mk)?.label}.</em> {markDef(mk)?.text}{:else}{blank}{/if}
        {#if noteOf(atCell)} {noteOf(atCell)}{/if}
        {#if mk}<span class="by">· {PUBLISHERS[byOf(atRow, atCell)] ?? byOf(atRow, atCell)}</span>{/if}
      </p>
      {#if atRow.items?.length}
        <p class="ro-items">{atRow.items.slice(0, 14).map((i) => (atRow.stackOf?.[i] ? `${i} ×${atRow.stackOf[i]}` : i)).join(' · ')}{atRow.items.length > 14 ? ` · +${atRow.items.length - 14} more` : ''}</p>
      {:else if atRow.note}
        <p class="ro-items">{atRow.note}</p>
      {/if}
      {#if atRow.entry || atCol.entry}
        <div class="ro-links">
          {#if atRow.entry}<a class="ro-go" href={href.entry(branch, atRow.entry)}>Open {atRow.label}<Glyph name="right" size={12} /></a>{/if}
          {#if atCol.entry}<a class="ro-go" href={href.entry(branch, atCol.entry)}>Open {atCol.label}<Glyph name="right" size={12} /></a>{/if}
        </div>
      {/if}
    {:else}
      <p class="ro-hint">Point at a cell, or Tab into the grid and use the arrow keys. Click a cell to keep it here.</p>
    {/if}
  </footer>
</section>

<style>
  .matrix {
    --row-w: 236px;
    --col-w: 76px;
    height: 100%;
    overflow: auto;
    padding: 0 var(--gutter); /* no top padding: Chrome pins sticky children below a scroller's padding, so the header carries it */
    background:
      radial-gradient(1100px 520px at 82% -14%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 62%),
      var(--ink-0);
  }

  /* ── header ─────────────── */
  /* title and blurb on the left, the legend beside them, so the grid starts within the first screen */
  /* the gap above the toolbar is the header's own padding: a sticky bar's margin would hold it 30px off the top */
  .head { padding: 34px 0 30px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 440px); column-gap: 56px; align-items: start; }
  .head > :not(.legend) { grid-column: 1; }
  .crumbs { display: flex; gap: 8px; font-size: 10px; }
  .crumbs a:hover { color: var(--bone); }
  h1 { font-size: clamp(48px, 5.4vw, 84px); margin-top: 8px; line-height: 0.95; animation: rise 900ms var(--ease-out) both; }
  .blurb { max-width: 64ch; margin-top: 14px; font-size: 16px; line-height: 1.6; color: var(--bone-2); animation: rise 900ms var(--ease-out) 120ms both; }
  @keyframes rise { from { opacity: 0; transform: translateY(18px); } }

  .legend { grid-column: 2; grid-row: 1 / span 3; align-self: end; display: grid; grid-template-columns: minmax(0, 1fr); gap: 7px; padding: 14px 16px; border: 1px solid var(--line); background: color-mix(in srgb, var(--ink-1) 70%, transparent); }
  .legend li { display: grid; grid-template-columns: 18px auto minmax(0, 1fr); align-items: baseline; gap: 8px; font-size: 12px; line-height: 1.4; color: var(--bone-2); animation: rise 700ms var(--ease-out) both; animation-delay: calc(200ms + var(--i) * 50ms); }
  .legend li > :global(svg), .legend .blank { align-self: center; }
  .legend b { font-weight: 600; color: var(--bone); white-space: nowrap; }

  /* the mark shapes: shape carries the meaning, colour only helps */
  .blank { display: inline-block; width: 15px; height: 1px; background: var(--ash-2); }

  /* ── toolbar: sheets, search, counts; pins to the top ── */
  .bar {
    position: sticky; top: 0; z-index: 6;
    display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px;
    min-height: 54px; margin: 0 calc(var(--gutter) * -1); padding: 9px var(--gutter);
    background: color-mix(in srgb, var(--ink-0) 92%, transparent); backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line);
  }
  .tabs { display: flex; gap: 4px; padding: 3px; border: 1px solid var(--line-2); border-radius: 999px; }
  .tabs button { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; font-size: 13px; color: var(--bone-2); transition: background var(--t-micro), color var(--t-micro); }
  .tabs button:hover { color: var(--bone); }
  .tabs button.on { background: var(--accent-dim); color: var(--bone); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 60%, transparent); }
  .tabs .mono { font-size: 10.5px; color: var(--ash); }
  .tabs button.on .mono { color: var(--accent); }

  .find { flex: 1 1 280px; max-width: 460px; display: flex; align-items: center; gap: 9px; padding: 0 10px; height: 34px; border: 1px solid var(--line-2); border-radius: 6px; color: var(--ash); background: var(--ink-1); transition: border-color var(--t-micro); }
  .find:focus-within { border-color: var(--accent); color: var(--accent); }
  .find input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; color: var(--bone); font: inherit; font-size: 14px; }
  .find input::placeholder { color: var(--ash); }
  .clear { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; color: var(--ash); }
  .clear:hover { color: var(--bone); background: var(--ink-3); }
  .count { margin-left: auto; font-size: 10.5px; color: var(--ash); letter-spacing: 0.04em; }

  .sheet-blurb { max-width: 92ch; margin: 12px 0 8px; font-size: 13.5px; line-height: 1.55; color: var(--bone-2); }

  /* ── search answers ── */
  .answers { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 10px; margin: 6px 0 16px; }
  .answer { padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); background: linear-gradient(110deg, var(--accent-dim), var(--ink-1) 75%); box-shadow: inset 2px 0 0 var(--accent); animation: rise 420ms var(--ease-out) both; }
  .what { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 8px; font-size: 14px; color: var(--bone); }
  .what b { font-weight: 600; }
  .what .arrow { color: var(--accent); }
  .what .fam { color: var(--bone-2); }
  .where { display: flex; flex-direction: column; gap: 5px; margin-top: 8px; }
  .where li { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 7px; font-size: 12.5px; color: var(--bone-2); }
  .where .ml { min-width: 62px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ash); }
  .where a { color: var(--bone); border-bottom: 1px solid var(--line-2); }
  .where a:hover { border-bottom-color: var(--accent); }
  .where [data-mark='home'] a { color: var(--accent); }
  .where .sep { color: var(--ash-2); }
  .none { font-size: 13.5px; color: var(--ash); }
  .jump { margin-left: 6px; padding: 3px 10px; border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent); border-radius: 999px; font-size: 12.5px; color: var(--accent); }
  .jump:hover { background: var(--accent-dim); }
  .sortby { display: none; align-items: center; gap: 8px; }
  .sortby select { height: 32px; padding: 0 8px; border: 1px solid var(--line-2); border-radius: 6px; background: var(--ink-1); color: var(--bone); font: inherit; font-size: 13px; }
  .cname { font-weight: 600; color: var(--bone); border-bottom: 1px solid var(--line-2); }
  .cname:hover { border-bottom-color: var(--accent); }
  .tot { color: var(--accent); font-weight: 600; }
  .vals { display: flex; flex-wrap: wrap; gap: 5px 14px; margin-top: 8px; }
  .vals li { display: inline-flex; align-items: baseline; gap: 6px; font-size: 12.5px; color: var(--bone-2); }
  .vals a { color: var(--bone); border-bottom: 1px solid var(--line-2); }
  .vals a:hover { border-bottom-color: var(--accent); }
  .vals .mono, .val { font-size: 11px; color: var(--accent); }
  .val { margin-left: 2px; }
  .stk { font-size: 10.5px; padding: 0 5px; border: 1px solid var(--line-2); border-radius: 2px; color: var(--bone-2); }
  .stk.hog { color: var(--ember); border-color: color-mix(in srgb, var(--ember) 50%, transparent); }

  /* ── the grid ── */
  .grid { border-collapse: separate; border-spacing: 0; margin-bottom: 10px; table-layout: fixed; width: calc(var(--row-w) + var(--col-w) * var(--n, 12)); }
  .grid th, .grid td { padding: 0; }
  thead th {
    position: sticky; top: var(--bar-h); z-index: 4;
    width: var(--col-w); vertical-align: bottom; padding: 12px 2px 10px;
    background: var(--ink-0); border-bottom: 1px solid var(--line-2);
    text-align: center; font-weight: 400;
    animation: drop 600ms var(--ease-out) both; animation-delay: calc(var(--i) * 35ms);
  }
  @keyframes drop { from { opacity: 0; transform: translateY(-8px); } }
  thead th a { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--bone-2); }
  thead th a:hover .cl { color: var(--bone); }
  thead th.hot { background: linear-gradient(180deg, transparent, var(--accent-dim)); }
  thead th.hot .pt { box-shadow: 0 0 0 1.5px var(--accent), 0 0 12px var(--accent-dim); }
  .pt { display: grid; place-items: center; width: 34px; height: 34px; margin: 0 auto 6px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 1px var(--line-2); transition: box-shadow var(--t-micro); }
  thead th a .pt { margin-bottom: 0; }
  .pt img { width: 100%; height: 100%; object-fit: cover; }
  .pt.none { color: var(--ash); background: var(--ink-2); }
  .cl { display: block; font-size: 11px; line-height: 1.2; color: var(--bone-2); text-wrap: balance; }
  .slots { display: block; margin-top: 4px; font-size: 9.5px; color: var(--ash); letter-spacing: 0.02em; }
  thead th.corner { left: 0; z-index: 5; width: var(--row-w); text-align: left; padding-left: 0; }
  .sort { display: block; margin: 6px auto 0; padding: 1px 8px; font-size: 10.5px; line-height: 1.4; border: 1px solid var(--line); border-radius: 999px; color: var(--ash); transition: color var(--t-micro), border-color var(--t-micro); }
  .sort:hover { color: var(--bone); border-color: var(--line-3); }
  .sort.on { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 55%, transparent); background: var(--accent-dim); }
  .sort:focus-visible { outline: 1.5px solid var(--accent); outline-offset: 1px; }
  thead th.found .cl { color: var(--accent); }
  thead th.found .pt { box-shadow: 0 0 0 1.5px var(--accent); }
  td.found { background: color-mix(in srgb, var(--accent) 7%, transparent); }
  .corner .eyebrow { font-size: 10px; }

  tbody th[scope='row'] {
    position: sticky; left: 0; z-index: 2;
    width: var(--row-w); padding: 6px 12px 6px 0;
    background: var(--ink-0); text-align: left; font-weight: 400;
    border-bottom: 1px solid var(--line);
  }
  /* label and stack on one line, so a row is no taller than its cells */
  .rl { font-size: 13.5px; line-height: 1.3; color: var(--bone); }
  .rlink { display: inline-flex; align-items: center; gap: 9px; max-width: 100%; }
  .rlink:hover .rl { color: var(--accent); }
  .rp { flex: none; width: 26px; height: 26px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 1px var(--line-2); }
  .rp img { width: 100%; height: 100%; object-fit: cover; }
  .meta { display: inline-flex; gap: 6px; align-items: center; margin-left: 8px; vertical-align: 1px; }
  .meta .n { font-size: 10px; color: var(--ash); }
  tr.group th { padding: 18px 0 6px; text-align: left; border-bottom: 1px solid var(--line-2); background: var(--ink-0); position: sticky; left: 0; }
  tr.group span { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); }

  tbody tr[data-row] { animation: rowin 520ms var(--ease-out) both; animation-delay: calc(120ms + var(--i) * 18ms); }
  @keyframes rowin { from { opacity: 0; transform: translateX(-8px); } }
  td { width: var(--col-w); height: 46px; border-bottom: 1px solid var(--line); border-left: 1px solid var(--line); text-align: center; transition: background var(--t-micro); }
  td button { position: relative; display: grid; place-items: center; width: 100%; height: 100%; min-height: 44px; color: var(--bone-2); border-radius: 0; }
  td button:focus-visible { outline: 1.5px solid var(--accent); outline-offset: -3px; }
  td[data-mark='home'] { background: color-mix(in srgb, var(--accent) 9%, transparent); }
  td[data-mark='blank'] button::after { content: ''; width: 8px; height: 1px; background: var(--line-2); }
  .noted { position: absolute; top: 6px; right: 7px; width: 4px; height: 4px; border-radius: 50%; background: var(--ash); }
  /* a value cell prints its number; shading compares it with the largest in its column */
  td .v { position: relative; font-family: var(--f-mono); font-size: 11px; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; color: var(--bone); white-space: nowrap; }
  td[data-mark='buy'] .v { color: var(--brass); }
  td.heat button::before { content: ''; position: absolute; inset: 0; background: var(--accent); opacity: calc(var(--heat) * 0.3); pointer-events: none; }
  /* crosshair: the row and column under the pointer light up together */
  tr.hot th[scope='row'] { background: linear-gradient(90deg, var(--ink-0) 60%, var(--accent-dim)); }
  tr.hot th[scope='row'] .rl { color: var(--accent); }
  tr.hot td, td.hot { background: color-mix(in srgb, var(--accent) 6%, transparent); }
  tr.hot td.hot { background: var(--accent-dim); }
  td.pin { box-shadow: inset 0 0 0 1.5px var(--accent); }
  tr.hit th[scope='row'] { box-shadow: inset 2px 0 0 var(--accent); }
  tr.hit .rl { color: var(--accent); }
  tr.dim { opacity: 0.28; transition: opacity var(--t-ui); }
  tr.dim:hover { opacity: 0.7; }

  .cards { display: none; }

  /* ── readout: pins to the foot of the view and explains the cell in focus ── */
  .readout {
    position: sticky; bottom: 0; z-index: 6;
    display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'where go' 'says says' 'items items'; gap: 4px 16px;
    margin: 0 calc(var(--gutter) * -1); padding: 12px var(--gutter) 14px;
    background: color-mix(in srgb, var(--ink-1) 94%, transparent); backdrop-filter: blur(8px);
    border-top: 1px solid var(--line-2);
    min-height: 74px;
  }
  .readout.on { border-top-color: color-mix(in srgb, var(--accent) 55%, transparent); }
  .ro-where { grid-area: where; display: flex; align-items: center; gap: 10px; }
  .ro-where p { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; font-size: 14.5px; color: var(--bone); }
  .ro-where .in { color: var(--ash); font-size: 12px; }
  .ro-where .mono { font-size: 10.5px; color: var(--ash); }
  .ro-where .val { font-size: 13px; color: var(--accent); }
  .ro-says { grid-area: says; font-size: 13px; line-height: 1.5; color: var(--bone-2); }
  .ro-says em { font-style: normal; color: var(--bone); font-weight: 600; }
  .ro-says .by { color: var(--ash); font-size: 11.5px; }
  .ro-items { grid-area: items; font-size: 11.5px; line-height: 1.5; color: var(--ash); }
  .ro-links { grid-area: go; align-self: center; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
  .ro-go { align-self: center; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--line-2); border-radius: 999px; font-size: 12.5px; color: var(--bone); white-space: nowrap; }
  .ro-go:hover { border-color: var(--accent); background: var(--accent-dim); }
  .ro-hint { grid-column: 1 / -1; align-self: center; font-size: 12.5px; color: var(--ash); }

  @media (prefers-reduced-motion: reduce) {
    h1, .blurb, .legend li, thead th, tbody tr[data-row], .answer { animation: none; }
  }

  @media (max-width: 1180px) {
    .head { grid-template-columns: minmax(0, 1fr); }
    .legend { grid-column: 1; grid-row: auto; margin-top: 18px; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); column-gap: 22px; }
  }

  @media (max-width: 860px) {
    .head { padding-top: 22px; }
    .grid, .readout { display: none; }
    .cards { display: flex; flex-direction: column; gap: 10px; padding-bottom: 60px; }
    .cards > li { padding: 12px 14px; border: 1px solid var(--line); background: var(--ink-1); }
    .cards > li.dim { display: none; }
    .ct { display: flex; align-items: baseline; gap: 8px; font-size: 14.5px; color: var(--bone); }
    .cn { margin-top: 8px; font-size: 12px; line-height: 1.5; color: var(--ash); }
    .count { width: 100%; margin-left: 0; }
    .sortby { display: flex; }
  }
</style>
