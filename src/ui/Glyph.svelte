<script lang="ts">
  // One drawing system for every icon: 24-unit grid, 1.5 stroke, square caps.
  let { name, size = 16, title = '' }: { name: string; size?: number; title?: string } = $props();

  const P: Record<string, string> = {
    land: 'M2 19 9 8l4 6 3-4 6 9Z M9 8l1.6 2.6',
    sea: 'M2 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2 M2 14c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2 M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2',
    sky: 'M3 15c3-1 5-4 7-8 1 3 3 5 5 6 2-2 4-3 6-3-2 3-5 6-9 7-4 1-7 0-9-2Z',
    search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z M15.5 15.5 21 21',
    left: 'M15 5 8 12l7 7',
    right: 'M9 5l7 7-7 7',
    close: 'M6 6l12 12M18 6 6 18',
    diamond: 'M12 3 21 12 12 21 3 12Z',
    compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M15.5 8.5 13.4 13.4 8.5 15.5l2.1-4.9Z',
    expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
    link: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    ladder: 'M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10',
    lens: 'M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
    map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2Z M9 4v14M15 6v14',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 11v6M12 7.5v.5',
    book: 'M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2Z M4 21V5',
    menu: 'M4 7h16M4 12h16M4 17h10',
    twist: 'M9.5 6.5 15 12l-5.5 5.5',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z M12 2.5V6M12 18v3.5M2.5 12H6M18 12h3.5M5.3 5.3l2.5 2.5M16.2 16.2l2.5 2.5M5.3 18.7l2.5-2.5M16.2 7.8l2.5-2.5',
    egg: 'M12 21c-3.9 0-7-2.9-7-7 0-4.8 3.2-11 7-11s7 6.2 7 11c0 4.1-3.1 7-7 7Z M8 12.5l2.2-1.6 1.8 1.6 1.8-1.6 2.2 1.6',
    collapse: 'M9 9h11v11H9Z M5 15V4h11 M12 14.5h5',
    filter: 'M4 5h16l-6 7.5V19l-4 1.5v-8Z',
    target: 'M12 19.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3.5 2',
    outline: 'M5 5h14M9 10h10M9 15h10M5 20h14M5 10v5',
    route: 'M5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M19 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M7 18h8.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H17',
    management: 'M5 3h12l2 2v16H5Z M9 3v18 M12 8h4 M12 12h4 M12 16h4',
    player: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11 M11 10V4a1.5 1.5 0 0 1 3 0v6 M14 10V5a1.5 1.5 0 0 1 3 0v7 M8 12.5 6.6 11a1.6 1.6 0 0 0-2.3 2.2L8 18c1.3 1.8 3 3 5.5 3h.5a4 4 0 0 0 4-4v-5',
    coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z',
    warn: 'M12 3 22 20H2Z M12 9.5v5 M12 17v.5',
    stack: 'M4 8l8-4 8 4-8 4Z M4 12l8 4 8-4 M4 16l8 4 8-4',
  };
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="square"
  stroke-linejoin="miter"
  aria-hidden={title ? undefined : 'true'}
  role={title ? 'img' : undefined}
>
  {#if title}<title>{title}</title>{/if}
  <path d={P[name] ?? P.diamond} />
</svg>

<style>
  svg { flex: none; display: block; }
</style>
