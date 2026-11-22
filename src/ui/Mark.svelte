<script lang="ts">
  // One matrix mark (types.ts MatrixMark), drawn the same wherever it appears: the Sorter's grid, its
  // legend and readout, and the Materials manifest's shelves. Shape carries the meaning, so the marks
  // still read apart without colour: ◆ home, ↘ read here, ○ fits, ▲ donate, ▼ arrives, dashed ○ reported, ✕ refused.
  let { id, size = 15 }: { id: string; size?: number } = $props();
</script>

<svg class="mk" data-mark={id} viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
  {#if id === 'home'}<path d="M8 1.6 14.4 8 8 14.4 1.6 8Z" />
  {:else if id === 'draw'}<path d="M3.5 3.5 11.5 11.5M12 5v7H5" />
  {:else if id === 'ok'}<circle cx="8" cy="8" r="5" />
  {:else if id === 'give'}<path d="M8 2.4 14 13.2H2Z" />
  {:else if id === 'recv'}<path d="M2 3.2h12L8 13.6Z" />
  {:else if id === 'unk'}<circle cx="8" cy="8" r="5" stroke-dasharray="2.2 2.2" />
  {:else if id === 'no'}<path d="M4.6 4.6 11.4 11.4M11.4 4.6 4.6 11.4" />
  {:else}<circle cx="8" cy="8" r="2" />{/if}
</svg>

<style>
  .mk { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: square; flex: none; }
  .mk[data-mark='home'] { fill: var(--accent); stroke: var(--accent); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--accent) 55%, transparent)); }
  .mk[data-mark='draw'] { color: var(--accent); stroke-width: 1.9; }
  .mk[data-mark='ok'] { color: var(--bone-2); }
  .mk[data-mark='give'] { fill: var(--brass); stroke: var(--brass); }
  .mk[data-mark='recv'] { color: var(--sky); }
  .mk[data-mark='unk'] { color: var(--ash); }
  .mk[data-mark='no'] { color: var(--ember); }
</style>
