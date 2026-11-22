<script lang="ts">
  import { app } from '../core/state.svelte';
  import { href, entriesFor, contextLabel, coverOf, coverFrom, catOf, classLabel, mediaUrl, tierOf, ROMAN } from '../core/tree';
  import type { Branch, Entry, ListContext, MediaItem } from '../core/types';
  import Glyph from './Glyph.svelte';
  import { onLayout } from '../core/motion';

  let { branch, ctx, selectedId }: { branch: Branch; ctx: ListContext; selectedId: string } = $props();

  const all = $derived(entriesFor(branch, ctx));
  const label = $derived(contextLabel(branch, ctx));
  const lens = $derived(ctx.kind === 'lens' ? branch.lenses.find((l) => l.id === ctx.id) : undefined);
  const cat = $derived(ctx.kind === 'cat' ? catOf(branch, ctx.id) : undefined);
  const catLeaf = $derived(ctx.kind === 'cat' && cat ? cat.leaves.find((l) => l.id === ctx.leaf) : undefined);
  const presentClasses = $derived(branch.classes.filter((c) => all.some((e) => e.cls === c.id)));
  // terrain-defined categories (Land, Underwater, Flying) already are a terrain filter
  const showFilter = $derived(presentClasses.length > 1 && !cat?.where.domains);
  const list = $derived(app.cls ? all.filter((e) => e.cls === app.cls) : all);
  type Group = { id: string; label: string; accent?: string; cls?: string; to?: string; items: Entry[] };
  const grouped: Group[] = $derived.by(() => {
    if (cat && !catLeaf) {
      return cat.leaves
        .map((l) => ({ id: l.id, label: l.label, accent: l.accent, to: href.cat(branch, cat.id, l.id), items: l.entries.filter((e) => list.includes(e)) }))
        .filter((g) => g.items.length);
    }
    if ((ctx.kind === 'leaf' || catLeaf) && !app.cls && showFilter) {
      return presentClasses.map((c) => ({ id: c.id, label: c.label, cls: c.id, items: list.filter((e) => e.cls === c.id) }));
    }
    return [{ id: '', label: '', items: list }];
  });
  const cover: MediaItem | undefined = $derived.by(() => {
    if (ctx.kind === 'leaf') {
      const leaf = branch.leaves.find((l) => l.id === ctx.id);
      return leaf ? coverOf(branch, leaf) : undefined;
    }
    if (cat && !catLeaf) return coverFrom(branch, cat.cover);
    const lead = all.find((e) => e.media.hero) ?? all[0];
    if (cat && !lead?.media.hero) return coverFrom(branch, cat.cover);
    return lead ? (lead.media.hero ?? lead.media.portrait) : undefined;
  });
  const ctxKey = $derived(`${ctx.kind}:${ctx.id}:${ctx.kind === 'cat' ? (ctx.leaf ?? '') : ''}:${app.cls}`);
  const line = (e: Entry) => (cat?.line === 'egg' && e.egg) || e.trait;

  // the selection slab glides between rows instead of jumping
  let listEl: HTMLElement | undefined = $state();
  let slab = $state({ y: 0, h: 0, on: false });
  $effect(() => {
    void selectedId; void ctxKey;
    return onLayout(listEl, () => {
      const el = listEl?.querySelector<HTMLElement>(`[data-id="${selectedId}"]`);
      // measure the <li>: its offsetParent is the scroller even while the row's entrance animation runs
      const row = el?.closest('li');
      if (!el || !row) { slab = { ...slab, on: false }; return; }
      slab = { y: row.offsetTop, h: row.offsetHeight, on: true };
      el.scrollIntoView({ block: 'nearest', behavior: app.reducedMotion ? 'auto' : 'smooth' });
    });
  });

  const asideTier = (e: Entry) => {
    if (!lens) return null;
    const t = Math.round(tierOf(e, lens.sortBy));
    return t >= 1 && t <= 5 ? t : null;
  };
  const metricLabel = $derived(
    !lens ? '' : lens.sortBy === 'overall' ? 'all four ratings' : (branch.metrics.find((m) => m.id === lens.sortBy)?.label ?? ''),
  );
</script>

