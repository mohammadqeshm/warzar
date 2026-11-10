/* WZ.Turrets — DEFENSE (bought with coins in the Shop, one is consumed per deployment).
 *   T / DEFENSE button  -> GUN turret: automatic twin-barrel gun.
 *   H / CANNON button   -> HEAVY cannon: slow, big splash damage, longer reach.
 *   B / BOMB            -> BOMB turret (mortar): lobs bombs in an arc at the biggest group; the blast KOs everything around the impact.
 * A turret rises out of the ground next to the vehicle, tracks and shoots the nearest enemy and dismantles itself after its
 * life runs out. NO placement limit: every turret you own can be placed, anywhere there is room (only a tiny anti double-tap delay).
 * Shop "Defense Tech" levels boost damage, lifetime and fire rate of every turret. Invulnerable; never hurts the jeep or Nana. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, DEF = { gun: CFG.turret, heavy: CFG.heavy, bomb: CFG.bomb }, INV = { gun: 'turrets', heavy: 'heavy', bomb: 'bombs' }, G = WZ.Geo, U = WZ.U, rb = G.rbox;
  const B = () => new G.Builder();
  const YEL = 0xFFB400, STEEL = 0x2B2E31, DARK = 0x16181A, BODY = 0x4A525A, PLATE = 0x59636E;
  let parts = null, VM = null, HVM = null, BVM = null, ringGeo = {}, shockGeo = null;
  const SH_MAX = 28, m4 = new T.Matrix4(), qI = new T.Quaternion(), vp = new T.Vector3(), vs = new T.Vector3();

  function makeParts() {
    const base = B(), head = B(), bar = B(), lamp = B();
    base.add(G.cyl(6), { sx: 1.7, sy: 0.2, sz: 1.7, y: 0.1, color: STEEL });
    base.add(G.cyl(6), { sx: 1.86, sy: 0.08, sz: 1.86, y: 0.04, color: YEL });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.52; base.add(rb(0.34, 0.12, 0.2, 0.03), { x: Math.cos(a) * 1.5, z: Math.sin(a) * 1.5, y: 0.24, ry: -a, color: i % 2 ? DARK : YEL }); }
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; base.beam(0, 1.05, 0, Math.cos(a) * 1.35, 0.2, Math.sin(a) * 1.35, 0.17, 0.17, 0x3A3F44); }
    base.add(G.cyl(10), { sx: 0.4, sy: 1.0, sz: 0.4, y: 0.7, color: 0x3A3F44 });
    base.add(rb(0.62, 0.42, 0.5, 0.06), { x: 1.0, y: 0.42, z: 0.25, ry: 0.3, color: 0x4B5A3A });
    base.add(rb(0.64, 0.08, 0.52, 0.02), { x: 1.0, y: 0.5, z: 0.25, ry: 0.3, color: YEL });
    head.add(rb(1.0, 0.64, 1.15, 0.17), { color: BODY });
    head.add(rb(0.96, 0.1, 1.08, 0.04), { y: 0.37, color: YEL });
    for (const s of [1, -1]) { head.add(rb(0.12, 0.72, 0.95, 0.05), { x: 0.57 * s, y: 0.02, z: 0.05, color: PLATE }); head.add(rb(0.1, 0.1, 0.5, 0.03), { x: 0.44 * s, y: 0.42, z: -0.25, color: DARK }); }
    head.add(rb(0.5, 0.36, 0.34, 0.08), { y: -0.02, z: -0.72, color: DARK });
    head.add(G.cyl(12), { x: -0.28, y: 0.7, z: -0.25, rx: 0.5, sx: 0.24, sy: 0.04, sz: 0.24, color: 0xB9BDC2 });
    head.add(G.cyl(6), { x: -0.28, y: 0.52, z: -0.25, sx: 0.04, sy: 0.35, sz: 0.04, color: DARK });
    bar.add(rb(0.62, 0.34, 0.5, 0.06), { z: 0.55, color: DARK });
    for (const s of [1, -1]) { bar.add(rb(0.15, 0.15, 1.5, 0.05), { x: 0.2 * s, y: 0.06, z: 1.25, color: 0x0E0E0E }); bar.add(rb(0.22, 0.22, 0.24, 0.05), { x: 0.2 * s, y: 0.06, z: 2.0, color: STEEL }); }
    lamp.add(G.sph(10, 8), { sx: 0.17, sy: 0.17, sz: 0.17, color: 0xFFFFFF });
    return { base: base.build(), head: head.build(), bar: bar.build(), lamp: lamp.build() };
  }

  /** a complete turret (also used for offline previews): returns { root, headG, barG, lamp } */
  function model(kind) {
    if (!parts) { parts = makeParts(); VM = new T.MeshLambertMaterial({ vertexColors: true }); HVM = new T.MeshLambertMaterial({ vertexColors: true, color: 0xFF9C84 }); BVM = new T.MeshLambertMaterial({ vertexColors: true, color: 0xB79CFF }); }
    const heavy = kind === 'heavy', bomb = kind === 'bomb', VM_ = heavy ? HVM : bomb ? BVM : VM;
    const root = new T.Group(), headG = new T.Group(), barG = new T.Group();
    headG.position.y = 1.45; root.add(headG); headG.add(barG);
    const meshes = [new T.Mesh(parts.base, VM_), new T.Mesh(parts.head, VM_), new T.Mesh(parts.bar, VM_)];
    if (heavy) barG.scale.set(1.6, 1.6, 1.0);
    if (bomb) { barG.scale.set(1.5, 1.5, 0.8); barG.rotation.x = -0.95; barG.position.y = 0.25; }   // fat mortar tube pitched up
    root.add(meshes[0]); headG.add(meshes[1]); barG.add(meshes[2]);
    for (const m of meshes) m.castShadow = true;
    const lamp = new T.Mesh(parts.lamp, new T.MeshBasicMaterial({ vertexColors: true, color: 0x4cff6a })); lamp.position.set(0, 0.5, 0.6); headG.add(lamp);
    return { root, headG, barG, lamp, scale: heavy ? CFG.heavy.scale : bomb ? CFG.bomb.scale : 1 };
  }
  const easeBack = (k) => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

  const tech = () => (WZ.Save.data.upgrades.defense | 0);
  const mulDmg = () => 1 + tech() * CFG.defenseTech.dmg, mulLife = () => 1 + tech() * CFG.defenseTech.life, mulRate = () => 1 + tech() * CFG.defenseTech.rate;

  const L = {
    ctx: null, list: [], cd: { gun: 0, heavy: 0, bomb: 0 }, noteT: 0, planted: 0, kills: 0, shells: [], blasts: [], sm: null, mm: null, bm: null, gm: null,
    stock(kind) { const v = WZ.Save.data.inv; return (v && v[INV[kind]]) | 0; },
    countKind(kind) { let n = 0; for (const t of L.list) if (t.kind === kind) n++; return n; },
    cdPct(kind) { const c = L.cd[kind]; return c <= 0 ? 1 : 1 - c / DEF[kind].cooldown; },
    get count() { return L.list.length; },

    init(ctx) {
      L.dispose(); L.ctx = ctx; L.list = []; L.cd.gun = L.cd.heavy = L.cd.bomb = 0; L.noteT = 0; L.planted = 0; L.kills = 0; L.shells = []; L.blasts = [];
      if (!shockGeo) shockGeo = new T.RingGeometry(0.85, 1.0, 48).rotateX(-Math.PI / 2);
      for (const k of ['gun', 'heavy', 'bomb']) if (!ringGeo[k]) ringGeo[k] = new T.RingGeometry(DEF[k].range - 0.3, DEF[k].range, 72).rotateX(-Math.PI / 2);
      // bomb shells (dark ball + orange glow), landing markers and blast rings: small instanced pools
      const mk = (geo, mat) => { const m = new T.InstancedMesh(geo, mat, SH_MAX); m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(T.DynamicDrawUsage); ctx.scene.add(m); return m; };
      L.sm = mk(new T.SphereGeometry(0.55, 10, 8), new T.MeshLambertMaterial({ color: 0x2a2a36 }));
      L.gm = mk(new T.SphereGeometry(0.95, 10, 8), new T.MeshBasicMaterial({ color: 0xFF8A2A, transparent: true, opacity: 0.45, depthWrite: false }));
      L.mm = mk(new T.RingGeometry(0.88, 1.0, 40).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0xFF3A22, transparent: true, opacity: 0.5, depthWrite: false, side: T.DoubleSide }));
      L.bm = mk(new T.RingGeometry(0.8, 1.0, 48).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0xFFD27A, transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide }));
    },

    note(key) {
      const J = L.ctx.jeep; WZ.Audio.sfx('beep'); WZ.Fx.text(WZ.I18n.t(key), J.rx, J.ry + 6, J.rz, 'warn');
    },

    /** kind: 'gun' | 'heavy' | 'bomb'. Returns true when a turret was deployed (and one was taken from the inventory).
     *  No cap on how many may stand at once: it only needs free ground near the vehicle. */
    plant(kind) {
      kind = kind || 'gun';
      const c = L.ctx, C = DEF[kind]; if (!c || !C) return false;
      const J = c.jeep; if (!J.alive) return false;
      const say = (k) => { if (L.noteT <= 0) { L.note(k); L.noteT = 0.8; } return false; };
      if (L.stock(kind) <= 0) return say(kind === 'heavy' ? 'hud.noheavy' : kind === 'bomb' ? 'hud.nobombs' : 'hud.noturrets');
      if (L.cd[kind] > 0) return false;
      const sc = C.scale || 1, sn = Math.sin(J.h), cs = Math.cos(J.h), back = -(J.P.halfLen + C.behind);
      // candidate spots (forward d, side s): behind the vehicle first, then the sides, then widening rings around it
      const cand = [[back, 0], [0, -4.8 * sc], [0, 4.8 * sc], [-back * 0.9, 0], [back, 3.2], [back, -3.2]];
      for (let r = 1; r <= 3; r++) for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + r * 0.3; cand.push([Math.cos(a) * 4.8 * sc * r, Math.sin(a) * 4.8 * sc * r]); }
      let spot = null;
      for (let pass = 0; pass < 2 && !spot; pass++) {
        for (const [d, side] of cand) {
          const jit = pass ? 0.9 : 0, x = J.x + sn * d + cs * side + (Math.random() - 0.5) * jit, z = J.z + cs * d - sn * side + (Math.random() - 0.5) * jit;
          if (!c.col.free(x, z, 1.7 * sc)) continue;
          if (!pass) { let clash = false; for (const o of L.list) if (Math.hypot(o.x - x, o.z - z) < 2.7 * Math.max(sc, o.sc)) { clash = true; break; } if (clash) continue; }
          spot = { x, z }; break;
        }
      }
      if (!spot) return say('hud.turretBlocked');
      const gy = c.map.height(spot.x, spot.z), m = model(kind), lampMat = m.lamp.material;
      const ring = new T.Mesh(ringGeo[kind], new T.MeshBasicMaterial({ color: kind === 'heavy' ? 0xFF7A4A : kind === 'bomb' ? 0xB79CFF : YEL, transparent: true, opacity: 0.35, depthWrite: false, fog: false }));
      const shock = new T.Mesh(shockGeo, new T.MeshBasicMaterial({ color: 0xFFE27A, transparent: true, opacity: 0.7, depthWrite: false, side: T.DoubleSide }));
      ring.position.set(spot.x, gy + 0.12, spot.z); shock.position.set(spot.x, gy + 0.18, spot.z);
      m.root.position.set(spot.x, gy, spot.z); m.root.scale.setScalar(0.01);
      c.scene.add(m.root, ring, shock);
      const S = WZ.Save.data; S.inv[INV[kind]] = Math.max(0, S.inv[INV[kind]] - 1); WZ.Save.save();
      L.list.push({ kind, def: C, x: spot.x, z: spot.z, gy, life: C.life * mulLife(), maxLife: C.life * mulLife(), age: 0, yaw: J.h, root: m.root, headG: m.headG, barG: m.barG, lamp: m.lamp, lampMat, ring, shock, cdF: 0.3, side: 1, kick: 0, target: null, retarget: 0, sfxN: 0, sc });
      L.cd[kind] = C.cooldown; L.planted++;
      WZ.Audio.sfx('build'); c.particles.dust(spot.x, gy, spot.z, 8); c.particles.poof(spot.x, gy + 0.6, spot.z, 8, 1.6 * sc);
      WZ.Fx.shake(0.18); WZ.Fx.text(WZ.I18n.t(kind === 'heavy' ? 'hud.heavyOn' : kind === 'bomb' ? 'hud.bombOn' : 'hud.turretOn'), spot.x, gy + 4.2 * sc, spot.z, 'good');
      return true;
    },

    /** bomb turret: pick the enemy with the most neighbours inside the blast (giants count extra), outside the minimum range */
    pickBomb(t, C) {
      const E = L.ctx.enemies; E.hash.query(t.x, t.z, C.range, E.q);
      const cand = E.q.slice(); let best = null, bs = -1e9;
      for (const e of cand) {
        if (!e.active || e.state === 2) continue;
        const d = Math.hypot(e.x - t.x, e.z - t.z); if (d < C.minRange || d > C.range) continue;
        let n = 0; for (const o of cand) if (o.active && o.state !== 2 && Math.hypot(o.x - e.x, o.z - e.z) < C.blast * 0.85) n++;
        const sc = n * 10 - d * 0.05; if (sc > bs) { bs = sc; best = e; }
      }
      if (WZ.Giants) for (const g of WZ.Giants.list) {
        if (!g.active) continue;
        const d = Math.hypot(g.x - t.x, g.z - t.z); if (d < C.minRange || d > C.range) continue;
        const sc = 28 - d * 0.05; if (sc > bs) { bs = sc; best = g; }
      }
      return best;
    },

    lob(t, tg, dm) {
      const c = L.ctx, C = t.def, sn = Math.sin(t.yaw), cs = Math.cos(t.yaw);
      const dist = Math.hypot(tg.x - t.x, tg.z - t.z), flight = U.clamp(dist / C.shellSpeed, C.flight[0], C.flight[1]);
      const lx = tg.x + (tg.x - tg.px) * 60 * flight * 0.8, lz = tg.z + (tg.z - tg.pz) * 60 * flight * 0.8;
      const mx = t.x + sn * 1.5 * t.sc, mz = t.z + cs * 1.5 * t.sc, my = t.gy + 2.5 * t.sc;
      if (L.shells.length >= SH_MAX) L.shells.shift();
      L.shells.push({ sx: mx, sy: my, sz: mz, tx: lx, tz: lz, ty: c.map.height(lx, lz), t: 0, T: flight, arc: 5 + dist * 0.14, dmg: C.damage * dm });
      c.particles.muzzle(mx, my + 0.4, mz); c.particles.poof(mx, my, mz, 3, 0.8); WZ.Audio.sfx('mortar'); WZ.Fx.shake(0.06);
    },

    explode(sh) {
      const c = L.ctx, P = c.particles, E = c.enemies, C = DEF.bomb, x = sh.tx, z = sh.tz, y = sh.ty;
      P.poof(x, y + 1.2, z, 16, 3.2); P.sparks(x, y + 1.2, z, 32, 1, 0.65, 0.2); P.dust(x, y, z, 10); P.sparks(x, y + 2.5, z, 14, 1, 0.9, 0.5);
      WZ.Audio.sfx('boom', 0.85); WZ.Fx.shake(Math.hypot(x - c.jeep.x, z - c.jeep.z) < 40 ? 0.25 : 0.08);
      if (L.blasts.length >= SH_MAX) L.blasts.shift();
      L.blasts.push({ x, y, z, t: 0 });
      E.hash.query(x, z, C.blast, E.q);
      let n = 0;
      for (const e of E.q.slice()) { if (!e.active || e.state === 2 || Math.hypot(e.x - x, e.z - z) > C.blast) continue; E.ko(e, e.x - x, e.z - z, C.knock, 'bomb'); n++; }
      if (WZ.Giants) WZ.Giants.splash(x, z, C.blast * 0.8, sh.dmg, 'bomb');
      L.kills += n;
      if (n >= 3) WZ.Fx.text('x' + n + ' ' + WZ.I18n.t('hud.combo'), x, y + 5, z, 'coin');
    },

    update(dt) {
      const c = L.ctx; if (!c) return;
      if (L.cd.gun > 0) L.cd.gun -= dt; if (L.cd.heavy > 0) L.cd.heavy -= dt; if (L.cd.bomb > 0) L.cd.bomb -= dt; if (L.noteT > 0) L.noteT -= dt;
      for (let k = L.shells.length - 1; k >= 0; k--) { const sh = L.shells[k]; sh.t += dt; if (sh.t >= sh.T) { L.shells.splice(k, 1); L.explode(sh); } }
      for (let k = L.blasts.length - 1; k >= 0; k--) { L.blasts[k].t += dt; if (L.blasts[k].t > 0.6) L.blasts.splice(k, 1); }
      const E = c.enemies, dm = mulDmg(), rm = mulRate();
      for (let k = L.list.length - 1; k >= 0; k--) {
        const t = L.list[k], C = t.def; t.age += dt; t.life -= dt;
        if (t.life <= 0) { c.particles.poof(t.x, t.gy + 1.0, t.z, 10, 1.8 * t.sc); WZ.Audio.sfx('thud'); L.remove(k); continue; }
        if (t.age < C.build) continue;
        t.retarget -= dt;
        if (t.retarget <= 0 || !t.target || !t.target.active || t.target.state === 2) { t.retarget = t.kind === 'bomb' ? 0.35 : 0.12; t.target = t.kind === 'bomb' ? L.pickBomb(t, C) : E.nearest(t.x, t.z, C.range); }
        const tg = t.target; let err = 9;
        if (tg) {
          err = U.angDiff(t.yaw, Math.atan2(tg.x - t.x, tg.z - t.z));
          t.yaw += U.clamp(err, -C.turnSpeed * dt, C.turnSpeed * dt);
        } else t.yaw += dt * 0.7;
        t.cdF -= dt;
        if (t.kind === 'bomb') {
          if (tg && Math.abs(err) < C.aim && t.cdF <= 0) { t.cdF = 1 / (C.rate * rm); t.kick = 1; L.lob(t, tg, dm); }
          continue;
        }
        if (tg && Math.abs(err) < C.aim && t.cdF <= 0) {
          t.cdF = 1 / (C.rate * rm); t.side = -t.side; t.kick = 1;
          const sn = Math.sin(t.yaw), cs = Math.cos(t.yaw), mx = t.x + sn * 2.1 * t.sc + cs * 0.2 * t.side, mz = t.z + cs * 2.1 * t.sc - sn * 0.2 * t.side, my = t.gy + 1.52 * t.sc;
          const gy = c.map.height(tg.x, tg.z) + 1.8, dx = tg.x - t.x, dz = tg.z - t.z, dl = Math.hypot(dx, dz) || 1;
          WZ.Gun._tracer(mx, my, mz, tg.x + (Math.random() - 0.5) * 0.6, gy, tg.z + (Math.random() - 0.5) * 0.6);
          c.particles.muzzle(mx, my, mz);
          if (t.kind === 'heavy') {
            const P = c.particles; P.poof(tg.x, gy - 0.6, tg.z, 8, 1.8); P.sparks(tg.x, gy, tg.z, 12, 1, 0.7, 0.2); WZ.Audio.sfx('boom', 0.45); WZ.Fx.shake(0.07);
            E.hash.query(tg.x, tg.z, C.splash, E.q);
            const hit = E.q.slice();
            for (const e of hit) {
              if (!e.active || e.state === 2) continue;
              const ex = e.x - tg.x, ez = e.z - tg.z, ed = Math.hypot(ex, ez); if (ed > C.splash) continue;
              const l = ed || 1, fall = 1 - 0.5 * ed / C.splash;
              if (E.damage(e, C.damage * dm * fall, ex / l * C.knock, ez / l * C.knock, 'turret')) L.kills++;
            }
            if (WZ.Giants) WZ.Giants.splash(tg.x, tg.z, C.splash, C.damage * dm * 0.9, 'turret');
          } else if (E.damage(tg, C.damage * dm, dx / dl * C.knock, dz / dl * C.knock, 'turret')) L.kills++;
          if ((t.sfxN++ & 1) === 0 && t.kind !== 'heavy') WZ.Audio.sfx('tshot', 0.6);
        }
      }
    },

    remove(k) {
      const t = L.list[k], sc = L.ctx.scene; sc.remove(t.root, t.ring, t.shock);
      t.ring.material.dispose(); t.shock.material.dispose(); t.lampMat.dispose(); L.list.splice(k, 1);
    },

    render(dt, tm) {
      if (L.sm) {
        const n = L.shells.length;
        for (let i = 0; i < n; i++) {
          const sh = L.shells[i], k = Math.min(1, sh.t / sh.T), x = sh.sx + (sh.tx - sh.sx) * k, z = sh.sz + (sh.tz - sh.sz) * k, y = sh.sy + (sh.ty - sh.sy) * k + sh.arc * 4 * k * (1 - k);
          m4.compose(vp.set(x, y, z), qI, vs.set(1, 1, 1)); L.sm.setMatrixAt(i, m4);
          m4.compose(vp, qI, vs.set(0.85 + 0.2 * Math.sin(tm * 30 + i), 1, 1)); L.gm.setMatrixAt(i, m4);
          const ms = DEF.bomb.blast * (0.92 + 0.08 * Math.sin(tm * 9)) * (0.55 + 0.45 * k); m4.compose(vp.set(sh.tx, sh.ty + 0.25, sh.tz), qI, vs.set(ms, 1, ms)); L.mm.setMatrixAt(i, m4);
        }
        L.sm.count = L.gm.count = L.mm.count = n;
        L.sm.instanceMatrix.needsUpdate = L.gm.instanceMatrix.needsUpdate = L.mm.instanceMatrix.needsUpdate = true;
        const nb = L.blasts.length;
        for (let i = 0; i < nb; i++) {
          const b = L.blasts[i], k = b.t / 0.6, sc = DEF.bomb.blast * (0.15 + 0.95 * (1 - Math.pow(1 - Math.min(1, k * 1.6), 3))) * (k > 0.65 ? Math.max(0, 1 - (k - 0.65) / 0.35) : 1);
          m4.compose(vp.set(b.x, b.y + 0.35, b.z), qI, vs.set(sc, 1, sc)); L.bm.setMatrixAt(i, m4);
        }
        L.bm.count = nb; L.bm.instanceMatrix.needsUpdate = true;
      }
      for (const t of L.list) {
        const k = Math.min(1, t.age / t.def.build), e = k < 1 ? easeBack(k) : 1;
        t.root.scale.setScalar(Math.max(0.01, e) * t.sc); t.headG.rotation.y = t.yaw + (1 - k) * 3.2;
        t.kick = Math.max(0, t.kick - dt * 9); t.barG.position.z = -0.28 * t.kick * (t.kind === 'heavy' ? 1.6 : t.kind === 'bomb' ? 0.9 : 1);
        const low = t.life < 4, on = !low || ((tm * 6) % 1) < 0.55;
        t.lampMat.color.setHex(t.life > 10 ? 0x4cff6a : t.life > 4 ? 0xFFC83A : (on ? 0xFF3A22 : 0x3a0f0a));
        t.ring.material.opacity = Math.max(0, 0.35 * (1 - t.age / 2.2)); t.ring.visible = t.ring.material.opacity > 0.01;
        const sk = t.age / 0.45; t.shock.visible = sk < 1; if (sk < 1) { t.shock.scale.setScalar(1 + sk * 7); t.shock.material.opacity = 0.7 * (1 - sk); }
      }
    },

    dispose() {
      if (L.ctx) for (let k = L.list.length - 1; k >= 0; k--) L.remove(k);
      for (const k of ['sm', 'gm', 'mm', 'bm']) { const m = L[k]; if (m) { if (L.ctx) L.ctx.scene.remove(m); m.geometry.dispose(); m.material.dispose(); m.dispose(); L[k] = null; } }
      L.list = []; L.shells = []; L.blasts = []; L.ctx = null;
    },
    model,
  };
  WZ.Turrets = L;
})(window.WZ = window.WZ || {});
