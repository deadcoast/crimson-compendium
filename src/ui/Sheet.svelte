<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { app } from '../core/state.svelte';
  import { tree, ROMAN, TIER_NAMES } from '../core/tree';
  import { PUBLISHERS, CREDITS } from '../core/format';
  import Glyph from './Glyph.svelte';

  const branch = $derived(tree.branches[0]);

  const RULES: Record<number, string> = {
    1: 'The best in its class. Reserved for the best of the best.',
    2: 'Not as good as Tier I, but better than everything else in its class.',
  };

  const sources = $derived.by(() => {
    const by = new Map<string, Map<string, string>>();
    for (const b of tree.branches) for (const e of b.entries) for (const s of e.sources) {
      if (!by.has(s.by)) by.set(s.by, new Map());
      by.get(s.by)!.set(s.url, s.title);
    }
    return [...by.entries()].map(([k, m]) => ({ name: PUBLISHERS[k] ?? k, items: [...m.entries()] })).sort((a, b) => b.items.length - a.items.length);
  });
  const imageCredits = $derived.by(() => {
    const c = new Map<string, number>();
    for (const b of tree.branches) for (const e of b.entries) {
      const m = e.media;
      for (const x of [m.portrait, m.hero, ...m.captures, ...m.gallery]) if (x) c.set(x.credit, (c.get(x.credit) ?? 0) + 1);
    }
    for (const b of tree.branches) for (const cover of [...b.leaves, ...b.categories].map((l) => l.cover)) {
      if (cover.src && cover.credit) c.set(cover.credit, (c.get(cover.credit) ?? 0) + 1);
    }
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  });
</script>

{#if app.sheet}
  <div class="scrim" transition:fade={{ duration: 200 }} onclick={() => (app.sheet = '')} aria-hidden="true"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label={app.sheet === 'tiers' ? 'How tiers work' : 'Sources and credits'} transition:fly={{ x: 420, duration: 480, easing: quintOut }}>
    <button class="close" onclick={() => (app.sheet = '')} aria-label="Close"><Glyph name="close" size={18} /></button>

    {#if app.sheet === 'tiers'}
      <p class="eyebrow">{branch.title} · rating system</p>
      <h2 class="display">How tiers work</h2>

      <ol class="tiers">
        {#each [1, 2, 3, 4, 5] as t}
          <li class:top={t === 1}>
            <span class="num display">{ROMAN[t]}</span>
            <span><b>{TIER_NAMES[t]}</b>{RULES[t] ?? ''}</span>
          </li>
        {/each}
      </ol>

      <h3 class="eyebrow">Metrics</h3>
      <dl class="metrics">
        {#each branch.metrics as m}
          <div><dt>{m.label}</dt><dd>{m.blurb}</dd></div>
        {/each}
      </dl>

      <h3 class="eyebrow">Rules of the ladder</h3>
      <ul class="rules">
        <li><b>Class means terrain.</b> A mount is ranked against others of its own class — Land, Sea or Sky — so a Tier I sea mount is the best thing that swims, not the best mount overall.</li>
        <li><b>Traits can lift a metric.</b> A mount with a decisive trait scores higher on the metric that trait serves: no fall damage lifts Travel, a unique attack lifts Combat.</li>
        <li><b>Horses are rated at Lv 5.</b> They grow with riding and trust; beasts and machines arrive at full strength.</li>
        <li><b>“Not rated”</b> marks a metric that does not apply, such as Stamina on a balloon or mech.</li>
        <li><b>Every rating carries its basis.</b> Ratings are editorial calls built on recorded stats and the cited guides. Where no source compares a mount, it sits at Tier III and says so.</li>
      </ul>
    {:else}
      <p class="eyebrow">{branch.asOf}</p>
      <h2 class="display">Sources & credits</h2>
      <p class="intro">Facts are cross-checked across the guides below; where they disagree, the entry follows the source that shows in-game evidence and names the conflict. Each plate lists its own sources.</p>

      <h3 class="eyebrow">Imagery</h3>
      <ul class="credits">
        {#each imageCredits as [k, n]}
          <li><a href={CREDITS[k]?.url} target="_blank" rel="noopener noreferrer">{CREDITS[k]?.name ?? k}</a><span class="mono">{n} {n === 1 ? 'image' : 'images'}</span></li>
        {/each}
      </ul>
      <p class="legal">All in-game captures and art © Pearl Abyss. Captures are credited to the guide that took them.</p>

      <h3 class="eyebrow">Written sources</h3>
      {#each sources as s}
        <div class="pub">
          <p class="pub-name">{s.name} <span class="mono">{s.items.length}</span></p>
          <ul>
            {#each s.items as [url, title]}
              <li><a href={url} target="_blank" rel="noopener noreferrer">{title}<Glyph name="link" size={12} /></a></li>
            {/each}
          </ul>
        </div>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .scrim { position: fixed; inset: 0; z-index: 60; background: rgba(5, 4, 4, 0.6); backdrop-filter: blur(4px); }
  .sheet {
    position: fixed; z-index: 61; top: 0; right: 0; bottom: 0;
    width: min(520px, 100vw);
    overflow-y: auto;
    padding: 42px 38px 60px;
    background: var(--ink-1);
    border-left: 1px solid var(--line-2);
    box-shadow: -40px 0 100px rgba(0, 0, 0, 0.6);
  }
  .close { position: absolute; top: 18px; right: 18px; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; color: var(--bone-2); }
  .close:hover { background: var(--ink-3); color: var(--bone); }
  .eyebrow { font-size: 10px; }
  h2 { font-size: 46px; margin: 8px 0 26px; }
  h3 { margin: 30px 0 12px; }

  .tiers li { display: grid; grid-template-columns: 54px 1fr; gap: 12px; align-items: baseline; padding: 12px 0; border-bottom: 1px solid var(--line); font-size: 14px; color: var(--bone-2); }
  .tiers .num { font-size: 34px; color: var(--bone-2); }
  .tiers .top .num { color: var(--crimson-hi); text-shadow: 0 0 20px rgba(255, 62, 72, 0.5); }
  .tiers b { display: block; color: var(--bone); font-weight: 600; }

  .metrics div { padding: 10px 0; border-bottom: 1px dashed var(--line); }
  .metrics dt { font-weight: 600; }
  .metrics dd { margin: 2px 0 0; font-size: 13.5px; color: var(--bone-2); }

  .rules li { position: relative; padding: 0 0 12px 18px; font-size: 13.5px; color: var(--bone-2); }
  .rules li::before { content: ''; position: absolute; left: 2px; top: 0.6em; width: 5px; height: 5px; transform: rotate(45deg); background: var(--crimson-hi); }
  .rules b { color: var(--bone); font-weight: 600; }

  .intro { color: var(--bone-2); font-size: 14px; }
  .credits li { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dashed var(--line); font-size: 14px; }
  .credits a:hover { color: var(--crimson-hi); }
  .credits .mono { color: var(--ash); }
  .legal { margin-top: 10px; font-size: 12.5px; color: var(--ash); }
  .pub { margin-bottom: 16px; }
  .pub-name { font-weight: 600; margin-bottom: 4px; }
  .pub-name .mono { color: var(--ash-2); margin-left: 6px; }
  .pub a { display: inline-flex; align-items: center; gap: 6px; padding: 3px 0; font-size: 13px; color: var(--bone-2); }
  .pub a:hover { color: var(--bone); }

  @media (max-width: 720px) { .sheet { padding: 34px 22px 60px; } }
</style>
