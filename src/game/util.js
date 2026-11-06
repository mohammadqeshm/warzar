/* WZ.U math helpers + WZ.SpatialHash (uniform grid, no per-query allocation). */
(function (WZ) {
  'use strict';

  const U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    damp: (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt)),
    wrap(a) {
      a %= Math.PI * 2;
      if (a > Math.PI) a -= Math.PI * 2; else if (a < -Math.PI) a += Math.PI * 2;
      return a;
    },
    angDiff: (from, to) => U.wrap(to - from),
    smooth(a, b, x) { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); },
    fmtTime(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); },
    easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  };

  class SpatialHash {
    constructor(cell, extent) {
      this.cell = cell; this.off = extent;
      this.n = Math.ceil(extent * 2 / cell) + 1;
      this.cells = new Array(this.n * this.n);
      for (let i = 0; i < this.cells.length; i++) this.cells[i] = [];
      this.used = [];
      this.stamp = 1;
    }
    _ci(v) {
      const i = Math.floor((v + this.off) / this.cell);
      return i < 0 ? 0 : i >= this.n ? this.n - 1 : i;
    }
    clear() {
      for (let i = 0; i < this.used.length; i++) this.used[i].length = 0;
      this.used.length = 0;
    }
    insert(item, x, z) {
      const c = this.cells[this._ci(z) * this.n + this._ci(x)];
      if (c.length === 0) this.used.push(c);
      c.push(item);
    }
    insertBox(item, x0, z0, x1, z1) {
      const ix0 = this._ci(x0), ix1 = this._ci(x1), iz0 = this._ci(z0), iz1 = this._ci(z1);
      for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
        const c = this.cells[iz * this.n + ix];
        if (c.length === 0) this.used.push(c);
        c.push(item);
      }
    }
    query(x, z, r, out) {
      out.length = 0;
      const st = ++this.stamp;
      const ix0 = this._ci(x - r), ix1 = this._ci(x + r), iz0 = this._ci(z - r), iz1 = this._ci(z + r);
      for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
        const c = this.cells[iz * this.n + ix];
        for (let i = 0; i < c.length; i++) {
          const it = c[i];
          if (it._qs !== st) { it._qs = st; out.push(it); }
        }
      }
      return out.length;
    }
  }

  WZ.U = U;
  WZ.SpatialHash = SpatialHash;
})(window.WZ = window.WZ || {});
