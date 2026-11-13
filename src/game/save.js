/* WZ.Save — versioned save (schema v1). localStorage with try/catch, throttled writes, < 100 KB.
 * M4 will route through Bridge storage first; the interface stays the same. */
(function (WZ) {
  'use strict';
  const KEY = 'warzar_crate_rush_save_v1';

  const defaults = () => ({
    v: 1, coins: 0, gears: 0, level: 1,
    best: { mission: 0, runCoins: 0, fastestMission: 0, kos: 0, timeBank: 0 },
    owned: { vehicles: ['jeep'], weapons: ['mg'], cosmetics: [] },
    equipped: { vehicle: 'jeep', weapon: 'mg', abilities: [], paint: 'default', cmdrHelmet: 'default', nanaHelmet: 'default' },
    upgrades: { engine: 0, armor: 0, ram: 0, gunDmg: 0, pan: 0, boots: 0, backpack: 0, focus: 0, defense: 0 },
    daily: { lastClaimUTC: '', streak: 0 },
    challenge: { lastDateUTC: '', bestScore: 0 },
    ach: {},
    settings: { sound: 1, music: 1, vibration: 1, shake: 1, lang: 'auto', quality: 'auto', weapon: 'gun', map: 'village' },
    inv: { mines: WZ.CFG.shop.mines.starter, turrets: WZ.CFG.shop.turrets.starter, soldiers: WZ.CFG.shop.soldiers.starter, heavy: WZ.CFG.shop.heavy.starter, bombs: WZ.CFG.shop.bombs.starter, heli: WZ.CFG.shop.heli.starter, tank: WZ.CFG.shop.tank.starter, jet: WZ.CFG.shop.jet.starter },
    flags: { tutorialDone: false, noAds: false },
    runSeed: 0,
  });

  function merge(base, src) {
    if (!src || typeof src !== 'object') return base;
    for (const k of Object.keys(base)) {
      if (!(k in src)) continue;
      const b = base[k], s = src[k];
      if (b && typeof b === 'object' && !Array.isArray(b)) merge(b, s);
      else if (typeof s === typeof b || Array.isArray(b) && Array.isArray(s)) base[k] = s;
    }
    return base;
  }

  const S = {
    data: defaults(),
    _dirty: false, _timer: 0,

    load() {
      let raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
      if (raw) {
        try { S.data = merge(defaults(), JSON.parse(raw)); } catch (e) { S.data = defaults(); }
      }
      S.data.level = Math.max(1, S.data.level | 0, (S.data.best && S.data.best.mission) | 0);
      if (S.data.level > 1 && S.data.flags) S.data.flags.tutorialDone = true;
      if (!S.data.runSeed) { S.data.runSeed = ((Date.now() ^ (Math.random() * 4294967296)) >>> 0) || 1; }
      S.save();
      return S.data;
    },

    save() {
      S._dirty = true;
      if (S._timer) { clearTimeout(S._timer); S._timer = 0; }
      S.flush();
    },

    flush() {
      if (!S._dirty) return;
      S._dirty = false;
      try { localStorage.setItem(KEY, JSON.stringify(S.data)); } catch (e) { /* storage unavailable: play on */ }
    },

    newRunSeed() { S.data.runSeed = ((Date.now() ^ (Math.random() * 4294967296)) >>> 0) || 1; S.save(); return S.data.runSeed; },
  };

  WZ.Save = S;
  WZ.Events.on('game:pause', () => S.flush());
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('beforeunload', () => { S._dirty = true; S.flush(); });
    window.addEventListener('pagehide', () => { S._dirty = true; S.flush(); });
  }
})(window.WZ = window.WZ || {});
