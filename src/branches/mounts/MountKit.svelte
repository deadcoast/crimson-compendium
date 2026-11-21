<script lang="ts">
  // MOUNT-branch plate section: what the mount carries (trade-goods slots, hold, cargo) and what it
  // wears (tack, saddles, parts, fittings), where to buy it and how to keep the mount fed.
  // Reads the plate's `kit` — a profile id from kits.json, or { profile, carry, carryLabel, note }.
  import { reveal } from '../../core/motion';
  import { PUBLISHERS } from '../../core/format';
  import Glyph from '../../ui/Glyph.svelte';
  import KITS from './kits.json';
  import type { Branch, Entry } from '../../core/types';

  type Line = { text: string; by: string };
  type Item = { name: string; note?: string };
  type Slot = { slot: string; raises: string; early?: string; best?: string; value?: string; items?: Item[]; by: string };
  type Seller = { name: string; where: string; stock: string };
  type Kit = {
    title: string;
    menu: string;
    carry: { slots: number | null | 'stats'; label: string; lines: Line[] };
    slots: Slot[];
    sellers: Seller[];
    care: { item: string; does: string }[];
    notes: string[];
    sources: { by: string; url: string; title: string }[];
  };
  type Ref = string | { profile: string; carry?: number; carryLabel?: string; note?: string };

  let { entry }: { entry: Entry; branch: Branch } = $props();

  const PROFILES = KITS.profiles as unknown as Record<string, Kit>;
  const ref = $derived(entry.kit as Ref | undefined);
  const kit = $derived(ref ? PROFILES[typeof ref === 'string' ? ref : ref.profile] : undefined);
  const own = $derived(typeof ref === 'object' ? ref : undefined);

  // a ship's hold is its recorded Inventory stat; a horse's slot count can differ by breed
  const slots = $derived.by((): number | null => {
    if (!kit) return null;
    if (own?.carry !== undefined) return own.carry;
    if (kit.carry.slots === 'stats') return ((entry.stats as { values?: (number | null)[] } | undefined)?.values?.[1] ?? null) as number | null;
    return kit.carry.slots;
  });
  const label = $derived(own?.carryLabel ?? kit?.carry.label ?? '');
  const by = (id: string) => PUBLISHERS[id] ?? id;
  // the section's sources, one name per publisher; a publisher cited for several pages gets numbered links
  const publishers = $derived.by(() => {
    const groups = new Map<string, { by: string; url: string; title: string }[]>();
    for (const s of kit?.sources ?? []) {
      const g = groups.get(s.by) ?? [];
      if (!g.some((x) => x.url === s.url)) g.push(s);
      groups.set(s.by, g);
    }
    return [...groups.values()];
  });
</script>

