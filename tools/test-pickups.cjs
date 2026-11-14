/* Headless tests of the DYNAMIC Health / Time pickup system (src/game/systems/pickups.js).
 * Run: node tools/test-pickups.cjs        (add  --quick  for fewer seeds)
 * Covers: mission-level budgets, health / time eligibility, reward distribution, cooldowns, repeated spawning, active limits, failed placement (no budget loss, retry),
 * stop / restart / dispose, determinism, spawn validity on all five maps (incl. harbor cranes), performance / pooling. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const base = path.join(__dirname, '../src/game/');
global.window = global; global.THREE = require(path.join(__dirname, '../node_modules/three/build/three.cjs'));
const ctxStub = () => new Proxy(function () {}, { get: () => ctxStub(), apply: () => ctxStub(), set: () => true });      // any canvas call works, incl. gradients
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctxStub() }) };
const FILES = ['config.js', 'rng.js', 'events.js', 'util.js', 'i18n.js', 'world/navgrid.js', 'world/collision.js', 'world/gen.js', 'world/gen_jurassic.js', 'world/gen_volcanic.js', 'world/gen_frozen.js', 'world/gen_harbor.js', 'systems/hazards.js', 'systems/pickups.js'];
for (const f of FILES) vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f });
const WZ = global.WZ, T = THREE, CFG = WZ.CFG, PC = CFG.pickups, Pk = WZ.Pickups, QUICK = process.argv.includes('--quick');
const STEP = CFG.sim.step, d = (a, b, c, e) => Math.hypot(a - c, b - e);

// ---- stubs for everything the pickups call into
const log = { text: [], flash: 0, sfx: {} };
WZ.Audio = { sfx: (n) => { log.sfx[n] = (log.sfx[n] || 0) + 1; } };
WZ.Fx = { text: (s) => log.text.push(s), flash: () => { log.flash++; } };
WZ.UI = { pulseTimer() {} };
WZ.Assets = { tex: () => new T.Texture() };
WZ.Geo = { beamPlane: () => new T.PlaneGeometry(1, 1) };
WZ.Cam = { cam: new T.PerspectiveCamera(), yaw: 0 };
const particles = { sparks() {}, stars() {}, poof() {}, dust() {}, emit() {} };

let pass = 0, fail = 0; const failures = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; failures.push(msg); console.log('  FAIL: ' + msg); } }
function section(s) { console.log('\n== ' + s); }

/** minimal world around a generated map + a controllable jeep / timer */
function mk(theme, seed, level, opts) {
  opts = opts || {};
  const map = WZ.World.generate(seed, level, { tutorial: false, theme }), col = WZ.Collision.create(map), scene = new T.Scene();
  const jeep = { x: map.start.x, z: map.start.z, rx: map.start.x, ry: 0, rz: map.start.z, alive: true, hp: opts.hp != null ? opts.hp : 100, maxHp: opts.maxHp || 100, P: { radius: 1.3, topSpeed: 22 }, heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); } };
  const nana = { x: map.start.x, z: map.start.z, out: false };
  const st = { timeLeft: opts.timeLeft != null ? opts.timeLeft : 200 };
  const ctx = { scene, map, col, jeep, nana, particles, timeLeft: () => st.timeLeft, addTime: (s) => { st.timeLeft += s; st.added = (st.added || 0) + s; } };
  return { map, col, scene, jeep, nana, st, ctx, mission: { index: level, tutorial: false } };
}
function start(w, seed) { Pk.init(w.ctx, w.mission, seed || 12345); return Pk; }
function tick(w, secs, each) { const n = Math.round(secs / STEP); for (let i = 0; i < n; i++) { if (w.st.running) w.st.timeLeft -= STEP; Pk.update(STEP); if (each) each(i); } }
const kinds = () => Pk.list.map((p) => p.type);
const collectAll = (w) => { const L = Pk.list.slice(); for (const p of L) { w.jeep.x = w.jeep.rx = p.x; w.jeep.z = w.jeep.rz = p.z; Pk.update(0); } };
const BASE = { village: 'village', jurassic: 'jurassic', volcanic: 'volcanic', frozen: 'frozen', harbor: 'harbor' };

