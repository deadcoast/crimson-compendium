<script lang="ts">
  // The left column: brand, search, and three view panes — Recent, the Compendium tree, Outline.
  import { flip } from 'svelte/animate';
  import { app, load, save } from '../core/state.svelte';
  import { href, leafOf, mediaUrl } from '../core/tree';
  import type { Branch, Entry, ListContext, View } from '../core/types';
  import Glyph from './Glyph.svelte';
  import Pane from './Pane.svelte';
  import ExplorerTree from './ExplorerTree.svelte';
  import Outline from './Outline.svelte';

  let { branches, view, ctx, entry, open = false, onnavigate, onsummon }: {
    branches: Branch[]; view: View; ctx: ListContext; entry: Entry | undefined; open?: boolean;
    onnavigate?: () => void; onsummon?: () => void;
  } = $props();

  const panes = $state(load('cc.panes', { recent: true, tree: true, outline: true }));
  // the focus shortcut must land on a visible tree: open the drawer (phones) and the Compendium pane
  function summon() { panes.tree = true; onsummon?.(); }
  $effect(() => save('cc.panes', { ...panes }));

  let treeView: ReturnType<typeof ExplorerTree> | undefined = $state();
  let filtering = $state(false);

  const recent = $derived(
    app.recent
      .map((key) => {
        const [bid, eid] = key.includes('/') ? key.split('/') : [branches[0].id, key];
        const b = branches.find((x) => x.id === bid);
        const e = b?.byId.get(eid);
        return b && e ? { b, e } : undefined;
      })
      .filter((x): x is { b: Branch; e: Entry } => !!x)
      .slice(0, 5),
  );
  const current = $derived(view.kind === 'entry' ? view.entry.id : '');
</script>

