/* WZ.Froze — procedural art for the FROZEN FRONTIER map (used by WZ.WorldView when map.theme === 'frozen'):
 * snow ground splat (packed-snow trails, wind ripples, shore slush, sparkles), merged scenery (snowy pines, snow-capped boulders, log cabins with smoking chimneys,
 * ice spikes, drifts), GLOSSY ICE (one merged mesh for the frozen lakes + ice patches: Phong specular + an animated additive glint layer; dynamic patches for the
 * Ice Beast), a falling SNOWSTORM (blows harder in gusts: WZ.Ice.gust), an overcast sky, snow peaks + a pine-forest ring, storm clouds and icy border cliffs.
 *
 * WZ.FrostArt — the ICE BEAST guardian: a hunched white-furred brute with ice-crystal spikes, tusks and glowing cyan eyes.
 *   WZ.FrostArt.rig(mat, variant) -> { root, body, legL, legR, torso, armL, armR, head, glow, dispose() }   (superset of the club giant's rig contract)
 *   WZ.FrostArt.pose(g, C, t, dt) -> animates it from the guardian record (walk, smash wind-up, CHARGE wind-up / dash / recover, glow telegraph)
 * Fur/ice parts use the shared Lambert `mat` (hit-flash / wind-up tint); the eyes + crystal glow use an unlit vertex-coloured material. */
