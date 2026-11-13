/* Headless check of the FROZEN map generator: reachability, nothing on ice, timing. Run: node tools/test-frozen-gen.cjs */
const fs = require('fs'), vm = require('vm'), path = require('path');
const base = path.join(__dirname, '../src/game/');
global.window = global; global.THREE = require(path.join(__dirname, '../node_modules/three/build/three.cjs'));
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }) };
for (const f of ['config.js', 'rng.js', 'events.js', 'util.js', 'world/navgrid.js', 'world/collision.js', 'world/gen.js', 'world/gen_jurassic.js', 'world/gen_volcanic.js', 'world/gen_frozen.js']) vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f });
const WZ = global.WZ; const issues = []; let fb = 0, tot = 0, att = 0, tms = 0, maxAtt = 0, iceFrac = 0;
for (let m = 1; m <= 12; m++) for (let seed = 1; seed <= 12; seed++) {
  const t0 = Date.now(); let map;
  try { map = WZ.World.generate(seed * 7919, m, { tutorial: m === 1, theme: 'frozen' }); } catch (e) { issues.push(`m${m} s${seed}: ${e.message}`); continue; }
  tms += Date.now() - t0; tot++; if (map.fallback) fb++; att += map.attempts; maxAtt = Math.max(maxAtt, map.attempts);
  const I = map.ice;
  if (map.theme !== 'frozen') issues.push('theme');
  if (I.at(map.start.x, map.start.z) > 0) issues.push(`m${m} s${seed}: start on ice`);
  for (const c of map.crates) if (I.at(c.x, c.z) > 0) issues.push(`m${m} s${seed}: crate on ice`);
  if (I.at(map.extract.x, map.extract.z) > 0) issues.push(`m${m} s${seed}: extract on ice`);
  const bad = WZ.NavGrid.validate(map); if (bad.length) issues.push(`m${m} s${seed}: unreachable ${bad.join(',')}`);
  let n = 0, iv = 0; for (let x = -170; x <= 170; x += 5) for (let z = -170; z <= 170; z += 5) { n++; if (I.at(x, z) > 0.5) iv++; } iceFrac += iv / n;
  if (!map.pines.length || !map.ice.lakes.length) issues.push('no scenery');
}
console.log(`maps ${tot}  fallback ${fb}  avg attempts ${(att / tot).toFixed(2)} (max ${maxAtt})  avg ms ${(tms / tot).toFixed(0)}  ice share ${(iceFrac / tot * 100).toFixed(1)}%`);
console.log(issues.length ? 'ISSUES:\n' + issues.slice(0, 30).join('\n') : 'no issues');
process.exit(issues.length ? 1 : 0);
