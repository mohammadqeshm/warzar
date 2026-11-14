/* WZ.WorldH.generate(runSeed, missionIndex, opts) — the SUNKEN HARBOR map (selected in the main menu; opts.theme === 'harbor').
 * Same contract as WZ.World.generate / WorldJ / WorldV / WorldF (start, crates, extract, nav grids, colliders, roads, height()), different content:
 *   - a derelict military port: the SEA lies to the east of a straight QUAY; wooden/concrete PIERS stick out into it. The sea is made of invisible-wall colliders
 *     (curb walls are drawn on them), so nobody can drive into the water - EXCEPT through the BROKEN SECTIONS of the piers (map.holes): rectangles where the deck has
 *     collapsed. They are open (no collider) - the vehicle that drives into one falls into the water (WZ.Harbor.fall) - and blocked for every AI (map.navBlock).
 *     Every pier has two half-width collapses on alternating sides (a chicane) and sometimes a full cut that leaves the pier tip as an unreachable dead end.
 *   - CONTAINER YARDS: grids of huge container blocks separated by narrow lanes (9 u, some 7.4 u). Some lane segments are PLUGGED (dead ends / detours).
 *   - DEPOTS: warehouses, fuel tanks, loose containers and a beached ship hull. STS gantry cranes decorate the quay, sunken ships rest in the water.
 *   - TOWER CRANES (map.cranes): each has a mast in a small plaza, a HOME pad (where its container rests) and - chosen after the objectives - a SLOT in a yard lane.
 *     WZ.Harbor swings the container from home to the slot to block that lane for a while (telegraphed).
 * Reachability is guaranteed the same way as on the other maps: crates + extraction are only sampled from nav cells reachable by BOTH the jeep and Nana,
 * and never close to the water / a broken section. */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG, W = CFG.world, R = WZ.RNG, U = WZ.U, HC = CFG.maps.harbor;
  const DECK = HC.deckH, SEABED = HC.seabed;

  function build(seed, mi, tutorial, sparse, relax) {
    const rng = R.create(seed), half = W.half, hn = R.noise2((seed ^ 0x4A2B0) | 0);
    const start = { x: rng.range(-30, 30), z: half - 24, heading: Math.PI };
    const Qx = rng.range(HC.quayX[0], HC.quayX[1]);
    const map = {
      seed, missionIndex: mi, tutorial, sparse, half, size: W.size, theme: 'harbor', quayX: Qx, seaLevel: HC.seaLevel,
      boxes: [], circles: [], houses: [], walls: [], towers: [], rocks: [], trees: [], smalls: [], grass: [],
      fires: [], smokes: [], roads: [], roadPts: [], clusters: [], tents: [], flags: [], wrecks: [], crates: [], extract: null, start,
      piers: [], holes: [], stacks: [], blocks: [], lanes: [], slots: [], cranes: [], ships: [], gantries: [], sheds: [], tanks: [], barriers: [], yards: [], noTornado: true,
    };
    const dStart = (x, z) => Math.hypot(x - start.x, z - start.z);
    const addBox = (x, z, hw, hd, kind) => map.boxes.push({ x, z, hw, hd, kind });

    // ---------- piers + broken sections
    const pw = HC.pierW, nP = sparse ? 3 : HC.piers;
    for (let t = 0; t < 300 && map.piers.length < nP; t++) {
      const zc = rng.range(-136, 96);
      if (map.piers.some((p) => Math.abs(p.zc - zc) < pw + 30)) continue;
      map.piers.push({ zc, L: rng.range(50, 80), pw, z0: zc - pw / 2, z1: zc + pw / 2 });
    }
    if (map.piers.length < 3) return null;
    map.piers.sort((a, b) => a.zc - b.zc);
    const hl = HC.holeLen, hwid = Math.round(pw * HC.holeFrac * 10) / 10;
    for (const p of map.piers) {
      const sideA = rng.chance(0.5), xa = Qx + p.L * rng.range(0.3, 0.4), xb = Qx + p.L * rng.range(0.6, 0.7);
      const mk = (xc, low, full) => ({ x0: xc - hl / 2, x1: xc + hl / 2, z0: full || low ? p.z0 : p.z1 - hwid, z1: full || !low ? p.z1 : p.z0 + hwid, full: !!full, low, pier: p });
      map.holes.push(mk(xa, sideA, false), mk(xb, !sideA, false));
      if (!sparse && rng.chance(HC.fullCut)) map.holes.push(mk(Qx + p.L * 0.88, false, true));
      p.holes = map.holes.filter((h) => h.pier === p);
    }
    const holeD = (h, x, z) => Math.hypot(Math.max(h.x0 - x, 0, x - h.x1), Math.max(h.z0 - z, 0, z - h.z1));
    /** inside a collapsed deck section (m = how far inside the rim) */
    const inHole = (x, z, m) => { for (const h of map.holes) if (x > h.x0 + m && x < h.x1 - m && z > h.z0 + m * 0.5 && z < h.z1 - m * 0.5) return h; return null; };
    map.inHole = inHole;
    map.navBlock = (x, z) => { for (const h of map.holes) if (x > h.x0 - 0.6 && x < h.x1 + 0.6 && z > h.z0 - 0.6 && z < h.z1 + 0.6) return true; return false; };

    // ---------- the sea = invisible walls between / beyond the piers
    const far = half + 60, sea = (x0, x1, z0, z1) => { if (x1 - x0 > 0.5 && z1 - z0 > 0.5) addBox((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2, 'sea'); };
    let zPrev = -far;
    for (const p of map.piers) { sea(Qx, far, zPrev, p.z0); sea(Qx + p.L, far, p.z0, p.z1); zPrev = p.z1; }
    sea(Qx, far, zPrev, far);
    const seaBoxes = map.boxes.slice();
    /** distance to the water (sea walls) or to a broken section */
    const waterDist = (x, z) => {
      let d = 1e9;
      for (const b of seaBoxes) { const dx = Math.max(Math.abs(x - b.x) - b.hw, 0), dz = Math.max(Math.abs(z - b.z) - b.hd, 0), e = Math.hypot(dx, dz); if (e < d) d = e; }
      for (const h of map.holes) { const e = holeD(h, x, z); if (e < d) d = e; }
      return d;
    };
    map.waterDist = waterDist;

    // ---------- terrain: flat concrete land, quay, piers (deck height) falling away into the seabed; broken sections dip into the water
    const deckDist = (x, z) => {
      const d = x - Qx; if (d <= 0) return 0;
      let m = d;
      for (const p of map.piers) { const e = Math.hypot(Math.max(0, x - (Qx + p.L)), Math.max(0, Math.abs(z - p.zc) - p.pw / 2)); if (e < m) m = e; }
      return m;
    };
    const edgeD = (x, z) => Math.max(Math.abs(x) - (half + 4), Math.abs(z) - (half + 4), 0);
    const bump = (x, z) => (R.fbm(hn, x * 0.012 + 5.1, z * 0.012 + 9.7) - 0.5) * 0.7 + (R.fbm(hn, x * 0.05 + 1.3, z * 0.05 + 7.7) - 0.5) * 0.18;
    const height = (x, z) => {
      const dd = Math.max(deckDist(x, z), edgeD(x, z));
      let h = U.lerp(SEABED, DECK + (x < Qx ? bump(x, z) * U.smooth(Qx, Qx - 8, x) * HC.hillAmp : 0), U.smooth(2.8, 0, dd));
      if (x > Qx - 2) for (let i = 0; i < map.holes.length; i++) { const hd = holeD(map.holes[i], x, z); if (hd < 1.7) h = U.lerp(h, SEABED, U.smooth(1.7, 0, hd)); }
      return h;
    };
    map.height = height;

    // ---------- helpers
    const circOk = (x, z, r, gap) => {
      for (const b of map.boxes) { const dx = Math.max(Math.abs(x - b.x) - b.hw, 0), dz = Math.max(Math.abs(z - b.z) - b.hd, 0); if (Math.hypot(dx, dz) < r + gap) return false; }
      for (const c of map.circles) if (Math.hypot(x - c.x, z - c.z) < r + c.r + gap) return false;
      return true;
    };
    const rectOk = (x, z, hw, hd, gap) => {
      for (const b of map.boxes) if (Math.abs(x - b.x) - (hw + b.hw) < gap && Math.abs(z - b.z) - (hd + b.hd) < gap) return false;
      for (const c of map.circles) { const dx = Math.max(Math.abs(x - c.x) - hw, 0), dz = Math.max(Math.abs(z - c.z) - hd, 0); if (Math.hypot(dx, dz) < c.r + gap) return false; }
      return true;
    };
    const place = (n, tries, fn) => { for (let k = 0, t = 0; k < n && t < tries; t++) if (fn()) k++; };
    /** fill a rectangle with container stacks (long axis along z when longZ) */
    const fill = (x, z, hw, hd, longZ, base) => {
      const L = longZ ? hd * 2 : hw * 2, Wd = longZ ? hw * 2 : hd * 2, nl = Math.max(1, Math.round(L / 12.6)), nw = Math.max(1, Math.round(Wd / 2.65)), cl = L / nl, cw = Wd / nw;
      for (let a = 0; a < nl; a++) for (let b = 0; b < nw; b++) {
        const lo = -L / 2 + (a + 0.5) * cl, wo = -Wd / 2 + (b + 0.5) * cw;
        const t = Math.max(1, Math.min(3, base + (rng.chance(0.3) ? 1 : 0) - (rng.chance(0.28) ? 1 : 0)));
        map.stacks.push({ x: longZ ? x + wo : x + lo, z: longZ ? z + lo : z + wo, sx: (longZ ? cw : cl) - 0.14, sz: (longZ ? cl : cw) - 0.14, t, rot: rng.range(-0.012, 0.012) });
      }
    };
    const barrels = (x, z, n) => { for (let i = 0; i < n; i++) map.smalls.push({ t: 'barrel', x: x + rng.range(-1.6, 1.6), z: z + rng.range(-1.6, 1.6), ly: 0, rot: rng.range(0, 6.28) }); };
    const pile = (x, z, rot) => { const cs = Math.cos(rot), sn = Math.sin(rot); for (const b of [[-1.6, 0], [0, 0], [1.6, 0], [-0.8, 0.54], [0.8, 0.54], [0, 1.08]]) map.smalls.push({ t: 'bag', x: x + b[0] * cs, z: z - b[0] * sn, ly: b[1], rot }); };

    // ---------- districts: 2 x 3 over the land; a few are open DEPOTS, the rest are container YARDS
    const dx0 = -half + 16, dx1 = Qx - 17, dz0 = -half + 16, dz1 = 104, nCol = 2, nRow = 3;
    const dW = (dx1 - dx0) / nCol, dH = (dz1 - dz0) / nRow, depots = new Set();
    while (depots.size < (sparse ? 2 : 1)) depots.add(rng.int(0, nCol * nRow - 1));
    const lanePick = () => { const r = rng.next(); return r < 0.5 ? 9.4 : r < 0.75 ? 9.0 : 7.4; };
    let wreckShip = false;
    const craneCells = [];
    for (let di = 0; di < nCol * nRow; di++) {
      const ci = di % nCol, ri = (di / nCol) | 0, D = { x0: dx0 + ci * dW + 5, x1: dx0 + (ci + 1) * dW - 5, z0: dz0 + ri * dH + 5, z1: dz0 + (ri + 1) * dH - 5 };
      D.cx = (D.x0 + D.x1) / 2; D.cz = (D.z0 + D.z1) / 2;
      if (depots.has(di)) {
        // ---- depot: warehouses, fuel tanks, loose containers, maybe a beached ship hull
        map.clusters.push({ x: D.cx, z: D.cz, r: 28, houses: 0 });
        if (!wreckShip && !sparse) {
          wreckShip = true; const along = rng.chance(0.5), len = rng.range(44, 54), wid = 12.5;
          const sx = D.cx + rng.range(-8, 8), sz = D.cz + rng.range(-8, 8), hw = along ? len / 2 : wid / 2, hd = along ? wid / 2 : len / 2;
          if (rectOk(sx, sz, hw + 2, hd + 2, 6)) { map.ships.push({ x: sx, z: sz, len, wid, yaw: along ? Math.PI / 2 : 0, beached: true }); addBox(sx, sz, hw, hd, 'ship'); map.smokes.push({ x: sx, z: sz, gy: DECK + 12 }); }
        }
        place(sparse ? 1 : 2, 60, () => {
          const w = rng.range(26, 34), d = rng.range(14, 17), x = rng.range(D.x0 + w / 2, D.x1 - w / 2), z = rng.range(D.z0 + d / 2, D.z1 - d / 2);
          if (!rectOk(x, z, w / 2, d / 2, 11)) return false;
          map.sheds.push({ x, z, w, d, h: rng.range(7.5, 9.5), rot: 0, v: rng.int(0, 2) }); addBox(x, z, w / 2, d / 2, 'shed'); return true;
        });
        place(sparse ? 1 : rng.int(2, 3), 80, () => {
          const r = rng.range(5.6, 7.2), x = rng.range(D.x0 + r, D.x1 - r), z = rng.range(D.z0 + r, D.z1 - r);
          if (!circOk(x, z, r, 10)) return false;
          map.tanks.push({ x, z, r, h: rng.range(8, 11), v: rng.int(0, 2) }); map.circles.push({ x, z, r }); return true;
        });
        place(sparse ? 3 : rng.int(8, 13), 200, () => {
          const longZ = rng.chance(0.5), hw = longZ ? 1.3 : 6.3, hd = longZ ? 6.3 : 1.3, x = rng.range(D.x0 + hw, D.x1 - hw), z = rng.range(D.z0 + hd, D.z1 - hd);
          if (!rectOk(x, z, hw, hd, 9)) return false;
          addBox(x, z, hw, hd, 'container'); fill(x, z, hw, hd, longZ, rng.chance(0.4) ? 2 : 1); return true;
        });
        place(3, 60, () => { const x = rng.range(D.x0 + 4, D.x1 - 4), z = rng.range(D.z0 + 4, D.z1 - 4); if (!circOk(x, z, 2.4, 6)) return false; barrels(x, z, rng.int(2, 4)); return true; });
        continue;
      }
      // ---- container yard
      const longZ = rng.chance(0.5), n = rng.int(5, 8), m = rng.int(2, 3), bw = longZ ? n * 2.62 : m * 12.6, bd = longZ ? m * 12.6 : n * 2.62;
      const xs = [], gx = [], zs = [], gz = [];
      for (let x = D.x0; x + bw <= D.x1;) { xs.push(x + bw / 2); const w = xs.length === 1 ? 9.4 : lanePick(); gx.push(w); x += bw + w; }
      for (let z = D.z0; z + bd <= D.z1;) { zs.push(z + bd / 2); const w = 9.4; gz.push(w); z += bd + w; }
      if (xs.length < 2 || zs.length < 2) continue;
      { const ox = (D.x1 - (xs[xs.length - 1] + bw / 2)) / 2, oz = (D.z1 - (zs[zs.length - 1] + bd / 2)) / 2; for (let i = 0; i < xs.length; i++) xs[i] += ox; for (let j = 0; j < zs.length; j++) zs[j] += oz; }   // centre the grid in its district
      const omit = new Set(), key = (i, j) => i + ',' + j;
      let cc = null;
      if (!sparse || craneCells.length < 1) {
        for (let t = 0; t < 12 && !cc; t++) { const i = rng.int(0, xs.length - 2), j = rng.int(0, zs.length - 1); cc = { i, j }; }
        omit.add(key(cc.i, cc.j)); omit.add(key(cc.i + 1, cc.j));
      }
      for (let i = 0; i < xs.length; i++) for (let j = 0; j < zs.length; j++) if (!omit.has(key(i, j)) && rng.chance(0.07)) omit.add(key(i, j));
      const base = rng.chance(0.5) ? 2 : 1;
      for (let i = 0; i < xs.length; i++) for (let j = 0; j < zs.length; j++) {
        if (omit.has(key(i, j))) continue;
        map.blocks.push({ x: xs[i], z: zs[j], hw: bw / 2, hd: bd / 2 }); addBox(xs[i], zs[j], bw / 2, bd / 2, 'container'); fill(xs[i], zs[j], bw / 2, bd / 2, longZ, base);
      }
      // plugs: some lane segments are closed with a container wall => dead ends / detours
      const segs = [];
      for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length; j++) {          // lane segment running along z, between column i and i+1
        const x = xs[i] + bw / 2 + gx[i] / 2, z = zs[j], ok = !omit.has(key(i, j)) && !omit.has(key(i + 1, j));
        if (ok && rng.chance(HC.plug)) { addBox(x, z, gx[i] / 2 + 0.05, bd / 2, 'container'); fill(x, z, gx[i] / 2, bd / 2, longZ, 2); map.blocks.push({ x, z, hw: gx[i] / 2, hd: bd / 2 }); }
        else segs.push({ x, z, w: gx[i], axis: 'z', hw: gx[i] / 2 + 1.1, hd: 1.3, inner: [gx[i] / 2 - 0.4, 1.0] });
      }
      for (let i = 0; i < xs.length; i++) for (let j = 0; j < zs.length - 1; j++) {          // lane segment running along x, between row j and j+1
        const x = xs[i], z = zs[j] + bd / 2 + gz[j] / 2, ok = !omit.has(key(i, j)) && !omit.has(key(i, j + 1));
        if (ok && rng.chance(HC.plug * 0.8)) { addBox(x, z, bw / 2, gz[j] / 2 + 0.05, 'container'); fill(x, z, bw / 2, gz[j] / 2, longZ, 2); map.blocks.push({ x, z, hw: bw / 2, hd: gz[j] / 2 }); }
        else segs.push({ x, z, w: gz[j], axis: 'x', hw: 1.3, hd: gz[j] / 2 + 1.1, inner: [1.0, gz[j] / 2 - 0.4] });
      }
      for (const s of segs) map.slots.push(s);
      const yard = { x0: xs[0] - bw / 2, x1: xs[xs.length - 1] + bw / 2, z0: zs[0] - bd / 2, z1: zs[zs.length - 1] + bd / 2, longZ, bw, bd, xs, zs, gx, gz };
      map.yards.push(yard); map.clusters.push({ x: D.cx, z: D.cz, r: 26, houses: 0 });
      // lane centre lines (roads for the ground paint + hazard bias)
      for (let i = 0; i < xs.length - 1; i++) map.lanes.push({ axis: 'z', x: xs[i] + bw / 2 + gx[i] / 2, a: yard.z0, b: yard.z1, w: gx[i] });
      for (let j = 0; j < zs.length - 1; j++) map.lanes.push({ axis: 'x', z: zs[j] + bd / 2 + gz[j] / 2, a: yard.x0, b: yard.x1, w: gz[j] });
      if (cc) {
        const cx = xs[cc.i], cz = zs[cc.j], hx = xs[cc.i + 1], hz = zs[cc.j];
        addBox(cx, cz, 2.5, 2.5, 'crane');
        map.cranes.push({ x: cx, z: cz, hx, hz, hhw: longZ ? 1.3 : 6.1, hhd: longZ ? 6.1 : 1.3, longZ, reach: HC.jib - 2, slot: null, id: map.cranes.length });
        craneCells.push(cc);
      }
      // loose barrels along the lane walls
      place(sparse ? 2 : 6, 80, () => { const i = rng.int(0, xs.length - 2), j = rng.int(0, zs.length - 1), x = xs[i] + bw / 2 + rng.range(0.6, 1.4), z = zs[j] + rng.range(-bd / 2 + 2, bd / 2 - 2); if (!circOk(x, z, 0.6, 0)) { return false; } barrels(x, z, 2); return true; });
    }
    if (map.cranes.length < 1) return null;
    if (map.yards.length < 3) return null;

    // ---------- quay: STS gantry cranes + bollard line, start camp + barriers
    place(sparse ? 1 : 3, 120, () => {
      const zc = rng.range(-146, 100);
      if (map.piers.some((p) => Math.abs(p.zc - zc) < pw / 2 + 12)) return false;
      if (map.gantries.some((g) => Math.abs(g.z - zc) < 40)) return false;
      const legs = [[Qx - 1.8, zc - 6], [Qx - 1.8, zc + 6], [Qx - 11.5, zc - 6], [Qx - 11.5, zc + 6]];
      if (!legs.every((l) => circOk(l[0], l[1], 1.2, 2))) return false;
      for (const l of legs) addBox(l[0], l[1], 1.0, 1.0, 'gantry');
      map.gantries.push({ x: Qx - 6.6, z: zc, legs, v: rng.int(0, 2) }); return true;
    });
    map.tents.push({ x: start.x + 18, z: start.z + 5 }); addBox(start.x + 18, start.z + 5, 3.2, 2.6, 'tent');
    map.circles.push({ x: start.x - 14, z: start.z + 3, r: 0.5 });
    pile(start.x + 9, start.z - 8, 0.3); pile(start.x - 9, start.z - 9, -0.3); barrels(start.x + 12, start.z - 5, 3); barrels(start.x - 17, start.z + 9, 2);
    for (let k = 0; k < (sparse ? 2 : 6); k++) {      // jersey barriers on the apron
      const x = start.x + rng.range(-60, 60), z = start.z - rng.range(22, 40), ry = rng.chance(0.5) ? 0 : Math.PI / 2;
      if (Math.abs(x) > half - 30 || x > Qx - 20 || !rectOk(x, z, 2.2, 2.2, 8) || dStart(x, z) < 30) continue;
      map.barriers.push({ x, z, ry }); addBox(x, z, ry ? 0.6 : 1.6, ry ? 1.6 : 0.6, 'barrier');
    }
    map.clusters.push({ x: start.x * 0.4, z: 70, r: 26, houses: 0 });
    // sunken ships in the water: in the slips between the piers (and beyond the tips)
    const slips = []; let zp = -half;
    for (const p of map.piers) { slips.push({ z0: zp, z1: p.z0, x0: Qx + 22 }); zp = p.z1; }
    slips.push({ z0: zp, z1: half, x0: Qx + 22 });
    for (const sl of slips) {
      const cz = (sl.z0 + sl.z1) / 2, wd = sl.z1 - sl.z0;
      if (wd < 34 || Math.abs(cz) > half + 20) continue;
      const len = rng.range(40, 56), wid = rng.range(10, 13);
      map.ships.push({ x: Qx + rng.range(46, 108), z: cz + rng.range(-Math.min(6, wd / 2 - wid - 4), Math.min(6, wd / 2 - wid - 4)), len, wid, yaw: Math.PI / 2 + rng.range(-0.1, 0.1), sunk: true, tilt: rng.range(0.12, 0.3) * (rng.chance(0.5) ? 1 : -1), pitch: rng.range(-0.1, 0.14), v: rng.int(0, 2) });
      if (map.ships.filter((s) => s.sunk).length >= 4) break;
    }
    map.ships.push({ x: Qx + rng.range(150, 190), z: rng.range(-90, 90), len: 78, wid: 17, yaw: Math.PI / 2 + rng.range(-0.3, 0.3), sunk: true, tilt: 0.34, pitch: 0.08, v: 1, big: true });

    // hazards never go into the yards (lanes are too narrow for pits / barrels to be safe) or near the water / broken decks
    map.noHazard = (x, z) => {
      if (x > Qx - 1) return waterDist(x, z) < 10 || Math.abs(x) > half - 16;
      for (const y of map.yards) if (x > y.x0 - 4 && x < y.x1 + 4 && z > y.z0 - 4 && z < y.z1 + 4) return true;
      return false;
    };
    for (const l of map.lanes) {      // roads for the hazard bias + the ground paint
      const n = Math.ceil((l.b - l.a) / 4); for (let i = 0; i <= n; i++) { const t = l.a + (l.b - l.a) * i / n; map.roadPts.push(l.axis === 'z' ? { x: l.x, z: t } : { x: t, z: l.z }); }
    }
    for (let z = -half + 20; z < half - 20; z += 6) map.roadPts.push({ x: Qx - 7, z });
    map.focus = { x: Qx - 8, z: map.piers[Math.min(1, map.piers.length - 1)].zc - 6 };

    // ---------- navigation grids + objectives
    map.nav = { jeep: WZ.NavGrid.build(map, CFG.jeep.radius + 0.5), nana: WZ.NavGrid.build(map, 0.9) };
    const rj = map.nav.jeep.flood(start.x, start.z), rn = map.nav.nana.flood(start.x, start.z);
    const cand = [], gj = map.nav.jeep, mg = half - 28;
    for (let j = 0; j < gj.n; j++) for (let i = 0; i < gj.n; i++) {
      const x = gj.cc(i), z = gj.cc(j);
      if (Math.abs(x) > mg || Math.abs(z) > mg || waterDist(x, z) < 9) continue;
      if (rj[j * gj.n + i] && rn[map.nav.nana.idx(x, z)]) cand.push({ x, z });
    }
    if (cand.length < 200) return null;
    const rl = relax ? 0.6 : 1;
    const pick = (pred, tries) => {
      for (let t = 0; t < tries; t++) {
        const c = cand[(rng.next() * cand.length) | 0], x = c.x + rng.range(-1, 1), z = c.z + rng.range(-1, 1);
        if (circOk(x, z, 2.4, 2) && pred(x, z)) return { x, z };
      }
      return null;
    };
    const losClear = (x0, z0, x1, z1) => {
      const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 2);
      for (let i = 1; i < n; i++) { const t = i / n; if (!circOk(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, 2.0, 0)) return false; }
      return true;
    };
    const N = CFG.calc.crateCount(mi, tutorial), minFrom = CFG.mission.minCrateFromStart * rl, minGap = CFG.mission.minCrateGap * rl, cr = [];
    if (tutorial) {
      const c1 = pick((x, z) => { const d = dStart(x, z); return d >= 58 && d <= 80 && losClear(start.x, start.z, x, z); }, 1500); if (!c1) return null; cr.push(c1);
      if (N > 1) {
        const c2 = pick((x, z) => { const d = Math.hypot(x - c1.x, z - c1.z); return d >= 62 && d <= 88 && dStart(x, z) >= 100; }, 2500); if (!c2) return null; cr.push(c2);
      }
    } else {
      for (let k = 0; k < N; k++) {
        let c = pick((x, z) => dStart(x, z) >= minFrom && cr.every((o) => Math.hypot(o.x - x, o.z - z) >= minGap), 700);
        if (!c) c = pick((x, z) => dStart(x, z) >= minFrom * 0.9 && cr.every((o) => Math.hypot(o.x - x, o.z - z) >= minGap * 0.8), 700);
        if (!c) return null; cr.push(c);
      }
    }
    const ex = pick((x, z) => dStart(x, z) >= CFG.mission.extractMinFromStart * rl && cr.every((o) => Math.hypot(o.x - x, o.z - z) >= 40), 3000);
    if (!ex) return null;
    map.extract = { x: ex.x, z: ex.z, r: CFG.mission.extractRadius };
    cr.forEach((c, i) => map.crates.push({ id: i, type: 'coin', x: c.x, z: c.z }));
    map.crates.forEach((c) => { const a = rng.range(0, 6.28); pile(c.x + Math.cos(a) * 6, c.z + Math.sin(a) * 6, a); });

    // ---------- crane jobs: the lane segment each tower crane will block (never near the start, a crate or the extraction zone)
    const SC = CFG.harbor.crane;
    for (const c of map.cranes) {
      const opts = map.slots.filter((s) => {
        const d = Math.hypot(s.x - c.x, s.z - c.z); if (d < 16 || d > c.reach) return false;
        if (dStart(s.x, s.z) < SC.minFromStart || Math.hypot(s.x - ex.x, s.z - ex.z) < SC.minFromExtract) return false;
        for (const k of map.crates) if (Math.hypot(s.x - k.x, s.z - k.z) < SC.minFromCrate) return false;
        for (const o of map.cranes) if (o.slot && Math.hypot(o.slot.x - s.x, o.slot.z - s.z) < 14) return false;
        return true;
      });
      if (opts.length) { const s = opts[(rng.next() * opts.length) | 0]; c.slot = { x: s.x, z: s.z, hw: s.hw, hd: s.hd, axis: s.axis, w: s.w }; }
    }
    return map;
  }

  function generate(runSeed, missionIndex, opts) {
    opts = opts || {};
    const tutorial = opts.tutorial != null ? opts.tutorial : missionIndex <= CFG.mission.tutorialIndex;
    const base = R.hash((runSeed ^ 0x4AB0) >>> 0, missionIndex);
    let map = null, attempt = 0;
    for (; attempt < 14 && !map; attempt++) map = build(R.hash(base, attempt), missionIndex, tutorial, false, false);
    if (!map) { map = build(R.hash(base, 99), missionIndex, tutorial, true, false); map && (map.fallback = true); attempt = 15; }
    if (!map) { map = build(R.hash(base, 777), missionIndex, tutorial, true, true); map && (map.fallback = true); attempt = 16; }
    if (!map) { for (let k = 0; k < 30 && !map; k++) { map = build(R.hash(base, 1000 + k), missionIndex, tutorial, true, true); map && (map.fallback = true); } attempt = 17; }
    if (!map) throw new Error('[WorldH] could not generate a valid map');
    map.attempts = attempt;
    return map;
  }

  WZ.WorldH = { generate };
})(window.WZ = window.WZ || {});
