<script lang="ts">
  // A branch's route (#<branch>-route): the ordered plan through the branch, phase by phase.
  // Each phase leads with its image, says why it comes at this point, and links every step to the plate
  // that explains it. A rail tracks the reader's place; the spine fills as they scroll.
  import { app } from '../core/state.svelte';
  import { coverFrom, href, leafOf, mediaUrl, ROMAN } from '../core/tree';
  import { reveal } from '../core/motion';
  import type { Branch, RoutePhase, RouteStep } from '../core/types';
  import Glyph from './Glyph.svelte';

  let { branch }: { branch: Branch } = $props();

  const route = $derived(branch.route!);
  const pad = (n: number) => String(n).padStart(2, '0');
  const firstEntry = (ph: RoutePhase) => ph.steps.find((s) => s.entry)?.entry;
  const accentOf = (ph: RoutePhase) => {
    const id = firstEntry(ph);
    const e = id ? branch.byId.get(id) : undefined;
    return e ? leafOf(branch, e).accent : (branch.accent ?? 'bone');
  };
  const stepEntry = (s: RouteStep) => (s.entry ? branch.byId.get(s.entry) : undefined);
  // a stage line opens wherever the stage changes, so the reader sees where the DLC starts
  const opensStage = (i: number) => i === 0 || route.phases[i - 1].stage !== route.phases[i].stage;
  const stages = $derived(
    [...new Set(route.phases.map((p) => p.stage))].map((s) => ({ name: s, n: route.phases.filter((p) => p.stage === s).length })),
  );

  let scroller: HTMLElement | undefined = $state();
  let active = $state(0);
  let progress = $state(0);
  // the current phase is the last one whose top has crossed a reading line 40% down the scroller,
  // measured on scroll (one rAF per frame) so it holds at any aspect ratio
  $effect(() => {
    const root = scroller;
    if (!root) return;
    const phases = [...root.querySelectorAll<HTMLElement>('.phase')];
    let raf = 0;
    const measure = () => {
      raf = 0;
      const line = root.getBoundingClientRect().top + root.clientHeight * 0.4;
      let i = 0;
      phases.forEach((p, n) => { if (p.getBoundingClientRect().top <= line) i = n; });
      // at the very bottom the last phase is current even when it is too short to reach the line
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 2) i = phases.length - 1;
      active = i;
      progress = root.scrollTop / Math.max(1, root.scrollHeight - root.clientHeight);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    root.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(root);
    measure();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); root.removeEventListener('scroll', onScroll); };
  });

  function jump(i: number) {
    scroller?.querySelector(`.phase[data-i="${i}"]`)?.scrollIntoView({ behavior: app.reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
</script>

<section class="route" aria-label={route.title} bind:this={scroller} data-accent={branch.accent ?? 'crimson'}>
  <header class="head">
    <p class="eyebrow crumbs"><a href={href.branch(branch)}>{branch.title}</a><span>/</span><span>The plan, in order</span></p>
    <h1 class="display">{route.title}</h1>
    <p class="blurb">{route.blurb}</p>
    <div class="premise">
      <p class="eyebrow"><Glyph name="compass" size={13} /> Starting point</p>
      <p>{route.premise}</p>
      <ul class="stages">
        {#each stages as s}<li><span>{s.name}</span><span class="mono">{s.n} {s.n === 1 ? 'phase' : 'phases'}</span></li>{/each}
      </ul>
    </div>
  </header>

  <div class="body">
    <nav class="rail" aria-label="Phases">
      <span class="spine" aria-hidden="true"><i style:transform="scaleY({progress})"></i></span>
      <ol>
        {#each route.phases as ph, i (ph.id)}
          <li>
            <button
              class:on={active === i}
              class:past={i < active}
              data-accent={accentOf(ph)}
              aria-current={active === i ? 'step' : undefined}
              onclick={() => jump(i)}
            >
              <span class="n display">{pad(i + 1)}</span>
              <span class="l">{ph.label}</span>
            </button>
          </li>
        {/each}
      </ol>
    </nav>

    <ol class="phases">
      {#each route.phases as ph, i (ph.id)}
        {@const cover = ph.cover ? coverFrom(branch, ph.cover) : undefined}
        {#if i > 0 && opensStage(i)}
          <li class="threshold">
            <span class="rule"></span><span class="display">{ph.stage}</span><span class="rule"></span>
          </li>
        {/if}
        <li class="phase" class:flip={i % 2 === 1} data-i={i} data-accent={accentOf(ph)} use:reveal>
          {#if cover}
            <figure class="cover">
              <img src={mediaUrl(cover.src)} alt="" loading="lazy" style:object-position={cover.focus ?? '50% 45%'} />
              <span class="big display" aria-hidden="true">{pad(i + 1)}</span>
            </figure>
          {/if}
          <div class="text">
            <p class="eyebrow">{ph.stage} <i>·</i> Phase {pad(i + 1)}</p>
            <h2 class="display">{ph.label}</h2>
            <p class="why">{ph.why}</p>

            <ol class="steps">
              {#each ph.steps as s, si}
                {@const e = stepEntry(s)}
                <li style:--si={si}>
                  {#if e}
                    <a class="who" href={href.entry(branch, e.id)} data-accent={leafOf(branch, e).accent}>
                      <span class="pt"><img src={mediaUrl(e.media.portrait.src)} alt="" loading="lazy" /></span>
                      <span class="nm">{e.name}</span>
                      {#if e.tiers.return?.tier}<span class="t mono" title="Return tier">{ROMAN[e.tiers.return.tier]}</span>{/if}
                    </a>
                  {/if}
                  <p>{s.text}</p>
                </li>
              {/each}
            </ol>

            {#if ph.meanwhile?.length}
              <aside class="meanwhile">
                <p class="eyebrow"><Glyph name="player" size={13} /> While the timers run</p>
                {#each ph.meanwhile as s}
                  {@const e = stepEntry(s)}
                  <p>
                    {#if e}<a href={href.entry(branch, e.id)}>{e.name}</a>{' — '}{/if}{s.text}
                  </p>
                {/each}
              </aside>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
  </div>

  <footer class="foot">
    <p class="eyebrow">Everything on this route, ranked</p>
    <div class="next">
      <a href={href.ladder(branch)}><Glyph name="ladder" size={15} />Tier ladder</a>
      {#each branch.categories.slice(0, 2) as c}
        <a href={href.cat(branch, c.id)}><Glyph name={c.glyph} size={15} />{c.label}</a>
      {/each}
    </div>
  </footer>
</section>

<style>
  .route {
    height: 100%;
    overflow-y: auto;
    scroll-behavior: smooth;
    padding: 34px var(--gutter) 90px;
    background:
      radial-gradient(1100px 520px at 18% -12%, color-mix(in srgb, var(--accent) 13%, transparent), transparent 62%),
      var(--ink-0);
  }
  @media (prefers-reduced-motion: reduce) { .route { scroll-behavior: auto; } }

  /* ── header ─────────────── */
  .head { max-width: 980px; }
  .crumbs { display: flex; gap: 8px; font-size: 10px; }
  .crumbs a:hover { color: var(--bone); }
  h1 { font-size: clamp(56px, 7vw, 108px); margin-top: 8px; line-height: 0.95; animation: rise 900ms var(--ease-out) both; }
  .blurb { max-width: 60ch; margin-top: 14px; font-size: 16px; line-height: 1.6; color: var(--bone-2); animation: rise 900ms var(--ease-out) 120ms both; }
  @keyframes rise { from { opacity: 0; transform: translateY(18px); } }

  .premise {
    margin-top: 26px;
    padding: 16px 20px 16px 22px;
    max-width: 720px;
    border-left: 2px solid var(--accent);
    background: linear-gradient(90deg, var(--accent-dim), transparent 85%);
    animation: rise 900ms var(--ease-out) 220ms both;
  }
  .premise .eyebrow { display: flex; align-items: center; gap: 8px; font-size: 10px; color: var(--accent); margin-bottom: 6px; }
  .premise p:not(.eyebrow) { font-size: 14px; line-height: 1.6; color: var(--bone); }
  .stages { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 12px; }
  .stages li { display: inline-flex; gap: 8px; align-items: baseline; font-size: 12.5px; color: var(--bone-2); }
  .stages .mono { font-size: 10.5px; color: var(--ash); }

  /* ── rail + phases ─────────── */
  .body { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 40px; margin-top: 54px; }

  .rail { position: sticky; top: 0; align-self: start; padding: 6px 0 6px 18px; }
  .spine { position: absolute; left: 4px; top: 10px; bottom: 10px; width: 1px; background: var(--line-2); }
  .spine i { position: absolute; inset: 0; transform-origin: top; background: var(--accent); box-shadow: 0 0 10px var(--accent); transition: transform 120ms linear; }
  .rail ol { display: flex; flex-direction: column; gap: 2px; }
  .rail button {
    position: relative;
    display: grid; grid-template-columns: 30px minmax(0, 1fr); align-items: baseline; gap: 8px;
    width: 100%; padding: 7px 8px; text-align: left; border-radius: 3px;
    color: var(--ash);
    transition: color var(--t-micro), background var(--t-micro);
  }
  .rail button::before {
    content: ''; position: absolute; left: -18px; top: 50%;
    width: 7px; height: 7px; margin-top: -3.5px; transform: rotate(45deg) scale(0.7);
    border: 1px solid var(--line-2); background: var(--ink-0);
    transition: transform var(--t-ui) var(--ease-out), background var(--t-ui), border-color var(--t-ui);
  }
  .rail button:hover { color: var(--bone); background: var(--ink-2); }
  .rail button.past { color: var(--bone-2); }
  .rail button.past::before { border-color: var(--accent); }
  .rail button.on { color: var(--bone); background: var(--accent-dim); }
  .rail button.on::before { transform: rotate(45deg) scale(1.15); background: var(--accent); border-color: var(--accent); box-shadow: 0 0 10px var(--accent); }
  .rail .n { font-size: 17px; font-variant-numeric: lining-nums; font-variation-settings: 'opsz' 8; }
  .rail button.on .n { color: var(--accent); }
  .rail .l { font-size: 12.5px; line-height: 1.35; }

  .phases { display: flex; flex-direction: column; gap: 70px; min-width: 0; }

  .threshold { display: flex; align-items: center; gap: 18px; margin: 10px 0 -30px; color: var(--accent); }
  .threshold .display { font-size: 22px; font-style: italic; white-space: nowrap; }
  .threshold .rule { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--accent), transparent); }

  .phase { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 34px; align-items: start; scroll-margin-top: 20px; }
  .phase.flip .cover { order: 2; }

  .cover {
    position: relative; margin: 0; aspect-ratio: 16 / 10; overflow: hidden;
    border-radius: 2px; box-shadow: 0 0 0 1px var(--line-2), 0 30px 60px rgba(0, 0, 0, 0.45);
  }
  .cover img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.12); transition: transform 2400ms var(--ease-out), filter 1200ms var(--ease-out); filter: saturate(0.6) brightness(0.7); }
  :global(.phase.in) .cover img { transform: scale(1.02); filter: none; }
  .cover::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 45%, rgba(10, 8, 7, 0.85)); }
  .cover::before {
    content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px; z-index: 2;
    background: var(--accent); transform: scaleX(0); transform-origin: left; transition: transform 1100ms var(--ease-out) 300ms;
  }
  :global(.phase.in) .cover::before { transform: scaleX(1); }
  .big {
    position: absolute; right: 14px; bottom: -12px; z-index: 1;
    font-size: clamp(72px, 9vw, 132px); line-height: 1; font-weight: 600; font-variation-settings: 'opsz' 8;
    color: transparent; -webkit-text-stroke: 1px color-mix(in srgb, var(--accent) 80%, transparent);
    opacity: 0; transform: translateY(20px); transition: opacity 900ms var(--ease-out) 400ms, transform 900ms var(--ease-out) 400ms;
  }
  :global(.phase.in) .big { opacity: 1; transform: none; }

  .text .eyebrow { font-size: 10px; color: var(--accent); }
  .text .eyebrow i { font-style: normal; color: var(--ash-2); margin: 0 6px; }
  .text h2 { margin-top: 6px; font-size: clamp(32px, 3.4vw, 48px); line-height: 1.02; }
  .why { margin-top: 12px; font-size: 15px; line-height: 1.65; color: var(--bone-2); max-width: 58ch; }

  .steps { margin-top: 18px; display: flex; flex-direction: column; border-top: 1px solid var(--line); }
  .steps li {
    display: flex; flex-direction: column; gap: 6px; padding: 12px 0 13px; border-bottom: 1px solid var(--line);
    opacity: 0; transform: translateX(-10px);
    transition: opacity 700ms var(--ease-out), transform 700ms var(--ease-out);
    transition-delay: calc(400ms + var(--si) * 110ms);
  }
  :global(.phase.in) .steps li { opacity: 1; transform: none; }
  .steps p { font-size: 13.5px; line-height: 1.55; color: var(--bone-2); }
  .who { display: inline-flex; align-items: center; gap: 9px; align-self: flex-start; font-size: 14px; font-weight: 600; color: var(--bone); }
  .who:hover .nm { color: var(--accent); }
  .pt { width: 30px; height: 30px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 1px var(--accent), 0 0 0 3px var(--ink-0); flex: none; }
  .pt img { width: 100%; height: 100%; object-fit: cover; }
  .nm { transition: color var(--t-micro); }
  .t { font-size: 10.5px; padding: 1px 6px; border: 1px solid var(--line-2); border-radius: 2px; color: var(--accent); }

  .meanwhile {
    margin-top: 16px; padding: 12px 14px 12px 16px;
    border-left: 2px dashed var(--ember);
    background: linear-gradient(90deg, rgba(224, 103, 47, 0.08), transparent 80%);
  }
  .meanwhile .eyebrow { display: flex; align-items: center; gap: 8px; font-size: 10px; color: var(--ember); margin-bottom: 4px; }
  .meanwhile p:not(.eyebrow) { font-size: 13px; line-height: 1.55; color: var(--bone-2); }
  .meanwhile a { color: var(--bone); border-bottom: 1px solid var(--line-2); }
  .meanwhile a:hover { border-bottom-color: var(--ember); }

  .foot { margin-top: 80px; padding-top: 26px; border-top: 1px solid var(--line); }
  .foot .eyebrow { font-size: 10px; }
  .next { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
  .next a {
    display: inline-flex; align-items: center; gap: 9px; padding: 9px 16px;
    border: 1px solid var(--line-2); border-radius: 999px; font-size: 13.5px; color: var(--bone);
    transition: border-color var(--t-micro), background var(--t-micro);
  }
  .next a:hover { border-color: var(--accent); background: var(--accent-dim); }
  .next a :global(svg) { color: var(--accent); }

  @media (prefers-reduced-motion: reduce) {
    .cover img, .big, .steps li, .cover::before { transition: none; }
  }

  @media (max-width: 1240px) {
    .body { grid-template-columns: minmax(0, 1fr); }
    .rail { display: none; }
    .phase { grid-template-columns: minmax(0, 1fr); gap: 20px; }
    .phase.flip .cover { order: 0; }
  }
</style>
