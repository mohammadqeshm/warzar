// Headless integration test (no browser): mission scene logic for the "danger update":
//  - Nana leaving the jeep triggers the RUSH (more/faster enemies), enemies shoot at her, her death ends the run
//  - the jeep survives ONE mine (loses half its HP) and is destroyed by the SECOND
//  - turrets/cannons are consumed from the shop inventory, enemies scale with the mission number
const fs = require('fs'), vm = require('vm'), path = require('path'); const base = path.join(__dirname, '../src/game/');
global.window = global; global.THREE = require(path.join(__dirname, '../node_modules/three/build/three.cjs'));
const ctx2d = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : k === 'getImageData' || k === 'createImageData' ? () => ({ data: new Uint8ClampedArray(4096) }) : () => {})), set: (t, k, v) => { t[k] = v; return true; } });
global.document = { createElement: () => ({ width: 0, height: 0, style: {}, getContext: ctx2d, toDataURL: () => '' }), addEventListener() {}, getElementById: () => null };
global.localStorage = { getItem: () => null, setItem() {} }; global.location = { search: '' }; global.performance = { now: () => 0 };
global.matchMedia = () => ({ matches: false }); global.navigator = { language: 'en' };
const issues = [], ok = (c, m) => { if (!c) issues.push(m); };
const files = ['config.js', 'rng.js', 'events.js', 'util.js', 'platform.js', 'save.js', 'i18n.js'];
for (const f of files) vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f });
const WZ = global.WZ; const sfx = {}, texts = [];
WZ.Audio = new Proxy({ sfx: (n) => { sfx[n] = (sfx[n] || 0) + 1; } }, { get: (t, k) => t[k] || (() => {}) });
WZ.Fx = { text: (s) => texts.push(s), shake() {}, flash() {}, hitstop() {}, clear() {}, shakeOn: false, update() {} };
WZ.UI = new Proxy({ dbgOn: false, showBriefing: () => ({ _go() {} }), showSummary: (r) => { WZ.__summary = r; } }, { get: (t, k) => (k in t ? t[k] : () => {}) });
WZ.Input = { stick: { x: 0, y: 0, mag: 0 }, consume: () => false, update() {}, reset() {}, press() {} };
WZ.Cam = { cam: new THREE.PerspectiveCamera(), yaw: 0, snap() {}, update() {}, orbit() {}, aim: new THREE.Vector3() };
WZ.Quality = { level: 2 }; WZ.Main = { renderer: { renderLists: { dispose() {} } }, startIndex: 1, go() {} };
WZ.Debug = {};
for (const f of ['assets.js', 'art/geo.js', 'art/textures.js', 'art/props.js', 'art/heroes.js', 'art/vehicles.js', 'art/vehicles_extra.js', 'art/enemies.js', 'world/navgrid.js', 'world/collision.js', 'world/gen.js', 'world/worldview.js',
  'systems/particles.js', 'systems/spawner.js', 'systems/gun.js', 'systems/missions.js', 'systems/hazards.js', 'systems/landmines.js', 'systems/turrets.js', 'systems/bullets.js',
  'entities/smallprops.js', 'entities/crate.js', 'entities/jeep.js', 'entities/enemy.js', 'entities/nana.js', 'scenes/mission.js']) {
  try { vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f }); } catch (e) { console.log('LOAD FAIL', f, e.message); process.exit(1); }
}
WZ.Save.load(); const S = WZ.Save.data; S.flags.tutorialDone = true;
const M = WZ.Scenes.mission;
function start(index, seed) { M.enter({ index, runSeed: seed, runCoins: 0 }); M.startPlay(); }
const step = (n) => { for (let i = 0; i < n && M.phase !== 'ending'; i++) M.update(1 / 60); };

// ---------- scaling
const C = WZ.CFG.calc;
ok(C.enemyHpMul(10) > C.enemyHpMul(2) && C.enemyDmgMul(10) > C.enemyDmgMul(2) && C.enemySpeedMul(10) > C.enemySpeedMul(2), 'enemies scale with mission');
ok(C.bruteChance(3) === 0 && C.bruteChance(8) > 0, 'brutes from mission 4');

// ---------- mines: two strikes
start(3, 4242);
let J = M.jeep, mines = WZ.Hazards.mines.filter((m) => m.on);
ok(mines.length >= 2, 'at least 2 mines on map (' + mines.length + ')');
ok(J.maxHp === 100 && J.hp === 100, 'full hp');
J.x = J.px = mines[0].x; J.z = J.pz = mines[0].z; M.update(1 / 60);
ok(J.alive && J.hp === 50 && J.mineHits === 1, '1st mine = half hp (hp=' + J.hp + ')');
step(30); J.x = J.px = mines[1].x; J.z = J.pz = mines[1].z; M.update(1 / 60);
ok(!J.alive && J.mineHits === 2, '2nd mine destroys the jeep'); step(200);
ok(M.phase === 'ending' && M.failReason === 'mine', 'run ends with reason mine (' + M.phase + '/' + M.failReason + ')');
M.exit();

