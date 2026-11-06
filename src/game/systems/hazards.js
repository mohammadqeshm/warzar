/* WZ.Hazards — buried MINES + TORNADO.
 * Mines: seeded patches/singles (biased toward roads), blinking red LED, one-shot blast that hurts the jeep (or Nana) and KOs enemies nearby.
 * Tornado: warns for a few seconds (siren, ring, arrow), then drifts toward the jeep (slower than the jeep, escapable with boost);
 * inside its radius the jeep is dragged, pulled and spun; Nana takes damage; enemies are flung. All numbers: WZ.CFG.hazards. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, U = WZ.U, H = CFG.hazards, MC = H.mines, TC = H.tornado;
  const m4 = new T.Matrix4(), qI = new T.Quaternion(), vp = new T.Vector3(), vs = new T.Vector3();
  const d2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);

  function streakTex() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#c9b89a'; x.fillRect(0, 0, 128, 64);
    for (let i = 0; i < 46; i++) { x.fillStyle = 'rgba(' + (40 + Math.random() * 60 | 0) + ',' + (30 + Math.random() * 40 | 0) + ',20,' + (0.25 + Math.random() * 0.5) + ')'; x.fillRect(Math.random() * 128, 0, 1 + Math.random() * 4, 64); }
    const tx = new T.CanvasTexture(c); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(2, 1); return tx;
  }
  function setM(mesh, i, x, y, z, s) { m4.compose(vp.set(x, y, z), qI, vs.set(s, s, s)); mesh.setMatrixAt(i, m4); }

  const Z = {
    ctx: null, rng: null, mission: null, mines: [], torn: null, tornOn: false, minesOn: false,
    nextT: 0, pingT: 0, nearest: 1e9, caught: 0, nanaT: 0, windT: 0, dustT: 0, key: '',
    ms: null, tg: null, layers: [], debris: [], ring: null, tex: null, geos: [],

    init(ctx, mission, seed) {
      Z.dispose(); Z.ctx = ctx; Z.mission = mission; Z.rng = WZ.RNG.create(seed);
      const m = mission.index;
      Z.minesOn = m >= MC.fromMission; Z.tornOn = !mission.tutorial && m >= TC.fromMission;
      if (Z.minesOn) Z.placeMines(m);
      if (Z.tornOn) { Z.nextT = Z.rng.range(TC.firstDelay[0], TC.firstDelay[1]); Z.buildTornado(); }
    },

    placeMines(m) {
      const map = Z.ctx.map, col = Z.ctx.col, rng = Z.rng, lim = map.half - 16, st = map.start, ex = map.extract, list = [];
      const target = Z.mission.tutorial ? MC.tutorialCount : Math.min(MC.maxCount, Math.round(MC.baseCount + MC.perMission * m));
      const ok = (x, z) => {
        if (Math.abs(x) > lim || Math.abs(z) > lim || d2(x, z, st.x, st.z) < MC.minFromStart * MC.minFromStart) return false;
        if (ex && d2(x, z, ex.x, ex.z) < MC.minFromExtract * MC.minFromExtract) return false;
        for (const c of map.crates) if (d2(x, z, c.x, c.z) < MC.minFromCrate * MC.minFromCrate) return false;
        for (const o of list) if (d2(x, z, o.x, o.z) < 10.2) return false;
        return col.free(x, z, 2.2);
      };
      for (let guard = 0; list.length < target && guard < 500; guard++) {
        let cx, cz;
        if (map.roadPts.length && rng.chance(MC.roadBias)) { const p = rng.pick(map.roadPts); cx = p.x + rng.range(-5, 5); cz = p.z + rng.range(-5, 5); }
        else { cx = rng.range(-lim, lim); cz = rng.range(-lim, lim); }
        const n = rng.chance(MC.patchChance) ? rng.int(3, 5) : 1;
        for (let i = 0; i < n && list.length < target; i++) {
          const a = rng.range(0, 6.283), r = n > 1 ? rng.range(0, 6.5) : 0, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
          if (ok(x, z)) list.push({ x, z, gy: map.height(x, z), on: true, ph: rng.range(0, 1) });
        }
      }
      Z.mines = list;
      const n = list.length, sc = Z.ctx.scene; if (!n) return;
      const gs = [new T.CylinderGeometry(1.25, 1.4, 0.32, 16), new T.CylinderGeometry(2.3, 2.5, 0.05, 18), new T.CylinderGeometry(0.08, 0.1, 2.5, 6),
        new T.BoxGeometry(1.1, 0.8, 0.07), new T.SphereGeometry(0.42, 8, 6), new T.RingGeometry(2.2, 2.6, 28).rotateX(-Math.PI / 2)];
      Z.geos.push(...gs);
      const mats = [new T.MeshLambertMaterial({ color: 0x4d5237 }), new T.MeshLambertMaterial({ color: 0x2b2118 }), new T.MeshLambertMaterial({ color: 0xd23a2a }),
        new T.MeshLambertMaterial({ color: 0xffb400 }), new T.MeshBasicMaterial({ color: 0xff2a14 }), new T.MeshBasicMaterial({ color: 0xff3a22, transparent: true, opacity: 0.55, depthWrite: false })];
      Z.ms = gs.map((g, k) => { const im = new T.InstancedMesh(g, mats[k], n); im.frustumCulled = false; sc.add(im); return im; });
      list.forEach((mn, i) => { mn.i = i; Z.place(mn, true); });
    },

    // 0 body, 1 crater, 2 post, 3 plate, 4 lamp, 5 ring
    place(mn, on) {
      const [body, crater, post, plate, lamp, ring] = Z.ms, i = mn.i, x = mn.x, z = mn.z, y = mn.gy;
      setM(body, i, x, y + 0.08, z, on ? 1 : 0); setM(crater, i, x, y + 0.03, z, on ? 0 : 1);
      setM(post, i, x + 1.5, y + 1.25, z, on ? 1 : 0); setM(plate, i, x + 1.5, y + 2.05, z, on ? 1 : 0);
      setM(lamp, i, x + 1.5, y + 2.75, z, on ? 1 : 0); setM(ring, i, x, y + 0.1, z, on ? 1 : 0);
      for (const m of Z.ms) m.instanceMatrix.needsUpdate = true;
    },

    buildTornado() {
      const g = new T.Group(); g.visible = false; Z.tex = streakTex(); Z.layers = []; Z.debris = [];
      for (let i = 0; i < 8; i++) {
        const r0 = 1.1 + i * 1.05, geo = new T.CylinderGeometry(r0 + 1.05, r0, 3.3, 16, 1, true); Z.geos.push(geo);
        const mat = new T.MeshBasicMaterial({ map: Z.tex, color: i % 2 ? 0xb9a98e : 0x9c8a70, transparent: true, opacity: 0.58 - i * 0.03, side: T.DoubleSide, depthWrite: false });
        const mesh = new T.Mesh(geo, mat); mesh.position.y = 1.6 + i * 3.1; g.add(mesh); Z.layers.push(mesh);
      }
      const dg = new T.BoxGeometry(0.5, 0.35, 0.8), dm = new T.MeshLambertMaterial({ color: 0x5a4430 }); Z.geos.push(dg);
      for (let i = 0; i < 14; i++) { const d = new T.Mesh(dg, dm); d.userData = { a: Z.rng.range(0, 6.28), h: Z.rng.range(1, 22), sp: Z.rng.range(1.5, 3.2) }; g.add(d); Z.debris.push(d); }
      const rg = new T.RingGeometry(TC.radius - 0.6, TC.radius, 40); Z.geos.push(rg);
      Z.ring = new T.Mesh(rg, new T.MeshBasicMaterial({ color: 0xff5a3a, transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false }));
      Z.ring.rotation.x = -Math.PI / 2; Z.ring.position.y = 0.25; g.add(Z.ring);
      Z.ctx.scene.add(g); Z.tg = g;
    },

    // ------------------------------------------------------------------ simulation (play phase only)
    update(dt, ctx, play, tm) {
      Z.key = '';
      if (!play || !Z.ctx) return;
      if (Z.minesOn) Z.updateMines(dt);
      if (Z.tornOn) Z.updateTornado(dt, tm);
    },

    updateMines(dt) {
      const c = Z.ctx, J = c.jeep, N = c.nana; let near = 1e9;
      for (const mn of Z.mines) {
        if (!mn.on) continue;
        const dj = d2(mn.x, mn.z, J.x, J.z); if (dj < near) near = dj;
        if (J.alive && dj < MC.trigger * MC.trigger) { Z.boom(mn, 'jeep'); continue; }
        if (N.out && !N.isKO && d2(mn.x, mn.z, N.x, N.z) < MC.nanaTrigger * MC.nanaTrigger) Z.boom(mn, 'nana');
      }
      Z.nearest = Math.sqrt(near);
      if (J.alive && Z.nearest < MC.detectRange && J.speed > 2) {
        Z.pingT -= dt; if (Z.pingT <= 0) { Z.pingT = U.clamp(Z.nearest / MC.detectRange * 0.6, 0.12, 0.6); WZ.Audio.sfx('mine'); }
        if (Z.nearest < MC.detectRange * 0.75) Z.key = 'hud.mines';
      }
    },

    boom(mn, who) {
      const c = Z.ctx, J = c.jeep, N = c.nana, P = c.particles, E = c.enemies, y = mn.gy + 0.6;
      mn.on = false; Z.place(mn, false);
      P.poof(mn.x, y, mn.z, 14, 2.4); P.sparks(mn.x, y + 0.5, mn.z, 26, 1, 0.7, 0.2); P.dust(mn.x, mn.gy, mn.z, 8);
      WZ.Audio.sfx('boom'); WZ.Fx.shake(who === 'jeep' ? 0.75 : 0.4); WZ.Fx.text('BOOM!', mn.x, y + 3.5, mn.z, 'bonk');
      E.hash.query(mn.x, mn.z, MC.blast, E.q);
      for (const e of E.q.slice()) { if (!e.active || e.state === 2) continue; E.ko(e, e.x - mn.x, e.z - mn.z, 12, 'mine'); }
      if (who === 'jeep') {
        const dmg = Z.mission.tutorial ? MC.tutorialDamage : Math.round(Math.min(MC.damageMax, MC.damageBase + MC.damagePerMission * Z.mission.index));
        J.hurt(dmg); J.vx *= MC.slow; J.vz *= MC.slow; J.hop = 0.6;
        WZ.Fx.text('-' + dmg, J.rx, J.ry + 5, J.rz, 'warn'); WZ.Fx.flash('hurt');
      } else { N.hurt(MC.nanaDamage); WZ.Fx.text('-' + MC.nanaDamage, N.rx, N.ry + 4, N.rz, 'warn'); }
    },

    startWarn(tm) {
      const J = Z.ctx.jeep, rng = Z.rng, lim = Z.ctx.map.half - 12; let x = 0, z = 0;
      for (let k = 0; k < 8; k++) {
        const a = rng.range(0, 6.283), d = rng.range(TC.spawnDist[0], TC.spawnDist[1]); x = J.x + Math.sin(a) * d; z = J.z + Math.cos(a) * d;
        if (Math.abs(x) < lim && Math.abs(z) < lim) break;
      }
      x = U.clamp(x, -lim, lim); z = U.clamp(z, -lim, lim);
      Z.torn = { phase: 'warn', t: 0, x, z, hd: Math.atan2(J.x - x, J.z - z), spin: rng.sign(), ph: rng.range(0, 6), scale: 0.15, start: tm };
      Z.tg.visible = true; WZ.Audio.sfx('siren'); WZ.Fx.shake(0.2); WZ.Fx.text('TORNADO!', J.rx, J.ry + 6, J.rz, 'warn');
    },

    updateTornado(dt, tm) {
      const c = Z.ctx, J = c.jeep, N = c.nana, E = c.enemies, Tn = Z.torn, rng = Z.rng, lim = c.map.half - 10;
      if (!Tn) { if (J.alive && tm >= Z.nextT) Z.startWarn(tm); return; }
      Tn.t += dt;
      if (Tn.phase === 'warn') {
        Tn.scale = 0.15 + 0.85 * Math.min(1, Tn.t / TC.warn); Z.key = 'hud.tornado';
        if (Tn.t >= TC.warn) { Tn.phase = 'active'; Tn.t = 0; WZ.Fx.shake(0.3); }
        return;
      }
      if (Tn.phase === 'active') {
        Tn.scale = 1; if (Tn.t >= TC.life) { Tn.phase = 'fade'; Tn.t = 0; }
        const sp = Math.min(TC.maxSpeed, TC.speed + TC.speedPerMission * Z.mission.index);
        const want = Math.atan2(J.x - Tn.x, J.z - Tn.z) + Math.sin(Tn.t * 0.8 + Tn.ph) * 0.9 * (1 - TC.homing);
        Tn.hd += U.clamp(U.angDiff(Tn.hd, want), -TC.turn * dt, TC.turn * dt);
        Tn.x = U.clamp(Tn.x + Math.sin(Tn.hd) * sp * dt, -lim, lim); Tn.z = U.clamp(Tn.z + Math.cos(Tn.hd) * sp * dt, -lim, lim);
      } else {
        Tn.scale = Math.max(0, 1 - Tn.t / TC.fade);
        if (Tn.t >= TC.fade) { Z.torn = null; Z.tg.visible = false; Z.nextT = tm + rng.range(TC.gap[0], TC.gap[1]); Z.caught = 0; return; }
      }
      const R = TC.radius * Tn.scale, dj = Math.hypot(J.x - Tn.x, J.z - Tn.z);
      if (J.alive && dj < R) {
        const k = 1 - dj / R, f = Math.exp(-TC.drag * k * dt), l = dj || 1;
        J.vx = J.vx * f + (Tn.x - J.x) / l * TC.pull * k * dt; J.vz = J.vz * f + (Tn.z - J.z) / l * TC.pull * k * dt;
        J.h += Tn.spin * TC.spin * (0.35 + 0.65 * k) * dt;
        WZ.Fx.shake(0.1 + 0.2 * k); Z.key = 'hud.tornadoEscape';
        if (!Z.caught) { Z.caught = 1; WZ.Fx.text('SPINNING!', J.rx, J.ry + 6, J.rz, 'warn'); WZ.Fx.flash('hurt'); }
        Z.windT -= dt; if (Z.windT <= 0) { Z.windT = 0.45; WZ.Audio.sfx('wind'); }
      } else { Z.caught = 0; if (dj < 45) Z.key = 'hud.tornado'; }
      if (N.out && !N.isKO && Math.hypot(N.x - Tn.x, N.z - Tn.z) < R * 0.85) {
        Z.nanaT -= dt; if (Z.nanaT <= 0) { Z.nanaT = 0.5; N.hurt(TC.nanaDamage); }
      }
      E.hash.query(Tn.x, Tn.z, R * 1.15, E.q);
      for (const e of E.q.slice()) {
        if (!e.active || e.state === 2 || Math.hypot(e.x - Tn.x, e.z - Tn.z) > R) continue;
        const rx = e.x - Tn.x, rz = e.z - Tn.z;
        E.ko(e, rx - rz * Tn.spin * 0.8, rz + rx * Tn.spin * 0.8, 14, 'tornado');
      }
    },

    // ------------------------------------------------------------------ HUD / render
    hint() { return Z.key; },
    arrowPos() { const Tn = Z.torn; return Tn && Tn.phase !== 'fade' ? { x: Tn.x, y: Z.ctx.map.height(Tn.x, Tn.z) + 12, z: Tn.z } : null; },

    render(dt, tm) {
      if (!Z.ctx) return;
      if (Z.ms) {
        const lamp = Z.ms[4], ring = Z.ms[5];
        for (const mn of Z.mines) if (mn.on) {
          const ph = (tm * 1.1 + mn.ph) % 1;
          setM(lamp, mn.i, mn.x + 1.5, mn.gy + 2.75, mn.z, ph < 0.4 ? 1 : 0.25);
          setM(ring, mn.i, mn.x, mn.gy + 0.1, mn.z, 0.9 + 0.12 * Math.sin(tm * 5 + mn.ph * 6));
        }
        lamp.instanceMatrix.needsUpdate = ring.instanceMatrix.needsUpdate = true;
      }
      const Tn = Z.torn; if (!Tn || !Z.tg) return;
      const gy = Z.ctx.map.height(Tn.x, Tn.z), s = Tn.scale * (1 + 0.04 * Math.sin(tm * 6));
      Z.tg.position.set(Tn.x, gy, Tn.z); Z.tg.scale.set(s, Tn.phase === 'warn' ? s : s, s);
      Z.ring.visible = Tn.phase === 'warn'; Z.ring.material.opacity = 0.35 + 0.3 * Math.sin(tm * 12);
      for (let i = 0; i < Z.layers.length; i++) {
        const l = Z.layers[i]; l.rotation.y += dt * (3.5 + i * 0.6) * Tn.spin; l.position.x = Math.sin(tm * 2.2 + i * 0.8) * i * 0.18; l.position.z = Math.cos(tm * 1.9 + i * 0.7) * i * 0.15;
      }
      for (const d of Z.debris) {
        const u = d.userData; u.a += u.sp * dt * Tn.spin; const r = 1.6 + u.h * 0.38;
        d.position.set(Math.cos(u.a) * r, u.h, Math.sin(u.a) * r); d.rotation.x += dt * 6; d.rotation.y += dt * 4;
      }
      Z.dustT -= dt; if (Z.dustT <= 0 && Tn.scale > 0.4) { Z.dustT = 0.07; Z.ctx.particles.dust(Tn.x + (Math.random() - 0.5) * 5, gy, Tn.z + (Math.random() - 0.5) * 5, 2); }
    },

    dispose() {
      const sc = Z.ctx && Z.ctx.scene;
      if (sc) { for (const m of Z.ms || []) sc.remove(m); if (Z.tg) sc.remove(Z.tg); }
      for (const g of Z.geos) g.dispose();
      for (const m of Z.layers) m.material.dispose();
      if (Z.ring) Z.ring.material.dispose(); if (Z.tex) Z.tex.dispose();
      for (const m of Z.ms || []) { m.material.dispose(); m.dispose(); }
      Z.geos = []; Z.layers = []; Z.debris = []; Z.mines = []; Z.ms = null; Z.tg = Z.ring = Z.tex = null; Z.torn = null; Z.ctx = null;
      Z.minesOn = Z.tornOn = false; Z.key = ''; Z.caught = 0; Z.nearest = 1e9;
    },
  };
  WZ.Hazards = Z;
})(window.WZ = window.WZ || {});
