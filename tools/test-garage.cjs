// Headless test of the Garage logic, vehicle stats/models and player landmines (no browser needed).
const fs = require('fs'), vm = require('vm'), path = require('path');
const base = path.join(__dirname, '../src/game/');
global.window = global; global.THREE = require(path.join(__dirname, '../node_modules/three/build/three.cjs'));
const store = {}; global.localStorage = { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } };
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }), addEventListener() {} };
global.WZ = { Assets: { tex: () => null, modelOverride: () => null }, Props: { crateMeshShared: () => new THREE.Group() }, I18n: { t: (k, v) => k + (v ? JSON.stringify(v) : '') } };
for (const f of ['config.js', 'rng.js', 'events.js', 'util.js', 'local-storage.js', 'save.js', 'art/geo.js', 'art/vehicles.js', 'art/vehicles_extra.js', 'systems/landmines.js', 'scenes/shop.js']) vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f });
const issues = []; const ok = (c, m) => { if (!c) issues.push(m); };
const Shop = WZ.Scenes.shop, CFG = WZ.CFG;

// --- Save: old save without "inv" must get the starter mines, vehicles default to the jeep
store['wz_save'] = JSON.stringify({ coins: 700 }); WZ.Save.save = WZ.Save.save || (() => {});
const key = Object.keys(store)[0]; WZ.Save.load();
ok(WZ.Save.data.inv && WZ.Save.data.inv.mines === 3, 'old save should get inv.mines = 3, got ' + JSON.stringify(WZ.Save.data.inv));
ok(WZ.Save.data.owned.vehicles.indexOf('jeep') >= 0 && WZ.Save.data.equipped.vehicle === 'jeep', 'jeep must be owned and equipped by default');

// --- vehicles: interface and stats
for (const id of CFG.vehicleOrder) {
  const m = WZ.Vehicles.build(id), st = WZ.Vehicles.stats(id);
  for (const k of ['root', 'bodyG', 'wheels', 'front', 'gunYaw', 'muzzle', 'seatCmdr', 'seatNana', 'bedCrates', 'flag', 'lights']) ok(m[k], id + ' model missing ' + k);
  ok(m.wheels.length === 4 && m.front.length === 2, id + ' needs 4 wheels / 2 steering');
  ok(m.bedCrates.length >= 3, id + ' needs 3 bed crates');
  ok(st.topSpeed > 0 && st.hp > 0 && st.wheelR > 0 && st.halfLen > 0 && st.ram > 0, id + ' stats incomplete');
}
const P = CFG.vehicleOrder.map((i) => CFG.vehicles[i]);
ok(P[0].price === 0 && P[1].price > P[0].price && P[2].price > P[1].price, 'prices must increase with tier');
ok(P[1].topSpeed > P[0].topSpeed && P[2].hp > P[0].hp && P[2].ram > P[0].ram, 'tier stats should differ in character');

