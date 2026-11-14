/* WZ.Pickups — DYNAMIC Health (HEART) and Time (CLOCK) pickups. Drive over them with the VEHICLE.
 *
 *   BUDGET      per mission, for EACH kind, = the displayed mission level (mission.index; CFG.pickups.budget). It is the most pickups of that kind that may be spawned during the whole
 *               mission (never a simultaneous count, never capped). A pickup consumes budget only when it has really been placed in the world - a failed placement costs nothing.
 *   HEART       becomes eligible when the vehicle's armor is <= CFG.pickups.heal.threshold (50 %) of its max (and never at full armor). Restores CFG.pickups.heal.healPct (40 %) of MAX armor.
 *   CLOCK       becomes eligible when the mission timer is <= CFG.pickups.time.eligibleAt (60 s); at <= urgentAt (30 s) the system is in a higher urgency state (shorter delays and
 *               cooldown, nearer / quicker-to-reach placement). Every clock grants ONE reward drawn (seeded) from CFG.pickups.time.rewards (+20 / +35 / +60 s by default).
 *   LOOP        collect -> remove -> budget/collected updated -> cooldown -> the conditions are re-evaluated every frame -> the next pickup may spawn. At most CFG.pickups.<kind>.maxActive
 *               pickups of a kind exist at once (default 1).
 *   PLACEMENT   chosen when the pickup is spawned (see validate()/findSpot()): inside the map, reachable by the vehicle (static flood fill from the start + a live A* path from the vehicle
 *               on the existing NavGrid), on dry / even ground (no water, lava, ice, broken decks, bridges, yards), clear of colliders (incl. the dynamic harbor containers), clear of the
 *               harbor crane slots + home pads, away from the vehicle, Nana, start, crates, extraction, other pickups and every known hazard (mines, barrels, pits, vents, magma pools, rocks,
 *               tornado, explosions / ground fire, player mines, turrets, enemies, guardians). When nothing valid is found nothing is spawned or consumed and a new try is scheduled later.
 *   DETERMINISM all randomness comes from WZ.RNG streams derived from the mission seed: one position stream per kind, and the reward of the n-th clock is a pure function of (seed, n).
 *   LIFECYCLE   WZ.Pickups.update(dt) is only called by the mission scene during the 'play' phase, with the fixed simulation step => nothing spawns or cools down while paused / in the
 *               briefing / after the mission ended. init() / dispose() are called once per mission by the mission scene; no timers, listeners or loops live outside update()/render().
 *   POOLING     the world objects (heart / clock + ring + beam + glow + label) are created lazily, reused for every spawn, and share their geometries and materials.
 * All numbers: CFG.pickups. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, PC = CFG.pickups, PL = PC.place;
  const d2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);
  const KIND = {
    heal: { id: 1, color: 0xFF4A6A, css: '#FF4A6A', rgb: [1, 0.35, 0.5], arrow: 'heal', label: 'hud.pk.heal', spawnText: 'hud.pk.spawnHeal' },
    time: { id: 2, color: 0x46D0FF, css: '#46D0FF', rgb: [0.3, 0.85, 1], arrow: 'time', label: 'hud.pk.time', spawnText: 'hud.pk.spawnTime' },
  };
  const ORDER = ['time', 'heal'];       // the timer is the more urgent system: it is evaluated first

  function heartGeo() {
    const s = new T.Shape();
    s.moveTo(0, -1.05); s.bezierCurveTo(-0.25, -0.8, -1.25, -0.2, -1.12, 0.52); s.bezierCurveTo(-1.0, 1.18, -0.2, 1.22, 0, 0.62);
    s.bezierCurveTo(0.2, 1.22, 1.0, 1.18, 1.12, 0.52); s.bezierCurveTo(1.25, -0.2, 0.25, -0.8, 0, -1.05);
    const g = new T.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.2, bevelSegments: 3, curveSegments: 12 });
    g.translate(0, 0, -0.275); return g;
  }

  /** clock model: gold rim, cream face, 12 ticks, two hands (returned for animation), alarm bells */
  function clockModel(geos, mats) {
    const g = new T.Group(), L = (o) => { const m = new T.MeshLambertMaterial(o); mats.push(m); return m; };
    const rimG = new T.TorusGeometry(1.12, 0.22, 10, 28), faceG = new T.CircleGeometry(1.12, 28), bellG = new T.SphereGeometry(0.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), tickG = new T.BoxGeometry(0.1, 0.24, 0.06), handG = new T.BoxGeometry(1, 1, 0.07), hubG = new T.SphereGeometry(0.13, 8, 6);
    geos.push(rimG, faceG, bellG, tickG, handG, hubG);
    const gold = L({ color: 0xFFC21A, emissive: 0x4a3200 }), cream = L({ color: 0xFFF6DC, emissive: 0x2a2a22 }), dark = L({ color: 0x1B1D1F }), red = L({ color: 0xE23A2A });
    g.add(new T.Mesh(rimG, gold)); const face = new T.Mesh(faceG, cream); face.position.z = -0.02; g.add(face);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, t = new T.Mesh(tickG, dark); t.position.set(Math.sin(a) * 0.88, Math.cos(a) * 0.88, 0.05); t.rotation.z = -a; if (i % 3 === 0) t.scale.set(1.6, 1.3, 1); g.add(t); }
    for (const s of [-1, 1]) { const b = new T.Mesh(bellG, red); b.position.set(0.82 * s, 1.0, 0); b.rotation.z = -0.62 * s; g.add(b); }
    const mk = (w, h) => { const p = new T.Group(); const m = new T.Mesh(handG, dark); m.scale.set(w, h, 1); m.position.y = h / 2 - 0.08; p.add(m); p.position.z = 0.08; g.add(p); return p; };
    const hour = mk(0.14, 0.62), minute = mk(0.1, 0.9); const hub = new T.Mesh(hubG, red); hub.position.z = 0.12; g.add(hub);
    return { g, hour, minute };
  }

  /** Reward table lookup. u in [0,1). Weights are relative; invalid rows are ignored. Pure function (unit-tested). */
  function pickReward(u, table) {
    const rows = (table || PC.time.rewards).filter((r) => r && r.s > 0 && r.w > 0);
    if (!rows.length) return 20;
    let tot = 0; for (const r of rows) tot += r.w;
    let x = Math.min(0.999999999, Math.max(0, u)) * tot;
    for (const r of rows) { if (x < r.w) return r.s; x -= r.w; }
    return rows[rows.length - 1].s;
  }

  const newKind = (type) => ({ type, K: KIND[type], max: Math.max(1, PC[type].maxActive | 0), total: 0, budget: 0, spawned: 0, collected: 0, active: 0, ordinal: 0, cd: 0, retryT: 0, armT: 0, fails: 0, attempts: 0, failedAttempts: 0, rng: null, lastWhy: '', pool: [] });

  const Pk = {
    ctx: null, on: false, ended: false, seed: 0, level: 0, S: { heal: newKind('heal'), time: newKind('time') }, list: [], geos: [], mats: [], texs: [], labels: null, assets: null,
    reach: null, note: 0, sparkT: 0, heartG: null, _lim: 0,

    // ================================================================== lifecycle
    init(ctx, mission, seed) {
      Pk.dispose(); Pk.ctx = ctx; Pk.seed = seed >>> 0; Pk.ended = false; Pk.note = 0; Pk.list = []; Pk.sparkT = 0;
      Pk.level = Math.max(0, Math.floor(PC.levelOf ? PC.levelOf(mission) : (mission && mission.index) || 0));      // displayed level == mission.index (1-based; see scenes/mission.js hud.level)
      Pk.S = { heal: newKind('heal'), time: newKind('time') };
      Pk.on = !!(PC.enabled && Pk.level > 0 && !(mission && mission.tutorial && !PC.inTutorial));
      for (const type of ORDER) {
        const S = Pk.S[type]; S.rng = WZ.RNG.create(WZ.RNG.hash(Pk.seed, KIND[type].id));
        S.total = S.budget = Pk.on ? Math.max(0, Math.floor(PC.budget(Pk.level))) : 0;
      }
      if (!Pk.on) return;
      const map = ctx.map, nav = map.nav && map.nav.jeep;
      Pk._lim = map.half - PL.edge;
      Pk.reach = nav ? nav.flood(map.start.x, map.start.z) : null;                       // static reachability from the start, computed ONCE
      Pk.log('init level ' + Pk.level + ' budget heal ' + Pk.S.heal.budget + ' time ' + Pk.S.time.budget);
    },

    dispose() {
      const c = Pk.ctx;
      if (c && c.scene) for (const type of ORDER) for (const o of Pk.S[type].pool) c.scene.remove(o.root);
      for (const g of Pk.geos) g.dispose(); for (const m of Pk.mats) m.dispose(); for (const t of Pk.texs) t.dispose();
      Pk.geos = []; Pk.mats = []; Pk.texs = []; Pk.labels = null; Pk.assets = null; Pk.list = []; Pk.ctx = null; Pk.heartG = null; Pk.reach = null; Pk.on = false; Pk.ended = true;
      Pk.S = { heal: newKind('heal'), time: newKind('time') };
    },

    /** the mission is over (win / fail): nothing spawns any more and the remaining pickups disappear */
    stop() {
      Pk.ended = true;
      for (let i = Pk.list.length - 1; i >= 0; i--) { const p = Pk.list[i]; p.on = false; p.root.visible = false; Pk.S[p.type].active--; }
      Pk.list.length = 0;
    },

    // ================================================================== state helpers
    /** read-only snapshot used by the HUD debug text and the tests */
    status() {
      const o = {};
      for (const type of ORDER) { const S = Pk.S[type]; o[type] = { total: S.total, budgetRemaining: S.budget, spawned: S.spawned, collected: S.collected, active: S.active, cooldown: Math.max(0, S.cd), retryIn: Math.max(0, S.retryT), failedAttempts: S.failedAttempts, lastFail: S.lastWhy }; }
      o.level = Pk.level; o.on = Pk.on; o.ended = Pk.ended; return o;
    },
    /** HUD snapshot (a single reused object - no allocation per frame): how many hearts / clocks of this level are still to be collected. left = total - collected, so a pickup
     *  that has been spawned but not picked up yet still counts as "left". live = one of that kind is lying in the world right now. */
    hud() {
      const o = Pk._hud || (Pk._hud = { on: false, healLeft: 0, healTotal: 0, healLive: false, timeLeft: 0, timeTotal: 0, timeLive: false }), h = Pk.S.heal, t = Pk.S.time;
      o.on = !!Pk.on; o.healTotal = h.total; o.healLeft = Math.max(0, h.total - h.collected); o.healLive = h.active > 0;
      o.timeTotal = t.total; o.timeLeft = Math.max(0, t.total - t.collected); o.timeLive = t.active > 0;
      return o;
    },
    debugLine() {
      if (!Pk.on) return 'pickups off';
      const h = Pk.S.heal, t = Pk.S.time;
      return 'pickups L' + Pk.level + '  heal ' + h.budget + '/' + h.total + ' got ' + h.collected + ' act ' + h.active + '  time ' + t.budget + '/' + t.total + ' got ' + t.collected + ' act ' + t.active;
    },
    log(msg) { if (PC.log || (WZ.Main && WZ.Main.params && WZ.Main.params.get && WZ.Main.params.get('pkdebug'))) console.log('[Pickups] ' + msg); },

    timeLeft() { const c = Pk.ctx; return c && c.timeLeft ? c.timeLeft() : Infinity; },
    urgent() { return Pk.timeLeft() <= PC.time.urgentAt; },

    /** is this kind allowed to spawn right now (budget, simultaneous limit and the gameplay condition)? */
    eligible(S) {
      const c = Pk.ctx, J = c.jeep;
      if (S.budget <= 0 || S.active >= S.max || !J.alive) return false;
      if (S.type === 'heal') return J.maxHp > 0 && J.hp < J.maxHp - 0.5 && J.hp <= J.maxHp * PC.heal.threshold + 1e-6;
      const tl = Pk.timeLeft(); return tl > 0 && tl <= PC.time.eligibleAt;
    },

    // ================================================================== spawn placement
    /** why a spot is not acceptable (null = acceptable). Cheapest tests first. */
    validate(x, z) {
      const c = Pk.ctx, map = c.map, J = c.jeep, N = c.nana, st = map.start, ex = map.extract, lim = Pk._lim;
      if (!(Math.abs(x) <= lim && Math.abs(z) <= lim)) return 'bounds';
      if (d2(x, z, J.x, J.z) < PL.minFromJeep * PL.minFromJeep) return 'jeep';
      if (N && d2(x, z, N.x, N.z) < PL.minFromNana * PL.minFromNana) return 'nana';
      if (st && d2(x, z, st.x, st.z) < PL.minFromStart * PL.minFromStart) return 'start';
      if (ex && d2(x, z, ex.x, ex.z) < (PL.minFromExtract + (ex.r || 0)) * (PL.minFromExtract + (ex.r || 0))) return 'extract';
      for (const cr of map.crates) if (d2(x, z, cr.x, cr.z) < PL.minFromCrate * PL.minFromCrate) return 'crate';
      for (const p of Pk.list) if (d2(x, z, p.x, p.z) < PL.minGap * PL.minGap) return 'pickup';
      const nav = map.nav && map.nav.jeep;
      if (nav && Pk.reach && !Pk.reach[nav.idx(x, z)]) return 'unreachable';
      if (map.noHazard && map.noHazard(x, z)) return 'terrain';                          // river / bridge / ice / lava edge / yards / sea edge
      const h0 = map.height(x, z); if (!isFinite(h0)) return 'ground';
      if (map.water && h0 < map.water.level + PL.waterMargin) return 'water';
      if (map.lava && map.lava.depth(x, z) > 0) return 'lava';
      if (map.navBlock && map.navBlock(x, z)) return 'navblock';
      if (!c.col.free(x, z, PL.clearance)) return 'collision';
      for (let k = 0; k < 8; k++) {                                                      // even, dry, walkable ground all around
        const a = k * 0.7854, rx = x + Math.cos(a) * PL.groundRing, rz = z + Math.sin(a) * PL.groundRing, h = map.height(rx, rz);
        if (!isFinite(h) || Math.abs(h - h0) > PL.maxHeightDelta) return 'slope';
        if (map.water && h < map.water.level + 0.1) return 'water';
        if (map.lava && map.lava.depth(rx, rz) > 0) return 'lava';
        if (map.navBlock && map.navBlock(rx, rz)) return 'navblock';
      }
      if (map.cranes) for (const cr of map.cranes) {                                     // harbor: never in / next to a crane lane slot or home pad (the crane logic itself is untouched)
        const s = cr.slot, m = PL.craneMargin;
        if (s && Math.abs(x - s.x) < s.hw + m && Math.abs(z - s.z) < s.hd + m) return 'crane';
        if (Math.abs(x - cr.hx) < cr.hhw + m && Math.abs(z - cr.hz) < cr.hhd + m) return 'crane';
      }
      return Pk.hazard(x, z);
    },

    /** dynamic gameplay hazards. Every system is optional (headless tests) and is only read, never changed. */
    hazard(x, z) {
      const Hz = WZ.Hazards, Vo = WZ.Volcano, Fi = WZ.Fire, Lm = WZ.Landmines, Tu = WZ.Turrets, Gi = WZ.Giants, E = WZ.Enemies;
      if (Hz) {
        for (const b of Hz.mines || []) if (b.on !== false && d2(x, z, b.x, b.z) < PL.avoidMine * PL.avoidMine) return 'mine';
        for (const b of Hz.barrels || []) if (b.on !== false && d2(x, z, b.x, b.z) < PL.avoidBarrel * PL.avoidBarrel) return 'barrel';
        const pr = (CFG.hazards.pits ? CFG.hazards.pits.radius : 6) + PL.avoidPit;
        for (const b of Hz.pits || []) if (d2(x, z, b.x, b.z) < pr * pr) return 'pit';
        const tn = Hz.torn; if (tn && tn.phase !== 'fade' && d2(x, z, tn.x, tn.z) < PL.avoidTornado * PL.avoidTornado) return 'tornado';
      }
      if (Vo && Vo.on) {
        const vr = CFG.volcano.vents.radius + PL.avoidVent;
        for (const v of Vo.vents || []) if (d2(x, z, v.x, v.z) < vr * vr) return 'vent';
        for (const p of Vo.pools || []) { const r = (p.r || 6) + PL.avoidPool; if (d2(x, z, p.x, p.z) < r * r) return 'pool'; }
        for (const r of Vo.rocks || []) if (r.on) { const rr = Math.max(PL.avoidRock, (r.R || 0) + 4); if (d2(x, z, r.x, r.z) < rr * rr) return 'rock'; }
      }
      if (Fi) {
        for (const b of Fi.blasts || []) if (b.on) { const r = Math.max(PL.avoidBlast, (b.R || 0) + 4); if (d2(x, z, b.x, b.z) < r * r) return 'explosion'; }
        for (const g of Fi.gfires || []) { const r = Math.max(PL.avoidBlast * 0.6, (g.r || 0) + 5); if (d2(x, z, g.x, g.z) < r * r) return 'fire'; }
      }
      if (Lm) for (const m of Lm.list || []) if (d2(x, z, m.x, m.z) < PL.avoidPlayerMine * PL.avoidPlayerMine) return 'playermine';
      if (Tu) for (const t of Tu.list || []) if (d2(x, z, t.x, t.z) < PL.avoidTurret * PL.avoidTurret) return 'turret';
      if (Gi) for (const g of Gi.list || []) if (g.active && !g.dead && d2(x, z, g.x, g.z) < PL.avoidGiant * PL.avoidGiant) return 'boss';
      if (E && E.hash && E.nearest && E.nearest(x, z, PL.avoidEnemy)) return 'enemy';
      return null;
    },

    /** Look for a valid spot for kind S. Returns { x, z, path } or null (diagnostics in S.lastWhy). Bounded work: PL.samples cheap tests, at most PL.pathChecks A* runs. */
    findSpot(S, urgent) {
      const c = Pk.ctx, map = c.map, J = c.jeep, rng = S.rng, nav = map.nav && map.nav.jeep, why = {};
      let pathMax = PL.maxPath;
      if (S.type === 'time') {              // a clock must be reachable in the time that is left (with a floor so there is always a nearby option)
        const reachLen = Math.max(PL.minReachPath, Pk.timeLeft() * ((J.P && J.P.topSpeed) || CFG.jeep.topSpeed) * PL.cruiseSpeed * PL.reachSafety);
        pathMax = Math.min(urgent ? PL.urgentMaxPath : PL.maxPath, reachLen);
      }
      const rMin = PL.minFromJeep + 4, rMax = Math.max(rMin + 12, pathMax), roads = map.roadPts;
      let checks = 0, found = null;
      for (let i = 0; i < PL.samples && !found; i++) {
        let x, z;
        if (roads && roads.length && rng.chance(0.5)) { const p = rng.pick(roads); x = p.x + rng.range(-9, 9); z = p.z + rng.range(-9, 9); }
        else { const a = rng.range(0, 6.2832), r = rMin + (rMax - rMin) * Math.sqrt(rng.next()); x = J.x + Math.cos(a) * r; z = J.z + Math.sin(a) * r; }
        const dj2 = d2(x, z, J.x, J.z); if (dj2 > pathMax * pathMax) { why.range = (why.range || 0) + 1; continue; }      // the path can never be shorter than the straight line
        const bad = Pk.validate(x, z);
        if (bad) { why[bad] = (why[bad] || 0) + 1; continue; }
        let plen = Math.sqrt(dj2);
        if (nav) {                                                                       // live reachability from the vehicle on the existing nav grid
          if (checks >= PL.pathChecks) { why.pathBudget = (why.pathBudget || 0) + 1; break; }
          checks++;
          const path = nav.path(J.x, J.z, x, z);
          if (!path) { why.nopath = (why.nopath || 0) + 1; continue; }
          plen = 0; let px = J.x, pz = J.z; for (const w of path) { plen += Math.hypot(w.x - px, w.z - pz); px = w.x; pz = w.z; }
          if (plen > pathMax) { why.far = (why.far || 0) + 1; continue; }
        }
        found = { x, z, path: plen };
      }
      S.lastWhy = found ? '' : JSON.stringify(why);
      return found;
    },

    // ================================================================== world objects (pooled)
    assetsFor(type) {
      if (!Pk.assets) {
        const ringG = new T.RingGeometry(2.0, 2.55, 40).rotateX(-Math.PI / 2), discG = new T.CircleGeometry(2.0, 32).rotateX(-Math.PI / 2);
        Pk.heartG = heartGeo(); Pk.geos.push(ringG, discG, Pk.heartG);
        Pk.assets = { ringG, discG, heartM: new T.MeshLambertMaterial({ color: 0xFF2E52, emissive: 0x80101f }) }; Pk.mats.push(Pk.assets.heartM);
      }
      const A = Pk.assets;
      if (!A[type]) {
        const K = KIND[type], tex = WZ.Assets.tex;
        const add = (col, op, extra) => new T.MeshBasicMaterial(Object.assign({ color: col, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }, extra || {}));
        const m = { ringM: add(K.color, 0.8), discM: add(K.color, 0.2), beamM: add(K.color, 0.55, { map: tex('beam') }), glowM: new T.SpriteMaterial({ map: tex('glow'), color: K.color, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.9 }) };
        Pk.mats.push(m.ringM, m.discM, m.beamM, m.glowM); A[type] = m;
      }
      return A;
    },

    /** small value label above the pickup ("+35s" / "+40%"): one cached sprite material per distinct text */
    labelMat(text, css) {
      if (!Pk.labels) Pk.labels = {};
      let m = Pk.labels[text];
      if (!m) {
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const g = cv.getContext('2d');
        g.fillStyle = 'rgba(12,14,18,0.78)'; g.strokeStyle = css; g.lineWidth = 7;
        if (g.beginPath) { g.beginPath(); if (g.roundRect) g.roundRect(8, 8, 240, 80, 30); else g.rect(8, 8, 240, 80); g.fill(); g.stroke(); }
        g.font = 'bold 54px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#FFFFFF'; g.fillText(text, 128, 52);
        const tex = new T.CanvasTexture(cv); Pk.texs.push(tex);
        m = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, fog: false }); Pk.mats.push(m); Pk.labels[text] = m;
      }
      return m;
    },

    makeObj(type) {
      const c = Pk.ctx, A = Pk.assetsFor(type), M = A[type], K = KIND[type], root = new T.Group(), G = WZ.Geo;
      const ring = new T.Mesh(A.ringG, M.ringM), disc = new T.Mesh(A.discG, M.discM); ring.position.y = disc.position.y = 0.35; root.add(ring, disc);
      const beam = new T.Mesh(G.beamPlane(), M.beamM); beam.scale.set(4.2, 46, 1); beam.position.y = 0.2; beam.frustumCulled = false; root.add(beam);
      const glow = new T.Sprite(M.glowM); glow.scale.set(8, 8, 1); glow.position.y = PC.hover; root.add(glow);
      let item, hour = null, minute = null;
      if (type === 'heal') { item = new T.Mesh(Pk.heartG, A.heartM); item.scale.setScalar(1.45); item.castShadow = true; }
      else { const cm = clockModel(Pk.geos, Pk.mats); item = cm.g; hour = cm.hour; minute = cm.minute; item.scale.setScalar(1.55); }
      item.position.y = PC.hover; root.add(item);
      const label = new T.Sprite(Pk.labelMat('+0', K.css)); label.scale.set(5.4, 2.0, 1); label.position.y = PC.hover + 3.7; label.renderOrder = 20; root.add(label);
      root.visible = false; c.scene.add(root);
      return { type, K, root, item, glow, beam, ring, hour, minute, label, on: false, x: 0, z: 0, gy: 0, ph: 0, t: 0, reward: 0, text: '' };
    },

    acquire(type) {
      const pool = Pk.S[type].pool;
      for (const o of pool) if (!o.on) return o;
      const o = Pk.makeObj(type); pool.push(o); return o;
    },

    /** place a pickup in the world and charge the budget (only called with a validated spot) */
    spawn(S, spot) {
      const c = Pk.ctx, map = c.map, o = Pk.acquire(S.type), ord = S.ordinal++;
      o.on = true; o.x = spot.x; o.z = spot.z; o.gy = map.height(spot.x, spot.z); o.t = 0; o.ph = ((ord * 0.6180339 + S.K.id * 0.37) % 1) * 6.2832;
      if (S.type === 'time') { o.reward = pickReward(WZ.RNG.create(WZ.RNG.hash(Pk.seed ^ 0x51ED, ord)).next()); o.text = '+' + o.reward + 's'; }
      else { o.reward = PC.heal.healPct; o.text = '+' + Math.round(PC.heal.healPct * 100) + '%'; }
      o.label.material = Pk.labelMat(o.text, S.K.css);
      o.root.position.set(o.x, o.gy, o.z); o.root.visible = true; o.item.position.y = PC.hover;
      Pk.list.push(o);
      S.budget--; S.spawned++; S.active++; S.fails = 0; S.retryT = 0;
      Pk.log(S.type + ' spawned #' + S.spawned + ' at ' + o.x.toFixed(0) + ',' + o.z.toFixed(0) + ' path ' + spot.path.toFixed(0) + 'u' + (S.type === 'time' ? ' reward +' + o.reward + 's timer ' + Pk.timeLeft().toFixed(0) : ' hp ' + Math.round(c.jeep.hp) + '/' + Math.round(c.jeep.maxHp)) + ' budget left ' + S.budget);
      if (WZ.Fx && WZ.Fx.text) WZ.Fx.text(WZ.I18n.t(S.K.spawnText, { n: o.text }), c.jeep.rx, c.jeep.ry + 8, c.jeep.rz, 'info');
      if (c.particles && c.particles.stars) c.particles.stars(o.x, o.gy + 2.5, o.z, 4);
    },

    // ================================================================== simulation (fixed step, 'play' phase only)
    update(dt) {
      const c = Pk.ctx; if (!c || !Pk.on || Pk.ended) return;
      if (Pk.note > 0) Pk.note -= dt;
      Pk.collect();
      if (Pk.ended) return;
      const urgent = Pk.urgent();
      for (const type of ORDER) Pk.schedule(Pk.S[type], dt, type === 'time' && urgent);
    },

    schedule(S, dt, urgent) {
      if (S.cd > 0) S.cd -= dt * (urgent ? 1 / PC.time.urgentCooldownMul : 1);
      if (S.retryT > 0) S.retryT -= dt;
      if (!Pk.eligible(S)) { S.armT = 0; return; }
      S.armT += dt;
      const delay = S.type === 'time' ? (urgent ? PC.time.urgentStartDelay : PC.time.startDelay) : PC.heal.startDelay;
      if (S.armT < delay || S.cd > 0 || S.retryT > 0) return;
      S.attempts++;
      const spot = Pk.findSpot(S, urgent);
      if (spot) { Pk.spawn(S, spot); return; }
      S.fails++; S.failedAttempts++;                                                     // nothing was created, nothing was charged
      const R = PC.retry; S.retryT = Math.min(R.maxDelay, (urgent ? R.urgentDelay : R.delay) * Math.pow(R.backoff, Math.min(S.fails - 1, 6)));
      Pk.log(S.type + ' spawn failed (#' + S.fails + ') ' + S.lastWhy + ' - retry in ' + S.retryT.toFixed(1) + 's, budget kept ' + S.budget);
    },

    collect() {
      const c = Pk.ctx, J = c.jeep; if (!J.alive || !Pk.list.length) return;
      const rr = (PC.radius + J.P.radius + 0.6) * (PC.radius + J.P.radius + 0.6);
      for (let i = Pk.list.length - 1; i >= 0; i--) {
        const p = Pk.list[i];
        if (d2(p.x, p.z, J.x, J.z) > rr) continue;
        const S = Pk.S[p.type];
        if (p.type === 'heal') {
          if (J.hp >= J.maxHp - 0.5) { if (Pk.note <= 0) { Pk.note = 1.4; WZ.Fx.text(WZ.I18n.t('hud.healfull'), J.rx, J.ry + 5, J.rz, 'warn'); } continue; }      // not used up while the armor is full
          const n = Math.max(1, Math.round(J.maxHp * PC.heal.healPct)), before = J.hp; J.heal(n);
          const got = Math.max(1, Math.round(J.hp - before));
          WZ.Fx.text(WZ.I18n.t('hud.healup', { n: got }), J.rx, J.ry + 6, J.rz, 'good');
          c.particles.sparks(J.x, J.ry + 2.4, J.z, 22, 1, 0.45, 0.6); WZ.Audio.sfx('pickup');
          WZ.Events.emit('pickup:collect', { type: 'heal', amount: got });
        } else {
          const s = p.reward; if (c.addTime) c.addTime(s);
          WZ.Fx.text(WZ.I18n.t('hud.timeup', { s }), J.rx, J.ry + 6, J.rz, 'good');
          c.particles.sparks(J.x, J.ry + 2.4, J.z, 22, 0.35, 0.85, 1); WZ.Audio.sfx('clock'); if (WZ.UI && WZ.UI.pulseTimer) WZ.UI.pulseTimer();
          WZ.Events.emit('pickup:collect', { type: 'time', amount: s });
        }
        // remove -> update the counters -> start the cooldown (the conditions are re-evaluated by schedule() from the next frame on)
        p.on = false; p.root.visible = false; Pk.list[i] = Pk.list[Pk.list.length - 1]; Pk.list.pop();
        S.active--; S.collected++; S.cd = PC[p.type].cooldown; S.retryT = 0; S.fails = 0;
        Pk.log(p.type + ' collected (' + S.collected + '/' + S.total + ') budget left ' + S.budget + ' cooldown ' + S.cd + 's');
        WZ.Fx.flash('good'); c.particles.stars(p.x, p.gy + 2.5, p.z, 6);
      }
    },

    /** arrow targets for the HUD: every active pickup within CFG.pickups.arrowRange (they are few and may be far away) */
    arrows(px, pz, out) {
      out.length = 0;
      const R = PC.arrowRange * PC.arrowRange;
      for (const p of Pk.list) { if (p.on && d2(p.x, p.z, px, pz) < R) out.push(p); }
      return out;
    },

    render(dt, tm) {
      const c = Pk.ctx; if (!c || !Pk.list.length) return; const cam = WZ.Cam.cam, P = c.particles;
      Pk.sparkT -= dt; const spark = Pk.sparkT <= 0; if (spark) Pk.sparkT = 0.12;
      for (const p of Pk.list) {
        if (!p.on) continue;
        p.t += dt; const bob = Math.sin(tm * 2.4 + p.ph) * PC.bob, pulse = 1 + Math.sin(tm * 5 + p.ph) * 0.08;
        p.item.position.y = PC.hover + bob; p.glow.position.y = PC.hover + bob; p.glow.scale.setScalar(8 * pulse);
        p.beam.rotation.y = Math.atan2(cam.position.x - p.x, cam.position.z - p.z); p.beam.scale.x = 4.2 * (1 + Math.sin(tm * 3 + p.ph) * 0.1);
        p.ring.scale.setScalar(1 + 0.06 * Math.sin(tm * 4 + p.ph));
        if (p.type === 'heal') { p.item.rotation.y = tm * 2.2 + p.ph; p.item.scale.setScalar(1.45 * (1 + 0.06 * Math.max(0, Math.sin(tm * 6)))); }
        else {
          p.item.rotation.set(-0.55, WZ.Cam.yaw + Math.PI + Math.sin(tm * 1.6 + p.ph) * 0.45, 0, 'YXZ');
          p.minute.rotation.z = -tm * 3.2; p.hour.rotation.z = -tm * 3.2 / 12;
        }
        if (spark) { const k = p.K.rgb; P.emit(1, p.x + (Math.random() - 0.5) * 3, p.gy + 0.6, p.z + (Math.random() - 0.5) * 3, 0, 2.4 + Math.random() * 1.4, 0, 1.1, 0.55, 0.1, k[0], k[1], k[2], 0.9, 0, 0, 0.6); }
      }
    },
  };
  Pk.pickReward = pickReward;
  WZ.Pickups = Pk;
})(window.WZ = window.WZ || {});
