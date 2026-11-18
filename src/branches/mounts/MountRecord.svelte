<script lang="ts">
  // MOUNT-branch plate section: recorded stats, movement ratings, skills and coats.
  // Reads the branch-specific `stats` / `skills` fields that core never touches.
  import { untrack } from 'svelte';
  import { reveal, tween } from '../../core/motion';
  import { app } from '../../core/state.svelte';
  import { CREDITS } from '../../core/format';
  import type { Branch, Entry } from '../../core/types';

  type Stats = { kind: 'horse' | 'beast'; levels?: Record<string, (number | null)[]>; values?: (number | null)[]; move?: number[]; source: string };

  let { entry, branch }: { entry: Entry; branch: Branch } = $props();

  const stats = $derived(entry.stats as Stats | undefined);
  const skills = $derived((entry.skills as [number, string][]) ?? []);
  const levels = $derived(stats?.levels ? Object.keys(stats.levels) : []);
  let level = $state('5');
  $effect(() => { void entry.id; level = levels.at(-1) ?? '5'; });

  const row = $derived.by((): (number | null)[] => {
    if (!stats) return [];
    if (stats.levels) return stats.levels[level] ?? stats.levels[levels.at(-1)!];
    return [...(stats.values ?? []), ...(stats.move ?? [])];
  });
  const core = $derived(row.slice(0, 4));
  const move = $derived(stats?.levels ? row.slice(4, 8) : (stats?.move ?? []));

  // top recorded value per stat across the branch, for the proportional hairline
  const maxes = $derived.by(() => {
    const m = [0, 0, 0, 0];
    for (const e of branch.entries.filter((x) => x.cls === entry.cls)) {
      const s = e.stats as Stats | undefined;
      const vals = s?.levels ? Object.values(s.levels).flat() : (s?.values ?? []);
      const rows = s?.levels ? Object.values(s.levels) : [vals];
      for (const r of rows) for (let i = 0; i < 4; i++) m[i] = Math.max(m[i], Number(r[i] ?? 0));
    }
    return m;
  });

  // count numbers between levels instead of swapping them
  let shown = $state([0, 0, 0, 0]);
  $effect(() => {
    const target = core.map((v) => Number(v ?? 0));
    const from = untrack(() => [...shown]);
    if (app.reducedMotion) { shown = target; return; }
    return tween(0, 1, 700, (k) => { shown = target.map((t, i) => Math.round((from[i] ?? 0) + (t - (from[i] ?? 0)) * k)); });
  });

  const LABELS = ['Health', 'Stamina', 'Attack', 'Defense'];
  const MOVE = ['Speed', 'Acceleration', 'Handling', 'Jump'];
  const hasAnything = $derived(!!stats || skills.length > 0 || entry.variants.length > 0);
</script>

