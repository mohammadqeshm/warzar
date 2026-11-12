/* WZ.Giants — one GIANT guardian stands next to every crate.
 *  - Idle: stands near its crate (slowly shifting its weight), full of HP (HP bar floats above its head).
 *  - Wakes up when the vehicle comes close (or when you shoot it) and chases the vehicle. It is slower than the vehicle, but huge.
 *  - Club: if the vehicle is within reach the giant winds up (telegraphed: arm goes up, body glows red) and smashes it -> armor loss.
 *  - Ramming a giant at speed barely scratches it and hurts the vehicle (CLANG!). Kill it with the roof gun, turrets, bombs, helicopters, mines.
 *  - While NANA is outside the vehicle the giant forgets the vehicle and hunts HER. One club hit kills Nana.
 * Giants are NOT part of the pooled enemy list; they expose the same fields (active, state, x, z, hp...) so WZ.Enemies.nearest()/damage()
 * transparently include them (gun, turrets, helicopters, Nana's pan all just work). All numbers: WZ.CFG.giant. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, C = CFG.giant, U = WZ.U, G = WZ.Geo, rb = G.rbox;
  const B = () => new G.Builder();
  const SKIN = 0x86AE5A, SKIN_D = 0x6A8F45, CLOTH = 0x7A4F2A, DARK = 0x2A1D12, BONE = 0xE9DFC4, WOOD = 0x8A5A2B, WOOD_D = 0x5E3C1B, IRON = 0x4A4F55, YEL = 0xFFB400;
  const v3 = new T.Vector3();
  let parts = null;

  function makeParts() {
    const leg = B(), torso = B(), armL = B(), armR = B();
    // leg (pivot = hip, hangs down)
    leg.add(rb(1.5, 3.0, 1.6, 0.35), { y: -1.5, color: CLOTH });
    leg.add(rb(1.6, 0.35, 1.7, 0.1), { y: -2.1, color: WOOD_D });
    leg.add(rb(1.75, 0.75, 2.4, 0.3), { y: -2.72, z: 0.4, color: DARK });
    // torso (origin = hip centre)
    torso.add(rb(3.1, 1.1, 2.3, 0.4), { y: 0.35, color: CLOTH });
    torso.add(rb(3.3, 0.4, 2.4, 0.12), { y: 1.0, color: DARK });
    torso.add(rb(0.75, 0.5, 0.1, 0.04), { y: 1.0, z: 1.23, color: YEL });
    torso.add(rb(3.5, 2.0, 2.4, 0.7), { y: 2.1, color: SKIN });
    torso.add(rb(3.95, 1.35, 2.5, 0.5), { y: 3.3, color: SKIN });
    for (const s of [1, -1]) {
      torso.add(rb(1.55, 0.9, 2.0, 0.3), { x: 2.2 * s, y: 3.85, color: WOOD_D });
      for (const k of [-0.45, 0.45]) torso.add(G.cone(6), { x: 2.2 * s, y: 4.55, z: k, sx: 0.32, sy: 0.9, sz: 0.32, color: BONE });
    }
    // head
    torso.add(rb(2.3, 1.95, 2.1, 0.55), { y: 4.75, color: SKIN });
    torso.add(rb(2.05, 0.75, 1.9, 0.3), { y: 3.98, z: 0.15, color: SKIN_D });
    for (const s of [1, -1]) {
      torso.add(G.cone(6), { x: 0.68 * s, y: 4.12, z: 1.0, sx: 0.24, sy: 0.85, sz: 0.24, color: BONE });
      torso.add(rb(0.58, 0.52, 0.1, 0.04), { x: 0.58 * s, y: 5.0, z: 1.07, color: 0xFFFFFF });
      torso.add(rb(0.24, 0.3, 0.06, 0.02), { x: 0.52 * s, y: 4.98, z: 1.14, color: 0x151515 });
      torso.add(rb(0.95, 0.22, 0.16, 0.05), { x: 0.6 * s, y: 5.45, z: 1.08, rz: -0.38 * s, color: DARK });
      torso.add(rb(0.3, 0.65, 0.5, 0.1), { x: 1.26 * s, y: 4.85, color: SKIN_D });
      torso.add(G.cone(6), { x: 0.85 * s, y: 5.95, sx: 0.34, sy: 1.15, sz: 0.34, rz: -0.28 * s, color: BONE });
    }
    torso.add(rb(0.6, 0.55, 0.55, 0.15), { y: 4.55, z: 1.15, color: SKIN_D });
    torso.add(rb(1.1, 0.14, 0.1, 0.03), { y: 4.05, z: 1.12, color: DARK });
    // arms (pivot = shoulder, hang down)
    for (const [bld, club] of [[armL, false], [armR, true]]) {
      bld.add(rb(1.15, 2.7, 1.25, 0.3), { y: -1.3, color: SKIN });
      bld.add(rb(1.28, 0.55, 1.38, 0.1), { y: -1.95, color: WOOD_D });
      bld.add(rb(1.35, 1.15, 1.35, 0.3), { y: -3.0, color: SKIN });
      if (club) {
        bld.add(G.cyl(8), { y: -3.9, sx: 0.4, sy: 2.4, sz: 0.4, color: WOOD });
        bld.add(rb(1.55, 2.1, 1.55, 0.4), { y: -5.55, color: WOOD });
        bld.add(rb(1.7, 0.26, 1.7, 0.08), { y: -4.85, color: IRON });
        bld.add(rb(1.7, 0.26, 1.7, 0.08), { y: -6.25, color: IRON });
        for (const [rx, ry, rz, x, z] of [[0, 0, -Math.PI / 2, 0.8, 0], [0, 0, Math.PI / 2, -0.8, 0], [Math.PI / 2, 0, 0, 0, 0.8], [-Math.PI / 2, 0, 0, 0, -0.8]]) {
          bld.add(G.cone(6), { x, z, y: -5.55, rx, ry, rz, sx: 0.3, sy: 0.55, sz: 0.3, color: IRON });
        }
      }
    }
    return { leg: leg.build(), torso: torso.build(), armL: armL.build(), armR: armR.build() };
  }

  function makeRig(mat) {
    if (!parts) parts = makeParts();
    const root = new T.Group(), body = new T.Group();
    root.add(body);
    const mk = (geo, parent, x, y, z, cast) => { const m = new T.Mesh(geo, mat); m.castShadow = !!cast; const g = new T.Group(); g.position.set(x, y, z); g.add(m); parent.add(g); return g; };
    const legL = mk(parts.leg, body, 0.85, 3.0, 0, true), legR = mk(parts.leg, body, -0.85, 3.0, 0, true);
    const torso = mk(parts.torso, body, 0, 3.0, 0, true);
    const armL = mk(parts.armL, torso, 2.35, 3.55, 0, false), armR = mk(parts.armR, torso, -2.35, 3.55, 0, true);
    return { root, body, legL, legR, torso, armL, armR };
  }

  const Gi = {
    ctx: null, list: [], alive: 0, mission: null,

    init(ctx, mission) {
      Gi.dispose(); Gi.ctx = ctx; Gi.list = []; Gi.mission = mission;
      const rng = WZ.RNG.create(WZ.RNG.hash((ctx.map.seed | 0) >>> 0, 7717)), col = ctx.col, hm = ctx.map.height;
      const tut = !!mission.tutorial, hpMul = tut ? C.tutorialHp : mission.hpMul, spd = tut ? C.tutorialSpeed : 1;
      const jur = ctx.map.theme === 'jurassic', Cg = jur ? CFG.dinoStats : C;     // Jurassic map: the guardians are fire-breathing dinosaurs
      ctx.map.crates.forEach((cr, i) => {
        let sx = cr.x + Cg.home, sz = cr.z, ok = false;
        for (let k = 0; k < 24 && !ok; k++) {
          const a = rng.range(0, 6.283), r = Cg.home * (0.75 + rng.range(0, 0.5) + k * 0.03);
          sx = cr.x + Math.cos(a) * r; sz = cr.z + Math.sin(a) * r;
          ok = col.free(sx, sz, Cg.radius + 0.5) && Math.hypot(sx - ctx.map.start.x, sz - ctx.map.start.z) > 20;
        }
        const mat = new T.MeshLambertMaterial({ vertexColors: true }), rig = jur ? WZ.DinoArt.rig(mat, i) : makeRig(mat);
        ctx.scene.add(rig.root);
        const g = {
          giant: true, active: true, state: 0, dying: false, dead: false, id: i, crateIdx: i, x: sx, z: sz, px: sx, pz: sz, h: Math.atan2(cr.x - sx, cr.z - sz), ph: 0, hx: sx, hz: sz,
          radius: Cg.radius, hp: Cg.hp * hpMul, maxHp: Cg.hp * hpMul, spd, C: Cg, dino: jur, fire: 0, fireT: 0, fireCd: jur ? (tut ? 6 : 2.5) + rng.range(0, 2) : 0, fireTick: 0, fireSfx: 0, tutMul: tut && jur ? Cg.fire.tutorialMul : 1, flash: 0, walk: rng.range(0, 6), mv: 0, rx: sx, ry: hm(sx, sz), rz: sz,
          mat, rig, swing: 0, hit: true, cd: 1, agro: 0, mode: 0, ramCd: 0, koT: 0, navT: 0, direct: true, path: null, pi: 0, wanderT: rng.range(1, 4), wx: sx, wz: sz,
          stuckT: 0, lx: sx, lz: sz, armK: -0.28, leanK: 0,
        };
        g.ph = g.h; rig.root.position.set(sx, g.ry, sz); rig.root.rotation.y = g.h;
        Gi.list.push(g);
      });
      Gi.alive = Gi.list.length;
    },

    /** the living giant that guards this crate (or null) */
    guardOf(crate) { for (const g of Gi.list) if (g.active && g.crateIdx === crate.id) return g; return null; },

    /** closest giant (by surface distance) within r, or null — used by WZ.Enemies.nearest() */
    nearest(x, z, r) {
      let best = null, bd = r;
      for (const g of Gi.list) {
        if (!g.active) continue;
        const d = Math.hypot(g.x - x, g.z - z) - g.radius;
        if (d < bd) { bd = d; best = g; }
      }
      return best;
    },

    /** returns true when the hit killed the giant */
    damage(g, amt, kx, kz, cause) {
      if (!g.active) return false;
      g.hp -= amt; g.flash = 1; g.agro = C.agroTime;
      if (g.hp <= 0) { Gi.kill(g, cause); return true; }
      void kx; void kz;
      return false;
    },

    /** area damage (bombs, cannon splash, mines, barrels, pan cleave): every giant whose body touches the circle */
    splash(x, z, r, dmg, cause) {
      let n = 0;
      for (const g of Gi.list) {
        if (!g.active) continue;
        if (Math.hypot(g.x - x, g.z - z) - g.radius < r) { Gi.damage(g, dmg, 0, 0, cause); n++; }
      }
      return n;
    },

    kill(g, cause) {
      const c = Gi.ctx, P = c.particles, E = c.enemies;
      g.active = false; g.state = 2; g.dying = true; g.koT = 0; g.hp = 0; Gi.alive--;
      const y = g.ry;
      WZ.Audio.sfx('boom', 0.8); WZ.Audio.sfx('roar'); WZ.Fx.shake(0.55); WZ.Fx.hitstop(0.07);
      P.poof(g.x, y + 3, g.z, 14, 3); P.stars(g.x, y + 9, g.z, 8); P.dust(g.x, y, g.z, 10);
      WZ.Fx.text(WZ.I18n.t(g.dino ? 'hud.dinodown' : 'hud.giantdown'), g.x, y + 10, g.z, 'good');
      E.kos++;
      WZ.Events.emit('enemy:ko', { enemy: g, cause, giant: true });
    },

    // ---------------------------------------------------------------- AI (fixed step)
    _goTo(g, tx, tz, dt, speed) {
      const c = Gi.ctx, nav = c.map.nav.jeep;
      g.navT -= dt;
      const d0 = Math.hypot(tx - g.x, tz - g.z);
      if (g.navT <= 0) {
        g.navT = 0.35 + Math.random() * 0.15;
        g.direct = d0 < 8 || nav.los(g.x, g.z, tx, tz);
        if (!g.direct) { g.path = nav.path(g.x, g.z, tx, tz); g.pi = 0; if (!g.path) g.direct = true; }
      }
      let wx = tx, wz = tz;
      if (!g.direct && g.path) {
        while (g.pi < g.path.length - 1 && Math.hypot(g.path[g.pi].x - g.x, g.path[g.pi].z - g.z) < 2.6) g.pi++;
        const p = g.path[Math.min(g.pi, g.path.length - 1)]; wx = p.x; wz = p.z;
      }
      const dx = wx - g.x, dz = wz - g.z, d = Math.hypot(dx, dz) || 1;
      g.h += U.clamp(U.angDiff(g.h, Math.atan2(dx, dz)), -5 * dt, 5 * dt);
      const st = Math.min(speed * dt, d);
      g.x += dx / d * st; g.z += dz / d * st;
      c.col.resolve(g, g.radius);
      // stuck safety
      g.stuckT = Math.hypot(g.x - g.lx, g.z - g.lz) < speed * dt * 0.25 ? g.stuckT + dt : 0; g.lx = g.x; g.lz = g.z;
      if (g.stuckT > 1.2) { g.stuckT = 0; g.navT = 0; g.direct = false; g.x += Math.sin(g.h + 1.5) * 0.8; g.z += Math.cos(g.h + 1.5) * 0.8; }
      return d0;
    },

    update(dt) {
      const c = Gi.ctx; if (!c) return;
      const J = c.jeep, N = c.nana, P = c.particles;
      const nanaOut = N.out && !N.isKO && N.state !== 'BOARDING';
      for (let i = 0; i < Gi.list.length; i++) {
        const g = Gi.list[i], C = g.C;
        g.px = g.x; g.pz = g.z; g.ph = g.h;
        if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 6);
        if (g.dying) { g.koT += dt; continue; }
        if (!g.active) continue;
        g.cd -= dt; g.ramCd -= dt; if (g.agro > 0) g.agro -= dt; if (g.fireCd > 0) g.fireCd -= dt;
        const x0 = g.x, z0 = g.z;
        const dj = Math.hypot(g.x - J.x, g.z - J.z), dn = nanaOut ? Math.hypot(g.x - N.x, g.z - N.z) : 1e9;
        // target: Nana has priority while she is outside, then the vehicle, otherwise stay/return home
        let kind = 0;
        if (nanaOut && dn < C.nanaAggro) kind = 2;
        else if (J.alive && dj < C.leash && (dj < C.aggro || g.agro > 0)) { kind = 1; if (dj < C.aggro) g.agro = C.agroTime; }
        if (kind && g.mode === 0) {
          g.mode = 1; WZ.Audio.sfx('roar'); WZ.Fx.text('!', g.x, g.ry + C.height + 3, g.z, 'warn'); WZ.Fx.shake(0.12);
        } else if (!kind && g.mode === 1) g.mode = 2;

        if (g.dino && g.fire) {
          Gi._fire(g, C, dt, kind, J, N, nanaOut);
        } else if (g.swing > 0) {
          // winding up / smashing: stand still and face the victim
          g.swing += dt;
          const tx = kind === 2 ? N.x : J.x, tz = kind === 2 ? N.z : J.z;
          if (kind) g.h += U.clamp(U.angDiff(g.h, Math.atan2(tx - g.x, tz - g.z)), -3.2 * dt, 3.2 * dt);
          if (!g.hit && g.swing >= C.windup) { g.hit = true; Gi.impact(g, J, N, nanaOut); }
          if (g.swing >= C.windup + C.swing) { g.swing = 0; g.cd = C.cooldown; }
        } else if (kind) {
          const tx = kind === 2 ? N.x : J.x, tz = kind === 2 ? N.z : J.z, d = kind === 2 ? dn : dj, reach = kind === 2 ? C.nanaReach : C.reach;
          if (d < reach && g.cd <= 0) {
            g.swing = 1e-4; g.hit = false;
            g.h = Math.atan2(tx - g.x, tz - g.z); WZ.Audio.sfx('swish');
          } else if (g.dino && g.fireCd <= 0 && J.alive && d >= C.fire.minRange && d <= (kind === 2 ? C.fire.nanaRange : C.fire.range) && Math.abs(U.angDiff(g.h, Math.atan2(tx - g.x, tz - g.z))) < 0.8) {
            g.fire = 1; g.fireT = 0; WZ.Audio.sfx('dino', 1); WZ.Fx.text('!', g.x, g.ry + C.height + 3, g.z, 'warn'); WZ.Fx.shake(0.12);
          } else if (d > reach * 0.8) Gi._goTo(g, tx, tz, dt, C.speed * g.spd * (kind === 2 ? 1.12 : 1));
          else g.h += U.clamp(U.angDiff(g.h, Math.atan2(tx - g.x, tz - g.z)), -4 * dt, 4 * dt);
        } else {
          // idle: wander a little near home; return home (and heal) after losing the target
          const dh = Math.hypot(g.hx - g.x, g.hz - g.z);
          if (g.mode === 2 && dh > 2.5) Gi._goTo(g, g.hx, g.hz, dt, C.speed * g.spd * 0.8);
          else {
            g.mode = 0; g.wanderT -= dt;
            if (g.wanderT <= 0) { g.wanderT = 2.5 + Math.random() * 3.5; const a = Math.random() * 6.283, r = Math.random() * 2.6; g.wx = g.hx + Math.cos(a) * r; g.wz = g.hz + Math.sin(a) * r; }
            if (Math.hypot(g.wx - g.x, g.wz - g.z) > 0.6) Gi._goTo(g, g.wx, g.wz, dt, C.speed * g.spd * 0.28);
          }
          if (g.hp < g.maxHp) g.hp = Math.min(g.maxHp, g.hp + C.regen * dt);
        }

        // vehicle <-> giant body collision (+ ramming rules)
        if (J.alive) {
          const dx = J.x - g.x, dz = J.z - g.z, d = Math.hypot(dx, dz) || 1, min = g.radius + 2.0;
          if (d < min) {
            const nx = dx / d, nz = dz / d; J.x += nx * (min - d); J.z += nz * (min - d);
            const vn = J.vx * nx + J.vz * nz;
            if (vn < 0) {
              const sp = -vn;
              if (sp >= C.ramMinSpeed && g.ramCd <= 0) {
                g.ramCd = C.ramCooldown;
                Gi.damage(g, C.ramDamage * J.P.ram, 0, 0, 'ram');
                const self = C.ramSelf * J.P.enemyDamageMul * 2;
                if (self >= J.hp) J.deathCause = 'giant';
                J.hurt(self); J.hop = 0.35;
                WZ.Fx.shake(0.45); WZ.Fx.hitstop(0.05); WZ.Audio.sfx('crash', 1);
                P.sparks(J.x - nx * 1.6, J.ry + 1.6, J.z - nz * 1.6, 12, 1, 0.8, 0.4);
                WZ.Fx.text(WZ.I18n.t('hud.clang') + ' -' + Math.round(self), J.rx, J.ry + 5, J.rz, 'warn');
              }
              J.vx -= 1.6 * vn * nx; J.vz -= 1.6 * vn * nz; if (sp > J.impact) J.impact = sp;
            }
          }
        }
        if (nanaOut) {
          const dx = N.x - g.x, dz = N.z - g.z, d = Math.hypot(dx, dz) || 1, min = g.radius + 0.9;
          if (d < min) { N.x += dx / d * (min - d); N.z += dz / d * (min - d); }
        }
        const mvd = Math.hypot(g.x - x0, g.z - z0) / dt; g.mv = U.lerp(g.mv, mvd, Math.min(1, dt * 8));
        g.walk += g.mv * dt * 0.55;
      }
    },

    /** DINOSAUR fire breath. State 1 = wind-up (stands, rears back, mouth glows, turns to its target = the telegraph), state 2 = breath (a cone of flame
     *  that sweeps toward the target at a limited turn rate while the dinosaur creeps forward). Damages the vehicle per tick and burns Nana. */
    _fire(g, C, dt, kind, J, N, nanaOut) {
      const F = C.fire, c = Gi.ctx, P = c.particles, U_ = U;
      g.fireT += dt;
      const tx = kind === 2 ? N.x : J.x, tz = kind === 2 ? N.z : J.z;
      if (kind) g.h += U_.clamp(U_.angDiff(g.h, Math.atan2(tx - g.x, tz - g.z)), -(g.fire === 1 ? F.windTurn : F.turn) * dt, (g.fire === 1 ? F.windTurn : F.turn) * dt);
      if (g.fire === 1) { if (g.fireT >= F.windup) { g.fire = 2; g.fireT = 0; g.fireTick = 0; g.fireSfx = 0; WZ.Audio.sfx('dino', 0.8); WZ.Fx.shake(0.2); } return; }
      // ---- breath
      const sn = Math.sin(g.h), cs = Math.cos(g.h), gy = c.map.height(g.x, g.z);
      if (kind && Math.hypot(tx - g.x, tz - g.z) > 9) { const st = C.speed * g.spd * F.advance * dt; g.x += sn * st; g.z += cs * st; c.col.resolve(g, g.radius); }
      const mx = g.x + sn * F.mouth, mz = g.z + cs * F.mouth, my = gy + F.mouthY, lx = cs, lz = -sn, q = CFG.quality.particles[WZ.Quality ? WZ.Quality.level : 2] || 1;
      const grow = Math.min(1, g.fireT / 0.22), len = F.len * grow;
      for (let i = 0, n = Math.max(1, Math.round(3 * q)); i < n; i++) {
        const sp = 34 + Math.random() * 9, side = (Math.random() - 0.5) * 7, up = (Math.random() - 0.3) * 3.2, k = Math.random();
        P.emit(1, mx + (Math.random() - 0.5) * 0.8, my + (Math.random() - 0.5) * 0.6, mz + (Math.random() - 0.5) * 0.8, sn * sp + lx * side, -sp * 0.26 + up, cs * sp + lz * side, 0.62 + Math.random() * 0.3, 1.5, 5.2, 1, 0.62 - k * 0.3, 0.12, 0.92, 0, 0.5, 0.35);
      }
      if ((g.fireSfx++ & 3) === 0) P.emit(0, mx + sn * 10, my - 2.5, mz + cs * 10, sn * 6, 2.2, cs * 6, 1.1, 2.4, 6.5, 0.13, 0.12, 0.11, 0.5, 0, 1.4, 0.5);
      const ex = mx + sn * len * 0.88, ez = mz + cs * len * 0.88, ey = c.map.height(ex, ez);        // the flame scorches the ground where it lands
      P.emit(1, ex + (Math.random() - 0.5) * 3, ey + 0.4, ez + (Math.random() - 0.5) * 3, (Math.random() - 0.5), 3 + Math.random() * 2, (Math.random() - 0.5), 0.7, 2.4, 0.5, 1, 0.5, 0.1, 0.9, 0, 0, 1);
      g.fireTick -= dt; g.fireLoop = (g.fireLoop || 0) - dt; if (g.fireLoop <= 0) { g.fireLoop = 0.2; WZ.Audio.sfx('dflame', 0.8); }
      if (g.fireTick <= 0) {
        g.fireTick = F.tick; const tk = g.tutMul;
        const hit = (px, pz, rad) => { const rx = px - mx, rz = pz - mz, along = rx * sn + rz * cs, lat = rx * lx + rz * lz; if (along < 0 || along > len + 1) return false; return Math.abs(lat) < F.wStart + (F.wEnd - F.wStart) * (along / F.len) + rad; };
        if (J.alive && hit(J.x, J.z, 1.7)) {
          const dmg = Math.max(1, Math.round(F.jeepTick * (1 + C.dmgPerMission * Gi.mission.index) * J.P.enemyDamageMul * 2 * tk));
          if (dmg >= J.hp) J.deathCause = 'fire';
          J.hurt(dmg); WZ.Fire.ignite(2.4); WZ.Fx.shake(0.14);
          if (((g.fireSfx >> 2) & 1) === 0) WZ.Fx.text('-' + dmg, J.rx, J.ry + 5, J.rz, 'warn');
        }
        if (nanaOut && hit(N.x, N.z, 0.9)) { N.iframes = 0; N.hurt(F.nanaTick * tk); P.sparks(N.x, N.ry + 1.5, N.z, 5, 1, 0.5, 0.1); }
      }
      if (g.fireT >= F.dur || !J.alive) { g.fire = 0; g.fireT = 0; g.fireCd = F.cooldown * (0.85 + Math.random() * 0.3) * (g.tutMul < 1 ? 1.6 : 1); }
    },

    /** the club lands */
    impact(g, J, N, nanaOut) {
      const C = g.C, c = Gi.ctx, P = c.particles, sn = Math.sin(g.h), cs = Math.cos(g.h);
      const cx = g.x + sn * 4.2, cz = g.z + cs * 4.2, y = c.map.height(cx, cz);
      P.dust(cx, y, cz, 10); P.poof(cx, y + 0.8, cz, 7, 2.2); P.sparks(cx, y + 0.6, cz, 8, 1, 0.8, 0.4);
      WZ.Audio.sfx('club'); if (Math.hypot(g.x - J.x, g.z - J.z) < 55) WZ.Fx.shake(0.32);
      if (nanaOut && Math.hypot(g.x - N.x, g.z - N.z) < C.nanaReach + 0.9) {
        N.iframes = 0; N.hurt(C.nanaDeathDamage);
        WZ.Fx.text(WZ.I18n.t('hud.smashed'), N.rx, N.ry + 5, N.rz, 'warn');
      }
      if (J.alive && Math.hypot(g.x - J.x, g.z - J.z) < C.reach + 1.5) {
        const dmg = Math.round(C.jeepDamage * (1 + C.dmgPerMission * Gi.mission.index) * J.P.enemyDamageMul * 2);
        if (dmg >= J.hp) J.deathCause = 'giant';
        J.hurt(dmg);
        const dx = J.x - g.x, dz = J.z - g.z, l = Math.hypot(dx, dz) || 1;
        J.vx += dx / l * C.jeepKnock; J.vz += dz / l * C.jeepKnock; J.hop = 0.5;
        WZ.Fx.text('-' + dmg, J.rx, J.ry + 5, J.rz, 'warn'); WZ.Fx.flash('hurt'); WZ.Fx.shake(0.55); WZ.Fx.hitstop(0.05);
        P.sparks(J.x, J.ry + 1.8, J.z, 10, 1, 0.8, 0.3);
      }
    },

    // ---------------------------------------------------------------- render
    render(alpha, t, dt) {
      const c = Gi.ctx; if (!c) return;
      const hm = c.map.height, BL = WZ.Blobs;
      for (let i = 0; i < Gi.list.length; i++) {
        const g = Gi.list[i], R = g.rig, C = g.C;
        if (g.dead) continue;
        const x = U.lerp(g.px, g.x, alpha), z = U.lerp(g.pz, g.z, alpha), h = g.ph + U.angDiff(g.ph, g.h) * alpha, gy = hm(x, z);
        g.rx = x; g.ry = gy; g.rz = z;
        R.root.position.set(x, gy, z); R.root.rotation.set(0, h, 0);
        if (g.dino) WZ.DinoArt.pose(g, C, t, dt);
        else {
        const am = Math.min(1, g.mv / C.speed), w = g.walk;
        R.legL.rotation.x = Math.sin(w) * 0.75 * am; R.legR.rotation.x = -Math.sin(w) * 0.75 * am;
        const bob = Math.abs(Math.sin(w)) * 0.28 * am + Math.sin(t * 1.8 + g.id) * 0.04;
        R.body.position.y = bob; R.body.rotation.z = Math.sin(w) * 0.05 * am;
        R.armL.rotation.x = -Math.sin(w) * 0.5 * am - 0.1; R.armL.rotation.z = -0.12;
        // club arm: rest -> overhead (windup) -> smash
        let aT = -0.28 + Math.sin(w) * 0.2 * am + Math.sin(t * 1.8 + g.id) * 0.03, lT = 0, k = 8;
        if (g.swing > 0) {
          if (g.swing < C.windup) { const u = U.smooth(0, 1, g.swing / C.windup); aT = -0.28 + (-2.95 + 0.28) * u; lT = -0.22 * u; k = 12; }
          else { aT = -0.3; lT = 0.5; k = 40; }
        }
        g.armK += (aT - g.armK) * Math.min(1, dt * k); g.leanK += (lT - g.leanK) * Math.min(1, dt * k);
        R.armR.rotation.x = g.armK; R.armR.rotation.z = 0.12; R.torso.rotation.x = g.leanK;
        R.torso.rotation.y = g.swing > 0 && g.swing < C.windup ? Math.sin(g.swing / C.windup * 1.6) * 0.25 : 0;
        }
        // flash: white on hit, red pulse during the wind-up (telegraph)
        const telegraph = g.swing > 0 && g.swing < C.windup ? 0.3 + 0.3 * Math.sin(g.swing * 30) : (g.fire === 1 ? 0.2 + 0.4 * (g.fireT / C.fire.windup) + 0.15 * Math.sin(g.fireT * 28) : 0);
        const f = g.flash * 0.6;
        g.mat.emissive.setRGB(f + telegraph * 0.9, f + telegraph * 0.08, f + telegraph * 0.05);
        if (g.dying) {
          const k2 = Math.min(1, g.koT / 0.7);
          if (g.dino) { R.root.rotation.z = k2 * 1.5; R.root.position.y = gy - k2 * 0.3; if (R.flame) R.flame.g.visible = false; R.glow.visible = false; } else { R.root.rotation.x = -k2 * 1.45; R.root.position.y = gy - k2 * 0.9; }
          if (g.koT > 1.1) { const s = Math.max(0.001, 1 - (g.koT - 1.1) / 0.5); R.root.scale.setScalar(s); }
          if (g.koT > 1.6) { g.dead = true; R.root.visible = false; if (c.particles) c.particles.poof(x, gy + 2, z, 12, 3); }
          if (c.particles && g.koT < 1.0 && Math.random() < dt * 10) c.particles.stars(x, gy + 8, z, 1);
        } else BL.add(x, gy, z, 9);
      }
    },

    /** floating HP bars (DOM) projected over the giants' heads */
    bars(cam, w, h) {
      const UI = WZ.UI; let n = 0;
      for (let i = 0; i < Gi.list.length; i++) {
        const g = Gi.list[i]; if (!g.active) continue;
        v3.set(g.rx, g.ry + g.C.height + 1.6, g.rz).project(cam);
        if (v3.z > 1 || Math.abs(v3.x) > 1.12 || v3.y > 1.1 || v3.y < -1.1) continue;
        if (n < UI.giantBarMax) UI.setGiantBar(n++, (v3.x * 0.5 + 0.5) * w, (-v3.y * 0.5 + 0.5) * h, g.hp / g.maxHp, g.mode === 1 ? 1 : (g.fire ? 1 : 0), g.hp, g.dino ? WZ.I18n.t('hud.dino') : null);
      }
      UI.hideGiantBars(n);
    },

    dispose() {
      const c = Gi.ctx;
      for (const g of Gi.list) { if (c) c.scene.remove(g.rig.root); g.mat.dispose(); if (g.rig.dispose) g.rig.dispose(); }
      Gi.list = []; Gi.alive = 0; Gi.ctx = null;
    },
  };
  WZ.Giants = Gi;
})(window.WZ = window.WZ || {});
