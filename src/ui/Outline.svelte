<script lang="ts">
  // Outline pane: the open plate's sections as symbols, tracking the reading position.
  // Sections declare themselves with data-outline, so a branch's own plate sections join automatically.
  import { tick } from 'svelte';
  import { app } from '../core/state.svelte';
  import { mediaUrl } from '../core/tree';
  import type { Entry } from '../core/types';

  let { entry }: { entry: Entry | undefined } = $props();

  let items = $state<{ label: string; el: HTMLElement }[]>([]);
  let active = $state(0);
  let plate: HTMLElement | null = null;

  // phones hide the plate on list routes; crossing the breakpoint changes what there is to outline
  const phone = matchMedia('(max-width: 860px)');
  let narrow = $state(phone.matches);
  $effect(() => {
    const on = (e: MediaQueryListEvent) => (narrow = e.matches);
    phone.addEventListener('change', on);
    return () => phone.removeEventListener('change', on);
  });

  function measure() {
    if (!plate) return;
    const top = plate.getBoundingClientRect().top + 120;
    let a = 0;
    items.forEach((it, i) => { if (it.el.getBoundingClientRect().top <= top) a = i; });
    if (plate.scrollTop + plate.clientHeight >= plate.scrollHeight - 4) a = items.length - 1;
    active = a;
  }

  $effect(() => {
    void entry?.id;
    void app.hash; // on phones the plate only shows once an entry route opens it
    void narrow;
    let live = true;
    let off = () => {};
    tick().then(() => requestAnimationFrame(() => {
      if (!live) return; // superseded before the frame came: attach nothing
      plate = document.querySelector<HTMLElement>('.plate');
      if (plate && plate.offsetParent === null) plate = null;
      items = plate ? [...plate.querySelectorAll<HTMLElement>('[data-outline]')].map((el) => ({ label: el.dataset.outline!, el })) : [];
      active = 0;
      if (!plate) return;
      const p = plate;
      const on = () => requestAnimationFrame(measure);
      p.addEventListener('scroll', on, { passive: true });
      off = () => p.removeEventListener('scroll', on);
      measure();
    }));
    return () => { live = false; off(); };
  });

  function go(i: number) {
    const it = items[i];
    if (!plate || !it) return;
    const y = it.el.getBoundingClientRect().top - plate.getBoundingClientRect().top + plate.scrollTop - 16;
    plate.scrollTo({ top: Math.max(0, y), behavior: app.reducedMotion ? 'auto' : 'smooth' });
  }
</script>

{#if entry && items.length}
  <nav class="outline" aria-label="Plate outline">
    <span class="slab" style:transform="translateY({(active + 1) * 22}px)" aria-hidden="true"></span>
    <button class="row root" onclick={() => go(0)} data-cls={entry.cls}>
      <span class="pt"><img src={mediaUrl(entry.media.portrait.src)} alt="" /></span>
      <span class="label">{entry.name}</span>
    </button>
    {#each items as it, i (it.label + i)}
      <button class="row" class:on={i === active} style:--i={i} onclick={() => go(i)}>
        <i class="sym"></i>
        <span class="label">{it.label}</span>
      </button>
    {/each}
  </nav>
{:else}
  <p class="empty">Open a mount to see its outline.</p>
{/if}

<style>
  .outline { position: relative; padding: 2px 0 8px; }
  .row {
    position: relative;
    display: flex; align-items: center; gap: 7px;
    width: 100%; height: 22px;
    padding: 0 10px 0 28px;
    font-size: 12.5px;
    color: var(--ash);
    text-align: left;
    transition: color var(--t-micro);
    animation: in 260ms var(--ease-out) both;
    animation-delay: calc(var(--i, 0) * 22ms);
  }
  @keyframes in { from { opacity: 0; transform: translateX(-5px); } }
  .row:hover { color: var(--bone); background: rgba(237, 230, 217, 0.04); }
  .row.on { color: var(--bone); }
  .root { padding-left: 12px; color: var(--bone-2); font-weight: 600; }
  .pt { width: 14px; height: 14px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 1px var(--cls); flex: none; }
  .pt img { width: 100%; height: 100%; object-fit: cover; }
  .sym { width: 5px; height: 5px; transform: rotate(45deg); border: 1px solid var(--ash-2); flex: none; transition: background var(--t-micro), border-color var(--t-micro); }
  .row.on .sym { background: var(--crimson-hi); border-color: var(--crimson-hi); box-shadow: 0 0 6px var(--crimson); }
  .label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .slab {
    position: absolute; left: 0; right: 0; top: 2px; height: 22px;
    box-shadow: inset 2px 0 0 var(--crimson-hi);
    background: linear-gradient(90deg, rgba(255, 62, 72, 0.1), transparent 80%);
    transition: transform 320ms var(--ease-out);
    pointer-events: none;
  }
  .empty { padding: 8px 14px 12px 28px; font-size: 12px; color: var(--ash); }
  @media (prefers-reduced-motion: reduce) { .row { animation: none; } .slab { transition: none; } }
</style>
