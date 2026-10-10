/* Az.Armory sound: everything is synthesised live with the Web Audio API (no audio files, no licensing).
   Music: a looping 84 BPM dark-synthwave piece (Am – F – C – G): plucked arpeggios with echo,
   a syncopated sub bass, soft kick + hats and short pad swells. Two arp patterns alternate per loop.
   SFX: hover, click, page switch, open/close, step chime, unlock, error, tab-return.
   Browsers only allow sound after the visitor's first click/tap/key, so it starts then.
   Hiding the tab mutes instantly; the nav toggle remembers the visitor's choice. */
(() => {
  const KEY = 'az.sound';
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== 'off'; } catch {}
  let ctx = null, master, musicBus, sfxBus, verb, delay, started = false;

  function impulse(sec, decay) {
    const len = ctx.sampleRate * sec, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  let noiseBuf;
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    verb = ctx.createConvolver(); verb.buffer = impulse(2.8, 3);
    const verbOut = ctx.createGain(); verbOut.gain.value = .35; verb.connect(verbOut).connect(master);
    delay = ctx.createDelay(1); delay.delayTime.value = 60 / BPM * .75; // dotted eighth
    const fb = ctx.createGain(); fb.gain.value = .32; const dlp = ctx.createBiquadFilter(); dlp.frequency.value = 2600;
    delay.connect(dlp).connect(fb).connect(delay); const dOut = ctx.createGain(); dOut.gain.value = .35; dlp.connect(dOut).connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = .5; musicBus.connect(master); musicBus.connect(verb);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    const sv = ctx.createGain(); sv.gain.value = .3; sfxBus.connect(sv).connect(verb);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  /* ---------- voices ---------- */
  function env(g, t, a, peak, dur) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur); }
  function osc(type, f, t, dur, peak, out, a = .005, det = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = det; env(g, t, a, peak, dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + .05); return o;
  }
  function nz(t, dur, peak, type, freq, out, q = 1) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q; env(g, t, .002, peak, dur);
    s.connect(f).connect(g).connect(out); s.start(t, Math.random() * .5); s.stop(t + dur + .05); return f;
  }
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------- music ---------- */
  const BPM = 84, STEP = 60 / BPM / 4;
  // chord tones as MIDI notes; each chord lasts 2 bars (32 steps)
  const CHORDS = [
    { root: 45, tones: [57, 60, 64, 69, 72, 76] },   // Am
    { root: 41, tones: [53, 57, 60, 65, 69, 72] },   // F
    { root: 48, tones: [55, 60, 64, 67, 72, 76] },   // C
    { root: 43, tones: [55, 59, 62, 67, 71, 74] }    // G
  ];
  const ARPS = [[0, 2, 1, 3, 2, 4, 3, 5], [0, 3, 2, 5, 4, 2, 3, 1]];
  let step = 0, nextT = 0, timer = null, arpOut, padOut;

  function pluck(m, t, v) {
    const f = hz(m), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
    lp.frequency.setValueAtTime(3800, t); lp.frequency.exponentialRampToValueAtTime(600, t + .3);
    lp.connect(arpOut);
    osc('triangle', f, t, .45, .16 * v, lp); osc('sawtooth', f, t, .3, .05 * v, lp, .003, 7);
  }
  function bass(m, t, dur) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.connect(musicBus);
    osc('sine', hz(m), t, dur, .42, lp, .01); osc('triangle', hz(m), t, dur * .6, .12, lp, .01);
  }
  function kick(t) { const o = osc('sine', 110, t, .32, .5, musicBus, .002); o.frequency.exponentialRampToValueAtTime(42, t + .25); }
  function hat(t, v) { nz(t, .05, .05 * v, 'highpass', 8000, musicBus); }
  function snap(t) { nz(t, .16, .07, 'bandpass', 1900, musicBus, .9); }
  function pad(c, t) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.connect(padOut);
    c.tones.slice(0, 3).forEach(m => [-8, 8].forEach(det => {
      const o = ctx.createOscillator(), g = ctx.createGain(), len = STEP * 30;
      o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.022, t + 1.2); g.gain.setValueAtTime(.022, t + len - 1.5); g.gain.linearRampToValueAtTime(0, t + len);
      o.connect(g).connect(lp); o.start(t); o.stop(t + len + .1);
    }));
  }
  function schedule(i, t) {
    const bar = Math.floor(i / 16), s = i % 16, c = CHORDS[Math.floor(i / 32) % 4], loop = Math.floor(i / 128);
    const intro = loop === 0 && bar < 2;                   // first 2 bars: arp only, then the groove comes in
    if (i % 32 === 0) pad(c, t);
    if (s % 2 === 0) {                                      // eighth-note arpeggio
      const pat = ARPS[loop % 2], k = pat[(s / 2) % 8];
      pluck(c.tones[k], t, s % 8 === 0 ? 1 : .7);
    }
    if (intro) return;
    if (s === 0) bass(c.root, t, STEP * 7);
    if (s === 10) bass(c.root, t, STEP * 3);
    if (s === 14 && bar % 2) bass(c.root + 12, t, STEP * 2);
    if (s === 0 || s === 8) kick(t);
    if (s === 4 || s === 12) snap(t);
    if (s % 2 === 1) hat(t, s % 4 === 3 ? 1 : .55);
  }
  function music() {
    arpOut = ctx.createGain(); arpOut.gain.value = .9; arpOut.connect(musicBus); arpOut.connect(delay);
    padOut = ctx.createGain(); padOut.gain.value = 1; padOut.connect(musicBus);
    nextT = ctx.currentTime + .1;
    timer = setInterval(() => {
      if (ctx.state !== 'running') { nextT = ctx.currentTime + .1; return; }
      while (nextT < ctx.currentTime + .15) { schedule(step++, nextT); nextT += STEP; }
    }, 25);
  }

  /* ---------- sound effects ---------- */
  const SFX = {
    hover() { const t = ctx.currentTime; osc('sine', 1760, t, .07, .09, sfxBus); osc('sine', 2637, t + .015, .06, .05, sfxBus); },
    click() { const t = ctx.currentTime; const o = osc('sine', 300, t, .16, .45, sfxBus, .002); o.frequency.exponentialRampToValueAtTime(90, t + .12); nz(t, .05, .12, 'bandpass', 3000, sfxBus, 1.5); },
    page() { // whoosh + low hit for switching pages
      const t = ctx.currentTime, f = nz(t, .45, .25, 'bandpass', 300, sfxBus, .7); f.frequency.exponentialRampToValueAtTime(5000, t + .4);
      const o = osc('sine', 160, t + .3, .5, .45, sfxBus, .004); o.frequency.exponentialRampToValueAtTime(50, t + .7);
    },
    arrive() { const t = ctx.currentTime; [69, 76, 81].forEach((m, i) => osc('triangle', hz(m), t + i * .06, .5, .1, sfxBus)); },
    open() { const t = ctx.currentTime; const o = osc('triangle', 520, t, .2, .14, sfxBus); o.frequency.exponentialRampToValueAtTime(900, t + .12); },
    close() { const t = ctx.currentTime; const o = osc('triangle', 820, t, .18, .12, sfxBus); o.frequency.exponentialRampToValueAtTime(420, t + .12); },
    toggle() { const t = ctx.currentTime; osc('square', 660, t, .07, .06, sfxBus); osc('square', 990, t + .07, .09, .06, sfxBus); },
    step() { const t = ctx.currentTime; osc('sine', hz(76), t, .5, .22, sfxBus); osc('sine', hz(83), t + .1, .7, .2, sfxBus); },
    unlock() {
      const t = ctx.currentTime, f = nz(t, 1, .18, 'bandpass', 400, sfxBus, .8); f.frequency.exponentialRampToValueAtTime(7000, t + .9);
      [69, 73, 76, 81, 85, 88].forEach((m, i) => osc('triangle', hz(m), t + .08 + i * .07, 1.3, .16, sfxBus));
      const o = osc('sine', 110, t + .5, 1.5, .5, sfxBus, .004); o.frequency.exponentialRampToValueAtTime(55, t + 1.6);
    },
    error() { const t = ctx.currentTime; osc('square', 196, t, .22, .09, sfxBus); osc('square', 185, t + .13, .3, .09, sfxBus); }
  };

  /* ---------- control ---------- */
  const LEVEL = .55;
  function fadeTo(v, s = .6) { if (!ctx) return; const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(v, t + s); }
  function start() {
    if (!enabled) return;
    init();
    ctx.resume().then(() => { if (!started) { started = true; music(); } fadeTo(LEVEL, 2); try { sessionStorage.setItem('az.playing', 1); } catch {} });
  }
  function mute(instant) {
    if (!ctx) return;
    if (instant) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(0, ctx.currentTime); ctx.suspend(); }
    else { fadeTo(0, .35); setTimeout(() => !enabled && ctx.suspend(), 400); }
  }
  // if music was already playing on the previous page, try to continue straight away
  // (allowed when the browser remembers the visitor's interaction; otherwise the next click starts it)
  try { if (enabled && sessionStorage.getItem('az.playing')) { init(); ctx.resume().then(() => { if (ctx.state === 'running') { started = true; music(); fadeTo(LEVEL, 1.5); } }); } } catch {}
  const kick0 = () => { start(); ['pointerdown', 'keydown', 'touchstart'].forEach(e => removeEventListener(e, kick0, true)); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, kick0, true));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) mute(true);
    else if (enabled && started) ctx.resume().then(() => { fadeTo(LEVEL, 1); SFX.arrive(); });
  });
  addEventListener('pagehide', () => mute(true));

  let lastHover = 0;
  window.AZSound = {
    play(name) {
      if (!enabled || !ctx || ctx.state !== 'running') return;
      if (name === 'hover') { const n = performance.now(); if (n - lastHover < 60) return; lastHover = n; }
      SFX[name] && SFX[name]();
    },
    toggle() {
      enabled = !enabled;
      try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); if (!enabled) sessionStorage.removeItem('az.playing'); } catch {}
      if (enabled) { start(); setTimeout(() => SFX.toggle(), 80); } else { if (ctx && ctx.state === 'running') SFX.toggle(); mute(false); }
      return enabled;
    },
    get enabled() { return enabled; },
    get state() { return ctx ? ctx.state : 'not started'; }
  };
})();
