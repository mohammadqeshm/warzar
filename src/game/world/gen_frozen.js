/* WZ.WorldF.generate(runSeed, missionIndex, opts) — the FROZEN FRONTIER map (selected in the main menu; opts.theme === 'frozen').
 * Same contract as WZ.World.generate / WorldJ / WorldV (start, crates, extract, nav grids, colliders, roads, height()), different content:
 *   - snowy rolling HILLS with flat, frozen LAKES (analytic wobbly ellipses => cheap distance queries),
 *   - glossy ICE PATCHES scattered over the map (more of them next to the trails): map.ice.at(x, z) -> 0..1 says how slippery the surface is there;
 *     the mission feeds it to the vehicle (less grip / steering / braking). WZ.Ice adds dynamic patches (left by the Ice Beast) through map.ice.extra,
 *   - log-cabin camps (clusters) joined by packed-snow trails, pine groves, snow-capped boulders, ice-crystal spikes, drifts.
 * Reachability is guaranteed the same way as on the other maps: crates + extraction are only sampled from nav cells reachable by BOTH the jeep and Nana
 * (and never on ice, so the loot never sits on a slippery spot). Ice is walkable for everybody - it only costs the vehicle control. */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG, W = CFG.world, R = WZ.RNG, U = WZ.U, FC = CFG.maps.frozen;
  const LAKE_H = 0.15;

  function build(seed, mi, tutorial, sparse, relax) {
    const rng = R.create(seed), half = W.half, hn = R.noise2((seed ^ 0x1CE5E) | 0);
    const start = { x: rng.range(-30, 30), z: half - 24, heading: Math.PI };
    const map = {
      seed, missionIndex: mi, tutorial, sparse, half, size: W.size, theme: 'frozen',
      boxes: [], circles: [], houses: [], walls: [], towers: [], rocks: [], trees: [], smalls: [], grass: [],
      fires: [], smokes: [], roads: [], roadPts: [], clusters: [], tents: [], flags: [], wrecks: [], crates: [], extract: null, start,
      pines: [], cabins: [], spikes: [], drifts: [], bridges: [],
    };
    // ---------- ice zones (lakes + patches); lakes are placed first because they shape the terrain
    const lakes = [], patches = [];
    const mkLake = (rxR, rzR, minD) => {
      for (let t = 0; t < 200; t++) {
        const rx = rng.range(rxR[0], rxR[1]), rz = rng.range(rzR[0], rzR[1]), x = rng.range(-half + rx + 28, half - rx - 28), z = rng.range(-half + rz + 28, half - rz - 28);
        if (Math.hypot(x - start.x, z - start.z) < rx + minD) continue;
        if (lakes.some((l) => Math.hypot(l.x - x, l.z - z) < l.rx + rx + 30)) continue;
        lakes.push({ x, z, rx, rz, rot: rng.range(0, 3.14), p1: rng.range(0, 6.28), p2: rng.range(0, 6.28) }); return true;
      }
      return false;
    };
    if (!mkLake([42, 56], [28, 40], 70)) return null;
    for (let i = 1; i < FC.lakes; i++) mkLake([22, 32], [16, 24], 60);
    const edge = (l, a) => 1 + 0.12 * Math.sin(3 * a + l.p1) + 0.07 * Math.sin(5 * a + l.p2);
    const lakeD = (l, x, z) => {
      const dx = x - l.x, dz = z - l.z, c = Math.cos(l.rot), s = Math.sin(l.rot), lx = (dx * c + dz * s) / l.rx, lz = (-dx * s + dz * c) / l.rz;
      return Math.hypot(lx, lz) / edge(l, Math.atan2(lz, lx));
    };
    const lakePoint = (l, a, sc) => { const e = edge(l, a) * sc, lx = Math.cos(a) * l.rx * e, lz = Math.sin(a) * l.rz * e, c = Math.cos(l.rot), s = Math.sin(l.rot); return [l.x + lx * c - lz * s, l.z + lx * s + lz * c]; };
    const ice = { lakes, patches, edge, lakeD, lakePoint, extra: null };
    /** 0..1: how slippery the surface is here (lakes, ice patches, and the dynamic patches of WZ.Ice) */
    ice.base = (x, z) => {
      let k = 0;
      for (let i = 0; i < lakes.length; i++) { const l = lakes[i]; if (Math.abs(x - l.x) > l.rx * 1.3 || Math.abs(z - l.z) > l.rx * 1.3) continue; const v = U.smooth(1.0, 0.9, lakeD(l, x, z)); if (v > k) k = v; }
      for (let i = 0; i < patches.length; i++) {
        const p = patches[i], dx = x - p.x, dz = z - p.z; if (Math.abs(dx) > p.r * 1.2 || Math.abs(dz) > p.r * 1.2) continue;
        const c = Math.cos(p.rot), s = Math.sin(p.rot), lx = (dx * c + dz * s) / p.r, lz = (-dx * s + dz * c) / (p.r * p.sq), v = U.smooth(1.0, 0.84, Math.hypot(lx, lz)); if (v > k) k = v;
      }
      return k;
    };
    ice.at = (x, z) => { let k = ice.base(x, z); if (ice.extra) { const e = ice.extra(x, z); if (e > k) k = e; } return k; };
    /** signed-ish distance to the nearest static ice (negative inside) - used to keep objectives / hazards / scenery off the ice */
    ice.dist = (x, z) => {
      let d = 1e9;
      for (const l of lakes) { const e = (lakeD(l, x, z) - 1) * Math.min(l.rx, l.rz); if (e < d) d = e; }
      for (const p of patches) { const e = Math.hypot(x - p.x, z - p.z) - p.r * (p.sq > 0.8 ? 1 : 0.85); if (e < d) d = e; }
      return d;
    };
    map.ice = ice;
    const height = (x, z) => {
      const f1 = R.fbm(hn, x * 0.0085 + 11.3, z * 0.0085 + 4.7) - 0.5, f2 = R.fbm(hn, x * 0.032 + 3.1, z * 0.032 + 8.2) - 0.5, f3 = R.fbm(hn, x * 0.085 + 21.7, z * 0.085 + 13.3) - 0.5;
      let h = f1 * 2 * FC.hillAmp * 1.25 + f2 * 1.8 + f3 * 0.6 + 0.8;
      for (let i = 0; i < lakes.length; i++) {
        const l = lakes[i]; if (Math.abs(x - l.x) > l.rx * 1.7 || Math.abs(z - l.z) > l.rx * 1.7) continue;
        const d = lakeD(l, x, z); h = U.lerp(h, LAKE_H + f3 * 0.12, U.smooth(1.7, 1.0, d));
      }
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
    const inMap = (x, z, m) => Math.abs(x) < half - m && Math.abs(z) < half - m;
    const dStart = (x, z) => Math.hypot(x - start.x, z - start.z);
    const roadDist = (x, z) => { let d = 1e9; for (const p of map.roadPts) { const t = Math.hypot(x - p.x, z - p.z); if (t < d) d = t; } return d; };
    const roadHitsRect = (x, z, hw, hd, m) => { for (const p of map.roadPts) if (Math.abs(p.x - x) < hw + m && Math.abs(p.z - z) < hd + m) return true; return false; };
    const dry = (x, z, m) => ice.dist(x, z) > m;
    const addBox = (x, z, hw, hd, kind) => map.boxes.push({ x, z, hw, hd, kind });

    // ---------- cabin camps (clusters) + trails
    const nCl = sparse ? 3 : rng.int(6, 8);
    for (let t = 0; t < 700 && map.clusters.length < nCl; t++) {
      const x = rng.range(-half + 50, half - 50), z = rng.range(-half + 50, half - 50);
      if (dStart(x, z) < 60 || !dry(x, z, 22)) continue;
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

    // ---------- start camp
    const camp = { x: start.x + 18, z: start.z + 5 };
    map.tents.push(camp); addBox(camp.x, camp.z, 3.2, 2.6, 'tent');
    map.circles.push({ x: start.x - 14, z: start.z + 3, r: 0.5 });

    // ---------- ice patches: ~half of them hug the trails (so you meet ice while driving), the rest are anywhere
    const nP = sparse ? Math.ceil(FC.patches * 0.6) : FC.patches;
    for (let k = 0, t = 0; k < nP && t < 700; t++) {
      const r = rng.range(FC.patchR[0], FC.patchR[1]), sq = rng.range(0.6, 1.0);
      let x, z;
      if (k % 2 === 0 && map.roadPts.length) { const p = map.roadPts[(rng.next() * map.roadPts.length) | 0], a = rng.range(0, 6.28); x = p.x + Math.cos(a) * rng.range(0, r * 0.6); z = p.z + Math.sin(a) * rng.range(0, r * 0.6); }
      else { x = rng.range(-half + 24, half - 24); z = rng.range(-half + 24, half - 24); }
      if (!inMap(x, z, r + 10) || dStart(x, z) < 42 + r) continue;
      if (patches.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + r + 4)) continue;
      if (lakes.some((l) => lakeD(l, x, z) < 1.0 + r / Math.min(l.rx, l.rz) + 0.15)) continue;
      patches.push({ x, z, r, sq, rot: rng.range(0, 3.14) }); k++;
    }
    map.noHazard = (x, z) => ice.dist(x, z) < 7;       // no mines / barrels / pits / pickups on or right next to the ice
    map.focus = { x: lakes[0].x, z: lakes[0].z };

    // ---------- scenery: log cabins per camp, pine groves, snow boulders, ice spikes, drifts, grass tufts
    const place = (n, tries, fn) => { for (let k = 0, t = 0; k < n && t < tries; t++) if (fn()) k++; };
    for (const cl of map.clusters) {
      const nH = sparse ? 0 : rng.int(3, 5);
      for (let t = 0; t < 120 && cl.houses < nH; t++) {
        const a = rng.range(0, 6.283), rr = rng.range(11, cl.r + 8), x = cl.x + Math.cos(a) * rr, z = cl.z + Math.sin(a) * rr;
        let w = rng.range(8, 11), d = rng.range(7, 9.5); if (rng.chance(0.5)) { const tmp = w; w = d; d = tmp; }
        const hw = w / 2, hd = d / 2;
        if (!inMap(x, z, Math.max(hw, hd) + 14) || dStart(x, z) < 34 + Math.max(hw, hd) || roadHitsRect(x, z, hw, hd, 5) || !rectOk(x, z, hw, hd, 10)) continue;
        if (ice.dist(x, z) < Math.max(hw, hd) + 4) continue;
        const gy = Math.max(height(x, z), height(x - hw, z - hd), height(x + hw, z + hd), height(x - hw, z + hd), height(x + hw, z - hd)), hh = rng.range(4.2, 5.2);
        map.cabins.push({ x, z, w, d, h: hh, gy, rot: 0, v: rng.int(0, 2) }); addBox(x, z, hw, hd, 'house'); cl.houses++;
        map.smokes.push({ x: x + w * 0.28, z, gy: gy + hh + Math.min(w, d) * 0.5 + 3.6 });
      }
    }
    // pine groves
    const groves = []; place(sparse ? 4 : 11, 300, () => { const x = rng.range(-half + 30, half - 30), z = rng.range(-half + 30, half - 30); if (dStart(x, z) < 50 || !dry(x, z, 14) || groves.some((g) => Math.hypot(g.x - x, g.z - z) < 40)) return false; groves.push({ x, z, r: rng.range(14, 24) }); return true; });
    for (const gv of groves) place(rng.int(10, 15), 80, () => {
      const a = rng.range(0, 6.283), rr = Math.sqrt(rng.next()) * gv.r, x = gv.x + Math.cos(a) * rr, z = gv.z + Math.sin(a) * rr;
      if (!inMap(x, z, 10) || dStart(x, z) < 26 || !dry(x, z, 3) || roadDist(x, z) < 7 || !circOk(x, z, 1.0, 3.5)) return false;
      map.pines.push({ x, z, s: rng.range(0.85, 1.5), gy: height(x, z), rot: rng.range(0, 6.28), k: rng.int(0, 3) }); map.circles.push({ x, z, r: 0.95 }); return true;
    });
    place(sparse ? 20 : 56, 1200, () => {
      const x = rng.range(-half + 10, half - 10), z = rng.range(-half + 10, half - 10);
      if (dStart(x, z) < 24 || !dry(x, z, 3) || roadDist(x, z) < 6.5 || !circOk(x, z, 1.0, 4.5)) return false;
      map.pines.push({ x, z, s: rng.range(0.85, 1.45), gy: height(x, z), rot: rng.range(0, 6.28), k: rng.int(0, 3) }); map.circles.push({ x, z, r: 0.95 }); return true;
    });
    place(sparse ? 14 : 36, 500, () => {
      const r = rng.range(1.7, 4.6), x = rng.range(-half + 12, half - 12), z = rng.range(-half + 12, half - 12);
      if (dStart(x, z) < 26 || !dry(x, z, r + 2) || roadDist(x, z) < r + 5 || !circOk(x, z, r * 1.05, 8)) return false;
      map.rocks.push({ x, z, r, gy: height(x, z) }); map.circles.push({ x, z, r: r * 1.05 }); return true;
    });
    place(sparse ? 6 : 16, 400, () => {
      const x = rng.range(-half + 20, half - 20), z = rng.range(-half + 20, half - 20), s = rng.range(0.8, 1.5);
      if (dStart(x, z) < 40 || !dry(x, z, 3) || roadDist(x, z) < 8 || !circOk(x, z, 1.8 * s, 6)) return false;
      map.spikes.push({ x, z, s, gy: height(x, z), rot: rng.range(0, 6.28) }); map.circles.push({ x, z, r: 1.6 * s }); return true;
    });
    place(sparse ? 16 : 44, 400, () => {
      const x = rng.range(-half + 14, half - 14), z = rng.range(-half + 14, half - 14);
      if (!dry(x, z, 2) || roadDist(x, z) < 5) return false;
      map.drifts.push({ x, z, s: rng.range(0.8, 1.6), gy: height(x, z), rot: rng.range(0, 6.28) }); return true;
    });
    for (let k = 0, t = 0; k < (sparse ? 120 : 320) && t < 2500; t++) {
      const x = rng.range(-half + 6, half - 6), z = rng.range(-half + 6, half - 6);
      if (roadDist(x, z) < 4.5 || !dry(x, z, 1) || !circOk(x, z, 0.4, 0)) continue;
      map.grass.push({ x, z, s: rng.range(0.6, 1.3), r: rng.range(0, 6.28) }); k++;
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
    const base = R.hash((runSeed ^ 0x1CEF) >>> 0, missionIndex);
    let map = null, attempt = 0;
    for (; attempt < 14 && !map; attempt++) map = build(R.hash(base, attempt), missionIndex, tutorial, false, false);
    if (!map) { map = build(R.hash(base, 99), missionIndex, tutorial, true, false); map && (map.fallback = true); attempt = 15; }
    if (!map) { map = build(R.hash(base, 777), missionIndex, tutorial, true, true); map && (map.fallback = true); attempt = 16; }
    if (!map) { for (let k = 0; k < 24 && !map; k++) { map = build(R.hash(base, 1000 + k), missionIndex, tutorial, true, true); map && (map.fallback = true); } attempt = 17; }
    if (!map) throw new Error('[WorldF] could not generate a valid map');
    map.attempts = attempt;
    return map;
  }

  WZ.WorldF = { generate };
})(window.WZ = window.WZ || {});
