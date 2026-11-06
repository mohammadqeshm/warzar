/* WZ.Quality — graphics tier (0 low / 1 med / 2 high) + automatic pixel-ratio scaling from measured FPS. DPR capped at 2. */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG;

  const Q = {
    level: 2, dprScale: 1, renderer: null, acc: 0, frames: 0, lowN: 0, highN: 0, auto: true, onChange: null,

    init(renderer) {
      Q.renderer = renderer;
      const pref = WZ.Save.data.settings.quality;
      Q.auto = pref === 'auto';
      if (pref === 'low') Q.level = 0; else if (pref === 'med') Q.level = 1; else if (pref === 'high') Q.level = 2;
      else {
        const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
        Q.level = coarse || Math.min(innerWidth, innerHeight) < 600 ? 1 : 2;
      }
      Q.apply();
    },
    pixelRatio() { return Math.min(window.devicePixelRatio || 1, CFG.quality.dpr[Q.level], CFG.perf.dprCap) * Q.dprScale; },
    apply() { if (Q.renderer) Q.renderer.setPixelRatio(Q.pixelRatio()); },

    /** call every rendered frame with the real frame time */
    update(dt) {
      if (!Q.auto) return;
      Q.acc += dt; Q.frames++;
      if (Q.acc < 1.5) return;
      const fps = Q.frames / Q.acc; Q.acc = 0; Q.frames = 0;
      Q.fps = fps;
      if (fps < 40) {
        Q.highN = 0;
        if (++Q.lowN >= 2) {
          Q.lowN = 0;
          if (Q.dprScale > 0.62) Q.dprScale = Math.max(0.6, Q.dprScale - 0.15);
          else if (Q.level > 0) { Q.level--; Q.dprScale = 0.85; if (Q.onChange) Q.onChange(Q.level); }
          Q.apply(); WZ.Events.emit('quality:resize');
        }
      } else if (fps > 57) {
        Q.lowN = 0;
        if (++Q.highN >= 6 && Q.dprScale < 1) { Q.highN = 0; Q.dprScale = Math.min(1, Q.dprScale + 0.1); Q.apply(); WZ.Events.emit('quality:resize'); }
      } else { Q.lowN = 0; Q.highN = 0; }
    },
  };
  Q.fps = 60;
  WZ.Quality = Q;
})(window.WZ = window.WZ || {});