// --- purchases
const S = WZ.Save.data; S.coins = 500;
ok(Shop.buyVehicle('buggy') === 'poor' && S.coins === 500, 'buggy must be refused with 500 coins');
S.coins = 650; ok(Shop.buyVehicle('buggy') === 'ok' && S.coins === 50 && S.equipped.vehicle === 'buggy' && S.owned.vehicles.indexOf('buggy') >= 0, 'buggy purchase');
ok(Shop.buyVehicle('buggy') === 'owned', 'cannot buy twice'); ok(Shop.equip('truck') === 'locked', 'cannot equip unowned');
ok(Shop.equip('jeep') === 'ok' && S.equipped.vehicle === 'jeep', 'equip jeep');
// --- purchase cap == weapon level: level 1 mines = 3, +3 per level; the cap is the ONLY thing the upgrade changes
S.weaponLevels.mines = 1; S.coins = 1000; S.inv.mines = 0;
ok(Shop.weaponStockCap('mines') === 3 && Shop.weaponMapLimit('mines') === 3, 'mines: max stock 3 at Lv 1');
ok(Shop.buyMines(1) === 'full' && S.inv.mines === 0 && S.coins === 1000, 'pack of 5 refused at Lv 1 (cap 3)');
ok(Shop.buyMines(0) === 'ok' && Shop.buyMines(0) === 'ok' && Shop.buyMines(0) === 'ok' && S.inv.mines === 3 && S.coins === 1000 - 3 * CFG.shop.mines.packs[0].price, 'buy 3 single mines');
ok(Shop.buyMines(0) === 'full' && S.inv.mines === 3, 'a 4th mine is refused at Lv 1 (stock full)');
ok(Shop.upgradeWeapon('mines') === 'ok' && Shop.weaponLevel('mines') === 2 && Shop.weaponStockCap('mines') === 6, 'Lv 2 -> max stock 6 (+3)');
ok(Shop.buyMines(0) === 'ok' && S.inv.mines === 4, 'after the upgrade more mines can be bought');
S.coins = 5; S.inv.mines = 0; ok(Shop.buyMines(0) === 'poor', 'poor for mines');
// every weapon: Lv1 stock >= starter, constant step, price of one unit grows with power (mine < turret < soldier < cannon < mortar < heli < tank < jet)
for (const k of Object.keys(CFG.shop)) { const sh = CFG.shop[k]; ok(CFG.calc.weaponStockCap(k, 1) >= sh.starter, k + ': Lv 1 stock must cover the free starter stock'); ok(CFG.calc.weaponStockCap(k, 2) - CFG.calc.weaponStockCap(k, 1) === sh.perLevel, k + ': constant step per level'); ok(!sh.cap, k + ': no fixed stock cap any more'); }
const order = ['mines', 'turrets', 'soldiers', 'heavy', 'bombs', 'heli', 'tank', 'jet'].map((k) => CFG.shop[k].packs[0].price);
ok(order.every((v, i) => i === 0 || v > order[i - 1]), 'unit prices follow the power ladder: ' + order.join('<'));
ok(CFG.defenseTech.max === 0 && !Shop.buyTech, 'the second upgrade (Defense Tech) is gone');

// --- 10-level weapon upgrades (price grows x CFG.economy.weaponUpgradeGrowth every level, rounded to 5)
ok(Shop.weaponLevel('turrets') === 1 && Shop.weaponMapLimit('turrets') === 2, 'turrets start at Lv 1 with max stock 2');
ok(Shop.weaponMapLimit('jet') === 1 && Shop.weaponMapLimit('tank') === 1 && Shop.weaponMapLimit('heli') === 1, 'jet=1, tank=1, heli=1 at Lv 1');
const p1 = Shop.weaponUpgradePrice('turrets'), p2 = CFG.calc.weaponUpgradePrice('turrets', 2);
const GR = CFG.economy.weaponUpgradeGrowth;
ok(Math.abs(p2 / p1 - GR) < 0.06 && p2 > p1, 'weapon upgrade price grows by x' + GR + ' each level (' + p1 + ' -> ' + p2 + ')');
ok(CFG.calc.weaponUpgradePrice('mines', 1) >= 100 && CFG.calc.weaponUpgradePrice('turrets', 1) >= 150, 'first upgrades are no longer trivially cheap');
S.coins = 1000000;
for (let lv = 1; lv < 10; lv++) {
  const curP = Shop.weaponUpgradePrice('turrets'), before = S.coins;
  ok(Shop.upgradeWeapon('turrets') === 'ok' && before - S.coins === curP, 'upgrade turrets to level ' + (lv + 1) + ' costs exactly ' + curP);
  if (lv < 9) ok(Shop.weaponUpgradePrice('turrets') > curP, 'next upgrade price is higher');
}
ok(Shop.weaponLevel('turrets') === 10 && Shop.weaponMapLimit('turrets') === 20 && Shop.weaponStockCap('turrets') === 20 && Shop.upgradeWeapon('turrets') === 'max', 'turrets reach max Lv 10 with max stock 20');

