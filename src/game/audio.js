/* WZ.Audio — Studio-grade WebAudio synthesizer with clean map-specific musical soundtracks, vibes & multi-layered SFX.
 * Zero harsh white-noise hiss: uses warm pink-filtered buffers, per-voice lowpass smoothing, stereo echo space & master compression. */
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

  const A = {
    ctx: null,
    master: null,
    sfxG: null,
    sfxLP: null,
    musicG: null,
    musicLP: null,
    echoIn: null,
    comp: null,
    noise: null,
    eng: null,
    muted: false,
    hardSuspended: false,
    last: {},
    curScene: 'menu',
    curTheme: 'village',
    _mTimer: 0,
    _mStep: 0,
    _mNextT: 0,

    unlock() {
      if (!A.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { A.ctx = new AC(); } catch (e) { return; }
        const c = A.ctx;

        // Master output & studio compressor/limiter
        A.master = c.createGain();
        A.master.gain.value = A.muted ? 0 : 0.84;

        A.comp = c.createDynamicsCompressor();
        A.comp.threshold.value = -12;
        A.comp.knee.value = 10;
        A.comp.ratio.value = 3.5;
        A.comp.attack.value = 0.004;
        A.comp.release.value = 0.16;

        // SFX bus with warm high-cut filter so no sound is ever piercing or noisy
        A.sfxG = c.createGain();
        A.sfxG.gain.value = 0.85;
        A.sfxLP = c.createBiquadFilter();
        A.sfxLP.type = 'lowpass';
        A.sfxLP.frequency.value = 4600;
        A.sfxLP.Q.value = 0.5;
        A.sfxG.connect(A.sfxLP);
        A.sfxLP.connect(A.comp);

        // Music bus with warm lowpass + subtle stereo delay space
        A.musicG = c.createGain();
        A.musicG.gain.value = 0.34;
        A.musicLP = c.createBiquadFilter();
        A.musicLP.type = 'lowpass';
        A.musicLP.frequency.value = 2600;
        A.musicLP.Q.value = 0.5;
        A.musicLP.connect(A.musicG);
        A.musicG.connect(A.comp);

        // Subtle warm echo send for musical leads/chimes
        A.echoIn = c.createGain();
        A.echoIn.gain.value = 0.24;
        const dly = c.createDelay(1.0);
        dly.delayTime.value = 0.26;
        const fb = c.createGain();
        fb.gain.value = 0.25;
        const dlp = c.createBiquadFilter();
        dlp.type = 'lowpass';
        dlp.frequency.value = 1500;
        A.echoIn.connect(dly);
        dly.connect(dlp);
        dlp.connect(A.musicLP);
        dlp.connect(fb);
        fb.connect(dly);

        A.comp.connect(A.master);
        A.master.connect(c.destination);

        // Generate 3 seconds of warm Paul-Kellet Pink Noise (smooth natural rolloff, zero white-noise static hiss)
        const len = c.sampleRate * 3;
        const b = c.createBuffer(1, len, c.sampleRate);
        const d = b.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, prev = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.0168980;
          const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
          prev = prev * 0.55 + pink * 0.45;
          d[i] = Math.max(-0.95, Math.min(0.95, prev * 1.35));
        }
        A.noise = b;
        A._startMusicLoop();
      }
      if (A.ctx.state === 'suspended' && !A.hardSuspended) A.ctx.resume();
    },

    suspend() { A.hardSuspended = true; if (A.ctx) A.ctx.suspend(); },
    resume() { A.hardSuspended = false; if (A.ctx) A.ctx.resume(); },
    setMuted(m) {
      A.muted = !!m;
      if (A.master && A.ctx) A.master.gain.setTargetAtTime(m ? 0 : 0.84, A.ctx.currentTime, 0.03);
    },

    /** Switch background music & atmospheric vibe for the current scene & map theme */
    setMusic(scene, theme) {
      if (scene) A.curScene = scene;
      if (theme && THEMES[theme]) A.curTheme = theme;
      else if (WZ.Save && WZ.Save.data && WZ.Save.data.settings && THEMES[WZ.Save.data.settings.map]) {
        A.curTheme = WZ.Save.data.settings.map;
      }
      if (A.ctx && A.musicG) {
        const vol = A.curScene === 'mission' ? 0.36 : A.curScene === 'shop' ? 0.30 : 0.33;
        A.musicG.gain.setTargetAtTime(vol, A.ctx.currentTime, 0.18);
      }
    },

    _startMusicLoop() {
      if (A._mTimer) clearInterval(A._mTimer);
      A._mStep = 0;
      A._mNextT = A.ctx ? A.ctx.currentTime + 0.08 : 0;
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
        if (A._mNextT < now - 0.1) A._mNextT = now + 0.03;
        while (A._mNextT < now + 0.24) {
          A._scheduleStep(th, A._mStep, A._mNextT, stepDur);
          A._mStep = (A._mStep + 1) % 32;
          A._mNextT += stepDur;
        }
      }, 85);
    },

    _scheduleStep(th, step, t, dur) {
      const c = A.ctx, i = step % 16, bar2 = step >= 16;

      // 1. Lush Warm Chord Pad on step 0 and 16
      const padNotes = bar2 ? (th.pad2 || th.pad) : th.pad;
      if (i === 0 && padNotes) {
        for (let k = 0; k < padNotes.length; k++) {
          const o = c.createOscillator(), g = c.createGain();
          o.type = k % 2 === 0 ? 'sine' : 'triangle';
          o.frequency.setValueAtTime(m2f(padNotes[k]), t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(k === 0 ? 0.034 : 0.022, t + dur * 3.0);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 15.8);
          o.connect(g); g.connect(A.musicLP);
          o.start(t); o.stop(t + dur * 16.0);
        }
        // Subtle naval sonar ping on Harbor theme bar 1 start
        if (th.style === 'sonar' && !bar2) {
          const so = c.createOscillator(), sg = c.createGain();
          so.type = 'sine';
          so.frequency.setValueAtTime(m2f(79), t + dur * 0.5);
          sg.gain.setValueAtTime(0.0001, t + dur * 0.5);
          sg.gain.linearRampToValueAtTime(0.022, t + dur * 0.5 + 0.01);
          sg.gain.exponentialRampToValueAtTime(0.0001, t + dur * 4.5);
          so.connect(sg); sg.connect(A.echoIn);
          so.start(t + dur * 0.5); so.stop(t + dur * 4.6);
        }
      }

      // 2. Gentle Background Arpeggio / Harmonic Texture
      if (th.arp && th.arp[i] && i % 2 === 0) {
        const an = th.arp[i] + (bar2 && i >= 12 ? 2 : 0);
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(m2f(an), t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.02, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.9);
        o.connect(g); g.connect(A.echoIn);
        o.start(t); o.stop(t + dur * 2.0);
      }

      // 3. Deep Warm Bassline (Sub-Sine + Filtered Harmonic)
      const bn = th.bass[i];
      if (bn > 0) {
        const f = m2f(bn + (bar2 && i >= 12 ? 2 : 0));
        const o = c.createOscillator(), sub = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
        o.type = th.bassWave || 'triangle';
        sub.type = 'sine';
        o.frequency.setValueAtTime(f, t);
        sub.frequency.setValueAtTime(f * 0.5, t);
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(th.bassCut * 1.5, t);
        lp.frequency.exponentialRampToValueAtTime(Math.max(60, th.bassCut * 0.65), t + dur * 1.7);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.095, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.85);
        o.connect(lp); sub.connect(lp); lp.connect(g); g.connect(A.musicLP);
        o.start(t); sub.start(t);
        o.stop(t + dur * 1.95); sub.stop(t + dur * 1.95);
      }

      // 4. Map-Specific Lead Instrument
      const ln = th.lead[i];
      if (ln > 0 && (!bar2 || i % 2 === 0 || i === 15)) {
        const note = ln + (bar2 && i === 14 ? 2 : 0);
        const f = m2f(note);
        if (th.style === 'marimba') {
          // Woody Marimba / Kalimba (fundamental sine + 4x harmonic mallet ping)
          const o1 = c.createOscillator(), o2 = c.createOscillator(), g1 = c.createGain(), g2 = c.createGain();
          o1.type = 'sine'; o2.type = 'sine';
          o1.frequency.setValueAtTime(f, t);
          o2.frequency.setValueAtTime(f * 4, t);
          g1.gain.setValueAtTime(0.0001, t);
          g1.gain.linearRampToValueAtTime(0.058, t + 0.006);
          g1.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.6);
          g2.gain.setValueAtTime(0.0001, t);
          g2.gain.linearRampToValueAtTime(0.018, t + 0.004);
          g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
          o1.connect(g1); o2.connect(g2);
          g1.connect(A.musicLP); g1.connect(A.echoIn); g2.connect(A.musicLP);
          o1.start(t); o2.start(t);
          o1.stop(t + dur * 1.7); o2.stop(t + 0.06);
        } else if (th.style === 'crystal') {
          // Crystalline Rhodes / Bell Piano
          const o1 = c.createOscillator(), o2 = c.createOscillator(), g1 = c.createGain(), g2 = c.createGain();
          o1.type = 'triangle'; o2.type = 'sine';
          o1.frequency.setValueAtTime(f, t);
          o2.frequency.setValueAtTime(f * 2, t);
          g1.gain.setValueAtTime(0.0001, t);
          g1.gain.linearRampToValueAtTime(0.046, t + 0.008);
          g1.gain.exponentialRampToValueAtTime(0.0001, t + dur * 2.2);
          g2.gain.setValueAtTime(0.0001, t);
          g2.gain.linearRampToValueAtTime(0.022, t + 0.006);
          g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.4);
          o1.connect(g1); o2.connect(g2);
          g1.connect(A.musicLP); g1.connect(A.echoIn); g2.connect(A.echoIn);
          o1.start(t); o2.start(t);
          o1.stop(t + dur * 2.3); o2.stop(t + dur * 1.5);
        } else {
          // Warm Plucked Oud / Analog Synth Lead / Naval Synth
          const o = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
          o.type = th.style === 'brass' ? 'sawtooth' : 'triangle';
          o2.type = 'sine';
          o.frequency.setValueAtTime(f * 1.003, t);
          o2.frequency.setValueAtTime(f * (th.style === 'oud' ? 2 : 0.5), t);
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(th.leadCut, t);
          lp.frequency.exponentialRampToValueAtTime(Math.max(240, th.leadCut * 0.42), t + dur * 1.8);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.048, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.9);
          o.connect(lp); o2.connect(lp); lp.connect(g);
          g.connect(A.musicLP); g.connect(A.echoIn);
          o.start(t); o2.start(t);
          o.stop(t + dur * 2.0); o2.stop(t + dur * 2.0);
        }
      }

      // 5. Clean Tonal & Filtered Percussion (No Static Hiss!)
      if (th.kick && th.kick[i]) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(125, t);
        o.frequency.exponentialRampToValueAtTime(38, t + 0.11);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.15, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        o.connect(g); g.connect(A.musicLP);
        o.start(t); o.stop(t + 0.15);
      }
      if (th.tom && th.tom[i]) {
        // Tuned ethnic/tribal tom or doumbek "tak/dum"
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle';
        const tf = (i % 4 === 2) ? 195 : 145;
        o.frequency.setValueAtTime(tf, t);
        o.frequency.exponentialRampToValueAtTime(tf * 0.58, t + 0.085);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.055, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);
        o.connect(g); g.connect(A.musicLP);
        o.start(t); o.stop(t + 0.105);
      }
      if (th.snare && th.snare[i]) {
        // Clean rimshot / snare body + soft pink-noise snap
        const o = c.createOscillator(), og = c.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(220, t);
        o.frequency.exponentialRampToValueAtTime(95, t + 0.065);
        og.gain.setValueAtTime(0.0001, t);
        og.gain.linearRampToValueAtTime(0.065, t + 0.003);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
        o.connect(og); og.connect(A.musicLP);
        o.start(t); o.stop(t + 0.085);
        if (A.noise) {
          const s = c.createBufferSource(); s.buffer = A.noise;
          const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1150; bp.Q.value = 1.6;
          const g = c.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.042, t + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
          s.connect(bp); bp.connect(g); g.connect(A.musicLP);
          s.start(t, (step * 0.13) % 2.0, 0.08);
        }
      }
      if (th.hat && th.hat[i] && A.noise) {
        // Subtle soft brushed shaker/hat (very gentle, never hissy)
        const s = c.createBufferSource(); s.buffer = A.noise;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3400; bp.Q.value = 2.2;
        const g = c.createGain();
        const hv = (i % 4 === 0) ? 0.018 : 0.010;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(hv, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
        s.connect(bp); bp.connect(g); g.connect(A.musicLP);
        s.start(t, (step * 0.07) % 2.2, 0.035);
      }
    },

    /** Warm, click-free oscillator tone with automatic lowpass smoothing for harmonic waves */
    tone(type, f0, f1, dur, vol, delay, cut) {
      const c = A.ctx; if (!c) return;
      const t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(20, f0), t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      const atk = Math.min(0.008, dur * 0.25);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(Math.max(0.0002, vol), t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      if (type === 'sawtooth' || type === 'square' || cut) {
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(cut || 1800, t);
        lp.frequency.exponentialRampToValueAtTime(Math.max(120, (cut || 1800) * 0.45), t + dur);
        o.connect(lp); lp.connect(g);
      } else {
        o.connect(g);
      }
      g.connect(A.sfxG);
      o.start(t); o.stop(t + dur + 0.025);
    },

    /** Warm pink-noise burst with click-free attack and secondary high-cut roll-off (never sounds like static) */
    noiseBurst(dur, ftype, f0, f1, vol, delay, q) {
      const c = A.ctx; if (!c || !A.noise) return;
      const t = c.currentTime + (delay || 0);
      const s = c.createBufferSource(); s.buffer = A.noise;
      const f = c.createBiquadFilter(); f.type = ftype; f.Q.value = q || 1.0;
      f.frequency.setValueAtTime(Math.max(40, Math.min(3400, f0)), t);
      if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(35, Math.min(3400, f1)), t + dur);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      const g = c.createGain();
      const atk = Math.min(0.008, dur * 0.2);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(Math.max(0.0002, vol), t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(lp); lp.connect(g); g.connect(A.sfxG);
      s.start(t, Math.random() * 1.8, dur + 0.04);
    },

    /** Play a named effect. Rate limited per name so dense fights stay crystal clear. */
    sfx(name, v) {
      if (!A.ctx || A.hardSuspended || A.muted) return;
      v = v == null ? 1 : v;
      const now = A.ctx.currentTime;
      const gap = {
        gun: 0.055, tshot: 0.05, bonk: 0.06, hit: 0.08, ko: 0.05, thud: 0.08, bag: 0.08,
        click: 0.03, heli: 0.18, mortar: 0.12, club: 0.2, roar: 0.4, blast: 0.07,
        burn: 0.32, ignite: 0.38, tank: 0.22, cannon: 0.1, jet: 0.55, whistle: 0.08,
        dflame: 0.18, dino: 0.5, pickup: 0.1, rumble: 0.35,
      }[name] || 0;
      if (gap && A.last[name] && now - A.last[name] < gap) return;
      A.last[name] = now;

      switch (name) {
        case 'gun':
          // Crisp heavy caliber machine-gun thump + mechanical transient
          A.tone('sine', 195, 55, 0.065, 0.24 * v);
          A.tone('triangle', 540, 130, 0.045, 0.18 * v);
          A.noiseBurst(0.042, 'bandpass', 1450, 620, 0.14 * v, 0, 1.4);
          break;
        case 'tshot':
          // Rapid-fire sentry turret pulse shot
          A.tone('triangle', 520, 155, 0.045, 0.15 * v);
          A.tone('sine', 960, 260, 0.035, 0.09 * v);
          A.noiseBurst(0.03, 'bandpass', 1700, 850, 0.08 * v, 0, 1.6);
          break;
        case 'bonk':
          // Cast-iron pan clang (metallic bell harmonics + punchy low thud)
          A.tone('sine', 155, 58, 0.14, 0.38 * v);
          A.tone('triangle', 587, 540, 0.16, 0.26 * v);
          A.tone('sine', 880, 830, 0.12, 0.20 * v);
          A.tone('sine', 1396, 1280, 0.08, 0.12 * v);
          break;
        case 'hit':
          A.tone('sine', 175, 62, 0.095, 0.26 * v);
          A.tone('triangle', 340, 110, 0.065, 0.14 * v);
          A.noiseBurst(0.04, 'lowpass', 900, 280, 0.12 * v);
          break;
        case 'hurt':
          A.tone('triangle', 310, 118, 0.15, 0.22 * v);
          A.tone('sawtooth', 210, 88, 0.14, 0.12 * v, 0, 950);
          break;
        case 'ko':
          A.tone('sine', 680, 220, 0.22, 0.24 * v);
          A.tone('triangle', 460, 150, 0.2, 0.16 * v, 0.025);
          break;
        case 'ram':
          A.tone('sine', 115, 40, 0.22, 0.46 * v);
          A.tone('triangle', 360, 95, 0.14, 0.26 * v);
          A.noiseBurst(0.16, 'lowpass', 1100, 160, 0.28 * v);
          break;
        case 'crash':
          A.tone('sine', 92, 36, 0.18, 0.38 * v);
          A.tone('triangle', 240, 75, 0.14, 0.2 * v);
          A.noiseBurst(0.14, 'lowpass', 780, 140, 0.24 * v);
          break;
        case 'thud':
          A.tone('sine', 140, 52, 0.12, 0.32 * v);
          A.noiseBurst(0.05, 'lowpass', 580, 180, 0.14 * v);
          break;
        case 'bag':
          A.tone('sine', 110, 48, 0.09, 0.2 * v);
          A.noiseBurst(0.07, 'lowpass', 480, 190, 0.14 * v);
          break;
        case 'grab':
          A.tone('triangle', 523.25, 523.25, 0.08, 0.2 * v);
          A.tone('triangle', 659.25, 659.25, 0.08, 0.2 * v, 0.055);
          A.tone('sine', 783.99, 1046.5, 0.14, 0.24 * v, 0.11);
          break;
        case 'deliver':
          A.tone('triangle', 587.33, 587.33, 0.09, 0.24 * v);
          A.tone('triangle', 880, 880, 0.12, 0.26 * v, 0.065);
          A.tone('sine', 1174.66, 1174.66, 0.24, 0.28 * v, 0.13);
          break;
        case 'deploy':
          A.tone('sine', 392, 784, 0.16, 0.24 * v);
          A.tone('triangle', 523.25, 1046.5, 0.14, 0.16 * v, 0.035);
          break;
        case 'recall':
          A.tone('sine', 784, 392, 0.16, 0.22 * v);
          A.tone('triangle', 587.33, 293.66, 0.14, 0.14 * v, 0.03);
          break;
        case 'board':
          A.tone('triangle', 523.25, 783.99, 0.1, 0.22 * v);
          A.tone('sine', 783.99, 1046.5, 0.14, 0.24 * v, 0.065);
          break;
        case 'boost':
          // Turbo spool + deep V8 surge (clean harmonic sweep, zero harsh noise)
          A.tone('sine', 68, 148, 0.38, 0.32 * v);
          A.tone('triangle', 136, 296, 0.36, 0.22 * v);
          A.tone('sawtooth', 204, 444, 0.32, 0.12 * v, 0.02, 1200);
          A.noiseBurst(0.24, 'bandpass', 320, 780, 0.14 * v, 0, 1.8);
          break;
        case 'click':
          A.tone('sine', 920, 540, 0.032, 0.16 * v);
          A.tone('triangle', 1380, 720, 0.024, 0.08 * v);
          break;
        case 'go':
          A.tone('triangle', 523.25, 523.25, 0.09, 0.22 * v);
          A.tone('triangle', 659.25, 659.25, 0.09, 0.22 * v, 0.085);
          A.tone('sine', 1046.5, 1046.5, 0.24, 0.28 * v, 0.17);
          break;
        case 'beep':
          A.tone('sine', 740, 690, 0.065, 0.14 * v);
          break;
        case 'revive':
          A.tone('sine', 440, 880, 0.22, 0.24 * v);
          A.tone('triangle', 659.25, 1318.5, 0.24, 0.18 * v, 0.08);
          break;
        case 'nanako':
          A.tone('triangle', 440, 110, 0.42, 0.26 * v);
          A.tone('sawtooth', 220, 65, 0.4, 0.12 * v, 0, 750);
          break;
        case 'win':
          [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
            A.tone('triangle', f, f, 0.26, 0.24 * v, i * 0.095);
            A.tone('sine', f * 0.5, f * 0.5, 0.28, 0.15 * v, i * 0.095);
          });
          break;
        case 'lose':
          [392, 349.23, 311.13, 261.63].forEach((f, i) => {
            A.tone('triangle', f, f * 0.97, 0.28, 0.22 * v, i * 0.15);
            A.tone('sine', f * 0.5, f * 0.48, 0.3, 0.14 * v, i * 0.15);
          });
          break;
        case 'boom':
          // Deep cinematic explosion (sub shockwave + warm punch + low-passed rumble)
          A.tone('sine', 92, 26, 0.52, 0.56 * v);
          A.tone('triangle', 175, 42, 0.28, 0.28 * v);
          A.noiseBurst(0.45, 'lowpass', 920, 70, 0.42 * v);
          break;
        case 'blast':
          // Heavy bomb / barrel detonation
          A.tone('sine', 78, 22, 0.65, 0.64 * v);
          A.tone('triangle', 155, 36, 0.34, 0.3 * v);
          A.noiseBurst(0.58, 'lowpass', 1050, 62, 0.48 * v);
          A.noiseBurst(0.32, 'bandpass', 420, 140, 0.2 * v, 0.1, 1.2);
          break;
        case 'ignite':
          // Warm low-mid fire flare (zero highpass static)
          A.tone('sine', 95, 180, 0.24, 0.16 * v);
          A.noiseBurst(0.3, 'bandpass', 320, 680, 0.2 * v, 0, 1.5);
          break;
        case 'burn':
          A.tone('sine', 110, 72, 0.14, 0.08 * v);
          A.noiseBurst(0.14, 'bandpass', 440, 280, 0.09 * v, 0, 1.6);
          break;
        case 'tank':
          A.tone('sine', 64, 42, 0.12, 0.14 * v);
          A.tone('triangle', 110, 70, 0.1, 0.08 * v);
          break;
        case 'cannon':
          A.tone('sine', 135, 34, 0.28, 0.5 * v);
          A.tone('triangle', 320, 78, 0.12, 0.24 * v);
          A.noiseBurst(0.24, 'lowpass', 950, 95, 0.34 * v);
          break;
        case 'build':
          A.tone('triangle', 261.63, 523.25, 0.16, 0.18 * v);
          A.tone('sine', 523.25, 783.99, 0.16, 0.2 * v, 0.08);
          A.tone('sine', 135, 58, 0.12, 0.22 * v, 0.14);
          break;
        case 'mine':
          A.tone('sine', 1046.5, 1046.5, 0.045, 0.11 * v);
          break;
        case 'siren':
          for (let i = 0; i < 4; i++) A.tone('triangle', i % 2 ? 480 : 660, i % 2 ? 660 : 480, 0.19, 0.14 * v, i * 0.2);
          break;
        case 'wind':
          A.tone('sine', 140, 220, 0.32, 0.1 * v);
          A.noiseBurst(0.32, 'bandpass', 320, 580, 0.14 * v, 0, 1.8);
          break;
        case 'roar':
          // Deep filtered monster roar (warm lowpass formant, no raw sawtooth buzz)
          A.tone('sawtooth', 135, 48, 0.48, 0.26 * v, 0, 460);
          A.tone('triangle', 90, 38, 0.46, 0.24 * v);
          A.noiseBurst(0.36, 'lowpass', 380, 110, 0.18 * v);
          break;
        case 'club':
          A.tone('sine', 92, 30, 0.34, 0.58 * v);
          A.tone('triangle', 240, 75, 0.14, 0.24 * v);
          A.noiseBurst(0.22, 'lowpass', 720, 90, 0.3 * v);
          break;
        case 'swish':
          A.tone('sine', 240, 95, 0.18, 0.14 * v);
          A.noiseBurst(0.18, 'bandpass', 320, 720, 0.14 * v, 0, 1.6);
          break;
        case 'mortar':
          A.tone('sine', 245, 52, 0.24, 0.42 * v);
          A.tone('triangle', 420, 110, 0.12, 0.18 * v);
          A.noiseBurst(0.14, 'lowpass', 780, 160, 0.22 * v);
          break;
        case 'heli':
          A.tone('sine', 68, 44, 0.11, 0.18 * v);
          A.noiseBurst(0.09, 'lowpass', 190, 95, 0.14 * v);
          break;
        case 'jet':
          // Doppler turbine flyby (harmonic pitch sweep up then down + deep low rumble, zero static!)
          A.tone('triangle', 110, 280, 0.55, 0.2 * v);
          A.tone('triangle', 280, 85, 0.75, 0.22 * v, 0.52);
          A.tone('sawtooth', 165, 420, 0.55, 0.11 * v, 0, 950);
          A.tone('sawtooth', 420, 125, 0.75, 0.12 * v, 0.52, 850);
          A.noiseBurst(0.95, 'bandpass', 240, 480, 0.2 * v, 0.08, 1.8);
          break;
        case 'whistle':
          A.tone('sine', 1320, 420, 0.55, 0.05 * v);
          break;
        case 'dflame':
          A.tone('sine', 82, 52, 0.24, 0.12 * v);
          A.noiseBurst(0.24, 'bandpass', 380, 210, 0.18 * v, 0, 1.4);
          break;
        case 'dino':
          A.tone('sawtooth', 175, 46, 0.68, 0.26 * v, 0, 520);
          A.tone('triangle', 92, 36, 0.65, 0.24 * v);
          A.noiseBurst(0.48, 'lowpass', 460, 110, 0.2 * v);
          break;
        case 'pickup':
          [587.33, 880, 1174.66].forEach((f, i) => A.tone('sine', f, f * 1.005, 0.18, 0.24 * v, i * 0.065));
          break;
        case 'clock':
          [783.99, 1046.5, 1567.98].forEach((f, i) => A.tone('triangle', f, f, 0.14, 0.22 * v, i * 0.075));
          break;
        case 'rumble':
          A.tone('sine', 58, 28, 0.75, 0.42 * v);
          A.noiseBurst(0.65, 'lowpass', 180, 55, 0.32 * v);
          break;
        case 'spawn':
          A.tone('sine', 240, 310, 0.065, 0.045 * v);
          break;
        default:
          break;
      }
    },

    /** Smooth, purring V8 vehicle engine (warm lowpass-filtered harmonics, never harsh) */
    engineStart() {
      if (!A.ctx || A.eng) return;
      const c = A.ctx;
      const o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
      o1.type = 'triangle';
      o2.type = 'sine';
      lp.type = 'lowpass';
      lp.frequency.value = 160;
      g.gain.value = 0;
      o1.connect(lp);
      o2.connect(lp);
      lp.connect(g);
      g.connect(A.sfxG);
      o1.start();
      o2.start();
      A.eng = { o1, o2, lp, g };
    },
    engineSet(speed01, thr, boosting) {
      const e = A.eng; if (!e || !A.ctx) return;
      const t = A.ctx.currentTime, f = 36 + speed01 * 52 + (boosting ? 15 : 0);
      e.o1.frequency.setTargetAtTime(f, t, 0.06);
      e.o2.frequency.setTargetAtTime(f * 0.5, t, 0.06);
      e.lp.frequency.setTargetAtTime(135 + speed01 * 210 + thr * 75, t, 0.07);
      e.g.gain.setTargetAtTime(A.muted ? 0 : 0.011 + speed01 * 0.02 + thr * 0.007, t, 0.08);
    },
    engineStop() {
      const e = A.eng; if (!e || !A.ctx) return;
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
