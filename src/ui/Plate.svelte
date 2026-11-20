<script lang="ts">
  import { app } from '../core/state.svelte';
  import { entriesFor, href, leafOf, mediaUrl } from '../core/tree';
  import { PUBLISHERS, CREDITS } from '../core/format';
  import { reveal } from '../core/motion';
  import type { Branch, Entry, ListContext } from '../core/types';
  import Hero from './Hero.svelte';
  import Seals from './Seals.svelte';
  import Where from './Where.svelte';
  import How from './How.svelte';
  import Glyph from './Glyph.svelte';
  import Also from './Also.svelte';

  let { branch, entry, ctx }: { branch: Branch; entry: Entry; ctx: ListContext } = $props();

  const list = $derived.by(() => {
    const l = entriesFor(branch, ctx);
    const f = app.cls ? l.filter((e) => e.cls === app.cls) : l;
    return f.some((e) => e.id === entry.id) ? f : l;
  });
  const index = $derived(Math.max(0, list.findIndex((e) => e.id === entry.id)));
  const prev = $derived(list[(index - 1 + list.length) % list.length] ?? entry);
  const next = $derived(list[(index + 1) % list.length] ?? entry);
  const leaf = $derived(leafOf(branch, entry));
  const credits = $derived.by(() => {
    const m = entry.media;
    const all = [m.portrait, m.hero, ...m.captures, ...m.gallery].filter(Boolean).map((x) => x!.credit);
    return [...new Set(all)].map((c) => CREDITS[c]?.name ?? c);
  });

  let scroller: HTMLElement | undefined = $state();
  $effect(() => {
    void entry.id;
    scroller?.scrollTo({ top: 0, behavior: app.reducedMotion ? 'auto' : 'smooth' });
  });
</script>

<article class="plate" bind:this={scroller} data-accent={leaf.accent} data-cls={entry.cls} aria-label={entry.name}>
  <Hero
    {branch}
    {entry}
    {leaf}
    pos={{ index, total: list.length }}
    prevHref={href.entry(branch, prev.id)}
    nextHref={href.entry(branch, next.id)}
    backHref={href.ctx(branch, ctx)}
  />

  <div class="body">
    {#key entry.id}
      <p class="lead">{entry.summary}</p>
      {#if entry.egg}
        <aside class="egg" data-outline="Easter egg">
          <p class="eyebrow"><Glyph name="egg" size={13} /> Easter egg</p>
          <p class="egg-note">{entry.egg}</p>
        </aside>
      {/if}
    {/key}

    <Seals {branch} {entry} />

    <div class="pair">
      <Where {entry} labels={branch.labels} />
      <How {entry} labels={branch.labels} />
    </div>

    {#each branch.sections as Section}
      <Section {entry} {branch} />
    {/each}

    <Also {entry} {branch} />

    {#if entry.media.gallery.length}
      <section class="gallery" data-outline="Stills" use:reveal>
        <p class="eyebrow">More stills</p>
        <ul>
          {#each entry.media.gallery as g, i}
            <li>
              <button onclick={() => (app.lightbox = { items: entry.media.gallery, index: i })}>
                <img src={mediaUrl(g.src)} alt={g.caption} loading="lazy" class:whole={g.kind === 'variant'} />
                <span>{g.caption}</span>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <section class="sources" data-outline="Sources" use:reveal>
      <p class="eyebrow">Sources</p>
      <ul>
        {#each entry.sources as s}
          <li>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              <span class="pub">{PUBLISHERS[s.by] ?? s.by}</span>
              <span class="t">{s.title}</span>
              <Glyph name="link" size={13} />
            </a>
          </li>
        {/each}
      </ul>
      <p class="img-credit">Imagery: {credits.join(' · ')}. Game footage and art © Pearl Abyss.</p>
    </section>
  </div>
</article>

<style>
  .plate {
    grid-area: plate;
    position: relative;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--ink-0);
    container-type: inline-size;
  }
  .body { display: flex; flex-direction: column; gap: 60px; padding-bottom: 96px; }

  .lead {
    padding: 34px var(--gutter) 0;
    max-width: calc(64ch + 2 * var(--gutter));
    font-family: var(--f-display);
    font-size: 21px;
    line-height: 1.55;
    color: var(--bone);
    animation: fade-up 800ms var(--ease-out) both 420ms;
  }
  .lead::first-letter {
    float: left;
    font-size: 3.5em;
    line-height: 0.82;
    padding: 6px 12px 0 0;
    color: var(--accent);
    font-weight: 600;
  }
  @keyframes fade-up { from { opacity: 0; transform: translateY(14px); } }

  .egg {
    margin: -30px var(--gutter) 0;
    max-width: 64ch;
    padding: 4px 0 4px 18px;
    border-left: 1px solid var(--cyan);
    animation: fade-up 800ms var(--ease-out) both 560ms;
  }
  .egg .eyebrow { display: flex; align-items: center; gap: 7px; font-size: 10px; color: var(--cyan); }
  .egg-note { margin-top: 6px; font-family: var(--f-display); font-style: italic; font-size: 17px; line-height: 1.5; color: var(--bone-2); }
  .body > :global(.seals) { margin-top: -24px; }

  .pair { display: grid; grid-template-columns: minmax(0, 1fr); gap: 60px; }
  @container (min-width: 1060px) {
    .pair { grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 0; }
    .pair > :global(.how) { padding-left: 12px; border-left: 1px solid var(--line); }
  }

  .gallery, .sources { padding: 0 var(--gutter); }
  .gallery .eyebrow, .sources .eyebrow { font-size: 10px; margin-bottom: 12px; }
  .gallery ul { display: flex; gap: 12px; flex-wrap: wrap; }
  .gallery li { display: flex; }
  .gallery button { position: relative; display: flex; flex-direction: column; width: 240px; border: 1px solid var(--line-2); overflow: hidden; text-align: left; }
  .gallery img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; transition: transform 700ms var(--ease-out); }
  .gallery img.whole { object-fit: contain; padding: 10px; background: radial-gradient(closest-side, var(--ink-3), var(--ink-1)); }
  .gallery button:hover img { transform: scale(1.06); }
  .gallery span { flex: 1; display: block; padding: 8px 10px; font-size: 12.5px; color: var(--bone-2); background: var(--ink-1); }

  .sources { padding-top: 26px; border-top: 1px solid var(--line); margin: 0 var(--gutter); padding-left: 0; padding-right: 0; }
  .sources ul { display: grid; gap: 2px; }
  .sources a {
    display: grid; grid-template-columns: 120px 1fr auto; gap: 14px; align-items: center;
    padding: 8px 0;
    font-size: 13.5px; color: var(--bone-2);
    border-bottom: 1px dashed var(--line);
    transition: color var(--t-micro);
  }
  .sources a:hover { color: var(--bone); }
  .sources a:hover :global(svg) { color: var(--accent); }
  .pub { font-variation-settings: 'wdth' 75; font-weight: 600; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ash); }
  .img-credit { margin-top: 14px; font-size: 12px; color: var(--ash); }

  @media (max-width: 720px) {
    .lead { font-size: 18.5px; }
    .sources a { grid-template-columns: 1fr auto; }
    .pub { grid-column: 1 / -1; }
  }
</style>
