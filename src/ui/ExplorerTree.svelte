<script lang="ts">
  // The compendium explorer: an IDE tree built on VS Code's tree widget semantics.
  // Keyboard map — VS Code list/tree, plus Atom tree-view's recursive folds:
  //   ↑ ↓ PgUp PgDn Home End  move focus          → expand, or step into the first child
  //   ← collapse, or step out to the parent       Alt+→ / Alt+←  expand / collapse a subtree
  //   Enter open        Space fold (Alt: subtree) letters  jump by name (800 ms buffer)
  //   Ctrl/⌘+F filter   Esc  close filter, then leave the tree
  //   Alt+\  or  Ctrl+Shift+E (anywhere)  focus the explorer
  import { untrack } from 'svelte';
  import { flip } from 'svelte/animate';
  import { SvelteSet } from 'svelte/reactivity';
  import { app, load, save } from '../core/state.svelte';
  import { mediaUrl, ROMAN } from '../core/tree';
  import { ROW as DESK_ROW, activeKey, ancestors, buildTree, flatten, index, stickyRows, type Row, type TNode } from '../core/explorer';
  import type { Branch, Entry, ListContext, View } from '../core/types';
  import Glyph from './Glyph.svelte';

  let { branches, view, ctx, onnavigate, onsummon, filtering = $bindable(false) }: {
    branches: Branch[]; view: View; ctx: ListContext; onnavigate?: () => void; onsummon?: () => void; filtering?: boolean;
  } = $props();

  // 22 px rows as in VS Code; touch and phone layouts get finger-sized rows
  const ROW = matchMedia('(max-width: 860px), (pointer: coarse)').matches ? 32 : DESK_ROW;

  const roots = untrack(() => buildTree(branches)); // the registry is fixed for the session
  const nodes = index(roots);
  const expanded = new SvelteSet<string>(load<string[]>('cc.explorer.open', roots.map((r) => r.key)).filter((k) => nodes.has(k)));
  $effect(() => save('cc.explorer.open', [...expanded]));

  let q = $state('');
  const rows = $derived(flatten(roots, expanded, filtering ? q.trim() : ''));
  const at = $derived(new Map(rows.map((r, i) => [r.node.key, i])));
  const matchCount = $derived(filtering && q.trim() ? new Set(rows.filter((r) => r.hits && r.node.entry).map((r) => r.node.entry!.id)).size : 0);

  const selectedKey = $derived(activeKey(view, ctx, nodes));
  let focusKey = $state('');
  let focused = $state(false);
  const selIndex = $derived(at.get(selectedKey) ?? -1);
  const focusIndex = $derived(at.get(focusKey) ?? -1);
  const selNode = $derived(nodes.get(selectedKey));
  const selAccent = $derived(selNode?.accent ?? selNode?.parent?.accent ?? 'crimson');

  // VS Code's active indent guide: the focused node if it is an open folder, else its parent
  const guideNode = $derived.by(() => {
    const k = focused && focusKey ? focusKey : selectedKey;
    const i = at.get(k);
    const r = i === undefined ? undefined : rows[i];
    if (!r) return undefined;
    return r.expanded ? r.node : r.node.parent;
  });
  const guideRows = $derived(guideNode ? [at.get(guideNode.key) ?? -1, rows[at.get(guideNode.key) ?? -1]?.last ?? -1] : [-1, -1]);

  let scroller: HTMLElement | undefined = $state();
  let rowsEl: HTMLElement | undefined = $state();
  const FIND_H = 32; // keep in step with .filtering .scroller padding-top
  let scrollTop = $state(0);
  let viewH = $state(400);
  const pinned = $derived(filtering ? [] : stickyRows(rows, at, scrollTop, ROW));

  // rows inserted by a fold cascade in from the row that opened them
  let insertAt = $state(-1);

  /* ── route → tree: reveal the active row (explorer.autoReveal) ── */
  $effect(() => {
    const key = selectedKey;
    untrack(() => {
      const n = nodes.get(key);
      if (!n) return;
      for (const a of ancestors(n)) expanded.add(a.key);
      insertAt = at.get(key) ?? -1;
      if (n.children && n.kind !== 'branch') expanded.add(n.key);
      focusKey = key;
      requestAnimationFrame(() => reveal(key, 'nearest'));
    });
  });

  function reveal(key: string, mode: 'nearest' | 'center' = 'nearest') {
    const i = at.get(key);
    if (i === undefined || !scroller) return;
    // what covers the top of the viewport: the find widget while filtering, else the pinned ancestors
    const stack = filtering ? FIND_H : Math.min(3, nodes.get(key)?.depth ?? 0) * ROW;
    const top = (rowsEl?.offsetTop ?? 0) + i * ROW, view = scroller.clientHeight;
    const cur = scroller.scrollTop;
    let next = cur;
    if (mode === 'center') next = top - view / 2 + ROW / 2;
    else if (top - stack < cur) next = top - stack;
    else if (top + ROW > cur + view) next = top + ROW - view;
    if (next !== cur) scroller.scrollTo({ top: Math.max(0, next), behavior: app.reducedMotion ? 'auto' : 'smooth' });
  }

  function onscroll() {
    if (!scroller) return;
    scrollTop = scroller.scrollTop;
    hideCard();
  }
  $effect(() => {
    if (!scroller) return;
    const ro = new ResizeObserver(() => (viewH = scroller!.clientHeight));
    ro.observe(scroller);
    return () => ro.disconnect();
  });

  /* ── folding ─────────────────────────────────────────── */
  const hasKids = (n: TNode) => !!n.children?.length;

  function setOpen(n: TNode, open: boolean, deep = false) {
    if (!hasKids(n)) return false;
    const was = expanded.has(n.key);
    if (open) { insertAt = at.get(n.key) ?? -1; expanded.add(n.key); } else expanded.delete(n.key);
    if (deep) n.children!.forEach((c) => setOpen(c, open, true));
    return was !== open;
  }
  const toggle = (n: TNode, deep = false) => setOpen(n, !expanded.has(n.key), deep);

  export function collapseAll() {
    for (const k of [...expanded]) if (!roots.some((r) => r.key === k)) expanded.delete(k);
    focusKey = roots[0].key;
    scroller?.scrollTo({ top: 0, behavior: app.reducedMotion ? 'auto' : 'smooth' });
  }
  export function revealActive() {
    const n = nodes.get(selectedKey);
    if (n) for (const a of ancestors(n)) expanded.add(a.key);
    focusKey = selectedKey;
    requestAnimationFrame(() => reveal(selectedKey, 'center'));
    scroller?.focus({ preventScroll: true });
  }

  /* ── opening ─────────────────────────────────────────── */
  const ctxId = (c: ListContext) => `${c.kind}:${c.id}:${c.kind === 'cat' ? (c.leaf ?? '') : ''}`;
  function open(n: TNode, fromClick = false) {
    if (!n.href || n.kind === 'branch') { toggle(n); return; }
    const already = n.key === selectedKey;
    if (fromClick && already && hasKids(n)) { toggle(n); return; }
    if (hasKids(n)) setOpen(n, true);
    // an entry opens inside the list it was picked from, even when the hash does not change
    if (n.ctx && ctxId(n.ctx) !== ctxId(app.ctx)) { app.ctx = n.ctx; app.cls = ''; }
    app.go(n.href);
    if (n.kind !== 'folder') onnavigate?.();
  }

  function onrowclick(ev: MouseEvent, r: Row) {
    if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey) return; // new tab etc.
    ev.preventDefault();
    focusKey = r.node.key;
    scroller?.focus({ preventScroll: true });
    open(r.node, true);
  }
  function ontwist(ev: MouseEvent, r: Row) {
    ev.preventDefault();
    ev.stopPropagation();
    focusKey = r.node.key;
    toggle(r.node, ev.altKey);
  }

  /* ── keyboard ────────────────────────────────────────── */
  let typed = '';
  let typedTimer = 0;

  function focusAt(i: number) {
    const r = rows[Math.max(0, Math.min(rows.length - 1, i))];
    if (!r) return;
    focusKey = r.node.key;
    reveal(r.node.key);
  }

  function onkeydown(ev: KeyboardEvent) {
    const i = focusIndex < 0 ? Math.max(0, selIndex) : focusIndex;
    const r = rows[i];
    const page = Math.max(1, Math.floor(viewH / ROW) - 1);
    let handled = true;
    hideCard();

    if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'f' || ev.key === 'F')) { openFilter(); }
    else if (ev.ctrlKey || ev.metaKey) handled = false;
    else if (ev.key === 'ArrowDown') focusAt(i + 1);
    else if (ev.key === 'ArrowUp') focusAt(i - 1);
    else if (ev.key === 'PageDown') focusAt(i + page);
    else if (ev.key === 'PageUp') focusAt(i - page);
    else if (ev.key === 'Home') focusAt(0);
    else if (ev.key === 'End') focusAt(rows.length - 1);
    else if (ev.key === 'ArrowRight' && r) {
      if (ev.altKey) setOpen(r.node, true, true);
      else if (!setOpen(r.node, true) && r.expanded) focusAt(i + 1);
    } else if (ev.key === 'ArrowLeft' && r) {
      if (ev.altKey) setOpen(r.node, false, true);
      else if (!(r.expanded && setOpen(r.node, false)) && r.node.parent) focusAt(at.get(r.node.parent.key) ?? i);
    } else if (ev.key === 'Enter' && r) open(r.node);
    else if (ev.key === ' ' && r) toggle(r.node, ev.altKey);
    else if (ev.key === 'Escape') {
      if (filtering) closeFilter();
      else { scroller?.blur(); handled = false; } // let it reach the app too, which closes the phone drawer
    } else if (ev.key.length === 1 && ev.key !== '/' && !ev.altKey && /\S/.test(ev.key)) typeNav(ev.key);
    else handled = false;

    if (handled) { ev.preventDefault(); ev.stopPropagation(); }
  }

  // VS Code TypeNavigationController: prefix search over visible rows, buffer cleared after 800 ms idle
  function typeNav(ch: string) {
    clearTimeout(typedTimer);
    typed += ch.toLowerCase();
    typedTimer = window.setTimeout(() => (typed = ''), 800);
    const start = Math.max(0, focusIndex) + (typed.length === 1 ? 1 : 0);
    for (let k = 0; k < rows.length; k++) {
      const r = rows[(start + k) % rows.length];
      if (r.node.label.toLowerCase().startsWith(typed)) { focusAt((start + k) % rows.length); return; }
    }
  }

  function onglobalkey(ev: KeyboardEvent) {
    const combo = (ev.altKey && ev.key === '\\') || ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && (ev.key === 'E' || ev.key === 'e'));
    if (!combo || app.overlayOpen) return;
    ev.preventDefault();
    if (!focusKey) focusKey = selectedKey;
    onsummon?.(); // opens the pane (and the drawer on phones); focus once they render
    requestAnimationFrame(() => requestAnimationFrame(() => {
      scroller?.focus({ preventScroll: true });
      reveal(focusKey);
    }));
  }

  /* ── filter (VS Code find widget, filter mode) ───────── */
  let filterInput: HTMLInputElement | undefined = $state();
  export function openFilter() {
    filtering = true;
    requestAnimationFrame(() => { filterInput?.focus(); filterInput?.select(); });
  }
  function closeFilter() {
    filtering = false;
    q = '';
    requestAnimationFrame(() => { scroller?.focus({ preventScroll: true }); reveal(focusKey || selectedKey, 'center'); });
  }
  function onfilterkey(ev: KeyboardEvent) {
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); closeFilter(); }
    else if (ev.key === 'ArrowDown' || ev.key === 'Enter') {
      ev.preventDefault();
      ev.stopPropagation();
      const first = rows.find((r) => r.hits && r.node.kind === 'entry') ?? rows.find((r) => r.hits);
      if (first) { focusKey = first.node.key; reveal(first.node.key); }
      if (ev.key === 'Enter' && first) open(first.node);
      else scroller?.focus({ preventScroll: true });
    }
  }
  $effect(() => { void q; insertAt = -1; });

  /* ── hover card (entries) ────────────────────────────── */
  let card = $state<{ e: Entry; x: number; y: number } | null>(null);
  let cardTimer = 0;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  function onrowenter(ev: MouseEvent, r: Row) {
    if (!canHover) return;
    if (!r.node.entry) { hideCard(); return; }
    clearTimeout(cardTimer);
    const el = ev.currentTarget as HTMLElement;
    cardTimer = window.setTimeout(() => {
      const box = el.getBoundingClientRect();
      const host = scroller!.getBoundingClientRect();
      const y = Math.min(Math.max(8, box.top - 18), innerHeight - 200);
      card = { e: r.node.entry!, x: host.right + 10, y };
    }, card ? 90 : 520);
  }
  function hideCard() { clearTimeout(cardTimer); card = null; }
  $effect(() => { void app.hash; hideCard(); });

  const metrics = $derived(branches[0].metrics);
  const isTop = (r: Row) => r.node.depth === 0;
