<script lang="ts">
  import { app } from '../core/state.svelte';
  import { href, entriesFor } from '../core/tree';
  import type { Branch, View } from '../core/types';
  import Glyph from './Glyph.svelte';
  import { onLayout } from '../core/motion';

  let { branches, view, open = false, onnavigate }: { branches: Branch[]; view: View; open?: boolean; onnavigate?: () => void } = $props();

  const isLadder = $derived(view.kind === 'ladder');
  const activeLeaf = $derived(!isLadder && app.ctx.kind === 'leaf' ? app.ctx.id : '');
  const activeLens = $derived(!isLadder && app.ctx.kind === 'lens' ? app.ctx.id : '');

  // the crimson "sap" climbs down the trunk to whichever node is active
  let limb: HTMLElement | undefined = $state();
  let sap = $state(0);
  $effect(() => {
    void activeLeaf; void activeLens; void isLadder;
    return onLayout(limb, () => {
      const el = limb?.querySelector<HTMLElement>('.node-link.active');
      const host = el?.closest('li') ?? el; // <li> is laid out against the limb even mid-animation
      sap = host ? host.offsetTop + host.offsetHeight / 2 : 0;
    });
  });
</script>

<nav class="spine" class:open aria-label="Compendium tree">
  <header class="brand">
    <a href="#{branches[0].id}" class="mark" onclick={onnavigate}>
      <svg class="sigil" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 3 37 20 20 37 3 20Z" />
        <path d="M20 3 37 20 20 37 3 20Z" class="inner" transform="translate(20 20) scale(.56) translate(-20 -20)" />
        <path d="M20 0v40" class="blade" />
      </svg>
      <span class="word"><b>Crimson</b><em>Compendium</em></span>
    </a>
    <p class="sub eyebrow">Field reference · Pywel</p>
  </header>

  <button class="search" onclick={() => (app.palette = true)}>
    <Glyph name="search" size={15} />
    <span>Search the tree</span>
    <kbd>/</kbd>
  </button>

  {#each branches as b (b.id)}
    <section class="branch">
      <a class="branch-head" href={href.branch(b)} onclick={onnavigate}>
        <span class="eyebrow">Branch</span>
        <span class="title display">{b.title}</span>
        <span class="count mono">{b.entries.length}</span>
      </a>

      <div class="limb" bind:this={limb}>
        <span class="trunk" aria-hidden="true"></span>
        <span class="sap" aria-hidden="true" style:height="{sap}px"></span>

        <ol>
          {#each b.leaves as leaf, i (leaf.id)}
            <li style:--i={i}>
              <a
                class="node-link"
                class:active={activeLeaf === leaf.id}
                aria-current={activeLeaf === leaf.id ? 'page' : undefined}
                data-accent={leaf.accent}
                href={href.leaf(b, leaf.id)}
                onclick={onnavigate}
              >
                <i class="node"></i>
                <span class="label">{leaf.label}</span>
                <span class="n mono">{entriesFor(b, { kind: 'leaf', id: leaf.id }).length}</span>
              </a>
            </li>
          {/each}
        </ol>

        <p class="group eyebrow">Ride for</p>
        <ol>
          {#each b.lenses as lens, i (lens.id)}
            <li style:--i={i + b.leaves.length}>
              <a
                class="node-link lens"
                class:active={activeLens === lens.id}
                aria-current={activeLens === lens.id ? 'page' : undefined}
                data-accent="crimson"
                href={href.lens(b, lens.id)}
                onclick={onnavigate}
              >
                <i class="node"></i>
                <span class="label">{lens.label}</span>
                <span class="n mono">{entriesFor(b, { kind: 'lens', id: lens.id }).length}</span>
              </a>
            </li>
          {/each}
        </ol>

        <a class="node-link ladder" class:active={isLadder} data-accent="crimson" href={href.ladder(b)} onclick={onnavigate}>
          <i class="node"></i>
          <Glyph name="ladder" size={15} />
          <span class="label">Tier ladder</span>
        </a>
      </div>
    </section>
  {/each}

  <footer>
    <p class="asof">{branches[0].asOf}</p>
    <div class="links">
      <button onclick={() => (app.sheet = 'tiers')}><Glyph name="info" size={14} /> How tiers work</button>
      <button onclick={() => (app.sheet = 'sources')}><Glyph name="book" size={14} /> Sources & credits</button>
    </div>
    <p class="keys"><kbd>J</kbd><kbd>K</kbd> browse <kbd>←</kbd><kbd>→</kbd> step <kbd>L</kbd> ladder</p>
  </footer>
</nav>

<style>
  .spine {
    grid-area: spine;
    display: flex;
    flex-direction: column;
    gap: 26px;
    height: 100%;
    overflow-y: auto;
    padding: 26px 22px 20px;
    background: var(--ink-1);
    border-right: 1px solid var(--line);
  }

  /* ── brand ───────────────────────── */
  .mark { display: flex; align-items: center; gap: 12px; }
  .sigil { width: 34px; height: 34px; overflow: visible; }
  .sigil path { fill: none; stroke: var(--crimson-hi); stroke-width: 1.4; }
  .sigil .inner { fill: var(--crimson); stroke: none; transform-origin: center; animation: pulse 4.8s var(--ease-io) infinite; }
  .sigil .blade { stroke: var(--bone); stroke-width: 1; opacity: 0.85; }
  @keyframes pulse { 50% { opacity: 0.55; } }
  .word { display: flex; flex-direction: column; line-height: 1; }
  .word b {
    font-variation-settings: 'wdth' 64;
    font-weight: 800;
    font-size: 17px;
    letter-spacing: 0.3em;
    text-transform: uppercase;
  }
  .word em { font-family: var(--f-display); font-style: italic; font-size: 19px; color: var(--bone-2); margin-top: 3px; }
  .sub { margin-top: 12px; font-size: 10px; }

  /* ── search ──────────────────────── */
  .search {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px;
    color: var(--ash);
    border: 1px solid var(--line-2);
    border-radius: 6px;
    background: var(--ink-0);
    transition: border-color var(--t-micro), color var(--t-micro);
  }
  .search span { flex: 1; text-align: left; font-size: 13px; }
  .search:hover { color: var(--bone); border-color: var(--line-3); }

  /* ── branch head ─────────────────── */
  .branch-head { display: grid; grid-template-columns: 1fr auto; align-items: end; row-gap: 2px; }
  .branch-head .eyebrow { grid-column: 1 / -1; font-size: 10px; }
  .branch-head .title { font-size: 34px; }
  .branch-head .count { color: var(--ash); padding-bottom: 4px; }

  /* ── limb: trunk + sap + nodes ───── */
  .limb { position: relative; margin-top: 14px; padding-left: 4px; }
  .trunk, .sap { position: absolute; left: 8px; top: 0; width: 1px; }
  .trunk { bottom: 0; background: linear-gradient(var(--line-3), var(--line) 85%, transparent); }
  .sap {
    background: linear-gradient(var(--crimson-deep), var(--crimson-hi));
    box-shadow: 0 0 10px var(--crimson);
    transition: height 620ms var(--ease-out);
  }

  li { animation: grow 520ms var(--ease-out) both; animation-delay: calc(var(--i) * 40ms + 120ms); }
  @keyframes grow { from { opacity: 0; transform: translateX(-8px); } }

  .node-link {
    position: relative;
    display: flex; align-items: center; gap: 10px;
    padding: 7px 4px 7px 34px;
    color: var(--bone-2);
    font-size: 14px;
    transition: color var(--t-micro);
  }
  .node-link::before { /* branch tick from the trunk */
    content: '';
    position: absolute; left: 5px; top: 50%;
    width: 13px; height: 1px;
    background: var(--line-3);
    transition: background var(--t-micro), width var(--t-ui) var(--ease-out);
  }
  .node {
    position: absolute; left: 17px; top: 50%;
    width: 7px; height: 7px; margin-top: -3.5px;
    transform: rotate(45deg) scale(0.6);
    border: 1px solid var(--ash);
    background: var(--ink-1);
    transition: transform var(--t-ui) var(--ease-out), background var(--t-micro), border-color var(--t-micro), box-shadow var(--t-ui);
  }
  .label { flex: 1; }
  .n { color: var(--ash-2); font-size: 11px; }
  .node-link:hover { color: var(--bone); }
  .node-link:hover .node { transform: rotate(45deg) scale(0.9); border-color: var(--bone-2); }
  .node-link.active { color: var(--bone); }
  .node-link.active::before { background: var(--crimson-hi); }
  .node-link.active .node {
    transform: rotate(45deg) scale(1.15);
    background: var(--accent);
    border-color: var(--accent);
    box-shadow: 0 0 12px var(--accent);
  }
  .node-link.active .n { color: var(--bone-2); }
  .lens .label { font-size: 13.5px; }

  .group { margin: 18px 0 4px 34px; font-size: 10px; color: var(--ash-2); }
  .ladder { margin-top: 12px; color: var(--bone); }

  /* ── footer ──────────────────────── */
  footer { margin-top: auto; display: flex; flex-direction: column; gap: 12px; padding-top: 18px; border-top: 1px solid var(--line); }
  .asof { font-size: 11.5px; color: var(--ash); line-height: 1.45; }
  .links { display: flex; flex-direction: column; gap: 6px; }
  .links button { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--bone-2); }
  .links button:hover { color: var(--bone); }
  .keys { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; font-size: 11px; color: var(--ash-2); }

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