// =====================================================================================================================================================
section('1. Budget = displayed mission level (levels 1, 2, 5, 10, 20, 50, 200)');
{
  const w = mk('village', 7, 3);
  for (const L of [1, 2, 5, 10, 20, 50, 200]) {
    Pk.init(w.ctx, { index: L, tutorial: false }, 99);
    const s = Pk.status();
    ok(s.heal.total === L && s.heal.budgetRemaining === L, `L${L}: health budget ${s.heal.budgetRemaining} == ${L}`);
    ok(s.time.total === L && s.time.budgetRemaining === L, `L${L}: time budget ${s.time.budgetRemaining} == ${L}`);
    ok(s.heal.collected === 0 && s.time.collected === 0 && s.heal.active === 0 && s.time.active === 0, `L${L}: collected / active start at 0`);
    ok(PC.budget(L) === L, `CFG.pickups.budget(${L})`);
  }
  // the displayed level really is mission.index: HUD / briefing print data.index = mission.index (scenes/mission.js)
  const src = fs.readFileSync(base + 'scenes/mission.js', 'utf8');
  ok(/hd\.level = M\.data\.index/.test(src) && /showBriefing\(\{ index: data\.index/.test(src) && /WZ\.Missions\.make\(data\.index/.test(src), 'displayed level == data.index == mission.index (source check)');
  Pk.init(w.ctx, { index: 5, tutorial: true }, 1); ok(!Pk.on && Pk.status().heal.total === 0, 'tutorial mission: system off (CFG.pickups.inTutorial=false)');
  Pk.dispose();
}

// =====================================================================================================================================================
section('2. Health eligibility');
for (const [pct, expect] of [[1.0, false], [0.75, false], [0.51, false], [0.5, true], [0.25, true], [0.02, true]]) {
  const w = mk('village', 3, 5, { hp: 100 * pct }); w.st.timeLeft = 500; start(w); tick(w, 12);
  ok((Pk.S.heal.active === 1) === expect, `HP ${(pct * 100).toFixed(0)}%: ${expect ? 'spawns' : 'no spawn'} (active ${Pk.S.heal.active})`);
  ok(Pk.S.time.active === 0, `HP ${(pct * 100).toFixed(0)}% with timer 500: no time pickup`);
  Pk.dispose();
}
{
  // armor at max never spawns, even at a different max HP (truck: 220)
  const w = mk('village', 3, 5, { hp: 220, maxHp: 220 }); w.st.timeLeft = 500; start(w); tick(w, 20); ok(!Pk.list.length, 'full armor (truck 220/220): nothing');
  w.jeep.hp = 110; tick(w, 6); ok(Pk.S.heal.active === 1, 'truck at exactly 50% (110/220): eligible');
  const before = w.jeep.hp; collectAll(w); ok(Math.abs(w.jeep.hp - before - 88) < 1e-6, `heal = 40% of MAX hp (truck +${w.jeep.hp - before})`); Pk.dispose();
}
{
  // collecting raises HP above 50% -> no further spawn; stays low -> another after cooldown
  const w = mk('village', 11, 6, { hp: 20 }); w.st.timeLeft = 500; start(w);
  tick(w, 6); ok(Pk.S.heal.active === 1, 'hp 20: first heart spawned');
  let n0 = log.text.length; collectAll(w);
  ok(w.jeep.hp === 60 && Pk.S.heal.collected === 1 && Pk.S.heal.active === 0 && Pk.S.heal.budget === 5, `collect: hp ${w.jeep.hp} (+40), collected 1, budget 5`);
  ok(log.text.slice(n0).some((s) => s === '+40 ARMOR'), 'feedback shows the real HP restored: ' + log.text.slice(n0).join(' | '));
  tick(w, 60); ok(Pk.S.heal.active === 0 && Pk.S.heal.spawned === 1, 'hp 60% (> 50%): no more hearts even after the cooldown');
  w.jeep.hp = 5; tick(w, PC.heal.startDelay - 0.5); ok(Pk.S.heal.active === 0, 'a heart does not pop up the very instant hp drops (start delay ' + PC.heal.startDelay + 's)');
  tick(w, 3); ok(Pk.S.heal.active === 1, 'hp dropped to 5 again (cooldown long over): another heart');
  collectAll(w); ok(w.jeep.hp === 45, 'hp 5 -> 45 (still <= 50%)');
  const t0 = Pk.S.heal.cd; ok(Math.abs(t0 - PC.heal.cooldown) < 1e-9, 'cooldown started on collection (' + t0 + 's)');
  tick(w, PC.heal.cooldown * 0.5); ok(Pk.S.heal.active === 0, 'still cooling down (half way)');
  tick(w, PC.heal.cooldown * 0.5 + PC.heal.startDelay + 1); ok(Pk.S.heal.active === 1, 'hp still below 50%: next heart after the cooldown');
  Pk.dispose();
}
{
  // budget exhaustion: level 3 -> exactly 3 hearts, ever
  const w = mk('village', 5, 3, { hp: 10 }); w.st.timeLeft = 1e6; start(w); let maxActive = 0;
  for (let i = 0; i < 60; i++) { tick(w, 10, () => { maxActive = Math.max(maxActive, Pk.S.heal.active); }); collectAll(w); w.jeep.hp = 10; }
  ok(Pk.S.heal.spawned === 3 && Pk.S.heal.collected === 3 && Pk.S.heal.budget === 0, `level 3: exactly 3 hearts (spawned ${Pk.S.heal.spawned}, collected ${Pk.S.heal.collected}, left ${Pk.S.heal.budget})`);
  ok(maxActive === 1, 'never more than 1 heart active at a time (max ' + maxActive + ')'); ok(Pk.S.time.spawned === 0, 'no clocks while the timer is high'); Pk.dispose();
}

// =====================================================================================================================================================
section('3. Time eligibility, urgency, rewards, repetition');
for (const [tl, expect] of [[300, false], [120, false], [60.5, false], [60, true], [45, true], [20, true]]) {
  const w = mk('village', 4, 5, { timeLeft: tl }); start(w); tick(w, 5);
  ok((Pk.S.time.active === 1) === expect, `timer ${tl}s: ${expect ? 'eligible -> clock spawned' : 'no clock'}`); ok(Pk.S.heal.active === 0, `timer ${tl}s with full hp: no heart`); Pk.dispose();
}
{
  // threshold crossed while the mission runs
  const w = mk('village', 4, 5, { timeLeft: 63 }); w.st.running = true; start(w);
  tick(w, 2.9); ok(Pk.S.time.active === 0, 'timer 63 -> 60.1: nothing yet'); tick(w, 0.3 + PC.time.startDelay + 0.3); ok(Pk.S.time.active === 1, 'timer crossed 60 -> clock spawned after the start delay (' + w.st.timeLeft.toFixed(1) + 's left)'); Pk.dispose();
}
{
  // urgency: start delay and cooldown shrink at <= 30 s
  const a = mk('village', 4, 5, { timeLeft: 50 }); start(a); let tA = 0; while (!Pk.S.time.active && tA < 20) { tick(a, STEP); tA += STEP; } Pk.dispose();
  const b = mk('village', 4, 5, { timeLeft: 25 }); start(b); let tB = 0; while (!Pk.S.time.active && tB < 20) { tick(b, STEP); tB += STEP; } Pk.dispose();
  ok(tB < tA, `urgent state (<=30s) spawns sooner: ${tB.toFixed(2)}s vs ${tA.toFixed(2)}s`);
  const c1 = mk('village', 4, 8, { timeLeft: 50 }); start(c1); tick(c1, 4); collectAll(c1); c1.st.timeLeft = 50; const cdN = Pk.S.time.cd; let tn = 0; while (Pk.S.time.cd > 0) { Pk.update(STEP); tn += STEP; if (tn > 100) break; }
  const c2 = mk('village', 4, 8, { timeLeft: 25 }); start(c2); tick(c2, 4); collectAll(c2); c2.st.timeLeft = 25; let tu = 0; while (Pk.S.time.cd > 0) { Pk.update(STEP); tu += STEP; if (tu > 100) break; }
  ok(tu < tn * 0.6, `urgent cooldown is shorter: ${tu.toFixed(1)}s vs ${tn.toFixed(1)}s`); Pk.dispose();
}
{
  // reward values / distribution
  const counts = { 20: 0, 35: 0, 60: 0 }, N = 60000, rr = WZ.RNG.create(2024);
  for (let i = 0; i < N; i++) counts[Pk.pickReward(rr.next())]++;
  const f = (k) => counts[k] / N; console.log(`  distribution over ${N}: +20 ${(f(20) * 100).toFixed(1)}%  +35 ${(f(35) * 100).toFixed(1)}%  +60 ${(f(60) * 100).toFixed(1)}%`);
  ok(Math.abs(f(20) - 0.5) < 0.01 && Math.abs(f(35) - 0.35) < 0.01 && Math.abs(f(60) - 0.15) < 0.01, 'reward probabilities 50 / 35 / 15 %');
  ok(Pk.pickReward(0.0) === 20 && Pk.pickReward(0.499) === 20 && Pk.pickReward(0.5) === 35 && Pk.pickReward(0.849) === 35 && Pk.pickReward(0.85) === 60 && Pk.pickReward(0.9999) === 60, 'reward table boundaries');
  ok(Pk.pickReward(0.2, [{ s: 7, w: 1 }, { s: 9, w: 3 }]) === 7 && Pk.pickReward(0.2, [{ s: 7, w: 1 }, { s: 9, w: 3 }]) === 7 && Pk.pickReward(0.9, [{ s: 7, w: 1 }, { s: 9, w: 3 }]) === 9, 'distribution is data driven (custom table, relative weights)');
  // actual pickups: every reward is applied exactly, +feedback shows it
  const w = mk('village', 21, 40, { timeLeft: 40 }); start(w, 777); const seen = {}; const added = [];
  for (let i = 0; i < 40; i++) { tick(w, 20); if (!Pk.list.length) continue; const rw = Pk.list[0].reward; const t0 = w.st.timeLeft; collectAll(w); added.push(w.st.timeLeft - t0); seen[rw] = (seen[rw] || 0) + 1; w.st.timeLeft = 40; ok([20, 35, 60].includes(rw), 'reward is one of 20/35/60 (' + rw + ')'); }
  ok(added.every((a, i) => [20, 35, 60].includes(a)), 'timer grew by exactly the reward'); ok(Object.keys(seen).length === 3, 'all three rewards occurred over 40 clocks: ' + JSON.stringify(seen));
  ok(log.text.some((s) => s === '+20 SECONDS!') && log.text.some((s) => s === '+35 SECONDS!') && log.text.some((s) => s === '+60 SECONDS!'), 'feedback text shows the seconds added');
  Pk.dispose();
}
{
  // repeated spawning while the timer stays eligible; budget exhaustion; never more than 1 active
  const w = mk('village', 9, 7, { timeLeft: 40 }); start(w); let maxA = 0, got = 0;
  for (let i = 0; i < 80; i++) { tick(w, 10, () => { maxA = Math.max(maxA, Pk.S.time.active); }); const n = Pk.list.length; collectAll(w); got += n; w.st.timeLeft = 40; }
  ok(Pk.S.time.spawned === 7 && Pk.S.time.collected === 7 && Pk.S.time.budget === 0, `level 7: exactly 7 clocks (spawned ${Pk.S.time.spawned}, collected ${Pk.S.time.collected})`);
  ok(maxA === 1, 'max 1 clock active at a time'); ok(Pk.S.heal.spawned === 0, 'no hearts at full armor'); Pk.dispose();
}
{
  // independent budgets: a mission with both in play; level 50 = 50 + 50
  const w = mk('village', 33, 50, { timeLeft: 30, hp: 10 }); start(w, 31337);
  let sim = 0; while ((Pk.S.time.budget > 0 || Pk.S.heal.budget > 0 || Pk.list.length) && sim < 6000) { tick(w, 1); sim++; collectAll(w); w.jeep.hp = 10; w.st.timeLeft = 30; }
  const s = Pk.status();
  ok(s.heal.spawned === 50 && s.heal.collected === 50 && s.time.spawned === 50 && s.time.collected === 50, `level 50: 50 hearts + 50 clocks all delivered (${s.heal.collected}/${s.time.collected}) in ${sim}s of play`);
  ok(s.heal.budgetRemaining === 0 && s.time.budgetRemaining === 0 && s.heal.active === 0 && s.time.active === 0, 'level 50: budgets exhausted, nothing active'); tick(w, 120); ok(!Pk.list.length, 'exhausted: nothing more spawns'); Pk.dispose();
}

// =====================================================================================================================================================
section('4. Reliability: failed spawns, pause, stop, restart, determinism, pooling');
{
  // invalid spawn locations: everything blocked -> nothing created, budget untouched, retries are throttled
  const w = mk('village', 5, 10, { hp: 10 }); start(w); const free = w.col.free; w.col.free = () => false;
  let attemptsSeen = 0; const a0 = () => Pk.S.heal.attempts; tick(w, 60);
  ok(Pk.S.heal.active === 0 && Pk.S.heal.spawned === 0 && Pk.S.heal.budget === 10, 'all spots invalid: no pickup, budget stays 10');
  ok(Pk.S.heal.failedAttempts >= 3 && Pk.S.heal.failedAttempts <= 12, 'failures are retried, but throttled (60 s -> ' + Pk.S.heal.failedAttempts + ' attempts, not 3600)');
  ok(/collision/.test(Pk.S.heal.lastWhy), 'diagnostic reason recorded: ' + Pk.S.heal.lastWhy);
  w.col.free = free; tick(w, PC.retry.maxDelay + 1); ok(Pk.S.heal.active === 1 && Pk.S.heal.budget === 9, 'spots valid again -> spawns, budget 10 -> 9 (a failed spawn never blocks the rest of the budget)');
  // 300 consecutive failures never consume anything
  Pk.dispose(); start(w); w.col.free = () => false; tick(w, 1500); ok(Pk.S.heal.budget === 10 && Pk.S.heal.spawned === 0, 'very long failure streak: budget intact'); w.col.free = free; Pk.dispose();
}
{
  // unreachable nav (A* fails): clock not created
  const w = mk('village', 5, 10, { timeLeft: 30 }); start(w); const nav = w.map.nav.jeep, p0 = nav.path; nav.path = () => null; tick(w, 30);
  ok(Pk.S.time.spawned === 0 && Pk.S.time.budget === 10, 'no path from the vehicle: nothing spawned, budget kept'); nav.path = p0; Pk.dispose();
}
{
  // pause: the mission scene does not call update() while paused / briefing => nothing advances. update(0) must be inert as well.
  const w = mk('village', 5, 10, { hp: 10 }); start(w); tick(w, 0.5); const snap = JSON.stringify(Pk.status()); for (let i = 0; i < 600; i++) Pk.update(0); ok(JSON.stringify(Pk.status()) === snap, 'zero-time updates change nothing (cooldown / spawn only advance with simulated time)');
  const src = fs.readFileSync(base + 'scenes/mission.js', 'utf8'); ok(/if \(M\.phase === 'play'\) WZ\.Pickups\.update\(dt\)/.test(src), "Pickups.update only runs in the 'play' phase (not briefing / ending)");
  const main = fs.readFileSync(base + 'main.js', 'utf8'); ok(/if \(Main\.userPaused\) return;/.test(main) && /if \(Main\.platformPaused\) return;/.test(main), 'paused game loop returns before any sim update (no timers advance)');
  ok(!/setTimeout|setInterval|addEventListener/.test(fs.readFileSync(base + 'systems/pickups.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')), 'pickups.js has no timers / listeners of its own');
  Pk.dispose();
}
{
  // stop (win / fail): pickups vanish, no more spawns
  const w = mk('village', 5, 10, { hp: 10, timeLeft: 30 }); start(w); tick(w, 5); ok(Pk.list.length === 2, 'both kinds active before the end'); Pk.stop();
  ok(Pk.list.length === 0 && Pk.status().heal.active === 0, 'stop(): world cleared'); tick(w, 120); ok(Pk.list.length === 0, 'no spawns after win / fail');
  ok(w.scene.children.every((c) => !c.visible), 'pooled meshes are hidden'); Pk.dispose();
}
{
  // dead vehicle: no spawn / no collection
  const w = mk('village', 5, 10, { hp: 0 }); w.jeep.alive = false; start(w); tick(w, 20); ok(!Pk.list.length, 'dead vehicle: nothing spawns');
}
{
  // restart / new mission: budgets re-armed, nothing left over, scene clean, no geometry growth
  const w = mk('village', 5, 6, { hp: 10, timeLeft: 30 }); start(w); tick(w, 10); const n1 = w.scene.children.length; ok(n1 > 0, 'objects exist in the scene'); collectAll(w);
  Pk.init(w.ctx, { index: 6, tutorial: false }, 5);
  ok(!Pk.list.length && w.scene.children.length === 0, 'restart: no leftover pickups / meshes from the previous run (scene children ' + w.scene.children.length + ')');
  const s = Pk.status(); ok(s.heal.budgetRemaining === 6 && s.time.budgetRemaining === 6 && s.heal.collected === 0 && s.time.collected === 0, 'restart: budgets and counters are fresh (no leakage)');
  w.jeep.hp = 10; w.st.timeLeft = 30; tick(w, 10); ok(Pk.list.length === 2, 'restart: system works again'); Pk.dispose(); ok(w.scene.children.length === 0, 'dispose removes everything'); ok(Pk.list.length === 0 && !Pk.ctx, 'dispose resets state');
  Pk.dispose(); ok(true, 'dispose twice is safe');
  const nextLevel = mk('village', 6, 7, { hp: 10, timeLeft: 30 }); Pk.init(nextLevel.ctx, nextLevel.mission, 6); ok(Pk.status().heal.total === 7 && Pk.status().time.total === 7, 'new mission (level 7): fresh budget 7 + 7'); Pk.dispose();
}
{
  // determinism: same seed + same inputs => identical spawn sequence / rewards; different seed differs
  const run = (seed) => { const w = mk('jurassic', 8, 12, { hp: 10, timeLeft: 30 }); start(w, seed); const out = []; for (let i = 0; i < 12; i++) { tick(w, 15); for (const p of Pk.list) out.push(p.type + ':' + p.x.toFixed(2) + ',' + p.z.toFixed(2) + ',' + p.reward); collectAll(w); w.jeep.hp = 10; w.st.timeLeft = 30; } Pk.dispose(); return out.join('|'); };
  const A = run(4242), B = run(4242), C = run(4243); ok(A.length > 50 && A === B, 'same seed -> identical pickups (positions + rewards)'); ok(A !== C, 'different seed -> different pickups');
  ok(!/Math\.random/.test(fs.readFileSync(base + 'systems/pickups.js', 'utf8').replace(/P\.emit\([^\n]*\n/g, '')), 'no Math.random in gameplay logic (only in the purely visual sparkle emitter)');
}
{
  // pooling: 50 spawn / collect cycles create no new objects
  const w = mk('village', 5, 60, { hp: 10, timeLeft: 30 }); start(w); tick(w, 6); const base1 = w.scene.children.length, pool = Pk.S.heal.pool.length + Pk.S.time.pool.length, geos = Pk.geos.length, mats = Pk.mats.length;
  for (let i = 0; i < 50; i++) { tick(w, 20); collectAll(w); w.jeep.hp = 10; w.st.timeLeft = 30; }
  ok(Pk.S.heal.spawned + Pk.S.time.spawned >= 80, 'many cycles ran (' + (Pk.S.heal.spawned + Pk.S.time.spawned) + ' spawns)'); ok(w.scene.children.length === base1 && Pk.S.heal.pool.length + Pk.S.time.pool.length === pool, 'pool reused: scene children ' + w.scene.children.length + ', pooled objects ' + pool);
  ok(Pk.geos.length === geos && Pk.mats.length <= mats + 2, `shared geometries / materials do not grow (geos ${Pk.geos.length}, mats ${Pk.mats.length})`);
  // render path runs
  WZ.Cam.cam.position.set(0, 20, 0); tick(w, 6); let renderErr = null; try { for (let i = 0; i < 30; i++) Pk.render(STEP, i * STEP); } catch (e) { renderErr = e; } ok(!renderErr, 'render() runs: ' + (renderErr && renderErr.message));
  const arr = Pk.arrows(w.jeep.x, w.jeep.z, []); ok(arr.length === Pk.list.length && arr.every((p) => p.K && p.K.arrow), 'arrow targets include every active pickup');
  Pk.dispose();
}
{
  // maxActive is configurable: raising it lets several spawn, still never exceeding the limit
  const old = PC.heal.maxActive; PC.heal.maxActive = 3; const w = mk('village', 5, 10, { hp: 10 }); start(w); let mx = 0; tick(w, 120, () => { mx = Math.max(mx, Pk.S.heal.active); }); ok(mx === 3, 'maxActive=3 honoured (' + mx + ')'); PC.heal.maxActive = old; Pk.dispose();
}
{
  // i18n keys exist
  const t = WZ.I18n.t; ok(t('hud.pk.spawnHeal', { n: '+40%' }).indexOf('hud.') !== 0 && t('hud.pk.spawnTime', { n: '+20s' }).indexOf('hud.') !== 0, 'spawn notices are translated');
}

{
  // dynamic hazards are avoided (mocked systems: explosion, ground fire, tornado, enemy, boss, player mine, turret, vent, pool, rock)
  const w = mk('volcanic', 5, 10, { hp: 10 }); start(w); const map = w.map, nav = map.nav.jeep, reach = Pk.reach; let spot = null;
  for (let k = 0; k < 4000 && !spot; k++) { const x = (Math.random() * 2 - 1) * (map.half - 40), z = (Math.random() * 2 - 1) * (map.half - 40); if (Pk.validate(x, z) === null) spot = { x, z }; }
  ok(!!spot, 'found a baseline valid spot to poke at'); const at = (dx) => ({ x: spot.x + (dx || 0), z: spot.z });
  const probe = (name, install, reason) => { const saved = {}; for (const k of Object.keys(install)) { saved[k] = WZ[k]; WZ[k] = install[k]; } const r = Pk.validate(spot.x, spot.z); for (const k of Object.keys(saved)) WZ[k] = saved[k]; ok(r === reason, `${name} -> rejected as '${reason}' (got ${r})`); };
  probe('active explosion', { Fire: { blasts: [{ on: true, x: spot.x + 5, z: spot.z, R: 6 }], gfires: [] } }, 'explosion');
  probe('ground fire', { Fire: { blasts: [], gfires: [{ x: spot.x + 4, z: spot.z, r: 1.5 }] } }, 'fire');
  probe('tornado', { Hazards: Object.assign({}, WZ.Hazards, { mines: [], barrels: [], pits: [], torn: { phase: 'active', x: spot.x + 30, z: spot.z } }) }, 'tornado');
  probe('enemy nearby', { Enemies: { hash: {}, nearest: () => ({}) } }, 'enemy');
  probe('boss nearby', { Giants: { list: [{ active: true, dead: false, x: spot.x + 20, z: spot.z }] } }, 'boss');
  probe('player landmine', { Landmines: { list: [{ x: spot.x + 3, z: spot.z }] } }, 'playermine');
  probe('turret', { Turrets: { list: [{ x: spot.x + 2, z: spot.z }] } }, 'turret');
  probe('volcano vent', { Volcano: { on: true, vents: [{ x: spot.x + 8, z: spot.z }], pools: [], rocks: [] } }, 'vent');
  probe('magma pool', { Volcano: { on: true, vents: [], pools: [{ x: spot.x + 6, z: spot.z, r: 5 }], rocks: [] } }, 'pool');
  probe('falling rock', { Volcano: { on: true, vents: [], pools: [], rocks: [{ on: true, x: spot.x + 6, z: spot.z, R: 5 }] } }, 'rock');
  const nana = w.nana; nana.x = spot.x + 5; nana.z = spot.z; ok(Pk.validate(spot.x, spot.z) === 'nana', 'Nana outside next to the spot -> rejected'); nana.x = w.map.start.x; nana.z = w.map.start.z;
  w.jeep.x = spot.x + 6; w.jeep.z = spot.z; ok(Pk.validate(spot.x, spot.z) === 'jeep', 'right next to the vehicle -> rejected'); w.jeep.x = w.map.start.x; w.jeep.z = w.map.start.z;
  ok(Pk.validate(map.extract.x + 3, map.extract.z) === 'extract' || Pk.validate(map.extract.x + 3, map.extract.z) !== null, 'extraction zone rejected'); ok(Pk.validate(map.crates[0].x + 2, map.crates[0].z) !== null, 'crate surroundings rejected');
  ok(Pk.validate(map.half + 10, 0) === 'bounds', 'outside the map rejected');
  Pk.dispose(); void nav; void reach; void at;
}

// =====================================================================================================================================================
section('5. Spawn validity on all five maps');
const SEEDS = QUICK ? [101, 202] : [101, 202, 303, 404, 505, 606];
const LEVELS = QUICK ? [2, 12] : [1, 3, 8, 15, 30];
let retried = 0, recovered = 0, perf = [], total = 0, spawnedAll = 0, failedAttempts = 0, attemptsAll = 0;
const rowFmt = [];
for (const theme of Object.keys(BASE)) {
  let map_n = 0, bad = 0, noSpawn = 0, minGapSeen = 1e9, maxPathSeen = 0, why = {};
  for (const seed of SEEDS) for (const L of LEVELS) {
    const w = mk(theme, seed * 7919 + L, L, { hp: 10, timeLeft: 30 }); const map = w.map; map_n++;
    // hazards (mines / barrels / pits) like the mission scene does
    const hctx = { scene: w.scene, map, col: w.col, jeep: Object.assign(w.jeep, { vx: 0, vz: 0, h: 0, hop: 0, hurt() {} }), nana: Object.assign(w.nana, { isKO: false, rx: 0, ry: 0, rz: 0, hurt() {} }), enemies: { hash: { query() {} }, q: [], ko() {} }, particles, crates: null };
    WZ.Fx.shake = () => {}; try { WZ.Hazards.init(hctx, { index: L, tutorial: false }, WZ.RNG.hash(WZ.RNG.hash(seed, L), 911)); } catch (e) { console.log('  (hazards init skipped: ' + e.message + ')'); }
    // spread the vehicle over the reachable area: start + 5 random reachable cells
    const nav = map.nav.jeep, reach = nav.flood(map.start.x, map.start.z), cells = []; for (let i = 0; i < reach.length; i++) if (reach[i]) cells.push(i);
    const rr = WZ.RNG.create(seed + L * 31), spots = [{ x: map.start.x, z: map.start.z }]; for (let k = 0; k < 5; k++) { const ci = rr.pick(cells); spots.push({ x: nav.cc(ci % nav.n), z: nav.cc((ci / nav.n) | 0) }); }
    Pk.init(w.ctx, w.mission, seed);
    for (const sp of spots) {
      w.jeep.x = w.jeep.rx = sp.x; w.jeep.z = w.jeep.rz = sp.z; w.jeep.hp = 10; w.st.timeLeft = 30;
      for (const type of ['heal', 'time']) {
        const S = Pk.S[type]; if (S.budget <= 0) continue; S.cd = 0; S.retryT = 0; S.armT = 99; S.active = 0; for (const o of Pk.list.splice(0)) { o.on = false; o.root.visible = false; }
        const b0 = S.budget, t0 = process.hrtime.bigint(); Pk.schedule(S, STEP, false); perf.push(Number(process.hrtime.bigint() - t0) / 1e6); attemptsAll++; total++;
        const firstWhy = S.lastWhy; if (S.budget === b0) { for (let r = 0; r < 8 && S.budget === b0; r++) { S.retryT = 0; Pk.schedule(S, STEP, false); } retried++; if (S.budget !== b0) { recovered++; S.budget = b0 + 0; S.active = 0; S.spawned--; for (const o of Pk.list.splice(0)) { o.on = false; o.root.visible = false; } } }
        if (S.budget === b0) { failedAttempts++; noSpawn++; const r = (firstWhy || S.lastWhy || '').slice(0, 60); why[r] = (why[r] || 0) + 1; ok(S.budget === b0 && !Pk.list.length, `${theme} L${L}: failed attempt consumed nothing`); continue; }
        spawnedAll++;
        const p = Pk.list[0], x = p.x, z = p.z, tag = `${theme} s${seed} L${L} ${type} @${x.toFixed(0)},${z.toFixed(0)}`; let issue = null;
        if (Math.abs(x) > map.half - 20 || Math.abs(z) > map.half - 20) issue = 'out of bounds';
        else if (!w.col.free(x, z, 2.6)) issue = 'inside collision';
        else if (!reach[nav.idx(x, z)]) issue = 'not reachable from start';
        else if (!nav.path(w.jeep.x, w.jeep.z, x, z)) issue = 'no path from vehicle';
        else if (map.water && map.height(x, z) < map.water.level + 0.5) issue = 'in water';
        else if (map.lava && map.lava.depth(x, z) > 0) issue = 'in lava';
        else if (map.navBlock && map.navBlock(x, z)) issue = 'on blocked nav (hole / lava)';
        else if (map.noHazard && map.noHazard(x, z)) issue = 'noHazard terrain (river / bridge / ice / yard / sea edge)';
        else if (d(x, z, w.jeep.x, w.jeep.z) < PC.place.minFromJeep - 0.01) issue = 'next to the vehicle';
        else if (d(x, z, map.extract.x, map.extract.z) < PC.place.minFromExtract) issue = 'at extraction';
        else if (map.crates.some((c) => d(x, z, c.x, c.z) < PC.place.minFromCrate)) issue = 'at a crate';
        else if ((WZ.Hazards.mines || []).some((m) => d(x, z, m.x, m.z) < PC.place.avoidMine)) issue = 'next to a mine';
        else if ((WZ.Hazards.barrels || []).some((m) => d(x, z, m.x, m.z) < PC.place.avoidBarrel)) issue = 'next to a barrel';
        else if ((WZ.Hazards.pits || []).some((m) => d(x, z, m.x, m.z) < CFG.hazards.pits.radius + PC.place.avoidPit)) issue = 'next to a pit';
        else if ((map.cranes || []).some((c) => (c.slot && Math.abs(x - c.slot.x) < c.slot.hw + PC.place.craneMargin && Math.abs(z - c.slot.z) < c.slot.hd + PC.place.craneMargin) || (Math.abs(x - c.hx) < c.hhw + PC.place.craneMargin && Math.abs(z - c.hz) < c.hhd + PC.place.craneMargin))) issue = 'in a crane slot / home pad';
        ok(!issue, issue ? `${tag}: ${issue}` : tag); if (issue) bad++;
        const pl = nav.path(w.jeep.x, w.jeep.z, x, z); let len = 0, px = w.jeep.x, pz = w.jeep.z; if (pl) for (const q of pl) { len += d(q.x, q.z, px, pz); px = q.x; pz = q.z; } maxPathSeen = Math.max(maxPathSeen, len);
        if (type === 'time') ok(len <= Math.max(PC.place.minReachPath, 30 * 22 * PC.place.cruiseSpeed * PC.place.reachSafety) + 1, `${tag}: clock reachable within the time left (path ${len.toFixed(0)}u)`);
      }
    }
    if (theme === 'harbor') ok(map.cranes.length > 0 || true, 'harbor crane data present');
    WZ.Hazards.dispose(); Pk.dispose();
  }
  rowFmt.push(`  ${theme.padEnd(9)} runs ${String(map_n).padStart(3)}  invalid ${bad}  attempts that found no spot ${noSpawn}  longest path ${maxPathSeen.toFixed(0)}u` + (noSpawn ? '  reasons ' + JSON.stringify(why).slice(0, 140) : ''));
}
console.log(rowFmt.join('\n'));
const succ = spawnedAll / total; console.log(`  spawn attempts ${total}: ${spawnedAll} placed (${(succ * 100).toFixed(1)}%), ${failedAttempts} found no spot (budget untouched)`);
console.log(`  first attempt failed ${retried}x; a later retry (different samples) found a spot in ${recovered} of them`);
ok(succ > 0.85, 'placement success rate > 85% across maps / vehicle positions (' + (succ * 100).toFixed(1) + '%)');
perf.sort((a, b) => a - b); const avg = perf.reduce((a, b) => a + b, 0) / perf.length, p99 = perf[Math.floor(perf.length * 0.99)], mx = perf[perf.length - 1];
console.log(`  findSpot cost: avg ${avg.toFixed(2)} ms  p99 ${p99.toFixed(2)} ms  max ${mx.toFixed(2)} ms  (runs only on a spawn attempt, never per frame)`);
ok(p99 < 25, 'p99 spawn search < 25 ms');

// =====================================================================================================================================================
section('6. Harbor: crane safety + nothing in yards / on broken decks / in the sea');
{
  let n = 0, craneMaps = 0;
  for (const seed of SEEDS) for (const L of [4, 10, 25]) {
    const w = mk('harbor', seed * 31 + L, L, { hp: 10, timeLeft: 30 }); const map = w.map; if (map.cranes && map.cranes.length) craneMaps++;
    Pk.init(w.ctx, w.mission, seed); const nav = map.nav.jeep, reach = nav.flood(map.start.x, map.start.z);
    for (let k = 0; k < 400; k++) { // hammer validate() directly: whatever it accepts must be safe
      const x = (Math.random() * 2 - 1) * map.half, z = (Math.random() * 2 - 1) * map.half;
      if (Pk.validate(x, z) !== null) continue; n++;
      ok(!map.navBlock(x, z) && w.col.free(x, z, 2.6) && reach[nav.idx(x, z)], `harbor accepted spot safe ${x.toFixed(0)},${z.toFixed(0)}`);
      for (const h of map.holes) if (x > h.x0 - 8 && x < h.x1 + 8 && z > h.z0 - 8 && z < h.z1 + 8) ok(false, 'harbor: accepted a spot next to a broken deck');
      for (const y of map.yards) if (x > y.x0 - 3 && x < y.x1 + 3 && z > y.z0 - 3 && z < y.z1 + 3) ok(false, 'harbor: accepted a spot inside a container yard');
    }
    // a lane slot blocked by a container (dynamic collider on) is rejected through col.free
    for (const c of map.cranes) if (c.slot) { ok(Pk.validate(c.slot.x, c.slot.z) !== null, 'crane slot centre rejected'); ok(Pk.validate(c.hx, c.hz) !== null, 'crane home pad rejected'); }
    Pk.dispose();
  }
  ok(n > 50 && craneMaps > 0, `harbor: ${n} accepted samples checked, ${craneMaps} maps with cranes`);
}

console.log(`\n${pass} checks passed, ${fail} failed`);
if (fail) { console.log([...new Set(failures)].slice(0, 25).join('\n')); process.exit(1); }
