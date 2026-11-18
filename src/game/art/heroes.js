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
  let domeGeo = null; // allied soldier helmet
  const HERO_LOOK = {
    commander: { w: 1.48, h: 1.13, d: 1.18, skin: 0xD5A072, shade: 0xC99264 },
    nana: { w: 1.44, h: 1.10, d: 1.16, skin: 0xDBA575, shade: 0xCF9768 },
  };

  // Project cloth by distance along each face, not by the rounded box's pre-bevel UV grid.
  // That keeps the pixel blocks the same size on a sleeve, trouser leg and helmet crown.
  const clothCache = new WeakMap();
  const FACE_AXES = [[2, 1, -1, 1], [2, 1, 1, 1], [0, 2, 1, -1], [0, 2, 1, 1], [0, 1, 1, 1], [0, 1, -1, 1]];
  function cloth(w, h, d, r, seg = 1) {
    const source = rb(w, h, d, r, seg);
    let g = clothCache.get(source);
    if (!g) {
      g = G.mark(source.clone());
      const p = g.attributes.position, uv = g.attributes.uv, count = (2 * seg + 2) ** 2;
      const at = (i, axis) => axis === 0 ? p.getX(i) : axis === 1 ? p.getY(i) : p.getZ(i);
      for (let f = 0; f < FACE_AXES.length; f++) {
        const [u, v, su, sv] = FACE_AXES[f];
        for (let i = f * count; i < (f + 1) * count; i++) uv.setXY(i, 0.5 + at(i, u) * su / 1.6, 0.5 + at(i, v) * sv / 1.6);
      }
      clothCache.set(source, g);
    }
    return g;
  }

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
    const hero = HERO_LOOK[o.type], fabric = hero ? cloth : rb;
    const skin = hero ? hero.skin : SKIN, nana = o.type === 'nana';
    const mats = {
      camo: new T.MeshLambertMaterial({ map: A.tex(o.camo), vertexColors: true }),
      plain: hero
        ? new T.MeshPhongMaterial({ vertexColors: true, shininess: 22, specular: 0x25211D })
        : new T.MeshLambertMaterial({ vertexColors: true }),
    };
    const rig = { root, bodyG, mats, type: o.type };

    for (const s of [1, -1]) { // legs: camo trousers, cargo pocket, knee pad, chunky boot with cuff + sole
      const cb = B(), pb = B();
      cb.add(fabric(0.54, 0.6, 0.56, 0.1), { y: -0.3, uv: hero ? [1, 1, 0.10 * s, 0.27] : null });
      cb.add(fabric(0.14, 0.3, 0.36, 0.05), { x: 0.33 * s, y: -0.2, z: 0.02 });
      pb.add(rb(0.16, 0.09, 0.38, 0.04), { x: 0.34 * s, y: -0.07, z: 0.02, color: o.pouch });
      pb.add(rb(0.5, 0.26, 0.17, 0.07), { y: -0.27, z: 0.3, color: hero ? 0x3C3530 : 0x17181A });
      if (hero) {
        pb.add(rb(0.34, 0.225, 0.115, 0.05), { y: -0.278, z: 0.353, color: 0x2A2624 });
        for (const y of [-0.155, -0.385]) pb.add(rb(0.54, 0.05, 0.57, 0.017), { y, color: 0x292623 });
      }
      pb.add(rb(0.58, 0.07, 0.6, 0.03), { y: -0.5, color: 0x1D1E20 });
      const boot = hero ? { x: 0.042 * s, ry: 0.095 * s } : {};
      pb.add(rb(0.6, 0.3, 0.84, 0.12), { ...boot, y: -0.6, z: 0.13, color: hero ? 0x282420 : BLACK });
      pb.add(rb(0.56, 0.12, 0.58, 0.05), { ...boot, y: -0.45, color: hero ? 0x39312A : 0x1F2022 });
      pb.add(rb(0.62, 0.08, 0.88, 0.03), { ...boot, y: -0.73, z: 0.13, color: hero ? 0x4B4136 : 0x3F4042 });
      if (hero) {
        // Layered soles, toe seam and a couple of laces stay readable from the chase camera.
        pb.add(rb(0.595, 0.045, 0.85, 0.018), { ...boot, y: -0.708, z: 0.13, color: 0x191614 });
        for (const [y, z] of [[-0.442, 0.235], [-0.46, 0.33]]) pb.add(G.box1, { ...boot, y, z, sx: 0.28, sy: 0.025, sz: 0.035, color: 0x4A4138 });
      } else pb.add(rb(0.4, 0.05, 0.22, 0.02), { y: -0.5, z: 0.5, color: 0x2A2B2D });
      if (s > 0) pb.add(rb(0.13, 0.36, 0.24, 0.05), { x: 0.38, y: -0.3, z: 0.14, color: GUN }); // thigh holster
      const g = new T.Group(); g.position.set(0.3 * s, 0.75, 0); bodyG.add(g);
      mkMesh(cb, mats.camo, g, true); mkMesh(pb, mats.plain, g, true);
      rig[s > 0 ? 'legL' : 'legR'] = g;
    }

    const torso = new T.Group(); torso.position.set(0, 0.75, 0); bodyG.add(torso); rig.torso = torso;
    {
      const cb = B(), pb = B();
      if (hero) {
        cb.add(cloth(nana ? 1.14 : 1.24, 0.93, 0.78, 0.14), { y: 0.485 });
        cb.add(cloth(1.05, 0.22, 0.71, 0.09), { y: 0.09, uv: [1, 1, 0.13, 0.22] });
        pb.add(rb(nana ? 1.15 : 1.25, 0.705, 0.855, 0.13), { y: 0.535, color: o.vest });
        pb.add(rb(1.18, 0.105, 0.81, 0.043), { y: 0.137, color: 0x26221E });
        pb.add(rb(0.215, 0.102, 0.044, 0.014), { y: 0.135, z: 0.427, color: 0x817568 });
        for (const s of [1, -1]) {
          cb.add(cloth(0.34, 0.16, 0.52, 0.055), { x: s * 0.67, y: 0.934, rz: -s * 0.16, uv: [1, 1, 0.12 * s, 0.31] });
          pb.add(rb(0.13, 0.73, 0.07, 0.025), { x: 0.477 * s, y: 0.59, z: 0.417, color: 0x443A30 });
          pb.add(rb(0.166, 0.105, 0.09, 0.017), { x: 0.477 * s, y: 0.744, z: 0.458, color: 0x2A2622 });
        }
        for (let i = -1.5; i <= 1.5; i++) {
          const x = i * 0.263;
          pb.add(rb(0.238, 0.25, 0.18, 0.037), { x, y: 0.345, z: 0.488, color: o.pouch });
          pb.add(rb(0.25, 0.082, 0.19, 0.021), { x, y: 0.451, z: 0.497, color: 0x55483B });
          pb.add(G.box1, { x, y: 0.422, z: 0.591, sx: 0.06, sy: 0.071, sz: 0.024, color: 0x28231E });
          pb.add(G.box1, { x, y: 0.396, z: 0.604, sx: 0.039, sy: 0.018, sz: 0.008, color: 0x8D7C66 });
        }
        pb.add(rb(0.3, 0.154, 0.067, 0.019), { x: -0.205, y: 0.665, z: 0.452, color: 0x554A3E });
        pb.add(G.box1, { x: -0.205, y: 0.668, z: 0.489, sx: 0.244, sy: 0.103, sz: 0.012, color: 0x2C2722 });
        for (const [x, w] of [[-0.284, 0.048], [-0.205, 0.075], [-0.128, 0.047]]) pb.add(G.box1, { x, y: 0.67, z: 0.497, sx: w, sy: 0.024, sz: 0.008, color: 0xA79883 });
        pb.add(rb(0.95, 0.65, 0.24, 0.1), { y: 0.54, z: -0.491, color: o.pouch });
        for (const x of [-0.30, 0, 0.30]) pb.add(rb(0.249, 0.206, 0.105, 0.032), { x, y: 0.335, z: -0.586, color: 0x3C332A });
        pb.add(rb(0.89, 0.107, 0.59, 0.04), { y: 0.935, color: 0x27221D });
      } else {
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
      }
      mkMesh(cb, mats.camo, torso, true); mkMesh(pb, mats.plain, torso, true);
    }

    for (const s of [1, -1]) { // arms: camo sleeve, bare forearm, black wrist band, fingerless glove
      const cb = B(), pb = B();
      cb.add(fabric(0.44, 0.46, 0.48, 0.1), { y: -0.22, uv: hero ? [1, 1, 0.09 * s, 0.21] : null });
      pb.add(rb(0.34, 0.24, 0.38, 0.08), { y: -0.55, color: skin });
      pb.add(rb(0.42, 0.13, 0.46, 0.05), { y: -0.68, color: 0x17181A });
      if (hero) {
        pb.add(rb(0.41, 0.267, 0.405, 0.11), { y: HAND_Y, color: 0x252320 });
        pb.add(rb(0.385, 0.094, 0.08, 0.033), { y: HAND_Y - 0.035, z: 0.182, color: 0x413832 });
        for (const x of [-0.128, -0.043, 0.043, 0.128]) {
          pb.add(G.sph(8, 5), { x, y: HAND_Y - 0.081 + 0.13 * Math.abs(x), z: 0.182, sx: 0.044, sy: 0.068, sz: 0.05, color: hero.shade });
        }
        pb.add(G.sph(8, 5), { x: -0.154 * s, y: HAND_Y + 0.015, z: 0.174, rz: -s * 0.31, sx: 0.066, sy: 0.061, sz: 0.051, color: skin });
      } else {
        pb.add(rb(0.46, 0.3, 0.5, 0.12), { y: HAND_Y, z: 0.02, color: BLACK });
        pb.add(rb(0.4, 0.1, 0.22, 0.04), { y: HAND_Y - 0.1, z: 0.22, color: BLACK });
        pb.add(rb(0.42, 0.05, 0.24, 0.02), { y: HAND_Y + 0.03, z: 0.2, color: 0x2A2C2F });
      }
      const g = new T.Group(); g.position.set(0.88 * s, 0.88, 0); torso.add(g);
      mkMesh(cb, mats.camo, g, true); mkMesh(pb, mats.plain, g, true);
      rig[s > 0 ? 'armL' : 'armR'] = g;
    }

    const head = new T.Group(); head.position.set(0, 0.93, 0); torso.add(head); rig.head = head;
    const hb = B();
    if (hero) {
      const { w, h, d } = hero;
      hb.add(rb(w, h, d, 0.165, 2), { y: h / 2, color: skin });
      hb.add(rb(w - 0.055, 0.82, 0.25, 0.119, 2), { y: 0.621, z: -d / 2 + 0.055, color: o.hair });
      for (const s of [1, -1]) {
        const x = w / 2;
        hb.add(rb(0.11, 0.39, 0.21, 0.048), { x: s * (x - 0.01), y: 0.805, z: 0.016, color: 0x34302B });
        hb.add(rb(0.224, 0.51, 0.465, 0.094, 2), { x: s * x, y: 0.528, z: -0.025, color: 0x22201F });
        hb.add(rb(0.111, 0.39, 0.36, 0.057), { x: s * (x + 0.11), y: 0.535, z: -0.025, color: 0x3C3630 });
        hb.add(G.cyl(12), { x: s * (x + 0.164), y: 0.54, z: -0.022, rz: Math.PI / 2, sx: 0.105, sy: 0.026, sz: 0.105, color: 0x4C4339 });
        hb.add(G.cyl(10), { x: s * (x + 0.178), y: 0.54, z: -0.022, rz: Math.PI / 2, sx: 0.065, sy: 0.022, sz: 0.065, color: 0x23211F });
        if (nana) {
          hb.add(rb(0.172, 0.42, 0.165, 0.071), { x: s * (x - 0.058), y: 0.769, z: 0.489, rz: s * -0.16, color: o.hair });
          hb.beam(s * (x + 0.028), 0.43, 0.15, s * (x - 0.065), 0.175, 0.394, 0.084, 0.072, 0x3A3027);
        }
      }
    } else {
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
  function addHeroFace(rig, key, noseY, noseW) {
    const look = HERO_LOOK[rig.type], fb = B();
    fb.add(G.plane1, { y: 0.535, z: look.d / 2 + 0.005, sx: look.w - 0.165, sy: 0.96 });
    rig._hb.add(G.sph(12, 8), { y: noseY, z: look.d / 2 - 0.014, sx: noseW, sy: 0.059, sz: 0.081, color: look.shade });
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
    const panReady = nana ? -0.92 : 0;
    tg.legL = 0; tg.legR = 0; tg.armLx = 0; tg.armRx = panReady; tg.armLz = 0.1; tg.armRz = -0.1; tg.lean = 0; tg.bob = 0;
    tg.headX = 0; tg.headZ = 0; tg.headY = rig.lookYaw; tg.rootRx = 0; tg.rootY = 0; tg.twist = 0;
    switch (rig.mode) {
      case 'idle':
        tg.bob = Math.sin(t * 2.2) * 0.02; tg.armLx = -0.18 + Math.sin(t * 1.8) * 0.04;
        tg.armRx = nana ? panReady + Math.sin(t * 1.8) * 0.05 : -0.18 - Math.sin(t * 1.8) * 0.04;
        tg.headZ = Math.sin(t * 1.2) * 0.03; break;
      case 'run': case 'carry': {
        const ph = t * rig.runRate * (0.6 + 0.4 * rig.speed01), s = Math.sin(ph);
        tg.legL = s * 0.95; tg.legR = -s * 0.95; tg.bob = Math.abs(s) * 0.14; tg.lean = 0.16; tg.twist = s * 0.12;
        tg.headZ = Math.sin(ph * 0.5) * 0.04;
        if (rig.mode === 'carry') { tg.armLx = -2.9; tg.armRx = -2.9; tg.armLz = 0.25; tg.armRz = -0.25; tg.lean = 0.08; }
        else { tg.armLx = -s * 0.9; tg.armRx = nana ? -1.25 + Math.sin(ph * 2) * 0.18 : s * 0.9; }
        break;
      }
      case 'sit':
        tg.legL = -1.45; tg.legR = -1.45; tg.bob = Math.sin(t * 3.2) * 0.014;
        tg.lean = 0.05;
        if (nana) {
          tg.armLx = -1.04; tg.armRx = -1.08; tg.armLz = 0.14; tg.armRz = -0.16;
          tg.headY = rig.lookYaw + Math.sin(t * 0.75 + 1.1) * 0.12;
          tg.headZ = Math.sin(t * 1.4) * 0.025;
        } else {
          tg.armLx = -1.16 + Math.sin(t * 1.7) * 0.04;
          tg.armRx = -1.16 - Math.sin(t * 1.7) * 0.04;
          tg.armLz = -0.16; tg.armRz = 0.16;
          tg.headY = rig.lookYaw + Math.sin(t * 0.85) * 0.1;
          tg.headZ = Math.sin(t * 1.3) * 0.02;
        }
        break;
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
    const rig = buildBody({ camo: 'camoCmdr', vest: 0x332C26, pouch: 0x42382F, hair: 0x281D17, type: 'commander' });
    const hb = rig._hb, cb = B(), db = B(), bb = B();
    addHeroFace(rig, 'faceCmdr', 0.438, 0.079);
    // Square patrol cap and low, softly curved bill. The badge sits on the flat front panel.
    cb.add(cloth(1.63, 0.63, 1.39, 0.14, 2), { y: 1.248, uv: [1, 1, 0.11, 0.19] });
    cb.add(cloth(1.44, 0.102, 0.48, 0.045, 2), { y: 0.941, z: 0.764, rx: 0.15, uv: [1, 1, 0.27, 0.07] });
    hb.add(rb(1.645, 0.081, 1.405, 0.036), { y: 0.936, color: 0x342C24 });
    hb.add(rb(1.456, 0.056, 0.487, 0.025, 2), { y: 0.903, z: 0.775, rx: 0.15, color: 0x25221F });
    for (const s of [1, -1]) {
      hb.add(rb(0.118, 0.24, 0.386, 0.038), { x: s * 0.801, y: 1.042, z: 0.005, color: 0x4C4237 });
      for (const z of [-0.118, 0.127]) hb.add(G.cyl(8), { x: s * 0.867, y: 1.056, z, rz: Math.PI / 2, sx: 0.025, sy: 0.024, sz: 0.025, color: 0x2E2923 });
    }
    db.add(G.plane1, { y: 1.249, z: 0.701, sx: 0.55, sy: 0.342 });
    bb.add(G.plane1, { y: 0.627, z: -0.617, ry: Math.PI, sx: 0.45, sy: 0.26 });
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
  // A rounder ballistic shell than the Commander's box cap. Rings use a softened rectangular section.
  const SHELL_Y = 0.925, SHELL_H = 0.679, SHELL_N = 2.85;
  let shellGeo, shellDecalGeo, ponyGeo;
  function shellRadius(t) { return (1 - t * t) ** 0.51 * (1 + 0.15 * t); }
  function shellMesh(nu, nv, point) {
    const pos = [], uv = [], index = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const p = point(i / nu, j / nv);
      pos.push(p[0], p[1], p[2]); uv.push(p[3], p[4]);
      if (i < nu && j < nv) {
        const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
        index.push(a, b, c, b, d, c);
      }
    }
    const g = new T.BufferGeometry(); g.setIndex(index);
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return G.mark(g);
  }
  function helmetShell() {
    if (!shellGeo) shellGeo = shellMesh(40, 12, (u, v) => {
      const theta = (u - 0.5) * Math.PI * 2, t = Math.sin(v * Math.PI / 2), r = shellRadius(t);
      const shape = (a) => Math.sign(a) * Math.abs(a) ** (2 / SHELL_N);
      return [0.847 * r * shape(Math.sin(theta)), SHELL_Y + t * SHELL_H, 0.805 * r * shape(Math.cos(theta)) - t * 0.087, u * 3.4 + v * 0.07, v * 0.65];
    });
    return shellGeo;
  }
  function helmetStickers() {
    if (!shellDecalGeo) shellDecalGeo = shellMesh(24, 8, (u, v) => {
      const x = (u - 0.5) * 1.27, t = 0.08 + v * 0.575, r = shellRadius(t);
      const z = 0.805 * r * (1 - (Math.abs(x) / (0.847 * r)) ** SHELL_N) ** (1 / SHELL_N) - t * 0.087;
      return [x, SHELL_Y + t * SHELL_H, z + 0.009, u, v];
    });
    return shellDecalGeo;
  }
  function ponytail() {
    if (ponyGeo) return ponyGeo;
    const points = [[0, 0, 0], [0.17, 0.08, -0.15], [0.34, 0.012, -0.25], [0.415, -0.22, -0.25],
      [0.417, -0.47, -0.20], [0.34, -0.70, -0.145], [0.40, -0.84, -0.12]];
    const path = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
    const length = 18, sides = 18;
    const g = new T.TubeGeometry(path, length, 1, sides, false), p = g.attributes.position;
    const center = new T.Vector3();
    for (let row = 0; row <= length; row++) {
      const t = row / length;
      path.getPointAt(t, center);
      const radius = 0.005 + 0.10 * (1 - t) + 0.162 * Math.sin(Math.PI * Math.pow(t, 0.69));
      for (let tooth = 0; tooth <= sides; tooth++) {
        const i = row * (sides + 1) + tooth, angle = tooth / sides * Math.PI * 2;
        const r = radius * (1 + 0.086 * Math.cos(angle * 4 + t * 0.9));
        p.setXYZ(i, center.x + (p.getX(i) - center.x) * r, center.y + (p.getY(i) - center.y) * r,
          center.z + (p.getZ(i) - center.z) * r * 0.87);
      }
    }
    g.computeVertexNormals();
    // Smooth the coincident normals at the tube's UV seam.
    const n = g.attributes.normal, a = new T.Vector3(), b = new T.Vector3();
    for (let row = 0; row <= length; row++) {
      const first = row * (sides + 1), last = first + sides;
      a.fromBufferAttribute(n, first).add(b.fromBufferAttribute(n, last)).normalize();
      n.setXYZ(first, a.x, a.y, a.z); n.setXYZ(last, a.x, a.y, a.z);
    }
    return (ponyGeo = G.mark(g));
  }
  function nana() {
    const rig = buildBody({ camo: 'camoNana', vest: 0x302B25, pouch: 0x40362E, hair: 0x35251D, type: 'nana' });
    const hb = rig._hb, cb = B(), db = B();
    addHeroFace(rig, 'faceNana', 0.409, 0.063);

    // Rounded ballistic shell with a flush, uninterrupted stencil and stickers.
    cb.add(helmetShell(), { uv: [1, 1, 0.122, 0.078] });
    cb.add(cloth(1.669, 0.121, 1.63, 0.053), { y: 0.933, z: 0.006, uv: [1, 1, 0.31, 0.21] });
    hb.add(rb(1.719, 0.074, 1.663, 0.034, 2), { y: 0.904, z: 0.013, color: 0x332D27 });
    hb.add(rb(1.585, 0.053, 0.361, 0.024, 2), { y: 0.911, z: 0.684, rx: 0.13, color: 0x25211E });
    for (const s of [1, -1]) {
      hb.add(rb(0.13, 0.208, 0.52, 0.039), { x: s * 0.79, y: 0.933, z: -0.153, color: 0x453B34 });
      hb.add(G.cyl(8), { x: s * 0.857, y: 0.928, z: -0.04, rz: Math.PI / 2, sx: 0.038, sy: 0.027, sz: 0.038, color: 0x282523 });
    }
    db.add(helmetStickers());
    mountFace(rig);
    mkMesh(hb, rig.mats.plain, rig.head, true);
    mkMesh(cb, rig.mats.camo, rig.head, true);
    const dm = new T.MeshLambertMaterial({ map: A.tex('nanaDecals'), alphaTest: 0.4, vertexColors: true });
    mkMesh(db, dm, rig.head, false);

    // Purple tie and a single swept lock. The original rig.tail transform still animates the hair.
    const tg = new T.Group(); tg.position.set(0.44, 0.878, -0.66); rig.head.add(tg); rig.tail = tg;
    const tb = B();
    tb.add(ponytail(), { color: 0x3D2C24 });
    tb.add(G.sph(12, 8), { x: 0.055, y: 0.017, z: -0.043, rx: -0.68, rz: -0.8, sx: 0.133, sy: 0.064, sz: 0.131, color: 0x5A4868 });
    mkMesh(tb, rig.mats.plain, tg, true);

    const bb = B(); bb.add(G.plane1, { x: 0.278, y: 0.672, z: 0.486, sx: 0.305, sy: 0.305 });
    mkMesh(bb, new T.MeshLambertMaterial({ map: A.tex('smiley'), alphaTest: 0.43, vertexColors: true }), rig.torso, false);
    const pa = B();
    [[-0.24, 0.70, 0x567D75, 0.15], [0.11, 0.61, 0xC69A43, -0.16], [0.0, 0.44, 0x9D9685, 0.19], [0.28, 0.76, 0x705E76, 0.12]].forEach(([x, y, color, rz]) => {
      pa.add(rb(0.153, 0.124, 0.024, 0.014), { x, y, z: -0.617, rz, color });
      pa.add(G.box1, { x, y, z: -0.632, rz, sx: 0.09, sy: 0.022, sz: 0.011, color: 0xD6CCAE });
    });
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
