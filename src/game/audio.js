/* WZ.Audio — WebAudio synthesizer with map-specific background music & atmospheric vibes + multi-layered SFX.
 * Unlocks on first gesture, adapts music to each map theme ('village', 'jurassic', 'volcanic', 'frozen', 'harbor', 'shop'), silent when paused. */
(function (WZ) {
  'use strict';

  // Musical themes per map (Season 1..5) + Shop
  // Midi note helper: 60 = C4 (261.63 Hz)
  const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const THEMES = {
    // Season 1: Desert Village — Warm Middle-Eastern / Tactical Phrygian Groove
    village: {
      bpm: 112,
      bass: [38, 0, 38, 38, 41, 0, 40, 38, 38, 0, 38, 43, 41, 0, 39, 38],
      lead: [62, 0, 63, 66, 67, 66, 63, 62, 69, 0, 67, 66, 63, 66, 62, 0],
      pad: [50, 57, 62],
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
      snare: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
      hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      leadWave: 'triangle', bassWave: 'sawtooth', bassCut: 260, leadCut: 1650, windFreq: 420,
    },
    // Season 2: Jurassic Valley — Primal Jungle Adventure (Tribal Percussion & Marimba Motif)
    jurassic: {
      bpm: 118,
      bass: [33, 0, 33, 40, 36, 0, 36, 43, 38, 0, 38, 45, 36, 0, 40, 38],
      lead: [69, 67, 64, 0, 60, 62, 64, 0, 67, 69, 72, 69, 67, 64, 62, 0],
      pad: [45, 52, 57],
      kick: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1],
      snare: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1],
      hat: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
      leadWave: 'sine', bassWave: 'triangle', bassCut: 290, leadCut: 1900, windFreq: 560,
    },
    // Season 3: Volcanic Wasteland — Driving Dark Synth / Heavy Action Groove
    volcanic: {
      bpm: 126,
      bass: [40, 40, 40, 40, 43, 43, 41, 41, 40, 40, 40, 40, 36, 36, 38, 38],
      lead: [64, 0, 67, 0, 71, 69, 67, 64, 65, 0, 69, 0, 67, 65, 64, 62],
      pad: [40, 47, 52],
      kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      leadWave: 'sawtooth', bassWave: 'sawtooth', bassCut: 340, leadCut: 1350, windFreq: 160,
    },
    // Season 4: Frozen Frontier — Crisp Arctic Crystalline Synth & Nordic Chimes
    frozen: {
      bpm: 114,
      bass: [36, 0, 36, 43, 32, 0, 32, 39, 34, 0, 34, 41, 31, 0, 38, 36],
      lead: [72, 67, 63, 67, 74, 67, 63, 67, 75, 70, 65, 70, 74, 67, 62, 67],
      pad: [48, 55, 63],
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1],
      leadWave: 'sine', bassWave: 'triangle', bassCut: 240, leadCut: 2400, windFreq: 950,
    },
    // Season 5: Sunken Harbor — Funky Cyber-Mech Naval Tactical Beat
    harbor: {
      bpm: 120,
      bass: [31, 31, 0, 34, 36, 0, 38, 34, 31, 31, 0, 38, 39, 0, 36, 34],
      lead: [67, 0, 70, 67, 74, 0, 72, 70, 67, 0, 65, 62, 63, 65, 67, 0],
      pad: [43, 50, 58],
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1],
      leadWave: 'triangle', bassWave: 'sawtooth', bassCut: 310, leadCut: 1550, windFreq: 320,
    },
    // Shop / Motor Pool — Smooth Garage Lo-Fi Tactical Beat
    shop: {
      bpm: 96,
      bass: [38, 0, 38, 45, 34, 0, 34, 41, 36, 0, 36, 43, 33, 0, 40, 38],
      lead: [62, 0, 65, 69, 0, 65, 62, 0, 60, 0, 64, 67, 0, 64, 60, 0],
      pad: [50, 57, 65],
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
      leadWave: 'triangle', bassWave: 'triangle', bassCut: 220, leadCut: 1200, windFreq: 0,
    },
  };

  const A = {
    ctx: null, master: null, sfxG: null, musicG: null, musicLP: null, comp: null, noise: null, eng: null,
    muted: false, hardSuspended: false, last: {},
    curScene: 'menu', curTheme: 'village', _mTimer: 0, _mStep: 0, _mNextT: 0, _amb: null,

    unlock() {
      if (!A.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { A.ctx = new AC(); } catch (e) { return; }
        const c = A.ctx;
        A.master = c.createGain(); A.master.gain.value = A.muted ? 0 : 0.82;
        A.comp = c.createDynamicsCompressor();
        A.comp.threshold.value = -14; A.comp.knee.value = 12; A.comp.ratio.value = 4;
        A.sfxG = c.createGain(); A.sfxG.gain.value = 0.85;
        A.musicG = c.createGain(); A.musicG.gain.value = 0.34;
        A.musicLP = c.createBiquadFilter(); A.musicLP.type = 'lowpass'; A.musicLP.frequency.value = 2200;
        A.sfxG.connect(A.comp);
        A.musicLP.connect(A.musicG); A.musicG.connect(A.comp);
        A.comp.connect(A.master); A.master.connect(c.destination);
        const len = c.sampleRate, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        A.noise = b;
        A._startMusicLoop();
      }
      if (A.ctx.state === 'suspended' && !A.hardSuspended) A.ctx.resume();
    },

    suspend() { A.hardSuspended = true; if (A.ctx) A.ctx.suspend(); },
    resume() { A.hardSuspended = false; if (A.ctx) A.ctx.resume(); },
    setMuted(m) {
      A.muted = !!m;
      if (A.master) A.master.gain.setTargetAtTime(m ? 0 : 0.82, A.ctx.currentTime, 0.03);
    },

    /** Switch background music & atmospheric vibe for the current scene & map theme */
    setMusic(scene, theme) {
      if (scene) A.curScene = scene;
      if (theme && THEMES[theme]) A.curTheme = theme;
      else if (WZ.Save && WZ.Save.data && WZ.Save.data.settings && THEMES[WZ.Save.data.settings.map]) {
        A.curTheme = WZ.Save.data.settings.map;
      }
      if (A.ctx) {
        A._updateAmbience();
        const vol = A.curScene === 'mission' ? 0.34 : A.curScene === 'shop' ? 0.28 : 0.3;
        A.musicG.gain.setTargetAtTime(vol, A.ctx.currentTime, 0.15);
      }
    },

    _updateAmbience() {
      const c = A.ctx;
      if (!c || !A.noise) return;
      const key = A.curScene === 'shop' ? 'shop' : (A.curTheme || 'village');
      const th = THEMES[key] || THEMES.village;
      if (!th.windFreq) {
        if (A._amb) A._amb.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.3);
        return;
      }
      if (!A._amb) {
        const src = c.createBufferSource();
        src.buffer = A.noise; src.loop = true;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.8; bp.frequency.value = th.windFreq;
        const g = c.createGain(); g.gain.value = 0.015;
        src.connect(bp); bp.connect(g); g.connect(A.musicLP);
        src.start();
        A._amb = { src, bp, g };
      } else {
        A._amb.bp.frequency.setTargetAtTime(th.windFreq, c.currentTime, 0.4);
        A._amb.g.gain.setTargetAtTime(A.curScene === 'mission' ? 0.022 : 0.014, c.currentTime, 0.4);
      }
    },

    _startMusicLoop() {
      if (A._mTimer) clearInterval(A._mTimer);
      A._mStep = 0;
      A._mNextT = A.ctx ? A.ctx.currentTime + 0.08 : 0;
      A._updateAmbience();
      A._mTimer = setInterval(() => {
        const c = A.ctx;
        if (!c || A.hardSuspended || A.muted || c.state !== 'running') {
          if (c) A._mNextT = c.currentTime + 0.08;
          return;
        }
        const key = A.curScene === 'shop' ? 'shop' : (A.curTheme || 'village');
        const th = THEMES[key] || THEMES.village;
        const stepDur = (60 / th.bpm) / 4; // 16th note
        const now = c.currentTime;
        if (A._mNextT < now - 0.1) A._mNextT = now + 0.02;
        while (A._mNextT < now + 0.24) {
          A._scheduleStep(th, A._mStep, A._mNextT, stepDur);
          A._mStep = (A._mStep + 1) % 32;
          A._mNextT += stepDur;
        }
      }, 90);
    },

    _scheduleStep(th, step, t, dur) {
      const c = A.ctx, i = step % 16, bar2 = step >= 16;
      // 1. Warm Pad Chord on step 0 and 16
      if (i === 0 && th.pad) {
        const shift = bar2 ? -2 : 0;
        for (let k = 0; k < th.pad.length; k++) {
          const o = c.createOscillator(), g = c.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(m2f(th.pad[k] + shift), t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.032, t + dur * 2);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 15.5);
          o.connect(g); g.connect(A.musicLP);
          o.start(t); o.stop(t + dur * 16);
        }
      }
      // 2. Bassline
      const bn = th.bass[i];
      if (bn > 0) {
        const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
        o.type = th.bassWave || 'triangle';
        const f = m2f(bn + (bar2 && i >= 12 ? 2 : 0));
        o.frequency.setValueAtTime(f, t);
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(th.bassCut * 1.4, t);
        lp.frequency.exponentialRampToValueAtTime(th.bassCut * 0.65, t + dur * 1.6);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.11, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.75);
        o.connect(lp); lp.connect(g); g.connect(A.musicLP);
        o.start(t); o.stop(t + dur * 1.85);
      }
      // 3. Lead Motif (plays cleanly, slightly varied on second bar)
      const ln = th.lead[i];
      if (ln > 0 && (!bar2 || i % 2 === 0)) {
        const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
        o.type = th.leadWave || 'triangle';
        const note = ln + (bar2 && i === 14 ? 2 : 0);
        o.frequency.setValueAtTime(m2f(note), t);
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(th.leadCut, t);
        lp.frequency.exponentialRampToValueAtTime(th.leadCut * 0.45, t + dur * 1.8);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.052, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.9);
        o.connect(lp); lp.connect(g); g.connect(A.musicLP);
        o.start(t); o.stop(t + dur * 2.0);
      }
      // 4. Percussion (Kick, Snare/Rim, Hi-Hat)
      if (th.kick[i]) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(118, t);
        o.frequency.exponentialRampToValueAtTime(36, t + 0.11);
        g.gain.setValueAtTime(0.16, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        o.connect(g); g.connect(A.musicLP);
        o.start(t); o.stop(t + 0.15);
      }
      if (th.snare[i] && A.noise) {
        const s = c.createBufferSource(); s.buffer = A.noise;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1450; bp.Q.value = 1.2;
        const g = c.createGain();
        g.gain.setValueAtTime(0.065, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        s.connect(bp); bp.connect(g); g.connect(A.musicLP);
        s.start(t, 0.1, 0.1);
      }
      if (th.hat[i] && A.noise) {
        const s = c.createBufferSource(); s.buffer = A.noise;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5800;
        const g = c.createGain();
        g.gain.setValueAtTime((i % 4 === 0 ? 0.028 : 0.016), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.038);
        s.connect(hp); hp.connect(g); g.connect(A.musicLP);
        s.start(t, 0.2, 0.045);
      }
    },

    tone(type, f0, f1, dur, vol, delay) {
      const c = A.ctx; if (!c) return;
      const t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(A.sfxG);
      o.start(t); o.stop(t + dur + 0.03);
    },
    noiseBurst(dur, ftype, f0, f1, vol, delay, q) {
      const c = A.ctx; if (!c || !A.noise) return;
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
      const gap = { gun: 0.05, tshot: 0.045, bonk: 0.06, hit: 0.09, ko: 0.05, thud: 0.08, bag: 0.08, click: 0.03, heli: 0.18, mortar: 0.12, club: 0.2, roar: 0.4, blast: 0.06, burn: 0.3, ignite: 0.4, tank: 0.22, cannon: 0.1, jet: 0.5, whistle: 0.07, dflame: 0.16, dino: 0.5, pickup: 0.1, rumble: 0.35 }[name] || 0;
      if (gap && A.last[name] && now - A.last[name] < gap) return;
      A.last[name] = now;
      switch (name) {
        case 'gun':
          A.noiseBurst(0.065, 'bandpass', 2400, 850, 0.2 * v, 0, 1.1);
          A.tone('triangle', 260, 72, 0.055, 0.16 * v);
          A.tone('sine', 120, 48, 0.05, 0.12 * v);
          break;
        case 'bonk':
          A.tone('triangle', 620, 150, 0.18, 0.42 * v);
          A.tone('sine', 130, 58, 0.14, 0.4 * v);
          A.noiseBurst(0.045, 'bandpass', 2800, 1200, 0.18 * v);
          break;
        case 'hit':
          A.tone('triangle', 165, 62, 0.11, 0.26 * v);
          A.noiseBurst(0.055, 'lowpass', 1100, 320, 0.2 * v);
          break;
        case 'hurt':
          A.tone('triangle', 320, 115, 0.16, 0.22 * v);
          A.tone('sawtooth', 190, 85, 0.16, 0.11 * v);
          break;
        case 'ko':
          A.tone('sine', 720, 210, 0.24, 0.26 * v);
          A.tone('triangle', 480, 140, 0.22, 0.15 * v, 0.02);
          A.noiseBurst(0.14, 'bandpass', 1400, 420, 0.16 * v);
          break;
        case 'ram':
          A.noiseBurst(0.22, 'lowpass', 1500, 130, 0.45 * v);
          A.tone('sine', 105, 42, 0.22, 0.48 * v);
          A.tone('triangle', 380, 95, 0.12, 0.24 * v);
          break;
        case 'crash':
          A.noiseBurst(0.2, 'lowpass', 850, 110, 0.42 * v);
          A.tone('sine', 82, 38, 0.18, 0.38 * v);
          break;
        case 'thud':
          A.tone('sine', 145, 55, 0.12, 0.32 * v);
          A.noiseBurst(0.055, 'lowpass', 650, 200, 0.2 * v);
          break;
        case 'bag':
          A.noiseBurst(0.11, 'lowpass', 520, 200, 0.24 * v);
          break;
        case 'grab':
          A.tone('triangle', 523.25, 523.25, 0.07, 0.2 * v);
          A.tone('triangle', 659.25, 659.25, 0.07, 0.2 * v, 0.06);
          A.tone('sine', 783.99, 1046.5, 0.12, 0.24 * v, 0.12);
          break;
        case 'deliver':
          A.tone('triangle', 587.33, 587.33, 0.09, 0.25 * v);
          A.tone('triangle', 880, 880, 0.12, 0.28 * v, 0.07);
          A.tone('sine', 1174.66, 1174.66, 0.22, 0.3 * v, 0.14);
          break;
        case 'deploy':
          A.tone('sine', 330, 784, 0.18, 0.26 * v);
          A.tone('triangle', 440, 880, 0.16, 0.16 * v, 0.03);
          A.noiseBurst(0.14, 'bandpass', 900, 2600, 0.12 * v);
          break;
        case 'recall':
          A.tone('sine', 784, 330, 0.18, 0.24 * v);
          break;
        case 'board':
          A.tone('triangle', 523.25, 783.99, 0.1, 0.24 * v);
          A.tone('sine', 783.99, 1046.5, 0.12, 0.24 * v, 0.07);
          break;
        case 'boost':
          A.noiseBurst(0.42, 'bandpass', 600, 3200, 0.32 * v, 0, 1.4);
          A.tone('triangle', 130, 290, 0.36, 0.22 * v);
          break;
        case 'click':
          A.tone('triangle', 820, 480, 0.04, 0.18 * v);
          A.tone('sine', 1240, 640, 0.03, 0.1 * v);
          break;
        case 'go':
          A.tone('triangle', 523.25, 523.25, 0.09, 0.22 * v);
          A.tone('triangle', 659.25, 659.25, 0.09, 0.22 * v, 0.09);
          A.tone('sine', 1046.5, 1046.5, 0.24, 0.28 * v, 0.18);
          break;
        case 'beep':
          A.tone('triangle', 740, 680, 0.07, 0.15 * v);
          break;
        case 'revive':
          A.tone('sine', 440, 1174, 0.28, 0.26 * v);
          A.tone('triangle', 660, 1320, 0.28, 0.18 * v, 0.09);
          break;
        case 'nanako':
          A.tone('triangle', 480, 95, 0.45, 0.26 * v);
          A.tone('sawtooth', 240, 65, 0.45, 0.12 * v);
          break;
        case 'win':
          [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
            A.tone('triangle', f, f, 0.24, 0.26 * v, i * 0.1);
            A.tone('sine', f * 0.5, f * 0.5, 0.26, 0.14 * v, i * 0.1);
          });
          break;
        case 'lose':
          [392, 349.23, 311.13, 261.63].forEach((f, i) => {
            A.tone('triangle', f, f * 0.97, 0.28, 0.22 * v, i * 0.16);
          });
          break;
        case 'boom':
          A.noiseBurst(0.62, 'lowpass', 1400, 75, 0.62 * v);
          A.tone('sine', 78, 28, 0.55, 0.55 * v);
          A.tone('triangle', 160, 42, 0.25, 0.24 * v);
          break;
        case 'blast':
          A.noiseBurst(0.85, 'lowpass', 1700, 68, 0.72 * v);
          A.tone('sine', 66, 24, 0.7, 0.65 * v);
          A.tone('triangle', 150, 38, 0.3, 0.24 * v);
          A.noiseBurst(0.45, 'bandpass', 600, 180, 0.25 * v, 0.15);
          break;
        case 'ignite':
          A.noiseBurst(0.48, 'bandpass', 750, 2400, 0.26 * v, 0, 1.2);
          A.tone('triangle', 95, 195, 0.28, 0.12 * v);
          break;
        case 'burn':
          A.noiseBurst(0.2, 'highpass', 3000, 2200, 0.08 * v);
          A.noiseBurst(0.16, 'bandpass', 850, 580, 0.1 * v, 0.06);
          break;
        case 'tank':
          A.noiseBurst(0.15, 'lowpass', 240, 110, 0.16 * v);
          A.tone('triangle', 52, 42, 0.14, 0.08 * v);
          break;
        case 'cannon':
          A.noiseBurst(0.32, 'lowpass', 1300, 110, 0.5 * v);
          A.tone('sine', 115, 38, 0.28, 0.5 * v);
          A.tone('triangle', 380, 88, 0.1, 0.22 * v);
          break;
        case 'tshot':
          A.noiseBurst(0.045, 'bandpass', 3000, 1500, 0.13 * v, 0, 1.1);
          A.tone('triangle', 380, 130, 0.04, 0.08 * v);
          break;
        case 'build':
          A.tone('triangle', 220, 587, 0.22, 0.18 * v);
          A.tone('sine', 130, 62, 0.15, 0.26 * v, 0.16);
          A.noiseBurst(0.1, 'lowpass', 950, 260, 0.16 * v, 0.16);
          break;
        case 'mine':
          A.tone('sine', 1180, 1180, 0.045, 0.12 * v);
          break;
        case 'siren':
          for (let i = 0; i < 4; i++) A.tone('triangle', i % 2 ? 520 : 740, i % 2 ? 740 : 520, 0.2, 0.15 * v, i * 0.2);
          break;
        case 'wind':
          A.noiseBurst(0.45, 'bandpass', 520, 1400, 0.24 * v, 0, 1.2);
          break;
        case 'roar':
          A.tone('sawtooth', 125, 52, 0.5, 0.24 * v);
          A.tone('triangle', 85, 42, 0.48, 0.2 * v);
          A.noiseBurst(0.45, 'lowpass', 620, 140, 0.26 * v);
          break;
        case 'club':
          A.tone('sine', 88, 32, 0.35, 0.62 * v);
          A.noiseBurst(0.28, 'lowpass', 980, 95, 0.45 * v);
          A.tone('triangle', 280, 85, 0.12, 0.25 * v);
          break;
        case 'swish':
          A.noiseBurst(0.32, 'bandpass', 380, 1450, 0.2 * v, 0, 1.2);
          break;
        case 'mortar':
          A.tone('sine', 230, 52, 0.24, 0.42 * v);
          A.noiseBurst(0.18, 'lowpass', 1250, 190, 0.35 * v);
          break;
        case 'heli':
          A.noiseBurst(0.13, 'lowpass', 210, 105, 0.22 * v);
          A.tone('triangle', 58, 46, 0.12, 0.06 * v);
          break;
        case 'jet':
          A.noiseBurst(1.9, 'bandpass', 200, 1750, 0.36 * v, 0, 0.9);
          A.noiseBurst(1.4, 'lowpass', 520, 210, 0.26 * v, 0.25);
          A.tone('triangle', 75, 215, 1.4, 0.12 * v);
          break;
        case 'whistle':
          A.tone('sine', 1600, 390, 0.78, 0.045 * v);
          break;
        case 'dflame':
          A.noiseBurst(0.32, 'bandpass', 680, 250, 0.26 * v, 0, 0.7);
          A.tone('triangle', 72, 48, 0.28, 0.06 * v);
          break;
        case 'dino':
          A.tone('sawtooth', 185, 50, 0.8, 0.28 * v);
          A.tone('triangle', 95, 40, 0.78, 0.2 * v);
          A.noiseBurst(0.7, 'lowpass', 880, 120, 0.3 * v);
          break;
        case 'pickup':
          [587.33, 880, 1174.66].forEach((f, i) => A.tone('sine', f, f * 1.01, 0.18, 0.24 * v, i * 0.065));
          break;
        case 'clock':
          [783.99, 1046.5, 1567.98].forEach((f, i) => A.tone('triangle', f, f, 0.14, 0.22 * v, i * 0.075));
          break;
        case 'rumble':
          A.noiseBurst(0.95, 'lowpass', 210, 52, 0.48 * v);
          A.tone('sine', 54, 28, 0.9, 0.44 * v);
          break;
        case 'spawn':
          A.tone('sine', 220, 280, 0.07, 0.045 * v);
          break;
        default: break;
      }
    },

    /** Smooth, subtle low-rumble vehicle engine (never harsh or grating) */
    engineStart() {
      if (!A.ctx || A.eng) return;
      const c = A.ctx;
      const o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
      o1.type = 'triangle'; o2.type = 'sine';
      lp.type = 'lowpass'; lp.frequency.value = 180;
      g.gain.value = 0;
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(A.sfxG);
      o1.start(); o2.start();
      A.eng = { o1, o2, lp, g };
    },
    engineSet(speed01, thr, boosting) {
      const e = A.eng; if (!e) return;
      const t = A.ctx.currentTime, f = 34 + speed01 * 56 + (boosting ? 16 : 0);
      e.o1.frequency.setTargetAtTime(f, t, 0.06);
      e.o2.frequency.setTargetAtTime(f * 0.5, t, 0.06);
      e.lp.frequency.setTargetAtTime(140 + speed01 * 240 + thr * 90, t, 0.07);
      e.g.gain.setTargetAtTime(A.muted ? 0 : 0.012 + speed01 * 0.022 + thr * 0.008, t, 0.08);
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
