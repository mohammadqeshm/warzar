/* WZ.Jets — FIGHTER JET bombing runs (bought in the Shop; one is consumed per call, no limit on how many fly at once).
 *
 * The jet flies in from far away, lines up on a bombing corridor over the biggest group of enemies near the protected target (the vehicle, or Nana
 * while she is outside; giants / dinosaurs count extra), carpet-bombs a string of bombs, climbs and turns around for the next run (CFG.jet.passes
 * runs in total), then lights the afterburner and leaves. Everything is simulated, nothing is scripted:
 *   - flight: speed, heading with a limited turn rate, altitude/vertical speed follow the terrain, bank + pitch come from the real motion;
 *   - bombs: real ballistic projectiles (jet velocity + gravity). The release moment is computed from the jet's own motion
 *     (predicted impact point = position + velocity * fall time), so the explosions line up along the planned corridor;
 *   - U-turn: the entry point of the next run is solved from the exact arc of a turn at the jet's turn rate (a "teardrop" entry).
 * Bombs never hurt the vehicle or Nana (only enemies / giants / dinosaurs). Numbers: WZ.CFG.jet. Defense Tech boosts damage (+1 bomb at levels 2 and 4). */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, C = CFG.jet, U = WZ.U, G = WZ.Geo, rb = G.rbox;
  const B = () => new G.Builder();
  const SC = 1.15;
  const BODY = 0x7F8C97, BELLY = 0xB9C2CA, WING = 0x66727E, DARK = 0x23272A, STEEL = 0x3A3F45, YEL = 0xFFB400, RED = 0xD2391E, GLASS = 0x6EC6FF, BOMB = 0x56633F;
  const RACK = [[1.7, -0.55, -0.4], [-1.7, -0.55, -0.4], [2.7, -0.5, -1.0], [-2.7, -0.5, -1.0], [0.95, -0.8, 0.9], [-0.95, -0.8, 0.9], [3.7, -0.45, -1.5], [-3.7, -0.45, -1.5]];
  const NOZ = [[0.55, 0.0, -5.2], [-0.55, 0.0, -5.2]];
  const q = new T.Quaternion(), qa = new T.Quaternion(), m4 = new T.Matrix4(), vp = new T.Vector3(), vs = new T.Vector3(), vd = new T.Vector3(), ZAX = new T.Vector3(0, 0, 1);
  const rnd = Math.random, clamp = U.clamp;
  let parts = null, bombGeoC = null;

  // ---------------------------------------------------------------- geometry helpers
  /** flat extruded polygon in the XZ plane (convex), thickness th, flat shaded */
  function slab(poly, th) {
    const pos = [], nor = [], cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cz = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    const tri = (a, b, c, en) => {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * en[0] + ny * en[1] + nz * en[2] < 0) { const t = b; b = c; c = t; }
      for (const p of [a, b, c]) { pos.push(p[0], p[1], p[2]); nor.push(en[0], en[1], en[2]); }
    };
    const h = th / 2, n = poly.length;
    for (let i = 1; i < n - 1; i++) {
      tri([poly[0][0], h, poly[0][1]], [poly[i][0], h, poly[i][1]], [poly[i + 1][0], h, poly[i + 1][1]], [0, 1, 0]);
      tri([poly[0][0], -h, poly[0][1]], [poly[i][0], -h, poly[i][1]], [poly[i + 1][0], -h, poly[i + 1][1]], [0, -1, 0]);
    }
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n], ex = b[0] - a[0], ez = b[1] - a[1];
      let nx = ez, nz = -ex; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
      if (nx * ((a[0] + b[0]) / 2 - cx) + nz * ((a[1] + b[1]) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
      const A1 = [a[0], h, a[1]], B1 = [b[0], h, b[1]], B2 = [b[0], -h, b[1]], A2 = [a[0], -h, a[1]];
      tri(A1, B1, B2, [nx, 0, nz]); tri(A1, B2, A2, [nx, 0, nz]);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    return G.mark(g);
  }
  const mirror = (poly) => poly.map((p) => [-p[0], p[1]]).reverse();

  /** the bomb (nose = +z): olive casing, yellow band, black nose tip, tail fins */
  function bombGeo() {
    if (bombGeoC) return bombGeoC;
    const b = B();
    b.add(G.sph(12, 8), { sx: 0.44, sy: 0.44, sz: 1.3, color: BOMB });
    b.add(G.cyl(10), { z: 0.15, rx: Math.PI / 2, sx: 0.455, sy: 0.22, sz: 0.455, color: YEL });
    b.add(G.sph(8, 6), { z: 1.2, sx: 0.2, sy: 0.2, sz: 0.28, color: 0x15171A });
    b.add(G.cyl(10), { z: -1.0, rx: Math.PI / 2, sx: 0.3, sy: 0.5, sz: 0.3, color: 0x2B2E31 });
    for (let i = 0; i < 4; i++) b.add(G.box1, { z: -1.2, rz: i * Math.PI / 2, y: 0, sx: 0.05, sy: 1.15, sz: 0.62, color: 0x2B2E31 });
    bombGeoC = b.build(); G.mark(bombGeoC); return bombGeoC;
  }

  function makeParts() {
    const body = B(), flameG = new T.ConeGeometry(1, 1, 10, 1, true);
    // fuselage, nose, canopy, intakes
    body.add(G.cyl(14), { z: -0.4, rx: Math.PI / 2, sx: 1.12, sy: 8.6, sz: 1.0, color: BODY });
    body.add(G.cyl(14), { z: -0.2, y: -0.28, rx: Math.PI / 2, sx: 1.02, sy: 7.6, sz: 0.7, color: BELLY });
    body.add(G.cone(14), { z: 5.3, rx: Math.PI / 2, sx: 1.12, sy: 3.4, sz: 1.0, color: BODY });
    body.add(G.sph(10, 8), { z: 7.05, sx: 0.2, sy: 0.2, sz: 0.34, color: DARK });
    body.add(G.cyl(14), { z: 4.9, rx: Math.PI / 2, sx: 1.16, sy: 0.55, sz: 1.04, color: YEL });          // nose band
    body.add(G.sph(12, 8), { y: 0.62, z: 1.9, sx: 0.58, sy: 0.55, sz: 1.75, color: GLASS });
    body.add(G.sph(10, 6), { y: 0.58, z: 1.95, sx: 0.62, sy: 0.36, sz: 1.85, color: 0x2C6FA0 });
    body.add(rb(0.12, 0.12, 1.6, 0.04), { y: 1.1, z: 1.9, color: DARK });
    body.add(G.box1, { y: 0.35, z: -1.15, sx: 0.86, sy: 0.3, sz: 3.6, color: BODY });                   // spine
    for (const s of [1, -1]) {
      body.add(rb(0.62, 0.78, 2.6, 0.2), { x: 1.0 * s, y: -0.18, z: 1.3, color: DARK });                // air intakes
      body.add(rb(0.58, 0.72, 0.1, 0.04), { x: 1.0 * s, y: -0.18, z: 2.65, color: 0x0C0D0E });
    }
    // wings, tailplanes, fins, nozzles
    const wing = [[0.5, 2.5], [5.3, -1.0], [5.3, -2.6], [0.5, -3.3]], lerx = [[0.5, 4.3], [1.7, 1.4], [0.5, 1.4]], tailp = [[0.4, -3.3], [2.9, -5.2], [2.9, -6.0], [0.4, -5.7]];
    for (const s of [1, -1]) {
      const f = (p) => (s > 0 ? p : mirror(p));
      body.add(slab(f(wing), 0.2), { y: -0.12, color: WING });
      body.add(slab(f(lerx), 0.16), { y: -0.02, color: BODY });
      body.add(slab(f(tailp), 0.16), { y: -0.05, color: WING });
      body.add(G.box1, { x: 5.28 * s, y: -0.1, z: -1.8, sx: 0.07, sy: 0.3, sz: 1.5, color: s > 0 ? RED : 0x2FD35C });        // wing-tip nav strips
      body.add(slab(f([[3.1, -0.15], [5.1, -1.0], [5.1, -1.35], [3.1, -0.9]]), 0.215), { y: -0.12, color: YEL });         // yellow hazard stripe
      body.add(slab(f([[3.3, -1.0], [5.15, -1.75], [5.15, -2.05], [3.3, -1.55]]), 0.225), { y: -0.12, color: DARK });
      body.add(rb(0.17, 2.3, 2.1, 0.07), { x: 1.05 * s, y: 1.35, z: -4.2, rx: -0.32, rz: -0.2 * s, color: BODY });       // twin fins
      body.add(rb(0.19, 0.55, 1.2, 0.05), { x: 1.22 * s, y: 2.28, z: -4.75, rx: -0.32, rz: -0.2 * s, color: YEL });
      body.add(G.cyl(12), { x: NOZ[s > 0 ? 0 : 1][0], y: NOZ[0][1], z: -5.0, rx: Math.PI / 2, sx: 0.46, sy: 1.5, sz: 0.46, color: STEEL });
      body.add(G.cyl(12), { x: NOZ[s > 0 ? 0 : 1][0], y: NOZ[0][1], z: -5.72, rx: Math.PI / 2, sx: 0.36, sy: 0.2, sz: 0.36, color: 0x0C0D0E });
      body.add(rb(0.34, 0.2, 2.2, 0.06), { x: 1.2 * s, y: -0.34, z: -0.2, color: DARK });                                  // wing pylons
    }
    body.add(rb(0.3, 0.1, 0.9, 0.03), { y: -0.45, z: 0.6, color: DARK });
    return { body: G.mark(body.build()), flame: G.mark(flameG) };
  }

  /** a complete fighter jet (also used by the shop preview): { root, pivot, headG, burner(k), setLoad(n), spin(dt), dispose() } */
  function model() {
    if (!parts) parts = makeParts();
    const mat = new T.MeshLambertMaterial({ vertexColors: true }), root = new T.Group(), pivot = new T.Group();
    pivot.rotation.order = 'YXZ'; root.add(pivot);
    const body = new T.Mesh(parts.body, mat); body.castShadow = true; pivot.add(body);
    // bomb rack: 8 little bombs under the wings
    const rack = [], bg = bombGeo();
    for (const r of RACK) { const m = new T.Mesh(bg, mat); m.position.set(r[0], r[1], r[2]); m.scale.setScalar(0.5); m.castShadow = true; pivot.add(m); rack.push(m); }
    // afterburners: outer orange + inner blue-white cone per engine (additive)
    const fm = (col, op) => new T.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide });
    const matO = fm(0xFF8A2A, 0.8), matI = fm(0xBFE9FF, 0.95), flames = [];
    for (const n of NOZ) {
      const g = new T.Group(); g.position.set(n[0], n[1], n[2] - 0.8); g.rotation.x = -Math.PI / 2; pivot.add(g);
      const o = new T.Mesh(parts.flame, matO), i = new T.Mesh(parts.flame, matI); o.frustumCulled = i.frustumCulled = false; g.add(o, i);
      flames.push({ o, i });
    }
    // nav lights (red / green wing tips, white tail strobe)
    const lampR = new T.MeshBasicMaterial({ color: 0xFF2A18 }), lampG = new T.MeshBasicMaterial({ color: 0x2BFF6A }), lampW = new T.MeshBasicMaterial({ color: 0xFFFFFF });
    const lg = new T.SphereGeometry(0.2, 8, 6), lights = [[lampR, 5.35, -0.1, -1.9], [lampG, -5.35, -0.1, -1.9], [lampW, 0, 3.1, -5.7]].map((l) => { const m = new T.Mesh(lg, l[0]); m.position.set(l[1], l[2], l[3]); pivot.add(m); return m; });
    pivot.scale.setScalar(SC);
    let a = 0, load = RACK.length;
    const api = {
      root, pivot, headG: new T.Group(), scale: SC, level: 0.6, flames, lampR, lampG, lampW,
      burner(k) {   // 0..1.4
        api.level = k;
        for (const f of flames) {
          const fl = 0.85 + 0.15 * Math.sin(a * 41) + 0.1 * Math.sin(a * 67 + 1.3), len = (0.5 + 3.8 * k) * fl, w = 0.34 + 0.22 * k;
          f.o.scale.set(w, len, w); f.o.position.y = len / 2; f.i.scale.set(w * 0.5, len * 0.55, w * 0.5); f.i.position.y = len * 0.275;
          f.o.visible = f.i.visible = k > 0.02;
        }
      },
      setLoad(n) { load = n; rack.forEach((m, i) => { m.visible = i < n; }); },
      get load() { return load; },
      spin(dt) { a += dt; api.burner(api.level); lampR.visible = lampG.visible = ((a * 1.6) % 1) < 0.62; lampW.visible = ((a * 2.4) % 1) < 0.1; },
      dispose() { mat.dispose(); matO.dispose(); matI.dispose(); lampR.dispose(); lampG.dispose(); lampW.dispose(); lg.dispose(); },
    };
    api.burner(0.6);
    return api;
  }

  // ---------------------------------------------------------------- simulation
  const tech = () => (WZ.Save.data.upgrades.defense | 0);
  const fallTime = (h, vy) => (vy + Math.sqrt(vy * vy + 2 * C.gravity * Math.max(0.01, h))) / C.gravity;

  const Jets = {
    ctx: null, list: [], bombs: [], bombMesh: null, bombMat: null, kills: 0, called: 0, cd: 0, noteT: 0, sfxN: 0, flash: null, stripGeo: null,
    stock() { const v = WZ.Save.data.inv; return (v && v.jet) | 0; },
    get count() { return Jets.list.length; },
    cdPct() { return Jets.cd <= 0 ? 1 : 1 - Jets.cd / C.cooldown; },
    model,

    init(ctx) {
      Jets.dispose(); Jets.ctx = ctx; Jets.list = []; Jets.kills = 0; Jets.called = 0; Jets.cd = 0; Jets.noteT = 0;
      const geo = bombGeo(); Jets.bombMat = new T.MeshLambertMaterial({ vertexColors: true });
      Jets.bombMesh = new T.InstancedMesh(geo, Jets.bombMat, C.maxBombs); Jets.bombMesh.frustumCulled = false; Jets.bombMesh.count = 0; Jets.bombMesh.castShadow = true;
      Jets.bombMesh.instanceMatrix.setUsage(T.DynamicDrawUsage); ctx.scene.add(Jets.bombMesh);
      Jets.bombs = []; for (let i = 0; i < C.maxBombs; i++) Jets.bombs.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, dm: 1, tick: 0, odd: 0 });
      Jets.stripGeo = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    },

    // ---------------------------------------------------------------- planning
    /** choose the bombing corridor: centre, direction, half length. prev = previous corridor (the next run comes back the other way). */
    plan(prev) {
      const c = Jets.ctx, J = c.jeep, N = c.nana, E = c.enemies, hm = c.map.height, n = Jets.perPass();
      const nanaOut = N.out && !N.isKO && N.state !== 'BOARDING', P = nanaOut ? N : J;
      let best = null, bs = -1e9;
      E.hash.query(P.x, P.z, C.searchRange, E.q);
      const cand = E.q.slice();
      for (const e of cand) {
        if (!e.active || e.state === 2) continue;
        let k = 0; for (const o of cand) if (o.active && o.state !== 2 && Math.hypot(o.x - e.x, o.z - e.z) < C.blast * 1.4) k++;
        const sc = k * 10 - Math.hypot(e.x - P.x, e.z - P.z) * 0.06; if (sc > bs) { bs = sc; best = e; }
      }
      if (WZ.Giants) for (const g of WZ.Giants.list) {
        if (!g.active) continue; const d = Math.hypot(g.x - P.x, g.z - P.z); if (d > C.searchRange + 12) continue;
        const sc = 36 - d * 0.06; if (sc > bs) { bs = sc; best = g; }
      }
      let cx, cz;
      if (best) { cx = best.x; cz = best.z; } else { cx = P.x + Math.sin(J.h) * C.defaultAhead; cz = P.z + Math.cos(J.h) * C.defaultAhead; }
      const half = (n - 1) * C.spacing / 2 + 3;
      let th;
      if (prev) th = prev.th + Math.PI + (rnd() - 0.5) * 0.6;
      else { const dx = cx - P.x, dz = cz - P.z; th = Math.hypot(dx, dz) > 6 ? Math.atan2(dx, dz) : J.h; }
      let dx = Math.sin(th), dz = Math.cos(th);
      if (!prev) { const d = Math.hypot(cx - P.x, cz - P.z), need = half + C.minSafe; if (d < need) { cx = P.x + dx * need; cz = P.z + dz * need; } }
      // keep the corridor itself away from the protected target
      const lx = dz, lz = -dx;                               // left vector
      const rx = P.x - cx, rz = P.z - cz, along = clamp(rx * dx + rz * dz, -half, half), px = cx + dx * along, pz = cz + dz * along, dd = Math.hypot(P.x - px, P.z - pz);
      if (dd < C.minSafe) { const side = (rx * lx + rz * lz) > 0 ? -1 : 1, sh = C.minSafe - dd + 1; cx += lx * side * sh; cz += lz * side * sh; }
      const lim = c.map.half + 10; cx = clamp(cx, -lim, lim); cz = clamp(cz, -lim, lim);
      return { cx, cz, th, dx, dz, lx, lz, half, n, gy: hm(cx, cz) };
    },
    perPass() { return C.bombsPerPass + Math.floor(tech() / 2); },

    // ---------------------------------------------------------------- calling a jet
    call() {
      const c = Jets.ctx; if (!c) return false;
      const J = c.jeep; if (!J.alive || Jets.cd > 0) return false;
      if (Jets.stock() <= 0) {
        if (Jets.noteT <= 0) { Jets.noteT = 0.8; WZ.Audio.sfx('beep'); WZ.Fx.text(WZ.I18n.t('hud.nojet'), J.rx, J.ry + 6, J.rz, 'warn'); }
        return false;
      }
      const S = WZ.Save.data; S.inv.jet = Math.max(0, S.inv.jet - 1); WZ.Save.save();
      const line = Jets.plan(null), m = model(); c.scene.add(m.root);
      const x = line.cx - line.dx * C.approach, z = line.cz - line.dz * C.approach;
      const j = {
        m, state: 'run', age: 0, x, z, y: c.map.height(x, z) + C.cruiseAlt, px: x, py: 0, pz: z, h: line.th, ph: line.th, sp: C.speed, vy: 0, roll: 0, pitch: 0, yawRate: 0,
        line, pass: 0, rel: 0, carry: 0, p0: null, th1: 0, turnDir: 1, burn: 0.55, leaveT: 0, kills: 0, called: Jets.called++, strip: null, stripOp: 0, said: true, fired: false,
      };
      j.py = j.y; j.strip = Jets.makeStrip(line); m.setLoad(Math.min(C.bombCap, line.n));
      Jets.list.push(j); Jets.cd = C.cooldown;
      WZ.Audio.sfx('jet', 1); WZ.Fx.text(WZ.I18n.t('hud.jetOn'), J.rx, J.ry + 6.5, J.rz, 'good'); WZ.Fx.flash('good');
      return true;
    },

    makeStrip(line) {
      const c = Jets.ctx, mt = new T.MeshBasicMaterial({ color: 0xFF4A24, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, side: T.DoubleSide });
      const s = new T.Mesh(Jets.stripGeo, mt); s.renderOrder = 14; s.frustumCulled = false;
      Jets.placeStrip(s, line); c.scene.add(s); return s;
    },
    placeStrip(s, line) {
      const len = line.half * 2 + 12;
      s.position.set(line.cx, line.gy + 0.45, line.cz); s.rotation.set(0, line.th, 0); s.scale.set(7.5, 1, len);
    },

    /** the pass is over: plan the next run (or leave) */
    finishPass(j) {
      const c = Jets.ctx;
      j.carry = Math.max(0, j.line.n - j.rel); j.pass++;
      if (j.pass >= C.passes) { j.state = 'leave'; j.leaveT = 0; WZ.Audio.sfx('jet', 0.7); return; }
      const next = Jets.plan(j.line); next.n += Math.min(3, j.carry); next.half = (next.n - 1) * C.spacing / 2 + 3;
      // teardrop entry: where must the U-turn start so that it ends exactly on the new corridor, `approach` before its centre?
      // (the turn direction is fixed now; the start point is re-solved every step from the jet's current heading - see solveEntry)
      const d = U.angDiff(j.h, next.th);
      j.nextLine = next; j.th1 = next.th; j.turnDir = d >= 0 ? 1 : -1; j.state = 'out'; Jets.solveEntry(j);
      c.scene.remove(j.strip); j.strip.material.dispose(); j.strip = Jets.makeStrip(next); j.stripOp = 0.3;
    },

    /** point where a U-turn at the current heading must start so that it ends on the next corridor, exactly `approach` before its centre */
    solveEntry(j) {
      const nx = j.nextLine, th0 = j.h, dir = j.turnDir, TAU = Math.PI * 2;
      let turn = dir > 0 ? (j.th1 - th0) : (th0 - j.th1); turn = ((turn % TAU) + TAU) % TAU;
      const th1b = th0 + dir * turn, sp = C.speed * 1.1, off = sp / (dir * C.turnRate);
      const ox = off * (Math.cos(th0) - Math.cos(th1b)), oz = off * (Math.sin(th1b) - Math.sin(th0));
      j.p0 = { x: nx.cx - nx.dx * C.approach - ox, z: nx.cz - nx.dz * C.approach - oz };
    },

    // ---------------------------------------------------------------- bombs
    release(j, slot) {
      const b = Jets.bombs.find((o) => !o.on); if (!b) return;
      const sn = Math.sin(j.h), cs = Math.cos(j.h), r = RACK[slot % RACK.length], xo = r[0] * SC, zo = r[2] * SC;
      b.on = true; b.age = 0; b.tick = 0; b.odd = (Jets.sfxN++) & 1;
      b.x = j.x + cs * xo + sn * zo; b.z = j.z - sn * xo + cs * zo; b.y = j.y - 1.1;
      b.vx = sn * j.sp + (rnd() - 0.5) * 0.7; b.vz = cs * j.sp + (rnd() - 0.5) * 0.7; b.vy = j.vy - 3;
      b.dm = 1 + tech() * CFG.defenseTech.dmg;
      WZ.Audio.sfx('whistle', 0.9); Jets.ctx.particles.muzzle(b.x, b.y, b.z);
      j.m.setLoad(Math.max(0, Math.min(C.bombCap, j.line.n) - (j.rel + 1)));
    },

    detonate(b, gy) {
      const c = Jets.ctx, E = c.enemies, x = b.x, z = b.z, y = gy, J = c.jeep;
      WZ.Fire.explode(x, y + 0.5, z, { scale: 0.95, debris: 3, groundFire: 2.2, shake: Math.hypot(x - J.x, z - J.z) < 55 ? 0.2 : 0.05, scorch: 0.9, parts: 0.5, mute: !!b.odd });
      if (b.odd) WZ.Audio.sfx('boom', 0.55);
      E.hash.query(x, z, C.blast, E.q);
      let n = 0;
      for (const e of E.q.slice()) { if (!e.active || e.state === 2 || Math.hypot(e.x - x, e.z - z) > C.blast) continue; E.ko(e, e.x - x, e.z - z, C.knock, 'jet'); n++; }
      if (WZ.Giants) WZ.Giants.splash(x, z, C.blast * 0.8, C.damage * b.dm, 'jet');
      Jets.kills += n;
      if (n >= 3) WZ.Fx.text('x' + n + ' ' + WZ.I18n.t('hud.combo'), x, y + 5, z, 'coin');
    },

    update(dt) {
      const c = Jets.ctx; if (!c) return;
      if (Jets.cd > 0) Jets.cd -= dt; if (Jets.noteT > 0) Jets.noteT -= dt;
      const hm = c.map.height, P = c.particles, J = c.jeep, N = c.nana, nanaOut = N.out && !N.isKO && N.state !== 'BOARDING';
      // ---- bombs
      for (const b of Jets.bombs) {
        if (!b.on) continue;
        b.age += dt; b.vy -= C.gravity * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        if ((b.tick++ & 1) === 0) P.emit(0, b.x - b.vx * 0.02, b.y + 0.2, b.z - b.vz * 0.02, 0, 0, 0, 0.55, 0.5, 1.9, 0.82, 0.82, 0.86, 0.45, 0, 0, 1.2);
        const gy = hm(b.x, b.z);
        if (b.y <= gy + 0.35 || b.age > 6) { b.on = false; Jets.detonate(b, gy); }
      }
      // ---- jets
      for (let k = Jets.list.length - 1; k >= 0; k--) {
        const j = Jets.list[k], L = j.line; j.age += dt; j.px = j.x; j.py = j.y; j.pz = j.z; j.ph = j.h;
        let hd = j.h, altT = C.cruiseAlt, spT = C.speed, burn = 0.55, turnMul = 1;
        if (j.state === 'run') {
          const rx = j.x - L.cx, rz = j.z - L.cz, along = rx * L.dx + rz * L.dz, lat = rx * L.lx + rz * L.lz;
          hd = L.th - clamp(lat * 0.045, -0.8, 0.8);
          const lead = C.speed * Math.sqrt(2 * C.bombAlt / C.gravity), u = U.smooth(0, 1, (along + lead + L.half + 120) / 90);
          altT = U.lerp(C.cruiseAlt, C.bombAlt, u); spT = C.speed; burn = 0.5 + 0.2 * (1 - u);
          if (j.sp > C.speed * 0.5 && !j.said && along > -(lead + L.half + 150)) { j.said = true; WZ.Audio.sfx('jet', 0.8); }
          // release: predicted impact point of a bomb dropped right now
          const sn = Math.sin(j.h), cs = Math.cos(j.h), vx = sn * j.sp, vz = cs * j.sp;
          let t = fallTime(j.y - hm(j.x, j.z), j.vy - 3), qx = j.x + vx * t, qz = j.z + vz * t;
          t = fallTime(j.y - hm(qx, qz), j.vy - 3); qx = j.x + vx * t; qz = j.z + vz * t;
          const sQ = (qx - L.cx) * L.dx + (qz - L.cz) * L.dz, lQ = (qx - L.cx) * L.lx + (qz - L.cz) * L.lz;
          while (j.rel < L.n && sQ >= -L.half + 3 + j.rel * C.spacing && Math.abs(lQ) < 17 && j.y - hm(j.x, j.z) < C.bombAlt + 14) {
            const bx = qx, bz = qz;
            if (Math.hypot(bx - J.x, bz - J.z) < 6 || (nanaOut && Math.hypot(bx - N.x, bz - N.z) < 5)) { j.rel++; break; }   // never drop right on the player
            if (!j.fired) { j.fired = true; if (j.pass === 0) WZ.Fx.text(WZ.I18n.t('hud.jetRun'), L.cx, L.gy + 7, L.cz, 'warn'); }
            Jets.release(j, j.rel); j.rel++; break;                 // at most one per step (spacing > speed * dt)
          }
          if (j.rel >= L.n || sQ > L.half + 22) { j.fired = false; Jets.finishPass(j); }
        } else if (j.state === 'out') {
          Jets.solveEntry(j);
          const dx = j.p0.x - j.x, dz = j.p0.z - j.z, d = Math.hypot(dx, dz), fwd = dx * Math.sin(j.h) + dz * Math.cos(j.h);
          hd = Math.atan2(dx, dz); altT = C.cruiseAlt + 12; spT = C.speed * 1.1; burn = 1.15; turnMul = 0.8;
          if (d < 14 || (fwd < 0 && d < 120)) j.state = 'turn';
        } else if (j.state === 'turn') {
          altT = C.cruiseAlt + 6; spT = C.speed * 1.1; burn = 0.9;
          const TAU = Math.PI * 2; let rem = j.turnDir > 0 ? (j.th1 - j.h) : (j.h - j.th1); rem = ((rem % TAU) + TAU) % TAU;
          if (rem < 0.07 || rem > TAU - 0.07) { j.state = 'run'; j.line = j.nextLine; j.rel = 0; j.said = false; j.fired = false; j.m.setLoad(Math.min(C.bombCap, j.line.n)); }
          else hd = j.h + j.turnDir * 1;
        } else { // leave
          j.leaveT += dt; hd = j.h; altT = C.cruiseAlt + 70; spT = C.boostSpeed; burn = 1.4;
          if (j.leaveT > C.leaveTime || Math.hypot(j.x - J.x, j.z - J.z) > 420) { Jets.remove(k); continue; }
        }
        // --- flight physics: limited turn rate, speed + vertical speed with inertia
        const dh = clamp(U.angDiff(j.h, hd), -C.turnRate * turnMul * dt, C.turnRate * turnMul * dt);
        j.h += dh; j.yawRate = U.damp(j.yawRate, dh / dt, 8, dt);
        j.sp += (spT - j.sp) * Math.min(1, dt * (j.state === 'leave' ? 1.1 : 1.6));
        j.x += Math.sin(j.h) * j.sp * dt; j.z += Math.cos(j.h) * j.sp * dt;
        const gyNow = hm(j.x, j.z), vyT = clamp((gyNow + altT - j.y) * 1.5, -20, 24);
        j.vy += (vyT - j.vy) * Math.min(1, dt * 2.6); j.y += j.vy * dt;
        if (j.y < gyNow + 12) j.y = gyNow + 12;
        j.roll = U.damp(j.roll, clamp(-j.yawRate * 0.62, -1.25, 1.25), 6, dt); j.pitch = U.damp(j.pitch, -Math.atan2(j.vy, j.sp) * 1.15, 6, dt);
        j.burn = U.damp(j.burn, burn, 3, dt);

        // --- effects: exhaust glow + smoke trail from both nozzles, wing-tip vortices when the jet is pulling G
        if (j.strip) { const want = j.state === 'run' && j.rel === 0 ? 0.3 : (j.state === 'out' || j.state === 'turn') ? 0.3 : 0; j.stripOp = U.damp(j.stripOp, want, 4, dt); }
        const sn = Math.sin(j.h), cs = Math.cos(j.h), sg = SC;
        for (let n = 0; n < 2; n++) {
          const o = NOZ[n], wx = j.x + cs * o[0] * sg + sn * o[2] * sg, wz = j.z - sn * o[0] * sg + cs * o[2] * sg, wy = j.y + (o[1] - 0.2) * sg + Math.sin(j.pitch) * 5.6 * sg;
          if ((j.age * 60 | 0) % 2 === n) {
            P.emit(1, wx, wy, wz, -sn * j.sp * 0.25, 0, -cs * j.sp * 0.25, 0.22, 1.6 + j.burn, 0.3, 1, 0.55, 0.2, 0.85, 0, 0, 2);
            P.emit(0, wx, wy, wz, -sn * j.sp * 0.05, 0.2, -cs * j.sp * 0.05, 1.5, 1.3, 5.2, 0.86, 0.87, 0.9, 0.34, 0, 0, 1.4);
          }
        }
        if (Math.abs(j.roll) > 0.4 || j.vy > 6) {
          for (let s = -1; s <= 1; s += 2) {
            if ((j.age * 60 | 0) % 3) continue;
            const wx = j.x + cs * 5.2 * sg * s - sn * 1.8 * sg, wz = j.z - sn * 5.2 * sg * s - cs * 1.8 * sg;
            P.emit(0, wx, j.y - 0.2, wz, 0, 0, 0, 1.3, 0.5, 2.6, 0.95, 0.96, 1, 0.3, 0, 0, 1.6);
          }
        }
      }
    },

    remove(k) {
      const c = Jets.ctx, j = Jets.list[k];
      c.scene.remove(j.m.root); j.m.dispose(); G.disposeTree(j.m.root);
      if (j.strip) { c.scene.remove(j.strip); j.strip.material.dispose(); }
      Jets.list.splice(k, 1);
    },

    /** soft ground shadows (called inside WZ.Blobs.begin/end) */
    blobs(BL) {
      const hm = Jets.ctx && Jets.ctx.map.height; if (!hm) return;
      for (const j of Jets.list) BL.add(j.x + 3, hm(j.x, j.z), j.z + 2.5, 11);
    },

    render(alpha, dt, tm) {
      const c = Jets.ctx; if (!c) return;
      for (const j of Jets.list) {
        const m = j.m, x = U.lerp(j.px, j.x, alpha), y = U.lerp(j.py, j.y, alpha), z = U.lerp(j.pz, j.z, alpha), h = j.ph + U.angDiff(j.ph, j.h) * alpha;
        m.root.position.set(x, y, z); m.root.rotation.set(0, h, 0); m.pivot.rotation.set(j.pitch, 0, j.roll);
        m.level = j.burn; m.spin(dt);
        if (j.strip) { j.strip.material.opacity = j.stripOp * (0.65 + 0.35 * Math.sin(tm * 9)); j.strip.visible = j.stripOp > 0.01; }
      }
      // bombs: nose along the velocity vector
      let n = 0;
      for (const b of Jets.bombs) {
        if (!b.on) continue;
        vd.set(b.vx, b.vy, b.vz).normalize(); q.setFromUnitVectors(ZAX, vd);
        qa.setFromAxisAngle(ZAX, b.age * 3.2); q.multiply(qa);
        m4.compose(vp.set(b.x, b.y, b.z), q, vs.set(1.5, 1.5, 1.5)); Jets.bombMesh.setMatrixAt(n++, m4);
      }
      Jets.bombMesh.count = n; Jets.bombMesh.instanceMatrix.needsUpdate = true;
    },

    dispose() {
      const c = Jets.ctx;
      if (c) {
        for (const j of Jets.list) { c.scene.remove(j.m.root); j.m.dispose(); G.disposeTree(j.m.root); if (j.strip) { c.scene.remove(j.strip); j.strip.material.dispose(); } }
        if (Jets.bombMesh) { c.scene.remove(Jets.bombMesh); Jets.bombMesh.dispose(); }
      }
      if (Jets.bombMat) Jets.bombMat.dispose(); if (Jets.stripGeo) Jets.stripGeo.dispose();
      Jets.list = []; Jets.bombs = []; Jets.bombMesh = null; Jets.bombMat = null; Jets.stripGeo = null; Jets.ctx = null;
    },
  };
  WZ.Jets = Jets;
})(window.WZ = window.WZ || {});
