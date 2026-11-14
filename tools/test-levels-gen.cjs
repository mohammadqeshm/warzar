/* Headless check: for EVERY season/map and EVERY level 1..10 the generator must produce exactly `level` crates (1 in the tutorial), all reachable. Run: node tools/test-levels-gen.cjs */
const fs = require('fs'), vm = require('vm'), path = require('path');
const base = path.join(__dirname, '../src/game/');
global.window = global; global.THREE = require(path.join(__dirname, '../node_modules/three/build/three.cjs'));
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }) };
for (const f of ['config.js', 'rng.js', 'events.js', 'util.js', 'art/geo.js', 'art/dino.js', 'art/magma.js', 'art/frozen.js', 'art/mech.js', 'systems/harbor.js', 'entities/giant.js', 'world/navgrid.js', 'world/collision.js', 'world/gen.js', 'world/gen_jurassic.js', 'world/gen_volcanic.js', 'world/gen_frozen.js', 'world/gen_harbor.js']) vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f });
const WZ = global.WZ, CFG = WZ.CFG, issues = []; let tot = 0, fb = 0;
CFG.maps.order.forEach((theme, si) => {
  for (let lvl = 1; lvl <= 10; lvl++) for (let seed = 1; seed <= 4; seed++) {
    const tut = lvl === 1 && seed === 1;
    let map; try { map = WZ.World.generate(seed * 7919, CFG.calc.difficulty(si, lvl), { tutorial: tut, theme, crates: tut ? 1 : lvl }); } catch (e) { issues.push(`${theme} L${lvl} s${seed}: ${e.message}`); continue; }
    tot++; if (map.fallback) fb++;
    const wantCrates = tut ? 1 : lvl;
    if (map.crates.length !== wantCrates) issues.push(`${theme} L${lvl} s${seed}: ${map.crates.length} crates`);
    const bad = WZ.NavGrid.validate(map); if (bad.length) issues.push(`${theme} L${lvl} s${seed}: unreachable ${bad.join(',')}`);
    const col = WZ.Collision.create(map), scene = new global.THREE.Scene();
    WZ.Giants.init({ map, col, scene }, { tutorial: tut, level: lvl, index: CFG.calc.difficulty(si, lvl), hpMul: 1 });
    if (WZ.Giants.list.length !== map.crates.length) issues.push(`${theme} L${lvl} s${seed}: ${WZ.Giants.list.length}/${map.crates.length} guardians`);
    WZ.Giants.list.forEach((g) => {
      const cr = map.crates[g.crateIdx];
      if (!cr || Math.hypot(g.x - cr.x, g.z - cr.z) > 16) issues.push(`${theme} L${lvl} s${seed}: guardian ${g.id} too far from crate`);
      if (!col.free(g.x, g.z, g.radius)) issues.push(`${theme} L${lvl} s${seed}: guardian ${g.id} inside obstacle`);
    });
    WZ.Giants.dispose();
  }
});
console.log(`maps ${tot}  fallback layouts ${fb}`);
console.log(issues.length ? 'ISSUES:\n' + issues.slice(0, 30).join('\n') : 'no issues');
process.exit(issues.length ? 1 : 0);
