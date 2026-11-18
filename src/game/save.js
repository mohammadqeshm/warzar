/* WZ.Save — versioned save (schema v1). Routes through Playgama Bridge storage (WZ.Platform.storageGet / storageSet)
 * with batched, deduplicated writes. The standalone/test adapter is absent from the upload. */
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
    weaponLevels: { mines: 1, turrets: 1, soldiers: 1, heavy: 1, bombs: 1, heli: 1, tank: 1, jet: 1 },
    flags: { tutorialDone: false, noAds: false, pendingUnlock: '' },
    runSeed: 0,
  });

  function merge(base, src) {
    if (!src || typeof src !== 'object') return base;
    for (const k of Object.keys(base)) {
      if (!(k in src)) continue;
      const b = base[k], s = src[k];
      if (b && typeof b === 'object' && !Array.isArray(b)) merge(b, s);
      else if ((Array.isArray(b) ? Array.isArray(s) : typeof s === typeof b)) base[k] = s;
    }
    return base;
  }

  function applyLoaded(raw) {
    if (raw != null && raw !== '') {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed && typeof parsed === 'object') {
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
    if (!S.data.weaponLevels || typeof S.data.weaponLevels !== 'object') S.data.weaponLevels = defaults().weaponLevels;
    for (const wk of Object.keys(WZ.CFG.shop)) {
      const mx = (WZ.CFG.shop[wk] && WZ.CFG.shop[wk].maxLevel) || 10;
      S.data.weaponLevels[wk] = Math.max(1, Math.min(mx, (S.data.weaponLevels[wk] | 0) || 1));
    }
    // ECONOMY MIGRATION (nothing the player paid for is ever lost):
    //  1) the old second upgrade "Defense Tech" no longer exists -> reset it and refund the coins its levels cost (250 / 550 / 950 / 1500).
    //  2) the weapon level is now the max number the player may own (CFG.calc.weaponStockCap) -> stock above that cap is refunded at the current unit price.
    if (S.data.upgrades && (S.data.upgrades.defense | 0) > 0) {
      const old = [250, 550, 950, 1500]; let refund = 0;
      for (let i = 0; i < Math.min(4, S.data.upgrades.defense | 0); i++) refund += old[i];
      S.data.coins = (S.data.coins | 0) + refund; S.data.upgrades.defense = 0;
    }
    if (S.data.inv && WZ.CFG.calc && WZ.CFG.calc.weaponStockCap) {
      for (const wk of Object.keys(WZ.CFG.shop)) {
        const cap = WZ.CFG.calc.weaponStockCap(wk, S.data.weaponLevels[wk]), have = S.data.inv[wk] | 0;
        if (have > cap) { S.data.coins = (S.data.coins | 0) + (have - cap) * WZ.CFG.shop[wk].packs[0].price; S.data.inv[wk] = cap; }
      }
    }
    // VEHICLES ARE NO LONGER SOLD OR SWAPPED (the game is always played with the Scout Jeep): any vehicle bought in an older version is refunded
    // at its price and the jeep is re-equipped, so nothing the player paid for is lost.
    if (S.data.owned && Array.isArray(S.data.owned.vehicles)) {
      let refund = 0;
      for (const vid of S.data.owned.vehicles) { if (vid !== 'jeep' && WZ.CFG.vehicles[vid]) refund += WZ.CFG.vehicles[vid].price | 0; }
      if (refund > 0) S.data.coins = (S.data.coins | 0) + refund;
      S.data.owned.vehicles = ['jeep'];
    }
    if (S.data.equipped) S.data.equipped.vehicle = 'jeep';
    if (WZ.Progress) WZ.Progress.sanitize();
    if (!S.data.runSeed) {
      S.data.runSeed = ((Date.now() ^ (Math.random() * 4294967296)) >>> 0) || 1;
    }
    return S.data;
  }

  const S = {
    data: defaults(),
    _dirty: false,
    _timer: 0,

    _last: '',
    _write: null,

    /** Single Bridge read, before any UI can interact. A failed read never overwrites the player's save. */
    async init() {
      if (!WZ.Platform || typeof WZ.Platform.storageGet !== 'function') return S.load();
      const res = await WZ.Platform.storageGet([KEY]);
      const data = applyLoaded(res[0]);
      S._last = JSON.stringify(data);
      return data;
    },

    /** Synchronous load for standalone headless tests. There is no adapter in the Playgama bundle. */
    load() {
      const data = applyLoaded(WZ.LocalStorage ? WZ.LocalStorage.get(KEY) : null);
      S._last = JSON.stringify(data);
      return data;
    },

    save() {
      S._dirty = true;
      if (WZ.Platform && WZ.Platform.bridge) {
        if (!S._timer) S._timer = setTimeout(S.flush, 160);
      } else { S.flush(); }
    },

    flush() {
      if (S._timer) { clearTimeout(S._timer); S._timer = 0; }
      if (!S._dirty || S._write) return S._write;
      S._dirty = false;
      const payload = JSON.stringify(S.data);
      if (payload === S._last) return;
      if (!WZ.Platform || !WZ.Platform.bridge) {
        if (WZ.LocalStorage) WZ.LocalStorage.set(KEY, payload);
        S._last = payload;
        return;
      }
      // Serialize writes: a slow cloud write must not win over a newer purchase or unlocked level.
      S._write = WZ.Platform.storageSet([KEY], [payload]).then(() => {
        S._last = payload;
        S._write = null;
        if (S._dirty) S.flush();
      }, () => {
        S._dirty = true;
        S._write = null;
        // Retry at the next meaningful update or when the page is hidden, not in a busy loop.
      });
      return S._write;
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
