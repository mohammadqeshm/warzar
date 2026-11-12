/* WZ.Volca — procedural art for the VOLCANIC WASTELAND map (used by WZ.WorldView when map.theme === 'volcanic'):
 * black-ash ground splat (glowing cracks, scorched lava banks, ash trails), merged scenery (charred trees, basalt boulders, obsidian spires, fumaroles,
 * basalt causeways), the animated LAVA rivers + rising embers + falling ash, a smouldering red sky, ash clouds, dark ridges with a huge erupting volcano
 * (its crater glows brighter during an eruption warning: WZ.Volcano.alert) and black basalt border cliffs. */
(function (WZ) {
  'use strict';
  const T = THREE, G = WZ.Geo, R = WZ.RNG, U = WZ.U, rb = G.rbox, CFG = WZ.CFG;
  const B = () => new G.Builder();
  const pick = (rng, arr) => arr[(rng.next() * arr.length) | 0];
  const ROCKS = [0x2E2A2A, 0x3A3434, 0x252121, 0x433A38], CRACK = 0xFF6B1F, OBS = [0x1B1A24, 0x22212E, 0x2C2B3A];

  // ------------------------------------------------------------------ ground splat
  function paintGround(map, SPLAT, SPAN, hexA) {
    const c = document.createElement('canvas'); c.width = c.height = SPLAT;
    const g = c.getContext('2d'), rng = R.mulberry32((map.seed ^ 0x5EED22) >>> 0), k = SPLAT / SPAN, px = (x) => (x + SPAN / 2) * k, pz = (z) => (z + SPAN / 2) * k;
    g.fillStyle = '#3B312D'; g.fillRect(0, 0, SPLAT, SPLAT);
    const cols = ['#4A3D37', '#2E2623', '#5C4B42', '#3A2F2B', '#6B574B', '#2A2220', '#4F3F36'];
    for (let i = 0; i < 190; i++) {
      const x = rng() * SPLAT, y = rng() * SPLAT, r = 28 + rng() * 96, col = cols[(rng() * cols.length) | 0], gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, hexA(col, 0.62)); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 46; i++) {      // pale ash drifts
      const x = rng() * SPLAT, y = rng() * SPLAT, r = 30 + rng() * 70, gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(130,118,108,.22)'); gr.addColorStop(1, 'rgba(130,118,108,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // lava banks: scorched rock, red heat zone, glowing rim, dark crust (the lava itself is a mesh)
    const lv = map.lava;
    const stroke = (wMul, add, col, a) => {
      g.fillStyle = hexA(col, a);
      for (const r of lv.rivers) for (let s = -SPAN / 2; s <= SPAN / 2; s += 1.5) { const p = r.pos(s), rr = (r.w(s) * wMul + add) * k; g.beginPath(); g.arc(px(p[0]), pz(p[1]), rr, 0, 6.3); g.fill(); }
    };
    stroke(2.6, 10, '#150E0D', 0.4); stroke(1.9, 5, '#4A2418', 0.5); stroke(1.5, 3.2, '#D2561C', 0.55); stroke(1.2, 1.6, '#7A2A12', 0.8); stroke(1.04, 0.8, '#2A1410', 0.95);
    // ash-grey clearings around the camps
    for (const cl of map.clusters) {
      const r = cl.r * 1.15 * k, x = px(cl.x), y = pz(cl.z), gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(112,98,88,.7)'); gr.addColorStop(0.7, 'rgba(112,98,88,.4)'); gr.addColorStop(1, 'rgba(112,98,88,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // glowing cracks
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const pts of map.cracks) {
      for (const [w, col] of [[3.0, 'rgba(255,80,20,.16)'], [1.3, 'rgba(255,105,30,.5)'], [0.5, 'rgba(255,205,100,.85)']]) {
        g.strokeStyle = col; g.lineWidth = w * k; g.beginPath(); g.moveTo(px(pts[0].x), pz(pts[0].z)); for (let i = 1; i < pts.length; i++) g.lineTo(px(pts[i].x), pz(pts[i].z)); g.stroke();
      }
    }
    // ash trails
    const road = (w, col, a) => { g.strokeStyle = hexA(col, a); g.lineWidth = w * k; for (const r of map.roads) { g.beginPath(); g.moveTo(px(r.a.x), pz(r.a.z)); g.quadraticCurveTo(px(r.c.x), pz(r.c.z), px(r.b.x), pz(r.b.z)); g.stroke(); } };
    road(10, '#120D0C', 0.38); road(7.4, '#6A5A50', 0.95); road(4.0, '#8A7A6C', 0.5);
    g.fillStyle = 'rgba(30,20,16,.34)'; for (const p of map.roadPts) for (let i = 0; i < 3; i++) g.fillRect(px(p.x + (rng() - 0.5) * 6), pz(p.z + (rng() - 0.5) * 6), 1.6, 5);
    // start pad + extraction marking
    const s = map.start; g.fillStyle = 'rgba(50,38,32,.7)'; g.fillRect(px(s.x - 13), pz(s.z - 9), 26 * k, 18 * k);
    g.setLineDash([14, 10]); g.strokeStyle = 'rgba(236,233,225,.55)'; g.lineWidth = 3; g.strokeRect(px(s.x - 12), pz(s.z - 8), 24 * k, 16 * k);
    if (map.extract) { g.beginPath(); g.arc(px(map.extract.x), pz(map.extract.z), map.extract.r * k, 0, 7); g.fillStyle = 'rgba(90,150,70,.24)'; g.fill(); g.strokeStyle = 'rgba(236,233,225,.5)'; g.lineWidth = 4; g.stroke(); }
    g.setLineDash([]);
    // soot under fires / contact shadows
    for (const f of map.fires) { const x = px(f.x), y = pz(f.z), r = 8 * k, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(8,5,4,.85)'); gr.addColorStop(1, 'rgba(8,5,4,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    const blob = (x, z, r, a) => { const X = px(x), Y = pz(z), rr = r * k, gr = g.createRadialGradient(X, Y, 0, X, Y, rr); gr.addColorStop(0, 'rgba(8,5,4,' + a + ')'); gr.addColorStop(1, 'rgba(8,5,4,0)'); g.fillStyle = gr; g.fillRect(X - rr, Y - rr, rr * 2, rr * 2); };
    for (const r of map.rocks) blob(r.x + r.r * 0.4, r.z + r.r * 0.4, r.r * 1.6, 0.55);
    for (const t of map.dead) blob(t.x + 1.2 * t.s, t.z + 1.0 * t.s, 2.4 * t.s, 0.4);
    for (const t of map.spires) blob(t.x + 1.6 * t.s, t.z + 1.4 * t.s, 3.2 * t.s, 0.5);
    for (const t of map.tents) blob(t.x + 1, t.z + 1, 5, 0.5);
    for (const t of map.steams) { const x = px(t.x), y = pz(t.z), r = 5 * k, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,110,30,.5)'); gr.addColorStop(1, 'rgba(255,110,30,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    // speckles: soot, ash, a few embers
    for (let i = 0; i < 26000; i++) { const r = rng(); g.fillStyle = r < 0.45 ? 'rgba(10,6,5,.28)' : r < 0.93 ? 'rgba(150,134,122,.16)' : 'rgba(255,125,45,.55)'; g.fillRect(rng() * SPLAT, rng() * SPLAT, 1 + rng() * 1.5, 1 + rng() * 1.5); }
    const t = new T.CanvasTexture(c); t.anisotropy = 8; return t;
  }

  // ------------------------------------------------------------------ scenery pieces (merged into per-chunk builders)
  function deadTree(b, o, rng) {
    const s = o.s, h = 4.4 * s, lean = rng.range(-0.5, 0.5) * s, la = rng.range(0, 6.28), lx = Math.cos(la) * lean, lz = Math.sin(la) * lean;
    let px = o.x, py = o.gy - 0.2, pz = o.z;
    for (let i = 1; i <= 3; i++) { const t = i / 3, nx = o.x + lx * t * t, ny = o.gy - 0.2 + h * t, nz = o.z + lz * t * t, w = 0.46 * s * (1.1 - t * 0.6); b.beam(px, py, pz, nx, ny, nz, w, w, i % 2 ? 0x2A211D : 0x211A17); px = nx; py = ny; pz = nz; }
    const n = rng.int(3, 5);
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283 + o.rot, l = rng.range(1.5, 2.6) * s, y0 = o.gy + h * rng.range(0.45, 0.9);
      const bx = px - (px - o.x) * 0.15 + Math.cos(a) * l, bz = pz - (pz - o.z) * 0.15 + Math.sin(a) * l, by = y0 + rng.range(0.4, 1.3) * s;
      b.beam(o.x + lx * 0.6, y0, o.z + lz * 0.6, bx, by, bz, 0.2 * s, 0.2 * s, 0x1E1715);
      if (rng.chance(0.18)) b.add(G.sph(5, 4), { x: bx, y: by, z: bz, sx: 0.2, sy: 0.2, sz: 0.2, color: 0xFF8A2A });       // an ember glowing at a branch tip
    }
  }
  function spire(b, o, rng) {
    const s = o.s;
    b.add(G.cone(6), { x: o.x, y: o.gy + 4.2 * s, z: o.z, ry: o.rot, sx: 1.7 * s, sy: 9.2 * s, sz: 1.7 * s, color: OBS[0] });
    b.add(G.cone(5), { x: o.x + 1.2 * s, y: o.gy + 2.4 * s, z: o.z + 0.4 * s, rz: -0.22, sx: 0.95 * s, sy: 5.2 * s, sz: 0.95 * s, color: OBS[1] });
    b.add(G.cone(5), { x: o.x - 1.0 * s, y: o.gy + 1.8 * s, z: o.z - 0.7 * s, rz: 0.26, rx: 0.2, sx: 0.8 * s, sy: 4.0 * s, sz: 0.8 * s, color: OBS[2] });
    b.add(G.ico(), { x: o.x, y: o.gy + 0.2, z: o.z, sx: 2.2 * s, sy: 0.7 * s, sz: 2.2 * s, ry: o.rot, color: 0x2A2420 });
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + o.rot; b.add(G.box1, { x: o.x + Math.cos(a) * 1.55 * s, y: o.gy + 0.28, z: o.z + Math.sin(a) * 1.55 * s, ry: -a, sx: 0.12, sy: 0.1, sz: 0.9 * s, color: CRACK }); }   // glowing seams at the base
  }
  function rock(b, r, rng) {
    const n = r.r > 2.8 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, 6.28), d = i === 0 ? 0 : r.r * 0.6, rr = r.r * (i === 0 ? 1 : rng.range(0.5, 0.7));
      b.add(G.ico(), { x: r.x + Math.cos(a) * d, y: r.gy + rr * 0.35, z: r.z + Math.sin(a) * d, rx: rng.range(-0.4, 0.4), ry: rng.range(0, 6), rz: rng.range(-0.4, 0.4), sx: rr * 1.15, sy: rr * 0.9, sz: rr, color: pick(rng, ROCKS) });
    }
    if (rng.chance(0.55)) for (let i = 0; i < 2; i++) { const a = rng.range(0, 6.28); b.add(G.box1, { x: r.x + Math.cos(a) * r.r * 0.55, y: r.gy + r.r * 0.78, z: r.z + Math.sin(a) * r.r * 0.55, ry: a, sx: 0.16, sy: 0.1, sz: r.r * 0.8, color: CRACK }); }
  }
  function steam(b, o) {
    b.add(G.cone(9), { x: o.x, y: o.gy + 0.45, z: o.z, sx: 1.8, sy: 1.1, sz: 1.8, color: 0x3A302C });
    b.add(G.cyl(9), { x: o.x, y: o.gy + 0.98, z: o.z, sx: 0.62, sy: 0.12, sz: 0.62, color: 0xFF8A2A });
  }
  function withBase(b, x, y, z, ry, fn) { b.base = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), new T.Vector3(1, 1, 1)); fn(); b.base = null; }
  function bridge(b, bg, h) {
    const L = 19, Wd = 7.8, y = h(bg.x, bg.z) + 0.07;
    withBase(b, bg.x, y, bg.z, bg.th, () => {
      for (let i = 0; i < 20; i++) b.add(G.box1, { z: -L / 2 + (i + 0.5) * L / 20, y: 0.0, sx: Wd, sy: 0.16, sz: L / 20 - 0.06, color: i % 2 ? 0x4A403B : 0x3C3431 });
      for (const s of [1, -1]) {
        b.add(G.box1, { x: s * (Wd / 2 + 0.1), y: -0.12, sx: 0.55, sy: 0.4, sz: L + 0.6, color: 0x241E1C });
        b.add(G.box1, { x: s * (Wd / 2 + 0.1), y: 0.12, sx: 0.12, sy: 0.08, sz: L, color: 0xFF7A22 });                       // glowing edge line
        for (let i = 0; i <= 4; i++) { const z = -L / 2 + i * L / 4; b.add(G.rbox(0.6, 1.1, 0.6, 0.12), { x: s * (Wd / 2 + 0.1), y: 0.5, z, color: 0x2C2624 }); b.add(G.cone(4), { x: s * (Wd / 2 + 0.1), y: 1.3, z, sx: 0.3, sy: 0.6, sz: 0.3, color: OBS[1] }); }
        b.add(G.cyl(6), { x: s * (Wd / 2 + 0.1), y: 1.65, z: -L / 2, sx: 0.28, sy: 0.35, sz: 0.28, color: 0xFFB400 }); b.add(G.cyl(6), { x: s * (Wd / 2 + 0.1), y: 1.65, z: L / 2, sx: 0.28, sy: 0.35, sz: 0.28, color: 0xFFB400 });
      }
    });
  }

  // ------------------------------------------------------------------ lava rivers
  function lavaTex(seed, glow) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'), rnd = R.mulberry32(seed);
    if (glow) { x.fillStyle = 'rgb(0,0,0)'; x.fillRect(0, 0, 256, 128); }
    else {
      const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#B02A0A'); gr.addColorStop(0.5, '#E2561A'); gr.addColorStop(1, '#B02A0A'); x.fillStyle = gr; x.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 46; i++) {     // dark crust plates
        const px = rnd() * 256, py = rnd() * 128, w = 14 + rnd() * 34, h = 6 + rnd() * 14;
        for (const ox of [-256, 0, 256]) { x.fillStyle = 'rgba(60,18,8,' + (0.35 + rnd() * 0.3) + ')'; x.beginPath(); x.ellipse(px + ox, py, w, h, rnd() * 3, 0, 6.3); x.fill(); }
      }
    }
    for (let i = 0; i < (glow ? 70 : 90); i++) {     // bright veins
      const px = rnd() * 256, py = rnd() * 128, w = 10 + rnd() * 44, a = glow ? 0.5 + rnd() * 0.5 : 0.25 + rnd() * 0.45;
      x.strokeStyle = glow ? 'rgba(255,225,120,' + a + ')' : 'rgba(255,' + (150 + (rnd() * 80 | 0)) + ',40,' + a + ')'; x.lineWidth = 1 + rnd() * 2.6;
      for (const ox of [-256, 0, 256]) { x.beginPath(); x.moveTo(px + ox, py); x.quadraticCurveTo(px + ox + w / 2, py + (rnd() - 0.5) * 10, px + ox + w, py + (rnd() - 0.5) * 6); x.stroke(); }
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  function lavaMesh(map, group) {
    const lv = map.lava.level, cols = 5, st = 3, X0 = -map.half - 30, X1 = map.half + 30, n = Math.ceil((X1 - X0) / st);
    const pos = [], col = [], uv = [], idx = [], cc = new T.Color();
    for (const r of map.lava.rivers) {
      const base = pos.length / 3;
      for (let i = 0; i <= n; i++) {
        const s = X0 + i * st, p = r.pos(s), t = r.tan(s), nx = -t[1], nz = t[0], hw = r.w(s) * 1.15;
        for (let j = 0; j < cols; j++) {
          const f = j / (cols - 1) * 2 - 1;
          pos.push(p[0] + nx * hw * f, lv, p[1] + nz * hw * f);
          cc.set(Math.abs(f) > 0.6 ? 0xFFC060 : 0xFF8A3A); col.push(cc.r, cc.g, cc.b); uv.push(s / 16, f * 0.5 + 0.5);
        }
      }
      for (let i = 0; i < n; i++) for (let j = 0; j < cols - 1; j++) { const a = base + i * cols + j, b2 = a + 1, c2 = a + cols, d = c2 + 1; idx.push(a, c2, b2, b2, c2, d); }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const t1 = lavaTex(17, false), t2 = lavaTex(41, true); t2.repeat.set(0.6, 1.3);
    const m1 = new T.MeshBasicMaterial({ map: t1, vertexColors: true, depthWrite: false, side: T.DoubleSide, fog: false }), m2 = new T.MeshBasicMaterial({ map: t2, color: 0xFFD070, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide });
    const w1 = new T.Mesh(geo, m1), w2 = new T.Mesh(geo, m2); w1.renderOrder = 1; w2.renderOrder = 2; w2.position.y = 0.05; w1.frustumCulled = w2.frustumCulled = false; group.add(w1, w2);
    return { geo, mats: [m1, m2], texs: [t1, t2], update(t) { t1.offset.x = -t * 0.035; t2.offset.x = -t * 0.09 + 0.3; t2.offset.y = Math.sin(t * 0.8) * 0.05; m2.opacity = 0.5 + 0.12 * Math.sin(t * 1.7); } };
  }

  // ------------------------------------------------------------------ sky / clouds / mountains / cliffs
  function skyDome() {
    const g = new T.SphereGeometry(900, 24, 14), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const stops = [[-1, '#7A3A22'], [0, '#B8562C'], [0.06, '#C86A34'], [0.3, '#7E3A34'], [0.65, '#3A2434'], [1, '#1A1426']], cc = new T.Color(), c2 = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) / 900; let j = 0; while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
      const a = stops[j], b = stops[j + 1], u = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0]))); cc.set(a[1]); c2.set(b[1]); cc.lerp(c2, u); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })); m.renderOrder = -10; m.frustumCulled = false; return m;
  }
  function clouds(rng) {
    const b = B();
    for (let i = 0; i < 20; i++) {
      const a = rng.range(0, 6.28), r = rng.range(380, 760), y = rng.range(150, 250), cx = Math.cos(a) * r, cz = Math.sin(a) * r, k = rng.range(0.9, 1.6), n = rng.int(4, 6);
      for (let j = 0; j < n; j++) { const s = rng.range(28, 52) * k; b.add(G.sph(8, 6), { x: cx + (j - n / 2) * 38 * k + rng.range(-8, 8), y: y + rng.range(-5, 8), z: cz + rng.range(-20, 20), sx: s * 1.3, sy: s * 0.7, sz: s, color: j % 2 ? 0x4A3A38 : 0x5E4A44 }); }
      b.add(G.box1, { x: cx, y: y - 16 * k, z: cz, sx: n * 38 * k, sy: 6, sz: 40 * k, color: 0xA8502C });         // lava-lit underside
    }
    const m = new T.Mesh(b.build(), new T.MeshBasicMaterial({ vertexColors: true, fog: false })); m.frustumCulled = false; return m;
  }
  const VOLC = { vh: 280, vr: 600 };
  function mountains(rng) {
    const b = B();
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2 + rng.range(-0.04, 0.04), r = (ring ? 730 : 580) + rng.range(-30, 60), h = rng.range(60, 140) * (ring ? 1.2 : 1), w = rng.range(160, 280), x = Math.cos(a) * r, z = Math.sin(a) * r;
      b.add(G.cone(7), { x, y: h / 2 - 14, z, ry: rng.range(0, 3), sx: w, sy: h, sz: w * rng.range(0.7, 1), color: ring ? 0x5A4440 : 0x382826 });
      b.add(G.cone(7), { x: x + rng.range(-30, 30), y: h * 0.3 - 14, z: z + rng.range(-30, 30), ry: rng.range(0, 3), sx: w * 0.85, sy: h * 0.6, sz: w * 0.85, color: ring ? 0x654C46 : 0x432F2C });
      if (rng.chance(0.5)) b.add(G.box1, { x, y: h * 0.45 - 14, z, ry: -a, rx: 0.3, sx: 5, sy: h * 0.8, sz: 3, color: 0xFF6A1A });      // glowing lava streak
    }
    for (let i = 0; i < 36; i++) { const a = rng.range(0, 6.28), r = rng.range(430, 540); b.add(G.cone(6), { x: Math.cos(a) * r, y: 10, z: Math.sin(a) * r, sx: rng.range(70, 130), sy: rng.range(26, 46), sz: rng.range(70, 130), color: 0x2A1E1C }); }
    // the volcano: huge dark cone, glowing crater, lava streaks (the smoke column + glow are animated in addScenery)
    const va = rng.range(0, 6.28), vx = Math.cos(va) * VOLC.vr, vz = Math.sin(va) * VOLC.vr, vh = VOLC.vh;
    b.add(G.cone(14), { x: vx, y: vh / 2 - 14, z: vz, sx: 440, sy: vh, sz: 440, color: 0x3A2A27 });
    b.add(G.cone(14), { x: vx, y: vh * 0.82 - 14, z: vz, sx: 170, sy: vh * 0.36, sz: 170, color: 0x2C201E });
    b.add(G.cyl(14), { x: vx, y: vh - 12, z: vz, sx: 60, sy: 8, sz: 60, color: 0xFF6A1A });
    for (let i = 0; i < 7; i++) { const aa = i / 7 * 6.28 + 0.4; b.add(G.box1, { x: vx + Math.cos(aa) * 70, y: vh - 60, z: vz + Math.sin(aa) * 70, ry: -aa, rx: 0.35, sx: 8, sy: 90, sz: 4, color: 0xFF7A22 }); }
    const m = new T.Mesh(b.build(), new T.MeshBasicMaterial({ vertexColors: true, fog: false })); m.frustumCulled = false; m.userData.crater = { x: vx, y: vh - 4, z: vz }; return m;
  }
  function cliffs(set, half, rng) {
    for (const sd of [[0, -1], [0, 1], [-1, 0], [1, 0]]) for (let t = -half - 20; t <= half + 20; t += 8.5) for (let layer = 0; layer < 2; layer++) {
      const out = half + 4 + layer * 9 + rng.range(0, 5), px = sd[0] === 0 ? t + rng.range(-2, 2) : sd[0] * out, pz = sd[1] === 0 ? t + rng.range(-2, 2) : sd[1] * out;
      const H = rng.range(10, 26) + layer * 6, w = rng.range(10, 15), d = rng.range(9, 14), sh = rng.range(0.7, 1);
      set.stone.add(G.box1, { x: px, y: H / 2 - 5, z: pz, ry: rng.range(-0.4, 0.4), rx: rng.range(-0.05, 0.05), rz: rng.range(-0.05, 0.05), sx: w, sy: H, sz: d, color: WZ.Props.hexShade(sh * 0.4), uv: [w / 10, H / 12] });
      set.plain.add(G.box1, { x: px, y: H - 5 + 0.2, z: pz, ry: rng.range(-0.4, 0.4), sx: w * 0.96, sy: 1.1, sz: d * 0.96, color: 0x2A201E });
      if (layer === 0 && rng.chance(0.5)) set.plain.add(G.box1, { x: px, y: 0.6, z: pz + (sd[1] === 0 ? 0 : -sd[1] * (d / 2 + 0.2)), sx: sd[0] === 0 ? w * 0.8 : 0.3, sy: 0.14, sz: sd[0] === 0 ? 0.3 : d * 0.8, color: CRACK });   // glowing seam at the cliff foot
      if (rng.chance(0.5)) set.plain.add(G.cone(5), { x: px + rng.range(-3, 3), y: H - 3, z: pz + rng.range(-3, 3), sx: 2.0, sy: 6.5, sz: 2.0, color: OBS[1] });
    }
  }

  // ------------------------------------------------------------------ everything static + animated, called by WorldView.build
  function addScenery(map, group, scene, q) {
    const rng = R.create((map.seed ^ 0x77B2) | 0), half = map.half, CH = CFG.world.chunk, nC = Math.ceil(map.size / CH), chunks = [];
    for (let i = 0; i < nC * nC; i++) chunks.push(B());
    const at = (x, z) => chunks[Math.max(0, Math.min(nC - 1, Math.floor((z + half) / CH))) * nC + Math.max(0, Math.min(nC - 1, Math.floor((x + half) / CH)))];
    for (const o of map.dead) deadTree(at(o.x, o.z), o, rng);
    for (const o of map.spires) spire(at(o.x, o.z), o, rng);
    for (const o of map.rocks) rock(at(o.x, o.z), o, rng);
    for (const o of map.steams) steam(at(o.x, o.z), o);
    for (const o of map.bridges) bridge(at(o.x, o.z), o, map.height);
    const mat = new T.MeshLambertMaterial({ vertexColors: true }), meshes = [];
    for (const b of chunks) if (!b.empty) { const m = new T.Mesh(b.build(), mat); m.castShadow = false; group.add(m); meshes.push(m); }
    const set = WZ.Props.newSet();
    for (const t of map.tents) WZ.Props.camp(set, t.x, t.z, map.height(t.x, t.z));
    for (const f of map.flags) WZ.Props.flagPole(set, f.x, f.z, map.height(f.x, f.z));
    WZ.Props.setMeshes(set, group);
    const lava = lavaMesh(map, group);
    const steamT = map.steams.map(() => Math.random());
    // crater glow + eruption plume (far away, additive sprites; they follow the camera like the mountain ring)
    const glowMat = new T.SpriteMaterial({ map: WZ.Assets.tex('glow'), color: 0xFF7A2A, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.6 });
    const cGlow = new T.Sprite(glowMat); cGlow.renderOrder = -8; cGlow.frustumCulled = false; scene.add(cGlow);
    const plumeMat = new T.MeshBasicMaterial({ color: 0xFF7A22, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide });
    const plumeG = new T.ConeGeometry(1, 1, 12, 1, true); plumeG.translate(0, 0.5, 0);
    const plume = new T.Mesh(plumeG, plumeMat); plume.renderOrder = -7; plume.frustumCulled = false; plume.visible = false; scene.add(plume);
    let emT = 0, ashT = 0, view = null;
    return {
      lava, mat, bindMountains(m) { view = m; },
      update(t, dt, cam, alert) {
        lava.update(t);
        alert = alert || 0;
        if (view && view.userData.crater) {
          const c = view.userData.crater, pul = 1 + 0.08 * Math.sin(t * 2.1) + 0.05 * Math.sin(t * 5.3);
          cGlow.position.set(cam.position.x + c.x, c.y + 6, cam.position.z + c.z); cGlow.scale.setScalar((230 + alert * 260) * pul); glowMat.opacity = 0.5 + alert * 0.5;
          plume.visible = alert > 0.02; if (plume.visible) { plume.position.set(cam.position.x + c.x, c.y, cam.position.z + c.z); const hh = 120 + 260 * alert; plume.scale.set(34 + alert * 34 + Math.sin(t * 9) * 3, hh, 34 + alert * 34); plumeMat.opacity = 0.55 * alert * (0.85 + 0.15 * Math.sin(t * 17)); }
        }
        const Pt = WZ.Particles; if (!Pt || !Pt.ready) return;
        const qp = CFG.quality.particles[Math.max(0, WZ.Quality ? WZ.Quality.level : 2)] || 1;
        for (let i = 0; i < map.steams.length; i++) {
          const s = map.steams[i], dx = s.x - cam.position.x, dz = s.z - cam.position.z; if (dx * dx + dz * dz > 240 * 240) continue;
          steamT[i] -= dt; if (steamT[i] <= 0) { steamT[i] = 0.12 / qp; Pt.emit(0, s.x + (Math.random() - 0.5) * 0.6, s.gy + 1.1, s.z + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.8, 4.5 + Math.random() * 3, (Math.random() - 0.5) * 0.8, 2.2, 1.2, 6, 0.42, 0.38, 0.36, 0.5, 0, -0.5, 0.35); if (Math.random() < 0.3) Pt.emit(1, s.x, s.gy + 1.1, s.z, (Math.random() - 0.5) * 1.5, 3 + Math.random() * 3, (Math.random() - 0.5) * 1.5, 0.9, 0.5, 0.1, 1, 0.5, 0.1, 0.9, 0, -2, 0.3); }
        }
        // rising embers + popping bubbles over the lava near the camera
        emT -= dt; if (emT <= 0) {
          emT = 0.05 / qp;
          const r = map.lava.rivers[(Math.random() * map.lava.rivers.length) | 0], s = (r.swap ? cam.position.z : cam.position.x) + (Math.random() - 0.5) * 170, p = r.pos(s), tg = r.tan(s), off = (Math.random() - 0.5) * r.w(s) * 1.1;
          const x = p[0] - tg[1] * off, z = p[1] + tg[0] * off, dx = x - cam.position.x, dz = z - cam.position.z;
          if (dx * dx + dz * dz < 120 * 120) {
            Pt.emit(1, x, map.lava.level + 0.3, z, (Math.random() - 0.5) * 1.2, 2.2 + Math.random() * 3.2, (Math.random() - 0.5) * 1.2, 1.1 + Math.random() * 1.1, 0.7, 0.12, 1, 0.5 + Math.random() * 0.2, 0.1, 0.9, 0, -0.4, 0.2);
            if (Math.random() < 0.25) Pt.emit(1, x, map.lava.level + 0.4, z, 0, 0.8, 0, 0.35, 0.4, 2.0, 1, 0.65, 0.2, 0.8, 0, 0, 0);
          }
        }
        // ash drifting down around the camera
        ashT -= dt; if (ashT <= 0) {
          ashT = 0.09 / qp;
          Pt.emit(0, cam.position.x + (Math.random() - 0.5) * 120, map.height(cam.position.x, cam.position.z) + 6 + Math.random() * 26, cam.position.z + (Math.random() - 0.5) * 100 + 14, 0.8 + Math.random(), -1.6 - Math.random(), 0.2, 4.5, 0.3, 0.3, 0.5, 0.45, 0.42, 0.4, 0, 0, 0);
        }
      },
      dispose() {
        lava.geo.dispose(); lava.mats.forEach((m) => m.dispose()); lava.texs.forEach((x) => x.dispose()); mat.dispose(); meshes.forEach((m) => m.geometry.dispose());
        scene.remove(cGlow, plume); glowMat.dispose(); plumeMat.dispose(); plumeG.dispose();
      },
    };
  }

  WZ.Volca = { paintGround, addScenery, skyDome, clouds, mountains, cliffs, grassColors: [0x4A3A30, 0x5A4636, 0x3A2E28, 0x6A5040] };
})(window.WZ = window.WZ || {});
