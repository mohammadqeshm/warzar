/* WZ.Main — bootstrap, renderer, scene state machine (menu <-> mission <-> shop), fixed-step loop with render interpolation,
 * pause handling (user pause + platform/hidden pause => simulation, rendering and audio all stop). */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG;
  const TEX = ['camoGreen', 'camoDark', 'wood', 'crate', 'stone', 'plaster', 'roofRust', 'sandbag', 'soft', 'glow', 'blob', 'star', 'beam', 'eye', 'faceEnemy', 'chevron', 'smiley', 'nanaDecals', 'camoCmdr', 'camoNana', 'camoSoldier', 'cmdrEmblem', 'faceCmdr', 'faceNana', 'faceSoldier'];

  WZ.Debug = WZ.Debug || {}; // QA hooks (e.g. WZ.Debug.cam) - empty in production

  const Main = {
    started: false, renderer: null, cur: null, scenes: {}, userPaused: false, platformPaused: false, w: 1, h: 1, acc: 0, last: 0, fps: 60, _fa: 0, _fn: 0,
    startIndex: 1, lastResult: null, params: new URLSearchParams(typeof location !== 'undefined' ? location.search : ''),

    get paused() { return Main.userPaused || Main.platformPaused; },

    async start(host) {
      if (Main.started) return;
      Main.started = true;
      try {
        WZ.Events.on('game:pause', () => {
          Main.platformPaused = true;
          WZ.Audio.suspend();
          if (Main.cur && Main.cur.canPause && Main.cur.canPause()) Main.setUserPause(true, true);
        });
        WZ.Events.on('game:resume', () => {
          Main.platformPaused = false;
          Main.last = performance.now() / 1000;
          if (Main.userPaused) WZ.Audio.suspend();
          else WZ.Audio.resume();
        });

        // 1. Initialize Playgama Bridge SDK first (Required Step 2)
        await WZ.Platform.init();
        // 2. Load player progress from Bridge Storage (Required Step 4)
        await WZ.Save.init();
        // 3. Apply localization from platform.language (Required Step 3)
        WZ.I18n.init();

        const els = WZ.UI.mount(host);
        if (Main.params.get('unlock')) { WZ.Progress.allOpen = true; } // QA only: open every season and level (nothing is saved)
        const mParam = parseInt(Main.params.get('m') || '', 10);
        Main.startIndex = Math.max(1, (mParam > 0 ? mParam : WZ.Save.data.level) || 1);
        if (Main.params.get('debug')) WZ.UI.toggleDebug(true);

        // 4. Apply user & platform audio state (Required Step 5)
        WZ.Audio.setMuted(!WZ.Save.data.settings.sound);
        if (WZ.Platform && !WZ.Platform.audioEnabled) WZ.Audio.setPlatformMuted(true);

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

        WZ.UI.loading(0);
        WZ.Platform.setLoadingProgress(0);
        for (let i = 0; i < TEX.length; i++) {
          WZ.Assets.tex(TEX[i]);
          const prog = (i + 1) / (TEX.length + 2);
          WZ.UI.loading(prog);
          WZ.Platform.setLoadingProgress(prog);
          if (i % 2 === 1) await new Promise((res) => setTimeout(res, 14));
        }
        const nearDone = (TEX.length + 1) / (TEX.length + 2);
        WZ.UI.loading(nearDone);
        WZ.Platform.setLoadingProgress(nearDone);
        await new Promise((res) => setTimeout(res, 24));
        if (mParam > 0) {
          const theme = WZ.Save.data.settings.map || 'village';
          const lvlCap = Math.max(1, Math.min(CFG.progress.levels, mParam));
          WZ.Save.data.flags.tutorialDone = true;
          Main.go('mission', { theme, level: lvlCap, index: mParam, tutorial: false, runSeed: WZ.Save.newRunSeed(), runCoins: 0 });
        } else {
          Main.go('menu');
        }
        WZ.UI.loading(1);
        WZ.Platform.setLoadingProgress(1);
        await new Promise((res) => setTimeout(res, 140));
        WZ.UI.loading(false);
        // 5. Send game_ready only after loading screen is hidden and first playable frame is interactive (Required Step 6)
        WZ.Platform.gameReady();
        Main.last = performance.now() / 1000;
        requestAnimationFrame(Main.frame);
      } catch (e) {
        console.error('[WARZAR] boot failed', e);
      }
    },

    go(name, data) {
      if (Main.cur) Main.cur.exit();
      WZ.Input.reset(); WZ.Fx.clear(); Main.userPaused = false; Main.acc = 0;
      if (WZ.Quality && WZ.Quality.notifyTransition) WZ.Quality.notifyTransition(2.0);
      Main.cur = Main.scenes[name];
      Main.cur.enter(data || {});
      Main.applyQualityRuntime(WZ.Quality ? WZ.Quality.level : 2);
      WZ.Events.emit('scene:change', name);
    },

    applyQualityRuntime(lv) {
      const r = Main.renderer, s = Main.cur;
      const shSize = (CFG.quality && CFG.quality.shadow && CFG.quality.shadow[lv]) || 0;
      const shadowsOn = shSize > 0;
      if (r && r.shadowMap) {
        r.shadowMap.enabled = shadowsOn;
        r.shadowMap.needsUpdate = true;
      }
      if (s && s.view) {
        if (s.view.applyQuality) s.view.applyQuality(lv, r);
        else if (s.view.sun) {
          s.view.sun.castShadow = shadowsOn;
          if (shadowsOn && s.view.sun.shadow) {
            s.view.sun.shadow.mapSize.set(shSize, shSize);
            if (s.view.sun.shadow.map) { s.view.sun.shadow.map.dispose(); s.view.sun.shadow.map = null; }
          }
        }
      }
      Main.resize();
    },

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
      const d = (Main.cur && Main.cur.data) || {};
      const msgData = d.theme ? { world: String(d.theme), level: String(d.level || 1) } : undefined;
      if (on) {
        WZ.Audio.suspend(); WZ.Input.reset();
        if (WZ.Platform) {
          if (!silent) WZ.Platform.sendMessage('level_paused', msgData);
          WZ.Platform.gameplayStop();
        }
        WZ.UI.showPause({
          resume: () => Main.setUserPause(false),
          restart: () => {
            Main.userPaused = false;
            WZ.UI.removeScreen('pause');
            const goRestart = () => {
              if (!Main.platformPaused) WZ.Audio.resume();
              Main.go('mission', { theme: d.theme, level: d.level, runSeed: WZ.Save.newRunSeed(), runCoins: 0 });
            };
            if (WZ.Platform && WZ.Platform.showInterstitial) WZ.Platform.showInterstitial('pause_restart').then(goRestart);
            else goRestart();
          },
          menu: () => {
            Main.userPaused = false;
            WZ.UI.removeScreen('pause');
            const goMenu = () => {
              if (!Main.platformPaused) WZ.Audio.resume();
              Main.go('menu');
            };
            if (WZ.Platform && WZ.Platform.showInterstitial) WZ.Platform.showInterstitial('pause_menu').then(goMenu);
            else goMenu();
          },
        });
      } else {
        WZ.UI.removeScreen('pause');
        if (!Main.platformPaused) WZ.Audio.resume();
        if (WZ.Platform) {
          WZ.Platform.sendMessage('level_resumed', msgData);
          if (Main.cur && Main.cur.canPause && Main.cur.canPause()) WZ.Platform.gameplayStart(d.theme, d.level);
        }
        if (WZ.Quality && WZ.Quality.notifyTransition) WZ.Quality.notifyTransition(1.2);
        Main.last = performance.now() / 1000; Main.acc = 0; WZ.Input.reset();
      }
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
