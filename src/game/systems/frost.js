/* WZ.Ice — the FROZEN FRONTIER mechanics (no-op on every other map):
 *  - SURFACE: WZ.Ice.surface(x, z) -> 0..1 slipperiness (static lakes / patches + the dynamic patches below). The mission feeds it to the vehicle each step
 *    (WZ.Jeep.ice): less side grip, steering, braking and acceleration - the vehicle keeps its momentum and slides. Never lethal, never blocks.
 *  - ICE WAVES (WZ.Ice.wave): an expanding ring of ice from a point (the Ice Beast's slam). When the ring front passes the vehicle / Nana they are hurt and knocked
 *    back (once per wave). The impact leaves a slippery ICE PATCH that fades after a while (WZ.Ice.patch).
 *  - CHARGE LANES (WZ.Ice.aim / aimOff): the cyan lane painted on the ground toward the victim while an Ice Beast winds up its charge (the telegraph).
 *  - GUSTS: now and then a snowstorm gust (WZ.Ice.gust 0..1) closes the fog in and blows the snow sideways. Purely visual - nothing extra attacks you.
 * Everything here is deterministic-free visual + simple circle maths; values live in CFG.frost / CFG.beast. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, U = WZ.U, FR = CFG.frost;
  const LANE_SEG = 16;

  const Ice = {
    on: false, ctx: null, gust: 0, waves: [], patches: [], lanes: [], t: 0, gustT: 0, gustOn: 0, gustLeft: 0, hintKey: '', hintT: 0, hintCd: 0, wasOnIce: false, ringGeo: null, laneMat: null, spray: 0, waveHint: 0,

    init(ctx) {
      Ice.dispose();
      Ice.ctx = ctx; Ice.on = !!(ctx.map && ctx.map.ice && ctx.map.theme === 'frozen'); if (!Ice.on) return;
      Ice.t = 0; Ice.gust = 0; Ice.gustOn = 0; Ice.gustLeft = 0; Ice.gustT = 9 + Math.random() * 6; Ice.waves = []; Ice.patches = []; Ice.lanes = []; Ice.hintKey = ''; Ice.hintT = 0; Ice.hintCd = 0; Ice.wasOnIce = false; Ice.waveHint = 0;
      Ice.ringGeo = new T.RingGeometry(0.9, 1, 64, 1); Ice.ringGeo.rotateX(-Math.PI / 2);
      Ice.laneMat = new T.MeshBasicMaterial({ color: 0x7FEFFF, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
      ctx.map.ice.extra = Ice._dyn;
    },

    /** slipperiness 0..1 (static + dynamic ice) */
    surface(x, z) { return Ice.on ? Ice.ctx.map.ice.at(x, z) : 0; },

    // ---- dynamic ice patches (left behind by the beast's slam): read through map.ice.extra
    _dyn(x, z) {
      let k = 0; const L = Ice.patches;
      for (let i = 0; i < L.length; i++) {
        const p = L[i], dx = x - p.x, dz = z - p.z; if (Math.abs(dx) > p.r || Math.abs(dz) > p.r) continue;
        const v = U.smooth(1.0, 0.8, Math.hypot(dx, dz) / p.r) * p.k; if (v > k) k = v;
      }
      return k;
    },
    patch(x, z, r, life) {
      const c = Ice.ctx, jx = c && c.view && c.view.jx; if (!Ice.on || !jx || !jx.patches) return;
      const pool = jx.patches.pool; let slot = -1;
      for (let i = 0; i < pool.length; i++) if (!pool[i].used) { slot = i; break; }
      if (slot < 0) { let oi = 0, oa = -1; for (let i = 0; i < Ice.patches.length; i++) if (Ice.patches[i].age > oa) { oa = Ice.patches[i].age; oi = i; } const o = Ice.patches[oi]; if (!o) return; slot = o.slot; Ice.patches.splice(oi, 1); }
      jx.patches.set(slot, x, z, r);
      Ice.patches.push({ x, z, r, life, age: 0, k: 0, slot });
    },

    // ---- ice wave: spec = { radius, speed, width, damage, nanaDamage, knock, patchR, patchLife }
    wave(x, z, s) {
      const c = Ice.ctx; if (!Ice.on || !c) return;
      const mat = new T.MeshBasicMaterial({ color: 0xA8F4FF, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
      const mesh = new T.Mesh(Ice.ringGeo, mat); mesh.frustumCulled = false; mesh.renderOrder = 15; mesh.position.set(x, c.map.height(x, z) + 0.7, z); mesh.scale.set(0.5, 1, 0.5); c.scene.add(mesh);
      Ice.waves.push({ x, z, r: 0.5, s, mesh, mat, hitJ: false, hitN: false, fx: 0 });
      if (s.patchR) Ice.patch(x, z, s.patchR, s.patchLife || 10);
      const P = c.particles; P.poof(x, c.map.height(x, z) + 0.8, z, 8, 2.4); P.stars(x, c.map.height(x, z) + 2.4, z, 5);
      WZ.Audio.sfx('boom', 0.6); WZ.Fx.shake(0.3);
      Ice.waveHint = 3.5;
    },

    // ---- charge lane (telegraph): a strip on the ground from (x, z) heading h for len units. a = target opacity 0..1
    aim(id, x, z, h, len, a, wd) {
      const c = Ice.ctx; if (!Ice.on || !c) return;
      let L = Ice.lanes[id];
      if (!L) {
        const g = new T.BufferGeometry(), pos = new Float32Array((LANE_SEG + 1) * 2 * 3), idx = [];
        for (let i = 0; i < LANE_SEG; i++) { const a0 = i * 2; idx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2); }
        g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setIndex(idx);
        const m = Ice.laneMat.clone(); const mesh = new T.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 14; c.scene.add(mesh);
        L = Ice.lanes[id] = { mesh, g, m, a: 0, want: 0 };
      }
      L.want = a;
      const sn = Math.sin(h), cs = Math.cos(h), hw = (wd || 2.6) * 0.5, pa = L.g.attributes.position.array, H = c.map.height;
      for (let i = 0; i <= LANE_SEG; i++) {
        const f = i / LANE_SEG * len, cx = x + sn * f, cz = z + cs * f, w = hw * (1 - 0.35 * i / LANE_SEG);
        for (let s = 0; s < 2; s++) { const side = s ? 1 : -1, px = cx + cs * w * side, pz = cz - sn * w * side; pa[(i * 2 + s) * 3] = px; pa[(i * 2 + s) * 3 + 1] = H(px, pz) + 0.55; pa[(i * 2 + s) * 3 + 2] = pz; }
      }
      L.g.attributes.position.needsUpdate = true;
    },
    aimOff(id) { const L = Ice.lanes[id]; if (L) L.want = 0; },

    update(dt, ctx, playing) {
      if (!Ice.on) return;
      Ice.t += dt; if (Ice.waveHint > 0) Ice.waveHint -= dt; if (Ice.hintT > 0) Ice.hintT -= dt; if (Ice.hintCd > 0) Ice.hintCd -= dt;
      // snowstorm gusts (visual)
      if (playing) {
        if (Ice.gustOn) { Ice.gustLeft -= dt; if (Ice.gustLeft <= 0) { Ice.gustOn = 0; Ice.gustT = U.lerp(FR.gustGap[0], FR.gustGap[1], Math.random()); } }
        else { Ice.gustT -= dt; if (Ice.gustT <= 0) { Ice.gustOn = 1; Ice.gustLeft = U.lerp(FR.gustDur[0], FR.gustDur[1], Math.random()); } }
      }
      Ice.gust = U.damp(Ice.gust, Ice.gustOn, 1.4, dt);

      const J = ctx.jeep, N = ctx.nana, P = ctx.particles, map = ctx.map;
      // vehicle on the ice: spray + hint
      if (J.alive) {
        const k = J.ice || 0;
        if (k > 0.5) {
          if (!Ice.wasOnIce && Ice.hintCd <= 0) { Ice.hintKey = 'hud.ice'; Ice.hintT = 2.2; Ice.hintCd = FR.hintCooldown; }
          Ice.wasOnIce = true;
          if (J.speed > 5) { Ice.spray -= dt; if (Ice.spray <= 0) { Ice.spray = 0.05; P.emit(0, J.x + (Math.random() - 0.5) * 2.4, map.height(J.x, J.z) + 0.3, J.z + (Math.random() - 0.5) * 2.4, -J.vx * 0.12 + (Math.random() - 0.5) * 2, 1 + Math.random() * 1.6, -J.vz * 0.12 + (Math.random() - 0.5) * 2, 0.55, 0.5, 1.8, 0.95, 0.98, 1, 0.55, 0, -1, 0.8); } }
        } else if (k < 0.2) Ice.wasOnIce = false;
      }
      // dynamic patches: grow in, live, fade out
      const jx = ctx.view && ctx.view.jx;
      for (let i = Ice.patches.length - 1; i >= 0; i--) {
        const p = Ice.patches[i]; p.age += dt;
        const grow = Math.min(1, p.age / 0.35), fade = Math.min(1, (p.life - p.age) / FR.patchFade); p.k = Math.max(0, Math.min(grow, fade));
        if (jx) jx.setPatchFade(p.slot, 0.95 * p.k);
        if (p.age >= p.life) { if (jx) jx.freePatch(p.slot); Ice.patches.splice(i, 1); }
      }
      // waves
      for (let i = Ice.waves.length - 1; i >= 0; i--) {
        const w = Ice.waves[i], s = w.s, prev = w.r; w.r += s.speed * dt;
        const done = w.r >= s.radius, fade = 1 - Math.max(0, (w.r - s.radius * 0.6) / (s.radius * 0.4));
        w.mesh.scale.set(w.r, 1, w.r); w.mat.opacity = 0.9 * Math.max(0, fade); w.mesh.position.y = map.height(w.x, w.z) + 0.7;
        w.fx -= dt;
        if (w.fx <= 0) { w.fx = 0.035; const n = 3; for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, px = w.x + Math.cos(a) * w.r, pz = w.z + Math.sin(a) * w.r; P.emit(0, px, map.height(px, pz) + 0.5, pz, Math.cos(a) * 3, 2.5 + Math.random() * 2.5, Math.sin(a) * 3, 0.5, 0.6, 1.4, 0.8, 0.96, 1, 0.8, 0, -7, 0.6); } }
        const edge = s.width * 0.5;
        if (J.alive && !w.hitJ) {
          const d = Math.hypot(J.x - w.x, J.z - w.z);
          if (d + 1.7 >= prev - edge && d - 1.7 <= w.r + edge) {
            w.hitJ = true;
            const dmg = Math.max(1, Math.round(s.damage * (1 + CFG.giant.dmgPerMission * (ctx.mission ? ctx.mission.index : 1)) * J.P.enemyDamageMul * 2 * (s.mul || 1)));
            if (dmg >= J.hp) J.deathCause = 'wave';
            J.hurt(dmg); const dx = J.x - w.x, dz = J.z - w.z, l = Math.hypot(dx, dz) || 1; J.vx += dx / l * s.knock * (s.mul || 1); J.vz += dz / l * s.knock * (s.mul || 1); J.hop = 0.45;
            WZ.Fx.text('-' + dmg, J.rx, J.ry + 5, J.rz, 'warn'); WZ.Fx.flash('hurt'); WZ.Fx.shake(0.4); P.sparks(J.x, J.ry + 1.6, J.z, 10, 0.7, 0.95, 1);
          }
        }
        if (N && N.out && !N.isKO && N.state !== 'BOARDING' && !w.hitN) {
          const d = Math.hypot(N.x - w.x, N.z - w.z);
          if (d + 0.9 >= prev - edge && d - 0.9 <= w.r + edge) { w.hitN = true; N.iframes = 0; N.hurt(s.nanaDamage * (s.mul || 1)); WZ.Fx.shake(0.2); P.sparks(N.x, N.ry + 1.5, N.z, 6, 0.7, 0.95, 1); }
        }
        if (done) { ctx.scene.remove(w.mesh); w.mat.dispose(); Ice.waves.splice(i, 1); }
      }
    },

    render(dt) {
      if (!Ice.on) return;
      for (const L of Ice.lanes) {
        if (!L) continue;
        L.a = U.damp(L.a, L.want, 14, dt); L.m.opacity = L.a * (0.45 + 0.2 * Math.sin(Ice.t * 18)); L.mesh.visible = L.a > 0.02;
      }
    },

    /** HUD hint key (frozen map) or null */
    hint() {
      if (!Ice.on) return null;
      for (const L of Ice.lanes) if (L && L.want > 0.5) return 'hud.charge';
      if (Ice.waveHint > 0 && Ice.waves.length) return 'hud.wave';
      if (Ice.hintT > 0) return Ice.hintKey;
      return null;
    },

    dispose() {
      const c = Ice.ctx;
      if (c && c.scene) {
        for (const w of Ice.waves) { c.scene.remove(w.mesh); w.mat.dispose(); }
        for (const L of Ice.lanes) if (L) { c.scene.remove(L.mesh); L.g.dispose(); L.m.dispose(); }
      }
      if (Ice.ringGeo) Ice.ringGeo.dispose(); if (Ice.laneMat) Ice.laneMat.dispose();
      Ice.ringGeo = null; Ice.laneMat = null; Ice.waves = []; Ice.patches = []; Ice.lanes = []; Ice.ctx = null; Ice.on = false; Ice.gust = 0;
    },
  };
  WZ.Ice = Ice;
})(window.WZ = window.WZ || {});
