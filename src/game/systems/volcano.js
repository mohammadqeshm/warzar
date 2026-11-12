/* WZ.Volcano — everything dangerous about the VOLCANIC WASTELAND map (inactive on the other maps). All numbers: CFG.volcano / CFG.maps.volcanic / CFG.titan.
 *   LAVA     wading through a lava river burns the vehicle (a % of its MAX armor per second, rising with the mission) and Nana, and knocks out enemies.
 *            (The slow-down / heavy steering / current are applied by scenes/mission.js + entities/jeep.js, exactly like the Jurassic river.)
 *   ERUPTION a siren + rumble + a red sky warn for a few seconds, then molten ROCKS fall for a while. They fall SLOWLY (several seconds in the air) and every rock
 *            paints a pulsing red ring on the ground where it will land - drive out of the ring and nothing happens. Landing = blast (damage, burning, KO, scorch).
 *   VENTS    cracked mounds that charge (ring flashes red + rumble), then blast a column of fire. Periodic, with a full warning every time.
 *   POOLS    magma puddles (left by the Magma Titan's slams / boulders / footsteps) that burn whatever stands in them while they glow.
 *   LOBS     the Titan's boulders (WZ.Volcano.lob): a high arc, a ring on the landing spot for the whole flight, blast + magma pool on impact.
 * Everything is pooled (instanced meshes, fixed arrays) - no allocation in the hot paths. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, U = WZ.U, VC = CFG.volcano, EC = VC.erupt, XC = VC.vents, PC = VC.pool, MC = CFG.maps.volcanic;
  const m4 = new T.Matrix4(), qI = new T.Quaternion(), qE = new T.Quaternion(), eE = new T.Euler(), vp = new T.Vector3(), vs = new T.Vector3(), col = new T.Color();
  const d2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);
  const rnd = Math.random, clamp = U.clamp;
  const NV = 20;                                   // vent slots
  const ROCK_COL = [0x5A3A2C, 0x4A3228, 0x6A4636, 0x3A2A24];
  const qd = () => CFG.quality.particles[WZ.Quality ? WZ.Quality.level : 2] || 1;

  const V = {
    on: false, playing: false, ctx: null, mission: null, rng: null, tm: 1, alert: 0, key: '', inLava: false, inPool: false,
    rocks: [], pools: [], vents: [], phase: 'idle', pT: 0, nextT: 0, spawnAcc: 0, pinT: 0, rumbleT: 0, endAlert: 0, eruptions: 0,
    lavaAcc: 0, lavaShow: 0, lavaTxt: 0, poolAcc: 0, poolTxt: 0, poolShow: 0, tickT: 0,
    geos: [], mats: [], meshes: [], rockM: null, mkFill: null, mkRing: null, plCrust: null, plGlow: null, plRim: null, vMound: null, vGlow: null, vCrack: null, vRing: null, vFill: null,

    // ------------------------------------------------------------------ setup
    init(ctx, mission, seed) {
      V.dispose();
      if (!ctx || ctx.map.theme !== 'volcanic') return;
      V.on = true; V.ctx = ctx; V.mission = mission; V.rng = WZ.RNG.create(seed); V.tm = mission.tutorial ? VC.tutorialMul : 1;
      V.phase = 'idle'; V.pT = 0; V.alert = 0; V.eruptions = 0;
      V.nextT = mission.tutorial ? EC.tutorialDelay + V.rng.range(0, 8) : V.rng.range(EC.firstDelay[0], EC.firstDelay[1]);
      V.build();
      V.placeVents(mission.index);
    },

    build() {
      const sc = V.ctx.scene, g = (geo) => { V.geos.push(geo); return geo; }, add = (o) => { const m = new T.MeshBasicMaterial(Object.assign({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false }, o)); V.mats.push(m); return m; };
      const mk = (geo, mat, n, order) => {
        const im = new T.InstancedMesh(geo, mat, n); im.frustumCulled = false; if (order != null) im.renderOrder = order;
        vp.set(0, -200, 0); vs.set(0, 0, 0); m4.compose(vp, qI, vs); col.setRGB(1, 1, 1);
        for (let i = 0; i < n; i++) { im.setMatrixAt(i, m4); im.setColorAt(i, col); }
        im.instanceColor.setUsage(T.DynamicDrawUsage); im.instanceMatrix.setUsage(T.DynamicDrawUsage); sc.add(im); V.meshes.push(im); return im;
      };
      const NR = EC.maxRocks, NP = PC.maxPools;
      const disc = g(new T.CircleGeometry(1, 30).rotateX(-Math.PI / 2)), ring = g(new T.RingGeometry(0.86, 1.0, 44).rotateX(-Math.PI / 2)), fatRing = g(new T.RingGeometry(0.9, 1.0, 40).rotateX(-Math.PI / 2));
      // falling / lobbed molten rocks: dark rock with a hot glow
      const rm = new T.MeshLambertMaterial({ color: 0xffffff, emissive: 0xD2420E, emissiveIntensity: 0.85 }); V.mats.push(rm);
      V.rockM = mk(g(new T.IcosahedronGeometry(1, 0)), rm, NR, 6);
      V.mkFill = mk(disc, add({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), NR, 5);
      V.mkRing = mk(ring, add({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), NR, 5);
      // magma pools: dark crust + additive glow + bright rim
      const cm = new T.MeshBasicMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, transparent: true, opacity: 0.92, depthWrite: false }); V.mats.push(cm);
      V.plCrust = mk(disc, cm, NP, 3);
      V.plGlow = mk(disc, add({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), NP, 4);
      V.plRim = mk(fatRing, add({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), NP, 4);
      // vents: mound, glowing mouth, ground cracks ring, warning ring + fill (blast radius)
      const lm = new T.MeshLambertMaterial({ color: 0x2B2321 }); V.mats.push(lm);
      V.vMound = mk(g(new T.CylinderGeometry(0.95, 2.1, 1.1, 10)), lm, NV, 0);
      V.vGlow = mk(disc, add({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }), NV, 5);
      V.vCrack = mk(g(new T.RingGeometry(2.1, 2.7, 24).rotateX(-Math.PI / 2)), add({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), NV, 4);
      V.vRing = mk(ring, add({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), NV, 5);
      V.vFill = mk(disc, add({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), NV, 4);
      V.rocks = []; for (let i = 0; i < NR; i++) V.rocks.push({ on: false, kind: 0, x: 0, z: 0, gy: 0, my: 0, px: 0, py: 0, pz: 0, sx: 0, sy: 0, sz: 0, t: 0, T: 1, H: 40, arc: 0, R: 5, dmg: 0, ndmg: 0, gdmg: 0, size: 1.6, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, trail: 0, poolR: 0, poolLife: 0, ci: 0, cause: 'rock' });
      V.pools = [];
    },

    placeVents(m) {
      const c = V.ctx, map = c.map, col_ = c.col, rng = V.rng, lim = map.half - 18, st = map.start, ex = map.extract, list = [];
      const target = V.mission.tutorial ? XC.tutorialCount : Math.min(XC.maxCount, NV, Math.round(XC.baseCount + XC.perMission * m));
      const ok = (x, z) => {
        if (map.noHazard && map.noHazard(x, z)) return false;
        if (Math.abs(x) > lim || Math.abs(z) > lim || d2(x, z, st.x, st.z) < XC.minFromStart * XC.minFromStart) return false;
        if (ex && d2(x, z, ex.x, ex.z) < XC.minFromExtract * XC.minFromExtract) return false;
        for (const cr of map.crates) if (d2(x, z, cr.x, cr.z) < XC.minFromCrate * XC.minFromCrate) return false;
        for (const o of list) if (d2(x, z, o.x, o.z) < XC.minGap * XC.minGap) return false;
        return col_.free(x, z, 2.6);
      };
      for (let guard = 0; list.length < target && guard < 700; guard++) {
        let x, z;
        if (map.roadPts.length && rng.chance(XC.roadBias)) { const p = rng.pick(map.roadPts); x = p.x + rng.range(-8, 8); z = p.z + rng.range(-8, 8); }
        else { x = rng.range(-lim, lim); z = rng.range(-lim, lim); }
        if (ok(x, z)) list.push({ x, z });
      }
      V.vents = list.map((p, i) => {
        const gy = map.height(p.x, p.z), R = XC.radius;
        let my = gy; for (let k = 0; k < 6; k++) my = Math.max(my, map.height(p.x + Math.cos(k * 1.047) * R * 0.9, p.z + Math.sin(k * 1.047) * R * 0.9));
        return { i, x: p.x, z: p.z, gy, my: my + 0.2, state: 0, t: rng.range(2, XC.period[1]), cool: 0, ph: rng.range(0, 6.28), sfx: 0, boomT: 0 };
      });
      for (const v of V.vents) {
        vp.set(v.x, v.gy + 0.5, v.z); vs.set(1, 1, 1); m4.compose(vp, qI, vs); V.vMound.setMatrixAt(v.i, m4);
      }
      V.vMound.instanceMatrix.needsUpdate = true;
    },

    // ------------------------------------------------------------------ public helpers
    /** magma pool (burns the vehicle / Nana / enemies while it glows) */
    pool(x, z, r, life) {
      if (!V.on) return;
      const c = V.ctx, map = c.map;
      if (V.pools.length >= PC.maxPools) V.pools.shift();
      let my = map.height(x, z); for (let k = 0; k < 4; k++) my = Math.max(my, map.height(x + Math.cos(k * 1.57) * r * 0.8, z + Math.sin(k * 1.57) * r * 0.8));
      V.pools.push({ x, z, my: my + 0.14, r, life, t: 0, ph: rnd() * 6.28, pt: 0 });
      c.particles.poof(x, my + 0.5, z, 3, 1.4);
    },
    /** the Titan's slam: a ring of magma pools around the impact + a small blast */
    slam(x, z, SC) {
      if (!V.on) return;
      const c = V.ctx, n = SC.pools, a0 = rnd() * 6.28;
      for (let i = 0; i < n; i++) { const a = a0 + i / n * 6.283 + (rnd() - 0.5) * 0.4, px = x + Math.cos(a) * SC.ring, pz = z + Math.sin(a) * SC.ring; if (c.col.free(px, pz, 1.2) && !c.map.lava.inLava(px, pz)) V.pool(px, pz, SC.poolR * (0.85 + rnd() * 0.3), SC.poolLife); }
      if (V.ctx.jeep && Math.hypot(c.jeep.x - x, c.jeep.z - z) < 90) WZ.Fire.explode(x, c.map.height(x, z) + 0.6, z, { scale: 0.6, debris: 3, groundFire: 0, shake: 0.2, scorch: 0.8, parts: 0.7 });
    },
    /** a molten boulder on a high arc (the Titan's ranged attack). o: {R, dmg, ndmg, poolR, poolLife, T} */
    lob(fx, fy, fz, tx, tz, o) {
      if (!V.on || !V.playing) return false;
      const r = V.freeRock(); if (!r) return false;
      const map = V.ctx.map, gy = map.height(tx, tz), dist = Math.hypot(tx - fx, tz - fz);
      r.on = true; r.kind = 1; r.x = tx; r.z = tz; r.gy = gy; r.sx = fx; r.sy = fy; r.sz = fz; r.px = fx; r.py = fy; r.pz = fz; r.t = 0; r.T = o.T; r.arc = 6 + dist * 0.17; r.R = o.R; r.dmg = o.dmg; r.ndmg = o.ndmg; r.gdmg = 0; r.size = 1.9;
      r.poolR = o.poolR; r.poolLife = o.poolLife; r.ci = (rnd() * 4) | 0; r.cause = 'rock'; V.rockInit(r);
      return true;
    },
    freeRock() { for (let i = 0; i < V.rocks.length; i++) if (!V.rocks[i].on) return V.rocks[i]; return null; },
    rockInit(r) {
      const map = V.ctx.map; let my = r.gy; for (let k = 0; k < 6; k++) my = Math.max(my, map.height(r.x + Math.cos(k * 1.047) * r.R * 0.85, r.z + Math.sin(k * 1.047) * r.R * 0.85));
      r.my = my + 0.18; r.rx = rnd() * 6; r.ry = rnd() * 6; r.rz = rnd() * 6; r.wx = (rnd() - 0.5) * 3; r.wy = (rnd() - 0.5) * 3; r.wz = (rnd() - 0.5) * 3; r.trail = 0;
    },
    hint() { return V.key; },

    // ------------------------------------------------------------------ simulation (play phase only)
    update(dt, ctx, play, tm) {
      V.key = ''; V.playing = !!play && V.on;
      if (!V.on || !V.ctx) return;
      if (!play) { V.stopAll(); return; }
      const c = V.ctx, J = c.jeep;
      V.updateLava(dt);
      V.updateEruption(dt, tm);
      V.updateRocks(dt);
      V.updateVents(dt);
      V.updatePools(dt);
      // priority of the one hint line
      if (V.key === '' && J.alive) {
        let near = 1e9, warn = false;
        for (const v of V.vents) { const d = d2(v.x, v.z, J.x, J.z); if (d < near) near = d; if (v.state === 1 && d < (XC.radius + 9) * (XC.radius + 9)) warn = true; }
        if (warn) V.key = 'hud.ventWarn'; else if (near < 16 * 16 && J.speed > 2) V.key = 'hud.vent';
      }
    },

    stopAll() {
      if (V.phase !== 'idle' || V.alert > 0) { V.phase = 'idle'; V.alert = 0; }
      for (const r of V.rocks) r.on = false;
    },

    updateLava(dt) {
      const c = V.ctx, J = c.jeep, N = c.nana, E = c.enemies, L = c.map.lava, mi = V.mission.index;
      const wd = J.alive && !J.captive ? L.depth(J.x, J.z) : 0;
      V.inLava = wd > 0; V.tickT -= dt;
      const tick = MC.lavaTick, doTick = V.tickT <= 0; if (doTick) V.tickT = tick;
      if (V.inLava) {
        V.key = 'hud.lava';
        V.lavaAcc += dt;
        if (V.lavaAcc >= tick) {
          V.lavaAcc -= tick;
          const pct = Math.min(MC.lavaPctMax, MC.lavaPct + MC.lavaPctPerMission * mi) * V.tm, dmg = Math.max(0.5, pct * J.maxHp * tick * wd);
          if (dmg >= J.hp) J.deathCause = 'lava';
          J.hurt(dmg); V.lavaShow += dmg; WZ.Fire.ignite(1.6);
          WZ.Audio.sfx('burn', 0.8);
        }
        V.lavaTxt -= dt; if (V.lavaTxt <= 0 && V.lavaShow > 0) { V.lavaTxt = 0.9; WZ.Fx.text('-' + Math.max(1, Math.round(V.lavaShow)), J.rx, J.ry + 5, J.rz, 'warn'); V.lavaShow = 0; }
        if (rnd() < dt * 18) c.particles.emit(1, J.x + (rnd() - 0.5) * 2.5, L.level + 0.6, J.z + (rnd() - 0.5) * 2.5, (rnd() - 0.5) * 2, 3 + rnd() * 3, (rnd() - 0.5) * 2, 0.6, 0.7, 0.1, 1, 0.5, 0.1, 0.9, 0, -4, 0.3);
      } else { V.lavaAcc = 0; V.lavaShow = 0; }
      if (!doTick) return;
      if (N.out && !N.isKO && N.state !== 'BOARDING' && L.inLava(N.x, N.z)) {
        N.iframes = 0; N.hurt(MC.lavaNana * tick * V.tm); c.particles.sparks(N.x, N.ry + 0.6, N.z, 4, 1, 0.5, 0.1);
        if (rnd() < 0.5) WZ.Fx.text('LAVA!', N.rx, N.ry + 4, N.rz, 'warn');
      }
      for (let i = 0; i < E.list.length; i++) {
        const e = E.list[i]; if (!e.active || e.state === 2 || !L.inLava(e.x, e.z)) continue;
        E.ko(e, 0, 0, 2, 'lava'); c.particles.sparks(e.x, L.level + 0.6, e.z, 6, 1, 0.5, 0.1);
      }
    },

    updateEruption(dt, tm) {
      const c = V.ctx, J = c.jeep, mi = V.mission.index, rng = V.rng, tut = V.mission.tutorial;
      if (V.phase === 'idle') {
        V.alert = Math.max(0, V.alert - dt / 3);
        if (J.alive && tm >= V.nextT) {
          V.phase = 'warn'; V.pT = 0; V.rumbleT = 0; V.eruptions++;
          WZ.Audio.sfx('siren'); WZ.Fx.shake(0.2); WZ.Fx.text(WZ.I18n.t('hud.erupt.title'), J.rx, J.ry + 7, J.rz, 'warn');
        }
        return;
      }
      V.pT += dt;
      if (V.phase === 'warn') {
        const k = Math.min(1, V.pT / EC.warn); V.alert = k; V.key = V.key || 'hud.erupt.warn';
        V.rumbleT -= dt; if (V.rumbleT <= 0) { V.rumbleT = 0.8; WZ.Audio.sfx('rumble', 0.6 + 0.4 * k); }
        WZ.Fx.shake(0.03 + 0.07 * k);
        if (V.pT >= EC.warn) { V.phase = 'active'; V.pT = 0; V.spawnAcc = 0; V.pinT = 0; WZ.Audio.sfx('rumble', 1); WZ.Fx.shake(0.35); }
        return;
      }
      // ---- active: molten rocks fall
      V.alert = 1; V.key = V.key || 'hud.erupt';
      V.rumbleT -= dt; if (V.rumbleT <= 0) { V.rumbleT = 1.1; WZ.Audio.sfx('rumble', 0.55); }
      V.pinT -= dt;
      const dur = tut ? EC.dur * 0.65 : EC.dur, rate = Math.min(EC.rateMax, EC.rate + EC.ratePerMission * mi) * (tut ? VC.tutorialMul : 1);
      if (V.pT < dur) {
        V.spawnAcc += rate * dt;
        while (V.spawnAcc >= 1) { V.spawnAcc -= 1; V.spawnFall(); }
      } else {
        const gap = Math.max(EC.gapMin, rng.range(EC.gap[0], EC.gap[1]) + EC.gapPerMission * mi) * (tut ? 1.7 : 1);
        V.phase = 'idle'; V.nextT = tm + gap;
      }
    },

    spawnFall() {
      const c = V.ctx, J = c.jeep, N = c.nana, map = c.map, rng = V.rng, st = map.start, lim = map.half - 12, mi = V.mission.index;
      const r = V.freeRock(); if (!r) return;
      const nanaOut = N.out && !N.isKO && N.state !== 'BOARDING';
      let tx = 0, tz = 0, found = false;
      for (let k = 0; k < 6 && !found; k++) {
        const roll = rng.next();
        if (J.alive && V.pinT <= 0 && J.speed < EC.pinSpeed && roll < 0.5) { tx = J.x + J.vx * 0.25; tz = J.z + J.vz * 0.25; if (k === 0) V.pinT = EC.pinGap; }
        else if (nanaOut && roll < EC.nanaShare) { const a = rng.range(0, 6.283), d = rng.range(2, 14); tx = N.x + Math.cos(a) * d; tz = N.z + Math.sin(a) * d; }
        else if (roll < EC.near + (nanaOut ? EC.nanaShare : 0)) {
          const fwd = J.speed > 5 ? J.h : rng.range(0, 6.283), a = fwd + rng.range(-1.3, 1.3), d = rng.range(EC.nearR[0], EC.nearR[1]); tx = J.x + Math.sin(a) * d; tz = J.z + Math.cos(a) * d;
        } else { const a = rng.range(0, 6.283), d = rng.range(EC.farR[0], EC.farR[1]); tx = J.x + Math.cos(a) * d; tz = J.z + Math.sin(a) * d; }
        tx = clamp(tx, -lim, lim); tz = clamp(tz, -lim, lim);
        found = d2(tx, tz, st.x, st.z) > EC.minFromStart * EC.minFromStart || J.speed < 1;
      }
      if (!found) return;
      const fall = Math.min(EC.fallMax, EC.fall + EC.fallPerMission * mi), gy = map.height(tx, tz);
      r.on = true; r.kind = 0; r.x = tx; r.z = tz; r.gy = gy; r.px = tx; r.pz = tz; r.H = EC.fallFrom; r.py = gy + r.H; r.sx = tx; r.sz = tz; r.sy = gy + r.H; r.t = 0; r.T = EC.fallFrom / fall; r.arc = 0;
      r.R = EC.radius; r.dmg = Math.min(EC.dmgMax, EC.damage + EC.dmgPerMission * mi) * V.tm; r.ndmg = EC.nanaDamage * V.tm; r.gdmg = EC.giantDamage; r.size = 1.5 + rng.next() * 1.1; r.poolR = 0; r.poolLife = 0; r.ci = (rng.next() * 4) | 0; r.cause = 'rock';
      V.rockInit(r);
    },

    updateRocks(dt) {
      const P = V.ctx.particles;
      for (const r of V.rocks) {
        if (!r.on) continue;
        r.t += dt; const k = Math.min(1, r.t / r.T);
        if (r.kind === 0) { r.py = r.gy + r.H * (1 - k); }
        else { r.px = U.lerp(r.sx, r.x, k); r.pz = U.lerp(r.sz, r.z, k); r.py = U.lerp(r.sy, r.gy + 1, k) + r.arc * 4 * k * (1 - k); }
        r.rx += r.wx * dt; r.ry += r.wy * dt; r.rz += r.wz * dt;
        r.trail -= dt; if (r.trail <= 0) {
          r.trail = (r.kind ? 0.04 : 0.09) / qd();
          P.emit(1, r.px + (rnd() - 0.5), r.py + 0.4, r.pz + (rnd() - 0.5), (rnd() - 0.5), 2 + rnd() * 2, (rnd() - 0.5), 0.5, r.size * 1.1, 0.2, 1, 0.5, 0.12, 0.9, 0, 0, 1.2);
          P.emit(0, r.px, r.py + 1.2, r.pz, (rnd() - 0.5) * 0.8, 1.5, (rnd() - 0.5) * 0.8, 1.1, r.size * 0.8, r.size * 2.6, 0.2, 0.18, 0.17, 0.5, 0, 0, 0.5);
        }
        if (r.t >= r.T) V.impact(r);
      }
    },

    impact(r) {
      const c = V.ctx, J = c.jeep, N = c.nana, E = c.enemies, map = c.map, gy = map.height(r.x, r.z);
      r.on = false;
      const dj = Math.hypot(J.x - r.x, J.z - r.z), near = dj < 140;
      if (near) WZ.Fire.explode(r.x, gy + 0.8, r.z, { scale: Math.max(0.5, r.R / 6.7), debris: r.kind ? 6 : 4, groundFire: r.poolR > 0 ? 0 : 3, shake: Math.max(0.06, 0.6 - dj / 90), flash: false, scorch: 0.9, parts: 0.8, mute: dj > 60 });
      if (near && dj > 60) WZ.Audio.sfx('boom', 0.25);
      if (r.poolR > 0) V.pool(r.x, r.z, r.poolR, r.poolLife);
      if (J.alive && dj < r.R + 1.5) {
        const dmg = Math.round(r.dmg);
        if (dmg >= J.hp) J.deathCause = 'rock';
        J.hurt(dmg); J.hop = 0.45; const l = dj || 1; J.vx += (J.x - r.x) / l * 5; J.vz += (J.z - r.z) / l * 5;
        WZ.Fx.text('-' + dmg, J.rx, J.ry + 5, J.rz, 'warn'); WZ.Fx.flash('hurt'); WZ.Fire.ignite(EC.burn);
      }
      if (N.out && !N.isKO && Math.hypot(N.x - r.x, N.z - r.z) < r.R + 0.9) { N.iframes = 0; N.hurt(r.ndmg); WZ.Fx.text('-' + Math.round(r.ndmg), N.rx, N.ry + 4, N.rz, 'warn'); }
      E.hash.query(r.x, r.z, r.R, E.q);
      for (const e of E.q.slice()) { if (!e.active || e.state === 2 || Math.hypot(e.x - r.x, e.z - r.z) > r.R) continue; E.ko(e, e.x - r.x, e.z - r.z, 13, 'rock'); }
      if (r.gdmg > 0 && WZ.Giants) WZ.Giants.splash(r.x, r.z, r.R * 0.7, r.gdmg, 'rock');
    },

    // ------------------------------------------------------------------ vents
    updateVents(dt) {
      const c = V.ctx, J = c.jeep, N = c.nana, mi = V.mission.index, tut = V.mission.tutorial;
      const nOut = N.out && !N.isKO;
      for (const v of V.vents) {
        if (v.cool > 0) v.cool -= dt;
        if (v.state === 0) {
          v.t -= dt;
          const dj = J.alive ? d2(v.x, v.z, J.x, J.z) : 1e9, dn = nOut ? d2(v.x, v.z, N.x, N.z) : 1e9, tr2 = XC.trigger * XC.trigger;
          if (v.t <= 0 || (v.cool <= 0 && (dj < tr2 || dn < tr2))) {            // charge up (always with the full warning)
            v.state = 1; v.t = v.t <= 0 ? XC.warn : XC.triggerWarn; v.sfx = 0; v.boomT = v.t;
            if (dj < 90 * 90) WZ.Audio.sfx('rumble', Math.max(0.25, 1 - Math.sqrt(dj) / 90));
          }
        } else if (v.state === 1) {
          v.t -= dt;
          if (rnd() < dt * 22 * qd()) c.particles.emit(0, v.x + (rnd() - 0.5) * 1.4, v.gy + 1.2, v.z + (rnd() - 0.5) * 1.4, (rnd() - 0.5), 3 + rnd() * 3, (rnd() - 0.5), 1.0, 0.8, 3, 0.25, 0.2, 0.18, 0.55, 0, 0, 0.6);
          if (rnd() < dt * 26 * qd()) c.particles.emit(1, v.x + (rnd() - 0.5) * 1.4, v.gy + 1.1, v.z + (rnd() - 0.5) * 1.4, (rnd() - 0.5) * 3, 5 + rnd() * 6, (rnd() - 0.5) * 3, 0.6, 0.6, 0.1, 1, 0.5, 0.1, 0.95, 0, -9, 0.2);
          if (v.t <= 0) V.blastVent(v, mi, tut);
        }
      }
    },

    blastVent(v, mi, tut) {
      const c = V.ctx, J = c.jeep, N = c.nana, E = c.enemies, R = XC.radius, tm = V.tm;
      const dj = Math.hypot(J.x - v.x, J.z - v.z), seen = dj < 130;
      v.state = 0; v.t = V.rng.range(XC.period[0], XC.period[1]) * (tut ? 1.5 : 1); v.cool = 4;
      if (seen) {
        WZ.Fire.explode(v.x, v.gy + 0.8, v.z, { scale: 0.95, debris: 0, groundFire: 2.6, shake: Math.max(0.05, 0.55 - dj / 100), flash: false, scorch: 0.8, parts: 0.8, mute: dj > 60 });
        if (dj > 60) WZ.Audio.sfx('boom', 0.3);
        for (let i = 0, n = Math.round(18 * qd()); i < n; i++) c.particles.emit(1, v.x + (rnd() - 0.5) * 2.2, v.gy + 0.8, v.z + (rnd() - 0.5) * 2.2, (rnd() - 0.5) * 3, 14 + rnd() * 14, (rnd() - 0.5) * 3, 0.8 + rnd() * 0.6, 2.2, 0.5, 1, 0.45 + rnd() * 0.3, 0.1, 0.95, 0, -16, 0.3);
      }
      const dmg = Math.round(Math.min(XC.dmgMax, XC.damage + XC.dmgPerMission * mi) * tm);
      if (J.alive && dj < R + 1.4) {
        if (dmg >= J.hp) J.deathCause = 'vent';
        J.hurt(dmg); J.hop = 0.5; const l = dj || 1; J.vx += (J.x - v.x) / l * 7; J.vz += (J.z - v.z) / l * 7;
        WZ.Fx.text('-' + dmg, J.rx, J.ry + 5, J.rz, 'warn'); WZ.Fx.flash('hurt'); WZ.Fire.ignite(XC.burn);
      }
      if (N.out && !N.isKO && Math.hypot(N.x - v.x, N.z - v.z) < R + 0.8) { const nd = XC.nanaDamage * tm; N.iframes = 0; N.hurt(nd); WZ.Fx.text('-' + Math.round(nd), N.rx, N.ry + 4, N.rz, 'warn'); }
      E.hash.query(v.x, v.z, R, E.q);
      for (const e of E.q.slice()) { if (!e.active || e.state === 2 || Math.hypot(e.x - v.x, e.z - v.z) > R) continue; E.ko(e, e.x - v.x, e.z - v.z, 14, 'vent'); }
      if (WZ.Giants) WZ.Giants.splash(v.x, v.z, R * 0.7, XC.giantDamage, 'vent');
    },

    // ------------------------------------------------------------------ pools
    updatePools(dt) {
      const c = V.ctx, J = c.jeep, N = c.nana, E = c.enemies, P = c.particles;
      V.poolAcc += dt; const doTick = V.poolAcc >= PC.tick; if (doTick) V.poolAcc -= PC.tick;
      let inPool = false;
      for (let i = V.pools.length - 1; i >= 0; i--) {
        const p = V.pools[i]; p.t += dt;
        if (p.t >= p.life) { V.pools.splice(i, 1); continue; }
        const grow = Math.min(1, p.t / PC.grow), fade = Math.min(1, (p.life - p.t) / PC.fade), I = grow * fade;
        if (rnd() < dt * 7 * I * qd()) P.emit(1, p.x + (rnd() - 0.5) * p.r * 1.5, p.my + 0.3, p.z + (rnd() - 0.5) * p.r * 1.5, (rnd() - 0.5) * 0.8, 1.6 + rnd() * 2, (rnd() - 0.5) * 0.8, 0.6, 0.9, 0.1, 1, 0.5, 0.1, 0.85, 0, -1, 0.3);
        if (rnd() < dt * 2.2 * I) P.emit(0, p.x + (rnd() - 0.5) * p.r, p.my + 0.8, p.z + (rnd() - 0.5) * p.r, (rnd() - 0.5), 2 + rnd(), (rnd() - 0.5), 1.1, 1.0, 3.2, 0.14, 0.12, 0.11, 0.45, 0, 0, 0.6);
        if (I < 0.6 || p.t < 0.3) continue;
        if (J.alive && d2(p.x, p.z, J.x, J.z) < (p.r + 1.2) * (p.r + 1.2)) {
          inPool = true;
          if (doTick && !V.poolHit) {
            V.poolHit = true; const dmg = Math.max(0.5, PC.jeepPct * V.tm * J.maxHp * PC.tick);
            if (dmg >= J.hp) J.deathCause = 'lava';
            J.hurt(dmg); V.poolShow += dmg; WZ.Fire.ignite(1.6); WZ.Audio.sfx('burn', 0.8);
          }
        }
        if (doTick) {
          if (N.out && !N.isKO && d2(p.x, p.z, N.x, N.z) < (p.r + 0.5) * (p.r + 0.5)) { N.iframes = 0; N.hurt(PC.nanaDps * V.tm * PC.tick); P.sparks(N.x, N.ry + 0.6, N.z, 3, 1, 0.5, 0.1); }
          E.hash.query(p.x, p.z, p.r, E.q);
          for (const e of E.q.slice()) { if (!e.active || e.state === 2 || d2(p.x, p.z, e.x, e.z) > p.r * p.r) continue; E.ko(e, e.x - p.x, e.z - p.z, 6, 'lava'); }
        }
      }
      V.poolHit = false; V.inPool = inPool;
      if (inPool) { V.key = V.key || 'hud.pool'; V.poolTxt -= dt; if (V.poolTxt <= 0 && V.poolShow > 0) { V.poolTxt = 0.9; WZ.Fx.text('-' + Math.max(1, Math.round(V.poolShow)), J.rx, J.ry + 5, J.rz, 'warn'); V.poolShow = 0; } } else V.poolShow = 0;
    },

    // ------------------------------------------------------------------ render
    render(dt, tm) {
      if (!V.on || !V.ctx) return;
      void dt;
      const Z = (im, i, x, y, z, sx, sy, sz) => { vp.set(x, y, z); vs.set(sx, sy, sz); m4.compose(vp, qI, vs); im.setMatrixAt(i, m4); };
      const C = (im, i, r, g, b) => { col.setRGB(r, g, b); im.setColorAt(i, col); };
      // rocks + their ground markers
      for (let i = 0; i < V.rocks.length; i++) {
        const r = V.rocks[i];
        if (!r.on) { Z(V.rockM, i, 0, -200, 0, 0, 0, 0); Z(V.mkFill, i, 0, -200, 0, 0, 0, 0); Z(V.mkRing, i, 0, -200, 0, 0, 0, 0); continue; }
        const k = Math.min(1, r.t / r.T), s = r.size;
        eE.set(r.rx, r.ry, r.rz); qE.setFromEuler(eE); vp.set(r.px, r.py, r.pz); vs.set(s * 1.15, s * 0.95, s); m4.compose(vp, qE, vs); V.rockM.setMatrixAt(i, m4);
        col.setHex(ROCK_COL[r.ci & 3]); V.rockM.setColorAt(i, col);
        const pul = 0.5 + 0.5 * Math.sin(tm * (7 + 11 * k) + i), fi = 0.1 + 0.5 * k * k, ri = 0.5 + 0.5 * pul;
        Z(V.mkFill, i, r.x, r.my, r.z, r.R * (0.15 + 0.85 * k), 1, r.R * (0.15 + 0.85 * k)); C(V.mkFill, i, 1.0 * fi, 0.2 * fi, 0.05 * fi);
        Z(V.mkRing, i, r.x, r.my + 0.02, r.z, r.R * (1 + 0.025 * pul), 1, r.R * (1 + 0.025 * pul)); C(V.mkRing, i, 1.0 * ri, 0.42 * ri, 0.12 * ri);
      }
      // pools
      for (let i = 0; i < PC.maxPools; i++) {
        const p = V.pools[i];
        if (!p) { Z(V.plCrust, i, 0, -200, 0, 0, 0, 0); Z(V.plGlow, i, 0, -200, 0, 0, 0, 0); Z(V.plRim, i, 0, -200, 0, 0, 0, 0); continue; }
        const grow = U.smooth(0, 1, Math.min(1, p.t / PC.grow)), fade = Math.min(1, (p.life - p.t) / PC.fade), I = grow * fade, wob = 1 + 0.03 * Math.sin(tm * 3 + p.ph), rr = p.r * (0.3 + 0.7 * grow) * wob;
        Z(V.plCrust, i, p.x, p.my - 0.02, p.z, rr * 1.12, 1, rr * 1.12); const cr = 0.16 + 0.1 * (1 - fade); C(V.plCrust, i, cr, cr * 0.5, cr * 0.4);
        const gi = (0.55 + 0.25 * Math.sin(tm * 4 + p.ph)) * I; Z(V.plGlow, i, p.x, p.my, p.z, rr * 0.96, 1, rr * 0.96); C(V.plGlow, i, 1 * gi, 0.38 * gi, 0.06 * gi);
        const ri = 0.9 * I; Z(V.plRim, i, p.x, p.my + 0.02, p.z, rr * 1.04, 1, rr * 1.04); C(V.plRim, i, 1 * ri, 0.62 * ri, 0.18 * ri);
      }
      // vents
      for (let i = 0; i < NV; i++) {
        const v = V.vents[i];
        if (!v) { Z(V.vGlow, i, 0, -200, 0, 0, 0, 0); Z(V.vCrack, i, 0, -200, 0, 0, 0, 0); Z(V.vRing, i, 0, -200, 0, 0, 0, 0); Z(V.vFill, i, 0, -200, 0, 0, 0, 0); continue; }
        const w = v.state === 1 ? 1 - Math.max(0, v.t) / v.boomT : 0, flash = 0.5 + 0.5 * Math.abs(Math.sin(tm * (9 + 12 * w) + v.ph));
        const idle = 0.28 + 0.14 * Math.sin(tm * 1.7 + v.ph), cg = idle + w * 0.75, cs = w > 0 ? 0.9 + 0.2 * Math.sin(tm * 22) : 1;
        Z(V.vGlow, i, v.x, v.gy + 1.07, v.z, 0.85 * cs * (1 + w * 0.6), 1, 0.85 * cs * (1 + w * 0.6)); C(V.vGlow, i, 1 * cg, 0.55 * cg, 0.12 * cg);
        Z(V.vCrack, i, v.x, v.my - 0.06, v.z, 1 + w * 0.15, 1, 1 + w * 0.15); const ci = 0.35 + 0.15 * Math.sin(tm * 2 + v.ph) + w * 0.5; C(V.vCrack, i, 1 * ci, 0.4 * ci, 0.08 * ci);
        if (w > 0) {
          Z(V.vRing, i, v.x, v.my + 0.02, v.z, XC.radius, 1, XC.radius); const rI = 0.35 + 0.65 * flash; C(V.vRing, i, 1 * rI, 0.2 * rI, 0.06 * rI);
          Z(V.vFill, i, v.x, v.my, v.z, XC.radius * (0.2 + 0.8 * w), 1, XC.radius * (0.2 + 0.8 * w)); const fI = 0.1 + 0.4 * w * w; C(V.vFill, i, 1 * fI, 0.16 * fI, 0.04 * fI);
        } else { Z(V.vRing, i, 0, -200, 0, 0, 0, 0); Z(V.vFill, i, 0, -200, 0, 0, 0, 0); }
      }
      for (const m of V.meshes) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    },

    dispose() {
      const sc = V.ctx && V.ctx.scene;
      if (sc) for (const m of V.meshes) sc.remove(m);
      for (const m of V.meshes) m.dispose();
      for (const g of V.geos) g.dispose(); for (const m of V.mats) m.dispose();
      V.geos = []; V.mats = []; V.meshes = []; V.rocks = []; V.pools = []; V.vents = []; V.ctx = null; V.on = false; V.playing = false; V.alert = 0; V.key = ''; V.phase = 'idle';
      V.inLava = false; V.inPool = false; V.lavaAcc = V.lavaShow = V.poolAcc = V.poolShow = 0; V.rockM = V.mkFill = V.mkRing = V.plCrust = V.plGlow = V.plRim = V.vMound = V.vGlow = V.vCrack = V.vRing = V.vFill = null;
    },
  };
  WZ.Volcano = V;
})(window.WZ = window.WZ || {});
