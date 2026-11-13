/* WZ.Heroes — Commander and Nana: blocky chibi soldiers (~2.5 heads tall) built from merged chamfered boxes.
 * Rig API: rig.root, rig.setMode(name), rig.update(dt), rig.punch(a), rig.flash(v), rig.swing = 0..1 (pan swing). */
(function (WZ) {
  'use strict';
  const T = THREE, G = WZ.Geo, A = WZ.Assets, rb = G.rbox;
  const B = () => new G.Builder();
  const SKIN = 0xDCA06A, SKIN_D = 0xBC8654;
  const HW = 1.3, HH = 1.16, HD = 1.2;     // head block (big square chibi head)
  const HAND_Y = -0.83;                    // glove centre in arm space (pan / rifle anchor)
  const BLACK = 0x121315, GUN = 0x1A1C1F;
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

    for (const s of [1, -1]) { // legs: camo trousers, cargo pocket, knee pad, chunky boot with cuff + sole
      const cb = B(), pb = B();
      cb.add(rb(0.54, 0.6, 0.56, 0.1), { y: -0.3 });
      cb.add(rb(0.14, 0.3, 0.36, 0.05), { x: 0.33 * s, y: -0.2, z: 0.02 });
      pb.add(rb(0.16, 0.09, 0.38, 0.04), { x: 0.34 * s, y: -0.07, z: 0.02, color: o.pouch });
      pb.add(rb(0.5, 0.26, 0.17, 0.07), { y: -0.27, z: 0.3, color: 0x17181A });
      pb.add(rb(0.58, 0.07, 0.6, 0.03), { y: -0.5, color: 0x1D1E20 });
      pb.add(rb(0.6, 0.3, 0.84, 0.12), { y: -0.6, z: 0.13, color: BLACK });
      pb.add(rb(0.56, 0.12, 0.58, 0.05), { y: -0.45, color: 0x1F2022 });
      pb.add(rb(0.62, 0.08, 0.88, 0.03), { y: -0.73, z: 0.13, color: 0x3F4042 });
      pb.add(rb(0.4, 0.05, 0.22, 0.02), { y: -0.5, z: 0.5, color: 0x2A2B2D });
      if (s > 0) pb.add(rb(0.13, 0.36, 0.24, 0.05), { x: 0.38, y: -0.3, z: 0.14, color: GUN }); // thigh holster
      const g = new T.Group(); g.position.set(0.3 * s, 0.75, 0); bodyG.add(g);
      mkMesh(cb, mats.camo, g, true); mkMesh(pb, mats.plain, g, true);
      rig[s > 0 ? 'legL' : 'legR'] = g;
    }

    const torso = new T.Group(); torso.position.set(0, 0.75, 0); bodyG.add(torso); rig.torso = torso;
    {
      const cb = B(), pb = B();
      cb.add(rb(1.25, 0.95, 0.8, 0.15), { y: 0.48 });
      pb.add(rb(1.32, 0.72, 0.88, 0.12), { y: 0.52, color: o.vest });               // plate carrier
      pb.add(rb(1.3, 0.15, 0.86, 0.05), { y: 0.1, color: 0x101010 });                // belt
      pb.add(rb(0.22, 0.12, 0.05, 0.02), { y: 0.1, z: 0.45, color: 0xB8BCC0 });      // buckle
      for (const x of [-0.4, 0, 0.4]) {                                              // magazine pouch row + flaps
        pb.add(rb(0.34, 0.3, 0.16, 0.05), { x, y: 0.3, z: 0.5, color: o.pouch });
        pb.add(rb(0.36, 0.08, 0.18, 0.03), { x, y: 0.43, z: 0.5, color: BLACK });
      }
      for (const x of [-0.42, 0.42]) pb.add(rb(0.3, 0.2, 0.12, 0.05), { x, y: 0.66, z: 0.48, color: o.pouch }); // upper utility pouches
      pb.add(rb(0.3, 0.14, 0.05, 0.02), { x: o.type === 'nana' ? -0.3 : -0.3, y: 0.66, z: 0.465, color: 0x3A3D40 }); // ID panel
      for (const s of [1, -1]) {
        pb.add(rb(0.5, 0.2, 0.56, 0.08), { x: 0.74 * s, y: 0.97, color: o.pad || BLACK });     // shoulder pad
        pb.add(rb(0.1, 0.64, 0.06, 0.03), { x: 0.5 * s, y: 0.6, z: 0.46, color: BLACK }); // vest strap
      }
      pb.add(rb(0.9, 0.7, 0.3, 0.1), { y: 0.55, z: -0.58, color: o.pouch });          // back panel
      pb.add(rb(1.0, 0.16, 0.7, 0.06), { y: 0.97, color: BLACK });                    // collar
      mkMesh(cb, mats.camo, torso, true); mkMesh(pb, mats.plain, torso, true);
    }

    for (const s of [1, -1]) { // arms: camo sleeve, bare forearm, black wrist band, fingerless glove
      const cb = B(), pb = B();
      cb.add(rb(0.44, 0.46, 0.48, 0.1), { y: -0.22 });
      pb.add(rb(0.34, 0.24, 0.38, 0.08), { y: -0.55, color: SKIN });
      pb.add(rb(0.42, 0.13, 0.46, 0.05), { y: -0.68, color: 0x17181A });
      pb.add(rb(0.46, 0.3, 0.5, 0.12), { y: HAND_Y, z: 0.02, color: BLACK });
      pb.add(rb(0.4, 0.1, 0.22, 0.04), { y: HAND_Y - 0.1, z: 0.22, color: BLACK });
      pb.add(rb(0.42, 0.05, 0.24, 0.02), { y: HAND_Y + 0.03, z: 0.2, color: 0x2A2C2F });
      const g = new T.Group(); g.position.set(0.88 * s, 0.88, 0); torso.add(g);
      mkMesh(cb, mats.camo, g, true); mkMesh(pb, mats.plain, g, true);
      rig[s > 0 ? 'armL' : 'armR'] = g;
    }

    const head = new T.Group(); head.position.set(0, 0.93, 0); torso.add(head); rig.head = head;
    const hb = B();
    hb.add(rb(HW, HH, HD, 0.16), { y: HH / 2, color: SKIN });
    for (const s of [1, -1]) hb.add(rb(0.12, 0.3, 0.26, 0.04), { x: (HW / 2) * s, y: 0.5, color: SKIN_D });
    hb.add(rb(1.16, 0.66, 0.1, 0.05), { y: 0.57, z: -0.59, color: o.hair });          // hair covering the back of the head
    // communications headset (cups, struts, rings)
    for (const s of [1, -1]) {
      hb.add(G.cyl(16), { x: 0.78 * s, y: 0.52, rz: Math.PI / 2, sx: 0.37, sy: 0.26, sz: 0.37, color: 0x0E0F10 });
      hb.add(G.cyl(16), { x: 0.93 * s, y: 0.52, rz: Math.PI / 2, sx: 0.27, sy: 0.07, sz: 0.27, color: 0x2A2D30 });
      hb.add(G.cyl(12), { x: 0.97 * s, y: 0.52, rz: Math.PI / 2, sx: 0.12, sy: 0.04, sz: 0.12, color: 0x5B6064 });
      hb.add(rb(0.1, 0.4, 0.2, 0.04), { x: 0.72 * s, y: 0.82, z: -0.02, color: 0x0E0F10 });
    }
    rig._hb = hb;
    return rig;
  }

  /** Face decal plane (texture key) in front of the head block + a tiny 3D nose. */
  function addFace(rig, key, planeY, noseY, noseW) {
    const hb = rig._hb, fb = B();
    fb.add(G.plane1, { y: planeY, z: HD / 2 + 0.008, sx: 1.1, sy: 0.98 });
    hb.add(rb(noseW, 0.15, 0.14, 0.05), { y: noseY, z: HD / 2 + 0.03, color: SKIN_D });
    rig._fb = fb; rig._faceKey = key;
  }
  function mountFace(rig) {
    const fm = new T.MeshLambertMaterial({ map: A.tex(rig._faceKey), alphaTest: 0.35, vertexColors: true });
    mkMesh(rig._fb, fm, rig.head, false);
    delete rig._fb; delete rig._faceKey;
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
    delete rig._hb; delete rig._fb;
    rig.root.scale.setScalar(0.82);
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
        tg.armLx = -1.2; tg.armRx = -1.45; tg.armLz = -0.8; tg.armRz = 0.55; tg.bob = Math.sin(t * 2) * 0.02;
        tg.headZ = Math.sin(t * 1.1) * 0.03; break;
      case 'aim': { // combat soldier aiming his assault rifle forward
        const kick = rig.shootKick || 0;
        tg.armLx = -1.35 + kick * 0.22; tg.armRx = -1.48 + kick * 0.28; tg.armLz = -0.58; tg.armRz = 0.32;
        tg.lean = 0.08 - kick * 0.08; tg.bob = Math.sin(t * 3.2) * 0.02;
        break;
      }
      default: break;
    }
    if (rig.type === 'soldier' && (rig.mode === 'run' || rig.mode === 'idle')) {
      const kick = rig.shootKick || 0;
      tg.armLx = -1.15 + kick * 0.2; tg.armRx = -1.32 + kick * 0.25; tg.armLz = -0.52; tg.armRz = 0.35;
    }
    if (rig.shootKick > 0) rig.shootKick = Math.max(0, rig.shootKick - dt * 9);
    if (rig.rifle && rig.type === 'soldier') {
      rig.rifle.position.z = 0.72 - (rig.shootKick || 0) * 0.16;
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
    if (rig.tail) { // ponytail swings with the head and streams back while running
      const run = rig.mode === 'run' || rig.mode === 'carry' ? 1 : 0;
      rig.tail.rotation.set(run * (-0.22 + Math.sin(t * rig.runRate * 0.6) * 0.1), 0, -P.headZ * 0.7 + Math.sin(t * 2.3) * 0.05 - run * 0.1);
    }
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
    const rig = buildBody({ camo: 'camoCmdr', vest: 0x16181A, pouch: 0x23262A, hair: 0x120D0A, type: 'commander' });
    const hb = rig._hb, cb = B(), db = B(), bb = B();
    addFace(rig, 'faceCmdr', 0.56, 0.42, 0.17);
    hb.beam(0.66, 0.34, 0.1, 0.3, 0.2, 0.62, 0.05, 0.05, 0x0E0E0E);                  // mic boom
    hb.add(G.sph(6, 5), { x: 0.3, y: 0.2, z: 0.64, sx: 0.08, sy: 0.08, sz: 0.08, color: 0x0E0E0E });
    // boxy patrol cap: tall flared crown, flat top, short brim, side straps
    cb.add(rb(1.5, 0.74, 1.44, 0.17), { y: 1.26, uv: [1, 0.74] });
    cb.add(rb(1.1, 0.1, 0.5, 0.04), { y: 0.97, z: 0.9, rx: 0.16, uv: [1, 0.2] });
    hb.add(rb(1.52, 0.07, 1.46, 0.03), { y: 0.92, color: 0x15171A });
    for (const s of [1, -1]) hb.add(rb(0.12, 0.34, 0.5, 0.04), { x: 0.77 * s, y: 1.1, color: 0x15171A });
    db.add(G.plane1, { y: 1.22, z: 0.735, sx: 0.62, sy: 0.39 });
    bb.add(G.plane1, { y: 0.6, z: -0.748, ry: Math.PI, sx: 0.56, sy: 0.35 });
    mountFace(rig);
    mkMesh(hb, rig.mats.plain, rig.head, true);
    mkMesh(cb, rig.mats.camo, rig.head, true);
    const dm = new T.MeshLambertMaterial({ map: A.tex('cmdrEmblem'), alphaTest: 0.4, vertexColors: true });
    mkMesh(db, dm, rig.head, false);
    mkMesh(bb, dm, rig.torso, false);

    // assault rifle (menu pose); hidden while in the jeep
    const rf = B();
    rf.add(rb(0.22, 0.3, 0.9, 0.05), { z: 0.05, color: GUN });                             // receiver
    rf.add(rb(0.27, 0.27, 0.72, 0.06), { z: 0.82, color: 0x23272A });                      // handguard
    rf.add(rb(0.1, 0.1, 0.72, 0.02), { z: 1.55, color: 0x0E0E0E });                        // barrel
    rf.add(rb(0.15, 0.15, 0.2, 0.04), { z: 1.95, color: 0x0E0E0E });                       // flash hider
    rf.add(rb(0.34, 0.06, 0.5, 0.02), { y: 0.15, z: 0.82, color: 0x0E0E0E });              // top rail
    rf.add(rb(0.34, 0.05, 0.5, 0.02), { y: -0.15, z: 0.82, color: 0x0E0E0E });             // bottom rail
    rf.add(rb(0.16, 0.16, 0.55, 0.05), { y: 0.26, z: 0.15, color: 0x0E0E0E });             // optic
    rf.add(G.cyl(10), { y: 0.26, z: 0.46, rx: Math.PI / 2, sx: 0.1, sy: 0.14, sz: 0.1, color: 0x2C3034 });
    rf.add(rb(0.15, 0.5, 0.24, 0.04), { y: -0.38, z: 0.2, rx: 0.22, color: 0x0E0E0E });    // magazine
    rf.add(rb(0.13, 0.32, 0.17, 0.04), { y: -0.3, z: -0.3, rx: -0.3, color: 0x0E0E0E });   // grip
    rf.add(rb(0.22, 0.34, 0.6, 0.06), { y: -0.04, z: -0.95, color: 0x23272A });            // stock
    rf.add(rb(0.24, 0.4, 0.1, 0.04), { y: -0.04, z: -1.28, color: 0x0E0E0E });             // butt pad
    const rifle = new T.Group(); rifle.position.set(0.1, 0.5, 0.7); rifle.rotation.set(-0.05, -0.12, 0); rifle.scale.setScalar(1.12);
    mkMesh(rf, rig.mats.plain, rifle, true);
    rig.torso.add(rifle); rig.rifle = rifle; rifle.visible = false;
    return finish(rig);
  }

  // ------------------------------------------------------------------ Nana
  function nana() {
    const rig = buildBody({ camo: 'camoNana', vest: 0x131517, pouch: 0x1E2124, hair: 0x1E120C, type: 'nana' });
    const hb = rig._hb, cb = B(), db = B();
    addFace(rig, 'faceNana', 0.5, 0.3, 0.13);
    if (!domeGeo) domeGeo = G.mark(new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.56));

    // hair peeking out from under the helmet
    for (const s of [1, -1]) hb.add(rb(0.14, 0.34, 0.5, 0.05), { x: 0.64 * s, y: 0.8, z: -0.1, color: 0x1E120C });
    // helmet: big dome with a rim, side mounts
    const DX = 0.9, DY = 0.66, DZ = 0.92, DC = 1.02;
    cb.add(domeGeo, { y: DC, sx: DX, sy: DY, sz: DZ });
    hb.add(G.cyl(22), { y: 1.0, sx: 0.95, sy: 0.07, sz: 0.97, color: 0x1B1D1A });
    hb.add(G.cyl(22), { y: 0.96, sx: 0.93, sy: 0.04, sz: 0.95, color: 0x0E0F0E });
    // decals on the dome surface: NANA in three slices, smiley sticker, card patch
    const dome = (phi, th, sx, sy, o) => {
      const ct = Math.cos(th), k = 1.015;
      db.add(G.plane1, Object.assign({
        x: Math.sin(phi) * DX * ct * k, y: DC + Math.sin(th) * DY * k, z: Math.cos(phi) * DZ * ct * k, ry: phi, rx: -th * 0.9, sx, sy,
      }, o));
    };
    for (let i = -1; i <= 1; i++) dome(i * 0.5, 0.36, 0.44, 0.34, { uv: [1 / 3, 0.5, (i + 1) / 3, 0.5] });
    dome(1.0, 0.12, 0.32, 0.32, { uv: [0.25, 0.5, 0, 0] });
    dome(1.28, 0.5, 0.3, 0.38, { rz: -0.28, uv: [0.25, 0.5, 0.25, 0] });
    mountFace(rig);
    mkMesh(hb, rig.mats.plain, rig.head, true);
    mkMesh(cb, rig.mats.camo, rig.head, true);
    const dm = new T.MeshLambertMaterial({ map: A.tex('nanaDecals'), alphaTest: 0.45, vertexColors: true });
    mkMesh(db, dm, rig.head, false);

    // ponytail: chain of hair lobes from a purple tie behind the helmet, sweeping out and down
    const tg = new T.Group(); tg.position.set(0.5, 0.74, -0.64); rig.head.add(tg); rig.tail = tg;
    const tb = B();
    const lobes = [[0, 0, 0, 0.17], [0.2, -0.03, -0.1, 0.21], [0.44, -0.08, -0.14, 0.24], [0.68, -0.22, -0.13, 0.23], [0.84, -0.46, -0.1, 0.19], [0.92, -0.7, -0.06, 0.13], [0.94, -0.88, -0.04, 0.065]];
    lobes.forEach((l, i) => tb.add(G.sph(10, 8), { x: l[0], y: l[1], z: l[2], sx: l[3], sy: l[3] * 1.05, sz: l[3], color: i % 2 ? 0x2B1A12 : 0x1E120C }));
    tb.add(G.sph(8, 6), { x: 0.1, y: -0.01, z: -0.06, sx: 0.2, sy: 0.11, sz: 0.18, color: 0x5A4590 });
    mkMesh(tb, rig.mats.plain, tg, true);

    // chest smiley badge + colourful patches on the back panel
    const bb = B(); bb.add(G.plane1, { x: 0.3, y: 0.66, z: 0.52, sx: 0.3, sy: 0.3 });
    mkMesh(bb, new T.MeshLambertMaterial({ map: A.tex('smiley'), alphaTest: 0.5, vertexColors: true }), rig.torso, false);
    const pa = B();
    [[-0.22, 0.7, 0x2FA8A0], [0.12, 0.6, 0xE8C040], [0.0, 0.42, 0xD9D4C4], [0.28, 0.76, 0x7A5CC0]].forEach((p) => pa.add(rb(0.17, 0.15, 0.04, 0.02), { x: p[0], y: p[1], z: -0.755, color: p[2] }));
    mkMesh(pa, rig.mats.plain, rig.torso, false);

    // frying pan on the right hand
    const pb = B(), H = HAND_Y;
    pb.add(rb(0.14, 0.14, 1.1, 0.05), { y: H, z: 0.55, color: 0x101010 });
    pb.add(G.cyl(22), { y: H, z: 1.65, sx: 0.62, sy: 0.14, sz: 0.62, color: 0x1A1B1D });
    pb.add(G.cyl(22), { y: H - 0.1, z: 1.65, sx: 0.66, sy: 0.08, sz: 0.66, color: 0x2F3133 });
    pb.add(G.cyl(22), { y: H - 0.12, z: 1.65, sx: 0.5, sy: 0.07, sz: 0.5, color: 0x0C0D0E });
    pb.add(G.sph(6, 5), { y: H, z: 1.0, sx: 0.09, sy: 0.16, sz: 0.09, color: 0x050505 });
    rig.pan = mkMesh(pb, rig.mats.plain, rig.armR, true);
    return finish(rig);
  }

  // ------------------------------------------------------------------ Allied Combat Soldier (Spec-Ops Blue & Gold)
  function soldier() {
    const rig = buildBody({ camo: 'camoSoldier', vest: 0x0F2642, pouch: 0xFFB400, pad: 0xFFB400, hair: 0x101824, type: 'soldier' });
    const hb = rig._hb, cb = B(), db = B(), bb = B();
    addFace(rig, 'faceSoldier', 0.54, 0.38, 0.15);
    if (!domeGeo) domeGeo = G.mark(new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.56));
    // tactical ballistic helmet in Spec-Ops Blue with bright Gold crest & side rails
    const DX = 0.92, DY = 0.68, DZ = 0.94, DC = 1.02;
    cb.add(domeGeo, { y: DC, sx: DX, sy: DY, sz: DZ });
    hb.add(G.cyl(22), { y: 1.0, sx: 0.97, sy: 0.08, sz: 0.99, color: 0x0D223A });
    hb.add(rb(0.32, 0.18, 1.48, 0.05), { y: 1.56, z: 0.0, color: 0xFFB400 });              // bright gold identification crest
    for (const s of [1, -1]) {
      hb.add(rb(0.14, 0.16, 0.7, 0.04), { x: 0.82 * s, y: 1.15, z: 0.05, color: 0xFFB400 }); // side accessory rails
      hb.add(rb(0.1, 0.36, 0.14, 0.03), { x: 0.68 * s, y: 0.38, z: 0.42, color: 0x0D223A }); // chinstrap
    }
    hb.beam(-0.68, 0.36, 0.1, -0.28, 0.2, 0.62, 0.05, 0.05, 0xFFB400);                       // tactical radio mic
    // star emblem on front of helmet and back of vest
    db.add(G.plane1, { y: 1.32, z: 0.86, rx: -0.28, sx: 0.46, sy: 0.46, color: 0xFFB400 });
    bb.add(G.plane1, { y: 0.56, z: -0.75, ry: Math.PI, sx: 0.52, sy: 0.52, color: 0xFFB400 });
    // backpack radio antenna with glowing cyan tip
    const tb = B();
    tb.beam(-0.32, 0.85, -0.58, -0.36, 2.35, -0.68, 0.045, 0.045, 0x0E0E0E);
    tb.add(G.sph(8, 6), { x: -0.36, y: 2.38, z: -0.68, sx: 0.11, sy: 0.11, sz: 0.11, color: 0x38F2FF });
    mkMesh(tb, rig.mats.plain, rig.torso, false);

    mountFace(rig);
    mkMesh(hb, rig.mats.plain, rig.head, true);
    mkMesh(cb, rig.mats.camo, rig.head, true);
    const sm = new T.MeshLambertMaterial({ map: A.tex('star'), alphaTest: 0.45, vertexColors: true });
    mkMesh(db, sm, rig.head, false);
    mkMesh(bb, sm, rig.torso, false);

    // heavy Spec-Ops pulse/assault rifle with cyan optic & gold barrel shroud
    const rf = B();
    rf.add(rb(0.24, 0.32, 0.95, 0.05), { z: 0.05, color: 0x162436 });                        // receiver
    rf.add(rb(0.28, 0.28, 0.78, 0.06), { z: 0.84, color: 0xFFB400 });                        // high-vis gold handguard
    rf.add(rb(0.11, 0.11, 0.78, 0.02), { z: 1.58, color: 0x0E0E0E });                        // barrel
    rf.add(rb(0.17, 0.17, 0.24, 0.04), { z: 1.98, color: 0x2B3036 });                        // muzzle brake
    rf.add(rb(0.18, 0.18, 0.48, 0.05), { y: 0.27, z: 0.18, color: 0x0E0E0E });               // holographic sight
    rf.add(rb(0.14, 0.12, 0.12, 0.02), { y: 0.28, z: 0.4, color: 0x38F2FF });                // glowing cyan lens
    rf.add(rb(0.16, 0.52, 0.26, 0.04), { y: -0.38, z: 0.22, rx: 0.24, color: 0x0E0E0E });    // curved magazine
    rf.add(rb(0.22, 0.34, 0.6, 0.06), { y: -0.04, z: -0.92, color: 0x162436 });              // stock
    const rifle = new T.Group(); rifle.position.set(0.08, 0.48, 0.72); rifle.rotation.set(-0.04, -0.08, 0); rifle.scale.setScalar(1.15);
    mkMesh(rf, rig.mats.plain, rifle, true);
    rig.torso.add(rifle); rig.rifle = rifle; rifle.visible = true;
    rig.shootKick = 0;
    return finish(rig);
  }

  WZ.Heroes = { commander, nana, soldier };
})(window.WZ = window.WZ || {});
