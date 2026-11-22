<script lang="ts">
  // MATERIALS plate section: what a place holds and what reads it, or what a supply takes and where its
  // materials are kept. The shelves, the "read in place by" list and the routing for what doesn't belong
  // are not written per plate: they are read off the branch's Sorter (sorter.json), so the plate and the
  // grid can't disagree. Vessels resolve to Mounts plates, so ship holds and horse slots come from one
  // place. Reads the branch-specific `manifest` field that core never touches.
  import { reveal } from '../../core/motion';
  import { href, mediaUrl, tree } from '../../core/tree';
  import { PUBLISHERS } from '../../core/format';
  import type { Branch, Entry, MatrixCell, MatrixCol, MatrixRow } from '../../core/types';
  import Glyph from '../../ui/Glyph.svelte';
  import Mark from '../../ui/Mark.svelte';

  type Basis = 'patch' | 'guide' | 'screenshot' | 'player' | 'sum';
  type Figure = { label: string; value: string; basis: Basis; by: string };
  type Patch = { v: string; note: string; by: string };
  type Tip = { text: string; by: string };
  type Vessel = { ref: string; slots: number | null; by: string };
  type BillRow = { item: string; cells: string[]; from?: string; entry?: string; by?: string };
  type Bill = { title: string; cols: string[]; rows: BillRow[]; note?: string; by: string };
  type Manifest = {
    col?: string;
    slots?: { value: string; unit: string; basis: Basis; by: string };
    rows?: string[];
    figures?: Figure[];
    vessels?: Vessel[];
    bill?: Bill[];
    tips?: Tip[];
    watch?: string[];
    patches?: Patch[];
  };

  let { entry, branch }: { entry: Entry; branch: Branch } = $props();

  const man = $derived(entry.manifest as Manifest | undefined);
  const m = $derived(branch.matrix);
  const where = $derived(m?.sheets.find((s) => s.id === 'where'));
  const reads = $derived(m?.sheets.find((s) => s.id === 'reads'));
  const col = $derived(man?.col ? m?.cols.find((c) => c.id === man.col) : undefined);

  const markOf = (c?: MatrixCell) => (!c ? '' : typeof c === 'string' ? c : c.mark);
  const noteOf = (c?: MatrixCell) => (c && typeof c === 'object' ? c.note : undefined);
  const byOf = (r: MatrixRow, c?: MatrixCell) => (c && typeof c === 'object' && c.by) || r.by;
  const markDef = (id: string) => m?.marks.find((x) => x.id === id);
  const plateOf = (c: MatrixCol) => (c.entry ? branch.byId.get(c.entry) : undefined);
  const pub = (by: string) => PUBLISHERS[by] ?? by;

  // what reads this place without you carrying the item, and what a source says won't
  const readBy = $derived(col && reads ? reads.rows.filter((r) => r.cells[col.id]).map((r) => ({ row: r, mark: markOf(r.cells[col.id]), note: noteOf(r.cells[col.id]), by: byOf(r, r.cells[col.id]) })) : []);
  const readHere = $derived(readBy.filter((x) => x.mark === 'draw'));
  const readOther = $derived(readBy.filter((x) => x.mark !== 'draw'));

  // the shelves: every family the Sorter puts here, grouped by mark in the legend's order
  const shelves = $derived.by(() => {
    if (!col || !where || !m) return [];
    return m.marks
      .map((mk) => ({ mark: mk, rows: where.rows.filter((r) => markOf(r.cells[col.id]) === mk.id) }))
      .filter((s) => s.rows.length);
  });
  // a supply's own families, each with every place that keeps them
  const supplies = $derived.by(() => {
    if (col || !where || !m || !man?.rows?.length) return [];
    const cols = (where.cols ?? m.cols.map((c) => c.id)).map((id) => m.cols.find((c) => c.id === id)!).filter(Boolean);
    return man.rows
      .map((id) => where.rows.find((r) => r.id === id))
      .filter((r): r is MatrixRow => !!r)
      .map((r) => ({ row: r, at: cols.filter((c) => r.cells[c.id]).map((c) => ({ col: c, mark: markOf(r.cells[c.id]) })) }));
  });
  // what doesn't go here, grouped by where it goes instead: the place built for it, or where it fits
  // when nothing is built for it (weapons, jewellery: Private Storage)
  const elsewhere = $derived.by(() => {
    if (!col || !where || !m) return [];
    const out = new Map<string, { to: MatrixCol[]; rows: MatrixRow[] }>();
    for (const r of where.rows) {
      if (r.cells[col.id]) continue;
      const home = m.cols.filter((c) => markOf(r.cells[c.id]) === 'home');
      const to = home.length ? home : m.cols.filter((c) => markOf(r.cells[c.id]) === 'ok');
      if (!to.length) continue;
      const key = to.map((c) => c.id).join('+');
      if (!out.has(key)) out.set(key, { to, rows: [] });
      out.get(key)!.rows.push(r);
    }
    return [...out.values()];
  });

  // an item filter over the shelves: families whose name or items match, items narrowed to the matches
  let q = $state('');
  const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").trim();
  const t = $derived(norm(q));
  const hit = (r: MatrixRow) => !t || norm(r.label).includes(t) || (r.items ?? []).some((i) => norm(i).includes(t));
  const shown = (r: MatrixRow) => (!t || norm(r.label).includes(t) ? (r.items ?? []) : (r.items ?? []).filter((i) => norm(i).includes(t)));
  const shelfItems = $derived(shelves.reduce((n, s) => n + s.rows.reduce((k, r) => k + (r.items?.length ?? 0), 0), 0));
  const matched = $derived(shelves.reduce((n, s) => n + s.rows.filter(hit).reduce((k, r) => k + shown(r).length, 0), 0));
  let open = $state<Record<string, boolean>>({});
  const CAP = 12;

  // vessels: Mounts plates grouped by how much each carries, biggest first; unpublished last
  const vesselGroups = $derived.by(() => {
    const groups = new Map<string, { slots: number | null; by: string; plates: { b: Branch; e: Entry }[] }>();
    for (const v of man?.vessels ?? []) {
      const [bid, id] = v.ref.split('/');
      const b = tree.branches.find((x) => x.id === bid);
      const e = b?.byId.get(id);
      if (!b || !e) continue;
      const key = String(v.slots);
      if (!groups.has(key)) groups.set(key, { slots: v.slots, by: v.by, plates: [] });
      groups.get(key)!.plates.push({ b, e });
    }
    return [...groups.values()];
  });
  const vesselMax = $derived(Math.max(1, ...vesselGroups.map((g) => g.slots ?? 0)));

  const BASIS: Record<Basis, { label: string; note: string }> = {
    patch: { label: 'Patch notes', note: 'Stated in Pearl Abyss patch notes' },
    guide: { label: 'Guide', note: 'Stated in a published guide' },
    screenshot: { label: 'Screenshot', note: 'Read off an in-game screenshot a guide published' },
    player: { label: 'Player report', note: 'One player’s result, not measured' },
    sum: { label: 'Sum shown', note: 'Worked from the figures above; the sum is printed' },
  };
  const stackTxt = (r: MatrixRow) => (r.stack ? `×${r.stack}` : '');
  const billFrom = (b: Bill) => b.rows.some((r) => r.from);
  const billBy = (b: Bill) => [...new Set([b.by, ...b.rows.map((r) => r.by).filter((x): x is string => !!x)])].map(pub).join(' · ');