{#if hasAnything}
  <section class="record" data-outline="Record" use:reveal>
    <header class="sec-head">
      <span class="eyebrow">Recorded stats</span>
      <h3 class="display">Record</h3>
    </header>

    {#if stats}
      {#if levels.length > 1}
        <div class="levels" role="radiogroup" aria-label="Horse level">
          {#each levels as l}
            <button role="radio" aria-checked={level === l} class:on={level === l} onclick={() => (level = l)}>Lv {l}</button>
          {/each}
          <span class="lv-note">Horses grow with riding and trust — max level 5.</span>
        </div>
      {/if}

      <dl class="core">
        {#each LABELS as label, i}
          {#if core[i] !== null && core[i] !== undefined}
            <div class="stat" style:--i={i}>
              <dt class="eyebrow">{label}</dt>
              <dd class="display">{(shown[i] ?? core[i] ?? 0).toLocaleString('en-US')}</dd>
              <span class="rule" aria-hidden="true"><i style:width="{Math.min(100, ((core[i] ?? 0) / (maxes[i] || 1)) * 100)}%"></i></span>
            </div>
          {/if}
        {/each}
      </dl>

      {#if move.length}
        <dl class="move">
          {#each MOVE as label, i}
            <div>
              <dt>{label}</dt>
              <dd aria-label="{move[i]} of 5">
                {#each [1, 2, 3, 4, 5] as p}<i class:lit={p <= (move[i] ?? 0)} style:--p={p}></i>{/each}
              </dd>
            </div>
          {/each}
        </dl>
      {/if}
      <p class="src mono">Stats · {CREDITS[stats.source]?.name ?? stats.source}{stats.levels ? ' level tables' : ''}</p>
    {/if}

    {#if skills.length}
      <div class="block">
        <p class="eyebrow">Skills by level</p>
        <ul class="chips">
          {#each skills as [lv, name]}
            <li class:locked={stats?.levels && Number(level) < lv}><span class="mono">Lv{lv}</span>{name}</li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if entry.variants.length}
      <div class="block">
        <p class="eyebrow">Variants · {entry.variants.length}</p>
        <ul class="chips">
          {#each entry.variants as v}<li>{v}</li>{/each}
        </ul>
      </div>
    {/if}
  </section>
{/if}

<style>
  .record { padding: 0 var(--gutter); }
  .sec-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
  .sec-head .eyebrow { font-size: 10px; }
  .sec-head h3 { font-size: 40px; }

  .levels { display: flex; align-items: center; gap: 6px; margin-bottom: 18px; flex-wrap: wrap; }
  .levels button {
    padding: 5px 14px; font-size: 12.5px; color: var(--ash);
    border: 1px solid var(--line-2); border-radius: 999px;
    transition: color var(--t-micro), border-color var(--t-micro), background var(--t-micro);
  }
  .levels button.on { color: var(--bone); border-color: var(--accent); background: var(--accent-dim); }
  .lv-note { margin-left: 8px; font-size: 12px; color: var(--ash); }

  .core { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0; border-top: 1px solid var(--line); }
  .stat { padding: 16px 16px 14px 0; animation: up 600ms var(--ease-out) both; animation-delay: calc(var(--i) * 70ms); }
  .stat + .stat { padding-left: 16px; border-left: 1px solid var(--line); }
  .stat dt { font-size: 10px; }
  .stat dd { margin: 6px 0 10px; font-size: 42px; line-height: 1; font-weight: 600; font-variation-settings: 'opsz' 8; font-variant-numeric: lining-nums tabular-nums; }
  .rule { display: block; height: 1px; background: var(--line); }
  .rule i { display: block; height: 100%; background: var(--accent); transition: width 700ms var(--ease-out); }
  @keyframes up { from { opacity: 0; transform: translateY(10px); } }

  .move { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px 16px; margin: 18px 0 0; }
  .move div { display: flex; flex-direction: column; gap: 6px; }
  .move dt { font-size: 12px; color: var(--ash); }
  .move dd { display: flex; gap: 5px; margin: 0; }
  .move i { width: 9px; height: 9px; transform: rotate(45deg); border: 1px solid var(--ash-2); transition: background 300ms, border-color 300ms; transition-delay: calc(var(--p) * 40ms); }
  .move i.lit { background: var(--bone); border-color: var(--bone); }

  .src { margin-top: 14px; font-size: 10.5px; color: var(--ash-2); }

  .block { margin-top: 22px; }
  .block .eyebrow { font-size: 10px; margin-bottom: 10px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chips li {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 5px 11px; font-size: 12.5px; color: var(--bone);
    border: 1px solid var(--line-2); border-radius: 3px;
    transition: opacity var(--t-ui), border-color var(--t-ui);
  }
  .chips .mono { font-size: 10.5px; color: var(--accent); }
  .chips li.locked { opacity: 0.35; border-style: dashed; }

  @media (max-width: 720px) {
    .core, .move { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .stat:nth-child(3) { padding-left: 0; border-left: 0; }
    .stat:nth-child(n + 3) { border-top: 1px solid var(--line); }
  }
</style>
