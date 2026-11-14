const fs = require('fs'), vm = require('vm'), path = require('path');
const base = path.join(__dirname, '../src/game/');
global.window = global; global.THREE = require(path.join(__dirname, '../node_modules/three/build/three.cjs'));
const ctx2d = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {})), set: (t, k, v) => { t[k] = v; return true; } });
global.document = { createElement: () => ({ width: 0, height: 0, getContext: ctx2d }) };
for (const f of ['config.js', 'rng.js', 'events.js', 'util.js', 'world/navgrid.js', 'world/collision.js', 'world/gen.js', 'systems/hazards.js']) vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f });
const WZ = global.WZ, H = WZ.Hazards, T = THREE; const d = (a, b, c, e) => Math.hypot(a - c, b - e);
let sfx = {}; WZ.Audio = { sfx: (n) => { sfx[n] = (sfx[n] || 0) + 1; }, windSet() {}, windStop() {} }; WZ.Fx = { shake() {}, text() {}, flash() {}, hitstop() {} };
WZ.I18n = { t: (k) => k };
const noop = () => {}, particles = { poof: noop, sparks: noop, dust: noop, emit: noop };
function mk(seed, m) {
  const tutorial = m === 1, map = WZ.World.generate(seed, m, { tutorial }), col = WZ.Collision.create(map);
  const jeep = {
    x: map.start.x, z: map.start.z, vx: 0, vz: 0, h: 0, hop: 0, alive: true, speed: 0, hp: 100, maxHp: 100,
    rx: 0, ry: 0, rz: 0, P: WZ.CFG.jeep, cmdr: { punch() {}, flash() {} },
    hurt(n) { this.hp = Math.max(0, this.hp - n); if (this.hp <= 0) this.alive = false; },
  };
  const nana = { out: false, isKO: false, x: 0, z: 0, rx: 0, ry: 0, rz: 0, hurt() {} };
  const enemies = { hash: { query() {} }, q: [], ko() {} };
  return { tutorial, map, ctx: { scene: new T.Scene(), map, col, jeep, nana, enemies, particles, crates: null } };
}
let issues = [], rows = [];
for (let m = 1; m <= 14; m++) {
  let counts = [], torn = 0, maxCaught = 0;
  for (let seed = 1; seed <= 25; seed++) {
    const { tutorial, map, ctx } = mk(seed, m);
    try {
      H.init(ctx, { index: m, tutorial }, WZ.RNG.hash(WZ.RNG.hash(seed, m), 911));
      counts.push(H.mines.length);
      for (const mn of H.mines) {
        if (Math.abs(mn.x) > map.half - 16 || Math.abs(mn.z) > map.half - 16) issues.push(`m${m} s${seed}: mine out of bounds`);
        if (d(mn.x, mn.z, map.start.x, map.start.z) < 27.9) issues.push(`m${m} s${seed}: mine near start`);
        for (const c of map.crates) if (d(mn.x, mn.z, c.x, c.z) < 13.9) issues.push(`m${m} s${seed}: mine near crate`);
        if (!ctx.col.free(mn.x, mn.z, 2.2)) issues.push(`m${m} s${seed}: mine inside obstacle`);
      }
      // mine blast
      if (H.mines.length) {
        const mn = H.mines[0]; ctx.jeep.x = mn.x; ctx.jeep.z = mn.z; ctx.jeep.vx = 10;
        H.update(1 / 60, ctx, true, 5);
        if (mn.on || ctx.jeep.hp >= 100 || ctx.jeep.vx > 4) issues.push(`m${m} s${seed}: mine did not blast properly (on=${mn.on}, hp=${ctx.jeep.hp})`);
      }
      ctx.jeep.x = map.start.x; ctx.jeep.z = map.start.z; ctx.jeep.hp = 100; ctx.jeep.mineHits = 0; ctx.jeep.vx = ctx.jeep.vz = 0;
      // 120 s with a stationary jeep: tornado must warn, arrive, catch and release
      let phases = new Set(), t = 0, caught = 0;
      for (let i = 0; i < 7200; i++) {
        t += 1 / 60; H.update(1 / 60, ctx, true, t); H.render(1 / 60, t);
        if (H.torn) { phases.add(H.torn.phase); if (H.torn.phase !== 'warn' && d(H.torn.x, H.torn.z, ctx.jeep.x, ctx.jeep.z) < 8) caught++; }
        if (H.torn && H.arrowPos() == null && H.torn.phase !== 'fade') issues.push('arrowPos null while tornado alive');
        if (!isFinite(ctx.jeep.vx) || !isFinite(ctx.jeep.h)) { issues.push(`m${m} s${seed}: NaN jeep`); break; }
      }
      if (H.tornOn) { if (!phases.has('warn') || !phases.has('active')) issues.push(`m${m} s${seed}: tornado never ran (${[...phases]})`); else torn++; }
      else if (phases.size) issues.push(`m${m}: tornado ran while off`);
      maxCaught = Math.max(maxCaught, caught);
      H.dispose();
    } catch (e) { issues.push(`m${m} s${seed}: EXCEPTION ${e.stack.split('\n').slice(0, 3).join(' | ')}`); H.dispose(); }
  }
  rows.push(`m${String(m).padStart(2)}  mines min/avg/max ${Math.min(...counts)}/${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)}/${Math.max(...counts)}  tornado ran in ${torn}/25 seeds  max frames caught ${maxCaught}`);
}
console.log(rows.join('\n')); console.log('sfx', JSON.stringify(sfx)); console.log(issues.length ? 'ISSUES (' + issues.length + '):\n' + [...new Set(issues)].slice(0, 12).join('\n') : 'NO ISSUES');
process.exit(issues.length ? 1 : 0);
