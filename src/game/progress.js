/* WZ.Progress — SEASONS & LEVELS.
 *   Every season = one map (CFG.maps.order). Every season has CFG.progress.levels (10) levels; level N has N crates.
 *   Save.data.prog[mapId] = array of 10 star ratings (0 = not cleared, 1..3 = cleared). Level L is playable once level L-1 is cleared.
 *   Season i (i > 0) is unlocked once level 10 of season i-1 is cleared. Season 1 (the first map) is always open.
 *   Save.data.lvlSel[mapId] = the level the START button will launch for that map (the player can also pick any unlocked level on the map card).
 *   Everything here is pure data logic (no DOM) so it is easy to unit-test. */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG, N = () => CFG.progress.levels;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const P = {
    allOpen: false,        // QA only: ?unlock=1 opens every season/level (never saved)
    order() { return CFG.maps.order; },
    seasonIndex(id) { const i = CFG.maps.order.indexOf(id); return i < 0 ? 0 : i; },
    seasonCount() { return CFG.maps.order.length; },

    /** the 10 star values of a season (always a clean array) */
    stars(id) { const d = WZ.Save.data; if (!d.prog[id] || d.prog[id].length !== N()) d.prog[id] = new Array(N()).fill(0); return d.prog[id]; },
    /** how many levels of the season are cleared (0..10) */
    cleared(id) { const a = P.stars(id); let n = 0; while (n < a.length && a[n] > 0) n++; return n; },
    seasonDone(id) { return P.cleared(id) >= N(); },
    seasonUnlocked(id) {
      if (P.allOpen) return true;
      const i = P.seasonIndex(id); if (i === 0) return true;
      return P.seasonDone(CFG.maps.order[i - 1]);
    },
    /** the map that must be finished to open this one (null if it is open) */
    lockedBy(id) { return P.seasonUnlocked(id) ? null : CFG.maps.order[P.seasonIndex(id) - 1]; },
    levelUnlocked(id, lvl) { return P.seasonUnlocked(id) && lvl >= 1 && lvl <= N() && (P.allOpen || lvl <= P.cleared(id) + 1); },
    /** the level the START button launches for this map */
    current(id) {
      const d = WZ.Save.data, c = P.cleared(id), want = d.lvlSel[id] | 0;
      if (want >= 1 && want <= N() && P.levelUnlocked(id, want)) return want;
      return clamp(c + 1, 1, N());
    },
    setCurrent(id, lvl) { if (P.levelUnlocked(id, lvl)) { WZ.Save.data.lvlSel[id] = lvl; WZ.Save.save(); return true; } return false; },
    /** difficulty number of a level: every level is harder than the previous one, every season starts higher than the last */
    difficulty(id, lvl) { return CFG.calc.difficulty(P.seasonIndex(id), lvl); },
    /** total number of cleared levels over all seasons */
    totalCleared() { let n = 0; for (const id of CFG.maps.order) n += P.cleared(id); return n; },
    /** first map that is open (fallback when the saved selection is locked) */
    firstOpen() { for (const id of CFG.maps.order) if (P.seasonUnlocked(id)) return id; return CFG.maps.order[0]; },

    /** record a win. returns {firstClear, seasonDone, unlockedSeason (id|null), stars} */
    complete(id, lvl, stars) {
      const d = WZ.Save.data, a = P.stars(id), had = a[lvl - 1] | 0, wasDone = P.seasonDone(id);
      const res = { firstClear: had === 0, seasonDone: false, unlockedSeason: null, stars };
      if (lvl >= 1 && lvl <= N()) a[lvl - 1] = Math.max(had, clamp(stars | 0, 1, 3));
      res.seasonDone = P.seasonDone(id) && !wasDone;       // true only the first time level 10 is cleared
      const i = P.seasonIndex(id);
      if (res.seasonDone && i + 1 < CFG.maps.order.length) res.unlockedSeason = CFG.maps.order[i + 1];
      // START continues with the next level of this season
      d.lvlSel[id] = clamp(lvl < N() ? lvl + 1 : N(), 1, N());
      d.level = 1 + P.totalCleared(); d.best.mission = Math.max(d.best.mission | 0, P.totalCleared());
      d.flags.tutorialDone = true;
      WZ.Save.save();
      return res;
    },

    /** where does "NEXT" go after a win on (id, lvl)? -> {theme, level} or null when the whole game is cleared (then: replay) */
    nextAfterWin(id, lvl) {
      if (lvl < N()) return { theme: id, level: lvl + 1 };
      const nx = CFG.maps.order[P.seasonIndex(id) + 1];
      if (nx && P.seasonUnlocked(nx)) return { theme: nx, level: P.current(nx) };
      return null;
    },

    /** make a loaded save consistent (called by Save.load) */
    sanitize() {
      const d = WZ.Save.data, order = CFG.maps.order; if (!d.prog) d.prog = {}; if (!d.lvlSel) d.lvlSel = {};
      let open = true;
      for (const id of order) {
        let a = d.prog[id]; if (!Array.isArray(a)) a = [];
        a = a.slice(0, N()).map((v) => clamp(v | 0, 0, 3)); while (a.length < N()) a.push(0);
        let gap = false; for (let i = 0; i < a.length; i++) { if (a[i] === 0) gap = true; else if (gap) a[i] = 0; }   // cleared levels are always a prefix
        if (!open) a = new Array(N()).fill(0);                                                                   // a locked season can never hold progress
        d.prog[id] = a;
        open = open && a[N() - 1] > 0;
      }
      for (const id of order) {
        const w = d.lvlSel[id] | 0; d.lvlSel[id] = clamp(w || 1, 1, N());
        if (d.lvlSel[id] > P.cleared(id) + 1) d.lvlSel[id] = clamp(P.cleared(id) + 1, 1, N());
      }
      const m = d.settings.map;
      if (!CFG.maps[m] || m === 'order' || !P.seasonUnlocked(m)) d.settings.map = P.firstOpen();
      if (P.totalCleared() > 0) d.flags.tutorialDone = true;
      d.level = 1 + P.totalCleared();
    },

    // ------------------------------------------------------------------ results screen (also re-opened after a visit to the shop)
    /** res = { r: summary data for WZ.UI.showSummary, win, theme, level, runSeed, runCoins }. Handlers are built from the data only (no scene state),
     *  so the SAME screen can be shown again from the menu scene after the player came back from the shop. */
    presentResult(res) {
      const Main = WZ.Main, UI = WZ.UI;
      Main.lastResult = res; res.r.wallet = WZ.Save.data.coins;      // the wallet may have changed in the shop
      const go = (theme, level, seed, coins) => {
        const S = WZ.Save.data; S.settings.map = theme; P.setCurrent(theme, level); WZ.Save.save();
        Main.lastResult = null;
        Main.go('mission', { theme, level, runSeed: seed, runCoins: coins });
      };
      UI.showSummary(res.r, {
        main: () => {
          if (res.win) {
            const nx = P.nextAfterWin(res.theme, res.level);
            if (nx) return go(nx.theme, nx.level, nx.theme === res.theme ? res.runSeed : WZ.Save.newRunSeed(), nx.theme === res.theme ? res.runCoins : 0);
            return go(res.theme, res.level, WZ.Save.newRunSeed(), 0);          // the whole game is cleared: replay the last level
          }
          return go(res.theme, res.level, WZ.Save.newRunSeed(), 0);            // try again
        },
        garage: () => Main.go('shop', { ret: () => Main.go('menu', { result: res }) }),   // BACK in the shop returns to THIS results screen
        menu: () => { Main.lastResult = null; WZ.Save.data.settings.map = res.theme; WZ.Save.save(); Main.go('menu'); },
      });
    },
  };

  WZ.Progress = P;
})(window.WZ = window.WZ || {});
