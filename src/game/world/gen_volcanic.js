/* WZ.WorldV.generate(runSeed, missionIndex, opts) — the VOLCANIC WASTELAND map (selected in the main menu; opts.theme === 'volcanic').
 * Same contract as WZ.World.generate / WZ.WorldJ.generate (start, crates, extract, nav grids, colliders, roads, height()), different content:
 *   - rugged black-ash HILLS with flat basalt plains around the rivers,
 *   - TWO winding LAVA RIVERS (analytic centre lines => cheap distance queries): a wide one running west-east and a narrower one running north-south,
 *     both carved into the terrain; the vehicle can wade through lava (slow, heavy steering, it BURNS) - see scenes/mission.js + systems/volcano.js,
 *   - basalt CAUSEWAYS (raised terrain + slab deck) wherever a trail crosses a river, so there is always a safe way over,
 *   - ash trails between "ash camps" (clusters), obsidian spires, basalt boulders, charred trees, smoking fumaroles and burning stumps.
 * Lava cells are blocked in the nav grids (map.navBlock) so enemies, the guardians and Nana walk over the causeways instead of through the lava.
 * Reachability is guaranteed the same way as on the other maps: crates + extraction are only sampled from nav cells reachable by BOTH the jeep and Nana. */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG, W = CFG.world, R = WZ.RNG, U = WZ.U, VC = CFG.maps.volcanic;
  const DECK = 0.95;

  /** an analytic river. swap=false: centre line z = c(x) (runs along X). swap=true: x = c(z) (runs along Z).  `u` is the coordinate along the river. */
  function mkRiver(rng, swap, wBase, ampMul, c0) {
    const rp = { c0, a1: rng.range(30, 46) * ampMul, k1: rng.range(0.012, 0.017), p1: rng.range(0, 6.28), a2: rng.range(9, 15) * ampMul, k2: rng.range(0.034, 0.046), p2: rng.range(0, 6.28), wp: rng.range(0, 6.28) };
    const c = (u) => rp.c0 + rp.a1 * Math.sin(rp.k1 * u + rp.p1) + rp.a2 * Math.sin(rp.k2 * u + rp.p2);
    const dc = (u) => rp.a1 * rp.k1 * Math.cos(rp.k1 * u + rp.p1) + rp.a2 * rp.k2 * Math.cos(rp.k2 * u + rp.p2);
    const w = (u) => wBase * (1 + 0.2 * Math.sin(u * 0.05 + rp.wp));
    const along = swap ? (x, z) => z : (x, z) => x;
    const R_ = {
      swap, c, dc, w,
      wAt: (x, z) => w(along(x, z)),
      dist: swap ? (x, z) => Math.abs(x - c(z)) / Math.sqrt(1 + dc(z) * dc(z)) : (x, z) => Math.abs(z - c(x)) / Math.sqrt(1 + dc(x) * dc(x)),
      side: swap ? (x, z) => x - c(z) : (x, z) => z - c(x),
      pos: swap ? (s) => [c(s), s] : (s) => [s, c(s)],
      tan: swap ? (s) => { const d = dc(s), l = Math.hypot(d, 1); return [d / l, 1 / l]; } : (s) => { const d = dc(s), l = Math.hypot(1, d); return [1 / l, d / l]; },
    };
    return R_;
  }

  function build(seed, mi, tutorial, sparse, relax) {
    const rng = R.create(seed), half = W.half, hn = R.noise2((seed ^ 0x7A0C) | 0);
    const start = { x: rng.range(-30, 30), z: half - 24, heading: Math.PI };
    // ---------- lava rivers: the big one (west-east) + a narrower north-south one on the far side from the start
    const r1 = mkRiver(rng, false, VC.riverWidth, 1, rng.range(-34, 34));
    const r2 = mkRiver(rng, true, VC.riverWidth2, 0.55, (start.x > 0 ? -1 : 1) * rng.range(78, 105));
    for (let z = start.z - 40; z <= half; z += 5) if (Math.abs(r2.c(z) - start.x) < 45) return null;     // keep the start area clear of lava
    const rivers = [r1, r2];
    const bridges = [];
    const height = (x, z) => {
      const f1 = R.fbm(hn, x * 0.0085 + 11.3, z * 0.0085 + 4.7) - 0.5, f2 = R.fbm(hn, x * 0.035 + 3.1, z * 0.035 + 8.2) - 0.5, f3 = R.fbm(hn, x * 0.09 + 21.7, z * 0.09 + 13.3) - 0.5;
      let h = f1 * 2 * VC.hillAmp; if (h < 0) h *= 0.2;
      h += 1.6 + f2 * 1.9 + f3 * 0.7;
      for (let i = 0; i < 2; i++) {
        const r = rivers[i], d = r.dist(x, z), w = r.wAt(x, z);
        h = U.lerp(h, DECK + f2 * 0.25, U.smooth(w + 22, w + 5, d));         // flat basalt plain around the lava
        h -= 2.7 * (1 - U.smooth(w * 0.3, w, d));                            // the channel
      }
      for (let i = 0; i < bridges.length; i++) { const bg = bridges[i], rr = Math.hypot(x - bg.x, z - bg.z); if (rr < 16) h = U.lerp(h, DECK, 1 - U.smooth(8.5, 16, rr)); }
      return h;
    };
    const LV = VC.waterLevel;
    const inLava = (x, z) => height(x, z) < LV + 0.25;
    /** 0 = not in lava, else 0.35..1 (how deep) - same formula the mission uses for wading */
    const lavaDepth = (x, z) => { const hh = height(x, z); return hh < LV + 0.25 ? U.clamp((LV + 0.6 - hh) / 1.4, 0.35, 1) : 0; };
    const flow = (x, z, out) => {
      let best = r1, bd = 1e9;
      for (const r of rivers) { const d = r.dist(x, z) / r.wAt(x, z); if (d < bd) { bd = d; best = r; } }
      const t = best.tan(best.swap ? z : x); out.x = t[0]; out.z = t[1]; return out;
    };
    const map = {
      seed, missionIndex: mi, tutorial, sparse, half, size: W.size, height, theme: 'volcanic', noTornado: true,
      boxes: [], circles: [], houses: [], walls: [], towers: [], rocks: [], trees: [], smalls: [], grass: [],
      fires: [], smokes: [], roads: [], roadPts: [], clusters: [], tents: [], flags: [], wrecks: [], crates: [], extract: null, start,
      spires: [], dead: [], steams: [], bridges, cracks: [],
      lava: { level: LV, rivers, inLava, depth: lavaDepth, flow },
    };

    // ---------- helpers
    const circOk = (x, z, r, gap) => {
      for (const b of map.boxes) { const dx = Math.max(Math.abs(x - b.x) - b.hw, 0), dz = Math.max(Math.abs(z - b.z) - b.hd, 0); if (Math.hypot(dx, dz) < r + gap) return false; }
      for (const c of map.circles) if (Math.hypot(x - c.x, z - c.z) < r + c.r + gap) return false;
      return true;
    };
    const inMap = (x, z, m) => Math.abs(x) < half - m && Math.abs(z) < half - m;
    const dStart = (x, z) => Math.hypot(x - start.x, z - start.z);
    const roadDist = (x, z) => { let d = 1e9; for (const p of map.roadPts) { const t = Math.hypot(x - p.x, z - p.z); if (t < d) d = t; } return d; };
    const dry = (x, z, m) => r1.dist(x, z) > r1.wAt(x, z) + m && r2.dist(x, z) > r2.wAt(x, z) + m;      // clear of the lava (+ margin)
    const addBox = (x, z, hw, hd, kind) => map.boxes.push({ x, z, hw, hd, kind });

    // ---------- ash camps (clusters) + trails
    const nCl = sparse ? 3 : rng.int(6, 8);
    for (let t = 0; t < 600 && map.clusters.length < nCl; t++) {
      const x = rng.range(-half + 50, half - 50), z = rng.range(-half + 50, half - 50);
      if (dStart(x, z) < 60 || !dry(x, z, 18)) continue;
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

    // ---------- causeways: wherever a trail crosses a lava river (the terrain is raised under each one, so it drives like normal ground)
    for (let i = 1; i < map.roadPts.length && bridges.length < VC.bridges; i++) {
      const a = map.roadPts[i - 1], b = map.roadPts[i];
      for (const r of rivers) {
        if (r.side(a.x, a.z) * r.side(b.x, b.z) >= 0) continue;
        const bx0 = (a.x + b.x) / 2, bz0 = (a.z + b.z) / 2, bx = r.swap ? r.c(bz0) : bx0, bz = r.swap ? bz0 : r.c(bx0);
        if (Math.abs(bx) > half - 30 || Math.abs(bz) > half - 30 || bridges.some((o) => Math.hypot(o.x - bx, o.z - bz) < 26)) continue;
        bridges.push({ x: bx, z: bz, th: Math.atan2(b.x - a.x, b.z - a.z), len: 2 * (r.wAt(bx, bz) + 7) });
      }
    }
    const onBridge = (x, z) => bridges.some((b) => Math.hypot(x - b.x, z - b.z) < 22);
    map.noHazard = (x, z) => r1.dist(x, z) < r1.wAt(x, z) + 6 || r2.dist(x, z) < r2.wAt(x, z) + 6 || onBridge(x, z);   // no mines / barrels / pits / vents / pickups in or next to the lava, or on a causeway
    map.navBlock = (x, z) => inLava(x, z);

    // ---------- start camp
    const camp = { x: start.x + 18, z: start.z + 5 };
    map.tents.push(camp); addBox(camp.x, camp.z, 3.2, 2.6, 'tent');
    map.flags.push({ x: start.x - 14, z: start.z + 3 }); map.circles.push({ x: start.x - 14, z: start.z + 3, r: 0.5 });

    // ---------- landmarks: obsidian spires, basalt boulders, charred trees, fumaroles, burning stumps
    const place = (n, tries, fn) => { for (let k = 0, t = 0; k < n && t < tries; t++) if (fn()) k++; };
    place(sparse ? 8 : 26, 600, () => {
      const x = rng.range(-half + 16, half - 16), z = rng.range(-half + 16, half - 16), s = rng.range(0.8, 1.5);
      if (dStart(x, z) < 34 || !dry(x, z, 6) || roadDist(x, z) < 8 || !circOk(x, z, 1.7 * s, 6)) return false;
      map.spires.push({ x, z, s, gy: height(x, z), rot: rng.range(0, 6.28) }); map.circles.push({ x, z, r: 1.5 * s }); return true;
    });
    place(sparse ? 16 : 40, 500, () => {
      const r = rng.range(1.7, 4.8), x = rng.range(-half + 12, half - 12), z = rng.range(-half + 12, half - 12);
      if (dStart(x, z) < 26 || !dry(x, z, r + 3) || roadDist(x, z) < r + 5 || !circOk(x, z, r * 1.05, 8)) return false;
      map.rocks.push({ x, z, r, gy: height(x, z) }); map.circles.push({ x, z, r: r * 1.05 }); return true;
    });
    place(sparse ? 30 : 84, 1800, () => {
      const x = rng.range(-half + 10, half - 10), z = rng.range(-half + 10, half - 10);
      if (dStart(x, z) < 24 || !dry(x, z, 3.5) || roadDist(x, z) < 6.5 || !circOk(x, z, 0.8, 5)) return false;
      map.dead.push({ x, z, s: rng.range(0.9, 1.6), gy: height(x, z), rot: rng.range(0, 6.28) }); map.circles.push({ x, z, r: 0.75 }); return true;
    });
    place(sparse ? 3 : 8, 300, () => {
      const x = rng.range(-half + 25, half - 25), z = rng.range(-half + 25, half - 25);
      if (dStart(x, z) < 50 || !dry(x, z, 8) || roadDist(x, z) < 8 || !circOk(x, z, 1.6, 5)) return false;
      map.steams.push({ x, z, gy: height(x, z) }); map.circles.push({ x, z, r: 1.4 }); return true;
    });
    place(sparse ? 2 : 4, 300, () => {
      const x = rng.range(-half + 30, half - 30), z = rng.range(-half + 30, half - 30);
      if (dStart(x, z) < 60 || !dry(x, z, 8) || roadDist(x, z) < 9 || !circOk(x, z, 1.6, 5)) return false;
      const gy = height(x, z); map.fires.push({ x, z, gy }); map.smokes.push({ x, z, gy: gy + 2 }); map.circles.push({ x, z, r: 1.3 }); return true;
    });
    for (let k = 0; k < 4; k++) { const x = rng.range(-half + 20, half - 20), z = rng.range(-half + 20, half - 20); if (dStart(x, z) > 70) map.smokes.push({ x, z, gy: height(x, z) + 1 }); }
    // glowing ground cracks (paint only): short jagged polylines, mostly near the lava and the camps
    for (let k = 0; k < (sparse ? 14 : 34); k++) {
      const x0 = rng.range(-half + 6, half - 6), z0 = rng.range(-half + 6, half - 6); if (dStart(x0, z0) < 22) continue;
      let a = rng.range(0, 6.28), x = x0, z = z0; const pts = [{ x, z }];
      for (let i = 0; i < rng.int(4, 8); i++) { a += rng.range(-0.8, 0.8); const l = rng.range(4, 9); x += Math.cos(a) * l; z += Math.sin(a) * l; pts.push({ x, z }); }
      map.cracks.push(pts);
    }
    for (let k = 0, t = 0; k < (sparse ? 200 : 520) && t < 3000; t++) {
      const x = rng.range(-half + 6, half - 6), z = rng.range(-half + 6, half - 6);
      if (roadDist(x, z) < 4.5 || !dry(x, z, 1) || !circOk(x, z, 0.4, 0)) continue;
      map.grass.push({ x, z, s: rng.range(0.6, 1.4), r: rng.range(0, 6.28) }); k++;
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
      for (let i = 1; i < n; i++) { const t = i / n; const px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t; if (!circOk(px, pz, 2.0, 0) || inLava(px, pz)) return false; }
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
    return map;
  }

  function generate(runSeed, missionIndex, opts) {
    opts = opts || {};
    const tutorial = opts.tutorial != null ? opts.tutorial : missionIndex <= CFG.mission.tutorialIndex;
    const base = R.hash((runSeed ^ 0x4B0C) >>> 0, missionIndex);
    let map = null, attempt = 0;
    for (; attempt < 14 && !map; attempt++) map = build(R.hash(base, attempt), missionIndex, tutorial, false, false);
    if (!map) { map = build(R.hash(base, 99), missionIndex, tutorial, true, false); map && (map.fallback = true); attempt = 15; }
    if (!map) { map = build(R.hash(base, 777), missionIndex, tutorial, true, true); map && (map.fallback = true); attempt = 16; }
    if (!map) { for (let k = 0; k < 24 && !map; k++) { map = build(R.hash(base, 1000 + k), missionIndex, tutorial, true, true); map && (map.fallback = true); } attempt = 17; }
    if (!map) throw new Error('[WorldV] could not generate a valid map');
    map.attempts = attempt;
    return map;
  }

  WZ.WorldV = { generate };
})(window.WZ = window.WZ || {});
