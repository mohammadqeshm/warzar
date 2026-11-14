/* WZ.Missions.make(index, tutorial, level) — mission descriptor from the CFG formulas (GDD 4.2).
 *   index = DIFFICULTY number (level + seasonBoost * seasonIndex), feeds every per-mission formula and hazard system.
 *   level = the level inside its season (1..10): it is also the number of supply crates. */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG, C = CFG.calc;

  WZ.Missions = {
    make(index, tutorial, level) {
      const lvl = level != null ? level : index;
      const n = C.crateCount(lvl, tutorial);
      return {
        index, level: lvl, tutorial: !!tutorial, crateCount: n,
        timeLimit: C.timeLimit(index, n, tutorial), spawnRate: C.spawnRate(index, tutorial),
        hpMul: tutorial ? 1 : C.enemyHpMul(index), dmgMul: tutorial ? 1 : C.enemyDmgMul(index), speedMul: tutorial ? 1 : C.enemySpeedMul(index), heatOn: !tutorial,
      };
    },
  };
})(window.WZ = window.WZ || {});
