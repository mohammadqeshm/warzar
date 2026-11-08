/* Mission scene: briefing -> play -> ending -> result (phases of one scene in M1).
 * Owns the world, entities and systems for one mission and disposes everything in exit(). */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, U = WZ.U, Cam = WZ.Cam;
  const t = (k, v) => WZ.I18n.t(k, v);
  const v3 = new T.Vector3(), tmp = { x: 0, z: 0 };
  const TIPS = ['brief.tip1', 'brief.tip2', 'brief.tip3', 'brief.tip4', 'brief.tip5', 'brief.tip6', 'brief.tip7', 'brief.tip8', 'brief.tip9'];

  const M = {
    name: 'mission', phase: 'none',

    enter(data) {
      const Main = WZ.Main;
      M.data = data; M.unsub = [];
      const tutorial = data.tutorial != null ? data.tutorial : (data.index <= CFG.mission.tutorialIndex && !WZ.Save.data.flags.tutorialDone);
      M.mission = WZ.Missions.make(data.index, tutorial);
      M.scene = new T.Scene();
      M.map = WZ.World.generate(data.runSeed, data.index, { tutorial });
      M.col = WZ.Collision.create(M.map);
      M.view = WZ.WorldView.build(M.map, M.scene, { quality: WZ.Quality.level });
      WZ.Particles.init(M.scene); WZ.Blobs.init(M.scene, 72);
      M.small = new WZ.SmallProps(M.scene, M.map);
      M.crates = new WZ.Crates(M.scene, M.map);
      M.jeep = new WZ.Jeep(M.map, M.col, M.scene);
      WZ.Enemies.init(M.scene, M.map, M.col);
      M.ctx = { scene: M.scene, map: M.map, col: M.col, jeep: M.jeep, enemies: WZ.Enemies, crates: M.crates, particles: WZ.Particles, fx: WZ.Fx, nana: null };
      M.nana = new WZ.Nana(M.ctx); M.ctx.nana = M.nana;
      WZ.Hazards.init(M.ctx, M.mission, WZ.RNG.hash(WZ.RNG.hash(data.runSeed, data.index), 911));
      WZ.Landmines.init(M.ctx); WZ.Turrets.init(M.ctx);
      WZ.Gun.init(M.scene); WZ.Spawner.reset();
      M.crates.onLanded = M.onCrateLanded;
      M.inp = { x: 0, y: 0, mag: 0, boost: false };
      M.hud = { timerText: '', timerLow: false, heat: 0, heatOn: true, cratesText: '', hp: 1, hpMax: 1, nanaOut: false, nanaHp: 1, nanaMax: 1, deploy: 'off', boostPct: 1, prompt: '', hint: '', objective: '', gunBoost: false, mines: 0, turretPct: 1, turretN: 0 };

      M.phase = 'briefing'; M.t = 0; M.time = 0; M.timeLeft = M.mission.timeLimit; M.heat = 0;
      M.coinsCrates = 0; M.landed = 0; M.allLoaded = false; M.deployedOnce = false; M.spawnAt = 1e9;
      M.hintT = 0; M.hintKey = ''; M.failT = -1; M.endT = 0; M.flashCd = 0; M.dustT = 0; M.beepT = 0; M.resultShown = false;
      M.camBlend = 0; M.fromPos = new T.Vector3(); M.fromLook = new T.Vector3();
      const b = WZ.Save.data.best; M.prevBest = b.mission;
      if (data.index > b.mission) { b.mission = data.index; WZ.Save.save(); }

      M.unsub.push(
        WZ.Events.on('nana:ko', M.onNanaKO), WZ.Events.on('jeep:damaged', M.onJeepHurt),
        WZ.Events.on('jeep:destroyed', M.onJeepDead), WZ.Events.on('enemy:ko', M.onEnemyKO), WZ.Events.on('nana:deploy', M.onDeploy));

      M.jeep.sync(1, 0.016, 0); M.nana.render(1, 0.016, 0);
      Cam.snap(M.jeep.rx, M.jeep.ry, M.jeep.rz);
      WZ.UI.hudShow(false); WZ.UI.resetHudCache();
      WZ.UI.bindHud({ deploy: () => WZ.Input.press('deploy'), mine: () => WZ.Input.press('mine'), turret: () => WZ.Input.press('turret'), pause: () => WZ.Main.togglePause() });
      WZ.Input.reset();
      M.briefEl = WZ.UI.showBriefing({ index: data.index, crates: M.mission.crateCount, time: M.mission.timeLimit, tutorial, tip: t(TIPS[(data.index - 1) % TIPS.length]) }, M.startPlay);
      void Main;
    },

    startPlay() {
      if (M.phase !== 'briefing') return;
      M.phase = 'play'; M.briefEl = null;
      M.fromPos.copy(Cam.cam.position); M.fromLook.set(M.jeep.rx, M.jeep.ry + 1.5, M.jeep.rz); M.camBlend = 1;
      WZ.UI.clearScreens(); WZ.UI.hudShow(true); WZ.UI.resetHudCache();
      WZ.Audio.engineStart(); WZ.Input.reset();
    },

    exit() {
      M.unsub.forEach((f) => f());
      WZ.Audio.engineStop(); WZ.Input.reset(); WZ.UI.hudShow(false); WZ.UI.clearScreens(); WZ.Fx.clear();
      M.jeep.dispose(); M.nana.dispose(); M.crates.dispose(); M.small.dispose(); WZ.Enemies.dispose(); WZ.Gun.dispose();
      WZ.Blobs.dispose(M.scene); WZ.Particles.dispose(); M.view.dispose();
      WZ.Hazards.dispose(); WZ.Landmines.dispose(); WZ.Turrets.dispose();
      M.scene = null; WZ.Main.renderer.renderLists.dispose();
    },

    canPause() { return M.phase === 'play'; },

    // ------------------------------------------------------------------ events
    onNanaKO() {
      M.timeLeft -= CFG.nana.koTimePenalty;
      const n = M.nana;
      WZ.Fx.text(t('hud.nanako', { s: CFG.nana.koTimePenalty }), n.rx, n.ry + 5, n.rz, 'warn'); WZ.Fx.flash('hurt'); WZ.Fx.shake(0.4);
    },
    onJeepHurt() {
      if (M.flashCd <= 0) { M.flashCd = 0.35; WZ.Fx.flash('hurt'); WZ.Fx.shake(0.12); }
    },
    onJeepDead() {
      const j = M.jeep, P = WZ.Particles;
      WZ.Audio.sfx('boom'); WZ.Fx.shake(0.9);
      P.poof(j.x, j.ry + 2, j.z, 18, 2.2); P.sparks(j.x, j.ry + 2, j.z, 30, 1, 0.6, 0.2);
      j.cmdr.setMode('ko'); M.nana.cheer = false;
      M.failT = 1.1;
    },
    onEnemyKO() { M.kosThisMission = (M.kosThisMission || 0); },
    onDeploy() {
      M.deployedOnce = true;
      if (M.mission.tutorial) M.spawnAt = M.time + CFG.spawn.tutorialDelay;
      WZ.Particles.dust(M.jeep.x, M.jeep.ry, M.jeep.z, 5);
    },
    onCrateLanded(c) {
      const j = M.jeep, coins = CFG.calc.coinCrate(M.data.index);
      M.landed++; M.coinsCrates += coins;
      WZ.Save.data.coins += coins; M.data.runCoins = (M.data.runCoins || 0) + coins; WZ.Save.save();
      j.addCrate(); j.cmdr.punch(0.9);
      WZ.Fx.text('+' + coins, j.rx, j.ry + 5.5, j.rz, 'coin'); WZ.Fx.text(t('hud.delivered'), j.rx, j.ry + 8, j.rz, 'good');
      WZ.Particles.sparks(j.rx, j.ry + 3, j.rz, 14, 1, 0.8, 0.2); WZ.Audio.sfx('deliver'); WZ.Fx.flash('good');
      void c;
    },

    doDeploy() {
      const r = M.nana.press();
      if (r === 'nocrate') { M.hintKey = 'hud.nocrate'; M.hintT = 1.8; WZ.Audio.sfx('beep'); }
    },

    // ------------------------------------------------------------------ simulation (fixed step)
    update(dt) {
      M.t += dt;
      const I = WZ.Input, J = M.jeep, N = M.nana;
      if (I.consume('debug')) WZ.UI.toggleDebug();
      if (M.phase === 'briefing') { if (I.consume('deploy') && M.briefEl) M.briefEl._go(); I.consume('boost'); I.consume('mine'); I.consume('turret'); return; }
      if (M.flashCd > 0) M.flashCd -= dt;
      if (M.hintT > 0) M.hintT -= dt;

      if (M.phase === 'play') {
        I.update(); M.inp.x = I.stick.x; M.inp.y = I.stick.y; M.inp.mag = I.stick.mag; M.inp.boost = I.consume('boost');
        if (I.consume('deploy')) M.doDeploy();
        if (I.consume('mine')) WZ.Landmines.plant();
        if (I.consume('turret')) WZ.Turrets.plant();
        if (I.consume('skip') && WZ.UI.dbgOn) { M.complete(); }
        M.time += dt;
      } else { M.inp.x = M.inp.y = M.inp.mag = 0; M.inp.boost = false; I.consume('deploy'); I.consume('boost'); I.consume('mine'); I.consume('turret'); }

      J.step(dt, M.inp, Cam.yaw);
      M.afterJeep(dt);
      N.step(dt);
      WZ.Enemies.update(dt, M.ctx);
      WZ.Gun.update(dt, M.ctx);
      M.small.hit(J, WZ.Particles); M.small.update(dt);
      WZ.Hazards.update(dt, M.ctx, M.phase === 'play', M.time);
      if (M.phase === 'play') { WZ.Landmines.update(dt); WZ.Turrets.update(dt); }
      M.effects(dt);
      WZ.Audio.engineSet(Math.min(1, J.speed / J.P.boostSpeed), J.throttle, J.boosting);

      if (M.phase === 'play') M.rules(dt);
      else if (M.phase === 'ending') {
        M.endT += dt;
        if (!M.resultShown && M.endT >= (M.endKind === 'complete' ? 1.9 : 1.5)) M.showResult();
      }
    },

    afterJeep(dt) {
      const J = M.jeep, E = WZ.Enemies, P = WZ.Particles;
      if (J.impact > 0) {
        if (J.impact > 7) {
          WZ.Fx.shake(Math.min(0.6, 0.12 + (J.impact - 7) * 0.025)); WZ.Audio.sfx('crash', Math.min(1, J.impact / 14));
          P.sparks(J.x + Math.sin(J.h) * 2, J.ry + 1.2, J.z + Math.cos(J.h) * 2, 6, 1, 0.8, 0.4); P.dust(J.x + Math.sin(J.h) * 2, J.ry, J.z + Math.cos(J.h) * 2, 3);
        }
        J.impact = 0;
      }
      if (J.speed > 1.5 && J.alive) { // ramming
        const fx = Math.sin(J.h), fz = Math.cos(J.h);
        E.hash.query(J.x + fx * 0.8, J.z + fz * 0.8, 4, E.q);
        for (let i = 0; i < E.q.length; i++) {
          const e = E.q[i]; if (!e.active || e.state === 2) continue;
          const rad = CFG.enemies[e.type].radius + 1.7;
          const d1 = Math.hypot(e.x - (J.x + fx * 1.4), e.z - (J.z + fz * 1.4)), d2 = Math.hypot(e.x - J.x, e.z - J.z);
          if (d1 > rad && d2 > rad) continue;
          if (J.speed * J.P.ram >= CFG.ram.minSpeed) {
            const dx = e.x - J.x + J.vx * 0.1, dz = e.z - J.z + J.vz * 0.1;
            E.ko(e, dx, dz, CFG.ram.knock * 0.5, 'ram');
            WZ.Fx.hitstop(0.045); WZ.Fx.shake(0.22); WZ.Audio.sfx('ram');
            P.sparks(e.x, J.ry + 1.5, e.z, 6, 1, 0.9, 0.5); WZ.Fx.text(t('hud.ram'), e.x, J.ry + 3.4, e.z, 'bonk');
          } else { const dx = e.x - J.x, dz = e.z - J.z, l = Math.hypot(dx, dz) || 1; e.vx += dx / l * 2; e.vz += dz / l * 2; }
        }
      }
      void dt;
    },

    effects(dt) {
      const J = M.jeep, P = WZ.Particles, sp = J.speed;
      if (sp > 3.5 && J.alive) {
        M.dustT -= dt;
        if (M.dustT <= 0) {
          M.dustT = Math.max(0.035, 0.15 - sp * 0.004);
          for (let s = -1; s <= 1; s += 2) {
            J.localToWorld(s * 1.4, -2.0, tmp);
            P.emit(0, tmp.x, J.ry + 0.4, tmp.z, -J.vx * 0.1 + (Math.random() - 0.5), 0.8 + Math.random(), -J.vz * 0.1 + (Math.random() - 0.5), 0.55 + Math.random() * 0.4, 0.9, 2.6, 0.72, 0.6, 0.4, 0.45, 0, 0, 1.5);
          }
        }
      }
      if (J.boosting) {
        J.localToWorld(-1.0, -2.8, tmp);
        P.emit(1, tmp.x, J.ry + 0.8, tmp.z, -J.vx * 0.2 + (Math.random() - 0.5), 0.5 + Math.random(), -J.vz * 0.2 + (Math.random() - 0.5), 0.3, 1.5, 0.2, 1, 0.65, 0.2, 0.9, 0, 0, 2);
      }
      if (J.justBoosted) { J.justBoosted = false; WZ.Fx.shake(0.3); }
      if (!J.alive && Math.random() < dt * 20) P.emit(0, J.x + (Math.random() - 0.5) * 2, J.ry + 2.2, J.z + (Math.random() - 0.5) * 2, 0, 4 + Math.random() * 2, 0, 1.2, 1.6, 5, 0.18, 0.18, 0.2, 0.7, 0, 0, 0.3);
    },

    rules(dt) {
      const J = M.jeep, N = M.nana, E = WZ.Enemies;
      // Heat: rises while (nearly) stationary, falls while moving. Off in the tutorial.
      if (M.mission.heatOn) {
        if (J.speed < CFG.heat.stillSpeed) M.heat = Math.min(CFG.heat.max, M.heat + CFG.heat.rise * dt);
        else M.heat = Math.max(0, M.heat - CFG.heat.fall * dt);
      } else M.heat = 0;
      const spawnOn = !M.mission.tutorial || (M.deployedOnce && M.time >= M.spawnAt);
      WZ.Spawner.update(dt, { enabled: spawnOn, mission: M.mission, heat: M.heat, jeep: J, map: M.map, col: M.col, enemies: E });

      M.timeLeft -= dt;
      if (M.timeLeft <= CFG.timer.lowWarn && M.timeLeft > 0) { M.beepT -= dt; if (M.beepT <= 0) { M.beepT = 1; WZ.Audio.sfx('beep'); } }
      if (M.timeLeft <= 0) { M.timeLeft = 0; M.fail('time'); return; }

      if (!M.allLoaded) {
        let all = true;
        for (let i = 0; i < M.crates.list.length; i++) if (M.crates.list[i].state !== 'delivered') { all = false; break; }
        if (all) { M.allLoaded = true; if (M.view.extract) M.view.extract.setActive(true); WZ.Audio.sfx('go'); }
      }
      if (M.allLoaded && N.state === 'IN_JEEP' && M.map.extract) {
        const ex = M.map.extract;
        if (Math.hypot(J.x - ex.x, J.z - ex.z) < ex.r) { M.complete(); return; }
      }
      if (M.failT >= 0) { M.failT -= dt; if (M.failT < 0) M.fail('jeep'); }
    },

    complete() {
      if (M.phase !== 'play') return;
      M.phase = 'ending'; M.endKind = 'complete'; M.endT = 0;
      WZ.Audio.engineStop(); WZ.Audio.sfx('win'); WZ.UI.hudShow(false);
      M.jeep.cmdr.setMode('cheer'); M.nana.cheer = true;
      WZ.Particles.confetti(M.jeep.x, M.jeep.ry + 4, M.jeep.z, 60);
    },
    fail(reason) {
      if (M.phase !== 'play') return;
      M.phase = 'ending'; M.endKind = 'fail'; M.failReason = reason; M.endT = 0;
      WZ.Audio.engineStop(); WZ.Audio.sfx('lose'); WZ.UI.hudShow(false);
    },

    showResult() {
      M.resultShown = true;
      const S = WZ.Save.data, idx = M.data.index, win = M.endKind === 'complete', Main = WZ.Main;
      const kos = WZ.Enemies.kos;
      let coinsDone = 0, coinsTime = 0;
      if (win) {
        coinsDone = CFG.calc.completion(idx); coinsTime = CFG.calc.timeBonus(M.timeLeft);
        S.coins += coinsDone + coinsTime; M.data.runCoins = (M.data.runCoins || 0) + coinsDone + coinsTime;
        if (M.mission.tutorial) S.flags.tutorialDone = true;
        if (!S.best.fastestMission || M.time < S.best.fastestMission) S.best.fastestMission = Math.round(M.time);
      }
      const record = idx > M.prevBest && idx > 1;
      if (kos > S.best.kos) S.best.kos = kos;
      if ((M.data.runCoins || 0) > S.best.runCoins) S.best.runCoins = M.data.runCoins;
      WZ.Save.save(); WZ.Save.flush();
      const goMain = () => {
        if (win) Main.go('mission', { index: idx + 1, runSeed: M.data.runSeed, runCoins: M.data.runCoins || 0 });
        else Main.go('mission', { index: Main.startIndex, runSeed: WZ.Save.newRunSeed(), runCoins: 0 });
      };
      WZ.UI.showSummary({
        kind: win ? 'complete' : 'fail', reason: M.failReason, index: idx, crates: M.landed, total: M.crates.total, kos, timeLeft: M.timeLeft,
        coinsCrates: M.coinsCrates, coinsDone, coinsTime, wallet: S.coins, record,
      }, {
        main: goMain,
        garage: () => Main.go('shop', { ret: goMain }),
        menu: () => Main.go('menu'),
      });
    },

    // ------------------------------------------------------------------ prompts / hints
    promptText() {
      if (!M.mission.tutorial) return '';
      const J = M.jeep, N = M.nana, C = M.crates;
      if (M.allLoaded) return t('tut.extract');
      switch (N.state) {
        case 'IN_JEEP': {
          const near = C.nearestAvailable(J.x, J.z, CFG.nana.deployRadius);
          if (near) return t('tut.deploy');
          return M.landed > 0 ? t('tut.next') : t('tut.drive');
        }
        case 'RUNNING_OUT': case 'GRABBING': return t('tut.defend');
        case 'RETURNING': case 'RECALLING': return J.speed > CFG.nana.boardSpeed ? '' : t('hud.wait');
        default: return '';
      }
    },
    hintText() {
      const N = M.nana, J = M.jeep;
      if (M.hintT > 0) return t(M.hintKey);
      const hz = WZ.Hazards.hint(); if (hz) return t(hz);
      if (N.returning && J.speed >= CFG.nana.boardSpeed * 0.95) return t('hud.slow');
      if (N.isKO) return t('hud.rescue');
      return '';
    },

    // ------------------------------------------------------------------ render
    render(alpha, dt) {
      const Main = WZ.Main, J = M.jeep, N = M.nana, cam = Cam.cam, w = Main.w, h = Main.h;
      J.sync(alpha, dt, M.t); N.render(alpha, dt, M.t);
      WZ.Blobs.begin();
      for (let i = 0; i < M.crates.list.length; i++) { const c = M.crates.list[i]; if (c.state === 'idle') WZ.Blobs.add(c.x, c.gy, c.z, 3.6); }
      WZ.Enemies.render(alpha, M.t);
      WZ.Blobs.end();
      M.crates.update(dt, M.t, cam);

      if (M.phase === 'briefing') Cam.orbit(J.rx, J.ry, J.rz, M.t * 0.35 + 2.6, 22, 9);
      else if (M.phase === 'ending' && M.endKind === 'complete') Cam.orbit(J.rx, J.ry, J.rz, M.t * 0.5, 17, 7.5);
      else {
        Cam.update(dt, J, N, WZ.Fx.shakeOn ? 1 : 0);
        if (M.camBlend > 0) {
          M.camBlend = Math.max(0, M.camBlend - dt / 0.9);
          const k = U.smooth(0, 1, M.camBlend);
          v3.copy(cam.position).lerp(M.fromPos, k); cam.position.copy(v3);
          v3.copy(Cam.aim).lerp(M.fromLook, k); cam.lookAt(v3); cam.updateMatrixWorld(true);
        }
      }
      if (WZ.Debug.cam) WZ.Debug.cam(cam, M); // QA hook (tests only)
      M.view.followLight(J.rx, J.ry, J.rz);
      M.view.update(M.t, dt, cam);
      WZ.Gun.render(dt);
      WZ.Particles.update(dt, cam);
      WZ.Fx.update(dt, cam, w, h);

      if (M.phase === 'play') { M.updateHud(); M.updateArrows(w, h); }
      if (WZ.UI.dbgOn) M.debugText();
      WZ.Hazards.render(dt, M.t); WZ.Landmines.render(dt, M.t); WZ.Turrets.render(dt, M.t);
      Main.renderer.render(M.scene, cam);
    },

    updateHud() {
      const J = M.jeep, N = M.nana, hd = M.hud;
      hd.timerText = U.fmtTime(M.timeLeft); hd.timerLow = M.timeLeft <= CFG.timer.lowWarn;
      hd.heat = M.heat; hd.heatOn = M.mission.heatOn;
      hd.cratesText = M.landed + '/' + M.crates.total;
      hd.hp = J.hp; hd.hpMax = J.maxHp; hd.nanaOut = N.out; hd.nanaHp = N.hp; hd.nanaMax = N.maxHp;
      if (N.state === 'IN_JEEP') hd.deploy = M.crates.nearestAvailable(J.x, J.z, CFG.nana.deployRadius) ? 'deploy-ready' : 'deploy';
      else hd.deploy = (N.state === 'KO' || N.state === 'BOARDING' || N.state === 'RECALLING') ? 'off' : 'recall';
      hd.boostPct = J.boostPct;
      hd.prompt = M.promptText(); hd.hint = M.hintText();
      hd.objective = t(M.allLoaded ? (N.out ? 'hud.obj.nana' : 'hud.obj.extract') : 'hud.obj.find');
      hd.gunBoost = WZ.Gun.boosted; hd.mines = WZ.Landmines.count; hd.turretPct = WZ.Turrets.cdPct; hd.turretN = WZ.Turrets.count;
      WZ.UI.updateHUD(hd);
    },

    /** arrows (with distance) to the 3 nearest crates and to the extraction zone once everything is loaded */
    updateArrows(w, h) {
      const J = M.jeep, cam = Cam.cam, list = M.crates.list;
      let n = 0;
      if (M.allLoaded && M.map.extract) { M.arrow(n++, M.map.extract.x, M.view.map.height(M.map.extract.x, M.map.extract.z) + 3, M.map.extract.z, 'exit', w, h); }
      else {
        let last = -1, lastD = -1;
        for (let k = 0; k < 3; k++) {
          let bi = -1, bd = 1e12;
          for (let i = 0; i < list.length; i++) {
            const c = list[i]; if (c.state !== 'idle' || i === last || (k > 0 && (c.x - J.x) * (c.x - J.x) + (c.z - J.z) * (c.z - J.z) <= lastD)) continue;
            const d = (c.x - J.x) * (c.x - J.x) + (c.z - J.z) * (c.z - J.z); if (d < bd) { bd = d; bi = i; }
          }
          if (bi < 0) break;
          last = bi; lastD = bd; const c = list[bi]; M.arrow(n++, c.x, c.gy + 4, c.z, k === 0 ? 'crate' : 'crate far', w, h);
        }
      }
      const tp = WZ.Hazards.arrowPos(); if (tp) M.arrow(n++, tp.x, tp.y, tp.z, 'storm', w, h);
      void cam; WZ.UI.hideArrows(n);
    },
    arrowTop(w) { const narrow = w < 520; return M.hud.prompt ? (narrow ? 285 : 200) : (narrow ? 150 : 124); },
    arrow(i, x, y, z, kind, w, h) {
      const J = M.jeep; v3.set(x, y, z).project(Cam.cam);
      const behind = v3.z > 1; let sx = v3.x, sy = v3.y;
      if (behind) { sx = -sx; sy = -sy; }
      const dist = Math.round(Math.hypot(x - J.x, z - J.z)) + 'm';
      const on = !behind && Math.abs(sx) < 0.9 && Math.abs(sy) < 0.84;
      if (on) { WZ.UI.setArrow(i, (sx * 0.5 + 0.5) * w, Math.max(M.arrowTop(w), (-sy * 0.5 + 0.5) * h - 34), 180, dist, kind, true); return; }
      const m = Math.max(Math.abs(sx) / 0.92, Math.abs(sy) / 0.85, 1e-4);
      const ex = sx / m, ey = sy / m;
      const px = U.clamp((ex * 0.5 + 0.5) * w, 40, w - 40), py = U.clamp((-ey * 0.5 + 0.5) * h, M.arrowTop(w), h - 56);
      WZ.UI.setArrow(i, px, py, Math.atan2(sx, sy) * 180 / Math.PI, dist, kind, false);
    },

    debugText() {
      const r = WZ.Main.renderer.info.render, Q = WZ.Quality;
      WZ.UI.debug('FPS ' + WZ.Main.fps.toFixed(0) + '  calls ' + r.calls + '  tris ' + r.triangles + '\nmission ' + M.data.index + '  seed ' + M.data.runSeed + '  gen attempts ' + M.map.attempts + (M.map.fallback ? ' (fallback)' : '') +
        '\nenemies ' + WZ.Enemies.alive + '  heat ' + M.heat.toFixed(2) + '  jeep ' + M.jeep.speed.toFixed(1) + ' u/s' + '\nquality ' + Q.level + ' dpr x' + Q.dprScale.toFixed(2) + '  nana ' + M.nana.state + '\n[N] skip mission');
    },
  };

  WZ.Scenes = WZ.Scenes || {};
  WZ.Scenes.mission = M;
})(window.WZ = window.WZ || {});
