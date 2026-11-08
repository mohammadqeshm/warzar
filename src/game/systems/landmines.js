/* WZ.Landmines — mines the PLAYER plants (bought in the Garage). Plant with F / M / the MINE button: one mine drops behind the vehicle.
 * Inventory lives in Save.data.inv.mines: each planted mine is consumed for good and unused mines carry over to the next mission.
 * A mine arms after C.armDelay s; any enemy that steps on it detonates it (KOs everything within C.blast). Never hurts the jeep or Nana. */
(function (WZ) {
  'use strict';
  const T = THREE, C = WZ.CFG.mine, MAX = C.maxActive;
  const m4 = new T.Matrix4(), qI = new T.Quaternion(), vp = new T.Vector3(), vs = new T.Vector3();
  const setM = (mesh, i, x, y, z, s) => { m4.compose(vp.set(x, y, z), qI, vs.set(s, s, s)); mesh.setMatrixAt(i, m4); };

  const L = {
    ctx: null, list: [], free: [], ms: null, cd: 0, noneT: 0, planted: 0, kills: 0,
    get count() { return (WZ.Save.data.inv && WZ.Save.data.inv.mines) | 0; },

    init(ctx) {
      L.dispose(); L.ctx = ctx; L.list = []; L.cd = 0; L.planted = 0; L.kills = 0; L.free = [];
      for (let i = MAX - 1; i >= 0; i--) L.free.push(i);
      const p = WZ.Vehicles.mineParts();
      const parts = [[p.body, new T.MeshLambertMaterial({ vertexColors: true })], [p.top, new T.MeshLambertMaterial({ vertexColors: true })], [p.lamp, new T.MeshBasicMaterial({ vertexColors: true })]];
      L.ms = parts.map(([b, mat]) => { const im = new T.InstancedMesh(b.build(), mat, MAX); im.frustumCulled = false; im.castShadow = false; ctx.scene.add(im); for (let i = 0; i < MAX; i++) setM(im, i, 0, -50, 0, 0); im.instanceMatrix.needsUpdate = true; return im; });
    },

    place(m, on) {
      for (let k = 0; k < 3; k++) setM(L.ms[k], m.i, m.x, m.gy, m.z, on ? 1 : 0);
      for (const im of L.ms) im.instanceMatrix.needsUpdate = true;
    },

    /** returns true when a mine was planted */
    plant() {
      const c = L.ctx; if (!c) return false;
      const J = c.jeep, S = WZ.Save.data;
      if (!J.alive || L.cd > 0) return false;
      if (L.count <= 0) { L.cd = 0.8; WZ.Audio.sfx('beep'); WZ.Fx.text(WZ.I18n.t('hud.nomines'), J.rx, J.ry + 6, J.rz, 'warn'); return false; }
      if (!L.free.length) { L.cd = 0.8; WZ.Fx.text(WZ.I18n.t('hud.maxmines'), J.rx, J.ry + 6, J.rz, 'warn'); return false; }
      const off = J.P.halfLen + C.behind;
      let x = J.x - Math.sin(J.h) * off, z = J.z - Math.cos(J.h) * off;
      if (!c.col.free(x, z, 1.0)) { x = J.x; z = J.z; }
      const m = { x, z, gy: c.map.height(x, z), i: L.free.pop(), arm: C.armDelay, t: 0 };
      L.list.push(m); L.place(m, true); L.planted++;
      S.inv.mines = Math.max(0, S.inv.mines - 1); WZ.Save.save(); L.cd = C.cooldown;
      WZ.Audio.sfx('thud'); c.particles.dust(x, m.gy, z, 5); WZ.Fx.text(WZ.I18n.t('hud.planted'), x, m.gy + 3.2, z, 'good');
      return true;
    },

    update(dt) {
      const c = L.ctx; if (!c) return;
      if (L.cd > 0) L.cd -= dt;
      const E = c.enemies;
      for (let k = L.list.length - 1; k >= 0; k--) {
        const m = L.list[k]; m.t += dt;
        if (m.arm > 0) { m.arm -= dt; continue; }
        E.hash.query(m.x, m.z, C.trigger + 1.5, E.q);
        let hit = false;
        for (let i = 0; i < E.q.length; i++) { const e = E.q[i]; if (e.active && e.state !== 2 && Math.hypot(e.x - m.x, e.z - m.z) < C.trigger) { hit = true; break; } }
        if (hit) L.boom(k);
      }
    },

    boom(k) {
      const c = L.ctx, m = L.list[k], E = c.enemies, P = c.particles, y = m.gy + 0.6;
      L.list.splice(k, 1); L.place(m, false); L.free.push(m.i);
      P.poof(m.x, y, m.z, 16, 2.6); P.sparks(m.x, y + 0.5, m.z, 30, 1, 0.8, 0.3); P.dust(m.x, m.gy, m.z, 10);
      WZ.Audio.sfx('boom'); WZ.Fx.shake(0.45); WZ.Fx.hitstop(0.05); WZ.Fx.text('BOOM!', m.x, y + 3.5, m.z, 'bonk');
      E.hash.query(m.x, m.z, C.blast, E.q);
      let n = 0;
      for (const e of E.q.slice()) { if (!e.active || e.state === 2 || Math.hypot(e.x - m.x, e.z - m.z) > C.blast) continue; E.ko(e, e.x - m.x, e.z - m.z, C.power, 'mine'); n++; }
      L.kills += n;
      if (n >= 3) WZ.Fx.text('x' + n + ' ' + WZ.I18n.t('hud.combo'), m.x, y + 6, m.z, 'coin');
    },

    render(dt, tm) {
      if (!L.ms || !L.list.length) return;
      const lamp = L.ms[2];
      for (const m of L.list) setM(lamp, m.i, m.x, m.gy, m.z, m.arm > 0 ? 0 : (((tm * 1.6 + m.i * 0.37) % 1) < 0.5 ? 1 : 0.2));
      lamp.instanceMatrix.needsUpdate = true;
    },

    dispose() {
      if (L.ms) for (const im of L.ms) { if (L.ctx) L.ctx.scene.remove(im); im.geometry.dispose(); im.material.dispose(); im.dispose(); }
      L.ms = null; L.ctx = null; L.list = []; L.free = [];
    },
  };
  WZ.Landmines = L;
})(window.WZ = window.WZ || {});
