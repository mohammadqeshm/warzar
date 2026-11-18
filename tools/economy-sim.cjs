// Economy reference table (headless): income per level / season, shop prices, upgrade ladders and affordability.
//   node tools/economy-sim.cjs
// Income model = CFG.economy (crate coins + guardian coins + completion + time bonus + ~1 coin per KO). Nothing here changes the game; it only reads config.js.
const fs = require('fs'), vm = require('vm'), path = require('path');
global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../src/game/config.js'), 'utf8'), { filename: 'config.js' });
const CFG = WZ.CFG, C = CFG.calc, LV = CFG.progress.levels, SEASONS = CFG.maps.order.length;

// typical player: kills every guardian, ~45 s left on level 1 shrinking to ~15 s on level 10, ~40 + 5m regular KOs (1 coin each)
function levelIncome(s, L) {
  const m = L + CFG.progress.seasonBoost * s;
  const crates = L * C.coinCrate(m), guards = L * C.giantKillCoins(s), done = C.completion(m);
  const time = C.timeBonus(Math.max(10, 48 - 3 * L)), kos = Math.round(40 + 5 * m);
  const season = L === LV ? CFG.progress.seasonBonus * (s + 1) : 0;
  return { crates, guards, done, time, kos, season, total: crates + guards + done + time + kos + season };
}
const pad = (v, n) => String(v).padStart(n);
const money = (v) => (v >= 10000 ? (v / 1000).toFixed(1) + 'k' : String(v));
let cum = 0; const cumBySeasonEnd = [];
console.log('== INCOME (coins per cleared level, typical run) ==');
console.log('season  ' + Array.from({ length: LV }, (_, i) => pad('L' + (i + 1), 6)).join('') + '   season total   cumulative');
for (let s = 0; s < SEASONS; s++) {
  let tot = 0; const row = [];
  for (let L = 1; L <= LV; L++) { const r = levelIncome(s, L).total; tot += r; row.push(pad(r, 6)); }
  cum += tot; cumBySeasonEnd.push(cum);
  console.log(pad('S' + (s + 1), 6) + '  ' + row.join('') + pad(tot, 14) + pad(cum, 13));
}

console.log('\n== SHOP: unit price, max stock per level, upgrade ladder (every upgrade = CFG.economy.weaponUpgradeGrowth x the previous) ==');
const keys = Object.keys(CFG.shop); let sumBase = 0, sumMax = 0;
for (const k of keys) {
  const sh = CFG.shop[k], unit = sh.packs[0].price;
  const lim = []; for (let L = 1; L <= sh.maxLevel; L++) lim.push(C.weaponMapLimit(k, L));
  const up = []; for (let L = 1; L < sh.maxLevel; L++) up.push(C.weaponUpgradePrice(k, L));
  const total = up.reduce((a, b) => a + b, 0); sumBase += sh.upgradePrice; sumMax += total;
  console.log(pad(k, 9) + ' unit ' + pad(unit, 5) + ' | stock Lv1..10: ' + lim.join(',') + ' | upgrade 1->2: ' + up[0] + ', 2->3: ' + up[1] + ', 3->4: ' + up[2] + ' ... 9->10: ' + up[8] + ' | to max: ' + money(total) + ' | starter ' + sh.starter);
  if (lim[0] < sh.starter) console.log('  !! level-1 stock is below the starter stock');
  for (let i = 1; i < up.length; i++) if (Math.abs(up[i] / up[i - 1] - CFG.economy.weaponUpgradeGrowth) > 0.06) console.log('  !! upgrade price does not grow by the configured factor at level ' + (i + 1));
  for (let i = 1; i < lim.length; i++) if (lim[i] - lim[i - 1] !== sh.perLevel) console.log('  !! stock step wrong at level ' + (i + 1));
}
console.log('upgrade bases total ' + sumBase + '; all weapons to max level ' + money(sumMax) + ' vs the whole game income ' + money(cum) + ' (maxing everything is intentionally out of reach)');
for (const lvl of [3, 5, 7, 8, 9]) { let t = 0; for (const k of keys) for (let L = 1; L < lvl; L++) t += C.weaponUpgradePrice(k, L); console.log('  every weapon at level ' + lvl + ': ' + money(t) + ' coins'); }

console.log('\n== AFFORDABILITY: a full loadout (1 unit of everything) = ' + keys.reduce((a, k) => a + CFG.shop[k].packs[0].price, 0) + ' coins; income of level 1 = ' + levelIncome(0, 1).total + ', level 5 = ' + levelIncome(0, 5).total + ', level 10 = ' + levelIncome(0, 10).total);
console.log('(vehicles are no longer sold; cumulative income after season 1 = ' + cumBySeasonEnd[0] + ')');
const per = (k) => (CFG.shop[k].packs[0].price / levelIncome(0, 5).total * 100).toFixed(0) + '%';
console.log('one unit as % of a season-1 level-5 payout: ' + keys.map((k) => k + ' ' + per(k)).join(', '));
