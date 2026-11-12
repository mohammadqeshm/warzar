/* WZ.WorldJ.generate(runSeed, missionIndex, opts) — the JURASSIC VALLEY map (selected in the main menu; opts.theme === 'jurassic').
 * Same contract as WZ.World.generate (start, crates, extract, nav grids, colliders, roads, height()), different content:
 *   - rolling HILLS with a stronger amplitude and flat valley floors,
 *   - a winding shallow RIVER (analytic centre line => cheap distance queries) with flat banks, crossed by wooden BRIDGES where the dirt roads meet it
 *     (the terrain is raised into a causeway under each bridge, so the vehicle drives over it exactly like on the ground),
 *   - dirt trails between "nesting grounds" (clusters), prehistoric palms / cycads / conifers / ferns, mossy boulders, giant bone landmarks and egg nests,
 *   - geothermal steam vents. No houses; the crate guardians are dinosaurs (see entities/giant.js).
 * Reachability is guaranteed the same way as in the village: crates + extraction are only sampled from nav cells reachable by BOTH the jeep and Nana. */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG, W = CFG.world, R = WZ.RNG, U = WZ.U, JC = CFG.maps.jurassic;

  function build(seed, mi, tutorial, sparse, relax) {
    const rng = R.create(seed), half = W.half, hn = R.noise2((seed ^ 0x6A55) | 0);
    // ---------- river (centre line z = zc(x)), bridges (filled in after the roads exist)
    const rp = { z0: rng.range(-34, 34), a1: rng.range(30, 46), k1: rng.range(0.012, 0.017), p1: rng.range(0, 6.28), a2: rng.range(9, 15), k2: rng.range(0.034, 0.046), p2: rng.range(0, 6.28), wp: rng.range(0, 6.28) };
    const zc = (x) => rp.z0 + rp.a1 * Math.sin(rp.k1 * x + rp.p1) + rp.a2 * Math.sin(rp.k2 * x + rp.p2);
    const dzc = (x) => rp.a1 * rp.k1 * Math.cos(rp.k1 * x + rp.p1) + rp.a2 * rp.k2 * Math.cos(rp.k2 * x + rp.p2);
    const rw = (x) => JC.riverWidth * (1 + 0.2 * Math.sin(x * 0.05 + rp.wp));
    const riverDist = (x, z) => Math.abs(z - zc(x)) / Math.sqrt(1 + dzc(x) * dzc(x));
    const bridges = [];
    const DECK = 0.95;
    const height = (x, z) => {
      const f1 = R.fbm(hn, x * 0.0085 + 11.3, z * 0.0085 + 4.7) - 0.5, f2 = R.fbm(hn, x * 0.035 + 3.1, z * 0.035 + 8.2) - 0.5;
      let b = f1 * 2 * JC.hillAmp; if (b < 0) b *= 0.18;
      b += 1.9 + f2 * 1.4;
      const d = riverDist(x, z), w = rw(x);
      let h = U.lerp(b, DECK + f2 * 0.3, U.smooth(w + 24, w + 5, d));                    // flat flood plain around the river
      h -= 2.7 * (1 - U.smooth(w * 0.3, w, d));                                          // the channel
      for (let i = 0; i < bridges.length; i++) { const bg = bridges[i], r = Math.hypot(x - bg.x, z - bg.z); if (r < 16) h = U.lerp(h, DECK, 1 - U.smooth(8.5, 16, r)); }
      return h;
    };
    const map = {
      seed, missionIndex: mi, tutorial, sparse, half, size: W.size, height, theme: 'jurassic',
      boxes: [], circles: [], houses: [], walls: [], towers: [], rocks: [], trees: [], smalls: [], grass: [],
      fires: [], smokes: [], roads: [], roadPts: [], clusters: [], tents: [], flags: [], wrecks: [], crates: [], extract: null, start: null,
      palms: [], conifers: [], broad: [], ferns: [], bones: [], nests: [], steams: [], bridges,
      river: { zc, dzc, w: rw, dist: riverDist }, water: { level: JC.waterLevel },
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
    const dry = (x, z, m) => riverDist(x, z) > rw(x) + m;       // clear of the river (+ margin)
    const addBox = (x, z, hw, hd, kind) => map.boxes.push({ x, z, hw, hd, kind });

    // ---------- nesting grounds (clusters) + dirt trails
    const nCl = sparse ? 3 : rng.int(6, 8);
    for (let t = 0; t < 600 && map.clusters.length < nCl; t++) {
      const x = rng.range(-half + 50, half - 50), z = rng.range(-half + 50, half - 50);
      if (dStart(x, z) < 60 || !dry(x, z, 16)) continue;
      if (map.clusters.some((c) => Math.hypot(c.x - x, c.z - z) < 78)) continue;
      map.clusters.push({ x, z, r: rng.range(24, 32), houses: 0 });
    }
    if (map.clusters.length < 3) return null;
    map.clusters.sort((a, b) => dStart(a.x, a.z) - dStart(b.x, b.z));
    const addRoad = (a, b) => {
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, off = rng.range(-0.16, 0.16) * l;
      const cx = Math.max(-half + 25, Math.min(half - 25, mx - dz / l * off)), cz = Math.max(-half + 25, Math.min(half - 25, mz + dx / l * off)), steps = Math.ceil(l / 4);
      for (let i = 0; i <= steps; i++) { const t = i / steps, u = 1 - t; map.roadPts.push({ x: u * u * a.x + 2 * u * t * cx + t * t * b.x, z: u * u * a.z + 2 * u * t * cz + t * t * b.z }); }
      map.roads.push({ a: { x: a.x, z: a.z }, c: { x: cx, z: cz }, b: { x: b.x, z: b.z } });
    };
    addRoad(start, map.clusters[0]);
    for (let i = 1; i < map.clusters.length; i++) {
      let best = 0, bd = 1e9;
      for (let j = 0; j < i; j++) { const d = Math.hypot(map.clusters[i].x - map.clusters[j].x, map.clusters[i].z - map.clusters[j].z); if (d < bd) { bd = d; best = j; } }
      addRoad(map.clusters[best], map.clusters[i]);
    }
    for (let k = 0; k < 2 && map.clusters.length > 3; k++) { const a = rng.pick(map.clusters), b = rng.pick(map.clusters); if (a !== b) addRoad(a, b); }

    // ---------- bridges: where the trails cross the river
    for (let i = 1; i < map.roadPts.length && bridges.length < JC.bridges; i++) {
      const a = map.roadPts[i - 1], b = map.roadPts[i];
      if ((a.z - zc(a.x)) * (b.z - zc(b.x)) >= 0) continue;
      const bx = (a.x + b.x) / 2, bz = zc(bx);
      if (Math.abs(bx) > half - 30 || bridges.some((o) => Math.hypot(o.x - bx, o.z - bz) < 40)) continue;
      bridges.push({ x: bx, z: bz, th: Math.atan2(b.x - a.x, b.z - a.z), len: 2 * (rw(bx) + 7) });
    }
    // a guaranteed crossing near the start side so the river is never a surprise: bridge on the first trail if none exists
    const onBridge = (x, z) => bridges.some((b) => Math.hypot(x - b.x, z - b.z) < 22);
    map.noHazard = (x, z) => riverDist(x, z) < rw(x) + 5 || onBridge(x, z);      // no mines / barrels / pits / pickups in the river or on a bridge

    // ---------- start camp
    const camp = { x: start.x + 18, z: start.z + 5 };
    map.tents.push(camp); addBox(camp.x, camp.z, 3.2, 2.6, 'tent');
    map.flags.push({ x: start.x - 14, z: start.z + 3 }); map.circles.push({ x: start.x - 14, z: start.z + 3, r: 0.5 });

    // ---------- landmarks: giant bones, egg nests, boulders
    const place = (n, tries, fn) => { for (let k = 0, t = 0; k < n && t < tries; t++) if (fn()) k++; };
    place(sparse ? 1 : 3, 200, () => {
      const cl = rng.pick(map.clusters), a = rng.range(0, 6.283), rr = rng.range(10, cl.r + 8), x = cl.x + Math.cos(a) * rr, z = cl.z + Math.sin(a) * rr;
      if (!inMap(x, z, 28) || !dry(x, z, 10) || dStart(x, z) < 45 || roadDist(x, z) < 9 || !circOk(x, z, 4.4, 5)) return false;
      map.bones.push({ x, z, gy: height(x, z), rot: rng.range(0, 6.28), kind: map.bones.length % 2 }); map.circles.push({ x, z, r: 3.3 }); return true;
    });
    place(sparse ? 2 : 6, 300, () => {
      const cl = rng.pick(map.clusters), a = rng.range(0, 6.283), rr = rng.range(6, cl.r + 4), x = cl.x + Math.cos(a) * rr, z = cl.z + Math.sin(a) * rr;
      if (!inMap(x, z, 22) || !dry(x, z, 8) || dStart(x, z) < 40 || roadDist(x, z) < 7 || !circOk(x, z, 3, 4)) return false;
      map.nests.push({ x, z, gy: height(x, z), rot: rng.range(0, 6.28) }); map.circles.push({ x, z, r: 2.6 }); return true;
    });
    place(sparse ? 16 : 40, 500, () => {
      const r = rng.range(1.7, 4.6), x = rng.range(-half + 12, half - 12), z = rng.range(-half + 12, half - 12);
      if (dStart(x, z) < 26 || !dry(x, z, r + 3) || roadDist(x, z) < r + 5 || !circOk(x, z, r * 1.05, 8)) return false;
      map.rocks.push({ x, z, r, gy: height(x, z) }); map.circles.push({ x, z, r: r * 1.05 }); return true;
    });
    // ---------- vegetation
    const kinds = ['palm', 'conifer', 'broad'];
    place(sparse ? 40 : 130, 1800, () => {
      const x = rng.range(-half + 10, half - 10), z = rng.range(-half + 10, half - 10);
      if (dStart(x, z) < 24 || !dry(x, z, 3.5) || roadDist(x, z) < 6.5 || !circOk(x, z, 0.9, 5)) return false;
      const k = kinds[(rng.next() * 3) | 0], s = rng.range(0.9, 1.5), o = { x, z, s, gy: height(x, z), rot: rng.range(0, 6.28) };
      (k === 'palm' ? map.palms : k === 'conifer' ? map.conifers : map.broad).push(o); map.circles.push({ x, z, r: k === 'palm' ? 0.75 : 1.0 }); return true;
    });
    place(sparse ? 120 : 300, 2000, () => {
      const x = rng.range(-half + 8, half - 8), z = rng.range(-half + 8, half - 8);
      if (dStart(x, z) < 14 || !dry(x, z, 1.5) || roadDist(x, z) < 4 || !circOk(x, z, 0.4, 0)) return false;
      map.ferns.push({ x, z, s: rng.range(0.8, 1.6), rot: rng.range(0, 6.28), gy: height(x, z) }); return true;
    });
    place(sparse ? 3 : 6, 200, () => {
      const x = rng.range(-half + 25, half - 25), z = rng.range(-half + 25, half - 25);
      if (dStart(x, z) < 50 || !dry(x, z, 8) || roadDist(x, z) < 8 || !circOk(x, z, 1.6, 5)) return false;
      map.steams.push({ x, z, gy: height(x, z) }); map.circles.push({ x, z, r: 1.4 }); return true;
    });
    for (let k = 0, t = 0; k < (sparse ? 400 : 900) && t < 4000; t++) {
      const x = rng.range(-half + 6, half - 6), z = rng.range(-half + 6, half - 6);
      if (roadDist(x, z) < 4.5 || !dry(x, z, 1) || !circOk(x, z, 0.4, 0)) continue;
      map.grass.push({ x, z, s: rng.range(0.7, 1.7), r: rng.range(0, 6.28) }); k++;
    }

    // ---------- navigation grids + objectives
    map.nav = { jeep: WZ.NavGrid.build(map, CFG.jeep.radius + 0.5), nana: WZ.NavGrid.build(map, 0.9) };
    const rj = map.nav.jeep.flood(start.x, start.z), rn = map.nav.nana.flood(start.x, start.z);
    const cand = [], gj = map.nav.jeep, mg = half - 28;
    for (let j = 0; j < gj.n; j++) for (let i = 0; i < gj.n; i++) {
      const x = gj.cc(i), z = gj.cc(j);
      if (Math.abs(x) > mg || Math.abs(z) > mg || !dry(x, z, 9)) continue;
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
      const c2 = pick((x, z) => { const d = Math.hypot(x - c1.x, z - c1.z); return d >= 62 && d <= 88 && dStart(x, z) >= 100; }, 2500); if (!c2) return null; cr.push(c2);
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
    return map;
  }

  function generate(runSeed, missionIndex, opts) {
    opts = opts || {};
    const tutorial = opts.tutorial != null ? opts.tutorial : missionIndex <= CFG.mission.tutorialIndex;
    const base = R.hash((runSeed ^ 0x4A55) >>> 0, missionIndex);
    let map = null, attempt = 0;
    for (; attempt < 10 && !map; attempt++) map = build(R.hash(base, attempt), missionIndex, tutorial, false, false);
    if (!map) { map = build(R.hash(base, 99), missionIndex, tutorial, true, false); map && (map.fallback = true); attempt = 11; }
    if (!map) { map = build(R.hash(base, 777), missionIndex, tutorial, true, true); map && (map.fallback = true); attempt = 12; }
    if (!map) throw new Error('[WorldJ] could not generate a valid map');
    map.attempts = attempt;
    return map;
  }

  WZ.WorldJ = { generate };
})(window.WZ = window.WZ || {});
