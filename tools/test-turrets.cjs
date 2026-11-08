// Headless test of the DEFENSE turret and the gun nerf (no browser needed).
const fs = require('fs'), vm = require('vm'), path = require('path'); const base = path.join(__dirname, '../src/game/');
global.window = global; global.THREE = require(path.join(__dirname, '../node_modules/three/build/three.cjs'));
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }), addEventListener() {} };
const sfx = [], texts = [], tracers = [];
global.WZ = { Assets: { tex: () => null }, I18n: { t: (k) => k }, Audio: { sfx: (n) => sfx.push(n) }, Fx: { shake() {}, text: (s) => texts.push(s), flash() {} }, Gun: { _tracer: (...a) => tracers.push(a) } };
for (const f of ['config.js', 'rng.js', 'events.js', 'util.js', 'art/geo.js', 'systems/turrets.js']) vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f });
const issues = [], ok = (c, m) => { if (!c) issues.push(m); }, Tu = WZ.Turrets, C = WZ.CFG.turret, enemies = [], hits = [];
const noop = () => {}; let freeFn = () => true;
const ctx = { scene: new THREE.Scene(), col: { free: (x, z, r) => freeFn(x, z, r) }, map: { height: () => 0 }, particles: { dust: noop, poof: noop, muzzle: noop },
  jeep: { x: 0, z: 0, h: 0, alive: true, rx: 0, ry: 0, rz: 0, P: { halfLen: 1.45 } },
  enemies: { nearest(x, z, r) { let b = null, bd = r * r; for (const e of enemies) { if (!e.active || e.state === 2) continue; const d = (e.x - x) ** 2 + (e.z - z) ** 2; if (d < bd) { bd = d; b = e; } } return b; },
    damage(e, amt) { hits.push([e, amt]); e.hp -= amt; if (e.hp <= 0) { e.state = 2; return true; } return false; } } };
// gun nerf: grunt (10 hp) should need >= 4 hits and the jeep dps should be below the old 32
const G = WZ.CFG.gun; ok(10 / G.damage >= 4, 'grunt should need at least 4 gun hits, needs ' + (10 / G.damage).toFixed(1)); ok(G.damage * G.rate < 32 * 0.6, 'jeep gun dps should be well below the old 32 (now ' + G.damage * G.rate + ')');
// plant: behind the vehicle, cooldown, max
Tu.init(ctx); ok(Tu.ready && Tu.cdPct === 1, 'ready at start');
ok(Tu.plant() === true && Tu.count === 1, 'plant 1'); ok(Tu.list[0].z < -3, 'planted behind the vehicle (z=' + Tu.list[0].z.toFixed(1) + ')');
ok(Tu.plant() === false && texts.includes('hud.turretCd'), 'cooldown blocks the second one'); ok(!Tu.ready && Tu.cdPct < 0.05, 'cdPct low right after planting');
Tu.update(C.cooldown + 0.1); ctx.jeep.x = 20; ok(Tu.plant() === true && Tu.count === 2, 'plant 2 after cooldown'); Tu.update(C.cooldown + 0.1);
ok(Tu.plant() === false && texts.includes('hud.turretMax'), 'max active reached');
// blocked terrain
Tu.dispose(); Tu.init(ctx); freeFn = () => false; ok(Tu.plant() === false && texts.includes('hud.turretBlocked'), 'no room message'); freeFn = () => true;
// combat: no shooting while building, shoots after, only inside range, KOs, tracers and sound
ctx.jeep.x = 0; Tu.plant(); const t = Tu.list[0]; enemies.push({ x: t.x + 12, z: t.z + 4, hp: 10, active: true, state: 0 }, { x: t.x + 80, z: t.z, hp: 10, active: true, state: 0 });
Tu.update(0.3); ok(hits.length === 0, 'must not shoot while still building');
for (let i = 0; i < 600 && enemies[0].state !== 2; i++) { Tu.update(1 / 60); Tu.render(1 / 60, i / 60); }
ok(enemies[0].state === 2, 'turret should kill the enemy in range'); ok(enemies[1].hp === 10, 'enemy out of range untouched'); ok(tracers.length >= 5 && sfx.includes('tshot') && sfx.includes('build'), 'tracers + sounds');
const shots = hits.length, dps = shots * C.damage; ok(shots >= 6 && shots <= 9, 'about 6 shots needed for a 10 hp grunt at 1.7 dmg (got ' + shots + ')');
// lifetime: dismantles itself and cleans the scene
const before = ctx.scene.children.length; for (let i = 0; i < C.life * 60 + 10; i++) Tu.update(1 / 60);
ok(Tu.count === 0, 'turret expires after its lifetime'); ok(ctx.scene.children.length < before, 'meshes removed from the scene on expiry');
// dead jeep cannot plant
ctx.jeep.alive = false; Tu.update(C.cooldown + 1); ok(Tu.plant() === false, 'dead vehicle cannot plant');
Tu.dispose(); ok(Tu.ctx === null, 'dispose');
console.log(issues.length ? 'ISSUES (' + issues.length + '):\n' + issues.join('\n') : 'NO ISSUES  (nerf, plant/cooldown/max, placement, targeting, range, lifetime, cleanup)');
