/* WZ.Audio — Studio-balanced WebAudio synthesizer:
 *  - Map-specific musical soundtracks (Seasons 1..5 + Shop)
 *  - Warm, responsive multi-harmonic V8 off-road vehicle engine loop
 *  - Dedicated SFX sub-compressor + master studio limiter so no effect ever spikes or clips
 *  - Smooth, non-fatiguing tornado vortex wind
 *  - Punchy, balanced explosions, collisions, gunfire, clock tick-tock & shop cash-register ("cha-ching") SFX */
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
    // Season 2: Dino Valley — Primal Jungle Marimba & Tribal Wood Percussion (A Dorian Adventure)
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
    // Season 4: Arctic Frontier — Crystalline Electric Piano, Aurora Chimes & Nordic Pulse (C Dorian)
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

  // The one and only soundtrack (first theme). Music bus level per scene: loud at the start screen / shop, low in a mission.
  const MUSIC_THEME = 'village';
  const MUSIC_VOL = { menu: 0.62, shop: 0.62, mission: 0.13 };

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
    sfxComp: null,
    engBus: null,
    musicG: null,
    musicLP: null,
    echoIn: null,
    comp: null,
    eng: null,
    wind: null,
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
    _tickFlip: false,

    _applyGain() {
      if (!A.master || !A.ctx) return;
      const silent = A.muted || A.hardSuspended;
      try {
        A.master.gain.setTargetAtTime(silent ? 0 : 0.85, A.ctx.currentTime, 0.02);
      } catch (e) { /* ignore */ }
    },

    unlock() {
      if (!A.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { A.ctx = new AC(); } catch (e) { return; }
        const c = A.ctx;

        // Master output & studio compressor/limiter (prevents any clipping or sudden peaks)
        A.master = safeGain(c, A.muted ? 0 : 0.85);

        A.comp = c.createDynamicsCompressor();
        A.comp.threshold.value = -12;
        A.comp.knee.value = 6;
        A.comp.ratio.value = 10;
        A.comp.attack.value = 0.001;
        A.comp.release.value = 0.12;

        // Dedicated SFX bus with warm high-cut filter AND its own fast peak compressor
        // so simultaneous explosions/impacts/shots stay punchy and NEVER spike above the mix
        A.sfxG = safeGain(c, 0.76);
        A.sfxLP = c.createBiquadFilter();
        A.sfxLP.type = 'lowpass';
        A.sfxLP.frequency.value = 3200;
        A.sfxLP.Q.value = 0.5;

        A.sfxComp = c.createDynamicsCompressor();
        A.sfxComp.threshold.value = -15;
        A.sfxComp.knee.value = 6;
        A.sfxComp.ratio.value = 8;
        A.sfxComp.attack.value = 0.001;
        A.sfxComp.release.value = 0.09;

        A.sfxG.connect(A.sfxLP);
        A.sfxLP.connect(A.sfxComp);
        A.sfxComp.connect(A.comp);

        // Dedicated Engine bus connected directly to master compressor so SFX bursts never duck the car engine
        A.engBus = safeGain(c, 0.92);
        A.engBus.connect(A.comp);

        // Music bus with warm lowpass + subtle stereo delay space
        A.musicG = safeGain(c, A._musicVol());
        A.musicLP = c.createBiquadFilter();
        A.musicLP.type = 'lowpass';
        A.musicLP.frequency.value = 2300;
        A.musicLP.Q.value = 0.5;
        A.musicLP.connect(A.musicG);
        A.musicG.connect(A.comp);

        // Subtle warm echo send for musical leads/chimes
        A.echoIn = safeGain(c, 0.20);
        const dly = c.createDelay(1.0);
        dly.delayTime.value = 0.26;
        const fb = safeGain(c, 0.20);
        const dlp = c.createBiquadFilter();
        dlp.type = 'lowpass';
        dlp.frequency.value = 1350;
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

    /** Stop all continuous gameplay loops immediately (engine, tornado wind) */
    stopLoops() {
      A.engineStop();
      A.windStop();
    },

    /** Switch background music & atmospheric vibe for the current scene & map theme */
    /** ONE soundtrack for the whole game (the first / Desert Village theme): it never changes with the map or the shop.
     *  Only the LEVEL changes: loud and clear in the menu & shop, ducked during a mission so the vehicle hits / SFX stand out.
     *  (`theme` is accepted for call-site compatibility but intentionally ignored.) */
    setMusic(scene /*, theme */) {
      if (scene) A.curScene = scene;
      A.curTheme = MUSIC_THEME;
      if (A.ctx && A.musicG) {
        A.musicG.gain.setTargetAtTime(A._musicVol(), A.ctx.currentTime, 0.35);
      }
    },

    _musicVol() {
      return A.curScene === 'mission' ? MUSIC_VOL.mission : A.curScene === 'shop' ? MUSIC_VOL.shop : MUSIC_VOL.menu;
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
        const th = THEMES[MUSIC_THEME];   // single soundtrack everywhere (menu, shop, every map)
        const stepDur = (60 / th.bpm) / 4; // 16th note
        const now = c.currentTime;
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
          g.gain.linearRampToValueAtTime(k === 0 ? 0.030 : 0.018, t + dur * 3.0);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 15.8);
          o.connect(g); g.connect(A.musicLP);
          autoClean(o, g);
          o.start(t); o.stop(t + dur * 16.0);
        }
        if (th.style === 'sonar' && !bar2) {
          const so = c.createOscillator(), sg = safeGain(c, 0.0001);
          so.type = 'sine';
          so.frequency.setValueAtTime(m2f(79), t + dur * 0.5);
          sg.gain.setValueAtTime(0.0001, t + dur * 0.5);
          sg.gain.linearRampToValueAtTime(0.018, t + dur * 0.5 + 0.012);
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
        g.gain.linearRampToValueAtTime(0.016, t + 0.015);
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
        g.gain.linearRampToValueAtTime(0.080, t + 0.014);
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
          g1.gain.linearRampToValueAtTime(0.050, t + 0.008);
          g1.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.6);
          g2.gain.setValueAtTime(0.0001, t);
          g2.gain.linearRampToValueAtTime(0.014, t + 0.006);
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
          g1.gain.linearRampToValueAtTime(0.042, t + 0.01);
          g1.gain.exponentialRampToValueAtTime(0.0001, t + dur * 2.2);
          g2.gain.setValueAtTime(0.0001, t);
          g2.gain.linearRampToValueAtTime(0.018, t + 0.008);
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
          g.gain.linearRampToValueAtTime(0.042, t + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.9);
          o.connect(lp); o2.connect(lp); lp.connect(g);
          g.connect(A.musicLP); g.connect(A.echoIn);
          autoClean(o, g);
          o.start(t); o2.start(t);
          o.stop(t + dur * 2.0); o2.stop(t + dur * 2.0);
        }
      }

      // 5. Pure Tonal Percussion
      if (th.kick && th.kick[i]) {
        const o = c.createOscillator(), g = safeGain(c, 0.0001);
        o.type = 'sine';
        o.frequency.setValueAtTime(120, t);
        o.frequency.exponentialRampToValueAtTime(38, t + 0.11);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.125, t + 0.006);
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
        g.gain.linearRampToValueAtTime(0.048, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);
        o.connect(g); g.connect(A.musicLP);
        autoClean(o, g);
        o.start(t); o.stop(t + 0.105);
      }
      if (th.snare && th.snare[i]) {
        const o1 = c.createOscillator(), o2 = c.createOscillator(), g = safeGain(c, 0.0001);
        o1.type = 'triangle';
        o2.type = 'sine';
        o1.frequency.setValueAtTime(235, t);
        o1.frequency.exponentialRampToValueAtTime(92, t + 0.065);
        o2.frequency.setValueAtTime(390, t);
        o2.frequency.exponentialRampToValueAtTime(135, t + 0.045);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.062, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
        o1.connect(g); o2.connect(g); g.connect(A.musicLP);
        autoClean(o1, g);
        o1.start(t); o2.start(t);
        o1.stop(t + 0.085); o2.stop(t + 0.055);
      }
      if (th.hat && th.hat[i]) {
        const o = c.createOscillator(), g = safeGain(c, 0.0001);
        o.type = 'sine';
        const hf = (i % 4 === 0) ? 880 : 660;
        o.frequency.setValueAtTime(hf, t);
        o.frequency.exponentialRampToValueAtTime(hf * 0.55, t + 0.024);
        const hv = (i % 4 === 0) ? 0.013 : 0.007;
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
      if (A._voices > 32) return;
      const d = Math.max(0.018, dur || 0.05);
      const t = c.currentTime + 0.005 + Math.max(0, delay || 0);
      const o = c.createOscillator(), g = safeGain(c, 0.0001);
      o.type = type || 'sine';
      const startF = Math.max(24, Math.min(3800, f0 || 220));
      const endF = Math.max(24, Math.min(3800, f1 || startF));
      o.frequency.setValueAtTime(startF, t);
      if (Math.abs(endF - startF) > 0.5) {
        o.frequency.exponentialRampToValueAtTime(endF, t + d);
      }
      const atk = Math.max(0.004, Math.min(0.012, d * 0.22));
      const peak = Math.max(0.0002, Math.min(0.42, vol || 0.1));
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);

      if (type === 'sawtooth' || type === 'square' || cut) {
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = Math.max(140, Math.min(2800, cut || 1400));
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

    /** shared noise buffer (created lazily). pink = 1/f noise (warm, for wind / engine / explosion rumble), white = crisp transient */
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
        const k = 0.88 / (pk || 1); for (let i = 0; i < n; i++) d[i] *= k;
        const L = 2000; for (let i = 0; i < L; i++) { const u = i / L; d[n - L + i] = d[n - L + i] * (1 - u) + d[i] * u; }
      } else for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      A[key] = buf; return buf;
    },

    /** Enveloped, filtered noise burst (impact crack / explosion body / swish). Uses pink noise for lowpass rumbles so it is warm and never harsh. */
    noise(dur, ftype, f0, f1, vol, delay, q, usePink) {
      const c = A.ctx;
      if (!c || A.hardSuspended || A.muted || c.state !== 'running') return;
      if (A._voices > 32) return;
      const d = Math.max(0.025, Math.min(1.0, dur || 0.1));
      const t = c.currentTime + 0.005 + Math.max(0, delay || 0);
      const src = c.createBufferSource(), flt = c.createBiquadFilter(), g = safeGain(c, 0.0001);
      const isPink = usePink != null ? usePink : (ftype === 'lowpass' && (f0 || 800) < 1600);
      src.buffer = A._noiseBuf(isPink);
      flt.type = ftype || 'lowpass';
      const s0 = Math.max(40, Math.min(5500, f0 || 800)), s1 = Math.max(40, Math.min(5500, f1 || s0));
      flt.frequency.setValueAtTime(s0, t);
      if (Math.abs(s1 - s0) > 1) flt.frequency.exponentialRampToValueAtTime(s1, t + d);
      flt.Q.value = q == null ? 0.65 : Math.min(2.2, q);
      const peak = Math.max(0.0002, Math.min(0.45, vol || 0.18));
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + Math.min(0.006, d * 0.18));
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      src.connect(flt); flt.connect(g); g.connect(A.sfxG);
      A._voices++;
      src.onended = () => { A._voices = Math.max(0, A._voices - 1); try { g.disconnect(); flt.disconnect(); } catch (e) { /* ignore */ } };
      src.start(t, Math.random() * 0.8, d + 0.04);
    },

    /** kept for API compatibility */
    noiseBurst(dur, ftype, f0, f1, vol, delay, q) { A.noise(dur, ftype || 'lowpass', f0, f1, vol, delay, q); },

    /** Play a named effect. Rate-limited per name and carefully gain-staged so dense fights sound like a pro arcade game. */
    sfx(name, v) {
      if (!A.ctx || A.hardSuspended || A.muted) return;
      if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {});
      v = v == null ? 1 : Math.max(0.08, Math.min(1.0, v));
      const now = A.ctx.currentTime;
      const gap = {
        gun: 0.06, tshot: 0.055, bonk: 0.07, hit: 0.08, hurt: 0.10, ko: 0.06,
        ram: 0.09, crash: 0.11, thud: 0.08, bag: 0.08, grab: 0.08, deliver: 0.10,
        deploy: 0.08, recall: 0.08, board: 0.08, boost: 0.25, click: 0.04,
        go: 0.15, beep: 0.08, tick: 0.18, cash: 0.08, buy: 0.08,
        revive: 0.18, nanako: 0.25, win: 0.4, lose: 0.4,
        boom: 0.09, blast: 0.10, ignite: 0.38, burn: 0.35, tank: 0.24, cannon: 0.11,
        build: 0.12, mine: 0.09, siren: 0.50, wind: 0.36, roar: 0.42, club: 0.20,
        swish: 0.12, mortar: 0.12, heli: 0.22, jet: 0.55, whistle: 0.11,
        dflame: 0.22, dino: 0.50, pickup: 0.10, clock: 0.10, rumble: 0.42, spawn: 0.08, barrel: 0.08,
      }[name] || 0.05;
      if (A.last[name] && now - A.last[name] < gap) return;
      A.last[name] = now;

      switch (name) {
        case 'gun':
          // Crisp, punchy roof-mounted heavy machine gun (never clicks or pierces)
          A.tone('sine', 185, 52, 0.062, 0.20 * v);
          A.tone('triangle', 440, 120, 0.046, 0.14 * v, 0, 1050);
          A.noise(0.032, 'bandpass', 1400, 680, 0.09 * v, 0, 1.1, false);
          break;
        case 'tshot':
          // Allied / enemy rifle & sentry shot
          A.tone('triangle', 480, 145, 0.044, 0.13 * v, 0, 1150);
          A.tone('sine', 760, 220, 0.034, 0.08 * v);
          break;
        case 'bonk':
          // Nana's signature frying-pan clang
          A.tone('sine', 160, 60, 0.13, 0.28 * v);
          A.tone('triangle', 587, 540, 0.15, 0.20 * v);
          A.tone('sine', 880, 830, 0.11, 0.14 * v);
          A.tone('sine', 1396, 1280, 0.075, 0.08 * v);
          break;
        case 'hit':
          // Melee / bullet impact
          A.tone('sine', 210, 78, 0.085, 0.22 * v);
          A.tone('triangle', 410, 155, 0.06, 0.14 * v, 0, 1100);
          A.noise(0.045, 'bandpass', 1500, 720, 0.12 * v, 0, 1.1, false);
          break;
        case 'hurt':
          A.tone('triangle', 300, 115, 0.14, 0.20 * v, 0, 950);
          A.tone('sine', 200, 82, 0.14, 0.15 * v);
          break;
        case 'ko':
          A.tone('sine', 640, 210, 0.20, 0.19 * v);
          A.tone('triangle', 440, 145, 0.18, 0.14 * v, 0.025, 1100);
          break;
        case 'ram':
          // Vehicle smashes into an enemy: solid bumper thump + warm body crunch
          A.tone('sine', 142, 48, 0.18, 0.30 * v);
          A.tone('triangle', 285, 98, 0.14, 0.22 * v, 0, 950);
          A.noise(0.13, 'lowpass', 1650, 340, 0.24 * v, 0, 0.7, true);
          break;
        case 'crash':
          // Vehicle hits wall / rock / building / guardian: deep chassis thud + controlled metallic crunch (never harsh)
          A.tone('sine', 115, 40, 0.25, 0.32 * v);
          A.tone('triangle', 220, 68, 0.21, 0.24 * v, 0, 820);
          A.noise(0.22, 'lowpass', 1800, 240, 0.28 * v, 0, 0.65, true);
          A.noise(0.10, 'bandpass', 950, 480, 0.14 * v, 0.02, 1.4, false);
          break;
        case 'thud':
          A.tone('sine', 175, 65, 0.12, 0.26 * v);
          A.tone('triangle', 290, 115, 0.08, 0.15 * v, 0, 750);
          A.noise(0.08, 'lowpass', 950, 240, 0.20 * v, 0, 0.7, true);
          break;
        case 'bag':
          A.tone('sine', 155, 65, 0.11, 0.24 * v);
          A.noise(0.11, 'lowpass', 720, 200, 0.22 * v, 0, 0.7, true);
          break;
        case 'barrel':
          // Metal barrel kicked by the vehicle: warm hollow drum ring + thump
          A.tone('sine', 155, 68, 0.12, 0.26 * v);
          A.tone('sine', 410, 390, 0.28, 0.18 * v);
          A.tone('triangle', 640, 610, 0.22, 0.12 * v, 0, 1300);
          A.noise(0.045, 'bandpass', 1800, 1100, 0.12 * v, 0, 1.3, false);
          break;
        case 'grab':
          A.tone('triangle', 523.25, 523.25, 0.08, 0.19 * v);
          A.tone('triangle', 659.25, 659.25, 0.08, 0.19 * v, 0.055);
          A.tone('sine', 783.99, 1046.5, 0.14, 0.22 * v, 0.11);
          break;
        case 'deliver':
          A.tone('triangle', 587.33, 587.33, 0.09, 0.22 * v);
          A.tone('triangle', 880, 880, 0.12, 0.24 * v, 0.065);
          A.tone('sine', 1174.66, 1174.66, 0.24, 0.26 * v, 0.13);
          break;
        case 'cash':
        case 'buy':
          // Classic game Shop Cash-Register "Cha-Ching!" (mechanical drawer latch + silver coins + ringing brass bell)
          A.noise(0.042, 'bandpass', 3000, 2100, 0.15 * v, 0, 1.8, false);
          A.tone('triangle', 392, 587.33, 0.055, 0.20 * v, 0, 1600);
          A.tone('sine', 1567.98, 1567.98, 0.085, 0.24 * v, 0.015);
          A.tone('triangle', 2093.0, 2093.0, 0.08, 0.18 * v, 0.04, 2800);
          // "-Ching!" ringing register bell + harmonic coin shimmer
          A.tone('sine', 1318.51, 1318.51, 0.34, 0.24 * v, 0.085);
          A.tone('sine', 2637.02, 2637.02, 0.36, 0.28 * v, 0.085);
          A.tone('triangle', 3135.96, 3135.96, 0.28, 0.18 * v, 0.11, 3400);
          A.tone('sine', 3520.0, 3520.0, 0.22, 0.14 * v, 0.145);
          break;
        case 'tick': {
          // Countdown clock tick-tock for the final 15 seconds: alternating crisp mechanical escapement + urgent woody chime
          A._tickFlip = !A._tickFlip;
          const hi = A._tickFlip;
          const fClick = hi ? 1320 : 1046.5;
          const fBody = hi ? 660 : 523.25;
          A.tone('triangle', fClick, fClick * 0.65, 0.036, 0.26 * v, 0, 2200);
          A.tone('sine', fBody, fBody * 0.88, 0.075, 0.24 * v, 0.004);
          A.noise(0.025, 'bandpass', hi ? 2400 : 1900, 1200, 0.10 * v, 0, 2.0, false);
          break;
        }
        case 'deploy':
          A.tone('sine', 392, 784, 0.16, 0.20 * v);
          A.tone('triangle', 523.25, 1046.5, 0.14, 0.14 * v, 0.035);
          break;
        case 'recall':
          A.tone('sine', 784, 392, 0.16, 0.19 * v);
          A.tone('triangle', 587.33, 293.66, 0.14, 0.13 * v, 0.03);
          break;
        case 'board':
          A.tone('triangle', 523.25, 783.99, 0.1, 0.20 * v);
          A.tone('sine', 783.99, 1046.5, 0.14, 0.22 * v, 0.065);
          break;
        case 'boost':
          // V8 turbo spool & warm harmonic surge
          A.tone('sine', 76, 175, 0.34, 0.28 * v);
          A.tone('triangle', 152, 345, 0.32, 0.20 * v, 0, 1050);
          A.tone('sine', 228, 510, 0.26, 0.13 * v, 0.025);
          break;
        case 'click':
          A.tone('sine', 880, 520, 0.032, 0.14 * v);
          A.tone('triangle', 1320, 680, 0.024, 0.06 * v);
          break;
        case 'go':
          A.tone('triangle', 523.25, 523.25, 0.09, 0.20 * v);
          A.tone('triangle', 659.25, 659.25, 0.09, 0.20 * v, 0.085);
          A.tone('sine', 1046.5, 1046.5, 0.24, 0.24 * v, 0.17);
          break;
        case 'beep':
          A.tone('sine', 740, 690, 0.065, 0.14 * v);
          break;
        case 'revive':
          A.tone('sine', 440, 880, 0.22, 0.22 * v);
          A.tone('triangle', 659.25, 1318.5, 0.24, 0.16 * v, 0.08);
          break;
        case 'nanako':
          A.tone('triangle', 440, 110, 0.40, 0.22 * v, 0, 900);
          A.tone('sine', 220, 65, 0.38, 0.16 * v);
          break;
        case 'win':
          [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
            A.tone('triangle', f, f, 0.26, 0.20 * v, i * 0.095);
            A.tone('sine', f * 0.5, f * 0.5, 0.28, 0.13 * v, i * 0.095);
          });
          break;
        case 'lose':
          [392, 349.23, 311.13, 261.63].forEach((f, i) => {
            A.tone('triangle', f, f * 0.97, 0.28, 0.19 * v, i * 0.15);
            A.tone('sine', f * 0.5, f * 0.48, 0.3, 0.13 * v, i * 0.15);
          });
          break;
        case 'boom':
          // Cinematic explosion: deep sub-bass punch + warm mid detonation + smooth pink-noise rumble (never clips)
          A.tone('sine', 118, 34, 0.44, 0.36 * v);
          A.tone('triangle', 225, 58, 0.28, 0.26 * v, 0, 680);
          A.noise(0.38, 'lowpass', 1800, 120, 0.32 * v, 0, 0.65, true);
          A.noise(0.45, 'lowpass', 380, 75, 0.26 * v, 0.035, 0.6, true);
          break;
        case 'blast':
          // Heavy barrel / shell detonation: fuller low-end body + warm rolling aftershock
          A.tone('sine', 102, 30, 0.52, 0.38 * v);
          A.tone('triangle', 195, 50, 0.34, 0.28 * v, 0, 640);
          A.noise(0.46, 'lowpass', 2000, 105, 0.34 * v, 0, 0.65, true);
          A.noise(0.52, 'lowpass', 350, 65, 0.28 * v, 0.04, 0.6, true);
          break;
        case 'ignite':
          A.tone('sine', 110, 220, 0.20, 0.16 * v);
          A.tone('triangle', 165, 310, 0.18, 0.12 * v, 0.02, 650);
          break;
        case 'burn':
          A.tone('sine', 125, 78, 0.14, 0.09 * v);
          A.tone('triangle', 190, 115, 0.12, 0.06 * v, 0, 520);
          break;
        case 'tank':
          A.tone('sine', 72, 46, 0.12, 0.13 * v);
          A.tone('triangle', 120, 76, 0.10, 0.08 * v, 0, 420);
          break;
        case 'cannon':
          A.tone('sine', 145, 40, 0.28, 0.34 * v);
          A.tone('triangle', 295, 78, 0.16, 0.24 * v, 0, 680);
          A.noise(0.22, 'lowpass', 1900, 260, 0.28 * v, 0, 0.65, true);
          break;
        case 'build':
          A.tone('triangle', 261.63, 523.25, 0.16, 0.17 * v);
          A.tone('sine', 523.25, 783.99, 0.16, 0.19 * v, 0.08);
          A.tone('sine', 135, 58, 0.12, 0.18 * v, 0.14);
          break;
        case 'mine':
          A.tone('sine', 1046.5, 1046.5, 0.045, 0.10 * v);
          break;
        case 'siren':
          for (let i = 0; i < 4; i++) A.tone('triangle', i % 2 ? 440 : 587.33, i % 2 ? 587.33 : 440, 0.18, 0.10 * v, i * 0.2, 950);
          break;
        case 'wind':
          A.tone('sine', 125, 180, 0.26, 0.09 * v);
          A.tone('triangle', 180, 130, 0.26, 0.07 * v, 0.03, 440);
          break;
        case 'roar':
          A.tone('triangle', 140, 48, 0.42, 0.24 * v, 0, 440);
          A.tone('sine', 92, 36, 0.42, 0.22 * v);
          break;
        case 'club':
          A.tone('sine', 98, 34, 0.30, 0.34 * v);
          A.tone('triangle', 220, 70, 0.16, 0.22 * v, 0, 600);
          A.noise(0.18, 'lowpass', 1300, 190, 0.25 * v, 0, 0.65, true);
          break;
        case 'swish':
          A.tone('sine', 240, 90, 0.15, 0.15 * v);
          A.tone('triangle', 350, 125, 0.13, 0.09 * v, 0, 620);
          break;
        case 'mortar':
          A.tone('sine', 230, 58, 0.22, 0.28 * v);
          A.tone('triangle', 370, 100, 0.12, 0.16 * v, 0, 680);
          A.noise(0.15, 'lowpass', 1400, 340, 0.22 * v, 0, 0.65, true);
          break;
        case 'heli':
          A.tone('sine', 72, 46, 0.10, 0.14 * v);
          A.tone('triangle', 120, 76, 0.09, 0.09 * v, 0, 380);
          break;
        case 'jet':
          A.tone('triangle', 115, 275, 0.46, 0.17 * v, 0, 850);
          A.tone('triangle', 275, 92, 0.58, 0.18 * v, 0.44, 780);
          A.tone('sine', 85, 185, 0.46, 0.15 * v);
          A.tone('sine', 185, 65, 0.58, 0.16 * v, 0.44);
          break;
        case 'whistle':
          A.tone('sine', 1100, 410, 0.42, 0.045 * v);
          break;
        case 'dflame':
          A.tone('sine', 92, 54, 0.20, 0.13 * v);
          A.tone('triangle', 150, 82, 0.18, 0.09 * v, 0, 440);
          break;
        case 'dino':
          A.tone('triangle', 170, 48, 0.52, 0.24 * v, 0, 480);
          A.tone('sine', 95, 36, 0.50, 0.22 * v);
          break;
        case 'pickup':
          [587.33, 880, 1174.66].forEach((f, i) => A.tone('sine', f, f * 1.005, 0.18, 0.20 * v, i * 0.065));
          break;
        case 'clock':
          [783.99, 1046.5, 1567.98].forEach((f, i) => A.tone('triangle', f, f, 0.14, 0.19 * v, i * 0.075));
          break;
        case 'rumble':
          A.tone('sine', 72, 32, 0.50, 0.28 * v);
          A.tone('triangle', 130, 52, 0.45, 0.16 * v, 0, 380);
          A.noise(0.45, 'lowpass', 280, 75, 0.26 * v, 0, 0.6, true);
          break;
        case 'spawn':
          A.tone('sine', 240, 310, 0.065, 0.04 * v);
          break;
        default:
          break;
      }
    },

    /** Warm, natural, clearly audible off-road V8 engine:
     *  Uses 4 tuned harmonic oscillators (fundamental + 2nd/3rd/4th harmonics so it translates clearly on both phone/laptop speakers and headphones)
     *  plus a warm pink-noise exhaust rumble and gentle cylinder firing cadence, routed to its own `engBus` so it never gets drowned out. */
    engineStart() {
      if (!A.ctx) A.unlock();
      if (!A.ctx || A.eng) return;
      const c = A.ctx;
      if (c.state === 'suspended' && !A.hardSuspended) c.resume().catch(() => {});

      const o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator(), o4 = c.createOscillator(), lfo = c.createOscillator();
      o1.type = 'triangle';
      o2.type = 'triangle';
      o3.type = 'sine';
      o4.type = 'triangle';
      lfo.type = 'sine';
      o1.frequency.value = 52;
      o2.frequency.value = 104;
      o3.frequency.value = 156;
      o4.frequency.value = 208;
      lfo.frequency.value = 11;

      // Balanced harmonic weights: 2nd and 3rd harmonics provide warm audible body without any harsh buzz
      const g1 = safeGain(c, 0.44), g2 = safeGain(c, 0.48), g3 = safeGain(c, 0.28), g4 = safeGain(c, 0.14);
      const chug = safeGain(c, 0.85);
      const lfoG = safeGain(c, 0.14);
      lfo.connect(lfoG);
      lfoG.connect(chug.gain);

      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 520;
      lp.Q.value = 0.65;
      o1.connect(g1); o2.connect(g2); o3.connect(g3); o4.connect(g4);
      g1.connect(lp); g2.connect(lp); g3.connect(lp); g4.connect(lp);

      // Exhaust rumble texture: looped pink noise through a warm bandpass that tracks RPM
      const nz = c.createBufferSource();
      nz.buffer = A._noiseBuf(true);
      nz.loop = true;
      const nb = c.createBiquadFilter();
      nb.type = 'bandpass';
      nb.frequency.value = 185;
      nb.Q.value = 0.95;
      const ng = safeGain(c, 0.42);
      nz.connect(nb); nb.connect(ng); ng.connect(lp);

      lp.connect(chug);
      const g = safeGain(c, 0.0001);
      chug.connect(g);
      g.connect(A.engBus || A.sfxG);

      o1.start(); o2.start(); o3.start(); o4.start(); lfo.start(); nz.start(0, Math.random());
      A.eng = { o1, o2, o3, o4, lfo, lfoG, lp, g, nz, nb, ng, rpm: 0 };
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

      // Smooth RPM response: responsive to throttle and speed, with extra lift on boost
      const target = Math.min(1.15, s * 0.68 + tr * 0.22 + bst * 0.20);
      e.rpm += (target - e.rpm) * 0.15;
      const rpm = e.rpm;
      // 50 Hz idle -> ~112 Hz at top speed/boost (2nd harmonic 100..224 Hz, 3rd 150..336 Hz)
      const f = 50 + rpm * 55;

      e.o1.frequency.setTargetAtTime(f, t, 0.09);
      e.o2.frequency.setTargetAtTime(f * 2, t, 0.09);
      e.o3.frequency.setTargetAtTime(f * 3, t, 0.09);
      if (e.o4) e.o4.frequency.setTargetAtTime(f * 4, t, 0.09);

      e.lfo.frequency.setTargetAtTime(9.5 + rpm * 16, t, 0.14);
      e.lfoG.gain.setTargetAtTime(Math.max(0.05, 0.15 - rpm * 0.06), t, 0.15);

      // Muffler opens up smoothly under throttle and boost, staying warm (never piercing)
      e.lp.frequency.setTargetAtTime(480 + rpm * 540 + tr * 160 + bst * 200, t, 0.12);
      e.nb.frequency.setTargetAtTime(175 + rpm * 220, t, 0.15);
      e.ng.gain.setTargetAtTime(0.36 + rpm * 0.26 + tr * 0.10, t, 0.15);

      // Clearly audible idle purr (0.16) that swells naturally with speed, throttle, and boost (up to ~0.40)
      const vol = (A.muted || A.hardSuspended) ? 0.0001 : (0.16 + s * 0.13 + tr * 0.07 + bst * 0.05);
      e.g.gain.setTargetAtTime(vol, t, 0.10);
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
        try { e.o1.stop(); e.o2.stop(); e.o3.stop(); if (e.o4) e.o4.stop(); e.lfo.stop(); e.nz.stop(); } catch (x) { /* already stopped */ }
        try { e.g.disconnect(); } catch (x) { /* ignore */ }
      }, 240);
    },

    // ------------------------------------------------------------------ tornado wind (smooth, deep, non-fatiguing vortex rush)
    windSet(level, pan) {
      const c = A.ctx;
      if (!c || A.hardSuspended || c.state !== 'running') return;
      if (!A.wind) A._windStart();
      const w = A.wind; if (!w) return;
      A._windSeen = performance.now();
      const t = c.currentTime, L = Math.max(0, Math.min(1, level || 0));
      // Balanced volume curve: clearly audible as it approaches, capped at ~0.35 so it never overwhelms or fatigues the ears
      const vol = (A.muted || L < 0.01) ? 0.0001 : 0.02 + 0.33 * Math.pow(L, 1.2);
      w.g.gain.setTargetAtTime(vol, t, 0.16);
      w.b1.frequency.setTargetAtTime(145 + L * 185, t, 0.25);
      w.b2.frequency.setTargetAtTime(290 + L * 310, t, 0.25);
      w.lp.frequency.setTargetAtTime(580 + L * 820, t, 0.25);
      w.lfo.frequency.setTargetAtTime(0.32 + L * 0.65, t, 0.3);
      if (w.pan) w.pan.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, (pan || 0) * (1 - 0.35 * L))), t, 0.14);
    },

    _windStart() {
      const c = A.ctx; if (!c || A.wind) return;
      const src = c.createBufferSource(); src.buffer = A._noiseBuf(true); src.loop = true;
      // Warm low-mid filters (no high Q resonance, no piercing whistle)
      const b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(), lp = c.createBiquadFilter();
      b1.type = 'bandpass'; b1.frequency.value = 155; b1.Q.value = 0.65;
      b2.type = 'bandpass'; b2.frequency.value = 310; b2.Q.value = 0.85;
      lp.type = 'lowpass'; lp.frequency.value = 720; lp.Q.value = 0.5;
      const m1 = safeGain(c, 0.85), m2 = safeGain(c, 0.38);
      src.connect(b1); src.connect(b2); b1.connect(m1); b2.connect(m2); m1.connect(lp); m2.connect(lp);
      // Gentle gust modulation
      const lfo = c.createOscillator(), lg = safeGain(c, 0.18), swirl = safeGain(c, 0.82), fg = safeGain(c, 75);
      lfo.type = 'sine'; lfo.frequency.value = 0.38;
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
      try { w.g.gain.setTargetAtTime(0.0001, A.ctx.currentTime, 0.08); } catch (x) { /* ignore */ }
      setTimeout(() => {
        try { w.src.stop(); w.lfo.stop(); } catch (x) { /* already stopped */ }
        try { w.g.disconnect(); if (w.pan) w.pan.disconnect(); } catch (x) { /* ignore */ }
      }, 360);
    },
  };

  WZ.Audio = A;
  WZ.Events.on('game:pause', () => A.suspend());
  WZ.Events.on('game:resume', () => {
    if (WZ.Main && WZ.Main.userPaused) return;
    A.resume();
  });
})(window.WZ = window.WZ || {});
