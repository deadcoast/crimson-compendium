<script lang="ts">
  import { app } from '../core/state.svelte';
  import { mediaUrl } from '../core/tree';
  import { CREDITS } from '../core/format';
  import { reveal } from '../core/motion';
  import type { Entry } from '../core/types';
  import Glyph from './Glyph.svelte';

  let { entry }: { entry: Entry } = $props();

  const caps = $derived(entry.media.captures);
  let active = $state(0);
  $effect(() => { void entry.id; active = 0; });
  const cap = $derived(caps[active]);

  const KIND: Record<string, string> = { map: 'World map', overworld: 'On site', action: 'In action', variant: 'Variant' };

  // loupe: magnify map labels under the pointer
  let frame: HTMLElement | undefined = $state();
  let lens = $state({ on: false, x: 0, y: 0, bx: 0, by: 0, bw: 0 });
  const ZOOM = 2.6;
  function move(ev: PointerEvent) {
    if (ev.pointerType !== 'mouse' || !frame) return;
    const img = frame.querySelector('img');
    if (!img) return;
    const r = img.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) { lens.on = false; return; }
    const fr = frame.getBoundingClientRect();
    lens = { on: true, x: ev.clientX - fr.left, y: ev.clientY - fr.top, bw: r.width * ZOOM, bx: -(x * ZOOM - 95), by: -(y * ZOOM - 95) };
  }
</script>

