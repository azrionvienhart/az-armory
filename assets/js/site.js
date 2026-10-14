/* =========================================================
   AZ.ARMORY — motion + interaction engine
   Pages are switched in place (fetch + swap) instead of full reloads, so the
   background and the music keep running while visitors move between pages.
   ========================================================= */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const AZ = window.AZ || { links: {}, products: {} };
  const hasG = !!window.gsap;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const LITE = document.documentElement.classList.contains('lite'); // set by bg.js on phones / low-end devices
  const BLUR = LITE ? 'blur(0px)' : 'blur(8px)';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  if (hasG) document.documentElement.classList.add('js');
  if (hasG && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  function sfx(n) { window.AZSound && AZSound.play(n); }

  /* =========================================================
     PERSISTENT LAYER — set up once, survives page switches
     ========================================================= */

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduce && fine) {
    lenis = new Lenis({ lerp: .09, smoothWheel: true });
    if (hasG) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
    else { const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  }

  /* ---------- UI sounds ---------- */
  const hot = 'a, button, .pcard3d, .facade, .prod, .soc, .feat, .gstep, .chip, .inst, .truth li';
  document.addEventListener('pointerover', e => { const el = e.target.closest(hot); if (el && !el.contains(e.relatedTarget)) sfx('hover'); });
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('a, button, .facade'); if (!el || el.matches('.snd, .burger, .qa button')) return;
    if (!isPageLink(el)) sfx('click');
  });

  /* ---------- cursor ---------- */
  if (fine && !reduce) {
    document.body.classList.add('has-cursor');
    const cur = document.createElement('div'), dot = document.createElement('div');
    cur.className = 'cursor'; dot.className = 'cursor-dot';
    document.body.append(cur, dot);
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; if (!document.body.classList.contains('cursor-on')) { cx = mx; cy = my; document.body.classList.add('cursor-on'); } dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`; }, { passive: true });
    (function loop() { cx += (mx - cx) * .18; cy += (my - cy) * .18; cur.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`; requestAnimationFrame(loop); })();
    document.addEventListener('pointerover', e => cur.classList.toggle('hover', !!e.target.closest('a,button,[data-tilt],.facade')));
    document.documentElement.addEventListener('mouseleave', () => document.body.classList.remove('cursor-on'));
  }

  /* ---------- scroll progress line (replaces the scrollbar) ---------- */
  const sl = document.createElement('div'); sl.className = 'scrollline'; sl.innerHTML = '<i></i>'; document.body.append(sl);
  const slFill = sl.firstChild;
  const onProg = () => { const m = document.documentElement.scrollHeight - innerHeight; slFill.style.transform = `scaleY(${m > 0 ? scrollY / m : 0})`; };
  addEventListener('scroll', onProg, { passive: true }); addEventListener('resize', onProg); onProg();

  /* ---------- page switching: shutter + whoosh, content swapped in place ---------- */
  const PERSIST = '#bg, .grid-overlay, .vignette, .grain, .pagewipe, .cursor, .cursor-dot, .scrollline, script';
  function isPageLink(a) {
    if (!a.matches('a[href]') || a.target === '_blank' || a.hasAttribute('download')) return false;
    const u = new URL(a.href, location.href);
    return u.origin === location.origin && u.pathname !== location.pathname && /\.html$|\/$/.test(u.pathname) && !u.pathname.includes('/app/');
  }
  const wipe = document.createElement('div'); wipe.className = 'pagewipe';
  wipe.innerHTML = '<img src="assets/img/azarmory-logo.svg" alt="">'; document.body.append(wipe);
  void wipe.offsetWidth;
  setTimeout(() => wipe.classList.add('out'), 80);
  addEventListener('pageshow', e => { if (e.persisted) { wipe.classList.remove('in'); wipe.classList.add('out'); } });

  let navBusy = false;
  async function go(url, push) {
    if (navBusy) return; navBusy = true;
    sfx('page');
    wipe.classList.remove('out'); wipe.classList.add('in');
    try {
      const [html] = await Promise.all([fetch(url).then(r => { if (!r.ok) throw 0; return r.text(); }), new Promise(r => setTimeout(r, 430))]);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      teardown();
      [...document.body.children].forEach(el => { if (!el.matches(PERSIST)) el.remove(); });
      const anchor = $('.pagewipe');
      [...doc.body.children].forEach(el => { if (!el.matches(PERSIST) && el.id !== 'boot') document.body.insertBefore(document.adoptNode(el), anchor); });
      document.title = doc.title;
      ['meta[name="description"]', 'link[rel="icon"]', 'meta[property="og:url"]'].forEach(s => { const a = $(s), b = $(s, doc); if (a && b) a.replaceWith(b.cloneNode()); });
      if (push) history.pushState({ az: 1 }, '', url);
      const hash = new URL(url, location.href).hash;
      lenis ? lenis.scrollTo(0, { immediate: true, force: true }) : 0; scrollTo(0, 0);
      initPage(); startPage();
      // jump to #section only after pinned sections have been measured, then open the shutter
      const reveal = () => { onProg(); wipe.classList.remove('in'); wipe.classList.add('out'); };
      if (hash && $(hash)) setTimeout(() => {
        window.ScrollTrigger && ScrollTrigger.refresh();
        const t = $(hash); if (t) { const y = t.getBoundingClientRect().top + scrollY - 70; lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y); }
        setTimeout(reveal, 30);
      }, 450);
      else setTimeout(reveal, 60);
    } catch { location.href = url; return; }
    finally { navBusy = false; }
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a || !isPageLink(a) || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    e.preventDefault(); go(a.href, true);
  });
  history.replaceState({ az: 1 }, '', location.href);
  addEventListener('popstate', e => { if (e.state && e.state.az) go(location.href, false); });

  /* ---------- per-page lifecycle ---------- */
  let ctl = null;
  const live = () => ctl && !ctl.signal.aborted;
  const on = (t, type, fn, o = {}) => t.addEventListener(type, fn, { ...o, signal: ctl.signal });
  function teardown() {
    ctl && ctl.abort();
    if (hasG) {
      window.ScrollTrigger && ScrollTrigger.getAll().forEach(t => t.kill(true));
      gsap.globalTimeline.getChildren(true, true, true).forEach(t => t.kill());
    }
  }

  /* =========================================================
     PAGE LAYER — runs on every page (first load + each switch)
     ========================================================= */
  function initPage() {
    ctl = new AbortController();
    const sig = ctl.signal;

    renderCatalog(); storeMenu();
    $$('[data-link]').forEach(a => { const u = AZ.links[a.dataset.link]; if (u) { a.href = u; a.target = '_blank'; a.rel = 'noopener'; } });
    $$('[data-year]').forEach(e => e.textContent = new Date().getFullYear());

    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href'); if (id.length < 2) return;
      const t = $(id); if (!t) return; e.preventDefault();
      $('.nav')?.classList.remove('open');
      lenis ? lenis.scrollTo(t, { offset: -70, duration: 1.4 }) : t.scrollIntoView({ behavior: 'smooth' });
    }));

    /* nav */
    const nav = $('.nav');
    const onScroll = () => nav && nav.classList.toggle('scrolled', scrollY > 30);
    on(window, 'scroll', onScroll, { passive: true }); onScroll();
    $('.burger')?.addEventListener('click', () => { const was = nav.classList.contains('store-open'); nav.classList.remove('store-open'); if (was) { sfx('close'); return; } sfx(nav.classList.toggle('open') ? 'open' : 'close'); });
    if (window.AZSound && nav) {
      const sb = document.createElement('button');
      sb.className = 'snd'; sb.type = 'button';
      sb.innerHTML = '<i></i><i></i><i></i><i></i>';
      const paint = () => { sb.classList.toggle('off', !AZSound.enabled); sb.setAttribute('aria-label', AZSound.enabled ? 'Mute sound' : 'Turn sound on'); sb.title = sb.getAttribute('aria-label'); };
      sb.addEventListener('click', e => { e.stopPropagation(); AZSound.toggle(); paint(); });
      paint();
      $('.nav .wrap').insertBefore(sb, $('.burger'));
    }

    /* tilt + spotlight */
    if (fine) $$('[data-tilt]').forEach(el => {
      const m = +el.dataset.tilt || 8;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', px * 100 + '%'); el.style.setProperty('--my', py * 100 + '%');
        el.style.transform = `perspective(1200px) rotateY(${(px - .5) * m}deg) rotateX(${(.5 - py) * m}deg)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transition = 'transform .9s cubic-bezier(.16,1,.3,1)'; el.style.transform = ''; setTimeout(() => el.style.transition = '', 900); });
    });

    /* lens tickers: dim words outside, bright inside the centre lens */
    $$('.marquee').forEach(mq => {
      const base = $('.track', mq);
      base.innerHTML += base.innerHTML; base.classList.add('base');
      const baseWrap = document.createElement('div'); baseWrap.className = 'lens-base'; base.before(baseWrap); baseWrap.append(base);
      const fillWrap = document.createElement('div'); fillWrap.className = 'lens-fill';
      const fill = base.cloneNode(true); fill.classList.remove('base'); fillWrap.append(fill);
      const hud = document.createElement('div'); hud.className = 'lens-hud'; hud.innerHTML = '<b>AZ.ARMORY</b><span class="lens-scan"></span>';
      mq.append(fillWrap, hud);
      const dir = mq.dataset.dir === 'r' ? 1 : -1;
      let x = 0, boost = 0, skew = 0, last = scrollY;
      on(window, 'scroll', () => { const d = scrollY - last; boost += Math.abs(d) * .06; skew += d * .04; last = scrollY; }, { passive: true });
      let vis = true; new IntersectionObserver(en => vis = en[0].isIntersecting).observe(mq); // idle while off-screen
      (function loop() {
        if (sig.aborted) return;
        if (!vis) { requestAnimationFrame(loop); return; }
        boost *= .92; skew *= .88; const w = base.scrollWidth / 2;
        x += dir * (.7 + Math.min(boost, 14)) * (reduce ? 0 : 1);
        if (x <= -w) x += w; if (x >= 0 && dir > 0) x -= w;
        const t = `translate3d(${x}px,0,0) skewX(${Math.max(-12, Math.min(12, skew))}deg)`;
        base.style.transform = t; fill.style.transform = t; requestAnimationFrame(loop);
      })();
    });

    /* Discord live member count */
    const memberEls = $$('[data-discord-members]');
    if (memberEls.length) {
      const set = n => memberEls.forEach(el => { el.dataset.count = n; if (el.dataset.done) countUp(el, n); });
      set(AZ.discordMembersFallback || 6000);
      fetch(`https://discord.com/api/v10/invites/${AZ.discordInviteCode}?with_counts=true`)
        .then(r => r.ok ? r.json() : null).then(j => { if (j && j.approximate_member_count && live()) set(j.approximate_member_count); }).catch(() => {});
    }

    /* versions (PC / Mobile): video tabs, version cards and the gate picker share one choice */
    platHooks = [];
    $$('[data-video]').forEach(box => { const draw = () => renderVideo(box); draw(); platHooks.push(draw); });
    $$('[data-ptabs]').forEach(el => { const draw = () => renderTabs(el); draw(); platHooks.push(draw); });
    $$('[data-vers]').forEach(el => { const draw = () => renderVers(el); draw(); platHooks.push(draw); });
    /* FAQ */
    $$('.qa').forEach(q => {
      const b = $('button', q), a = $('.ans', q);
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', () => {
        const open = !q.classList.contains('open');
        q.classList.toggle('open', open); b.setAttribute('aria-expanded', open); sfx(open ? 'open' : 'close');
        a.style.height = open ? a.scrollHeight + 'px' : '0px';
      });
    });

    /* footer letters, scaled to fit exactly */
    $$('.foot-big').forEach(el => { el.innerHTML = [...el.textContent].map(c => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join(''); });
    const fitFoot = () => $$('.foot-big').forEach(el => {
      el.style.fontSize = '100px';
      const inner = $$('span', el).reduce((s, sp) => s + sp.getBoundingClientRect().width, 0);
      el.style.fontSize = Math.floor(100 * (el.clientWidth / inner) * .97) + 'px';
    });
    fitFoot(); on(window, 'resize', fitFoot); document.fonts?.ready.then(() => live() && fitFoot());

    gate(); terminal();
  }

  /* =========================================================
     PRODUCTS — Store menu + home catalogue, both built from config.js
     ========================================================= */
  const STATUS = { live: ['Live', ''], soon: ['Coming soon', 'soon'], new: ['New', ''], updated: ['Updated', ''] };
  const list = () => Object.entries(AZ.products || {}).map(([id, p]) => ({ id, ...p }));
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tag = p => { const [t, cls] = STATUS[p.status] || STATUS.live; return `<span class="tag ${cls}"><span class="dot"></span>${t}${p.status === 'live' && p.version ? ' · v' + esc(p.version) : ''}</span>`; };

  function renderCatalog() {
    const box = $('[data-catalog]'); if (!box) return;
    const all = list();
    const card = p => `<article class="prod ${p.status === 'soon' ? 'soon' : ''}" data-tilt="5" data-status="${esc(p.status)}">
      ${p.status === 'soon' ? '<div class="stripes"></div>' : ''}
      <div class="art">${p.art ? `<img src="${esc(p.art)}" alt="">` : ''}</div><div class="spot"></div>
      <div class="head"><img class="ic" src="${esc(p.icon)}" alt="">${tag(p)}</div>
      <span class="mono" style="color:${p.status === 'soon' ? 'var(--gold)' : 'var(--red)'}">${esc(p.category)}</span>
      <h3>${esc(p.name)}</h3><p>${esc(p.tagline)}</p>
      <ul>${(p.features || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      <div class="acts">${p.status === 'soon'
        ? `<a href="${esc(p.page)}" class="btn btn-ghost">Preview <span class="ar">→</span></a>${p.demo ? `<a href="${esc(p.demo)}" target="_blank" rel="noopener" class="btn btn-ghost">Try the demo</a>` : '<a data-link="discord" class="btn btn-ghost">Get notified</a>'}`
        : `<a href="${esc(p.page)}" class="btn btn-red">Open <span class="ar">→</span></a>${p.demo ? `<a href="${esc(p.demo)}" target="_blank" rel="noopener" class="btn btn-ghost">Try the demo</a>` : ''}`}</div>
    </article>`;
    box.innerHTML = all.map(card).join('');
    box.classList.toggle('many', all.length > 4);
    // filter chips once the catalogue outgrows a couple of rows
    const fl = $('.cat-filters');
    if (fl && all.length > 4) {
      const groups = [['all', 'All'], ['live', 'Live'], ['soon', 'Coming soon']].filter(([k]) => k === 'all' || all.some(p => (k === 'live' ? p.status !== 'soon' : p.status === k)));
      fl.hidden = false;
      fl.innerHTML = groups.map(([k, l], i) => `<button class="chip ${i ? '' : 'on'}" data-f="${k}">${l}</button>`).join('');
      fl.addEventListener('click', e => {
        const b = e.target.closest('[data-f]'); if (!b) return;
        $$('.chip', fl).forEach(c => c.classList.toggle('on', c === b)); sfx('toggle');
        $$('.prod', box).forEach(el => { const s = el.dataset.status; el.hidden = !(b.dataset.f === 'all' || (b.dataset.f === 'live' ? s !== 'soon' : s === b.dataset.f)); });
        window.ScrollTrigger && ScrollTrigger.refresh();
      });
    }
  }

  function storeMenu() {
    const nav = $('.nav'), btn = $('.store-btn'); if (!nav || !btn) return;
    const all = list(), latest = all.find(p => p.id === AZ.latest) || all[0];
    const here = location.pathname.split('/').pop() || 'index.html';
    if (all.some(p => p.page === here)) btn.classList.add('on');
    const panel = document.createElement('div');
    panel.className = 'store-panel'; panel.id = 'store-panel'; btn.setAttribute('aria-controls', panel.id);
    panel.innerHTML = `<div class="sp-grid">
      <a class="sp-feature" href="${esc(latest.page)}">
        <span class="mono red">Latest drop</span>
        <div class="sp-fimg">${latest.art ? `<img src="${esc(latest.art)}" alt="">` : ''}</div>
        <div class="sp-frow"><img src="${esc(latest.icon)}" alt=""><div><b>${esc(latest.name)}</b><small>${esc(latest.category)}</small></div>${tag(latest)}</div>
      </a>
      <div class="sp-list">
        <div class="sp-head"><span class="mono">All products · ${all.length}</span><a href="index.html#products" class="mono">View catalogue →</a></div>
        <div class="sp-items">${all.map(p => {
          const inner = `<img src="${esc(p.icon)}" alt=""><div><b>${esc(p.name)}</b><small>${esc(p.tagline)}</small></div>${tag(p)}`;
          if (!p.platforms) return `<a class="sp-item ${p.page === here ? 'cur' : ''}" href="${esc(p.page)}">${inner}</a>`;
          // products with versions: hovering reveals one option per version (PC / Mobile)
          const vers = Object.entries(p.platforms).map(([k, v]) => {
            const live = v.status !== 'soon' && v.download;
            return `<a class="sp-ver ${live ? '' : 'soon'}" href="${esc(p.page)}#versions" data-pk="${esc(p.id)}" data-plat="${esc(k)}">
              ${ICON[k] || ''}<span><b>${esc(v.label)}</b><small>${esc(v.short || v.system || '')}</small></span><em>${live ? 'Live' : 'Soon'}</em></a>`;
          }).join('');
          return `<div class="sp-item sp-multi ${p.page === here ? 'cur' : ''}"><a class="sp-main" href="${esc(p.page)}">${inner}</a><div class="sp-vers">${vers}</div></div>`;
        }).join('')}</div>
      </div></div>`;
    nav.append(panel);
    let t;
    const set = open => {
      if (open === nav.classList.contains('store-open')) return;
      nav.classList.toggle('store-open', open); btn.setAttribute('aria-expanded', open); sfx(open ? 'open' : 'close');
      if (open && hasG) gsap.fromTo($$('.sp-feature, .sp-item', panel), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .5, stagger: .05, ease: 'expo.out' });
    };
    btn.addEventListener('click', e => { e.stopPropagation(); set(!nav.classList.contains('store-open')); });
    if (fine) {
      [btn, panel].forEach(el => {
        el.addEventListener('pointerenter', () => { clearTimeout(t); t = setTimeout(() => set(true), 120); });
        el.addEventListener('pointerleave', () => { clearTimeout(t); t = setTimeout(() => set(false), 260); });
      });
    }
    on(document, 'click', e => { if (!e.target.closest('.store-panel, .store-btn')) set(false); });
    on(document, 'keydown', e => { if (e.key === 'Escape') set(false); });
    panel.addEventListener('click', e => {
      const v = e.target.closest('[data-plat]'); // version option: preselect it on the product page
      if (v) {
        try { sessionStorage.setItem('az.plat.' + v.dataset.pk, v.dataset.plat); } catch {} platHooks.forEach(fn => fn());
        const t = $('#versions');
        if (t && new URL(v.href).pathname === location.pathname) { e.preventDefault(); nav.classList.remove('store-open', 'open'); lenis ? lenis.scrollTo(t, { offset: -70, duration: 1.2 }) : t.scrollIntoView({ behavior: 'smooth' }); return; }
      }
      if (e.target.closest('a')) { nav.classList.remove('store-open', 'open'); }
    });
  }

  /* ---------- counters ---------- */
  function countUp(el, to) {
    const dec = +(el.dataset.dec || 0), suf = el.dataset.suffix || '';
    if (!hasG || reduce) { el.textContent = to.toLocaleString(undefined, { maximumFractionDigits: dec }) + suf; return; }
    const o = { v: 0 };
    gsap.to(o, { v: to, duration: 2, ease: 'power3.out', onUpdate: () => el.textContent = o.v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf });
  }

  /* ---------- split text ---------- */
  function split(el) {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(w => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.append(' '); return; }
            const o = document.createElement('span'); o.className = 'w';
            const i = document.createElement('span'); i.textContent = w; o.append(i); frag.append(o);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
      });
    };
    walk(el); el.classList.add('split');
    return $$('.w>span', el);
  }

  /* =========================================================
     Intro + scroll choreography (GSAP)
     ========================================================= */
  function startPage() {
    if (!hasG) { $$('[data-count]').forEach(el => countUp(el, +el.dataset.count)); return; }
    const ST = window.ScrollTrigger;

    // hero entrance
    const heroWords = $$('[data-split="hero"]').flatMap(split);
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from(heroWords, { yPercent: 110, rotate: 4, duration: 1.4, stagger: .06 })
      .from('[data-hero-fade]', { y: 30, opacity: 0, duration: 1.1, stagger: .1 }, '-=1.05');
    if ($('.pcard3d, .stage-sigil')) tl.from('.pcard3d, .stage-sigil > *', { y: 80, opacity: 0, rotateX: -18, duration: 1.6, stagger: .14 }, '-=1.2');

    // floating hero cards (never stop)
    if (!reduce) {
      if ($('.pcard3d')) {
        gsap.to('.pcard3d.a', { y: -18, rotate: -1.5, duration: 4.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        gsap.to('.pcard3d.b', { y: 16, rotate: 1.8, duration: 5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        gsap.to('.sigil-big', { rotate: 6, scale: 1.05, duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      }
      if ($('.stage-sigil')) {
        gsap.to('.stage-sigil img', { y: -14, duration: 3.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        gsap.to('.stage-sigil .shard', { rotate: '+=360', duration: i => 60 + i * 25, ease: 'none', repeat: -1 });
        gsap.to('.stage-sigil .flare', { scale: 1.25, opacity: .6, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      }
      // hovering a hero card brings it to the front; leaving puts the stack back
      const cards = $$('.pcard3d');
      cards.forEach(card => {
        let t;
        card.addEventListener('pointerenter', () => {
          clearTimeout(t); cards.forEach(c => c !== card && c.classList.remove('front')); card.classList.add('front');
          gsap.to(card, { scale: 1.06, opacity: 1, duration: .6, ease: 'expo.out', overwrite: 'auto' });
          cards.forEach(o => o !== card && gsap.to(o, { scale: .93, opacity: .45, duration: .6, ease: 'expo.out', overwrite: 'auto' }));
        });
        card.addEventListener('pointerleave', () => {
          gsap.to(cards, { scale: 1, opacity: 1, duration: .7, ease: 'expo.out', overwrite: 'auto' });
          t = setTimeout(() => card.classList.remove('front'), 260);
        });
      });
      if ($('.stage, .stage-sigil') && fine) on(window, 'pointermove', e => {
        const dx = e.clientX / innerWidth - .5, dy = e.clientY / innerHeight - .5;
        if (cards.length) {
          gsap.to('.pcard3d.a', { rotateY: dx * 18, rotateX: -dy * 14, x: dx * 20, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
          gsap.to('.pcard3d.b', { rotateY: dx * 12, rotateX: -dy * 10, x: dx * -26, duration: 1.4, ease: 'power3.out', overwrite: 'auto' });
        }
        if ($('.stage-sigil')) gsap.to('.stage-sigil', { rotateY: dx * 14, rotateX: -dy * 14, duration: 1.4, ease: 'power3.out' });
      });
    }
    if (!ST) return;

    // hero parallax out
    if (!LITE && $('.hero .stage, .p-hero .stage-sigil')) gsap.to('.hero .stage, .p-hero .stage-sigil', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero, .p-hero', start: 'top top', end: 'bottom top', scrub: true } });

    // reveals play once on the way down and then stay put
    $$('[data-split="up"]').forEach(h => {
      const w = split(h);
      gsap.from(w, { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .045, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
    });
    $$('.reveal').forEach(el => gsap.to(el, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
    if ($('.prod, .feat, .soc, .inst, .qa, .gstep')) ST.batch('.prod, .feat, .soc, .inst, .qa, .gstep', {
      start: 'top 92%', once: true,
      onEnter: b => gsap.fromTo(b, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: .1, overwrite: true, clearProps: 'transform' })
    });
    $$('[data-count]').forEach(el => ST.create({ trigger: el, start: 'top 95%', once: true, onEnter: () => { el.dataset.done = 1; countUp(el, +el.dataset.count); } }));
    $$('.video, .device, .teaser').forEach(v => gsap.from(v, { scale: .86, opacity: 0, y: 80, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: v, start: 'top 88%', once: true } }));
    if ($('.foot-big span')) gsap.from('.foot-big span', { yPercent: 100, opacity: 0, stagger: .04, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.foot-big', start: 'top 98%', once: true } });
    if (!LITE) $$('.prod .art img').forEach(i => gsap.to(i, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: i.closest('.prod'), scrub: true } }));

    walkthrough();
    setTimeout(() => live() && ST.refresh(), 400);
  }

  /* ---------- pinned walkthrough (product pages) ---------- */
  function walkthrough() {
    const walk = $('.walk'); if (!walk) return;
    const steps = $$('.step', walk), scenes = $$('.scene', walk), bars = $$('.prog i b', walk), N = steps.length;
    const mobile = innerWidth <= 900;
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    const setCur = i => { steps.forEach((s, k) => s.classList.toggle('cur', k === i)); };
    for (let i = 0; i < N; i++) {
      tl.addLabel('s' + i);
      if (i > 0) {
        tl.to(steps[i - 1], { opacity: 0, y: -40, duration: .4 }, 's' + i)
          .fromTo(steps[i], { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .4 }, 's' + i + '+=.15')
          .to(scenes[i - 1], { opacity: 0, scale: .96, filter: BLUR, duration: .4 }, 's' + i)
          .fromTo(scenes[i], { opacity: 0, scale: 1.04, filter: BLUR }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: .45 }, 's' + i + '+=.15')
          .call(() => setCur(i), null, 's' + i + '+=.2');
      }
      tl.fromTo(bars[i], { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'none' }, 's' + i + (i ? '+=.4' : ''));
      const fx = sceneFx[i]; if (fx) fx(tl, scenes[i], 's' + i + (i ? '+=.5' : '+=.05'));
    }
    setCur(0);
    if (mobile || !window.ScrollTrigger) {
      walk.classList.add('mobile');
      tl.eventCallback('onComplete', () => { gsap.delayedCall(1.4, () => { gsap.set(steps.slice(1), { opacity: 0 }); gsap.set(scenes.slice(1), { opacity: 0 }); gsap.set(scenes[0], { opacity: 1, scale: 1, filter: 'none' }); gsap.set(steps[0], { opacity: 1, y: 0 }); tl.restart(); setCur(0); }); });
      tl.timeScale(.55).pause();
      ScrollTrigger?.create({ trigger: walk, start: 'top 70%', once: true, onEnter: () => tl.play() });
    } else {
      ScrollTrigger.create({ trigger: walk, start: 'top top', end: '+=' + N * 90 + '%', pin: '.walk-grid', scrub: .8, animation: tl,
        onUpdate: s => setCur(Math.min(N - 1, Math.floor(s.progress * N * .999))) });
    }
  }
  const sceneFx = [
    (tl, sc, at) => { // profile: cycle platforms + level
      const o = $$('.opt-row:first-of-type .opt', sc), l = $$('.opt-row.lv .opt', sc);
      o.forEach((e, i) => tl.call(() => { o.forEach(x => x.classList.remove('on')); e.classList.add('on'); }, null, `${at}+=${i * .25}`));
      tl.call(() => { o.forEach(x => x.classList.remove('on')); o[0]?.classList.add('on'); }, null, `${at}+=.78`);
      l.forEach((e, i) => tl.call(() => { l.forEach(x => x.classList.remove('on')); e.classList.add('on'); }, null, `${at}+=${.2 + i * .22}`));
      tl.from($$('.slider', sc), { opacity: 0, x: -30, stagger: .1, duration: .3 }, at);
    },
    (tl, sc, at) => { // confession → diagnosis → sliders rebalance
      const out = $('.typed', sc), txt = out ? out.dataset.text : '', o = { n: 0 };
      tl.to(o, { n: txt.length, duration: .35, ease: 'none', onUpdate: () => out && (out.textContent = txt.slice(0, Math.round(o.n))) }, at);
      tl.from($('.diag', sc), { opacity: 0, y: 20, duration: .2 }, `${at}+=.35`);
      [['f', 56], ['t', 22], ['s', 22]].forEach(([k, v]) => {
        const s = $('.slider.' + k, sc); if (!s) return;
        tl.to($('.fill', s), { width: v + '%', duration: .3 }, `${at}+=.45`).to($('.knob', s), { left: v + '%', duration: .3 }, `${at}+=.45`);
        const n = $('.val', s), ov = { v: +n.textContent }; tl.to(ov, { v, duration: .3, onUpdate: () => n.textContent = Math.round(ov.v) }, `${at}+=.45`);
      });
    },
    (tl, sc, at) => { tl.from($$('.quest', sc), { opacity: 0, y: 24, scale: .9, stagger: .035, duration: .25 }, at); },
    (tl, sc, at) => { // PSA narrowing
      $$('.psa-row', sc).forEach((r, i) => tl.from(r, { opacity: 0, x: -20, duration: .12 }, `${at}+=${i * .06}`));
      const b = $('.psa-out b', sc), o = { v: 1 };
      if (b) tl.to(o, { v: +b.dataset.to, duration: .45, onUpdate: () => b.textContent = o.v.toFixed(3) }, `${at}+=.1`);
    }
  ];

  /* =========================================================
     Boot preloader (first visit per session only)
     ========================================================= */
  function boot() {
    const el = $('#boot');
    let seen = false; try { seen = sessionStorage.getItem('az.booted'); } catch {}
    if (!el || !hasG || reduce || seen) { el?.remove(); startPage(); return; }
    try { sessionStorage.setItem('az.booted', 1); } catch {}
    lenis?.stop();
    const title = $('.boot-title', el), log = $('.boot-log', el), full = 'AZ.ARMORY';
    const glyph = '!<>-_\\/[]{}—=+*^?#AZ0123456789';
    const lines = ['mounting /void', 'loading azware.codex', 'opticore: standby', 'linking discord · youtube · instagram', 'ready'];
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      gsap.timeline({ onComplete: () => { el.remove(); lenis?.start(); } })
        .to('.boot-in', { opacity: 0, scale: .9, duration: .4, ease: 'power2.in' })
        .set('.boot-shutter', { display: 'block' })
        .to(el, { backgroundColor: 'transparent', duration: .01 })
        .to('.boot-shutter.t', { yPercent: -100, duration: .9, ease: 'expo.inOut' }, '+=.05')
        .to('.boot-shutter.b', { yPercent: 100, duration: .9, ease: 'expo.inOut' }, '<')
        .add(startPage, '-=.55');
    };
    $('.boot-skip', el).addEventListener('click', finish);
    const tl = gsap.timeline({ onComplete: finish });
    tl.to('.boot-sigil', { opacity: 1, scale: 1, duration: .8, ease: 'expo.out' })
      .to({}, { duration: 1.1, onUpdate() {
        const p = this.progress(), n = Math.floor(p * full.length);
        title.textContent = full.slice(0, n) + [...Array(full.length - n)].map(() => glyph[Math.random() * glyph.length | 0]).join('');
      }, onComplete: () => title.textContent = full }, '-=.3')
      .to('.boot-bar i', { scaleX: 1, duration: 1.5, ease: 'power2.inOut', onUpdate() { log.textContent = '> ' + lines[Math.min(lines.length - 1, Math.floor(this.progress() * lines.length))]; } }, '<')
      .to({}, { duration: .25 });
  }

  /* =========================================================
     Product versions (e.g. Azware PC / Mobile) — data in config.js `platforms`
     ========================================================= */
  let platHooks = [];
  const ICON = {
    pc: '<svg viewBox="0 0 24 24"><rect x="2.5" y="3.5" width="19" height="13" rx="1.5"/><path d="M8 20.5h8M12 16.5v4"/></svg>',
    mobile: '<svg viewBox="0 0 24 24"><rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M10.5 18h3"/></svg>'
  };
  const platsOf = key => (AZ.products[key] || {}).platforms || null;
  function getPlat(key) {
    const P = platsOf(key); if (!P) return null;
    let v = null; try { v = sessionStorage.getItem('az.plat.' + key); } catch {}
    return P[v] ? v : Object.keys(P)[0];
  }
  function setPlat(key, v) {
    if (getPlat(key) === v) return;
    try { sessionStorage.setItem('az.plat.' + key, v); } catch {}
    sfx('toggle'); platHooks.forEach(fn => fn());
  }
  function renderVideo(box) {
    const key = box.dataset.video, p = AZ.products[key] || {}, P = platsOf(key), plat = P ? getPlat(key) : null;
    const item = P ? P[plat] : p, label = P ? `${p.name} ${item.label}` : p.name, id = (item.videoId || '').trim();
    if (box.dataset.shown === (id || 'none') + plat) return; // already showing this
    box.dataset.shown = (id || 'none') + plat;
    if (!id) {
      box.innerHTML = `<div class="rec mono"><i></i>REC</div><div class="soon-v"><div class="eq"><i></i><i></i><i></i><i></i><i></i></div>
        <h3>${esc(label)} video dropping soon.</h3><p>It plays right here the moment it's live. Subscribe so you catch it first.</p>
        <a href="${esc(AZ.links.subscribe)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">Subscribe on YouTube</a></div>`;
      return;
    }
    box.innerHTML = `<div class="facade" role="button" tabindex="0" aria-label="Play ${esc(label)} video" style="background-image:url(https://i.ytimg.com/vi/${esc(id)}/maxresdefault.jpg)">
      <div class="play"><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg></div>
      <div class="vlabel"><span class="tag"><span class="dot"></span>Watch · ${esc(label)}</span><span class="mono" style="color:#fff">Click to play</span></div></div>`;
    const play = () => { box.innerHTML = `<iframe src="https://www.youtube.com/embed/${esc(id)}?autoplay=1&rel=0&modestbranding=1" title="${esc(label)} video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`; };
    const f = $('.facade', box); f.addEventListener('click', play); f.addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), play()));
  }
  function renderTabs(el) {
    const key = el.dataset.ptabs, P = platsOf(key); if (!P) { el.remove(); return; }
    const cur = getPlat(key);
    el.innerHTML = Object.entries(P).map(([k, v]) => `<button role="tab" aria-selected="${k === cur}" class="${k === cur ? 'on' : ''}" data-k="${k}">
      ${ICON[k] || ''}<span>${esc(v.label)}</span>${v.status === 'soon' ? '<em>soon</em>' : ''}</button>`).join('');
    $$('button', el).forEach(b => b.addEventListener('click', () => setPlat(key, b.dataset.k)));
  }
  function renderVers(el) {
    const key = el.dataset.vers, p = AZ.products[key] || {}, P = platsOf(key); if (!P) return;
    const cur = getPlat(key);
    el.innerHTML = Object.entries(P).map(([k, v]) => {
      const live = v.status !== 'soon' && v.download;
      const meta = live ? [v.version && 'v' + v.version, v.size, v.format].filter(Boolean).join(' · ') : 'In development';
      return `<article class="ver ${k === cur ? 'on' : ''} ${live ? '' : 'soon'}" data-k="${k}">
        <div class="ver-top"><div class="ver-ic">${ICON[k] || ''}</div>${tag({ status: live ? 'live' : 'soon', version: v.version })}</div>
        <h3>${esc(p.name)} <span>${esc(v.label)}</span></h3>
        <p class="ver-sys">${esc(v.system || '')}</p>
        <ul>${(v.perks || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="ver-foot"><span class="mono">${esc(meta)}</span>
          ${live ? `<a href="#get" class="btn btn-red btn-sm" data-pick="${k}">Get ${esc(v.label)} version <span class="ar">↓</span></a>`
                 : `<a href="${esc(AZ.links.discord)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">Get notified</a>`}</div>
      </article>`;
    }).join('');
    $$('.ver', el).forEach(card => card.addEventListener('click', e => {
      if (e.target.closest('a[target]')) return;
      setPlat(key, card.dataset.k);
      if (e.target.closest('[data-pick]')) { e.preventDefault(); const t = $('#get'); lenis ? lenis.scrollTo(t, { offset: -70, duration: 1.2 }) : t.scrollIntoView({ behavior: 'smooth' }); }
    }));
  }

  /* =========================================================
     Unlock gate
     ========================================================= */
  function gate() {
    const g = $('.gate'); if (!g) return;
    const key = g.dataset.product, prod = AZ.products[key] || {}, worker = (AZ.workerUrl || '').replace(/\/$/, '');
    const S = store.get('az.gate', { dc: false, yt: false, ig: false });
    // download password: checked by the Cloudflare worker (the site never contains it); remembered for this visit only
    const pwStep = $('.gstep.pw', g);
    let PW = ''; try { PW = sessionStorage.getItem('az.pw') || ''; } catch {}
    const steps = () => ['dc', 'yt', 'ig'].filter(k => S[k]).length + (pwStep && PW ? 1 : 0);
    const T = pwStep ? 4 : 3;
    const ringFg = $('.ring .fg', g), C = 2 * Math.PI * 46;
    const btn = $('.gate-final .btn', g), msg = $('.gate-msg', g), lbl = $('.lbl', btn);
    ringFg.style.strokeDasharray = C;
    if (!worker) $$('.gs', g).forEach(e => e.remove()); // "Verified" only once the Discord worker is live
    const P = platsOf(key), pick = $('[data-gplat]', g);
    const cur = () => { const k = P ? getPlat(key) : null; return { k, item: P ? P[k] : prod, label: P ? P[k].label : '' }; };
    const drawPick = () => {
      if (!pick) return;
      if (!P) { pick.remove(); return; }
      const k = getPlat(key);
      pick.innerHTML = Object.entries(P).map(([pk, v]) => `<button type="button" role="radio" aria-checked="${pk === k}" class="${pk === k ? 'on' : ''}" data-k="${pk}">
        ${ICON[pk] || ''}<span><b>${esc(v.label)}</b><small>${v.status === 'soon' || !v.download ? 'Coming soon' : esc(v.system || '')}</small></span></button>`).join('');
      $$('button', pick).forEach(b => b.addEventListener('click', () => setPlat(key, b.dataset.k)));
    };
    const render = () => {
      drawPick();
      const { item, label } = cur(), dl = item.download, nm = label ? `${prod.name} ${label}` : prod.name;
      const n = steps(), left = T - n;
      ringFg.style.strokeDashoffset = C * (1 - n / T);
      $('.ring .mid b', g).textContent = n + '/' + T;
      if (pwStep) pwStep.classList.toggle('done', !!PW);
      ['dc', 'yt', 'ig'].forEach(k => $(`.gstep.${k}`, g).classList.toggle('done', !!S[k]));
      msg.classList.remove('err');
      if (!dl) { // this version isn't released yet: the steps still work, the download says it's coming
        btn.disabled = true;
        lbl.textContent = n < T ? `Complete ${left} more step${left > 1 ? 's' : ''} · ${label || 'download'} soon` : `${nm} drops soon`;
        msg.textContent = n < T ? `${nm} is on the way. Get ready now.` : "You're all set. The Discord gets pinged the moment it drops.";
        return;
      }
      btn.disabled = n < T;
      lbl.textContent = n < T ? `Complete ${left} more step${left > 1 ? 's' : ''}` : (worker ? `Verify Discord & get ${label || prod.name}` : `Download ${nm}`);
      msg.textContent = [item.system, item.format, item.size, 'free'].filter(Boolean).join(' · ');
    };
    const linkFor = { dc: 'discord', yt: 'subscribe', ig: 'instagram' };
    $$('.gstep.dc, .gstep.yt, .gstep.ig', g).forEach(st => {
      const k = ['dc', 'yt', 'ig'].find(c => st.classList.contains(c)), b = $('.btn', st), tm = $('.timer', st);
      b.addEventListener('click', () => {
        open(AZ.links[linkFor[k]], '_blank', 'noopener');
        if (S[k]) return;
        st.classList.add('wait');
        let s = 8; b.style.display = 'none'; tm.style.display = 'block'; tm.textContent = `Checking… ${s}s`;
        const iv = setInterval(() => {
          s--; tm.textContent = `Checking… ${s}s`;
          if (s <= 0) { clearInterval(iv); S[k] = true; store.set('az.gate', S); st.classList.remove('wait'); tm.textContent = k === 'dc' && worker ? 'Joined · verify below' : 'Done'; render(); pop(st); sfx('step'); }
        }, 1000);
      });
    });
    render(); platHooks.push(render);

    if (pwStep) {
      const form = $('.pwform', pwStep), inp = $('.pwin', pwStep), pbtn = $('.pwbtn', pwStep), pmsg = $('.pwmsg', pwStep);
      const lock = () => { inp.value = PW; inp.disabled = true; pbtn.textContent = 'Unlocked'; pbtn.disabled = true; pmsg.textContent = ''; };
      if (PW) lock();
      let busy = false;
      const tryPw = async () => {
        const v = inp.value.trim(); if (busy || !v) { inp.focus(); return; }
        if (!worker) { pmsg.textContent = 'Password check is offline. Try again later.'; return; }
        busy = true; pbtn.textContent = 'Checking…'; pmsg.className = 'pwmsg'; pmsg.textContent = '';
        try {
          const r = await fetch(`${worker}/check?k=${encodeURIComponent(v)}`, { cache: 'no-store' }).then(r => r.json());
          if (!live()) return;
          if (r.ok) { PW = v; try { sessionStorage.setItem('az.pw', v); } catch {} lock(); render(); pop(pwStep); sfx('step'); }
          else {
            pbtn.textContent = 'Unlock'; pmsg.className = 'pwmsg err'; pmsg.textContent = 'Wrong password. It is case-sensitive.'; sfx('error');
            if (hasG) gsap.fromTo(pwStep, { x: -8 }, { x: 0, duration: .5, ease: 'elastic.out(1,.3)' });
            inp.select();
          }
        } catch { pbtn.textContent = 'Unlock'; pmsg.className = 'pwmsg err'; pmsg.textContent = "Couldn't reach the checker. Try again."; }
        busy = false;
      };
      pbtn.addEventListener('click', tryPw);
      form.addEventListener('submit', e => { e.preventDefault(); tryPw(); });
    }

    const unlock = then => {
      g.classList.add('unlocked');
      $('.ring .mid', g).innerHTML = `<img src="assets/img/az-sigil.png" alt=""><b style="font-size:26px">UNLOCKED</b><span>${cur().label ? prod.name + ' ' + cur().label : prod.name} ${cur().item.version ? 'v' + cur().item.version : ''}</span>`;
      burst(g); sfx('unlock'); store.set('az.unlocked.' + key, true);
      if (hasG) gsap.fromTo(g, { scale: .985 }, { scale: 1, duration: .8, ease: 'elastic.out(1,.4)' });
      lbl.textContent = 'Downloading…';
      setTimeout(then, 1100);
      setTimeout(() => { lbl.textContent = 'Download again'; btn.disabled = false; }, 3000);
    };
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const { k, item } = cur(); if (!item.download) return;
      if (worker) { location.href = `${worker}/auth?p=${encodeURIComponent(k ? key + '-' + k : key)}&k=${encodeURIComponent(PW)}`; return; }
      unlock(() => location.href = item.download);
    });

    // returning from the Discord verification worker
    const q = new URLSearchParams(location.search);
    if (q.get('dl') && worker) {
      const t = q.get('dl'); history.replaceState({ az: 1 }, '', location.pathname + '#get');
      setTimeout(() => { $('#get')?.scrollIntoView(); unlock(() => location.href = `${worker}/download?t=${encodeURIComponent(t)}`); }, 600);
    } else if (q.get('gate')) {
      const e = q.get('gate'); history.replaceState({ az: 1 }, '', location.pathname + '#get');
      msg.classList.add('err'); setTimeout(() => sfx('error'), 900);
      msg.textContent = e === 'notmember' ? "You're not in the Discord server yet. Join it, then press verify again." : 'Discord verification was cancelled or failed. Try again.';
      if (e === 'notmember') { S.dc = false; store.set('az.gate', S); render(); }
      if (e === 'badpass') { msg.textContent = 'That password is wrong. Check the Azware video and try again (it is case-sensitive).'; PW = ''; try { sessionStorage.removeItem('az.pw'); } catch {} render(); }
      setTimeout(() => $('#get')?.scrollIntoView(), 400);
    }
  }
  function pop(el) { if (hasG) gsap.fromTo(el, { scale: .97 }, { scale: 1, duration: .6, ease: 'back.out(3)' }); }
  function burst(host) {
    const c = document.createElement('canvas'); c.className = 'burst'; host.append(c);
    const r = host.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
    c.width = r.width * d; c.height = r.height * d; const x = c.getContext('2d'); x.scale(d, d);
    const ring = $('.ring', host).getBoundingClientRect(), ox = ring.left - r.left + ring.width / 2, oy = ring.top - r.top + ring.height / 2;
    const P = Array.from({ length: 140 }, () => { const a = Math.random() * 6.283, s = Math.random() * 9 + 2; return { x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 1, w: Math.random() * 3 + 1, c: Math.random() < .3 ? '#ffffff' : Math.random() < .5 ? '#ff2d3d' : '#5dff9a' }; });
    (function f() {
      x.clearRect(0, 0, r.width, r.height); let alive = 0;
      P.forEach(p => { if (p.l <= 0) return; alive++; p.x += p.vx; p.y += p.vy; p.vx *= .95; p.vy = p.vy * .95 + .12; p.l -= .014; x.globalAlpha = Math.max(p.l, 0); x.fillStyle = p.c; x.fillRect(p.x, p.y, p.w, p.w * 2.4); });
      alive ? requestAnimationFrame(f) : c.remove();
    })();
  }

  /* ---------- OptiCore terminal teaser ---------- */
  function terminal() {
    const pre = $('#term'); if (!pre) return;
    const sig = ctl.signal;
    const L = [['> opticore --scan', ''], ['  probing CPU scheduler ........', 'ok'], ['  power plan .................... balanced', 'w'], ['  background apps ............... 23 found', 'w'], ['  GPU driver state .............', 'ok'], ['  roblox client flags ...........', 'ok'], ['  network latency profile .......', 'r'], ['', ''], ['  > 3 issues · fixes ready', 'ok'], ['  > release: COMING SOON', 'r']];
    let i = 0;
    const tick = () => {
      if (sig.aborted) return;
      if (i >= L.length) { setTimeout(() => { pre.innerHTML = ''; i = 0; tick(); }, 3200); return; }
      const [t, s] = L[i++], tagTxt = s === 'ok' ? ' <span class="ok">[ OK ]</span>' : s === 'w' ? ' <span class="w">[ !! ]</span>' : s === 'r' ? ' <span class="r">[ FIX ]</span>' : '';
      pre.innerHTML += (t.startsWith('  >') ? `<span class="${s}">${t}</span>` : t + tagTxt) + '\n';
      setTimeout(tick, 260 + Math.random() * 320);
    };
    tick();
  }

  initPage(); boot();
})();
