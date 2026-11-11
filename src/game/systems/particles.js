/* WZ.Particles — three instanced billboard pools (SOFT smoke/dust, GLOW additive sparks/fire, STAR) with per-instance
 * alpha via a tiny shader patch. WZ.Blobs — instanced soft blob shadows. No per-frame allocations. */
(function (WZ) {
  'use strict';
  const T = THREE;
  const SOFT = 0, GLOW = 1, STAR = 2;

  function patchAlpha(mat) {
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aAlpha;\nvarying float vAlpha;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vAlpha;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vAlpha;');
    };
  }

  class Pool {
    constructor(scene, max, texKey, additive) {
      this.max = max; this.n = 0;
      const f = (k) => new Float32Array(max * k);
      this.pos = f(3); this.vel = f(3); this.life = f(1); this.age = f(1); this.s0 = f(1); this.s1 = f(1);
      this.col = f(3); this.a0 = f(1); this.a1 = f(1); this.grav = f(1); this.drag = f(1);
      const geo = new T.PlaneGeometry(1, 1);
      this.alpha = new T.InstancedBufferAttribute(new Float32Array(max), 1); this.alpha.setUsage(T.DynamicDrawUsage);
      geo.setAttribute('aAlpha', this.alpha);
      const mat = new T.MeshBasicMaterial({ map: WZ.Assets.tex(texKey), transparent: true, depthWrite: false, fog: !additive, blending: additive ? T.AdditiveBlending : T.NormalBlending });
      patchAlpha(mat);
      const m = new T.InstancedMesh(geo, mat, max);
      m.frustumCulled = false; m.renderOrder = 20; m.count = 0;
      m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      m.setColorAt(0, new T.Color(1, 1, 1)); m.instanceColor.setUsage(T.DynamicDrawUsage);
      this.mesh = m; scene.add(m);
    }
    emit(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a0, a1, grav, drag) {
      let i;
      if (this.n < this.max) i = this.n++; else i = (Math.random() * this.max) | 0; // recycle a random one when full
      const p = this.pos, v = this.vel, c = this.col;
      p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z; v[i * 3] = vx; v[i * 3 + 1] = vy; v[i * 3 + 2] = vz;
      this.life[i] = life; this.age[i] = 0; this.s0[i] = s0; this.s1[i] = s1;
      c[i * 3] = r; c[i * 3 + 1] = g; c[i * 3 + 2] = b; this.a0[i] = a0; this.a1[i] = a1; this.grav[i] = grav || 0; this.drag[i] = drag || 0;
    }
    remove(i) {
      const l = --this.n; if (i === l) return;
      const mv = (arr, k) => { for (let j = 0; j < k; j++) arr[i * k + j] = arr[l * k + j]; };
      mv(this.pos, 3); mv(this.vel, 3); mv(this.life, 1); mv(this.age, 1); mv(this.s0, 1); mv(this.s1, 1); mv(this.col, 3); mv(this.a0, 1); mv(this.a1, 1); mv(this.grav, 1); mv(this.drag, 1);
    }
    update(dt, right, up, fwd) {
      const arr = this.mesh.instanceMatrix.array, ca = this.mesh.instanceColor.array, al = this.alpha.array;
      for (let i = 0; i < this.n;) {
        const age = (this.age[i] += dt), life = this.life[i];
        if (age >= life) { this.remove(i); continue; }
        const k = age / life, dr = Math.exp(-this.drag[i] * dt);
        const p = this.pos, v = this.vel;
        v[i * 3] *= dr; v[i * 3 + 1] = v[i * 3 + 1] * dr + this.grav[i] * dt; v[i * 3 + 2] *= dr;
        p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
        const s = this.s0[i] + (this.s1[i] - this.s0[i]) * k, o = i * 16;
        arr[o] = right[0] * s; arr[o + 1] = right[1] * s; arr[o + 2] = right[2] * s; arr[o + 3] = 0;
        arr[o + 4] = up[0] * s; arr[o + 5] = up[1] * s; arr[o + 6] = up[2] * s; arr[o + 7] = 0;
        arr[o + 8] = fwd[0] * s; arr[o + 9] = fwd[1] * s; arr[o + 10] = fwd[2] * s; arr[o + 11] = 0;
        arr[o + 12] = p[i * 3]; arr[o + 13] = p[i * 3 + 1]; arr[o + 14] = p[i * 3 + 2]; arr[o + 15] = 1;
        ca[i * 3] = this.col[i * 3]; ca[i * 3 + 1] = this.col[i * 3 + 1]; ca[i * 3 + 2] = this.col[i * 3 + 2];
        al[i] = this.a0[i] + (this.a1[i] - this.a0[i]) * k;
        i++;
      }
      this.mesh.count = this.n;
      this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true; this.alpha.needsUpdate = true;
    }
  }

  const PT = {
    SOFT, GLOW, STAR, ready: false, pools: null, scene: null,
    _r: [0, 0, 0], _u: [0, 0, 0], _f: [0, 0, 0],

    init(scene) {
      PT.scene = scene;
      PT.pools = [new Pool(scene, 460, 'soft', false), new Pool(scene, 460, 'glow', true), new Pool(scene, 80, 'star', false)];
      PT.ready = true;
    },
    emit(pool, x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a0, a1, grav, drag) {
      if (!PT.ready) return;
      PT.pools[pool].emit(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, a0, a1, grav, drag);
    },
    update(dt, camera) {
      if (!PT.ready) return;
      const e = camera.matrixWorld.elements;
      PT._r[0] = e[0]; PT._r[1] = e[1]; PT._r[2] = e[2]; PT._u[0] = e[4]; PT._u[1] = e[5]; PT._u[2] = e[6]; PT._f[0] = e[8]; PT._f[1] = e[9]; PT._f[2] = e[10];
      for (let i = 0; i < 3; i++) PT.pools[i].update(dt, PT._r, PT._u, PT._f);
    },
    clear() { if (PT.ready) PT.pools.forEach((p) => { p.n = 0; p.mesh.count = 0; }); },
    dispose() {
      if (!PT.ready) return;
      PT.pools.forEach((p) => { PT.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); p.mesh.dispose(); });
      PT.ready = false; PT.pools = null;
    },

    // ----- convenience recipes (density scales with quality)
    dens() { return WZ.Quality ? WZ.THREEQ || 1 : 1; },
    dust(x, y, z, n, vx, vz) {
      for (let i = 0; i < n; i++) PT.emit(SOFT, x + (Math.random() - 0.5) * 1.2, y + 0.3, z + (Math.random() - 0.5) * 1.2, (vx || 0) * 0.15 + (Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, (vz || 0) * 0.15 + (Math.random() - 0.5) * 2, 0.7 + Math.random() * 0.4, 0.8, 2.8, 0.72, 0.6, 0.4, 0.5, 0, 0, 1.2);
    },
    poof(x, y, z, n, size) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, sp = 2 + Math.random() * 4;
        PT.emit(SOFT, x, y, z, Math.cos(a) * sp, 1 + Math.random() * 3, Math.sin(a) * sp, 0.5 + Math.random() * 0.3, (size || 1) * 0.8, (size || 1) * 3.2, 0.95, 0.95, 0.95, 0.85, 0, 0, 3);
      }
    },
    sparks(x, y, z, n, r, g, b) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, sp = 3 + Math.random() * 7;
        PT.emit(GLOW, x, y, z, Math.cos(a) * sp, 2 + Math.random() * 6, Math.sin(a) * sp, 0.25 + Math.random() * 0.25, 0.5, 0.1, r == null ? 1 : r, g == null ? 0.8 : g, b == null ? 0.3 : b, 1, 0, -22, 1);
      }
    },
    muzzle(x, y, z) { PT.emit(GLOW, x, y, z, 0, 0, 0, 0.07, 1.8, 0.8, 1, 0.85, 0.4, 1, 0, 0, 0); },
    stars(x, y, z, n) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.28 + Math.random();
        PT.emit(STAR, x + Math.cos(a) * 0.9, y, z + Math.sin(a) * 0.9, Math.cos(a + 1.57) * 2.2, 1.2 + Math.random(), Math.sin(a + 1.57) * 2.2, 0.8 + Math.random() * 0.3, 0.9, 0.5, 1, 0.8, 0.1, 1, 0, -2, 0.6);
      }
    },
    confetti(x, y, z, n) {
      const cs = [[1, 0.7, 0], [1, 1, 1], [0.3, 0.9, 0.4], [0.9, 0.3, 0.2]];
      for (let i = 0; i < n; i++) {
        const c = cs[i % 4], a = Math.random() * 6.28, sp = 3 + Math.random() * 7;
        PT.emit(GLOW, x, y, z, Math.cos(a) * sp, 8 + Math.random() * 8, Math.sin(a) * sp, 1.2 + Math.random() * 0.8, 0.5, 0.35, c[0], c[1], c[2], 1, 0, -16, 0.8);
      }
    },
  };

  // ------------------------------------------------------------------ blob shadows
  const BL = {
    mesh: null, n: 0, max: 0,
    init(scene, max) {
      BL.max = max; BL.n = 0;
      const geo = new T.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
      const mat = new T.MeshBasicMaterial({ map: WZ.Assets.tex('blob'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      BL.mesh = new T.InstancedMesh(geo, mat, max); BL.mesh.frustumCulled = false; BL.mesh.count = 0; BL.mesh.renderOrder = 2;
      scene.add(BL.mesh);
    },
    begin() { BL.n = 0; },
    add(x, y, z, size) {
      if (BL.n >= BL.max) return;
      const a = BL.mesh.instanceMatrix.array, o = BL.n * 16;
      a[o] = size; a[o + 1] = 0; a[o + 2] = 0; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = 1; a[o + 6] = 0; a[o + 7] = 0; a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = size; a[o + 11] = 0;
      a[o + 12] = x; a[o + 13] = y + 0.08; a[o + 14] = z; a[o + 15] = 1; BL.n++;
    },
    end() { BL.mesh.count = BL.n; BL.mesh.instanceMatrix.needsUpdate = true; },
    dispose(scene) { if (!BL.mesh) return; scene.remove(BL.mesh); BL.mesh.geometry.dispose(); BL.mesh.material.dispose(); BL.mesh.dispose(); BL.mesh = null; },
  };

  WZ.Particles = PT;
  WZ.Blobs = BL;
})(window.WZ = window.WZ || {});
