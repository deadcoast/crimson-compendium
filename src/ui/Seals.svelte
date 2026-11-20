<script lang="ts">
  import { app } from '../core/state.svelte';
  import { ROMAN, TIER_NAMES, classLabel } from '../core/tree';
  import type { Branch, Entry } from '../core/types';
  import Glyph from './Glyph.svelte';

  let { branch, entry }: { branch: Branch; entry: Entry } = $props();
  let open = $state('');
  $effect(() => { void entry.id; open = ''; });

  const active = $derived(open ? branch.metrics.find((m) => m.id === open) : undefined);
  const activeTier = $derived(active ? entry.tiers[active.id] : undefined);
</script>

<section class="seals" data-outline="Ratings" aria-label="Tier ratings">
  <div class="row">
    {#key entry.id}
      {#each branch.metrics as m, si (m.id)}
        {@const r = entry.tiers[m.id]}
        {@const t = r?.tier ?? 0}
        <button
          class="seal"
          class:top={t === 1}
          class:na={!t}
          class:open={open === m.id}
          aria-expanded={open === m.id}
          style:--si={si}
          onclick={() => (open = open === m.id ? '' : m.id)}
        >
          <span class="rungs" aria-hidden="true">
            {#each [1, 2, 3, 4, 5] as rung}
              <i class:lit={t && rung >= t} style:--r={5 - rung}></i>
            {/each}
          </span>
          <span class="txt">
            <span class="eyebrow metric">{m.label}</span>
            <span class="num display">
              {t ? ROMAN[t] : '—'}
            </span>
            <span class="name">{t ? TIER_NAMES[t] : 'Not rated'}</span>
          </span>
          <span class="sr-only">{m.label}: {t ? `Tier ${t}, ${TIER_NAMES[t]}` : 'not applicable'}</span>
        </button>
      {/each}
    {/key}
  </div>

  <div class="basis" class:shown={!!active}>
    {#if active && activeTier}
      <p>
        <span class="eyebrow">{active.label} · {activeTier.tier ? `Tier ${ROMAN[activeTier.tier]}` : 'n/a'}</span>
        {activeTier.basis}
      </p>
    {:else}
      <p class="hint">
        <Glyph name="info" size={13} />
        <span>Ranked against other {classLabel(branch, entry.cls).toLowerCase()} {branch.plural.toLowerCase()}. Tap a rating for the reasoning, or read <button onclick={() => (app.sheet = 'tiers')}>how tiers work</button>.</span>
      </p>
    {/if}
  </div>
</section>

<style>
  .seals { padding: 6px var(--gutter) 0; }
  .row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }

  .seal {
    position: relative;
    display: grid;
    grid-template-columns: 20px 1fr;
    gap: 14px;
    align-items: center;
    padding: 20px 18px 18px 0;
    text-align: left;
    animation: seal-in 700ms var(--ease-out) both;
    animation-delay: calc(500ms + var(--si) * 90ms);
    transition: background var(--t-micro);
  }
  .seal + .seal { padding-left: 18px; border-left: 1px solid var(--line); }
  .seal:hover, .seal.open { background: linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent); }
  .seal.open::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--accent); }
  @keyframes seal-in { from { opacity: 0; transform: translateY(12px); } }

  .rungs { display: flex; flex-direction: column; gap: 4px; }
  .rungs i {
    height: 3px; width: 20px;
    background: var(--ink-4);
    transform-origin: left;
  }
  .rungs i.lit {
    background: var(--bone-2);
    animation: rung 520ms var(--ease-out) both;
    animation-delay: calc(700ms + var(--si) * 90ms + var(--r) * 60ms);
  }
  .top .rungs i.lit { background: var(--crimson-hi); box-shadow: 0 0 8px var(--crimson); }
  @keyframes rung { from { transform: scaleX(0); } }

  .txt { display: flex; flex-direction: column; min-width: 0; }
  .metric { font-size: 10px; }
  .num { position: relative; z-index: 0; font-size: 46px; line-height: 1; margin: 6px 0 4px; color: var(--bone); width: max-content; }
  .name { font-size: 12px; color: var(--ash); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .top .num { color: var(--crimson-hi); text-shadow: 0 0 24px rgba(255, 62, 72, 0.55); animation: stamp 700ms var(--ease-out) both; animation-delay: calc(760ms + var(--si) * 90ms); }
  .top .name { color: var(--bone-2); }
  @keyframes stamp { 0% { opacity: 0; transform: scale(1.6) rotate(-10deg); } 60% { opacity: 1; transform: scale(0.94); } }
  .top .num::before {
    content: ''; position: absolute; left: 50%; top: 50%; z-index: -1;
    width: 70px; height: 70px; margin: -35px 0 0 -35px;
    background: radial-gradient(closest-side, rgba(255, 62, 72, 0.28), transparent);
    animation: breathe 3.6s ease-in-out infinite alternate;
  }
  @keyframes breathe { to { transform: scale(1.25); opacity: 0.6; } }

  .na .num { color: var(--ash-2); }

  .basis {
    display: grid;
    grid-template-rows: 1fr;
    padding: 14px 0 4px;
    min-height: 54px;
    font-size: 13.5px;
    color: var(--bone-2);
  }
  .basis p { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; animation: up 380ms var(--ease-out) both; }
  .basis .eyebrow { color: var(--accent); font-size: 10px; }
  .hint { color: var(--ash); font-size: 12.5px; flex-wrap: nowrap !important; align-items: flex-start !important; gap: 8px !important; }
  .hint :global(svg) { margin-top: 3px; }
  .hint button { color: var(--bone-2); text-decoration: underline; text-decoration-color: var(--line-3); text-underline-offset: 3px; }
  .hint button:hover { color: var(--bone); }
  @keyframes up { from { opacity: 0; transform: translateY(6px); } }

  @container (max-width: 640px) {
    .row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .seal:nth-child(3) { padding-left: 0; border-left: 0; }
    .seal:nth-child(n + 3) { border-top: 1px solid var(--line); }
    .num { font-size: 40px; }
  }
</style>
