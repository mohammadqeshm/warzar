/* WZ.Turrets — DEFENSE: press T / the DEFENSE button to deploy an automatic twin-barrel gun turret right next to the vehicle.
 * It rises out of the ground, tracks and shoots the nearest enemy, and dismantles itself after C.life seconds.
 * Limits: C.max turrets at once and a C.cooldown recharge between deployments. Invulnerable; never hurts the jeep or Nana. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, C = CFG.turret, G = WZ.Geo, U = WZ.U, rb = G.rbox;
  const B = () => new G.Builder();
  const YEL = 0xFFB400, STEEL = 0x2B2E31, DARK = 0x16181A, BODY = 0x4A525A, PLATE = 0x59636E;
  let parts = null, VM = null, ringGeo = null, shockGeo = null;

  function makeParts() {
    const base = B(), head = B(), bar = B(), lamp = B();
    base.add(G.cyl(6), { sx: 1.7, sy: 0.2, sz: 1.7, y: 0.1, color: STEEL });
    base.add(G.cyl(6), { sx: 1.86, sy: 0.08, sz: 1.86, y: 0.04, color: YEL });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.52; base.add(rb(0.34, 0.12, 0.2, 0.03), { x: Math.cos(a) * 1.5, z: Math.sin(a) * 1.5, y: 0.24, ry: -a, color: i % 2 ? DARK : YEL }); }
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; base.beam(0, 1.05, 0, Math.cos(a) * 1.35, 0.2, Math.sin(a) * 1.35, 0.17, 0.17, 0x3A3F44); }
    base.add(G.cyl(10), { sx: 0.4, sy: 1.0, sz: 0.4, y: 0.7, color: 0x3A3F44 });
    base.add(rb(0.62, 0.42, 0.5, 0.06), { x: 1.0, y: 0.42, z: 0.25, ry: 0.3, color: 0x4B5A3A });
    base.add(rb(0.64, 0.08, 0.52, 0.02), { x: 1.0, y: 0.5, z: 0.25, ry: 0.3, color: YEL });
    head.add(rb(1.0, 0.64, 1.15, 0.17), { color: BODY });
    head.add(rb(0.96, 0.1, 1.08, 0.04), { y: 0.37, color: YEL });
    for (const s of [1, -1]) { head.add(rb(0.12, 0.72, 0.95, 0.05), { x: 0.57 * s, y: 0.02, z: 0.05, color: PLATE }); head.add(rb(0.1, 0.1, 0.5, 0.03), { x: 0.44 * s, y: 0.42, z: -0.25, color: DARK }); }
    head.add(rb(0.5, 0.36, 0.34, 0.08), { y: -0.02, z: -0.72, color: DARK });
    head.add(G.cyl(12), { x: -0.28, y: 0.7, z: -0.25, rx: 0.5, sx: 0.24, sy: 0.04, sz: 0.24, color: 0xB9BDC2 });
    head.add(G.cyl(6), { x: -0.28, y: 0.52, z: -0.25, sx: 0.04, sy: 0.35, sz: 0.04, color: DARK });
    bar.add(rb(0.62, 0.34, 0.5, 0.06), { z: 0.55, color: DARK });
    for (const s of [1, -1]) { bar.add(rb(0.15, 0.15, 1.5, 0.05), { x: 0.2 * s, y: 0.06, z: 1.25, color: 0x0E0E0E }); bar.add(rb(0.22, 0.22, 0.24, 0.05), { x: 0.2 * s, y: 0.06, z: 2.0, color: STEEL }); }
    lamp.add(G.sph(10, 8), { sx: 0.17, sy: 0.17, sz: 0.17, color: 0xFFFFFF });
    return { base: base.build(), head: head.build(), bar: bar.build(), lamp: lamp.build() };
  }

  /** a complete turret (also used for offline previews): returns { root, headG, barG, lamp } */
  function model() {
    if (!parts) { parts = makeParts(); VM = new T.MeshLambertMaterial({ vertexColors: true }); }
    const root = new T.Group(), headG = new T.Group(), barG = new T.Group();
    headG.position.y = 1.45; root.add(headG); headG.add(barG);
    const meshes = [new T.Mesh(parts.base, VM), new T.Mesh(parts.head, VM), new T.Mesh(parts.bar, VM)];
    root.add(meshes[0]); headG.add(meshes[1]); barG.add(meshes[2]);
    for (const m of meshes) m.castShadow = true;
    const lamp = new T.Mesh(parts.lamp, new T.MeshBasicMaterial({ vertexColors: true, color: 0x4cff6a })); lamp.position.set(0, 0.5, 0.6); headG.add(lamp);
    return { root, headG, barG, lamp };
  }
  const easeBack = (k) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

  const L = {
    ctx: null, list: [], cd: 0, noteT: 0, planted: 0, kills: 0,
    get count() { return L.list.length; },
    get cdPct() { return L.cd <= 0 ? 1 : 1 - L.cd / C.cooldown; },
    get ready() { return L.cd <= 0 && L.list.length < C.max; },

    init(ctx) {
      L.dispose(); L.ctx = ctx; L.list = []; L.cd = 0; L.noteT = 0; L.planted = 0; L.kills = 0;
      if (!ringGeo) { ringGeo = new T.RingGeometry(C.range - 0.3, C.range, 72).rotateX(-Math.PI / 2); shockGeo = new T.RingGeometry(0.85, 1.0, 48).rotateX(-Math.PI / 2); }
    },

    note(key) {
      const J = L.ctx.jeep; WZ.Audio.sfx('beep'); WZ.Fx.text(WZ.I18n.t(key), J.rx, J.ry + 6, J.rz, 'warn');
    },

    /** returns true when a turret was deployed */
    plant() {
      const c = L.ctx; if (!c) return false;
      const J = c.jeep; if (!J.alive) return false;
      if (L.cd > 0) { if (L.noteT <= 0) { L.note('hud.turretCd'); L.noteT = 0.8; } return false; }
      if (L.list.length >= C.max) { if (L.noteT <= 0) { L.note('hud.turretMax'); L.noteT = 0.8; } return false; }
      const sn = Math.sin(J.h), cs = Math.cos(J.h), back = -(J.P.halfLen + C.behind);
      let spot = null;
      for (const [d, side] of [[back, 0], [0, -4.8], [0, 4.8], [-back * 0.9, 0], [back, 3.2], [back, -3.2]]) {
        const x = J.x + sn * d + cs * side, z = J.z + cs * d - sn * side;
        if (c.col.free(x, z, 1.7)) { spot = { x, z }; break; }
      }
      if (!spot) { if (L.noteT <= 0) { L.note('hud.turretBlocked'); L.noteT = 0.8; } return false; }
      const gy = c.map.height(spot.x, spot.z), m = model(), lampMat = m.lamp.material;
      const ring = new T.Mesh(ringGeo, new T.MeshBasicMaterial({ color: YEL, transparent: true, opacity: 0.35, depthWrite: false, fog: false }));
      const shock = new T.Mesh(shockGeo, new T.MeshBasicMaterial({ color: 0xFFE27A, transparent: true, opacity: 0.7, depthWrite: false, side: T.DoubleSide }));
      ring.position.set(spot.x, gy + 0.12, spot.z); shock.position.set(spot.x, gy + 0.18, spot.z);
      m.root.position.set(spot.x, gy, spot.z); m.root.scale.setScalar(0.01);
      c.scene.add(m.root, ring, shock);
      L.list.push({ x: spot.x, z: spot.z, gy, life: C.life, age: 0, yaw: J.h, root: m.root, headG: m.headG, barG: m.barG, lamp: m.lamp, lampMat, ring, shock, cdF: 0.3, side: 1, kick: 0, target: null, retarget: 0, sfxN: 0 });
      L.cd = C.cooldown; L.planted++;
      WZ.Audio.sfx('build'); c.particles.dust(spot.x, gy, spot.z, 8); c.particles.poof(spot.x, gy + 0.6, spot.z, 8, 1.6);
      WZ.Fx.shake(0.18); WZ.Fx.text(WZ.I18n.t('hud.turretOn'), spot.x, gy + 4.2, spot.z, 'good');
      return true;
    },

    update(dt) {
      const c = L.ctx; if (!c) return;
      if (L.cd > 0) L.cd -= dt; if (L.noteT > 0) L.noteT -= dt;
      const E = c.enemies;
      for (let k = L.list.length - 1; k >= 0; k--) {
        const t = L.list[k]; t.age += dt; t.life -= dt;
        if (t.life <= 0) { c.particles.poof(t.x, t.gy + 1.0, t.z, 10, 1.8); WZ.Audio.sfx('thud'); L.remove(k); continue; }
        if (t.age < C.build) continue;
        t.retarget -= dt;
        if (t.retarget <= 0 || !t.target || !t.target.active || t.target.state === 2) { t.retarget = 0.12; t.target = E.nearest(t.x, t.z, C.range); }
        const tg = t.target; let err = 9;
        if (tg) {
          err = U.angDiff(t.yaw, Math.atan2(tg.x - t.x, tg.z - t.z));
          t.yaw += U.clamp(err, -C.turnSpeed * dt, C.turnSpeed * dt);
        } else t.yaw += dt * 0.7;
        t.cdF -= dt;
        if (tg && Math.abs(err) < C.aim && t.cdF <= 0) {
          t.cdF = 1 / C.rate; t.side = -t.side; t.kick = 1;
          const sn = Math.sin(t.yaw), cs = Math.cos(t.yaw), mx = t.x + sn * 2.1 + cs * 0.2 * t.side, mz = t.z + cs * 2.1 - sn * 0.2 * t.side, my = t.gy + 1.52;
          const gy = c.map.height(tg.x, tg.z) + 1.8, dx = tg.x - t.x, dz = tg.z - t.z, dl = Math.hypot(dx, dz) || 1;
          WZ.Gun._tracer(mx, my, mz, tg.x + (Math.random() - 0.5) * 0.6, gy, tg.z + (Math.random() - 0.5) * 0.6);
          c.particles.muzzle(mx, my, mz);
          if (E.damage(tg, C.damage, dx / dl * C.knock, dz / dl * C.knock, 'turret')) L.kills++;
          if ((t.sfxN++ & 1) === 0) WZ.Audio.sfx('tshot', 0.6);
        }
      }
    },

    remove(k) {
      const t = L.list[k], sc = L.ctx.scene; sc.remove(t.root, t.ring, t.shock);
      t.ring.material.dispose(); t.shock.material.dispose(); t.lampMat.dispose(); L.list.splice(k, 1);
    },

    render(dt, tm) {
      for (const t of L.list) {
        const k = Math.min(1, t.age / C.build), e = k < 1 ? easeBack(k) : 1;
        t.root.scale.setScalar(Math.max(0.01, e)); t.headG.rotation.y = t.yaw + (1 - k) * 3.2;
        t.kick = Math.max(0, t.kick - dt * 9); t.barG.position.z = -0.28 * t.kick;
        const low = t.life < 4, on = !low || ((tm * 6) % 1) < 0.55;
        t.lampMat.color.setHex(t.life > 10 ? 0x4cff6a : t.life > 4 ? 0xFFC83A : (on ? 0xFF3A22 : 0x3a0f0a));
        t.ring.material.opacity = Math.max(0, 0.35 * (1 - t.age / 2.2)); t.ring.visible = t.ring.material.opacity > 0.01;
        const sk = t.age / 0.45; t.shock.visible = sk < 1; if (sk < 1) { t.shock.scale.setScalar(1 + sk * 7); t.shock.material.opacity = 0.7 * (1 - sk); }
      }
    },

    dispose() {
      if (L.ctx) for (let k = L.list.length - 1; k >= 0; k--) L.remove(k);
      L.list = []; L.ctx = null;
    },
    model,
  };
  WZ.Turrets = L;
})(window.WZ = window.WZ || {});
