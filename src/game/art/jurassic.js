/* WZ.Jura — procedural art for the JURASSIC VALLEY map (used by WZ.WorldView when map.theme === 'jurassic'):
 * jungle ground splat (moss, mud, dirt trails, river banks, dino footprints), merged vegetation (palms, tree ferns, conifers, ferns), mossy boulders,
 * giant bone landmarks, egg nests, steam vents, wooden bridges, the animated river, a warm hazy sky, jungle ridges + a smoking volcano, pterosaurs. */
(function (WZ) {
  'use strict';
  const T = THREE, G = WZ.Geo, R = WZ.RNG, U = WZ.U, rb = G.rbox, CFG = WZ.CFG;
  const B = () => new G.Builder();
  const pick = (rng, arr) => arr[(rng.next() * arr.length) | 0];
  const BONE = 0xEFE6CB, BONE_D = 0xCFC4A2;

  // ------------------------------------------------------------------ ground splat
  function paintGround(map, SPLAT, SPAN, hexA) {
    const c = document.createElement('canvas'); c.width = c.height = SPLAT;
    const g = c.getContext('2d'), rng = R.mulberry32((map.seed ^ 0x5EED11) >>> 0), k = SPLAT / SPAN, px = (x) => (x + SPAN / 2) * k, pz = (z) => (z + SPAN / 2) * k;
    g.fillStyle = '#527F38'; g.fillRect(0, 0, SPLAT, SPLAT);
    const cols = ['#5F8F3E', '#3F6B34', '#6E9A44', '#4A7A44', '#7C8A3E', '#356030', '#8A8A48'];
    for (let i = 0; i < 190; i++) {
      const x = rng() * SPLAT, y = rng() * SPLAT, r = 28 + rng() * 90, col = cols[(rng() * cols.length) | 0], gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, hexA(col, 0.6)); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // river banks (mud + wet sand), the water itself is a mesh
    const rv = map.river; g.lineCap = 'round'; g.lineJoin = 'round';
    const stroke = (wMul, add, col, a) => {
      g.strokeStyle = hexA(col, a); g.lineWidth = 1; g.beginPath();
      // draw as thick polyline by stamping discs along the centre line
      for (let x = -SPAN / 2; x <= SPAN / 2; x += 1.5) { const z = rv.zc(x), r = (rv.w(x) * wMul + add) * k; g.fillStyle = hexA(col, a); g.beginPath(); g.arc(px(x), pz(z), r, 0, 6.3); g.fill(); }
    };
    stroke(2.5, 9, '#2F5A2B', 0.35); stroke(1.9, 5, '#6A5A36', 0.55); stroke(1.5, 3.4, '#B7A46A', 0.8); stroke(1.1, 1.5, '#7A6B45', 0.85);
    // clearings around the nesting grounds
    for (const cl of map.clusters) {
      const r = cl.r * 1.15 * k, x = px(cl.x), y = pz(cl.z), gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(139,112,66,.75)'); gr.addColorStop(0.7, 'rgba(139,112,66,.4)'); gr.addColorStop(1, 'rgba(139,112,66,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // dirt trails
    const road = (w, col, a) => { g.strokeStyle = hexA(col, a); g.lineWidth = w * k; for (const r of map.roads) { g.beginPath(); g.moveTo(px(r.a.x), pz(r.a.z)); g.quadraticCurveTo(px(r.c.x), pz(r.c.z), px(r.b.x), pz(r.b.z)); g.stroke(); } };
    road(10, '#4A3A22', 0.35); road(7.4, '#8E7048', 0.95); road(4.0, '#A88A5C', 0.5);
    g.fillStyle = 'rgba(60,40,20,.3)'; for (const p of map.roadPts) for (let i = 0; i < 3; i++) g.fillRect(px(p.x + (rng() - 0.5) * 6), pz(p.z + (rng() - 0.5) * 6), 1.6, 5);
    // start pad + extraction marking
    const s = map.start; g.fillStyle = 'rgba(94,70,41,.65)'; g.fillRect(px(s.x - 13), pz(s.z - 9), 26 * k, 18 * k);
    g.setLineDash([14, 10]); g.strokeStyle = 'rgba(236,233,225,.55)'; g.lineWidth = 3; g.strokeRect(px(s.x - 12), pz(s.z - 8), 24 * k, 16 * k);
    if (map.extract) { g.beginPath(); g.arc(px(map.extract.x), pz(map.extract.z), map.extract.r * k, 0, 7); g.fillStyle = 'rgba(90,140,60,.28)'; g.fill(); g.strokeStyle = 'rgba(236,233,225,.5)'; g.lineWidth = 4; g.stroke(); }
    g.setLineDash([]);
    // dinosaur footprints (three toes + heel) wandering around the clearings
    const print = (x, y, rot, sc) => {
      g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = 'rgba(40,28,14,.34)';
      for (const a of [-0.55, 0, 0.55]) { g.save(); g.rotate(a); g.beginPath(); g.ellipse(0, -7 * sc, 2.2 * sc, 6 * sc, 0, 0, 6.3); g.fill(); g.restore(); }
      g.beginPath(); g.ellipse(0, 2 * sc, 3.2 * sc, 3.2 * sc, 0, 0, 6.3); g.fill(); g.restore();
    };
    for (const cl of map.clusters) { const a0 = rng() * 6.28, dir = rng() * 6.28; for (let i = 0; i < 9; i++) { const d = 8 + i * 6; print(px(cl.x + Math.cos(a0) * 6 + Math.cos(dir) * d + (i % 2 ? 1.6 : -1.6)), pz(cl.z + Math.sin(a0) * 6 + Math.sin(dir) * d), -dir + Math.PI, 1.0 + rng() * 0.2); } }
    // scorch / mud under bones + nests
    for (const n of map.nests) { const x = px(n.x), y = pz(n.z), r = 6 * k, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(70,50,28,.8)'); gr.addColorStop(1, 'rgba(70,50,28,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    const blob = (x, z, r, a) => { const X = px(x), Y = pz(z), rr = r * k, gr = g.createRadialGradient(X, Y, 0, X, Y, rr); gr.addColorStop(0, 'rgba(20,38,16,' + a + ')'); gr.addColorStop(1, 'rgba(20,38,16,0)'); g.fillStyle = gr; g.fillRect(X - rr, Y - rr, rr * 2, rr * 2); };
    for (const r of map.rocks) blob(r.x + r.r * 0.4, r.z + r.r * 0.4, r.r * 1.6, 0.55);
    for (const t of map.palms) blob(t.x + 1.4 * t.s, t.z + 1.2 * t.s, 3.2 * t.s, 0.42);
    for (const t of map.conifers) blob(t.x + 1.8 * t.s, t.z + 1.5 * t.s, 3.4 * t.s, 0.5);
    for (const t of map.broad) blob(t.x + 1.5 * t.s, t.z + 1.3 * t.s, 3.0 * t.s, 0.45);
    for (const b of map.bones) blob(b.x + 1.5, b.z + 1.5, 6, 0.4);
    for (const t of map.tents) blob(t.x + 1, t.z + 1, 5, 0.5);
    // speckles + leaf litter
    for (let i = 0; i < 26000; i++) { const r = rng(); g.fillStyle = r < 0.4 ? 'rgba(25,50,22,.25)' : r < 0.75 ? 'rgba(160,190,90,.2)' : 'rgba(120,90,40,.22)'; g.fillRect(rng() * SPLAT, rng() * SPLAT, 1 + rng() * 1.6, 1 + rng() * 1.6); }
    g.strokeStyle = 'rgba(100,160,70,.5)'; g.lineWidth = 1; for (let i = 0; i < 2600; i++) { const x = rng() * SPLAT, y = rng() * SPLAT; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rng() - 0.5) * 2, y - 3 - rng() * 3); g.stroke(); }
    const t = new T.CanvasTexture(c); t.anisotropy = 8; return t;
  }

  // ------------------------------------------------------------------ vegetation (merged into per-chunk builders)
  const GREENS = [0x2F8A3E, 0x3FA14A, 0x4FB04F, 0x2A7A44, 0x5BB854], DKG = [0x25623A, 0x2F7A42, 0x3B8A45];
  function frond(b, x, y, z, ang, len, w, col, droop) {
    const ca = Math.cos(ang), sa = Math.sin(ang), mx = x + ca * len * 0.55, mz = z + sa * len * 0.55, ex = x + ca * len, ez = z + sa * len;
    b.beam(x, y, z, mx, y + len * 0.28, mz, w, 0.07, col); b.beam(mx, y + len * 0.28, mz, ex, y + len * 0.28 - droop, ez, w * 0.7, 0.07, col);
  }
  function palm(b, o, rng) {
    const s = o.s, h = 6.4 * s, lean = rng.range(-0.9, 0.9) * s, la = rng.range(0, 6.28), lx = Math.cos(la) * lean, lz = Math.sin(la) * lean;
    let px = o.x, py = o.gy - 0.2, pz = o.z;
    for (let i = 1; i <= 4; i++) { const t = i / 4, nx = o.x + lx * t * t, ny = o.gy - 0.2 + h * t, nz = o.z + lz * t * t; b.beam(px, py, pz, nx, ny, nz, 0.52 * s * (1.1 - t * 0.35), 0.52 * s * (1.1 - t * 0.35), i % 2 ? 0x8A6A44 : 0x7A5B3A); px = nx; py = ny; pz = nz; }
    for (let i = 0; i < 9; i++) frond(b, px, py, pz, i / 9 * 6.283 + o.rot, rng.range(2.8, 3.8) * s, 0.95 * s, pick(rng, GREENS), rng.range(1.0, 1.9) * s);
    b.add(G.ico(), { x: px, y: py - 0.2, z: pz, sx: 0.55 * s, sy: 0.45 * s, sz: 0.55 * s, color: 0x6B4A2B });
  }
  function treeFern(b, o, rng) {
    const s = o.s, h = 3.0 * s;
    b.add(G.cyl(7), { x: o.x, y: o.gy + h / 2 - 0.2, z: o.z, sx: 0.62 * s, sy: h, sz: 0.62 * s, color: 0x5C4A38 });
    for (let i = 0; i < 3; i++) b.add(G.cyl(7), { x: o.x, y: o.gy + 0.6 * s + i * 0.8 * s, z: o.z, sx: 0.7 * s, sy: 0.16, sz: 0.7 * s, color: 0x433528 });
    for (let i = 0; i < 12; i++) frond(b, o.x, o.gy + h, o.z, i / 12 * 6.283 + o.rot, rng.range(3.0, 4.2) * s, 0.8 * s, pick(rng, GREENS), rng.range(1.3, 2.3) * s);
    for (let i = 0; i < 5; i++) frond(b, o.x, o.gy + h + 0.3, o.z, i / 5 * 6.283 + o.rot + 0.3, 2.0 * s, 0.6 * s, pick(rng, GREENS), -0.3 * s);
  }
  function conifer(b, o, rng) {
    const s = o.s, th = 7.2 * s;
    b.add(G.cyl(7), { x: o.x, y: o.gy + th / 2 - 0.2, z: o.z, sx: 0.5 * s, sy: th, sz: 0.5 * s, color: 0x6E4F33 });
    for (let i = 0; i < 4; i++) { const r = (3.1 - i * 0.55) * s; b.add(G.cone(8), { x: o.x, y: o.gy + (3.0 + i * 1.7) * s, z: o.z, ry: o.rot + i, sx: r, sy: 2.5 * s, sz: r, color: pick(rng, DKG) }); }
  }
  function fern(b, o, rng) {
    const n = 6; for (let i = 0; i < n; i++) frond(b, o.x, o.gy - 0.05, o.z, i / n * 6.283 + o.rot, 1.55 * o.s, 0.42 * o.s, pick(rng, GREENS), 0.7 * o.s);
  }
  function rock(b, r, rng) {
    const cols = [0x6C7A6A, 0x5C685C, 0x7A8574, 0x667262], n = r.r > 2.6 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, 6.28), d = i === 0 ? 0 : r.r * 0.6, rr = r.r * (i === 0 ? 1 : rng.range(0.5, 0.7));
      b.add(G.ico(), { x: r.x + Math.cos(a) * d, y: r.gy + rr * 0.35, z: r.z + Math.sin(a) * d, rx: rng.range(-0.4, 0.4), ry: rng.range(0, 6), rz: rng.range(-0.4, 0.4), sx: rr * 1.15, sy: rr * 0.85, sz: rr, color: pick(rng, cols) });
      b.add(G.ico(), { x: r.x + Math.cos(a) * d, y: r.gy + rr * 0.85, z: r.z + Math.sin(a) * d, ry: rng.range(0, 6), sx: rr * 0.8, sy: rr * 0.32, sz: rr * 0.75, color: 0x5E8A3C });
    }
  }
  function withBase(b, x, y, z, ry, fn) { b.base = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), new T.Vector3(1, 1, 1)); fn(); b.base = null; }
  function bones(b, o) {
    withBase(b, o.x, o.gy - 0.2, o.z, o.rot, () => {
      if (o.kind === 0) {                                    // ribcage + spine
        b.beam(-6.8, 3.4, 0, 6.8, 3.4, 0, 0.55, 0.55, BONE_D);
        for (let i = 0; i < 6; i++) {
          const x = -4.6 + i * 1.85, R_ = 2.8 * (1 - Math.abs(i - 2.5) * 0.07);
          for (const s of [1, -1]) { let pz = 0, py = 3.4; for (let j = 1; j <= 6; j++) { const a = j / 6 * 1.75, nz = Math.sin(a) * R_ * s, ny = 3.4 - (1 - Math.cos(a)) * R_; b.beam(x, py, pz, x, ny, nz, 0.34, 0.34, BONE); py = ny; pz = nz; } }
        }
        b.add(G.ico(), { x: 7.4, y: 3.2, z: 0, sx: 0.8, sy: 0.7, sz: 0.7, color: BONE });
      } else {                                               // giant skull
        b.add(rb(3.2, 2.5, 4.8, 0.7), { y: 1.8, z: 0, rx: -0.12, color: BONE });
        b.add(rb(2.4, 1.6, 3.6, 0.5), { y: 1.3, z: 3.6, rx: -0.12, color: BONE });
        b.add(rb(2.1, 0.7, 4.6, 0.25), { y: 0.35, z: 2.0, rx: 0.12, color: BONE_D });
        for (const s of [1, -1]) {
          b.add(G.sph(8, 6), { x: 1.3 * s, y: 2.5, z: 1.4, sx: 0.55, sy: 0.65, sz: 0.5, color: 0x23201A });
          for (let i = 0; i < 5; i++) { b.add(G.cone(5), { x: 0.95 * s, y: 0.75, z: 1.7 + i * 0.6, rx: Math.PI, sx: 0.16, sy: 0.7, sz: 0.16, color: BONE }); b.add(G.cone(5), { x: 0.85 * s, y: 0.82, z: 1.7 + i * 0.6, sx: 0.13, sy: 0.55, sz: 0.13, color: BONE }); }
          b.add(G.sph(6, 4), { x: 0.4 * s, y: 1.7, z: 5.3, sx: 0.2, sy: 0.18, sz: 0.2, color: 0x23201A });
        }
        for (let i = 0; i < 4; i++) b.add(G.cone(5), { x: -1.2 + i * 0.8, y: 3.4, z: -1.8, rx: -0.5, sx: 0.28, sy: 0.9, sz: 0.28, color: BONE_D });
      }
    });
  }
  function nest(b, o, rng) {
    b.add(G.cyl(14), { x: o.x, y: o.gy + 0.25, z: o.z, sx: 2.6, sy: 0.7, sz: 2.6, color: 0x6B4A2B });
    b.add(G.cyl(14), { x: o.x, y: o.gy + 0.55, z: o.z, sx: 1.95, sy: 0.4, sz: 1.95, color: 0xA88A4C });
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + o.rot, r = i === 3 ? 0 : 0.85; b.add(G.sph(10, 8), { x: o.x + Math.cos(a) * r, y: o.gy + 1.35, z: o.z + Math.sin(a) * r, sx: 0.72, sy: 0.95, sz: 0.72, color: i % 2 ? 0xEDE4C8 : 0xBFE0B2 });
      b.add(G.sph(6, 4), { x: o.x + Math.cos(a) * r + 0.3, y: o.gy + 1.7, z: o.z + Math.sin(a) * r, sx: 0.16, sy: 0.12, sz: 0.16, color: 0x7A6A3A }); }
    for (let i = 0; i < 7; i++) { const a = rng.range(0, 6.28); b.add(G.box1, { x: o.x + Math.cos(a) * 2.2, y: o.gy + 0.55, z: o.z + Math.sin(a) * 2.2, ry: a, sx: 0.2, sy: 0.18, sz: 1.2, color: 0x8A6A3A }); }
  }
  function steam(b, o) { b.add(G.cone(9), { x: o.x, y: o.gy + 0.3, z: o.z, sx: 1.7, sy: 0.9, sz: 1.7, color: 0x8A7B62 }); b.add(G.cyl(9), { x: o.x, y: o.gy + 0.78, z: o.z, sx: 0.55, sy: 0.1, sz: 0.55, color: 0xD9C94A }); }

  function bridge(b, bg, h) {
    const L = 19, Wd = 7.8, y = h(bg.x, bg.z) + 0.07;
    withBase(b, bg.x, y, bg.z, bg.th, () => {
      for (let i = 0; i < 20; i++) b.add(G.box1, { z: -L / 2 + (i + 0.5) * L / 20, y: 0.0, sx: Wd, sy: 0.16, sz: L / 20 - 0.06, color: i % 2 ? 0x9A7A50 : 0x8A6A45 });
      for (const s of [1, -1]) {
        b.add(G.box1, { x: s * (Wd / 2 + 0.1), y: -0.12, sx: 0.5, sy: 0.4, sz: L + 0.6, color: 0x5E4126 });
        for (let i = 0; i <= 6; i++) { const z = -L / 2 + i * L / 6; b.add(G.cyl(6), { x: s * (Wd / 2 + 0.1), y: 0.7, z, sx: 0.2, sy: 1.5, sz: 0.2, color: 0x6B4A2B }); }
        b.add(G.box1, { x: s * (Wd / 2 + 0.1), y: 1.25, sx: 0.16, sy: 0.16, sz: L, color: 0x7B5C3A }); b.add(G.box1, { x: s * (Wd / 2 + 0.1), y: 0.7, sx: 0.12, sy: 0.12, sz: L, color: 0x7B5C3A });
        b.add(G.cyl(6), { x: s * (Wd / 2 + 0.1), y: 1.6, z: -L / 2, sx: 0.28, sy: 0.35, sz: 0.28, color: 0xFFB400 }); b.add(G.cyl(6), { x: s * (Wd / 2 + 0.1), y: 1.6, z: L / 2, sx: 0.28, sy: 0.35, sz: 0.28, color: 0xFFB400 });
      }
    });
  }

  // ------------------------------------------------------------------ river
  function waterTex(seed, sparkle) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'), rnd = R.mulberry32(seed);
    x.fillStyle = sparkle ? 'rgba(0,0,0,1)' : '#FFFFFF'; x.fillRect(0, 0, 256, 128);
    for (let i = 0; i < (sparkle ? 90 : 70); i++) {
      const px = rnd() * 256, py = rnd() * 128, w = 8 + rnd() * 40, a = sparkle ? 0.5 + rnd() * 0.5 : 0.12 + rnd() * 0.25;
      x.strokeStyle = sparkle ? 'rgba(255,255,255,' + a + ')' : 'rgba(150,215,225,' + a + ')'; x.lineWidth = 1 + rnd() * 2.2;
      for (const ox of [-256, 0, 256]) { x.beginPath(); x.moveTo(px + ox, py); x.quadraticCurveTo(px + ox + w / 2, py + (rnd() - 0.5) * 6, px + ox + w, py); x.stroke(); }
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  function riverMesh(map, group) {
    const rv = map.river, lv = map.water.level, X0 = -map.half - 30, X1 = map.half + 30, st = 3, n = Math.ceil((X1 - X0) / st), cols = 5;
    const pos = [], col = [], uv = [], idx = [], cc = new T.Color();
    for (let i = 0; i <= n; i++) {
      const x = X0 + i * st, z = rv.zc(x), hw = rv.w(x) * 1.15, sl = Math.sqrt(1 + rv.dzc(x) * rv.dzc(x)), nx = -rv.dzc(x) / sl, nz = 1 / sl;   // normal to the centre line in XZ
      for (let j = 0; j < cols; j++) {
        const f = j / (cols - 1) * 2 - 1;
        pos.push(x + nx * hw * f * 0, lv, z + 0); pos[pos.length - 3] = x + nx * hw * f; pos[pos.length - 1] = z + nz * hw * f;
        cc.set(Math.abs(f) > 0.6 ? 0x8FD8CC : 0x2F8FA6); col.push(cc.r, cc.g, cc.b); uv.push(x / 16, f * 0.5 + 0.5);
      }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < cols - 1; j++) { const a = i * cols + j, b2 = a + 1, c2 = a + cols, d = c2 + 1; idx.push(a, c2, b2, b2, c2, d); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const t1 = waterTex(11, false), t2 = waterTex(29, true); t2.repeat.set(0.6, 1.3); t1.repeat.set(1, 1);
    const m1 = new T.MeshBasicMaterial({ map: t1, vertexColors: true, transparent: true, opacity: 0.86, depthWrite: false, side: T.DoubleSide }), m2 = new T.MeshBasicMaterial({ map: t2, color: 0xD8F6FF, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide });
    const w1 = new T.Mesh(geo, m1), w2 = new T.Mesh(geo, m2); w1.renderOrder = 1; w2.renderOrder = 2; w2.position.y = 0.04; w1.frustumCulled = w2.frustumCulled = false; group.add(w1, w2);
    return { geo, mats: [m1, m2], texs: [t1, t2], update(t) { t1.offset.x = -t * 0.06; t2.offset.x = -t * 0.14 + 0.3; t2.offset.y = Math.sin(t * 0.7) * 0.05; } };
  }

  // ------------------------------------------------------------------ pterosaurs
  function pterosaurs(scene, rng) {
    const grp = new T.Group(), items = [], mat = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
    const bb = B(); bb.add(rb(0.7, 0.6, 2.2, 0.25), { color: 0x8A5A3A }); bb.add(G.cone(5), { z: 2.0, rx: Math.PI / 2, sx: 0.22, sy: 1.8, sz: 0.2, color: 0xD9A441 }); bb.add(G.cone(4), { z: -1.2, y: 0.6, rx: -2.2, sx: 0.12, sy: 1.5, sz: 0.4, color: 0xCC4A2A }); bb.add(G.cone(4), { z: -1.9, rx: -Math.PI / 2, sx: 0.12, sy: 1.2, sz: 0.12, color: 0x6A4528 });
    const wb = B(); wb.add(G.box1, { x: 1.7, sx: 3.4, sy: 0.07, sz: 1.5, color: 0x9A6A44 }); wb.add(G.box1, { x: 1.7, z: -0.2, sx: 3.2, sy: 0.08, sz: 0.6, color: 0xD9A441 });
    const ob = B(); ob.add(G.box1, { x: 2.0, sx: 4.0, sy: 0.06, sz: 1.0, color: 0x8A5A3A }); ob.add(G.cone(3), { x: 4.4, z: 0.2, rz: -Math.PI / 2, sx: 0.5, sy: 1.0, sz: 0.5, color: 0x8A5A3A });
    const bg = G.mark(bb.build()), wg = G.mark(wb.build()), og = G.mark(ob.build());
    for (let i = 0; i < 5; i++) {
      const root = new T.Group(), body = new T.Mesh(bg, mat); root.add(body);
      const mk = (s) => { const sh = new T.Group(), w = new T.Mesh(wg, mat); sh.add(w); const el = new T.Group(); el.position.x = 3.4; const o = new T.Mesh(og, mat); o.position.x = -0.0; el.add(o); sh.add(el); sh.position.x = 0.3 * s; if (s < 0) sh.scale.x = -1; root.add(sh); return { sh, el }; };
      items.push({ root, L: mk(1), Rr: mk(-1), r: 60 + rng.range(0, 90), a: rng.range(0, 6.28), sp: rng.range(0.07, 0.14) * (i % 2 ? 1 : -1), y: rng.range(48, 92), ph: rng.range(0, 6.28), sc: rng.range(1.5, 2.3), fl: rng.range(4, 6) });
      grp.add(root);
    }
    scene.add(grp);
    return {
      grp, update(t, cam) {
        for (const p of items) {
          const a = p.a + t * p.sp, x = cam.position.x * 0.6 + Math.cos(a) * p.r, z = cam.position.z * 0.6 + Math.sin(a) * p.r - 40, y = p.y + Math.sin(t * 0.5 + p.ph) * 4;
          p.root.position.set(x, y, z); p.root.rotation.y = Math.atan2(-Math.sin(a) * Math.sign(p.sp), Math.cos(a) * Math.sign(p.sp)) + (p.sp < 0 ? Math.PI : 0) * 0; p.root.rotation.z = -0.25 * Math.sign(p.sp); p.root.scale.setScalar(p.sc);
          const f = Math.sin(t * p.fl + p.ph), glide = Math.sin(t * 0.4 + p.ph) > 0.3 ? 0.25 : 1;
          p.L.sh.rotation.z = f * 0.5 * glide; p.Rr.sh.rotation.z = -f * 0.5 * glide; p.L.el.rotation.z = f * 0.35 * glide; p.Rr.el.rotation.z = -f * 0.35 * glide;
        }
      },
      dispose() { scene.remove(grp); mat.dispose(); },
    };
  }

  // ------------------------------------------------------------------ sky / mountains / cliffs
  function skyDome() {
    const g = new T.SphereGeometry(900, 24, 14), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const stops = [[-1, '#F2E3B4'], [0, '#F3DFA8'], [0.06, '#CFE0A8'], [0.3, '#7FC6BE'], [0.65, '#3F9CC6'], [1, '#2370B8']], cc = new T.Color(), c2 = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) / 900; let j = 0; while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
      const a = stops[j], b = stops[j + 1], u = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0]))); cc.set(a[1]); c2.set(b[1]); cc.lerp(c2, u); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })); m.renderOrder = -10; m.frustumCulled = false; return m;
  }
  function mountains(rng) {
    const b = B();
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2 + rng.range(-0.04, 0.04), r = (ring ? 730 : 580) + rng.range(-30, 60), h = rng.range(60, 130) * (ring ? 1.2 : 1), w = rng.range(160, 280), x = Math.cos(a) * r, z = Math.sin(a) * r;
      b.add(G.cone(8), { x, y: h / 2 - 14, z, ry: rng.range(0, 3), sx: w, sy: h, sz: w * rng.range(0.7, 1), color: ring ? 0x7FA68A : 0x4F7F5E });
      b.add(G.cone(8), { x: x + rng.range(-30, 30), y: h * 0.3 - 14, z: z + rng.range(-30, 30), ry: rng.range(0, 3), sx: w * 0.85, sy: h * 0.6, sz: w * 0.85, color: ring ? 0x88B093 : 0x5C8D6A });
    }
    for (let i = 0; i < 36; i++) { const a = rng.range(0, 6.28), r = rng.range(430, 540); b.add(G.cone(6), { x: Math.cos(a) * r, y: 10, z: Math.sin(a) * r, sx: rng.range(70, 130), sy: rng.range(26, 46), sz: rng.range(70, 130), color: 0x2F6B3C }); }
    // the volcano: dark cone, glowing crater, lava streaks, a column of smoke
    const va = rng.range(0, 6.28), vr = 640, vx = Math.cos(va) * vr, vz = Math.sin(va) * vr, vh = 250;
    b.add(G.cone(14), { x: vx, y: vh / 2 - 14, z: vz, sx: 400, sy: vh, sz: 400, color: 0x4A3F3A });
    b.add(G.cone(14), { x: vx, y: vh * 0.82 - 14, z: vz, sx: 150, sy: vh * 0.36, sz: 150, color: 0x3A302C });
    b.add(G.cyl(14), { x: vx, y: vh - 12, z: vz, sx: 52, sy: 8, sz: 52, color: 0xFF6A1A });
    for (let i = 0; i < 5; i++) { const aa = i / 5 * 6.28 + 0.4; b.add(G.box1, { x: vx + Math.cos(aa) * 62, y: vh - 56, z: vz + Math.sin(aa) * 62, ry: -aa, rx: 0.35, sx: 7, sy: 80, sz: 4, color: 0xFF7A22 }); }
    for (let i = 0; i < 7; i++) b.add(G.sph(8, 6), { x: vx + i * 14 - 20, y: vh + 30 + i * 46, z: vz + Math.sin(i * 1.7) * 24, sx: 50 + i * 12, sy: 40 + i * 8, sz: 50 + i * 12, color: i < 2 ? 0x5A524C : 0x8D8780 });
    const m = new T.Mesh(b.build(), new T.MeshBasicMaterial({ vertexColors: true, fog: false })); m.frustumCulled = false; return m;
  }
  function cliffs(set, half, rng) {
    for (const sd of [[0, -1], [0, 1], [-1, 0], [1, 0]]) for (let t = -half - 20; t <= half + 20; t += 8.5) for (let layer = 0; layer < 2; layer++) {
      const out = half + 4 + layer * 9 + rng.range(0, 5), px = sd[0] === 0 ? t + rng.range(-2, 2) : sd[0] * out, pz = sd[1] === 0 ? t + rng.range(-2, 2) : sd[1] * out;
      const H = rng.range(10, 24) + layer * 6, w = rng.range(10, 15), d = rng.range(9, 14), sh = rng.range(0.7, 1);
      set.stone.add(G.box1, { x: px, y: H / 2 - 5, z: pz, ry: rng.range(-0.4, 0.4), rx: rng.range(-0.05, 0.05), rz: rng.range(-0.05, 0.05), sx: w, sy: H, sz: d, color: WZ.Props.hexShade(sh * 0.62), uv: [w / 10, H / 12] });
      set.plain.add(G.box1, { x: px, y: H - 5 + 0.2, z: pz, ry: rng.range(-0.4, 0.4), sx: w * 0.96, sy: 1.1, sz: d * 0.96, color: 0x3F7A38 });
      if (rng.chance(0.5)) set.plain.add(G.cone(7), { x: px + rng.range(-3, 3), y: H - 3, z: pz + rng.range(-3, 3), sx: 2.4, sy: 5.5, sz: 2.4, color: 0x2F6B3C });
    }
  }

  // ------------------------------------------------------------------ everything static + animated, called by WorldView.build
  function addScenery(map, group, scene, q) {
    const rng = R.create((map.seed ^ 0x77A1) | 0), half = map.half, CH = CFG.world.chunk, nC = Math.ceil(map.size / CH), chunks = [];
    for (let i = 0; i < nC * nC; i++) chunks.push(B());
    const at = (x, z) => chunks[Math.max(0, Math.min(nC - 1, Math.floor((z + half) / CH))) * nC + Math.max(0, Math.min(nC - 1, Math.floor((x + half) / CH)))];
    for (const o of map.palms) palm(at(o.x, o.z), o, rng);
    for (const o of map.broad) treeFern(at(o.x, o.z), o, rng);
    for (const o of map.conifers) conifer(at(o.x, o.z), o, rng);
    const nf = Math.min(map.ferns.length, [140, 220, 300][q == null ? 2 : q]); for (let i = 0; i < nf; i++) fern(at(map.ferns[i].x, map.ferns[i].z), map.ferns[i], rng);
    for (const o of map.rocks) rock(at(o.x, o.z), o, rng);
    for (const o of map.bones) bones(at(o.x, o.z), o);
    for (const o of map.nests) nest(at(o.x, o.z), o, rng);
    for (const o of map.steams) steam(at(o.x, o.z), o);
    for (const o of map.bridges) bridge(at(o.x, o.z), o, map.height);
    const mat = new T.MeshLambertMaterial({ vertexColors: true }), meshes = [];
    for (const b of chunks) if (!b.empty) { const m = new T.Mesh(b.build(), mat); m.castShadow = false; group.add(m); meshes.push(m); }
    // camp tent + flag poles (reuse the village props, they read fine in a jungle camp)
    const set = WZ.Props.newSet();
    for (const t of map.tents) WZ.Props.camp(set, t.x, t.z, map.height(t.x, t.z));
    for (const f of map.flags) WZ.Props.flagPole(set, f.x, f.z, map.height(f.x, f.z));
    WZ.Props.setMeshes(set, group);
    const water = riverMesh(map, group), ptero = pterosaurs(scene, R.create(map.seed ^ 0x91));
    const steamT = map.steams.map(() => Math.random());
    return {
      water, ptero, mat,
      update(t, dt, cam) {
        water.update(t); ptero.update(t, cam);
        const Pt = WZ.Particles; if (!Pt || !Pt.ready) return;
        for (let i = 0; i < map.steams.length; i++) {
          const s = map.steams[i], dx = s.x - cam.position.x, dz = s.z - cam.position.z; if (dx * dx + dz * dz > 240 * 240) continue;
          steamT[i] -= dt; if (steamT[i] <= 0) { steamT[i] = 0.12; Pt.emit(0, s.x + (Math.random() - 0.5) * 0.6, s.gy + 1.0, s.z + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.8, 5 + Math.random() * 3, (Math.random() - 0.5) * 0.8, 2.2, 1.2, 6, 0.93, 0.95, 0.93, 0.55, 0, -0.5, 0.35); }
        }
      },
      dispose() { water.geo.dispose(); water.mats.forEach((m) => m.dispose()); water.texs.forEach((x) => x.dispose()); ptero.dispose(); mat.dispose(); meshes.forEach((m) => m.geometry.dispose()); },
    };
  }

  WZ.Jura = { paintGround, addScenery, skyDome, mountains, cliffs, grassColors: [0x4F9A45, 0x3F7F3A, 0x6DAF4A, 0x5A9A3E] };
})(window.WZ = window.WZ || {});
