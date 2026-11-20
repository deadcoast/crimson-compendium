<script lang="ts">
  import { reveal } from '../core/motion';
  import type { BranchLabels, Entry } from '../core/types';
  import Glyph from './Glyph.svelte';

  let { entry, labels }: { entry: Entry; labels?: BranchLabels } = $props();
</script>

<section class="how" data-outline={labels?.howOutline ?? 'How to get'} use:reveal={{ delay: 120 }}>
  <header class="sec-head">
    <span class="eyebrow">{labels?.how ?? 'Acquisition'} <i>·</i> {entry.since}</span>
    <h3 class="display">How</h3>
  </header>

  {#if entry.requires.length}
    <ul class="reqs" aria-label="Requirements">
      {#each entry.requires as r}
        <li><Glyph name="diamond" size={9} />{r}</li>
      {/each}
    </ul>
  {/if}

  {#key entry.id}
    {#each entry.routes as route, ri}
      <div class="route">
        {#if route.label}<p class="route-label eyebrow"><span>{String(ri + 1).padStart(2, '0')}</span>{route.label}</p>{/if}
        <ol class="steps">
          {#each route.steps as step, i}
            <li style:--i={i + ri * 3}>
              <span class="n display">{i + 1}</span>
              <p>{step}</p>
            </li>
          {/each}
        </ol>
      </div>
    {/each}
  {/key}

  {#if entry.notes.length}
    <div class="notes">
      <p class="eyebrow">Field notes</p>
      <ul>
        {#each entry.notes as n}<li>{n}</li>{/each}
      </ul>
    </div>
  {/if}
</section>

<style>
  .how { padding: 0 var(--gutter); }
  .sec-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
  .sec-head .eyebrow { font-size: 10px; }
  .sec-head .eyebrow i { font-style: normal; color: var(--ash-2); margin: 0 6px; }
  .sec-head h3 { font-size: 40px; }

  .reqs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 22px; }
  .reqs li {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 5px 11px;
    font-size: 12.5px; color: var(--bone);
    background: var(--ink-2);
    border: 1px solid var(--line-2);
    border-radius: 3px;
  }
  .reqs :global(svg) { color: var(--accent); }

  .route + .route { margin-top: 22px; }
  .route-label { display: flex; align-items: center; gap: 10px; font-size: 10px; color: var(--bone-2); margin-bottom: 10px; }
  .route-label span { color: var(--accent); font-family: var(--f-mono); letter-spacing: 0; }

  .steps { position: relative; }
  .steps li {
    position: relative;
    display: grid;
    grid-template-columns: 34px 1fr;
    gap: 14px;
    padding-bottom: 16px;
    animation: step-in 620ms var(--ease-out) both;
    animation-delay: calc(240ms + var(--i) * 80ms);
  }
  .steps li:not(:last-child)::before { /* the thread between numerals */
    content: '';
    position: absolute; left: 16px; top: 34px; bottom: 2px;
    width: 1px;
    background: linear-gradient(var(--line-3), var(--line));
  }
  @keyframes step-in { from { opacity: 0; transform: translateX(-10px); } }
  .n {
    display: grid; place-items: center;
    width: 34px; height: 34px;
    font-size: 19px;
    font-weight: 600;
    font-variation-settings: 'opsz' 8;
    color: var(--accent);
    border: 1px solid var(--line-2);
    border-radius: 50%;
    background: var(--ink-0);
  }
  .steps p { padding-top: 5px; font-size: 14.5px; color: var(--bone); line-height: 1.55; }

  .notes {
    margin-top: 10px;
    padding: 16px 18px;
    background: linear-gradient(90deg, var(--ink-2), transparent);
    border-left: 2px solid var(--accent);
  }
  .notes .eyebrow { font-size: 10px; margin-bottom: 8px; color: var(--accent); }
  .notes li { position: relative; padding-left: 18px; font-size: 13.5px; color: var(--bone-2); }
  .notes li + li { margin-top: 6px; }
  .notes li::before {
    content: ''; position: absolute; left: 2px; top: 0.62em;
    width: 5px; height: 5px; transform: rotate(45deg);
    background: var(--accent);
  }
</style>
