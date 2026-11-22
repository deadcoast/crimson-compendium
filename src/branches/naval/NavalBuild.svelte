<script lang="ts">
  // NAVAL plate section for a ship: its stats, the verdict on it, and its bill as a checklist. Nothing here is
  // written per plate: the stats and the bill are read off the Slipway (matrix.json), the farm methods off each
  // material's own plate, so the grid, the ship and the material can't disagree. Ticks are kept per ship in
  // this browser (localStorage), and a ship's plate shows which other ships take the same material.
  import { reveal } from '../../core/motion';
  import { href, mediaUrl } from '../../core/tree';
  import { PUBLISHERS } from '../../core/format';
  import type { Branch, Entry, MatrixCell, MatrixCol } from '../../core/types';
  import Glyph from '../../ui/Glyph.svelte';

  type Credited = { text: string; by: string };
  type Naval = { how: 'build' | 'buy'; port: string; verdict: Credited; tips?: Credited[]; watch?: string[]; patches?: { v: string; note: string; by: string }[] };
  type Method = { title: string; how: string; rate: 'best' | 'good' | 'slow'; by: string; where?: string; yield?: string };

  let { entry, branch }: { entry: Entry; branch: Branch } = $props();

  const nav = $derived(entry.naval as Naval | undefined);
  const m = $derived(branch.matrix);
  const sheetRow = (sheet: string) => m?.sheets.find((s) => s.id === sheet)?.rows.find((r) => r.entry === entry.id);
  const billSheet = $derived(m?.sheets.find((s) => s.id === 'bill'));
  const bill = $derived(sheetRow('bill'));
  const stats = $derived(sheetRow('stats'));
  const colOf = (id: string) => m?.cols.find((c) => c.id === id);
  const num = (c?: MatrixCell) => (c && typeof c === 'object' ? c.n : undefined);
  const val = (c?: MatrixCell) => (c && typeof c === 'object' ? c.v : undefined);
  const pub = (by: string) => PUBLISHERS[by] ?? by;

  // the bill's lines, in the Slipway's column order
  const lines = $derived.by(() => {
    if (!bill || !billSheet || !m) return [];
    return (billSheet.cols ?? m.cols.map((c) => c.id))
      .map((id) => colOf(id))
      .filter((c): c is MatrixCol => !!c && !!bill.cells[c.id])
      .map((c) => ({ col: c, plate: c.entry ? branch.byId.get(c.entry) : undefined, v: val(bill.cells[c.id]) ?? '', n: num(bill.cells[c.id]) ?? 0 }));
  });
  /** the other ships whose bill takes this column, with how many */
  const alsoNeed = (c: MatrixCol) => (billSheet?.rows ?? []).filter((r) => r !== bill && r.cells[c.id]).map((r) => ({ row: r, v: val(r.cells[c.id]) }));
  const methodsOf = (e?: Entry) => ((e?.ledger as { methods?: Method[] } | undefined)?.methods ?? []).slice(0, 2);
  const funds = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString('en-US')} Silver donated` : '');

  // ticks: which lines you already hold, kept per ship in this browser
  const key = $derived(`cc:naval:${entry.id}`);
  let ticked = $state<Record<string, boolean>>({});
  let open = $state<Record<string, boolean>>({});
  $effect(() => {
    const k = key;
    let saved: Record<string, boolean> = {};
    try { saved = JSON.parse(localStorage.getItem(k) ?? '{}') ?? {}; } catch { saved = {}; }
    ticked = saved;
    open = {};
  });
  function toggle(id: string) {
    ticked = { ...ticked, [id]: !ticked[id] };
    try { localStorage.setItem(key, JSON.stringify(ticked)); } catch { /* storage refused: ticks last this visit */ }
  }
  function reset() {
    ticked = {};
    try { localStorage.removeItem(key); } catch { /* nothing kept */ }
  }
  const done = $derived(lines.filter((l) => ticked[l.col.id]).length);
  const R = 30;
  const C = 2 * Math.PI * R;

  // stats as gauges: the three 1–5 ratings as pips, Health and Hold as numbers
  const PIPS = [
    { id: 'speed', label: 'Movement' },
    { id: 'accel', label: 'Acceleration' },
    { id: 'handling', label: 'Handling' },
  ];
  const RATE = { best: 'Best', good: 'Good', slow: 'Slow' } as const;
  const hold = $derived(stats ? val(stats.cells.hold) : undefined);
</script>

{#if nav && bill}
  <section class="build" data-outline="Build sheet" use:reveal>
    <header class="sec-head">
      <span class="eyebrow">{nav.how === 'build' ? 'What it takes — tick off what you hold' : 'What it costs'}</span>
      <h3 class="display">{nav.how === 'build' ? 'Build sheet' : 'Price'}</h3>
    </header>

    {#if stats}
      <div class="gauges">
        {#each PIPS as p (p.id)}
          {@const n = num(stats.cells[p.id]) ?? 0}
          <div class="g">
            <p class="eyebrow">{p.label}</p>
            <p class="pips" aria-label="{p.label} {n} of 5">{#each [1, 2, 3, 4, 5] as i (i)}<i class:on={i <= n}></i>{/each}<b class="mono">{n}</b></p>
          </div>
        {/each}
        <div class="g">
          <p class="eyebrow">Health</p>
          <p class="big display">{val(stats.cells.health)}</p>
        </div>
        <div class="g">
          <p class="eyebrow">Hold</p>
          <p class="big display" class:none={!hold}>{hold ?? '—'}</p>
          <p class="unit">{hold ? 'slots of trade goods' : 'unpublished'}</p>
        </div>
        <div class="g">
          <p class="eyebrow">{nav.how === 'build' ? 'Build time' : 'Ready'}</p>
          <p class="big display">{val(stats.cells.time)}</p>
        </div>
      </div>
    {/if}

    <p class="verdict"><Glyph name="target" size={16} /><span>{nav.verdict.text}</span><span class="by">{pub(nav.verdict.by)}</span></p>
    <p class="port"><Glyph name="map" size={14} /><span>{nav.port}</span></p>

    {#if nav.how === 'build'}
      <div class="sheet">
        <div class="ring" aria-label="{done} of {lines.length} lines held">
          <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true">
            <circle cx="36" cy="36" r={R} class="track" />
            <circle cx="36" cy="36" r={R} class="fill" style:stroke-dasharray="{C}" style:stroke-dashoffset={C * (1 - done / Math.max(1, lines.length))} />
          </svg>
          <p><b class="display">{done}</b><span>/ {lines.length}</span></p>
          {#if done}<button type="button" class="reset" onclick={reset}>Clear ticks</button>{/if}
        </div>
        <ol class="lines">
          {#each lines as l, i (l.col.id)}
            {@const others = alsoNeed(l.col)}
            {@const meth = methodsOf(l.plate)}
            <li class:held={ticked[l.col.id]} style:--i={i}>
              <div class="line">
                <button type="button" class="tick" role="checkbox" aria-checked={!!ticked[l.col.id]} aria-label="Hold {l.v} {l.col.label}" onclick={() => toggle(l.col.id)}>
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.4 6.4 11.6 13 4.6" /></svg>
                </button>
                {#if l.plate}
                  <a class="mat" href={href.entry(branch, l.plate.id)}><span class="pt"><img src={mediaUrl(l.plate.media.portrait.src)} alt="" loading="lazy" /></span><span class="ml">{l.col.label}</span></a>
                {:else}
                  <span class="mat"><span class="ml">{l.col.label}</span></span>
                {/if}
                <span class="qty mono">{l.v}</span>
                <button type="button" class="more" aria-expanded={!!open[l.col.id]} aria-label="{open[l.col.id] ? 'Hide' : 'Show'} where to get {l.col.label}" onclick={() => (open[l.col.id] = !open[l.col.id])}>
                  <Glyph name={open[l.col.id] ? 'collapse' : 'expand'} size={13} />
                </button>
              </div>
              {#if open[l.col.id]}
                <div class="drawer">
                  {#if l.col.id === 'cf' && funds(l.n)}<p class="eq">= {funds(l.n)}{l.n >= 500000 ? ` · ${(l.n / 500000).toLocaleString('en-US')} Gold Bar${l.n === 500000 ? '' : 's'}` : ''}</p>{/if}
                  {#each meth as mt, mi (mt.title)}
                    <p class="mt"><span class="rate" data-rate={mt.rate}>{mi === 0 ? 'Best' : RATE[mt.rate]}</span><b>{mt.title}</b><span class="how">{mt.how}</span>{#if mt.yield}<span class="yl mono">{mt.yield}</span>{/if}<span class="by">{pub(mt.by)}</span></p>
                  {/each}
                  {#if others.length}<p class="also"><span class="eyebrow">Also in</span>{others.length > 6 ? `${others.length} other ships` : others.map((o) => `${o.row.label} ${o.v ?? ''}`.trim()).join(' · ')}</p>{/if}
                  {#if l.plate}<a class="go" href={href.entry(branch, l.plate.id)}>Every way to get {l.col.label}<Glyph name="right" size={12} /></a>{/if}
                </div>
              {/if}
            </li>
          {/each}
        </ol>
      </div>
      <p class="kept">Ticks stay in this browser, per ship. <a href={href.matrix(branch)}>Compare every bill on the Slipway</a>.</p>
    {:else}
      {@const cf = lines.find((l) => l.col.id === 'cf')}
      {#if cf}
        <div class="price">
          <p class="num display">{cf.v}</p>
          <p class="unit">Camp Funds{funds(cf.n) ? ` · ${funds(cf.n)}` : ''}</p>
          {#if cf.plate}<a class="go" href={href.entry(branch, cf.plate.id)}>Where Camp Funds come from<Glyph name="right" size={12} /></a>{/if}
        </div>
      {/if}
    {/if}

    {#if nav.tips?.length}
      <div class="block">
        <p class="eyebrow">Tips</p>
        <ul class="tips">{#each nav.tips as t (t.text)}<li>{t.text}<span class="by">{pub(t.by)}</span></li>{/each}</ul>
      </div>
    {/if}
    {#if nav.watch?.length}
      <div class="block">
        <p class="eyebrow">Watch out</p>
        <ul class="watch">{#each nav.watch as w (w)}<li><Glyph name="warn" size={14} /><span>{w}</span></li>{/each}</ul>
      </div>
    {/if}
    {#if nav.patches?.length}
      <div class="block">
        <p class="eyebrow">Patches</p>
        <ul class="patches">{#each nav.patches as p (p.v)}<li><span class="v mono">{p.v}</span><span>{p.note}</span><span class="by">{pub(p.by)}</span></li>{/each}</ul>
      </div>
    {/if}
  </section>
{/if}

<style>
  .build { padding: 0 var(--gutter); }
  .sec-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
  .sec-head h3 { font-size: 40px; }
  .eyebrow { font-size: 10px; }
  .by { font-size: 10.5px; color: var(--ash); white-space: nowrap; }

  .gauges { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); border: 1px solid var(--line); background: linear-gradient(160deg, var(--accent-dim), var(--ink-1) 60%); }
  .g { padding: 12px 14px 14px; border-left: 1px solid var(--line); display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .g:first-child { border-left: 0; box-shadow: inset 2px 0 0 var(--accent); }
  .pips { display: flex; align-items: center; gap: 3px; }
  .pips i { width: 12px; height: 12px; border: 1px solid var(--line-3); transform: skewX(-12deg); }
  .pips i.on { background: var(--accent); border-color: var(--accent); }
  .pips b { margin-left: 8px; font-size: 13px; color: var(--bone); }
  .big { font-size: clamp(20px, 1.9vw, 28px); line-height: 1; font-weight: 600; font-variant-numeric: lining-nums tabular-nums; color: var(--bone); white-space: nowrap; }
  .big.none { color: var(--ash); }
  .unit { font-size: 11.5px; color: var(--ash); }

  .verdict { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; gap: 10px; align-items: start; margin-top: 12px; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line)); background: var(--ink-1); font-size: 14.5px; line-height: 1.55; color: var(--bone); }
  .verdict :global(svg) { color: var(--accent); margin-top: 3px; }
  .port { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 12.5px; color: var(--bone-2); }
  .port :global(svg) { color: var(--ash); }

  .sheet { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 18px; margin-top: 18px; align-items: start; }
  .ring { position: sticky; top: 16px; display: grid; justify-items: center; gap: 6px; padding: 14px 8px; border: 1px solid var(--line); background: var(--ink-1); }
  .ring svg { transform: rotate(-90deg); }
  .ring circle { fill: none; stroke-width: 5; }
  .track { stroke: var(--line-2); }
  .fill { stroke: var(--accent); stroke-linecap: round; transition: stroke-dashoffset var(--t-ui) var(--ease-out); }
  .ring p { display: flex; align-items: baseline; gap: 4px; margin-top: -2px; }
  .ring b { font-size: 26px; font-weight: 600; color: var(--bone); font-variant-numeric: lining-nums tabular-nums; }
  .ring p span { font-size: 12px; color: var(--ash); }
  .reset { font-size: 11px; color: var(--ash); border-bottom: 1px dashed var(--line-2); }
  .reset:hover { color: var(--bone); }

  .lines { display: flex; flex-direction: column; border-top: 1px solid var(--line); }
  .lines > li { border-bottom: 1px solid var(--line); animation: up 520ms var(--ease-out) both; animation-delay: calc(var(--i) * 40ms); }
  @keyframes up { from { opacity: 0; transform: translateY(8px); } }
  .line { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto 32px; align-items: center; gap: 10px; min-height: 48px; }
  .tick { display: grid; place-items: center; width: 24px; height: 24px; border: 1.5px solid var(--line-3); border-radius: 4px; color: transparent; transition: background var(--t-micro), border-color var(--t-micro), color var(--t-micro); }
  .tick svg { fill: none; stroke: currentColor; stroke-width: 2.2; }
  .tick:hover { border-color: var(--accent); }
  .tick:focus-visible, .more:focus-visible { outline: 1.5px solid var(--accent); outline-offset: 2px; }
  .held .tick { background: var(--accent); border-color: var(--accent); color: var(--ink-0); }
  .mat { display: inline-flex; align-items: center; gap: 10px; min-width: 0; color: var(--bone); }
  a.mat:hover .ml { color: var(--accent); }
  .pt { flex: none; width: 30px; height: 30px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 1px var(--line-2); }
  .pt img { width: 100%; height: 100%; object-fit: cover; }
  .ml { font-size: 14.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .held .ml { color: var(--ash); text-decoration: line-through; text-decoration-color: var(--line-3); }
  .qty { font-size: 14px; color: var(--accent); font-variant-numeric: tabular-nums; }
  .held .qty { color: var(--ash); }
  .more { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; color: var(--ash); }
  .more:hover, .more[aria-expanded='true'] { color: var(--bone); background: var(--ink-3); }

  .drawer { display: flex; flex-direction: column; gap: 8px; padding: 2px 0 14px 40px; }
  .eq { font-size: 12.5px; color: var(--bone-2); }
  .mt { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-size: 13px; line-height: 1.5; color: var(--bone-2); }
  .mt b { color: var(--bone); font-weight: 600; }
  .mt .how { flex-basis: 100%; }
  .rate { font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; padding: 1px 6px; border: 1px solid var(--line-2); color: var(--ash); }
  .rate[data-rate='best'] { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 50%, transparent); }
  .yl { font-size: 11px; color: var(--accent); }
  .also { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; font-size: 12px; color: var(--ash); }
  .go { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border: 1px solid var(--line-2); border-radius: 999px; font-size: 12px; color: var(--bone); }
  .go:hover { border-color: var(--accent); background: var(--accent-dim); }
  .kept { margin-top: 10px; font-size: 12px; color: var(--ash); }
  .kept a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in srgb, var(--accent) 55%, transparent); }

  .price { margin-top: 16px; padding: 16px 18px; border: 1px solid var(--line); background: linear-gradient(160deg, color-mix(in srgb, var(--brass) 14%, transparent), var(--ink-1) 70%); box-shadow: inset 2px 0 0 var(--brass); display: flex; flex-direction: column; gap: 6px; }
  .num { font-size: clamp(34px, 4.4vw, 56px); line-height: 1; font-weight: 600; font-variant-numeric: lining-nums tabular-nums; color: var(--bone); }
  .price .unit { font-size: 13px; color: var(--bone-2); }

  .block { margin-top: 22px; }
  .block > .eyebrow { margin-bottom: 10px; }
  .tips, .watch, .patches { display: flex; flex-direction: column; gap: 8px; }
  .tips li { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; padding-left: 12px; border-left: 2px solid var(--accent); font-size: 13.5px; line-height: 1.55; color: var(--bone-2); }
  .watch li { display: grid; grid-template-columns: 14px minmax(0, 1fr); gap: 10px; font-size: 13px; line-height: 1.55; color: var(--bone-2); }
  .watch :global(svg) { color: var(--ember); margin-top: 3px; }
  .patches li { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 10px; align-items: baseline; font-size: 13px; color: var(--bone-2); }
  .patches .v { font-size: 11.5px; color: var(--accent); }

  @media (prefers-reduced-motion: reduce) { .lines > li { animation: none; } .fill { transition: none; } }
  @media (max-width: 720px) {
    .sheet { grid-template-columns: minmax(0, 1fr); }
    .ring { position: static; grid-template-columns: auto auto auto; align-items: center; justify-content: start; gap: 14px; }
    .drawer { padding-left: 0; }
  }
</style>
