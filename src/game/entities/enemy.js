/* WZ.Enemies — pooled enemy manager (grunts in M1). State machine: CHASE -> ATTACK, KO.
 * Targets the closer of jeep / Nana. Rendering is fully instanced (WZ.EnemyArt). KO = stars, spin, helmet pop, smoke poof. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, U = WZ.U, R = WZ.RNG;
  const CHASE = 0, ATTACK = 1, KO = 2;
  const MAX = 48;

  function make(i) {
    return {
      id: i, active: false, type: 'grunt', x: 0, z: 0, px: 0, pz: 0, vx: 0, vz: 0, h: 0, ph: 0, hp: 0, maxHp: 0, state: CHASE, target: 0,
      cd: 0, windup: 0, walk: 0, koT: 0, flash: 0, spin: 0, scale: 1, variant: 0, tgtT: 0, speedMul: 1, armT: 0,
      hitWall: 0, wnx: 0, wnz: 0, slide: 1, stT: 0, sx: 0, sz: 0, stN: 0, moving: false, _qs: 0, shootCd: 0, holder: false,
      cCloth: new T.Color(), cSkin: new T.Color(), cHelm: new T.Color(),
    };
  }

  const E = {
    list: [], alive: 0, kos: 0, mods: { dmg: 1, speed: 1, rush: 1 }, hash: null, view: null, scene: null, map: null, col: null, rnd: null, q: [], tmpTarget: { x: 0, z: 0 },

    init(scene, map, col) {
      E.scene = scene; E.map = map; E.col = col; E.kos = 0; E.alive = 0; E.mods.dmg = E.mods.speed = E.mods.rush = 1;
      E.hash = new WZ.SpatialHash(6, map.half + 40);
      E.view = WZ.EnemyArt.build(MAX); scene.add(E.view.group);
      E.list = []; for (let i = 0; i < MAX; i++) E.list.push(make(i));
      E.rnd = R.mulberry32((map.seed ^ 0xE7E7) >>> 0);
    },

    spawn(type, x, z, hpMul) {
      if (E.alive >= CFG.perf.aliveCap) return null;
      const def = CFG.enemies[type]; let e = null;
      for (let i = 0; i < MAX; i++) if (!E.list[i].active) { e = E.list[i]; break; }
      if (!e) return null;
      e.active = true; e.type = type; e.x = e.px = x; e.z = e.pz = z; e.vx = e.vz = 0; e.state = CHASE; e.target = 0;
      e.hp = e.maxHp = def.hp * hpMul; e.cd = 0.3; e.windup = def.windup; e.walk = E.rnd() * 6; e.koT = 0; e.flash = 0; e.scale = def.scale;
      e.speedMul = 0.88 + E.rnd() * 0.24; e.tgtT = E.rnd() * 0.25; e.armT = 0; e.hitWall = 0; e.slide = E.rnd() < 0.5 ? 1 : -1;
      e.sx = x; e.sz = z; e.stT = 0; e.stN = 0; e.h = e.ph = E.rnd() * 6.28;
      E.view.style(e, E.rnd);
      e.shootCd = 0.8 + E.rnd() * 1.4; e.holder = E.rnd() < 0.5;
      if (type === 'brute') { e.cCloth.setRGB(0.5, 0.52, 0.66); e.cSkin.setRGB(0.72, 0.62, 0.58); e.cHelm.setRGB(0.95, 0.14, 0.1); e.variant = 0; e.holder = true; }
      E.alive++;
      return e;
    },
    _kill(e) { e.active = false; E.alive--; },

    nearest(x, z, r) {
      E.hash.query(x, z, r, E.q);
      let best = null, bd = r * r;
      for (let i = 0; i < E.q.length; i++) {
        const e = E.q[i]; if (!e.active || e.state === KO) continue;
        const d = (e.x - x) * (e.x - x) + (e.z - z) * (e.z - z);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    },

    /** returns true if the hit KO'd the enemy */
    damage(e, amt, kx, kz, cause) {
      if (!e.active || e.state === KO) return false;
      e.hp -= amt; e.flash = 1;
      if (e.hp <= 0) { E.ko(e, kx, kz, 7, cause); return true; }
      if (kx || kz) { e.vx += kx; e.vz += kz; }
      return false;
    },

    ko(e, dx, dz, power, cause) {
      if (e.state === KO) return;
      e.state = KO; e.koT = 0; e.flash = 1;
      const l = Math.hypot(dx, dz) || 1;
      e.vx = dx / l * power * 1.5; e.vz = dz / l * power * 1.5; e.spin = (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 6);
      E.kos++;
      WZ.Audio.sfx('ko', 0.7);
      WZ.Events.emit('enemy:ko', { enemy: e, cause });
    },

    update(dt, ctx) {
      const jeep = ctx.jeep, nana = ctx.nana, col = E.col, PT = WZ.Particles;
      E.hash.clear();
      for (let i = 0; i < MAX; i++) { const e = E.list[i]; if (e.active) E.hash.insert(e, e.x, e.z); }
      const nanaTarget = nana.out && nana.state !== 'KO' && nana.state !== 'BOARDING';
      for (let i = 0; i < MAX; i++) {
        const e = E.list[i]; if (!e.active) continue;
        e.px = e.x; e.pz = e.z; e.ph = e.h;
        if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 7);
        const def = CFG.enemies[e.type];

        if (e.state === KO) {
          e.koT += dt; e.x += e.vx * dt; e.z += e.vz * dt;
          const dr = Math.exp(-2.2 * dt); e.vx *= dr; e.vz *= dr;
          if (e.koT < 0.7) e.h += e.spin * dt;
          col.resolve(e, 0.6);
          if (PT && Math.random() < dt * 10 && e.koT < 0.85) PT.stars(e.x, E.map.height(e.x, e.z) + 2.9, e.z, 1);
          if (e.koT > 0.95) { if (PT) PT.poof(e.x, E.map.height(e.x, e.z) + 1, e.z, 6, 1.1); E._kill(e); }
          continue;
        }

        const jd = Math.hypot(e.x - jeep.x, e.z - jeep.z);
        if (jd > CFG.spawn.cullDist) { E._kill(e); continue; }

        // pick the closer target (jeep or Nana)
        e.tgtT -= dt;
        if (e.tgtT <= 0) {
          e.tgtT = 0.25;
          e.target = nanaTarget && Math.hypot(e.x - nana.x, e.z - nana.z) < jd ? 1 : 0;
        }
        const tx = e.target === 1 ? nana.x : jeep.x, tz = e.target === 1 ? nana.z : jeep.z;
        let dx = tx - e.x, dz = tz - e.z; const d = Math.hypot(dx, dz) || 1;
        const range = e.target === 1 ? def.nanaRange : def.jeepRange;
        e.h += U.clamp(U.angDiff(e.h, Math.atan2(dx, dz)), -11 * dt, 11 * dt);
        e.moving = false;

        // knock-back velocity decays
        if (Math.abs(e.vx) + Math.abs(e.vz) > 0.05) { e.x += e.vx * dt; e.z += e.vz * dt; const dr = Math.exp(-6 * dt); e.vx *= dr; e.vz *= dr; }

        if (e.state === CHASE) {
          if (d <= range) { e.state = ATTACK; e.windup = def.windup; e.cd = Math.max(e.cd, 0.15); }
          else if (e.holder && def.shootRange > 0 && e.target === 1 && d < def.shootStop) { e.armT = Math.max(0, e.armT - dt * 4); } // stands off and shoots
          else {
            let mx = dx / d, mz = dz / d;
            if (e.hitWall > 0) {
              e.hitWall -= dt;
              const tx2 = -e.wnz * e.slide, tz2 = e.wnx * e.slide;
              mx = mx * 0.3 + tx2 * 0.95; mz = mz * 0.3 + tz2 * 0.95;
              const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l;
            }
            const sp = def.speed * e.speedMul * E.mods.speed * E.mods.rush;
            e.x += mx * sp * dt; e.z += mz * sp * dt; e.walk += sp * dt * 0.62; e.moving = true;
          }
        }
        if (e.state === ATTACK) {
          if (d > range * 1.35) e.state = CHASE;
          else {
            e.cd -= dt;
            if (e.cd <= 0) {
              e.windup -= dt; e.armT = 1 - Math.max(0, e.windup) / def.windup;
              if (e.windup <= 0) {
                e.cd = def.cooldown; e.windup = def.windup; e.armT = 0;
                if (e.target === 1) nana.hurt(def.damage * E.mods.dmg, e);
                else jeep.hurt(def.damage * E.mods.dmg * (jeep.P ? jeep.P.enemyDamageMul : CFG.jeep.enemyDamageMul));
                WZ.Audio.sfx('hit', 0.6);
              }
            } else e.armT = Math.max(0, e.armT - dt * 5);
          }
        }
        // ranged attack: shoot at Nana when she is within range (never while meleeing)
        if (def.shootRange > 0 && nanaTarget && e.state === CHASE && WZ.Bullets) {
          e.shootCd -= dt;
          if (e.armT > 0) e.armT = Math.max(0, e.armT - dt * 3.5);
          const nd = Math.hypot(e.x - nana.x, e.z - nana.z);
          if (e.shootCd <= 0 && nd < def.shootRange) {
            e.shootCd = def.shootCd * (0.8 + Math.random() * 0.5) / (1 + (E.mods.rush - 1) * 0.6);
            const bs = def.bulletSpeed, lead = nd / bs * 0.6 / Math.max(dt, 1e-3);
            e.h = Math.atan2(nana.x - e.x, nana.z - e.z); e.armT = 1;
            WZ.Bullets.fire(e.x + Math.sin(e.h) * 0.9, 1.9 * e.scale + 0.1, e.z + Math.cos(e.h) * 0.9, nana.x + (nana.x - nana.px) * lead, nana.z + (nana.z - nana.pz) * lead, bs, def.shootDamage * E.mods.dmg, e.type === 'brute');
            if (nd < 24) WZ.Audio.sfx('tshot', 0.5);
          }
        }
        if (col.resolve(e, def.radius)) { e.hitWall = 0.35; e.wnx = col.nx; e.wnz = col.nz; }

        // soft separation
        E.hash.query(e.x, e.z, 1.5, E.q);
        for (let k = 0; k < E.q.length; k++) {
          const o = E.q[k]; if (o === e || o.state === KO) continue;
          const ox = e.x - o.x, oz = e.z - o.z, od = Math.hypot(ox, oz);
          if (od < 1.35 && od > 0.001) { const p = (1.35 - od) * 0.5; e.x += ox / od * p * 0.6; e.z += oz / od * p * 0.6; }
        }

        // stuck handling: flip wall-follow side, finally recycle
        e.stT += dt;
        if (e.stT > 1.2) {
          if (e.state === CHASE && Math.hypot(e.x - e.sx, e.z - e.sz) < 1.0) { e.slide = -e.slide; e.hitWall = 0.8; if (++e.stN > 3) { E._kill(e); continue; } } else e.stN = 0;
          e.sx = e.x; e.sz = e.z; e.stT = 0;
        }
      }
    },

    render(alpha, t) {
      const v = E.view, BL = WZ.Blobs, hm = E.map.height;
      v.begin();
      for (let i = 0; i < MAX; i++) {
        const e = E.list[i]; if (!e.active) continue;
        const x = U.lerp(e.px, e.x, alpha), z = U.lerp(e.pz, e.z, alpha), h = e.ph + U.angDiff(e.ph, e.h) * alpha, gy = hm(x, z);
        let y = gy, tilt = 0, hy = 0, hr = 0, arm = 0;
        if (e.state === KO) {
          const k = e.koT;
          y += Math.max(0, 9 * k - 14 * k * k); tilt = Math.min(1.35, k * 4.5);
          hy = Math.max(-1.2, 11 * k - 14 * k * k); hr = k * 14;
          BL.add(x, gy, z, 2.2 * Math.max(0.3, 1 - y * 0.15));
        } else {
          arm = e.armT * 2.1; BL.add(x, gy, z, 2.4 * e.scale);
        }
        const bob = e.moving ? Math.abs(Math.sin(e.walk)) * 0.1 : 0;
        v.push(e, x, y + bob, z, h, tilt, e.moving ? e.walk : e.walk * 0 + Math.sin(t * 3 + e.id) * 0.1, arm, hy, hr);
      }
      v.end();
    },

    reset() {
      for (let i = 0; i < MAX; i++) E.list[i].active = false;
      E.alive = 0; E.kos = 0;
    },
    dispose() {
      if (E.view) { E.scene.remove(E.view.group); E.view.dispose(); E.view = null; }
      E.list = []; E.alive = 0;
    },
  };

  WZ.Enemies = E;
})(window.WZ = window.WZ || {});
