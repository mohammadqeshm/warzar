/* Headless check: for EVERY season/map and EVERY level 1..10 the generator must produce exactly `level` crates (1 in the tutorial), all reachable. Run: node tools/test-levels-gen.cjs */
const fs = require('fs'), vm = require('vm'), path = require('path');
const base = path.join(__dirname, '../src/game/');
global.window = global; global.THREE = require(path.join(__dirname, '../node_modules/three/build/three.cjs'));
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }) };
for (const f of ['config.js', 'rng.js', 'events.js', 'util.js', 'world/navgrid.js', 'world/collision.js', 'world/gen.js', 'world/gen_jurassic.js', 'world/gen_volcanic.js', 'world/gen_frozen.js', 'world/gen_harbor.js']) vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f });
const WZ = global.WZ, CFG = WZ.CFG, issues = []; let tot = 0, fb = 0;
CFG.maps.order.forEach((theme, si) => {
  for (let lvl = 1; lvl <= 10; lvl++) for (let seed = 1; seed <= 4; seed++) {
    const tut = lvl === 1 && seed === 1;
    let map; try { map = WZ.World.generate(seed * 7919, CFG.calc.difficulty(si, lvl), { tutorial: tut, theme, crates: tut ? 1 : lvl }); } catch (e) { issues.push(`${theme} L${lvl} s${seed}: ${e.message}`); continue; }
    tot++; if (map.fallback) fb++;
    if (map.crates.length !== lvl) issues.push(`${theme} L${lvl} s${seed}: ${map.crates.length} crates`);
    const bad = WZ.NavGrid.validate(map); if (bad.length) issues.push(`${theme} L${lvl} s${seed}: unreachable ${bad.join(',')}`);
  }
});
console.log(`maps ${tot}  fallback layouts ${fb}`);
console.log(issues.length ? 'ISSUES:\n' + issues.slice(0, 30).join('\n') : 'no issues');
process.exit(issues.length ? 1 : 0);
