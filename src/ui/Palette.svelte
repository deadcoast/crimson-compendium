<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { app } from '../core/state.svelte';
  import { search } from '../core/search';
  import { href, mediaUrl, tree } from '../core/tree';

  let q = $state('');
  let sel = $state(0);
  let input: HTMLInputElement | undefined = $state();

  const hits = $derived(search(tree.branches, q));
  const jumps = $derived(
    tree.branches.flatMap((b) => [
      ...b.leaves.map((l) => ({ label: l.label, hint: `${b.title} · leaf`, to: href.leaf(b, l.id) })),
      ...b.categories.map((c) => ({ label: c.subtitle ? `${c.label}: ${c.subtitle}` : c.label, hint: `${b.title} · branch`, to: href.cat(b, c.id) })),
      ...b.lenses.map((l) => ({ label: `${b.labels?.lenses ?? 'Ride for'}: ${l.label}`, hint: `${b.title} · lens`, to: href.lens(b, l.id) })),
      ...(b.matrix ? [{ label: b.matrix.title, hint: `${b.title} · where things go`, to: href.matrix(b) }] : []),
      ...(b.route ? [{ label: b.route.title, hint: `${b.title} · plan`, to: href.route(b) }] : []),
      { label: 'Tier ladder', hint: `${b.title} · ranking`, to: href.ladder(b) },
    ]),
  );
  // folders whose name matches the query lead the results (e.g. "dlc", "under")
  const jumpHits = $derived.by(() => {
    const t = q.trim().toLowerCase();
    return t ? jumps.filter((j) => j.label.toLowerCase().split(/[\s:]+/).some((w) => w.startsWith(t)) || j.label.toLowerCase().startsWith(t)) : [];
  });
  // item names a branch's matrix knows (the Sorter's item families): opening one shows where it goes
  const items = $derived(
    tree.branches.flatMap((b) =>
      (b.matrix?.sheets ?? []).flatMap((sh) => sh.rows.flatMap((r) => (r.items ?? []).map((item) => ({ item, row: r.label, branch: b })))),
    ),
  );
  const itemHits = $derived.by(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    const seen = new Set<string>();
    return items
      .filter((x) => { const n = x.item.toLowerCase(); return n.startsWith(t) || n.split(/[\s'-]+/).some((w) => w.startsWith(t)) || (t.length > 3 && n.includes(t)); })
      .filter((x) => !seen.has(x.item) && !!seen.add(x.item))
      .slice(0, 6);
  });
  const count = $derived(q ? jumpHits.length + hits.length + itemHits.length : jumps.length);
  function openItem(x: { item: string; branch: (typeof tree.branches)[number] }) {
    app.matrixQuery = x.item;
    go(href.matrix(x.branch));
  }

  $effect(() => {
    if (app.palette) { q = ''; sel = 0; queueMicrotask(() => input?.focus()); }
  });
  $effect(() => { void q; sel = 0; });

  function go(to: string) { app.palette = false; app.go(to); }
  function key(ev: KeyboardEvent) {
    if (ev.key === 'ArrowDown') { sel = (sel + 1) % Math.max(count, 1); ev.preventDefault(); }
    else if (ev.key === 'ArrowUp') { sel = (sel - 1 + count) % Math.max(count, 1); ev.preventDefault(); }
    else if (ev.key === 'Enter') {
      const it = itemHits[sel - jumpHits.length - hits.length];
      if (q && it) { openItem(it); return; }
      const h = hits[sel - jumpHits.length];
      const to = q ? (sel < jumpHits.length ? jumpHits[sel].to : h ? href.entry(h.branch, h.entry.id) : '') : jumps[sel]?.to;
      if (to) go(to);
    } else if (ev.key === 'Escape') app.palette = false;
  }
</script>

{#if app.palette}
  <div class="scrim" transition:fade={{ duration: 180 }} onclick={() => (app.palette = false)} aria-hidden="true"></div>
  <div class="palette" role="dialog" aria-modal="true" aria-label="Search" transition:fly={{ y: -16, duration: 320, easing: quintOut }}>
    <label class="field">
      <span class="sr-only">Search</span>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z M15.5 15.5 21 21" /></svg>
      <input bind:this={input} bind:value={q} onkeydown={key} placeholder="A mount, a method, a place, an item — “glide”, “sawmill”, “azurite”…" autocomplete="off" spellcheck="false" />
      <kbd>Esc</kbd>
    </label>

    <ol class="results">
      {#if q}
        {#each jumpHits as j, i (j.to)}
          <li>
            <a href={j.to} class:on={i === sel} class="jump" onmouseenter={() => (sel = i)} onclick={() => (app.palette = false)}>
              <span class="nm">{j.label}</span><span class="mt">{j.hint}</span>
            </a>
          </li>
        {/each}
        {#each hits as h, n (h.branch.id + "/" + h.entry.id)}
          {@const i = n + jumpHits.length}
          <li>
            <a href={href.entry(h.branch, h.entry.id)} class:on={i === sel} onmouseenter={() => (sel = i)} onclick={() => (app.palette = false)}>
              <span class="pt"><img src={mediaUrl(h.entry.media.portrait.src)} alt="" /></span>
              <span class="tx">
                <span class="nm">{h.entry.name}</span>
                <span class="mt">{h.branch.leaves.find((l) => l.id === h.entry.leaf)?.label} · {h.entry.kind} · {h.entry.region}</span>
              </span>
              <span class="tr">{h.entry.trait}</span>
            </a>
          </li>
        {/each}
        {#each itemHits as x, n (x.item)}
          {@const i = n + jumpHits.length + hits.length}
          <li>
            <a href={href.matrix(x.branch)} class:on={i === sel} class="jump item" onmouseenter={() => (sel = i)} onclick={(ev) => { ev.preventDefault(); openItem(x); }}>
              <span class="nm">{x.item}</span><span class="mt">{x.row} · where it goes</span>
            </a>
          </li>
        {/each}
        {#if !count}<li class="none">Nothing matches “{q}”.</li>{/if}
      {:else}
        <li class="label eyebrow">Jump to</li>
        {#each jumps as j, i (j.to)}
          <li>
            <a href={j.to} class:on={i === sel} class="jump" onmouseenter={() => (sel = i)} onclick={() => (app.palette = false)}>
              <span class="nm">{j.label}</span><span class="mt">{j.hint}</span>
            </a>
          </li>
        {/each}
      {/if}
    </ol>
    <p class="foot"><kbd>↑</kbd><kbd>↓</kbd> move <kbd>↵</kbd> open</p>
  </div>
{/if}

<style>
  .scrim { position: fixed; inset: 0; z-index: 60; background: rgba(5, 4, 4, 0.72); backdrop-filter: blur(6px); }
  .palette {
    position: fixed; z-index: 61;
    top: 12vh; left: 0; right: 0;
    width: min(680px, 92vw);
    margin-inline: auto;
    background: var(--ink-1);
    border: 1px solid var(--line-2);
    box-shadow: 0 40px 120px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 62, 72, 0.08);
    border-radius: 10px;
    overflow: hidden;
  }
  .field { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--line); color: var(--ash); }
  input { flex: 1; background: none; border: 0; outline: 0; color: var(--bone); font: inherit; font-size: 17px; }
  input::placeholder { color: var(--ash); }

  .results { max-height: 52vh; overflow-y: auto; padding: 8px; }
  .label { padding: 8px 10px 4px; font-size: 10px; }
  .results a {
    display: grid; grid-template-columns: 40px minmax(0, 1fr) minmax(0, 0.9fr); gap: 14px; align-items: center;
    padding: 8px 10px; border-radius: 6px;
    border-left: 2px solid transparent;
  }
  .results a.jump { grid-template-columns: 1fr auto; padding: 10px 12px; }
  .results a.on { background: var(--ink-3); border-left-color: var(--crimson-hi); }
  .pt { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 1px var(--line-2); }
  .pt img { width: 100%; height: 100%; object-fit: cover; }
  .tx { display: flex; flex-direction: column; min-width: 0; }
  .nm { font-weight: 600; color: var(--bone); }
  .mt { font-size: 12px; color: var(--ash); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tr { font-size: 12.5px; color: var(--bone-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .none { padding: 18px 12px; color: var(--ash); }
  .foot { display: flex; gap: 6px; align-items: center; padding: 10px 16px; border-top: 1px solid var(--line); font-size: 11.5px; color: var(--ash); }

  @media (max-width: 720px) {
    .palette { top: 0; width: 100vw; border-radius: 0; }
    .results a { grid-template-columns: 40px 1fr; }
    .tr { display: none; }
  }
</style>
