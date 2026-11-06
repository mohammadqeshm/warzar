/* WZ.Vehicles.jeep() — the Scout Jeep. Open-top camo jeep with roof gun, spare tire, flag, rollbar and a bed
 * that shows delivered crates. Forward = +Z, driver (Commander) on local +X, passenger (Nana) on local -X. */
(function (WZ) {
  'use strict';
  const T = THREE, G = WZ.Geo, A = WZ.Assets, rb = G.rbox;
  const B = () => new G.Builder();

  function wheelGeo() {
    const b = B();
    b.add(G.cyl(18), { rz: Math.PI / 2, sx: 0.72, sy: 0.6, sz: 0.72, color: 0x1E1F20 });
    b.add(G.cyl(10), { rz: Math.PI / 2, sx: 0.36, sy: 0.68, sz: 0.36, color: 0x72757A });
    b.add(G.cyl(8), { rz: Math.PI / 2, sx: 0.14, sy: 0.74, sz: 0.14, color: 0x3A3C3E });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      b.add(G.box1, { y: Math.cos(a) * 0.73, z: Math.sin(a) * 0.73, rx: a, sx: 0.64, sy: 0.14, sz: 0.2, color: 0x34373A });
    }
    return b.build();
  }

  function jeep() {
    const ov = A.modelOverride('jeep');
    if (ov) return ov;
    const root = new T.Group(), bodyG = new T.Group();
    root.add(bodyG);
    const camoM = new T.MeshLambertMaterial({ map: A.tex('camoGreen'), vertexColors: true });
    const plainM = new T.MeshLambertMaterial({ vertexColors: true });
    const cb = B(), pb = B(), db = B();

    // --- camo body
    cb.add(rb(2.5, 0.9, 5.0, 0.22), { y: 1.0 });
    cb.add(rb(2.3, 0.58, 1.95, 0.2), { y: 1.62, z: 1.6 });
    for (const s of [1, -1]) {
      cb.add(rb(0.85, 0.22, 1.5, 0.1), { x: 1.38 * s, y: 1.38, z: 1.8 });
      cb.add(rb(0.85, 0.22, 1.5, 0.1), { x: 1.38 * s, y: 1.38, z: -1.8 });
      cb.add(rb(0.2, 0.62, 2.0, 0.06), { x: 1.2 * s, y: 1.78, z: -1.4 });
    }
    cb.add(rb(2.5, 0.64, 0.2, 0.06), { y: 1.78, z: -2.42 });
    // --- dark/plain parts
    pb.add(rb(2.7, 0.32, 0.34, 0.1), { y: 0.85, z: 2.62, color: 0x2B2E31 });
    for (const s of [1, -1]) pb.add(rb(0.55, 0.2, 0.36, 0.06), { x: 1.0 * s, y: 0.85, z: 2.63, color: 0xFFB400 });
    pb.add(rb(1.7, 0.62, 0.12, 0.04), { y: 1.5, z: 2.58, color: 0x16181A });
    for (let i = 0; i < 4; i++) pb.add(rb(1.6, 0.07, 0.15, 0.02), { y: 1.28 + 0.14 * i, z: 2.6, color: 0x4A4D50 });
    for (const s of [1, -1]) pb.add(G.cyl(14), { x: 0.85 * s, y: 1.62, z: 2.6, rx: Math.PI / 2, sx: 0.3, sy: 0.16, sz: 0.3, color: 0x2B2E31 });
    for (const s of [1, -1]) { // seats
      pb.add(rb(0.95, 0.3, 0.95, 0.1), { x: 0.65 * s, y: 1.64, z: -0.1, color: 0x23272A });
      pb.add(rb(0.95, 0.85, 0.22, 0.08), { x: 0.65 * s, y: 2.1, z: -0.62, rx: -0.1, color: 0x23272A });
    }
    pb.add(rb(2.3, 0.45, 0.45, 0.1), { y: 1.98, z: 0.95, color: 0x23272A });
    for (const s of [1, -1]) pb.beam(1.05 * s, 2.0, 0.95, 1.0 * s, 2.75, 0.68, 0.11, 0.11, 0x1B1D1F);
    pb.add(rb(2.2, 0.1, 0.12, 0.03), { y: 2.75, z: 0.68, color: 0x1B1D1F });
    pb.add(G.cyl(14), { x: 0.65, y: 2.12, z: 0.5, rx: -0.9, sx: 0.28, sy: 0.06, sz: 0.28, color: 0x111111 });
    // roll bar + gun pedestal
    for (const s of [1, -1]) pb.beam(1.1 * s, 1.5, -0.7, 1.0 * s, 3.05, -0.95, 0.15, 0.15, 0x1B1D1F);
    pb.beam(-1.0, 3.05, -0.95, 1.0, 3.05, -0.95, 0.15, 0.15, 0x1B1D1F);
    pb.add(G.cyl(10), { y: 2.2, z: -0.95, sx: 0.24, sy: 1.5, sz: 0.24, color: 0x2B2E31 });
    // spare tire, jerry can, exhaust
    pb.add(G.cyl(18), { y: 2.15, z: -2.66, rx: Math.PI / 2, sx: 0.64, sy: 0.36, sz: 0.64, color: 0x151515 });
    pb.add(G.cyl(10), { y: 2.15, z: -2.86, rx: Math.PI / 2, sx: 0.3, sy: 0.08, sz: 0.3, color: 0x72757A });
    pb.add(rb(0.5, 0.7, 0.25, 0.06), { x: 1.0, y: 2.0, z: -2.2, color: 0x4A5A3A });
    pb.add(G.cyl(8), { x: -1.0, y: 0.6, z: -2.6, rx: Math.PI / 2, sx: 0.12, sy: 0.6, sz: 0.12, color: 0x555555 });
    // antenna
    pb.beam(-1.15, 1.7, -2.3, -1.2, 4.3, -2.3, 0.05, 0.05, 0x1B1D1F);
    // star on the hood
    db.add(G.plane1, { y: 1.915, z: 1.6, rx: -Math.PI / 2, sx: 1.15, sy: 1.15, color: 0xECE9E1 });

    const camoMesh = new T.Mesh(cb.build(), camoM); camoMesh.castShadow = true; bodyG.add(camoMesh);
    const plainMesh = new T.Mesh(pb.build(), plainM); plainMesh.castShadow = true; bodyG.add(plainMesh);
    bodyG.add(new T.Mesh(db.build(), new T.MeshLambertMaterial({ map: A.tex('star'), alphaTest: 0.5, vertexColors: true })));

    // headlights (emissive)
    const lb = B();
    for (const s of [1, -1]) lb.add(G.sph(10, 8), { x: 0.85 * s, y: 1.62, z: 2.68, sx: 0.23, sy: 0.23, sz: 0.12, color: 0xFFF3C0 });
    const lights = new T.Mesh(lb.build(), new T.MeshBasicMaterial({ vertexColors: true }));
    bodyG.add(lights);

    // flag
    const fb = B();
    fb.add(G.box1, { z: -0.55, y: -0.3, sx: 0.04, sy: 0.6, sz: 1.1, color: 0xFFB400 });
    fb.add(G.box1, { z: -0.55, y: -0.3, sx: 0.05, sy: 0.16, sz: 1.1, color: 0x0E0E0E });
    const flag = new T.Mesh(fb.build(), new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }));
    flag.position.set(-1.2, 4.3, -2.3); bodyG.add(flag);

    // roof gun
    const gunYaw = new T.Group(); gunYaw.position.set(0, 2.98, -0.95); bodyG.add(gunYaw);
    {
      const gc = B(), gp = B();
      gc.add(rb(1.4, 0.95, 0.14, 0.05), { y: 0.62, z: 0.62 });
      gp.add(G.cyl(12), { y: 0.0, sx: 0.36, sy: 0.22, sz: 0.36, color: 0x2B2E31 });
      gp.add(rb(0.42, 0.46, 1.1, 0.08), { y: 0.5, z: 0.0, color: 0x23272A });
      gp.add(rb(0.17, 0.17, 2.0, 0.05), { y: 0.5, z: 1.45, color: 0x0E0E0E });
      gp.add(rb(0.26, 0.26, 0.34, 0.05), { y: 0.5, z: 2.45, color: 0x1B1D1F });
      gp.add(rb(0.5, 0.4, 0.6, 0.06), { x: 0.56, y: 0.34, z: 0.05, color: 0x4A5A3A });
      gp.add(rb(0.12, 0.4, 0.12, 0.04), { y: 0.18, z: -0.55, rx: 0.4, color: 0x0E0E0E });
      const m1 = new T.Mesh(gc.build(), camoM); m1.castShadow = true; gunYaw.add(m1);
      const m2 = new T.Mesh(gp.build(), plainM); m2.castShadow = true; gunYaw.add(m2);
    }
    const muzzle = new T.Object3D(); muzzle.position.set(0, 0.5, 2.7); gunYaw.add(muzzle);

    // wheels
    const wg = wheelGeo(), wmat = new T.MeshLambertMaterial({ vertexColors: true });
    const wheels = [], front = [];
    for (const sx of [1, -1]) for (const sz of [1.8, -1.8]) {
      const pivot = new T.Group(); pivot.position.set(1.47 * sx, 0.72, sz); root.add(pivot);
      const spin = new T.Group(); pivot.add(spin);
      const m = new T.Mesh(wg, wmat); m.castShadow = true; spin.add(m);
      wheels.push(spin); if (sz > 0) front.push(pivot);
    }

    // crates in the bed (shown as delivered)
    const bedCrates = [];
    [[0.75, 1.95, -1.75], [-0.75, 1.95, -1.75], [0, 3.1, -1.75]].forEach((p, i) => {
      const c = WZ.Props.crateMeshShared(1.4); c.position.set(p[0], p[1], p[2]); c.rotation.y = i === 2 ? 0.2 : (i - 0.5) * 0.15;
      c.visible = false; bodyG.add(c); bedCrates.push(c);
    });

    const seatCmdr = new T.Object3D(); seatCmdr.position.set(0.65, 1.13, -0.15); bodyG.add(seatCmdr);
    const seatNana = new T.Object3D(); seatNana.position.set(-0.65, 1.13, -0.15); bodyG.add(seatNana);

    return { root, bodyG, wheels, front, gunYaw, muzzle, seatCmdr, seatNana, bedCrates, flag, lights, plainM, camoM };
  }

  WZ.Vehicles = { jeep };
})(window.WZ = window.WZ || {});
