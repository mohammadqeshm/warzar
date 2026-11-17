/* WZ.Fire — big explosions + the vehicle ON FIRE effect.
 *
 *   WZ.Fire.explode(x, y, z, opts)   blinding flash, expanding fireball dome, ground shockwave rings, fire column, rolling smoke, sparks,
 *                                    flying barrel debris (ballistic, bouncing, trailing fire), a scorch mark and a short-lived ground fire.
 *   WZ.Fire.ignite(seconds)          sets the player's vehicle on fire: flame tongues are glued to the body (they lean back with speed and die
 *                                    down one by one) + flames / smoke / embers stream off it. Pure visual: it never slows or damages the vehicle.
 *   WZ.Fire.shell(x, y, z)           small blast used by the escort tank's cannon.
 *
 * Everything is pooled (fixed meshes / instanced meshes, no per-frame allocation in the hot paths). Numbers live in CFG.hazards.barrels. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, BC = CFG.hazards.barrels;
  const SOFT = 0, GLOW = 1;
  const NB = 12, ND = 44, NS = 28, NG = 12;
  const PAL = [[1, 0.93, 0.5], [1, 0.64, 0.18], [1, 0.42, 0.1], [0.95, 0.26, 0.06]];
  const DEB = [0xd9241e, 0xb01c16, 0x1e2024, 0xffb400, 0x6a6e73];
  const m4 = new T.Matrix4(), qa = new T.Quaternion(), ea = new T.Euler(), vp = new T.Vector3(), vs = new T.Vector3(), col = new T.Color();
  const rnd = Math.random, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const cnt = (n) => Math.max(1, Math.round(n * (CFG.quality.particles[WZ.Quality ? WZ.Quality.level : 2] || 1)));

  /** flame tongue: lathe teardrop, base bright yellow -> tip deep red (additive, so darker = more transparent) */
  function flameGeo() {
    const pts = [[0.001, 0], [0.5, 0.1], [0.58, 0.32], [0.42, 0.62], [0.17, 0.88], [0.001, 1]].map((p) => new T.Vector2(p[0], p[1]));
    const g = new T.LatheGeometry(pts, 9), pos = g.attributes.position, c = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i); c[i * 3] = 1; c[i * 3 + 1] = 0.9 - y * 0.68; c[i * 3 + 2] = 0.35 - y * 0.33;
    }
    g.setAttribute('color', new T.BufferAttribute(c, 3));
    return g;
  }

  const F = {
    ctx: null, blasts: [], deb: null, debN: 0, debA: null, scorch: null, scN: 0, scI: 0, gfires: [], geos: [], mats: [],
    burn: { t: 0, dur: 0, on: false, grp: null, flames: [], cT: 0 },

    init(ctx) {
      F.dispose(); F.ctx = ctx; const sc = ctx.scene;
      const ring1 = new T.RingGeometry(0.84, 1.0, 56).rotateX(-Math.PI / 2), ring2 = new T.RingGeometry(0.55, 1.0, 56).rotateX(-Math.PI / 2);
      const sph = new T.SphereGeometry(1, 18, 12), fl = flameGeo();
      F.geos.push(ring1, ring2, sph, fl);
      const add = (o) => { const m = new T.MeshBasicMaterial(Object.assign({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false }, o)); F.mats.push(m); return m; };
      // explosion pool: ground shock ring, dust ring, fireball dome, white-hot core
      F.blasts = [];
      for (let i = 0; i < NB; i++) {
        const b = { on: false, t: 0, life: 0.85, x: 0, y: 0, z: 0, R: 6 };
        b.ring = new T.Mesh(ring1, add({ color: 0xFFC060 })); b.ring2 = new T.Mesh(ring2, add({ color: 0xFF6A1A }));
        b.dome = new T.Mesh(sph, add({ color: 0xFF7A1C })); b.core = new T.Mesh(sph, add({ color: 0xFFF2C0 }));
        for (const m of [b.ring, b.ring2, b.dome, b.core]) { m.visible = false; m.frustumCulled = false; m.renderOrder = 16; sc.add(m); }
        F.blasts.push(b);
      }
      // debris (barrel chunks)
      const dm = new T.MeshLambertMaterial({ color: 0xffffff }); F.mats.push(dm);
      const bx = new T.BoxGeometry(1, 1, 1); F.geos.push(bx);
      F.deb = new T.InstancedMesh(bx, dm, ND); F.deb.frustumCulled = false; F.deb.count = 0; F.deb.instanceMatrix.setUsage(T.DynamicDrawUsage);
      F.deb.setColorAt(0, col.setHex(0xd9241e)); F.deb.instanceColor.setUsage(T.DynamicDrawUsage); sc.add(F.deb);
      F.debA = []; for (let i = 0; i < ND; i++) F.debA.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, sx: 1, sy: 1, sz: 1, age: 0, life: 2, ci: 0, b: 0 });
      F.debN = 0;
      // scorch marks on the ground
      const sg = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); F.geos.push(sg);
      const sm = new T.MeshBasicMaterial({ map: WZ.Assets.tex('blob'), color: 0x120d08, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }); F.mats.push(sm);
      F.scorch = new T.InstancedMesh(sg, sm, NS); F.scorch.frustumCulled = false; F.scorch.count = 0; F.scorch.renderOrder = 3; sc.add(F.scorch); F.scN = 0; F.scI = 0;
      F.gfires = [];
      // flames glued to the vehicle
      const J = ctx.jeep, B = F.burn; B.t = 0; B.dur = 0; B.on = false; B.flames = []; B.cT = 0;
      if (J && J.model && J.model.bodyG) {
        const R = J.P.radius, L = J.P.halfLen, grp = new T.Group(); grp.visible = false; J.model.bodyG.add(grp); B.grp = grp;
        const outer = add({ vertexColors: true, color: 0xFF9030 }), inner = add({ vertexColors: true, color: 0xFFFFFF });
        const spots = [[0, 1.15, L * 0.75, 1.0], [-R * 0.62, 1.05, L * 0.35, 0.92], [R * 0.62, 1.05, L * 0.35, 0.92], [0, 2.0, -L * 0.1, 1.15], [-R * 0.6, 1.3, -L * 0.7, 0.95],
          [R * 0.6, 1.3, -L * 0.7, 0.95], [0, 1.4, -L * 0.95, 0.88], [-R * 0.3, 1.75, L * 0.15, 0.8], [R * 0.3, 1.75, L * 0.15, 0.8]];
        spots.forEach((s, i) => {
          const g = new T.Group(); g.position.set(s[0], s[1], s[2]);
          const o = new T.Mesh(fl, outer), n = new T.Mesh(fl, inner); o.frustumCulled = n.frustumCulled = false; o.renderOrder = n.renderOrder = 17;
          g.add(o, n); grp.add(g); g.visible = false;
          B.flames.push({ g, o, n, x: s[0], y: s[1], z: s[2], s: s[3], ph: rnd() * 6.28, th: i / spots.length * 0.86, f: 0 });
        });
      }
    },

    // ------------------------------------------------------------------ explosion
    /** opts: { scale, debris, groundFire (seconds), shake, flash, scorch, parts (particle multiplier), mute } */
    explode(x, y, z, opts) {
      const c = F.ctx; if (!c || !F.blasts.length) return;
      const o = opts || {}, sc = o.scale || 1, P = c.particles, dn = o.debris == null ? BC.debris : o.debris, pk = o.parts == null ? 1 : o.parts;
      const cnt = (n) => Math.max(1, Math.round(n * pk * (CFG.quality.particles[WZ.Quality ? WZ.Quality.level : 2] || 1)));   // `parts` thins out the particles for rapid-fire blasts (carpet bombing)
      // flash + fireball
      P.emit(GLOW, x, y + 0.6, z, 0, 0, 0, 0.15, 15 * sc, 21 * sc, 1, 0.95, 0.7, 1, 0, 0, 0);
      P.emit(GLOW, x, y + 1.0, z, 0, 0.6, 0, 0.34, 8 * sc, 15 * sc, 1, 0.6, 0.15, 0.9, 0, 0, 0);
      for (let i = 0, n = cnt(18); i < n; i++) {
        const a = rnd() * 6.283, el = rnd() * 1.15, sp = (3 + rnd() * 7) * sc, k = PAL[(rnd() * 4) | 0];
        P.emit(GLOW, x + (rnd() - 0.5) * 0.7, y + 0.3 + rnd() * 0.6, z + (rnd() - 0.5) * 0.7, Math.cos(a) * Math.cos(el) * sp, Math.sin(el) * sp * 0.9 + 2, Math.sin(a) * Math.cos(el) * sp,
          0.5 + rnd() * 0.55, (3.2 + rnd() * 2) * sc, (6.6 + rnd() * 3.2) * sc, k[0], k[1], k[2], 0.95, 0, 0, 2.2);
      }
      // rising fire column
      for (let i = 0, n = cnt(12); i < n; i++) {
        P.emit(GLOW, x + (rnd() - 0.5) * 1.3, y + 0.5, z + (rnd() - 0.5) * 1.3, (rnd() - 0.5) * 2.4, (5 + rnd() * 7) * sc, (rnd() - 0.5) * 2.4, 0.7 + rnd() * 0.6, (3.6 + rnd() * 1.4) * sc, 1.2, 1, 0.5 + rnd() * 0.2, 0.1, 0.9, 0, 3, 1.4);
      }
      // dark smoke + a tall grey plume
      for (let i = 0, n = cnt(16); i < n; i++) {
        const a = rnd() * 6.283, sp = (1 + rnd() * 4) * sc, v = 0.1 + rnd() * 0.14;
        P.emit(SOFT, x, y + 0.8, z, Math.cos(a) * sp, (2.5 + rnd() * 4) * sc, Math.sin(a) * sp, 1.3 + rnd() * 1.1, 2 * sc, (5 + rnd() * 3) * sc, v, v * 0.95, v * 0.9, 0.78, 0, 1.4, 1.1);
      }
      for (let i = 0, n = cnt(8); i < n; i++) {
        P.emit(SOFT, x + (rnd() - 0.5) * 1.5, y + 1.5, z + (rnd() - 0.5) * 1.5, (rnd() - 0.5) * 1.6, (7 + rnd() * 4) * sc, (rnd() - 0.5) * 1.6, 1.8 + rnd() * 0.9, 2.2 * sc, (7 + rnd() * 2.5) * sc, 0.34, 0.32, 0.3, 0.6, 0, 0.8, 1.5);
      }
      P.sparks(x, y + 0.6, z, cnt(38), 1, 0.7, 0.2); P.sparks(x, y + 1.3, z, cnt(16), 1, 0.95, 0.6); P.dust(x, y - 0.4, z, cnt(10));

      // dome + shockwave rings (pooled meshes)
      let b = null; for (const k of F.blasts) if (!k.on) { b = k; break; } if (!b) b = F.blasts[0];
      b.on = true; b.t = 0; b.life = 0.85; b.x = x; b.y = y; b.z = z; b.R = (BC.blast * 0.9) * sc;
      b.ring.visible = b.ring2.visible = b.dome.visible = b.core.visible = true; F.renderBlast(b);

      // flying debris
      for (let i = 0; i < dn; i++) {
        if (F.debN >= ND) break; const d = F.debA[F.debN++], a = rnd() * 6.283, sp = (5 + rnd() * 9) * sc;
        d.x = x + Math.cos(a) * 0.5; d.y = y + 0.3; d.z = z + Math.sin(a) * 0.5; d.vx = Math.cos(a) * sp; d.vz = Math.sin(a) * sp; d.vy = (9 + rnd() * 10) * sc;
        d.rx = rnd() * 6; d.ry = rnd() * 6; d.rz = rnd() * 6; d.wx = (rnd() - 0.5) * 22; d.wy = (rnd() - 0.5) * 22; d.wz = (rnd() - 0.5) * 22;
        d.sx = 0.28 + rnd() * 0.5; d.sy = 0.12 + rnd() * 0.3; d.sz = 0.28 + rnd() * 0.5; d.age = 0; d.life = 1.5 + rnd() * 0.9; d.ci = (rnd() * DEB.length) | 0; d.b = 0;
      }
      // scorch mark + lingering fire on the crater
      if (o.scorch !== 0) {
        const i = F.scI++ % NS, s = (o.scorch || 1) * 6.6 * sc * (0.9 + rnd() * 0.25), gy = c.map.height(x, z);
        ea.set(0, rnd() * 6.28, 0); m4.compose(vp.set(x, gy + 0.09, z), qa.setFromEuler(ea), vs.set(s, 1, s)); F.scorch.setMatrixAt(i, m4);
        F.scN = Math.min(NS, F.scN + 1); F.scorch.count = F.scN; F.scorch.instanceMatrix.needsUpdate = true;
      }
      const gf = o.groundFire == null ? BC.groundFire : o.groundFire;
      if (gf > 0) { if (F.gfires.length >= NG) F.gfires.shift(); F.gfires.push({ x, y: y - 0.4, z, t: 0, life: gf * (0.8 + rnd() * 0.4), r: 1.5 * sc }); }

      if (!o.mute) WZ.Audio.sfx('blast', Math.min(1, 0.55 + sc * 0.4));
      WZ.Fx.shake(o.shake == null ? BC.shake : o.shake);
      if (o.flash) WZ.Fx.flash('fire');
    },

    shell(x, y, z) { F.explode(x, y, z, { scale: 0.5, debris: 0, groundFire: 0, shake: 0.07, scorch: 0.45 }); },

    renderBlast(b) {
      const k = b.t / b.life, R = b.R, e = easeOut(k / 0.5);
      // ground shock ring
      b.ring.position.set(b.x, b.y - 0.55, b.z); b.ring.scale.setScalar(Math.max(0.2, R * 1.05 * easeOut(k / 0.55)));
      b.ring.material.opacity = Math.max(0, 0.9 * Math.pow(1 - clamp(k / 0.62, 0, 1), 1.4));
      // wide orange dust ring (slightly delayed)
      const k2 = clamp((b.t - 0.06) / (b.life - 0.06), 0, 1);
      b.ring2.position.set(b.x, b.y - 0.5, b.z); b.ring2.scale.setScalar(Math.max(0.2, R * 1.35 * easeOut(k2 / 0.8)));
      b.ring2.material.opacity = Math.max(0, 0.5 * (1 - k2) * (b.t < 0.06 ? 0 : 1));
      // fireball dome
      const ds = R * 0.72 * (0.3 + 0.7 * e), dk = k < 0.3 ? 1 : Math.max(0, 1 - (k - 0.3) / 0.45);
      b.dome.position.set(b.x, b.y + ds * 0.25, b.z); b.dome.scale.set(ds, ds * 1.08, ds); b.dome.material.opacity = 0.78 * dk;
      b.dome.visible = dk > 0.01;
      // white-hot core
      const cs = R * 0.42 * (0.4 + e * 0.8), ck = Math.max(0, 1 - k / 0.2);
      b.core.position.set(b.x, b.y + cs * 0.4, b.z); b.core.scale.setScalar(cs); b.core.material.opacity = 0.95 * ck; b.core.visible = ck > 0.01;
    },

    // ------------------------------------------------------------------ vehicle on fire
    /** set the player's vehicle on fire for `sec` seconds (refreshes when already burning) */
    ignite(sec) {
      const c = F.ctx; if (!c) return; const J = c.jeep, B = F.burn, first = !B.on;
      B.on = true; B.t = 0; B.dur = sec || BC.burn; if (B.grp) B.grp.visible = true;
      c.particles.sparks(J.x, J.ry + 1.4, J.z, cnt(18), 1, 0.7, 0.2);
      if (first) { WZ.Fx.text(WZ.I18n.t('hud.onfire'), J.rx, J.ry + 6.6, J.rz, 'warn'); WZ.Audio.sfx('ignite'); }
    },
    /** 0..1: quick flare-up, full blaze, then it gradually dies out */
    intensity() {
      const B = F.burn; if (!B.on) return 0;
      const k = B.t / B.dur; if (k >= 1) return 0; if (k < 0.08) return k / 0.08;
      if (k < 0.42) return 1; const u = (k - 0.42) / 0.58; return 1 - u * u * (3 - 2 * u);
    },
    get burning() { return F.burn.on; },

    // ------------------------------------------------------------------ simulation
    update(dt) {
      const c = F.ctx; if (!c) return; const P = c.particles, J = c.jeep, B = F.burn;
      for (const b of F.blasts) if (b.on) { b.t += dt; if (b.t >= b.life) { b.on = false; b.ring.visible = b.ring2.visible = b.dome.visible = b.core.visible = false; } }
      // debris
      for (let i = 0; i < F.debN;) {
        const d = F.debA[i]; d.age += dt;
        if (d.age >= d.life) { F.debA[i] = F.debA[--F.debN]; F.debA[F.debN] = d; continue; }
        d.vy -= 30 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.rx += d.wx * dt; d.ry += d.wy * dt; d.rz += d.wz * dt;
        const gy = c.map.height(d.x, d.z) + d.sy * 0.5;
        if (d.y < gy) {
          d.y = gy;
          if (d.vy < -2) { d.vy *= -0.38; d.vx *= 0.62; d.vz *= 0.62; d.wx *= 0.5; d.wy *= 0.5; d.wz *= 0.5; d.b++; P.emit(SOFT, d.x, d.y, d.z, 0, 0.8, 0, 0.5, 0.6, 1.8, 0.6, 0.5, 0.4, 0.45, 0, 0, 1); }
          else { d.vy = 0; d.vx *= 0.9; d.vz *= 0.9; d.wx *= 0.8; d.wy *= 0.8; d.wz *= 0.8; }
        }
        if (d.age < 1.1 && rnd() < dt * 26) {
          P.emit(GLOW, d.x, d.y, d.z, (rnd() - 0.5), 0.6 + rnd(), (rnd() - 0.5), 0.3 + rnd() * 0.2, 0.9, 0.2, 1, 0.55, 0.12, 0.85, 0, 1.5, 1.2);
          if (rnd() < 0.5) P.emit(SOFT, d.x, d.y, d.z, (rnd() - 0.5), 1 + rnd(), (rnd() - 0.5), 0.8, 0.5, 1.8, 0.16, 0.15, 0.14, 0.5, 0, 1, 1);
        }
        i++;
      }
      // fire on the crater
      for (let i = F.gfires.length - 1; i >= 0; i--) {
        const g = F.gfires[i]; g.t += dt; if (g.t >= g.life) { F.gfires.splice(i, 1); continue; }
        const k = g.t / g.life, I = k < 0.45 ? 1 : 1 - (k - 0.45) / 0.55;
        if (rnd() < dt * 16 * I) { const k2 = PAL[(rnd() * 3) | 0]; P.emit(GLOW, g.x + (rnd() - 0.5) * g.r * 1.6, g.y + 0.3, g.z + (rnd() - 0.5) * g.r * 1.6, (rnd() - 0.5) * 0.8, 2 + rnd() * 2.4, (rnd() - 0.5) * 0.8, 0.45 + rnd() * 0.3, (1.5 + rnd()) * (0.5 + I * 0.5), 0.3, k2[0], k2[1], k2[2], 0.85, 0, 2, 1.1); }
        if (rnd() < dt * 4.5 * I) P.emit(SOFT, g.x + (rnd() - 0.5) * g.r, g.y + 0.8, g.z + (rnd() - 0.5) * g.r, (rnd() - 0.5), 2 + rnd() * 1.5, (rnd() - 0.5), 1.2 + rnd() * 0.7, 1.2, 3.8, 0.13, 0.12, 0.11, 0.5, 0, 1.2, 0.9);
      }
      // the vehicle is burning
      if (B.on) {
        B.t += dt; if (B.t >= B.dur || J.inPit) { B.on = false; if (B.grp) B.grp.visible = false; return; }
        const I = F.intensity(); if (I < 0.02) return;
        const vx = J.vx || 0, vz = J.vz || 0, y0 = J.ry;
        P.emit(GLOW, J.x, y0 + 1.5, J.z, vx * 0.55, 0, vz * 0.55, 0.1, 3.6 + I * 3.4, 4, 1, 0.45, 0.1, 0.1 + 0.2 * I, 0, 0, 0);       // orange glow aura around the body
        for (const f of B.flames) {
          if (f.f <= 0.02) continue; const w = f.f * I;
          const wx = J.x + f.x * Math.cos(J.h) + f.z * Math.sin(J.h), wz = J.z - f.x * Math.sin(J.h) + f.z * Math.cos(J.h);
          if (rnd() < dt * 11 * w) { const k = PAL[(rnd() * 3) | 0]; P.emit(GLOW, wx + (rnd() - 0.5) * 0.6, y0 + f.y + rnd() * 0.4, wz + (rnd() - 0.5) * 0.6, vx * 0.6 + (rnd() - 0.5) * 0.9, 2.2 + rnd() * 2.6, vz * 0.6 + (rnd() - 0.5) * 0.9, 0.35 + rnd() * 0.3, (2.1 + rnd() * 1.0) * f.s, 0.4, k[0], k[1], k[2], 0.9, 0, 2, 1.2); }
          if (rnd() < dt * 3.4 * w) P.emit(SOFT, wx, y0 + f.y + 0.8, wz, vx * 0.4 + (rnd() - 0.5), 2.2 + rnd() * 1.4, vz * 0.4 + (rnd() - 0.5), 1 + rnd() * 0.7, 1.1, 3.6, 0.12, 0.11, 0.1, 0.55, 0, 1.3, 0.8);
          if (rnd() < dt * 3 * w) P.emit(GLOW, wx, y0 + f.y + 0.5, wz, vx * 0.5 + (rnd() - 0.5) * 3, 4 + rnd() * 3, vz * 0.5 + (rnd() - 0.5) * 3, 0.6 + rnd() * 0.5, 0.42, 0.1, 1, 0.7, 0.2, 1, 0, -6, 0.6);
        }
        B.cT -= dt; if (B.cT <= 0) { B.cT = 0.5; WZ.Audio.sfx('burn', 0.5 * I); }
      }
    },

    // ------------------------------------------------------------------ rendering
    render(dt, tm) {
      const c = F.ctx; if (!c) return; const J = c.jeep, B = F.burn;
      for (const b of F.blasts) if (b.on) F.renderBlast(b);
      if (F.deb) {
        for (let i = 0; i < F.debN; i++) {
          const d = F.debA[i], sh = d.age > d.life - 0.4 ? Math.max(0.01, (d.life - d.age) / 0.4) : 1;
          ea.set(d.rx, d.ry, d.rz); m4.compose(vp.set(d.x, d.y, d.z), qa.setFromEuler(ea), vs.set(d.sx * sh, d.sy * sh, d.sz * sh)); F.deb.setMatrixAt(i, m4);
          F.deb.setColorAt(i, col.setHex(d.age < 0.9 ? (d.ci % 2 ? 0xff8a3a : 0xff5a1a) : DEB[d.ci]));      // glowing hot at first, then the paint colour
        }
        F.deb.count = F.debN; F.deb.instanceMatrix.needsUpdate = true; if (F.deb.instanceColor) F.deb.instanceColor.needsUpdate = true;
      }
      if (B.on && B.grp && J) {
        const I = F.intensity(), sp = Math.min(1, J.speed / (J.P.boostSpeed || 30)), lean = -0.15 - sp * 0.75;
        for (const f of B.flames) {
          f.f = clamp((I - f.th) / 0.16, 0, 1);
          if (f.f <= 0.01) { f.g.visible = false; continue; }
          f.g.visible = true;
          const fl = 1.45 + 0.5 * Math.sin(tm * 17 + f.ph) + 0.3 * Math.sin(tm * 29 + f.ph * 2.3), w = f.s * f.f, wob = Math.sin(tm * 11 + f.ph) * 0.18;
          f.g.rotation.set(lean + wob * 0.5, 0, wob);
          f.o.scale.set(1.5 * w, 2.9 * w * fl * (0.55 + 0.45 * I), 1.5 * w);
          f.n.scale.set(0.82 * w, 1.8 * w * fl * (0.55 + 0.45 * I), 0.82 * w);
        }
      }
    },

    dispose() {
      const c = F.ctx, B = F.burn;
      if (c) {
        const sc = c.scene;
        for (const b of F.blasts) sc.remove(b.ring, b.ring2, b.dome, b.core);
        if (F.deb) { sc.remove(F.deb); F.deb.dispose(); }
        if (F.scorch) { sc.remove(F.scorch); F.scorch.dispose(); }
      }
      if (B.grp && B.grp.parent) B.grp.parent.remove(B.grp);
      for (const g of F.geos) g.dispose(); for (const m of F.mats) m.dispose();
      F.geos = []; F.mats = []; F.blasts = []; F.deb = null; F.debN = 0; F.debA = null; F.scorch = null; F.gfires = []; F.ctx = null;
      B.on = false; B.t = 0; B.grp = null; B.flames = [];
    },
  };
  WZ.Fire = F;
})(window.WZ = window.WZ || {});
