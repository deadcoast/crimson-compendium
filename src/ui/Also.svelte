<script lang="ts">
  // Plates in other branches tied to this one (core/tree.ts crossLinks): the plate this one is about,
  // the plates it points at, and the plates elsewhere that are about it or point at it. Each card leads
  // with the other plate's image and names its branch in that branch's own accent, so a jump between
  // trees reads as one.
  import { reveal } from '../core/motion';
  import { crossLinks, href, mediaUrl } from '../core/tree';
  import type { Branch, CrossLink, Entry } from '../core/types';
  import Glyph from './Glyph.svelte';

  let { entry, branch }: { entry: Entry; branch: Branch } = $props();

  const links = $derived(crossLinks(branch, entry));
  const REL: Record<CrossLink['rel'], string> = { base: 'Full plate', source: 'Listed in', also: 'See also', cited: 'Cited in' };
  const leafOf = (l: CrossLink) => l.branch.leaves.find((x) => x.id === l.entry.leaf);
  // the other branch's tier list (Riches' Potential, QOL's Priority) names where the plate sits there
  const tierOf = (l: CrossLink) =>
    l.branch.categories.filter((c) => c.tierList).flatMap((c) => c.leaves.filter((x) => x.entries.includes(l.entry)))[0];
</script>

{#if links.length}
  <section class="also" data-outline="Elsewhere" use:reveal>
    <p class="eyebrow">Elsewhere in the compendium</p>
    <ul>
      {#each links as l, i (l.branch.id + l.entry.id)}
        {@const img = l.entry.media.hero ?? l.entry.media.portrait}
        {@const tier = tierOf(l)}
        <li style:--i={i}>
          <a href={href.entry(l.branch, l.entry.id)} data-accent={l.branch.accent ?? 'crimson'}>
            <span class="img"><img src={mediaUrl(img.src)} alt="" loading="lazy" style:object-position={l.entry.media.hero?.focus ?? '50% 45%'} /></span>
            <span class="txt">
              <span class="rel">{REL[l.rel]} <i>·</i> <b>{l.branch.title}</b></span>
              <span class="nm display">{l.entry.name}</span>
              <span class="meta">
                {#if tier}<span class="tier" data-accent={tier.accent}>{tier.label}</span>{/if}
                <span>{leafOf(l)?.label ?? ''}</span>
              </span>
            </span>
            <Glyph name="right" size={14} />
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .also { padding: 0 var(--gutter); }
  .also > .eyebrow { margin-bottom: 12px; }
  ul { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); gap: 10px; }
  li { animation: up 560ms var(--ease-out) both; animation-delay: calc(var(--i) * 80ms); }
  a {
    position: relative;
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    min-height: 84px;
    padding-right: 16px;
    border: 1px solid var(--line-2);
    background: var(--ink-1);
    overflow: hidden;
    transition: border-color var(--t-micro), background var(--t-micro);
  }
  a::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 2px; background: var(--accent); }
  a:hover { border-color: var(--accent); background: linear-gradient(90deg, var(--accent-dim), var(--ink-1) 70%); }
  .img { align-self: stretch; overflow: hidden; }
  .img img { width: 100%; height: 100%; object-fit: cover; filter: saturate(0.8); transition: transform 600ms var(--ease-out), filter var(--t-ui); }
  a:hover .img img { transform: scale(1.06); filter: none; }
  .txt { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 12px 0; }
  .rel { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ash); }
  .rel i { font-style: normal; color: var(--ash-2); margin: 0 4px; }
  .rel b { font-weight: 600; color: var(--accent); white-space: nowrap; }
  .nm { font-size: 22px; line-height: 1.1; color: var(--bone); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta { display: flex; gap: 8px; align-items: center; font-size: 12px; color: var(--bone-2); }
  .tier { padding: 1px 7px; border: 1px solid var(--accent); color: var(--accent); font-size: 10.5px; letter-spacing: 0.06em; }
  a > :global(svg) { color: var(--ash); transition: transform var(--t-micro) var(--ease-out), color var(--t-micro); }
  a:hover > :global(svg) { transform: translateX(3px); color: var(--accent); }
  @keyframes up { from { opacity: 0; transform: translateY(10px); } }
</style>
