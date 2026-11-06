/* WZ.Collision — circle-vs-static-colliders (boxes + circles) through a spatial hash, plus the map border. */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG;

  function create(map) {
    const hash = new WZ.SpatialHash(12, map.half + 24);
    const items = [];
    for (const b of map.boxes) { const it = { t: 1, x: b.x, z: b.z, hw: b.hw, hd: b.hd }; items.push(it); hash.insertBox(it, b.x - b.hw, b.z - b.hd, b.x + b.hw, b.z + b.hd); }
    for (const c of map.circles) { const it = { t: 0, x: c.x, z: c.z, r: c.r }; items.push(it); hash.insertBox(it, c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r); }
    const tmp = [];
    const lim = map.half - CFG.world.wallMargin;

    const col = {
      hash, nx: 0, nz: 0,
      /** Push p (with .x/.z) out of any collider. Returns true when something was hit; col.nx/nz = push normal. */
      resolve(p, r) {
        let hit = false, nxs = 0, nzs = 0;
        for (let pass = 0; pass < 2; pass++) {
          hash.query(p.x, p.z, r + 1, tmp);
          for (let i = 0; i < tmp.length; i++) {
            const c = tmp[i];
            if (c.t === 0) {
              let dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
              const rr = r + c.r;
              if (d < rr) {
                if (d < 1e-4) { dx = 1; dz = 0; d = 1; }
                const push = rr - d, nx = dx / d, nz = dz / d;
                p.x += nx * push; p.z += nz * push; nxs += nx; nzs += nz; hit = true;
              }
            } else {
              const cx = Math.max(c.x - c.hw, Math.min(c.x + c.hw, p.x)), cz = Math.max(c.z - c.hd, Math.min(c.z + c.hd, p.z));
              const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
              if (d2 < r * r) {
                let nx, nz, push;
                if (d2 > 1e-8) { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; push = r - d; }
                else {
                  const lx = p.x - c.x, lz = p.z - c.z, px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz);
                  if (px < pz) { nx = lx >= 0 ? 1 : -1; nz = 0; push = px + r; } else { nx = 0; nz = lz >= 0 ? 1 : -1; push = pz + r; }
                }
                p.x += nx * push; p.z += nz * push; nxs += nx; nzs += nz; hit = true;
              }
            }
          }
        }
        if (p.x > lim - r + 0.5) { p.x = lim - r + 0.5; nxs -= 1; hit = true; }
        if (p.x < -lim + r - 0.5) { p.x = -lim + r - 0.5; nxs += 1; hit = true; }
        if (p.z > lim - r + 0.5) { p.z = lim - r + 0.5; nzs -= 1; hit = true; }
        if (p.z < -lim + r - 0.5) { p.z = -lim + r - 0.5; nzs += 1; hit = true; }
        if (hit) { const l = Math.hypot(nxs, nzs) || 1; col.nx = nxs / l; col.nz = nzs / l; }
        return hit;
      },
      /** true when a circle at (x,z) overlaps nothing */
      free(x, z, r) {
        hash.query(x, z, r + 1, tmp);
        for (let i = 0; i < tmp.length; i++) {
          const c = tmp[i];
          if (c.t === 0) { if (Math.hypot(x - c.x, z - c.z) < r + c.r) return false; }
          else {
            const dx = Math.max(Math.abs(x - c.x) - c.hw, 0), dz = Math.max(Math.abs(z - c.z) - c.hd, 0);
            if (dx * dx + dz * dz < r * r) return false;
          }
        }
        return Math.abs(x) < lim - r && Math.abs(z) < lim - r;
      },
    };
    return col;
  }

  WZ.Collision = { create };
})(window.WZ = window.WZ || {});
