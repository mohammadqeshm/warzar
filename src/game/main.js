/* WZ.Main — bootstrap, renderer, scene state machine (menu <-> mission), fixed-step loop with render interpolation,
 * pause handling (user pause + platform/hidden pause => simulation, rendering and audio all stop). */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG;
  const TEX = ['camoGreen', 'camoDark', 'wood', 'crate', 'stone', 'plaster', 'roofRust', 'sandbag', 'soft', 'glow', 'blob', 'star', 'beam', 'eye', 'faceEnemy', 'chevron', 'smiley', 'nanaDecals', 'camoCmdr', 'camoNana', 'camoSoldier', 'cmdrEmblem', 'faceCmdr', 'faceNana', 'faceSoldier'];

  WZ.Debug = WZ.Debug || {}; // QA hooks (e.g. WZ.Debug.cam) - empty in production

  const Main = {
    started: false, renderer: null, cur: null, scenes: {}, userPaused: false, platformPaused: false, w: 1, h: 1, acc: 0, last: 0, fps: 60, _fa: 0, _fn: 0,
    startIndex: 1, params: new URLSearchParams(location.search),

    get paused() { return Main.userPaused || Main.platformPaused; },

    async start(host) {
      if (Main.started) return;
      Main.started = true;
      try {
        WZ.Save.load(); WZ.I18n.init();
        const els = WZ.UI.mount(host);
        const m = parseInt(Main.params.get('m') || '', 10);
        Main.startIndex = m > 0 ? m : Math.max(1, WZ.Save.data.level || 1);
        if (Main.params.get('debug')) WZ.UI.toggleDebug(true);
        WZ.Audio.setMuted(!WZ.Save.data.settings.sound);
        Main.scenes = { menu: WZ.Scenes.menu, mission: WZ.Scenes.mission, shop: WZ.Scenes.shop };

        const q0 = WZ.Save.data.settings.quality, lvlGuess = (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 1 : 2;
        const lvl = q0 === 'low' ? 0 : q0 === 'med' ? 1 : q0 === 'high' ? 2 : lvlGuess;
        try {
          Main.renderer = new T.WebGLRenderer({ canvas: els.canvas, antialias: CFG.quality.aa[lvl], powerPreference: 'high-performance', alpha: false });
        } catch (e) {
          const sub = document.querySelector('.load-sub'); if (sub) sub.textContent = 'WebGL is not available on this device.';
          throw e;
        }
        const r = Main.renderer;
        r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.setClearColor(0xA9D3F2);

        WZ.Cam.init();
        WZ.Input.init(els.touch, els.stickBase, els.stickKnob); WZ.UI.setDevice(WZ.Input.device);
        WZ.Fx.init(document.getElementById('wz-float'), document.getElementById('wz-flash')); WZ.Fx.shakeOn = !!WZ.Save.data.settings.shake;
        WZ.Quality.init(r);
        WZ.Quality.onChange = (lv) => { Main.applyQualityRuntime(lv); };
        Main.resize();
        window.addEventListener('resize', Main.resize);
        window.addEventListener('orientationchange', () => {
          Main.resize();
          setTimeout(Main.resize, 80);
          setTimeout(Main.resize, 220);
          setTimeout(Main.resize, 420);
        });
        if (window.visualViewport) window.visualViewport.addEventListener('resize', Main.resize);
        WZ.Events.on('quality:resize', Main.resize);

        WZ.Events.on('game:pause', () => { Main.platformPaused = true; if (Main.cur && Main.cur.canPause && Main.cur.canPause()) Main.setUserPause(true, true); });
        WZ.Events.on('game:resume', () => { Main.platformPaused = false; Main.last = performance.now() / 1000; if (Main.userPaused) WZ.Audio.suspend(); });
        await WZ.Platform.init();

        for (let i = 0; i < TEX.length; i++) { WZ.Assets.tex(TEX[i]); WZ.UI.loading((i + 1) / (TEX.length + 2)); if (i % 4 === 3) await new Promise((res) => setTimeout(res, 0)); }
        await new Promise((res) => setTimeout(res, 16));
        Main.go('menu');
        WZ.UI.loading(1); WZ.UI.loading(false);
        WZ.Platform.gameReady(); // first interactive screen is up
        Main.last = performance.now() / 1000;
        requestAnimationFrame(Main.frame);
      } catch (e) {
        console.error('[WARZAR] boot failed', e);
      }
    },

    go(name, data) {
      if (Main.cur) Main.cur.exit();
      WZ.Input.reset(); WZ.Fx.clear(); Main.userPaused = false; Main.acc = 0;
      Main.cur = Main.scenes[name];
      Main.cur.enter(data || {});
      WZ.Events.emit('scene:change', name);
    },

    applyQualityRuntime(lv) { const s = Main.cur; if (s && s.view && s.view.sun && lv === 0) s.view.sun.castShadow = false; },

    resize() {
      const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
      Main.w = w; Main.h = h;
      if (!Main.renderer) return;
      Main.renderer.setPixelRatio(WZ.Quality.pixelRatio());
      Main.renderer.setSize(w, h, false);
      WZ.Cam.resize(w, h);
    },

    setUserPause(on, silent) {
      if (on === Main.userPaused) return;
      Main.userPaused = on;
      if (on) {
        WZ.Audio.suspend(); WZ.Input.reset();
        WZ.UI.showPause({
          resume: () => Main.setUserPause(false),
          restart: () => {
            Main.userPaused = false; WZ.Audio.resume();
            const lvl = Math.max(1, (WZ.Save.data && WZ.Save.data.level) || Main.startIndex || 1);
            Main.go('mission', { index: lvl, runSeed: WZ.Save.newRunSeed(), runCoins: 0 });
          },
          menu: () => { Main.userPaused = false; WZ.Audio.resume(); Main.go('menu'); },
        });
      } else {
        WZ.UI.removeScreen('pause'); if (!Main.platformPaused) WZ.Audio.resume();
        Main.last = performance.now() / 1000; Main.acc = 0; WZ.Input.reset();
      }
      void silent;
    },
    togglePause() { if (Main.cur && Main.cur.canPause && (Main.cur.canPause() || Main.userPaused)) Main.setUserPause(!Main.userPaused); },

    frame(now) {
      requestAnimationFrame(Main.frame);
      const t = now / 1000;
      let dt = Math.min(0.1, Math.max(0, t - Main.last)); Main.last = t;
      const I = WZ.Input;
      if (Main.platformPaused) return;
      if (I.consume('pause')) Main.togglePause();
      if (Main.userPaused) return;
      const sc = Main.cur; if (!sc) return;

      Main._fa += dt; Main._fn++;
      if (Main._fa >= 0.5) { Main.fps = Main._fn / Main._fa; Main._fa = 0; Main._fn = 0; }
      WZ.Quality.update(dt);

      const step = CFG.sim.step; Main.acc += dt;
      let n = 0;
      while (Main.acc >= step && n < CFG.sim.maxSteps) {
        if (WZ.Fx.stopT > 0) { WZ.Fx.stopT -= step; Main.acc -= step; n++; continue; } // hit-stop
        sc.update(step); Main.acc -= step; n++;
        if (Main.cur !== sc) return; // scene changed during update
      }
      if (n >= CFG.sim.maxSteps) Main.acc = 0;
      sc.render(Main.acc / step, dt);
    },
  };

  WZ.Main = Main;
})(window.WZ = window.WZ || {});
