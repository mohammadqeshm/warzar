// Headless test of seasons & levels (no browser): unlock rules, crate count == level, difficulty growth, old-save migration.
const fs = require('fs'), vm = require('vm'), path = require('path');
const base = path.join(__dirname, '../src/game/');
global.window = global;
const store = {}; global.localStorage = { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } };
global.document = { addEventListener() {} };
global.WZ = {};
for (const f of ['config.js', 'rng.js', 'events.js', 'save.js', 'progress.js']) vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f });
const issues = []; const ok = (c, m) => { if (!c) issues.push(m); };
const P = WZ.Progress, CFG = WZ.CFG, S = () => WZ.Save.data, order = CFG.maps.order;

// fresh save: only season 1 open, level 1 open
WZ.Save.load();
ok(P.seasonUnlocked(order[0]) && !P.seasonUnlocked(order[1]), 'fresh: only season 1 is open');
ok(P.levelUnlocked(order[0], 1) && !P.levelUnlocked(order[0], 2), 'fresh: only level 1 is open');
ok(P.current(order[0]) === 1, 'fresh: current level 1');

// crate count == level, every crate has a guardian, difficulty rises with every level and every season
for (let l = 1; l <= 10; l++) {
  ok(CFG.calc.crateCount(l, false) === l, 'level ' + l + ' must have ' + l + ' crates');
  ok(CFG.calc.giantCount(l, l) === l, 'level ' + l + ' must have ' + l + ' guardians (one per crate)');
}
for (let s = 0; s < order.length; s++) for (let l = 1; l < 10; l++) ok(P.difficulty(order[s], l + 1) > P.difficulty(order[s], l), 'difficulty must rise each level');
for (let s = 1; s < order.length; s++) ok(P.difficulty(order[s], 1) > P.difficulty(order[s - 1], 1), 'season starts harder than the previous one');
ok(CFG.calc.enemyHpMul(P.difficulty(order[0], 10)) > CFG.calc.enemyHpMul(P.difficulty(order[0], 1)), 'enemy hp grows over the levels');

// win 1..9 -> season 2 still locked; win 10 -> season 2 opens
for (let l = 1; l <= 9; l++) { const r = P.complete(order[0], l, 2); ok(!r.seasonDone && !r.unlockedSeason, 'level ' + l + ' must not finish the season'); }
ok(!P.seasonUnlocked(order[1]) && P.levelUnlocked(order[0], 10) && P.current(order[0]) === 10, 'after 9 wins: level 10 open, season 2 locked');
const fin = P.complete(order[0], 10, 3);
ok(fin.seasonDone && fin.unlockedSeason === order[1] && P.seasonUnlocked(order[1]), 'level 10 unlocks season 2');
ok(S().flags.pendingUnlock === order[1], 'level 10 sets pendingUnlock for the seasons screen animation');
ok(!P.seasonUnlocked(order[2]), 'season 3 still locked');
ok(P.complete(order[0], 10, 3).seasonDone === false, 'season bonus only once');
const nx = P.nextAfterWin(order[0], 10); ok(nx && nx.theme === order[1] && nx.level === 1, 'next after level 10 = season 2 level 1');
ok(P.nextAfterWin(order[0], 4).level === 5, 'next after level 4 = level 5');
ok(P.levelUnlocked(order[1], 1) && !P.levelUnlocked(order[1], 2), 'season 2: only level 1 open');

// persistence + sanitize: cheating / broken saves
const raw = store[Object.keys(store)[0]]; WZ.Save.load();
ok(P.cleared(order[0]) === 10, 'progress survives reload');
S().prog[order[2]][0] = 3; S().settings.map = order[2]; P.sanitize();
ok(P.cleared(order[2]) === 0 && S().settings.map === P.firstOpen(), 'locked season cannot hold progress / be selected');

// old save (one endless level counter) -> migrated into season 1
for (const k of Object.keys(store)) delete store[k];
store['warzar_crate_rush_save_v1'] = JSON.stringify({ coins: 5, level: 7, best: { mission: 7 }, flags: { tutorialDone: true } });
WZ.Save.load();
ok(P.cleared(order[0]) === 6 && S().coins === 5, 'old save level 7 -> 6 cleared levels in season 1, coins kept (got ' + P.cleared(order[0]) + ')');
for (const k of Object.keys(store)) delete store[k];
store['warzar_crate_rush_save_v1'] = JSON.stringify({ level: 40, best: { mission: 40 } });
WZ.Save.load(); ok(P.cleared(order[0]) === 10 && P.seasonUnlocked(order[1]), 'old save level 40 -> season 1 complete, season 2 open');

console.log(issues.length ? 'ISSUES:\n' + issues.join('\n') : 'NO ISSUES  (season unlocks, crates == level, difficulty, migration)');
void raw;