// --- vehicles are no longer sold: an old save that owns / equips a bought vehicle is refunded and put back in the jeep
store['warzar_crate_rush_save_v1'] = JSON.stringify({ coins: 10, owned: { vehicles: ['jeep', 'buggy', 'truck'] }, equipped: { vehicle: 'truck' } }); WZ.Save.load();
ok(WZ.Save.data.owned.vehicles.length === 1 && WZ.Save.data.equipped.vehicle === 'jeep' && WZ.Save.data.coins === 10 + CFG.vehicles.buggy.price + CFG.vehicles.truck.price, 'old save: bought vehicles refunded, jeep re-equipped, got ' + WZ.Save.data.coins);
WZ.Save.load(); ok(WZ.Save.data.coins === 10 + CFG.vehicles.buggy.price + CFG.vehicles.truck.price, 'refund is not paid twice') ;
store['warzar_crate_rush_save_v1'] = JSON.stringify(S);
WZ.Save.data = S;

// --- save migration: old saves keep what they paid for
store['warzar_crate_rush_save_v1'] = JSON.stringify({ coins: 100, inv: { mines: 40, jet: 1 }, upgrades: { defense: 2 }, weaponLevels: { mines: 2 } }); WZ.Save.load();
const M2 = WZ.Save.data;
ok(M2.upgrades.defense === 0 && M2.inv.mines === 6 && M2.inv.jet === 1, 'old save: defense tech reset, mines clamped to the Lv 2 cap (6), jet untouched');
ok(M2.coins === 100 + 250 + 550 + (40 - 6) * CFG.shop.mines.packs[0].price, 'old save: defense tech + surplus mines refunded, got ' + M2.coins);
WZ.Save.data = S; S.coins = 1000000; S.weaponLevels.mines = 1; S.inv.mines = 0;     // back to the main test save

// --- landmines
const L = WZ.Landmines, enemies = []; let fxText = [];
WZ.Audio = { sfx() {} }; WZ.Fx = { shake() {}, hitstop() {}, text(s) { fxText.push(s); } };
const noop = () => {}; const kos = [];
const ctx = { scene: new THREE.Scene(), col: { free: () => true }, map: { height: () => 0 }, particles: { poof: noop, sparks: noop, dust: noop },
  jeep: { x: 0, z: 0, h: 0, alive: true, hp: 100, rx: 0, ry: 0, rz: 0, P: { halfLen: 1.45 } },
  enemies: { q: [], hash: { query(x, z, r, out) { out.length = 0; for (const e of enemies) if (Math.hypot(e.x - x, e.z - z) <= r) out.push(e); } }, ko(e) { e.state = 2; kos.push(e); } } };
S.inv.mines = 2; L.init(ctx);
ok(L.plant() === true && S.inv.mines === 1 && L.list.length === 1, 'plant 1');
const m = L.list[0]; ok(m.z < -3, 'mine must be planted BEHIND the vehicle (z=' + m.z.toFixed(1) + ')');
ok(L.plant() === false, 'cooldown blocks instant second plant'); L.update(1); ctx.jeep.z = 30;
ok(L.plant() === true && S.inv.mines === 0 && L.list.length === 2, 'plant 2'); L.update(1);
ok(L.plant() === false && fxText.some((s) => s.indexOf('nomines') >= 0), 'no mines left message');
// unarmed mine must not trigger
const fresh = L.list[1]; fresh.arm = 0.5; enemies.push({ x: fresh.x, z: fresh.z, active: true, state: 0 }); L.update(0.1);
ok(L.list.length === 2 && kos.length === 0, 'unarmed mine must not explode'); enemies.length = 0;
// armed: one enemy on the mine, one inside blast, one outside; the jeep must stay safe
L.update(1);
enemies.push({ x: m.x, z: m.z, active: true, state: 0 }, { x: m.x + 5, z: m.z, active: true, state: 0 }, { x: m.x + 30, z: m.z, active: true, state: 0 });
const hp0 = ctx.jeep.hp; L.update(0.1);
ok(L.list.length === 1, 'exactly the triggered mine explodes'); ok(kos.length === 2, 'enemy on the mine and the one inside the blast are KO\'d (got ' + kos.length + ')');
ok(!kos.includes(enemies[enemies.length - 1]), 'enemy far away must survive'); ok(ctx.jeep.hp === hp0, 'jeep must not be hurt by own mines');
L.dispose(); ok(L.ms === null, 'dispose');
console.log(issues.length ? 'ISSUES (' + issues.length + '):\n' + issues.join('\n') : 'NO ISSUES  (save defaults, 3 vehicle models, prices/stats, purchases, planted mines)');