(function (WZ) {
  'use strict';
  const T = THREE, G = WZ.Geo, R = WZ.RNG, U = WZ.U, rb = G.rbox, CFG = WZ.CFG;
  const B = () => new G.Builder();
  const pick = (rng, arr) => arr[(rng.next() * arr.length) | 0];
  const PINE = [0x2F5A47, 0x28503F, 0x356650, 0x264A3B], SNOW = 0xF1F6FB, SNOW2 = 0xDCE8F3, BARK = 0x4B3B2F, ROCK = [0x77818F, 0x66717F, 0x858F9B, 0x5D6876];
  const ICEC = [0xA9DCF2, 0x8CCBEA, 0xC4ECFA, 0x7FBFE6];
  const grassColors = [0xB9C6D0, 0xD7E2EA, 0x9FB0A0, 0xC9D4DC];

  // ------------------------------------------------------------------ textures
  function canvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }
  function iceTex() {
    const c = canvas(256), g = c.getContext('2d'), rng = R.mulberry32(0x1CE5);
    const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, '#C6EEFB'); gr.addColorStop(0.5, '#9FD9F2'); gr.addColorStop(1, '#BDE8F8');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 26; i++) { const x = rng() * 256, y = rng() * 256, r = 18 + rng() * 50, rg = g.createRadialGradient(x, y, 0, x, y, r); const k = rng() < 0.5; rg.addColorStop(0, k ? 'rgba(255,255,255,.5)' : 'rgba(90,160,215,.4)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < 16; i++) {      // frozen cracks
      let x = rng() * 256, y = rng() * 256, a = rng() * 6.28; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { a += (rng() - 0.5) * 1.2; x += Math.cos(a) * (14 + rng() * 22); y += Math.sin(a) * (14 + rng() * 22); g.lineTo(x, y); }
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.4; g.stroke(); g.strokeStyle = 'rgba(70,130,190,.35)'; g.lineWidth = 3; g.globalCompositeOperation = 'multiply'; g.stroke(); g.globalCompositeOperation = 'source-over';
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
  }
  function glintTex() {
    const c = canvas(256), g = c.getContext('2d'), rng = R.mulberry32(0x61177);
    g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) {      // soft sparkles + a few long streak highlights (the glossy "shine")
      const x = rng() * 256, y = rng() * 256, long = rng() < 0.28, w = long ? 30 + rng() * 40 : 4 + rng() * 9, h = long ? 3 + rng() * 4 : w, rg = g.createRadialGradient(x, y, 0, x, y, w);
      rg.addColorStop(0, 'rgba(255,255,255,' + (0.45 + rng() * 0.5) + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.save(); g.translate(x, y); g.rotate(long ? -0.5 + rng() * 0.3 : 0); g.scale(1, h / w); g.translate(-x, -y); g.fillStyle = rg; g.fillRect(x - w, y - w, w * 2, w * 2); g.restore();
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }

  // ------------------------------------------------------------------ ground splat
  function paintGround(map, SPLAT, SPAN, hexA) {
    const c = canvas(SPLAT), g = c.getContext('2d'), rng = R.mulberry32((map.seed ^ 0x5A0B1) >>> 0), k = SPLAT / SPAN, px = (x) => (x + SPAN / 2) * k, pz = (z) => (z + SPAN / 2) * k;
    g.fillStyle = '#C3D2E1'; g.fillRect(0, 0, SPLAT, SPLAT);
    const cols = ['#D5E1EC', '#B5C6D8', '#CBD9E6', '#A9BBCF', '#DCE7F1', '#BCCBDB'];
    for (let i = 0; i < 190; i++) {
      const x = rng() * SPLAT, y = rng() * SPLAT, r = 28 + rng() * 96, col = cols[(rng() * cols.length) | 0], gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, hexA(col, 0.6)); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // wind-blown ripples
    g.lineCap = 'round';
    for (let i = 0; i < 520; i++) { const x = rng() * SPLAT, y = rng() * SPLAT, l = 14 + rng() * 40; g.strokeStyle = rng() < 0.5 ? 'rgba(255,255,255,.34)' : 'rgba(120,145,175,.2)'; g.lineWidth = 1 + rng() * 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l * 0.5, y - 3 - rng() * 5, x + l, y + rng() * 4 - 2); g.stroke(); }
    // clearings around the camps
    for (const cl of map.clusters) {
      const r = cl.r * 1.15 * k, x = px(cl.x), y = pz(cl.z), gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(150,166,184,.6)'); gr.addColorStop(0.7, 'rgba(150,166,184,.32)'); gr.addColorStop(1, 'rgba(150,166,184,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // shore slush around every frozen lake
    for (const l of map.ice.lakes) for (const [sc, col] of [[1.42, 'rgba(120,138,160,.35)'], [1.22, 'rgba(96,114,138,.5)'], [1.08, 'rgba(70,90,116,.6)']]) {
      g.fillStyle = col; g.beginPath();
      for (let i = 0; i <= 64; i++) { const a = i / 64 * 6.2832, p = map.ice.lakePoint(l, a, sc); if (i) g.lineTo(px(p[0]), pz(p[1])); else g.moveTo(px(p[0]), pz(p[1])); }
      g.fill();
    }
    // packed-snow trails (darker grey-blue, lighter centre, tyre scuffs)
    g.lineJoin = 'round';
    const road = (w, col, a) => { g.strokeStyle = hexA(col, a); g.lineWidth = w * k; for (const r of map.roads) { g.beginPath(); g.moveTo(px(r.a.x), pz(r.a.z)); g.quadraticCurveTo(px(r.c.x), pz(r.c.z), px(r.b.x), pz(r.b.z)); g.stroke(); } };
    road(10, '#6E8199', 0.34); road(7.4, '#98AABF', 0.95); road(4.0, '#B4C3D3', 0.5);
    g.fillStyle = 'rgba(70,86,108,.3)'; for (const p of map.roadPts) for (let i = 0; i < 3; i++) g.fillRect(px(p.x + (rng() - 0.5) * 6), pz(p.z + (rng() - 0.5) * 6), 1.6, 5);
    // start pad + extraction marking
    const s = map.start; g.fillStyle = 'rgba(112,130,152,.65)'; g.fillRect(px(s.x - 13), pz(s.z - 9), 26 * k, 18 * k);
    g.setLineDash([14, 10]); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.strokeRect(px(s.x - 12), pz(s.z - 8), 24 * k, 16 * k);
    if (map.extract) { g.beginPath(); g.arc(px(map.extract.x), pz(map.extract.z), map.extract.r * k, 0, 7); g.fillStyle = 'rgba(90,170,120,.22)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 4; g.stroke(); }
    g.setLineDash([]);
    // contact shadows (light from the top-left)
    const blob = (x, z, r, a) => { const X = px(x), Y = pz(z), rr = r * k, gr = g.createRadialGradient(X, Y, 0, X, Y, rr); gr.addColorStop(0, 'rgba(60,78,104,' + a + ')'); gr.addColorStop(1, 'rgba(60,78,104,0)'); g.fillStyle = gr; g.fillRect(X - rr, Y - rr, rr * 2, rr * 2); };
    for (const r of map.rocks) blob(r.x + r.r * 0.4, r.z + r.r * 0.4, r.r * 1.6, 0.5);
    for (const t of map.pines) blob(t.x + 2.0 * t.s, t.z + 1.8 * t.s, 3.4 * t.s, 0.5);
    for (const t of map.spikes) blob(t.x + 1.6 * t.s, t.z + 1.4 * t.s, 3.0 * t.s, 0.38);
    for (const h of map.cabins) { g.fillStyle = 'rgba(60,78,104,.42)'; g.fillRect(px(h.x - h.w / 2 - 0.8 + 1.4), pz(h.z - h.d / 2 - 0.8 + 1.4), (h.w + 1.6) * k, (h.d + 1.6) * k); blob(h.x + 3, h.z + 3, Math.max(h.w, h.d) * 0.9, 0.25); }
    for (const t of map.tents) blob(t.x + 1, t.z + 1, 5, 0.45);
    for (let i = 0; i < 24000; i++) { const r = rng(); g.fillStyle = r < 0.5 ? 'rgba(255,255,255,.4)' : r < 0.9 ? 'rgba(120,150,190,.2)' : 'rgba(255,255,255,.9)'; g.fillRect(rng() * SPLAT, rng() * SPLAT, 1 + rng() * 1.4, 1 + rng() * 1.4); }
    const t = new T.CanvasTexture(c); t.anisotropy = 8; return t;
  }

  // ------------------------------------------------------------------ scenery pieces (merged into per-chunk builders)
  function pine(b, o, rng) {
    const s = o.s, h = 9.2 * s, cols = PINE;
    b.add(G.cyl(6), { x: o.x, y: o.gy + 0.9 * s, z: o.z, sx: 0.42 * s, sy: 1.9 * s, sz: 0.42 * s, color: BARK });
    for (let i = 0; i < 4; i++) {
      const t = i / 4, rr = (2.7 - t * 1.75) * s, hh = (3.5 - t * 0.9) * s, y = o.gy + (1.5 + t * 5.0) * s + hh * 0.5, col = cols[(i + (o.k | 0)) % cols.length];
      b.add(G.cone(7), { x: o.x, y, z: o.z, ry: i * 0.7 + o.rot, sx: rr, sy: hh, sz: rr, color: col });
      b.add(G.cone(7), { x: o.x, y: y + hh * 0.2, z: o.z, ry: i * 0.7 + o.rot, sx: rr * 0.8, sy: hh * 0.6, sz: rr * 0.8, color: SNOW });             // the snow lying on the branches
      b.add(G.cyl(7), { x: o.x, y: y - hh * 0.46, z: o.z, sx: rr * 0.9, sy: 0.14 * s, sz: rr * 0.9, color: SNOW2 });
    }
    b.add(G.cone(6), { x: o.x, y: o.gy + h - 0.2 * s, z: o.z, sx: 0.55 * s, sy: 1.3 * s, sz: 0.55 * s, color: SNOW });
    void rng;
  }
  function snowRock(b, r, rng) {
    const n = r.r > 2.8 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, 6.28), d = i === 0 ? 0 : r.r * 0.6, rr = r.r * (i === 0 ? 1 : rng.range(0.5, 0.7)), x = r.x + Math.cos(a) * d, z = r.z + Math.sin(a) * d, ry = rng.range(0, 6);
      b.add(G.ico(), { x, y: r.gy + rr * 0.35, z, rx: rng.range(-0.4, 0.4), ry, rz: rng.range(-0.4, 0.4), sx: rr * 1.15, sy: rr * 0.9, sz: rr, color: pick(rng, ROCK) });
      b.add(G.ico(), { x, y: r.gy + rr * 0.78, z, ry, sx: rr * 0.95, sy: rr * 0.42, sz: rr * 0.88, color: SNOW });                                    // snow cap
    }
  }
  function cabin(b, h, rng) {
    const { x, z, w, d, gy } = h, hh = h.h, ang = h.rot || 0, wood = [0x7A5A3E, 0x6C4F37, 0x85633F][h.v % 3];
    b.base = new T.Matrix4().compose(new T.Vector3(x, gy, z), new T.Quaternion().setFromEuler(new T.Euler(0, ang, 0)), new T.Vector3(1, 1, 1));
    b.add(rb(w + 0.6, 0.7, d + 0.6, 0.12), { y: 0.3, color: 0x5C6672 });                                  // stone footing
    for (let i = 0; i < 5; i++) b.add(rb(w, hh / 5 - 0.04, d, 0.1), { y: 0.7 + (i + 0.5) * hh / 5, color: i % 2 ? wood : 0x5E4631 });   // stacked logs
    const rise = Math.min(w, d) * 0.5 + 0.9, rl = Math.max(w, d) + 1.6, rw = Math.min(w, d) + 1.6;
    b.add(G.prism(rl, rw, rise), { y: hh + 0.7, ry: w >= d ? 0 : Math.PI / 2, color: 0x4A3A2E });          // roof boards
    b.add(G.prism(rl + 0.2, rw + 0.2, rise * 0.9), { y: hh + 0.95, ry: w >= d ? 0 : Math.PI / 2, color: SNOW });   // snow blanket
    const fz = d / 2 + 0.02;
    b.add(G.box1, { x: 0, y: 0.7 + 1.2, z: fz, sx: 1.5, sy: 2.4, sz: 0.2, color: 0x2D211A });   // door
    for (const s of [-1, 1]) b.add(G.box1, { x: s * (w * 0.3), y: 0.7 + hh * 0.55, z: fz, sx: 1.3, sy: 1.1, sz: 0.2, color: 0xFFC768 });                // warm windows
    b.add(G.box1, { x: w * 0.28, y: hh + 0.7 + rise * 0.7, z: 0, sx: 0.9, sy: 2.2, sz: 0.9, color: 0x6C7480 }); b.add(G.box1, { x: w * 0.28, y: hh + 0.7 + rise * 0.7 + 1.2, z: 0, sx: 1.1, sy: 0.3, sz: 1.1, color: SNOW });   // chimney
    b.base = null; void rng;
  }
  function spike(b, o, rng) {
    const s = o.s, n = rng.int(3, 5);
    b.add(G.ico(), { x: o.x, y: o.gy + 0.15, z: o.z, sx: 2.0 * s, sy: 0.6 * s, sz: 2.0 * s, ry: o.rot, color: SNOW2 });
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283 + o.rot, d = i === 0 ? 0 : 0.9 * s, hh = (i === 0 ? 8.2 : rng.range(3.4, 6.2)) * s;
      b.add(G.cone(5), { x: o.x + Math.cos(a) * d, y: o.gy + hh * 0.45, z: o.z + Math.sin(a) * d, rx: i === 0 ? 0 : Math.sin(a) * 0.3, rz: i === 0 ? 0 : -Math.cos(a) * 0.3, sx: (i === 0 ? 1.15 : 0.7) * s, sy: hh, sz: (i === 0 ? 1.15 : 0.7) * s, color: pick(rng, ICEC) });
    }
  }
  function drift(b, o) {
    b.add(G.sph(8, 6), { x: o.x, y: o.gy + 0.1, z: o.z, ry: o.rot, sx: o.s * 3.4, sy: o.s * 0.85, sz: o.s * 2.2, color: SNOW });
    b.add(G.sph(8, 6), { x: o.x + 1.2 * o.s, y: o.gy + 0.05, z: o.z + 0.6 * o.s, ry: o.rot + 0.6, sx: o.s * 2.2, sy: o.s * 0.6, sz: o.s * 1.6, color: SNOW2 });
  }

  // ------------------------------------------------------------------ glossy ice
  /** one merged polar-grid geometry for a list of {x,z,rx,rz,rot,edge(a)->mult} shapes, conformed to the terrain */
  function iceGeometry(map, shapes, rings, segs, lift) {
    const pos = [], uv = [], idx = [], H = map.height;
    for (const sh of shapes) {
      const base = pos.length / 3, cr = Math.cos(sh.rot || 0), sr = Math.sin(sh.rot || 0);
      pos.push(sh.x, H(sh.x, sh.z) + lift, sh.z); uv.push(sh.x / 14, sh.z / 14);
      for (let r = 1; r <= rings; r++) for (let s = 0; s < segs; s++) {
        const a = s / segs * 6.2832, e = (sh.edge ? sh.edge(a) : 1) * (r / rings), lx = Math.cos(a) * sh.rx * e, lz = Math.sin(a) * sh.rz * e, x = sh.x + lx * cr - lz * sr, z = sh.z + lx * sr + lz * cr;
        pos.push(x, H(x, z) + lift + (r === rings ? -0.015 : 0), z); uv.push(x / 14, z / 14);
      }
      for (let s = 0; s < segs; s++) idx.push(base, base + 1 + (s + 1) % segs, base + 1 + s);
      for (let r = 1; r < rings; r++) for (let s = 0; s < segs; s++) {
        const a = base + 1 + (r - 1) * segs + s, b2 = base + 1 + (r - 1) * segs + (s + 1) % segs, c = a + segs, d = b2 + segs;
        idx.push(a, b2, c, b2, d, c);
      }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
  }
  function iceMaterials(tex, gl) {
    const base = new T.MeshPhongMaterial({ color: 0xC2EAF8, specular: 0xFFFFFF, shininess: 130, map: tex, transparent: true, opacity: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const glint = new T.MeshBasicMaterial({ map: gl, color: 0xFFFFFF, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    return { base, glint };
  }

  // ------------------------------------------------------------------ sky / clouds / mountains / cliffs
  function skyDome() {
    const g = new T.SphereGeometry(900, 24, 14), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const stops = [[-1, '#E4EDF5'], [0, '#DCE8F2'], [0.08, '#C9DAEA'], [0.3, '#A4BDD6'], [0.65, '#86A3C2'], [1, '#6D89AB']], cc = new T.Color(), c2 = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) / 900; let j = 0; while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
      const a = stops[j], b = stops[j + 1], u = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0]))); cc.set(a[1]); c2.set(b[1]); cc.lerp(c2, u); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })); m.renderOrder = -10; m.frustumCulled = false; return m;
  }
  function clouds(rng) {
    const b = B();
    for (let i = 0; i < 24; i++) {
      const a = rng.range(0, 6.28), r = rng.range(360, 760), y = rng.range(130, 230), cx = Math.cos(a) * r, cz = Math.sin(a) * r, k = rng.range(0.9, 1.6), n = rng.int(4, 6);
      for (let j = 0; j < n; j++) { const s = rng.range(28, 52) * k; b.add(G.sph(8, 6), { x: cx + (j - n / 2) * 38 * k + rng.range(-8, 8), y: y + rng.range(-5, 8), z: cz + rng.range(-20, 20), sx: s * 1.3, sy: s * 0.62, sz: s, color: j % 2 ? 0xDDE7F0 : 0xCAD7E4 }); }
      b.add(G.box1, { x: cx, y: y - 14 * k, z: cz, sx: n * 38 * k, sy: 5, sz: 40 * k, color: 0xA9B9CC });
    }
    const m = new T.Mesh(b.build(), new T.MeshBasicMaterial({ vertexColors: true, fog: false })); m.frustumCulled = false; return m;
  }
  function mountains(rng) {
    const b = B();
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 42; i++) {
      const a = (i / 42) * Math.PI * 2 + rng.range(-0.04, 0.04), r = (ring ? 730 : 590) + rng.range(-30, 60), h = rng.range(80, 190) * (ring ? 1.15 : 1), w = rng.range(160, 290), x = Math.cos(a) * r, z = Math.sin(a) * r, ry = rng.range(0, 3);
      b.add(G.cone(7), { x, y: h / 2 - 14, z, ry, sx: w, sy: h, sz: w * rng.range(0.7, 1), color: ring ? 0x8C9DB2 : 0x6F8198 });
      b.add(G.cone(7), { x, y: h * 0.69 - 14, z, ry, sx: w * 0.5, sy: h * 0.62, sz: w * 0.5, color: 0xF3F8FD });                       // snow cap
      b.add(G.cone(7), { x: x + rng.range(-40, 40), y: h * 0.3 - 14, z: z + rng.range(-40, 40), ry: rng.range(0, 3), sx: w * 0.85, sy: h * 0.6, sz: w * 0.85, color: ring ? 0xA3B3C6 : 0x8296AC });
    }
    for (let i = 0; i < 70; i++) { const a = rng.range(0, 6.28), r = rng.range(420, 540), s = rng.range(34, 60); b.add(G.cone(6), { x: Math.cos(a) * r, y: s * 0.5 - 8, z: Math.sin(a) * r, sx: s * 0.5, sy: s, sz: s * 0.5, color: pick(rng, [0x35564C, 0x2C4A42, 0x3D6054]) }); }   // far pine forest
    const m = new T.Mesh(b.build(), new T.MeshBasicMaterial({ vertexColors: true, fog: false })); m.frustumCulled = false; return m;
  }
  function cliffs(set, half, rng) {
    for (const sd of [[0, -1], [0, 1], [-1, 0], [1, 0]]) for (let t = -half - 20; t <= half + 20; t += 8.5) for (let layer = 0; layer < 2; layer++) {
      const out = half + 4 + layer * 9 + rng.range(0, 5), px = sd[0] === 0 ? t + rng.range(-2, 2) : sd[0] * out, pz = sd[1] === 0 ? t + rng.range(-2, 2) : sd[1] * out;
      const H = rng.range(10, 26) + layer * 6, w = rng.range(10, 15), d = rng.range(9, 14), sh = rng.range(0.78, 1);
      const col = (((0x7C * sh) | 0) << 16) | (((0x8E * sh) | 0) << 8) | ((0xA6 * sh) | 0);
      set.plain.add(G.box1, { x: px, y: H / 2 - 5, z: pz, ry: rng.range(-0.4, 0.4), rx: rng.range(-0.05, 0.05), rz: rng.range(-0.05, 0.05), sx: w, sy: H, sz: d, color: col });
      set.plain.add(G.box1, { x: px, y: H - 5 + 0.35, z: pz, ry: rng.range(-0.4, 0.4), sx: w * 1.0, sy: 1.8, sz: d * 1.0, color: SNOW });
      if (rng.chance(0.55)) set.plain.add(G.cone(5), { x: px + rng.range(-3, 3), y: H - 3, z: pz + rng.range(-3, 3), sx: 2.1, sy: 6.8, sz: 2.1, color: pick(rng, ICEC) });
    }
  }

  // ------------------------------------------------------------------ everything static + animated, called by WorldView.build
  function addScenery(map, group, scene, q) {
    const rng = R.create((map.seed ^ 0x77F5) | 0), half = map.half, CH = CFG.world.chunk, nC = Math.ceil(map.size / CH), chunks = [];
    for (let i = 0; i < nC * nC; i++) chunks.push(B());
    const at = (x, z) => chunks[Math.max(0, Math.min(nC - 1, Math.floor((z + half) / CH))) * nC + Math.max(0, Math.min(nC - 1, Math.floor((x + half) / CH)))];
    for (const o of map.pines) pine(at(o.x, o.z), o, rng);
    for (const o of map.rocks) snowRock(at(o.x, o.z), o, rng);
    for (const o of map.cabins) cabin(at(o.x, o.z), o, rng);
    for (const o of map.spikes) spike(at(o.x, o.z), o, rng);
    for (const o of map.drifts) drift(at(o.x, o.z), o);
    const mat = new T.MeshLambertMaterial({ vertexColors: true }), disposables = [];
    for (const b of chunks) if (!b.empty) { const m = new T.Mesh(b.build(), mat); m.castShadow = false; group.add(m); }
    const set = WZ.Props.newSet();
    for (const t of map.tents) WZ.Props.camp(set, t.x, t.z, map.height(t.x, t.z));
    WZ.Props.setMeshes(set, group);

    // ---- glossy ice: frozen lakes + ice patches in ONE merged mesh pair (Phong shine + animated additive glint)
    const tex = iceTex(), gl = glintTex(); disposables.push(tex, gl);
    const mats = iceMaterials(tex, gl);
    const shapes = [];
    for (const l of map.ice.lakes) shapes.push({ x: l.x, z: l.z, rx: l.rx, rz: l.rz, rot: l.rot, edge: (a) => map.ice.edge(l, a) });
    for (const p of map.ice.patches) shapes.push({ x: p.x, z: p.z, rx: p.r, rz: p.r * p.sq, rot: p.rot, edge: (a) => 1 + 0.07 * Math.sin(a * 3 + p.rot * 5) + 0.05 * Math.sin(a * 5 + p.x) });
    const lakeG = iceGeometry(map, shapes, 12, 56, 0.075);
    const iceM = new T.Mesh(lakeG, mats.base), glintM = new T.Mesh(lakeG, mats.glint); iceM.renderOrder = 1; glintM.renderOrder = 2; iceM.receiveShadow = false;
    group.add(iceM, glintM);
    // ---- dynamic patches (the Ice Beast leaves them behind): pooled meshes with their own geometry/material so each one can fade
    const patchPool = [], MAXP = CFG.frost.maxPatches;
    for (let i = 0; i < MAXP; i++) {
      const g = iceGeometry(map, [{ x: 0, z: 0, rx: 1, rz: 1, rot: 0 }], 4, 22, 0.1), m = new T.MeshPhongMaterial({ color: 0xC2EAF8, specular: 0xFFFFFF, shininess: 130, map: tex, transparent: true, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false });
      const mesh = new T.Mesh(g, m); mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 3; group.add(mesh); patchPool.push({ mesh, g, m, used: false });
    }
    const unit = patchPool[0].g.attributes.position.array.slice();
    function setPatch(slot, x, z, r) {
      const P = patchPool[slot], pa = P.g.attributes.position, ua = P.g.attributes.uv;
      for (let i = 0; i < pa.count; i++) {
        const lx = unit[i * 3] * r + x, lz = unit[i * 3 + 2] * r + z; pa.setXYZ(i, lx, map.height(lx, lz) + 0.1 + (i && i > pa.count - 23 ? -0.02 : 0), lz); ua.setXY(i, lx / 14, lz / 14);
      }
      pa.needsUpdate = true; ua.needsUpdate = true; P.g.computeBoundingSphere(); P.used = true; P.mesh.visible = true;
    }

    // ---- snowstorm: points that wrap around the camera; the gust makes them fly sideways and thicker
    const NS = [380, 620, 900][Math.max(0, Math.min(2, q))], sp = new Float32Array(NS * 3), sv = new Float32Array(NS), SX = 130, SY = 70;
    for (let i = 0; i < NS; i++) { sp[i * 3] = (Math.random() - 0.5) * SX; sp[i * 3 + 1] = Math.random() * SY; sp[i * 3 + 2] = (Math.random() - 0.5) * SX; sv[i] = 5 + Math.random() * 6; }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(new Float32Array(NS * 3), 3));
    const sm = new T.PointsMaterial({ size: 0.75, map: WZ.Assets.tex('soft'), transparent: true, depthWrite: false, opacity: 0.85, color: 0xFFFFFF, sizeAttenuation: true, fog: false });
    const snow = new T.Points(sg, sm); snow.frustumCulled = false; snow.renderOrder = 20; scene.add(snow);
    const baseNear = scene.fog ? scene.fog.near : 90, baseFar = scene.fog ? scene.fog.far : 330;
    let wind = 0;

    return {
      mat, patches: { set: setPatch, pool: patchPool },
      setPatchFade(slot, a) { patchPool[slot].m.opacity = a; },
      freePatch(slot) { const P = patchPool[slot]; P.used = false; P.mesh.visible = false; P.m.opacity = 0; },
      update(t, dt, cam) {
        gl.offset.set(Math.sin(t * 0.07) * 0.3 + t * 0.012, Math.cos(t * 0.05) * 0.3); mats.glint.opacity = 0.42 + 0.2 * Math.sin(t * 1.7);
        const gust = (WZ.Ice && WZ.Ice.gust) || 0;
        wind = U.damp(wind, 2.5 + 15 * gust, 2, dt);
        const arr = sg.attributes.position.array, cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
        for (let i = 0; i < NS; i++) {
          let x = sp[i * 3] + wind * dt, y = sp[i * 3 + 1] - sv[i] * dt * (1 + gust * 0.4), z = sp[i * 3 + 2] + wind * 0.25 * dt;
          if (y < 0) y += SY; if (x > SX / 2) x -= SX; if (z > SX / 2) z -= SX;
          sp[i * 3] = x; sp[i * 3 + 1] = y; sp[i * 3 + 2] = z;
          arr[i * 3] = cx + x; arr[i * 3 + 1] = cy - 28 + y; arr[i * 3 + 2] = cz + z;
        }
        sg.attributes.position.needsUpdate = true; sm.opacity = 0.75 + 0.2 * gust; sm.size = 0.7 + 0.45 * gust;
        if (scene.fog) { scene.fog.near = baseNear * (1 - 0.4 * gust); scene.fog.far = baseFar * (1 - gust * CFG.frost.gustFog); }
      },
      dispose() {
        scene.remove(snow); sg.dispose(); sm.dispose(); mat.dispose(); mats.base.dispose(); mats.glint.dispose(); disposables.forEach((x) => x.dispose());
        if (scene.fog) { scene.fog.near = baseNear; scene.fog.far = baseFar; }
      },
    };
  }

  // ====================================================================== ICE BEAST
  const FUR = [0xE3ECF5, 0xCBDAE8, 0xB4C7DB, 0x9FB4CB], DARKF = 0x2B3B54, ICEB = 0x9BE6FF, ICEB2 = 0x6CC8F5, EYE = 0x8FF6FF;
  let cache = null;
  function makeParts() {
    const leg = B(), legL = B(), torso = B(), torsoL = B(), arm = B(), armLv = B(), head = B(), headL = B();
    // ---- leg (pivot = hip, hangs down to y = -3.6)
    leg.add(G.ico(), { y: -1.35, sx: 1.55, sy: 1.8, sz: 1.5, ry: 0.4, color: FUR[0] });
    leg.add(G.ico(), { y: -2.7, sx: 1.45, sy: 1.25, sz: 1.5, ry: 1.1, color: FUR[1] });
    leg.add(rb(2.3, 0.9, 2.9, 0.35), { y: -3.2, z: 0.5, color: FUR[2] });
    for (const x of [-0.7, 0, 0.7]) leg.add(G.cone(4), { x, y: -3.35, z: 2.15, rx: Math.PI / 2, sx: 0.3, sy: 0.75, sz: 0.3, color: 0xF4FAFF });
    legL.add(G.cone(4), { x: 0.9, y: -1.5, z: 0.5, rz: -0.9, sx: 0.28, sy: 1.0, sz: 0.28, color: ICEB });
    // ---- torso (origin = hip centre): hunched, huge shoulders
    torso.add(rb(3.8, 1.3, 2.8, 0.5), { y: 0.45, color: FUR[2] });
    torso.add(G.ico(), { y: 2.55, sx: 3.2, sy: 2.4, sz: 2.6, ry: 0.5, color: FUR[0] });
    torso.add(G.ico(), { y: 3.75, z: -0.55, sx: 3.0, sy: 1.7, sz: 2.2, ry: 1.1, color: FUR[1] });                      // the hump
    torso.add(G.ico(), { y: 2.0, z: 1.7, sx: 2.0, sy: 1.6, sz: 1.0, ry: 0.2, color: DARKF });                         // dark belly patch
    for (const s of [1, -1]) {
      torso.add(G.ico(), { x: 3.15 * s, y: 4.15, sx: 1.9, sy: 1.5, sz: 1.75, ry: 0.7 * s, color: FUR[0] });
      torso.add(G.cone(5), { x: 3.2 * s, y: 5.35, z: -0.1, rz: -0.35 * s, sx: 0.6, sy: 2.1, sz: 0.6, color: ICEB });
      torso.add(G.cone(5), { x: 2.55 * s, y: 5.0, z: 0.7, rz: -0.6 * s, rx: 0.3, sx: 0.42, sy: 1.3, sz: 0.42, color: ICEB2 });
    }
    for (let i = 0; i < 6; i++) torso.add(G.cone(5), { x: (i % 2 ? 0.3 : -0.3), y: 2.5 + i * 0.7, z: -2.05 - (i === 2 ? 0.25 : 0), rx: -0.75, sx: 0.58, sy: 1.7 - Math.abs(i - 2.5) * 0.22, sz: 0.58, color: i % 2 ? ICEB : ICEB2 });  // crystal spine
    for (let i = 0; i < 7; i++) { const a = i * 0.9; torso.add(G.cone(4), { x: Math.cos(a) * 2.3, y: 1.2 + (i % 3) * 0.9, z: Math.sin(a) * 1.9, rx: Math.sin(a) * 0.8, rz: -Math.cos(a) * 0.8, sx: 0.35, sy: 0.95, sz: 0.35, color: FUR[3] }); }       // fur tufts
    torsoL.add(rb(1.8, 0.16, 0.2, 0.04), { y: 2.7, z: 2.05, color: ICEB }); torsoL.add(rb(0.16, 1.5, 0.2, 0.04), { y: 2.7, z: 2.05, color: ICEB });
    torsoL.add(G.cone(4), { y: 2.7, z: 2.15, rx: Math.PI / 2, sx: 0.5, sy: 0.6, sz: 0.5, color: EYE });
    // ---- head
    head.add(G.ico(), { y: 0.0, z: 0.1, sx: 1.35, sy: 1.1, sz: 1.3, ry: 0.3, color: FUR[0] });
    head.add(rb(2.1, 0.45, 0.7, 0.14), { y: 0.55, z: 1.05, color: FUR[3] });                                         // heavy brow
    head.add(rb(1.7, 0.7, 1.2, 0.25), { y: -0.65, z: 0.8, color: DARKF });                                           // muzzle
    for (const s of [1, -1]) {
      head.add(G.cone(4), { x: 0.55 * s, y: -1.2, z: 1.3, rx: 0.15, rz: 0.1 * s, sx: 0.3, sy: 1.5, sz: 0.3, color: 0xF4FAFF });   // tusks
      head.add(G.cone(5), { x: 0.9 * s, y: 1.0, z: -0.1, rz: -0.6 * s, sx: 0.4, sy: 2.0, sz: 0.4, color: ICEB });         // horns
      head.add(G.cone(4), { x: 1.35 * s, y: 0.2, z: 0.2, rz: -1.25 * s, sx: 0.24, sy: 1.0, sz: 0.24, color: ICEB2 });
    }
    headL.add(rb(0.5, 0.2, 0.12, 0.04), { x: 0.52, y: 0.28, z: 1.38, rz: -0.25, color: EYE }); headL.add(rb(0.5, 0.2, 0.12, 0.04), { x: -0.52, y: 0.28, z: 1.38, rz: 0.25, color: EYE });
    // ---- arm (pivot = shoulder, hangs to the fist at y ~ -5.2)
    arm.add(G.ico(), { y: -1.5, sx: 1.25, sy: 1.8, sz: 1.2, ry: 0.5, color: FUR[0] });
    arm.add(G.ico(), { y: -3.2, sx: 1.3, sy: 1.5, sz: 1.3, ry: 1.0, color: FUR[1] });
    arm.add(G.ico(), { y: -4.9, sx: 1.8, sy: 1.5, sz: 1.7, ry: 0.2, color: FUR[2] });
    for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.55; arm.add(G.cone(4), { x: Math.sin(a) * 1.3, y: -5.1, z: Math.cos(a) * 1.3, rx: Math.PI / 2, sx: 0.3, sy: 0.75, sz: 0.3, color: ICEB }); }
    armLv.add(G.cone(4), { x: 0.9, y: -2.4, z: 0.4, rz: -0.8, sx: 0.26, sy: 0.9, sz: 0.26, color: ICEB2 });
    const out = { leg: leg.build(), legL: legL.build(), torso: torso.build(), torsoL: torsoL.build(), arm: arm.build(), armL: armLv.build(), head: head.build(), headL: headL.build() };
    for (const k in out) G.mark(out[k]);
    return out;
  }
  let sphG = null;
  function rig(mat, variant) {
    if (!cache) cache = makeParts();
    void variant;
    const P = cache, root = new T.Group(), body = new T.Group(); root.add(body);
    const glowMat = new T.MeshBasicMaterial({ vertexColors: true, fog: false });
    const mesh = (g, parent, x, y, z, cast, lit) => { const gr = new T.Group(); gr.position.set(x, y, z); const m = new T.Mesh(g, mat); m.castShadow = !!cast; gr.add(m); if (lit) gr.add(new T.Mesh(lit, glowMat)); parent.add(gr); return gr; };
    const legL = mesh(P.leg, body, 1.2, 3.6, 0, true, P.legL), legR = mesh(P.leg, body, -1.2, 3.6, 0, true, null);
    const torso = mesh(P.torso, body, 0, 3.6, 0, true, P.torsoL);
    const armL = mesh(P.arm, torso, 3.2, 4.0, 0, false, P.armL), armR = mesh(P.arm, torso, -3.2, 4.0, 0, true, null);
    const head = mesh(P.head, torso, 0, 5.35, 0.7, true, P.headL);
    if (!sphG) sphG = G.mark(new T.SphereGeometry(1, 12, 9));
    const glowM = new T.MeshBasicMaterial({ color: 0x8FEFFF, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    const glow = new T.Mesh(sphG, glowM); glow.position.set(0, 2.7, 2.1); glow.scale.setScalar(0.001); glow.frustumCulled = false; glow.renderOrder = 18; torso.add(glow);
    return { root, body, legL, legR, torso, armL, armR, head, glow, core: glow, v: 0, dispose() { glowMat.dispose(); glowM.dispose(); } };
  }

  /** animate one Ice Beast. g = guardian record (mv, walk, swing, ch/chT: 1 wind-up, 2 dash, 3 recover; flash, id, mode, dying), C = its stats */
  function pose(g, C, t, dt) {
    const Rg = g.rig, id = g.id, w = g.walk, am = Math.min(1, g.mv / C.speed), CH = C.charge, dash = g.ch === 2;
    const amp = dash ? 0.95 : 0.6;
    Rg.legL.rotation.x = Math.sin(w) * amp * Math.min(1.3, am); Rg.legR.rotation.x = -Math.sin(w) * amp * Math.min(1.3, am);
    Rg.body.position.y = Math.abs(Math.sin(w)) * (dash ? 0.6 : 0.3) * Math.min(1.3, am) + Math.sin(t * 1.4 + id) * 0.05; Rg.body.rotation.z = Math.sin(w) * 0.05 * am;
    let aR = -0.2 + Math.sin(w) * 0.4 * am + Math.sin(t * 1.5 + id) * 0.03, aL = -0.2 - Math.sin(w) * 0.4 * am, lean = 0, k = 8, gl = g.mode === 1 ? 0.1 : 0, hd = 0;
    if (g.swing > 0) {                                           // SMASH: both fists overhead, then down
      if (g.swing < C.windup) { const u = U.smooth(0, 1, g.swing / C.windup); aR = aL = -2.9 * u; lean = -0.28 * u; k = 12; gl = 0.25 + 0.5 * u; hd = -0.3 * u; }
      else { aR = aL = -0.25; lean = 0.5; k = 40; gl = 0.3; }
    } else if (g.ch === 1) {                                     // CHARGE wind-up: rears back, scrapes a foot, the chest glows (the telegraph)
      const u = U.smooth(0, 1, g.chT / CH.windup); aR = -2.2 * u; aL = -2.0 * u; lean = -0.4 * u; k = 10; gl = 0.25 + 0.75 * u; hd = -0.45 * u;
      Rg.legR.rotation.x = -0.6 * u - Math.max(0, Math.sin(t * 22)) * 0.5 * u;
    } else if (dash) {                                           // DASH: head down, both arms pumping
      aR = -1.0 + Math.sin(t * 17) * 0.8; aL = -1.0 - Math.sin(t * 17) * 0.8; lean = 0.62; k = 22; gl = 0.55; hd = 0.4;
    } else if (g.ch === 3) {                                     // recover: panting
      aR = aL = -0.1; lean = 0.32 + Math.sin(t * 11) * 0.04; k = 8; gl = 0.1; hd = 0.25;
    }
    g.armK = U.damp(g.armK == null ? -0.2 : g.armK, aR, k, dt); g.armLK = U.damp(g.armLK == null ? -0.2 : g.armLK, aL, k, dt); g.leanK = U.damp(g.leanK || 0, lean, k, dt); g.gl = U.damp(g.gl || 0, gl, 9, dt); g.hdK = U.damp(g.hdK || 0, hd, 10, dt);
    Rg.armR.rotation.x = g.armK; Rg.armR.rotation.z = 0.14; Rg.armL.rotation.x = g.armLK; Rg.armL.rotation.z = -0.14;
    Rg.torso.rotation.x = g.leanK; Rg.torso.rotation.y = g.swing > 0 && g.swing < C.windup ? Math.sin(g.swing / C.windup * 1.6) * 0.22 : 0; Rg.head.rotation.x = g.hdK;
    const gs = g.gl * 2.6 * (0.85 + 0.15 * Math.sin(t * 14)); Rg.glow.scale.setScalar(Math.max(0.001, gs)); Rg.glow.material.opacity = Math.min(0.9, 0.2 + g.gl);
    // snow puffs while charging, ice dust while walking
    const P = WZ.Particles;
    if (P && P.ready && !g.dying) {
      g.emT = (g.emT || 0) - dt;
      if (dash && g.emT <= 0) { g.emT = 0.03; const sn = Math.sin(g.rig.root.rotation.y), cs = Math.cos(g.rig.root.rotation.y); P.emit(0, g.rx - sn * 2.4 + (Math.random() - 0.5) * 2.4, g.ry + 0.6, g.rz - cs * 2.4 + (Math.random() - 0.5) * 2.4, -sn * 4 + (Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, -cs * 4 + (Math.random() - 0.5) * 3, 0.8, 1.4, 4.2, 0.95, 0.97, 1, 0.55, 0, -2, 0.6); }
      else if (g.mv > 1 && g.emT <= 0) { g.emT = 0.2; P.emit(0, g.rx + (Math.random() - 0.5) * 2, g.ry + 0.4, g.rz + (Math.random() - 0.5) * 2, 0, 1.2, 0, 0.7, 1.0, 2.6, 0.92, 0.95, 1, 0.4, 0, -1, 0.5); }
    }
  }

  WZ.Froze = { paintGround, addScenery, skyDome, clouds, mountains, cliffs, grassColors };
  WZ.FrostArt = { rig, pose };
})(window.WZ = window.WZ || {});
