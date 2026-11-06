/* WZ.Gun — roof gun: auto-aims at the nearest enemy in range and fires continuously.
 * STATIONARY BONUS: +50% fire rate and +25% damage while the jeep moves slower than 3 u/s. Tracers are instanced. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, U = WZ.U, GN = CFG.gun;
  const MAXT = 24;
  const mv = new T.Vector3(), d = new T.Object3D();

  const Gun = {
    cd: 0, retarget: 0, target: null, boosted: false, firing: false, mesh: null, scene: null,
    sx: new Float32Array(MAXT), sy: new Float32Array(MAXT), sz: new Float32Array(MAXT), ex: new Float32Array(MAXT), ey: new Float32Array(MAXT), ez: new Float32Array(MAXT), life: new Float32Array(MAXT), n: 0,

    init(scene) {
      Gun.scene = scene; Gun.cd = 0; Gun.target = null; Gun.n = 0;
      Gun.mesh = new T.InstancedMesh(WZ.Geo.box1, new T.MeshBasicMaterial({ color: 0xFFE27A, fog: false }), MAXT);
      Gun.mesh.frustumCulled = false; Gun.mesh.count = 0; Gun.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); scene.add(Gun.mesh);
    },

    update(dt, ctx) {
      const jeep = ctx.jeep, E = ctx.enemies, yawG = jeep.model.gunYaw;
      Gun.firing = false;
      if (!jeep.alive) return;
      Gun.retarget -= dt;
      if (Gun.retarget <= 0 || !Gun.target || !Gun.target.active || Gun.target.state === 2) {
        Gun.retarget = 0.1; Gun.target = E.nearest(jeep.x, jeep.z, GN.range);
      }
      const t = Gun.target;
      let err = 0;
      if (t) {
        const dx = t.x - jeep.x, dz = t.z - jeep.z;
        if (dx * dx + dz * dz > GN.range * GN.range) { Gun.target = null; }
        else {
          const want = U.clamp(U.angDiff(jeep.h, Math.atan2(dx, dz)), -3.0, 3.0);
          err = U.angDiff(yawG.rotation.y, want);
          yawG.rotation.y += U.clamp(err, -GN.turnSpeed * dt, GN.turnSpeed * dt);
        }
      } else yawG.rotation.y = U.damp(yawG.rotation.y, 0, 3, dt);
      jeep.cmdr.lookYaw = U.clamp(yawG.rotation.y * 0.5, -0.9, 0.9);

      const still = jeep.speed < GN.stationarySpeed;
      Gun.boosted = still && !!Gun.target;
      const interval = 1 / (GN.rate * (still ? GN.stationaryRate : 1));
      Gun.cd -= dt;
      if (Gun.target && Math.abs(err) < 0.22) {
        Gun.firing = true;
        while (Gun.cd <= 0) {
          Gun.cd += interval;
          const tg = Gun.target; if (!tg || !tg.active || tg.state === 2) break;
          const dmg = GN.damage * (still ? GN.stationaryDamage : 1);
          jeep.model.muzzle.getWorldPosition(mv);
          const gy = ctx.map.height(tg.x, tg.z) + 1.8;
          Gun._tracer(mv.x, mv.y, mv.z, tg.x + (Math.random() - 0.5) * 0.5, gy, tg.z + (Math.random() - 0.5) * 0.5);
          ctx.particles.muzzle(mv.x, mv.y, mv.z);
          E.damage(tg, dmg, 0, 0, 'gun');
          WZ.Audio.sfx('gun', 0.8);
        }
        if (Gun.cd < -interval) Gun.cd = 0;
      } else if (Gun.cd < 0) Gun.cd = 0;
    },

    _tracer(sx, sy, sz, ex, ey, ez) {
      const i = Gun.n < MAXT ? Gun.n++ : 0;
      Gun.sx[i] = sx; Gun.sy[i] = sy; Gun.sz[i] = sz; Gun.ex[i] = ex; Gun.ey[i] = ey; Gun.ez[i] = ez; Gun.life[i] = GN.tracerLife;
    },

    render(dt) {
      for (let i = 0; i < Gun.n;) {
        Gun.life[i] -= dt;
        if (Gun.life[i] <= 0) { // swap-remove
          const l = --Gun.n;
          if (i !== l) { Gun.sx[i] = Gun.sx[l]; Gun.sy[i] = Gun.sy[l]; Gun.sz[i] = Gun.sz[l]; Gun.ex[i] = Gun.ex[l]; Gun.ey[i] = Gun.ey[l]; Gun.ez[i] = Gun.ez[l]; Gun.life[i] = Gun.life[l]; }
          continue;
        }
        const k = 1 - Gun.life[i] / GN.tracerLife, hx = Gun.ex[i] - Gun.sx[i], hy = Gun.ey[i] - Gun.sy[i], hz = Gun.ez[i] - Gun.sz[i], len = Math.hypot(hx, hy, hz);
        const a = Math.max(0, k - 0.35), b = Math.min(1, k + 0.05);
        d.position.set(Gun.sx[i] + hx * (a + b) / 2, Gun.sy[i] + hy * (a + b) / 2, Gun.sz[i] + hz * (a + b) / 2);
        d.lookAt(Gun.ex[i], Gun.ey[i], Gun.ez[i]); d.scale.set(0.13, 0.13, Math.max(0.5, len * (b - a))); d.updateMatrix();
        Gun.mesh.setMatrixAt(i, d.matrix); i++;
      }
      Gun.mesh.count = Gun.n; Gun.mesh.instanceMatrix.needsUpdate = true;
    },

    dispose() { if (Gun.mesh) { Gun.scene.remove(Gun.mesh); Gun.mesh.material.dispose(); Gun.mesh.dispose(); Gun.mesh = null; } Gun.target = null; },
  };
  WZ.Gun = Gun;
})(window.WZ = window.WZ || {});
