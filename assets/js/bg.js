/* Ambient background: an X-shaped light burst at the heart of the void, with god-rays,
   a vortex of glass shards spiralling out of it, rotating HUD ring segments, crackling
   energy along the X, and drifting embers. Fixed behind every page; never stops moving. */
(() => {
  const c = document.getElementById('bg');
  if (!c) return;
  const x = c.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 700px)').matches;
  // phones / touch / low-core devices get a lighter version: lower resolution, fewer particles, 30fps, no CSS blur
  const LITE = matchMedia('(hover: none), (pointer: coarse), (max-width: 820px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  document.documentElement.classList.toggle('lite', LITE);
  const TAU = Math.PI * 2;
  let W, H, D, R, cx, cy, shards = [], embers = [], rings = [], bolts = [];
  let rot = 0, spin = 0, last = performance.now(), lastY = scrollY;
  const mouse = { x: .5, y: .5, tx: .5, ty: .5 };

  function size() {
    D = LITE ? .28 : .5; // low resolution = soft and cheap; on desktop the CSS blur finishes it
    // 40px bleed on every side so the CSS blur never shows a soft edge
    W = c.width = (innerWidth + 80) * D; H = c.height = (innerHeight + 80) * D;
    c.style.width = innerWidth + 80 + 'px'; c.style.height = innerHeight + 80 + 'px';
    R = Math.hypot(W, H) * .6;
    rings = [
      { r: .30, w: 26, seg: 9,  fill: .55, sp: .05,  a: .07 },
      { r: .44, w: 46, seg: 7,  fill: .45, sp: -.035, a: .06 },
      { r: .60, w: 70, seg: 11, fill: .4,  sp: .022, a: .05 },
      { r: .78, w: 18, seg: 26, fill: .3,  sp: -.015, a: .05 }
    ].map(o => ({ ...o, off: Math.random() * TAU }));
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function shard(init) {
    return {
      a: Math.random() * TAU,                    // angle around the core
      d: init ? rnd(.02, 1) : rnd(.0, .06),      // normalised distance from core
      v: rnd(.0009, .0034),                       // outward speed
      w: rnd(.25, .9),                            // swirl speed
      s: rnd(4, 15),                              // size
      rot: Math.random() * TAU, vr: rnd(-.04, .04),
      k: [rnd(.6, 1), rnd(.5, 1), rnd(.4, .9)],   // triangle shape
      lit: Math.random() < .3
    };
  }
  function ember(init) { return { x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: rnd(.5, 1.8) * D, vy: -rnd(.15, .6) * D, ph: Math.random() * TAU, a: rnd(.2, .8) }; }
  function init() {
    size();
    shards = Array.from({ length: LITE ? 34 : 140 }, () => shard(true));
    embers = Array.from({ length: LITE ? 16 : 70 }, () => ember(true));
  }
  // on phones the address bar hiding fires resize constantly while scrolling; only rebuild on real width changes
  let lastW = innerWidth;
  addEventListener('resize', () => { if (LITE && innerWidth === lastW) return; lastW = innerWidth; size(); });
  addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth; mouse.ty = e.clientY / innerHeight; }, { passive: true });
  addEventListener('scroll', () => { spin += (scrollY - lastY) * .00035; lastY = scrollY; }, { passive: true });

  // a long glowing wedge from the core, used for god-rays and the X streaks
  function ray(ang, len, half, col, alpha) {
    const g = x.createLinearGradient(cx, cy, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    g.addColorStop(0, `rgba(${col},${alpha})`); g.addColorStop(.35, `rgba(${col},${alpha * .45})`); g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g;
    x.beginPath(); x.moveTo(cx, cy);
    x.lineTo(cx + Math.cos(ang - half) * len, cy + Math.sin(ang - half) * len);
    x.lineTo(cx + Math.cos(ang + half) * len, cy + Math.sin(ang + half) * len);
    x.closePath(); x.fill();
  }
  function bolt(ang) {
    const pts = [], n = 9, len = rnd(.18, .42) * R;
    for (let i = 0; i <= n; i++) {
      const t = i / n, j = (Math.random() - .5) * 26 * D * Math.sin(t * Math.PI);
      pts.push([Math.cos(ang) * len * t - Math.sin(ang) * j, Math.sin(ang) * len * t + Math.cos(ang) * j]);
    }
    return { pts, life: 1 };
  }

  function frame(now) {
    // lite: cap at ~30fps (motion speed stays the same because everything scales by dt)
    if (LITE && now - last < 31) { if (!reduce) requestAnimationFrame(frame); return; }
    const dt = Math.min(now - last, 66) / 16.67; last = now;
    mouse.x += (mouse.tx - mouse.x) * .04; mouse.y += (mouse.ty - mouse.y) * .04;
    spin *= .94;
    rot += (.0012 + spin) * dt;
    const t = now * .001;
    cx = W * (.5 + (mouse.x - .5) * .06 + Math.sin(t * .13) * .03);
    cy = H * (.46 + (mouse.y - .5) * .06 + Math.cos(t * .11) * .03);
    const pulse = .85 + .15 * Math.sin(t * 1.7);

    x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#050506'; x.fillRect(0, 0, W, H);

    // nebula wash: violet left, crimson right
    let g = x.createRadialGradient(cx - W * .25, cy, 0, cx - W * .25, cy, R * .9);
    g.addColorStop(0, 'rgba(70,40,110,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    g = x.createRadialGradient(cx + W * .25, cy, 0, cx + W * .25, cy, R * .9);
    g.addColorStop(0, 'rgba(130,16,40,.38)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    x.globalCompositeOperation = 'lighter';

    // HUD ring segments
    rings.forEach(o => {
      o.off += o.sp * .01 * dt + spin * .3;
      const rr = Math.min(W, H) * o.r * 1.15, step = TAU / o.seg;
      x.lineWidth = o.w * D; x.strokeStyle = `rgba(120,100,150,${o.a * .8})`;
      for (let i = 0; i < o.seg; i++) {
        const a0 = o.off + i * step;
        x.beginPath(); x.arc(cx, cy, rr, a0, a0 + step * o.fill); x.stroke();
      }
    });

    // god-rays
    for (let i = 0; i < 18; i++) {
      const a = rot * (i % 2 ? 1.3 : -.8) + i * (TAU / 18);
      const fl = .5 + .5 * Math.sin(t * (1 + i * .13) + i);
      ray(a, R, .018 + (i % 3) * .01, i % 3 ? '150,40,80' : '90,60,140', .035 * fl);
    }

    // the X: two crossing streaks of hot light
    for (let i = 0; i < 4; i++) {
      const a = rot * .6 + Math.PI / 4 + i * Math.PI / 2;
      ray(a, R * 1.1, .055, '170,30,70', .1 * pulse);
      ray(a, R * .9, .016, '200,80,120', .12 * pulse);
    }

    // core glow
    g = x.createRadialGradient(cx, cy, 0, cx, cy, 260 * D);
    g.addColorStop(0, `rgba(150,40,70,${.35 * pulse})`);
    g.addColorStop(.12, `rgba(110,20,45,${.25 * pulse})`);
    g.addColorStop(.4, 'rgba(70,8,24,.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 260 * D, 0, TAU); x.fill();

    // crackling energy along the X
    if (!reduce && !LITE && Math.random() < .06 * dt) bolts.push(bolt(rot * .6 + Math.PI / 4 + (Math.random() * 4 | 0) * Math.PI / 2 + rnd(-.12, .12)));
    x.lineCap = 'round';
    bolts = bolts.filter(b => {
      b.life -= .07 * dt; if (b.life <= 0) return false;
      x.strokeStyle = `rgba(200,70,110,${b.life * .35})`; x.lineWidth = 1.4 * D;
      x.shadowBlur = 12 * D; x.shadowColor = '#ff4d8a';
      x.beginPath(); b.pts.forEach(([px, py], i) => i ? x.lineTo(cx + px, cy + py) : x.moveTo(cx + px, cy + py)); x.stroke();
      x.shadowBlur = 0; return true;
    });

    // shard vortex
    x.globalCompositeOperation = 'source-over';
    for (const s of shards) {
      s.d += s.v * dt * (1 + Math.abs(spin) * 400);
      s.a += (s.w * .006 / (s.d + .15) + spin * 2) * dt;
      s.rot += s.vr * dt;
      if (s.d > 1.05) Object.assign(s, shard(false));
      const dist = s.d * R * .75, px = cx + Math.cos(s.a) * dist, py = cy + Math.sin(s.a) * dist * .82;
      const sz = s.s * D * (.4 + s.d * 1.6), fade = Math.min(1, s.d * 6) * (1 - Math.max(0, s.d - .8) * 4);
      x.save(); x.translate(px, py); x.rotate(s.rot);
      x.beginPath(); x.moveTo(0, -sz * s.k[0]); x.lineTo(sz * s.k[1], sz * .7); x.lineTo(-sz * s.k[2], sz * .5); x.closePath();
      // shards closer to the core are backlit silhouettes; outer ones catch the light
      x.fillStyle = s.lit ? `rgba(150,70,100,${.35 * fade})` : `rgba(22,12,26,${.8 * fade})`;
      x.fill();
      x.strokeStyle = `rgba(170,70,110,${.18 * fade})`; x.lineWidth = .8 * D; x.stroke();
      x.restore();
    }

    // embers
    x.globalCompositeOperation = 'lighter';
    for (const p of embers) {
      p.ph += .03 * dt; p.y += p.vy * dt - spin * 900 * D; p.x += Math.sin(p.ph) * .3 * D;
      if (p.y < -10 || p.y > H + 20) Object.assign(p, ember(false));
      x.fillStyle = `rgba(255,80,110,${p.a * (.6 + .4 * Math.sin(p.ph * 2))})`;
      x.beginPath(); x.arc(p.x, p.y, p.r, 0, TAU); x.fill();
    }
    x.globalCompositeOperation = 'source-over';

    // keep content readable: darken the whole field a touch
    x.fillStyle = 'rgba(5,5,6,.5)'; x.fillRect(0, 0, W, H);

    if (!reduce) requestAnimationFrame(frame);
  }
  init();
  requestAnimationFrame(frame);
})();
