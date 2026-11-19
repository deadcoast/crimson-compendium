<script lang="ts">
  // RICHES-branch plate section: what a method pays, the documented figures with their basis,
  // what it costs, which multipliers raise it, and what to watch for. Reads the branch-specific
  // `ledger` field that core never touches.
  import { reveal } from '../../core/motion';
  import { href, mediaUrl, ROMAN } from '../../core/tree';
  import { PUBLISHERS } from '../../core/format';
  import type { Branch, Entry } from '../../core/types';
  import Glyph from '../../ui/Glyph.svelte';

  type Figure = { label: string; value: string; basis: 'patch' | 'guide' | 'screenshot' | 'player' | 'sum'; by: string };
  type Ledger = { pays: string; cycle: string; figures: Figure[]; costs: Figure[]; stacks: string[]; watch: string[] };

  let { entry, branch }: { entry: Entry; branch: Branch } = $props();

  const ledger = $derived(entry.ledger as Ledger | undefined);
  const stacks = $derived((ledger?.stacks ?? []).map((id) => branch.byId.get(id)).filter((e): e is Entry => !!e));
  // the multipliers that name this method back, so a multiplier's plate lists what it raises
  const raises = $derived(branch.entries.filter((e) => (e.ledger as Ledger | undefined)?.stacks?.includes(entry.id)));

  const BASIS: Record<Figure['basis'], { label: string; note: string }> = {
    patch: { label: 'Patch notes', note: 'Stated in Pearl Abyss patch notes' },
    guide: { label: 'Guide', note: 'Stated in a published guide' },
    screenshot: { label: 'Screenshot', note: 'Read off an in-game screenshot a guide published' },
    player: { label: 'Player report', note: 'One player’s result, not measured' },
    sum: { label: 'Sum shown', note: 'Worked from the figures above; the sum is printed' },
  };
  const leafAccent = (e: Entry) => branch.leaves.find((l) => l.id === e.leaf)?.accent ?? 'bone';
</script>

