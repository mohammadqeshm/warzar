/* WZ.Soldiers — ALLIED COMBAT SOLDIERS (bought in the Shop; one consumed per deployment, no limit on simultaneous soldiers).
 * Drop a soldier anywhere on the map with USE (F). He patrols around his drop zone, aims his assault rifle at the nearest
 * enemy or giant and fires rapid bursts. He has both an HP gauge and a stamina/lifetime gauge overhead: enemies can melee or
 * shoot him, and giants can smash him. When his HP hits 0 or his lifetime gauge runs out, he leaves the battlefield. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, U = WZ.U, G = WZ.Geo;
  const v3 = new T.Vector3();
  let ringGeo = null;

  const tech = () => (WZ.Save.data.upgrades.defense | 0);
  const mulDmg = () => 1 + tech() * CFG.defenseTech.dmg;
  const mulLife = () => 1 + tech() * CFG.defenseTech.life;
  const mulRate = () => 1 + tech() * CFG.defenseTech.rate;

  /** Shop / preview model: soldier standing on a tactical Spec-Ops pedestal ring */
  function model() {
    const root = new T.Group(), rig = WZ.Heroes.soldier();
    rig.root.scale.setScalar(1.05);
    rig.setMode('aim');
    for (let i = 0; i < 30; i++) rig.update(1 / 60);
    root.add(rig.root);
    const ring = new T.Mesh(
      new T.RingGeometry(0.95, 1.18, 36).rotateX(-Math.PI / 2),
      new T.MeshBasicMaterial({ color: 0x38F2FF, transparent: true, opacity: 0.65, side: T.DoubleSide })
    );
    ring.position.y = 0.04;
    root.add(ring);
    return {
      root,
      headG: rig.head,
      spin(dt) { rig.update(dt); },
      dispose() { rig.dispose(); ring.geometry.dispose(); ring.material.dispose(); },
    };
  }

  const S = {
    ctx: null, list: [], cd: 0, noteT: 0, deployed: 0, kills: 0,

    stock() { const v = WZ.Save.data.inv; return (v && v.soldiers) | 0; },
    get count() { return S.list.length; },
    cdPct() { const C = CFG.soldier; return S.cd <= 0 ? 1 : Math.max(0, 1 - S.cd / C.cooldown); },
    model,

    init(ctx) {
      S.dispose();
      S.ctx = ctx; S.list = []; S.cd = 0; S.noteT = 0; S.deployed = 0; S.kills = 0;
      if (!ringGeo) ringGeo = new T.RingGeometry(0.85, 1.08, 32).rotateX(-Math.PI / 2);
    },

    note(key) {
      const J = S.ctx.jeep;
      if (S.noteT > 0) return;
      S.noteT = 0.8;
      WZ.Audio.sfx('beep');
      WZ.Fx.text(WZ.I18n.t(key), J.rx, J.ry + 6, J.rz, 'warn');
    },

    /** Deploy a combat soldier at the current location on the map */
    deploy() {
      const c = S.ctx, C = CFG.soldier;
      if (!c || !C) return false;
      const J = c.jeep;
      if (!J.alive) return false;
      if (S.stock() <= 0) { S.note('hud.nosoldiers'); return false; }
      if (S.cd > 0) return false;

      const sn = Math.sin(J.h), cs = Math.cos(J.h), back = -(J.P.halfLen + C.behind);
      const cand = [[back, 0], [0, -3.8], [0, 3.8], [back, -2.6], [back, 2.6], [-back * 0.85, 0]];
      for (let r = 1; r <= 3; r++) {
        for (let k = 0; k < 8; k++) {
          const a = k * Math.PI / 4 + r * 0.35;
          cand.push([Math.cos(a) * 4.0 * r, Math.sin(a) * 4.0 * r]);
        }
      }
      let spot = null;
      for (let pass = 0; pass < 2 && !spot; pass++) {
        for (const [d, side] of cand) {
          const jit = pass ? 0.8 : 0;
          const x = J.x + sn * d + cs * side + (Math.random() - 0.5) * jit;
          const z = J.z + cs * d - sn * side + (Math.random() - 0.5) * jit;
          if (!c.col.free(x, z, C.radius + 0.3)) continue;
          if (!pass) {
            let clash = false;
            for (const o of S.list) if (o.active && Math.hypot(o.x - x, o.z - z) < 2.0) { clash = true; break; }
            if (clash) continue;
          }
          spot = { x, z }; break;
        }
      }
      if (!spot) { S.note('hud.turretBlocked'); return false; }

      const sv = WZ.Save.data;
      sv.inv.soldiers = Math.max(0, (sv.inv.soldiers | 0) - 1);
      WZ.Save.save();

      const gy = c.map.height(spot.x, spot.z);
      const rig = WZ.Heroes.soldier();
      rig.root.scale.setScalar(0.86);
      rig.root.position.set(spot.x, gy, spot.z);
      rig.root.rotation.y = J.h;
      rig.setMode('jump');
      rig.punch(0.85);

      const ringMat = new T.MeshBasicMaterial({ color: 0x38F2FF, transparent: true, opacity: 0.6, depthWrite: false, side: T.DoubleSide });
      const ring = new T.Mesh(ringGeo, ringMat);
      ring.position.set(spot.x, gy + 0.08, spot.z);
      c.scene.add(rig.root, ring);

      const maxHp = Math.round(C.hp * (1 + tech() * 0.15));
      const maxLife = C.life * mulLife();
      const unit = {
        soldier: true, active: true, dying: false, koT: 0,
        x: spot.x, z: spot.z, px: spot.x, pz: spot.z, ax: spot.x, az: spot.z,
        rx: spot.x, ry: gy, rz: spot.z,
        vx: 0, vz: 0, h: J.h, ph: J.h,
        hp: maxHp, maxHp, life: maxLife, maxLife,
        jumpT: 0.36, iframes: 0.35,
        rig, ring, ringMat,
        target: null, retarget: 0, cdF: 0.25, sfxN: 0,
        wanderT: 1.5, wx: spot.x, wz: spot.z, moving: false, strafe: Math.random() < 0.5 ? 1 : -1, strafeT: 2,
      };
      S.list.push(unit);
      S.cd = C.cooldown;
      S.deployed++;

      WZ.Audio.sfx('deploy');
      c.particles.dust(spot.x, gy, spot.z, 7);
      c.particles.poof(spot.x, gy + 0.6, spot.z, 6, 1.3);
      WZ.Fx.text(WZ.I18n.t('hud.soldierOn'), spot.x, gy + 4.2, spot.z, 'good');
      return true;
    },

    /** Closest living soldier within radius r, or null (used by Enemies & Giants to target soldiers) */
    nearest(x, z, r) {
      let best = null, bd = r * r;
      for (let i = 0; i < S.list.length; i++) {
        const s = S.list[i];
        if (!s.active || s.dying) continue;
        const d = (s.x - x) * (s.x - x) + (s.z - z) * (s.z - z);
        if (d < bd) { bd = d; best = s; }
      }
      return best;
    },

    /** Deal damage to a soldier (from enemy melee, enemy bullets, or giant attacks) */
    hurt(s, dmg, kx, kz) {
      if (!s || !s.active || s.dying || s.iframes > 0) return false;
      const c = S.ctx;
      s.hp -= dmg;
      s.iframes = 0.18;
      s.rig.flash(0.85);
      s.rig.punch(-0.6);
      if (kx || kz) { s.vx += kx * 0.5; s.vz += kz * 0.5; }
      if (c && c.particles) c.particles.sparks(s.x, s.ry + 1.8, s.z, 5, 0.3, 0.9, 1);
      WZ.Audio.sfx('hurt', 0.45);
      if (s.hp <= 0) {
        s.hp = 0; s.active = false; s.dying = true; s.koT = 0;
        s.rig.setMode('ko');
        s.ring.visible = false;
        WZ.Audio.sfx('ko', 0.8);
        if (c && c.particles) {
          c.particles.poof(s.x, s.ry + 1.2, s.z, 10, 1.6);
          c.particles.stars(s.x, s.ry + 3.0, s.z, 5);
        }
        WZ.Fx.text(WZ.I18n.t('hud.soldierDown'), s.x, s.ry + 4.4, s.z, 'warn');
        return true;
      }
      return false;
    },

    /** Area damage from giant slams / fire / shells / waves */
    splashHurt(x, z, r, dmg) {
      for (let i = 0; i < S.list.length; i++) {
        const s = S.list[i];
        if (!s.active || s.dying) continue;
        const dx = s.x - x, dz = s.z - z, d = Math.hypot(dx, dz);
        if (d <= r + CFG.soldier.radius) {
          const l = d || 1;
          S.hurt(s, dmg, dx / l * 8, dz / l * 8);
        }
      }
    },

    remove(k) {
      const s = S.list[k], sc = S.ctx && S.ctx.scene;
      if (sc) sc.remove(s.rig.root, s.ring);
      s.rig.dispose();
      s.ringMat.dispose();
      S.list.splice(k, 1);
    },

    update(dt) {
      const c = S.ctx, C = CFG.soldier;
      if (!c) return;
      if (S.cd > 0) S.cd -= dt;
      if (S.noteT > 0) S.noteT -= dt;
      if (!S.list.length) return;

      const E = c.enemies, J = c.jeep, P = c.particles, dm = mulDmg(), rm = mulRate();

      for (let k = S.list.length - 1; k >= 0; k--) {
        const s = S.list[k];
        s.px = s.x; s.pz = s.z; s.ph = s.h;

        if (s.dying) {
          s.koT += dt;
          s.x += s.vx * dt; s.z += s.vz * dt;
          s.vx *= Math.exp(-4 * dt); s.vz *= Math.exp(-4 * dt);
          c.col.resolve(s, C.radius);
          if (s.koT >= 0.95) {
            P.poof(s.x, s.ry + 1.0, s.z, 8, 1.4);
            S.remove(k);
          }
          continue;
        }

        s.life -= dt;
        if (s.iframes > 0) s.iframes -= dt;
        if (s.jumpT > 0) s.jumpT -= dt;

        // Lifetime expired: soldier packs up and leaves the battlefield
        if (s.life <= 0) {
          P.poof(s.x, s.ry + 1.0, s.z, 10, 1.5);
          WZ.Audio.sfx('thud', 0.6);
          S.remove(k);
          continue;
        }

        // Knockback decay
        if (Math.abs(s.vx) + Math.abs(s.vz) > 0.04) {
          s.x += s.vx * dt; s.z += s.vz * dt;
          const dr = Math.exp(-6 * dt); s.vx *= dr; s.vz *= dr;
        }

        // Retarget nearest enemy or giant
        s.retarget -= dt;
        if (s.retarget <= 0 || !s.target || !s.target.active || s.target.state === 2) {
          s.retarget = 0.14;
          s.target = E.nearest(s.x, s.z, C.range);
        }

        const tg = s.target;
        s.moving = false;
        let err = 9;

        if (tg) {
          const dx = tg.x - s.x, dz = tg.z - s.z, d = Math.hypot(dx, dz) || 1;
          const wantH = Math.atan2(dx, dz);
          err = U.angDiff(s.h, wantH);
          s.h += U.clamp(err, -C.turnSpeed * dt, C.turnSpeed * dt);

          s.strafeT -= dt;
          if (s.strafeT <= 0) { s.strafeT = 1.6 + Math.random() * 1.6; s.strafe = -s.strafe; }

          const anchorDist = Math.hypot(s.x - s.ax, s.z - s.az);
          if (d > C.stopDist && anchorDist < C.patrol) {
            // Advance toward enemy
            const sp = C.speed * 0.88;
            s.x += (dx / d) * sp * dt;
            s.z += (dz / d) * sp * dt;
            s.moving = true;
          } else if (d < 5.5) {
            // Backpedal + strafe when enemy gets too close
            const sp = C.speed * 0.78;
            const sx = -dx / d * 0.7 + (dz / d) * s.strafe * 0.5;
            const sz = -dz / d * 0.7 - (dx / d) * s.strafe * 0.5;
            s.x += sx * sp * dt;
            s.z += sz * sp * dt;
            s.moving = true;
          } else {
            // Tactical strafe while firing
            const sp = C.speed * 0.42;
            s.x += (dz / d) * s.strafe * sp * dt;
            s.z -= (dx / d) * s.strafe * sp * dt;
            s.moving = true;
          }
        } else {
          // Patrol around drop anchor
          s.wanderT -= dt;
          if (s.wanderT <= 0) {
            s.wanderT = 2.0 + Math.random() * 2.5;
            const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 4.5;
            s.wx = s.ax + Math.cos(a) * r;
            s.wz = s.az + Math.sin(a) * r;
          }
          const dx = s.wx - s.x, dz = s.wz - s.z, d = Math.hypot(dx, dz);
          if (d > 0.65) {
            const wantH = Math.atan2(dx, dz);
            s.h += U.clamp(U.angDiff(s.h, wantH), -8 * dt, 8 * dt);
            const sp = C.speed * 0.55;
            s.x += (dx / d) * Math.min(sp * dt, d);
            s.z += (dz / d) * Math.min(sp * dt, d);
            s.moving = true;
          }
        }

        // Keep out of walls, jeep, and other soldiers
        c.col.resolve(s, C.radius);
        if (J.alive) {
          const jx = s.x - J.x, jz = s.z - J.z, jd = Math.hypot(jx, jz), minJ = J.P.radius + C.radius + 0.3;
          if (jd < minJ && jd > 1e-3) {
            s.x += (jx / jd) * (minJ - jd);
            s.z += (jz / jd) * (minJ - jd);
          }
        }
        for (let q = k + 1; q < S.list.length; q++) {
          const o = S.list[q];
          if (!o.active) continue;
          const ox = s.x - o.x, oz = s.z - o.z, od = Math.hypot(ox, oz), md = C.radius * 2 + 0.35;
          if (od < md && od > 1e-3) {
            const push = (md - od) * 0.5;
            s.x += (ox / od) * push; s.z += (oz / od) * push;
            o.x -= (ox / od) * push; o.z -= (oz / od) * push;
          }
        }

        // Fire assault rifle at target
        s.cdF -= dt;
        if (tg && Math.abs(err) < C.aim && s.cdF <= 0) {
          s.cdF = 1 / (C.rate * rm);
          s.rig.shootKick = 1;
          const sn = Math.sin(s.h), cs = Math.cos(s.h);
          const mx = s.x + sn * 1.45 + cs * 0.12, mz = s.z + cs * 1.45 - sn * 0.12, my = s.ry + 1.45;
          const ty = c.map.height(tg.x, tg.z) + (tg.giant ? 3.2 : 1.65);
          const dx = tg.x - s.x, dz = tg.z - s.z, dl = Math.hypot(dx, dz) || 1;
          WZ.Gun._tracer(mx, my, mz, tg.x + (Math.random() - 0.5) * 0.45, ty, tg.z + (Math.random() - 0.5) * 0.45);
          P.muzzle(mx, my, mz);
          if (E.damage(tg, C.damage * dm, (dx / dl) * C.knock, (dz / dl) * C.knock, 'soldier')) S.kills++;
          if ((s.sfxN++ & 1) === 0) WZ.Audio.sfx('gun', 0.42);
        }
      }
    },

    render(alpha, dt, tm) {
      const c = S.ctx;
      if (!c || !S.list.length) return;
      const hm = c.map.height, BL = WZ.Blobs;
      for (let i = 0; i < S.list.length; i++) {
        const s = S.list[i];
        const x = U.lerp(s.px, s.x, alpha), z = U.lerp(s.pz, s.z, alpha);
        const h = s.ph + U.angDiff(s.ph, s.h) * alpha;
        let y = hm(x, z);
        if (s.jumpT > 0) y += Math.sin((1 - s.jumpT / 0.36) * Math.PI) * 1.9;
        s.rx = x; s.ry = y; s.rz = z;
        s.rig.root.position.set(x, y, z);
        s.rig.root.rotation.y = h;
        s.ring.position.set(x, y + 0.08, z);

        if (s.dying) {
          s.rig.setMode('ko');
        } else if (s.jumpT > 0) {
          s.rig.setMode('jump');
        } else if (s.moving) {
          s.rig.setMode('run');
          s.rig.speed01 = 0.85;
        } else {
          s.rig.setMode('aim');
        }
        s.rig.update(dt);

        const low = s.life < 5;
        s.ringMat.color.setHex(s.hp / s.maxHp < 0.35 ? 0xFF5A3A : low ? 0xFFB400 : 0x38F2FF);
        s.ringMat.opacity = low ? (0.25 + 0.45 * Math.abs(Math.sin(tm * 8))) : 0.55;
        if (BL && !s.dying) BL.add(x, hm(x, z), z, 2.2);
      }
    },

    /** Project overhead HP & stamina gauges for active soldiers */
    bars(cam, w, h) {
      const UI = WZ.UI;
      if (!UI || !UI.setSoldierBar) return;
      let n = 0;
      for (let i = 0; i < S.list.length; i++) {
        const s = S.list[i];
        if (!s.active || s.dying) continue;
        v3.set(s.rx, s.ry + 3.15, s.rz).project(cam);
        if (v3.z > 1 || Math.abs(v3.x) > 1.08 || Math.abs(v3.y) > 1.08) continue;
        if (n < UI.soldierBarMax) {
          UI.setSoldierBar(n++, (v3.x * 0.5 + 0.5) * w, (-v3.y * 0.5 + 0.5) * h, s.hp / s.maxHp, s.life / s.maxLife);
        }
      }
      UI.hideSoldierBars(n);
    },

    dispose() {
      if (S.ctx) {
        for (let k = S.list.length - 1; k >= 0; k--) S.remove(k);
      }
      if (WZ.UI && WZ.UI.hideSoldierBars) WZ.UI.hideSoldierBars(0);
      S.list = []; S.ctx = null;
    },
  };

  WZ.Soldiers = S;
})(window.WZ = window.WZ || {});
