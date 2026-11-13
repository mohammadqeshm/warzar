/* WZ.Quality — bidirectional graphics tier controller (0 low / 1 med / 2 high) + smooth pixel-ratio scaling.
 * Prevents sudden blurry drops, ignores transition spikes, and restores both DPR and quality tier (shadows, grass, particles) when FPS recovers. */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG;

  const Q = {
    level: 2,
    maxLevel: 2,
    dprScale: 1,
    minDprScale: 0.85,
    renderer: null,
    acc: 0,
    frames: 0,
    lowN: 0,
    highN: 0,
    grace: 2.0,
    auto: true,
    onChange: null,
    fps: 60,

    init(renderer) {
      Q.renderer = renderer;
      const pref = (WZ.Save && WZ.Save.data && WZ.Save.data.settings && WZ.Save.data.settings.quality) || 'auto';
      Q.auto = pref === 'auto';
      if (pref === 'low') Q.level = 0;
      else if (pref === 'med') Q.level = 1;
      else if (pref === 'high') Q.level = 2;
      else {
        const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
        Q.level = (coarse && Math.min(innerWidth, innerHeight) < 520) ? 1 : 2;
      }
      Q.maxLevel = Q.auto ? 2 : Q.level;
      Q.dprScale = 1;
      Q.lowN = 0;
      Q.highN = 0;
      Q.acc = 0;
      Q.frames = 0;
      Q.grace = 2.0;
      Q.apply();
    },

    /** Notify quality controller of scene change or unpause so load spikes never trigger false quality drops */
    notifyTransition(sec) {
      Q.grace = Math.max(Q.grace, sec == null ? 1.8 : sec);
      Q.acc = 0;
      Q.frames = 0;
      Q.lowN = 0;
    },

    pixelRatio() {
      const dev = window.devicePixelRatio || 1;
      const tierDpr = CFG.quality.dpr[Q.level] || 1;
      const raw = Math.min(dev, tierDpr, CFG.perf.dprCap) * Q.dprScale;
      const crispFloor = Math.min(dev, 1.0);
      return Math.max(crispFloor, raw);
    },

    apply() {
      WZ.THREEQ = CFG.quality.particles[Q.level] || 1;
      if (Q.renderer) Q.renderer.setPixelRatio(Q.pixelRatio());
    },

    setLevel(lv) {
      const next = Math.max(0, Math.min(2, lv | 0));
      const changed = next !== Q.level;
      Q.level = next;
      Q.apply();
      if (changed && Q.onChange) Q.onChange(Q.level);
      WZ.Events.emit('quality:resize');
    },

    /** Call every rendered frame with the real frame time */
    update(dt) {
      if (!Q.auto) return;
      // Ignore single-frame hitches (tab switch, shader compile, GC pause)
      if (dt <= 0 || dt >= 0.08) return;
      if (Q.grace > 0) {
        Q.grace -= dt;
        return;
      }
      Q.acc += dt;
      Q.frames++;
      if (Q.acc < 1.5) return;

      const fps = Q.frames / Q.acc;
      Q.acc = 0;
      Q.frames = 0;
      Q.fps = fps;

      if (fps < 38) {
        Q.highN = 0;
        if (++Q.lowN >= 2) {
          Q.lowN = 0;
          if (Q.dprScale > Q.minDprScale + 0.01) {
            Q.dprScale = Math.max(Q.minDprScale, +(Q.dprScale - 0.08).toFixed(2));
            Q.apply();
            WZ.Events.emit('quality:resize');
          } else if (Q.level > 0) {
            Q.level--;
            Q.dprScale = 0.92;
            Q.grace = 1.5;
            Q.apply();
            if (Q.onChange) Q.onChange(Q.level);
            WZ.Events.emit('quality:resize');
          }
        }
      } else if (fps > 54) {
        Q.lowN = 0;
        if (++Q.highN >= 3) {
          Q.highN = 0;
          if (Q.dprScale < 0.99) {
            Q.dprScale = Math.min(1, +(Q.dprScale + 0.08).toFixed(2));
            Q.apply();
            WZ.Events.emit('quality:resize');
          } else if (Q.level < Q.maxLevel) {
            Q.level++;
            Q.dprScale = 0.92;
            Q.grace = 1.5;
            Q.apply();
            if (Q.onChange) Q.onChange(Q.level);
            WZ.Events.emit('quality:resize');
          }
        }
      } else {
        Q.lowN = 0;
        if (Q.highN > 0) Q.highN--;
      }
    },
  };

  WZ.Quality = Q;
})(window.WZ = window.WZ || {});
