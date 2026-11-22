<script lang="ts">
  // NAVAL plate section for anything that isn't a ship: a material, a fitting or a venture. It ranks the ways
  // to get it, best first, and, for a material the Slipway bills, lists every ship that waits on it with the
  // total, read off matrix.json so the plate and the grid agree. Reads the branch payload `ledger`.
  import { reveal } from '../../core/motion';
  import { href, mediaUrl } from '../../core/tree';
  import { PUBLISHERS } from '../../core/format';
  import type { Branch, Entry, MatrixCell, MatrixCol, MatrixRow } from '../../core/types';
  import Glyph from '../../ui/Glyph.svelte';

  type Method = { title: string; how: string; rate: 'best' | 'good' | 'slow'; by: string; where?: string; yield?: string };
  type Figure = { label: string; value: string; basis: string; by: string };
  type Ledger = {
    methods: Method[];
    uses?: { item: string; n: number | null; by: string }[];
    figures?: Figure[];
    roles?: { role: string; does: string; by: string }[];
    tips?: { text: string; by: string }[];
    watch?: string[];
    patches?: { v: string; note: string; by: string }[];
  };

  let { entry, branch }: { entry: Entry; branch: Branch } = $props();

  const led = $derived(entry.ledger as Ledger | undefined);
  const m = $derived(branch.matrix);
  const bill = $derived(m?.sheets.find((s) => s.id === 'bill'));
  const pub = (by: string) => PUBLISHERS[by] ?? by;
  const num = (c?: MatrixCell) => (c && typeof c === 'object' ? c.n : undefined);
  const val = (c?: MatrixCell) => (c && typeof c === 'object' ? c.v : undefined);

  /** the Slipway columns this plate explains (Camp Stock explains three), each with the ships that need it */
  const needs = $derived.by(() => {
    if (!m || !bill) return [];
    return m.cols
      .filter((c) => c.entry === entry.id && (bill.cols ?? []).includes(c.id))
      .map((c: MatrixCol) => {
        const rows = bill.rows.filter((r) => r.cells[c.id]);
        const built = rows.filter((r) => typeof r.cells[c.id] === 'object' && (r.cells[c.id] as { mark: string }).mark === 'need');
        return { col: c, rows, built, total: built.reduce((n, r) => n + (num(r.cells[c.id]) ?? 0), 0) };
      })
      .filter((x) => x.rows.length);
  });
  const shipOf = (r: MatrixRow) => (r.entry ? branch.byId.get(r.entry) : undefined);
  const RATE = { best: 'Best', good: 'Good', slow: 'Slow' } as const;
  const EYEBROW: Record<string, string> = { stock: 'Where to farm it, best first', fitting: 'Where it is, and what it does', venture: 'How it pays, best first' };
</script>

