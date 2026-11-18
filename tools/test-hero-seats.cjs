// Geometry/rig regression (real Three.js, no browser): node tools/test-hero-seats.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
global.THREE = require('three');
global.window = global;
global.WZ = {
  Assets: { tex: () => null, modelOverride: () => null }, Props: { crateMeshShared: () => new THREE.Group() },
  Audio: { sfx() {} },
};
const base = path.join(__dirname, '../src/game');
for (const f of ['config.js', 'util.js', 'events.js', 'art/geo.js', 'art/heroes.js', 'art/vehicles.js', 'art/vehicles_extra.js', 'entities/jeep.js', 'entities/nana.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(base, f), 'utf8'), { filename: f });
}
const T = THREE, dt = 1 / 60, S = WZ.Nana.S;
const v = new T.Vector3(), worldScale = new T.Vector3();
const oldMuzzleY = { jeep: 4.68, buggy: 4.6985, truck: 6.011 };
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`);

// Exact vertex extents (not loose rotated boxes), in a fixture with vehicle-local axes.
function bounds(root) {
  root.updateWorldMatrix(true, true);
  const box = new T.Box3();
  root.traverseVisible((m) => {
    if (!m.isMesh) return;
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld));
  });
  return box;
}

for (const id of WZ.CFG.vehicleOrder) {
  WZ.Save = { data: { owned: { vehicles: [id] }, equipped: { vehicle: id } } };
  const scene = new T.Scene(), col = { resolve: () => false }, map = { height: () => 0, start: { x: 0, z: 0, heading: 0 }, nav: { nana: { los: () => true } } };
  const jeep = new WZ.Jeep(map, col, scene), m = jeep.model;
  const crate = { x: -9, z: 0.8, state: 'idle' };
  const ctx = { jeep, col, scene, map, enemies: { nearest: () => null }, crates: {
    nearestAvailable: () => crate.state === 'idle' ? crate : null,
    deliver(c) { c.state = 'delivered'; },
  } };
  const nana = new WZ.Nana(ctx), c = jeep.cmdr, n = nana.rig;
  c.t = n.t = 0;
  assert.equal(c.root.parent, m.seatCmdr);
  assert.equal(n.root.parent, m.seatNana);
  assert.equal(n.pan.visible, false);
  close(m.muzzle.getWorldPosition(v).y, oldMuzzleY[id], `${id}: established muzzle height`);

  let gap = Infinity, overhead = Infinity;
  for (let i = 0; i < 320; i++) {
    if (i === 83 || i === 103) c.punch(-0.5);
    if (i === 103) n.punch(-0.7);
    if (i === 128) { c.setMode('cheer'); n.setMode('cheer'); }
    if (i === 210) { c.setMode('sit'); n.setMode('sit'); }
    c.lookYaw = Math.sin(i * 0.24) * 0.9;
    n.lookYaw = Math.sin(i * 0.18) * 0.22;
    m.gunYaw.rotation.y = i * 0.19;
    c.update(dt); n.update(dt);
    const driver = bounds(c.root), passenger = bounds(n.root), gun = bounds(m.gunYaw);
    const clearance = driver.min.x - passenger.max.x;
    assert.ok(clearance > 0.035, `${id}: rider clearance at frame ${i}: ${clearance}`);
    gap = Math.min(gap, clearance);
    const headroom = gun.min.y - Math.max(driver.max.y, passenger.max.y);
    assert.ok(headroom > 0.075, `${id}: rider clips rotating gun at frame ${i}: headroom ${headroom}`);
    overhead = Math.min(overhead, headroom);
  }

  // A real deploy/carry/boarding cycle using the existing animation and state machine.
  jeep.h = 0.31; jeep.sync(1, dt, 0);
  nana.step(dt);
  const seat = jeep.localToWorld(m.seatNana.position.x, m.seatNana.position.z, {});
  close(nana.x, seat.x, `${id}: seated x agrees with its anchor`);
  close(nana.z, seat.z, `${id}: seated z agrees with its anchor`);
  assert.equal(nana.press(), 'deploy');
  nana.render(1, dt, 0);
  assert.equal(n.root.parent, scene);
  assert.equal(n.mode, 'jump');
  assert.equal(n.pan.visible, true, 'the pan is available on foot');
  close(n.root.getWorldScale(worldScale).x, 0.82, `${id}: on-foot scale`);
  const phases = new Set();
  let landingScale = null;
  for (let i = 0; i < 480 && nana.out; i++) {
    nana.step(dt); nana.render(1, dt, i * dt);
    phases.add(nana.state);
    if (nana.state === S.RETURNING) assert.equal(n.pan.visible, false, 'the pan is stowed while carrying');
    if (nana.state === S.BOARDING) {
      assert.ok(Number.isFinite(n.root.position.lengthSq()), `${id}: invalid boarding transform`);
      landingScale = n.root.scale.x;
    }
  }
  for (const phase of [S.RUNNING_OUT, S.GRABBING, S.RETURNING, S.BOARDING, S.IN_JEEP]) assert.ok(phases.has(phase), `${id}: missed ${phase}`);
  assert.equal(crate.state, 'delivered');
  assert.equal(n.root.parent, m.seatNana);
  assert.equal(n.pan.visible, false);
  assert.equal(n.mode, 'sit');
  close(n.root.scale.x, 0.82, `${id}: base scale after reparenting`);
  close(n.root.getWorldScale(worldScale).x, 0.82 * m.seatNana.scale.x, `${id}: seated scale after reparenting`);
  assert.ok(Math.abs(landingScale - worldScale.x) < 0.015, `${id}: passenger reaches fitting scale before attachment`);
  crate.state = 'idle';
  assert.equal(nana.press(), 'deploy');
  nana.render(1, dt, 0);
  close(n.root.getWorldScale(worldScale).x, 0.82, `${id}: full scale on next deploy`);
  assert.equal(nana.press(), 'recall');
  for (let i = 0; i < 180 && nana.out; i++) { nana.step(dt); nana.render(1, dt, i * dt); }
  assert.equal(nana.state, S.IN_JEEP, `${id}: has boarded after recall`);
  assert.equal(crate.state, 'idle', `${id}: recall did not deliver a crate`);
  nana.dispose(); jeep.dispose();
  console.log(`${id}: rider gap ≥ ${gap.toFixed(3)}, roof-gun gap ≥ ${overhead.toFixed(3)}; deploy, carry, board and recall OK`);
}
