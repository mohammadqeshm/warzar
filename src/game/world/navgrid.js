/* WZ.NavGrid — coarse navigation grid (3 u cells): blocked-cell build from colliders, flood-fill reachability,
 * A* with line-of-sight smoothing (typed arrays, no per-node allocation). */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG;

  class Grid {
    constructor(half, cell) {
      this.half = half; this.cell = cell; this.n = Math.ceil(half * 2 / cell);
      const N = this.n * this.n;
      this.blocked = new Uint8Array(N);
      this.g = new Float32Array(N); this.parent = new Int32Array(N); this.mark = new Int32Array(N); this.closed = new Int32Array(N);
      this.sid = 0; this._hi = []; this._hf = []; this.queue = new Int32Array(N);
    }
    ix(x) { const i = Math.floor((x + this.half) / this.cell); return i < 0 ? 0 : i >= this.n ? this.n - 1 : i; }
    cc(i) { return -this.half + (i + 0.5) * this.cell; }
    idx(x, z) { return this.ix(z) * this.n + this.ix(x); }
    blockedAt(x, z) { return this.blocked[this.idx(x, z)] === 1; }

    los(x0, z0, x1, z1) {
      const d = Math.hypot(x1 - x0, z1 - z0), steps = Math.max(1, Math.ceil(d / (this.cell * 0.5)));
      for (let i = 0; i <= steps; i++) { const t = i / steps; if (this.blockedAt(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false; }
      return true;
    }

    nearestFree(x, z, maxR) {
      const n = this.n, cx = this.ix(x), cz = this.ix(z);
      if (!this.blocked[cz * n + cx]) return { x: this.cc(cx), z: this.cc(cz) };
      let best = null, bd = 1e9;
      for (let r = 1; r <= maxR; r++) {
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const ix = cx + dx, iz = cz + dz;
          if (ix < 0 || iz < 0 || ix >= n || iz >= n || this.blocked[iz * n + ix]) continue;
          const d = dx * dx + dz * dz;
          if (d < bd) { bd = d; best = { x: this.cc(ix), z: this.cc(iz) }; }
        }
        if (best) return best;
      }
      return null;
    }

    /** BFS (8-neighbour, no corner cutting) from a world point. Returns Uint8Array reach flags. */
    flood(sx, sz) {
      const n = this.n, reach = new Uint8Array(n * n), q = this.queue;
      const f = this.nearestFree(sx, sz, 6);
      if (!f) return reach;
      let h = 0, t = 0;
      const s = this.idx(f.x, f.z); reach[s] = 1; q[t++] = s;
      while (h < t) {
        const c = q[h++], cx = c % n, cz = (c / n) | 0;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = cx + dx, nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
          const ni = nz * n + nx;
          if (reach[ni] || this.blocked[ni]) continue;
          if (dx && dz && (this.blocked[cz * n + nx] || this.blocked[nz * n + cx])) continue;
          reach[ni] = 1; q[t++] = ni;
        }
      }
      return reach;
    }

    _push(i, f) {
      const hi = this._hi, hf = this._hf; let k = hi.length; hi.push(i); hf.push(f);
      while (k > 0) { const p = (k - 1) >> 1; if (hf[p] <= f) break; hi[k] = hi[p]; hf[k] = hf[p]; k = p; }
      hi[k] = i; hf[k] = f;
    }
    _pop() {
      const hi = this._hi, hf = this._hf, top = hi[0], li = hi.pop(), lf = hf.pop(), len = hi.length;
      if (len > 0) {
        let k = 0;
        for (;;) {
          let c = 2 * k + 1; if (c >= len) break;
          if (c + 1 < len && hf[c + 1] < hf[c]) c++;
          if (hf[c] >= lf) break;
          hi[k] = hi[c]; hf[k] = hf[c]; k = c;
        }
        hi[k] = li; hf[k] = lf;
      }
      return top;
    }

    /** A*: returns array of {x,z} waypoints (smoothed) or null. */
    path(sx, sz, gx, gz) {
      const n = this.n;
      let s = this.idx(sx, sz), g = this.idx(gx, gz);
      if (this.blocked[s]) { const f = this.nearestFree(sx, sz, 6); if (!f) return null; s = this.idx(f.x, f.z); }
      if (this.blocked[g]) { const f = this.nearestFree(gx, gz, 6); if (!f) return null; g = this.idx(f.x, f.z); }
      if (s === g) return [{ x: gx, z: gz }];
      const sid = ++this.sid, G = this.g, P = this.parent, M = this.mark, CL = this.closed, bl = this.blocked;
      this._hi.length = 0; this._hf.length = 0;
      const gxc = g % n, gzc = (g / n) | 0;
      const hh = (i) => { const dx = Math.abs((i % n) - gxc), dz = Math.abs(((i / n) | 0) - gzc); return dx + dz - 0.5858 * Math.min(dx, dz); };
      G[s] = 0; M[s] = sid; P[s] = -1; this._push(s, hh(s));
      let found = false;
      while (this._hi.length) {
        const cur = this._pop();
        if (CL[cur] === sid) continue;
        CL[cur] = sid;
        if (cur === g) { found = true; break; }
        const cx = cur % n, cz = (cur / n) | 0;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = cx + dx, nz = cz + dz;
          if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
          const ni = nz * n + nx;
          if (bl[ni]) continue;
          if (dx && dz && (bl[cz * n + nx] || bl[nz * n + cx])) continue;
          const ng = G[cur] + (dx && dz ? 1.41421 : 1);
          if (M[ni] !== sid || ng < G[ni]) { M[ni] = sid; G[ni] = ng; P[ni] = cur; this._push(ni, ng + hh(ni)); }
        }
      }
      if (!found) return null;
      const pts = [];
      for (let c = g; c !== -1; c = P[c]) pts.push({ x: this.cc(c % n), z: this.cc((c / n) | 0) });
      pts.reverse();
      const out = []; let ax = sx, az = sz, i = 0;
      while (i < pts.length) {
        let j = pts.length - 1;
        while (j > i && !this.los(ax, az, pts[j].x, pts[j].z)) j--;
        out.push(pts[j]); ax = pts[j].x; az = pts[j].z; i = j + 1;
      }
      return out;
    }
  }

  function build(map, radius) {
    const g = new Grid(map.half, CFG.world.cell), n = g.n, cell = g.cell, inflate = radius + 1.0;
    const lim = map.half - CFG.world.wallMargin - radius;
    const mark = (cxMin, cxMax, czMin, czMax, test) => {
      const i0 = g.ix(cxMin), i1 = g.ix(cxMax), j0 = g.ix(czMin), j1 = g.ix(czMax);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (test(g.cc(i), g.cc(j))) g.blocked[j * n + i] = 1;
    };
    for (const b of map.boxes) {
      const ext = inflate + cell;
      mark(b.x - b.hw - ext, b.x + b.hw + ext, b.z - b.hd - ext, b.z + b.hd + ext, (cx, cz) => {
        const dx = Math.max(Math.abs(cx - b.x) - b.hw, 0), dz = Math.max(Math.abs(cz - b.z) - b.hd, 0);
        return dx * dx + dz * dz < inflate * inflate;
      });
    }
    for (const c of map.circles) {
      const rr = c.r + inflate, ext = rr + cell;
      mark(c.x - ext, c.x + ext, c.z - ext, c.z + ext, (cx, cz) => (cx - c.x) * (cx - c.x) + (cz - c.z) * (cz - c.z) < rr * rr);
    }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { if (Math.abs(g.cc(i)) > lim || Math.abs(g.cc(j)) > lim) g.blocked[j * n + i] = 1; }
    return g;
  }

  /** QA helper: ids of crates / extraction not reachable from the start for jeep and Nana. */
  function validate(map) {
    const bad = [];
    const rj = map.nav.jeep.flood(map.start.x, map.start.z), rn = map.nav.nana.flood(map.start.x, map.start.z);
    const test = (id, p) => {
      const cj = map.nav.jeep.nearestFree(p.x, p.z, 3), cn = map.nav.nana.nearestFree(p.x, p.z, 3);
      if (!cj || !cn || !rj[map.nav.jeep.idx(cj.x, cj.z)] || !rn[map.nav.nana.idx(cn.x, cn.z)]) bad.push(id);
    };
    map.crates.forEach((c, i) => test('crate' + i, c));
    if (map.extract) test('extract', map.extract);
    return bad;
  }

  WZ.NavGrid = { Grid, build, validate };
})(window.WZ = window.WZ || {});