{#if led}
  <section class="ledger" data-outline="Ledger" use:reveal>
    <header class="sec-head">
      <span class="eyebrow">{EYEBROW[entry.cls] ?? 'How to get it'}</span>
      <h3 class="display">{entry.cls === 'venture' ? 'Returns' : 'Ledger'}</h3>
    </header>

    {#each needs as nd (nd.col.id)}
      <div class="need">
        <div class="tot">
          <p class="eyebrow">{nd.col.label}{nd.built.length ? ' for every build' : ''}</p>
          {#if nd.built.length}
            <p class="num display">{nd.total.toLocaleString('en-US')}</p>
            <p class="unit">across {nd.built.length} {nd.built.length === 1 ? 'ship' : 'ships'}</p>
          {:else}
            <p class="num display">{nd.rows.length}</p>
            <p class="unit">ships priced in it</p>
          {/if}
        </div>
        <ul class="ships">
          {#each (nd.built.length ? nd.built : nd.rows).slice(0, 12) as r, i (r.id)}
            {@const s = shipOf(r)}
            <li style:--i={i}>
              {#if s}
                <a href={href.entry(branch, s.id)}><span class="pt"><img src={mediaUrl(s.media.portrait.src)} alt="" loading="lazy" /></span><span class="sn">{r.label}</span><span class="sv mono">{val(r.cells[nd.col.id])}</span></a>
              {:else}
                <span class="sn">{r.label}</span><span class="sv mono">{val(r.cells[nd.col.id])}</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/each}

    <ol class="methods">
      {#each led.methods as mt, i (mt.title)}
        <li data-rate={mt.rate} style:--i={i}>
          <span class="rank display">{i + 1}</span>
          <div class="mb">
            <p class="mh"><b>{mt.title}</b><span class="rate" data-rate={mt.rate}>{RATE[mt.rate]}</span></p>
            <p class="how">{mt.how}</p>
            {#if mt.where || mt.yield}
              <p class="meta">
                {#if mt.where}<span><Glyph name="map" size={12} />{mt.where}</span>{/if}
                {#if mt.yield}<span class="yl"><Glyph name="stack" size={12} />{mt.yield}</span>{/if}
              </p>
            {/if}
          </div>
          <span class="by">{pub(mt.by)}</span>
        </li>
      {/each}
    </ol>

    {#if led.figures?.length}
      <div class="figs">
        {#each led.figures as f (f.label)}
          <div class="fig"><p class="eyebrow">{f.label}</p><p class="fv">{f.value}</p><p class="by">{f.basis === 'sum' ? 'Sum of published prices' : 'Published'} · {pub(f.by)}</p></div>
        {/each}
      </div>
    {/if}

    {#if led.roles?.length}
      <div class="block">
        <p class="eyebrow">Each role</p>
        <dl class="roles">
          {#each led.roles as r (r.role)}<dt>{r.role}</dt><dd>{r.does}<span class="by">{pub(r.by)}</span></dd>{/each}
        </dl>
      </div>
    {/if}

    {#if led.uses?.length}
      <div class="block">
        <p class="eyebrow">Also used for</p>
        <ul class="uses">{#each led.uses as u (u.item)}<li><span>{u.item}</span>{#if u.n}<span class="mono">×{u.n}</span>{/if}<span class="by">{pub(u.by)}</span></li>{/each}</ul>
      </div>
    {/if}
    {#if led.tips?.length}
      <div class="block">
        <p class="eyebrow">Tips</p>
        <ul class="tips">{#each led.tips as t (t.text)}<li>{t.text}<span class="by">{pub(t.by)}</span></li>{/each}</ul>
      </div>
    {/if}
    {#if led.watch?.length}
      <div class="block">
        <p class="eyebrow">Watch out</p>
        <ul class="watch">{#each led.watch as w (w)}<li><Glyph name="warn" size={14} /><span>{w}</span></li>{/each}</ul>
      </div>
    {/if}
    {#if led.patches?.length}
      <div class="block">
        <p class="eyebrow">Patches</p>
        <ul class="patches">{#each led.patches as p (p.v)}<li><span class="v mono">{p.v}</span><span>{p.note}</span><span class="by">{pub(p.by)}</span></li>{/each}</ul>
      </div>
    {/if}
  </section>
{/if}

<style>
  .ledger { padding: 0 var(--gutter); }
  .sec-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
  .sec-head h3 { font-size: 40px; }
  .eyebrow { font-size: 10px; }
  .by { font-size: 10.5px; color: var(--ash); white-space: nowrap; }
  @keyframes up { from { opacity: 0; transform: translateY(8px); } }

  .need { display: grid; grid-template-columns: minmax(170px, 0.5fr) minmax(0, 1.6fr); border: 1px solid var(--line); margin-bottom: 12px; }
  .tot { padding: 14px 16px 16px; background: linear-gradient(160deg, var(--accent-dim), var(--ink-1) 70%); box-shadow: inset 2px 0 0 var(--accent); display: flex; flex-direction: column; gap: 4px; }
  .num { font-size: clamp(32px, 4vw, 52px); line-height: 1; font-weight: 600; font-variant-numeric: lining-nums tabular-nums; color: var(--bone); margin-top: 4px; }
  .unit { font-size: 12.5px; color: var(--bone-2); }
  .ships { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 2px 14px; padding: 10px 14px; border-left: 1px solid var(--line); align-content: start; }
  .ships li { animation: up 520ms var(--ease-out) both; animation-delay: calc(var(--i) * 40ms); }
  .ships a, .ships li > .sn { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; align-items: center; gap: 9px; padding: 5px 0; color: var(--bone); }
  .ships a:hover .sn { color: var(--accent); }
  .pt { width: 26px; height: 26px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 1px var(--line-2); }
  .pt img { width: 100%; height: 100%; object-fit: cover; }
  .sn { font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sv { font-size: 12px; color: var(--accent); }

  .methods { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
  .methods li { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 12px; align-items: start; padding: 12px 14px; border: 1px solid var(--line); background: var(--ink-1); animation: up 520ms var(--ease-out) both; animation-delay: calc(var(--i) * 60ms); }
  .methods li[data-rate='best'] { border-color: color-mix(in srgb, var(--accent) 38%, var(--line)); box-shadow: inset 2px 0 0 var(--accent); }
  .methods li[data-rate='slow'] { border-style: dashed; }
  .rank { font-size: 30px; line-height: 1; font-weight: 600; color: var(--ash-2); font-variant-numeric: lining-nums; }
  li[data-rate='best'] .rank { color: var(--accent); }
  .mh { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 10px; }
  .mh b { font-size: 15px; font-weight: 600; color: var(--bone); }
  .rate { font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; padding: 1px 6px; border: 1px solid var(--line-2); color: var(--ash); }
  .rate[data-rate='best'] { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 50%, transparent); }
  .how { margin-top: 4px; font-size: 13.5px; line-height: 1.55; color: var(--bone-2); }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 6px; font-size: 12px; color: var(--ash); }
  .meta span { display: inline-flex; align-items: center; gap: 5px; }
  .meta .yl { color: var(--accent); }

  .figs { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin-top: 14px; }
  .fig { padding: 12px 14px; border: 1px solid var(--line); background: var(--ink-1); display: flex; flex-direction: column; gap: 4px; }
  .fv { font-size: 17px; font-weight: 600; color: var(--bone); font-variant-numeric: tabular-nums; }

  .block { margin-top: 22px; }
  .block > .eyebrow { margin-bottom: 10px; }
  .roles { display: grid; grid-template-columns: minmax(110px, 0.3fr) minmax(0, 1fr); border-top: 1px solid var(--line); }
  .roles dt, .roles dd { padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 13.5px; }
  .roles dt { color: var(--bone); font-weight: 600; }
  .roles dd { display: flex; flex-wrap: wrap; gap: 4px 10px; justify-content: space-between; color: var(--bone-2); }
  .uses { display: flex; flex-wrap: wrap; gap: 6px; }
  .uses li { display: inline-flex; align-items: baseline; gap: 8px; padding: 5px 10px; border: 1px solid var(--line); font-size: 12.5px; color: var(--bone-2); }
  .uses .mono { color: var(--accent); font-size: 11.5px; }
  .tips, .watch, .patches { display: flex; flex-direction: column; gap: 8px; }
  .tips li { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; padding-left: 12px; border-left: 2px solid var(--accent); font-size: 13.5px; line-height: 1.55; color: var(--bone-2); }
  .watch li { display: grid; grid-template-columns: 14px minmax(0, 1fr); gap: 10px; font-size: 13px; line-height: 1.55; color: var(--bone-2); }
  .watch :global(svg) { color: var(--ember); margin-top: 3px; }
  .patches li { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 10px; align-items: baseline; font-size: 13px; color: var(--bone-2); }
  .patches .v { font-size: 11.5px; color: var(--accent); }

  @media (prefers-reduced-motion: reduce) { .ships li, .methods li { animation: none; } }
  @media (max-width: 720px) {
    .need { grid-template-columns: minmax(0, 1fr); }
    .ships { border-left: 0; border-top: 1px solid var(--line); }
    .methods li { grid-template-columns: 28px minmax(0, 1fr); }
    .methods li > .by { grid-column: 2; }
  }
</style>