// ---------- Nana rush, shooting, death
start(5, 99); J = M.jeep; const N = M.nana, E = WZ.Enemies;
WZ.Hazards.mines.forEach((m) => { m.on = false; });
J.hurt = () => {}; const cr = M.crates.list[0]; J.x = J.px = cr.x + 14; J.z = J.pz = cr.z;
step(60 * 6); const calm = { spawned: E.alive, rush: E.mods.rush }; // jeep stationary, Nana inside
ok(Math.abs(M.rushK) < 0.05 && calm.rush < 1.05, 'no rush while Nana is inside');
ok(N.press() === 'deploy', 'deploy works');
let maxB = 0, spawnedOut = 0, minHp = N.hp, rushMax = 0;
for (let i = 0; i < 60 * 25 && M.phase === 'play'; i++) { M.update(1 / 60); maxB = Math.max(maxB, WZ.Bullets.n); rushMax = Math.max(rushMax, E.mods.rush); minHp = Math.min(minHp, N.hp); }
ok(rushMax > 1.2, 'enemy speed rush > 1.2 (' + rushMax.toFixed(2) + ')');
ok(maxB > 0, 'enemies fired bullets at Nana (max in flight ' + maxB + ')');
ok(minHp < N.maxHp, 'Nana lost hp (' + minHp.toFixed(1) + '/' + N.maxHp + ')');
console.log('rush test: rushMax', rushMax.toFixed(2), 'bullets', maxB, 'nana min hp', minHp.toFixed(1), 'phase', M.phase, 'reason', M.failReason, 'alive enemies', E.alive, 'time', M.time.toFixed(1));
// a Nana that stands still in the open (grabbing) while the jeep is far away: how long does she last?
if (M.phase === 'play') {
  if (N.state === 'IN_JEEP') N.press(); step(30);
  J.x = J.px = J.x + 90; E.reset(); let tdie = -1, hits = 0; N.hp = N.maxHp;
  for (let i = 0; i < 60 * 90 && M.phase === 'play'; i++) { N.state = 'GRABBING'; N.grabT = 0; M.update(1 / 60); if (N.state === 'KO') { tdie = i / 60; break; } }
  ok(tdie > 0, 'a stationary, unprotected Nana dies to enemy fire'); console.log('stationary Nana died after', tdie.toFixed(1), 's');
  step(120);
}
ok(M.phase === 'ending' && M.failReason === 'nana', 'Nana dying ends the run (' + M.phase + '/' + M.failReason + ')');
ok(N.state === 'KO', 'Nana is KO');
M.exit();

// ---------- spawn rate comparison (inside vs outside)
function spawnTest(out) {
  start(5, 7); const j = M.jeep, n = M.nana; WZ.Hazards.mines.forEach((m) => { m.on = false; }); j.hurt = () => {}; n.hurt = () => {};
  let cnt = 0; const sp0 = WZ.Enemies.spawn; WZ.Enemies.spawn = function (...a) { const r = sp0.apply(this, a); if (r) cnt++; return r; };
  const c = M.crates.list[0]; j.x = j.px = c.x + 14; j.z = j.pz = c.z; if (out) n.press();
  for (let i = 0; i < 60 * 10; i++) M.update(1 / 60);
  WZ.Enemies.spawn = sp0; M.exit(); return cnt;
}
const inside = spawnTest(false), outside = spawnTest(true);
ok(outside > inside, 'more enemies spawned when Nana is outside (' + inside + ' vs ' + outside + ')');
console.log('spawned in 10s: inside', inside, 'outside', outside);

// ---------- turret inventory
start(2, 5); const Tu = WZ.Turrets; S.inv.turrets = 1; S.inv.heavy = 0;
ok(Tu.plant('gun') === true && S.inv.turrets === 0, 'gun turret consumes stock');
Tu.update(20); Tu.update(2); ok(Tu.plant('gun') === false && texts.includes(WZ.I18n.t('hud.noturrets')), 'no stock -> blocked');
Tu.update(2); ok(Tu.plant('heavy') === false && texts.includes(WZ.I18n.t('hud.noheavy')), 'no cannon stock');
S.inv.heavy = 2; ok(Tu.plant('heavy') === true && S.inv.heavy === 1, 'cannon plants + consumes');
// cannon splash kills a cluster
const t0 = Tu.list.find((t) => t.kind === 'heavy'); const spawned = [];
for (let i = 0; i < 5; i++) spawned.push(WZ.Enemies.spawn('grunt', t0.x + 14 + i * 0.5, t0.z + 2, 1));
const hp0 = spawned.map((e) => e.hp); for (let i = 0; i < 60 * 2; i++) { Tu.update(1 / 60); WZ.Enemies.update(1 / 60, M.ctx); }
ok(spawned.some((e, i) => e.hp < hp0[i] || e.state === 2), 'cannon hurts enemies in range');
ok(spawned.filter((e, i) => e.hp < hp0[i] || e.state === 2).length >= 3, 'cannon splash hits several enemies');
M.exit();

console.log(issues.length ? 'FAIL:\n - ' + issues.join('\n - ') : 'OK: combat/danger update logic');
process.exit(issues.length ? 1 : 0);
