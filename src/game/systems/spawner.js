/* WZ.Spawner — enemies spawn on an off-screen ring around the jeep.
 * rate = baseRate(mission) * (1 + Heat). Mission 1 (tutorial): Heat off, few enemies, starts after the first DEPLOY. */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG, SP = CFG.spawn;

  const Spawner = {
    acc: 0,
    reset() { Spawner.acc = 0; },
    /** c: {mission, heat, jeep, map, col, enabled, enemies} */
    update(dt, c) {
      if (!c.enabled || !c.jeep.alive) return;
      const m = c.mission, E = c.enemies;
      Spawner.acc += m.spawnRate * (1 + c.heat) * dt;
      const cap = m.tutorial ? SP.tutorialCap : CFG.perf.aliveCap;
      while (Spawner.acc >= 1) {
        Spawner.acc -= 1;
        if (E.alive >= cap) continue;
        for (let t = 0; t < 8; t++) {
          const a = Math.random() * Math.PI * 2, r = SP.ringMin + Math.random() * (SP.ringMax - SP.ringMin);
          const x = c.jeep.x + Math.cos(a) * r, z = c.jeep.z + Math.sin(a) * r;
          if (Math.abs(x) > c.map.half - 10 || Math.abs(z) > c.map.half - 10) continue;
          if (!c.col.free(x, z, 1.0)) continue;
          if (E.spawn('grunt', x, z, m.hpMul)) break;
        }
      }
    },
  };
  WZ.Spawner = Spawner;
})(window.WZ = window.WZ || {});
