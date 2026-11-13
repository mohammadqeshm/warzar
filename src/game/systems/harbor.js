/* WZ.Harbor — the SUNKEN HARBOR mechanics (no-op on every other map):
 *  - SEA FALLS: map.inHole() = a collapsed pier section. The vehicle that drives into one splashes into the water (loses CFG.harbor.fall.pct of its MAX armor, is put back on
 *    the deck next to the hole, brief grace); Nana loses HP and is put back; enemies that fall in are knocked out. The sea itself is walled off (see world/gen_harbor.js).
 *  - TOWER CRANES: every map.cranes[i] with a slot lifts the container resting on its home pad, swings it over a yard lane and lowers it => the lane is BLOCKED (dynamic
 *    collider in WZ.Collision) for a while, then it goes back. Telegraph: the beacon flashes, a hatched red rectangle marks the slot from the moment the load starts to swing,
 *    and the load never touches down on the vehicle / Nana / a guardian - it hovers until the spot is clear. Enemies under it are crushed.
 *  - HARBOR MECH (guardian AI, called from entities/giant.js for g.mech): CANNON (laser lane telegraph, flat shell stopped by containers), MISSILES (arc over the containers
 *    onto red rings), COVER (walks behind a container, crouches, flushes the player out with missiles; direct fire only does CFG.mech.cover.armor of its damage there) and STOMP.
 * Numbers: CFG.harbor, CFG.mech, CFG.maps.harbor. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, U = WZ.U, HB = CFG.harbor, FC = HB.fall, CC = HB.crane;
  const DIRECT = { gun: 1, turret: 1, heli: 1, pan: 1, tank: 1 };
  const NR = 26, NM = 14, NS = 5;
  const rnd = (a, b) => a + (b - a) * Math.random();

  function hatchTex() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.clearRect(0, 0, 128, 128); g.fillStyle = 'rgba(255,60,40,0.9)';
    for (let i = -128; i < 256; i += 32) { g.beginPath(); g.moveTo(i, 128); g.lineTo(i + 16, 128); g.lineTo(i + 144, 0); g.lineTo(i + 128, 0); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 10; g.strokeRect(0, 0, 128, 128);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }

  const Hb = {
    on: false, ctx: null, mission: null, t: 0, tm: 1, imm: 0, nImm: 0, hintKey: '', hintT: 0, hintCd: 0, beepT: 0, nearHole: 0,
    cranes: [], rings: [], shells: [], missiles: [], lasers: [], geo: {}, mats: {}, hatch: null, tmpV: null, aiming: 0, pods: 0, cover: 0, craneWarn: 0, craneBlock: 0, textCd: 0,

    init(ctx, mission, seed) {
      Hb.dispose();
      Hb.ctx = ctx; Hb.on = !!(ctx.map && ctx.map.theme === 'harbor'); if (!Hb.on) return;
      Hb.mission = mission; Hb.t = 0; Hb.tm = mission.tutorial ? HB.tutorialMul : 1; Hb.imm = Hb.nImm = 0; Hb.hintKey = ''; Hb.hintT = 0; Hb.hintCd = 0; Hb.nearHole = 0; Hb.textCd = 0;
      const rng = WZ.RNG.create(seed), map = ctx.map, scene = ctx.scene, H = map.height;
      // ---- shared geometry / materials for the telegraphs
      const g = Hb.geo, m = Hb.mats;
      g.ring = new T.RingGeometry(0.86, 1, 48, 1).rotateX(-Math.PI / 2); g.disc = new T.CircleGeometry(1, 40).rotateX(-Math.PI / 2); g.plane = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      g.body = new T.CylinderGeometry(0.26, 0.26, 2.4, 7).rotateX(Math.PI / 2); g.nose = new T.ConeGeometry(0.34, 0.8, 7).rotateX(Math.PI / 2).translate(0, 0, 1.55); g.fin = new T.BoxGeometry(0.9, 0.08, 0.5).translate(0, 0, -1.0); g.ball = new T.SphereGeometry(0.62, 10, 8); g.bar = new T.BoxGeometry(1, 1, 1);
      m.body = new T.MeshLambertMaterial({ color: 0xDADDD8 }); m.nose = new T.MeshLambertMaterial({ color: 0xD43A22 }); m.ball = new T.MeshBasicMaterial({ color: 0xFFB040, fog: false });
      Hb.hatch = hatchTex();
      for (let i = 0; i < NR; i++) {
        const rm = new T.MeshBasicMaterial({ color: 0xFF3A22, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
        const dm = new T.MeshBasicMaterial({ color: 0xFF2A18, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
        const grp = new T.Group(), ring = new T.Mesh(g.ring, rm), disc = new T.Mesh(g.disc, dm); ring.renderOrder = disc.renderOrder = 16; ring.frustumCulled = disc.frustumCulled = false; grp.add(disc, ring); grp.visible = false; scene.add(grp);
        Hb.rings.push({ on: false, grp, rm, dm, x: 0, z: 0, R: 1, age: 0, life: 1, a: 1 });
      }
      for (let i = 0; i < NM; i++) {
        const grp = new T.Group(); grp.add(new T.Mesh(g.body, m.body), new T.Mesh(g.nose, m.nose), new T.Mesh(g.fin, m.nose)); grp.visible = false; scene.add(grp);
        Hb.missiles.push({ on: false, grp, x0: 0, z0: 0, y0: 0, x1: 0, z1: 0, t: 0, T: 1, apex: 20, R: 4, dmg: 0, ndmg: 0, tm: 1, trail: 0, ring: -1 });
      }
      for (let i = 0; i < NS; i++) { const mesh = new T.Mesh(g.ball, m.ball); mesh.visible = false; mesh.frustumCulled = false; scene.add(mesh); Hb.shells.push({ on: false, mesh, x: 0, y: 0, z: 0, dx: 0, dz: 0, sp: 50, life: 0, R: 3, dmg: 0, ndmg: 0, tm: 1, trail: 0 }); }
      // ---- cranes: rigs, home / slot colliders
      for (const c of map.cranes) {
        const rig = WZ.Harbo.crane(map, c, scene, WZ.Harbo.pick(rng, WZ.Harbo.CONT)), gy = H(c.hx, c.hz);
        const home = { x: c.hx, z: c.hz, hw: c.hhw, hd: c.hhd, on: true }; ctx.col.dyn.push(home);
        const k = { c, rig, st: 'idle', t: mission.tutorial ? CC.tutorialDelay : U.lerp(CC.firstDelay[0], CC.firstDelay[1], rng.next()), home, slotC: null, gy, y: gy, az0: 0, r0: 0, az1: 0, r1: 0, y0: 0, yaw0: c.longZ ? 0 : Math.PI / 2, yaw1: 0, u: 0, T: 1, from: 'home', hold: 0, wait: 0, viz: null, rng, warn: false };
        if (c.slot) {
          const s = c.slot; k.slotC = { x: s.x, z: s.z, hw: s.hw, hd: s.hd, on: false }; ctx.col.dyn.push(k.slotC); k.yaw1 = s.axis === 'z' ? Math.PI / 2 : 0;
          const tx = Hb.hatch.clone(); tx.needsUpdate = true; tx.repeat.set(Math.max(1, s.hw * 2 / 3), Math.max(1, s.hd * 2 / 3));
          const vm = new T.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }), viz = new T.Mesh(g.plane, vm);
          viz.scale.set(s.hw * 2, 1, s.hd * 2); viz.position.set(s.x, H(s.x, s.z) + 0.4, s.z); viz.visible = false; viz.renderOrder = 15; viz.frustumCulled = false; scene.add(viz); k.viz = { mesh: viz, mat: vm, tex: tx };
        }
        Hb._place(k, c.hx, c.hz, gy, k.yaw0);
        Hb.cranes.push(k);
      }
    },

    // ================================================================== SEA FALLS
    _safe(h, west, z0) {
      const c = Hb.ctx, map = c.map, p = h.pier, zs = h.full ? [p.zc] : (h.low ? [(h.z1 + p.z1) / 2, (h.z1 + p.z1) / 2 + 2] : [(p.z0 + h.z0) / 2, (p.z0 + h.z0) / 2 - 2]);
      for (const dx of [3.8, 6.5, 9.5]) for (const z of zs) { const x = west ? h.x0 - dx : h.x1 + dx; if (c.col.free(x, z, 2.2) && !map.navBlock(x, z)) return { x, z }; }
      return { x: h.x0 - 4, z: z0 };
    },
    _splash(x, z, big) {
      const c = Hb.ctx, P = c.particles, y = c.map.seaLevel;
      P.poof(x, y + 0.4, z, big ? 12 : 6, big ? 3 : 1.6);
      for (let i = 0, n = big ? 34 : 12; i < n; i++) { const a = Math.random() * 6.283, s = Math.random() * 3; P.emit(0, x + Math.cos(a) * s * 0.4, y + 0.3, z + Math.sin(a) * s * 0.4, Math.cos(a) * s, (big ? 9 : 5) + Math.random() * (big ? 8 : 4), Math.sin(a) * s, 0.9 + Math.random() * 0.5, 0.7, 1.9, 0.82, 0.94, 1, 0.85, 0, -14, 0.5); }
    },
    _fallJeep(h) {
      const c = Hb.ctx, J = c.jeep, mid = (h.x0 + h.x1) / 2, cz = (h.z0 + h.z1) / 2, west = h.full || J.x < mid;
      const dmg = Math.max(1, Math.round(J.maxHp * FC.pct * Hb.tm)); if (dmg >= J.hp) J.deathCause = 'sea';
      Hb._splash(J.x, J.z, true); WZ.Audio.sfx('crash'); WZ.Audio.sfx('boom', 0.5); WZ.Fx.shake(0.8); WZ.Fx.flash('hurt');
      WZ.Fx.text(WZ.I18n.t('hud.splash') + ' -' + dmg, J.rx, J.ry + 5, J.rz, 'warn');
      J.hurt(dmg);
      if (!J.alive) { J.inPit = { x: J.x, z: J.z }; J.pitSink = 0; J.vx = J.vz = 0; return; }
      const s = Hb._safe(h, west, cz); J.x = s.x; J.z = s.z; J.px = J.x; J.pz = J.z; J.vx = J.vz = 0; J.speed = 0; J.hop = 0.5; J.stuckT = 0;
      if (west === (J.x < mid)) J.h = Math.atan2(west ? -1 : 1, 0);
      Hb.imm = FC.immune; Hb._splash(s.x, s.z, false);
    },
    _fallNana(h) {
      const c = Hb.ctx, N = c.nana, mid = (h.x0 + h.x1) / 2, west = h.full || N.x < mid;
      Hb._splash(N.x, N.z, false); WZ.Audio.sfx('crash', 0.6);
      N.iframes = 0; N.hurt(FC.nana * Hb.tm); WZ.Fx.text(WZ.I18n.t('hud.splash'), N.rx, N.ry + 4, N.rz, 'warn');
      if (N.isKO) return;
      const s = Hb._safe(h, west, (h.z0 + h.z1) / 2); N.x = s.x; N.z = s.z; N.px = N.x; N.pz = N.z; N.navT = 0; N.path = null; N.stuckT = 0; Hb.nImm = 1.2;
    },
    _falls(dt) {
      const c = Hb.ctx, J = c.jeep, N = c.nana, E = c.enemies, map = c.map, Qx = map.quayX;
      Hb.imm = Math.max(0, Hb.imm - dt); Hb.nImm = Math.max(0, Hb.nImm - dt);
      if (J.alive && !J.captive && Hb.imm <= 0 && J.x > Qx - 2) { const h = map.inHole(J.x, J.z, FC.margin); if (h) Hb._fallJeep(h); }
      if (N.out && !N.isKO && N.state !== 'BOARDING' && Hb.nImm <= 0 && N.x > Qx - 2) { const h = map.inHole(N.x, N.z, 0.3); if (h) Hb._fallNana(h); }
      if (E && E.list) for (let i = 0; i < E.list.length; i++) { const e = E.list[i]; if (!e.active || e.state === 2 || e.x < Qx - 2) continue; if (map.inHole(e.x, e.z, 0.2)) { E.ko(e, 0, 0, 0, 'sea'); Hb._splash(e.x, e.z, false); } }
      for (const g of WZ.Giants.list) { if (!g.active || !g.mech || g.x < Qx - 2) continue; if (map.inHole(g.x, g.z, 0.5)) { const f = c.map.nav.jeep.nearestFree(g.hx, g.hz, 8); g.x = f ? f.x : g.hx; g.z = f ? f.z : g.hz; g.px = g.x; g.pz = g.z; g.path = null; g.navT = 0; } }
      // hint: a broken deck close ahead
      if (J.alive && J.x > Qx - 6 && J.speed > 2) { const hh = map.waterDist ? map.waterDist(J.x, J.z) : 99; if (hh < FC.hint) Hb.nearHole = 0.4; }
      if (Hb.nearHole > 0) Hb.nearHole -= dt;
    },

    // ================================================================== TOWER CRANES
    _place(k, x, z, y, yaw) { k.pos = { x, z, y, yaw }; k.rig.setLoad(x, y, z, yaw); },
    _polar(k, x, z) { return { az: Math.atan2(x - k.c.x, z - k.c.z), r: Math.hypot(x - k.c.x, z - k.c.z) }; },
    _rectClear(k, rc, extra) {
      const c = Hb.ctx, J = c.jeep, N = c.nana, m = CC.clear + (extra || 0), dist = (x, z) => Math.hypot(Math.max(Math.abs(x - rc.x) - rc.hw, 0), Math.max(Math.abs(z - rc.z) - rc.hd, 0));
      if (J.alive && dist(J.x, J.z) < m + 1.4) return false;
      if (N.out && !N.isKO && dist(N.x, N.z) < m) return false;
      for (const g of WZ.Giants.list) if (g.active && dist(g.x, g.z) < m + g.radius) return false;
      return true;
    },
    _crush(rc) {
      const c = Hb.ctx, E = c.enemies, P = c.particles; let n = 0;
      if (E && E.list) for (let i = 0; i < E.list.length; i++) { const e = E.list[i]; if (!e.active || e.state === 2) continue; if (Math.abs(e.x - rc.x) < rc.hw + 0.6 && Math.abs(e.z - rc.z) < rc.hd + 0.6) { E.ko(e, 0, 0, 0, 'crane'); P.stars(e.x, 2.2, e.z, 3); n++; } }
      const y = c.map.height(rc.x, rc.z); P.dust(rc.x, y, rc.z, 10); P.poof(rc.x - rc.hw * 0.6, y + 0.5, rc.z, 4, 1.8); P.poof(rc.x + rc.hw * 0.6, y + 0.5, rc.z, 4, 1.8);
      const dj = Math.hypot(c.jeep.x - rc.x, c.jeep.z - rc.z); if (dj < 60) { WZ.Fx.shake(Math.max(0.12, 0.4 - dj * 0.005)); } WZ.Audio.sfx('crash', dj < 60 ? 1 : 0.4);
      return n;
    },
    _carry(k, from, to) {   // set up a polar move of the load between two world points at carry altitude
      const a = Hb._polar(k, from.x, from.z), b = Hb._polar(k, to.x, to.z); let da = U.angDiff(a.az, b.az);
      k.az0 = a.az; k.daz = da; k.r0 = a.r; k.r1 = b.r; k.yaw0 = from.yaw; k.yawD = U.angDiff(from.yaw, to.yaw);
      if (Math.abs(k.yawD) > Math.PI / 2) k.yawD -= Math.sign(k.yawD) * Math.PI;
      k.T = Math.max(CC.carryMin, Math.abs(da) / CC.slew, Math.abs(b.r - a.r) / CC.trolley); k.u = 0;
    },
    _cranes(dt, playing) {
      const c = Hb.ctx, map = c.map, H = map.height, mi = Hb.mission.index, E = U.smooth;
      Hb.craneWarn = Hb.craneBlock = 0;
      for (const k of Hb.cranes) {
        const s = k.c.slot, home = { x: k.c.hx, z: k.c.hz, yaw: k.yaw0 }, slot = s ? { x: s.x, z: s.z, yaw: k.yaw1 } : null, gy = k.gy, sy = s ? H(s.x, s.z) : 0, alt = CC.carryAlt;
        k.rig.setAlert(k.st === 'idle' || k.st === 'hold' ? 0 : 1);
        if (k.st === 'idle') {
          if (!s || !playing) continue;
          k.t -= dt; if (k.t <= 0) { k.st = 'pick'; k.t = 0; WZ.Audio.sfx('siren', 0.5); }
        } else if (k.st === 'pick') {
          k.t += dt; if (k.t >= CC.pickT) { k.st = 'lift'; k.t = 0; k.home.on = false; WZ.Audio.sfx('deploy', 0.4); }
        } else if (k.st === 'lift') {
          k.t += dt; const u = Math.min(1, k.t / CC.liftT); Hb._place(k, home.x, home.z, U.lerp(gy, alt, E(0, 1, u)), home.yaw);
          if (u >= 1) { k.st = 'carry'; Hb._carry(k, home, slot); k.warn = true; WZ.Audio.sfx('siren', 0.7); }
        } else if (k.st === 'carry' || k.st === 'back') {
          k.u += dt / k.T; const u = Math.min(1, k.u), e = E(0, 1, u), az = k.az0 + k.daz * e, r = U.lerp(k.r0, k.r1, e);
          Hb._place(k, k.c.x + Math.sin(az) * r, k.c.z + Math.cos(az) * r, alt, k.yaw0 + k.yawD * e);
          if (u >= 1) { k.st = k.st === 'carry' ? 'lower' : 'set'; k.t = 0; }
        } else if (k.st === 'lower' || k.st === 'set') {
          const tgt = k.st === 'lower' ? slot : home, rc = k.st === 'lower' ? s : { x: home.x, z: home.z, hw: k.c.hhw, hd: k.c.hhd }, gnd = k.st === 'lower' ? sy : gy;
          const clear = Hb._rectClear(k, rc), cur = k.pos.y, hov = gnd + CC.hoverAlt, down = (alt - gnd) / CC.lowerT;
          let y = cur;
          if (cur > hov) y = cur - dt * down;                 // coming down to the hover height is always safe
          else if (clear) y = cur - dt * down;                // below it only when nobody is underneath
          else y = Math.min(cur + dt * 8, hov);               // somebody is under the load: it hangs (or backs up) at the hover height until the spot is clear
          Hb._place(k, tgt.x, tgt.z, Math.max(gnd, y), tgt.yaw);
          if (y <= gnd + 0.02) {
            Hb._place(k, tgt.x, tgt.z, gnd, tgt.yaw); Hb._crush(rc);
            if (k.st === 'lower') { k.st = 'hold'; k.slotC.on = true; k.warn = false; k.hold = U.lerp(CC.hold[0], CC.hold[1], k.rng.next()) * (Hb.mission.tutorial ? CC.tutorialHold / CC.hold[1] : 1); }
            else { k.st = 'idle'; k.home.on = true; k.t = Math.max(CC.gapMin, U.lerp(CC.gap[0], CC.gap[1], k.rng.next()) + CC.gapPerMission * mi) * (Hb.mission.tutorial ? 1.6 : 1); }
          }
        } else if (k.st === 'hold') {
          k.hold -= dt; if (k.hold <= 0) { k.st = 'raise'; k.t = 0; k.slotC.on = false; WZ.Audio.sfx('deploy', 0.4); }
        } else if (k.st === 'raise') {
          k.t += dt; const u = Math.min(1, k.t / CC.liftT); Hb._place(k, slot.x, slot.z, U.lerp(sy, alt, E(0, 1, u)), slot.yaw);
          if (u >= 1) { k.st = 'back'; Hb._carry(k, slot, home); }
        }
        // hints + warning beeps (only the cranes near the vehicle matter)
        if (s) {
          const d = Math.hypot(c.jeep.x - s.x, c.jeep.z - s.z);
          if (d < CC.hint) { if (k.st === 'carry' || k.st === 'lower' || k.st === 'pick' || k.st === 'lift') Hb.craneWarn = 1; else if (k.st === 'hold') Hb.craneBlock = 1; }
          if (k.warn && d < 80 && playing) { Hb.beepT -= dt; if (Hb.beepT <= 0) { Hb.beepT = 0.55; WZ.Audio.sfx('beep', 0.5); } }
        }
      }
    },

    // ================================================================== telegraphs / projectiles
    ring(x, z, R, life, a) {
      for (const r of Hb.rings) if (!r.on) { r.on = true; r.x = x; r.z = z; r.R = R; r.age = 0; r.life = life; r.a = a == null ? 1 : a; r.grp.visible = true; r.grp.position.set(x, Hb.ctx.map.height(x, z) + 0.45, z); r.grp.scale.set(R, 1, R); return r; }
      return null;
    },
    _laser(g, on, x0, z0, x1, z1, a) {
      let L = Hb.lasers[g.id];
      if (!L) { if (!on) return; const m = new T.MeshBasicMaterial({ color: 0xFF3020, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false }), mesh = new T.Mesh(Hb.geo.bar, m); mesh.frustumCulled = false; mesh.renderOrder = 14; Hb.ctx.scene.add(mesh); L = Hb.lasers[g.id] = { mesh, m, a: 0, want: 0 }; }
      L.want = on ? a : 0;
      if (on) { const dx = x1 - x0, dz = z1 - z0, len = Math.max(0.1, Math.hypot(dx, dz)); L.mesh.position.set((x0 + x1) / 2, Hb.ctx.map.height((x0 + x1) / 2, (z0 + z1) / 2) + 0.7, (z0 + z1) / 2); L.mesh.rotation.y = Math.atan2(dx, dz); L.mesh.scale.set(1.0, 0.12, len); }
    },
    lineClear(x0, z0, x1, z1) {
      const col = Hb.ctx.col, d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.ceil(d / 1.7));
      for (let i = 1; i < n; i++) { const t = i / n; if (!col.free(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, 0.35)) return false; }
      return true;
    },
    muzzle(g, out) {
      const a = g.h + (g.mk ? g.mk.yaw : (g.M ? g.M.aimY : 0)), cs = Math.cos(a), sn = Math.sin(a), lx = -3.25, lz = 10.4;
      out.x = g.x + lx * cs + lz * sn; out.z = g.z - lx * sn + lz * cs; out.y = (g.ry || 0) + 7.9; return out;
    },
    shoulder(g, out) { const a = g.h + (g.mk ? g.mk.yaw : 0), cs = Math.cos(a), sn = Math.sin(a), lx = 3.25, lz = 1.0; out.x = g.x + lx * cs + lz * sn; out.z = g.z - lx * sn + lz * cs; out.y = (g.ry || 0) + 9.6; return out; },

    blast(x, z, R, dmg, ndmg, cause, tm) {
      const c = Hb.ctx, J = c.jeep, N = c.nana, P = c.particles, y = c.map.height(x, z), mi = Hb.mission.index;
      WZ.Fire.explode(x, y + 0.4, z, { scale: R / 4.6 * 0.95, debris: 3, groundFire: 0, shake: 0.26, scorch: 0.75 });
      if (J.alive && Math.hypot(J.x - x, J.z - z) < R + 1.4) {
        const d = Math.max(1, Math.round(dmg * (1 + CFG.giant.dmgPerMission * mi) * J.P.enemyDamageMul * 2 * tm)); if (d >= J.hp) J.deathCause = cause;
        J.hurt(d); const dx = J.x - x, dz = J.z - z, l = Math.hypot(dx, dz) || 1; J.vx += dx / l * 9; J.vz += dz / l * 9; J.hop = 0.4;
        WZ.Fx.text('-' + d, J.rx, J.ry + 5, J.rz, 'warn'); WZ.Fx.flash('hurt'); WZ.Fx.shake(0.45); P.sparks(J.x, J.ry + 1.8, J.z, 10, 1, 0.7, 0.3);
      }
      if (N.out && !N.isKO && N.state !== 'BOARDING' && Math.hypot(N.x - x, N.z - z) < R + 0.8) { N.iframes = 0; N.hurt(ndmg * tm); WZ.Fx.shake(0.2); P.sparks(N.x, N.ry + 1.5, N.z, 6, 1, 0.7, 0.3); }
    },
    fireShell(g, tx, tz, who) {
      const C = CFG.mech.cannon, mz = Hb.muzzle(g, {}), c = Hb.ctx; let sx = mz.x, sz = mz.z;
      if (!c.col.free(sx, sz, 0.3)) { sx = g.x + Math.sin(g.h) * 3; sz = g.z + Math.cos(g.h) * 3; }
      const dx = tx - sx, dz = tz - sz, l = Math.hypot(dx, dz) || 1;
      for (const s of Hb.shells) if (!s.on) {
        s.on = true; s.x = sx; s.z = sz; s.y = mz.y; s.dx = dx / l; s.dz = dz / l; s.sp = C.speed; s.life = (l + 5) / C.speed; s.R = C.radius; s.dmg = C.damage; s.ndmg = C.nanaDamage; s.tm = g.tutMul; s.who = who; s.mesh.visible = true; s.mesh.position.set(sx, mz.y, sz);
        WZ.Audio.sfx('cannon', 0.9); c.particles.sparks(sx, mz.y, sz, 8, 1, 0.8, 0.3); c.particles.poof(sx, mz.y, sz, 4, 1.4); WZ.Fx.shake(0.12); return true;
      }
      return false;
    },
    fireMissile(g, tx, tz) {
      const MS = CFG.mech.missiles, sh = Hb.shoulder(g, {}), c = Hb.ctx;
      for (let i = 0; i < Hb.missiles.length; i++) {
        const m = Hb.missiles[i]; if (m.on) continue;
        m.on = true; m.x0 = sh.x; m.z0 = sh.z; m.y0 = sh.y; m.x1 = tx; m.z1 = tz; m.T = U.lerp(MS.flight[0], MS.flight[1], Math.random()); m.t = 0; m.apex = MS.apex * rnd(0.85, 1.15); m.R = MS.radius; m.dmg = MS.damage; m.ndmg = MS.nanaDamage; m.tm = g.tutMul; m.trail = 0;
        const r = Hb.ring(tx, tz, MS.radius, m.T + 0.05, 1); m.ring = r; m.grp.visible = true; m.grp.position.set(sh.x, sh.y, sh.z);
        WZ.Audio.sfx('mortar', 0.7); c.particles.poof(sh.x, sh.y + 0.6, sh.z, 3, 1.2); c.particles.sparks(sh.x, sh.y + 0.4, sh.z, 4, 1, 0.8, 0.4); return true;
      }
      return false;
    },
    _proj(dt) {
      const c = Hb.ctx, J = c.jeep, N = c.nana, P = c.particles, map = c.map, q = (CFG.quality.particles[WZ.Quality ? WZ.Quality.level : 2] || 1);
      for (const s of Hb.shells) {
        if (!s.on) continue;
        s.life -= dt; let hit = s.life <= 0;
        const st = s.sp * dt; s.x += s.dx * st; s.z += s.dz * st; s.mesh.position.set(s.x, s.y, s.z);
        if (!hit && !c.col.free(s.x, s.z, 0.3)) hit = true;
        if (!hit && J.alive && Math.hypot(J.x - s.x, J.z - s.z) < 2.0) hit = true;
        if (!hit && N.out && !N.isKO && N.state !== 'BOARDING' && Math.hypot(N.x - s.x, N.z - s.z) < 1.1) hit = true;
        s.trail -= dt; if (s.trail <= 0) { s.trail = 0.03 / q; P.emit(0, s.x, s.y, s.z, 0, 0.4, 0, 0.5, 0.5, 1.3, 0.8, 0.8, 0.8, 0.5, 0, 0, 1); P.emit(1, s.x, s.y, s.z, 0, 0, 0, 0.12, 0.9, 0.3, 1, 0.7, 0.3, 0.9, 0, 0, 0); }
        if (hit) { s.on = false; s.mesh.visible = false; Hb.blast(s.x - s.dx * 0.5, s.z - s.dz * 0.5, s.R, s.dmg, s.ndmg, 'shell', s.tm); WZ.Audio.sfx('blast', 0.6); }
      }
      for (const m of Hb.missiles) {
        if (!m.on) continue;
        m.t += dt; const u = Math.min(1, m.t / m.T), nu = Math.min(1, u + 0.04), gy = map.height(m.x1, m.z1);
        const px = U.lerp(m.x0, m.x1, u), pz = U.lerp(m.z0, m.z1, u), py = U.lerp(m.y0, gy, u * u * 0.6 + u * 0.4) + 4 * m.apex * u * (1 - u);
        const nx = U.lerp(m.x0, m.x1, nu), nz = U.lerp(m.z0, m.z1, nu), ny = U.lerp(m.y0, gy, nu * nu * 0.6 + nu * 0.4) + 4 * m.apex * nu * (1 - nu);
        m.grp.position.set(px, py, pz); m.grp.lookAt(nx, ny, nz);
        m.trail -= dt; if (m.trail <= 0) { m.trail = 0.035 / q; P.emit(0, px, py, pz, 0, 0.3, 0, 0.7, 0.6, 1.8, 0.9, 0.9, 0.9, 0.55, 0, 0, 1); P.emit(1, px, py, pz, 0, 0, 0, 0.14, 1.0, 0.3, 1, 0.55, 0.2, 0.9, 0, 0, 0); }
        if (u >= 1) { m.on = false; m.grp.visible = false; Hb.blast(m.x1, m.z1, m.R, m.dmg, m.ndmg, 'missile', m.tm); WZ.Audio.sfx('boom', 0.5); }
      }
      for (const r of Hb.rings) {
        if (!r.on) continue;
        r.age += dt; if (r.age >= r.life) { r.on = false; r.grp.visible = false; r.rm.opacity = r.dm.opacity = 0; }
      }
    },

    // ================================================================== HARBOR MECH (guardian AI)
    mechInit(g) {
      g.M = { st: 'adv', stT: 0, t: 0, aimY: 0, aimK: 0, podK: 0, crouch: 0, recoil: 0, muz: 0, tele: 0, cannonCd: 2.2 + Math.random() * 2, podCd: 3.5 + Math.random() * 3, stompCd: 0, coverCd: 4, hitAcc: 0, shots: 0, side: Math.random() < 0.5 ? 1 : -1, sideT: 0,
        losT: 0, los: true, ax: 0, az: 0, aimT: 0, locked: false, coverPt: null, coverT: 0, coverHide: false, ret: 'adv', launched: 0, volley: 0, vgap: 0, stHit: false, ring: null, stepN: 0, nearT: 0 };
      g.tutMul = g.tutMul || 1; g.stepN = 0;
    },
    mechReset(g) {
      const M = g.M; if (!M) return;
      M.st = 'adv'; M.aimK = 0; M.podK = 0; M.crouch = 0; M.tele = 0; M.locked = false; M.coverHide = false; M.stT = 0; Hb._laser(g, false);
    },
    /** called by WZ.Giants.damage: cover armor against direct fire */
    mechArmor(g, amt, cause) {
      const M = g.M; if (!M) return amt;
      let a = amt;
      if (M.coverHide && DIRECT[cause]) { a = amt * CFG.mech.cover.armor; if (Hb.textCd <= 0) { Hb.textCd = 1.4; WZ.Fx.text(WZ.I18n.t('hud.mech.armor'), g.x, (g.ry || 0) + 11.5, g.z, 'bonk'); } }
      M.hitAcc += a; return a;
    },
    _step(g) {     // footfall dust + a little shake when it is near
      const M = g.M, ph = Math.floor(g.walk / Math.PI);
      if (ph !== M.stepN) { M.stepN = ph; if (g.mv > 1.5) { const c = Hb.ctx, P = c.particles, foot = (ph & 1) ? 1.4 : -1.4, cs = Math.cos(g.h), sn = Math.sin(g.h); P.dust(g.x + cs * foot, c.map.height(g.x, g.z), g.z - sn * foot, 3); if (Math.hypot(c.jeep.x - g.x, c.jeep.z - g.z) < 40) WZ.Fx.shake(0.06); } }
    },
    _findCover(g, tx, tz) {
      const c = Hb.ctx, nav = c.map.nav.jeep, CV = CFG.mech.cover; let best = null, bs = 1e9; const a0 = Math.random() * 6.283;
      for (const r of [8, 13, 18, 24]) for (let k = 0; k < 16; k++) {
        const a = a0 + k / 16 * 6.283, px = g.x + Math.cos(a) * r, pz = g.z + Math.sin(a) * r;
        if (!c.col.free(px, pz, g.radius + 0.7) || nav.blockedAt(px, pz)) continue;
        const dt2 = Math.hypot(px - tx, pz - tz); if (dt2 < 13 || dt2 > 44) continue;
        if (Hb.lineClear(px, pz, tx, tz)) continue;
        const sc = r + Math.abs(dt2 - CV.range) * 0.25 + Math.random() * 2; if (sc < bs) { bs = sc; best = { x: px, z: pz }; }
      }
      return best;
    },
    /** one fixed step of a Harbor Mech that has a target. kind 1 = the vehicle, 2 = Nana. */
    mech(g, C, dt, kind, J, N, nanaOut, dj, dn) {
      const M = g.M, c = Hb.ctx, mc = CFG.mech, CN = mc.cannon, MS = mc.missiles, CV = mc.cover, SM = mc.stomp, tgt = kind === 2 ? N : J, tx = tgt.x, tz = tgt.z, d = kind === 2 ? dn : dj, tm = g.tutMul;
      const Gi = WZ.Giants, want = Math.atan2(tx - g.x, tz - g.z), vx = tgt.vx || 0, vz = tgt.vz || 0, enr = g.hp < g.maxHp * 0.5;
      M.t += dt; M.stT += dt; M.tele = 0;
      M.cannonCd -= dt; M.podCd -= dt; M.stompCd -= dt; M.coverCd -= dt; M.sideT -= dt; M.hitAcc = Math.max(0, M.hitAcc - dt * g.maxHp * 0.012);
      M.aimY = U.clamp(U.angDiff(g.h, want), -1.5, 1.5);
      M.losT -= dt; if (M.losT <= 0) { M.losT = 0.14; M.los = Hb.lineClear(g.x, g.z, tx, tz); }
      Hb._step(g);
      const spd = C.speed * g.spd * (kind === 2 ? 1.12 : 1), turnTo = (rate) => { g.h += U.clamp(U.angDiff(g.h, want), -rate * dt, rate * dt); };
      const rangeC = kind === 2 ? CN.nanaRange : CN.range, rangeM = kind === 2 ? MS.nanaRange : MS.range;
      const inCover = M.st === 'cover' || M.st === 'go' || (M.st === 'pods' && M.ret === 'cover');
      if (!inCover) M.crouch = Math.max(0, M.crouch - dt * 2.5);
      M.aimK = M.st === 'aim' ? 1 : Math.max(0, M.aimK - dt * 4); M.podK = M.st === 'pods' ? 1 : (M.st === 'cover' && M.podHold > 0 ? 1 : Math.max(0, M.podK - dt * 3));
      M.coverHide = (M.st === 'cover' || (M.st === 'pods' && M.ret === 'cover')) && M.crouch > 0.6 && !M.los;
      if (M.recoil > 0) M.recoil = Math.max(0, M.recoil - dt * 3.2);
      const startStomp = () => { M.st = 'stomp'; M.stT = 0; M.stHit = false; WZ.Audio.sfx('swish'); };

      if (M.st === 'adv') {
        if (d < SM.reach && M.stompCd <= 0) { startStomp(); return; }
        if (M.los && M.cannonCd <= 0 && d >= CN.minRange && d <= rangeC && Math.abs(U.angDiff(g.h, want)) < 1.1) { M.st = 'aim'; M.stT = 0; M.locked = false; M.ax = tx; M.az = tz; WZ.Audio.sfx('roar', 0.6); WZ.Fx.text('!', g.x, (g.ry || 0) + C.height + 3, g.z, 'warn'); return; }
        if (M.podCd <= 0 && d >= MS.minRange && d <= rangeM) { M.st = 'pods'; M.stT = 0; M.launched = 0; M.ret = 'adv'; M.vgap = 0; WZ.Audio.sfx('roar', 0.5); WZ.Fx.text('!', g.x, (g.ry || 0) + C.height + 3, g.z, 'warn'); return; }
        if (M.coverCd <= 0 && (M.hitAcc >= CV.hit * g.maxHp || M.shots >= CV.shots) && d > 12) {
          const p = Hb._findCover(g, tx, tz);
          if (p) { M.coverPt = p; M.st = 'go'; M.stT = 0; g.path = null; g.navT = 0; WZ.Fx.text(WZ.I18n.t('hud.mech.coverGo'), g.x, (g.ry || 0) + C.height + 3, g.z, 'warn'); return; }
          M.coverCd = 3;
        }
        // move: approach through the lanes when it has no line of sight / is far; back off when too close; otherwise strafe slowly
        if (!M.los || d > 27) Gi._goTo(g, tx, tz, dt, spd);
        else if (d < 11) { turnTo(2.2); g.x -= Math.sin(want) * spd * 0.7 * dt; g.z -= Math.cos(want) * spd * 0.7 * dt; c.col.resolve(g, g.radius); }
        else { turnTo(2.2); if (M.sideT <= 0) { M.sideT = 1.8 + Math.random() * 2.2; M.side = -M.side; } const a = want + Math.PI / 2 * M.side; g.x += Math.sin(a) * spd * 0.4 * dt; g.z += Math.cos(a) * spd * 0.4 * dt; c.col.resolve(g, g.radius); }
        return;
      }
      if (M.st === 'aim') {
        turnTo(CN.turn); M.tele = 0.25 + 0.45 * Math.min(1, M.stT / CN.aim) + 0.12 * Math.sin(M.stT * 30);
        const mz = Hb.muzzle(g, {});
        if (!M.locked) {
          const T0 = d / CN.speed + 0.3, lead = CN.lead * T0; M.ax = U.lerp(M.ax, tx + vx * lead, Math.min(1, dt * 9)); M.az = U.lerp(M.az, tz + vz * lead, Math.min(1, dt * 9));
          if (M.stT >= CN.aim - CN.lock) { M.locked = true; WZ.Audio.sfx('beep', 0.6); }
        }
        // laser lane toward the aim point, extended a little past it
        const dx = M.ax - mz.x, dz = M.az - mz.z, l = Math.hypot(dx, dz) || 1, ext = Math.min(l + 5, rangeC + 8);
        Hb._laser(g, true, mz.x, mz.z, mz.x + dx / l * ext, mz.z + dz / l * ext, M.locked ? 1 : 0.55);
        Hb.ring(M.ax, M.az, CN.radius * 0.9, dt * 2.5, M.locked ? 1 : 0.5);
        if (!M.los && M.stT > 0.5) { M.st = 'adv'; M.cannonCd = 0.9; Hb._laser(g, false); return; }          // the target ducked behind a container
        if (M.stT >= CN.aim) {
          Hb.fireShell(g, M.ax, M.az, kind); M.recoil = 1; M.muz = 1; M.shots++; Hb._laser(g, false); M.st = 'adv'; M.stT = 0;
          M.cannonCd = CN.cooldown * (0.9 + Math.random() * 0.3) * (enr ? 0.75 : 1) * (tm < 1 ? 1.6 : 1);
        }
        return;
      }
      if (M.st === 'pods') {
        turnTo(2.4); M.tele = 0.2 + 0.4 * Math.min(1, M.stT / MS.windup);
        if (M.stT < MS.windup) return;
        const n = (enr ? MS.salvoEnrage : MS.salvo) - (M.ret === 'cover' ? 1 : 0);
        M.vgap -= dt;
        if (M.launched < n) {
          if (M.vgap <= 0) {
            M.vgap = MS.gap; const T0 = 1.7, lead = 0.8 * T0; let ex = tx + vx * lead, ez = tz + vz * lead;
            if (M.launched > 0) { const a = Math.random() * 6.283, r = MS.spread * (0.45 + Math.random() * 0.75); ex += Math.cos(a) * r; ez += Math.sin(a) * r; }
            const lim = c.map.half - 10; ex = U.clamp(ex, -lim, lim); ez = U.clamp(ez, -lim, lim);
            Hb.fireMissile(g, ex, ez); M.launched++; M.recoil = Math.max(M.recoil, 0.2);
          }
          return;
        }
        if (M.vgap > -0.45) return;
        M.podCd = MS.cooldown * (0.9 + Math.random() * 0.25) * (enr ? 0.8 : 1) * (tm < 1 ? 1.6 : 1); M.st = M.ret === 'cover' ? 'cover' : 'adv'; M.stT = 0; M.podHold = 0; M.nextMis = CV.missileEvery;
        return;
      }
      if (M.st === 'go') {
        const p = M.coverPt; M.crouch = Math.min(1, M.crouch + dt * 0.8 * (Math.hypot(p.x - g.x, p.z - g.z) < 6 ? 2 : 0.3)); M.crouch = Math.min(M.crouch, 0.4);
        Gi._goTo(g, p.x, p.z, dt, spd * CV.speedMul);
        if (Math.hypot(p.x - g.x, p.z - g.z) < 2.2 || M.stT > 5) { M.st = 'cover'; M.stT = 0; M.coverT = 0; M.nextMis = CV.firstMissile; M.podHold = 0; M.ret = 'cover'; WZ.Audio.sfx('rumble', 0.4); }
        return;
      }
      if (M.st === 'cover') {
        turnTo(2.0); M.crouch = Math.min(1, M.crouch + dt * 3); M.coverT += dt; M.nextMis -= dt; M.podHold = Math.max(0, (M.podHold || 0) - dt);
        if (d < SM.reach && M.stompCd <= 0) { M.crouch = 0; startStomp(); return; }
        if (M.nextMis <= 0 && M.crouch > 0.7) { M.st = 'pods'; M.stT = 0; M.launched = 0; M.ret = 'cover'; M.vgap = 0; return; }
        // seen again (the player flanked it) or the time is up: stand up and fire
        if (M.los && M.coverT > 0.9 || M.coverT >= CV.time) { M.st = 'adv'; M.stT = 0; M.coverCd = CV.cooldown; M.hitAcc = 0; M.shots = 0; M.cannonCd = Math.min(M.cannonCd, 0.5); M.podCd = Math.max(M.podCd, 2.5); M.coverHide = false; }
        return;
      }
      if (M.st === 'stomp') {
        turnTo(2.6); M.tele = 0.3 + 0.4 * Math.min(1, M.stT / SM.windup) + 0.15 * Math.sin(M.stT * 30);
        if (M.stT < SM.windup) Hb.ring(g.x + Math.sin(g.h) * 1.5, g.z + Math.cos(g.h) * 1.5, SM.radius, dt * 2.5, 0.4 + 0.6 * M.stT / SM.windup);
        else if (!M.stHit) {
          M.stHit = true; const P = c.particles, y = c.map.height(g.x, g.z), sx = g.x + Math.sin(g.h) * 1.5, sz = g.z + Math.cos(g.h) * 1.5;
          P.dust(sx, y, sz, 12); P.poof(sx, y + 0.8, sz, 7, 2.4); P.sparks(sx, y + 0.6, sz, 10, 1, 0.8, 0.4); WZ.Audio.sfx('club'); WZ.Fx.shake(0.4);
          if (nanaOut && Math.hypot(N.x - sx, N.z - sz) < SM.radius * 0.8) { N.iframes = 0; N.hurt(SM.nanaDamage); WZ.Fx.text(WZ.I18n.t('hud.smashed'), N.rx, N.ry + 5, N.rz, 'warn'); }
          if (J.alive && Math.hypot(J.x - sx, J.z - sz) < SM.radius + 1.2) {
            const dmg = Math.round(SM.damage * (1 + C.dmgPerMission * Gi.mission.index) * J.P.enemyDamageMul * 2 * tm); if (dmg >= J.hp) J.deathCause = 'mech';
            J.hurt(dmg); const dx = J.x - sx, dz = J.z - sz, l = Math.hypot(dx, dz) || 1; J.vx += dx / l * 16; J.vz += dz / l * 16; J.hop = 0.5;
            WZ.Fx.text('-' + dmg, J.rx, J.ry + 5, J.rz, 'warn'); WZ.Fx.flash('hurt'); WZ.Fx.shake(0.5);
          }
        }
        if (M.stT >= SM.windup + 0.4) { M.st = 'adv'; M.stT = 0; M.stompCd = SM.cooldown; }
        return;
      }
      M.st = 'adv';
    },

    // ================================================================== per-step / render
    update(dt, ctx, playing) {
      if (!Hb.on) return;
      Hb.t += dt; if (Hb.textCd > 0) Hb.textCd -= dt;
      Hb._falls(dt); Hb._cranes(dt, playing); Hb._proj(dt);
      // mech status for the hints
      Hb.aiming = Hb.pods = Hb.cover = 0;
      for (const g of WZ.Giants.list) { if (!g.active || !g.mech || !g.M) continue; if (g.M.st === 'aim' && g.M.locked) Hb.aiming = 1; if (g.M.st === 'aim') Hb.aiming = Math.max(Hb.aiming, 0.5); if (g.M.st === 'pods') Hb.pods = 1; if (g.M.coverHide || g.M.st === 'cover') Hb.cover = 1; }
      if (Hb.missiles.some((m) => m.on)) Hb.pods = 1;
      void ctx;
    },
    render(dt, t) {
      if (!Hb.on) return;
      for (const r of Hb.rings) {
        if (!r.on) continue;
        const k = r.age / r.life, pulse = 0.55 + 0.45 * Math.sin(r.age * (10 + 22 * k));
        r.rm.opacity = r.a * (0.55 + 0.4 * pulse); r.dm.opacity = r.a * (0.07 + 0.2 * k) * (0.7 + 0.3 * pulse);
      }
      for (const L of Hb.lasers) { if (!L) continue; L.a = U.damp(L.a, L.want, 16, dt); L.m.opacity = L.a * (0.5 + 0.25 * Math.sin(t * 30)); L.mesh.visible = L.a > 0.03; }
      for (const k of Hb.cranes) {
        k.rig.update(t);
        if (k.viz) { const on = k.warn || (k.st === 'lower'); k.viz.mesh.visible = on; if (on) k.viz.mat.opacity = 0.35 + 0.3 * Math.sin(t * 9); }
      }
    },

    /** HUD hint key (harbor map) or null */
    hint() {
      if (!Hb.on) return null;
      if (Hb.aiming > 0.7) return 'hud.mech.aim';
      if (Hb.pods) return 'hud.mech.missile';
      if (Hb.cover) return 'hud.mech.cover';
      if (Hb.craneWarn) return 'hud.crane.warn';
      if (Hb.craneBlock) return 'hud.crane.block';
      if (Hb.nearHole > 0) return 'hud.fall';
      return null;
    },

    dispose() {
      const c = Hb.ctx;
      if (c && c.scene) {
        for (const r of Hb.rings) { c.scene.remove(r.grp); r.rm.dispose(); r.dm.dispose(); }
        for (const m of Hb.missiles) c.scene.remove(m.grp);
        for (const s of Hb.shells) c.scene.remove(s.mesh);
        for (const L of Hb.lasers) if (L) { c.scene.remove(L.mesh); L.m.dispose(); }
        for (const k of Hb.cranes) { k.rig.dispose(); if (k.viz) { c.scene.remove(k.viz.mesh); k.viz.mat.dispose(); k.viz.tex.dispose(); } }
      }
      for (const k in Hb.geo) Hb.geo[k].dispose(); for (const k in Hb.mats) Hb.mats[k].dispose(); if (Hb.hatch) Hb.hatch.dispose();
      Hb.geo = {}; Hb.mats = {}; Hb.hatch = null; Hb.rings = []; Hb.missiles = []; Hb.shells = []; Hb.lasers = []; Hb.cranes = []; Hb.ctx = null; Hb.on = false;
    },
  };
  WZ.Harbor = Hb;
})(window.WZ = window.WZ || {});
