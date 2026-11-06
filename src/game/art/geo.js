/* WZ.Geo — shared primitives, chamfered "toy" boxes and a geometry Builder that merges many parts
 * (with per-part vertex colour + UV scale) into ONE BufferGeometry => few draw calls. */
(function (WZ) {
  'use strict';
  const T = THREE;
  const cache = new Map();
  const mark = (g) => { g.userData.shared = true; return g; };
  const cached = (key, fn) => { let g = cache.get(key); if (!g) { g = mark(fn()); cache.set(key, g); } return g; };

  const E = new T.Euler(0, 0, 0, 'YXZ'), Q = new T.Quaternion(), M = new T.Matrix4(), NM = new T.Matrix3();
  const V = new T.Vector3(), N = new T.Vector3(), P = new T.Vector3(), S = new T.Vector3(), C = new T.Color();

  /** Box with beveled/rounded edges (smooth normals at the bevel => soft toy look). seg=1 is a chamfer. */
  function rbox(w, h, d, r, seg) {
    seg = seg || 1;
    r = Math.min(r == null ? 0.1 : r, w * 0.49, h * 0.49, d * 0.49);
    const key = 'rb' + [w, h, d, r, seg].map((v) => v.toFixed(3)).join('_');
    return cached(key, () => {
      const n = seg * 2 + 1;
      const g = new T.BoxGeometry(w, h, d, n, n, n);
      const pos = g.attributes.position, nor = g.attributes.normal;
      const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
      const remap = (c, s) => { const i = Math.round((c / s + 0.5) * n); return i <= seg ? -s / 2 + r * (i / seg) : s / 2 - r * ((n - i) / seg); };
      for (let i = 0; i < pos.count; i++) {
        const x = remap(pos.getX(i), w), y = remap(pos.getY(i), h), z = remap(pos.getZ(i), d);
        const ix = Math.max(-hx, Math.min(hx, x)), iy = Math.max(-hy, Math.min(hy, y)), iz = Math.max(-hz, Math.min(hz, z));
        let nx = x - ix, ny = y - iy, nz = z - iz;
        const l = Math.hypot(nx, ny, nz);
        if (l > 1e-6) { nx /= l; ny /= l; nz /= l; pos.setXYZ(i, ix + nx * r, iy + ny * r, iz + nz * r); nor.setXYZ(i, nx, ny, nz); }
        else pos.setXYZ(i, x, y, z);
      }
      return g;
    });
  }

  /** Gable prism along X: footprint len x w, ridge height `rise`. Flat-shaded. */
  function prism(len, w, rise) {
    const key = 'pr' + [len, w, rise].map((v) => v.toFixed(2)).join('_');
    return cached(key, () => {
      const l = len / 2, hw = w / 2;
      const A0 = [-l, 0, -hw], A1 = [-l, 0, hw], A2 = [-l, rise, 0], B0 = [l, 0, -hw], B1 = [l, 0, hw], B2 = [l, rise, 0];
      const pos = [], nor = [], uv = [];
      const tri = (a, b, c, en) => {
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        if (nx * en[0] + ny * en[1] + nz * en[2] < 0) { const t = b; b = c; c = t; }
        const nn = new T.Vector3(en[0], en[1], en[2]).normalize();
        [a, b, c].forEach((p, i) => { pos.push(p[0], p[1], p[2]); nor.push(nn.x, nn.y, nn.z); uv.push(i === 1 ? 1 : 0, i === 2 ? 1 : 0); });
      };
      tri(A0, A1, A2, [-1, 0, 0]); tri(B0, B1, B2, [1, 0, 0]);
      tri(A1, B1, B2, [0, hw, rise]); tri(A1, B2, A2, [0, hw, rise]);
      tri(A0, B0, B2, [0, hw, -rise]); tri(A0, B2, A2, [0, hw, -rise]);
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      return g;
    });
  }

  class Builder {
    constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.base = null; }
    get empty() { return this.p.length === 0; }
    /** o: {x,y,z, rx,ry,rz (YXZ order), sx,sy,sz, color, uv:[su,sv,ou,ov]} */
    add(geo, o) {
      o = o || {};
      const g = geo.index ? (geo.userData.ni || (geo.userData.ni = geo.toNonIndexed())) : geo;
      E.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ'); Q.setFromEuler(E);
      M.compose(P.set(o.x || 0, o.y || 0, o.z || 0), Q, S.set(o.sx == null ? 1 : o.sx, o.sy == null ? 1 : o.sy, o.sz == null ? 1 : o.sz));
      if (this.base) M.premultiply(this.base);
      NM.getNormalMatrix(M);
      C.set(o.color == null ? 0xffffff : o.color);
      const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv;
      const uv = o.uv, hasUv = !!ua;
      for (let i = 0; i < pa.count; i++) {
        V.fromBufferAttribute(pa, i).applyMatrix4(M);
        this.p.push(V.x, V.y, V.z);
        N.fromBufferAttribute(na, i).applyMatrix3(NM).normalize();
        this.n.push(N.x, N.y, N.z);
        let u = hasUv ? ua.getX(i) : 0, v = hasUv ? ua.getY(i) : 0;
        if (uv) { u = u * uv[0] + (uv[2] || 0); v = v * uv[1] + (uv[3] || 0); }
        this.u.push(u, v);
        this.c.push(C.r, C.g, C.b);
      }
      return this;
    }
    /** box oriented between two points (beams, braces, rails) */
    beam(ax, ay, az, bx, by, bz, tx, ty, color, geo) {
      const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz);
      return this.add(geo || Geo.box1, {
        x: (ax + bx) / 2, y: (ay + by) / 2, z: (az + bz) / 2,
        ry: Math.atan2(dx, dz), rx: -Math.asin(dy / len), sx: tx, sy: ty, sz: len, color,
      });
    }
    build() {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(this.u, 2));
      g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
      g.computeBoundingSphere(); g.computeBoundingBox();
      return g;
    }
  }

  function disposeTree(obj) {
    obj.traverse((o) => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      if (o.material) {
        const arr = Array.isArray(o.material) ? o.material : [o.material];
        arr.forEach((m) => { if (!m.userData.shared) m.dispose(); });
      }
    });
  }

  const Geo = {
    box1: mark(new T.BoxGeometry(1, 1, 1)),
    plane1: mark(new T.PlaneGeometry(1, 1)),
    cyl: (seg) => cached('cyl' + seg, () => new T.CylinderGeometry(1, 1, 1, seg || 10)),
    cone: (seg) => cached('cone' + seg, () => new T.CylinderGeometry(0, 1, 1, seg || 6)),
    sph: (ws, hs) => cached('sph' + ws + '_' + hs, () => new T.SphereGeometry(1, ws || 10, hs || 8)),
    ico: () => cached('ico', () => new T.IcosahedronGeometry(1, 0)),
    rbox, prism, Builder, disposeTree, mark,
  };
  Geo.beamPlane = () => cached('beamPlane', () => { const g = new T.PlaneGeometry(1, 1); g.translate(0, 0.5, 0); return g; });

  WZ.Geo = Geo;
})(window.WZ = window.WZ || {});
