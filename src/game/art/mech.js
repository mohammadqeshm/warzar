/* WZ.MechArt — the HARBOR MECH guardian (harbor map): a heavy military walker. Olive armour with hazard stripes, a glowing visor, a big shoulder CANNON on the right
 * arm and a MISSILE POD on the left arm. Same rig contract as the club giant / dino / titan / beast (superset):
 *   WZ.MechArt.rig(mat, variant) -> { root, body, legL, legR, torso, armL, armR, head, glow, core, cannon, pod, dispose() }
 *   WZ.MechArt.pose(g, C, t, dt) -> animates it from the guardian record: walk cycle, crouch behind cover, upper-body twist toward the target (g.M.aimY), cannon aim /
 *   recoil, missile pod opening, stomp. The state lives in g.M (written by WZ.Harbor.mech). Lambert parts use the shared `mat` (hit flash / telegraph tint). */
(function (WZ) {
  'use strict';
  const T = THREE, G = WZ.Geo, U = WZ.U, rb = G.rbox;
  const B = () => new G.Builder();
  const OLIVE = 0x5C6B4C, OLIVE_D = 0x3F4A36, OLIVE_L = 0x77865F, DARK = 0x2A3034, GREY = 0x7C868B, GREY_D = 0x4C565B, YEL = 0xE8B71A, BLK = 0x16191B, RED = 0xFF3A1A, ORG = 0xFF8A2A;
  let cache = null;

  function makeParts() {
    const leg = B(), legL = B(), torso = B(), torsoL = B(), armR = B(), armRL = B(), armL = B(), armLL = B(), cannon = B(), head = B(), headL = B();
    // ---- leg: pivot = hip, hangs to y = -4.4
    leg.add(rb(1.9, 2.3, 2.1, 0.35), { y: -1.15, color: OLIVE });
    leg.add(rb(2.0, 0.5, 2.2, 0.12), { y: -0.35, color: OLIVE_D });
    leg.add(G.cyl(10), { y: -2.35, rz: Math.PI / 2, sx: 0.85, sy: 2.0, sz: 0.85, color: GREY_D });
    leg.add(rb(1.6, 2.1, 1.8, 0.3), { y: -3.1, z: -0.05, color: OLIVE_D });
    leg.add(G.cyl(6), { x: 0.0, y: -1.6, z: 1.1, rx: 0.2, sx: 0.2, sy: 2.4, sz: 0.2, color: GREY });                              // hydraulic piston
    leg.add(rb(2.9, 0.9, 3.7, 0.3), { y: -4.0, z: 0.55, color: DARK });
    for (const x of [-1.0, 0, 1.0]) leg.add(rb(0.8, 0.5, 1.0, 0.1), { x, y: -4.25, z: 2.5, color: GREY_D });
    leg.add(rb(0.12, 0.7, 1.8, 0.04), { x: 1.02, y: -1.3, z: 0.2, color: YEL }); leg.add(rb(0.12, 0.7, 0.5, 0.04), { x: 1.03, y: -1.3, z: -0.5, color: BLK });
    legL.add(rb(0.1, 0.18, 0.5, 0.03), { x: 0.0, y: -3.9, z: 2.65, color: ORG });
    // ---- torso: origin = hip centre
    torso.add(rb(3.9, 1.3, 2.9, 0.4), { y: 0.45, color: DARK });
    torso.add(rb(5.0, 3.2, 3.7, 0.7), { y: 2.7, color: OLIVE });
    torso.add(rb(5.3, 0.55, 3.9, 0.15), { y: 1.25, color: OLIVE_D });
    torso.add(rb(3.0, 1.7, 2.3, 0.5), { y: 4.75, z: 0.55, color: OLIVE_D });
    torso.add(rb(2.4, 0.5, 1.6, 0.15), { y: 5.75, z: 0.5, color: GREY_D });
    for (const s of [1, -1]) {
      torso.add(rb(1.5, 1.3, 1.9, 0.3), { x: 3.1 * s, y: 4.1, color: OLIVE_L });
      torso.add(rb(0.14, 0.9, 1.4, 0.04), { x: 3.9 * s, y: 4.1, color: YEL });
    }
    torso.add(rb(3.4, 2.4, 1.6, 0.3), { y: 3.2, z: -2.4, color: GREY_D });                                                         // engine block
    for (const s of [-1, 1]) { torso.add(G.cyl(8), { x: 1.1 * s, y: 5.2, z: -2.6, sx: 0.4, sy: 3.0, sz: 0.4, color: DARK }); torso.add(G.cyl(8), { x: 1.1 * s, y: 6.75, z: -2.6, sx: 0.46, sy: 0.3, sz: 0.46, color: BLK }); }
    torso.add(G.cyl(5), { x: -1.6, y: 6.8, z: -0.2, sx: 0.09, sy: 3.2, sz: 0.09, color: GREY }); torso.add(G.cone(8), { x: -1.6, y: 8.6, z: -0.2, rx: -0.5, sx: 0.9, sy: 0.35, sz: 0.9, color: GREY });   // radar dish
    torso.add(rb(1.7, 0.26, 0.1, 0.03), { y: 2.6, z: 1.9, color: YEL }); torso.add(rb(1.0, 0.26, 0.1, 0.03), { x: -0.9, y: 2.6, z: 1.92, color: BLK }); torso.add(rb(1.0, 0.26, 0.1, 0.03), { x: 0.9, y: 2.6, z: 1.92, color: BLK });
    torso.add(rb(1.2, 1.2, 0.12, 0.05), { x: -1.3, y: 3.1, z: 1.9, color: GREY }); torso.add(G.cyl(10), { x: -1.3, y: 3.1, z: 1.98, rx: Math.PI / 2, sx: 0.3, sy: 0.1, sz: 0.3, color: DARK });   // number plate / star
    torsoL.add(rb(2.1, 0.5, 0.12, 0.04), { y: 4.85, z: 1.72, color: RED }); torsoL.add(rb(0.35, 0.35, 0.1, 0.03), { x: 1.9, y: 3.6, z: 1.9, color: ORG });
    // ---- cannon arm (right): pivot = shoulder, hangs down along -y
    armR.add(rb(1.6, 2.6, 1.7, 0.35), { y: -1.3, color: OLIVE_D });
    armR.add(G.cyl(10), { y: -2.7, rz: Math.PI / 2, sx: 0.9, sy: 1.8, sz: 0.9, color: GREY_D });
    armR.add(rb(2.0, 1.8, 2.0, 0.35), { y: -3.6, color: OLIVE });
    cannon.add(rb(1.5, 2.2, 1.5, 0.25), { y: -4.5, color: DARK });
    cannon.add(G.cyl(12), { y: -7.4, sx: 0.55, sy: 4.6, sz: 0.55, color: GREY_D });
    cannon.add(G.cyl(12), { y: -6.0, sx: 0.75, sy: 1.0, sz: 0.75, color: GREY });
    cannon.add(rb(1.3, 0.9, 1.3, 0.2), { y: -9.85, color: DARK });
    for (const s of [-1, 1]) cannon.add(rb(0.12, 0.6, 1.0, 0.03), { x: 0.7 * s, y: -9.85, color: BLK });
    armRL.add(G.cyl(8), { y: -10.45, sx: 0.4, sy: 0.12, sz: 0.4, color: ORG });
    // ---- missile pod arm (left)
    armL.add(rb(1.5, 2.5, 1.6, 0.35), { y: -1.25, color: OLIVE_D });
    armL.add(G.cyl(10), { y: -2.6, rz: Math.PI / 2, sx: 0.85, sy: 1.7, sz: 0.85, color: GREY_D });
    armL.add(rb(2.9, 2.8, 2.6, 0.3), { y: -4.3, z: 0.3, color: OLIVE_L });
    armL.add(rb(3.0, 0.3, 2.7, 0.1), { y: -2.85, z: 0.3, color: DARK });
    armL.add(rb(0.12, 1.8, 1.8, 0.04), { x: 1.48, y: -4.3, z: 0.1, color: YEL });
    for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) {
      armL.add(G.cyl(10), { x: -0.8 + k * 0.8, y: -3.75 - i * 1.0, z: 1.62, rx: Math.PI / 2, sx: 0.34, sy: 0.4, sz: 0.34, color: BLK });
      armLL.add(G.sph(8, 5), { x: -0.8 + k * 0.8, y: -3.75 - i * 1.0, z: 1.78, sx: 0.28, sy: 0.28, sz: 0.2, color: ORG });
    }
    // ---- head / sensor turret on the roof
    head.add(rb(1.4, 0.9, 1.3, 0.25), { y: 0.45, color: GREY_D }); head.add(G.cyl(8), { y: 1.1, z: 0.2, rx: Math.PI / 2, sx: 0.28, sy: 0.7, sz: 0.28, color: DARK });
    headL.add(rb(0.5, 0.2, 0.1, 0.03), { y: 0.55, z: 0.68, color: RED });
    const out = { leg: leg.build(), legL: legL.build(), torso: torso.build(), torsoL: torsoL.build(), armR: armR.build(), armRL: armRL.build(), armL: armL.build(), armLL: armLL.build(), cannon: cannon.build(), head: head.build(), headL: headL.build() };
    for (const k in out) G.mark(out[k]);
    return out;
  }

  let sphG = null;
  function rig(mat, variant) {
    if (!cache) cache = makeParts();
    void variant;
    const P = cache, root = new T.Group(), body = new T.Group(); root.add(body);
    const glowMat = new T.MeshBasicMaterial({ vertexColors: true, fog: false });
    const mesh = (g, parent, x, y, z, cast, lit) => { const gr = new T.Group(); gr.position.set(x, y, z); const m = new T.Mesh(g, mat); m.castShadow = !!cast; gr.add(m); if (lit) gr.add(new T.Mesh(lit, glowMat)); parent.add(gr); return gr; };
    const legL = mesh(P.leg, body, 1.4, 4.4, 0, true, P.legL), legR = mesh(P.leg, body, -1.4, 4.4, 0, true, null);
    const torso = mesh(P.torso, body, 0, 4.4, 0, true, P.torsoL);
    const armR = mesh(P.armR, torso, -3.25, 4.2, 0, true, null), cannon = mesh(P.cannon, armR, 0, 0, 0, true, P.armRL);
    const armL = new T.Group(); armL.position.set(3.25, 4.2, 0); torso.add(armL); const armLm = new T.Mesh(P.armL, mat); armLm.castShadow = true; armL.add(armLm);
    const podGlow = new T.Mesh(P.armLL, glowMat); podGlow.scale.setScalar(0.001); armL.add(podGlow);
    const head = mesh(P.head, torso, 0.0, 6.0, -0.6, false, P.headL);
    if (!sphG) sphG = G.mark(new T.SphereGeometry(1, 12, 9));
    const glowM = new T.MeshBasicMaterial({ color: 0xFF7A2A, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    const glow = new T.Mesh(sphG, glowM); glow.position.set(0, -10.6, 0); glow.scale.setScalar(0.001); glow.frustumCulled = false; glow.renderOrder = 18; armR.add(glow);
    return { root, body, legL, legR, torso, armL, armR, head, glow, core: glow, cannon, pod: armL, podGlow, v: 0, dispose() { glowMat.dispose(); glowM.dispose(); } };
  }

  /** animate one Harbor Mech. g.M (see WZ.Harbor.mech): st, aimY (torso twist), aimK (cannon aim 0..1), recoil, podK (0..1), crouch (0..1), stT, tele. */
  function pose(g, C, t, dt) {
    const Rg = g.rig, M = g.M || {}, id = g.id, w = g.walk, am = Math.min(1.3, g.mv / C.speed);
    g.mk = g.mk || { cr: 0, aim: 0, pod: 0, rec: 0, yaw: 0, st: 0, lean: 0 };
    const K = g.mk;
    K.cr = U.damp(K.cr, M.crouch || 0, 7, dt); K.aim = U.damp(K.aim, M.aimK || 0, 12, dt); K.pod = U.damp(K.pod, M.podK || 0, 9, dt); K.rec = U.damp(K.rec, M.recoil || 0, 14, dt);
    K.yaw = U.damp(K.yaw, M.aimY || 0, 9, dt);
    const hip = 4.4 * (1 - 0.38 * K.cr), ls = 1 - 0.38 * K.cr;
    Rg.legL.position.y = Rg.legR.position.y = hip; Rg.legL.scale.y = Rg.legR.scale.y = ls; Rg.torso.position.y = hip;
    const sw = Math.sin(w) * 0.62 * am * (1 - K.cr * 0.8);
    Rg.legL.rotation.x = sw; Rg.legR.rotation.x = -sw;
    let stomp = 0, lean = 0;
    if (M.st === 'stomp') { const u = Math.min(1, (M.stT || 0) / C.stomp.windup); stomp = u < 1 ? U.smooth(0, 1, u) : 1 - Math.min(1, ((M.stT || 0) - C.stomp.windup) * 6); Rg.legR.rotation.x = -1.35 * stomp; lean = -0.12 * stomp; if (u >= 1) lean = 0.25 * stomp; }
    K.st = U.damp(K.st, stomp, 20, dt); K.lean = U.damp(K.lean, lean + K.cr * 0.18, 10, dt);
    Rg.body.position.y = Math.abs(Math.sin(w)) * 0.26 * am * (1 - K.cr) + Math.sin(t * 1.5 + id) * 0.03; Rg.body.rotation.z = Math.sin(w) * 0.04 * am;
    Rg.torso.rotation.y = K.yaw; Rg.torso.rotation.x = K.lean;
    const baseR = -0.22 + Math.sin(w) * 0.12 * am - K.cr * 0.5, baseL = -0.2 - Math.sin(w) * 0.12 * am - K.cr * 0.6;
    Rg.armR.rotation.x = U.lerp(baseR, -1.5, K.aim); Rg.armR.rotation.z = 0.1 * (1 - K.aim);
    Rg.cannon.position.y = 1.1 * K.rec;
    Rg.armL.rotation.x = U.lerp(baseL, -0.55, K.pod); Rg.armL.rotation.z = -0.1 - 0.35 * K.pod;
    Rg.podGlow.scale.setScalar(Math.max(0.001, K.pod * (0.8 + 0.2 * Math.sin(t * 24))));
    const gs = (K.aim * 1.7 + (M.muz || 0) * 2.6) * (0.85 + 0.15 * Math.sin(t * 30)); Rg.glow.scale.setScalar(Math.max(0.001, gs)); Rg.glow.material.opacity = Math.min(0.95, 0.25 + K.aim * 0.7 + (M.muz || 0));
    if (M.muz > 0) M.muz = Math.max(0, M.muz - dt * 7);
  }

  WZ.MechArt = { rig, pose };
})(window.WZ = window.WZ || {});
