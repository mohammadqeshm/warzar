/* WZ.Heli — ESCORT HELICOPTER (bought in the Shop; one is consumed per call, no limit on how many fly at once).
 * It flies in from far away, then hovers beside the vehicle at a fixed SCREEN-SIDE slot (left / right, a bit above and off to the side) so it never
 * blocks the player's view, follows the vehicle and strafes the nearest enemy around the vehicle (or around Nana while she is outside).
 * After CFG.heli.life seconds it climbs away. Invulnerable. Defense Tech levels boost its damage, fire rate and flight time like the turrets. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, C = CFG.heli, U = WZ.U, G = WZ.Geo, rb = G.rbox;
  const B = () => new G.Builder();
  const OLIVE = 0x56733F, OLIVE_D = 0x3E5530, YEL = 0xFFB400, DARK = 0x23272A, GLASS = 0x8AD0FF, GRAY = 0x5C636B;
  const SC = 0.78;
  let parts = null;

  function makeParts() {
    const body = B(), rotor = B(), tail = B();
    body.add(rb(2.5, 2.2, 4.3, 0.85), { color: OLIVE });
    body.add(rb(2.55, 0.34, 3.4, 0.1), { y: -0.35, z: -0.1, color: YEL });
    body.add(rb(2.1, 1.45, 1.7, 0.6), { y: 0.3, z: 1.95, color: GLASS });
    body.add(rb(1.9, 0.5, 1.4, 0.2), { y: -0.75, z: 1.9, color: OLIVE_D });
    body.add(rb(1.6, 0.9, 1.9, 0.4), { y: 1.35, z: -0.3, color: GRAY });
    body.add(G.cyl(8), { y: 1.95, sx: 0.2, sy: 0.7, sz: 0.2, color: DARK });
    body.add(rb(0.78, 0.82, 4.6, 0.22), { y: 0.45, z: -3.7, color: OLIVE });
    body.add(rb(0.2, 1.8, 1.15, 0.07), { y: 1.35, z: -5.7, rx: -0.25, color: YEL });
    body.add(rb(2.0, 0.14, 0.75, 0.05), { y: 0.55, z: -5.3, color: OLIVE_D });
    for (const s of [1, -1]) {
      body.add(rb(0.2, 0.2, 4.2, 0.07), { x: 1.3 * s, y: -1.45, z: 0.1, color: DARK });
      body.beam(1.0 * s, -0.9, 1.0, 1.3 * s, -1.45, 1.0, 0.16, 0.16, DARK); body.beam(1.0 * s, -0.9, -0.9, 1.3 * s, -1.45, -0.9, 0.16, 0.16, DARK);
      body.add(rb(0.55, 0.55, 1.5, 0.18), { x: 1.55 * s, y: -0.35, z: 0.6, color: GRAY });          // rocket pod
      body.add(G.cone(8), { x: 1.55 * s, y: -0.35, z: 1.5, rx: Math.PI / 2, sx: 0.26, sy: 0.4, sz: 0.26, color: 0xD2391E });
    }
    body.add(rb(0.34, 0.34, 1.7, 0.1), { y: -1.0, z: 2.35, color: DARK });                          // nose gun
    body.add(rb(0.2, 0.2, 0.6, 0.05), { y: -1.0, z: 3.4, color: 0x0E0E0E });
    rotor.add(G.cyl(10), { sx: 0.34, sy: 0.3, sz: 0.34, color: DARK });
    rotor.add(rb(11.4, 0.1, 0.6, 0.03), { color: DARK });
    rotor.add(rb(0.6, 0.1, 11.4, 0.03), { color: DARK });
    rotor.add(rb(1.0, 0.11, 0.62, 0.03), { x: 5.4, color: YEL }); rotor.add(rb(1.0, 0.11, 0.62, 0.03), { x: -5.4, color: YEL });
    rotor.add(rb(0.62, 0.11, 1.0, 0.03), { z: 5.4, color: YEL }); rotor.add(rb(0.62, 0.11, 1.0, 0.03), { z: -5.4, color: YEL });
    tail.add(rb(0.08, 1.7, 0.26, 0.03), { color: DARK }); tail.add(rb(0.08, 0.26, 1.7, 0.03), { color: DARK });
    return { body: body.build(), rotor: rotor.build(), tail: tail.build() };
  }

  /** a complete helicopter model (also used by the shop preview) */
  function model() {
    if (!parts) parts = makeParts();
    const mat = new T.MeshLambertMaterial({ vertexColors: true }), root = new T.Group(), pivot = new T.Group();
    root.add(pivot);
    const body = new T.Mesh(parts.body, mat); body.castShadow = true; pivot.add(body);
    const rotor = new T.Mesh(parts.rotor, mat); rotor.position.y = 2.35; rotor.castShadow = true; pivot.add(rotor);
    const blur = new T.Mesh(new T.CircleGeometry(5.9, 28).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0xE8E8E8, transparent: true, opacity: 0.1, depthWrite: false, side: T.DoubleSide })); blur.position.y = 2.38; pivot.add(blur);
    const tail = new T.Mesh(parts.tail, mat); tail.position.set(0.3, 1.35, -5.75); pivot.add(tail);
    const lampMat = new T.MeshBasicMaterial({ color: 0xFF3A22 }), lamp = new T.Mesh(new T.SphereGeometry(0.16, 8, 6), lampMat); lamp.position.set(0, 2.35, -6.1); pivot.add(lamp);
    pivot.scale.setScalar(SC);
    let a = 0;
    return {
      root, pivot, rotor, tail, lampMat, headG: new T.Group(), scale: SC,
      spin(dt) { a += dt * 30; rotor.rotation.y = a; tail.rotation.x = a * 1.3; },
      dispose() { mat.dispose(); blur.geometry.dispose(); blur.material.dispose(); lamp.geometry.dispose(); lampMat.dispose(); },
    };
  }

  const tech = () => (WZ.Save.data.upgrades.defense | 0);
  const Heli = {
    ctx: null, list: [], called: 0, kills: 0, noteT: 0, cd: 0,
    stock() { const v = WZ.Save.data.inv; return (v && v.heli) | 0; },
    get count() { return Heli.list.length; },
    cdPct() { return Heli.cd <= 0 ? 1 : 1 - Heli.cd / 0.6; },
    model,

    init(ctx) { Heli.dispose(); Heli.ctx = ctx; Heli.list = []; Heli.called = 0; Heli.kills = 0; Heli.noteT = 0; Heli.cd = 0; },

    /** call one helicopter (consumes one from the inventory). Returns true when it took off. */
    call() {
      const c = Heli.ctx; if (!c) return false;
      const J = c.jeep; if (!J.alive || Heli.cd > 0) return false;
      if (Heli.stock() <= 0) {
        if (Heli.noteT <= 0) { Heli.noteT = 0.8; WZ.Audio.sfx('beep'); WZ.Fx.text(WZ.I18n.t('hud.noheli'), J.rx, J.ry + 6, J.rz, 'warn'); }
        return false;
      }
      const S = WZ.Save.data; S.inv.heli = Math.max(0, S.inv.heli - 1); WZ.Save.save();
      const m = model(); c.scene.add(m.root);
      const a = Math.random() * 6.283, d = 95, slot = Heli.called++;
      const h = {
        m, slot, state: 0, age: 0, life: C.life * (1 + tech() * CFG.defenseTech.life), x: J.x + Math.sin(a) * d, z: J.z + Math.cos(a) * d, y: C.alt * 2.4, px: 0, py: 0, pz: 0,
        vx: 0, vz: 0, yaw: Math.atan2(-Math.sin(a), -Math.cos(a)), roll: 0, pitch: 0, cdF: 0.4, target: null, retarget: 0, sfxN: 0, rotorT: 0, kick: 0,
      };
      h.px = h.x; h.py = h.y; h.pz = h.z;
      Heli.list.push(h); Heli.cd = 0.6;
      WZ.Audio.sfx('heli', 1.4); WZ.Fx.text(WZ.I18n.t('hud.heliOn'), J.rx, J.ry + 6.5, J.rz, 'good'); WZ.Fx.flash('good');
      return true;
    },

    update(dt) {
      const c = Heli.ctx; if (!c) return;
      if (Heli.cd > 0) Heli.cd -= dt; if (Heli.noteT > 0) Heli.noteT -= dt;
      const J = c.jeep, N = c.nana, E = c.enemies, cy = WZ.Cam.yaw, fx = Math.sin(cy), fz = Math.cos(cy), rx = -Math.cos(cy), rz = Math.sin(cy);
      const dm = 1 + tech() * CFG.defenseTech.dmg, rm = 1 + tech() * CFG.defenseTech.rate;
      const nanaOut = N.out && !N.isKO && N.state !== 'BOARDING';
      for (let k = Heli.list.length - 1; k >= 0; k--) {
        const h = Heli.list[k]; h.age += dt; h.px = h.x; h.py = h.y; h.pz = h.z;
        const lap = Math.floor(h.slot / C.slots.length), sl = C.slots[h.slot % C.slots.length], sc = 1 + lap * 0.45;
        const leaving = h.age > h.life || !J.alive;
        // station: beside the vehicle (screen left/right), slightly ahead of it
        let tx = J.x + J.vx * 0.3 + rx * sl[0] * sc + fx * sl[1] * sc, tz = J.z + J.vz * 0.3 + rz * sl[0] * sc + fz * sl[1] * sc, ty = C.alt + lap * 1.5 + Math.sin(h.age * 1.6 + h.slot * 2) * 0.55;
        let dx = tx - h.x, dz = tz - h.z, dist = Math.hypot(dx, dz), maxSp = C.speed;
        if (leaving) { // fly away and up
          const l = Math.hypot(h.x - J.x, h.z - J.z) || 1; dx = (h.x - J.x) / l; dz = (h.z - J.z) / l; dist = 99; maxSp = C.speed * 1.2; ty = C.alt * 3;
          if (h.age > h.life + C.leave + 2 || l > 160) { c.scene.remove(h.m.root); h.m.dispose(); Heli.list.splice(k, 1); continue; }
        } else if (h.state === 0 && dist < 5) h.state = 1;
        const want = Math.min(maxSp, dist * (h.state === 0 ? 0.9 : 2.4)), l = dist || 1;
        const k2 = Math.min(1, dt * 2.6);
        h.vx += (dx / l * want - h.vx) * k2; h.vz += (dz / l * want - h.vz) * k2;
        h.x += h.vx * dt; h.z += h.vz * dt; h.y += (ty - h.y) * Math.min(1, dt * (h.state === 0 ? 1.1 : 2.2));

        // target: nearest enemy around whom we protect (Nana while outside, otherwise the vehicle)
        const pr = nanaOut ? N : J;
        h.retarget -= dt;
        if (h.retarget <= 0 || !h.target || !h.target.active || h.target.state === 2) {
          h.retarget = 0.2; let tg = leaving ? null : E.nearest(pr.x, pr.z, C.guard);
          if (tg && Math.hypot(tg.x - h.x, tg.z - h.z) > C.range) tg = E.nearest(h.x, h.z, C.range);
          h.target = tg;
        }
        const tg = h.target;
        const want2 = tg ? Math.atan2(tg.x - h.x, tg.z - h.z) : (Math.hypot(h.vx, h.vz) > 4 ? Math.atan2(h.vx, h.vz) : J.h);
        const err = U.angDiff(h.yaw, want2); h.yaw += U.clamp(err, -3.4 * dt, 3.4 * dt);
        // bank / pitch from the velocity (visual only)
        const hs = Math.sin(h.yaw), hc = Math.cos(h.yaw), vF = h.vx * hs + h.vz * hc, vR = -(h.vx * hc - h.vz * hs);
        h.roll = U.damp(h.roll, U.clamp(vR * 0.03, -0.38, 0.38), 5, dt); h.pitch = U.damp(h.pitch, U.clamp(vF * 0.011, -0.12, 0.3), 5, dt);

        // strafing run
        h.cdF -= dt; h.kick = Math.max(0, h.kick - dt * 8);
        if (tg && !leaving && Math.abs(U.angDiff(h.yaw, Math.atan2(tg.x - h.x, tg.z - h.z))) < 0.3 && h.cdF <= 0) {
          h.cdF += 1 / (C.rate * rm); if (h.cdF < -0.2) h.cdF = 0;
          const mx = h.x + hs * 2.6 * SC, mz = h.z + hc * 2.6 * SC, my = h.y - 0.9, gy = c.map.height(tg.x, tg.z) + (tg.giant ? 3.4 : 1.8);
          WZ.Gun._tracer(mx, my, mz, tg.x + (Math.random() - 0.5) * C.spread, gy, tg.z + (Math.random() - 0.5) * C.spread);
          c.particles.muzzle(mx, my, mz); h.kick = 1;
          const dxx = tg.x - h.x, dzz = tg.z - h.z, dl = Math.hypot(dxx, dzz) || 1;
          if (E.damage(tg, C.damage * dm, dxx / dl * C.knock, dzz / dl * C.knock, 'heli')) Heli.kills++;
          if ((h.sfxN++ & 1) === 0) WZ.Audio.sfx('tshot', 0.4);
        }
        h.rotorT -= dt; if (h.rotorT <= 0) { h.rotorT = 0.24; WZ.Audio.sfx('heli', 0.5); }
      }
    },

    render(alpha, dt, tm) {
      for (const h of Heli.list) {
        const m = h.m, x = U.lerp(h.px, h.x, alpha), y = U.lerp(h.py, h.y, alpha), z = U.lerp(h.pz, h.z, alpha);
        m.root.position.set(x, y + Heli.ctx.map.height(x, z), z); m.root.rotation.set(0, h.yaw, 0);
        m.pivot.rotation.set(h.pitch, 0, h.roll); m.pivot.position.y = Math.sin(tm * 3 + h.slot) * 0.08;
        m.spin(dt);
        const low = h.age > h.life - 4 && h.age < h.life; m.lampMat.color.setHex(((tm * (low ? 8 : 2.5)) % 1) < 0.5 ? 0xFF3A22 : 0x3a0f0a);
      }
    },

    dispose() {
      const c = Heli.ctx;
      for (const h of Heli.list) { if (c) c.scene.remove(h.m.root); h.m.dispose(); }
      Heli.list = []; Heli.ctx = null;
    },
  };
  WZ.Heli = Heli;
})(window.WZ = window.WZ || {});