<section class="where" use:reveal>
  <header class="sec-head">
    <span class="eyebrow">Location reference</span>
    <h3 class="display">Where</h3>
  </header>

  {#if caps.length}
    <p class="place"><Glyph name="compass" size={16} /><span>{entry.location}</span></p>

    {#if caps.length > 1}
      <div class="tabs" role="tablist" aria-label="Location captures">
        {#each caps as c, i}
          <button role="tab" aria-selected={active === i} class:on={active === i} onclick={() => (active = i)}>
            <img src={mediaUrl(c.src)} alt="" loading="lazy" />
            <span><span class="eyebrow">{KIND[c.kind]}</span>{c.caption.split(' — ')[1] ?? c.caption}</span>
          </button>
        {/each}
      </div>
    {/if}

    <figure
      class="frame"
      class:map={cap.kind === 'map'}
      bind:this={frame}
      onpointermove={move}
      onpointerleave={() => (lens.on = false)}
    >
      {#key `${entry.id}:${active}`}
        <button class="shot" onclick={() => (app.lightbox = { items: caps, index: active })} aria-label="Open full screen: {cap.caption}">
          <img src={mediaUrl(cap.src)} alt={cap.caption} width={cap.w} height={cap.h} />
        </button>
      {/key}
      <span
        class="loupe"
        class:on={lens.on}
        aria-hidden="true"
        style:left="{lens.x}px"
        style:top="{lens.y}px"
        style:background-image="url({mediaUrl(cap.src)})"
        style:background-size="{lens.bw}px auto"
        style:background-position="{lens.bx}px {lens.by}px"
      ></span>
      <span class="expand" aria-hidden="true"><Glyph name="expand" size={14} /></span>
      <figcaption>
        <span class="kind eyebrow"><Glyph name={cap.kind === 'map' ? 'map' : 'eye'} size={12} />{KIND[cap.kind]}</span>
        <span class="cap">{cap.caption.split(' — ')[1] ?? cap.caption}</span>
        <span class="credit mono">{CREDITS[cap.credit]?.name ?? cap.credit}</span>
      </figcaption>
    </figure>
  {:else}
    <div class="roam">
      <span class="dial" aria-hidden="true"><Glyph name="compass" size={44} /></span>
      <p><span class="eyebrow">Roams — no fixed spawn</span>{entry.location}</p>
    </div>
  {/if}
</section>

<style>
  .where { padding: 0 var(--gutter); }
  .sec-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
  .sec-head .eyebrow { font-size: 10px; }
  .sec-head h3 { font-size: 40px; }

  .place { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 18px; color: var(--bone-2); }
  .place :global(svg) { color: var(--accent); margin-top: 3px; }
  .place span { color: var(--bone); }

  .tabs { display: flex; gap: 8px; margin-bottom: 12px; overflow-x: auto; padding-bottom: 2px; }
  .tabs button {
    display: flex; align-items: center; gap: 10px;
    padding: 6px 12px 6px 6px;
    border: 1px solid var(--line-2);
    border-radius: 6px;
    text-align: left; font-size: 12.5px; color: var(--bone-2);
    flex: none; max-width: 260px;
    transition: border-color var(--t-micro), background var(--t-micro), color var(--t-micro);
  }
  .tabs img { width: 54px; height: 34px; object-fit: cover; border-radius: 3px; opacity: 0.7; transition: opacity var(--t-micro); }
  .tabs button > span { display: flex; flex-direction: column; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tabs .eyebrow { font-size: 9.5px; }
  .tabs button:hover { color: var(--bone); border-color: var(--line-3); }
  .tabs button.on { color: var(--bone); border-color: var(--accent); background: var(--accent-dim); }
  .tabs button.on img { opacity: 1; }

  .frame {
    position: relative;
    margin: 0;
    background: var(--ink-1);
    border: 1px solid var(--line-2);
    cursor: zoom-in;
    overflow: hidden;
  }
  .frame.map { background: var(--parchment); border-color: rgba(219, 213, 200, 0.5); }
  .shot { display: block; width: 100%; cursor: inherit; }
  .shot img {
    width: 100%; height: auto; max-height: 560px; object-fit: contain; margin: 0 auto;
    animation: unfold 760ms var(--ease-out) both;
  }
  @keyframes unfold { from { clip-path: inset(50% 0 50% 0); opacity: 0.4; } to { clip-path: inset(0 0 0 0); } }

  .loupe {
    position: absolute; z-index: 2;
    width: 190px; height: 190px; margin: -95px 0 0 -95px;
    border-radius: 50%;
    background-repeat: no-repeat;
    background-color: var(--ink-1);
    box-shadow: 0 0 0 1.5px var(--crimson-hi), 0 0 0 7px rgba(10, 8, 7, 0.55), 0 20px 50px rgba(0, 0, 0, 0.6);
    opacity: 0; transform: scale(0.6);
    transition: opacity var(--t-micro), transform 260ms var(--ease-out);
    pointer-events: none;
  }
  .loupe.on { opacity: 1; transform: none; }

  .expand {
    position: absolute; top: 10px; right: 10px; z-index: 1;
    display: grid; place-items: center; width: 30px; height: 30px;
    border-radius: 50%; color: var(--bone);
    background: rgba(10, 8, 7, 0.7);
    pointer-events: none;
  }

  figcaption {
    display: flex; align-items: center; gap: 14px;
    padding: 10px 14px;
    background: var(--ink-1);
    border-top: 1px solid var(--line);
    font-size: 13px; color: var(--bone-2);
    cursor: default;
  }
  .kind { display: inline-flex; gap: 6px; align-items: center; font-size: 10px; color: var(--accent); flex: none; }
  .cap { flex: 1; min-width: 0; }
  .credit { flex: none; font-size: 10.5px; color: var(--ash-2); }

  .roam {
    display: flex; align-items: center; gap: 20px;
    padding: 22px 24px;
    border: 1px dashed var(--line-2);
    color: var(--bone-2); font-size: 14px;
  }
  .roam p { display: flex; flex-direction: column; gap: 4px; color: var(--bone); }
  .roam .eyebrow { font-size: 10px; color: var(--accent); }
  .dial { color: var(--accent); animation: sway 6s ease-in-out infinite alternate; }
  @keyframes sway { from { transform: rotate(-14deg); } to { transform: rotate(16deg); } }

  @media (max-width: 720px) {
    figcaption { flex-wrap: wrap; gap: 6px 12px; }
  }
</style>
