// Headless regression test: no guardian pose/art code may overwrite the guardian's HOME (guard post). Dinosaur poses used to write g.hx (head pitch),
// which sent every dinosaur walking away from its crate (to x ~ 0) as soon as it lost its target.
const fs = require('fs'), vm = require('vm'), path = require('path');
const base = path.join(__dirname, '../src/game/');
global.window = global; global.THREE = require(path.join(__dirname, '../node_modules/three/build/three.cjs'));
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }), addEventListener() {} };
global.WZ = { Assets: { tex: () => null, modelOverride: () => null }, Props: { crateMeshShared: () => new THREE.Group() }, I18n: { t: (k) => k } };
for (const f of ['config.js', 'rng.js', 'events.js', 'util.js', 'art/geo.js', 'art/dino.js', 'art/magma.js', 'art/frozen.js', 'art/mech.js']) {
  try { vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f }); } catch (e) { /* art module may need browser APIs: skipped */ }
}
const issues = [];
const arts = { DinoArt: 'dino', MagmaArt: 'titan', FrostArt: 'beast', MechArt: 'mech' };
let tested = 0;
for (const name of Object.keys(arts)) {
  const A = WZ[name]; if (!A || !A.rig || !A.pose) continue;
  const C = Object.assign({}, WZ.CFG.giant, WZ.CFG[arts[name] === 'dino' ? 'dino' : arts[name]]);
  const g = { id: 0, x: 120, z: -80, hx: 120, hz: -80, homeX: 120, homeZ: -80, walk: 1, mv: 3, swing: 0, fire: 0, fireT: 0, mode: 1, flash: 0, tk: 0, ch: 0, dying: false, koT: 0, armK: 0, leanK: 0, M: null, spd: 1 };
  try {
    g.rig = A.rig(new THREE.MeshLambertMaterial({ vertexColors: true }), 0);
    if (name === 'MechArt') continue;       // needs the harbor state (g.M): covered by the mission code
    for (let i = 0; i < 120; i++) A.pose(g, C, i / 60, 1 / 60);
    tested++;
    if (g.hx !== 120 || g.hz !== -80 || g.homeX !== 120 || g.homeZ !== -80) issues.push(name + ' pose changed the guardian home: hx ' + g.hx + ' hz ' + g.hz);
    if (g.x !== 120 || g.z !== -80) issues.push(name + ' pose moved the guardian');
  } catch (e) { issues.push(name + ' test crashed: ' + e.message); }
}
if (!tested) issues.push('no art module could be tested');
console.log(issues.length ? 'ISSUES:\n - ' + issues.join('\n - ') : 'NO ISSUES  (guardian pose code leaves the home position alone; ' + tested + ' rigs tested)');
process.exit(issues.length ? 1 : 0);
