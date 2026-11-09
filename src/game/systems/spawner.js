/* WZ.Spawner — enemies spawn on an off-screen ring around the jeep.
 * rate = baseRate(mission) * (1 + Heat) * rush. Mission 1 (tutorial): Heat off, few enemies, starts after the first DEPLOY.
 * RUSH: while Nana is outside the jeep the spawn rate jumps (and keeps climbing the longer she stays out); most of the
 * new enemies appear on a ring around NANA instead of the jeep, so leaving the car is a real risk. Brutes (big, tough,
 * hard-shooting) join from mission 4. */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG, SP = CFG.spawn, RS = CFG.rush;

  const Spawner = {
    acc: 0,
    reset() { Spawner.acc = 0; },
    /** c: {mission, heat, jeep, nana, map, col, enabled, enemies, hpMul, rushK, outT} */
    update(dt, c) {
      if (!c.enabled || !c.jeep.alive) return;
      const m = c.mission, E = c.enemies, k = c.rushK || 0;
      const rush = 1 + (RS.spawnMul - 1) * k + Math.min(RS.rampMax, (c.outT || 0) * RS.rampPerSec) * k;
      Spawner.acc += m.spawnRate * (1 + c.heat) * rush * dt;
      const cap = Math.min(CFG.perf.aliveCap, (m.tutorial ? SP.tutorialCap : SP.aliveCap) + Math.round(RS.capBonus * k));
      const brute = m.tutorial ? 0 : CFG.calc.bruteChance(m.index);
      const nana = c.nana, aroundNana = !!nana && nana.out && !nana.isKO && k > 0.4;
      while (Spawner.acc >= 1) {
        Spawner.acc -= 1;
        if (E.alive >= cap) continue;
        const onNana = aroundNana && Math.random() < RS.nanaShare;
        const cx = onNana ? nana.x : c.jeep.x, cz = onNana ? nana.z : c.jeep.z;
        const r0 = onNana ? RS.ring[0] : SP.ringMin, r1 = onNana ? RS.ring[1] : SP.ringMax;
        const type = Math.random() < brute ? 'brute' : 'grunt';
        for (let t = 0; t < 8; t++) {
          const a = Math.random() * Math.PI * 2, r = r0 + Math.random() * (r1 - r0);
          const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
          if (Math.abs(x) > c.map.half - 10 || Math.abs(z) > c.map.half - 10) continue;
          if (!c.col.free(x, z, 1.0)) continue;
          if (E.spawn(type, x, z, c.hpMul || m.hpMul)) break;
        }
      }
    },
  };
  WZ.Spawner = Spawner;
})(window.WZ = window.WZ || {});
