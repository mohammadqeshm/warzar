/* WZ.MagmaArt — the MAGMA TITAN guardian (Volcanic map): a hulking basalt giant with glowing lava seams, obsidian spikes and a molten core in its chest.
 *   WZ.MagmaArt.rig(mat, variant) -> { root, body, legL, legR, torso, armL, armR, head, core, glow, boulder, dispose() }
 *   WZ.MagmaArt.pose(g, C, t, dt) -> animates the rig from the guardian record (walk cycle, SLAM wind-up/smash, BOULDER wind-up/release, embers + footstep dust)
 * Rig contract is a superset of the club giant's (root, body, legL, legR, torso, armL, armR) so WZ.Giants can drive every guardian type.
 * Stone parts use the shared Lambert `mat` (so the hit-flash / wind-up tint works); the glowing seams use an unlit vertex-coloured material. */
(function (WZ) {
  'use strict';
  const T = THREE, G = WZ.Geo, U = WZ.U, rb = G.rbox;
  const B = () => new G.Builder();
  const ST = [0x3A3232, 0x2E2828, 0x453B39, 0x252020], DARK = 0x1F1B1B, OBS = 0x1B1A24, OBS2 = 0x2C2B3A, LAVA = 0xFF6A1A, LAVA2 = 0xFFA030, HOT = 0xFFE060;
  let cache = null;

  function makeParts() {
    const leg = B(), legL = B(), torso = B(), torsoL = B(), arm = B(), armLv = B(), head = B(), headL = B(), bo = B(), boL = B();
    // ---- leg (pivot = hip, hangs down to y = -3.6)
    leg.add(G.ico(), { y: -1.35, sx: 1.4, sy: 1.75, sz: 1.35, ry: 0.4, color: ST[0] });
    leg.add(rb(1.6, 1.7, 1.7, 0.4), { y: -2.75, color: ST[1] });
    leg.add(rb(2.1, 0.85, 2.7, 0.3), { y: -3.2, z: 0.45, color: DARK });
    for (const x of [-0.6, 0, 0.6]) leg.add(G.cone(5), { x, y: -3.1, z: 2.0, rx: Math.PI / 2, sx: 0.3, sy: 0.7, sz: 0.3, color: OBS });
    legL.add(rb(1.7, 0.1, 0.34, 0.03), { y: -1.9, z: 0.86, color: LAVA }); legL.add(rb(0.12, 1.1, 0.3, 0.03), { x: 0.5, y: -2.7, z: 0.9, rz: 0.2, color: LAVA2 });
    // ---- torso (origin = hip centre)
    torso.add(rb(3.7, 1.25, 2.7, 0.45), { y: 0.45, color: ST[3] });
    torso.add(G.ico(), { y: 2.55, sx: 3.0, sy: 2.2, sz: 2.4, ry: 0.5, color: ST[0] });
    torso.add(G.ico(), { y: 3.7, z: -0.45, sx: 2.7, sy: 1.5, sz: 2.0, ry: 1.1, color: ST[1] });
    for (const s of [1, -1]) {
      torso.add(G.ico(), { x: 3.0 * s, y: 4.1, sx: 1.75, sy: 1.35, sz: 1.6, ry: 0.7 * s, color: ST[2] });
      torso.add(G.cone(5), { x: 3.1 * s, y: 5.1, z: -0.1, rz: -0.3 * s, sx: 0.55, sy: 1.9, sz: 0.55, color: OBS });
      torso.add(G.cone(5), { x: 2.5 * s, y: 4.8, z: 0.7, rz: -0.55 * s, rx: 0.3, sx: 0.4, sy: 1.2, sz: 0.4, color: OBS2 });
    }
    for (let i = 0; i < 5; i++) torso.add(G.cone(5), { x: (i % 2 ? 0.3 : -0.3), y: 2.6 + i * 0.75, z: -1.95 - (i === 2 ? 0.2 : 0), rx: -0.7, sx: 0.55, sy: 1.5 - Math.abs(i - 2) * 0.22, sz: 0.55, color: i % 2 ? OBS : OBS2 });
    // head
    head.add(G.ico(), { y: 0.0, z: 0.1, sx: 1.25, sy: 1.0, sz: 1.2, ry: 0.3, color: ST[0] });
    head.add(rb(2.0, 0.4, 0.6, 0.12), { y: 0.5, z: 1.0, color: DARK });
    head.add(rb(1.5, 0.55, 1.0, 0.2), { y: -0.65, z: 0.7, color: ST[1] });
    for (const s of [1, -1]) {
      head.add(G.cone(5), { x: 0.85 * s, y: 0.95, z: -0.1, rz: -0.55 * s, sx: 0.36, sy: 1.8, sz: 0.36, color: OBS });
      head.add(G.cone(4), { x: 1.15 * s, y: 0.1, z: 0.2, rz: -1.2 * s, sx: 0.22, sy: 0.9, sz: 0.22, color: OBS2 });
    }
    headL.add(rb(0.46, 0.2, 0.12, 0.04), { x: 0.5, y: 0.22, z: 1.28, rz: -0.25, color: HOT }); headL.add(rb(0.46, 0.2, 0.12, 0.04), { x: -0.5, y: 0.22, z: 1.28, rz: 0.25, color: HOT });
    headL.add(rb(1.0, 0.12, 0.1, 0.03), { y: -0.55, z: 1.2, color: LAVA }); headL.add(rb(0.12, 0.5, 0.1, 0.03), { x: 0.0, y: 0.35, z: 1.3, color: LAVA });
    torsoL.add(G.sph(10, 8), { y: 2.7, z: 1.85, sx: 0.95, sy: 0.95, sz: 0.5, color: LAVA2 });       // molten core in the chest
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; torsoL.add(rb(0.14, 1.3, 0.16, 0.03), { x: Math.cos(a) * 0.95, y: 2.7 + Math.sin(a) * 0.95, z: 1.86, rz: a - Math.PI / 2, color: LAVA }); }
    torsoL.add(rb(2.2, 0.12, 0.2, 0.03), { y: 1.1, z: 1.3, color: LAVA }); torsoL.add(rb(0.14, 1.4, 0.2, 0.03), { x: -1.6, y: 3.0, z: 1.55, rz: 0.4, color: LAVA }); torsoL.add(rb(0.14, 1.2, 0.2, 0.03), { x: 1.7, y: 3.2, z: 1.4, rz: -0.5, color: LAVA });
    torsoL.add(rb(0.12, 1.5, 0.16, 0.03), { x: -0.9, y: 3.8, z: -1.5, rz: 0.2, color: LAVA }); torsoL.add(rb(0.12, 1.3, 0.16, 0.03), { x: 1.0, y: 3.6, z: -1.5, rz: -0.3, color: LAVA });
    // ---- arm (pivot = shoulder, hangs down to the fist at y ~ -5)
    arm.add(G.ico(), { y: -1.45, sx: 1.15, sy: 1.75, sz: 1.15, ry: 0.5, color: ST[0] });
    arm.add(rb(1.5, 0.7, 1.5, 0.3), { y: -2.75, color: DARK });
    arm.add(G.ico(), { y: -3.75, sx: 1.3, sy: 1.5, sz: 1.3, ry: 1.0, color: ST[1] });
    arm.add(G.ico(), { y: -5.0, sx: 1.6, sy: 1.4, sz: 1.6, ry: 0.2, color: ST[2] });
    for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.55; arm.add(G.cone(4), { x: Math.sin(a) * 1.2, y: -5.1, z: Math.cos(a) * 1.2, rx: Math.PI / 2, sx: 0.28, sy: 0.65, sz: 0.28, color: OBS }); }
    armLv.add(rb(1.6, 0.12, 0.3, 0.03), { y: -2.75, z: 0.74, color: LAVA }); armLv.add(rb(0.12, 0.9, 0.3, 0.03), { x: 0.4, y: -3.9, z: 0.6, rz: 0.2, color: LAVA2 }); armLv.add(rb(1.7, 0.1, 1.7, 0.03), { y: -4.3, color: LAVA });
    // ---- boulder (a molten rock, held overhead during the throw wind-up)
    bo.add(G.ico(), { sx: 1.55, sy: 1.4, sz: 1.5, ry: 0.4, color: 0x2A2321 });
    for (let i = 0; i < 7; i++) { const a = i * 0.9; boL.add(G.box1, { x: Math.cos(a) * 1.1, y: Math.sin(i * 1.7) * 0.9, z: Math.sin(a) * 1.1, ry: a, rx: i * 0.7, sx: 0.22, sy: 0.22, sz: 1.4, color: i % 2 ? LAVA : LAVA2 }); }
    const out = { leg: leg.build(), legL: legL.build(), torso: torso.build(), torsoL: torsoL.build(), arm: arm.build(), armL: armLv.build(), head: head.build(), headL: headL.build(), bo: bo.build(), boL: boL.build() };
    for (const k in out) G.mark(out[k]);
    return out;
  }

  let sphG = null;
  function rig(mat, variant) {
    if (!cache) cache = makeParts();
    void variant;
    const P = cache, root = new T.Group(), body = new T.Group(); root.add(body);
    const lavaMat = new T.MeshBasicMaterial({ vertexColors: true, fog: false });
    const mesh = (g, parent, x, y, z, cast, lava) => { const gr = new T.Group(); gr.position.set(x, y, z); const m = new T.Mesh(g, mat); m.castShadow = !!cast; gr.add(m); if (lava) { const l = new T.Mesh(lava, lavaMat); gr.add(l); } parent.add(gr); return gr; };
    const legL = mesh(P.leg, body, 1.15, 3.6, 0, true, P.legL), legR = mesh(P.leg, body, -1.15, 3.6, 0, true, P.legL);
    const torso = mesh(P.torso, body, 0, 3.6, 0, true, P.torsoL);
    const armL = mesh(P.arm, torso, 3.05, 3.95, 0, false, P.armL), armR = mesh(P.arm, torso, -3.05, 3.95, 0, true, P.armL);
    const head = mesh(P.head, torso, 0, 5.5, 0.35, true, P.headL);
    // chest glow halo (wind-up telegraph) + the boulder in the right hand
    if (!sphG) sphG = G.mark(new T.SphereGeometry(1, 12, 9));
    const glowM = new T.MeshBasicMaterial({ color: 0xFF7A1C, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    const glow = new T.Mesh(sphG, glowM); glow.position.set(0, 2.7, 2.0); glow.scale.setScalar(0.001); glow.frustumCulled = false; glow.renderOrder = 18; torso.add(glow);
    const boulder = new T.Group(); boulder.position.set(0, -5.4, 0.2); boulder.visible = false;
    const bm = new T.Mesh(P.bo, mat), bl = new T.Mesh(P.boL, lavaMat); bm.castShadow = false; boulder.add(bm, bl); armR.add(boulder);
    return {
      root, body, legL, legR, torso, armL, armR, head, glow, boulder, core: glow, v: 0,
      dispose() { lavaMat.dispose(); glowM.dispose(); },
    };
  }

  /** animate one Titan. g = guardian record (mv, walk, swing, tk, tkT, flash, id, mode, dying, rx/ry/rz), C = its stats (windup, rock.windup ...) */
  function pose(g, C, t, dt) {
    const R = g.rig, id = g.id, w = g.walk, am = Math.min(1, g.mv / C.speed), RK = C.rock;
    R.legL.rotation.x = Math.sin(w) * 0.62 * am; R.legR.rotation.x = -Math.sin(w) * 0.62 * am;
    R.body.position.y = Math.abs(Math.sin(w)) * 0.34 * am + Math.sin(t * 1.4 + id) * 0.05; R.body.rotation.z = Math.sin(w) * 0.05 * am;
    // arm targets by state
    let aR = -0.16 + Math.sin(w) * 0.38 * am + Math.sin(t * 1.5 + id) * 0.03, aL = -0.16 - Math.sin(w) * 0.38 * am, lean = 0, k = 8, gl = g.mode === 1 ? 0.12 : 0, bs = 0;
    if (g.swing > 0) {                                   // SLAM: both fists overhead, then smash
      if (g.swing < C.windup) { const u = U.smooth(0, 1, g.swing / C.windup); aR = aL = -2.95 * u; lean = -0.26 * u; k = 12; gl = 0.25 + 0.55 * u; }
      else { aR = aL = -0.25; lean = 0.5; k = 40; gl = 0.3; }
    } else if (g.tk === 1) {                             // BOULDER wind-up: right arm cocked back with the molten rock, left arm points at the victim
      const u = U.smooth(0, 1, g.tkT / RK.windup); aR = -2.7 * u; aL = -1.15 * u; lean = -0.3 * u; k = 10; gl = 0.25 + 0.75 * u; bs = u;
    } else if (g.tk === 2) { aR = -0.2; aL = -0.5; lean = 0.38; k = 34; gl = 0.45; }   // release follow-through
    g.armK = U.damp(g.armK == null ? -0.2 : g.armK, aR, k, dt); g.armLK = U.damp(g.armLK == null ? -0.2 : g.armLK, aL, k, dt); g.leanK = U.damp(g.leanK || 0, lean, k, dt); g.gl = U.damp(g.gl || 0, gl, 9, dt);
    R.armR.rotation.x = g.armK; R.armR.rotation.z = 0.14; R.armL.rotation.x = g.armLK; R.armL.rotation.z = -0.14;
    R.torso.rotation.x = g.leanK; R.torso.rotation.y = g.tk === 1 ? Math.sin(Math.min(1, g.tkT / RK.windup) * 1.6) * -0.22 : (g.swing > 0 && g.swing < C.windup ? Math.sin(g.swing / C.windup * 1.6) * 0.2 : 0);
    R.head.rotation.x = (g.tk === 1 || g.swing > 0) ? -0.28 * g.gl : Math.sin(t * 0.8 + id) * 0.04 + 0.05;
    // chest glow + boulder
    const gs = (0.2 + g.gl * 2.1) * (1 + 0.1 * Math.sin(t * 6 + id)); R.glow.scale.setScalar(g.dying ? 0.001 : Math.max(0.001, gs)); R.glow.visible = !g.dying && gs > 0.3; R.glow.material.opacity = Math.min(0.95, 0.25 + g.gl * 0.7);
    R.boulder.visible = g.tk === 1 && !g.dying; if (R.boulder.visible) { R.boulder.scale.setScalar(0.35 + 0.65 * bs); R.boulder.rotation.y = t * 1.5; }
    // embers drifting off its back, dust + sparks with every footstep
    const P = WZ.Particles; if (!P || !P.ready || g.dying) return;
    g.emT = (g.emT || 0) - dt; if (g.emT <= 0) { g.emT = g.mode === 1 ? 0.09 : 0.22; P.emit(1, g.rx + (Math.random() - 0.5) * 3, g.ry + 5 + Math.random() * 4, g.rz + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1.5, 1.6 + Math.random() * 2, (Math.random() - 0.5) * 1.5, 1.1 + Math.random() * 0.8, 0.55, 0.1, 1, 0.5 + Math.random() * 0.25, 0.1, 0.9, 0, -0.5, 0.3); }
    const down = Math.sin(w) > 0.93 ? 1 : (Math.sin(w) < -0.93 ? 2 : 0);
    if (down && am > 0.3 && g.step !== down) { g.step = down; const sx = (down === 1 ? 1.15 : -1.15) * Math.cos(g.ph || 0), sz = (down === 1 ? -1.15 : 1.15) * Math.sin(g.ph || 0); P.dust(g.rx + sx, g.ry, g.rz + sz, 3); P.sparks(g.rx + sx, g.ry + 0.4, g.rz + sz, 4, 1, 0.45, 0.1); } else if (!down) g.step = 0;
  }

  WZ.MagmaArt = { rig, pose };
})(window.WZ = window.WZ || {});
