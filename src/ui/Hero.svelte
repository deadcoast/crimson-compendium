<script lang="ts">
  import { parallax } from '../core/motion';
  import { mediaUrl, classLabel } from '../core/tree';
  import { CREDITS } from '../core/format';
  import type { Branch, Entry, Leaf } from '../core/types';
  import Glyph from './Glyph.svelte';
  import Particles from './Particles.svelte';

  let {
    branch, entry, leaf, pos, prevHref, nextHref, backHref,
  }: {
    branch: Branch; entry: Entry; leaf: Leaf;
    pos: { index: number; total: number };
    prevHref: string; nextHref: string; backHref: string;
  } = $props();

  const hero = $derived(entry.media.hero);
  const bleed = $derived(!!hero);
  const shown = $derived(hero ?? entry.media.portrait);
  // letters animate individually but break only between words
  const words = $derived(entry.name.split(' ').map((w, wi, all) => ({ chars: [...w], offset: all.slice(0, wi).join(' ').length + (wi ? 1 : 0) })));
  const size = $derived(entry.name.length > 16 ? 'xl' : entry.name.length > 11 ? 'l' : 'm');
  const credit = $derived(CREDITS[shown.credit]?.name ?? shown.credit);
  const pad = (n: number) => String(n).padStart(2, '0');
</script>

