/* WZ.Audio — everything synthesized with WebAudio, no files. Unlocks on first gesture, silent when paused. */
(function (WZ) {
  'use strict';

  const A = {
    ctx: null, master: null, sfxG: null, musicG: null, comp: null, noise: null, eng: null,
    muted: false, hardSuspended: false, last: {},

    unlock() {
      if (!A.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { A.ctx = new AC(); } catch (e) { return; }
        const c = A.ctx;
        A.master = c.createGain(); A.master.gain.value = A.muted ? 0 : 0.8;
        A.comp = c.createDynamicsCompressor(); A.comp.threshold.value = -16; A.comp.ratio.value = 6;
        A.sfxG = c.createGain(); A.musicG = c.createGain(); A.musicG.gain.value = 0.5;
        A.sfxG.connect(A.comp); A.musicG.connect(A.comp); A.comp.connect(A.master); A.master.connect(c.destination);
        const len = c.sampleRate, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        A.noise = b;
      }
      if (A.ctx.state === 'suspended' && !A.hardSuspended) A.ctx.resume();
    },
    suspend() { A.hardSuspended = true; if (A.ctx) A.ctx.suspend(); },
    resume() { A.hardSuspended = false; if (A.ctx) A.ctx.resume(); },
    setMuted(m) {
      A.muted = !!m;
      if (A.master) A.master.gain.setTargetAtTime(m ? 0 : 0.8, A.ctx.currentTime, 0.02);
    },

    tone(type, f0, f1, dur, vol, delay) {
      const c = A.ctx; if (!c) return;
      const t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(A.sfxG);
      o.start(t); o.stop(t + dur + 0.03);
    },
    noiseBurst(dur, ftype, f0, f1, vol, delay, q) {
      const c = A.ctx; if (!c) return;
      const t = c.currentTime + (delay || 0);
      const s = c.createBufferSource(); s.buffer = A.noise;
      const f = c.createBiquadFilter(); f.type = ftype; f.Q.value = q || 1;
      f.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(A.sfxG);
      s.start(t, Math.random() * 0.5, dur + 0.05);
    },

    /** Play a named effect. Rate limited per name so dense fights do not melt the mixer. */
    sfx(name, v) {
      if (!A.ctx || A.hardSuspended || A.muted) return;
      v = v == null ? 1 : v;
      const now = A.ctx.currentTime;
      const gap = { gun: 0.05, bonk: 0.06, hit: 0.1, ko: 0.05, thud: 0.08, bag: 0.08, click: 0.03 }[name] || 0;
      if (gap && A.last[name] && now - A.last[name] < gap) return;
      A.last[name] = now;
      switch (name) {
        case 'gun': A.noiseBurst(0.07, 'bandpass', 2200, 900, 0.22 * v, 0, 0.8); A.tone('square', 240, 80, 0.06, 0.1 * v); break;
        case 'bonk': A.tone('triangle', 560, 130, 0.2, 0.5 * v); A.tone('sine', 95, 60, 0.14, 0.45 * v); A.noiseBurst(0.04, 'highpass', 2500, 2500, 0.2 * v); break;
        case 'hit': A.tone('sawtooth', 130, 60, 0.12, 0.22 * v); A.noiseBurst(0.06, 'lowpass', 900, 300, 0.2 * v); break;
        case 'hurt': A.tone('square', 300, 120, 0.18, 0.2 * v); A.tone('sawtooth', 200, 90, 0.2, 0.15 * v); break;
        case 'ko': A.tone('sine', 760, 220, 0.28, 0.3 * v); A.noiseBurst(0.18, 'bandpass', 1200, 400, 0.2 * v); break;
        case 'ram': A.noiseBurst(0.25, 'lowpass', 1400, 120, 0.5 * v); A.tone('sine', 90, 40, 0.25, 0.5 * v); A.tone('triangle', 400, 100, 0.12, 0.25 * v); break;
        case 'crash': A.noiseBurst(0.22, 'lowpass', 700, 100, 0.5 * v); A.tone('sine', 70, 38, 0.2, 0.4 * v); break;
        case 'thud': A.tone('sine', 140, 60, 0.12, 0.35 * v); A.noiseBurst(0.06, 'lowpass', 600, 200, 0.25 * v); break;
        case 'bag': A.noiseBurst(0.12, 'lowpass', 500, 200, 0.28 * v); break;
        case 'grab': A.tone('square', 440, 440, 0.07, 0.16 * v); A.tone('square', 660, 660, 0.07, 0.16 * v, 0.07); A.tone('square', 880, 880, 0.1, 0.16 * v, 0.14); break;
        case 'deliver': A.tone('sine', 880, 880, 0.14, 0.3 * v); A.tone('sine', 1320, 1320, 0.25, 0.3 * v, 0.1); A.noiseBurst(0.1, 'highpass', 5000, 5000, 0.12 * v, 0.1); break;
        case 'deploy': A.tone('sine', 280, 900, 0.2, 0.3 * v); A.noiseBurst(0.18, 'bandpass', 800, 3000, 0.15 * v); break;
        case 'recall': A.tone('sine', 900, 300, 0.2, 0.28 * v); break;
        case 'board': A.tone('triangle', 500, 800, 0.1, 0.25 * v); A.tone('triangle', 800, 1000, 0.1, 0.25 * v, 0.08); break;
        case 'boost': A.noiseBurst(0.5, 'bandpass', 500, 3500, 0.4 * v, 0, 1.5); A.tone('sawtooth', 120, 260, 0.4, 0.2 * v); break;
        case 'click': A.tone('square', 700, 520, 0.05, 0.18 * v); break;
        case 'go': A.tone('square', 440, 440, 0.1, 0.2 * v); A.tone('square', 660, 660, 0.1, 0.2 * v, 0.1); A.tone('square', 880, 880, 0.25, 0.22 * v, 0.2); break;
        case 'beep': A.tone('square', 880, 880, 0.08, 0.16 * v); break;
        case 'revive': A.tone('sine', 400, 1200, 0.3, 0.3 * v); A.tone('sine', 600, 1500, 0.3, 0.2 * v, 0.1); break;
        case 'nanako': A.tone('sawtooth', 500, 90, 0.5, 0.28 * v); A.tone('square', 250, 60, 0.5, 0.15 * v); break;
        case 'win': [523, 659, 784, 1046].forEach((f, i) => A.tone('triangle', f, f, 0.22, 0.3 * v, i * 0.12)); A.tone('square', 1046, 1046, 0.5, 0.15 * v, 0.5); break;
        case 'lose': [440, 370, 311, 220].forEach((f, i) => A.tone('sawtooth', f, f * 0.96, 0.3, 0.2 * v, i * 0.18)); break;
        case 'boom': A.noiseBurst(0.7, 'lowpass', 1500, 80, 0.7 * v); A.tone('sine', 70, 28, 0.6, 0.6 * v); break;
        case 'mine': A.tone('sine', 1250, 1250, 0.05, 0.14 * v); break;
        case 'siren': for (let i = 0; i < 4; i++) A.tone('sawtooth', i % 2 ? 520 : 760, i % 2 ? 760 : 520, 0.22, 0.17 * v, i * 0.22); break;
        case 'wind': A.noiseBurst(0.5, 'bandpass', 500, 1500, 0.28 * v, 0, 1.2); break;
        case 'spawn': A.tone('sine', 200, 260, 0.08, 0.05 * v); break;
        default: break;
      }
    },

    engineStart() {
      if (!A.ctx || A.eng) return;
      const c = A.ctx;
      const o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 400; g.gain.value = 0;
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(A.sfxG);
      o1.start(); o2.start();
      A.eng = { o1, o2, lp, g };
    },
    engineSet(speed01, thr, boosting) {
      const e = A.eng; if (!e) return;
      const t = A.ctx.currentTime, f = 36 + speed01 * 72 + (boosting ? 20 : 0);
      e.o1.frequency.setTargetAtTime(f, t, 0.05);
      e.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
      e.lp.frequency.setTargetAtTime(260 + speed01 * 700 + thr * 220, t, 0.06);
      e.g.gain.setTargetAtTime(A.muted ? 0 : 0.04 + speed01 * 0.05 + thr * 0.02, t, 0.08);
    },
    engineStop() {
      const e = A.eng; if (!e) return;
      A.eng = null;
      const t = A.ctx.currentTime;
      e.g.gain.setTargetAtTime(0, t, 0.05);
      setTimeout(() => { try { e.o1.stop(); e.o2.stop(); } catch (x) { /* already stopped */ } }, 400);
    },
  };

  WZ.Audio = A;
  WZ.Events.on('game:pause', () => A.suspend());
  WZ.Events.on('game:resume', () => A.resume());
})(window.WZ = window.WZ || {});