{#if ledger}
  <section class="ledger" data-outline="Ledger" use:reveal>
    <header class="sec-head">
      <span class="eyebrow">Pays in <i>·</i> {ledger.pays}</span>
      <h3 class="display">Ledger</h3>
    </header>

    <div class="cycle"><Glyph name="clock" size={14} /><span>{ledger.cycle}</span></div>

    {#if ledger.figures.length}
      <ol class="figures">
        {#each ledger.figures as f, i (f.label)}
          <li style:--i={i} data-basis={f.basis}>
            <span class="label">{f.label}</span>
            <span class="value display">{f.value}</span>
            <span class="basis" title={BASIS[f.basis].note}>
              <i aria-hidden="true"></i>{BASIS[f.basis].label}<span class="by">· {PUBLISHERS[f.by] ?? f.by}</span>
            </span>
          </li>
        {/each}
      </ol>
    {/if}

    {#if ledger.costs.length}
      <div class="block">
        <p class="eyebrow">Costs</p>
        <dl class="costs">
          {#each ledger.costs as c (c.label)}
            <div data-basis={c.basis}>
              <dt>{c.label}</dt>
              <dd>
                <span class="v">{c.value}</span>
                <span class="basis" title={BASIS[c.basis].note}><i aria-hidden="true"></i>{BASIS[c.basis].label}<span class="by">· {PUBLISHERS[c.by] ?? c.by}</span></span>
              </dd>
            </div>
          {/each}
        </dl>
      </div>
    {/if}

    {#each [{ label: 'Raised by', list: stacks }, { label: 'Raises', list: raises }] as group (group.label)}
      {#if group.list.length}
        <div class="block">
          <p class="eyebrow">{group.label}</p>
          <ul class="links">
            {#each group.list as s, i (s.id)}
              <li style:--i={i}>
                <a href={href.entry(branch, s.id)} data-accent={leafAccent(s)}>
                  <span class="pt"><img src={mediaUrl(s.media.portrait.src)} alt="" loading="lazy" /></span>
                  <span class="nm">{s.name}</span>
                  {#if s.tiers.return?.tier}<span class="t mono">{ROMAN[s.tiers.return.tier]}</span>{/if}
                  <Glyph name="right" size={12} />
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    {/each}

    {#if ledger.watch.length}
      <aside class="watch">
        <p class="eyebrow"><Glyph name="warn" size={13} /> Watch out</p>
        <ul>
          {#each ledger.watch as w}<li>{w}</li>{/each}
        </ul>
      </aside>
    {/if}
  </section>
{/if}

<style>
  .ledger { padding: 0 var(--gutter); }
  .sec-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
  .sec-head .eyebrow { font-size: 10px; }
  .sec-head .eyebrow i { font-style: normal; color: var(--ash-2); margin: 0 6px; }
  .sec-head h3 { font-size: 40px; }

  .cycle { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 18px; font-size: 12.5px; color: var(--bone-2); }
  .cycle :global(svg) { color: var(--accent); }

  /* each figure is a ledger line: label, the number set large, and what it stands on */
  .figures { margin: 0; border-top: 1px solid var(--line); }
  .figures li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: 'label basis' 'value value';
    gap: 4px 16px;
    padding: 14px 0 16px;
    border-bottom: 1px solid var(--line);
    animation: up 600ms var(--ease-out) both;
    animation-delay: calc(var(--i) * 80ms);
  }
  .label { grid-area: label; font-size: 12.5px; color: var(--ash); }
  .value {
    grid-area: value;
    font-size: clamp(24px, 2.6vw, 34px);
    line-height: 1.12;
    font-weight: 600;
    font-variation-settings: 'opsz' 8;
    font-variant-numeric: lining-nums tabular-nums;
    color: var(--bone);
  }
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
  @keyframes up { from { opacity: 0; transform: translateY(10px); } }

  .block { margin-top: 22px; }
  .block .eyebrow { font-size: 10px; margin-bottom: 10px; }

  .costs { display: grid; gap: 1px; margin: 0; background: var(--line); border: 1px solid var(--line); }
  .costs div { display: grid; grid-template-columns: minmax(120px, 0.6fr) minmax(0, 1.4fr); align-items: baseline; gap: 14px; padding: 10px 12px; background: var(--ink-0); }
  .costs dt { font-size: 12px; color: var(--ash); }
  .costs dd { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 14px; margin: 0; font-size: 13px; color: var(--bone); font-variant-numeric: tabular-nums; }

  .links { display: flex; flex-wrap: wrap; gap: 8px; }
  .links li { animation: up 520ms var(--ease-out) both; animation-delay: calc(var(--i) * 70ms); }
  .links a {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 5px 12px 5px 5px;
    border: 1px solid var(--line-2); border-radius: 999px;
    font-size: 13px; color: var(--bone);
    transition: border-color var(--t-micro), background var(--t-micro);
  }
  .links a:hover { border-color: var(--accent); background: var(--accent-dim); }
  .links a :global(svg) { color: var(--ash); transition: transform var(--t-micro) var(--ease-out); }
  .links a:hover :global(svg) { transform: translateX(2px); color: var(--accent); }
  .pt { width: 28px; height: 28px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 1px var(--accent); }
  .pt img { width: 100%; height: 100%; object-fit: cover; }
  .t { font-size: 10.5px; color: var(--accent); }

  .watch {
    margin-top: 24px;
    padding: 14px 16px 14px 18px;
    border-left: 2px solid var(--ember);
    background: linear-gradient(90deg, rgba(224, 103, 47, 0.1), transparent 75%);
  }
  .watch .eyebrow { display: flex; align-items: center; gap: 8px; font-size: 10px; color: var(--ember); margin-bottom: 8px; }
  .watch ul { display: flex; flex-direction: column; gap: 8px; }
  .watch li { font-size: 13.5px; line-height: 1.55; color: var(--bone-2); }

  @media (max-width: 720px) {
    .figures li { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'label' 'value' 'basis'; }
    .costs div { grid-template-columns: minmax(0, 1fr); gap: 3px; }
  }
</style>
