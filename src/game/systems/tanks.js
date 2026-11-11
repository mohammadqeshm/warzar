/* WZ.Tanks — ESCORT TANK (bought in the Shop; one is consumed per call, no limit on how many roll at once).
 * It drives in from off-screen, then FOLLOWS the vehicle (or Nana while she is outside) and COVERS her: when an enemy is near the protected
 * target the tank moves into the gap between the two and shields them; otherwise it escorts at a screen-side slot beside the vehicle.
 * Weapons: a cannon (splash shells with a real explosion, great against groups and giants) + a coaxial machine gun (rapid single-target fire).
 * It also flattens small enemies it drives over. Invulnerable, never hurts the vehicle or Nana. After CFG.tank.life seconds it packs up.
 * Defense Tech levels boost its damage, fire rate and lifetime like the turrets. All numbers: WZ.CFG.tank. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, C = CFG.tank, U = WZ.U, G = WZ.Geo, rb = G.rbox;
  const B = () => new G.Builder();
  const OLIVE = 0x56733F, OLIVE_D = 0x3E5530, OLIVE_L = 0x6B8A4C, YEL = 0xFFB400, DARK = 0x23272A, TRACK = 0x1B1D1F, GRAY = 0x5C636B, STEEL = 0x2B2E31, CLEAT = 0x34383C;
  const SC = C.scale || 1, SP = 0.3;               // SP = cleat spacing
  const TX = 1.52;                                  // track centre (x)
  const TURRET_Y = 1.95, TURRET_Z = 0.15;
  const tmp = { x: 0, z: 0 };
  let parts = null;

  function makeParts() {
    const hull = B(), turret = B(), barrel = B(), top = B(), bot = B();
    // ---- hull
    hull.add(rb(2.25, 0.72, 4.4, 0.2), { y: 0.97, color: OLIVE_D });
    hull.add(rb(2.0, 0.42, 3.1, 0.14), { y: 1.46, z: -0.45, color: OLIVE });
    hull.add(rb(2.0, 0.4, 1.5, 0.12), { y: 1.3, z: 1.95, rx: 0.4, color: OLIVE });                   // sloped front armour
    hull.add(rb(1.2, 0.12, 0.8, 0.04), { y: 1.7, z: 1.5, rx: 0.4, color: OLIVE_L });
    for (const s of [1, -1]) {
      hull.add(rb(0.34, 0.06, 3.0, 0.02), { x: 0.62 * s, y: 1.68, z: -0.45, color: YEL });          // hazard stripes
      hull.add(rb(0.34, 0.26, 0.2, 0.05), { x: 0.72 * s, y: 1.0, z: 2.22, color: 0xFFE9A0 });       // head lamps
      hull.add(rb(0.9, 0.1, 4.8, 0.04), { x: TX * s, y: 1.2, color: OLIVE_D });                     // fenders
      hull.add(rb(0.9, 0.06, 0.5, 0.02), { x: TX * s, y: 1.27, z: 2.0, color: YEL });
      hull.add(G.cyl(8), { x: 0.5 * s, y: 1.85, z: -1.95, sx: 0.1, sy: 0.55, sz: 0.1, rz: 0.2 * s, color: DARK });   // exhausts
      hull.add(G.cyl(10), { x: 0.62 * s, y: 1.52, z: -2.42, rx: Math.PI / 2, sx: 0.24, sy: 0.74, sz: 0.24, color: 0x8B3A1E }); // fuel drums
      // track belt + wheels
      hull.add(rb(0.84, 1.02, 4.7, 0.38), { x: TX * s, y: 0.63, color: TRACK });
      for (let i = 0; i < 5; i++) hull.add(G.cyl(14), { x: TX * s, y: 0.58, z: -1.85 + i * 0.93, rz: Math.PI / 2, sx: 0.4, sy: 0.9, sz: 0.4, color: GRAY }), hull.add(G.cyl(8), { x: (TX + 0.46) * s, y: 0.58, z: -1.85 + i * 0.93, rz: Math.PI / 2, sx: 0.16, sy: 0.06, sz: 0.16, color: YEL });
      hull.add(G.cyl(14), { x: TX * s, y: 0.7, z: 2.18, rz: Math.PI / 2, sx: 0.52, sy: 0.92, sz: 0.52, color: STEEL });
      hull.add(G.cyl(14), { x: TX * s, y: 0.7, z: -2.18, rz: Math.PI / 2, sx: 0.52, sy: 0.92, sz: 0.52, color: STEEL });
    }
    hull.add(rb(1.6, 0.3, 1.0, 0.08), { y: 1.72, z: -1.75, color: DARK });                          // engine deck
    for (let i = 0; i < 4; i++) hull.add(rb(1.2, 0.04, 0.08, 0.01), { y: 1.9, z: -1.5 - i * 0.2, color: 0x0E0E0E });
    hull.beam(-0.9, 1.7, -1.9, -1.0, 3.5, -2.1, 0.05, 0.05, DARK);                                  // radio antenna
    // ---- turret (group at TURRET_Y)
    turret.add(G.cyl(14), { y: -0.34, sx: 0.88, sy: 0.16, sz: 0.88, color: STEEL });
    turret.add(rb(1.55, 0.62, 1.9, 0.26), { color: OLIVE });
    turret.add(rb(1.25, 0.2, 1.35, 0.1), { y: 0.38, z: -0.05, color: OLIVE_L });
    turret.add(rb(1.58, 0.07, 0.5, 0.02), { y: 0.28, z: -0.3, color: YEL });
    turret.add(rb(0.84, 0.58, 0.45, 0.14), { y: 0.02, z: 1.0, color: OLIVE_D });                       // gun mantlet
    turret.add(rb(0.34, 0.3, 0.9, 0.07), { x: -0.83, y: 0.05, z: -0.3, color: OLIVE_D }); turret.add(rb(0.34, 0.3, 0.9, 0.07), { x: 0.83, y: 0.05, z: -0.3, color: OLIVE_D });
    turret.add(rb(1.3, 0.5, 0.7, 0.16), { y: 0.02, z: -1.1, color: OLIVE });                           // bustle
    turret.add(G.cyl(10), { x: -0.42, y: 0.55, z: -0.35, sx: 0.3, sy: 0.18, sz: 0.3, color: DARK });  // cupola
    turret.add(G.cyl(10), { x: -0.42, y: 0.66, z: -0.35, sx: 0.24, sy: 0.05, sz: 0.24, color: 0xB9BDC2 });
    turret.add(rb(0.1, 0.1, 0.7, 0.03), { x: -0.42, y: 0.82, z: -0.05, color: 0x0E0E0E });              // roof MG
    turret.add(rb(0.08, 0.08, 0.75, 0.03), { x: 0.38, y: 0.02, z: 1.4, color: 0x0E0E0E });             // coax MG
    // ---- gun barrel (group on the turret)
    barrel.add(rb(0.38, 0.38, 0.9, 0.08), { z: 0.55, color: STEEL });
    barrel.add(rb(0.22, 0.22, 2.7, 0.06), { z: 1.65, color: 0x15171A });
    barrel.add(rb(0.38, 0.38, 0.42, 0.08), { z: 3.0, color: STEEL });
    barrel.add(rb(0.26, 0.26, 0.1, 0.03), { z: 3.25, color: 0x0E0E0E });
    // ---- track cleats (animated by offset): top run + bottom run
    for (let i = -6; i <= 6; i++) { top.add(rb(0.92, 0.07, 0.19, 0.02), { y: 1.14, z: i * SP, color: CLEAT }); bot.add(rb(0.92, 0.07, 0.19, 0.02), { y: 0.1, z: i * SP, color: CLEAT }); }
    const out = { hull: hull.build(), turret: turret.build(), barrel: barrel.build(), top: top.build(), bot: bot.build() };
    for (const k in out) G.mark(out[k]);
    return out;
  }

  /** a complete tank (also used by the shop preview): returns { root, pivot, headG (turret), barG, lampMat, scale, spin(dt), dispose() } */
  function model() {
    if (!parts) parts = makeParts();
    const mat = new T.MeshLambertMaterial({ vertexColors: true }), root = new T.Group(), pivot = new T.Group();
    root.add(pivot); pivot.rotation.order = 'YXZ';
    const mesh = (g, parent) => { const m = new T.Mesh(g, mat); m.castShadow = true; parent.add(m); return m; };
    mesh(parts.hull, pivot);
    const tl = mesh(parts.top, pivot), bl = mesh(parts.bot, pivot), tr = mesh(parts.top, pivot), br = mesh(parts.bot, pivot);
    tl.position.x = bl.position.x = -TX; tr.position.x = br.position.x = TX;
    const headG = new T.Group(); headG.position.set(0, TURRET_Y, TURRET_Z); pivot.add(headG); mesh(parts.turret, headG);
    const barG = new T.Group(); barG.position.set(0, 0.03, 0.3); headG.add(barG); mesh(parts.barrel, barG);
    const lampMat = new T.MeshBasicMaterial({ color: 0x4cff6a }), lamp = new T.Mesh(new T.SphereGeometry(0.14, 8, 6), lampMat); lamp.position.set(0.5, 0.72, -0.85); headG.add(lamp);
    pivot.scale.setScalar(SC);
    let ph = 0;
    const m = {
      root, pivot, headG, barG, lampMat, scale: SC, tl, tr, bl, br,
      track(l, r) { tl.position.z = (l % SP + SP) % SP; bl.position.z = -((l % SP + SP) % SP); tr.position.z = (r % SP + SP) % SP; br.position.z = -((r % SP + SP) % SP); },
      spin(dt) { ph += dt * 0.9; m.track(ph, ph); },
      dispose() { mat.dispose(); lamp.geometry.dispose(); lampMat.dispose(); },
    };
    return m;
  }

  const tech = () => (WZ.Save.data.upgrades.defense | 0);
  const Tanks = {
    ctx: null, list: [], called: 0, kills: 0, noteT: 0, cd: 0,
    stock() { const v = WZ.Save.data.inv; return (v && v.tank) | 0; },
    get count() { return Tanks.list.length; },
    cdPct() { return Tanks.cd <= 0 ? 1 : 1 - Tanks.cd / C.cooldown; },
    model,

    init(ctx) { Tanks.dispose(); Tanks.ctx = ctx; Tanks.list = []; Tanks.called = 0; Tanks.kills = 0; Tanks.noteT = 0; Tanks.cd = 0; },

    note(key) { const J = Tanks.ctx.jeep; if (Tanks.noteT > 0) return; Tanks.noteT = 0.8; WZ.Audio.sfx('beep'); WZ.Fx.text(WZ.I18n.t(key), J.rx, J.ry + 6, J.rz, 'warn'); },

    /** a free patch of ground around (cx,cz) at the given radius (tries several angles) */
    freeSpot(cx, cz, d, out) {
      const c = Tanks.ctx, a0 = Math.random() * 6.283;
      for (let k = 0; k < 24; k++) {
        const a = a0 + k * 0.2618, x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d;
        if (c.col.free(x, z, C.radius + 0.6)) { out.x = x; out.z = z; return true; }
      }
      return false;
    },

    /** call one escort tank (consumes one from the inventory). Returns true when it rolled in. */
    call() {
      const c = Tanks.ctx; if (!c) return false;
      const J = c.jeep; if (!J.alive || Tanks.cd > 0) return false;
      if (Tanks.stock() <= 0) { Tanks.note('hud.notank'); return false; }
      const sp = { x: 0, z: 0 };
      if (!Tanks.freeSpot(J.x, J.z, C.spawnDist, sp) && !Tanks.freeSpot(J.x, J.z, C.spawnDist * 0.6, sp) && !Tanks.freeSpot(J.x, J.z, 14, sp)) { Tanks.note('hud.turretBlocked'); return false; }
      const S = WZ.Save.data; S.inv.tank = Math.max(0, S.inv.tank - 1); WZ.Save.save();
      const m = model(); c.scene.add(m.root);
      const slot = Tanks.called++, yaw = Math.atan2(J.x - sp.x, J.z - sp.z);
      const t = {
        m, slot, state: 0, age: 0, life: C.life * (1 + tech() * CFG.defenseTech.life), x: sp.x, z: sp.z, px: sp.x, pz: sp.z, yaw, pyaw: yaw, tyaw: yaw, sp: 0, yawRate: 0,
        target: null, retarget: 0, cdC: 1, cdM: 0.6, kick: 0, stuckT: 0, dustT: 0, sfxT: 0, trkL: 0, trkR: 0, side: 1, mgN: 0, gy: c.map.height(sp.x, sp.z),
      };
      Tanks.list.push(t); Tanks.cd = C.cooldown;
      WZ.Audio.sfx('tank', 1); WZ.Fx.text(WZ.I18n.t('hud.tankOn'), J.rx, J.ry + 6.5, J.rz, 'good'); WZ.Fx.flash('good');
      return true;
    },

    relocate(t, sx, sz) {
      const c = Tanks.ctx, o = { x: 0, z: 0 }; let ok = false;
      for (let r = 4; r <= 12 && !ok; r += 4) ok = Tanks.freeSpot(sx, sz, r, o);
      if (!ok) return false;
      c.particles.poof(t.x, t.gy + 1, t.z, 6, 1.8); t.x = t.px = o.x; t.z = t.pz = o.z; t.sp = 0; t.stuckT = 0; t.gy = c.map.height(o.x, o.z);
      c.particles.poof(t.x, t.gy + 1, t.z, 8, 2); c.particles.dust(t.x, t.gy, t.z, 6); return true;
    },

    update(dt) {
      const c = Tanks.ctx; if (!c) return;
      if (Tanks.cd > 0) Tanks.cd -= dt; if (Tanks.noteT > 0) Tanks.noteT -= dt;
      if (!Tanks.list.length) return;
      const J = c.jeep, N = c.nana, E = c.enemies, P = c.particles, cy = WZ.Cam.yaw, fx = Math.sin(cy), fz = Math.cos(cy), rx = -Math.cos(cy), rz = Math.sin(cy);
      const dm = 1 + tech() * CFG.defenseTech.dmg, rm = 1 + tech() * CFG.defenseTech.rate;
      const nanaOut = N.out && !N.isKO && N.state !== 'BOARDING', pr = nanaOut ? N : J;
      for (let k = Tanks.list.length - 1; k >= 0; k--) {
        const t = Tanks.list[k]; t.age += dt; t.px = t.x; t.pz = t.z; t.pyaw = t.yaw;
        if (t.age >= t.life) { P.poof(t.x, t.gy + 1.2, t.z, 12, 2.2); P.dust(t.x, t.gy, t.z, 6); WZ.Audio.sfx('thud'); c.scene.remove(t.m.root); t.m.dispose(); Tanks.list.splice(k, 1); continue; }
        t.gy = c.map.height(t.x, t.z);

        // ---- threat near the protected target? then stand between them (cover); else escort at a screen-side slot
        const lap = Math.floor(t.slot / C.slots.length), sl = C.slots[t.slot % C.slots.length], sc = 1 + lap * 0.45;
        const threat = (J.alive || nanaOut) ? E.nearest(pr.x, pr.z, C.guard) : null;
        let sx = pr.x + (pr === J ? J.vx * 0.3 : 0) + rx * sl[0] * sc + fx * sl[1] * sc, sz = pr.z + (pr === J ? J.vz * 0.3 : 0) + rz * sl[0] * sc + fz * sl[1] * sc;
        if (threat) {
          const dx = threat.x - pr.x, dz = threat.z - pr.z, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl;
          const cd = Math.min(C.cover + lap * 2.5 + (threat.giant ? 6 : 0), dl * 0.7 + 2), lat = (t.slot % 2 ? 1 : -1) * 3.2 * (1 + lap * 0.5);
          sx = pr.x + ux * cd - uz * lat; sz = pr.z + uz * cd + ux * lat;
        }

        // ---- drive (hull turns, tank moves along its heading)
        const dx = sx - t.x, dz = sz - t.z, dist = Math.hypot(dx, dz);
        if (t.state === 0 && dist < C.cover + 3) t.state = 1;
        const want = dist > 1.6 ? Math.atan2(dx, dz) : t.yaw, err = U.angDiff(t.yaw, want), step = U.clamp(err, -C.hullTurn * dt, C.hullTurn * dt);
        t.yaw += step; t.yawRate = U.damp(t.yawRate, step / dt, 8, dt);
        const align = Math.max(0, Math.cos(err)), maxSp = C.speed * (t.state === 0 ? 1.5 : dist > 22 ? 1.45 : 1);
        const wantSp = dist < 1.6 ? 0 : Math.min(maxSp, dist * 1.7) * align * align;
        t.sp = U.damp(t.sp, wantSp, 3.2, dt);
        const hx = Math.sin(t.yaw), hz = Math.cos(t.yaw);
        tmp.x = t.x + hx * t.sp * dt; tmp.z = t.z + hz * t.sp * dt;
        const ox = tmp.x, oz = tmp.z, hit = c.col.resolve(tmp, C.radius);
        t.x = tmp.x; t.z = tmp.z;
        if (hit && wantSp > 3 && Math.hypot(tmp.x - ox, tmp.z - oz) > 0.002) t.stuckT += dt; else t.stuckT = Math.max(0, t.stuckT - dt * 2);
        // never sit on the vehicle, never stack with another tank
        const dj = Math.hypot(t.x - J.x, t.z - J.z), minD = J.P.radius + C.radius + 0.5;
        if (dj < minD && dj > 1e-3) { t.x += (t.x - J.x) / dj * (minD - dj); t.z += (t.z - J.z) / dj * (minD - dj); }
        for (let q = k + 1; q < Tanks.list.length; q++) {
          const o = Tanks.list[q], d = Math.hypot(t.x - o.x, t.z - o.z), md = C.radius * 2 + 0.2;
          if (d < md && d > 1e-3) { const p = (md - d) * 0.5, ux = (t.x - o.x) / d, uz = (t.z - o.z) / d; t.x += ux * p; t.z += uz * p; o.x -= ux * p; o.z -= uz * p; }
        }
        // stuck behind scenery or left far behind (the jeep boosted away): pop next to the station
        if (t.stuckT > 1.8 || dist > 95) Tanks.relocate(t, sx, sz);

        // ---- tracks, dust, engine
        t.trkL += (t.sp - t.yawRate * 1.5) * dt; t.trkR += (t.sp + t.yawRate * 1.5) * dt;
        t.dustT -= dt;
        if (t.sp > 3 && t.dustT <= 0) {
          t.dustT = Math.max(0.05, 0.2 - t.sp * 0.008);
          for (let s = -1; s <= 1; s += 2) P.emit(0, t.x - hx * 2.2 + hz * 1.5 * s, t.gy + 0.4, t.z - hz * 2.2 - hx * 1.5 * s, -hx * t.sp * 0.1 + (Math.random() - 0.5), 0.8 + Math.random(), -hz * t.sp * 0.1 + (Math.random() - 0.5), 0.6 + Math.random() * 0.4, 1.0, 2.9, 0.72, 0.6, 0.4, 0.45, 0, 0, 1.5);
        }
        t.sfxT -= dt; if (t.sfxT <= 0) { t.sfxT = 0.32; WZ.Audio.sfx('tank', 0.35 + Math.min(0.4, t.sp / 40)); }

        // ---- run over small enemies
        if (t.sp > C.ramMin) {
          E.hash.query(t.x + hx * 1.4, t.z + hz * 1.4, 3.4, E.q);
          for (const e of E.q.slice()) {
            if (!e.active || e.state === 2) continue;
            const ex = e.x - (t.x + hx * 1.2), ez = e.z - (t.z + hz * 1.2); if (Math.hypot(ex, ez) > 2.6) continue;
            E.ko(e, ex, ez, 9, 'tank'); Tanks.kills++; P.sparks(e.x, t.gy + 1.4, e.z, 5, 1, 0.9, 0.5); WZ.Audio.sfx('ram', 0.6);
          }
        }

        // ---- gunnery: prefer what threatens the protected target, otherwise the closest thing in range
        t.retarget -= dt;
        if (t.retarget <= 0 || !t.target || !t.target.active || t.target.state === 2) {
          t.retarget = 0.18; let tg = threat; if (!tg || Math.hypot(tg.x - t.x, tg.z - t.z) > C.range) tg = E.nearest(t.x, t.z, C.range); t.target = tg;
        }
        const tg = t.target;
        const aimYaw = tg ? Math.atan2(tg.x - t.x, tg.z - t.z) : (t.sp > 2 ? t.yaw : t.tyaw), aerr = U.angDiff(t.tyaw, aimYaw);
        t.tyaw += U.clamp(aerr, -C.turretTurn * dt, C.turretTurn * dt);
        const aerr2 = Math.abs(U.angDiff(t.tyaw, aimYaw)), ts = Math.sin(t.tyaw), tc = Math.cos(t.tyaw);
        t.cdC -= dt; t.cdM -= dt; t.kick = Math.max(0, t.kick - dt * 6);
        if (!tg || J.alive === false && !nanaOut) continue;
        const td = Math.hypot(tg.x - t.x, tg.z - t.z), ty = c.map.height(tg.x, tg.z) + (tg.giant ? 3.4 : 1.6);
        if (aerr2 < C.aim && td <= C.range && t.cdC <= 0) {                    // cannon: splash shell + explosion
          t.cdC = 1 / (C.rate * rm); if (t.cdC < 0) t.cdC = 0.1; t.kick = 1;
          const mx = t.x + ts * 3.25 * SC + tc * 0.0, mz = t.z + tc * 3.25 * SC, my = t.gy + 2.05 * SC;
          WZ.Gun._tracer(mx, my, mz, tg.x, ty, tg.z); P.muzzle(mx, my, mz); P.poof(mx, my, mz, 4, 1); P.sparks(mx, my, mz, 6, 1, 0.8, 0.3);
          WZ.Audio.sfx('cannon', 0.8); if (Math.hypot(t.x - J.x, t.z - J.z) < 45) WZ.Fx.shake(0.1);
          WZ.Fire.shell(tg.x, ty - 0.6, tg.z);
          E.hash.query(tg.x, tg.z, C.splash, E.q);
          for (const e of E.q.slice()) {
            if (!e.active || e.state === 2) continue;
            const ex = e.x - tg.x, ez = e.z - tg.z, ed = Math.hypot(ex, ez); if (ed > C.splash) continue;
            const l = ed || 1, fall = 1 - 0.5 * ed / C.splash;
            if (E.damage(e, C.damage * dm * fall, ex / l * C.knock, ez / l * C.knock, 'tank')) Tanks.kills++;
          }
          if (WZ.Giants) WZ.Giants.splash(tg.x, tg.z, C.splash, C.damage * dm * 0.9, 'tank');
        }
        if (aerr2 < 0.35 && td <= C.mgRange && t.cdM <= 0) {                  // machine gun: rapid single-target fire
          t.cdM = 1 / (C.mgRate * rm); if (t.cdM < 0) t.cdM = 0.05; t.side = -t.side;
          const mx = t.x + ts * 3.1 * SC + tc * 0.38 * SC, mz = t.z + tc * 3.1 * SC - ts * 0.38 * SC, my = t.gy + 1.97 * SC, dl = td || 1;
          WZ.Gun._tracer(mx, my, mz, tg.x + (Math.random() - 0.5) * 0.7, ty, tg.z + (Math.random() - 0.5) * 0.7); P.muzzle(mx, my, mz);
          if (E.damage(tg, C.mgDamage * dm, (tg.x - t.x) / dl * C.mgKnock, (tg.z - t.z) / dl * C.mgKnock, 'tank')) Tanks.kills++;
          if ((t.mgN++ & 1) === 0) WZ.Audio.sfx('tshot', 0.45);
        }
      }
    },

    render(alpha, dt, tm) {
      const c = Tanks.ctx; if (!c || !Tanks.list.length) return; const hm = c.map.height;
      for (const t of Tanks.list) {
        const m = t.m, x = U.lerp(t.px, t.x, alpha), z = U.lerp(t.pz, t.z, alpha), yaw = t.pyaw + U.angDiff(t.pyaw, t.yaw) * alpha, gy = hm(x, z);
        const fx = Math.sin(yaw), fz = Math.cos(yaw), lx = Math.cos(yaw), lz = -Math.sin(yaw);
        const pitch = -Math.atan((hm(x + fx * 2.4, z + fz * 2.4) - hm(x - fx * 2.4, z - fz * 2.4)) / 4.8), roll = Math.atan((hm(x + lx * 1.6, z + lz * 1.6) - hm(x - lx * 1.6, z - lz * 1.6)) / 3.2);
        m.root.position.set(x, gy, z); m.root.rotation.set(0, yaw, 0);
        const sp01 = Math.min(1, t.sp / C.speed), left = t.life - t.age, k = left < 0.45 ? Math.max(0.02, left / 0.45) : 1;
        m.pivot.rotation.set(pitch + Math.sin(tm * 9 + t.slot) * 0.012 * sp01, 0, roll); m.pivot.position.y = Math.sin(tm * 14 + t.slot) * 0.025 * sp01;
        m.root.scale.setScalar(k);
        m.headG.rotation.y = t.tyaw - yaw; m.barG.position.z = 0.3 - 0.5 * t.kick;
        m.track(t.trkL, t.trkR);
        const low = left < 5, on = !low || ((tm * 6) % 1) < 0.55;
        m.lampMat.color.setHex(left > 14 ? 0x4cff6a : left > 5 ? 0xFFC83A : (on ? 0xFF3A22 : 0x3a0f0a));
      }
    },

    dispose() {
      const c = Tanks.ctx;
      for (const t of Tanks.list) { if (c) c.scene.remove(t.m.root); t.m.dispose(); }
      Tanks.list = []; Tanks.ctx = null;
    },
  };
  WZ.Tanks = Tanks;
})(window.WZ = window.WZ || {});
