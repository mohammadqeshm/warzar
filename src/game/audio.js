/* WZ.Audio — WebAudio synthesizer: map-specific musical soundtracks, a calm natural engine loop, punchy impact / explosion effects and a distance-driven tornado wind.
 * Music stays 100% tonal. Impacts, explosions, the engine texture and the wind use short FILTERED NOISE (a shared pre-rendered buffer, enveloped so it is click-free and never hisses
 * or rings on): low-frequency sines alone are inaudible on phone / laptop speakers, which is why collisions used to be silent. */
(function (WZ) {
  'use strict';

  // MIDI note to Hz (60 = C4 = 261.63 Hz)
  const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Distinct musical themes & vibes per map (Season 1..5) + Shop
  const THEMES = {
    // Season 1: Desert Village — Warm Desert Tactical Groove (D Phrygian Dominant / Oud & Brass Motif)
    village: {
      bpm: 110,
      bass: [38, 0, 38, 0, 41, 0, 40, 38, 38, 0, 38, 43, 41, 0, 39, 38],
      lead: [62, 0, 63, 66, 67, 66, 63, 62, 69, 0, 67, 66, 63, 66, 62, 0],
      arp:  [50, 57, 62, 57, 50, 58, 62, 58, 50, 57, 62, 66, 63, 62, 57, 50],
      pad:  [50, 57, 62],
      pad2: [49, 55, 62],
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
      snare:[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      tom:  [0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0],
      hat:  [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0],
      style: 'oud', bassWave: 'triangle', bassCut: 240, leadCut: 1850,
    },
    // Season 2: Jurassic Valley — Primal Jungle Marimba & Tribal Wood Percussion (A Dorian Adventure)
    jurassic: {
      bpm: 116,
      bass: [33, 0, 33, 40, 36, 0, 36, 43, 38, 0, 38, 45, 36, 0, 40, 38],
      lead: [69, 67, 64, 0, 60, 62, 64, 0, 67, 69, 72, 69, 67, 64, 62, 0],
      arp:  [57, 64, 69, 64, 60, 67, 72, 67, 62, 69, 74, 69, 60, 64, 67, 64],
      pad:  [45, 52, 57, 64],
      pad2: [48, 55, 60, 67],
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0],
      snare:[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      tom:  [0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0],
      hat:  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
      style: 'marimba', bassWave: 'triangle', bassCut: 260, leadCut: 2100,
    },
    // Season 3: Volcanic Wasteland — Heavy Analog Synthwave & Seismic Taiko Action (E Minor / Phrygian)
    volcanic: {
      bpm: 122,
      bass: [40, 0, 40, 40, 43, 0, 41, 41, 40, 0, 40, 40, 36, 0, 38, 38],
      lead: [64, 0, 67, 0, 71, 69, 67, 64, 65, 0, 69, 0, 67, 65, 64, 62],
      arp:  [52, 59, 64, 59, 55, 62, 67, 62, 53, 60, 65, 60, 50, 57, 62, 57],
      pad:  [40, 47, 52, 59],
      pad2: [41, 48, 53, 60],
      kick: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0],
      snare:[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      tom:  [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
      hat:  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
      style: 'brass', bassWave: 'sawtooth', bassCut: 280, leadCut: 1450,
    },
    // Season 4: Frozen Frontier — Crystalline Electric Piano, Aurora Chimes & Nordic Pulse (C Dorian)
    frozen: {
      bpm: 112,
      bass: [36, 0, 36, 43, 32, 0, 32, 39, 34, 0, 34, 41, 31, 0, 38, 36],
      lead: [72, 0, 67, 63, 74, 0, 67, 63, 75, 0, 70, 65, 74, 0, 67, 62],
      arp:  [60, 67, 72, 75, 56, 63, 68, 72, 58, 65, 70, 74, 55, 62, 67, 70],
      pad:  [48, 55, 63, 67],
      pad2: [44, 51, 60, 63],
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0],
      snare:[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      tom:  [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      hat:  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      style: 'crystal', bassWave: 'sine', bassCut: 220, leadCut: 2600,
    },
    // Season 5: Sunken Harbor — Naval Stealth Funk-Synth, Deep Sub & Sonar Ping (G Dorian)
    harbor: {
      bpm: 118,
      bass: [31, 31, 0, 34, 36, 0, 38, 34, 31, 31, 0, 38, 39, 0, 36, 34],
      lead: [67, 0, 70, 67, 74, 0, 72, 70, 67, 0, 65, 62, 63, 65, 67, 0],
      arp:  [55, 62, 67, 62, 58, 65, 70, 65, 55, 62, 69, 62, 53, 60, 65, 60],
      pad:  [43, 50, 58, 62],
      pad2: [41, 48, 55, 60],
      kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
      snare:[0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
      tom:  [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      hat:  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
      style: 'sonar', bassWave: 'sawtooth', bassCut: 270, leadCut: 1700,
    },
    // Shop / Motor Pool — Chill Garage Lo-Fi Rhodes & Warm Sub Bass
    shop: {
      bpm: 94,
      bass: [38, 0, 38, 45, 34, 0, 34, 41, 36, 0, 36, 43, 33, 0, 40, 38],
      lead: [62, 0, 65, 69, 0, 65, 62, 0, 60, 0, 64, 67, 0, 64, 60, 0],
      arp:  [50, 57, 62, 65, 46, 53, 58, 62, 48, 55, 60, 64, 45, 52, 57, 61],
      pad:  [50, 57, 62, 65],
      pad2: [48, 55, 60, 64],
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      snare:[0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      tom:  [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      hat:  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      style: 'crystal', bassWave: 'triangle', bassCut: 210, leadCut: 1350,
    },
  };

  /** Helper: create a GainNode pre-zeroed to 0.0001 so it NEVER defaults to 1.0 on quantum boundaries */
  function safeGain(c, initVal) {
    const g = c.createGain();
    g.gain.value = initVal != null ? initVal : 0.0001;
    return g;
  }

  /** Helper: disconnect nodes cleanly after oscillator finishes to prevent graph bloat */
  function autoClean(osc, nodeToDisconnect) {
    osc.onended = () => {
      try { nodeToDisconnect.disconnect(); } catch (e) { /* ignore */ }
    };
  }

  const A = {
    ctx: null,
    master: null,
    sfxG: null,
    sfxLP: null,
    musicG: null,
    musicLP: null,
    echoIn: null,
    comp: null,
    eng: null,
    userMuted: false,
    platformMuted: false,
    get muted() { return !!(A.userMuted || A.platformMuted); },
    set muted(v) { A.userMuted = !!v; },
    hardSuspended: false,
    last: {},
    curScene: 'menu',
    curTheme: 'village',
    _mTimer: 0,
    _mStep: 0,
    _mNextT: 0,
    _voices: 0,

    _applyGain() {
      if (!A.master || !A.ctx) return;
      const silent = A.muted || A.hardSuspended;
      try {
        A.master.gain.setTargetAtTime(silent ? 0 : 0.84, A.ctx.currentTime, 0.02);
      } catch (e) { /* ignore */ }
    },

    unlock() {
      if (!A.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { A.ctx = new AC(); } catch (e) { return; }
        const c = A.ctx;

        // Master output & studio compressor/limiter (prevents any clipping or sudden peaks)
        A.master = safeGain(c, A.muted ? 0 : 0.84);

        A.comp = c.createDynamicsCompressor();
        A.comp.threshold.value = -10;
        A.comp.knee.value = 8;
        A.comp.ratio.value = 6;
        A.comp.attack.value = 0.002;
        A.comp.release.value = 0.14;

        // SFX bus with warm high-cut filter so no sound is ever piercing or noisy
        A.sfxG = safeGain(c, 0.86);
        A.sfxLP = c.createBiquadFilter();
        A.sfxLP.type = 'lowpass';
        A.sfxLP.frequency.value = 3600;
        A.sfxLP.Q.value = 0.5;
        A.sfxG.connect(A.sfxLP);
        A.sfxLP.connect(A.comp);

        // Music bus with warm lowpass + subtle stereo delay space
        A.musicG = safeGain(c, 0.32);
        A.musicLP = c.createBiquadFilter();
        A.musicLP.type = 'lowpass';
        A.musicLP.frequency.value = 2400;
        A.musicLP.Q.value = 0.5;
        A.musicLP.connect(A.musicG);
        A.musicG.connect(A.comp);

        // Subtle warm echo send for musical leads/chimes
        A.echoIn = safeGain(c, 0.22);
        const dly = c.createDelay(1.0);
        dly.delayTime.value = 0.26;
        const fb = safeGain(c, 0.22);
        const dlp = c.createBiquadFilter();
        dlp.type = 'lowpass';
        dlp.frequency.value = 1400;
        dlp.Q.value = 0.5;
        A.echoIn.connect(dly);
        dly.connect(dlp);
        dlp.connect(A.musicLP);
        dlp.connect(fb);
        fb.connect(dly);

        A.comp.connect(A.master);
        A.master.connect(c.destination);

        A._startMusicLoop();
      }
      if (A.ctx.state === 'suspended' && !A.hardSuspended && !A.platformMuted) {
        A.ctx.resume().catch(() => {});
      }
    },

    suspend() {
      A.hardSuspended = true;
      A._applyGain();
      if (A.ctx) A.ctx.suspend().catch(() => {});
    },
    resume() {
      if (WZ.Main && WZ.Main.paused) return;
      A.hardSuspended = false;
      A._applyGain();
      if (A.ctx && !A.platformMuted) A.ctx.resume().catch(() => {});
    },
    setMuted(m) {
      A.userMuted = !!m;
      A._applyGain();
    },
    setPlatformMuted(m) {
      A.platformMuted = !!m;
      A._applyGain();
      if (A.ctx) {
        if (A.platformMuted) A.ctx.suspend().catch(() => {});
        else if (!A.hardSuspended) A.ctx.resume().catch(() => {});
      }
    },

    /** Switch background music & atmospheric vibe for the current scene & map theme */
    setMusic(scene, theme) {
      if (scene) A.curScene = scene;
      if (theme && THEMES[theme]) A.curTheme = theme;
      else if (WZ.Save && WZ.Save.data && WZ.Save.data.settings && THEMES[WZ.Save.data.settings.map]) {
        A.curTheme = WZ.Save.data.settings.map;
      }
      if (A.ctx && A.musicG) {
        const vol = A.curScene === 'mission' ? 0.32 : A.curScene === 'shop' ? 0.28 : 0.30;
        A.musicG.gain.setTargetAtTime(vol, A.ctx.currentTime, 0.18);
      }
    },

    _startMusicLoop() {
      if (A._mTimer) clearInterval(A._mTimer);
      A._mStep = 0;
      A._mNextT = A.ctx ? A.ctx.currentTime + 0.06 : 0;
      A._mTimer = setInterval(() => {
        const c = A.ctx;
        if (!c || A.hardSuspended || A.muted || c.state !== 'running') {
          if (c) A._mNextT = c.currentTime + 0.06;
          return;
        }
        const key = A.curScene === 'shop' ? 'shop' : (A.curTheme || 'village');
        const th = THEMES[key] || THEMES.village;
        const stepDur = (60 / th.bpm) / 4; // 16th note
        const now = c.currentTime;
        // Never allow scheduling in the past or dangerously close to the current audio quantum
        if (A._mNextT < now + 0.015) A._mNextT = now + 0.03;
        while (A._mNextT < now + 0.22) {
          A._scheduleStep(th, A._mStep, A._mNextT, stepDur);
          A._mStep = (A._mStep + 1) % 32;
          A._mNextT += stepDur;
        }
      }, 80);
    },

    _scheduleStep(th, step, t, dur) {
      const c = A.ctx, i = step % 16, bar2 = step >= 16;

      // 1. Lush Warm Chord Pad on step 0 and 16
      const padNotes = bar2 ? (th.pad2 || th.pad) : th.pad;
      if (i === 0 && padNotes) {
        for (let k = 0; k < padNotes.length; k++) {
          const o = c.createOscillator(), g = safeGain(c, 0.0001);
          o.type = k % 2 === 0 ? 'sine' : 'triangle';
          o.frequency.setValueAtTime(m2f(padNotes[k]), t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(k === 0 ? 0.032 : 0.020, t + dur * 3.0);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 15.8);
          o.connect(g); g.connect(A.musicLP);
          autoClean(o, g);
          o.start(t); o.stop(t + dur * 16.0);
        }
        // Subtle naval sonar ping on Harbor theme bar 1 start
        if (th.style === 'sonar' && !bar2) {
          const so = c.createOscillator(), sg = safeGain(c, 0.0001);
          so.type = 'sine';
          so.frequency.setValueAtTime(m2f(79), t + dur * 0.5);
          sg.gain.setValueAtTime(0.0001, t + dur * 0.5);
          sg.gain.linearRampToValueAtTime(0.020, t + dur * 0.5 + 0.012);
          sg.gain.exponentialRampToValueAtTime(0.0001, t + dur * 4.5);
          so.connect(sg); sg.connect(A.echoIn);
          autoClean(so, sg);
          so.start(t + dur * 0.5); so.stop(t + dur * 4.6);
        }
      }

      // 2. Gentle Background Arpeggio / Harmonic Texture
      if (th.arp && th.arp[i] && i % 2 === 0) {
        const an = th.arp[i] + (bar2 && i >= 12 ? 2 : 0);
        const o = c.createOscillator(), g = safeGain(c, 0.0001);
        o.type = 'sine';
        o.frequency.setValueAtTime(m2f(an), t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.018, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.9);
        o.connect(g); g.connect(A.echoIn);
        autoClean(o, g);
        o.start(t); o.stop(t + dur * 2.0);
      }

      // 3. Deep Warm Bassline (Sub-Sine + Filtered Harmonic)
      const bn = th.bass[i];
      if (bn > 0) {
        const f = m2f(bn + (bar2 && i >= 12 ? 2 : 0));
        const o = c.createOscillator(), sub = c.createOscillator(), lp = c.createBiquadFilter(), g = safeGain(c, 0.0001);
        o.type = th.bassWave === 'sawtooth' ? 'triangle' : (th.bassWave || 'triangle');
        sub.type = 'sine';
        o.frequency.setValueAtTime(f, t);
        sub.frequency.setValueAtTime(f * 0.5, t);
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(th.bassCut * 1.3, t);
        lp.Q.value = 0.7;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.088, t + 0.014);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.85);
        o.connect(lp); sub.connect(lp); lp.connect(g); g.connect(A.musicLP);
        autoClean(o, g);
        o.start(t); sub.start(t);
        o.stop(t + dur * 1.95); sub.stop(t + dur * 1.95);
      }

      // 4. Map-Specific Lead Instrument
      const ln = th.lead[i];
      if (ln > 0 && (!bar2 || i % 2 === 0 || i === 15)) {
        const note = ln + (bar2 && i === 14 ? 2 : 0);
        const f = m2f(note);
        if (th.style === 'marimba') {
          const o1 = c.createOscillator(), o2 = c.createOscillator(), g1 = safeGain(c, 0.0001), g2 = safeGain(c, 0.0001);
          o1.type = 'sine'; o2.type = 'sine';
          o1.frequency.setValueAtTime(f, t);
          o2.frequency.setValueAtTime(f * 4, t);
          g1.gain.setValueAtTime(0.0001, t);
          g1.gain.linearRampToValueAtTime(0.054, t + 0.008);
          g1.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.6);
          g2.gain.setValueAtTime(0.0001, t);
          g2.gain.linearRampToValueAtTime(0.015, t + 0.006);
          g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
          o1.connect(g1); o2.connect(g2);
          g1.connect(A.musicLP); g1.connect(A.echoIn); g2.connect(A.musicLP);
          autoClean(o1, g1); autoClean(o2, g2);
          o1.start(t); o2.start(t);
          o1.stop(t + dur * 1.7); o2.stop(t + 0.06);
        } else if (th.style === 'crystal') {
          const o1 = c.createOscillator(), o2 = c.createOscillator(), g1 = safeGain(c, 0.0001), g2 = safeGain(c, 0.0001);
          o1.type = 'triangle'; o2.type = 'sine';
          o1.frequency.setValueAtTime(f, t);
          o2.frequency.setValueAtTime(f * 2, t);
          g1.gain.setValueAtTime(0.0001, t);
          g1.gain.linearRampToValueAtTime(0.044, t + 0.01);
          g1.gain.exponentialRampToValueAtTime(0.0001, t + dur * 2.2);
          g2.gain.setValueAtTime(0.0001, t);
          g2.gain.linearRampToValueAtTime(0.020, t + 0.008);
          g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.4);
          o1.connect(g1); o2.connect(g2);
          g1.connect(A.musicLP); g1.connect(A.echoIn); g2.connect(A.echoIn);
          autoClean(o1, g1); autoClean(o2, g2);
          o1.start(t); o2.start(t);
          o1.stop(t + dur * 2.3); o2.stop(t + dur * 1.5);
        } else {
          const o = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = safeGain(c, 0.0001);
          o.type = 'triangle';
          o2.type = 'sine';
          o.frequency.setValueAtTime(f * 1.002, t);
          o2.frequency.setValueAtTime(f * (th.style === 'oud' ? 2 : 0.5), t);
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(th.leadCut, t);
          lp.Q.value = 0.6;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.045, t + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.9);
          o.connect(lp); o2.connect(lp); lp.connect(g);
          g.connect(A.musicLP); g.connect(A.echoIn);
          autoClean(o, g);
          o.start(t); o2.start(t);
          o.stop(t + dur * 2.0); o2.stop(t + dur * 2.0);
        }
      }

      // 5. 100% Pure Tonal Percussion (Zero noise buffers, zero static hiss!)
      if (th.kick && th.kick[i]) {
        const o = c.createOscillator(), g = safeGain(c, 0.0001);
        o.type = 'sine';
        o.frequency.setValueAtTime(122, t);
        o.frequency.exponentialRampToValueAtTime(38, t + 0.11);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.14, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        o.connect(g); g.connect(A.musicLP);
        autoClean(o, g);
        o.start(t); o.stop(t + 0.15);
      }
      if (th.tom && th.tom[i]) {
        const o = c.createOscillator(), g = safeGain(c, 0.0001);
        o.type = 'triangle';
        const tf = (i % 4 === 2) ? 192 : 142;
        o.frequency.setValueAtTime(tf, t);
        o.frequency.exponentialRampToValueAtTime(tf * 0.58, t + 0.085);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.052, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);
        o.connect(g); g.connect(A.musicLP);
        autoClean(o, g);
        o.start(t); o.stop(t + 0.105);
      }
      if (th.snare && th.snare[i]) {
        // Warm woody rimshot / tonal snare body (zero white/pink noise static)
        const o1 = c.createOscillator(), o2 = c.createOscillator(), g = safeGain(c, 0.0001);
        o1.type = 'triangle';
        o2.type = 'sine';
        o1.frequency.setValueAtTime(235, t);
        o1.frequency.exponentialRampToValueAtTime(92, t + 0.065);
        o2.frequency.setValueAtTime(390, t);
        o2.frequency.exponentialRampToValueAtTime(135, t + 0.045);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.068, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
        o1.connect(g); o2.connect(g); g.connect(A.musicLP);
        autoClean(o1, g);
        o1.start(t); o2.start(t);
        o1.stop(t + 0.085); o2.stop(t + 0.055);
      }
      if (th.hat && th.hat[i]) {
        // Gentle woody/marimba rhythmic pulse tick (never static or hissy)
        const o = c.createOscillator(), g = safeGain(c, 0.0001);
        o.type = 'sine';
        const hf = (i % 4 === 0) ? 880 : 660;
        o.frequency.setValueAtTime(hf, t);
        o.frequency.exponentialRampToValueAtTime(hf * 0.55, t + 0.024);
        const hv = (i % 4 === 0) ? 0.014 : 0.008;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(hv, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
        o.connect(g); g.connect(A.musicLP);
        autoClean(o, g);
        o.start(t); o.stop(t + 0.032);
      }
    },

    /** Warm, click-free oscillator tone with automatic lowpass smoothing and safe lookahead */
    tone(type, f0, f1, dur, vol, delay, cut) {
      const c = A.ctx;
      if (!c || A.hardSuspended || A.muted || c.state !== 'running') return;
      if (A._voices > 28) return;
      const d = Math.max(0.02, dur || 0.05);
      const t = c.currentTime + 0.006 + Math.max(0, delay || 0);
      const o = c.createOscillator(), g = safeGain(c, 0.0001);
      o.type = type || 'sine';
      const startF = Math.max(22, Math.min(3200, f0 || 220));
      const endF = Math.max(22, Math.min(3200, f1 || startF));
      o.frequency.setValueAtTime(startF, t);
      if (Math.abs(endF - startF) > 0.5) {
        o.frequency.exponentialRampToValueAtTime(endF, t + d);
      }
      const atk = Math.max(0.005, Math.min(0.014, d * 0.25));
      const peak = Math.max(0.0002, Math.min(0.65, vol || 0.1));
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);

      if (type === 'sawtooth' || type === 'square' || cut) {
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = Math.max(140, Math.min(2400, cut || 1350));
        lp.Q.value = 0.6;
        o.connect(lp);
        lp.connect(g);
      } else {
        o.connect(g);
      }
      g.connect(A.sfxG);
      A._voices++;
      o.onended = () => {
        A._voices = Math.max(0, A._voices - 1);
        try { g.disconnect(); } catch (e) { /* ignore */ }
      };
      o.start(t);
      o.stop(t + d + 0.02);
    },

    /** shared noise buffer (created lazily). pink = 1/f noise (soft, for wind / engine rumble), white = bright crack for impacts */
    _noiseBuf(pink) {
      const c = A.ctx, key = pink ? '_nbP' : '_nbW';
      if (A[key]) return A[key];
      const n = Math.floor(c.sampleRate * 2), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      if (pink) {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, pk = 0;
        for (let i = 0; i < n; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
          const v = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
          d[i] = v; if (Math.abs(v) > pk) pk = Math.abs(v);
        }
        const k = 0.9 / (pk || 1); for (let i = 0; i < n; i++) d[i] *= k;
        // seamless loop: cross-fade the last 2000 samples into the first ones
        const L = 2000; for (let i = 0; i < L; i++) { const u = i / L; d[n - L + i] = d[n - L + i] * (1 - u) + d[i] * u; }
      } else for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      A[key] = buf; return buf;
    },

    /** Enveloped, filtered noise burst (impact crack / explosion body / swish). ftype: lowpass | bandpass | highpass, cutoff sweeps f0 -> f1, vol = peak gain. */
    noise(dur, ftype, f0, f1, vol, delay, q) {
      const c = A.ctx;
      if (!c || A.hardSuspended || A.muted || c.state !== 'running') return;
      if (A._voices > 28) return;
      const d = Math.max(0.03, Math.min(1.2, dur || 0.1));
      const t = c.currentTime + 0.006 + Math.max(0, delay || 0);
      const src = c.createBufferSource(), flt = c.createBiquadFilter(), g = safeGain(c, 0.0001);
      src.buffer = A._noiseBuf(false);
      flt.type = ftype || 'lowpass';
      const s0 = Math.max(40, Math.min(9000, f0 || 800)), s1 = Math.max(40, Math.min(9000, f1 || s0));
      flt.frequency.setValueAtTime(s0, t);
      if (Math.abs(s1 - s0) > 1) flt.frequency.exponentialRampToValueAtTime(s1, t + d);
      flt.Q.value = q == null ? 0.7 : q;
      const peak = Math.max(0.0002, Math.min(0.95, vol || 0.2));
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + Math.min(0.006, d * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      src.connect(flt); flt.connect(g); g.connect(A.sfxG);
      A._voices++;
      src.onended = () => { A._voices = Math.max(0, A._voices - 1); try { g.disconnect(); flt.disconnect(); } catch (e) { /* ignore */ } };
      src.start(t, Math.random() * 0.8, d + 0.04);
    },

    /** kept for API compatibility: now a real noise burst */
    noiseBurst(dur, ftype, f0, f1, vol, delay, q) { A.noise(dur, ftype || 'lowpass', f0, f1, vol, delay, q); },

    /** Play a named effect. Rate limited per name so dense fights stay crystal clear and never clip. */
    sfx(name, v) {
      if (!A.ctx || A.hardSuspended || A.muted) return;
      if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {});
      v = v == null ? 1 : Math.max(0.05, Math.min(1.4, v));
      const now = A.ctx.currentTime;
      const gap = {
        gun: 0.06, tshot: 0.055, bonk: 0.07, hit: 0.08, hurt: 0.10, ko: 0.06,
        ram: 0.09, crash: 0.10, thud: 0.08, bag: 0.08, grab: 0.08, deliver: 0.10,
        deploy: 0.08, recall: 0.08, board: 0.08, boost: 0.25, click: 0.04,
        go: 0.15, beep: 0.08, revive: 0.18, nanako: 0.25, win: 0.4, lose: 0.4,
        boom: 0.08, blast: 0.09, ignite: 0.38, burn: 0.35, tank: 0.24, cannon: 0.11,
        build: 0.12, mine: 0.09, siren: 0.45, wind: 0.36, roar: 0.42, club: 0.20,
        swish: 0.12, mortar: 0.12, heli: 0.20, jet: 0.55, whistle: 0.09,
        dflame: 0.22, dino: 0.50, pickup: 0.10, clock: 0.10, rumble: 0.40, spawn: 0.08, barrel: 0.07,
      }[name] || 0.05;
      if (A.last[name] && now - A.last[name] < gap) return;
      A.last[name] = now;

      switch (name) {
        case 'gun':
          A.tone('sine', 195, 55, 0.065, 0.24 * v);
          A.tone('triangle', 480, 125, 0.048, 0.16 * v, 0, 1100);
          break;
        case 'tshot':
          A.tone('triangle', 510, 150, 0.045, 0.14 * v, 0, 1200);
          A.tone('sine', 840, 240, 0.035, 0.08 * v);
          break;
        case 'bonk':
          A.tone('sine', 155, 58, 0.14, 0.36 * v);
          A.tone('triangle', 587, 540, 0.16, 0.24 * v);
          A.tone('sine', 880, 830, 0.12, 0.18 * v);
          A.tone('sine', 1396, 1280, 0.08, 0.10 * v);
          break;
        case 'hit':
          A.tone('sine', 220, 82, 0.09, 0.26 * v);
          A.tone('triangle', 430, 170, 0.06, 0.15 * v, 0, 1200);
          A.noise(0.05, 'bandpass', 1900, 900, 0.17 * v, 0, 1.2);
          break;
        case 'hurt':
          A.tone('triangle', 310, 118, 0.15, 0.22 * v);
          A.tone('sine', 210, 85, 0.15, 0.16 * v);
          break;
        case 'ko':
          A.tone('sine', 680, 220, 0.22, 0.22 * v);
          A.tone('triangle', 460, 150, 0.2, 0.15 * v, 0.025);
          break;
        case 'ram':
          // vehicle smashes into an enemy: crunchy body hit + low thump
          A.noise(0.16, 'lowpass', 2300, 420, 0.5 * v, 0, 0.7);
          A.tone('triangle', 300, 110, 0.16, 0.42 * v, 0, 1000);
          A.tone('sine', 140, 52, 0.2, 0.42 * v);
          break;
        case 'crash':
          // vehicle hits a wall / rock / building / guardian: noisy crunch + metal rattle + body thump
          A.noise(0.32, 'lowpass', 2600, 260, 0.62 * v, 0, 0.7);
          A.noise(0.14, 'bandpass', 1100, 600, 0.28 * v, 0.03, 2);
          A.tone('triangle', 215, 72, 0.26, 0.46 * v, 0, 900);
          A.tone('sine', 104, 42, 0.3, 0.42 * v);
          break;
        case 'thud':
          A.noise(0.1, 'lowpass', 1100, 260, 0.4 * v, 0, 0.7);
          A.tone('sine', 190, 72, 0.13, 0.4 * v);
          A.tone('triangle', 320, 130, 0.08, 0.2 * v, 0, 800);
          break;
        case 'bag':
          A.noise(0.15, 'lowpass', 800, 220, 0.42 * v, 0, 0.7);
          A.tone('sine', 160, 70, 0.12, 0.32 * v);
          break;
        case 'barrel':
          // metal barrel kicked by the vehicle: dull clang with a ringing body
          A.noise(0.05, 'bandpass', 2400, 1500, 0.22 * v, 0, 1.5);
          A.tone('sine', 420, 400, 0.38, 0.24 * v);
          A.tone('triangle', 655, 625, 0.3, 0.15 * v);
          A.tone('sine', 985, 950, 0.22, 0.1 * v);
          A.tone('sine', 150, 70, 0.12, 0.34 * v);
          break;
        case 'grab':
          A.tone('triangle', 523.25, 523.25, 0.08, 0.20 * v);
          A.tone('triangle', 659.25, 659.25, 0.08, 0.20 * v, 0.055);
          A.tone('sine', 783.99, 1046.5, 0.14, 0.24 * v, 0.11);
          break;
        case 'deliver':
          A.tone('triangle', 587.33, 587.33, 0.09, 0.24 * v);
          A.tone('triangle', 880, 880, 0.12, 0.26 * v, 0.065);
          A.tone('sine', 1174.66, 1174.66, 0.24, 0.28 * v, 0.13);
          break;
        case 'deploy':
          A.tone('sine', 392, 784, 0.16, 0.22 * v);
          A.tone('triangle', 523.25, 1046.5, 0.14, 0.15 * v, 0.035);
          break;
        case 'recall':
          A.tone('sine', 784, 392, 0.16, 0.20 * v);
          A.tone('triangle', 587.33, 293.66, 0.14, 0.14 * v, 0.03);
          break;
        case 'board':
          A.tone('triangle', 523.25, 783.99, 0.1, 0.22 * v);
          A.tone('sine', 783.99, 1046.5, 0.14, 0.24 * v, 0.065);
          break;
        case 'boost':
          // Clean V8 turbo spool & harmonic surge
          A.tone('sine', 72, 165, 0.36, 0.32 * v);
          A.tone('triangle', 144, 330, 0.34, 0.22 * v, 0, 950);
          A.tone('sine', 216, 495, 0.28, 0.14 * v, 0.03);
          break;
        case 'click':
          A.tone('sine', 880, 520, 0.032, 0.15 * v);
          A.tone('triangle', 1320, 680, 0.024, 0.07 * v);
          break;
        case 'go':
          A.tone('triangle', 523.25, 523.25, 0.09, 0.22 * v);
          A.tone('triangle', 659.25, 659.25, 0.09, 0.22 * v, 0.085);
          A.tone('sine', 1046.5, 1046.5, 0.24, 0.26 * v, 0.17);
          break;
        case 'beep':
          A.tone('sine', 740, 690, 0.065, 0.14 * v);
          break;
        case 'revive':
          A.tone('sine', 440, 880, 0.22, 0.24 * v);
          A.tone('triangle', 659.25, 1318.5, 0.24, 0.18 * v, 0.08);
          break;
        case 'nanako':
          A.tone('triangle', 440, 110, 0.42, 0.24 * v);
          A.tone('sine', 220, 65, 0.4, 0.18 * v);
          break;
        case 'win':
          [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
            A.tone('triangle', f, f, 0.26, 0.22 * v, i * 0.095);
            A.tone('sine', f * 0.5, f * 0.5, 0.28, 0.14 * v, i * 0.095);
          });
          break;
        case 'lose':
          [392, 349.23, 311.13, 261.63].forEach((f, i) => {
            A.tone('triangle', f, f * 0.97, 0.28, 0.20 * v, i * 0.15);
            A.tone('sine', f * 0.5, f * 0.48, 0.3, 0.14 * v, i * 0.15);
          });
          break;
        case 'boom':
          // explosion: bright crack that dives into a deep body + rolling rumble + low punch
          A.noise(0.55, 'lowpass', 3000, 110, 0.85 * v, 0, 0.7);
          A.noise(0.6, 'lowpass', 420, 70, 0.6 * v, 0.04, 0.7);
          A.tone('sine', 120, 34, 0.55, 0.55 * v);
          A.tone('triangle', 240, 62, 0.32, 0.36 * v, 0, 700);
          break;
        case 'blast':
          // barrel / shell detonation: a bigger, longer explosion
          A.noise(0.7, 'lowpass', 3400, 90, 0.9 * v, 0, 0.7);
          A.noise(0.75, 'lowpass', 380, 60, 0.65 * v, 0.05, 0.7);
          A.tone('sine', 100, 28, 0.65, 0.6 * v);
          A.tone('triangle', 200, 52, 0.4, 0.4 * v, 0, 650);
          break;
        case 'ignite':
          A.tone('sine', 110, 220, 0.22, 0.18 * v);
          A.tone('triangle', 165, 310, 0.20, 0.14 * v, 0.02, 650);
          break;
        case 'burn':
          A.tone('sine', 125, 78, 0.14, 0.10 * v);
          A.tone('triangle', 190, 115, 0.12, 0.07 * v, 0, 520);
          break;
        case 'tank':
          A.tone('sine', 68, 44, 0.12, 0.14 * v);
          A.tone('triangle', 115, 72, 0.10, 0.09 * v, 0, 420);
          break;
        case 'cannon':
          A.noise(0.26, 'lowpass', 3200, 300, 0.6 * v, 0, 0.7);
          A.tone('sine', 150, 40, 0.3, 0.5 * v);
          A.tone('triangle', 320, 82, 0.16, 0.3 * v, 0, 700);
          break;
        case 'build':
          A.tone('triangle', 261.63, 523.25, 0.16, 0.18 * v);
          A.tone('sine', 523.25, 783.99, 0.16, 0.20 * v, 0.08);
          A.tone('sine', 135, 58, 0.12, 0.20 * v, 0.14);
          break;
        case 'mine':
          A.tone('sine', 1046.5, 1046.5, 0.045, 0.11 * v);
          break;
        case 'siren':
          for (let i = 0; i < 4; i++) A.tone('triangle', i % 2 ? 480 : 660, i % 2 ? 660 : 480, 0.19, 0.13 * v, i * 0.2);
          break;
        case 'wind':
          // Smooth harmonic vortex swirl (zero white/pink noise hiss)
          A.tone('sine', 130, 195, 0.28, 0.11 * v);
          A.tone('triangle', 195, 140, 0.28, 0.08 * v, 0.03, 480);
          break;
        case 'roar':
          A.tone('triangle', 140, 48, 0.44, 0.28 * v, 0, 460);
          A.tone('sine', 92, 36, 0.44, 0.26 * v);
          break;
        case 'club':
          A.noise(0.2, 'lowpass', 1500, 200, 0.45 * v, 0, 0.7);
          A.tone('sine', 98, 34, 0.32, 0.5 * v);
          A.tone('triangle', 230, 72, 0.16, 0.26 * v, 0, 620);
          break;
        case 'swish':
          A.tone('sine', 250, 92, 0.16, 0.16 * v);
          A.tone('triangle', 360, 130, 0.14, 0.10 * v, 0, 650);
          break;
        case 'mortar':
          A.noise(0.18, 'lowpass', 1800, 400, 0.36 * v, 0, 0.7);
          A.tone('sine', 240, 60, 0.24, 0.38 * v);
          A.tone('triangle', 390, 105, 0.12, 0.18 * v, 0, 720);
          break;
        case 'heli':
          A.tone('sine', 72, 46, 0.10, 0.18 * v);
          A.tone('triangle', 120, 76, 0.09, 0.11 * v, 0, 380);
          break;
        case 'jet':
          // Clean Doppler turbine flyby (harmonic pitch sweep up then down, zero static noise)
          A.tone('triangle', 115, 285, 0.48, 0.20 * v, 0, 900);
          A.tone('triangle', 285, 92, 0.62, 0.22 * v, 0.46, 820);
          A.tone('sine', 85, 190, 0.48, 0.18 * v);
          A.tone('sine', 190, 65, 0.62, 0.20 * v, 0.46);
          break;
        case 'whistle':
          A.tone('sine', 1240, 420, 0.48, 0.05 * v);
          break;
        case 'dflame':
          A.tone('sine', 92, 54, 0.20, 0.15 * v);
          A.tone('triangle', 150, 82, 0.18, 0.11 * v, 0, 460);
          break;
        case 'dino':
          A.tone('triangle', 175, 48, 0.56, 0.28 * v, 0, 520);
          A.tone('sine', 95, 36, 0.54, 0.26 * v);
          break;
        case 'pickup':
          [587.33, 880, 1174.66].forEach((f, i) => A.tone('sine', f, f * 1.005, 0.18, 0.22 * v, i * 0.065));
          break;
        case 'clock':
          [783.99, 1046.5, 1567.98].forEach((f, i) => A.tone('triangle', f, f, 0.14, 0.20 * v, i * 0.075));
          break;
        case 'rumble':
          A.noise(0.55, 'lowpass', 300, 80, 0.55 * v, 0, 0.7);
          A.tone('sine', 72, 32, 0.55, 0.38 * v);
          A.tone('triangle', 130, 52, 0.5, 0.2 * v, 0, 400);
          break;
        case 'spawn':
          A.tone('sine', 240, 310, 0.065, 0.045 * v);
          break;
        default:
          break;
      }
    },

    /** Calm, natural off-road engine: soft triangle/sine harmonics + a filtered rumble texture with a gentle cylinder "chug". No sawtooth, no resonant filter sweep, narrow pitch range,
     *  slow smoothing -> a warm purr that rises gently with speed instead of a buzzing rev. Quiet enough to sit under music and effects. */
    engineStart() {
      if (!A.ctx) A.unlock();
      if (!A.ctx || A.eng) return;
      const c = A.ctx;
      if (c.state === 'suspended' && !A.hardSuspended) c.resume().catch(() => {});

      const o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator(), lfo = c.createOscillator();
      o1.type = 'triangle'; o2.type = 'triangle'; o3.type = 'sine'; lfo.type = 'sine';
      o1.frequency.value = 44; o2.frequency.value = 88; o3.frequency.value = 132; lfo.frequency.value = 9;

      const g1 = safeGain(c, 0.5), g2 = safeGain(c, 0.34), g3 = safeGain(c, 0.12);
      const chug = safeGain(c, 0.86);            // amplitude "chug" (the LFO swings this between ~0.7 and ~1.0)
      const lfoG = safeGain(c, 0.14);
      lfo.connect(lfoG); lfoG.connect(chug.gain);

      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.6;
      o1.connect(g1); o2.connect(g2); o3.connect(g3); g1.connect(lp); g2.connect(lp); g3.connect(lp);

      // exhaust rumble texture: looped pink noise through a band-pass that follows the revs
      const nz = c.createBufferSource(); nz.buffer = A._noiseBuf(true); nz.loop = true;
      const nb = c.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = 170; nb.Q.value = 0.9;
      const ng = safeGain(c, 0.5);
      nz.connect(nb); nb.connect(ng); ng.connect(lp);

      lp.connect(chug);
      const g = safeGain(c, 0.0001);
      chug.connect(g); g.connect(A.sfxG);

      o1.start(); o2.start(); o3.start(); lfo.start(); nz.start(0, Math.random());
      A.eng = { o1, o2, o3, lfo, lfoG, lp, g, nz, nb, ng, rpm: 0 };
    },

    engineSet(speed01, thr, boosting) {
      if (!A.ctx || A.hardSuspended) return;
      if (!A.eng) A.engineStart();
      const e = A.eng;
      if (!e) return;
      if (A.ctx.state === 'suspended' && !A.hardSuspended) A.ctx.resume().catch(() => {});

      const t = A.ctx.currentTime;
      const s = Math.max(0, Math.min(1, speed01 || 0));
      const tr = Math.max(0, Math.min(1, thr || 0));
      const bst = boosting ? 1 : 0;

      // revs: idle 0 -> top speed ~0.85, throttle adds a little "load", the boost a small extra lift. Rises smoothly (no jumps).
      const target = Math.min(1.1, s * 0.72 + tr * 0.14 + bst * 0.16);
      e.rpm += (target - e.rpm) * 0.12;                        // extra software smoothing on top of the audio-param smoothing
      const rpm = e.rpm;
      const f = 42 + rpm * 46;                                 // 42 Hz idle .. ~90 Hz flat out (the 2nd / 3rd harmonics carry it on small speakers)

      e.o1.frequency.setTargetAtTime(f, t, 0.12);
      e.o2.frequency.setTargetAtTime(f * 2, t, 0.12);
      e.o3.frequency.setTargetAtTime(f * 3, t, 0.12);

      e.lfo.frequency.setTargetAtTime(7 + rpm * 13, t, 0.2);   // cylinder chug: slow and soft, never a buzz
      e.lfoG.gain.setTargetAtTime(0.16 - rpm * 0.07, t, 0.2);  // the chug smooths out as the revs rise

      e.lp.frequency.setTargetAtTime(360 + rpm * 340 + tr * 90 + bst * 90, t, 0.15);   // the muffler opens up a little under load
      e.nb.frequency.setTargetAtTime(150 + rpm * 190, t, 0.2);
      e.ng.gain.setTargetAtTime(0.42 + rpm * 0.3, t, 0.2);

      // quiet idle purr, a bit more with speed / throttle / boost (about half of the old level)
      const vol = (A.muted || A.hardSuspended) ? 0.0001 : (0.05 + s * 0.04 + tr * 0.03 + bst * 0.025);
      e.g.gain.setTargetAtTime(vol, t, 0.12);
    },

    engineStop() {
      const e = A.eng;
      if (!e || !A.ctx) return;
      A.eng = null;
      const t = A.ctx.currentTime;
      try {
        e.g.gain.setTargetAtTime(0.0001, t, 0.05);
      } catch (x) { /* ignore */ }
      setTimeout(() => {
        try { e.o1.stop(); e.o2.stop(); e.o3.stop(); e.lfo.stop(); e.nz.stop(); } catch (x) { /* already stopped */ }
        try { e.g.disconnect(); } catch (x) { /* ignore */ }
      }, 320);
    },

    // ------------------------------------------------------------------ tornado wind (continuous, driven by the distance to the funnel)
    /** Call every frame while a tornado exists. level 0..1 (0 = far away / silent, 1 = right inside it), pan -1..1 (where it is, relative to the vehicle's heading).
     *  The loop fades itself out ~0.35 s after the last call (tornado gone, paused, mission over), so nothing has to remember to stop it. */
    windSet(level, pan) {
      const c = A.ctx;
      if (!c || A.hardSuspended || c.state !== 'running') return;
      if (!A.wind) A._windStart();
      const w = A.wind; if (!w) return;
      A._windSeen = performance.now();
      const t = c.currentTime, L = Math.max(0, Math.min(1, level || 0));
      // volume grows steadily as it gets closer; the pitch / brightness of the howl rises with it too
      const vol = (A.muted || L < 0.01) ? 0.0001 : 0.03 + 1.3 * Math.pow(L, 1.15);
      w.g.gain.setTargetAtTime(vol, t, 0.15);
      w.b1.frequency.setTargetAtTime(210 + L * 420, t, 0.25);
      w.b2.frequency.setTargetAtTime(520 + L * 820, t, 0.25);
      w.lp.frequency.setTargetAtTime(900 + L * 2600, t, 0.25);
      w.lfo.frequency.setTargetAtTime(0.35 + L * 0.9, t, 0.3);
      if (w.pan) w.pan.pan.setTargetAtTime(Math.max(-0.85, Math.min(0.85, (pan || 0) * (1 - 0.35 * L))), t, 0.12);
    },

    _windStart() {
      const c = A.ctx; if (!c || A.wind) return;
      const src = c.createBufferSource(); src.buffer = A._noiseBuf(true); src.loop = true;
      // two band-passes (body + howl) whose centres drift slowly, then a soft low-pass
      const b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(), lp = c.createBiquadFilter();
      b1.type = 'bandpass'; b1.frequency.value = 220; b1.Q.value = 0.8;
      b2.type = 'bandpass'; b2.frequency.value = 560; b2.Q.value = 2.2;
      lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.5;
      const m1 = safeGain(c, 1.0), m2 = safeGain(c, 0.55);
      src.connect(b1); src.connect(b2); b1.connect(m1); b2.connect(m2); m1.connect(lp); m2.connect(lp);
      // slow swirl: gusts swell the volume and sweep the howl
      const lfo = c.createOscillator(), lg = safeGain(c, 0.3), swirl = safeGain(c, 0.85), fg = safeGain(c, 160);
      lfo.type = 'sine'; lfo.frequency.value = 0.4;
      lfo.connect(lg); lg.connect(swirl.gain); lfo.connect(fg); fg.connect(b2.frequency);
      lp.connect(swirl);
      const g = safeGain(c, 0.0001);
      swirl.connect(g);
      let pan = null;
      if (c.createStereoPanner) { pan = c.createStereoPanner(); g.connect(pan); pan.connect(A.sfxG); } else g.connect(A.sfxG);
      src.start(0, Math.random()); lfo.start();
      A.wind = { src, b1, b2, lp, lfo, g, pan };
      A._windSeen = performance.now();
      if (A._windTimer) clearInterval(A._windTimer);
      A._windTimer = setInterval(() => { if (performance.now() - A._windSeen > 350) A.windStop(); }, 120);
    },

    windStop() {
      const w = A.wind;
      if (A._windTimer) { clearInterval(A._windTimer); A._windTimer = 0; }
      if (!w || !A.ctx) { A.wind = null; return; }
      A.wind = null;
      try { w.g.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.12); } catch (x) { /* ignore */ }
      setTimeout(() => {
        try { w.src.stop(); w.lfo.stop(); } catch (x) { /* already stopped */ }
        try { w.g.disconnect(); if (w.pan) w.pan.disconnect(); } catch (x) { /* ignore */ }
      }, 600);
    },
  };

  WZ.Audio = A;
  WZ.Events.on('game:pause', () => A.suspend());
  WZ.Events.on('game:resume', () => {
    if (WZ.Main && WZ.Main.userPaused) return;
    A.resume();
  });
})(window.WZ = window.WZ || {});
