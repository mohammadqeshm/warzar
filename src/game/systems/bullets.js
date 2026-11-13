/* WZ.Bullets — projectiles fired BY ENEMIES at Nana (instanced glowing slugs).
 * Slugs fly in a straight line (aimed at where Nana is going, with a partial lead), are blocked by walls/buildings
 * (so cover works) and hurt Nana on contact. A moving Nana can dodge them; a standing/grabbing Nana is a sitting duck. */
(function (WZ) {
  'use strict';
  const T = THREE, MAX = 40, HIT_R = 1.15, LIFE = 2.2;
  const m4 = new T.Matrix4(), qI = new T.Quaternion(), vp = new T.Vector3(), vs = new T.Vector3();

  const B = {
    ctx: null, mesh: null, glow: null, n: 0,
    x: new Float32Array(MAX), y: new Float32Array(MAX), z: new Float32Array(MAX),
    vx: new Float32Array(MAX), vz: new Float32Array(MAX), dmg: new Float32Array(MAX), life: new Float32Array(MAX), size: new Float32Array(MAX),

    init(ctx) {
      B.dispose(); B.ctx = ctx; B.n = 0;
      B.mesh = new T.InstancedMesh(new T.SphereGeometry(0.3, 8, 6), new T.MeshBasicMaterial({ color: 0xFF5A24 }), MAX);
      B.glow = new T.InstancedMesh(new T.SphereGeometry(0.62, 8, 6), new T.MeshBasicMaterial({ color: 0xFFB020, transparent: true, opacity: 0.35, depthWrite: false }), MAX);
      for (const m of [B.mesh, B.glow]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(T.DynamicDrawUsage); ctx.scene.add(m); }
    },

    /** fire a slug from (sx,sy,sz) toward the ground point (tx,tz) */
    fire(sx, sy, sz, tx, tz, speed, dmg, big) {
      if (!B.ctx) return;
      const i = B.n < MAX ? B.n++ : 0;
      const dx = tx - sx, dz = tz - sz, l = Math.hypot(dx, dz) || 1;
      B.x[i] = sx; B.z[i] = sz; B.y[i] = sy; B.vx[i] = dx / l * speed; B.vz[i] = dz / l * speed; B.dmg[i] = dmg; B.life[i] = LIFE; B.size[i] = big ? 1.5 : 1;
      B.ctx.particles.muzzle(sx, B.ctx.map.height(sx, sz) + sy, sz);
    },

    remove(i) {
      const l = --B.n;
      if (i !== l) { B.x[i] = B.x[l]; B.y[i] = B.y[l]; B.z[i] = B.z[l]; B.vx[i] = B.vx[l]; B.vz[i] = B.vz[l]; B.dmg[i] = B.dmg[l]; B.life[i] = B.life[l]; B.size[i] = B.size[l]; }
    },

    update(dt) {
      const c = B.ctx; if (!c || !B.mesh) return;
      const N = c.nana, P = c.particles, hm = c.map.height;
      const target = N.out && !N.isKO && N.state !== 'BOARDING';
      for (let i = B.n - 1; i >= 0; i--) {
        B.life[i] -= dt;
        B.x[i] += B.vx[i] * dt; B.z[i] += B.vz[i] * dt;
        if (B.life[i] <= 0) { B.remove(i); continue; }
        if (!c.col.free(B.x[i], B.z[i], 0.15)) { P.sparks(B.x[i], hm(B.x[i], B.z[i]) + B.y[i], B.z[i], 3, 1, 0.7, 0.3); B.remove(i); continue; }
        if (target) {
          const dx = B.x[i] - N.x, dz = B.z[i] - N.z;
          if (dx * dx + dz * dz < HIT_R * HIT_R * B.size[i]) {
            const d = B.dmg[i], before = N.hp;
            N.hurt(d);
            if (N.hp < before) {
              P.sparks(N.x, N.ry + 2, N.z, 6, 1, 0.5, 0.2);
              WZ.Fx.text('-' + Math.max(1, Math.round(d * WZ.CFG.nana.damageMul)), N.rx, N.ry + 4.4, N.rz, 'warn');
            }
            B.remove(i);
            continue;
          }
        }
        if (WZ.Soldiers && WZ.Soldiers.list.length) {
          let hitSol = false;
          for (let k = 0; k < WZ.Soldiers.list.length; k++) {
            const s = WZ.Soldiers.list[k];
            if (!s.active || s.dying) continue;
            const dx = B.x[i] - s.x, dz = B.z[i] - s.z;
            if (dx * dx + dz * dz < HIT_R * HIT_R * B.size[i]) {
              const d = B.dmg[i];
              WZ.Soldiers.hurt(s, d, B.vx[i] * 0.12, B.vz[i] * 0.12);
              WZ.Fx.text('-' + Math.max(1, Math.round(d)), s.rx, s.ry + 4.0, s.rz, 'warn');
              B.remove(i);
              hitSol = true;
              break;
            }
          }
          if (hitSol) continue;
        }
      }
      for (let i = 0; i < B.n; i++) {
        const s = B.size[i], y = hm(B.x[i], B.z[i]) + B.y[i];
        m4.compose(vp.set(B.x[i], y, B.z[i]), qI, vs.set(s, s, s)); B.mesh.setMatrixAt(i, m4);
        m4.compose(vp.set(B.x[i], y, B.z[i]), qI, vs.set(s * (0.9 + Math.random() * 0.25), s, s)); B.glow.setMatrixAt(i, m4);
      }
      B.mesh.count = B.glow.count = B.n;
      B.mesh.instanceMatrix.needsUpdate = B.glow.instanceMatrix.needsUpdate = true;
    },

    dispose() {
      for (const m of [B.mesh, B.glow]) if (m) { if (B.ctx) B.ctx.scene.remove(m); m.geometry.dispose(); m.material.dispose(); m.dispose(); }
      B.mesh = B.glow = null; B.ctx = null; B.n = 0;
    },
  };
  WZ.Bullets = B;
})(window.WZ = window.WZ || {});
