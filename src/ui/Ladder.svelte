<script lang="ts">
  import { untrack } from 'svelte';
  import { crossfade, scale } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { quintOut } from 'svelte/easing';
  import { app } from '../core/state.svelte';
  import { classLabel, href, mediaUrl, ROMAN, TIER_NAMES } from '../core/tree';
  import type { Branch } from '../core/types';
  import Glyph from './Glyph.svelte';
  import { onLayout } from '../core/motion';

  let { branch }: { branch: Branch } = $props();

  // initial selections only; the ladder remounts per branch
  let metric = $state(untrack(() => branch.metrics[0].id));
  let cls = $state(untrack(() => branch.classes[0].id));
  let leaves = $state<Record<string, boolean>>(untrack(() => Object.fromEntries(branch.leaves.map((l) => [l.id, true]))));

  const m = $derived(branch.metrics.find((x) => x.id === metric)!);
  const pool = $derived(branch.entries.filter((e) => e.cls === cls && leaves[e.leaf]));
  const leafRank = (id: string) => branch.leaves.findIndex((l) => l.id === id);
  const rows = $derived(
    [1, 2, 3, 4, 5, 0]
      .map((t) => ({
        t,
        items: pool
          .filter((e) => (e.tiers[metric]?.tier ?? 0) === t)
          .sort((a, b) => leafRank(a.leaf) - leafRank(b.leaf) || a.name.localeCompare(b.name)),
      }))
      .filter((r) => r.t !== 0 || r.items.length),
  );
  const accentOf = (leafId: string) => branch.leaves.find((l) => l.id === leafId)?.accent ?? 'bone';

  const [send, receive] = crossfade({
    duration: (d) => Math.min(700, Math.sqrt(d * 260)),
    easing: quintOut,
    fallback: (node) => scale(node, { start: 0.6, duration: 360, easing: quintOut }),
  });

  // underline that slides between metric tabs
  let tabs: HTMLElement | undefined = $state();
  let bar = $state({ x: 0, w: 0 });
  $effect(() => {
    void metric;
    return onLayout(tabs, () => {
      const el = tabs?.querySelector<HTMLElement>('.on');
      if (el) bar = { x: el.offsetLeft, w: el.offsetWidth };
    });
  });
  const flipMs = $derived(app.reducedMotion ? 0 : 620);
</script>