<section class="index" data-accent={label.accent} aria-label="{label.title} list">
  <header class="head">
    {#key ctxKey}
      <div class="cover" aria-hidden="true">
        {#if cover}<img src={mediaUrl(cover.src)} alt="" style:object-position={cover.focus ?? '50% 40%'} />{/if}
      </div>
    {/key}
    <div class="head-text">
      <p class="eyebrow crumbs">
        <a href={href.branch(branch)}>{branch.title}</a>
        {#each label.trail as t}
          <span>/</span>
          {#if t.to}<a href={t.to}>{t.label}</a>{:else}<span>{t.label}</span>{/if}
        {/each}
      </p>
      <h1 class="display title">{label.title}</h1>
      {#if label.subtitle}<p class="subtitle">{label.subtitle}</p>{/if}
      <p class="blurb">{label.blurb}</p>
    </div>
  </header>

  {#if showFilter}
    <div class="filter" role="radiogroup" aria-label="Filter by {(branch.labels?.classAxis ?? "class").toLowerCase()}">
      <button role="radio" aria-checked={app.cls === ''} class:on={app.cls === ''} onclick={() => (app.cls = '')}>
        All <span class="mono">{all.length}</span>
      </button>
      {#each presentClasses as c (c.id)}
        <button role="radio" aria-checked={app.cls === c.id} class:on={app.cls === c.id} data-cls={c.id} onclick={() => (app.cls = c.id)}>
          <Glyph name={c.glyph ?? c.id} size={14} />
          {c.label} <span class="mono">{all.filter((e) => e.cls === c.id).length}</span>
        </button>
      {/each}
    </div>
  {/if}

  {#if lens}
    <p class="lens-note eyebrow"><Glyph name="lens" size={13} /> Ranked by {metricLabel}</p>
  {/if}

  <div class="scroll" bind:this={listEl}>
    <span class="slab" class:on={slab.on} style:transform="translateY({slab.y}px)" style:height="{slab.h}px" aria-hidden="true"></span>
    {#key ctxKey}
      {#each grouped as g, gi (g.id)}
        {#if g.label && g.to}
          <a class="group eyebrow rank" href={g.to} data-accent={g.accent}><i></i>{g.label} <span class="mono">{g.items.length}</span></a>
        {:else if g.label}
          <p class="group eyebrow" data-cls={g.cls}><i></i>{g.label} <span class="mono">{g.items.length}</span></p>
        {/if}
        <ol>
          {#each g.items as e, i (e.id)}
            <li style:--i={i + gi * 3}>
              <a
                class="item"
                class:selected={e.id === selectedId}
                aria-current={e.id === selectedId ? 'true' : undefined}
                data-id={e.id}
                data-cls={e.cls}
                href={href.entry(branch, e.id)}
              >
                <span class="portrait"><img src={mediaUrl(e.media.portrait.src)} alt="" loading="lazy" decoding="async" /></span>
                <span class="text">
                  <span class="name">{e.name}</span>
                  <span class="meta">{e.kind} · {e.region}</span>
                  <span class="trait">{line(e)}</span>
                </span>
                <span class="aside">
                  {#if lens}
                    {@const t = asideTier(e)}
                    <span class="tier" class:top={t === 1}>{t ? ROMAN[t] : '—'}</span>
                  {:else}
                    <span class="cls" title={classLabel(branch, e.cls)}><Glyph name={e.cls} size={15} /></span>
                  {/if}
                </span>
              </a>
            </li>
          {/each}
        </ol>
      {/each}
    {/key}
    {#if list.length === 0}<p class="empty">Nothing here for that filter.</p>{/if}
  </div>
</section>

<style>
  .index {
    grid-area: index;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--ink-0);
    border-right: 1px solid var(--line);
  }

  /* ── header + cover band ─────────── */
  .head { position: relative; padding: 0 22px 18px; }
  .cover { position: relative; height: 150px; margin: 0 -22px; overflow: hidden; }
  .cover img {
    width: 100%; height: 100%; object-fit: cover;
    filter: saturate(0.85) contrast(1.05);
    animation: cover-in 1.2s var(--ease-out) both, drift 26s ease-in-out 1.2s infinite alternate;
  }
  .cover::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(10, 8, 7, 0.15) 0%, rgba(10, 8, 7, 0.55) 55%, var(--ink-0) 100%);
  }
  @keyframes cover-in { from { opacity: 0; transform: scale(1.12); filter: blur(6px) saturate(0.6); } }
  @keyframes drift { to { transform: scale(1.08) translate(-1.5%, 1%); } }

  .head-text { position: relative; margin-top: -54px; }
  .crumbs { display: flex; gap: 8px; font-size: 10px; color: var(--bone-2); }
  .crumbs a:hover { color: var(--bone); }
  .title { font-size: 52px; margin-top: 6px; animation: title-in 700ms var(--ease-out) both; }
  @keyframes title-in { from { opacity: 0; transform: translateY(14px); letter-spacing: 0.04em; } }
  .subtitle { font-family: var(--f-display); font-style: italic; font-size: 21px; color: var(--bone-2); margin-top: 2px; animation: title-in 700ms var(--ease-out) both 80ms; }
  .blurb { margin-top: 10px; color: var(--bone-2); font-size: 13.5px; line-height: 1.5; max-width: 42ch; }

  /* ── terrain filter ──────────────── */
  .filter { display: flex; gap: 6px; padding: 0 22px 14px; flex-wrap: wrap; }
  .filter button {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 6px 11px;
    font-size: 12.5px; color: var(--ash);
    border: 1px solid var(--line-2); border-radius: 999px;
    transition: color var(--t-micro), border-color var(--t-micro), background var(--t-micro);
  }
  .filter button .mono { font-size: 10.5px; color: var(--ash); }
  .filter button:hover { color: var(--bone); border-color: var(--line-3); }
  .filter button.on { color: var(--bone); border-color: var(--accent); background: var(--accent-dim); }
  .filter button.on .mono { color: var(--bone-2); } /* ash fails contrast on a tinted chip over a bright cover */
  .filter button[data-cls].on { border-color: var(--cls); background: color-mix(in srgb, var(--cls) 14%, transparent); }
  .filter button[data-cls] :global(svg) { color: var(--cls); }

  .lens-note { display: flex; align-items: center; gap: 7px; padding: 0 22px 10px; font-size: 10px; color: var(--crimson-hi); }

  /* ── list ────────────────────────── */
  .scroll { position: relative; flex: 1; overflow-y: auto; padding: 4px 12px 40px; }
  .slab {
    position: absolute; left: 12px; right: 12px; top: 0;
    background: linear-gradient(90deg, var(--accent-dim), rgba(255, 255, 255, 0.025) 70%);
    border-left: 2px solid var(--accent);
    opacity: 0;
    transition: transform 460ms var(--ease-out), height 460ms var(--ease-out), opacity var(--t-micro);
    pointer-events: none;
  }
  .slab.on { opacity: 1; }

  .group { display: flex; align-items: center; gap: 8px; margin: 16px 10px 6px; font-size: 10px; }
  .group i { width: 14px; height: 1px; background: var(--cls); }
  .group.rank { color: var(--bone-2); transition: color var(--t-micro); }
  .group.rank i { width: 7px; height: 7px; margin: 0 3px; transform: rotate(45deg); background: var(--accent); box-shadow: 0 0 8px var(--accent-dim); }
  .group.rank:hover { color: var(--bone); }
  .group .mono { color: var(--ash); font-size: 10.5px; }

  li { animation: row-in 520ms var(--ease-out) both; animation-delay: calc(var(--i) * 24ms); }
  @keyframes row-in { from { opacity: 0; transform: translateY(10px); } }

  .item {
    position: relative;
    display: grid;
    grid-template-columns: 52px 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 10px 12px 10px 12px;
  }
  .portrait {
    width: 52px; height: 52px;
    border-radius: 50%;
    overflow: hidden;
    box-shadow: 0 0 0 1px var(--line-2), 0 0 0 4px var(--ink-0), 0 0 0 5px transparent;
    transition: box-shadow var(--t-ui) var(--ease-out), transform var(--t-ui) var(--ease-out);
  }
  .portrait img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.12); transition: transform 700ms var(--ease-out); }
  .text { display: flex; flex-direction: column; min-width: 0; }
  .name { font-weight: 600; font-size: 15px; color: var(--bone); letter-spacing: 0.005em; }
  .meta { font-size: 11.5px; color: var(--ash); font-variation-settings: 'wdth' 88; }
  .trait {
    margin-top: 2px; font-size: 12.5px; color: var(--bone-2);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .aside { color: var(--cls); opacity: 0.7; }
  .tier { font-family: var(--f-display); font-size: 22px; color: var(--bone-2); opacity: 1; }
  .tier.top { color: var(--crimson-hi); text-shadow: 0 0 14px rgba(255, 62, 72, 0.5); }

  .item:hover .portrait { box-shadow: 0 0 0 1px var(--line-3), 0 0 0 4px var(--ink-0), 0 0 0 5px var(--line-2); }
  .item:hover .portrait img { transform: scale(1.22); }
  .item.selected .portrait { box-shadow: 0 0 0 1px var(--accent), 0 0 0 4px var(--ink-0), 0 0 0 5px var(--accent-dim); transform: scale(1.04); }
  .item.selected .aside { opacity: 1; }

  .empty { padding: 30px 12px; color: var(--ash); font-size: 13px; }

  @media (max-width: 860px) {
    .index { border-right: 0; }
    .cover { height: 132px; }
    .title { font-size: 44px; }
  }
</style>