<header class="hero" data-outline="Overview" data-cls={entry.cls} data-accent={leaf.accent} use:parallax>
  {#key entry.id}
    <div class="stage">
      <div class="backdrop" class:bleed>
        <img src={mediaUrl(shown.src)} alt={bleed ? `${entry.name} in game` : ''} style:object-position={hero?.focus ?? '50% 45%'} />
      </div>
      {#if !bleed}
        <figure class="specimen">
          <img src={mediaUrl(entry.media.portrait.src)} alt="{entry.name} — in-game knowledge art" />
          <i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>
        </figure>
      {/if}
      <span class="blade" aria-hidden="true"></span>
    </div>
  {/key}

  <Particles mode={branch.classes.find((c) => c.id === entry.cls)?.ambient ?? entry.cls} />
  <div class="veil" aria-hidden="true"></div>

  <a class="back" href={backHref} aria-label="Back to list"><Glyph name="left" size={18} /></a>

  <div class="caption">
    {#key entry.id}
      <p class="eyebrow tags">
        <span class="leaf">{leaf.label}</span>
        <span class="cls"><Glyph name={entry.cls} size={13} />{classLabel(branch, entry.cls)}</span>
        <span>{entry.kind}</span>
      </p>
      <h2 class="display name {size}" aria-label={entry.name}>
        {#each words as w, wi}<span class="word" aria-hidden="true">{#each w.chars as ch, ci}<span style:--i={w.offset + ci}>{ch}</span>{/each}</span>{#if wi < words.length - 1}{' '}{/if}{/each}
      </h2>
      <p class="trait"><Glyph name="diamond" size={12} /> {entry.trait}</p>
    {/key}
  </div>

  <nav class="step" aria-label="Step through list">
    <a href={prevHref} aria-label="Previous"><Glyph name="left" size={16} /></a>
    <span class="mono">{pad(pos.index + 1)}<i>/</i>{pad(pos.total)}</span>
    <a href={nextHref} aria-label="Next"><Glyph name="right" size={16} /></a>
  </nav>

  <p class="credit mono">{credit} · © Pearl Abyss</p>
</header>

<style>
  .hero {
    --px: 0; --py: 0;
    position: relative;
    height: clamp(400px, 58vh, 660px);
    overflow: hidden;
    isolation: isolate;
    background: var(--ink-1);
  }
  .stage { position: absolute; inset: 0; z-index: -1; }

  /* ── backdrop ────────────────────── */
  .backdrop { position: absolute; inset: -4%; overflow: hidden; }
  .backdrop img {
    width: 100%; height: 100%; object-fit: cover;
    transform: translate(calc(var(--px) * -10px), calc(var(--py) * -8px)) scale(1.04);
    transition: transform 900ms var(--ease-out);
    animation: unveil 1100ms var(--ease-out) both 120ms;
  }
  .backdrop.bleed img { animation: unveil 1100ms var(--ease-out) both 120ms, burns 26s ease-in-out 1.3s infinite alternate; }
  .backdrop:not(.bleed) img { filter: blur(38px) saturate(1.25) brightness(0.55); transform: scale(1.4); }
  @keyframes unveil { from { clip-path: inset(0 100% 0 0); filter: brightness(1.8) saturate(0.4); } to { clip-path: inset(0 0 0 0); } }
  @keyframes burns { to { scale: 1.1; translate: -1.5% 1%; } }

  /* the crimson blade that slashes the plate open */
  .blade {
    position: absolute; top: -20%; bottom: -20%; left: 0;
    width: 14%;
    background: linear-gradient(90deg, transparent, var(--crimson-hi) 45%, #ffb3a8 50%, var(--crimson-hi) 55%, transparent);
    transform: translateX(-140%) skewX(-18deg);
    filter: blur(1px);
    mix-blend-mode: screen;
    opacity: 0.9;
    animation: slash 1100ms var(--ease-io) both 60ms;
    pointer-events: none;
  }
  @keyframes slash { to { transform: translateX(860%) skewX(-18deg); opacity: 0; } }

  /* ── specimen frame (portrait-only entries) ── */
  .specimen {
    --s: clamp(220px, 32vh, 340px);
    position: absolute; right: 7%; top: 50%;
    width: var(--s); height: var(--s);
    margin: calc(var(--s) / -2) 0 0;
    transform: translate(calc(var(--px) * 12px), calc(var(--py) * 10px));
    transition: transform 900ms var(--ease-out);
    animation: rise 1100ms var(--ease-out) both 260ms;
  }
  .specimen img {
    width: 100%; height: 100%; object-fit: cover;
    border: 1px solid var(--line-3);
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55), 0 0 0 8px rgba(10, 8, 7, 0.35);
    animation: float 7s ease-in-out infinite alternate 1.4s;
  }
  @keyframes rise { from { opacity: 0; transform: translateY(40px) scale(0.94); } }
  @keyframes float { to { transform: translateY(-8px); } }
  .c { position: absolute; width: 16px; height: 16px; border: 1.5px solid var(--accent); }
  .tl { top: -9px; left: -9px; border-right: 0; border-bottom: 0; }
  .tr { top: -9px; right: -9px; border-left: 0; border-bottom: 0; }
  .bl { bottom: -9px; left: -9px; border-right: 0; border-top: 0; }
  .br { bottom: -9px; right: -9px; border-left: 0; border-top: 0; }

  .veil {
    position: absolute; inset: 0; z-index: 0; pointer-events: none;
    background:
      linear-gradient(0deg, var(--ink-0) 0%, rgba(10, 8, 7, 0.82) 18%, rgba(10, 8, 7, 0) 58%),
      linear-gradient(90deg, rgba(10, 8, 7, 0.78) 0%, rgba(10, 8, 7, 0.25) 46%, rgba(10, 8, 7, 0) 70%);
  }

  /* ── caption ─────────────────────── */
  .caption { position: absolute; left: var(--gutter); right: var(--gutter); bottom: 34px; z-index: 1; }
  .tags { display: flex; gap: 16px; align-items: center; color: var(--bone-2); animation: up 700ms var(--ease-out) both 300ms; }
  .tags .leaf { color: var(--accent); }
  .tags .cls { display: inline-flex; gap: 6px; align-items: center; color: var(--cls); }
  .name { margin: 14px 0 0 -4px; font-weight: 500; text-shadow: 0 6px 40px rgba(0, 0, 0, 0.6); }
  .name.m { font-size: clamp(60px, 7.4vw, 118px); }
  .name.l { font-size: clamp(52px, 6vw, 96px); }
  .name.xl { font-size: clamp(42px, 4.6vw, 76px); }
  .name .word { display: inline-block; white-space: nowrap; }
  .name .word span {
    display: inline-block;
    animation: letter 900ms var(--ease-out) both;
    animation-delay: calc(380ms + var(--i) * 24ms);
  }
  @keyframes letter { from { opacity: 0; transform: translateY(42%) rotate(4deg); filter: blur(8px); } }
  .trait {
    display: inline-flex; align-items: center; gap: 10px;
    margin-top: 26px; padding: 8px 14px 8px 12px;
    font-size: 15px; font-weight: 500; color: var(--bone);
    background: rgba(10, 8, 7, 0.55);
    border: 1px solid var(--line-2);
    border-left: 2px solid var(--accent);
    backdrop-filter: blur(8px);
    animation: up 800ms var(--ease-out) both 640ms;
  }
  .trait :global(svg) { color: var(--accent); }
  @keyframes up { from { opacity: 0; transform: translateY(16px); } }

  /* ── stepper + credit ────────────── */
  .step {
    position: absolute; top: 22px; right: var(--gutter); z-index: 2;
    display: flex; align-items: center; gap: 4px;
    padding: 4px;
    background: rgba(10, 8, 7, 0.72);
    border: 1px solid var(--line-2);
    border-radius: 999px;
    backdrop-filter: blur(10px);
  }
  .step a { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; color: var(--bone-2); transition: background var(--t-micro), color var(--t-micro); }
  .step a:hover { background: var(--ink-4); color: var(--bone); }
  .step span { padding: 0 6px; color: var(--bone); }
  .step i { font-style: normal; color: var(--ash); margin: 0 3px; }
  .credit { position: absolute; right: var(--gutter); bottom: 12px; z-index: 1; font-size: 10px; color: var(--ash); }

  .back { display: none; }

  @media (max-width: 860px) {
    .hero { height: clamp(380px, 62vh, 560px); }
    .back {
      position: absolute; top: 18px; left: 16px; z-index: 2;
      display: grid; place-items: center; width: 40px; height: 40px;
      border-radius: 50%; background: rgba(10, 8, 7, 0.6); border: 1px solid var(--line-2); backdrop-filter: blur(10px);
    }
    .specimen { --s: clamp(180px, 46vw, 260px); right: 50%; top: 38%; margin-right: calc(var(--s) / -2); }
    .caption { bottom: 26px; }
    .name.m { font-size: 54px; }
    .name.l { font-size: 46px; }
    .name.xl { font-size: 38px; }
    .trait { font-size: 13.5px; }
  }
</style>
