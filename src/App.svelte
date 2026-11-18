<script lang="ts">
  import { app } from './core/state.svelte';
  import { resolve, tree, entriesFor, href } from './core/tree';
  import type { ListContext } from './core/types';
  import Explorer from './ui/Explorer.svelte';
  import LeafIndex from './ui/LeafIndex.svelte';
  import Plate from './ui/Plate.svelte';
  import Ladder from './ui/Ladder.svelte';
  import Palette from './ui/Palette.svelte';
  import Sheet from './ui/Sheet.svelte';
  import Lightbox from './ui/Lightbox.svelte';
  import Glyph from './ui/Glyph.svelte';

  const view = $derived(resolve(app.hash));
  const branch = $derived(view.branch);

  // The index keeps listing whatever context led to an entry (a leaf, a category branch or a "ride for" lens).
  const ctx: ListContext = $derived.by(() => {
    if (view.kind === 'leaf') return { kind: 'leaf', id: view.leaf.id };
    if (view.kind === 'lens') return { kind: 'lens', id: view.lens.id };
    if (view.kind === 'cat') return { kind: 'cat', id: view.cat.id, leaf: view.leaf?.id };
    const keep = app.ctx;
    if (view.kind === 'entry') {
      if (keep.id && entriesFor(branch, keep).some((e) => e.id === view.entry.id)) return keep;
      return { kind: 'leaf', id: view.entry.leaf };
    }
    return keep.id ? keep : { kind: 'leaf', id: branch.leaves[0].id };
  });
  const ctxKey = (c: ListContext) => `${c.kind}:${c.id}:${c.kind === 'cat' ? (c.leaf ?? '') : ''}`;
  $effect(() => {
    const c = ctx;
    if (ctxKey(c) !== ctxKey(app.ctx)) { app.ctx = c; app.cls = ''; }
  });
  $effect(() => { if (view.kind === 'entry') app.visit(branch.id, view.entry.id); });
  // an entry opened from anywhere (explorer, palette, Recent) is never hidden by the terrain filter
  $effect(() => { if (view.kind === 'entry' && app.cls && view.entry.cls !== app.cls) app.cls = ''; });

  const list = $derived.by(() => {
    const l = entriesFor(branch, ctx);
    const f = app.cls ? l.filter((e) => e.cls === app.cls) : l;
    return f.length ? f : l;
  });
  const entry = $derived(view.kind === 'entry' ? view.entry : list[0]);
  const pane = $derived(view.kind === 'entry' ? 'plate' : 'list');

  let menu = $state(false);
  $effect(() => { void app.hash; menu = false; });
  $effect(() => {
    const title = view.kind === 'entry' ? `${view.entry.name} · ` : view.kind === 'ladder' ? 'Tier Ladder · ' : '';
    document.title = `${title}${branch.title} — Crimson Compendium`;
  });

  function step(d: number) {
    if (!entry || !list.length) return;
    const i = list.findIndex((e) => e.id === entry.id);
    app.go(href.entry(branch, list[(i + d + list.length) % list.length].id));
  }

  function onkey(ev: KeyboardEvent) {
    const t = ev.target as HTMLElement;
    const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
    if ((ev.key === 'k' && (ev.metaKey || ev.ctrlKey)) || (ev.key === '/' && !typing)) { ev.preventDefault(); app.palette = true; return; }
    if (ev.key === 'Escape') {
      if (app.lightbox) app.lightbox = null;
      else if (app.palette) app.palette = false;
      else if (app.sheet) app.sheet = '';
      else menu = false;
      return;
    }
    if (typing || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (app.lightbox) {
      const b = app.lightbox;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        const d = ev.key === 'ArrowRight' ? 1 : -1;
        app.lightbox = { items: b.items, index: (b.index + d + b.items.length) % b.items.length };
      }
      return;
    }
    if (app.overlayOpen) return;
    if (ev.key === 'l' || ev.key === 'L') { app.go(view.kind === 'ladder' ? href.ctx(branch, app.ctx) : href.ladder(branch)); return; }
    if (view.kind === 'ladder') return;
    if (ev.key === 'j' || ev.key === 'ArrowRight') { ev.preventDefault(); step(1); }
    else if (ev.key === 'k' || ev.key === 'ArrowLeft') { ev.preventDefault(); step(-1); }
  }
</script>

<svelte:window onkeydown={onkey} />

<div class="app" data-pane={pane} class:is-ladder={view.kind === 'ladder'}>
  <header class="topbar">
    <button class="icon" onclick={() => (menu = true)} aria-label="Open tree"><Glyph name="menu" size={20} /></button>
    <a class="mini" href={href.branch(branch)}><b>Crimson</b><em>Compendium</em></a>
    <button class="icon" onclick={() => (app.palette = true)} aria-label="Search"><Glyph name="search" size={19} /></button>
  </header>

  <Explorer
    branches={tree.branches}
    {view}
    {ctx}
    {entry}
    open={menu}
    onnavigate={() => (menu = false)}
    onsummon={() => { if (matchMedia('(max-width: 860px)').matches) menu = true; }}
  />
  {#if menu}<button class="spine-scrim" aria-label="Close tree" onclick={() => (menu = false)}></button>{/if}

  <!-- the reading area is the page's main landmark; display: contents keeps the index and plate
       placed directly in the app grid -->
  <main class="main">
    {#if view.kind === 'ladder'}
      <Ladder {branch} />
    {:else if entry}
      <LeafIndex {branch} {ctx} selectedId={entry.id} />
      <Plate {branch} {entry} {ctx} />
    {/if}
  </main>

  <Palette />
  <Sheet />
  <Lightbox />
</div>

<style>
  .app {
    display: grid;
    height: 100vh;
    height: 100dvh;
    grid-template-columns: var(--spine-w) var(--index-w) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    grid-template-areas: 'spine index plate';
  }
  .main { display: contents; }
  .main > :global(.ladder) { grid-column: 2 / -1; grid-row: 1; }
  .topbar, .spine-scrim { display: none; }

  @media (max-width: 1240px) {
    .app { --spine-w: 224px; --index-w: 344px; }
  }

  @media (max-width: 860px) {
    .app {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: 56px minmax(0, 1fr);
      grid-template-areas: 'top' 'main';
    }
    .main > :global(.index), .main > :global(.plate), .main > :global(.ladder) { grid-area: main; grid-column: auto; grid-row: auto; }
    .app[data-pane='list'] .main > :global(.plate) { display: none; }
    .app[data-pane='plate'] .main > :global(.index) { display: none; }

    .topbar {
      grid-area: top;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 10px;
      background: var(--ink-1);
      border-bottom: 1px solid var(--line);
    }
    .icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; color: var(--bone-2); }
    .mini { display: flex; align-items: baseline; gap: 8px; }
    .mini b { font-variation-settings: 'wdth' 64; font-weight: 800; letter-spacing: 0.28em; text-transform: uppercase; font-size: 14px; }
    .mini em { font-family: var(--f-display); font-style: italic; color: var(--bone-2); font-size: 16px; }
    .spine-scrim { display: block; position: fixed; inset: 0; z-index: 39; background: rgba(5, 4, 4, 0.6); border: 0; }
  }
</style>
