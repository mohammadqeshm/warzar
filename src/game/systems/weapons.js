/* WZ.Weapons — ONE weapon button for everything deployable (GTA-style selector).
 * Items: MINE, GUN TURRET, HEAVY CANNON, BOMB TURRET, ESCORT HELICOPTER, ESCORT TANK, FIGHTER JET. The player selects one (swap button / wheel strip / Q-E / 1-7) and the
 * single USE button (F) deploys the selected one. Stock lives in Save.data.inv, cooldowns in the individual systems; the selection is saved.
 * New deployables later = add one entry to ITEMS (+ its HUD icon in ui.js), nothing else changes on screen. */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG;
  const SHOP_KEY = { mine: 'mines', gun: 'turrets', soldier: 'soldiers', heavy: 'heavy', bomb: 'bombs', heli: 'heli', tank: 'tank', jet: 'jet' };
  const ITEMS = [
    { id: 'mine', name: 'w.mine', key: '1' },
    { id: 'gun', name: 'w.gun', key: '2' },
    { id: 'soldier', name: 'w.soldier', key: '3' },
    { id: 'heavy', name: 'w.heavy', key: '4' },
    { id: 'bomb', name: 'w.bomb', key: '5' },
    { id: 'heli', name: 'w.heli', key: '6' },
    { id: 'tank', name: 'w.tank', key: '7' },
    { id: 'jet', name: 'w.jet', key: '8' },
  ];
  const W = {
    items: ITEMS, sel: 1, snapshot: ITEMS.map((it) => ({ id: it.id, n: 0, pct: 1 })),

    get selId() { return ITEMS[W.sel].id; },
    index(id) { for (let i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return i; return -1; },
    shopKey(id) { return SHOP_KEY[id] || id; },
    level(id) {
      const sk = W.shopKey(id);
      const wl = WZ.Save && WZ.Save.data && WZ.Save.data.weaponLevels;
      return Math.max(1, (wl && wl[sk] | 0) || 1);
    },
    mapLimit(id) {
      const sk = W.shopKey(id);
      return CFG.calc.weaponMapLimit ? CFG.calc.weaponMapLimit(sk, W.level(id)) : 5;
    },
    used(id) {
      switch (id) {
        case 'mine': return (WZ.Landmines && WZ.Landmines.planted) | 0;
        case 'gun': case 'heavy': case 'bomb': return (WZ.Turrets && WZ.Turrets.plantedKind ? WZ.Turrets.plantedKind(id) : 0) | 0;
        case 'soldier': return (WZ.Soldiers && WZ.Soldiers.deployed) | 0;
        case 'heli': return (WZ.Heli && WZ.Heli.called) | 0;
        case 'tank': return (WZ.Tanks && WZ.Tanks.called) | 0;
        case 'jet': return (WZ.Jets && WZ.Jets.called) | 0;
        default: return 0;
      }
    },
    rem(id) { return Math.max(0, W.mapLimit(id) - W.used(id)); },

    init() {
      const i = W.index(WZ.Save.data.settings.weapon); W.sel = i >= 0 ? i : 1;
    },
    rawStock(id) {
      switch (id) {
        case 'mine': return WZ.Landmines.count;
        case 'gun': return WZ.Turrets.stock('gun');
        case 'soldier': return WZ.Soldiers ? WZ.Soldiers.stock() : 0;
        case 'heavy': return WZ.Turrets.stock('heavy');
        case 'bomb': return WZ.Turrets.stock('bomb');
        case 'heli': return WZ.Heli.stock();
        case 'tank': return WZ.Tanks.stock();
        case 'jet': return WZ.Jets.stock();
        default: return 0;
      }
    },
    stock(id) {
      return Math.min(W.rawStock(id), W.rem(id));
    },
    pct(id) {
      switch (id) {
        case 'mine': { const c = WZ.Landmines.cd; return c <= 0 ? 1 : Math.max(0, 1 - c / Math.max(0.45, CFG.mine.cooldown)); }
        case 'gun': case 'heavy': case 'bomb': return WZ.Turrets.cdPct(id);
        case 'soldier': return WZ.Soldiers ? WZ.Soldiers.cdPct() : 1;
        case 'heli': return WZ.Heli.cdPct();
        case 'tank': return WZ.Tanks.cdPct();
        case 'jet': return WZ.Jets.cdPct();
        default: return 1;
      }
    },

    select(idOrIndex) {
      const i = typeof idOrIndex === 'number' ? idOrIndex : W.index(idOrIndex);
      if (i < 0 || i >= ITEMS.length || i === W.sel) return false;
      W.sel = i; WZ.Save.data.settings.weapon = ITEMS[i].id; WZ.Save.save(); WZ.Audio.sfx('click');
      return true;
    },
    /** next / previous item; skips empty ones as long as something is in stock */
    cycle(dir) {
      const any = ITEMS.some((it) => W.stock(it.id) > 0);
      for (let k = 1; k <= ITEMS.length; k++) {
        const i = (W.sel + dir * k + ITEMS.length * 4) % ITEMS.length;
        if (!any || W.stock(ITEMS[i].id) > 0) return W.select(i);
      }
      return false;
    },
    /** deploy an item by id (defaults to the selected one). Returns true when something was deployed */
    use(id) {
      id = id || W.selId;
      switch (id) {
        case 'mine': return WZ.Landmines.plant();
        case 'gun': return WZ.Turrets.plant('gun');
        case 'soldier': return WZ.Soldiers ? WZ.Soldiers.deploy() : false;
        case 'heavy': return WZ.Turrets.plant('heavy');
        case 'bomb': return WZ.Turrets.plant('bomb');
        case 'heli': return WZ.Heli.call();
        case 'tank': return WZ.Tanks.call();
        case 'jet': return WZ.Jets.call();
        default: return false;
      }
    },
    /** cheap per-frame HUD state (reused objects, no allocation) */
    snap() {
      for (let i = 0; i < ITEMS.length; i++) { const s = W.snapshot[i]; s.n = W.stock(ITEMS[i].id); s.pct = W.pct(ITEMS[i].id); }
      return W.snapshot;
    },
  };
  WZ.Weapons = W;
})(window.WZ = window.WZ || {});
