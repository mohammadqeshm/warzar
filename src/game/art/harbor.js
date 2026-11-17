/* WZ.Harbo — procedural art for the SUNKEN HARBOR map (used by WZ.WorldView when map.theme === 'harbor'):
 *   baked ground (asphalt yards, painted lanes, quay road, weathered concrete piers, hazard-striped broken decks, shore glow), merged scenery (corrugated CONTAINER stacks,
 *   warehouses, fuel tanks, jersey barriers, STS gantry cranes on the quay, curb walls along the water, broken-deck rims with barricades + amber beacons), sunken / beached
 *   SHIPS, an animated SEA, an overcast sky, hazy islands, clouds and a container-wall border.
 *   WZ.Harbo.crane(map, c, parent) -> the TOWER CRANE rig (mast + slewing jib + trolley + cable + hanging container); WZ.Harbor (systems/harbor.js) moves it.
 * Everything is vertex-coloured Lambert merged per chunk, so the whole port is ~15 draw calls. */
(function (WZ) {
  'use strict';
  const T = THREE, G = WZ.Geo, R = WZ.RNG, U = WZ.U, rb = G.rbox, CFG = WZ.CFG, HC = CFG.maps.harbor;
  const B = () => new G.Builder();
  const pick = (rng, arr) => arr[(rng.next() * arr.length) | 0];
  const CONT = [0xA8432F, 0x35607F, 0x3F7A52, 0xC9772E, 0xD6B038, 0x7C8A8F, 0xDADDD8, 0x7A4B33, 0x8E3B3B, 0x2F5D6E, 0xB3563A, 0x4A6D8C];
  const STEEL = 0x6E7A80, STEEL_D = 0x4D575C, RUST = 0x8A4B3A, YEL = 0xE8B71A, BLK = 0x1E2124, CONC = 0x9A9F9F, CONC_D = 0x767C7E, WHITE = 0xE6E8E4, ORANGE = 0xE0602A;
  const LOAD_L = 12.2, LOAD_W = 2.44, LOAD_H = 2.55;

  function canvas(n, m) { const c = document.createElement('canvas'); c.width = n; c.height = m || n; return c; }
  // ------------------------------------------------------------------ textures
  function ribTex() {
    const c = canvas(128), g = c.getContext('2d'), rng = R.mulberry32(0xC07A);
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x += 8) { const gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, 'rgba(0,0,0,.22)'); gr.addColorStop(0.45, 'rgba(255,255,255,.0)'); gr.addColorStop(0.7, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,.22)'); g.fillStyle = gr; g.fillRect(x, 0, 8, 128); }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, 128, 7); g.fillRect(0, 121, 128, 7);
    for (let i = 0; i < 18; i++) { const x = rng() * 128, w = 1 + rng() * 3, h = 20 + rng() * 80, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(110,50,20,.0)'); gr.addColorStop(0.5, 'rgba(110,50,20,.22)'); gr.addColorStop(1, 'rgba(110,50,20,0)'); g.fillStyle = gr; g.save(); g.translate(x, rng() * 70); g.fillRect(0, 0, w, h); g.restore(); }   // rust streaks
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
  }
  function seaTex() {
    const c = canvas(256), g = c.getContext('2d'), rng = R.mulberry32(0x5EA);
    g.fillStyle = '#6FB6CC'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) { const x = rng() * 256, y = rng() * 256, r = 20 + rng() * 50, gr = g.createRadialGradient(x, y, 0, x, y, r); const k = rng() < 0.5; gr.addColorStop(0, k ? 'rgba(255,255,255,.18)' : 'rgba(20,70,110,.2)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.lineCap = 'round';
    for (let i = 0; i < 90; i++) { const x = rng() * 256, y = rng() * 256, l = 10 + rng() * 26; g.strokeStyle = 'rgba(255,255,255,' + (0.18 + rng() * 0.25) + ')'; g.lineWidth = 1 + rng() * 1.6; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 2 - rng() * 3, x + l, y); g.stroke(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
  }
  function glintTex() {
    const c = canvas(256), g = c.getContext('2d'), rng = R.mulberry32(0x61A7);
    g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) { const x = rng() * 256, y = rng() * 256, w = 5 + rng() * 14, rg = g.createRadialGradient(x, y, 0, x, y, w); rg.addColorStop(0, 'rgba(255,255,255,' + (0.35 + rng() * 0.5) + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.save(); g.translate(x, y); g.scale(1, 0.28); g.translate(-x, -y); g.fillStyle = rg; g.fillRect(x - w, y - w, w * 2, w * 2); g.restore(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }

  // ------------------------------------------------------------------ ground splat
  function paintGround(map, SPLAT, SPAN, hexA) {
    const c = canvas(SPLAT), g = c.getContext('2d'), rng = R.mulberry32((map.seed ^ 0x4A12B) >>> 0), k = SPLAT / SPAN, px = (x) => (x + SPAN / 2) * k, pz = (z) => (z + SPAN / 2) * k, half = map.half, Qx = map.quayX;
    // sea bed
    g.fillStyle = '#1D5266'; g.fillRect(0, 0, SPLAT, SPLAT);
    for (let i = 0; i < 90; i++) { const x = rng() * SPLAT, y = rng() * SPLAT, r = 40 + rng() * 90, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rng() < 0.5 ? 'rgba(46,120,140,.35)' : 'rgba(12,40,56,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    // land + piers (with a glowing shallow band around them)
    const land = [[-half - 4, -half - 4, Qx, half + 4]]; for (const p of map.piers) land.push([Qx - 2, p.z0, Qx + p.L, p.z1]);
    const rects = (fill) => { g.fillStyle = fill; for (const r of land) g.fillRect(px(r[0]), pz(r[1]), (r[2] - r[0]) * k, (r[3] - r[1]) * k); };
    g.save(); g.shadowColor = 'rgba(110,205,210,.95)'; g.shadowBlur = 26; rects('#7A8083'); g.restore();
    g.save(); g.shadowColor = 'rgba(200,240,240,.9)'; g.shadowBlur = 7; rects('#7A8083'); g.restore();
    // concrete variation
    g.save(); g.beginPath(); for (const r of land) g.rect(px(r[0]), pz(r[1]), (r[2] - r[0]) * k, (r[3] - r[1]) * k); g.clip();
    const cols = ['#868B8D', '#6F7578', '#8C9091', '#767B7E', '#7F7A70', '#6C7376'];
    for (let i = 0; i < 200; i++) { const x = rng() * SPLAT, y = rng() * SPLAT, r = 24 + rng() * 80, col = cols[(rng() * cols.length) | 0], gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hexA(col, 0.6)); gr.addColorStop(1, hexA(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    // quay road + expansion joints
    g.fillStyle = 'rgba(52,58,62,.55)'; g.fillRect(px(Qx - 15), pz(-half), 12.5 * k, 2 * half * k);
    g.setLineDash([16, 12]); g.strokeStyle = 'rgba(224,196,70,.75)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(px(Qx - 8.7), pz(-half)); g.lineTo(px(Qx - 8.7), pz(half)); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(235,235,225,.7)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(px(Qx - 2.8), pz(-half)); g.lineTo(px(Qx - 2.8), pz(half)); g.stroke();
    g.strokeStyle = 'rgba(40,46,50,.4)'; g.lineWidth = 1.2;
    for (const p of map.piers) { for (let x = Qx + 6; x < Qx + p.L; x += 6) { g.beginPath(); g.moveTo(px(x), pz(p.z0)); g.lineTo(px(x), pz(p.z1)); g.stroke(); } g.beginPath(); g.moveTo(px(Qx), pz(p.zc)); g.lineTo(px(Qx + p.L), pz(p.zc)); g.setLineDash([10, 9]); g.strokeStyle = 'rgba(224,196,70,.55)'; g.lineWidth = 2; g.stroke(); g.setLineDash([]); g.strokeStyle = 'rgba(40,46,50,.4)'; g.lineWidth = 1.2; }
    // yards: dark asphalt, lane centre lines
    for (const y of map.yards) {
      g.fillStyle = 'rgba(46,51,55,.82)'; g.fillRect(px(y.x0 - 5), pz(y.z0 - 5), (y.x1 - y.x0 + 10) * k, (y.z1 - y.z0 + 10) * k);
      g.strokeStyle = 'rgba(224,196,70,.5)'; g.lineWidth = 1.8; g.setLineDash([9, 8]);
      for (const l of map.lanes) { if (l.axis === 'z' ? (l.x < y.x0 || l.x > y.x1 || l.a > y.z1 || l.b < y.z0) : (l.z < y.z0 || l.z > y.z1 || l.a > y.x1 || l.b < y.x0)) continue; g.beginPath(); if (l.axis === 'z') { g.moveTo(px(l.x), pz(l.a)); g.lineTo(px(l.x), pz(l.b)); } else { g.moveTo(px(l.a), pz(l.z)); g.lineTo(px(l.b), pz(l.z)); } g.stroke(); }
      g.setLineDash([]);
    }
    // crane pads
    for (const cr of map.cranes) { g.strokeStyle = 'rgba(232,183,26,.85)'; g.lineWidth = 3; g.strokeRect(px(cr.x - 3.4), pz(cr.z - 3.4), 6.8 * k, 6.8 * k); g.fillStyle = 'rgba(30,33,36,.5)'; g.fillRect(px(cr.hx - cr.hhw - 0.8), pz(cr.hz - cr.hhd - 0.8), (cr.hhw * 2 + 1.6) * k, (cr.hhd * 2 + 1.6) * k); g.setLineDash([8, 6]); g.strokeStyle = 'rgba(235,235,225,.7)'; g.lineWidth = 2; g.strokeRect(px(cr.hx - cr.hhw - 0.8), pz(cr.hz - cr.hhd - 0.8), (cr.hhw * 2 + 1.6) * k, (cr.hhd * 2 + 1.6) * k); g.setLineDash([]); }
    // start pad + extraction marking
    const s = map.start; g.fillStyle = 'rgba(46,51,55,.7)'; g.fillRect(px(s.x - 13), pz(s.z - 9), 26 * k, 18 * k);
    g.setLineDash([14, 10]); g.strokeStyle = 'rgba(235,235,225,.75)'; g.lineWidth = 3; g.strokeRect(px(s.x - 12), pz(s.z - 8), 24 * k, 16 * k); g.setLineDash([]);
    if (map.extract) { g.beginPath(); g.arc(px(map.extract.x), pz(map.extract.z), map.extract.r * k, 0, 7); g.fillStyle = 'rgba(70,160,100,.22)'; g.fill(); g.strokeStyle = 'rgba(235,235,225,.7)'; g.lineWidth = 4; g.stroke(); }
    // stains: oil, puddles, rust, cracks
    for (let i = 0; i < 130; i++) { const x = rng() * SPLAT, y = rng() * SPLAT, r = 4 + rng() * 14, gr = g.createRadialGradient(x, y, 0, x, y, r), t = rng(); gr.addColorStop(0, t < 0.45 ? 'rgba(20,22,24,.45)' : t < 0.8 ? 'rgba(120,170,190,.38)' : 'rgba(120,60,30,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.strokeStyle = 'rgba(25,28,30,.4)'; g.lineWidth = 1; g.lineJoin = 'round';
    for (let i = 0; i < 90; i++) { let x = rng() * SPLAT, y = rng() * SPLAT, a = rng() * 6.28; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { a += (rng() - 0.5) * 1.3; x += Math.cos(a) * (6 + rng() * 14); y += Math.sin(a) * (6 + rng() * 14); g.lineTo(x, y); } g.stroke(); }
    // baked contact shadows (light from the top-left: shadows fall toward +x,+z)
    for (const st of map.stacks) { const o = st.t * 2.6 * 0.5; g.fillStyle = 'rgba(14,20,26,.2)'; g.fillRect(px(st.x - st.sx / 2 + o * 0.6), pz(st.z - st.sz / 2 + o * 0.6), (st.sx + o * 0.4) * k, (st.sz + o * 0.4) * k); }
    for (const b of map.blocks) { g.fillStyle = 'rgba(10,14,18,.3)'; g.fillRect(px(b.x - b.hw - 0.6), pz(b.z - b.hd - 0.6), (b.hw * 2 + 1.8) * k, (b.hd * 2 + 1.8) * k); }
    for (const sh of map.sheds) { g.fillStyle = 'rgba(10,14,18,.35)'; g.fillRect(px(sh.x - sh.w / 2 - 0.6 + 3), pz(sh.z - sh.d / 2 - 0.6 + 3), (sh.w + 1.2) * k, (sh.d + 1.2) * k); }
    for (const tk of map.tanks) { const gr = g.createRadialGradient(px(tk.x + 2), pz(tk.z + 2), 0, px(tk.x + 2), pz(tk.z + 2), (tk.r + 3) * k); gr.addColorStop(0, 'rgba(10,14,18,.5)'); gr.addColorStop(1, 'rgba(10,14,18,0)'); g.fillStyle = gr; g.beginPath(); g.arc(px(tk.x + 2), pz(tk.z + 2), (tk.r + 3) * k, 0, 7); g.fill(); }
    for (const t of map.tents) { const gr = g.createRadialGradient(px(t.x + 1), pz(t.z + 1), 0, px(t.x + 1), pz(t.z + 1), 5 * k); gr.addColorStop(0, 'rgba(10,14,18,.5)'); gr.addColorStop(1, 'rgba(10,14,18,0)'); g.fillStyle = gr; g.beginPath(); g.arc(px(t.x + 1), pz(t.z + 1), 5 * k, 0, 7); g.fill(); }
    for (const sm of map.smalls) { const gr = g.createRadialGradient(px(sm.x + 0.5), pz(sm.z + 0.5), 0, px(sm.x + 0.5), pz(sm.z + 0.5), 1.2 * k); gr.addColorStop(0, 'rgba(10,14,18,.4)'); gr.addColorStop(1, 'rgba(10,14,18,0)'); g.fillStyle = gr; g.beginPath(); g.arc(px(sm.x + 0.5), pz(sm.z + 0.5), 1.2 * k, 0, 7); g.fill(); }
    for (const sh of map.ships) if (sh.beached) { const al = Math.abs(Math.sin(sh.yaw)) > 0.5; g.fillStyle = 'rgba(10,14,18,.4)'; g.fillRect(px(sh.x - (al ? sh.len : sh.wid) / 2 + 2), pz(sh.z - (al ? sh.wid : sh.len) / 2 + 2), (al ? sh.len : sh.wid) * k, (al ? sh.wid : sh.len) * k); }
    // broken decks: the collapsed rectangle (dark water) with a yellow / black hazard rim
    for (const h of map.holes) {
      const x0 = px(h.x0), z0 = pz(h.z0), w = (h.x1 - h.x0) * k, d = (h.z1 - h.z0) * k, m = 2.6 * k;
      g.save(); g.beginPath(); g.rect(x0 - m, z0 - m, w + m * 2, d + m * 2); g.rect(x0, z0, w, d); g.clip('evenodd');
      g.fillStyle = '#E8B71A'; g.fillRect(x0 - m, z0 - m, w + m * 2, d + m * 2); g.fillStyle = '#1E2124';
      for (let i = -d - m * 2; i < w + d + m * 4; i += 14) { g.beginPath(); g.moveTo(x0 - m + i, z0 - m); g.lineTo(x0 - m + i + 7, z0 - m); g.lineTo(x0 - m + i + 7 - d - m * 2, z0 + d + m); g.lineTo(x0 - m + i - d - m * 2, z0 + d + m); g.fill(); }
      g.restore();
      g.fillStyle = '#143F52'; g.fillRect(x0, z0, w, d);
    }
    // sea shore foam
    g.strokeStyle = 'rgba(235,250,250,.55)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(px(Qx), pz(-half - 4)); g.lineTo(px(Qx), pz(half + 4)); g.stroke();
    g.restore();
    for (let i = 0; i < 20000; i++) { g.fillStyle = rng() < 0.5 ? 'rgba(20,24,26,.22)' : 'rgba(210,214,214,.16)'; g.fillRect(rng() * SPLAT, rng() * SPLAT, 1 + rng() * 1.4, 1 + rng() * 1.4); }
    const t = new T.CanvasTexture(c); t.anisotropy = 8; return t;
  }

  // ------------------------------------------------------------------ scenery pieces
  function shed(b, o, rng) {
    const { x, z, w, d, h } = o, gy = 0.45, wall = [0x8A4B3A, 0x5E7A8A, 0x9A8458][o.v % 3], ang = 0;
    b.base = new T.Matrix4().compose(new T.Vector3(x, gy, z), new T.Quaternion().setFromEuler(new T.Euler(0, ang, 0)), new T.Vector3(1, 1, 1));
    b.add(rb(w, h, d, 0.15), { y: h / 2, color: wall });
    b.add(rb(w + 0.5, 0.5, d + 0.5, 0.1), { y: 0.2, color: CONC_D });
    const rise = d * 0.22; b.add(G.prism(w + 1.2, d + 1.0, rise), { y: h, color: 0x59636A }); b.add(G.prism(w + 1.3, d + 1.1, rise * 0.15), { y: h + rise * 0.02, color: 0x3C444A });
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) b.add(G.box1, { x: -w / 2 + (i + 0.5) * w / 4, y: h * 0.72, z: s * (d / 2 + 0.06), sx: w / 4 - 1.4, sy: 1.0, sz: 0.12, color: 0x203038 });
    b.add(G.box1, { x: -w * 0.18, y: 2.6, z: d / 2 + 0.08, sx: 5.4, sy: 5.2, sz: 0.16, color: 0x2C3236 }); b.add(G.box1, { x: w * 0.2, y: 2.6, z: d / 2 + 0.08, sx: 5.4, sy: 5.2, sz: 0.16, color: 0x383E42 });
    for (let i = 0; i < 3; i++) b.add(G.box1, { x: rng.range(-w * 0.3, w * 0.3), y: h + rise * 0.4, z: rng.range(-d * 0.2, d * 0.2), rz: rng.range(-0.1, 0.1), sx: rng.range(2, 4), sy: 0.12, sz: rng.range(1.5, 2.6), color: 0x1B2024 });   // holes in the roof
    b.base = null;
  }
  function tank(b, o) {
    const gy = 0.45, r = o.r, h = o.h, col = [0xBFC4C2, 0x9AA3A6, 0xA5705A][o.v % 3];
    b.add(G.cyl(18), { x: o.x, y: gy + h / 2, z: o.z, sx: r, sy: h, sz: r, color: col });
    b.add(G.cyl(18), { x: o.x, y: gy + 0.4, z: o.z, sx: r + 0.4, sy: 0.8, sz: r + 0.4, color: CONC_D });
    for (const q of [0.3, 0.62, 0.92]) b.add(G.cyl(18), { x: o.x, y: gy + h * q, z: o.z, sx: r + 0.12, sy: 0.3, sz: r + 0.12, color: 0x555E63 });
    b.add(G.sph(14, 8), { x: o.x, y: gy + h, z: o.z, sx: r, sy: r * 0.32, sz: r, color: col });
    b.add(G.box1, { x: o.x + r * 0.8, y: gy + h * 0.5, z: o.z, sx: 0.3, sy: h, sz: 0.9, color: STEEL_D });
    b.add(G.cyl(8), { x: o.x - r - 0.8, y: gy + 1.2, z: o.z, rz: Math.PI / 2, sx: 0.35, sy: r * 0.5, sz: 0.35, color: 0x7A3A2A });
    b.add(G.box1, { x: o.x, y: gy + h * 0.55, z: o.z + r * 0.4, sx: r * 0.9, sy: h * 0.18, sz: r * 0.6, color: 0x8A4B3A, ry: 0.4 });   // rust stain patch
  }
  function barrier(b, o) {
    const al = o.ry ? 0 : 1; b.add(G.box1, { x: o.x, y: 0.45 + 0.55, z: o.z, sx: al ? 3.2 : 1.2, sy: 1.1, sz: al ? 1.2 : 3.2, color: CONC });
    b.add(G.box1, { x: o.x, y: 0.45 + 1.12, z: o.z, sx: al ? 3.0 : 0.9, sy: 0.14, sz: al ? 0.9 : 3.0, color: YEL });
  }
  /** a ship hull in its own local space (bow = +z). `s` = { len, wid, v, big } */
  function shipParts(b, s, rng) {
    const L = s.len, Wd = s.wid, hullCol = [0x34414A, 0x4A3A34, 0x2F4A44][(s.v || 0) % 3], sup = [0xCFD3CF, 0xC9C3B0, 0xD7B98A][(s.v || 0) % 3];
    b.add(rb(Wd, 3.6, L * 0.8, 0.7), { y: 0.2, color: 0x7A2E26 });
    b.add(rb(Wd * 1.02, 3.2, L * 0.8, 0.5), { y: 3.5, color: hullCol });
    b.add(G.cone(4), { y: 1.9, z: L * 0.4 + L * 0.1, rx: Math.PI / 2, ry: Math.PI / 4, sx: Wd * 0.72, sy: L * 0.2, sz: Wd * 0.42, color: hullCol });
    b.add(G.cone(4), { y: -0.2, z: L * 0.4 + L * 0.1, rx: Math.PI / 2, ry: Math.PI / 4, sx: Wd * 0.7, sy: L * 0.2, sz: Wd * 0.38, color: 0x7A2E26 });
    b.add(rb(Wd * 0.95, 0.5, L * 0.82, 0.1), { y: 5.2, color: 0x6B7378 });
    b.add(rb(Wd * 0.7, 6.5, 7.5, 0.4), { y: 8.7, z: -L * 0.3, color: sup });
    b.add(rb(Wd * 0.75, 1.1, 8.2, 0.2), { y: 12.2, z: -L * 0.3, color: 0x3A464C });
    b.add(G.box1, { y: 9.6, z: -L * 0.3 + 3.8, sx: Wd * 0.62, sy: 1.1, sz: 0.12, color: 0x1D3A4A });
    b.add(G.cyl(10), { y: 12.4, z: -L * 0.36, sx: 1.7, sy: 5.0, sz: 2.6, color: 0xB5422B }); b.add(G.cyl(10), { y: 14.7, z: -L * 0.36, sx: 1.75, sy: 0.9, sz: 2.65, color: BLK });
    b.add(G.cyl(5), { y: 15, z: L * 0.12, sx: 0.28, sy: 9, sz: 0.28, color: STEEL_D }); b.add(G.box1, { y: 18, z: L * 0.12, sx: 5, sy: 0.22, sz: 0.22, color: STEEL_D });
    for (let i = 0; i < 3; i++) b.add(rb(Wd * 0.62, 0.35, 5.5, 0.1), { y: 5.6, z: L * 0.05 + i * 8.5 - 4, color: 0x56605F });
    const n = s.big ? 3 : 2;
    for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) for (const t of (s.big ? [0, 1, 2] : [0, 1])) b.add(G.box1, { x: (k - 0.5) * 3.0, y: 6.4 + t * 2.62, z: L * 0.08 + i * 12.6 - 6, sx: 2.5, sy: 2.55, sz: 12.0, color: pick(rng, CONT) });
    b.add(G.box1, { y: 8.6, z: L * 0.22, sx: 0.5, sy: 7, sz: 0.5, rx: -0.5, color: YEL }); b.add(G.box1, { y: 11.5, z: L * 0.3, sx: 0.4, sy: 0.4, sz: 7, rx: 0.5, color: YEL });
    for (let i = 0; i < 5; i++) b.add(G.box1, { x: (rng.next() - 0.5) * Wd * 0.9, y: 3.5 + rng.range(-1, 1), z: (rng.next() - 0.5) * L * 0.7, sx: rng.range(1, 3), sy: rng.range(1.5, 3.5), sz: 0.12, color: 0x6B3626 });   // rust streaks
  }
  function ship(b, s, rng, y) {
    const e = new T.Euler(s.pitch || 0, s.yaw || 0, s.tilt || 0, 'YXZ'), q = new T.Quaternion().setFromEuler(e);
    b.base = new T.Matrix4().compose(new T.Vector3(s.x, y, s.z), q, new T.Vector3(1, 1, 1));
    shipParts(b, s, rng); b.base = null;
  }
  /** STS gantry crane on the quay (decor): 4 legs, portal beams, a boom raised over the water, a hanging cab */
  function gantry(b, gx) {
    const legs = gx.legs, cx = gx.x, cz = gx.z, Hh = 21, col = [0xCBD2D4, 0xD3C7A8, 0xA9BCC8][gx.v % 3];
    for (const l of legs) { b.add(rb(1.5, Hh, 1.5, 0.15), { x: l[0], y: 0.45 + Hh / 2, z: l[1], color: col }); b.add(rb(2.2, 0.7, 2.2, 0.1), { x: l[0], y: 0.8, z: l[1], color: YEL }); }
    for (const yy of [7, 14]) { b.beam(legs[0][0], yy, legs[0][1], legs[1][0], yy, legs[1][1], 0.7, 0.7, STEEL); b.beam(legs[2][0], yy, legs[2][1], legs[3][0], yy, legs[3][1], 0.7, 0.7, STEEL); b.beam(legs[0][0], yy, legs[0][1], legs[2][0], yy, legs[2][1], 0.6, 0.6, STEEL); b.beam(legs[1][0], yy, legs[1][1], legs[3][0], yy, legs[3][1], 0.6, 0.6, STEEL); }
    b.beam(legs[0][0], 0.9, legs[0][1], legs[1][0], 14, legs[1][1], 0.35, 0.35, STEEL_D); b.beam(legs[2][0], 0.9, legs[2][1], legs[3][0], 14, legs[3][1], 0.35, 0.35, STEEL_D);
    const top = 0.45 + Hh;
    b.add(rb(legs[0][0] - legs[2][0] + 3, 1.6, 15, 0.2), { x: cx, y: top + 0.6, z: cz, color: col });
    const bx0 = legs[0][0], bx1 = cx + 34;
    for (const s of [-1.3, 1.3]) { b.beam(bx0, top + 1.2, cz + s, bx1, top + 14, cz + s, 0.8, 0.8, col); b.beam(bx0, top + 0.6, cz + s, bx0 - 16, top + 12, cz + s, 0.7, 0.7, col); }
    for (let i = 1; i < 8; i++) { const t = i / 8, x = bx0 + (bx1 - bx0) * t, y = top + 1.2 + 12.8 * t; b.beam(x, y, cz - 1.3, x, y, cz + 1.3, 0.35, 0.35, STEEL_D); b.beam(x, y, cz - 1.3, x + (bx1 - bx0) / 8, y + 1.6, cz + 1.3, 0.3, 0.3, STEEL_D); }
    b.add(rb(3, 2.4, 3.2, 0.3), { x: cx + 2, y: top + 4.2, z: cz, color: YEL }); b.add(G.box1, { x: cx + 2, y: top + 4.4, z: cz + 1.62, sx: 2.2, sy: 1.0, sz: 0.1, color: 0x1D3A4A });
    b.beam(bx0 - 16, top + 12, cz, bx1, top + 14, cz, 0.25, 0.25, STEEL_D);
    b.add(rb(0.6, 4, 0.6, 0.1), { x: bx0 - 16, y: top + 13.5, z: cz, color: STEEL_D }); b.add(rb(5, 1.8, 3, 0.2), { x: bx0 - 14, y: top + 12.3, z: cz, color: CONC_D });
  }
  function curbBox(b, x0, z0, x1, z1) {
    const sx = Math.abs(x1 - x0), sz = Math.abs(z1 - z0); if (sx < 0.2 && sz < 0.2) return;
    b.add(G.box1, { x: (x0 + x1) / 2, y: (-2.2 + 1.0) / 2, z: (z0 + z1) / 2, sx: Math.max(0.7, sx), sy: 3.2, sz: Math.max(0.7, sz), color: 0x858B8C });
    b.add(G.box1, { x: (x0 + x1) / 2, y: 1.02, z: (z0 + z1) / 2, sx: Math.max(0.8, sx + 0.06), sy: 0.18, sz: Math.max(0.8, sz + 0.06), color: 0xB9BAB0 });
    b.add(G.box1, { x: (x0 + x1) / 2, y: 0.5, z: (z0 + z1) / 2, sx: Math.max(0.72, sx + 0.02), sy: 0.14, sz: Math.max(0.72, sz + 0.02), color: 0x2C3236 });   // dark rubber band
  }
  function bollard(b, x, z) { b.add(G.cyl(8), { x, y: 0.45 + 0.35, z, sx: 0.4, sy: 0.7, sz: 0.4, color: 0x2B3034 }); b.add(G.sph(8, 5), { x, y: 0.45 + 0.78, z, sx: 0.46, sy: 0.3, sz: 0.46, color: 0x2B3034 }); }

  // ------------------------------------------------------------------ sky / clouds / hills / border
  function skyDome() {
    const g = new T.SphereGeometry(900, 24, 14), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const stops = [[-1, '#D9E3E3'], [0, '#D3E0E0'], [0.07, '#B9CED6'], [0.3, '#8DB0C6'], [0.65, '#6C97B5'], [1, '#4E7FA3']], cc = new T.Color(), c2 = new T.Color();
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
      const a = rng.range(0, 6.28), r = rng.range(360, 760), y = rng.range(120, 220), cx = Math.cos(a) * r, cz = Math.sin(a) * r, k = rng.range(0.9, 1.6), n = rng.int(4, 6);
      for (let j = 0; j < n; j++) { const s = rng.range(28, 52) * k; b.add(G.sph(8, 6), { x: cx + (j - n / 2) * 38 * k + rng.range(-8, 8), y: y + rng.range(-5, 8), z: cz + rng.range(-20, 20), sx: s * 1.3, sy: s * 0.55, sz: s, color: j % 2 ? 0xE9EEEE : 0xD3DCDF }); }
      b.add(G.box1, { x: cx, y: y - 12 * k, z: cz, sx: n * 38 * k, sy: 4, sz: 40 * k, color: 0xAEBBC1 });
    }
    const m = new T.Mesh(b.build(), new T.MeshBasicMaterial({ vertexColors: true, fog: false })); m.frustumCulled = false; return m;
  }
  function mountains(rng) {
    const b = B();
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2 + rng.range(-0.05, 0.05), r = (ring ? 740 : 600) + rng.range(-30, 60), h = rng.range(26, 70) * (ring ? 1.25 : 1), w = rng.range(150, 280), x = Math.cos(a) * r, z = Math.sin(a) * r;
      b.add(G.cone(7), { x, y: h / 2 - 12, z, ry: rng.range(0, 3), sx: w, sy: h, sz: w * rng.range(0.6, 1), color: ring ? 0x93AAB4 : 0x7C97A3 });
    }
    for (let i = 0; i < 16; i++) { const a = rng.range(0, 6.28), r = rng.range(430, 540), s = rng.range(10, 18); b.add(G.box1, { x: Math.cos(a) * r, y: s * 0.5 - 6, z: Math.sin(a) * r, sx: s * 0.9, sy: s, sz: s * 0.6, color: 0x7C8E96 }); }   // far-off port buildings
    const m = new T.Mesh(b.build(), new T.MeshBasicMaterial({ vertexColors: true, fog: false })); m.frustumCulled = false; return m;
  }
  /** border: a wall of stacked containers on the west / north / south edges (the east side is open sea) */
  function cliffs(set, half, rng, map) {
    const Qx = map ? map.quayX : half;
    for (const sd of [[0, -1], [0, 1], [-1, 0]]) for (let t = -half - 20; t <= half + 20; t += 12.6) for (let layer = 0; layer < 2; layer++) {
      const out = half + 6 + layer * 2.7, px = sd[0] === 0 ? t : sd[0] * out, pz = sd[1] === 0 ? t : sd[1] * out;
      if (sd[0] === 0 && px > Qx - 2) continue;
      const tiers = rng.int(2, 4) + (layer ? 0 : 1);
      for (let k = 0; k < tiers; k++) set.plain.add(G.box1, { x: px + rng.range(-0.15, 0.15), y: -2 + 1.3 + k * 2.65, z: pz + rng.range(-0.15, 0.15), ry: sd[0] === 0 ? 0 : Math.PI / 2, sx: 2.45, sy: 2.6, sz: LOAD_L - 0.3, color: pick(rng, CONT) });
    }
  }

  // ------------------------------------------------------------------ tower crane rig
  function craneGeo() {
    const m = B(), jib = B(), H = 26, hw = 1.1;
    m.add(rb(5.6, 1.0, 5.6, 0.2), { y: 0.5, color: YEL }); m.add(rb(4.6, 0.5, 4.6, 0.1), { y: 1.2, color: BLK });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.add(rb(0.55, H, 0.55, 0.08), { x: sx * hw, y: H / 2 + 1, z: sz * hw, color: ORANGE });
    for (let i = 0; i < 6; i++) {
      const y0 = 1 + i * (H / 6), y1 = y0 + H / 6;
      m.beam(-hw, y0, -hw, hw, y1, -hw, 0.3, 0.3, STEEL_D); m.beam(hw, y0, -hw, -hw, y1, -hw, 0.3, 0.3, STEEL_D); m.beam(-hw, y0, hw, hw, y1, hw, 0.3, 0.3, STEEL_D); m.beam(hw, y0, hw, -hw, y1, hw, 0.3, 0.3, STEEL_D);
      m.beam(-hw, y0, -hw, -hw, y1, hw, 0.3, 0.3, STEEL_D); m.beam(-hw, y0, hw, -hw, y1, -hw, 0.3, 0.3, STEEL_D); m.beam(hw, y0, -hw, hw, y1, hw, 0.3, 0.3, STEEL_D); m.beam(hw, y0, hw, hw, y1, -hw, 0.3, 0.3, STEEL_D);
      m.add(G.box1, { y: y1, sx: hw * 2.2, sy: 0.22, sz: hw * 2.2, color: STEEL });
    }
    // slewing part (origin = mast axis at y = 0 -> built at the mast top)
    jib.add(rb(3.4, 1.2, 3.6, 0.2), { y: 0.4, color: ORANGE }); jib.add(rb(2.6, 2.4, 2.6, 0.3), { y: 2.0, z: 1.8, color: YEL }); jib.add(G.box1, { y: 2.2, z: 3.12, sx: 2.0, sy: 1.1, sz: 0.1, color: 0x1D3A4A });
    jib.add(G.box1, { y: 8.6, sx: 0.5, sy: 15.5, sz: 0.5, color: ORANGE });          // tower head
    const J = HC.jib, top = 1.9, bot = 0.2;
    jib.beam(0, top + 4, 0, 0, top, J, 0.4, 0.4, ORANGE);
    for (const sx of [-0.9, 0.9]) jib.beam(sx, bot, 1.4, sx, bot, J, 0.35, 0.35, ORANGE);
    jib.beam(0, top, 1.4, 0, top, J, 0.4, 0.4, ORANGE);
    for (let z = 3; z < J - 2; z += 3.4) { jib.beam(-0.9, bot, z, 0, top, z + 1.7, 0.22, 0.22, STEEL_D); jib.beam(0.9, bot, z, 0, top, z + 1.7, 0.22, 0.22, STEEL_D); jib.beam(0, top, z + 1.7, -0.9, bot, z + 3.4, 0.22, 0.22, STEEL_D); jib.beam(0, top, z + 1.7, 0.9, bot, z + 3.4, 0.22, 0.22, STEEL_D); }
    jib.add(rb(2.4, 2.2, 1.6, 0.2), { y: 0.4, z: J, color: STEEL_D });
    jib.beam(0, 16, 0, 0, top + 0.4, J * 0.78, 0.18, 0.18, STEEL_D); jib.beam(0, 16, 0, 0, top + 0.4, -13, 0.18, 0.18, STEEL_D);
    for (const sx of [-0.9, 0.9]) jib.beam(sx, bot, -1.4, sx, bot, -14, 0.35, 0.35, ORANGE);
    jib.beam(0, top, -1.4, 0, top, -14, 0.35, 0.35, ORANGE);
    for (let i = 0; i < 4; i++) jib.add(rb(2.4, 1.3, 1.5, 0.1), { y: 0.6 + (i > 1 ? 1.3 : 0), z: -11.5 + (i % 2) * 1.6, color: CONC_D });
    jib.add(G.cyl(8), { y: 17.4, sx: 0.12, sy: 3.0, sz: 0.12, color: STEEL_D });
    return { mast: m.build(), jib: jib.build() };
  }
  let cGeo = null;
  /** the crane rig: root (at the mast), slew (rotates), trolley / cable / hook (hang under the jib), load = the container (world-aligned child of root) */
  function crane(map, c, parent, loadColor) {
    if (!cGeo) { cGeo = craneGeo(); for (const k in cGeo) G.mark(cGeo[k]); }
    const root = new T.Group(), mat = new T.MeshLambertMaterial({ vertexColors: true }), gy = map.height(c.x, c.z);
    root.position.set(c.x, gy, c.z);
    root.add(new T.Mesh(cGeo.mast, mat));
    const slew = new T.Group(); slew.position.y = 27; slew.add(new T.Mesh(cGeo.jib, mat)); root.add(slew);
    const trolley = new T.Group(); trolley.position.y = 0.2; slew.add(trolley);
    trolley.add(new T.Mesh(G.box1, new T.MeshLambertMaterial({ color: 0x2C3236 })).translateY(-0.4)); trolley.children[0].scale.set(1.8, 0.7, 1.7);
    const cableMat = new T.MeshLambertMaterial({ color: 0x1B1D1F }), cable = new T.Mesh(G.box1, cableMat); cable.scale.set(0.09, 1, 0.09); trolley.add(cable);
    const hook = new T.Mesh(G.box1, new T.MeshLambertMaterial({ color: YEL })); hook.scale.set(1.3, 0.8, 1.3); trolley.add(hook);
    const loadMat = new T.MeshLambertMaterial({ color: loadColor || 0xB5422B, map: WZ.Harbo.ribs() }), load = new T.Mesh(G.box1, loadMat); load.scale.set(LOAD_W, LOAD_H, LOAD_L); load.castShadow = false; root.add(load);
    const spread = new T.Mesh(G.box1, new T.MeshLambertMaterial({ color: 0x30363A })); spread.scale.set(LOAD_W * 0.9, 0.22, LOAD_L * 0.92); root.add(spread);
    const beaconMat = new T.MeshBasicMaterial({ color: 0xFF3A1A, fog: false }), beacon = new T.Mesh(new T.SphereGeometry(0.55, 8, 6), beaconMat); beacon.position.set(0, 18.2, 0); slew.add(beacon);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: WZ.Assets.tex('glow'), color: 0xFF4020, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 })); glow.scale.set(7, 7, 1); glow.position.copy(beacon.position); slew.add(glow);
    parent.add(root);
    const rig = {
      root, slew, load, beacon, glow, x: c.x, z: c.z, gy, alert: 0,
      /** put the load at world (lx, ly, lz) with yaw: the jib / trolley / cable follow it */
      setLoad(lx, ly, lz, yaw) {
        const dx = lx - c.x, dz = lz - c.z, r = Math.max(4, Math.hypot(dx, dz)), az = Math.atan2(dx, dz);
        slew.rotation.y = az; trolley.position.z = r;
        load.position.set(dx, ly - gy + LOAD_H / 2, dz); load.rotation.y = yaw;
        spread.position.set(dx, ly - gy + LOAD_H + 0.12, dz); spread.rotation.y = yaw;
        const top = 27 + 0.0, hy = ly - gy + LOAD_H + 0.9, len = Math.max(0.5, top - hy);
        cable.scale.y = len; cable.position.y = -len / 2 - 0.7; hook.position.y = -len - 0.7;
      },
      setAlert(a) { rig.alert = a; },
      update(t) {
        const on = rig.alert > 0, f = on ? (Math.sin(t * 11) > 0 ? 1 : 0.15) : 0.35 + 0.2 * Math.sin(t * 2);
        beaconMat.color.setRGB(f, f * 0.2, f * 0.08); glow.material.opacity = on ? f * 0.85 : 0.08;
      },
      dispose() { parent.remove(root); mat.dispose(); cableMat.dispose(); loadMat.dispose(); beaconMat.dispose(); beacon.geometry.dispose(); glow.material.dispose(); trolley.children[0].material.dispose(); hook.material.dispose(); spread.material.dispose(); },
    };
    return rig;
  }

  // ------------------------------------------------------------------ everything static + animated, called by WorldView.build
  let ribCache = null;
  function addScenery(map, group, scene, q, opts) {
    opts = opts || {};
    const rng = R.create((map.seed ^ 0x5A9B1) | 0), half = map.half, CH = CFG.world.chunk, nC = Math.ceil(map.size / CH), Qx = map.quayX, H = map.height, disposables = [];
    const chunks = []; for (let i = 0; i < nC * nC; i++) chunks.push(B());
    const at = (x, z) => chunks[Math.max(0, Math.min(nC - 1, Math.floor((z + half) / CH))) * nC + Math.max(0, Math.min(nC - 1, Math.floor((x + half) / CH)))];
    for (const s of map.sheds) shed(at(s.x, s.z), s, rng);
    for (const t of map.tanks) tank(at(t.x, t.z), t);
    for (const o of map.barriers) barrier(at(o.x, o.z), o);
    for (const gx of map.gantries) gantry(at(gx.x, gx.z), gx);
    const mat = new T.MeshLambertMaterial({ vertexColors: true });
    for (const b of chunks) if (!b.empty) group.add(new T.Mesh(b.build(), mat));

    // ---- container stacks (corrugated texture x vertex colour), chunked
    const ribs = new T.MeshLambertMaterial({ vertexColors: true, map: WZ.Harbo.ribs() }), cch = []; for (let i = 0; i < nC * nC; i++) cch.push(B());
    const cat = (x, z) => cch[Math.max(0, Math.min(nC - 1, Math.floor((z + half) / CH))) * nC + Math.max(0, Math.min(nC - 1, Math.floor((x + half) / CH)))];
    for (const st of map.stacks) {
      const b = cat(st.x, st.z), gy = H(st.x, st.z), alongX = st.sx > st.sz;
      for (let k = 0; k < st.t; k++) {
        const jit = k === st.t - 1 && st.t > 1 && rng.chance(0.22) ? rng.range(-0.5, 0.5) : 0;
        let col = pick(rng, CONT); if (rng.chance(0.4)) col = (((col >> 16) & 255) * 0.82 << 16) | (((col >> 8) & 255) * 0.82 << 8) | ((col & 255) * 0.82);
        b.add(G.box1, { x: st.x + (alongX ? jit : 0), y: gy + 0.1 + k * 2.64 + 1.3, z: st.z + (alongX ? 0 : jit), ry: st.rot + (k ? rng.range(-0.01, 0.01) : 0), sx: st.sx, sy: 2.6, sz: st.sz, color: col });
      }
    }
    for (const b of cch) if (!b.empty) { const m = new T.Mesh(b.build(), ribs); group.add(m); }
    disposables.push(ribs);

    // ---- ships: beached hulls on land, sunken ones in the water (hull partly under the surface)
    const sh = B(); const SEA = map.seaLevel;
    for (const s of map.ships) { if (s.beached) ship(sh, Object.assign({ tilt: 0.04, pitch: -0.02 }, s), rng, H(s.x, s.z) + 1.6); else ship(sh, s, rng, SEA - (s.big ? 3.6 : 2.7) + Math.abs(s.tilt || 0) * 5); }
    if (!sh.empty) group.add(new T.Mesh(sh.build(), mat));

    // ---- curb walls along the water + bollards + broken-deck rims
    const cb = B(), bl = B(), edges = [], zEdge = -half - 12;
    let zp = zEdge; for (const p of map.piers) { edges.push([zp, p.z0]); zp = p.z1; } edges.push([zp, half + 12]);
    for (const e of edges) curbBox(cb, Qx - 0.35, e[0], Qx + 0.35, e[1]);
    for (const p of map.piers) {
      for (const side of [0, 1]) {
        const zz = side ? p.z1 : p.z0, cuts = p.holes.filter((h) => (side ? h.z1 >= p.z1 - 0.01 : h.z0 <= p.z0 + 0.01)).sort((a, b) => a.x0 - b.x0);
        let xa = Qx; for (const h of cuts) { if (h.x0 > xa) curbBox(cb, xa, zz - (side ? 0.35 : -0.35), h.x0, zz + (side ? 0.35 : -0.35)); xa = h.x1; }
        if (Qx + p.L > xa) curbBox(cb, xa, zz - (side ? 0.35 : -0.35), Qx + p.L, zz + (side ? 0.35 : -0.35));
      }
      curbBox(cb, Qx + p.L - 0.35, p.z0, Qx + p.L + 0.35, p.z1);
    }
    for (let z = -half + 6; z < half; z += 14) if (!map.piers.some((p) => z > p.z0 - 2 && z < p.z1 + 2)) bollard(bl, Qx - 1.5, z);
    for (const p of map.piers) for (let x = Qx + 8; x < Qx + p.L; x += 12) { if (!map.holes.some((h) => h.pier === p && x > h.x0 - 3 && x < h.x1 + 3)) { bollard(bl, x, p.z0 + 1.4); bollard(bl, x, p.z1 - 1.4); } }
    group.add(new T.Mesh(cb.build(), mat), new T.Mesh(bl.build(), mat));
    const rim = B(), beacons = [];
    for (const h of map.holes) {
      const sides = [];      // rim sides that are open deck: [x0,z0,x1,z1,nx,nz] (normal points onto the deck)
      sides.push([h.x0, h.z0, h.x0, h.z1, -1, 0], [h.x1, h.z0, h.x1, h.z1, 1, 0]);
      if (!h.full) sides.push(h.low ? [h.x0, h.z1, h.x1, h.z1, 0, 1] : [h.x0, h.z0, h.x1, h.z0, 0, -1]);
      for (const sd of sides) {
        const len = Math.hypot(sd[2] - sd[0], sd[3] - sd[1]), n = Math.max(2, Math.round(len / 2.2));
        for (let i = 0; i < n; i++) {         // jagged slabs hanging into the water
          const t = (i + 0.5 + rng.range(-0.25, 0.25)) / n, x = sd[0] + (sd[2] - sd[0]) * t, z = sd[1] + (sd[3] - sd[1]) * t, tilt = rng.range(0.35, 1.0), w = rng.range(1.0, 2.0);
          rim.add(G.box1, { x: x - sd[4] * 0.5, y: 0.25 - tilt * 0.5, z: z - sd[5] * 0.5, rx: sd[5] ? -sd[5] * tilt : 0, rz: sd[4] ? sd[4] * tilt : 0, sx: sd[4] ? 1.7 : w, sy: 0.35, sz: sd[5] ? 1.7 : w, color: pick(rng, [0x6E5A44, 0x7A6A55, 0x8D9291, 0x5A4A3A]) });
        }
        // barricade: a striped bar on two legs, set back from the rim
        const mx = (sd[0] + sd[2]) / 2 + sd[4] * 2.2, mz = (sd[1] + sd[3]) / 2 + sd[5] * 2.2, al = sd[4] === 0;
        if (!(h.full && sd[5])) {
          rim.add(G.box1, { x: mx, y: 0.45 + 0.95, z: mz, sx: al ? Math.min(len * 0.8, 7) : 0.22, sy: 0.5, sz: al ? 0.22 : Math.min(len * 0.8, 7), color: WHITE });
          rim.add(G.box1, { x: mx, y: 0.45 + 0.95, z: mz, sx: al ? Math.min(len * 0.8, 7) * 0.5 : 0.24, sy: 0.52, sz: al ? 0.24 : Math.min(len * 0.8, 7) * 0.5, color: 0xD43A22 });
          for (const s of [-1, 1]) rim.add(G.box1, { x: mx + (al ? s * Math.min(len * 0.38, 3.2) : 0), y: 0.45 + 0.5, z: mz + (al ? 0 : s * Math.min(len * 0.38, 3.2)), sx: 0.18, sy: 1.0, sz: 0.18, color: STEEL_D });
        }
      }
      for (const cx of [h.x0, h.x1]) for (const cz of [h.z0, h.z1]) {      // beacon posts on the corners that touch the deck
        const onDeck = (cz === h.z0 && h.low === false && !h.full) || (cz === h.z1 && h.low === true && !h.full) || h.full;
        if (!onDeck) continue;
        const bx = cx + (cx === h.x0 ? -1.2 : 1.2), bz = cz + (cz === h.z0 ? -1.2 : 1.2);
        rim.add(G.cyl(6), { x: bx, y: 0.45 + 1.4, z: bz, sx: 0.12, sy: 2.8, sz: 0.12, color: STEEL_D }); beacons.push([bx, 0.45 + 3.0, bz]);
      }
      for (let i = 0; i < 3; i++) rim.add(G.cyl(6), { x: rng.range(h.x0 + 1, h.x1 - 1), y: -0.4 + rng.range(0, 1.2), z: rng.range(h.z0 + 1, h.z1 - 1), rx: rng.range(-0.3, 0.3), rz: rng.range(-0.3, 0.3), sx: 0.36, sy: rng.range(2.4, 4), sz: 0.36, color: 0x4A3F36 });   // broken pilings
    }
    if (!rim.empty) group.add(new T.Mesh(rim.build(), mat));
    const bm = new T.MeshBasicMaterial({ color: 0xFFB020, fog: false }), bgeo = new T.SphereGeometry(0.4, 8, 6), bim = new T.InstancedMesh(bgeo, bm, Math.max(1, beacons.length)); bim.frustumCulled = false;
    const dm = new T.Object3D(); beacons.forEach((p, i) => { dm.position.set(p[0], p[1], p[2]); dm.updateMatrix(); bim.setMatrixAt(i, dm.matrix); }); bim.count = beacons.length; group.add(bim); disposables.push(bm, bgeo);

    // ---- start camp tent (same prop as the other maps)
    const set = WZ.Props.newSet(); for (const t of map.tents) WZ.Props.camp(set, t.x, t.z, H(t.x, t.z)); WZ.Props.setMeshes(set, group);

    // ---- static tower cranes for the menu / map-preview scenes (in a mission WZ.Harbor owns them and animates them)
    const menuCranes = [];
    if (opts.menu) for (const c of map.cranes) { const r = crane(map, c, group, pick(rng, CONT)); r.setLoad(c.hx, H(c.hx, c.hz), c.hz, c.longZ ? 0 : Math.PI / 2); menuCranes.push(r); }

    // ---- the sea: one big animated plane + a glint layer
    const stex = seaTex(), gtex = glintTex(); stex.repeat.set(150, 150); gtex.repeat.set(95, 95); disposables.push(stex, gtex);
    const sg = new T.PlaneGeometry(3400, 3400); sg.rotateX(-Math.PI / 2);
    const sm = new T.MeshPhongMaterial({ color: 0x3F95B4, map: stex, transparent: true, opacity: 0.84, shininess: 90, specular: 0xB8E2EE, depthWrite: false }), sea = new T.Mesh(sg, sm); sea.position.y = SEA; sea.renderOrder = 1; sea.frustumCulled = false;
    const gm = new T.MeshBasicMaterial({ map: gtex, color: 0xFFFFFF, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, fog: true }), glint = new T.Mesh(sg, gm); glint.position.y = SEA + 0.04; glint.renderOrder = 2; glint.frustumCulled = false;
    group.add(sea, glint);
    const baseNear = scene.fog ? scene.fog.near : 80, baseFar = scene.fog ? scene.fog.far : 320; void baseNear; void baseFar;
    return {
      mat, cranes: menuCranes,
      update(t, dt, cam) {
        stex.offset.set(t * 0.004, t * 0.0027); gtex.offset.set(-t * 0.006, t * 0.0041); gm.opacity = 0.28 + 0.1 * Math.sin(t * 1.3);
        const f = Math.sin(t * 6) > 0 ? 1 : 0.25; bm.color.setRGB(1 * f + 0.2, 0.69 * f + 0.1, 0.12 * f);
        for (const r of menuCranes) r.update(t);
        void dt; void cam;
      },
      dispose() { for (const r of menuCranes) r.dispose(); mat.dispose(); sm.dispose(); gm.dispose(); sg.dispose(); disposables.forEach((x) => x.dispose()); },
    };
  }

  WZ.Harbo = { paintGround, addScenery, skyDome, clouds, mountains, cliffs, crane, ribs() { if (!ribCache) { ribCache = ribTex(); ribCache.userData.shared = true; } return ribCache; }, LOAD: { L: LOAD_L, W: LOAD_W, H: LOAD_H }, pick, CONT };
})(window.WZ = window.WZ || {});
