<script lang="ts">
  // QUALITY OF LIFE plate section: the friction an upgrade removes and what replaces it, the documented
  // figures with their basis, the patches that shaped it, the upgrades it pairs with, and what to watch
  // for. Reads the branch-specific `remedy` field that core never touches.
  import { reveal } from '../../core/motion';
  import { href, mediaUrl } from '../../core/tree';
  import { PUBLISHERS } from '../../core/format';
  import type { Branch, Entry } from '../../core/types';
  import Glyph from '../../ui/Glyph.svelte';

  type Figure = { label: string; value: string; basis: 'patch' | 'guide' | 'screenshot' | 'player' | 'sum'; by: string };
  type Patch = { v: string; note: string; by: string };
  type Remedy = { fixes: string; gain: string; figures: Figure[]; patches?: Patch[]; pairs?: string[]; watch?: string[] };

  let { entry, branch }: { entry: Entry; branch: Branch } = $props();

  const remedy = $derived(entry.remedy as Remedy | undefined);
  const pairs = $derived((remedy?.pairs ?? []).map((id) => branch.byId.get(id)).filter((e): e is Entry => !!e));
  // the upgrades that name this one as a pair, so the link runs both ways
  const pairedBy = $derived(branch.entries.filter((e) => e.id !== entry.id && (e.remedy as Remedy | undefined)?.pairs?.includes(entry.id) && !remedy?.pairs?.includes(e.id)));
  const together = $derived([...pairs, ...pairedBy]);

  const BASIS: Record<Figure['basis'], { label: string; note: string }> = {
    patch: { label: 'Patch notes', note: 'Stated in Pearl Abyss patch notes' },
    guide: { label: 'Guide', note: 'Stated in a published guide' },
    screenshot: { label: 'Screenshot', note: 'Read off an in-game screenshot a guide published' },
    player: { label: 'Player report', note: 'One player’s result, not measured' },
    sum: { label: 'Sum shown', note: 'Worked from the figures above; the sum is printed' },
  };
  const leafAccent = (e: Entry) => branch.leaves.find((l) => l.id === e.leaf)?.accent ?? 'bone';
  const priority = (e: Entry) => branch.categories.find((c) => c.tierList)?.leaves.find((l) => l.entries.includes(e));
</script>

{#if remedy}
  <section class="remedy" data-outline="Remedy" use:reveal>
    <header class="sec-head">
      <span class="eyebrow">What it fixes</span>
      <h3 class="display">Remedy</h3>
    </header>

    <div class="swap">
      <div class="before">
        <p class="tag"><Glyph name="close" size={12} /> Before</p>
        <p class="txt">{remedy.fixes}</p>
      </div>
      <span class="arrow" aria-hidden="true"><Glyph name="right" size={18} /></span>
      <div class="after">
        <p class="tag"><Glyph name="diamond" size={11} /> After</p>
        <p class="txt display">{remedy.gain}</p>
      </div>
    </div>

    {#if remedy.figures.length}
      <ol class="figures">
        {#each remedy.figures as f, i (f.label)}
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

    {#if remedy.patches?.length}
      <div class="block">
        <p class="eyebrow">Patch history</p>
        <ol class="patches" style:--n={remedy.patches.length}>
          {#each remedy.patches as p, i (p.v)}
            <li style:--i={i}>
              <span class="v mono">{p.v}</span>
              <span class="dot" aria-hidden="true"></span>
              <span class="note">{p.note}</span>
              <span class="by">{PUBLISHERS[p.by] ?? p.by}</span>
            </li>
          {/each}
        </ol>
      </div>
    {/if}

    {#if together.length}
      <div class="block">
        <p class="eyebrow">Pairs with</p>
        <ul class="links">
          {#each together as s, i (s.id)}
            {@const pr = priority(s)}
            <li style:--i={i}>
              <a href={href.entry(branch, s.id)} data-accent={leafAccent(s)}>
                <span class="pt"><img src={mediaUrl(s.media.portrait.src)} alt="" loading="lazy" /></span>
                <span class="nm">{s.name}</span>
                {#if pr}<span class="t" data-accent={pr.accent}>{pr.label}</span>{/if}
                <Glyph name="right" size={12} />
              </a>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if remedy.watch?.length}
      <aside class="watch">
        <p class="eyebrow"><Glyph name="warn" size={13} /> Watch out</p>
        <ul>
          {#each remedy.watch as w}<li>{w}</li>{/each}
        </ul>
      </aside>
    {/if}
  </section>
{/if}

<style>
  .remedy { padding: 0 var(--gutter); }
  .sec-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
  .sec-head .eyebrow { font-size: 10px; }
  .sec-head h3 { font-size: 40px; }

  /* before → after: the friction, muted, against the remedy, lit in the leaf's accent */
  .swap { display: grid; grid-template-columns: minmax(0, 0.85fr) auto minmax(0, 1.15fr); align-items: stretch; gap: 0; margin-bottom: 20px; }
  .before, .after { padding: 16px 18px; border: 1px solid var(--line); }
  .before { background: var(--ink-1); }
  .before .txt { font-size: 14.5px; line-height: 1.5; color: var(--ash); }
  .after { border-color: color-mix(in srgb, var(--accent) 40%, transparent); background: linear-gradient(110deg, var(--accent-dim), var(--ink-1) 75%); box-shadow: inset 2px 0 0 var(--accent); }
  .after .txt { font-size: clamp(19px, 2vw, 24px); line-height: 1.25; color: var(--bone); }
  .tag { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ash); }
  .after .tag { color: var(--accent); }
  .arrow { display: grid; place-items: center; width: 36px; color: var(--accent); }

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
    font-size: clamp(22px, 2.4vw, 32px);
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

  .block { margin-top: 24px; }
  .block .eyebrow { font-size: 10px; margin-bottom: 12px; }

  /* patch history: versions on a rail, oldest first, the rail drawn in the leaf's accent */
  .patches { position: relative; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 0 14px; }
  .patches::before { content: ''; position: absolute; left: 0; right: 0; top: 27px; height: 1px; background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 25%, transparent)); }
  .patches li { display: grid; grid-template-rows: 18px 18px auto auto; gap: 4px; min-width: 0; animation: up 520ms var(--ease-out) both; animation-delay: calc(var(--i) * 90ms); }
  .patches .v { font-size: 11.5px; color: var(--accent); letter-spacing: 0.04em; }
  .patches .dot { align-self: center; width: 9px; height: 9px; transform: rotate(45deg); background: var(--ink-0); border: 1px solid var(--accent); }
  .patches li:last-child .dot { background: var(--accent); box-shadow: 0 0 8px var(--accent-dim); }
  .patches .note { font-size: 13px; line-height: 1.45; color: var(--bone); }
  .patches .by { font-size: 10.5px; color: var(--ash); }

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
  .t { font-size: 10.5px; letter-spacing: 0.06em; color: var(--accent); }

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
    .swap { grid-template-columns: minmax(0, 1fr); }
    .arrow { width: auto; height: 28px; transform: rotate(90deg); }
    .figures li { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'label' 'value' 'basis'; }
    .patches { grid-template-columns: minmax(0, 1fr); gap: 14px; }
    .patches::before { left: 4px; right: auto; top: 0; bottom: 0; width: 1px; height: auto; background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 25%, transparent)); }
    .patches li { grid-template-columns: 9px minmax(0, 1fr); grid-template-rows: auto auto auto; column-gap: 14px; }
    .patches .dot { grid-row: 1; grid-column: 1; }
    .patches .v, .patches .note, .patches .by { grid-column: 2; }
  }
</style>
