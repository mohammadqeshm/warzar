/* WZ.Audio — Studio-grade WebAudio synthesizer with clean map-specific musical soundtracks, realistic V8 vehicle engine & pure tonal SFX.
 * Zero random static/white/pink noise buffers: 100% click-free, pop-free, glitch-free harmonic synthesis with safe lookahead scheduling. */
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
    muted: false,
    hardSuspended: false,
    last: {},
    curScene: 'menu',
    curTheme: 'village',
    _mTimer: 0,
    _mStep: 0,
    _mNextT: 0,
    _voices: 0,

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
      if (A.ctx.state === 'suspended' && !A.hardSuspended) {
        A.ctx.resume().catch(() => {});
      }
    },

    suspend() { A.hardSuspended = true; if (A.ctx) A.ctx.suspend().catch(() => {}); },
    resume() { A.hardSuspended = false; if (A.ctx) A.ctx.resume().catch(() => {}); },
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

    /** Pure tonal low-end impact/body synthesizer (replaces random noise buffers so zero static hiss can ever occur) */
    noiseBurst(dur, ftype, f0, f1, vol, delay, q) {
      void ftype; void q;
      const c = A.ctx;
      if (!c || A.hardSuspended || A.muted || c.state !== 'running') return;
      const d = Math.max(0.03, Math.min(0.55, dur || 0.08));
      const baseF0 = Math.max(48, Math.min(260, (f0 || 180) * 0.22));
      const baseF1 = Math.max(30, Math.min(140, (f1 || 70) * 0.20));
      const v = Math.max(0.0002, Math.min(0.32, (vol || 0.1) * 0.55));
      A.tone('triangle', baseF0, baseF1, d, v, delay, 320);
      A.tone('sine', baseF0 * 0.65, baseF1 * 0.6, d, v * 0.85, delay, 220);
    },

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
        dflame: 0.22, dino: 0.50, pickup: 0.10, clock: 0.10, rumble: 0.40, spawn: 0.08,
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
          A.tone('sine', 175, 58, 0.095, 0.26 * v);
          A.tone('triangle', 320, 105, 0.065, 0.15 * v, 0, 900);
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
          A.tone('sine', 120, 38, 0.22, 0.44 * v);
          A.tone('triangle', 280, 82, 0.16, 0.26 * v, 0, 750);
          break;
        case 'crash':
          A.tone('sine', 98, 35, 0.20, 0.38 * v);
          A.tone('triangle', 220, 68, 0.15, 0.22 * v, 0, 680);
          break;
        case 'thud':
          A.tone('sine', 140, 50, 0.12, 0.30 * v);
          A.tone('triangle', 210, 75, 0.08, 0.14 * v, 0, 550);
          break;
        case 'bag':
          A.tone('sine', 115, 48, 0.095, 0.22 * v);
          A.tone('triangle', 180, 72, 0.075, 0.12 * v, 0, 500);
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
          // Deep clean explosion (sub shockwave + warm low-mid punch, zero static)
          A.tone('sine', 96, 28, 0.44, 0.48 * v);
          A.tone('triangle', 180, 44, 0.28, 0.28 * v, 0, 520);
          A.tone('sine', 64, 24, 0.48, 0.32 * v, 0.03);
          break;
        case 'blast':
          // Heavy bomb / barrel detonation
          A.tone('sine', 84, 25, 0.52, 0.52 * v);
          A.tone('triangle', 160, 38, 0.34, 0.30 * v, 0, 480);
          A.tone('sine', 58, 22, 0.55, 0.36 * v, 0.04);
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
          A.tone('sine', 138, 36, 0.26, 0.44 * v);
          A.tone('triangle', 290, 72, 0.15, 0.24 * v, 0, 680);
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
          A.tone('sine', 95, 32, 0.30, 0.50 * v);
          A.tone('triangle', 230, 70, 0.15, 0.24 * v, 0, 620);
          break;
        case 'swish':
          A.tone('sine', 250, 92, 0.16, 0.16 * v);
          A.tone('triangle', 360, 130, 0.14, 0.10 * v, 0, 650);
          break;
        case 'mortar':
          A.tone('sine', 240, 52, 0.22, 0.38 * v);
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
          A.tone('sine', 64, 30, 0.52, 0.34 * v);
          A.tone('triangle', 105, 44, 0.46, 0.20 * v, 0, 320);
          break;
        case 'spawn':
          A.tone('sine', 240, 310, 0.065, 0.045 * v);
          break;
        default:
          break;
      }
    },

    /** Realistic, warm, clearly audible V8 off-road vehicle engine with cylinder firing cadence & throttle response */
    engineStart() {
      if (!A.ctx) A.unlock();
      if (!A.ctx || A.eng) return;
      const c = A.ctx;
      if (c.state === 'suspended' && !A.hardSuspended) c.resume().catch(() => {});

      // 3 harmonic oscillators + cylinder pulsation LFO + warm resonant muffler filter
      const o1 = c.createOscillator(); // primary cylinder bank (sawtooth for rich warm 100-500 Hz harmonics)
      const o2 = c.createOscillator(); // upper octave harmonic (triangle at 2x f for speaker clarity)
      const o3 = c.createOscillator(); // deep engine block fundamental (sine at 1x f)
      const lfo = c.createOscillator(); // rhythmic cylinder chug cadence

      o1.type = 'sawtooth';
      o2.type = 'triangle';
      o3.type = 'sine';
      lfo.type = 'sine';

      o1.frequency.value = 60;
      o2.frequency.value = 120;
      o3.frequency.value = 60;
      lfo.frequency.value = 14;

      const g1 = safeGain(c, 0.48);
      const g2 = safeGain(c, 0.40);
      const g3 = safeGain(c, 0.58);
      const lfoG = safeGain(c, 42);

      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 240;
      lp.Q.value = 1.45;

      const g = safeGain(c, 0.0001);

      o1.connect(g1); g1.connect(lp);
      o2.connect(g2); g2.connect(lp);
      o3.connect(g3); g3.connect(lp);
      lfo.connect(lfoG); lfoG.connect(lp.frequency);

      lp.connect(g);
      g.connect(A.sfxG);

      o1.start();
      o2.start();
      o3.start();
      lfo.start();

      A.eng = { o1, o2, o3, lfo, lfoG, lp, g };
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

      // Normalized RPM (0 at idle, ~1.0 at full speed/throttle, ~1.35 on turbo boost)
      const rpm = Math.min(1.35, s * 0.78 + tr * 0.28 + bst * 0.34);
      const f = 58 + rpm * 86;

      e.o1.frequency.setTargetAtTime(f, t, 0.045);
      e.o2.frequency.setTargetAtTime(f * 2, t, 0.045);
      e.o3.frequency.setTargetAtTime(f, t, 0.045);

      // Cylinder chug rate & filter modulation depth
      e.lfo.frequency.setTargetAtTime(13 + rpm * 24, t, 0.05);
      e.lfoG.gain.setTargetAtTime(36 + rpm * 52 + tr * 24, t, 0.05);

      // Muffler lowpass opens up smoothly under throttle & boost
      e.lp.frequency.setTargetAtTime(240 + rpm * 480 + tr * 170 + bst * 220, t, 0.05);

      // Audible idle purr (0.08) rising to a punchy V8 growl (0.24 - 0.30) under throttle & speed
      const vol = (A.muted || A.hardSuspended) ? 0.0001 : (0.08 + s * 0.10 + tr * 0.065 + bst * 0.055);
      e.g.gain.setTargetAtTime(vol, t, 0.05);
    },

    engineStop() {
      const e = A.eng;
      if (!e || !A.ctx) return;
      A.eng = null;
      const t = A.ctx.currentTime;
      try {
        e.g.gain.setTargetAtTime(0.0001, t, 0.04);
      } catch (x) { /* ignore */ }
      setTimeout(() => {
        try { e.o1.stop(); e.o2.stop(); e.o3.stop(); e.lfo.stop(); } catch (x) { /* already stopped */ }
        try { e.g.disconnect(); } catch (x) { /* ignore */ }
      }, 280);
    },
  };

  WZ.Audio = A;
  WZ.Events.on('game:pause', () => A.suspend());
  WZ.Events.on('game:resume', () => A.resume());
})(window.WZ = window.WZ || {});