</script>

<svelte:window onkeydown={onglobalkey} />

<div class="tree-wrap" class:filtering style:--row="{ROW}px">
  <div class="find" role="search" aria-hidden={!filtering}>
    <Glyph name="filter" size={13} />
    <input
      bind:this={filterInput}
      bind:value={q}
      onkeydown={onfilterkey}
      tabindex={filtering ? 0 : -1}
      placeholder="Filter mounts and folders"
      aria-label="Filter the explorer"
      spellcheck="false"
      autocomplete="off"
    />
    <span class="n mono">{q.trim() ? `${matchCount} ${matchCount === 1 ? 'mount' : 'mounts'}` : ''}</span>
    <button class="x" tabindex={filtering ? 0 : -1} onclick={closeFilter} aria-label="Close filter"><Glyph name="close" size={12} /></button>
  </div>

  <div
    class="scroller"
    bind:this={scroller}
    role="tree"
    aria-label="Compendium"
    tabindex="0"
    aria-activedescendant={focusIndex >= 0 ? rows[focusIndex].node.dom : undefined}
    onscroll={onscroll}
    onkeydown={onkeydown}
    onfocus={() => { focused = true; if (!focusKey) focusKey = selectedKey; }}
    onblur={() => (focused = false)}
    onmouseleave={hideCard}
  >
    <div class="sticky" class:on={pinned.length > 0} aria-hidden="true">
      {#each pinned as p, pi (rows[p.i].node.key)}
        {@const r = rows[p.i]}
        <button class="row pin" class:top={r.node.depth === 0} class:sel={p.i === selIndex} class:last={pi === pinned.length - 1} style:top="{p.y}px" style:--d={r.node.depth} data-accent={r.node.accent}
          tabindex="-1" onclick={() => { focusKey = r.node.key; reveal(r.node.key); scroller?.focus({ preventScroll: true }); }}>
          {@render rowInner(r, true)}
        </button>
      {/each}
    </div>

    <div class="rows" bind:this={rowsEl} style:height="{rows.length * ROW}px">
      <span class="slab" class:on={selIndex >= 0} data-accent={selAccent} style:transform="translateY({selIndex * ROW}px)" aria-hidden="true"></span>
      <span class="focusbox" class:on={focused && focusIndex >= 0} style:transform="translateY({focusIndex * ROW}px)" aria-hidden="true"></span>

      {#each rows as r, i (r.node.key)}
        <div class="r" animate:flip={{ duration: app.reducedMotion ? 0 : 200 }}>
          <svelte:element
            this={r.node.href && r.node.kind !== 'branch' ? 'a' : 'div'}
            class="row"
            class:top={isTop(r)}
            class:sel={i === selIndex}
            class:foc={i === focusIndex}
            id={r.node.dom}
            role="treeitem"
            tabindex="-1"
            href={r.node.kind !== 'branch' ? r.node.href : undefined}
            aria-level={r.node.depth + 1}
            aria-expanded={hasKids(r.node) ? r.expanded : undefined}
            aria-selected={i === selIndex}
            aria-setsize={r.setsize}
            aria-posinset={r.posinset}
            data-accent={r.node.accent ?? r.node.parent?.accent}
            data-cls={r.node.entry?.cls}
            data-kind={r.node.kind}
            style:--d={r.node.depth}
            style:--delay="{insertAt >= 0 ? Math.min(Math.max(0, i - insertAt - 1), 16) * 16 : Math.min(i, 28) * 14}ms"
            onclick={(ev: MouseEvent) => onrowclick(ev, r)}
            onmouseenter={(ev: MouseEvent) => onrowenter(ev, r)}
            onmouseleave={() => { clearTimeout(cardTimer); if (card) cardTimer = window.setTimeout(hideCard, 140); }}
          >
            <span class="guides" aria-hidden="true">
              {#each ancestors(r.node) as a (a.key)}
                <i class:on={guideNode?.key === a.key} data-accent={a.accent} style:--x={a.depth} style:--y={(i - guideRows[0]) * ROW}></i>
              {/each}
            </span>
            {#if hasKids(r.node)}
              <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
              <span class="twistie" class:open={r.expanded} onclick={(ev: MouseEvent) => ontwist(ev, r)} aria-hidden="true"><Glyph name="twist" size={12} /></span>
            {:else}
              <span class="twistie none" aria-hidden="true"></span>
            {/if}
            {@render rowInner(r, false)}
          </svelte:element>
        </div>
      {/each}
    </div>

    {#if filtering && q.trim() && rows.length === 0}
      <p class="empty">No results found.</p>
    {/if}
  </div>

  {#if card}
    {@const e = card.e}
    <div class="card" style:left="{card.x}px" style:top="{card.y}px" data-cls={e.cls} role="tooltip">
      <span class="c-pt"><img src={mediaUrl(e.media.portrait.src)} alt="" /></span>
      <div class="c-tx">
        <p class="c-nm">{e.name}</p>
        <p class="c-mt">{e.kind} · {e.region}</p>
        <p class="c-tr">{e.trait}</p>
        <ol class="c-seals">
          {#each metrics as m}
            {@const t = e.tiers[m.id]?.tier}
            <li class:top={t === 1}><span>{m.label}</span><b>{t ? ROMAN[t] : '—'}</b></li>
          {/each}
        </ol>
      </div>
    </div>
  {/if}
</div>

{#snippet rowInner(r: Row, pin: boolean)}
  {@const n = r.node}
  {#if pin}<span class="twistie open" aria-hidden="true"><Glyph name="twist" size={12} /></span>{/if}
  <span class="icon" aria-hidden="true">
    {#if n.entry}
      <img src={mediaUrl(n.entry.media.portrait.src)} alt="" loading="lazy" decoding="async" />
    {:else if n.glyph}
      <Glyph name={n.glyph} size={n.kind === 'branch' ? 13 : 14} />
    {:else}
      <i class="gem" class:hollow={n.kind === 'lens'}></i>
    {/if}
  </span>
  <span class="label">
    {#if r.hits}{n.label.slice(0, r.hits[0])}<mark>{n.label.slice(r.hits[0], r.hits[1])}</mark>{n.label.slice(r.hits[1])}{:else}{n.label}{/if}
    {#if n.desc}<span class="desc">{n.desc}</span>{/if}
  </span>
  {#if n.rank}
    <span class="rank" class:top={n.rank.top}>{n.rank.text}</span>
  {:else if n.count !== undefined}
    <span class="badge mono">{n.count}</span>
  {/if}
{/snippet}

<style>
  .tree-wrap { position: relative; display: flex; flex-direction: column; flex: 1; min-height: 0; }

  /* ── find widget: slides down from under the pane header (VS Code: top 0.3s) ── */
  .find {
    position: absolute; top: 0; right: 8px; left: 8px; z-index: 6;
    display: flex; align-items: center; gap: 7px;
    height: 28px; padding: 0 6px 0 9px;
    color: var(--ash);
    background: var(--ink-2);
    border: 1px solid var(--line-2);
    border-top: 0;
    border-radius: 0 0 6px 6px;
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.45);
    transform: translateY(-110%);
    transition: transform 300ms var(--ease-out);
  }
  .filtering .find { transform: none; }
  .find:focus-within { border-color: color-mix(in srgb, var(--crimson-hi) 55%, transparent); color: var(--bone-2); }
  .find input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; color: var(--bone); font: inherit; font-size: 12.5px; }
  .find input::placeholder { color: var(--ash); }
  .find .n { font-size: 10px; color: var(--ash); white-space: nowrap; }
  .find .x { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 4px; color: var(--ash); }
  .find .x:hover { color: var(--bone); background: var(--ink-3); }
  .filtering .scroller { padding-top: 32px; }

  /* ── list surface ───────────────────────────────────── */
  .scroller {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    outline: 0;
    padding-bottom: 12px;
    user-select: none;
    scrollbar-width: thin;
    scrollbar-color: var(--ink-4) transparent;
    transition: padding-top 300ms var(--ease-out);
  }
  .rows { position: relative; }
  .r { height: var(--row); }

  .row {
    position: relative;
    display: flex; align-items: center;
    height: var(--row);
    padding-left: calc(6px + var(--d) * 12px);
    padding-right: 10px;
    font-size: 13px;
    color: var(--bone-2);
    cursor: pointer;
    white-space: nowrap;
    animation: row-in 280ms var(--ease-out) both;
    animation-delay: var(--delay, 0ms);
  }
  @keyframes row-in { from { opacity: 0; transform: translateX(-6px); } }
  .row:hover { background: rgba(237, 230, 217, 0.04); color: var(--bone); }
  .row.sel { color: var(--bone); }
  .row.top { font-weight: 700; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; font-variation-settings: 'wdth' 82; }

  /* selection slab glides between rows; focus outline is separate (VS Code: focus ≠ selection) */
  .slab, .focusbox {
    position: absolute; left: 0; right: 0; top: 0; height: var(--row);
    pointer-events: none;
    opacity: 0;
    transition: transform 240ms var(--ease-out), opacity var(--t-micro);
  }
  .slab { background: linear-gradient(90deg, var(--accent-dim), rgba(237, 230, 217, 0.03) 85%); box-shadow: inset 2px 0 0 var(--accent); }
  .slab.on { opacity: 1; }
  .focusbox { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--crimson-hi) 70%, transparent); transition-duration: 110ms; }
  .focusbox.on { opacity: 1; }

  /* ── indent guides: shown on hover; the active one carries flowing sap ── */
  .guides { position: absolute; inset: 0; pointer-events: none; }
  .guides i {
    position: absolute; top: 0; bottom: 0;
    left: calc(6px + var(--x) * 12px + 8px);
    width: 1px;
    background: var(--line-2);
    opacity: 0;
    transition: opacity 100ms linear;
  }
  .scroller:hover .guides i { opacity: 1; }
  .guides i.on {
    opacity: 1;
    background:
      linear-gradient(180deg, transparent, var(--accent) 45%, transparent 90%) 0 calc(var(--y) * -1px) / 1px 110px repeat-y,
      color-mix(in srgb, var(--accent) 38%, transparent);
    animation: sap 2.2s linear infinite;
  }
  @keyframes sap {
    from { background-position: 0 calc(var(--y) * -1px), 0 0; }
    to { background-position: 0 calc(var(--y) * -1px + 110px), 0 0; }
  }

  .twistie {
    position: relative; z-index: 1;
    display: grid; place-items: center;
    flex: none;
    width: 16px; height: var(--row);
    color: var(--ash);
    transition: color var(--t-micro);
  }
  .twistie :global(svg) { transition: transform 150ms var(--ease-out); }
  .twistie.open :global(svg) { transform: rotate(90deg); }
  .row:hover .twistie { color: var(--bone-2); }

  .icon { display: grid; place-items: center; flex: none; width: 18px; height: var(--row); margin-right: 6px; color: var(--accent); }
  .icon img {
    width: 16px; height: 16px; border-radius: 50%; object-fit: cover;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--cls) 60%, transparent);
    transition: transform var(--t-micro) var(--ease-out), box-shadow var(--t-micro);
  }
  .row:hover .icon img { transform: scale(1.18); box-shadow: 0 0 0 1px var(--cls), 0 0 8px color-mix(in srgb, var(--cls) 50%, transparent); }
  .gem { width: 7px; height: 7px; transform: rotate(45deg); background: var(--accent); box-shadow: 0 0 6px var(--accent-dim); transition: transform var(--t-micro) var(--ease-out); }
  .gem.hollow { background: none; border: 1px solid var(--accent); }
  .row:hover .gem, .row.sel .gem { transform: rotate(45deg) scale(1.25); }
  .row.sel .gem { box-shadow: 0 0 10px var(--accent); }

  .label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .desc { margin-left: 6px; font-size: 12px; color: var(--ash); font-family: var(--f-display); font-style: italic; letter-spacing: 0; text-transform: none; font-weight: 400; }
  mark { background: color-mix(in srgb, var(--crimson-hi) 26%, transparent); color: var(--bone); border-radius: 2px; box-shadow: 0 0 0 1px color-mix(in srgb, var(--crimson-hi) 40%, transparent); }

  .badge {
    flex: none;
    min-width: 18px;
    margin-left: 6px;
    padding: 0 5px;
    font-size: 9.5px;
    line-height: 15px;
    text-align: center;
    color: var(--ash);
    background: var(--ink-3);
    border-radius: 8px;
    transition: color var(--t-micro), background var(--t-micro);
  }
  .row.sel .badge { color: var(--bone); background: var(--accent-dim); }
  .rank { flex: none; margin-left: 6px; font-family: var(--f-display); font-weight: 600; font-variation-settings: 'opsz' 8; font-size: 12.5px; color: var(--ash); }
  .rank.top { color: var(--crimson-hi); text-shadow: 0 0 10px rgba(255, 62, 72, 0.55); }

  /* ── sticky scroll ──────────────────────────────────── */
  .sticky { position: sticky; top: 0; z-index: 4; height: 0; }
  .pin {
    position: absolute; left: 0; right: 0;
    width: 100%;
    text-align: left;
    background: var(--ink-1);
    animation: none;
  }
  .pin.sel { box-shadow: inset 2px 0 0 var(--accent); background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 12%, var(--ink-1)), var(--ink-1) 85%); }
  .pin.sel.last { box-shadow: inset 2px 0 0 var(--accent), 0 6px 8px -4px rgba(0, 0, 0, 0.7); }
  .pin.last { box-shadow: 0 6px 8px -4px rgba(0, 0, 0, 0.7); }
  .pin.last::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: var(--line); }

  .empty { padding: 26px 16px; text-align: center; font-size: 12.5px; color: var(--ash); white-space: normal; }

  /* ── hover card ─────────────────────────────────────── */
  .card {
    position: fixed; z-index: 60;
    display: grid; grid-template-columns: 64px 1fr; gap: 12px;
    width: 290px;
    padding: 12px;
    background: var(--ink-2);
    border: 1px solid var(--line-2);
    border-left: 2px solid var(--cls);
    border-radius: 4px;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
    pointer-events: none;
    animation: card-in 180ms var(--ease-out) both;
  }
  @keyframes card-in { from { opacity: 0; transform: translateX(-6px) scale(0.98); } }
  .c-pt { width: 64px; height: 64px; border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 1px var(--cls), 0 0 0 4px var(--ink-2), 0 0 0 5px var(--line-2); }
  .c-pt img { width: 100%; height: 100%; object-fit: cover; }
  .c-tx { min-width: 0; }
  .c-nm { font-weight: 600; font-size: 14px; color: var(--bone); }
  .c-mt { font-size: 11px; color: var(--ash); font-variation-settings: 'wdth' 88; }
  .c-tr { margin-top: 4px; font-size: 12px; line-height: 1.4; color: var(--bone-2); }
  .c-seals { display: flex; gap: 10px; margin-top: 8px; }
  .c-seals li { display: flex; flex-direction: column; align-items: center; }
  .c-seals span { font-size: 8.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ash); }
  .c-seals b { font-family: var(--f-display); font-weight: 600; font-variation-settings: 'opsz' 8; font-size: 15px; color: var(--bone-2); }
  .c-seals .top b { color: var(--crimson-hi); text-shadow: 0 0 10px rgba(255, 62, 72, 0.5); }

  @media (prefers-reduced-motion: reduce) {
    .row, .card { animation: none; }
    .guides i.on { animation: none; }
    .slab, .focusbox, .find, .scroller { transition: none; }
  }
</style>
