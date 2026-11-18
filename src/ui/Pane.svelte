<script lang="ts">
  // A collapsible view pane, after VS Code's paneview: 22 px header, uppercase title,
  // actions revealed on hover or focus, height animated on open/close.
  import type { Snippet } from 'svelte';
  import Glyph from './Glyph.svelte';

  let {
    title,
    open = $bindable(true),
    grow = false,
    badge,
    max,
    actions,
    children,
  }: { title: string; open?: boolean; grow?: boolean; badge?: number | string; max?: string; actions?: Snippet; children: Snippet } = $props();
</script>

<section class="pane" class:open class:grow aria-label={title}>
  <header class="pane-head">
    <button class="toggle" aria-expanded={open} onclick={() => (open = !open)}>
      <span class="tw"><Glyph name="twist" size={12} /></span>
      <span class="title">{title}</span>
      {#if badge !== undefined && badge !== ''}<span class="badge mono">{badge}</span>{/if}
    </button>
    {#if actions}<div class="actions">{@render actions()}</div>{/if}
  </header>
  <div class="pane-body" inert={!open}>
    <div class="inner" class:capped={!!max} style:--max={max}>{@render children()}</div>
  </div>
</section>

<style>
  .pane {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-top: 1px solid var(--line);
  }
  .pane.grow { flex: 0 1 22px; transition: flex-grow 200ms var(--ease-out); }
  .pane.grow.open { flex-grow: 1; }

  .pane-head {
    position: relative;
    display: flex;
    align-items: center;
    height: 22px;
    flex: none;
  }
  .toggle {
    flex: 1;
    display: flex; align-items: center; gap: 2px;
    height: 100%;
    padding: 0 8px 0 4px;
    color: var(--bone-2);
    transition: color var(--t-micro), background var(--t-micro);
  }
  .toggle:hover { color: var(--bone); background: var(--ink-2); }
  .toggle:focus-visible { outline: 1px solid var(--crimson-hi); outline-offset: -1px; }
  .tw { display: grid; place-items: center; width: 16px; transition: transform 150ms var(--ease-out); }
  .open .tw { transform: rotate(90deg); }
  .title {
    font-size: 10.5px;
    font-weight: 700;
    font-variation-settings: 'wdth' 82;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .badge {
    margin-left: 6px;
    min-width: 16px;
    padding: 0 5px;
    font-size: 9.5px;
    line-height: 15px;
    text-align: center;
    color: var(--bone-2);
    background: var(--ink-3);
    border-radius: 8px;
  }
  .actions {
    position: absolute; right: 6px; top: 0; bottom: 0;
    display: flex; align-items: center; gap: 1px;
    opacity: 0;
    transform: translateX(4px);
    transition: opacity var(--t-micro), transform var(--t-micro) var(--ease-out);
    pointer-events: none;
  }
  .pane.open:hover .actions, .pane.open:focus-within .actions { opacity: 1; transform: none; pointer-events: auto; }

  .pane-body {
    display: grid;
    grid-template-rows: 0fr;
    min-height: 0;
    transition: grid-template-rows 200ms var(--ease-out);
  }
  .pane.open .pane-body { grid-template-rows: 1fr; }
  .grow .pane-body { flex: 1; }
  .inner { min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
  /* side panes yield height to the tree on short screens */
  .open .inner.capped { max-height: var(--max); overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--ink-4) transparent; }

  @media (prefers-reduced-motion: reduce) {
    .pane.grow, .pane-body, .tw { transition: none; }
  }
</style>
