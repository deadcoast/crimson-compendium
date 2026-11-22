<script lang="ts">
  // Ambient motion behind a plate: embers (land), bubbles + light shafts (sea), wind (sky),
  // gold dust (gold: slow-falling motes that catch the light as they turn), and abyss light (abyss:
  // violet motes that rise and pulse, while now and then a ring opens on the ground like a Nexus waking),
  // and sift (grain falling through a sieve in a few thin streams, with loose motes drifting past: sorting).
  import { app } from '../core/state.svelte';

  let { mode = 'land' }: { mode?: string } = $props();
  let canvas: HTMLCanvasElement | undefined = $state();

  type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; ph: number; len: number };

  $effect(() => {
    if (!canvas || app.reducedMotion) return;
    const cv = canvas;
    const ctx = cv.getContext('2d')!;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    let w = 0, h = 0, raf = 0, visible = true, t = 0;
    const count = mode === 'sea' ? 38 : mode === 'sky' ? 30 : mode === 'gold' ? 40 : mode === 'abyss' ? 34 : mode === 'sift' ? 64 : 46;
    // sift: the x positions of the sieve's streams, re-drawn on resize
    let streams: number[] = [];
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    const spawn = (initial: boolean): P => {
      if (mode === 'sea') return { x: rnd(0, w), y: initial ? rnd(0, h) : h + 10, vx: 0, vy: -rnd(0.25, 0.9), r: rnd(1, 3.6), a: rnd(0.15, 0.5), ph: rnd(0, 6.28), len: 0 };
      if (mode === 'gold') return { x: rnd(0, w), y: initial ? rnd(0, h) : -rnd(4, 40), vx: rnd(-0.12, 0.12), vy: rnd(0.12, 0.42), r: rnd(0.6, 2.1), a: rnd(0.3, 0.85), ph: rnd(0, 6.28), len: rnd(0.6, 1.6) };
      if (mode === 'abyss') return { x: rnd(0, w), y: initial ? rnd(0, h) : h + 6, vx: rnd(-0.08, 0.08), vy: -rnd(0.12, 0.4), r: rnd(0.6, 1.9), a: rnd(0.25, 0.75), ph: rnd(0, 6.28), len: rnd(0.5, 1.5) };
      if (mode === 'sift') {
        // most grains fall in a stream; a few drift free across the plate
        const free = Math.random() < 0.22;
        const x = free || !streams.length ? rnd(0, w) : streams[Math.floor(rnd(0, streams.length))] + rnd(-6, 6);
        return { x, y: initial ? rnd(0, h) : -rnd(2, 60), vx: free ? rnd(-0.18, 0.18) : 0, vy: free ? rnd(0.15, 0.35) : rnd(0.5, 1.1), r: rnd(0.5, free ? 1.6 : 1.2), a: rnd(0.25, free ? 0.55 : 0.8), ph: rnd(0, 6.28), len: free ? 1 : 0 };
      }
      if (mode === 'sky') return { x: initial ? rnd(-w * 0.2, w) : -rnd(40, 200), y: rnd(0, h), vx: rnd(1.6, 4.2), vy: rnd(-0.15, 0.15), r: rnd(0.6, 1.2), a: rnd(0.08, 0.3), ph: rnd(0, 6.28), len: rnd(40, 160) };
      return { x: rnd(0, w), y: initial ? rnd(h * 0.2, h) : h + 6, vx: rnd(0.05, 0.45), vy: -rnd(0.2, 0.75), r: rnd(0.5, 2), a: rnd(0.35, 0.95), ph: rnd(0, 6.28), len: 0 };
    };

    let ps: P[] = [];
    // abyss rings: each opens from nothing to full width and fades, then reappears somewhere else
    type Ring = { x: number; y: number; t0: number; dur: number; max: number };
    const ring = (now: number, stagger = 0): Ring => ({ x: rnd(w * 0.15, w * 0.85), y: rnd(h * 0.58, h * 0.9), t0: now + stagger, dur: rnd(5200, 8000), max: rnd(90, 170) });
    let rings: Ring[] = [];
    const resize = () => {
      const r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      streams = Array.from({ length: 5 }, (_, i) => w * (0.12 + i * 0.19) + rnd(-w * 0.04, w * 0.04));
      ps = Array.from({ length: count }, () => spawn(true));
      if (mode === 'abyss') rings = [ring(performance.now(), -2600), ring(performance.now(), 1800)];
    };

    const openRings = (now: number) => {
      for (let i = 0; i < rings.length; i++) {
        const g = rings[i];
        const k = (now - g.t0) / g.dur;
        if (k < 0) continue;
        if (k >= 1) { rings[i] = ring(now, rnd(800, 3200)); continue; }
        const ease = 1 - Math.pow(1 - k, 3);
        const rx = g.max * ease;
        const fade = Math.sin(Math.PI * k);
        ctx.lineWidth = 1;
        for (const [scale, alpha] of [[1, 0.32], [0.62, 0.18]] as const) {
          ctx.strokeStyle = `rgba(172,142,244,${alpha * fade})`;
          ctx.beginPath(); ctx.ellipse(g.x, g.y, rx * scale, rx * scale * 0.26, 0, 0, 6.283); ctx.stroke();
        }
      }
    };

    const shafts = () => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const sway = Math.sin(t * 0.0004 + i * 1.7) * 40;
        const x0 = w * (0.18 + i * 0.22) + sway;
        const g = ctx.createLinearGradient(x0, 0, x0 + 120, h);
        g.addColorStop(0, 'rgba(150,220,235,0.10)');
        g.addColorStop(1, 'rgba(150,220,235,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0 - 30, 0); ctx.lineTo(x0 + 40, 0); ctx.lineTo(x0 + 220, h); ctx.lineTo(x0 + 60, h);
        ctx.fill();
      }
      ctx.restore();
    };

    const frame = (now: number) => {
      t = now;
      ctx.clearRect(0, 0, w, h);
      if (mode === 'sea') shafts();
      ctx.globalCompositeOperation = 'lighter';
      if (mode === 'abyss') openRings(now);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.ph += 0.03;
        if (mode === 'sea') {
          p.x += Math.sin(p.ph) * 0.35; p.y += p.vy;
          ctx.strokeStyle = `rgba(190,235,245,${p.a})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.stroke();
          if (p.y < -10) ps[i] = spawn(false);
        } else if (mode === 'gold') {
          // a flake turning in still air: drifts on a slow sine, flashes when its face catches the light
          p.x += p.vx + Math.sin(p.ph * 0.4) * 0.3; p.y += p.vy;
          const turn = Math.abs(Math.sin(p.ph * p.len));
          const glint = turn > 0.96 ? 1 : 0.35 + turn * 0.4;
          ctx.fillStyle = `rgba(255,${196 + Math.round(turn * 40)},${96 + Math.round(turn * 70)},${p.a * glint})`;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, Math.max(0.3, p.r * turn), p.ph * 0.2, 0, 6.283); ctx.fill();
          if (p.y > h + 8) ps[i] = spawn(false);
        } else if (mode === 'abyss') {
          // a mote of abyss light: rises slowly, breathes brighter and dimmer, with a soft halo
          p.x += p.vx + Math.sin(p.ph * 0.5) * 0.15; p.y += p.vy;
          const pulse = 0.35 + 0.65 * Math.abs(Math.sin(p.ph * p.len * 0.6));
          ctx.fillStyle = `rgba(150,120,240,${p.a * pulse * 0.14})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.4, 0, 6.283); ctx.fill();
          ctx.fillStyle = `rgba(214,200,255,${p.a * pulse})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
          if (p.y < -8) ps[i] = spawn(false);
        } else if (mode === 'sift') {
          // a grain: streams fall straight and speed up a little; loose motes wander; all fade near the floor
          if (p.len) { p.x += p.vx + Math.sin(p.ph * 0.4) * 0.12; p.y += p.vy; }
          else { p.vy = Math.min(p.vy * 1.004, 2.2); p.y += p.vy; }
          const floor = Math.max(0, Math.min(1, (h - p.y) / (h * 0.25)));
          const moss = p.ph % 6.28 > 5.6;
          ctx.fillStyle = moss ? `rgba(196,226,140,${p.a * floor})` : `rgba(236,222,190,${p.a * floor * 0.85})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
          if (p.y > h + 4) ps[i] = spawn(false);
        } else if (mode === 'sky') {
          p.x += p.vx; p.y += p.vy + Math.sin(p.ph * 0.5) * 0.2;
          const g = ctx.createLinearGradient(p.x - p.len, p.y, p.x, p.y);
          g.addColorStop(0, 'rgba(220,228,255,0)');
          g.addColorStop(1, `rgba(220,228,255,${p.a})`);
          ctx.strokeStyle = g; ctx.lineWidth = p.r;
          ctx.beginPath(); ctx.moveTo(p.x - p.len, p.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          if (p.x - p.len > w) ps[i] = spawn(false);
        } else {
          p.x += p.vx + Math.sin(p.ph) * 0.25; p.y += p.vy;
          const flick = 0.55 + Math.sin(p.ph * 3) * 0.45;
          ctx.fillStyle = `rgba(255,${120 + Math.round(p.r * 40)},${60 + Math.round(p.r * 20)},${p.a * flick})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
          if (p.y < -8 || p.x > w + 8) ps[i] = spawn(false);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      if (visible) raf = requestAnimationFrame(frame);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !document.hidden;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(frame);
    });
    io.observe(cv);
    const onVis = () => { visible = !document.hidden; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(frame); };
    document.addEventListener('visibilitychange', onVis);
    resize();
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  });
</script>

<canvas bind:this={canvas} class="particles" aria-hidden="true"></canvas>

<style>
  .particles { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; mix-blend-mode: screen; }
</style>
