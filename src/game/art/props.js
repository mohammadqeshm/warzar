/* WZ.Props — procedural kit pieces. Static pieces are added to a "set" of Builders (one per material) so the whole
 * village merges into a handful of draw calls. Dynamic/animated pieces return Object3Ds. */
(function (WZ) {
  'use strict';
  const T = THREE, G = WZ.Geo, A = WZ.Assets, rb = G.rbox;

  let sm = null;
  function staticMats() {
    if (sm) return sm;
    const L = (o) => { const m = new T.MeshLambertMaterial(o); m.userData.shared = true; return m; };
    sm = {
      plaster: L({ map: A.tex('plaster'), vertexColors: true }),
      roof: L({ map: A.tex('roofRust'), vertexColors: true }),
      wood: L({ map: A.tex('wood'), vertexColors: true }),
      stone: L({ map: A.tex('stone'), vertexColors: true }),
      plain: L({ vertexColors: true }),
    };
    return sm;
  }
  const newSet = () => ({ plaster: new G.Builder(), roof: new G.Builder(), wood: new G.Builder(), stone: new G.Builder(), plain: new G.Builder() });
  function setMeshes(set, parent) {
    const mats = staticMats(), out = [];
    for (const k in set) {
      if (set[k].empty) continue;
      const m = new T.Mesh(set[k].build(), mats[k]);
      parent.add(m); out.push(m);
    }
    return out;
  }
  const uvd = (a, b) => [Math.max(0.3, a / 8), Math.max(0.3, b / 8)];
  const hexShade = (s) => { const v = Math.max(0, Math.min(255, Math.round(s * 255))); return (v << 16) | (v << 8) | v; };

  function withBase(S, x, y, z, ry, fn) {
    const m = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), new T.Vector3(1, 1, 1));
    for (const k in S) S[k].base = m;
    fn();
    for (const k in S) S[k].base = null;
  }
  // textured box helper
  const tb = (b, x, y, z, w, h, d, color) => b.add(G.box1, { x, y, z, sx: w, sy: h, sz: d, color, uv: uvd((w + d) / 2, h) });

  // ------------------------------------------------------------------ house
  function house(S, x, z, gy, w, d, h, rng, o) {
    o = o || {};
    const long = w >= d, lw = long ? w : d, ld = long ? d : w;
    withBase(S, x, gy, z, long ? 0 : Math.PI / 2, () => {
      const wallTints = [0xFFFFFF, 0xEFE7DA, 0xE2D6C1, 0xF4E6D2];
      const wt = rng.pick(wallTints);
      // stone foundation reaching below the slope
      S.stone.add(G.box1, { x: 0, y: 0.5 - 2, z: 0, sx: lw + 0.7, sy: 4, sz: ld + 0.7, color: 0xBEBEBE, uv: uvd(lw, 4) });
      // walls
      S.plaster.add(G.box1, { x: 0, y: 0.5 + h / 2, z: 0, sx: lw, sy: h, sz: ld, color: wt, uv: uvd((lw + ld) / 2, h) });
      // roof geometry
      const half = ld / 2 + 0.8, rise = ld * 0.42, ang = Math.atan2(rise, half), L = Math.hypot(half, rise);
      S.plaster.add(G.prism(lw, ld, rise), { x: 0, y: 0.5 + h, z: 0, color: wt, uv: [1, 1] });
      const roofTint = o.red ? 0xFFA79E : 0xFFFFFF;
      for (const s of [1, -1]) {
        S.roof.add(G.box1, { x: 0, y: 0.5 + h + rise / 2 + 0.12, z: s * half / 2 + s * 0.05, rx: s * ang, sx: lw + 1.5, sy: 0.32, sz: L + 0.1, color: roofTint, uv: uvd(lw, L) });
      }
      // collapsed patch on one slope (dark hole + rafters)
      const hs = rng.sign(), px = rng.range(-lw * 0.25, lw * 0.25);
      S.plain.add(G.box1, { x: px, y: 0.5 + h + rise / 2 + 0.34 + (hs > 0 ? 0 : 0), z: hs * half / 2 + hs * 0.05, rx: hs * ang, sx: lw * 0.28, sy: 0.12, sz: L * 0.4, color: 0x261C15 });
      for (let i = -1; i <= 1; i++) S.wood.add(G.box1, { x: px + i * lw * 0.09, y: 0.5 + h + rise / 2 + 0.46, z: hs * half / 2 + hs * 0.05, rx: hs * ang, sx: 0.22, sy: 0.2, sz: L * 0.46, color: 0x7B6347, uv: [0.3, 0.3] });
      // chimney
      tb(S.stone, lw * 0.28, 0.5 + h + rise * 0.55 + 0.8, ld * 0.12, 1.2, rise * 0.9 + 1.6, 1.2, 0xA6A09A);
      S.plain.add(G.box1, { x: lw * 0.28, y: 0.5 + h + rise * 0.55 + rise * 0.45 + 1.62, z: ld * 0.12, sx: 1.4, sy: 0.25, sz: 1.4, color: 0x34322F });
      // windows on both long sides
      const nW = Math.max(2, Math.floor(lw / 4.2));
      for (const s of [1, -1]) for (let i = 0; i < nW; i++) {
        const wx = -lw / 2 + (i + 0.5) * (lw / nW);
        if (s > 0 && i === Math.floor(nW / 2)) continue; // door side
        S.wood.add(G.box1, { x: wx, y: 0.5 + h * 0.58, z: s * (ld / 2 + 0.03), sx: 1.75, sy: 1.95, sz: 0.1, color: 0x8B6A47, uv: [0.3, 0.3] });
        S.plain.add(G.box1, { x: wx, y: 0.5 + h * 0.58, z: s * (ld / 2 + 0.09), sx: 1.25, sy: 1.5, sz: 0.1, color: 0x1B1814 });
        if (rng.chance(0.55)) S.wood.add(G.box1, { x: wx + rng.range(-0.5, 0.5), y: 0.5 + h * 0.58 + rng.range(-0.2, 0.2), z: s * (ld / 2 + 0.2), rz: rng.range(-0.5, 0.5), sx: 0.85, sy: 1.6, sz: 0.08, color: 0x6B4A2B, uv: [0.3, 0.3] });
      }
      // door
      const dx = ((Math.floor(nW / 2) + 0.5) * (lw / nW)) - lw / 2;
      S.wood.add(G.box1, { x: dx, y: 0.5 + 1.4, z: ld / 2 + 0.06, sx: 2.2, sy: 2.9, sz: 0.12, color: 0x7B6347, uv: [0.3, 0.4] });
      S.plain.add(G.box1, { x: dx, y: 0.5 + 1.3, z: ld / 2 + 0.13, sx: 1.6, sy: 2.55, sz: 0.1, color: 0x2A1F16 });
      S.stone.add(G.box1, { x: dx, y: 0.5 + 0.12, z: ld / 2 + 0.9, sx: 2.6, sy: 0.3, sz: 1.6, color: 0xB0B0B0, uv: [0.4, 0.2] });
      // soot streak + breach + rubble
      const sx = rng.sign();
      S.plain.add(G.box1, { x: rng.range(-lw * 0.3, lw * 0.3), y: 0.5 + h * 0.8, z: -(ld / 2 + 0.04), sx: 3.2, sy: h * 0.5, sz: 0.1, color: 0x34302B });
      S.plain.add(G.box1, { x: sx * (lw / 2 + 0.04), y: 0.5 + h * 0.4, z: rng.range(-ld * 0.2, ld * 0.2), sx: 0.1, sy: 2.2, sz: 2.6, color: 0x1E1914 });
      for (let i = 0; i < 6; i++) {
        const a = rng.range(0, Math.PI * 2), rr = rng.range(0, 1);
        const px2 = Math.cos(a) * (lw / 2 + 0.8 + rr), pz2 = Math.sin(a) * (ld / 2 + 0.8 + rr);
        const s2 = rng.range(0.4, 1.0);
        (rng.chance(0.5) ? S.plaster : S.stone).add(G.box1, { x: px2, y: 0.5 + s2 * 0.3, z: pz2, rx: rng.range(-0.5, 0.5), ry: rng.range(0, 3), rz: rng.range(-0.5, 0.5), sx: s2 * 1.4, sy: s2, sz: s2 * 1.1, color: rng.chance(0.5) ? 0xE0D3BE : 0x9A9A9A, uv: [0.3, 0.3] });
      }
      for (let i = 0; i < 3; i++) S.wood.add(G.box1, { x: rng.range(-lw / 2, lw / 2), y: 0.55, z: ld / 2 + rng.range(1.2, 2.6), ry: rng.range(0, 3), rz: rng.range(-0.1, 0.1), sx: 0.25, sy: 0.18, sz: rng.range(1.6, 3), color: 0x6B4A2B, uv: [0.3, 0.3] });
    });
  }

  // ------------------------------------------------------------------ watchtower
  function tower(S, x, z, gy, H) {
    H = H || 13;
    withBase(S, x, gy, z, 0, () => {
      const wd = (y) => 2.3 - ((y + 1) / (H + 1)) * 0.6;
      const wood = 0x8C6B49, dark = 0x6B4A2B;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) S.wood.beam(sx * wd(-1), -1.5, sz * wd(-1), sx * wd(H), H, sz * wd(H), 0.5, 0.5, wood);
      const lv = [0, H * 0.36, H * 0.68, H];
      for (let i = 0; i < 3; i++) {
        const y0 = lv[i], y1 = lv[i + 1], w0 = wd(y0), w1 = wd(y1);
        for (const s of [-1, 1]) {
          S.wood.beam(-w0, y0, s * w0, w0, y1, s * w1, 0.26, 0.26, dark);
          S.wood.beam(w0, y0, s * w0, -w0, y1, s * w1, 0.26, 0.26, dark);
          S.wood.beam(s * w0, y0, -w0, s * w1, y1, w0, 0.26, 0.26, dark);
          S.wood.beam(s * w0, y0, w0, s * w1, y1, -w0, 0.26, 0.26, dark);
          S.wood.beam(-w1, y1, s * w1, w1, y1, s * w1, 0.3, 0.3, wood);
          S.wood.beam(s * w1, y1, -w1, s * w1, y1, w1, 0.3, 0.3, wood);
        }
      }
      // deck + railing
      tb(S.wood, 0, H + 0.2, 0, 5.6, 0.45, 5.6, 0xA07E58);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) S.wood.beam(sx * 2.6, H + 0.4, sz * 2.6, sx * 2.6, H + 1.7, sz * 2.6, 0.22, 0.22, dark);
      for (const s of [-1, 1]) for (const yy of [1.0, 1.6]) {
        S.wood.beam(-2.6, H + yy, s * 2.6, 2.6, H + yy, s * 2.6, 0.16, 0.16, wood);
        S.wood.beam(s * 2.6, H + yy, -2.6, s * 2.6, H + yy, 2.6, 0.16, 0.16, wood);
      }
      // cabin + roof
      tb(S.wood, 0, H + 0.45 + 1.2, -0.4, 3.4, 2.4, 3.2, 0xA88A64);
      S.plain.add(G.box1, { x: 0, y: H + 0.45 + 1.4, z: 1.22, sx: 2.2, sy: 1.0, sz: 0.1, color: 0x1B1814 });
      S.roof.add(G.prism(4.6, 4.4, 1.4), { x: 0, y: H + 0.45 + 2.4, z: -0.4, ry: 0, color: 0xFFB0A0, uv: [1, 1] });
      S.roof.add(G.box1, { x: 0, y: H + 0.45 + 2.5, z: -0.4, sx: 4.7, sy: 0.14, sz: 4.5, color: 0xE0A090, uv: [0.5, 0.5] });
      // ladder
      for (const s of [-1, 1]) S.wood.beam(s * 0.6, -1, 2.6, s * 0.6, H, 2.15, 0.15, 0.15, dark);
      for (let i = 1; i < 11; i++) { const y = i * (H / 11); S.wood.beam(-0.6, y, 2.6 - (y / H) * 0.45, 0.6, y, 2.6 - (y / H) * 0.45, 0.12, 0.12, wood); }
    });
  }

  // ------------------------------------------------------------------ wall, tree, rock, camp, wreck
  function wall(S, x, z, gy, len, axis, th, hgt, rng) {
    th = th || 1.4; hgt = hgt || 2.6;
    withBase(S, x, gy, z, axis === 'z' ? Math.PI / 2 : 0, () => {
      S.stone.add(G.box1, { x: 0, y: 0.5 - 1 + hgt / 2, z: 0, sx: len, sy: hgt + 2, sz: th, color: 0xFFFFFF, uv: [len / 7, (hgt + 2) / 5] });
      S.stone.add(G.box1, { x: 0, y: 0.5 + hgt + 0.15, z: 0, sx: len + 0.2, sy: 0.35, sz: th + 0.3, color: 0xD2D2D2, uv: [len / 7, 0.3] });
      for (let i = 0; i < 3; i++) { const s = rng.range(0.5, 0.9); S.stone.add(G.box1, { x: rng.range(-len / 2, len / 2), y: 0.5 + s / 2, z: (rng.chance(0.5) ? 1 : -1) * (th / 2 + s * 0.7), ry: rng.range(0, 3), rz: rng.range(-0.3, 0.3), sx: s * 1.5, sy: s, sz: s, color: 0xAAAAAA, uv: [0.3, 0.3] }); }
    });
  }

  function tree(S, x, z, gy, s, dead, rng) {
    const brown = 0x6B4A2B;
    S.wood.add(G.cyl(6), { x, y: gy + 1.5 * s, z, sx: 0.36 * s, sy: 3 * s, sz: 0.36 * s, color: 0xB09070, uv: [0.5, 1] });
    if (dead) {
      for (let i = 0; i < 4; i++) {
        const a = rng.range(0, Math.PI * 2), l = rng.range(1.2, 2) * s;
        S.wood.beam(x, gy + (2.2 + i * 0.3) * s, z, x + Math.cos(a) * l, gy + (3.2 + i * 0.5) * s, z + Math.sin(a) * l, 0.14 * s, 0.14 * s, brown);
      }
      return;
    }
    const greens = [0x7A8340, 0x8F8B45, 0x6E7A3A, 0x9A9448];
    for (let i = 0; i < 3; i++) {
      const a = rng.range(0, Math.PI * 2), r = i === 0 ? 0 : 0.9 * s;
      S.plain.add(G.ico(), { x: x + Math.cos(a) * r, y: gy + (3.6 + i * 0.5) * s, z: z + Math.sin(a) * r, ry: rng.range(0, 3), sx: 1.7 * s, sy: 1.35 * s, sz: 1.7 * s, color: greens[(rng.next() * 4) | 0] });
    }
  }

  function rock(S, x, z, gy, r, rng) {
    const cols = [0x5F6366, 0x4A4D50, 0x6B6F72, 0x55595C];
    const n = r > 2.6 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, 6.28), d = i === 0 ? 0 : r * 0.6, rr = r * (i === 0 ? 1 : rng.range(0.5, 0.7));
      S.plain.add(G.ico(), { x: x + Math.cos(a) * d, y: gy + rr * 0.35, z: z + Math.sin(a) * d, rx: rng.range(-0.4, 0.4), ry: rng.range(0, 6), rz: rng.range(-0.4, 0.4), sx: rr * 1.15, sy: rr * 0.85, sz: rr, color: cols[(rng.next() * 4) | 0] });
    }
  }

  function camp(S, x, z, gy) {
    withBase(S, x, gy, z, 0.2, () => {
      S.plain.add(G.prism(5.8, 4.4, 2.8), { x: 0, y: 0, z: 0, color: 0x4A4F36 });
      S.plain.add(G.prism(5.9, 4.5, 0.2), { x: 0, y: 0.01, z: 0, color: 0x2E3226 });
      S.plain.add(G.box1, { x: 2.93, y: 0.9, z: 0, sx: 0.1, sy: 1.6, sz: 1.4, color: 0x1B1D1A });
      S.plain.add(G.box1, { x: 0, y: 2.85, z: 0, sx: 6, sy: 0.18, sz: 0.2, color: 0x2E3226 });
    });
  }
  function flagPole(S, x, z, gy) {
    S.wood.add(G.cyl(6), { x, y: gy + 4, z, sx: 0.14, sy: 8, sz: 0.14, color: 0xCCCCCC, uv: [0.2, 1] });
    S.plain.add(rb(0.08, 1.5, 2.4, 0.03), { x, y: gy + 7.1, z: z + 1.25, color: 0xFFB400 });
    S.plain.add(rb(0.1, 0.5, 2.0, 0.03), { x, y: gy + 7.1, z: z + 1.25, color: 0x0E0E0E });
  }
  function wreck(S, x, z, gy, rng) {
    withBase(S, x, gy, z, rng.range(0, 6.28), () => {
      S.plain.add(rb(2.8, 0.9, 6.4, 0.15), { x: 0, y: 1.0, z: 0, color: 0x2B2B2D });
      S.plain.add(rb(2.7, 1.8, 2.2, 0.2), { x: 0, y: 2.1, z: 2.0, rz: 0.05, color: 0x3A3836 });
      S.plain.add(rb(2.6, 0.8, 3.4, 0.1), { x: 0, y: 1.7, z: -1.4, color: 0x4A3428 });
      for (const sx of [-1, 1]) for (const sz of [-2, 1.8]) S.plain.add(G.cyl(10), { x: sx * 1.5, y: 0.75, z: sz, rz: Math.PI / 2, sx: 0.8, sy: 0.6, sz: 0.8, color: 0x151515 });
      S.plain.add(rb(2.2, 0.15, 1.2, 0.05), { x: 0.4, y: 3.1, z: 2.0, rz: 0.4, color: 0x6B3B22 });
      S.plain.add(rb(2.4, 0.1, 2.6, 0.05), { x: -0.3, y: 2.2, z: -2.2, rz: -0.25, color: 0x6B3B22 });
    });
  }

  // ------------------------------------------------------------------ cliffs (impassable border look)
  function cliffs(S, half, rng) {
    const sides = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const sd of sides) {
      for (let t = -half - 20; t <= half + 20; t += 8.5) {
        for (let layer = 0; layer < 2; layer++) {
          const out = half + 4 + layer * 9 + rng.range(0, 5);
          const px = sd[0] === 0 ? t + rng.range(-2, 2) : sd[0] * out, pz = sd[1] === 0 ? t + rng.range(-2, 2) : sd[1] * out;
          const H = rng.range(10, 24) + layer * 6, w = rng.range(10, 15), d = rng.range(9, 14);
          const sh = rng.range(0.7, 1);
          S.stone.add(G.box1, { x: px, y: H / 2 - 5, z: pz, ry: rng.range(-0.4, 0.4), rx: rng.range(-0.05, 0.05), rz: rng.range(-0.05, 0.05), sx: w, sy: H, sz: d, color: hexShade(sh), uv: [w / 10, H / 12] });
          S.plain.add(G.box1, { x: px, y: H - 5 + 0.2, z: pz, ry: rng.range(-0.4, 0.4), sx: w * 0.94, sy: 0.9, sz: d * 0.94, color: 0x8F8B45 });
        }
      }
    }
  }

  // ------------------------------------------------------------------ dynamic / single objects
  function crateMesh(size) {
    size = size || 2.2;
    const m = new T.MeshLambertMaterial({ map: A.tex('crate') });
    m.userData.shared = false;
    return new T.Mesh(rb(size, size * 0.86, size, size * 0.07, 1), m);
  }
  let crateMatShared = null;
  function crateMeshShared(size) {
    if (!crateMatShared) { crateMatShared = new T.MeshLambertMaterial({ map: A.tex('crate') }); crateMatShared.userData.shared = true; }
    return new T.Mesh(rb(size || 2.2, (size || 2.2) * 0.86, size || 2.2, (size || 2.2) * 0.07, 1), crateMatShared);
  }

  function barrelGeo() {
    const b = new G.Builder();
    b.add(G.cyl(12), { sx: 0.55, sy: 1.5, sz: 0.55, color: 0x2A2D30 });
    for (const y of [-0.45, 0.45]) b.add(G.cyl(12), { y, sx: 0.585, sy: 0.14, sz: 0.585, color: 0x45494D });
    b.add(G.cyl(12), { y: 0.76, sx: 0.47, sy: 0.06, sz: 0.47, color: 0x17191B });
    b.add(G.cyl(12), { y: 0.0, sx: 0.575, sy: 0.22, sz: 0.575, color: 0x8A6A12 });
    const g = b.build(); G.mark(g); return g;
  }
  function sandbagGeo() { return rb(1.5, 0.56, 0.9, 0.22, 1); }

  function clouds(rng) {
    const b = new G.Builder();
    for (let i = 0; i < 18; i++) {
      const a = rng.range(0, 6.28), r = rng.range(380, 760), y = rng.range(150, 260), cx = Math.cos(a) * r, cz = Math.sin(a) * r, k = rng.range(0.9, 1.6);
      const n = rng.int(4, 6);
      for (let j = 0; j < n; j++) {
        const s = rng.range(28, 52) * k;
        b.add(G.sph(8, 6), { x: cx + (j - n / 2) * 38 * k + rng.range(-8, 8), y: y + rng.range(-5, 8), z: cz + rng.range(-20, 20), sx: s * 1.3, sy: s * 0.72, sz: s, color: j % 2 ? 0xFFFFFF : 0xE8F1FA });
      }
      b.add(G.box1, { x: cx, y: y - 16 * k, z: cz, sx: n * 38 * k, sy: 6, sz: 40 * k, color: 0xCFE0F0 });
    }
    const m = new T.Mesh(b.build(), new T.MeshBasicMaterial({ vertexColors: true, fog: false }));
    m.frustumCulled = false;
    return m;
  }

  function mountains(rng) {
    const b = new G.Builder();
    for (let ring = 0; ring < 2; ring++) {
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2 + rng.range(-0.04, 0.04), r = (ring ? 720 : 570) + rng.range(-30, 60);
        const h = rng.range(55, 125) * (ring ? 1.25 : 1), w = rng.range(170, 300), x = Math.cos(a) * r, z = Math.sin(a) * r;
        b.add(G.cone(9), { x, y: h / 2 - 14, z, ry: rng.range(0, 3), sx: w, sy: h, sz: w * rng.range(0.7, 1), color: ring ? 0x93B5CE : 0x6D8FA4 });
        b.add(G.cone(9), { x: x + rng.range(-30, 30), y: h * 0.32 - 14, z: z + rng.range(-30, 30), ry: rng.range(0, 3), sx: w * 0.85, sy: h * 0.6, sz: w * 0.85, color: ring ? 0x9DBDD4 : 0x7A9DB2 });
      }
    }
    for (let i = 0; i < 36; i++) { // forested foothills
      const a = rng.range(0, 6.28), r = rng.range(430, 540);
      b.add(G.cone(6), { x: Math.cos(a) * r, y: 10, z: Math.sin(a) * r, sx: rng.range(70, 130), sy: rng.range(26, 46), sz: rng.range(70, 130), color: 0x4F7266 });
    }
    const m = new T.Mesh(b.build(), new T.MeshBasicMaterial({ vertexColors: true, fog: false }));
    m.frustumCulled = false;
    return m;
  }

  function plane() {
    const g = new T.Group(), b = new G.Builder(), gray = 0x8E959B, dark = 0x5E656B;
    b.add(G.cyl(12), { rx: Math.PI / 2, sx: 1.9, sy: 15, sz: 1.9, color: gray });
    b.add(G.cone(12), { z: 8.5, rx: Math.PI / 2, sx: 1.9, sy: 2.6, sz: 1.9, color: dark });
    b.add(G.cone(12), { z: -8.7, rx: -Math.PI / 2, sx: 1.9, sy: 2.4, sz: 1.9, color: gray });
    b.add(rb(24, 0.45, 3.6, 0.15), { y: 0.9, z: 0.8, color: gray });
    b.add(rb(0.5, 4.2, 3, 0.15), { y: 3, z: -7.4, rx: 0.15, color: gray });
    b.add(rb(7.5, 0.35, 2, 0.1), { y: 1.2, z: -7.6, color: gray });
    b.add(rb(3.2, 0.7, 4.6, 0.2), { y: 1.7, z: 5, color: dark });
    for (const x of [-9, -4.2, 4.2, 9]) b.add(G.cyl(8), { x, y: 0.4, z: 2.4, rx: Math.PI / 2, sx: 0.55, sy: 2.2, sz: 0.55, color: dark });
    g.add(new T.Mesh(b.build(), new T.MeshLambertMaterial({ vertexColors: true })));
    const props = [];
    const pm = new T.MeshLambertMaterial({ color: 0x222426 });
    const pg = new G.Builder(); pg.add(G.box1, { sx: 0.2, sy: 2.6, sz: 0.1, color: 0x222426 }); pg.add(G.box1, { sx: 2.6, sy: 0.2, sz: 0.1, color: 0x222426 });
    const pgeo = pg.build();
    for (const x of [-9, -4.2, 4.2, 9]) { const p = new T.Mesh(pgeo, new T.MeshLambertMaterial({ vertexColors: true })); p.position.set(x, 0.4, 3.6); g.add(p); props.push(p); }
    void pm;
    return { group: g, props };
  }

  function parachute(rng) {
    const g = new T.Group(), b = new G.Builder();
    const cg = new T.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    b.add(cg, { y: 5.4, sx: 4.2, sy: 2.4, sz: 4.2, color: 0xD6C39C });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.beam(Math.cos(a) * 4.1, 5.4, Math.sin(a) * 4.1, 0, 1.2, 0, 0.05, 0.05, 0x6B5B3A);
    }
    b.add(G.cyl(14), { y: 5.4, sx: 4.25, sy: 0.18, sz: 4.25, color: 0x9C8A64 });
    g.add(new T.Mesh(b.build(), new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide })));
    const c = crateMeshShared(1.9); c.position.y = 0.2; g.add(c);
    void rng;
    return g;
  }

  function flames() {
    const g = new T.Group(), parts = [];
    const cols = [0xFF7A1A, 0xFFC23A, 0xFF5A10];
    for (let i = 0; i < 3; i++) {
      const m = new T.Mesh(G.cone(6), new T.MeshBasicMaterial({ color: cols[i], transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      m.position.set((i - 1) * 0.5, 0, (i % 2) * 0.4 - 0.2); m.scale.set(1.2 - i * 0.2, 2.6 - i * 0.4, 1.2 - i * 0.2);
      g.add(m); parts.push(m);
    }
    return { group: g, parts };
  }

  WZ.Props = {
    newSet, setMeshes, staticMats, house, tower, wall, tree, rock, camp, flagPole, wreck, cliffs,
    crateMesh, crateMeshShared, barrelGeo, sandbagGeo, clouds, mountains, plane, parachute, flames, hexShade,
  };
})(window.WZ = window.WZ || {});