<section class="ladder" aria-label="Tier ladder">
  <header class="head">
    <p class="eyebrow crumbs"><a href={href.branch(branch)}>{branch.title}</a><span>/</span><span>Every {branch.singular.toLowerCase()}, ranked</span></p>
    <h1 class="display">Tier Ladder</h1>

    <div class="metrics" role="tablist" aria-label="Metric" bind:this={tabs}>
      {#each branch.metrics as x (x.id)}
        <button role="tab" aria-selected={metric === x.id} class:on={metric === x.id} class="display" onclick={() => (metric = x.id)}>{x.label}</button>
      {/each}
      <span class="bar" style:transform="translateX({bar.x}px)" style:width="{bar.w}px" aria-hidden="true"></span>
    </div>
    {#key metric}<p class="blurb">{m.blurb}</p>{/key}

    <div class="filters">
      <div class="seg" role="radiogroup" aria-label={branch.labels?.classAxis ?? 'Class'}>
        {#each branch.classes as c (c.id)}
          <button role="radio" aria-checked={cls === c.id} class:on={cls === c.id} data-cls={c.id} onclick={() => (cls = c.id)}>
            <Glyph name={c.glyph ?? c.id} size={14} />{c.label}
            <span class="mono">{branch.entries.filter((e) => e.cls === c.id).length}</span>
          </button>
        {/each}
      </div>
      <div class="seg leaves" aria-label="Leaves">
        {#each branch.leaves as l (l.id)}
          <button aria-pressed={leaves[l.id]} class:on={leaves[l.id]} data-accent={l.accent} onclick={() => (leaves[l.id] = !leaves[l.id])}>
            <i></i>{l.label}
          </button>
        {/each}
      </div>
    </div>
  </header>

  <ol class="rungs">
    {#each rows as r (r.t)}
      <li class="rung" class:top={r.t === 1} class:na={r.t === 0}>
        <div class="mark">
          <span class="num display">{r.t ? ROMAN[r.t] : '—'}</span>
          <span class="nm eyebrow">{r.t ? TIER_NAMES[r.t] : 'Not rated'}</span>
        </div>
        <div class="tokens">
          {#each r.items as e (e.id)}
            <a
              class="token"
              href={href.entry(branch, e.id)}
              data-accent={accentOf(e.leaf)}
              title={e.tiers[metric]?.basis}
              in:receive={{ key: e.id }}
              out:send={{ key: e.id }}
              animate:flip={{ duration: flipMs, easing: quintOut }}
            >
              <span class="pt"><img src={mediaUrl(e.media.portrait.src)} alt="" loading="lazy" /></span>
              <span class="tn">{e.name}</span>
            </a>
          {/each}
          {#if !r.items.length}<span class="none">No {classLabel(branch, cls).toLowerCase()} {branch.plural.toLowerCase()} at this tier</span>{/if}
        </div>
      </li>
    {/each}
  </ol>
  <p class="foot">{branch.ladderNote} Hover a token for its reasoning, open it for the full basis.</p>
</section>

<style>
  .ladder {
    height: 100%;
    overflow-y: auto;
    padding: 34px var(--gutter) 80px;
    background:
      radial-gradient(1200px 500px at 20% -10%, rgba(200, 30, 43, 0.12), transparent 60%),
      var(--ink-0);
  }
  .crumbs { display: flex; gap: 8px; font-size: 10px; }
  .crumbs a:hover { color: var(--bone); }
  h1 { font-size: clamp(54px, 6vw, 92px); margin-top: 8px; animation: in 800ms var(--ease-out) both; }
  @keyframes in { from { opacity: 0; transform: translateY(18px); } }

  .metrics { position: relative; display: flex; gap: 28px; margin-top: 26px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
  .metrics button { padding: 0 0 12px; font-size: 26px; color: var(--ash); transition: color var(--t-micro); }
  .metrics button:hover { color: var(--bone-2); }
  .metrics button.on { color: var(--bone); }
  .bar { position: absolute; left: 0; bottom: -1px; height: 2px; background: var(--crimson-hi); box-shadow: 0 0 12px var(--crimson); transition: transform 500ms var(--ease-out), width 500ms var(--ease-out); }
  .blurb { margin-top: 14px; max-width: 70ch; color: var(--bone-2); font-size: 14px; animation: in 500ms var(--ease-out) both; }

  .filters { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 20px; }
  .seg { display: flex; gap: 6px; flex-wrap: wrap; }
  .seg button {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 6px 12px; font-size: 12.5px; color: var(--ash);
    border: 1px solid var(--line-2); border-radius: 999px;
    transition: color var(--t-micro), border-color var(--t-micro), background var(--t-micro);
  }
  .seg .mono { font-size: 10.5px; color: var(--ash); }
  .seg button:hover { color: var(--bone); }
  .seg button.on { color: var(--bone); }
  .seg button[data-cls].on { border-color: var(--cls); background: color-mix(in srgb, var(--cls) 14%, transparent); }
  .seg button[data-cls] :global(svg) { color: var(--cls); }
  .leaves i { width: 7px; height: 7px; transform: rotate(45deg); border: 1px solid var(--accent); }
  .leaves button.on i { background: var(--accent); }
  .leaves button.on { border-color: var(--line-3); }

  .rungs { margin-top: 30px; border-top: 1px solid var(--line-2); }
  .rung {
    display: grid;
    grid-template-columns: 170px 1fr;
    min-height: 118px;
    border-bottom: 1px solid var(--line);
  }
  .rung.top { background: linear-gradient(90deg, rgba(200, 30, 43, 0.16), rgba(200, 30, 43, 0.02) 60%, transparent); border-bottom-color: rgba(255, 62, 72, 0.25); }
  .mark { display: flex; flex-direction: column; justify-content: center; gap: 4px; padding: 16px 0; border-right: 1px solid var(--line); }
  .num { font-size: 58px; line-height: 1; color: var(--bone-2); }
  .top .num { color: var(--crimson-hi); text-shadow: 0 0 30px rgba(255, 62, 72, 0.55); }
  .na .num { color: var(--ash-2); }
  .nm { font-size: 10px; }
  .top .nm { color: var(--bone-2); }

  .tokens { display: flex; flex-wrap: wrap; align-content: center; gap: 14px 10px; padding: 16px 0 16px 22px; }
  .token { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 92px; text-align: center; }
  .pt {
    width: 64px; height: 64px; border-radius: 50%; overflow: hidden;
    box-shadow: 0 0 0 1px var(--line-2), 0 0 0 4px var(--ink-0), 0 0 0 5px var(--accent-dim);
    transition: transform var(--t-ui) var(--ease-out), box-shadow var(--t-ui);
  }
  .pt img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.12); }
  .top .pt { box-shadow: 0 0 0 1px var(--crimson-hi), 0 0 0 4px var(--ink-0), 0 0 22px rgba(255, 62, 72, 0.45); }
  .tn { font-size: 12px; line-height: 1.25; color: var(--bone-2); }
  .token:hover .pt { transform: translateY(-4px) scale(1.06); box-shadow: 0 0 0 1px var(--accent), 0 0 0 4px var(--ink-0), 0 10px 24px rgba(0, 0, 0, 0.5); }
  .token:hover .tn { color: var(--bone); }
  .none { font-size: 12.5px; color: var(--ash); }
  .foot { margin-top: 22px; max-width: 80ch; font-size: 12.5px; color: var(--ash); }

  @media (max-width: 720px) {
    .metrics { flex-wrap: nowrap; gap: 20px; overflow-x: auto; scrollbar-width: none; }
    .metrics button { font-size: 21px; flex: none; }
    .rung { grid-template-columns: 84px 1fr; }
    .num { font-size: 40px; }
    .nm { display: none; }
    .tokens { padding-left: 12px; }
    .token { width: 76px; }
    .pt { width: 54px; height: 54px; }
  }
</style>