{#if kit}
  <section class="kit" data-outline="Inventory" use:reveal>
    <header class="sec-head">
      <span class="eyebrow">What it carries · what it wears</span>
      <h3 class="display">Inventory</h3>
    </header>

    <div class="carry" class:none={slots === null}>
      <div class="hold">
        <span class="num display">{slots ?? '—'}</span>
        <span class="lbl">{slots === 1 ? label : label.replace(/slot$/, 'slots')}</span>
      </div>
      <ul class="lines">
        {#each kit.carry.lines as l, i}
          <li style:--i={i}>{l.text}<span class="by">{by(l.by)}</span></li>
        {/each}
      </ul>
    </div>

    {#if own?.note}
      <p class="own"><Glyph name="diamond" size={10} /> {own.note}</p>
    {/if}

    {#if kit.slots.length}
      <div class="block">
        <p class="eyebrow">Equipment · {kit.title}</p>
        <ol class="slots" style:--n={Math.min(kit.slots.length, 3)}>
          {#each kit.slots as s, i (s.slot)}
            <li style:--i={i}>
              <span class="idx mono">{String(i + 1).padStart(2, '0')}</span>
              <span class="slot display">{s.slot}</span>
              <span class="raises">{s.raises}</span>
              {#if s.best}
                <p class="best"><span class="k">Best</span><span class="v">{s.best}</span>{#if s.value}<span class="val">{s.value}</span>{/if}</p>
              {/if}
              {#if s.early}
                <p class="early"><span class="k">Early</span><span class="v">{s.early}</span></p>
              {/if}
              {#if s.items?.length}
                <ul class="items">
                  {#each s.items as it}<li>{it.name}{#if it.note}<span>{it.note}</span>{/if}</li>{/each}
                </ul>
              {/if}
              <span class="by">{by(s.by)}</span>
            </li>
          {/each}
        </ol>
      </div>
    {:else}
      <p class="bare">{kit.title}</p>
    {/if}

    {#if kit.sellers.length}
      <div class="block">
        <p class="eyebrow">Where to get it</p>
        <dl class="sellers">
          {#each kit.sellers as s}
            <div>
              <dt>{s.name}<span>{s.where}</span></dt>
              <dd>{s.stock}</dd>
            </div>
          {/each}
        </dl>
      </div>
    {/if}

    {#if kit.care.length}
      <div class="block">
        <p class="eyebrow">Feeding and healing</p>
        <ul class="care">
          {#each kit.care as c}<li><span class="it">{c.item}</span><span class="does">{c.does}</span></li>{/each}
        </ul>
      </div>
    {/if}

    {#if kit.notes.length}
      <ul class="notes">
        {#each kit.notes as n}<li>{n}</li>{/each}
      </ul>
    {/if}

    <footer class="foot">
      {#if kit.menu}<p class="menu"><Glyph name="stack" size={12} /> {kit.menu}</p>{/if}
      <p class="src mono">
        Inventory ·
        {#each publishers as g, i}<a href={g[0].url} target="_blank" rel="noopener" title={g[0].title}>{by(g[0].by)}</a>{#each g.slice(1) as s, j}<a class="n" href={s.url} target="_blank" rel="noopener" title={s.title}>{j + 2}</a>{/each}{i < publishers.length - 1 ? ' · ' : ''}{/each}
      </p>
    </footer>
  </section>
{/if}

<style>
  .kit { padding: 0 var(--gutter); }
  .sec-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
  .sec-head .eyebrow { font-size: 10px; }
  .sec-head h3 { font-size: 40px; }
  @keyframes up { from { opacity: 0; transform: translateY(10px); } }

  /* carry: the slot count as a figure, the rules that govern it beside */
  .carry { display: grid; grid-template-columns: minmax(150px, 0.32fr) minmax(0, 1fr); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .hold { display: flex; flex-direction: column; justify-content: center; gap: 8px; padding: 18px 20px 18px 0; border-right: 1px solid var(--line); }
  .num { font-size: 64px; line-height: 0.9; font-weight: 600; font-variation-settings: 'opsz' 8; font-variant-numeric: lining-nums tabular-nums; color: var(--accent); }
  .none .num { color: var(--ash-2); }
  .lbl { font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--bone-2); }
  .lines { display: flex; flex-direction: column; padding: 8px 0 8px 20px; }
  .lines li { position: relative; padding: 8px 0 8px 16px; font-size: 13.5px; line-height: 1.5; color: var(--bone-2); animation: up 520ms var(--ease-out) both; animation-delay: calc(var(--i) * 60ms); }
  .lines li + li { border-top: 1px solid var(--line); }
  .lines li::before { content: ''; position: absolute; left: 0; top: 15px; width: 5px; height: 5px; transform: rotate(45deg); border: 1px solid var(--accent); }
  .by { margin-left: 8px; font-size: 10.5px; letter-spacing: 0.04em; color: var(--ash); white-space: nowrap; }

  .own { display: flex; align-items: baseline; gap: 10px; margin-top: 14px; padding: 12px 16px; font-size: 14px; line-height: 1.5; color: var(--bone); border-left: 2px solid var(--accent); background: linear-gradient(90deg, var(--accent-dim), transparent 80%); }
  .own :global(svg) { flex: none; color: var(--accent); }

  .block { margin-top: 26px; }
  .block > .eyebrow { font-size: 10px; margin-bottom: 12px; }

  /* equipment: one card per slot, numbered like an inventory grid */
  .slots { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 10px; }
  .slots > li {
    position: relative; display: flex; flex-direction: column; gap: 6px; min-width: 0;
    padding: 14px 16px 12px; border: 1px solid var(--line-2); background: var(--ink-1);
    box-shadow: inset 0 2px 0 color-mix(in srgb, var(--accent) 55%, transparent);
    animation: up 560ms var(--ease-out) both; animation-delay: calc(var(--i) * 70ms);
  }
  .idx { position: absolute; top: 12px; right: 14px; font-size: 10.5px; color: var(--ash); }
  .slot { font-size: 22px; line-height: 1.1; color: var(--bone); padding-right: 26px; }
  .raises { font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); }
  .best, .early { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; font-size: 13.5px; line-height: 1.45; }
  .best { margin-top: 4px; }
  .k { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ash); min-width: 38px; }
  .best .v { color: var(--bone); }
  .val { font-variant-numeric: lining-nums tabular-nums; color: var(--accent); }
  .early .v { color: var(--bone-2); }
  .items { display: flex; flex-direction: column; gap: 5px; margin-top: 4px; }
  .items li { display: flex; flex-direction: column; padding: 5px 9px; font-size: 13px; color: var(--bone); border: 1px solid var(--line); border-radius: 3px; }
  .items li span { font-size: 11.5px; color: var(--ash); }
  .slots .by { margin: auto 0 0; padding-top: 6px; }
  .bare { margin-top: 18px; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ash); }

  .sellers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 24px; margin: 0; border-top: 1px solid var(--line); }
  .sellers div { display: flex; flex-direction: column; gap: 3px; padding: 10px 0 11px; border-bottom: 1px solid var(--line); }
  .sellers dt { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-size: 14px; color: var(--bone); }
  .sellers dt span { font-size: 11.5px; color: var(--ash); }
  .sellers dd { margin: 0; font-size: 13px; line-height: 1.45; color: var(--bone-2); }

  .care { display: flex; flex-wrap: wrap; gap: 8px; }
  .care li { display: inline-flex; flex-direction: column; gap: 2px; padding: 7px 12px; border: 1px solid var(--line-2); border-radius: 3px; max-width: 280px; }
  .care .it { font-size: 13.5px; color: var(--bone); }
  .care .does { font-size: 12px; line-height: 1.4; color: var(--ash); }

  .notes { display: flex; flex-direction: column; gap: 8px; margin-top: 22px; }
  .notes li { position: relative; padding-left: 16px; font-size: 13.5px; line-height: 1.55; color: var(--bone-2); }
  .notes li::before { content: ''; position: absolute; left: 0; top: 9px; width: 6px; height: 1px; background: var(--accent); }

  .foot { margin-top: 18px; display: flex; flex-direction: column; gap: 6px; }
  .menu { display: flex; align-items: baseline; gap: 8px; font-size: 12.5px; line-height: 1.5; color: var(--bone-2); }
  .menu :global(svg) { flex: none; color: var(--accent); transform: translateY(2px); }
  .src { font-size: 10.5px; line-height: 1.6; color: var(--ash); }
  .src a { color: var(--ash); border-bottom: 1px solid var(--line-2); }
  .src a:hover { color: var(--bone); border-color: var(--accent); }
  .src a.n { margin-left: 4px; font-size: 9.5px; vertical-align: super; border-bottom: 0; }

  @media (max-width: 900px) {
    .slots { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 720px) {
    .carry { grid-template-columns: minmax(0, 1fr); }
    .hold { flex-direction: row; align-items: baseline; gap: 14px; padding: 14px 0; border-right: 0; border-bottom: 1px solid var(--line); }
    .lines { padding-left: 0; }
    .slots, .sellers { grid-template-columns: minmax(0, 1fr); }
  }
</style>
