/* 殘響 — 音效與環境音（全部以 Web Audio 即時合成，不需要音檔） */
(function () {
  'use strict';
  const KEY = 'echoes-mute';
  const A = { ctx: null, master: null, muted: false, amb: null, ambKind: 'none' };
  try { A.muted = localStorage.getItem(KEY) === '1'; } catch (e) { /* 忽略 */ }

  function ctx() {
    if (!A.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      A.ctx = new C();
      A.master = A.ctx.createGain();
      A.master.gain.value = A.muted ? 0 : 0.55;
      A.master.connect(A.ctx.destination);
    }
    if (A.ctx.state === 'suspended') A.ctx.resume();
    return A.ctx;
  }

  function tone(freq, dur, opt) {
    const c = ctx(); if (!c) return;
    const o = opt || {}, t = c.currentTime + (o.at || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(A.master);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  let noiseBuf = null;
  function noiseBuffer(c) {
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function noise(dur, opt) {
    const c = ctx(); if (!c) return;
    const o = opt || {}, t = c.currentTime + (o.at || 0);
    const src = c.createBufferSource(); src.buffer = noiseBuffer(c);
    const f = c.createBiquadFilter(); f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 1200, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(o.vol == null ? 0.25 : o.vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(A.master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  const SFX = {
    click: () => tone(660, 0.05, { type: 'triangle', vol: 0.06 }),
    point: () => { tone(880, 0.07, { type: 'triangle', vol: 0.1 }); tone(1320, 0.09, { type: 'triangle', vol: 0.08, at: 0.05 }); },
    sys: () => { tone(1568, 0.09, { vol: 0.09 }); tone(2093, 0.22, { vol: 0.08, at: 0.07 }); },
    levelup: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.32, { type: 'triangle', vol: 0.16, at: i * 0.085 })); tone(131, 0.9, { vol: 0.2 }); noise(0.9, { filter: 'highpass', freq: 5000, vol: 0.04, at: 0.3 }); },
    skill: () => { tone(392, 0.25, { type: 'sawtooth', vol: 0.07 }); tone(587, 0.3, { type: 'triangle', vol: 0.14, at: 0.1 }); tone(880, 0.5, { type: 'triangle', vol: 0.13, at: 0.22 }); },
    daily: () => { [659, 880, 1175].forEach((f, i) => tone(f, 0.28, { type: 'triangle', vol: 0.13, at: i * 0.1 })); },
    hit: () => { noise(0.12, { freq: 2600, to: 400, vol: 0.3 }); tone(170, 0.1, { type: 'square', vol: 0.12, to: 80 }); },
    crit: () => { noise(0.18, { freq: 5000, to: 500, vol: 0.38 }); tone(240, 0.16, { type: 'square', vol: 0.16, to: 70 }); tone(1760, 0.2, { vol: 0.07, at: 0.02 }); },
    echo: () => { noise(0.3, { freq: 500, to: 120, vol: 0.3 }); tone(70, 0.35, { type: 'sawtooth', vol: 0.16, to: 40 }); },
    hurt: () => { tone(120, 0.25, { type: 'sawtooth', vol: 0.22, to: 50 }); noise(0.2, { freq: 900, vol: 0.25 }); },
    heavy: () => { tone(60, 0.8, { vol: 0.5, to: 28 }); noise(0.6, { freq: 1800, to: 80, vol: 0.5 }); tone(90, 0.4, { type: 'sawtooth', vol: 0.2, to: 35 }); },
    guard: () => { tone(300, 0.08, { type: 'square', vol: 0.08 }); noise(0.08, { filter: 'highpass', freq: 3000, vol: 0.12 }); },
    dodge: () => noise(0.22, { filter: 'bandpass', freq: 600, to: 4000, vol: 0.18 }),
    charge: () => { tone(110, 0.7, { type: 'sawtooth', vol: 0.13, to: 520, attack: 0.3 }); tone(880, 0.12, { type: 'square', vol: 0.07, at: 0.55 }); tone(880, 0.12, { type: 'square', vol: 0.07, at: 0.72 }); },
    dread: () => { tone(48, 1.0, { vol: 0.45 }); tone(51, 1.0, { vol: 0.3 }); noise(0.5, { freq: 200, vol: 0.2 }); },
    phase: () => { tone(98, 1.2, { type: 'sawtooth', vol: 0.18 }); tone(104, 1.2, { type: 'sawtooth', vol: 0.16 }); tone(1480, 0.5, { type: 'square', vol: 0.05, to: 700 }); },
    heal: () => { tone(523, 0.3, { vol: 0.12, to: 1047 }); tone(784, 0.3, { vol: 0.08, to: 1568, at: 0.08 }); },
    fight: () => { noise(0.1, { freq: 2200, to: 400, vol: 0.22 }); noise(0.1, { freq: 2600, to: 400, vol: 0.22, at: 0.13 }); tone(150, 0.12, { type: 'square', vol: 0.1, to: 70, at: 0.13 }); },
    win: () => { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.5, { type: 'triangle', vol: 0.14, at: i * 0.13 })); tone(98, 1.4, { vol: 0.25 }); },
    bind: () => { tone(41, 2.4, { vol: 0.5, attack: 0.5 }); tone(43.5, 2.4, { vol: 0.3, attack: 0.5 }); noise(1.6, { freq: 120, to: 2400, vol: 0.2 });
      [220, 262, 330, 440, 659].forEach((f, i) => tone(f, 0.9, { type: 'triangle', vol: 0.12, at: 0.7 + i * 0.14 })); },
    fail: () => { tone(330, 0.2, { type: 'triangle', vol: 0.12 }); tone(247, 0.4, { type: 'triangle', vol: 0.12, at: 0.15 }); noise(0.5, { freq: 1500, to: 150, vol: 0.12 }); },
    down: () => { tone(220, 1.6, { type: 'sawtooth', vol: 0.16, to: 40 }); tone(55, 1.8, { vol: 0.3 }); },
  };

  /* 環境音：低頻持續音 + 濾波雜訊，依地點切換 */
  const AMB = {
    none: null,
    city: { f: [0, 0], oscVol: 0, noiseFreq: 420, noiseVol: 0.035, lfo: 0 },
    rift: { f: [55, 55.6], oscVol: 0.07, noiseFreq: 260, noiseVol: 0.05, lfo: 0.08 },
    boss: { f: [49, 52.2], oscVol: 0.1, noiseFreq: 180, noiseVol: 0.05, lfo: 1.6 },
    void: { f: [36.7, 38.2], oscVol: 0.11, noiseFreq: 120, noiseVol: 0.07, lfo: 0.25 },
  };
  function stopAmb() {
    const a = A.amb; if (!a) return; A.amb = null;
    const t = A.ctx.currentTime;
    a.out.gain.cancelScheduledValues(t); a.out.gain.setValueAtTime(a.out.gain.value, t); a.out.gain.linearRampToValueAtTime(0, t + 1.2);
    setTimeout(() => a.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* 已停止 */ } }), 1400);
  }
  function ambient(kind) {
    if (kind === A.ambKind && (A.amb || !AMB[kind])) return;
    A.ambKind = kind;
    const c = A.ctx; if (!c) return; // 尚未有使用者互動
    stopAmb();
    const def = AMB[kind]; if (!def) return;
    const out = c.createGain(); out.gain.value = 0; out.connect(A.master);
    const nodes = [];
    if (def.oscVol) def.f.forEach((f) => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = c.createGain(); g.gain.value = def.oscVol; o.connect(g); g.connect(out); o.start(); nodes.push(o); });
    const src = c.createBufferSource(); src.buffer = noiseBuffer(c); src.loop = true;
    const flt = c.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = def.noiseFreq;
    const ng = c.createGain(); ng.gain.value = def.noiseVol * 4;
    src.connect(flt); flt.connect(ng); ng.connect(out); src.start(); nodes.push(src);
    if (def.lfo) { const l = c.createOscillator(); l.frequency.value = def.lfo; const lg = c.createGain(); lg.gain.value = 0.35; l.connect(lg); lg.connect(out.gain); l.start(); nodes.push(l); }
    out.gain.linearRampToValueAtTime(1, c.currentTime + 1.5);
    A.amb = { out, nodes };
  }

  window.Sound = {
    play(name) { if (A.muted || !SFX[name]) return; try { SFX[name](); } catch (e) { /* 音效失敗不影響遊戲 */ } },
    ambient(kind) { try { ambient(kind); } catch (e) { /* 忽略 */ } },
    unlock() { const c = ctx(); if (c && A.ambKind !== 'none' && !A.amb) { const k = A.ambKind; A.ambKind = 'none'; ambient(k); } },
    get muted() { return A.muted; },
    toggle() {
      A.muted = !A.muted;
      try { localStorage.setItem(KEY, A.muted ? '1' : '0'); } catch (e) { /* 忽略 */ }
      if (A.master) A.master.gain.value = A.muted ? 0 : 0.55;
      return A.muted;
    },
  };
})();
