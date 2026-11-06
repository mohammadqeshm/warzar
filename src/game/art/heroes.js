/* WZ.Heroes — Commander and Nana: blocky chibi soldiers (~2.5 heads tall) built from merged chamfered boxes.
 * Rig API: rig.root, rig.setMode(name), rig.update(dt), rig.punch(a), rig.flash(v), rig.swing = 0..1 (pan swing). */
(function (WZ) {
  'use strict';
  const T = THREE, G = WZ.Geo, A = WZ.Assets, rb = G.rbox;
  const B = () => new G.Builder();
  const SKIN = 0xD9A66B, SKIN_D = 0xB98450;
  let domeGeo = null;

  function mkMesh(builder, mat, parent, cast) {
    if (builder.empty) return null;
    const m = new T.Mesh(builder.build(), mat);
    m.castShadow = !!cast;
    parent.add(m);
    return m;
  }

  function buildBody(o) {
    const root = new T.Group(), bodyG = new T.Group();
    root.add(bodyG);
    const mats = {
      camo: new T.MeshLambertMaterial({ map: A.tex(o.camo), vertexColors: true }),
      plain: new T.MeshLambertMaterial({ vertexColors: true }),
    };
    const rig = { root, bodyG, mats, type: o.type };

    for (const s of [1, -1]) { // legs
      const cb = B(), pb = B();
      cb.add(rb(0.52, 0.58, 0.54, 0.1), { y: -0.29 });
      pb.add(rb(0.58, 0.34, 0.82, 0.12), { y: -0.59, z: 0.13, color: 0x16171A });
      pb.add(rb(0.5, 0.3, 0.2, 0.08), { y: -0.2, z: 0.3, color: 0x1A1B1D });
      const g = new T.Group(); g.position.set(0.3 * s, 0.75, 0); bodyG.add(g);
      mkMesh(cb, mats.camo, g, true); mkMesh(pb, mats.plain, g, true);
      rig[s > 0 ? 'legL' : 'legR'] = g;
    }

    const torso = new T.Group(); torso.position.set(0, 0.75, 0); bodyG.add(torso); rig.torso = torso;
    {
      const cb = B(), pb = B();
      cb.add(rb(1.25, 0.95, 0.8, 0.15), { y: 0.48 });
      pb.add(rb(1.32, 0.72, 0.88, 0.12), { y: 0.52, color: o.vest });
      pb.add(rb(1.3, 0.15, 0.86, 0.05), { y: 0.1, color: 0x101010 });
      pb.add(rb(0.22, 0.12, 0.05, 0.02), { y: 0.1, z: 0.45, color: 0xB8BCC0 });
      for (const x of [-0.38, 0, 0.38]) pb.add(rb(0.3, 0.26, 0.14, 0.05), { x, y: 0.3, z: 0.49, color: o.pouch });
      for (const s of [1, -1]) pb.add(rb(0.46, 0.18, 0.52, 0.07), { x: 0.72 * s, y: 0.95, color: o.vest });
      pb.add(rb(0.9, 0.7, 0.3, 0.1), { y: 0.55, z: -0.58, color: o.pouch });
      mkMesh(cb, mats.camo, torso, true); mkMesh(pb, mats.plain, torso, true);
    }

    for (const s of [1, -1]) { // arms
      const cb = B(), pb = B();
      cb.add(rb(0.4, 0.66, 0.44, 0.1), { y: -0.3 });
      pb.add(rb(0.46, 0.36, 0.5, 0.12), { y: -0.74, z: 0.02, color: 0x141414 });
      pb.add(rb(0.44, 0.16, 0.48, 0.06), { y: -0.4, color: 0x1D1F20 });
      const g = new T.Group(); g.position.set(0.86 * s, 0.88, 0); torso.add(g);
      mkMesh(cb, mats.camo, g, true); mkMesh(pb, mats.plain, g, true);
      rig[s > 0 ? 'armL' : 'armR'] = g;
    }

    const head = new T.Group(); head.position.set(0, 0.93, 0); torso.add(head); rig.head = head;
    const hb = B();
    hb.add(rb(1.15, 1.1, 1.1, 0.22), { y: 0.55, color: SKIN });
    for (const s of [1, -1]) hb.add(rb(0.12, 0.3, 0.26, 0.04), { x: 0.6 * s, y: 0.5, color: SKIN_D });
    rig._hb = hb;
    return rig;
  }

  // ------------------------------------------------------------------ animation
  const KEYS = ['legL', 'legR', 'armLx', 'armRx', 'armLz', 'armRz', 'lean', 'bob', 'headX', 'headZ', 'headY', 'rootRx', 'rootY', 'twist'];

  function finish(rig) {
    rig.mode = 'idle'; rig.t = Math.random() * 5; rig.runRate = 15; rig.speed01 = 1; rig.swing = -1; rig.lookYaw = 0;
    rig.pose = {}; rig.tgt = {};
    KEYS.forEach((k) => { rig.pose[k] = 0; rig.tgt[k] = 0; });
    rig.sqX = 0; rig.sqV = 0; rig.flashV = 0;
    rig.setMode = (m) => { rig.mode = m; };
    rig.punch = (a) => { rig.sqV += a * 14; };
    rig.flash = (v) => { rig.flashV = v; };
    rig.update = (dt) => animate(rig, dt);
    rig.dispose = () => G.disposeTree(rig.root);
    delete rig._hb;
    rig.root.scale.setScalar(0.85);
    return rig;
  }

  function animate(rig, dt) {
    const t = (rig.t += dt), tg = rig.tgt, P = rig.pose, nana = rig.type === 'nana';
    const panUp = nana ? -2.15 : 0;
    tg.legL = 0; tg.legR = 0; tg.armLx = 0; tg.armRx = panUp; tg.armLz = 0.1; tg.armRz = -0.1; tg.lean = 0; tg.bob = 0;
    tg.headX = 0; tg.headZ = 0; tg.headY = rig.lookYaw; tg.rootRx = 0; tg.rootY = 0; tg.twist = 0;
    switch (rig.mode) {
      case 'idle':
        tg.bob = Math.sin(t * 2.4) * 0.025; tg.armLx = Math.sin(t * 2) * 0.07;
        tg.armRx = nana ? panUp + Math.sin(t * 2.7) * 0.14 : -Math.sin(t * 2) * 0.07;
        tg.headZ = Math.sin(t * 1.3) * (nana ? 0.1 : 0.04); break;
      case 'run': case 'carry': {
        const ph = t * rig.runRate * (0.6 + 0.4 * rig.speed01), s = Math.sin(ph);
        tg.legL = s * 0.95; tg.legR = -s * 0.95; tg.bob = Math.abs(s) * 0.14; tg.lean = 0.16; tg.twist = s * 0.12;
        tg.headZ = Math.sin(ph * 0.5) * (nana ? 0.12 : 0.03);
        if (rig.mode === 'carry') { tg.armLx = -2.9; tg.armRx = -2.9; tg.armLz = 0.25; tg.armRz = -0.25; tg.lean = 0.08; }
        else { tg.armLx = -s * 0.9; tg.armRx = nana ? panUp + Math.sin(ph * 2) * 0.2 : s * 0.9; }
        break;
      }
      case 'sit':
        tg.legL = -1.45; tg.legR = -1.45; tg.bob = Math.sin(t * 2.4) * 0.015;
        tg.armLx = -1.15; tg.armRx = nana ? panUp + Math.sin(t * 3) * 0.15 : -1.15;
        tg.headZ = Math.sin(t * 1.3) * (nana ? 0.12 : 0.02); break;
      case 'grab':
        tg.legL = -0.9; tg.legR = 0.5; tg.bob = -0.28; tg.lean = 0.6;
        tg.armLx = -1.4 + Math.sin(t * 26) * 0.12; tg.armRx = -1.4 - Math.sin(t * 26) * 0.12; tg.headZ = Math.sin(t * 20) * 0.08; break;
      case 'ko':
        tg.rootRx = -1.45; tg.rootY = 0.55; tg.armLz = 1.3; tg.armRz = -1.3; tg.armLx = -0.3; tg.armRx = -0.3;
        tg.legL = 0.25; tg.legR = -0.25; tg.headZ = Math.sin(t * 5) * 0.15; break;
      case 'dance': {
        const s1 = Math.sin(t * 9);
        tg.armLx = -2.6 + s1 * 0.5; tg.armRx = -2.6 - s1 * 0.5; tg.legL = s1 * 0.5; tg.legR = -s1 * 0.5;
        tg.bob = Math.abs(s1) * 0.18; tg.twist = Math.sin(t * 4.5) * 0.5; tg.headZ = s1 * 0.2; break;
      }
      case 'cheer':
        tg.armLx = -2.9 + Math.sin(t * 10) * 0.3; tg.armRx = -2.9 - Math.sin(t * 10) * 0.3;
        tg.bob = Math.abs(Math.sin(t * 10)) * 0.14; tg.headZ = Math.sin(t * 5) * 0.1; break;
      case 'jump':
        tg.legL = -0.7; tg.legR = 0.4; tg.armLx = -2.2; tg.armRx = nana ? -2.6 : -2.2; tg.lean = -0.1; break;
      case 'hold': // menu pose: commander clutching his rifle
        tg.armLx = -1.25; tg.armRx = -1.4; tg.armLz = -0.45; tg.armRz = 0.3; tg.bob = Math.sin(t * 2) * 0.02;
        tg.headZ = Math.sin(t * 1.1) * 0.03; break;
      default: break;
    }
    if (rig.swing >= 0 && nana) {
      const k = Math.min(1, rig.swing), e = 1 - (1 - k) * (1 - k);
      tg.armRx = -2.75 + (2.2) * e; tg.twist += 0.5 - 1.2 * k; tg.lean += 0.25 * (1 - k);
    }
    const K = 1 - Math.exp(-dt * 18);
    for (let i = 0; i < KEYS.length; i++) { const k = KEYS[i]; P[k] += (tg[k] - P[k]) * K; }
    rig.legL.rotation.x = P.legL; rig.legR.rotation.x = P.legR;
    rig.armL.rotation.set(P.armLx, 0, P.armLz); rig.armR.rotation.set(P.armRx, 0, P.armRz);
    rig.torso.rotation.set(P.lean, P.twist, 0);
    rig.bodyG.position.y = P.bob + P.rootY; rig.bodyG.rotation.x = P.rootRx;
    rig.head.rotation.set(P.headX, P.headY, P.headZ);
    rig.sqV += (-rig.sqX * 260 - rig.sqV * 14) * dt; rig.sqX += rig.sqV * dt;
    const sq = 1 + Math.max(-0.4, Math.min(0.4, rig.sqX)), xz = 1 / Math.sqrt(sq);
    rig.bodyG.scale.set(xz, sq, xz);
    if (rig.flashV > 0.001 || rig._wasFlash) {
      rig.flashV = Math.max(0, rig.flashV - dt * 6);
      const f = rig.flashV;
      rig.mats.camo.emissive.setRGB(f, f * 0.8, f * 0.8); rig.mats.plain.emissive.setRGB(f, f * 0.8, f * 0.8);
      rig._wasFlash = f > 0.001;
    }
  }

  // ------------------------------------------------------------------ Commander
  function commander() {
    const rig = buildBody({ camo: 'camoGreen', vest: 0x23272A, pouch: 0x2C3033, type: 'commander' });
    const hb = rig._hb, cb = B(), db = B();
    for (const s of [1, -1]) {
      hb.add(G.sph(10, 8), { x: 0.28 * s, y: 0.62, z: 0.53, sx: 0.25, sy: 0.2, sz: 0.12, color: 0xF4F1E8 });
      hb.add(G.sph(8, 6), { x: 0.24 * s, y: 0.6, z: 0.63, sx: 0.075, sy: 0.088, sz: 0.05, color: 0x0A0A0A });
      hb.add(rb(0.5, 0.17, 0.14, 0.05), { x: 0.27 * s, y: 0.9, z: 0.57, rz: 0.42 * s, color: 0x120D0A });
      hb.add(G.cyl(14), { x: 0.66 * s, y: 0.5, rz: Math.PI / 2, sx: 0.3, sy: 0.2, sz: 0.3, color: 0x0E0E0E });
    }
    hb.add(rb(0.2, 0.22, 0.14, 0.05), { y: 0.43, z: 0.58, color: SKIN_D });
    hb.add(rb(0.46, 0.07, 0.06, 0.02), { y: 0.2, z: 0.56, color: 0x2A1812 });
    hb.beam(0.66, 0.38, 0.12, 0.3, 0.24, 0.6, 0.05, 0.05, 0x0E0E0E);
    hb.add(G.sph(6, 5), { x: 0.3, y: 0.24, z: 0.62, sx: 0.08, sy: 0.08, sz: 0.08, color: 0x0E0E0E });
    cb.add(rb(1.3, 0.5, 1.32, 0.12), { y: 1.2 });
    cb.add(rb(1.2, 0.12, 1.22, 0.05), { y: 1.5 });
    cb.add(rb(1.0, 0.1, 0.5, 0.04), { y: 0.99, z: 0.85, rx: 0.18 });
    db.add(G.plane1, { y: 1.2, z: 0.665, sx: 0.62, sy: 0.31 });
    mkMesh(hb, rig.mats.plain, rig.head, true);
    mkMesh(cb, rig.mats.camo, rig.head, true);
    const dm = new T.MeshLambertMaterial({ map: A.tex('chevron'), alphaTest: 0.4, vertexColors: true });
    mkMesh(db, dm, rig.head, false);

    // rifle (menu pose); hidden while in the jeep
    const rf = B();
    rf.add(rb(0.2, 0.28, 1.5, 0.05), { color: 0x15171A });
    rf.add(rb(0.26, 0.26, 0.7, 0.06), { z: 0.7, color: 0x23272A });
    rf.add(rb(0.09, 0.09, 0.8, 0.02), { z: 1.3, color: 0x0E0E0E });
    rf.add(rb(0.14, 0.5, 0.22, 0.04), { y: -0.34, z: 0.15, rx: 0.2, color: 0x0E0E0E });
    rf.add(rb(0.2, 0.34, 0.6, 0.06), { z: -0.95, y: -0.04, color: 0x23272A });
    rf.add(rb(0.13, 0.14, 0.5, 0.04), { y: 0.21, z: 0.1, color: 0x0E0E0E });
    const rifle = new T.Group(); rifle.position.set(0.15, 0.55, 0.68); rifle.rotation.set(-0.05, 0, 0);
    mkMesh(rf, rig.mats.plain, rifle, true);
    rig.torso.add(rifle); rig.rifle = rifle; rifle.visible = false;
    return finish(rig);
  }

  // ------------------------------------------------------------------ Nana
  function nana() {
    const rig = buildBody({ camo: 'camoDark', vest: 0x15171A, pouch: 0x1F2226, type: 'nana' });
    const hb = rig._hb, cb = B(), db = B(), pupB = B();
    if (!domeGeo) domeGeo = G.mark(new T.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.56));

    for (const s of [1, -1]) {
      hb.add(G.sph(12, 10), { x: 0.3 * s, y: 0.66, z: 0.52, sx: 0.31, sy: 0.33, sz: 0.2, color: 0xF8F6EE });
      pupB.add(G.sph(8, 6), { x: 0.27 * s, y: 0.62, z: 0.7, sx: 0.14, sy: 0.15, sz: 0.07, color: 0x0A0A0A });
      pupB.add(G.sph(6, 5), { x: 0.24 * s, y: 0.68, z: 0.76, sx: 0.045, sy: 0.045, sz: 0.03, color: 0xFFFFFF });
      hb.add(rb(0.4, 0.1, 0.1, 0.04), { x: 0.3 * s, y: 1.0, z: 0.56, rz: -0.2 * s, color: 0x2A1C12 });
    }
    hb.add(rb(0.2, 0.2, 0.14, 0.05), { y: 0.42, z: 0.6, color: SKIN_D });
    hb.add(rb(0.78, 0.28, 0.1, 0.06), { y: 0.2, z: 0.56, color: 0x2A1010 });
    for (const s of [1, -1]) {
      hb.add(rb(0.2, 0.28, 0.07, 0.03), { x: 0.11 * s, y: 0.23, z: 0.62, color: 0xF2EEE0 });
      hb.add(rb(0.12, 0.08, 0.08, 0.03), { x: 0.42 * s, y: 0.3, z: 0.56, rz: -0.6 * s, color: 0x2A1010 });
    }
    hb.add(rb(0.25, 0.36, 0.09, 0.07), { x: 0.2, y: 0.02, z: 0.6, rz: 0.15, color: 0xD9506A });
    // helmet
    cb.add(domeGeo, { y: 0.98, sx: 0.78, sy: 0.62, sz: 0.8 });
    hb.add(G.cyl(18), { y: 0.88, sx: 0.8, sy: 0.07, sz: 0.82, color: 0x1B1D1A });
    // decals: NANA stencil (3 curved slices), smiley sticker, card patch
    for (let i = -1; i <= 1; i++) {
      const phi = i * 0.5;
      db.add(G.plane1, { x: Math.sin(phi) * 0.745, y: 1.2, z: Math.cos(phi) * 0.77, ry: phi, rx: -0.36, sx: 0.36, sy: 0.25, uv: [1 / 3, 0.5, (i + 1) / 3, 0.5] });
    }
    db.add(G.plane1, { x: Math.sin(1.2) * 0.72, y: 1.12, z: Math.cos(1.2) * 0.74, ry: 1.2, rx: -0.25, sx: 0.3, sy: 0.3, uv: [0.25, 0.5, 0, 0] });
    db.add(G.plane1, { x: Math.sin(-1.2) * 0.72, y: 1.14, z: Math.cos(-1.2) * 0.74, ry: -1.2, rx: -0.25, rz: 0.2, sx: 0.26, sy: 0.32, uv: [0.25, 0.5, 0.25, 0] });
    mkMesh(hb, rig.mats.plain, rig.head, true);
    mkMesh(cb, rig.mats.camo, rig.head, true);
    rig.pupils = mkMesh(pupB, rig.mats.plain, rig.head, false);
    const dm = new T.MeshLambertMaterial({ map: A.tex('nanaDecals'), alphaTest: 0.45, vertexColors: true });
    mkMesh(db, dm, rig.head, false);
    // chest smiley badge
    const bb = B(); bb.add(G.plane1, { x: -0.3, y: 0.62, z: 0.452, sx: 0.34, sy: 0.34 });
    mkMesh(bb, new T.MeshLambertMaterial({ map: A.tex('smiley'), alphaTest: 0.5, vertexColors: true }), rig.torso, false);
    // frying pan on the right hand
    const pb = B();
    pb.add(rb(0.14, 0.14, 1.1, 0.05), { y: -0.74, z: 0.55, color: 0x101010 });
    pb.add(G.cyl(22), { y: -0.74, z: 1.65, sx: 0.62, sy: 0.14, sz: 0.62, color: 0x1A1B1D });
    pb.add(G.cyl(22), { y: -0.84, z: 1.65, sx: 0.66, sy: 0.08, sz: 0.66, color: 0x2F3133 });
    pb.add(G.cyl(22), { y: -0.86, z: 1.65, sx: 0.5, sy: 0.07, sz: 0.5, color: 0x0C0D0E });
    pb.add(G.sph(6, 5), { y: -0.74, z: 1.0, sx: 0.09, sy: 0.16, sz: 0.09, color: 0x050505 });
    rig.pan = mkMesh(pb, rig.mats.plain, rig.armR, true);
    return finish(rig);
  }

  WZ.Heroes = { commander, nana };
})(window.WZ = window.WZ || {});
