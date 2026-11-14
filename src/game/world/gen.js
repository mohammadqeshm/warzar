/* WZ.World.generate(runSeed, missionIndex) — seeded procedural village map from a kit of pieces.
 * Reachability is guaranteed by construction: crates + extraction are only sampled from nav cells reachable
 * (from the start) by BOTH the jeep grid and Nana's grid. Regenerates (max 10) then falls back to a sparse layout. */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG, W = CFG.world, R = WZ.RNG;

  function build(seed, mi, tutorial, sparse, relax) {
    const rng = R.create(seed), half = W.half;
    const hn = R.noise2((seed ^ 0x51ED) | 0);
    const height = (x, z) => (R.fbm(hn, x * 0.0105 + 31.7, z * 0.0105 + 17.3) - 0.5) * 2 * W.hillAmp * 1.45;
    const map = {
      seed, missionIndex: mi, tutorial, sparse, half, size: W.size, height,
      boxes: [], circles: [], houses: [], walls: [], towers: [], rocks: [], trees: [], smalls: [], grass: [],
      fires: [], smokes: [], roads: [], roadPts: [], clusters: [], tents: [], flags: [], wrecks: [], crates: [], extract: null, start: null,
    };
    const start = { x: rng.range(-30, 30), z: half - 24, heading: Math.PI };
    map.start = start;

    // ---------- helpers
    const rectOk = (x, z, hw, hd, gap) => {
      for (const b of map.boxes) if (Math.abs(x - b.x) - (hw + b.hw) < gap && Math.abs(z - b.z) - (hd + b.hd) < gap) return false;
      for (const c of map.circles) { const dx = Math.max(Math.abs(x - c.x) - hw, 0), dz = Math.max(Math.abs(z - c.z) - hd, 0); if (Math.hypot(dx, dz) < c.r + gap) return false; }
      return true;
    };
    const circOk = (x, z, r, gap) => {
      for (const b of map.boxes) { const dx = Math.max(Math.abs(x - b.x) - b.hw, 0), dz = Math.max(Math.abs(z - b.z) - b.hd, 0); if (Math.hypot(dx, dz) < r + gap) return false; }
      for (const c of map.circles) if (Math.hypot(x - c.x, z - c.z) < r + c.r + gap) return false;
      return true;
    };
    const inMap = (x, z, m) => Math.abs(x) < half - m && Math.abs(z) < half - m;
    const dStart = (x, z) => Math.hypot(x - start.x, z - start.z);
    const roadDist = (x, z) => { let d = 1e9; for (const p of map.roadPts) { const t = Math.hypot(x - p.x, z - p.z); if (t < d) d = t; } return d; };
    const roadHitsRect = (x, z, hw, hd, m) => { for (const p of map.roadPts) if (Math.abs(p.x - x) < hw + m && Math.abs(p.z - z) < hd + m) return true; return false; };
    const addBox = (x, z, hw, hd, kind) => map.boxes.push({ x, z, hw, hd, kind });

    // ---------- village clusters + roads
    const nCl = sparse ? 3 : rng.int(6, 8);
    for (let t = 0; t < 500 && map.clusters.length < nCl; t++) {
      const x = rng.range(-half + 50, half - 50), z = rng.range(-half + 50, half - 50);
      if (dStart(x, z) < 60) continue;
      if (map.clusters.some((c) => Math.hypot(c.x - x, c.z - z) < 78)) continue;
      map.clusters.push({ x, z, r: rng.range(26, 34), houses: 0 });
    }
    if (map.clusters.length < 3) return null;
    map.clusters.sort((a, b) => dStart(a.x, a.z) - dStart(b.x, b.z));

    const addRoad = (a, b) => {
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
      const off = rng.range(-0.18, 0.18) * l;
      const cx = Math.max(-half + 25, Math.min(half - 25, mx - dz / l * off)), cz = Math.max(-half + 25, Math.min(half - 25, mz + dx / l * off));
      const steps = Math.ceil(l / 4);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, u = 1 - t;
        map.roadPts.push({ x: u * u * a.x + 2 * u * t * cx + t * t * b.x, z: u * u * a.z + 2 * u * t * cz + t * t * b.z });
      }
      map.roads.push({ a: { x: a.x, z: a.z }, c: { x: cx, z: cz }, b: { x: b.x, z: b.z } });
    };
    addRoad(start, map.clusters[0]);
    for (let i = 1; i < map.clusters.length; i++) {
      let best = 0, bd = 1e9;
      for (let j = 0; j < i; j++) { const d = Math.hypot(map.clusters[i].x - map.clusters[j].x, map.clusters[i].z - map.clusters[j].z); if (d < bd) { bd = d; best = j; } }
      addRoad(map.clusters[best], map.clusters[i]);
    }
    for (let k = 0; k < 2 && map.clusters.length > 3; k++) { const a = rng.pick(map.clusters), b = rng.pick(map.clusters); if (a !== b) addRoad(a, b); }

    // ---------- start camp
    const camp = { x: start.x + 18, z: start.z + 5 };
    map.tents.push(camp); addBox(camp.x, camp.z, 3.2, 2.6, 'tent');
    map.flags.push({ x: start.x - 14, z: start.z + 3 }); map.circles.push({ x: start.x - 14, z: start.z + 3, r: 0.5 });
    const pile = (x, z, rot) => {
      const cs = Math.cos(rot), sn = Math.sin(rot);
      const bags = [[-1.6, 0], [0, 0], [1.6, 0], [-0.8, 0.54], [0.8, 0.54], [0, 1.08]];
      for (const b of bags) map.smalls.push({ t: 'bag', x: x + b[0] * cs, z: z - b[0] * sn, ly: b[1], rot });
    };
    const barrels = (x, z, n) => { for (let i = 0; i < n; i++) map.smalls.push({ t: 'barrel', x: x + rng.range(-1.6, 1.6), z: z + rng.range(-1.6, 1.6), ly: 0, rot: rng.range(0, 6.28) }); };
    pile(start.x + 9, start.z - 8, 0.3); pile(start.x - 9, start.z - 9, -0.3); barrels(start.x + 12, start.z - 5, 3); barrels(start.x - 17, start.z + 9, 2);

    // ---------- houses, walls, towers per cluster
    for (const cl of map.clusters) {
      const nH = sparse ? 0 : rng.int(4, 7);
      for (let t = 0; t < 100 && cl.houses < nH; t++) {
        const a = rng.range(0, 6.283), rr = rng.range(11, cl.r + 8), x = cl.x + Math.cos(a) * rr, z = cl.z + Math.sin(a) * rr;
        let w = rng.range(9, 13), d = rng.range(8, 12);
        if (rng.chance(0.5)) { const tmp = w; w = d; d = tmp; }
        const hw = w / 2, hd = d / 2;
        if (!inMap(x, z, Math.max(hw, hd) + 14)) continue;
        if (dStart(x, z) < 34 + Math.max(hw, hd)) continue;
        if (roadHitsRect(x, z, hw, hd, 5)) continue;
        if (!rectOk(x, z, hw, hd, 10)) continue;
        const gy = Math.max(height(x, z), height(x - hw, z - hd), height(x + hw, z + hd), height(x - hw, z + hd), height(x + hw, z - hd));
        map.houses.push({ x, z, w, d, h: rng.range(5.2, 7.4), gy, red: rng.chance(0.4) });
        addBox(x, z, hw, hd, 'house'); cl.houses++;
      }
      const nW = sparse ? 0 : rng.int(1, 3);
      for (let k = 0, t = 0; k < nW && t < 60; t++) {
        const a = rng.range(0, 6.283), rr = rng.range(10, cl.r + 10), x = cl.x + Math.cos(a) * rr, z = cl.z + Math.sin(a) * rr;
        const len = rng.range(8, 16), axis = rng.chance(0.5) ? 'x' : 'z', hw = axis === 'x' ? len / 2 : 0.8, hd = axis === 'x' ? 0.8 : len / 2;
        if (!inMap(x, z, len / 2 + 12) || dStart(x, z) < 34 || roadHitsRect(x, z, hw, hd, 4.5) || !rectOk(x, z, hw, hd, 9)) continue;
        map.walls.push({ x, z, len, axis, gy: height(x, z) }); addBox(x, z, hw, hd, 'wall'); k++;
      }
      if (!sparse && rng.chance(0.55)) {
        for (let t = 0; t < 30; t++) {
          const a = rng.range(0, 6.283), rr = rng.range(14, cl.r + 12), x = cl.x + Math.cos(a) * rr, z = cl.z + Math.sin(a) * rr;
          if (!inMap(x, z, 20) || dStart(x, z) < 40 || roadHitsRect(x, z, 2.7, 2.7, 4.5) || !rectOk(x, z, 2.7, 2.7, 9)) continue;
          map.towers.push({ x, z, gy: height(x, z), h: 13, hostile: mi >= 10 }); addBox(x, z, 2.7, 2.7, 'tower'); break;
        }
      }
    }
    for (let k = 0, t = 0; k < (sparse ? 2 : 4) && t < 100; t++) {
      const x = rng.range(-half + 30, half - 30), z = rng.range(-half + 30, half - 30);
      if (dStart(x, z) < 50 || roadDist(x, z) < 9 || !rectOk(x, z, 2.7, 2.7, 10)) continue;
      map.towers.push({ x, z, gy: height(x, z), h: 13, hostile: mi >= 10 }); addBox(x, z, 2.7, 2.7, 'tower'); k++;
    }

    // ---------- burning wreck landmark + smoke columns
    {
      const cl = map.clusters[Math.min(1, map.clusters.length - 1)];
      for (let t = 0; t < 60; t++) {
        const a = rng.range(0, 6.283), x = cl.x + Math.cos(a) * rng.range(18, 34), z = cl.z + Math.sin(a) * rng.range(18, 34);
        if (!inMap(x, z, 24) || roadDist(x, z) < 8 || !circOk(x, z, 3.6, 8) || dStart(x, z) < 45) continue;
        map.wrecks.push({ x, z, gy: height(x, z) }); map.circles.push({ x, z, r: 3.5 }); map.fires.push({ x, z, gy: height(x, z) });
        map.smokes.push({ x, z, gy: height(x, z) + 2 });
        barrels(x + 5, z + 3, 3); break;
      }
      for (let k = 0; k < 3; k++) { const x = rng.range(-half + 20, half - 20), z = rng.range(-half + 20, half - 20); if (dStart(x, z) > 70) map.smokes.push({ x, z, gy: height(x, z) + 1 }); }
    }

    // ---------- rocks, trees, small clusters
    for (let k = 0, t = 0; k < (sparse ? 18 : 46) && t < 400; t++) {
      const r = rng.range(1.6, 4.5), x = rng.range(-half + 12, half - 12), z = rng.range(-half + 12, half - 12);
      if (dStart(x, z) < 26 || roadDist(x, z) < r + 5 || !circOk(x, z, r * 1.05, 9)) continue;
      map.rocks.push({ x, z, r, gy: height(x, z) }); map.circles.push({ x, z, r: r * 1.05 }); k++;
    }
    for (let k = 0, t = 0; k < (sparse ? 25 : 70) && t < 600; t++) {
      const x = rng.range(-half + 10, half - 10), z = rng.range(-half + 10, half - 10);
      if (dStart(x, z) < 24 || roadDist(x, z) < 6 || !circOk(x, z, 0.9, 6.5)) continue;
      map.trees.push({ x, z, s: rng.range(0.9, 1.5), dead: rng.chance(0.3), gy: height(x, z) }); map.circles.push({ x, z, r: 0.9 }); k++;
    }
    for (const cl of map.clusters) {
      for (let k = 0, t = 0; k < 2 && t < 30; t++) {
        const a = rng.range(0, 6.283), rr = rng.range(8, cl.r + 6), x = cl.x + Math.cos(a) * rr, z = cl.z + Math.sin(a) * rr;
        if (!inMap(x, z, 16) || !circOk(x, z, 3, 4)) continue; pile(x, z, rng.range(0, 3.1)); k++;
      }
      for (let k = 0, t = 0; k < 2 && t < 30; t++) {
        const a = rng.range(0, 6.283), rr = rng.range(8, cl.r + 6), x = cl.x + Math.cos(a) * rr, z = cl.z + Math.sin(a) * rr;
        if (!inMap(x, z, 16) || !circOk(x, z, 2.2, 3)) continue; barrels(x, z, rng.int(2, 4)); k++;
      }
    }
    for (let k = 0, t = 0; k < (sparse ? 400 : 900) && t < 4000; t++) {
      const x = rng.range(-half + 6, half - 6), z = rng.range(-half + 6, half - 6);
      if (roadDist(x, z) < 4.5 || !circOk(x, z, 0.4, 0)) continue;
      map.grass.push({ x, z, s: rng.range(0.7, 1.7), r: rng.range(0, 6.28) }); k++;
    }

    // ---------- navigation grids
    map.nav = { jeep: WZ.NavGrid.build(map, CFG.jeep.radius + 0.5), nana: WZ.NavGrid.build(map, 0.9) };
    const rj = map.nav.jeep.flood(start.x, start.z), rn = map.nav.nana.flood(start.x, start.z);
    const cand = [], gj = map.nav.jeep, mg = half - 28;
    for (let j = 0; j < gj.n; j++) for (let i = 0; i < gj.n; i++) {
      const x = gj.cc(i), z = gj.cc(j);
      if (Math.abs(x) > mg || Math.abs(z) > mg) continue;
      const k = j * gj.n + i;
      if (rj[k] && rn[map.nav.nana.idx(x, z)]) cand.push({ x, z });
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
    const N = CFG.calc.crateCount(mi, tutorial);
    const minFrom = CFG.mission.minCrateFromStart * rl, minGap = CFG.mission.minCrateGap * rl;
    const cr = [];
    if (tutorial) {
      const c1 = pick((x, z) => { const d = dStart(x, z); return d >= 58 && d <= 80 && losClear(start.x, start.z, x, z); }, 1500);
      if (!c1) return null; cr.push(c1);
      if (N > 1) {
        const c2 = pick((x, z) => { const d = Math.hypot(x - c1.x, z - c1.z); return d >= 62 && d <= 88 && dStart(x, z) >= 100; }, 2500);
        if (!c2) return null; cr.push(c2);
      }
    } else {
      for (let k = 0; k < N; k++) {
        let c = pick((x, z) => dStart(x, z) >= minFrom && cr.every((o) => Math.hypot(o.x - x, o.z - z) >= minGap), 700);
        if (!c) c = pick((x, z) => dStart(x, z) >= minFrom * 0.9 && cr.every((o) => Math.hypot(o.x - x, o.z - z) >= minGap * 0.8), 700);
        if (!c) return null;
        cr.push(c);
      }
    }
    const minEx = CFG.mission.extractMinFromStart * rl;
    const ex = pick((x, z) => dStart(x, z) >= minEx && cr.every((o) => Math.hypot(o.x - x, o.z - z) >= 40), 3000);
    if (!ex) return null;
    map.extract = { x: ex.x, z: ex.z, r: CFG.mission.extractRadius };
    cr.forEach((c, i) => map.crates.push({ id: i, type: 'coin', x: c.x, z: c.z }));
    // decor around the crates (stencil-marked supply drops)
    map.crates.forEach((c) => { const a = rng.range(0, 6.28); pile(c.x + Math.cos(a) * 6, c.z + Math.sin(a) * 6, a); });
    return map;
  }

  function generateInner(runSeed, missionIndex, opts) {
    opts = opts || {};
    if (opts.theme === 'jurassic' && WZ.WorldJ) return WZ.WorldJ.generate(runSeed, missionIndex, opts);   // see world/gen_jurassic.js
    if (opts.theme === 'volcanic' && WZ.WorldV) return WZ.WorldV.generate(runSeed, missionIndex, opts);   // see world/gen_volcanic.js
    if (opts.theme === 'frozen' && WZ.WorldF) return WZ.WorldF.generate(runSeed, missionIndex, opts);     // see world/gen_frozen.js
    if (opts.theme === 'harbor' && WZ.WorldH) return WZ.WorldH.generate(runSeed, missionIndex, opts);     // see world/gen_harbor.js
    const tutorial = opts.tutorial != null ? opts.tutorial : missionIndex <= CFG.mission.tutorialIndex;
    const base = R.hash(runSeed >>> 0, missionIndex);
    let map = null, attempt = 0;
    for (; attempt < 10 && !map; attempt++) map = build(R.hash(base, attempt), missionIndex, tutorial, false, false);
    if (!map) { map = build(R.hash(base, 99), missionIndex, tutorial, true, false); map && (map.fallback = true); attempt = 11; }
    if (!map) { map = build(R.hash(base, 777), missionIndex, tutorial, true, true); map && (map.fallback = true); attempt = 12; }
    if (!map) throw new Error('[World] could not generate a valid map');
    map.attempts = attempt;
    return map;
  }

  /** opts.crates (optional) = exact number of crates for this map (= the level number). Applied to every theme generator through CFG.calc.crateOverride. */
  function generate(runSeed, missionIndex, opts) {
    const prev = CFG.calc.crateOverride;
    CFG.calc.crateOverride = opts && opts.crates != null ? opts.crates | 0 : null;
    try { return generateInner(runSeed, missionIndex, opts); } finally { CFG.calc.crateOverride = prev; }
  }

  /** menu backdrop: a map of the chosen theme (default: the village) without objectives */
  function backdrop(seed, theme) { return generate(seed, 3, { tutorial: false, theme: theme || 'village' }); }

  WZ.World = { generate, backdrop };
})(window.WZ = window.WZ || {});
