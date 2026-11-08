/* Extra vehicles for the Garage: Dune Buggy (tier 2) and Armored Truck (tier 3), plus the player's landmine model.
 * Every vehicle model returns the same interface as WZ.Vehicles.jeep():
 *   { root, bodyG, wheels[], front[], gunYaw, muzzle, seatCmdr, seatNana, bedCrates[], flag, lights, plainM, camoM, bed:{z,y} }
 * Forward = +Z, driver (Commander) on local +X, passenger (Nana) on local -X. WZ.Vehicles.build(id) picks the model. */
(function (WZ) {
  'use strict';
  const T = THREE, G = WZ.Geo, A = WZ.Assets, rb = G.rbox, V = WZ.Vehicles;
  const B = () => new G.Builder();
  const STEEL = 0x2B2E31, DARK = 0x1B1D1F, CHROME = 0xB9BDC2, WHITE = 0xECE9E1, YEL = 0xFFB400;

  /** wheel: tyre + coloured rim + spokes + tread blocks. r = radius, w = width */
  function wheelGeo(r, w, rim, tread) {
    const b = B();
    b.add(G.cyl(22), { rz: Math.PI / 2, sx: r, sy: w, sz: r, color: 0x1B1C1E });
    b.add(G.cyl(16), { rz: Math.PI / 2, sx: r * 0.54, sy: w + 0.05, sz: r * 0.54, color: rim });
    b.add(G.cyl(10), { rz: Math.PI / 2, sx: r * 0.3, sy: w + 0.09, sz: r * 0.3, color: DARK });
    b.add(G.cyl(8), { rz: Math.PI / 2, sx: r * 0.1, sy: w + 0.13, sz: r * 0.1, color: CHROME });
    for (let i = 0; i < tread; i++) {
      const a = (i / tread) * Math.PI * 2;
      b.add(G.box1, { y: Math.cos(a) * r * 1.01, z: Math.sin(a) * r * 1.01, rx: a, sx: w * 1.05, sy: r * 0.15, sz: r * 0.27, color: 0x2A2C2E });
    }
    return b.build();
  }

  /** roof gun: same behaviour as the jeep's (yaw group + muzzle), painted in the vehicle colour */
  function roofGun(parent, plainM, paint, x, y, z, scale) {
    const gunYaw = new T.Group(); gunYaw.position.set(x, y, z); gunYaw.scale.setScalar(scale); parent.add(gunYaw);
    const gb = B();
    gb.add(rb(1.4, 0.95, 0.14, 0.05), { y: 0.62, z: 0.62, color: paint });
    gb.add(G.cyl(12), { y: 0.0, sx: 0.36, sy: 0.22, sz: 0.36, color: STEEL });
    gb.add(rb(0.42, 0.46, 1.1, 0.08), { y: 0.5, z: 0.0, color: 0x23272A });
    gb.add(rb(0.17, 0.17, 2.0, 0.05), { y: 0.5, z: 1.45, color: 0x0E0E0E });
    gb.add(rb(0.26, 0.26, 0.34, 0.05), { y: 0.5, z: 2.45, color: DARK });
    gb.add(rb(0.5, 0.4, 0.6, 0.06), { x: 0.56, y: 0.34, z: 0.05, color: paint });
    gb.add(rb(0.12, 0.4, 0.12, 0.04), { y: 0.18, z: -0.55, rx: 0.4, color: 0x0E0E0E });
    const m = new T.Mesh(gb.build(), plainM); m.castShadow = true; gunYaw.add(m);
    const muzzle = new T.Object3D(); muzzle.position.set(0, 0.5, 2.7); gunYaw.add(muzzle);
    return { gunYaw, muzzle };
  }

  /** shared tail of every model: flag, wheels, bed crates, seats, lights, glass */
  function finish(root, bodyG, o) {
    const plainM = o.plainM;
    const body = new T.Mesh(o.pb.build(), plainM); body.castShadow = true; bodyG.add(body);
    if (o.db && !o.db.empty) bodyG.add(new T.Mesh(o.db.build(), new T.MeshLambertMaterial({ map: A.tex('star'), alphaTest: 0.5, vertexColors: true })));
    const lights = new T.Mesh(o.lb.build(), new T.MeshBasicMaterial({ vertexColors: true })); bodyG.add(lights);
    if (o.gb && !o.gb.empty) bodyG.add(new T.Mesh(o.gb.build(), new T.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false })));
    const fb = B();
    fb.add(G.box1, { z: -0.55, y: -0.3, sx: 0.04, sy: 0.6, sz: 1.1, color: YEL });
    fb.add(G.box1, { z: -0.55, y: -0.3, sx: 0.05, sy: 0.16, sz: 1.1, color: 0x0E0E0E });
    const flag = new T.Mesh(fb.build(), new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }));
    flag.position.set(o.flag[0], o.flag[1], o.flag[2]); bodyG.add(flag);
    const gun = roofGun(bodyG, plainM, o.paint, o.gun[0], o.gun[1], o.gun[2], o.gun[3]);
    const wg = wheelGeo(o.wr, o.ww, o.rim, o.tread), wmat = new T.MeshLambertMaterial({ vertexColors: true });
    const wheels = [], front = [];
    for (const [x, z, fr] of o.wheelPos) {
      const pivot = new T.Group(); pivot.position.set(x, o.wr, z); root.add(pivot);
      const spin = new T.Group(); pivot.add(spin);
      const m = new T.Mesh(wg, wmat); m.castShadow = true; m.scale.x = x < 0 ? -1 : 1; spin.add(m);
      wheels.push(spin); if (fr) front.push(pivot);
    }
    const bedCrates = [];
    o.bedPos.forEach((p, i) => {
      const c = WZ.Props.crateMeshShared(1.4); c.position.set(p[0], p[1], p[2]); c.rotation.y = i === 2 ? 0.2 : (i - 0.5) * 0.15;
      c.visible = false; bodyG.add(c); bedCrates.push(c);
    });
    const seatCmdr = new T.Object3D(); seatCmdr.position.set(o.seat[0], o.seat[1], o.seat[2]); bodyG.add(seatCmdr);
    const seatNana = new T.Object3D(); seatNana.position.set(-o.seat[0], o.seat[1], o.seat[2]); bodyG.add(seatNana);
    return { root, bodyG, wheels, front, gunYaw: gun.gunYaw, muzzle: gun.muzzle, seatCmdr, seatNana, bedCrates, flag, lights, plainM, camoM: plainM, bed: o.bed };
  }

  // ------------------------------------------------------------------------------------------ DUNE BUGGY
  function buggy() {
    const root = new T.Group(), bodyG = new T.Group(); root.add(bodyG);
    const P1 = 0xF2891B, P2 = 0x1C1F23, R = 0xD2391E;
    const pb = B(), lb = B(), gb = B(), db = B();
    // chassis, skid plate, axle arms
    pb.add(rb(1.9, 0.28, 4.7, 0.1), { y: 0.95, z: -0.05, color: DARK });
    pb.add(rb(1.6, 0.1, 1.3, 0.04), { y: 0.72, z: 2.05, color: 0x6D7176 });
    for (const s of [1, -1]) for (const z of [1.7, -1.65]) pb.beam(1.6 * s, 0.88, z, 0.7 * s, 0.97, z, 0.2, 0.2, STEEL);
    // nose, hood scoop, headlight pods, bull bar
    pb.add(rb(1.85, 0.55, 1.6, 0.26), { y: 1.32, z: 1.95, color: P1 });
    pb.add(rb(0.72, 0.24, 0.95, 0.08), { y: 1.72, z: 1.78, color: P2 });
    for (const s of [1, -1]) {
      pb.add(rb(0.5, 0.46, 0.36, 0.1), { x: 0.62 * s, y: 1.46, z: 2.66, color: P2 });
      pb.add(rb(0.18, 0.03, 1.5, 0.01), { x: 0.2 * s, y: 1.61, z: 1.9, color: WHITE });
      pb.beam(0.9 * s, 0.95, 2.72, 0.9 * s, 1.55, 2.78, 0.13, 0.13, STEEL);
    }
    pb.beam(-0.9, 1.1, 2.78, 0.9, 1.1, 2.78, 0.15, 0.15, STEEL); pb.beam(-0.9, 1.5, 2.8, 0.9, 1.5, 2.8, 0.13, 0.13, STEEL);
    // seat tubs with stripes, fenders
    for (const s of [1, -1]) {
      pb.add(rb(0.45, 0.78, 2.3, 0.18), { x: 1.15 * s, y: 1.36, z: -0.5, color: P1 });
      pb.add(rb(0.47, 0.1, 2.2, 0.03), { x: 1.15 * s, y: 1.66, z: -0.5, color: WHITE });
      for (const z of [1.7, -1.65]) pb.add(rb(0.78, 0.12, 1.45, 0.05), { x: 1.6 * s, y: 1.95, z, color: P1 });
      // bucket seats
      pb.add(rb(0.82, 0.24, 0.85, 0.1), { x: 0.52 * s, y: 1.2, z: -0.25, color: 0x23272A });
      pb.add(rb(0.82, 0.8, 0.18, 0.08), { x: 0.52 * s, y: 1.68, z: -0.7, rx: -0.12, color: 0x23272A });
      pb.add(rb(0.12, 0.5, 0.7, 0.04), { x: 0.52 * s + 0.42, y: 1.5, z: -0.3, color: P1 });
    }
    // roll cage
    for (const s of [1, -1]) {
      pb.beam(1.1 * s, 1.6, -1.1, 0.95 * s, 3.05, -1.1, 0.12, 0.12, DARK);          // rear hoop
      pb.beam(1.1 * s, 1.6, 0.55, 0.95 * s, 2.55, 0.5, 0.12, 0.12, DARK);          // mid hoop
      pb.beam(0.95 * s, 2.55, 0.5, 0.85 * s, 1.65, 2.0, 0.12, 0.12, DARK);         // A-pillar to nose
      pb.beam(0.95 * s, 3.05, -1.1, 0.95 * s, 2.55, 0.5, 0.12, 0.12, DARK);        // roof rail
      pb.beam(0.95 * s, 3.05, -1.1, 0.75 * s, 1.55, -2.1, 0.12, 0.12, DARK);       // rear stay
    }
    pb.beam(-0.95, 3.05, -1.1, 0.95, 3.05, -1.1, 0.12, 0.12, DARK); pb.beam(-0.95, 2.55, 0.5, 0.95, 2.55, 0.5, 0.12, 0.12, DARK);
    pb.beam(-0.95, 2.8, -0.3, 0.95, 2.8, -0.3, 0.1, 0.1, DARK);
    // rear: engine, valve covers, exhausts, spoiler, cargo rack
    pb.add(rb(1.5, 0.7, 1.1, 0.15), { y: 1.35, z: -2.0, color: P2 });
    pb.add(rb(1.3, 0.18, 0.8, 0.05), { y: 1.78, z: -2.0, color: P1 });
    for (const s of [1, -1]) {
      pb.add(G.cyl(8), { x: 0.5 * s, y: 1.45, z: -2.85, rx: Math.PI / 2, sx: 0.14, sy: 0.8, sz: 0.14, color: CHROME });
      pb.beam(0.8 * s, 1.75, -2.35, 0.8 * s, 2.35, -2.6, 0.08, 0.08, DARK);
      pb.add(rb(0.06, 0.42, 0.7, 0.02), { x: 1.1 * s, y: 2.5, z: -2.62, color: P2 });
    }
    pb.add(rb(2.2, 0.08, 0.7, 0.03), { y: 2.45, z: -2.62, color: P1 });
    pb.add(rb(1.9, 0.08, 1.3, 0.03), { y: 2.2, z: -1.9, color: STEEL });
    for (const s of [1, -1]) for (const z of [-1.4, -2.4]) pb.beam(0.9 * s, 1.75, z, 0.9 * s, 2.2, z, 0.08, 0.08, DARK);
    // light bar frame, antenna
    pb.add(rb(2.0, 0.22, 0.28, 0.05), { y: 2.7, z: 0.52, color: P2 });
    pb.beam(-1.2, 1.8, -2.5, -1.25, 4.2, -2.55, 0.05, 0.05, DARK);
    pb.add(G.cyl(14), { x: 0.0, y: 1.9, z: -0.55, sx: 0.2, sy: 1.8, sz: 0.2, color: STEEL });
    // lights: headlights + light bar + tail lights
    for (const s of [1, -1]) {
      lb.add(G.sph(10, 8), { x: 0.62 * s, y: 1.48, z: 2.86, sx: 0.2, sy: 0.2, sz: 0.1, color: 0xFFF3C0 });
      lb.add(G.box1, { x: 0.8 * s, y: 1.8, z: -2.84, sx: 0.34, sy: 0.16, sz: 0.08, color: 0xFF3A22 });
    }
    for (let i = -2; i <= 2; i++) lb.add(G.box1, { x: i * 0.36, y: 2.7, z: 0.69, sx: 0.28, sy: 0.14, sz: 0.06, color: 0xFFF3C0 });
    // windscreen (glass) and hood star
    gb.add(G.box1, { y: 2.1, z: 0.85, rx: -0.55, sx: 1.9, sy: 0.55, sz: 0.05, color: 0x9CC8F0 });
    db.add(G.plane1, { y: 1.615, z: 1.95, rx: -Math.PI / 2, sx: 0.8, sy: 0.8, color: WHITE });
    const plainM = new T.MeshLambertMaterial({ vertexColors: true });
    return finish(root, bodyG, { pb, lb, gb, db, plainM, paint: P1, flag: [-1.25, 4.2, -2.55], gun: [0, 2.9, -0.55, 0.85], wr: 0.88, ww: 0.72, rim: P1, tread: 12,
      wheelPos: [[1.6, 1.7, true], [-1.6, 1.7, true], [1.6, -1.65, false], [-1.6, -1.65, false]],
      bedPos: [[0.5, 2.85, -1.95], [-0.5, 2.85, -1.95], [0, 3.95, -1.95]], seat: [0.52, 1.24, -0.2], bed: { z: -1.95, y: 2.9 } });
  }

  // ------------------------------------------------------------------------------------------ ARMORED TRUCK
  function truck() {
    const root = new T.Group(), bodyG = new T.Group(); root.add(bodyG);
    const P1 = 0x59636E, P2 = 0x3A424B, P3 = 0x6F7B88;
    const pb = B(), lb = B(), gb = B(), db = B();
    // hull + sloped hood + crew tub walls
    pb.add(rb(3.1, 1.2, 6.2, 0.3), { y: 1.7, z: -0.1, color: P1 });
    pb.add(rb(2.9, 0.8, 1.9, 0.3), { y: 2.35, z: 2.35, color: P3 });
    for (let i = 0; i < 4; i++) pb.add(rb(1.6, 0.06, 0.1, 0.02), { y: 2.78, z: 1.85 + i * 0.28, color: DARK });
    for (const s of [1, -1]) {
      pb.add(rb(0.32, 1.05, 3.3, 0.1), { x: 1.4 * s, y: 2.85, z: -0.55, color: P1 });
      pb.add(rb(0.36, 0.14, 3.3, 0.05), { x: 1.4 * s, y: 3.42, z: -0.55, color: P2 });
      // wheel arches / skirts
      for (const z of [2.2, -2.1]) {
        pb.add(rb(0.9, 0.22, 2.1, 0.08), { x: 1.85 * s, y: 2.2, z, color: P2 });
        pb.add(rb(0.2, 0.7, 1.8, 0.06), { x: 1.6 * s, y: 1.7, z, color: P3 });
      }
      // rivets
      for (let i = 0; i < 9; i++) pb.add(G.cyl(6), { x: 1.58 * s, y: 2.15, z: -2.2 + i * 0.62, rz: Math.PI / 2, sx: 0.07, sy: 0.06, sz: 0.07, color: CHROME });
      // exhaust stacks + mirrors
      pb.add(G.cyl(8), { x: 1.62 * s, y: 3.15, z: 0.75, sx: 0.12, sy: 2.0, sz: 0.12, color: STEEL });
      pb.add(G.cyl(8), { x: 1.62 * s, y: 4.2, z: 0.75, sx: 0.15, sy: 0.12, sz: 0.15, color: CHROME });
      pb.beam(1.5 * s, 3.1, 1.15, 1.95 * s, 3.3, 1.35, 0.08, 0.08, DARK); pb.add(rb(0.1, 0.4, 0.3, 0.03), { x: 1.98 * s, y: 3.3, z: 1.35, color: DARK });
    }
    pb.add(rb(3.0, 1.05, 0.3, 0.1), { y: 2.85, z: -2.35, color: P1 });
    pb.add(rb(3.0, 1.15, 0.42, 0.1), { y: 2.95, z: 1.15, color: P1 });
    pb.add(rb(2.5, 0.16, 0.5, 0.05), { y: 3.58, z: 1.2, color: P2 });
    // seats
    for (const s of [1, -1]) {
      pb.add(rb(1.0, 0.3, 1.0, 0.1), { x: 0.75 * s, y: 2.28, z: 0.1, color: 0x23272A });
      pb.add(rb(1.0, 0.9, 0.22, 0.08), { x: 0.75 * s, y: 2.8, z: -0.45, rx: -0.1, color: 0x23272A });
    }
    // heavy bull bar with hazard stripes, ram prongs, tow hook
    pb.add(rb(3.2, 0.62, 0.4, 0.1), { y: 1.35, z: 3.4, color: DARK });
    for (let i = 0; i < 8; i++) pb.add(rb(0.38, 0.5, 0.42, 0.03), { x: -1.4 + i * 0.4, y: 1.36, z: 3.43, color: i % 2 ? DARK : YEL });
    for (const s of [1, -1]) {
      pb.beam(1.0 * s, 1.0, 3.25, 1.3 * s, 2.35, 3.15, 0.2, 0.2, P2);
      pb.beam(0.5 * s, 0.9, 3.45, 0.5 * s, 0.9, 3.95, 0.18, 0.18, STEEL);
      pb.add(G.cyl(8), { x: 0.5 * s, y: 0.9, z: 4.0, rx: Math.PI / 2, sx: 0.14, sy: 0.12, sz: 0.14, color: CHROME });
    }
    // top: light bar frame, gun ring, antenna, toolbox
    pb.add(G.cyl(24), { y: 3.2, z: -1.35, sx: 1.22, sy: 0.12, sz: 1.22, color: P2 });
    pb.add(G.cyl(10), { y: 2.5, z: -1.35, sx: 0.22, sy: 1.4, sz: 0.22, color: STEEL });
    pb.add(rb(1.2, 0.5, 0.5, 0.08), { x: -1.25, y: 1.5, z: -3.35, color: P2 });
    pb.beam(1.3, 3.4, -2.3, 1.35, 5.2, -2.4, 0.06, 0.06, DARK);
    pb.add(rb(3.0, 0.3, 0.5, 0.1), { y: 1.15, z: -3.35, color: DARK });
    pb.add(G.box1, { y: 1.0, z: 2.9, sx: 3.0, sy: 0.12, sz: 0.9, color: STEEL });
    // lights
    for (const s of [1, -1]) {
      lb.add(G.sph(10, 8), { x: 1.05 * s, y: 2.2, z: 3.3, sx: 0.3, sy: 0.3, sz: 0.14, color: 0xFFF3C0 });
      lb.add(G.box1, { x: 1.05 * s, y: 1.7, z: -3.12, sx: 0.5, sy: 0.22, sz: 0.08, color: 0xFF3A22 });
    }
    for (let i = -1; i <= 2; i++) lb.add(G.box1, { x: (i - 0.5) * 0.55, y: 3.58, z: 1.47, sx: 0.4, sy: 0.14, sz: 0.06, color: 0xFFF3C0 });
    // windscreen slit and hood star
    gb.add(G.box1, { y: 3.3, z: 1.2, sx: 2.4, sy: 0.38, sz: 0.06, color: 0x9CC8F0 });
    db.add(G.plane1, { y: 2.78, z: 2.5, rx: -Math.PI / 2 + 0.05, sx: 1.2, sy: 1.2, color: WHITE });
    const plainM = new T.MeshLambertMaterial({ vertexColors: true });
    return finish(root, bodyG, { pb, lb, gb, db, plainM, paint: P1, flag: [1.35, 5.2, -2.4], gun: [0, 3.32, -1.35, 1.1], wr: 0.98, ww: 0.95, rim: YEL, tread: 14,
      wheelPos: [[1.85, 2.2, true], [-1.85, 2.2, true], [1.85, -2.1, false], [-1.85, -2.1, false]],
      bedPos: [[0.7, 3.0, -1.65], [-0.7, 3.0, -1.65], [0, 4.15, -1.65]], seat: [0.75, 2.4, 0.05], bed: { z: -1.65, y: 3.4 } });
  }

  // ------------------------------------------------------------------------------------------ PLAYER LANDMINE
  /** shared geometry/material parts for the planted-mine model (used by the Garage showcase and by WZ.Landmines) */
  function mineParts() {
    const body = B(), top = B(), lamp = B();
    body.add(G.cyl(20), { sx: 1.25, sy: 0.34, sz: 1.25, y: 0.17, color: 0x4B5A3A });
    body.add(G.cyl(20), { sx: 1.05, sy: 0.12, sz: 1.05, y: 0.4, color: 0x2F3A26 });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; body.add(rb(0.22, 0.2, 0.34, 0.04), { x: Math.cos(a) * 1.18, z: Math.sin(a) * 1.18, y: 0.32, ry: -a + Math.PI / 2, color: 0x2B2E31 }); }
    top.add(G.cyl(12), { sx: 0.55, sy: 0.22, sz: 0.55, y: 0.54, color: 0xB9BDC2 });
    top.add(G.cyl(6), { sx: 0.18, sy: 0.4, sz: 0.18, y: 0.7, color: 0x23272A });
    top.add(G.plane1, { y: 0.462, rx: -Math.PI / 2, sx: 1.4, sy: 1.4, color: 0xECE9E1 });
    lamp.add(G.sph(10, 8), { y: 0.95, sx: 0.2, sy: 0.2, sz: 0.2, color: 0x35C8FF });
    return { body, top, lamp };
  }
  function mineModel() {
    const g = new T.Group(), p = mineParts();
    g.add(new T.Mesh(p.body.build(), new T.MeshLambertMaterial({ vertexColors: true })));
    g.add(new T.Mesh(p.top.build(), new T.MeshLambertMaterial({ vertexColors: true })));
    g.add(new T.Mesh(p.lamp.build(), new T.MeshBasicMaterial({ vertexColors: true })));
    return g;
  }

  // ------------------------------------------------------------------------------------------ registry
  const MODELS = { jeep: V.jeep, buggy, truck };
  V.build = (id) => (MODELS[id] || V.jeep)();
  V.mineParts = mineParts; V.mineModel = mineModel;
  /** merged stats for a vehicle id (CFG.jeep defaults + CFG.vehicles[id]) */
  V.stats = (id) => Object.assign({}, WZ.CFG.jeep, WZ.CFG.vehicles[id] || WZ.CFG.vehicles.jeep);
})(window.WZ = window.WZ || {});
