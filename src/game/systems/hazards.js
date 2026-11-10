/* WZ.Hazards — buried MINES + TORNADO.
 * Mines: seeded patches/singles (biased toward roads), blinking red LED, one-shot blast that hurts the jeep (or Nana) and KOs enemies nearby.
 * Tornado: warns for a few seconds (siren, ring, arrow), then drifts toward the jeep (slower than the jeep, escapable with boost);
 * inside its radius the jeep is dragged, pulled and spun; Nana takes damage; enemies are flung. All numbers: WZ.CFG.hazards. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, U = WZ.U, H = CFG.hazards, MC = H.mines, TC = H.tornado, BC = H.barrels, PC = H.pits;
  const m4 = new T.Matrix4(), qI = new T.Quaternion(), vp = new T.Vector3(), vs = new T.Vector3(), qT = new T.Quaternion(), eT = new T.Euler();
  const d2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);

  /** tileable swirling dust texture (alpha): diagonal streaks wrap around the funnel => reads as a spinning column of debris */
  function funnelTex(seed) {
    const W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const rnd = WZ.RNG.mulberry32(seed);
    x.clearRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      const px = rnd() * W, w = 2 + rnd() * 10, sl = 26 + rnd() * 34, a = 0.14 + rnd() * 0.42, sh = 70 + (rnd() * 110) | 0;
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(' + sh + ',' + (sh - 8) + ',' + (sh - 22) + ',0)'); g.addColorStop(0.5, 'rgba(' + sh + ',' + (sh - 8) + ',' + (sh - 22) + ',' + a + ')'); g.addColorStop(1, 'rgba(' + sh + ',' + (sh - 8) + ',' + (sh - 22) + ',0)');
      x.fillStyle = g;
      for (const ox of [-W, 0, W]) { x.beginPath(); x.moveTo(px + ox, 0); x.lineTo(px + ox + w, 0); x.lineTo(px + ox + w + sl, H); x.lineTo(px + ox + sl, H); x.closePath(); x.fill(); }
    }
    for (let i = 0; i < 40; i++) { // lighter puffs
      const px = rnd() * W, py = rnd() * H, r = 6 + rnd() * 16;
      for (const ox of [-W, 0, W]) { const g = x.createRadialGradient(px + ox, py, 0, px + ox, py, r); g.addColorStop(0, 'rgba(205,190,165,0.30)'); g.addColorStop(1, 'rgba(205,190,165,0)'); x.fillStyle = g; x.fillRect(px + ox - r, py - r, r * 2, r * 2); }
    }
    x.globalCompositeOperation = 'destination-in';
    const m = x.createLinearGradient(0, 0, 0, H); m.addColorStop(0, 'rgba(0,0,0,0.15)'); m.addColorStop(0.3, 'rgba(0,0,0,1)'); m.addColorStop(0.7, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0.15)');
    x.fillStyle = m; x.fillRect(0, 0, W, H);
    const tx = new T.CanvasTexture(c); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(1, 1); return tx;
  }
  /** soft round dust/cloud disc (alpha) for the ground skirt and the dark cloud cap */
  function discTex(seed, dark) {
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), rnd = WZ.RNG.mulberry32(seed);
    const g = x.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.55, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 70; i++) { const px = rnd() * S, py = rnd() * S, r = 5 + rnd() * 16, v = dark ? 20 + rnd() * 50 : 120 + rnd() * 90; x.fillStyle = 'rgba(' + v + ',' + (v - 6) + ',' + (v - 16) + ',' + (0.25 + rnd() * 0.4) + ')'; x.beginPath(); x.arc(px, py, r, 0, 6.3); x.fill(); }
    return new T.CanvasTexture(c);
  }
  function setM(mesh, i, x, y, z, s) { m4.compose(vp.set(x, y, z), qI, vs.set(s, s, s)); mesh.setMatrixAt(i, m4); }

  const Z = {
    ctx: null, rng: null, rng2: null, mission: null, mines: [], barrels: [], pits: [], torn: null,
    tornOn: false, minesOn: false, barrelsOn: false, pitsOn: false,
    nextT: 0, pingT: 0, nearest: 1e9, caught: 0, nanaT: 0, windT: 0, dustT: 0, key: '',
    ms: null, bms: null, pms: null, tg: null, layers: [], debris: null, debrisU: [], disks: [], core: null, coreRing: null, ring: null, texs: [], geos: [], immune: 0, spark: 0,
    FH: 32, NDEB: 36, fadeK: 1,

    init(ctx, mission, seed) {
      Z.dispose(); Z.ctx = ctx; Z.mission = mission; Z.rng = WZ.RNG.create(seed); Z.rng2 = WZ.RNG.create(WZ.RNG.hash(seed, 505));
      const m = mission.index;
      Z.minesOn = m >= MC.fromMission; Z.tornOn = !mission.tutorial && m >= TC.fromMission;
      Z.barrelsOn = BC && m >= BC.fromMission; Z.pitsOn = PC && m >= PC.fromMission;
      if (Z.minesOn) Z.placeMines(m);
      if (Z.tornOn) { Z.nextT = Z.rng.range(TC.firstDelay[0], TC.firstDelay[1]); Z.buildTornado(); }
      if (Z.pitsOn) Z.placePits(m);
      if (Z.barrelsOn) Z.placeBarrels(m);
    },

    placeMines(m) {
      const map = Z.ctx.map, col = Z.ctx.col, rng = Z.rng, lim = map.half - 16, st = map.start, ex = map.extract, list = [];
      const target = Z.mission.tutorial ? MC.tutorialCount : Math.min(MC.maxCount, Math.round(MC.baseCount + MC.perMission * m));
      const ok = (x, z) => {
        if (Math.abs(x) > lim || Math.abs(z) > lim || d2(x, z, st.x, st.z) < MC.minFromStart * MC.minFromStart) return false;
        if (ex && d2(x, z, ex.x, ex.z) < MC.minFromExtract * MC.minFromExtract) return false;
        for (const c of map.crates) if (d2(x, z, c.x, c.z) < MC.minFromCrate * MC.minFromCrate) return false;
        for (const o of list) if (d2(x, z, o.x, o.z) < 10.2) return false;
        return col.free(x, z, 2.2);
      };
      for (let guard = 0; list.length < target && guard < 500; guard++) {
        let cx, cz;
        if (map.roadPts.length && rng.chance(MC.roadBias)) { const p = rng.pick(map.roadPts); cx = p.x + rng.range(-5, 5); cz = p.z + rng.range(-5, 5); }
        else { cx = rng.range(-lim, lim); cz = rng.range(-lim, lim); }
        const n = rng.chance(MC.patchChance) ? rng.int(3, 5) : 1;
        for (let i = 0; i < n && list.length < target; i++) {
          const a = rng.range(0, 6.283), r = n > 1 ? rng.range(0, 6.5) : 0, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
          if (ok(x, z)) list.push({ x, z, gy: map.height(x, z), on: true, ph: rng.range(0, 1) });
        }
      }
      Z.mines = list;
      const n = list.length, sc = Z.ctx.scene; if (!n) return;
      const gs = [new T.CylinderGeometry(1.25, 1.4, 0.32, 16), new T.CylinderGeometry(2.3, 2.5, 0.05, 18), new T.CylinderGeometry(0.08, 0.1, 2.5, 6),
        new T.BoxGeometry(1.1, 0.8, 0.07), new T.SphereGeometry(0.42, 8, 6), new T.RingGeometry(2.2, 2.6, 28).rotateX(-Math.PI / 2)];
      Z.geos.push(...gs);
      const mats = [new T.MeshLambertMaterial({ color: 0x4d5237 }), new T.MeshLambertMaterial({ color: 0x2b2118 }), new T.MeshLambertMaterial({ color: 0xd23a2a }),
        new T.MeshLambertMaterial({ color: 0xffb400 }), new T.MeshBasicMaterial({ color: 0xff2a14 }), new T.MeshBasicMaterial({ color: 0xff3a22, transparent: true, opacity: 0.55, depthWrite: false })];
      Z.ms = gs.map((g, k) => { const im = new T.InstancedMesh(g, mats[k], n); im.frustumCulled = false; sc.add(im); return im; });
      list.forEach((mn, i) => { mn.i = i; Z.place(mn, true); });
    },

    // 0 body, 1 crater, 2 post, 3 plate, 4 lamp, 5 ring
    place(mn, on) {
      const [body, crater, post, plate, lamp, ring] = Z.ms, i = mn.i, x = mn.x, z = mn.z, y = mn.gy;
      setM(body, i, x, y + 0.08, z, on ? 1 : 0); setM(crater, i, x, y + 0.03, z, on ? 0 : 1);
      setM(post, i, x + 1.5, y + 1.25, z, on ? 1 : 0); setM(plate, i, x + 1.5, y + 2.05, z, on ? 1 : 0);
      setM(lamp, i, x + 1.5, y + 2.75, z, on ? 1 : 0); setM(ring, i, x, y + 0.1, z, on ? 1 : 0);
      for (const m of Z.ms) m.instanceMatrix.needsUpdate = true;
    },

    // Funnel: 16 stacked open cones widening toward the top (dark swirling dust), a dark core, a ground dust skirt, a storm-cloud cap,
    // 36 tumbling debris pieces (instanced) and two ground rings (pull range / core). All animated in render().
    buildTornado() {
      const g = new T.Group(); g.visible = false; Z.layers = []; Z.debris = null; Z.disks = [];
      Z.texs = [funnelTex(11), funnelTex(23), discTex(5, false), discTex(9, true)];
      const H = Z.FH, rAt = (y) => 0.9 + 8.6 * Math.pow(y / H, 1.4), N = 16, dh = H / N;
      for (let i = 0; i < N; i++) {
        const y0 = i * dh, geo = new T.CylinderGeometry(rAt(y0 + dh * 1.08), rAt(y0), dh * 1.08, 22, 1, true); Z.geos.push(geo);
        const k = i / (N - 1), col = new T.Color().setRGB(0.62 + 0.2 * k, 0.55 + 0.22 * k, 0.45 + 0.24 * k);
        const mat = new T.MeshBasicMaterial({ map: Z.texs[i % 2], color: col, transparent: true, opacity: 0.78 - 0.2 * k, side: T.DoubleSide, depthWrite: false });
        const mesh = new T.Mesh(geo, mat); mesh.position.y = y0 + dh * 0.5; mesh.userData = { op: mat.opacity, i, sp: (2.6 + (i % 4) * 0.45) * (1 - i * 0.025), r: rAt(y0 + dh / 2) }; g.add(mesh); Z.layers.push(mesh);
      }
      const cg = new T.CylinderGeometry(rAt(H) * 0.38, 0.35, H, 14, 1, true); Z.geos.push(cg);
      Z.core = new T.Mesh(cg, new T.MeshBasicMaterial({ color: 0x2c241c, transparent: true, opacity: 0.34, side: T.BackSide, depthWrite: false })); Z.core.position.y = H / 2; Z.core.userData = { op: 0.34 }; g.add(Z.core);
      // ground dust skirt + cloud cap
      const dg = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); Z.geos.push(dg);
      const disc = (tex, r, y, col, op) => { const m = new T.Mesh(dg, new T.MeshBasicMaterial({ map: tex, color: col, transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide })); m.scale.set(r * 2, 1, r * 2); m.position.y = y; m.userData = { op, cap: y > 5 }; g.add(m); Z.disks.push(m); return m; };
      disc(Z.texs[2], 13, 0.5, 0xc2a880, 0.7); disc(Z.texs[2], 9, 1.4, 0xa89270, 0.65); disc(Z.texs[2], 6, 2.6, 0x8f7c60, 0.55);
      disc(Z.texs[3], 19, H + 0.6, 0x555660, 0.8); disc(Z.texs[3], 14, H + 1.8, 0x3f4048, 0.85); disc(Z.texs[3], 9, H + 3.0, 0x2e2f36, 0.8);
      // debris
      const dgeo = new T.BoxGeometry(0.55, 0.38, 0.9); Z.geos.push(dgeo);
      const im = new T.InstancedMesh(dgeo, new T.MeshLambertMaterial({ color: 0xffffff }), Z.NDEB); im.frustumCulled = false; im.castShadow = false;
      const cc = new T.Color(), pal = [0x5a4430, 0x7a6a58, 0x3d3a36, 0x8a5a2b, 0x9a9488];
      for (let i = 0; i < Z.NDEB; i++) { im.setColorAt(i, cc.setHex(pal[i % pal.length])); }
      Z.debrisU = []; for (let i = 0; i < Z.NDEB; i++) Z.debrisU.push({ a: Z.rng.range(0, 6.28), h: Z.rng.range(1, H * 0.95), sp: Z.rng.range(1.2, 3.4), s: Z.rng.range(0.6, 1.9), o: Z.rng.range(0.9, 1.6) });
      g.add(im); Z.debris = im;
      // ground rings: pull range + core
      const rg = new T.RingGeometry(TC.pullRadius - 0.5, TC.pullRadius, 64), cr = new T.RingGeometry(TC.core - 0.35, TC.core, 40); Z.geos.push(rg, cr);
      Z.ring = new T.Mesh(rg, new T.MeshBasicMaterial({ color: 0xff7a3a, transparent: true, opacity: 0.4, side: T.DoubleSide, depthWrite: false }));
      Z.ring.rotation.x = -Math.PI / 2; Z.ring.position.y = 0.25; g.add(Z.ring);
      Z.coreRing = new T.Mesh(cr, new T.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.45, side: T.DoubleSide, depthWrite: false }));
      Z.coreRing.rotation.x = -Math.PI / 2; Z.coreRing.position.y = 0.3; g.add(Z.coreRing);
      Z.ctx.scene.add(g); Z.tg = g;
    },

    placeBarrels(m) {
      const map = Z.ctx.map, col = Z.ctx.col, rng = Z.rng2, lim = map.half - 16, st = map.start, ex = map.extract, list = [];
      const target = Z.mission.tutorial ? BC.tutorialCount : Math.min(BC.maxCount, Math.round(BC.baseCount + BC.perMission * m));
      const ok = (x, z) => {
        if (Math.abs(x) > lim || Math.abs(z) > lim || d2(x, z, st.x, st.z) < BC.minFromStart * BC.minFromStart) return false;
        if (ex && d2(x, z, ex.x, ex.z) < BC.minFromExtract * BC.minFromExtract) return false;
        for (const c of map.crates) if (d2(x, z, c.x, c.z) < BC.minFromCrate * BC.minFromCrate) return false;
        for (const mn of Z.mines) if (d2(x, z, mn.x, mn.z) < 16) return false;
        for (const pt of Z.pits) if (d2(x, z, pt.x, pt.z) < (PC.radius + 3.2) * (PC.radius + 3.2)) return false;
        for (const o of list) if (d2(x, z, o.x, o.z) < 3.6) return false;
        return col.free(x, z, 1.8);
      };
      for (let guard = 0; list.length < target && guard < 600; guard++) {
        let cx, cz;
        if (map.roadPts.length && rng.chance(BC.roadBias)) { const p = rng.pick(map.roadPts); cx = p.x + rng.range(-6, 6); cz = p.z + rng.range(-6, 6); }
        else { cx = rng.range(-lim, lim); cz = rng.range(-lim, lim); }
        const n = rng.chance(BC.clusterChance) ? rng.int(2, 3) : 1;
        for (let i = 0; i < n && list.length < target; i++) {
          const a = rng.range(0, 6.283), r = n > 1 ? rng.range(1.6, 3.2) : 0, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
          if (ok(x, z)) list.push({ x, z, gy: map.height(x, z), on: true, ph: rng.range(0, 1) });
        }
      }
      Z.barrels = list;
      const n = list.length, sc = Z.ctx.scene; if (!n) return;
      const gs = [
        new T.CylinderGeometry(0.68, 0.68, 1.62, 14),
        new T.CylinderGeometry(0.71, 0.71, 0.3, 14),
        new T.CylinderGeometry(0.71, 0.71, 0.14, 14),
        new T.RingGeometry(0.82, 1.18, 22).rotateX(-Math.PI / 2),
        new T.CylinderGeometry(1.65, 1.85, 0.05, 16),
      ];
      Z.geos.push(...gs);
      const mats = [
        new T.MeshLambertMaterial({ color: 0xd9241e }),
        new T.MeshLambertMaterial({ color: 0xffb400 }),
        new T.MeshLambertMaterial({ color: 0x1e2024 }),
        new T.MeshBasicMaterial({ color: 0xff3a22, transparent: true, opacity: 0.6, depthWrite: false }),
        new T.MeshLambertMaterial({ color: 0x221a14 }),
      ];
      Z.bms = gs.map((g, k) => { const im = new T.InstancedMesh(g, mats[k], n); im.frustumCulled = false; sc.add(im); return im; });
      list.forEach((b, i) => { b.i = i; Z.placeBarrel(b, true); });
    },

    placeBarrel(b, on) {
      if (!Z.bms) return;
      const [body, band, cap, ring, crater] = Z.bms, i = b.i, x = b.x, z = b.z, y = b.gy;
      setM(body, i, x, y + 0.81, z, on ? 1 : 0);
      setM(band, i, x, y + 0.82, z, on ? 1 : 0);
      setM(cap, i, x, y + 1.58, z, on ? 1 : 0);
      setM(ring, i, x, y + 0.08, z, on ? 1 : 0);
      setM(crater, i, x, y + 0.03, z, on ? 0 : 1);
      for (const m of Z.bms) m.instanceMatrix.needsUpdate = true;
    },

    placePits(m) {
      const map = Z.ctx.map, col = Z.ctx.col, rng = Z.rng2, lim = map.half - 18, st = map.start, ex = map.extract, list = [];
      const target = Z.mission.tutorial ? PC.tutorialCount : Math.min(PC.maxCount, Math.round(PC.baseCount + PC.perMission * m));
      const ok = (x, z) => {
        if (Math.abs(x) > lim || Math.abs(z) > lim || d2(x, z, st.x, st.z) < PC.minFromStart * PC.minFromStart) return false;
        if (ex && d2(x, z, ex.x, ex.z) < PC.minFromExtract * PC.minFromExtract) return false;
        for (const c of map.crates) if (d2(x, z, c.x, c.z) < PC.minFromCrate * PC.minFromCrate) return false;
        for (const mn of Z.mines) if (d2(x, z, mn.x, mn.z) < (PC.radius + 3.0) * (PC.radius + 3.0)) return false;
        for (const o of list) if (d2(x, z, o.x, o.z) < PC.minGap * PC.minGap) return false;
        return col.free(x, z, PC.radius + 1.5);
      };
      for (let guard = 0; list.length < target && guard < 600; guard++) {
        let x, z;
        if (map.roadPts.length && rng.chance(PC.roadBias)) { const p = rng.pick(map.roadPts); x = p.x + rng.range(-7, 7); z = p.z + rng.range(-7, 7); }
        else { x = rng.range(-lim, lim); z = rng.range(-lim, lim); }
        if (ok(x, z)) list.push({ x, z, gy: map.height(x, z), ph: rng.range(0, 1) });
      }
      Z.pits = list;
      const n = list.length, sc = Z.ctx.scene; if (!n) return;
      const R = PC.radius;
      const gs = [
        new T.CylinderGeometry(R * 1.05, R * 1.32, 0.34, 24),
        new T.CylinderGeometry(R * 0.94, R * 0.9, 0.38, 24),
        new T.CylinderGeometry(R * 0.84, R * 0.8, 0.42, 24),
        new T.RingGeometry(R * 1.1, R * 1.32, 28).rotateX(-Math.PI / 2),
      ];
      Z.geos.push(...gs);
      const mats = [
        new T.MeshLambertMaterial({ color: 0x5c4228 }),
        new T.MeshLambertMaterial({ color: 0x1c140e }),
        new T.MeshBasicMaterial({ color: 0x040406 }),
        new T.MeshBasicMaterial({ color: 0xff3a22, transparent: true, opacity: 0.65, depthWrite: false }),
      ];
      Z.pms = gs.map((g, k) => { const im = new T.InstancedMesh(g, mats[k], n); im.frustumCulled = false; sc.add(im); return im; });
      list.forEach((pt, i) => {
        pt.i = i;
        setM(Z.pms[0], i, pt.x, pt.gy + 0.04, pt.z, 1);
        setM(Z.pms[1], i, pt.x, pt.gy + 0.06, pt.z, 1);
        setM(Z.pms[2], i, pt.x, pt.gy + 0.08, pt.z, 1);
        setM(Z.pms[3], i, pt.x, pt.gy + 0.14, pt.z, 1);
      });
      for (const m of Z.pms) m.instanceMatrix.needsUpdate = true;
    },

    // ------------------------------------------------------------------ simulation (play phase only)
    update(dt, ctx, play, tm) {
      Z.key = '';
      if (!play || !Z.ctx) return;
      if (Z.minesOn) Z.updateMines(dt);
      if (Z.barrelsOn) Z.updateBarrels(dt);
      if (Z.pitsOn) Z.updatePits(dt);
      if (Z.tornOn) Z.updateTornado(dt, tm);
    },

    updateBarrels() {
      const c = Z.ctx, J = c.jeep, tr2 = BC.trigger * BC.trigger;
      if (!J.alive) return;
      for (const b of Z.barrels) {
        if (!b.on) continue;
        if (d2(b.x, b.z, J.x, J.z) < tr2) Z.boomBarrel(b, 'jeep');
      }
    },

    boomBarrel(b, who) {
      if (!b.on) return;
      const c = Z.ctx, J = c.jeep, N = c.nana, P = c.particles, E = c.enemies, y = b.gy + 0.9;
      b.on = false; Z.placeBarrel(b, false);
      P.poof(b.x, y, b.z, 16, 2.5); P.sparks(b.x, y + 0.5, b.z, 28, 1, 0.55, 0.15); P.dust(b.x, b.gy, b.z, 9);
      WZ.Audio.sfx('boom'); WZ.Fx.shake(who === 'jeep' ? 0.65 : 0.35); WZ.Fx.text('BOOM!', b.x, y + 3.4, b.z, 'bonk');
      E.hash.query(b.x, b.z, BC.blast, E.q);
      for (const e of E.q.slice()) { if (!e.active || e.state === 2) continue; E.ko(e, e.x - b.x, e.z - b.z, 13, 'barrel'); }
      if (WZ.Giants) WZ.Giants.splash(b.x, b.z, BC.blast * 0.6, BC.giantDamage, 'barrel');
      if (who === 'jeep' && J.alive) {
        const dmg = BC.damage;
        if (dmg >= J.hp) J.deathCause = 'barrel';
        J.hurt(dmg); J.vx *= BC.slow; J.vz *= BC.slow; J.hop = 0.45;
        WZ.Fx.text('-' + dmg, J.rx, J.ry + 5, J.rz, 'warn'); WZ.Fx.flash('hurt');
      } else if (who === 'nana' && N.out && !N.isKO) {
        N.hurt(BC.nanaDamage); WZ.Fx.text('-' + BC.nanaDamage, N.rx, N.ry + 4, N.rz, 'warn');
      }
      for (const o of Z.barrels) {
        if (o.on && d2(b.x, b.z, o.x, o.z) < 16) Z.boomBarrel(o, 'chain');
      }
    },

    updatePits() {
      const c = Z.ctx, J = c.jeep;
      if (!J.alive) return;
      const tr2 = PC.trigger * PC.trigger;
      for (const pt of Z.pits) {
        if (d2(pt.x, pt.z, J.x, J.z) < tr2) { Z.fallInPit(pt); return; }
      }
    },

    fallInPit(pt) {
      const c = Z.ctx, J = c.jeep, P = c.particles;
      if (!J.alive) return;
      J.inPit = pt; J.pitSink = 0; J.deathCause = 'pit';
      J.vx = 0; J.vz = 0; J.speed = 0;
      P.dust(pt.x, pt.gy, pt.z, 14); P.poof(pt.x, pt.gy + 0.5, pt.z, 10, 1.8);
      WZ.Audio.sfx('crash'); WZ.Fx.shake(0.85); WZ.Fx.flash('hurt');
      const msg = (WZ.I18n && WZ.I18n.t) ? WZ.I18n.t('hud.pitfall') : 'FELL IN A PIT!';
      WZ.Fx.text(msg, J.rx, J.ry + 4.5, J.rz, 'warn');
      J.hurt(Math.ceil(J.hp) + 999);
    },

    updateMines(dt) {
      const c = Z.ctx, J = c.jeep, N = c.nana; let near = 1e9;
      for (const mn of Z.mines) {
        if (!mn.on) continue;
        const dj = d2(mn.x, mn.z, J.x, J.z); if (dj < near) near = dj;
        if (J.alive && dj < MC.trigger * MC.trigger) { Z.boom(mn, 'jeep'); continue; }
        if (N.out && !N.isKO && d2(mn.x, mn.z, N.x, N.z) < MC.nanaTrigger * MC.nanaTrigger) Z.boom(mn, 'nana');
      }
      Z.nearest = Math.sqrt(near);
      if (J.alive && Z.nearest < MC.detectRange && J.speed > 2) {
        Z.pingT -= dt; if (Z.pingT <= 0) { Z.pingT = U.clamp(Z.nearest / MC.detectRange * 0.6, 0.12, 0.6); WZ.Audio.sfx('mine'); }
        if (Z.nearest < MC.detectRange * 0.75) Z.key = 'hud.mines';
      }
    },

    boom(mn, who) {
      const c = Z.ctx, J = c.jeep, N = c.nana, P = c.particles, E = c.enemies, y = mn.gy + 0.6;
      mn.on = false; Z.place(mn, false);
      P.poof(mn.x, y, mn.z, 14, 2.4); P.sparks(mn.x, y + 0.5, mn.z, 26, 1, 0.7, 0.2); P.dust(mn.x, mn.gy, mn.z, 8);
      WZ.Audio.sfx('boom'); WZ.Fx.shake(who === 'jeep' ? 0.75 : 0.4); WZ.Fx.text('BOOM!', mn.x, y + 3.5, mn.z, 'bonk');
      E.hash.query(mn.x, mn.z, MC.blast, E.q);
      for (const e of E.q.slice()) { if (!e.active || e.state === 2) continue; E.ko(e, e.x - mn.x, e.z - mn.z, 12, 'mine'); }
      if (WZ.Giants) WZ.Giants.splash(mn.x, mn.z, MC.blast * 0.6, MC.giantDamage, 'mine');
      if (who === 'jeep') {
        // TWO-STRIKE RULE: the first mine costs half of the jeep's max HP, the second one destroys it
        J.mineHits = (J.mineHits || 0) + 1;
        const dmg = J.mineHits >= 2 ? Math.ceil(J.hp) + 1 : Math.round(J.maxHp * MC.jeepFirstHit);
        if (dmg >= J.hp) J.deathCause = 'mine';
        J.hurt(dmg); J.vx *= MC.slow; J.vz *= MC.slow; J.hop = 0.6;
        WZ.Fx.text(J.mineHits >= 2 ? 'MINE #2!' : '-' + dmg, J.rx, J.ry + 5, J.rz, 'warn'); WZ.Fx.flash('hurt');
        WZ.Events.emit('jeep:mine', { hits: J.mineHits });
      } else { N.hurt(MC.nanaDamage); WZ.Fx.text('-' + MC.nanaDamage, N.rx, N.ry + 4, N.rz, 'warn'); }
    },

    startWarn(tm) {
      const J = Z.ctx.jeep, rng = Z.rng, lim = Z.ctx.map.half - 12; let x = 0, z = 0;
      for (let k = 0; k < 8; k++) {
        const a = rng.range(0, 6.283), d = rng.range(TC.spawnDist[0], TC.spawnDist[1]); x = J.x + Math.sin(a) * d; z = J.z + Math.cos(a) * d;
        if (Math.abs(x) < lim && Math.abs(z) < lim) break;
      }
      x = U.clamp(x, -lim, lim); z = U.clamp(z, -lim, lim);
      Z.torn = { phase: 'warn', t: 0, x, z, hd: Math.atan2(J.x - x, J.z - z), spin: rng.sign(), ph: rng.range(0, 6), scale: 0.15, start: tm };
      Z.tg.visible = true; WZ.Audio.sfx('siren'); WZ.Fx.shake(0.2); WZ.Fx.text('TORNADO!', J.rx, J.ry + 6, J.rz, 'warn');
    },

    /** the vehicle is released: thrown outward, brief immunity so it can drive away */
    releaseJeep(Tn, J) {
      const k = J.captive; if (!k) return;
      J.captive = null; Z.immune = TC.immune; Z.caught = 0;
      const ox = Math.cos(k.ang), oz = Math.sin(k.ang), tx = -oz * Tn.spin, tz = ox * Tn.spin;
      J.vx = ox * TC.throwSpeed + tx * 6; J.vz = oz * TC.throwSpeed + tz * 6; J.h = Math.atan2(J.vx, J.vz); J.targetH = J.h; J.hop = 0.45;
      J.speed = Math.hypot(J.vx, J.vz);
      WZ.Fx.text(WZ.I18n.t('hud.tornadoFree'), J.rx, J.ry + 6, J.rz, 'good'); WZ.Fx.flash('good'); WZ.Audio.sfx('boost');
    },

    updateTornado(dt, tm) {
      const c = Z.ctx, J = c.jeep, N = c.nana, E = c.enemies, Tn = Z.torn, rng = Z.rng, lim = c.map.half - 10;
      if (Z.immune > 0) Z.immune -= dt;
      if (!Tn) { if (J.alive && tm >= Z.nextT) Z.startWarn(tm); return; }
      Tn.t += dt;
      if (Tn.phase === 'warn') {
        Tn.scale = 0.15 + 0.85 * Math.min(1, Tn.t / TC.warn); Z.key = 'hud.tornado';
        if (Tn.t >= TC.warn) { Tn.phase = 'active'; Tn.t = 0; WZ.Fx.shake(0.3); }
        return;
      }
      const cap = J.captive;
      if (Tn.phase === 'active') {
        Tn.scale = 1;
        if (Tn.t >= TC.life) { if (cap) Tn.t = TC.life - 0.01; else { Tn.phase = 'fade'; Tn.t = 0; } }   // never vanish while it is holding the vehicle
        const sp = Math.min(TC.maxSpeed, TC.speed + TC.speedPerMission * Z.mission.index) * (cap ? 0.2 : 1);
        const want = Math.atan2(J.x - Tn.x, J.z - Tn.z) + Math.sin(Tn.t * 0.8 + Tn.ph) * 0.9 * (1 - TC.homing);
        Tn.hd += U.clamp(U.angDiff(Tn.hd, want), -TC.turn * dt, TC.turn * dt);
        Tn.x = U.clamp(Tn.x + Math.sin(Tn.hd) * sp * dt, -lim, lim); Tn.z = U.clamp(Tn.z + Math.cos(Tn.hd) * sp * dt, -lim, lim);
      } else {
        Tn.scale = Math.max(0, 1 - Tn.t / TC.fade);
        if (cap) Z.releaseJeep(Tn, J);
        if (Tn.t >= TC.fade) { Z.torn = null; Z.tg.visible = false; Z.nextT = tm + rng.range(TC.gap[0], TC.gap[1]); Z.caught = 0; return; }
      }
      const R = TC.radius * Tn.scale, pullR = TC.pullRadius * Tn.scale, coreR = TC.core * Tn.scale, dj = Math.hypot(J.x - Tn.x, J.z - Tn.z);

      if (J.captive) {
        // ---- CAUGHT: whirled around the funnel, lifted, spinning, zero control, for TC.hold seconds
        const k = J.captive; k.t += dt;
        const ox = J.x, oz = J.z;
        k.ang += (TC.orbitSpin + 0.5 * Math.sin(k.t * 2.1)) * Tn.spin * dt;
        const rOrb = 2.7 + 1.0 * Math.sin(k.t * 2.3), r = U.lerp(k.r0, rOrb, U.smooth(0, 1, Math.min(1, k.t / 0.6)));
        J.x = Tn.x + Math.cos(k.ang) * r; J.z = Tn.z + Math.sin(k.ang) * r;
        J.vx = (J.x - ox) / dt; J.vz = (J.z - oz) / dt;
        J.h += TC.spin * 1.7 * Tn.spin * dt;
        const up = U.smooth(0, 1, Math.min(1, k.t / 0.7)) * (1 - U.smooth(0, 1, Math.max(0, (k.t - (TC.hold - 0.45)) / 0.45)));
        J.lift = (TC.lift + 0.5 * Math.sin(k.t * 4.4)) * up; J.tiltX = 0.32 * Math.sin(k.t * 3.1) * up; J.tiltZ = (0.42 + 0.15 * Math.sin(k.t * 5)) * up;
        WZ.Fx.shake(0.22); Z.key = 'hud.tornadoCaught';
        Z.windT -= dt; if (Z.windT <= 0) { Z.windT = 0.4; WZ.Audio.sfx('wind'); }
        c.particles.dust(J.x + (Math.random() - 0.5) * 2, J.ry + J.lift * 0.4, J.z + (Math.random() - 0.5) * 2, 1);
        if (k.t >= TC.hold || !J.alive) Z.releaseJeep(Tn, J);
      } else if (J.alive && dj < pullR && Z.immune <= 0) {
        // ---- PULL ZONE: the closer, the slower you are and the harder it drags you in (boost = the way out)
        const kk0 = 1 - dj / pullR, kk = kk0 * kk0 * (3 - 2 * kk0), l = dj || 1;
        J.slow = Math.min(J.slow, J.boosting ? 1 - TC.slowBoost * kk : 1 - TC.slow * kk);
        const a = TC.pullAccel * kk * dt;
        J.vx += (Tn.x - J.x) / l * a; J.vz += (Tn.z - J.z) / l * a;
        J.h += Tn.spin * TC.spin * 0.22 * kk * dt;
        WZ.Fx.shake(0.04 + 0.16 * kk); Z.key = kk > 0.35 ? 'hud.tornadoPull' : 'hud.tornado';
        Z.windT -= dt; if (Z.windT <= 0) { Z.windT = 0.55 - 0.25 * kk; WZ.Audio.sfx('wind', 0.5 + kk * 0.6); }
        if (dj < coreR && !J.captive) {
          J.captive = { t: 0, ang: Math.atan2(J.z - Tn.z, J.x - Tn.x), r0: dj };
          Z.caught = 1; WZ.Fx.text(WZ.I18n.t('hud.tornadoSpin'), J.rx, J.ry + 6, J.rz, 'warn'); WZ.Fx.flash('hurt'); WZ.Audio.sfx('siren');
        }
      } else { Z.caught = 0; if (dj < 55 && Z.immune <= 0) Z.key = 'hud.tornado'; }

      if (N.out && !N.isKO && Math.hypot(N.x - Tn.x, N.z - Tn.z) < R * 0.85) {
        Z.nanaT -= dt; if (Z.nanaT <= 0) { Z.nanaT = 0.5; N.hurt(TC.nanaDamage); }
      }
      E.hash.query(Tn.x, Tn.z, R * 1.15, E.q);
      for (const e of E.q.slice()) {
        if (!e.active || e.state === 2 || Math.hypot(e.x - Tn.x, e.z - Tn.z) > R) continue;
        const rx = e.x - Tn.x, rz = e.z - Tn.z;
        E.ko(e, rx - rz * Tn.spin * 0.8, rz + rx * Tn.spin * 0.8, 14, 'tornado');
      }
    },

    // ------------------------------------------------------------------ HUD / render
    hint() { return Z.key; },
    arrowPos() { const Tn = Z.torn; return Tn && Tn.phase !== 'fade' ? { x: Tn.x, y: Z.ctx.map.height(Tn.x, Tn.z) + 12, z: Tn.z } : null; },

    render(dt, tm) {
      if (!Z.ctx) return;
      if (Z.ms) {
        const lamp = Z.ms[4], ring = Z.ms[5];
        for (const mn of Z.mines) if (mn.on) {
          const ph = (tm * 1.1 + mn.ph) % 1;
          setM(lamp, mn.i, mn.x + 1.5, mn.gy + 2.75, mn.z, ph < 0.4 ? 1 : 0.25);
          setM(ring, mn.i, mn.x, mn.gy + 0.1, mn.z, 0.9 + 0.12 * Math.sin(tm * 5 + mn.ph * 6));
        }
        lamp.instanceMatrix.needsUpdate = ring.instanceMatrix.needsUpdate = true;
      }
      if (Z.bms) {
        const bring = Z.bms[3];
        for (const b of Z.barrels) if (b.on) {
          setM(bring, b.i, b.x, b.gy + 0.08, b.z, 0.92 + 0.12 * Math.sin(tm * 4.5 + b.ph * 6));
        }
        bring.instanceMatrix.needsUpdate = true;
      }
      if (Z.pms) {
        const pring = Z.pms[3];
        for (const pt of Z.pits) {
          setM(pring, pt.i, pt.x, pt.gy + 0.14, pt.z, 0.95 + 0.08 * Math.sin(tm * 3.8 + pt.ph * 6));
        }
        pring.instanceMatrix.needsUpdate = true;
      }
      const Tn = Z.torn; if (!Tn || !Z.tg) return;
      const gy = Z.ctx.map.height(Tn.x, Tn.z), s = Tn.scale * (1 + 0.03 * Math.sin(tm * 6));
      Z.tg.position.set(Tn.x, gy, Tn.z); Z.tg.scale.set(s, Tn.phase === 'warn' ? s * (0.5 + 0.5 * Tn.scale) : s, s);
      const warn = Tn.phase === 'warn', fz = Tn.scale;
      Z.ring.visible = true; Z.ring.material.opacity = warn ? 0.35 + 0.3 * Math.sin(tm * 12) : 0.14 + 0.07 * Math.sin(tm * 3);
      Z.ring.scale.setScalar(warn ? 1 : 1 + 0.015 * Math.sin(tm * 2)); Z.coreRing.visible = !warn; Z.coreRing.material.opacity = 0.3 + 0.2 * Math.sin(tm * 7);
      const sw = Tn.spin, H = Z.FH;
      // while the vehicle is caught the camera sits inside the funnel: fade the dust so the player can still see the spinning vehicle
      Z.fadeK = U.damp(Z.fadeK, Z.ctx.jeep.captive ? 0.22 : 1, 6, dt);
      for (const l of Z.layers) l.material.opacity = l.userData.op * Z.fadeK;
      for (const d of Z.disks) d.material.opacity = d.userData.op * (d.userData.cap ? Z.fadeK * Z.fadeK : Z.fadeK);
      Z.core.material.opacity = Z.core.userData.op * Z.fadeK;
      for (let i = 0; i < Z.layers.length; i++) {
        const l = Z.layers[i], u = l.userData; l.rotation.y += dt * u.sp * sw;
        const sway = i / Z.layers.length; l.position.x = Math.sin(tm * 1.7 + i * 0.55) * (0.15 + sway * sway * 2.6); l.position.z = Math.cos(tm * 1.45 + i * 0.5) * (0.12 + sway * sway * 2.2);
      }
      for (let i = 0; i < 2; i++) { const t = Z.texs[i]; t.offset.x -= dt * (0.05 + i * 0.03) * sw; t.offset.y += dt * 0.07; }
      Z.core.position.x = Math.sin(tm * 1.7 + 4) * 0.8; Z.core.position.z = Math.cos(tm * 1.45 + 4) * 0.7;
      for (let i = 0; i < Z.disks.length; i++) { Z.disks[i].rotation.y += dt * (0.7 + i * 0.15) * (i < 3 ? sw : -sw); }
      // debris spiralling up the funnel
      const im = Z.debris, U_ = Z.debrisU;
      for (let i = 0; i < U_.length; i++) {
        const d = U_[i]; d.a += d.sp * dt * sw * (1.6 - d.h / H); d.h += dt * 2.2 * d.s; if (d.h > H) d.h = 1 + Math.random() * 3;
        const r = (0.9 + 8.6 * Math.pow(d.h / H, 1.4)) * d.o + 0.6;
        vp.set(Math.cos(d.a) * r, d.h, Math.sin(d.a) * r); const q = d.a * 3 + tm * d.sp * 3;
        qT.setFromEuler(eT.set(q, q * 0.7, q * 1.3)); const sc = d.s * (0.8 + 0.5 * Math.sin(i)); vs.set(sc, sc, sc);
        m4.compose(vp, qT, vs); im.setMatrixAt(i, m4);
      }
      im.instanceMatrix.needsUpdate = true;
      // dust: skirt puffs at the base + swirling smoke ring, scaled with the funnel
      Z.dustT -= dt; if (Z.dustT <= 0 && fz > 0.3) {
        Z.dustT = 0.045; const PT = Z.ctx.particles;
        for (let k = 0; k < 2; k++) {
          const a = Math.random() * 6.283, rr = (3 + Math.random() * 7) * fz;
          PT.emit(0, Tn.x + Math.cos(a) * rr, gy + 0.4, Tn.z + Math.sin(a) * rr, -Math.sin(a) * 5 * sw + (Math.random() - 0.5), 1.5 + Math.random() * 3, Math.cos(a) * 5 * sw + (Math.random() - 0.5), 0.9 + Math.random() * 0.6, 1.4, 4.2, 0.74, 0.64, 0.5, 0.5, 0, 0, 0.6);
        }
      }
    },

    dispose() {
      const sc = Z.ctx && Z.ctx.scene;
      if (sc) {
        for (const m of Z.ms || []) sc.remove(m);
        for (const m of Z.bms || []) sc.remove(m);
        for (const m of Z.pms || []) sc.remove(m);
        if (Z.tg) sc.remove(Z.tg);
      }
      for (const g of Z.geos) g.dispose();
      for (const m of Z.layers) m.material.dispose();
      for (const m of Z.disks) m.material.dispose();
      if (Z.core) Z.core.material.dispose(); if (Z.coreRing) Z.coreRing.material.dispose();
      if (Z.debris) { Z.debris.material.dispose(); Z.debris.dispose(); }
      if (Z.ring) Z.ring.material.dispose(); for (const t of Z.texs) t.dispose();
      for (const m of Z.ms || []) { m.material.dispose(); m.dispose(); }
      for (const m of Z.bms || []) { m.material.dispose(); m.dispose(); }
      for (const m of Z.pms || []) { m.material.dispose(); m.dispose(); }
      Z.geos = []; Z.layers = []; Z.debris = null; Z.debrisU = []; Z.disks = []; Z.texs = []; Z.core = Z.coreRing = null; Z.mines = []; Z.barrels = []; Z.pits = []; Z.immune = 0;
      Z.ms = Z.bms = Z.pms = null; Z.tg = Z.ring = null; Z.torn = null; Z.ctx = null;
      Z.minesOn = Z.tornOn = Z.barrelsOn = Z.pitsOn = false; Z.key = ''; Z.caught = 0; Z.nearest = 1e9;
    },
  };
  WZ.Hazards = Z;
})(window.WZ = window.WZ || {});
