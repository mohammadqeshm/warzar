/* Headless check of the VOLCANIC map generator: reachability, no objectives in lava, causeways, timing. Run: node tools/test-volcano-gen.cjs */
const fs = require('fs'), vm = require('vm'), path = require('path');
const base = path.join(__dirname, '../src/game/');
global.window = global; global.THREE = require(path.join(__dirname, '../node_modules/three/build/three.cjs'));
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }) };
for (const f of ['config.js', 'rng.js', 'events.js', 'util.js', 'world/navgrid.js', 'world/collision.js', 'world/gen.js', 'world/gen_jurassic.js', 'world/gen_volcanic.js']) vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f });
const WZ = global.WZ; const issues = []; let fb = 0, tot = 0, lavaFrac = 0, br = 0, att = 0, tms = 0, maxAtt = 0;
for (let m = 1; m <= 12; m++) for (let seed = 1; seed <= 12; seed++) {
  const t0 = Date.now(); let map;
  try { map = WZ.World.generate(seed * 7919, m, { tutorial: m === 1, theme: 'volcanic' }); } catch (e) { issues.push(`m${m} s${seed}: ${e.message}`); continue; }
  tms += Date.now() - t0; tot++; if (map.fallback) fb++; att += map.attempts; maxAtt = Math.max(maxAtt, map.attempts); br += map.bridges.length;
  const L = map.lava;
  if (map.theme !== 'volcanic') issues.push('theme');
  if (L.inLava(map.start.x, map.start.z)) issues.push(`m${m} s${seed}: start in lava`);
  for (const c of map.crates) if (L.inLava(c.x, c.z) || !map.noHazard) issues.push(`m${m} s${seed}: crate in lava`);
  if (L.inLava(map.extract.x, map.extract.z)) issues.push(`m${m} s${seed}: extract in lava`);
  const bad = WZ.NavGrid.validate(map); if (bad.length) issues.push(`m${m} s${seed}: unreachable ${bad.join(',')}`);
  let n = 0, lv = 0; for (let x = -170; x <= 170; x += 5) for (let z = -170; z <= 170; z += 5) { n++; if (L.inLava(x, z)) lv++; } lavaFrac += lv / n;
  for (const b of map.bridges) if (L.inLava(b.x, b.z)) issues.push(`m${m} s${seed}: bridge centre in lava`);
  // every causeway must be walkable on the nav grid (centre cell free)
  for (const b of map.bridges) if (map.nav.nana.blockedAt(b.x, b.z)) issues.push(`m${m} s${seed}: causeway blocked for Nana`);
  // roads: the first trail must be driveable by the nav (start -> first camp reachable) - implied by crates reachable
}
console.log(`maps ${tot}  fallback ${fb}  avg attempts ${(att / tot).toFixed(2)} (max ${maxAtt})  avg ms ${(tms / tot).toFixed(0)}  avg causeways ${(br / tot).toFixed(1)}  lava share ${(lavaFrac / tot * 100).toFixed(1)}%`);
console.log(issues.length ? 'ISSUES:\n' + issues.slice(0, 30).join('\n') : 'no issues');
process.exit(issues.length ? 1 : 0);
