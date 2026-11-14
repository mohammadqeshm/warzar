/* WZ.CFG — the ONE file with all balance numbers. GDD values are initial; this file is authoritative. */
(function (WZ) {
  'use strict';

  const CFG = {
    version: 'M1-0.1.0',

    // SEASONS & LEVELS: every season (= one map, see CFG.maps.order) has `levels` levels. Level N has exactly N supply crates.
    // Beating level `levels` of a season unlocks the next season (which starts again at level 1).
    // Enemy strength grows with the DIFFICULTY number = level + seasonBoost * (season index): every level is tougher than the one before,
    // and every new season starts where the previous one was getting hard (so season 2 / level 1 is harder than season 1 / level 1).
    progress: { levels: 10, seasonBoost: 4, seasonBonus: 150, maxGiants: 10 },

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
      turrets: { packs: [{ n: 1, price: 90 }, { n: 3, price: 240 }, { n: 6, price: 450 }], cap: 20, starter: 2 },
      soldiers: { packs: [{ n: 1, price: 110 }, { n: 3, price: 300 }, { n: 6, price: 560 }], cap: 25, starter: 2 },
      heavy: { packs: [{ n: 1, price: 220 }, { n: 3, price: 600 }], cap: 12, starter: 0 },
      bombs: { packs: [{ n: 1, price: 160 }, { n: 3, price: 430 }, { n: 6, price: 800 }], cap: 15, starter: 1 },
      heli: { packs: [{ n: 1, price: 380 }, { n: 2, price: 700 }, { n: 4, price: 1300 }], cap: 10, starter: 1 },
      tank: { packs: [{ n: 1, price: 420 }, { n: 2, price: 780 }, { n: 4, price: 1450 }], cap: 10, starter: 1 },
      jet: { packs: [{ n: 1, price: 1040 }, { n: 2, price: 1920 }, { n: 4, price: 3600 }], cap: 10, starter: 1 },
    },
    mine: { maxActive: 10, armDelay: 0.9, trigger: 2.3, blast: 8, power: 16, behind: 3.6, cooldown: 0.45, giantDamage: 45 },

    // DEFENSE turrets. Bought with coins in the Shop (inventory in Save.inv); every deployment consumes one.
    // NO placement limit: place as many as you own, anywhere. `cooldown` is only a tiny anti double-tap delay.
    // GUN turret: rapid-fire single-barrel sentry gun.
    turret: { cooldown: 0.35, life: 32, range: 32, rate: 8.5, damage: 1.85, knock: 1.35, turnSpeed: 9.5, aim: 0.16, behind: 3.2, build: 0.65 },
    // COMBAT SOLDIER (bought in the Shop, one consumed per deployment): drops at your location, patrols and shoots enemies/giants with his rifle.
    // Has an HP & lifetime gauge; enemies shoot/melee him and giants can smash him. Does not stay forever on the map. No placement limit.
    soldier: { cooldown: 0.4, life: 42, hp: 55, speed: 7.5, range: 30, patrol: 24, stopDist: 10.5, rate: 5.8, damage: 2.2, knock: 1.4, turnSpeed: 10, aim: 0.22, behind: 3.0, radius: 0.85, scale: 0.92 },
    // HEAVY cannon: slow, big splash damage, longer reach.
    heavy: { cooldown: 0.4, life: 28, range: 36, rate: 1.1, damage: 7, splash: 4.6, knock: 9, turnSpeed: 4, aim: 0.1, behind: 3.9, build: 0.9, scale: 1.4 },
    // BOMB turret (mortar): lobs a bomb in an arc at the biggest group of enemies; the blast KOs everything inside `blast`.
    // Giants take `damage` per bomb. Cannot shoot closer than `minRange`. Never hurts the jeep or Nana.
    bomb: { cooldown: 0.4, life: 30, range: 46, minRange: 7, rate: 0.5, damage: 24, blast: 7.5, flight: [0.8, 1.6], shellSpeed: 26, knock: 15, turnSpeed: 5, aim: 0.22, behind: 3.4, build: 0.9, scale: 1.25 },
    // ESCORT HELICOPTER (bought in the Shop, one consumed per call): flies in, hovers beside the vehicle (off to the screen side so it
    // never blocks the view) and strafes enemies near the vehicle (or near Nana while she is outside). No limit on simultaneous helis.
    heli: { life: 34, speed: 38, alt: 15, range: 40, guard: 34, rate: 9, damage: 1.5, knock: 0.5, spread: 1.1, arrive: 3,
      slots: [[-12, 1], [12, 1], [-18, -7], [18, -7], [-8, 11], [8, 11]], leave: 2.2 },
    // ESCORT TANK (bought in the Shop, one consumed per call): drives in from off-screen, follows the vehicle (or Nana while she is outside), places itself
    // BETWEEN the protected target and the nearest threat as a shield, shells groups with its cannon (splash) and rakes single targets with its machine gun.
    // It also flattens small enemies it drives over. Invulnerable, never hurts the vehicle or Nana. No limit on simultaneous tanks.
    tank: { cooldown: 0.8, life: 42, speed: 17, range: 38, guard: 32, rate: 0.85, damage: 8, splash: 4.2, knock: 8, aim: 0.1,
      mgRate: 8, mgDamage: 1.3, mgRange: 30, mgKnock: 0.5, turretTurn: 5, hullTurn: 3.4, radius: 2.0, cover: 7, arrive: 2.2, spawnDist: 70, ramMin: 3.5,
      slots: [[-7.5, -2], [7.5, -2], [-12, -8], [12, -8], [-5, -12], [5, -12]], scale: 1.0 },
    // FIGHTER JET (bought in the Shop, one consumed per call): screams in from off-screen, flies `passes` low bombing runs over the biggest enemy group
    // (or the giant/dinosaur) near the vehicle - or near Nana while she is outside - and carpet-bombs a line of `bombsPerPass` bombs on each run.
    // Bombs are real ballistic projectiles (they inherit the jet's velocity + gravity); the release point is computed from the jet's own motion so the
    // string of explosions lands on the planned line. Then it lights the afterburner and climbs away. Bombs never hurt the vehicle or Nana.
    // Defense Tech: +damage, and +1 bomb per run at levels 2 and 4.
    jet: { cooldown: 1.0, passes: 3, bombsPerPass: 7, spacing: 4.8, speed: 76, boostSpeed: 150, cruiseAlt: 36, bombAlt: 25, turnRate: 2.3, gravity: 34,
      damage: 26, blast: 8.6, knock: 17, searchRange: 62, minSafe: 12, defaultAhead: 32, approach: 205, maxBombs: 90, leaveTime: 5.5, bombCap: 8 },
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

    timer: { base: 120, perCrate: 0, decayPerMission: 0, decayMin: 1, bankCap: 45, timeCrate: 8, tutorial: 120, lowWarn: 15 },

    mission: {
      cratesBase: 2, cratesMax: 10, bossEvery: 5, tutorialCrates: 1,
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
      hpPerMission: 0.10, dmgPerMission: 0.065, speedPerMission: 0.014, speedMax: 1.35,
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
        damage: 25, nanaDamage: 12, giantDamage: 40,
        // The vehicle is NEVER slowed or stopped by a barrel. The blast is a big fireball + shockwave + flying debris; afterwards the vehicle is
        // ON FIRE for `burn` seconds (flames glued to the body that die down one by one), and the crater keeps burning for `groundFire` seconds.
        burn: 5, groundFire: 4, chainDelay: 0.11, debris: 11, shake: 0.8,
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

    // DYNAMIC PICKUPS (WZ.Pickups). Hearts (repair) and clocks (time) are generated DURING the mission, only while the player needs them, and are driven over by the VEHICLE.
    //  BUDGET   = the number of pickups of each kind that may be spawned during the WHOLE mission = the DISPLAYED mission level (HUD "LEVEL n" / briefing "MISSION n" = mission.index, 1-based).
    //             It is a budget, not a simultaneous count, and it has NO cap. A pickup consumes budget only when it is really placed in the world (a failed placement costs nothing).
    //  maxActive = how many pickups of a kind may exist at the same time. cooldown starts when one is collected.
    //  heal: eligible while armor <= `threshold` of max (never at full armor); restores `healPct` of the vehicle's MAX armor.
    //  time: eligible while the mission timer <= `eligibleAt` s; `urgentAt` s and below is a higher-urgency state (shorter delays / cooldown, nearer placement). The reward of every clock is
    //        drawn from `rewards` (weights are relative - they need not add up to 100): +20 s / +35 s / +60 s by default.
    //  place: spawn validation (all distances in world units, see systems/pickups.js). retry: when no valid spot is found nothing is consumed and a new try is scheduled `retryDelay` s later.
    pickups: {
      enabled: true, inTutorial: false, radius: 3.0, bob: 0.35, hover: 2.6, arrowRange: 400,
      levelOf: (mission) => mission.level || mission.index,                       // the DISPLAYED level (HUD / briefing show mission.index, 1-based)
      budget: (level) => Math.max(0, Math.floor(level)),     // per kind, per mission - deliberately uncapped
      heal: { healPct: 0.4, threshold: 0.5, maxActive: 1, cooldown: 12, startDelay: 1.5 },
      time: {
        eligibleAt: 60, urgentAt: 30, maxActive: 1, cooldown: 14, urgentCooldownMul: 0.4, startDelay: 2.0, urgentStartDelay: 0.6,
        rewards: [{ s: 20, w: 50 }, { s: 35, w: 35 }, { s: 60, w: 15 }],
      },
      retry: { delay: 2.5, urgentDelay: 1.0, backoff: 1.5, maxDelay: 8 },
      place: {
        samples: 48, pathChecks: 4, edge: 24, clearance: 3.4, groundRing: 3.2, maxHeightDelta: 2.4, waterMargin: 0.7,
        minFromJeep: 32, minFromNana: 24, minFromStart: 30, minFromCrate: 16, minFromExtract: 26, minGap: 45,
        avoidEnemy: 22, avoidGiant: 42, avoidMine: 11, avoidBarrel: 13, avoidPit: 9, avoidVent: 15, avoidPool: 8, avoidRock: 12, avoidTornado: 48, avoidBlast: 16, avoidPlayerMine: 9, avoidTurret: 7, craneMargin: 10,
        maxPath: 260, urgentMaxPath: 150, minReachPath: 70, cruiseSpeed: 0.7, reachSafety: 0.85,
      },
      log: false,        // console diagnostics for every spawn / failed attempt (also switched on by ?pkdebug=1 in the URL)
    },

    // MAPS (selected in the main menu, stored in Save.data.settings.map). `village` = the original desert village.
    maps: {
      order: ['village', 'jurassic', 'volcanic', 'frozen', 'harbor'],
      village: { name: 'maps.village' },
      jurassic: { name: 'maps.jurassic', waterLevel: -0.5, waterSlow: 0.72, waterTurn: 0.3, waterGrip: 0.55, current: 6.5, hillAmp: 7.2, riverWidth: 7.4, bridges: 4 },
      // VOLCANIC WASTELAND (harder than the Jurassic map): two LAVA RIVERS (wade / waterSlow / waterTurn / waterGrip / current are read by the vehicle exactly like the
      // Jurassic river, but lava ALSO burns: `lavaPct` of the vehicle's MAX armor per second, rising with the mission), basalt causeways at the trail crossings,
      // erupting vents + rockfall (CFG.volcano) and the MAGMA TITAN guardians (CFG.titan). spawnMul / hpMul toughen the enemy waves a little (not in the tutorial).
      volcanic: { name: 'maps.volcanic', waterLevel: -0.5, waterSlow: 0.6, waterTurn: 0.22, waterGrip: 0.4, current: 2.6, hillAmp: 5.4, riverWidth: 9.6, riverWidth2: 6.8, bridges: 9,
        lavaPct: 0.13, lavaPctPerMission: 0.004, lavaPctMax: 0.22, lavaTick: 0.25, lavaNana: 11, spawnMul: 1.15, hpMul: 1.1 },
      // FROZEN FRONTIER: snowy mountains, a frozen lake, pine forests and a drifting snowstorm. Glossy ICE (the lake + ice patches + the patches the Ice Beast leaves behind)
      // takes the grip away from the vehicle: `iceGrip` = share of the normal side grip that is left (low = it slides), `iceTurn` = share of the steering authority left,
      // `iceAccel` / `iceBrake` / `iceCoast` = share of acceleration / braking / rolling resistance left. Ice is never lethal and never blocks - it only costs control.
      // The map is a little harder than the village (spawnMul / hpMul). Guardians: ICE BEAST (CFG.beast).
      frozen: { name: 'maps.frozen', iceGrip: 0.07, iceTurn: 0.5, iceAccel: 0.45, iceBrake: 0.16, iceCoast: 0.2, hillAmp: 5.2, lakes: 2, patches: 15, patchR: [6.5, 12.5], spawnMul: 1.08, hpMul: 1.05 },
      // SUNKEN HARBOR: a derelict military port (see world/gen_harbor.js). The sea is walled off by the quay + curbs; the only way into the water is a BROKEN PIER SECTION (`holes`):
      // the vehicle that drives into one splashes into the sea, loses `CFG.harbor.fall.pct` of its max armor and is fished back onto the deck. Container yards = narrow lanes (7.4-9.4 u),
      // some lane segments are plugged (dead ends). Tower cranes swing containers into lanes (CFG.harbor.crane). Guardians: HARBOR MECH (CFG.mech). Harder than the village (spawnMul / hpMul).
      harbor: { name: 'maps.harbor', hillAmp: 1, deckH: 0.45, seabed: -3.4, seaLevel: -0.95, quayX: [54, 68], pierW: 22, piers: 4, holeLen: 9, holeFrac: 0.46, fullCut: 0.3, plug: 0.17, jib: 46, spawnMul: 1.1, hpMul: 1.08 },
    },
    // HARBOR hazards (harbor map only, see systems/harbor.js):
    //  FALL: driving into a broken pier section = splash. The vehicle loses `fall.pct` of its MAX armor (it can die from it) and is put back on the deck
    //    next to the hole (`immune` s of grace); Nana loses `fall.nana` HP and is put back; enemies / small stuff that fall in are knocked out.
    //  CRANES: every tower crane lifts the container resting on its home pad, swings it over to a lane (the SLOT) and lowers it: the lane is blocked for `hold` s, then it goes back.
    //    Telegraph: the beacon on the crane flashes, a hatched red rectangle marks the slot from the moment the load starts to swing (`warn` s at least) and the load never touches down
    //    while the vehicle / Nana / a guardian is under it - it hovers until the spot is clear. Enemies under it are crushed.
    harbor: {
      tutorialMul: 0.5,
      fall: { pct: 0.45, immune: 2.5, nana: 14, margin: 0.9, hint: 16 },
      crane: { firstDelay: [14, 22], gap: [16, 26], gapPerMission: -0.4, gapMin: 11, hold: [9, 13], pickT: 1.0, liftT: 1.3, lowerT: 1.5, carryMin: 3.4, slew: 0.5, trolley: 9, carryAlt: 14, hoverAlt: 6,
        clear: 3.0, minFromStart: 45, minFromCrate: 22, minFromExtract: 26, hint: 30, tutorialDelay: 40, tutorialHold: 6 },
    },
    // HARBOR MECH guardians (harbor map): they replace the club giants. Same chase / HP-bar rules (these values are merged over CFG.giant). A heavy military walker:
    //  - CANNON (needs a clear line of sight): it plants its feet and a red laser line is painted toward the target (`aim` s = the telegraph; the line freezes `lock` s before the shot, so a
    //    moving vehicle just drives out of it). The shell is fast and flat: containers stop it (it blows up on the first container in the way).
    //  - MISSILES (no line of sight needed): the shoulder pods open (`windup`), then `salvo` missiles climb over the containers and come down on red rings (`flight` s) around the target.
    //  - COVER: after taking `coverHit` damage (or `coverShots` shots) it walks behind a container so the target has no line of sight, crouches for `coverTime` s and flushes the player
    //    out with missile salvos. While crouched behind cover direct fire (gun / turrets / heli) only does `coverArmor` of its damage - bombs, the jet, mines and barrels still hit full.
    //  - STOMP (melee): when the target is within `stomp.reach`; telegraphed with a ring, kills Nana in reach.
    mech: {
      hp: 215, speed: 6.2, radius: 2.3, height: 10.8, home: 8, aggro: 46, nanaAggro: 50, leash: 95,
      reach: 6.6, nanaReach: 6.0, windup: 0.8, swing: 0.3, cooldown: 2.4, jeepDamage: 22, jeepKnock: 18,
      cannon: { minRange: 9, range: 40, nanaRange: 34, aim: 1.15, lock: 0.4, speed: 58, radius: 3.6, damage: 25, nanaDamage: 20, cooldown: 3.4, turn: 2.6, lead: 0.35, tutorialMul: 0.5 },
      missiles: { minRange: 10, range: 46, nanaRange: 38, windup: 0.95, salvo: 4, salvoEnrage: 6, gap: 0.2, flight: [1.5, 1.95], apex: 24, radius: 4.3, damage: 15, nanaDamage: 11, spread: 8.5, cooldown: 6.4, tutorialMul: 0.5 },
      cover: { hit: 0.16, shots: 3, time: 5.2, cooldown: 9, armor: 0.35, range: 24, minHold: 10, missileEvery: 2.3, firstMissile: 0.9, speedMul: 1.3 },
      stomp: { reach: 7.2, windup: 0.85, cooldown: 3.2, damage: 22, nanaDamage: 9999, radius: 7.4 },
    },

    // ICE BEAST guardians (frozen map): replace the club giants. Heavy, and it closes the gap with a fast CHARGE:
    //  - CHARGE: it rears back and a cyan lane is painted on the ground toward the target (`windup`, the telegraph), then it dashes along the lane at `speed` for up to `dur` s
    //    (it can only turn slowly, so a moving vehicle can sidestep). When the dash ends (or it hits the vehicle / Nana / a wall) it slams the ground and sends out an ICE WAVE.
    //  - ICE WAVE: a ring of ice expands from the impact (`radius`, `speed`). The vehicle or Nana touched by the ring take damage + knock-back; the ground it crossed near the impact is left as a slippery ICE PATCH.
    //  - Its melee smash (club rules from CFG.giant) also throws a smaller wave. After a charge it needs `recover` s to get its breath back.
    beast: {
      hp: 185, speed: 7.2, radius: 2.7, height: 9.4, home: 8, aggro: 44, nanaAggro: 50, leash: 95,
      reach: 7.0, nanaReach: 6.2, windup: 0.8, swing: 0.3, cooldown: 2.3, jeepDamage: 20, jeepKnock: 18,
      charge: { minRange: 13, range: 42, nanaRange: 36, windup: 0.85, speed: 31, dur: 1.2, turn: 1.0, recover: 0.9, cooldown: 4.6, hit: 1.5, hitDamage: 24, hitKnock: 22, tutorialMul: 0.5 },
      wave: { radius: 17, speed: 27, width: 3.0, damage: 17, nanaDamage: 16, knock: 15, patchR: 6.5, patchLife: 10, small: 0.62, tutorialMul: 0.5 },
    },
    // Frozen-map ambience: snowstorm GUSTS (visual only: the fog closes in and the snow blows harder, never hides the objectives) and the glossy ice patches' sparkle
    frost: { gustGap: [16, 28], gustDur: [5, 8], gustFog: 0.45, patchFade: 2.2, maxPatches: 14, hintCooldown: 5 },
    // VOLCANO hazards (volcanic map only, see systems/volcano.js). Everything is telegraphed:
    //  ERUPTION: siren + rumble + red sky (`warn`), then for `dur` seconds molten rocks fall SLOWLY (`fall` u/s from `fallFrom` above the ground, so ~5-6 s in the air).
    //    Every rock paints a red pulsing ring on the ground where it will land (blast radius `radius`). Stay out of the rings and nothing hits you.
    //    `near` = share of rocks aimed around the vehicle (the rest are scattered over the area, a few around Nana while she is outside), a standing vehicle gets aimed at directly.
    //  VENTS: cracked mounds that glow. Every `period` seconds each one charges for `warn` seconds (ring flashes red, rumble) and then blasts a column of fire (radius `radius`).
    //    Driving up to a dormant vent makes it charge sooner (`trigger`) but never without the full warning.
    //  POOLS: magma puddles left by the Titan (`pool*` in CFG.titan); they burn the vehicle (`jeepPct` of max armor per second) and Nana (`nanaDps`) while they glow.
    volcano: {
      tutorialMul: 0.5,
      erupt: { firstDelay: [18, 26], gap: [26, 38], gapPerMission: -0.5, gapMin: 18, warn: 3.4, dur: 9, rate: 2.5, ratePerMission: 0.07, rateMax: 4.0,
        fallFrom: 46, fall: 8.2, fallPerMission: 0.1, fallMax: 10.5, maxRocks: 30, near: 0.55, nearR: [4, 24], farR: [10, 46], nanaShare: 0.3, pinSpeed: 4, pinGap: 1.4,
        radius: 5.2, damage: 24, dmgPerMission: 0.9, dmgMax: 42, nanaDamage: 18, giantDamage: 14, burn: 3.2, minFromStart: 30, tutorialDelay: 40 },
      vents: { baseCount: 8, perMission: 0.6, maxCount: 17, tutorialCount: 3, roadBias: 0.5, radius: 5.0, period: [8.5, 12], warn: 1.8, trigger: 10, triggerWarn: 1.4,
        damage: 22, dmgPerMission: 0.8, dmgMax: 38, nanaDamage: 15, giantDamage: 18, burn: 2.8, minFromStart: 36, minFromCrate: 16, minFromExtract: 24, minGap: 26, hint: 22 },
      pool: { tick: 0.25, jeepPct: 0.1, nanaDps: 7, maxPools: 28, grow: 0.45, fade: 1.6 },
    },
    // MAGMA TITAN guardians (volcanic map): they replace the club giants. Same chase / ram / HP-bar rules (these values are merged over CFG.giant).
    //  - SLAM (melee): fists up (telegraph) then smash: damage like the club, kills Nana in reach, and splits the ground into `slam.pools` magma pools around the impact.
    //  - BOULDER (ranged): between `minRange` and `range` it rears back with a molten boulder overhead (`windup`, the body glows), then LOBS it (flight `flight` s).
    //    A red ring marks the landing spot the whole time; the blast (`radius`) hurts and leaves a magma pool. Below `enrage` HP it throws TWO boulders per volley.
    //  - Magma TRAIL: while it walks it drips small short-lived pools under its feet, so the ground around a Titan is never safe.
    titan: {
      hp: 190, speed: 6.4, radius: 2.7, height: 10.6, home: 8, aggro: 42, nanaAggro: 48, leash: 92,
      reach: 7.0, nanaReach: 6.3, windup: 0.85, swing: 0.3, cooldown: 2.4, jeepDamage: 24, jeepKnock: 20,
      rock: { range: 38, nanaRange: 32, minRange: 11, windup: 1.05, flight: [1.15, 1.7], cooldown: 4.4, radius: 5.0, damage: 26, nanaDamage: 18, lead: 0.5, enrage: 0.5, pair: 7,
        poolR: 4.0, poolLife: 7.5, handY: 9.4, tutorialMul: 0.5 },
      slam: { pools: 4, ring: 6.2, poolR: 3.0, poolLife: 6.5, radius: 9 },
      trail: { every: 1.35, r: 1.9, life: 3.6 },
    },
    // DINOSAUR guardians (Jurassic map): they replace the club giants. Same chase / ram / HP-bar rules (these values are merged over CFG.giant),
    // but the weapon is a FIRE BREATH: the dino rears back with a glowing mouth (telegraph), then roars a cone of flame that sweeps toward its target.
    // It still bites when the vehicle is very close. The flame hurts the vehicle (per tick) and can kill Nana in about a second and a half.
    dino: {
      hp: 150, speed: 7.8, radius: 2.4, height: 8.9, home: 7.5, aggro: 42, nanaAggro: 48, leash: 95,
      reach: 6.4, nanaReach: 5.8, windup: 0.6, swing: 0.3, cooldown: 2.1, jeepDamage: 18,
      fire: { range: 27, nanaRange: 23, minRange: 7.5, len: 27, wStart: 1.1, wEnd: 4.6, windup: 0.95, dur: 1.7, cooldown: 4.6, turn: 1.15, windTurn: 2.4, advance: 0.32,
        tick: 0.2, jeepTick: 3.4, nanaTick: 8, mouth: 4.7, mouthY: 6.9, tutorialMul: 0.5 },
    },

    crates: {
      weights: { coin: 55, gold: 12, time: 12, part: 8, repair: 8, tnt: 5 },   // M2
      beamHeight: 120,
    },

    economy: {
      coinBase: 25, coinPerMission: 3, goldBase: 90, goldPerMission: 8,
      completionBase: 20, completionPerMission: 5, timeBonusPerSec: 2,
      upgradeGrowth: 1.32, maxLevel: 8,
      // Coins for knock-outs pile up during the mission ("loot") and are ALWAYS paid out when the mission ends (win or fail), so a lost run
      // never leaves the player unable to afford the upgrades needed to beat the level.
      kill: { grunt: 1, brute: 3, giant: 30, giantPerMission: 2, ramMul: 10 },   // ramMul: a small enemy flattened by the VEHICLE (cause 'ram') pays this many times the normal KO loot (it is risky, close-range work)
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
    // crate count == the LEVEL number (1..10). `crateOverride` is set by WZ.World.generate for the duration of one map build.
    crateOverride: null,
    crateCount: (lvl, tut) => (CFG.calc.crateOverride != null ? CFG.calc.crateOverride : ((tut == null ? lvl <= CFG.mission.tutorialIndex : tut) ? CFG.mission.tutorialCrates : Math.max(1, Math.min(CFG.progress.levels, Math.round(lvl))))),
    // difficulty scalar fed to every "per mission" formula and hazard system (mission.index)
    difficulty: (seasonIdx, lvl) => lvl + CFG.progress.seasonBoost * seasonIdx,
    // how many crates are guarded by a guardian (giant/dino/titan/beast/mech): every crate has a guardian
    giantCount: (lvl, crates) => Math.max(1, Math.min(crates, CFG.progress.maxGiants)),
    timeLimit: (m, n, tut) => { void m; void n; void tut; return 120; },
    spawnRate: (m, tut) => ((tut == null ? m <= CFG.mission.tutorialIndex : tut) ? CFG.spawn.tutorialRate : CFG.spawn.base + CFG.spawn.perMission * m),
    enemyHpMul: (m) => 1 + CFG.enemy.hpPerMission * m,
    enemyDmgMul: (m) => 1 + CFG.enemy.dmgPerMission * m,
    enemySpeedMul: (m) => Math.min(CFG.enemy.speedMax, 1 + CFG.enemy.speedPerMission * m),
    bruteChance: (m) => (m < CFG.enemies.brute.fromMission ? 0 : Math.min(CFG.enemy.bruteChanceMax, CFG.enemy.bruteChance + CFG.enemy.bruteChancePerMission * (m - CFG.enemies.brute.fromMission))),
    coinCrate: (m) => CFG.economy.coinBase + CFG.economy.coinPerMission * m,
    completion: (m) => CFG.economy.completionBase + CFG.economy.completionPerMission * m,
    timeBonus: (sec) => Math.floor(sec) * CFG.economy.timeBonusPerSec,
  };

  CFG.dinoStats = Object.assign({}, CFG.giant, CFG.dino);   // the dinosaur guardian = giant rules + overrides from CFG.dino
  CFG.beastStats = Object.assign({}, CFG.giant, CFG.beast);   // the Ice Beast guardian = giant rules + overrides from CFG.beast
  CFG.mechStats = Object.assign({}, CFG.giant, CFG.mech);   // the Harbor Mech guardian = giant rules + overrides from CFG.mech
  CFG.titanStats = Object.assign({}, CFG.giant, CFG.titan); // the Magma Titan guardian = giant rules + overrides from CFG.titan

  WZ.CFG = CFG;
})(window.WZ = window.WZ || {});
