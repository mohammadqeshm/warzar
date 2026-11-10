/* WZ.CFG — the ONE file with all balance numbers. GDD values are initial; this file is authoritative. */
(function (WZ) {
  'use strict';

  const CFG = {
    version: 'M1-0.1.0',

    world: { size: 360, half: 180, cell: 3, chunk: 120, hillAmp: 3.0, wallMargin: 6 },
    sim: { step: 1 / 60, maxSteps: 5, hitStopMax: 0.08 },

    camera: { fov: 48, height: 29, back: 27, lookAhead: 0.32, minZoom: 1, maxZoom: 2.4, near: 1, far: 1500 },

    jeep: {
      topSpeed: 22, hp: 100, handling: 0.8, capacity: 9,
      boostSpeed: 33, boostTime: 1.5, boostCooldown: 8,
      accel: 30, brake: 30, coast: 12, turnRate: 3.8, grip: 5.5,
      radius: 1.3, halfLen: 1.45,
      enemyDamageMul: 0.5,       // jeep armor vs. enemy melee
      bounce: 0.25, stuckTime: 1.5, smallPropMinSpeed: 3.5,
    },

    ram: { minSpeed: 10, damageMul: 2, knock: 16 },

    // Garage: vehicles (slots 4-5, APC and Tank, are reserved for later). Stats merge over CFG.jeep. Price in coins.
    vehicles: {
      jeep:  { name: 'SCOUT JEEP',    tier: 1, price: 0,    topSpeed: 22, boostSpeed: 33, accel: 30, hp: 100, handling: 0.8,  ram: 1.0, wheelR: 0.72, radius: 1.3,  halfLen: 1.45, enemyDamageMul: 0.5, blurb: 'Reliable all-rounder. Light, nimble and cheap to run.' },
      buggy: { name: 'DUNE BUGGY',    tier: 2, price: 600,  topSpeed: 28, boostSpeed: 40, accel: 36, hp: 70,  handling: 1.05, ram: 0.7, wheelR: 0.88, radius: 1.25, halfLen: 1.4,  enemyDamageMul: 0.6, blurb: 'Built for speed. Slides through corners, but a few hits and she is done.' },
      truck: { name: 'ARMORED TRUCK', tier: 3, price: 2500, topSpeed: 18, boostSpeed: 27, accel: 24, hp: 220, handling: 0.62, ram: 1.7, wheelR: 0.98, radius: 1.7,  halfLen: 1.9,  enemyDamageMul: 0.3, blurb: 'A rolling fortress. Shrugs off damage and flattens enemies at low speed.' },
    },
    vehicleOrder: ['jeep', 'buggy', 'truck'],
    // Landmines the player buys and plants (inventory persists between missions; used mines are gone for good)
    shop: {
      mines: { packs: [{ n: 1, price: 30 }, { n: 5, price: 130 }, { n: 15, price: 360 }], cap: 40, starter: 3 },
      turrets: { packs: [{ n: 1, price: 90 }, { n: 3, price: 240 }, { n: 6, price: 450 }], cap: 15, starter: 2 },
      heavy: { packs: [{ n: 1, price: 220 }, { n: 3, price: 600 }], cap: 8, starter: 0 },
      bombs: { packs: [{ n: 1, price: 160 }, { n: 3, price: 430 }, { n: 6, price: 800 }], cap: 15, starter: 1 },
      heli: { packs: [{ n: 1, price: 380 }, { n: 2, price: 700 }, { n: 4, price: 1300 }], cap: 8, starter: 1 },
    },
    mine: { maxActive: 10, armDelay: 0.9, trigger: 2.3, blast: 8, power: 16, behind: 3.6, cooldown: 0.45, giantDamage: 45 },

    // DEFENSE turrets. Bought with coins in the Shop (inventory in Save.inv); every deployment consumes one.
    // NO placement limit: place as many as you own, anywhere. `cooldown` is only a tiny anti double-tap delay.
    // GUN turret: auto-targeting twin gun, ~10 dps (the jeep gun does ~16, ~30 when stopped).
    turret: { cooldown: 0.4, life: 32, range: 30, rate: 6, damage: 1.7, knock: 1.2, turnSpeed: 7, aim: 0.14, behind: 3.2, build: 0.7 },
    // HEAVY cannon: slow, big splash damage, longer reach.
    heavy: { cooldown: 0.4, life: 28, range: 36, rate: 1.1, damage: 7, splash: 4.6, knock: 9, turnSpeed: 4, aim: 0.1, behind: 3.9, build: 0.9, scale: 1.4 },
    // BOMB turret (mortar): lobs a bomb in an arc at the biggest group of enemies; the blast KOs everything inside `blast`.
    // Giants take `damage` per bomb. Cannot shoot closer than `minRange`. Never hurts the jeep or Nana.
    bomb: { cooldown: 0.4, life: 30, range: 46, minRange: 7, rate: 0.5, damage: 24, blast: 7.5, flight: [0.8, 1.6], shellSpeed: 26, knock: 15, turnSpeed: 5, aim: 0.22, behind: 3.4, build: 0.9, scale: 1.25 },
    // ESCORT HELICOPTER (bought in the Shop, one consumed per call): flies in, hovers beside the vehicle (off to the screen side so it
    // never blocks the view) and strafes enemies near the vehicle (or near Nana while she is outside). No limit on simultaneous helis.
    heli: { life: 34, speed: 38, alt: 15, range: 40, guard: 34, rate: 9, damage: 1.5, knock: 0.5, spread: 1.1, arrive: 3,
      slots: [[-12, 1], [12, 1], [-18, -7], [18, -7], [-8, 11], [8, 11]], leave: 2.2 },
    // Permanent defense tech (Shop): each level boosts every turret
    defenseTech: { max: 4, prices: [250, 550, 950, 1500], dmg: 0.2, life: 0.12, rate: 0.08 },

    gun: {
      damage: 2.3, rate: 7, range: 38,   // nerfed: was damage 4, rate 8 (a grunt now takes ~5 hits instead of 3)
      stationarySpeed: 3, stationaryRate: 1.5, stationaryDamage: 1.25,
      turnSpeed: 12, tracerLife: 0.07,
    },

    nana: {
      speed: 9, hp: 40, panDamage: 8, panCooldown: 0.6, panRange: 2.9, panKnock: 7,
      grabTime: 0.8, deployRadius: 35, boardSpeed: 8, boardRadius: 4,
      reviveRadius: 6, reviveTime: 1.5, reviveHpPct: 0.6, koTimePenalty: 5,
      damageMul: 0.7, iFrames: 0.35, stuckTeleport: 3,
      permaDeath: true,                           // Nana's HP reaching 0 ends the run (no revive)
      chaosInterval: 25, chaosChance: 0.15,       // used in M2
    },

    heat: { rise: 0.08, fall: 0.15, max: 3, stillSpeed: 3 },

    timer: { base: 35, perCrate: 20, decayPerMission: 0.012, decayMin: 0.75, bankCap: 45, timeCrate: 8, tutorial: 90, lowWarn: 15 },

    mission: {
      cratesBase: 2, cratesMax: 9, bossEvery: 5, tutorialCrates: 2,
      minCrateGap: 60, minCrateFromStart: 50, extractRadius: 14, extractMinFromStart: 150,
      crateRadius: 2.2, tutorialIndex: 1,
    },

    spawn: {
      base: 0.5, perMission: 0.1, aliveCap: 35,
      ringMin: 50, ringMax: 64, cullDist: 120,
      tutorialRate: 0.4, tutorialCap: 6, tutorialDelay: 2.5,
    },

    // Enemies grow stronger every mission AND while a mission drags on (every `every` seconds, up to `max` steps)
    enemy: {
      hpPerMission: 0.09, dmgPerMission: 0.06, speedPerMission: 0.012, speedMax: 1.35,
      ramp: { every: 28, max: 8, hp: 0.08, dmg: 0.06, speed: 0.022 },
      bruteChance: 0.1, bruteChancePerMission: 0.02, bruteChanceMax: 0.3,
    },
    // While Nana is outside the jeep the whole battlefield turns on her: more spawns, faster enemies, spawns around her
    rush: { spawnMul: 2.2, rampPerSec: 0.03, rampMax: 1.4, speedMul: 1.3, capBonus: 9, nanaShare: 0.7, ring: [34, 48], blend: 3 },

    // Hazards (M2): off in the tutorial. Mines from mission 2, tornado from mission 3.
    hazards: {
      mines: {
        fromMission: 1, tutorialCount: 4, tutorialDamage: 8, baseCount: 5, perMission: 1.3, maxCount: 30, roadBias: 0.55, patchChance: 0.55,
        trigger: 2.1, nanaTrigger: 1.3, blast: 6.5, detectRange: 17, slow: 0.35,
        damageBase: 14, damagePerMission: 0.8, damageMax: 30, nanaDamage: 14,
        giantDamage: 40,
        jeepFirstHit: 0.5,          // 1st mine: the jeep loses this fraction of its MAX hp; 2nd mine: destroyed
        minFromStart: 28, minFromCrate: 14, minFromExtract: 22,
      },
      tornado: {
        fromMission: 2, firstDelay: [14, 22], gap: [32, 48], warn: 4, life: 18, fade: 2.5,
        speed: 7, speedPerMission: 0.15, maxSpeed: 11, turn: 0.9, homing: 0.55, spawnDist: [70, 88],
        radius: 8, drag: 4, pull: 9, spin: 6.5, nanaDamage: 6,
        // Pull zone: the closer you are the slower you get and the harder it drags you in. Boost (high speed) is the way out.
        pullRadius: 19, pullAccel: 44, slow: 0.75, slowBoost: 0.3,
        // Core: once inside, the vehicle is CAUGHT and whirled around the funnel for `hold` seconds with no control.
        core: 4.4, hold: 5, orbitSpin: 3.1, lift: 3.4, throwSpeed: 15, immune: 4,
      },
      barrels: {
        fromMission: 1, tutorialCount: 8, baseCount: 10, perMission: 1.5, maxCount: 28,
        roadBias: 0.6, clusterChance: 0.5,
        trigger: 2.35, nanaTrigger: 1.35, blast: 7.5,
        damage: 25, nanaDamage: 12, slow: 0.45, giantDamage: 40,
        minFromStart: 26, minFromCrate: 18, minFromExtract: 22,
      },
      pits: {
        fromMission: 1, tutorialCount: 5, baseCount: 6, perMission: 1.0, maxCount: 18,
        roadBias: 0.45, radius: 3.4, trigger: 2.85, nanaTrigger: 2.1,
        minFromStart: 30, minFromCrate: 18, minFromExtract: 24, minGap: 22,
      },
    },

    // GIANT guardian: one stands next to EVERY crate. Slow but huge, with an HP bar. Wakes up when the vehicle gets close, then chases it.
    // While Nana is outside the vehicle it hunts HER instead and a single club hit kills her. Club hits on the vehicle cost armor.
    giant: {
      hp: 130, speed: 7, radius: 2.1, scale: 1, height: 8.4, home: 6.5, aggro: 36, nanaAggro: 46, leash: 85, agroTime: 7, regen: 5,
      reach: 5.6, nanaReach: 5.2, windup: 0.75, swing: 0.3, cooldown: 1.8, jeepDamage: 22, dmgPerMission: 0.04, jeepKnock: 18,
      ramMinSpeed: 6, ramDamage: 7, ramSelf: 9, ramCooldown: 0.8, tutorialHp: 0.5, tutorialSpeed: 0.85,
      nanaDeathDamage: 9999,
    },

    enemies: {
      // shootRange > 0: the enemy fires bullets at Nana when she is in range (and holds position at shootStop)
      grunt: { hp: 10, speed: 6, damage: 6, cooldown: 0.8, windup: 0.3, fromMission: 1, radius: 0.75, jeepRange: 3.1, nanaRange: 1.7, scale: 1,
        shootRange: 17, shootStop: 6.5, shootCd: 1.4, shootDamage: 5, bulletSpeed: 22 },
      brute: { hp: 30, speed: 4.8, damage: 11, cooldown: 1.0, windup: 0.4, fromMission: 4, radius: 1.0, jeepRange: 3.7, nanaRange: 2.2, scale: 1.4,
        shootRange: 13, shootStop: 5.5, shootCd: 2.3, shootDamage: 9, bulletSpeed: 19 },
    },

    crates: {
      weights: { coin: 55, gold: 12, time: 12, part: 8, repair: 8, tnt: 5 },   // M2
      beamHeight: 120,
    },

    economy: {
      coinBase: 25, coinPerMission: 3, goldBase: 90, goldPerMission: 8,
      completionBase: 20, completionPerMission: 5, timeBonusPerSec: 2,
      upgradeGrowth: 1.32, maxLevel: 8,
      // Coins for knock-outs pile up during the mission ("loot") and are only paid out when the mission is COMPLETED (burned on failure).
      kill: { grunt: 1, brute: 3, giant: 30, giantPerMission: 2 },
    },

    ads: { firstDelay: 60, minGap: 90 },
    perf: { maxDrawCalls: 150, dprCap: 2, aliveCap: 46 },
    quality: {
      // level: 0 low, 1 medium, 2 high
      dpr: [1, 1.5, 2], shadow: [0, 1024, 2048], grass: [250, 520, 800], particles: [0.5, 0.8, 1], aa: [false, true, true],
    },
  };

  // ---- difficulty formulas (GDD 4.2) ----
  // `tut` = this is the scripted tutorial mission (mission 1 on a fresh save). Defaults to "index <= tutorialIndex".
  CFG.calc = {
    crateCount: (m, tut) => ((tut == null ? m <= CFG.mission.tutorialIndex : tut) ? CFG.mission.tutorialCrates : Math.min(CFG.mission.cratesBase + Math.ceil(m / 2), CFG.mission.cratesMax)),
    timeLimit: (m, n, tut) => ((tut == null ? m <= CFG.mission.tutorialIndex : tut) ? CFG.timer.tutorial : (CFG.timer.base + CFG.timer.perCrate * n) * Math.max(CFG.timer.decayMin, 1 - CFG.timer.decayPerMission * m)),
    spawnRate: (m, tut) => ((tut == null ? m <= CFG.mission.tutorialIndex : tut) ? CFG.spawn.tutorialRate : CFG.spawn.base + CFG.spawn.perMission * m),
    enemyHpMul: (m) => 1 + CFG.enemy.hpPerMission * m,
    enemyDmgMul: (m) => 1 + CFG.enemy.dmgPerMission * m,
    enemySpeedMul: (m) => Math.min(CFG.enemy.speedMax, 1 + CFG.enemy.speedPerMission * m),
    bruteChance: (m) => (m < CFG.enemies.brute.fromMission ? 0 : Math.min(CFG.enemy.bruteChanceMax, CFG.enemy.bruteChance + CFG.enemy.bruteChancePerMission * (m - CFG.enemies.brute.fromMission))),
    coinCrate: (m) => CFG.economy.coinBase + CFG.economy.coinPerMission * m,
    completion: (m) => CFG.economy.completionBase + CFG.economy.completionPerMission * m,
    timeBonus: (sec) => Math.floor(sec) * CFG.economy.timeBonusPerSec,
  };

  WZ.CFG = CFG;
})(window.WZ = window.WZ || {});
