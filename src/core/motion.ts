// Shared motion: Svelte actions and tweens used across every branch.
import type { Action } from 'svelte/action';

/** Adds `.in` once the element scrolls into view (scroll root = nearest scroller). */
export const reveal: Action<HTMLElement, { delay?: number } | undefined> = (node, opts) => {
  node.classList.add('reveal');
  if (opts?.delay) node.style.setProperty('--reveal-delay', `${opts.delay}ms`);
  const io = new IntersectionObserver(
    (list) => {
      for (const e of list) if (e.isIntersecting) { node.classList.add('in'); io.disconnect(); }
    },
    { threshold: 0.12 },
  );
  io.observe(node);
  return { destroy: () => io.disconnect() };
};

/** Pointer parallax: writes --px/--py (−1…1) on the node for CSS to consume. */
export const parallax: Action<HTMLElement> = (node) => {
  let raf = 0;
  const move = (ev: PointerEvent) => {
    const r = node.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    const y = ((ev.clientY - r.top) / r.height) * 2 - 1;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      node.style.setProperty('--px', x.toFixed(3));
      node.style.setProperty('--py', y.toFixed(3));
    });
  };
  const leave = () => { node.style.setProperty('--px', '0'); node.style.setProperty('--py', '0'); };
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerleave', leave);
  return { destroy: () => { node.removeEventListener('pointermove', move); node.removeEventListener('pointerleave', leave); } };
};

/** Count a number up from its previous value; returns a setter-driven animation. */
export function tween(from: number, to: number, ms: number, onFrame: (v: number) => void) {
  const start = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 4);
    onFrame(from + (to - from) * eased);
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/** Run `fn` now, after web fonts finish loading, and whenever `el` resizes — for anything measured from text. */
export function onLayout(el: HTMLElement | undefined, fn: () => void): () => void {
  if (!el) return () => {};
  let live = true;
  const run = () => live && requestAnimationFrame(fn);
  run();
  document.fonts?.ready.then(run);
  const ro = new ResizeObserver(run);
  ro.observe(el);
  return () => { live = false; ro.disconnect(); };
}
