/* WZ.DinoArt — the fire-breathing DINOSAUR guardian (Jurassic map): procedural low-poly T-Rex style model + its animation.
 *   WZ.DinoArt.rig(mat, variant)  -> { root, body, legL, legR, torso, armL, armR, head, jaw, tail1, tail2, tail3, glow, flame, dispose() }
 *   WZ.DinoArt.pose(g, C, t, dt)  -> animates the rig from the giant's state (walk cycle, tail sway, bite wind-up / slam, fire-breath wind-up + flame cone)
 * Rig contract is a superset of the club giant's (root, body, legL, legR, torso, armL, armR) so WZ.Giants can drive both. Geometry is built once per colour variant. */
(function (WZ) {
  'use strict';
  const T = THREE, G = WZ.Geo, U = WZ.U, rb = G.rbox;
  const B = () => new G.Builder();
  const BONE = 0xEFE6CB, DARK = 0x1F2A1D, RED = 0xB83A2A;
  const PAL = [
    { body: 0x5E9440, belly: 0xD3E08F, stripe: 0xD9822B, dark: 0x3F6B2C },     // jungle green
    { body: 0x3F8A8E, belly: 0xDDEBB8, stripe: 0xF2B134, dark: 0x2A5F63 },     // teal
    { body: 0x9A6A44, belly: 0xE8D6A0, stripe: 0xCF4A2A, dark: 0x6A4528 },     // rust brown
  ];
  const cache = [];

  function makeParts(v) {
    const P = PAL[v % PAL.length], leg = B(), torso = B(), head = B(), jaw = B(), t1 = B(), t2 = B(), t3 = B(), arm = B();
    // ---- leg (pivot = hip, hangs down to y = -4.3)
    leg.add(rb(1.7, 2.7, 2.2, 0.7), { y: -1.15, z: -0.1, rx: 0.12, color: P.body });
    leg.add(rb(1.1, 2.3, 1.3, 0.4), { y: -2.9, z: -0.35, rx: -0.18, color: P.dark });
    leg.add(rb(1.3, 0.6, 2.5, 0.25), { y: -4.0, z: 0.55, color: P.dark });
    for (const x of [-0.42, 0, 0.42]) leg.add(G.cone(5), { x, y: -4.0, z: 2.0 + (x === 0 ? 0.15 : 0), rx: Math.PI / 2, sx: 0.24, sy: 0.85, sz: 0.24, color: BONE });
    leg.add(rb(1.75, 0.22, 0.5, 0.06), { y: -0.2, z: 0.2, color: P.stripe });
    // ---- torso (origin = hip centre)
    torso.add(rb(2.9, 2.7, 3.3, 0.9), { y: 0.45, z: -0.6, color: P.body });
    torso.add(rb(2.3, 1.2, 3.6, 0.5), { y: -0.55, z: 0.25, color: P.belly });
    torso.add(rb(2.7, 2.9, 3.1, 0.95), { y: 1.15, z: 1.9, rx: -0.1, color: P.body });
    torso.add(rb(2.1, 1.3, 2.8, 0.5), { y: 0.1, z: 2.05, color: P.belly });
    torso.add(rb(1.7, 2.1, 2.5, 0.65), { y: 2.55, z: 3.55, rx: -0.55, color: P.body });
    torso.add(rb(1.25, 1.5, 1.6, 0.4), { y: 2.2, z: 3.95, rx: -0.55, color: P.belly });
    for (const [z, y] of [[-1.6, 1.78], [-0.5, 1.8], [1.3, 2.62], [2.4, 2.6]]) torso.add(rb(2.92, 0.16, 0.5, 0.05), { y, z, color: P.stripe });
    for (let i = 0; i < 7; i++) { const z = -2.0 + i * 0.95, y = 1.95 + Math.min(1, Math.max(0, (z + 0.2) / 3)) * 1.0 + (i > 4 ? 0.3 : 0); torso.add(G.cone(4), { y: y + 0.35, z, rx: -0.15, sx: 0.55, sy: 0.95 - i * 0.05, sz: 0.5, color: i % 2 ? P.stripe : BONE }); }
    // ---- head (pivot = neck top)
    head.add(rb(2.1, 1.75, 2.5, 0.55), { y: 0.2, z: 1.2, color: P.body });
    head.add(rb(1.55, 1.05, 2.2, 0.4), { y: -0.05, z: 3.0, color: P.body });
    head.add(rb(1.2, 0.4, 1.6, 0.15), { y: 0.55, z: 3.4, color: P.dark });
    for (const s of [1, -1]) {
      head.add(G.sph(8, 6), { x: 1.02 * s, y: 0.52, z: 1.55, sx: 0.36, sy: 0.4, sz: 0.4, color: 0xFFD21A });
      head.add(rb(0.06, 0.5, 0.12, 0.02), { x: 1.37 * s, y: 0.52, z: 1.55, color: 0x0E0E0E });
      head.add(rb(0.85, 0.32, 1.0, 0.1), { x: 0.72 * s, y: 1.0, z: 1.5, rz: -0.25 * s, color: P.stripe });
      head.add(G.cone(5), { x: 0.65 * s, y: 1.25, z: 0.2, rx: -0.5, sx: 0.28, sy: 0.9, sz: 0.28, color: BONE });
      head.add(G.sph(6, 4), { x: 0.35 * s, y: 0.28, z: 4.05, sx: 0.14, sy: 0.12, sz: 0.14, color: 0x0E0E0E });
      for (let i = 0; i < 4; i++) head.add(G.cone(5), { x: 0.72 * s, y: -0.62, z: 2.2 + i * 0.52, rx: Math.PI, sx: 0.17, sy: 0.55 - (i === 0 ? 0 : 0.08), sz: 0.17, color: BONE });
    }
    head.add(rb(1.2, 0.12, 2.4, 0.04), { y: -0.58, z: 2.5, color: RED });
    // ---- jaw (pivot = jaw hinge)
    jaw.add(rb(1.5, 0.5, 3.2, 0.2), { y: -0.1, z: 1.6, color: P.belly });
    jaw.add(rb(1.2, 0.1, 2.6, 0.04), { y: 0.2, z: 1.7, color: RED });
    for (const s of [1, -1]) for (let i = 0; i < 4; i++) jaw.add(G.cone(5), { x: 0.62 * s, y: 0.35, z: 1.4 + i * 0.5, sx: 0.13, sy: 0.4, sz: 0.13, color: BONE });
    // ---- arm
    arm.add(rb(0.5, 1.3, 0.55, 0.2), { y: -0.6, color: P.body });
    for (const x of [-0.12, 0.12]) arm.add(G.cone(4), { x, y: -1.5, rx: Math.PI, sx: 0.12, sy: 0.55, sz: 0.12, color: BONE });
    // ---- tail chain
    t1.add(rb(2.0, 2.0, 3.6, 0.7), { z: -1.7, color: P.body }); t1.add(rb(1.4, 0.8, 3.4, 0.3), { y: -0.7, z: -1.7, color: P.belly });
    t1.add(rb(2.02, 0.15, 0.5, 0.05), { y: 0.02, z: -2.0, color: P.stripe });
    t2.add(rb(1.4, 1.4, 3.3, 0.5), { z: -1.6, color: P.body }); t2.add(rb(1.42, 0.14, 0.5, 0.05), { y: 0.02, z: -1.4, color: P.stripe });
    t3.add(rb(0.9, 0.9, 3.0, 0.35), { z: -1.4, color: P.body }); t3.add(G.cone(6), { z: -3.6, rx: -Math.PI / 2, sx: 0.46, sy: 1.8, sz: 0.46, color: P.dark });
    for (const [bld, n] of [[t1, 2], [t2, 2], [t3, 2]]) for (let i = 0; i < n; i++) bld.add(G.cone(4), { y: bld === t1 ? 1.2 : bld === t2 ? 0.85 : 0.6, z: -0.9 - i * 1.3, rx: 0.2, sx: 0.4, sy: 0.7, sz: 0.4, color: i ? BONE : P.stripe });
    const out = { leg: leg.build(), torso: torso.build(), head: head.build(), jaw: jaw.build(), t1: t1.build(), t2: t2.build(), t3: t3.build(), arm: arm.build() };
    for (const k in out) G.mark(out[k]);
    return out;
  }

  let coneG = null;
  function rig(mat, variant) {
    const v = (variant | 0) % PAL.length; if (!cache[v]) cache[v] = makeParts(v);
    const P = cache[v], root = new T.Group(), body = new T.Group(); root.add(body);
    const mesh = (g, parent, x, y, z, cast) => { const m = new T.Mesh(g, mat); m.castShadow = !!cast; const gr = new T.Group(); gr.position.set(x, y, z); gr.add(m); parent.add(gr); return gr; };
    const legL = mesh(P.leg, body, 1.35, 4.3, 0, true), legR = mesh(P.leg, body, -1.35, 4.3, 0, true);
    const torso = mesh(P.torso, body, 0, 4.3, 0, true);
    const armL = mesh(P.arm, torso, 1.35, 1.2, 3.3), armR = mesh(P.arm, torso, -1.35, 1.2, 3.3);
    const head = mesh(P.head, torso, 0, 3.55, 4.45, true), jaw = mesh(P.jaw, head, 0, -0.55, 0.45, true);
    const tail1 = mesh(P.t1, torso, 0, 0.55, -2.1, true), tail2 = mesh(P.t2, tail1, 0, 0, -3.4, true), tail3 = mesh(P.t3, tail2, 0, 0, -3.2, true);
    // mouth glow (fire wind-up) + fire cone (breath): additive, hidden until used
    const add = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide });
    const glowM = add(0xFF7A1C, 0.9), glow = new T.Mesh(new T.SphereGeometry(1, 10, 8), glowM); glow.position.set(0, -0.15, 3.5); glow.scale.setScalar(0.001); glow.frustumCulled = false; head.add(glow);
    if (!coneG) coneG = G.mark(new T.ConeGeometry(1, 1, 12, 1, true));
    const fo = add(0xFF5210, 0.62), fi = add(0xFFA828, 0.6), fc = add(0xFFE59A, 0.55);
    const flameG = new T.Group(); flameG.position.set(0, -0.15, 3.9); flameG.rotation.x = -Math.PI / 2; flameG.visible = false; head.add(flameG);
    const outer = new T.Mesh(coneG, fo), inner = new T.Mesh(coneG, fi), core = new T.Mesh(coneG, fc);
    for (const m of [outer, inner, core]) { m.frustumCulled = false; m.renderOrder = 18; flameG.add(m); }
    return {
      root, body, legL, legR, torso, armL, armR, head, jaw, tail1, tail2, tail3, glow,
      flame: { g: flameG, outer, inner, core }, v,
      dispose() { glowM.dispose(); glow.geometry.dispose(); fo.dispose(); fi.dispose(); fc.dispose(); },
    };
  }

  /** animate one dinosaur. g = giant record (mv, walk, swing, fire, fireT, flash, id, mode, dying, koT), C = its stats (windup, swing, fire.*) */
  function pose(g, C, t, dt) {
    const R = g.rig, F = C.fire, id = g.id, w = g.walk, am = Math.min(1, g.mv / C.speed);
    R.legL.rotation.x = Math.sin(w) * 0.72 * am; R.legR.rotation.x = -Math.sin(w) * 0.72 * am;
    R.body.position.y = Math.abs(Math.sin(w)) * 0.3 * am + Math.sin(t * 1.7 + id) * 0.04; R.body.rotation.z = Math.sin(w) * 0.04 * am;
    R.armL.rotation.x = -0.5 - Math.sin(w) * 0.35 * am + Math.sin(t * 2 + id) * 0.05; R.armR.rotation.x = -0.5 + Math.sin(w) * 0.35 * am;
    // head / jaw / torso targets by state
    let hx = Math.sin(t * 0.7 + id) * 0.05, hy = g.mode === 0 ? Math.sin(t * 0.45 + id) * 0.3 : 0, jw = 0.06 + Math.sin(t * 1.3 + id) * 0.03, tl = 0, gl = 0, k = 7;
    if (g.fire === 1) { const u = Math.min(1, g.fireT / F.windup); hx = -0.6 * u; jw = 0.3 + 0.55 * u; tl = -0.14 * u; gl = 0.25 + 1.0 * u; k = 9; hy = 0; }
    else if (g.fire === 2) { hx = 0.32; jw = 0.95; tl = 0.06; gl = 1.15 + 0.2 * Math.sin(t * 30); k = 14; hy = 0; }
    else if (g.swing > 0) {
      if (g.swing < C.windup) { const u = U.smooth(0, 1, g.swing / C.windup); hx = -0.55 * u; jw = 0.7 * u; tl = -0.12 * u; k = 12; }
      else { hx = 0.7; jw = 0.95; tl = 0.2; k = 40; }
      hy = 0;
    }
    g.hx = U.damp(g.hx || 0, hx, k, dt); g.hy = U.damp(g.hy || 0, hy, 4, dt); g.jw = U.damp(g.jw || 0, jw, k, dt); g.tl = U.damp(g.tl || 0, tl, k, dt); g.gl = U.damp(g.gl || 0, gl, 10, dt);
    R.head.rotation.set(g.hx, g.hy, 0); R.jaw.rotation.x = g.jw; R.torso.rotation.x = g.tl + Math.sin(w * 2) * 0.02 * am;
    R.torso.rotation.y = g.fire === 2 ? 0 : (g.swing > 0 && g.swing < C.windup ? Math.sin(g.swing / C.windup * 1.6) * 0.2 : 0);
    // tail sway (chain with phase lag)
    const sw = Math.sin(w * 0.5 + id) * 0.2 * am, idle = Math.sin(t * 0.9 + id) * 0.07, th = g.fire ? 0.12 * Math.sin(t * 3) : 0;
    R.tail1.rotation.set(0.02 + Math.sin(w + 1) * 0.03 * am, sw + idle + th, 0); R.tail2.rotation.set(0.03, Math.sin(w * 0.5 + id - 0.9) * 0.26 * am + idle * 1.2 + th, 0); R.tail3.rotation.set(0.04, Math.sin(w * 0.5 + id - 1.8) * 0.3 * am + idle * 1.4 + th, 0);
    // mouth glow + flame cone
    const gs = g.gl * 0.55; R.glow.scale.setScalar(Math.max(0.001, gs)); R.glow.visible = gs > 0.02; R.glow.material.opacity = Math.min(1, 0.4 + g.gl * 0.5);
    const fl = R.flame;
    if (g.fire === 2) {
      const grow = Math.min(1, g.fireT / 0.22), fade = Math.min(1, (F.dur - g.fireT) / 0.22 + 0.001), len = F.len * grow * Math.max(0.05, fade), fk = 0.88 + 0.12 * Math.sin(t * 43 + id) + 0.08 * Math.sin(t * 71), r = F.wEnd * 0.62 * fk;
      fl.g.visible = true;
      fl.outer.scale.set(r, len, r); fl.outer.position.y = -len / 2;
      fl.inner.scale.set(r * 0.62, len * 0.78, r * 0.62); fl.inner.position.y = -len * 0.39;
      fl.core.scale.set(r * 0.3, len * 0.45, r * 0.3); fl.core.position.y = -len * 0.225;
    } else fl.g.visible = false;
  }

  WZ.DinoArt = { rig, pose, PAL };
})(window.WZ = window.WZ || {});
