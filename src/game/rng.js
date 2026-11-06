/* WZ.RNG — seeded random (mulberry32), integer hash, value noise. */
(function (WZ) {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(a, b) {
    let h = ((a | 0) ^ 0x9E3779B9) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B);
    h ^= ((b | 0) + 0x7F4A7C15 + (h << 6) + (h >>> 2));
    h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function create(seed) {
    const f = mulberry32(seed);
    return {
      next: f,
      range: (a, b) => a + (b - a) * f(),
      int: (a, b) => a + Math.floor(f() * (b - a + 1)),
      pick: (arr) => arr[Math.floor(f() * arr.length)],
      chance: (p) => f() < p,
      sign: () => (f() < 0.5 ? -1 : 1),
    };
  }

  // smooth value noise in [0,1]
  function noise2(seed) {
    const h = (ix, iy) => {
      let n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    };
    return function (x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  }

  function fbm(fn, x, y) {
    return fn(x, y) * 0.55 + fn(x * 2.03 + 5.2, y * 2.03 + 1.3) * 0.3 + fn(x * 4.1 + 9.7, y * 4.1 + 3.1) * 0.15;
  }

  // UTC date seed (Daily Challenge, M3)
  function dateSeed(d) {
    d = d || new Date();
    return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  }

  WZ.RNG = { mulberry32, hash, create, noise2, fbm, dateSeed };
})(window.WZ = window.WZ || {});
