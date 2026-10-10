/* Az.Armory web demo of Azware: personalisation is locked; the full app is a free download. */
(() => {
  const DL = '../../azware.html#get';
  const css = document.createElement('style');
  css.textContent = `
  .az-lock-host{position:relative}
  .az-lock{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:16px;
    background:linear-gradient(180deg,rgba(8,4,6,.78),rgba(8,4,6,.9));backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);border:1px solid rgba(255,45,61,.35)}
  .az-lock svg{width:26px;height:26px;fill:none;stroke:#ff2d3d;stroke-width:1.8}
  .az-lock b{font-family:Cinzel,serif;letter-spacing:.24em;font-size:12px;color:#f1e8e9}
  .az-lock span{font-size:12px;color:#b9aeb1;max-width:220px;line-height:1.4}
  .az-lock a{margin-top:4px;font-family:Cinzel,serif;font-weight:700;letter-spacing:.2em;font-size:11px;color:#fff;background:#c3111f;padding:9px 14px;text-decoration:none;border:1px solid rgba(255,255,255,.18);transition:box-shadow .3s,background .3s}
  .az-lock a:hover{background:#e01b2b;box-shadow:0 0 22px rgba(255,45,61,.55)}
  .az-locked-in{filter:blur(2px);opacity:.45}
  .az-demo-bar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:14px;padding:9px 10px 9px 16px;
    background:rgba(10,5,7,.92);border:1px solid rgba(255,45,61,.45);box-shadow:0 10px 40px rgba(0,0,0,.6);font-family:Cinzel,serif;font-size:12px;letter-spacing:.14em;color:#e9dfe1;white-space:nowrap}
  .az-demo-bar i{font-style:normal;color:#ff2d3d;font-weight:700}
  .az-demo-bar a{color:#fff;background:#c3111f;padding:7px 12px;text-decoration:none;font-weight:700;letter-spacing:.16em;font-size:11px}
  .az-demo-bar a:hover{box-shadow:0 0 18px rgba(255,45,61,.55)}
  @media (max-width:600px){.az-demo-bar{font-size:10px;gap:8px;bottom:8px}.az-demo-bar .t{display:none}}`;
  document.head.append(css);

  const lockIcon = '<svg viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10" rx="1.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>';
  function lock(section, title, text) {
    if (!section || section.querySelector('.az-lock')) return;
    section.classList.add('az-lock-host');
    [...section.children].forEach(ch => { ch.classList.add('az-locked-in'); ch.setAttribute('inert', ''); });
    const o = document.createElement('div');
    o.className = 'az-lock';
    o.innerHTML = `${lockIcon}<b>${title}</b><span>${text}</span><a href="${DL}" target="_top">Download to use</a>`;
    section.append(o);
  }

  function apply() {
    const pri = document.getElementById('pri');
    lock(pri && pri.closest('section'), 'THE ASCENT', 'Set your own flicking, tracking and switching mix in the full app.');
    const issue = document.getElementById('issue');
    lock(issue && issue.closest('section'), 'CONFESSION', 'Tell Azware what goes wrong and it re-weights your routine.');
    const cs = document.getElementById('callsign');
    if (cs && !cs.dataset.azLocked) {
      cs.dataset.azLocked = 1;
      cs.value = ''; cs.readOnly = true; cs.tabIndex = -1;
      cs.placeholder = 'Locked in demo · download to set';
      cs.style.cursor = 'not-allowed'; cs.style.opacity = '.6';
      cs.addEventListener('focus', () => cs.blur());
      cs.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (!document.querySelector('.az-demo-bar')) {
      const bar = document.createElement('div');
      bar.className = 'az-demo-bar';
      bar.innerHTML = '<span><i>DEMO</i><span class="t"> · some features are locked</span></span><a href="' + DL + '" target="_top">Get the full Azware free</a>';
      document.body.append(bar);
    }
  }
  /* ---------- extra demo limits: quests, platforms, aim levels, trainer ---------- */
  const FREE_QUESTS = 2; // of 12 → 83% locked
  const css2 = document.createElement('style');
  css2.textContent = `
  .az-qlock{position:relative;overflow:hidden}
  .az-qlock>*:not(.az-qover){filter:blur(3px);opacity:.35;pointer-events:none;user-select:none}
  .az-qover{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;background:rgba(8,4,6,.55)}
  .az-qover svg{width:20px;height:20px;fill:none;stroke:#ff2d3d;stroke-width:1.8}
  .az-qover b{font-family:Cinzel,serif;letter-spacing:.22em;font-size:10px;color:#e9dfe1}
  .az-qover a{font-family:Cinzel,serif;font-size:10px;letter-spacing:.16em;color:#ff5a66;text-decoration:none;border-bottom:1px solid rgba(255,45,61,.5)}
  .az-qover a:hover{color:#fff}
  button.az-dis{opacity:.4!important;cursor:not-allowed!important;position:relative}
  button.az-dis::after{content:'🔒';font-size:9px;margin-left:5px;filter:grayscale(1) brightness(1.6)}
  .play.az-dis::after{content:''}
  .az-toast{position:fixed;left:50%;top:22px;transform:translate(-50%,-30px);opacity:0;z-index:10000;padding:12px 16px;background:rgba(12,5,8,.96);border:1px solid rgba(255,45,61,.5);
    font-family:Cinzel,serif;font-size:12px;letter-spacing:.12em;color:#efe6e8;box-shadow:0 12px 40px rgba(0,0,0,.6);transition:all .35s cubic-bezier(.16,1,.3,1);display:flex;gap:12px;align-items:center}
  .az-toast.on{opacity:1;transform:translate(-50%,0)}
  .az-toast a{color:#fff;background:#c3111f;padding:6px 10px;text-decoration:none;font-weight:700;font-size:11px;letter-spacing:.14em}`;
  document.head.append(css2);

  let toastEl, toastT;
  function toast(what) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'az-toast'; document.body.append(toastEl); }
    toastEl.innerHTML = `<span>${what} is locked in the demo</span><a href="${DL}" target="_top">Download free</a>`;
    toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2600);
  }
  const block = (el, what) => {
    if (!el || el.classList.contains('az-dis')) return;
    el.classList.add('az-dis'); el.setAttribute('aria-disabled', 'true'); el.title = 'Locked in demo';
    el.onclick = null;
    el.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); toast(what); }, true);
  };

  function lockQuests() {
    const qs = document.querySelectorAll('#routine .q');
    qs.forEach((q, i) => {
      block(q.querySelector('.play'), 'The trainer');
      if (i < FREE_QUESTS || q.classList.contains('az-qlock')) return;
      q.classList.add('az-qlock');
      const o = document.createElement('div'); o.className = 'az-qover';
      o.innerHTML = `${lockIcon}<b>QUEST LOCKED</b><a href="${DL}" target="_top">Download to unlock</a>`;
      q.append(o);
    });
  }
  function lockSegs() {
    const plat = document.getElementById('platform'), rank = document.getElementById('rank');
    plat && plat.querySelectorAll('button[data-v="mobile"]').forEach(b => block(b, 'Mobile'));
    rank && rank.querySelectorAll('button[data-v="i"],button[data-v="a"]').forEach(b => block(b, 'This aim level'));
    // a saved Mobile / higher-level profile falls back to the free options
    const onPlat = plat && plat.querySelector('button.on'), onRank = rank && rank.querySelector('button.on');
    if (onPlat && onPlat.dataset.v === 'mobile') plat.querySelector('button[data-v="aimlabs"]')?.click();
    if (onRank && onRank.dataset.v !== 'b') rank.querySelector('button[data-v="b"]')?.click();
  }
  function lockTrainer() {
    block(document.getElementById('free'), 'The trainer');
    try { window.openTrainer = () => toast('The trainer'); } catch {}
  }
  function lockAll() { lockQuests(); lockSegs(); lockTrainer(); }

  function start() {
    apply(); lockAll();
    // Azware rebuilds these lists on every change, so re-apply after each rebuild
    const mo = new MutationObserver(() => { mo.disconnect(); lockAll(); observe(); });
    const observe = () => ['routine', 'platform', 'rank'].forEach(id => { const el = document.getElementById(id); el && mo.observe(el, { childList: true, subtree: id === 'routine' }); });
    observe();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
  setTimeout(() => { apply(); lockAll(); }, 1200); // after Azware's own intro has built the panels
})();