</script>

{#if man}
  <section class="manifest" data-outline="Manifest" use:reveal>
    <header class="sec-head">
      <span class="eyebrow">{col ? 'What it holds and what reads it' : 'What it takes and where that is kept'}</span>
      <h3 class="display">Manifest</h3>
    </header>

    {#if col}
      <div class="hold">
        <div class="cap" data-basis={man.slots?.basis}>
          <p class="eyebrow">Capacity</p>
          {#if man.slots}
            <p class="num display">{man.slots.value}</p>
            <p class="unit">{man.slots.unit}</p>
            <p class="basis" title={BASIS[man.slots.basis].note}><i aria-hidden="true"></i>{BASIS[man.slots.basis].label}<span class="by">· {pub(man.slots.by)}</span></p>
          {:else}
            <p class="num display none">—</p>
            <p class="unit">No source publishes its size.</p>
          {/if}
        </div>
        <div class="reads">
          <p class="eyebrow">Read in place by</p>
          {#if readHere.length}
            <ul>
              {#each readHere as r, i (r.row.id)}
                <li style:--i={i}><Mark id="draw" size={16} /><span class="rl">{r.row.label}</span>{#if r.note}<span class="rn">{r.note}</span>{/if}<span class="by">{pub(r.by)}</span></li>
              {/each}
            </ul>
          {:else}
            <p class="none-read">Nothing reads it in place: take an item out before you use it.</p>
          {/if}
          {#if readOther.length}
            <ul class="other">
              {#each readOther as r (r.row.id)}
                <li data-mark={r.mark}><Mark id={r.mark} size={14} /><span class="rl">{markDef(r.mark)?.label}: {r.row.label}</span>{#if r.note}<span class="rn">{r.note}</span>{/if}<span class="by">{pub(r.by)}</span></li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>

      {#if shelves.length}
        <div class="block">
          <div class="shelf-bar">
            <p class="eyebrow">What goes in</p>
            {#if shelfItems > CAP}
              <label class="filter">
                <Glyph name="search" size={13} />
                <input type="search" bind:value={q} placeholder="Filter {shelfItems} items" aria-label="Filter the items that go in {entry.name}" />
                {#if t}<span class="count mono">{matched}</span>{/if}
              </label>
            {/if}
          </div>
          {#each shelves as s (s.mark.id)}
            {@const rows = s.rows.filter(hit)}
            {#if rows.length}
              <div class="shelf" data-mark={s.mark.id}>
                <p class="shelf-head"><Mark id={s.mark.id} size={15} /><b>{s.mark.label}</b><span>{s.mark.text}</span></p>
                <ul class="fams">
                  {#each rows as r, i (r.id)}
                    {@const cell = r.cells[col.id]}
                    {@const items = shown(r)}
                    {@const all = open[r.id] || !!t}
                    <li style:--i={i}>
                      <div class="fam">
                        <span class="fl">{r.label}</span>
                        {#if r.stack}<span class="st mono" class:hog={r.stack === 1} title={r.stack === 1 ? 'Every one takes a slot' : `${r.stack} to a slot`}>{stackTxt(r)}</span>{/if}
                        {#if r.items?.length}<span class="n mono">{r.items.length}</span>{/if}
                      </div>
                      {#if noteOf(cell) ?? r.note}<p class="fn">{noteOf(cell) ?? r.note}</p>{/if}
                      {#if items.length}
                        <ul class="items">
                          {#each all ? items : items.slice(0, CAP) as it (it)}<li class:lit={!!t && norm(it).includes(t)}>{it}</li>{/each}
                          {#if !all && items.length > CAP}
                            <li class="more"><button type="button" onclick={() => (open[r.id] = true)}>+{items.length - CAP} more</button></li>
                          {/if}
                        </ul>
                      {/if}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          {/each}
          {#if t && !matched && !shelves.some((s) => s.rows.some(hit))}
            <p class="miss">Nothing by that name goes in {entry.name}. <a href={href.matrix(branch)}>Ask the Sorter</a> where it does.</p>
          {/if}
        </div>
      {/if}

      {#if elsewhere.length}
        <div class="block">
          <p class="eyebrow">Doesn't go here — goes to</p>
          <ul class="route">
            {#each elsewhere as x, i (x.to.map((c) => c.id).join('+'))}
              <li style:--i={i}>
                <span class="to">
                  {#each x.to as h (h.id)}
                    {@const p = plateOf(h)}
                    {#if p}
                      <a href={href.entry(branch, p.id)} data-accent={branch.leaves.find((l) => l.id === p.leaf)?.accent}>
                        <img src={mediaUrl(p.media.portrait.src)} alt="" loading="lazy" />{h.short ?? h.label}
                      </a>
                    {:else}<span class="plain">{h.short ?? h.label}</span>{/if}
                  {/each}
                </span>
                <span class="fams-to">{x.rows.map((r) => r.label).join(' · ')}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    {/if}

    {#if supplies.length}
      <div class="block">
        <p class="eyebrow">The materials, and where they're kept</p>
        <ul class="fams sup">
          {#each supplies as s, i (s.row.id)}
            <li style:--i={i}>
              <div class="fam">
                <span class="fl">{s.row.label}</span>
                {#if s.row.stack}<span class="st mono" class:hog={s.row.stack === 1}>{stackTxt(s.row)}</span>{/if}
              </div>
              {#if s.row.items?.length}<ul class="items">{#each s.row.items as it (it)}<li>{it}</li>{/each}</ul>{/if}
              {#if s.at.length}
                <ul class="kept">
                  {#each s.at as a (a.col.id)}
                    {@const p = plateOf(a.col)}
                    <li data-mark={a.mark} title={markDef(a.mark)?.text}>
                      <Mark id={a.mark} size={13} />
                      {#if p}<a href={href.entry(branch, p.id)}>{a.col.short ?? a.col.label}</a>{:else}<span>{a.col.short ?? a.col.label}</span>{/if}
                      {#if a.mark !== 'home' && a.mark !== 'ok'}<em>{markDef(a.mark)?.label.toLowerCase()}</em>{/if}
                    </li>
                  {/each}
                </ul>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if vesselGroups.length}
      <div class="block">
        <p class="eyebrow">Each one's hold</p>
        <ol class="vessels">
          {#each vesselGroups as g, i (String(g.slots))}
            <li style:--i={i} style:--w={g.slots === null ? 1 : g.slots / vesselMax} class:unpub={g.slots === null}>
              <span class="vn display">{g.slots ?? '—'}</span>
              <span class="bar" aria-hidden="true"><i></i></span>
              <span class="vp">
                {#each g.plates as p (p.e.id)}
                  <a href={href.entry(p.b, p.e.id)} data-accent={p.b.accent} title="{p.e.name} — {p.b.title}">
                    <img src={mediaUrl(p.e.media.portrait.src)} alt="" loading="lazy" /><span>{p.e.name}</span>
                  </a>
                {/each}
              </span>
              <span class="by">{g.slots === null ? 'Not published' : pub(g.by)}</span>
            </li>
          {/each}
        </ol>
      </div>
    {/if}

    {#each man.bill ?? [] as b (b.title)}
      <div class="block">
        <p class="eyebrow">{b.title}</p>
        <div class="bill-wrap">
          <table class="bill">
            <thead><tr><th scope="col">Item</th>{#each b.cols as c}<th scope="col">{c}</th>{/each}{#if billFrom(b)}<th scope="col">From</th>{/if}</tr></thead>
            <tbody>
              {#each b.rows as r (r.item)}
                <tr>
                  <th scope="row">{#if r.entry && branch.byId.has(r.entry)}<a href={href.entry(branch, r.entry)}>{r.item}</a>{:else}{r.item}{/if}</th>
                  {#each r.cells as c}<td class:dim={c === '—'}>{c}</td>{/each}
                  {#if billFrom(b)}<td class="from">{r.from ?? ''}</td>{/if}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <p class="bill-foot">{#if b.note}{b.note} {/if}<span class="by">{billBy(b)}</span></p>
      </div>
    {/each}

    {#if man.figures?.length}
      <ol class="figures">
        {#each man.figures as f, i (f.label)}
          <li style:--i={i} data-basis={f.basis}>
            <span class="label">{f.label}</span>
            <span class="value display">{f.value}</span>
            <span class="basis" title={BASIS[f.basis].note}><i aria-hidden="true"></i>{BASIS[f.basis].label}<span class="by">· {pub(f.by)}</span></span>
          </li>
        {/each}
      </ol>
    {/if}

    {#if man.tips?.length}
      <div class="block">
        <p class="eyebrow">Worth knowing</p>
        <ul class="tips">
          {#each man.tips as tip, i (tip.text)}
            <li style:--i={i}><Glyph name="diamond" size={9} /><span>{tip.text}</span><span class="by">{pub(tip.by)}</span></li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if man.patches?.length}
      <div class="block">
        <p class="eyebrow">Patch history</p>
        <ol class="patches" style:--n={man.patches.length}>
          {#each man.patches as p, i (p.v)}
            <li style:--i={i}>
              <span class="v mono">{p.v}</span>
              <span class="dot" aria-hidden="true"></span>
              <span class="note">{p.note}</span>
              <span class="by">{pub(p.by)}</span>
            </li>
          {/each}
        </ol>
      </div>
    {/if}

    {#if man.watch?.length}
      <aside class="watch">
        <p class="eyebrow"><Glyph name="warn" size={13} /> Watch out</p>
        <ul>{#each man.watch as w}<li>{w}</li>{/each}</ul>
      </aside>
    {/if}

    {#if col || supplies.length}
      <a class="to-sorter" href={href.matrix(branch)}><Glyph name="grid" size={14} />Every place and every item: open {m?.title ?? 'the grid'}<Glyph name="right" size={12} /></a>
    {/if}
  </section>
{/if}

<style>
  .manifest { padding: 0 var(--gutter); }
  .sec-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
  .sec-head .eyebrow { font-size: 10px; }
  .sec-head h3 { font-size: 40px; }
  .eyebrow { font-size: 10px; }
  .by { font-size: 10.5px; color: var(--ash); white-space: nowrap; }
  @keyframes up { from { opacity: 0; transform: translateY(10px); } }

  /* capacity against what reads it: the number lit in the leaf's accent, the mechanics beside it */
  .hold { display: grid; grid-template-columns: minmax(200px, 0.8fr) minmax(0, 1.6fr); border: 1px solid var(--line); margin-bottom: 8px; }
  .cap { padding: 16px 18px 18px; background: linear-gradient(160deg, var(--accent-dim), var(--ink-1) 70%); box-shadow: inset 2px 0 0 var(--accent); display: flex; flex-direction: column; gap: 4px; }
  .num { font-size: clamp(34px, 4.4vw, 56px); line-height: 1; font-weight: 600; font-variation-settings: 'opsz' 8; font-variant-numeric: lining-nums tabular-nums; color: var(--bone); margin-top: 6px; }
  .num.none { color: var(--ash); }
  .unit { font-size: 13px; line-height: 1.4; color: var(--bone-2); }
  .cap .basis { margin-top: auto; padding-top: 10px; }
  .reads { padding: 16px 18px; border-left: 1px solid var(--line); display: flex; flex-direction: column; gap: 10px; }
  .reads ul { display: flex; flex-direction: column; gap: 8px; }
  .reads li { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; grid-template-areas: 'm l b' '. n n'; gap: 2px 10px; align-items: center; animation: up 520ms var(--ease-out) both; animation-delay: calc(var(--i, 0) * 70ms); }
  .reads li :global(.mk) { grid-area: m; }
  .rl { grid-area: l; font-size: 14.5px; color: var(--bone); }
  .rn { grid-area: n; font-size: 12.5px; line-height: 1.45; color: var(--ash); }
  .reads li .by { grid-area: b; }
  .reads .other { padding-top: 10px; border-top: 1px dashed var(--line-2); }
  .reads .other .rl { font-size: 13px; color: var(--bone-2); }
  .none-read { font-size: 14px; line-height: 1.5; color: var(--bone-2); }

  .block { margin-top: 24px; }
  .block > .eyebrow { margin-bottom: 12px; }

  /* shelves: one per mark, the families on it, and every item by name */
  .shelf-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
  .filter { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 10px; border: 1px solid var(--line-2); background: var(--ink-1); color: var(--ash); min-width: min(260px, 100%); }
  .filter:focus-within { border-color: var(--accent); color: var(--accent); }
  .filter input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; color: var(--bone); font: inherit; font-size: 13px; }
  .filter .count { font-size: 11px; color: var(--accent); }
  .shelf { border-top: 1px solid var(--line); padding: 12px 0 4px; }
  .shelf-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .shelf-head :global(.mk) { align-self: center; }
  .shelf-head b { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--bone); font-weight: 600; }
  .shelf[data-mark='home'] .shelf-head b { color: var(--accent); }
  .shelf[data-mark='no'] .shelf-head b { color: var(--ember); }
  .shelf-head span { font-size: 12.5px; color: var(--ash); }
  .fams { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; margin-bottom: 8px; }
  .fams > li { padding: 10px 12px 12px; background: var(--ink-1); border: 1px solid var(--line); animation: up 520ms var(--ease-out) both; animation-delay: calc(var(--i) * 40ms); min-width: 0; }
  .shelf[data-mark='home'] .fams > li { border-color: color-mix(in srgb, var(--accent) 35%, var(--line)); box-shadow: inset 2px 0 0 var(--accent); }
  .shelf[data-mark='unk'] .fams > li { border-style: dashed; }
  .shelf[data-mark='no'] .fams > li { border-color: color-mix(in srgb, var(--ember) 40%, var(--line)); }
  .fam { display: flex; align-items: baseline; gap: 8px; }
  .fl { font-size: 14px; color: var(--bone); flex: 1; min-width: 0; }
  .st { font-size: 11px; color: var(--bone-2); padding: 1px 5px; border: 1px solid var(--line-2); }
  .st.hog { color: var(--ember); border-color: color-mix(in srgb, var(--ember) 50%, transparent); }
  .n { font-size: 11px; color: var(--ash); }
  .fn { margin-top: 4px; font-size: 12.5px; line-height: 1.45; color: var(--ash); }
  .items { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
  .items li { font-size: 11.5px; line-height: 1; padding: 4px 7px; border: 1px solid var(--line); color: var(--bone-2); white-space: nowrap; }
  .items li.lit { color: var(--ink-0); background: var(--accent); border-color: var(--accent); }
  .items .more { padding: 0; border: 0; }
  .items .more button { font: inherit; font-size: 11.5px; padding: 4px 7px; border: 1px dashed var(--line-2); background: none; color: var(--accent); cursor: pointer; }
  .items .more button:hover { border-color: var(--accent); }
  .miss { font-size: 13.5px; color: var(--bone-2); padding: 12px 0; }
  .miss a, .to-sorter { color: var(--accent); }

  /* routing: what doesn't belong here, and the plate built for it */
  .route { display: flex; flex-direction: column; border-top: 1px solid var(--line); }
  .route li { display: grid; grid-template-columns: minmax(180px, 0.42fr) minmax(0, 1fr); align-items: center; gap: 16px; padding: 8px 0; border-bottom: 1px solid var(--line); animation: up 520ms var(--ease-out) both; animation-delay: calc(var(--i) * 40ms); }
  .route .to { display: flex; gap: 6px; flex-wrap: wrap; }
  .fams-to { font-size: 13.5px; line-height: 1.5; color: var(--bone-2); }
  .route a, .route .plain { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px 2px 2px; border: 1px solid var(--line-2); border-radius: 999px; font-size: 12px; color: var(--bone); white-space: nowrap; transition: border-color var(--t-micro), background var(--t-micro); }
  .route .plain { padding-left: 9px; color: var(--ash); }
  .route a:hover { border-color: var(--accent); background: var(--accent-dim); }
  .route img { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 1px var(--accent); }

  .sup .kept { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--line); }
  .kept li { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; }
  .kept a { color: var(--bone); }
  .kept a:hover { color: var(--accent); }
  .kept span { color: var(--ash); }
  .kept em { font-style: normal; font-size: 11px; color: var(--ash); }

  /* vessels: one bar per hold size, scaled to the largest, with every plate that carries it */
  .vessels { display: flex; flex-direction: column; border-top: 1px solid var(--line); }
  .vessels li { display: grid; grid-template-columns: 48px minmax(80px, 1fr) minmax(0, 2.2fr) auto; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--line); animation: up 520ms var(--ease-out) both; animation-delay: calc(var(--i) * 70ms); }
  .vn { font-size: 26px; line-height: 1; font-weight: 600; font-variant-numeric: lining-nums tabular-nums; color: var(--bone); text-align: right; }
  .unpub .vn { color: var(--ash); }
  .bar { height: 8px; background: var(--ink-2); position: relative; }
  .bar i { position: absolute; inset: 0 auto 0 0; width: calc(var(--w) * 100%); background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 45%, transparent), var(--accent)); transform-origin: left; animation: grow 900ms var(--ease-out) both; animation-delay: calc(var(--i) * 70ms + 200ms); }
  .unpub .bar i { background: repeating-linear-gradient(90deg, var(--line-2) 0 4px, transparent 4px 8px); }
  @keyframes grow { from { transform: scaleX(0); } }
  .vp { display: flex; flex-wrap: wrap; gap: 6px; }
  .vp a { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px 2px 2px; border: 1px solid var(--line-2); border-radius: 999px; font-size: 12px; color: var(--bone); white-space: nowrap; }
  .vp a:hover { border-color: var(--accent); background: var(--accent-dim); }
  .vp img { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 1px var(--accent); }

  /* bills of materials */
  .bill-wrap { overflow-x: auto; border: 1px solid var(--line); }
  .bill { width: 100%; border-collapse: collapse; font-size: 13px; }
  .bill th, .bill td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--line); vertical-align: top; }
  .bill thead th { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ash); font-weight: 500; background: var(--ink-1); }
  .bill tbody th { color: var(--bone); font-weight: 500; white-space: nowrap; }
  .bill tbody th a { color: var(--accent); }
  .bill td { color: var(--bone-2); font-variant-numeric: lining-nums tabular-nums; }
  .bill td.dim { color: var(--ash); }
  .bill td.from { color: var(--ash); font-size: 12.5px; line-height: 1.45; min-width: 220px; }
  .bill tbody tr:last-child > * { border-bottom: 0; }
  .bill tbody tr:hover > * { background: color-mix(in srgb, var(--accent) 6%, transparent); }
  .bill-foot { margin-top: 8px; font-size: 12.5px; line-height: 1.5; color: var(--ash); }
  .bill-foot .by { margin-left: 4px; }

  .figures { margin: 24px 0 0; border-top: 1px solid var(--line); }
  .figures li { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'label basis' 'value value'; gap: 4px 16px; padding: 14px 0 16px; border-bottom: 1px solid var(--line); animation: up 600ms var(--ease-out) both; animation-delay: calc(var(--i) * 80ms); }
  .label { grid-area: label; font-size: 12.5px; color: var(--ash); }
  .value { grid-area: value; font-size: clamp(20px, 2.2vw, 28px); line-height: 1.15; font-weight: 600; font-variation-settings: 'opsz' 8; font-variant-numeric: lining-nums tabular-nums; color: var(--bone); }
  .figures .basis { grid-area: basis; }
  .basis { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; letter-spacing: 0.04em; color: var(--bone-2); white-space: nowrap; }
  .basis .by { color: var(--ash); }
  .basis i { width: 7px; height: 7px; transform: rotate(45deg); background: var(--accent); }
  [data-basis='guide'] .basis i { background: none; border: 1px solid var(--accent); }
  [data-basis='screenshot'] .basis i { background: var(--bone); }
  [data-basis='player'] .basis { color: var(--ember); }
  [data-basis='player'] .basis i { background: none; border: 1px dashed var(--ember); }
  [data-basis='player'] .value { color: var(--bone-2); font-style: italic; }
  [data-basis='sum'] .basis i { background: none; border: 1px solid var(--ash); transform: none; border-radius: 50%; }

  .tips { display: flex; flex-direction: column; gap: 10px; }
  .tips li { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto; gap: 10px; align-items: baseline; font-size: 14px; line-height: 1.55; color: var(--bone-2); animation: up 520ms var(--ease-out) both; animation-delay: calc(var(--i) * 70ms); }
  .tips li :global(svg) { color: var(--accent); transform: translateY(-1px); }

  .patches { position: relative; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 0 14px; }
  .patches::before { content: ''; position: absolute; left: 0; right: 0; top: 27px; height: 1px; background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 25%, transparent)); }
  .patches li { display: grid; grid-template-rows: 18px 18px auto auto; gap: 4px; min-width: 0; animation: up 520ms var(--ease-out) both; animation-delay: calc(var(--i) * 90ms); }
  .patches .v { font-size: 11.5px; color: var(--accent); letter-spacing: 0.04em; }
  .patches .dot { align-self: center; width: 9px; height: 9px; transform: rotate(45deg); background: var(--ink-0); border: 1px solid var(--accent); }
  .patches li:last-child .dot { background: var(--accent); box-shadow: 0 0 8px var(--accent-dim); }
  .patches .note { font-size: 13px; line-height: 1.45; color: var(--bone); }

  .watch { margin-top: 24px; padding: 14px 16px 14px 18px; border-left: 2px solid var(--ember); background: linear-gradient(90deg, rgba(224, 103, 47, 0.1), transparent 75%); }
  .watch .eyebrow { display: flex; align-items: center; gap: 8px; color: var(--ember); margin-bottom: 8px; }
  .watch ul { display: flex; flex-direction: column; gap: 8px; }
  .watch li { font-size: 13.5px; line-height: 1.55; color: var(--bone-2); }

  .to-sorter { display: inline-flex; align-items: center; gap: 8px; margin-top: 22px; font-size: 13px; letter-spacing: 0.02em; }
  .to-sorter :global(svg:last-child) { transition: transform var(--t-micro) var(--ease-out); }
  .to-sorter:hover :global(svg:last-child) { transform: translateX(3px); }

  @media (max-width: 720px) {
    .hold { grid-template-columns: minmax(0, 1fr); }
    .reads { border-left: 0; border-top: 1px solid var(--line); }
    .route li { grid-template-columns: minmax(0, 1fr); gap: 6px; }
    .vessels li { grid-template-columns: 40px minmax(0, 1fr); grid-template-areas: 'n bar' 'p p' 'b b'; gap: 8px 12px; }
    .vn { grid-area: n; font-size: 22px; }
    .bar { grid-area: bar; }
    .vp { grid-area: p; }
    .vessels .by { grid-area: b; }
    .figures li { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'label' 'value' 'basis'; }
    .patches { grid-template-columns: minmax(0, 1fr); gap: 14px; }
    .patches::before { left: 4px; right: auto; top: 0; bottom: 0; width: 1px; height: auto; background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 25%, transparent)); }
    .patches li { grid-template-columns: 9px minmax(0, 1fr); grid-template-rows: auto auto auto; column-gap: 14px; }
    .patches .dot { grid-row: 1; grid-column: 1; }
    .patches .v, .patches .note, .patches .by { grid-column: 2; }
  }
  @media (prefers-reduced-motion: reduce) {
    .reads li, .fams > li, .route li, .vessels li, .bar i, .figures li, .tips li, .patches li { animation: none; }
  }
</style>
