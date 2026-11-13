/* Headless check of the HARBOR map generator: reachability, objectives away from the water / broken decks, lanes, cranes, timing. Run: node tools/test-harbor-gen.cjs */
const fs = require('fs'), vm = require('vm'), path = require('path');
const base = path.join(__dirname, '../src/game/');
global.window = global; global.THREE = require(path.join(__dirname, '../node_modules/three/build/three.cjs'));
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }) };
for (const f of ['config.js', 'rng.js', 'events.js', 'util.js', 'world/navgrid.js', 'world/collision.js', 'world/gen.js', 'world/gen_harbor.js']) vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f });
const WZ = global.WZ; const issues = []; let fb = 0, tot = 0, att = 0, tms = 0, maxAtt = 0, cranes = 0, jobs = 0, holes = 0, stacks = 0;
for (let m = 1; m <= 12; m++) for (let seed = 1; seed <= 12; seed++) {
  const t0 = Date.now(); let map;
  try { map = WZ.World.generate(seed * 7919, m, { tutorial: m === 1, theme: 'harbor' }); } catch (e) { issues.push(`m${m} s${seed}: ${e.message}`); continue; }
  tms += Date.now() - t0; tot++; if (map.fallback) fb++; att += map.attempts; maxAtt = Math.max(maxAtt, map.attempts);
  if (map.theme !== 'harbor') issues.push('theme');
  const bad = WZ.NavGrid.validate(map); if (bad.length) issues.push(`m${m} s${seed}: unreachable ${bad.join(',')}`);
  for (const c of map.crates) if (map.waterDist(c.x, c.z) < 7 || map.inHole(c.x, c.z, 0)) issues.push(`m${m} s${seed}: crate near water`);
  if (map.waterDist(map.extract.x, map.extract.z) < 7) issues.push(`m${m} s${seed}: extract near water`);
  if (map.navBlock(map.start.x, map.start.z) || map.start.x > map.quayX - 15) issues.push(`m${m} s${seed}: bad start`);
  const col = WZ.Collision.create(map);
  if (!col.free(map.start.x, map.start.z, 2)) issues.push(`m${m} s${seed}: start blocked`);
  for (const h of map.holes) { const cx = (h.x0 + h.x1) / 2, cz = (h.z0 + h.z1) / 2; if (!col.free(cx, cz, 1.5)) issues.push(`m${m} s${seed}: hole is walled`); }
  if (col.free(map.quayX + 20, map.piers[0].z0 - 6, 1.5)) issues.push(`m${m} s${seed}: sea is open`);
  cranes += map.cranes.length; jobs += map.cranes.filter((c) => c.slot).length; holes += map.holes.length; stacks += map.stacks.length;
  if (!map.cranes.length || !map.stacks.length || map.piers.length < 3) issues.push('no scenery');
}
console.log(`maps ${tot}  fallback ${fb}  avg attempts ${(att / tot).toFixed(2)} (max ${maxAtt})  avg ms ${(tms / tot).toFixed(0)}  cranes ${(cranes / tot).toFixed(1)}  crane jobs ${(jobs / tot).toFixed(1)}  holes ${(holes / tot).toFixed(1)}  stacks ${(stacks / tot).toFixed(0)}`);
console.log(issues.length ? 'ISSUES:\n' + issues.slice(0, 30).join('\n') : 'no issues');
process.exit(issues.length ? 1 : 0);
