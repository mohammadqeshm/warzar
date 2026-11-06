/* WZ.Missions.make(index, tutorial) — mission descriptor from the CFG formulas (GDD 4.2). */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG, C = CFG.calc;

  WZ.Missions = {
    make(index, tutorial) {
      const n = C.crateCount(index, tutorial);
      return {
        index, tutorial: !!tutorial, crateCount: n,
        timeLimit: C.timeLimit(index, n, tutorial), spawnRate: C.spawnRate(index, tutorial),
        hpMul: tutorial ? 1 : C.enemyHpMul(index), heatOn: !tutorial,
      };
    },
  };
})(window.WZ = window.WZ || {});
