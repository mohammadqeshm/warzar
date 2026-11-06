/* WZ.EnemyArt — instanced toy-soldier enemies (rust-red + dark gray, googly eyes, varied helmets).
 * One InstancedMesh per body part => all enemies cost ~9 draw calls. */
(function (WZ) {
  'use strict';
  const T = THREE, G = WZ.Geo, A = WZ.Assets, rb = G.rbox;
  const B = () => new G.Builder();

  const base = new T.Matrix4(), L = new T.Matrix4(), q = new T.Quaternion(), eul = new T.Euler(0, 0, 0, 'YXZ');
  const pv = new T.Vector3(), sc = new T.Vector3(), col = new T.Color(), white = new T.Color(1, 1, 1);

  function part(mesh, idx, px, py, pz, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    L.set(1, 0, 0, px, 0, c, -s, py, 0, s, c, pz, 0, 0, 0, 1);
    L.premultiply(base);
    mesh.setMatrixAt(idx, L);
  }

  const HELM = [[0.23, 0.25, 0.27], [0.62, 0.22, 0.15], [0.29, 0.31, 0.21], [0.6, 0.48, 0.3]];

  function build(maxN) {
    const group = new T.Group();
    const plain = new T.MeshLambertMaterial({ vertexColors: true });
    const mk = (geo, mat, count) => {
      const m = new T.InstancedMesh(geo, mat, count);
      m.frustumCulled = false; m.count = 0;
      m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      m.setColorAt(0, white); m.instanceColor.setUsage(T.DynamicDrawUsage);
      group.add(m);
      return m;
    };
    let b;
    b = B(); b.add(rb(0.95, 0.8, 0.62, 0.14), { y: 0.4, color: 0xA63A28 });
    for (const s of [1, -1]) b.add(G.box1, { y: 0.42, z: 0.32, rz: 0.6 * s, sx: 0.13, sy: 1.0, sz: 0.05, color: 0x3B3F44 });
    b.add(rb(0.98, 0.14, 0.66, 0.05), { y: 0.07, color: 0x2A2C2F }); b.add(rb(0.2, 0.12, 0.05, 0.02), { y: 0.07, z: 0.34, color: 0x8A6A12 });
    const torso = mk(b.build(), plain, maxN);

    b = B(); b.add(rb(0.9, 0.86, 0.86, 0.2), { y: 0.43, color: 0xD9A66B });
    const head = mk(b.build(), plain, maxN);

    const plate = mk(new T.PlaneGeometry(0.88, 0.78), new T.MeshLambertMaterial({ map: A.tex('faceEnemy'), alphaTest: 0.5 }), maxN);
    const eyes = mk(new T.SphereGeometry(0.19, 10, 8), new T.MeshLambertMaterial({ map: A.tex('eye') }), maxN * 2);

    b = B(); b.add(rb(0.3, 0.58, 0.32, 0.08), { y: -0.26, color: 0xA63A28 }); b.add(rb(0.34, 0.28, 0.36, 0.1), { y: -0.6, color: 0x2A2C2F });
    const arms = mk(b.build(), plain, maxN * 2);

    b = B(); b.add(rb(0.42, 0.62, 0.44, 0.1), { y: -0.31, color: 0x3B3F44 }); b.add(rb(0.46, 0.28, 0.62, 0.1), { y: -0.5, z: 0.08, color: 0x1C1D1F });
    const legs = mk(b.build(), plain, maxN * 2);

    const dg = new T.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55); dg.scale(0.58, 0.46, 0.58);
    const dome = mk(dg, plain, maxN);
    // vertex colour for the dome (white, tinted per instance)
    { const n = dg.attributes.position.count, c = new Float32Array(n * 3).fill(1); dg.setAttribute('color', new T.BufferAttribute(c, 3)); }
    b = B(); b.add(rb(1.0, 0.34, 1.0, 0.1), { y: 0.17 }); b.add(rb(0.8, 0.07, 0.4, 0.03), { y: 0.04, z: 0.6 });
    const cap = mk(b.build(), plain, maxN);

    const cnt = { torso: 0, head: 0, plate: 0, eyes: 0, arms: 0, legs: 0, dome: 0, cap: 0 };
    const meshes = { torso, head, plate, eyes, arms, legs, dome, cap };

    const view = {
      group, meshes,
      begin() { for (const k in cnt) cnt[k] = 0; },
      /** e: enemy (tint colors, flash, scale, variant). ph: walk phase; arm: arm raise (attack). hy/hr: helmet pop offset/rot. */
      push(e, x, y, z, h, tilt, ph, arm, hy, hr) {
        const s = e.scale;
        q.setFromEuler(eul.set(tilt, h, 0));
        base.compose(pv.set(x, y, z), q, sc.set(s, s, s));
        const k = 1 + e.flash * 1.5;
        const sw = Math.sin(ph) * 0.9;
        let i;
        col.copy(e.cCloth).multiplyScalar(k);
        i = cnt.torso++; part(torso, i, 0, 0.62, 0, 0); torso.setColorAt(i, col);
        i = cnt.legs; cnt.legs += 2;
        part(legs, i, 0.26, 0.62, 0, sw); legs.setColorAt(i, col);
        part(legs, i + 1, -0.26, 0.62, 0, -sw); legs.setColorAt(i + 1, col);
        i = cnt.arms; cnt.arms += 2;
        part(arms, i, 0.6, 1.34, 0, -sw * 0.9 - arm); arms.setColorAt(i, col);
        part(arms, i + 1, -0.6, 1.34, 0, sw * 0.9 - arm); arms.setColorAt(i + 1, col);
        col.copy(e.cSkin).multiplyScalar(k);
        i = cnt.head++; part(head, i, 0, 1.42, 0, Math.sin(ph * 2) * 0.05); head.setColorAt(i, col);
        col.setRGB(k, k, k);
        i = cnt.plate++; part(plate, i, 0, 1.85, 0.442, 0); plate.setColorAt(i, col);
        i = cnt.eyes; cnt.eyes += 2;
        part(eyes, i, 0.23, 1.92, 0.4, 0); eyes.setColorAt(i, col);
        part(eyes, i + 1, -0.23, 1.92, 0.4, 0); eyes.setColorAt(i + 1, col);
        col.copy(e.cHelm).multiplyScalar(k);
        if (e.variant === 0) { i = cnt.dome++; part(dome, i, 0, 2.02 + hy, 0, hr); dome.setColorAt(i, col); }
        else { i = cnt.cap++; part(cap, i, 0, 2.22 + hy, 0, hr); cap.setColorAt(i, col); }
      },
      end() {
        for (const k in meshes) {
          const m = meshes[k];
          m.count = cnt[k];
          m.instanceMatrix.needsUpdate = true;
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
        }
      },
      /** randomise per-enemy look (called at spawn) */
      style(e, rnd) {
        const v = 0.88 + rnd() * 0.24;
        e.cCloth.setRGB(v, v * (0.95 + rnd() * 0.1), v);
        const sk = 0.82 + rnd() * 0.3; e.cSkin.setRGB(sk, sk * 0.98, sk * 0.96);
        const hc = HELM[(rnd() * HELM.length) | 0]; e.cHelm.setRGB(hc[0], hc[1], hc[2]);
        e.variant = rnd() < 0.62 ? 0 : 1;
      },
      dispose() { G.disposeTree(group); for (const k in meshes) meshes[k].dispose(); },
    };
    return view;
  }

  WZ.EnemyArt = { build };
})(window.WZ = window.WZ || {});