<nav class="spine" class:open aria-label="Compendium explorer">
  <header class="brand">
    <a href="#{branches[0].id}" class="mark" onclick={onnavigate}>
      <svg class="sigil" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 3 37 20 20 37 3 20Z" />
        <path d="M20 3 37 20 20 37 3 20Z" class="inner" transform="translate(20 20) scale(.56) translate(-20 -20)" />
        <path d="M20 0v40" class="blade" />
      </svg>
      <span class="word"><b>Crimson</b><em>Compendium</em></span>
    </a>
  </header>

  <button class="search" onclick={() => (app.palette = true)}>
    <Glyph name="search" size={14} />
    <span>Search the tree</span>
    <kbd>/</kbd>
  </button>

  <div class="panes">
    <Pane title="Recent" bind:open={panes.recent} badge={recent.length || ''} max="18vh">
      {#if recent.length}
        <ol class="recent">
          {#each recent as { b, e } (e.id)}
            <li animate:flip={{ duration: app.reducedMotion ? 0 : 260 }}>
              <a class="rrow" class:on={e.id === current} href={href.entry(b, e.id)} data-cls={e.cls} data-accent={leafOf(b, e).accent} onclick={onnavigate}>
                <span class="pt"><img src={mediaUrl(e.media.portrait.src)} alt="" /></span>
                <span class="nm">{e.name}</span>
                <span class="lf">{leafOf(b, e).label}</span>
              </a>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="hint">Mounts you open gather here.</p>
      {/if}
    </Pane>

    <Pane title="Compendium" grow bind:open={panes.tree}>
      {#snippet actions()}
        <button class="act" class:on={filtering} title="Filter (Ctrl+F)" aria-label="Filter" onclick={() => treeView?.openFilter()}><Glyph name="filter" size={13} /></button>
        <button class="act" title="Reveal the open page" aria-label="Reveal active" onclick={() => treeView?.revealActive()}><Glyph name="target" size={13} /></button>
        <button class="act" title="Collapse folders" aria-label="Collapse folders" onclick={() => treeView?.collapseAll()}><Glyph name="collapse" size={13} /></button>
      {/snippet}
      <ExplorerTree bind:this={treeView} bind:filtering {branches} {view} {ctx} {onnavigate} onsummon={summon} />
    </Pane>

    <Pane title="Outline" bind:open={panes.outline} max="22vh">
      <Outline {entry} />
    </Pane>
  </div>

  <footer>
    <div class="links">
      <button onclick={() => (app.sheet = 'tiers')}><Glyph name="info" size={13} /> How tiers work</button>
      <button onclick={() => (app.sheet = 'sources')}><Glyph name="book" size={13} /> Sources</button>
    </div>
    <p class="asof">{branches[0].asOf}</p>
  </footer>
</nav>

<style>
  .spine {
    grid-area: spine;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: var(--ink-1);
    border-right: 1px solid var(--line);
  }

  /* ── brand ───────────────────────── */
  .brand { padding: 20px 18px 14px; flex: none; }
  .mark { display: flex; align-items: center; gap: 12px; }
  .sigil { width: 30px; height: 30px; overflow: visible; }
  .sigil path { fill: none; stroke: var(--crimson-hi); stroke-width: 1.4; }
  .sigil .inner { fill: var(--crimson); stroke: none; transform-origin: center; animation: pulse 4.8s var(--ease-io) infinite; }
  .sigil .blade { stroke: var(--bone); stroke-width: 1; opacity: 0.85; }
  @keyframes pulse { 50% { opacity: 0.55; } }
  .word { display: flex; flex-direction: column; line-height: 1; }
  .word b { font-variation-settings: 'wdth' 64; font-weight: 800; font-size: 16px; letter-spacing: 0.3em; text-transform: uppercase; }
  .word em { font-family: var(--f-display); font-style: italic; font-size: 18px; color: var(--bone-2); margin-top: 3px; }

  /* ── search (opens the command palette) ── */
  .search {
    flex: none;
    display: flex; align-items: center; gap: 9px;
    margin: 0 12px 12px;
    padding: 7px 10px;
    color: var(--ash);
    border: 1px solid var(--line-2);
    border-radius: 5px;
    background: var(--ink-0);
    transition: border-color var(--t-micro), color var(--t-micro);
  }
  .search span { flex: 1; text-align: left; font-size: 12.5px; }
  .search:hover { color: var(--bone); border-color: var(--line-3); }

  .panes { flex: 1; min-height: 0; display: flex; flex-direction: column; }

  .act { display: grid; place-items: center; width: 22px; height: 20px; border-radius: 4px; color: var(--ash); transition: color var(--t-micro), background var(--t-micro); }
  .act:hover { color: var(--bone); background: var(--ink-3); }
  .act.on { color: var(--crimson-hi); }

  /* ── recent ──────────────────────── */
  .recent { padding: 1px 0 6px; }
  .rrow {
    display: flex; align-items: center; gap: 7px;
    height: 22px;
    padding: 0 10px 0 22px;
    font-size: 12.5px; color: var(--bone-2);
    transition: color var(--t-micro), background var(--t-micro);
  }
  .rrow:hover { color: var(--bone); background: rgba(237, 230, 217, 0.04); }
  .rrow.on { color: var(--bone); box-shadow: inset 2px 0 0 var(--accent); background: linear-gradient(90deg, var(--accent-dim), transparent 85%); }
  .pt { width: 16px; height: 16px; border-radius: 50%; overflow: hidden; flex: none; box-shadow: 0 0 0 1px color-mix(in srgb, var(--cls) 60%, transparent); }
  .pt img { width: 100%; height: 100%; object-fit: cover; }
  .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lf { font-family: var(--f-display); font-style: italic; font-size: 11.5px; color: var(--ash); }
  .hint { padding: 6px 14px 10px 28px; font-size: 12px; color: var(--ash); }

  /* ── footer ──────────────────────── */
  footer { flex: none; display: flex; flex-direction: column; gap: 6px; padding: 10px 14px 12px; border-top: 1px solid var(--line); }
  .links { display: flex; gap: 14px; }
  .links button { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--bone-2); }
  .links button:hover { color: var(--bone); }
  .asof { font-size: 11px; color: var(--ash); line-height: 1.4; text-wrap: balance; }

  @media (max-width: 860px) {
    .spine {
      position: fixed; inset: 0 auto 0 0; z-index: 40;
      width: min(320px, 86vw);
      transform: translateX(-102%);
      transition: transform var(--t-ui) var(--ease-out);
      box-shadow: 30px 0 60px rgba(0, 0, 0, 0.6);
    }
    .spine.open { transform: none; }
  }
</style>
