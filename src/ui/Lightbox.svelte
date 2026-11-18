<script lang="ts">
  import { fade, scale as zoomIn } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { app } from '../core/state.svelte';
  import { mediaUrl } from '../core/tree';
  import { CREDITS } from '../core/format';
  import Glyph from './Glyph.svelte';

  const box = $derived(app.lightbox);
  const item = $derived(box ? box.items[box.index] : undefined);

  let z = $state(1), x = $state(0), y = $state(0);
  let drag: { sx: number; sy: number; ox: number; oy: number } | null = null;
  $effect(() => { void item; z = 1; x = 0; y = 0; });

  const clampZ = (v: number) => Math.min(5, Math.max(1, v));
  function wheel(ev: WheelEvent) { ev.preventDefault(); z = clampZ(z * (ev.deltaY < 0 ? 1.15 : 0.87)); if (z === 1) { x = 0; y = 0; } }
  function down(ev: PointerEvent) { if (z === 1) return; drag = { sx: ev.clientX, sy: ev.clientY, ox: x, oy: y }; (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId); }
  function move(ev: PointerEvent) { if (!drag) return; x = drag.ox + (ev.clientX - drag.sx); y = drag.oy + (ev.clientY - drag.sy); }
  function up() { drag = null; }
  function step(d: number) { if (box) app.lightbox = { items: box.items, index: (box.index + d + box.items.length) % box.items.length }; }
  function toggle() { if (z > 1) { z = 1; x = 0; y = 0; } else z = 2.4; }
</script>

{#if box && item}
  <div class="lightbox" role="dialog" aria-modal="true" aria-label={item.caption} transition:fade={{ duration: 220 }}>
    <div
      class="viewport"
      class:zoomed={z > 1}
      onwheel={wheel}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      ondblclick={toggle}
      role="presentation"
    >
      {#key item.src}
        <img
          src={mediaUrl(item.src)}
          alt={item.caption}
          style:transform="translate({x}px, {y}px) scale({z})"
          in:zoomIn={{ start: 0.94, duration: 420, easing: quintOut }}
          draggable="false"
        />
      {/key}
    </div>

    <header class="bar">
      <p><span class="eyebrow">{box.index + 1} / {box.items.length}</span>{item.caption}<span class="credit mono">{CREDITS[item.credit]?.name ?? item.credit} · © Pearl Abyss</span></p>
      <div class="ctl">
        <button onclick={() => (z = clampZ(z / 1.25))} aria-label="Zoom out">−</button>
        <span class="mono">{Math.round(z * 100)}%</span>
        <button onclick={() => (z = clampZ(z * 1.25))} aria-label="Zoom in">+</button>
        <button onclick={() => (app.lightbox = null)} aria-label="Close"><Glyph name="close" size={18} /></button>
      </div>
    </header>

    {#if box.items.length > 1}
      <button class="nav prev" onclick={() => step(-1)} aria-label="Previous image"><Glyph name="left" size={22} /></button>
      <button class="nav next" onclick={() => step(1)} aria-label="Next image"><Glyph name="right" size={22} /></button>
    {/if}
  </div>
{/if}

<style>
  .lightbox { position: fixed; inset: 0; z-index: 70; background: rgba(6, 5, 4, 0.96); }
  .viewport { position: absolute; inset: 64px 72px 24px; display: grid; place-items: center; overflow: hidden; cursor: zoom-in; touch-action: none; }
  .viewport.zoomed { cursor: grab; }
  .viewport img { max-width: 100%; max-height: 100%; object-fit: contain; transition: transform 220ms var(--ease-out); user-select: none; }
  .bar { position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 20px; border-bottom: 1px solid var(--line); }
  .bar p { display: flex; gap: 14px; align-items: baseline; font-size: 14px; color: var(--bone); min-width: 0; }
  .bar .eyebrow { font-size: 10px; }
  .credit { font-size: 10.5px; color: var(--ash); }
  .ctl { display: flex; align-items: center; gap: 6px; flex: none; }
  .ctl button { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; font-size: 18px; color: var(--bone-2); }
  .ctl button:hover { background: var(--ink-3); color: var(--bone); }
  .ctl .mono { width: 44px; text-align: center; color: var(--ash); }
  .nav { position: absolute; top: 50%; margin-top: -26px; display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; color: var(--bone); background: rgba(23, 19, 18, 0.8); border: 1px solid var(--line-2); }
  .nav:hover { border-color: var(--crimson-hi); }
  .prev { left: 12px; }
  .next { right: 12px; }
  @media (max-width: 720px) { .viewport { inset: 60px 8px 8px; } .credit { display: none; } }
</style>
