/* WZ.Save — versioned save (schema v1). Routes through Playgama Bridge storage (WZ.Platform.storageGet / storageSet)
 * with coalesced writes (< 100 KB) and a synchronous local fallback for headless Node unit tests. */
(function (WZ) {
  'use strict';
  const KEY = 'warzar_crate_rush_save_v1';

  // season progress (see progress.js): prog[map] = 10 star ratings (0 = level not cleared), lvlSel[map] = level START launches. progV 2 = seasons & levels save format.
  const progDefaults = () => { const o = {}; for (const id of WZ.CFG.maps.order) o[id] = new Array(WZ.CFG.progress.levels).fill(0); return o; };
  const selDefaults = () => { const o = {}; for (const id of WZ.CFG.maps.order) o[id] = 1; return o; };

  const defaults = () => ({
    v: 1, coins: 0, gears: 0, level: 1, progV: 2, prog: progDefaults(), lvlSel: selDefaults(),
    best: { mission: 0, runCoins: 0, fastestMission: 0, kos: 0, timeBank: 0 },
    owned: { vehicles: ['jeep'], weapons: ['mg'], cosmetics: [] },
    equipped: { vehicle: 'jeep', weapon: 'mg', abilities: [], paint: 'default', cmdrHelmet: 'default', nanaHelmet: 'default' },
    upgrades: { engine: 0, armor: 0, ram: 0, gunDmg: 0, pan: 0, boots: 0, backpack: 0, focus: 0, defense: 0 },
    daily: { lastClaimUTC: '', streak: 0 },
    challenge: { lastDateUTC: '', bestScore: 0 },
    ach: {},
    settings: { sound: 1, music: 1, vibration: 1, shake: 1, lang: 'auto', quality: 'auto', weapon: 'gun', map: 'village' },
    inv: { mines: WZ.CFG.shop.mines.starter, turrets: WZ.CFG.shop.turrets.starter, soldiers: WZ.CFG.shop.soldiers.starter, heavy: WZ.CFG.shop.heavy.starter, bombs: WZ.CFG.shop.bombs.starter, heli: WZ.CFG.shop.heli.starter, tank: WZ.CFG.shop.tank.starter, jet: WZ.CFG.shop.jet.starter },
    flags: { tutorialDone: false, noAds: false, pendingUnlock: '' },
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

  function applyLoaded(raw) {
    let hadData = false;
    if (raw != null && raw !== '') {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed && typeof parsed === 'object') {
          hadData = true;
          S.data = merge(defaults(), parsed);
          if (!(parsed.progV >= 2)) {
            const legacy = Math.max(1, (parsed.level | 0), ((parsed.best && parsed.best.mission) | 0));
            const n = Math.min(WZ.CFG.progress.levels, legacy - 1), first = WZ.CFG.maps.order[0];
            S.data.prog[first] = S.data.prog[first].map((v, i) => (i < n ? 2 : 0));
            S.data.progV = 2;
          }
        } else {
          S.data = defaults();
        }
      } catch (e) {
        S.data = defaults();
      }
    } else {
      S.data = defaults();
    }
    if (WZ.Progress) WZ.Progress.sanitize();
    if (!S.data.runSeed) {
      S.data.runSeed = ((Date.now() ^ (Math.random() * 4294967296)) >>> 0) || 1;
      if (!hadData && (!WZ.Platform || !WZ.Platform.bridge)) S.save();
    }
    return S.data;
  }

  const S = {
    data: defaults(),
    _dirty: false,
    _timer: 0,

    /** Async initialization via Playgama Bridge storage (called at startup after WZ.Platform.init). */
    async init() {
      if (WZ.Platform && typeof WZ.Platform.storageGet === 'function') {
        const res = await WZ.Platform.storageGet([KEY]);
        const raw = Array.isArray(res) ? res[0] : res;
        return applyLoaded(raw);
      }
      return S.load();
    },

    /** Synchronous load fallback (used by headless Node unit tests). */
    load() {
      let raw = null;
      if (!WZ.Platform || !WZ.Platform.bridge) {
        try { raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null; } catch (e) { raw = null; }
      }
      return applyLoaded(raw);
    },

    save() {
      S._dirty = true;
      // In browser with Bridge active, coalesce rapid writes within 120ms into a single Bridge storage.set call.
      if (WZ.Platform && WZ.Platform.bridge && typeof setTimeout === 'function') {
        if (S._timer) return;
        S._timer = setTimeout(() => { S._timer = 0; S.flush(); }, 120);
        return;
      }
      S.flush();
    },

    flush() {
      if (S._timer) { clearTimeout(S._timer); S._timer = 0; }
      if (!S._dirty) return;
      S._dirty = false;
      const payload = JSON.stringify(S.data);
      if (WZ.Platform && WZ.Platform.bridge && typeof WZ.Platform.storageSet === 'function') {
        WZ.Platform.storageSet([KEY], [payload]);
        return;
      }
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, payload);
      } catch (e) { /* storage unavailable: play on */ }
    },

    newRunSeed() {
      S.data.runSeed = ((Date.now() ^ (Math.random() * 4294967296)) >>> 0) || 1;
      S.save();
      return S.data.runSeed;
    },
  };

  WZ.Save = S;
  WZ.Events.on('game:pause', () => { S.flush(); if (WZ.Platform && WZ.Platform.storageFlush) WZ.Platform.storageFlush(); });
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('beforeunload', () => { S.flush(); if (WZ.Platform && WZ.Platform.storageFlush) WZ.Platform.storageFlush(); });
    window.addEventListener('pagehide', () => { S.flush(); if (WZ.Platform && WZ.Platform.storageFlush) WZ.Platform.storageFlush(); });
  }
})(window.WZ = window.WZ || {});
