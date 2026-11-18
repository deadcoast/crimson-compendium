<script lang="ts">
  // Ambient terrain motion behind a plate: embers (land), bubbles + light shafts (sea), wind (sky).
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
    const count = mode === 'sea' ? 38 : mode === 'sky' ? 30 : 46;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    const spawn = (initial: boolean): P => {
      if (mode === 'sea') return { x: rnd(0, w), y: initial ? rnd(0, h) : h + 10, vx: 0, vy: -rnd(0.25, 0.9), r: rnd(1, 3.6), a: rnd(0.15, 0.5), ph: rnd(0, 6.28), len: 0 };
      if (mode === 'sky') return { x: initial ? rnd(-w * 0.2, w) : -rnd(40, 200), y: rnd(0, h), vx: rnd(1.6, 4.2), vy: rnd(-0.15, 0.15), r: rnd(0.6, 1.2), a: rnd(0.08, 0.3), ph: rnd(0, 6.28), len: rnd(40, 160) };
      return { x: rnd(0, w), y: initial ? rnd(h * 0.2, h) : h + 6, vx: rnd(0.05, 0.45), vy: -rnd(0.2, 0.75), r: rnd(0.5, 2), a: rnd(0.35, 0.95), ph: rnd(0, 6.28), len: 0 };
    };

    let ps: P[] = [];
    const resize = () => {
      const r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ps = Array.from({ length: count }, () => spawn(true));
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
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.ph += 0.03;
        if (mode === 'sea') {
          p.x += Math.sin(p.ph) * 0.35; p.y += p.vy;
          ctx.strokeStyle = `rgba(190,235,245,${p.a})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.stroke();
          if (p.y < -10) ps[i] = spawn(false);
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
