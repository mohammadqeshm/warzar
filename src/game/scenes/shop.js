/* Shop scene (vehicles + DEFENSE: turrets, heavy cannons, bomb turrets, escort helicopters, escort tanks, defense tech) — real-time 3D showroom (turntable, studio lights) + DOM panels. Every vehicle card shows a 3D render of the
 * vehicle (rendered once with the game's own renderer into a texture); the big model on the turntable is live and draggable.
 * Purchases: vehicles (price in CFG.vehicles), landmine packs (CFG.shop.mines), turret / cannon packs (CFG.shop.turrets / .heavy) and defense tech levels (CFG.defenseTech). No emoji, only real renders and vector icons. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, G = WZ.Geo, t = (k, v) => WZ.I18n.t(k, v);
  const COIN = '<svg class="coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#FFB400" stroke="#0E0E0E" stroke-width="2"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#8a5f00" stroke-width="2"/><path d="M12 7.2l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z" fill="#8a5f00"/></svg>';
  const STATS = [['shop.speed', 'topSpeed', 32, (v) => Math.round(v * 3.6) + ' KM/H'], ['shop.armor', 'hp', 260, (v) => String(v)], ['shop.handling', 'handling', 1.2, (v) => String(Math.round(v * 100))], ['shop.ram', 'ram', 2, (v) => 'x' + v.toFixed(1)]];
  const pips = (n) => '<span class="tier">' + [1, 2, 3, 4, 5].map((i) => '<i class="' + (i <= n ? 'on' : '') + '"></i>').join('') + '</span>';

  // deployable catalogue (shop id -> weapon data). `kind` = WZ.Turrets kind / 'heli'; inv = key in Save.data.inv
  const DEFS = {
    turret: { kind: 'gun', C: CFG.turret, SH: CFG.shop.turrets, inv: 'turrets', name: 'shop.turret', how: 'shop.turret.how', maxDmg: 12, maxRate: 8 },
    heavy: { kind: 'heavy', C: CFG.heavy, SH: CFG.shop.heavy, inv: 'heavy', name: 'shop.heavy', how: 'shop.heavy.how', maxDmg: 12, maxRate: 8, splash: CFG.heavy.splash },
    bomb: { kind: 'bomb', C: CFG.bomb, SH: CFG.shop.bombs, inv: 'bombs', name: 'shop.bomb', how: 'shop.bomb.how', maxDmg: 30, maxRate: 8, splash: CFG.bomb.blast },
    heli: { kind: 'heli', C: CFG.heli, SH: CFG.shop.heli, inv: 'heli', name: 'shop.heli', how: 'shop.heli.how', maxDmg: 3, maxRate: 12 },
    tank: { kind: 'tank', C: CFG.tank, SH: CFG.shop.tank, inv: 'tank', name: 'shop.tank', how: 'shop.tank.how', maxDmg: 14, maxRate: 8, splash: CFG.tank.splash },
  };
  const DEF_BY_KIND = { gun: 'turret', heavy: 'heavy', bomb: 'bomb', heli: 'heli', tank: 'tank' };

  const Shop = {
    name: 'shop', t: 0, sel: 'jeep', rot: 0.6, spinV: 0, pop: 0, thumbs: {}, thumbsDone: false, scene: null, holder: null, obj: null, model: null, heroes: null, r: 5,

    // ------------------------------------------------------------------ purchases (pure logic, unit-tested)
    buyVehicle(id) {
      const S = WZ.Save.data, v = CFG.vehicles[id];
      if (!v) return 'invalid'; if (S.owned.vehicles.indexOf(id) >= 0) return 'owned'; if (S.coins < v.price) return 'poor';
      S.coins -= v.price; S.owned.vehicles.push(id); S.equipped.vehicle = id; WZ.Save.save(); return 'ok';
    },
    equip(id) { const S = WZ.Save.data; if (S.owned.vehicles.indexOf(id) < 0) return 'locked'; S.equipped.vehicle = id; WZ.Save.save(); return 'ok'; },
    buyMines(i) {
      const S = WZ.Save.data, p = CFG.shop.mines.packs[i];
      if (!p) return 'invalid'; if (S.inv.mines + p.n > CFG.shop.mines.cap) return 'full'; if (S.coins < p.price) return 'poor';
      S.coins -= p.price; S.inv.mines += p.n; WZ.Save.save(); return 'ok';
    },

    /** kind: 'gun' | 'heavy' | 'bomb' | 'heli' | 'tank'; i = pack index */
    buyTurrets(kind, i) {
      const S = WZ.Save.data, D = DEFS[DEF_BY_KIND[kind]]; if (!D) return 'invalid';
      const cf = D.SH, key = D.inv, p = cf.packs[i];
      if (!p) return 'invalid'; if ((S.inv[key] | 0) + p.n > cf.cap) return 'full'; if (S.coins < p.price) return 'poor';
      S.coins -= p.price; S.inv[key] = (S.inv[key] | 0) + p.n; WZ.Save.save(); return 'ok';
    },
    buyTech() {
      const S = WZ.Save.data, D = CFG.defenseTech, lvl = S.upgrades.defense | 0;
      if (lvl >= D.max) return 'max'; const price = D.prices[lvl]; if (S.coins < price) return 'poor';
      S.coins -= price; S.upgrades.defense = lvl + 1; WZ.Save.save(); return 'ok';
    },

    // ------------------------------------------------------------------ lifecycle
    enter(data) {
      const S = WZ.Save.data; Shop.data = data || {}; Shop.t = 0; Shop.rot = 0.6; Shop.pop = 0;
      Shop.sel = S.owned.vehicles.indexOf(S.equipped.vehicle) >= 0 ? S.equipped.vehicle : 'jeep';
      Shop.scene = new T.Scene(); Shop.scene.background = new T.Color(0x101318); Shop.scene.fog = new T.Fog(0x101318, 70, 150);
      Shop.buildStage();
      Shop.cam = WZ.Cam.cam; Shop.cam.fov = 32; Shop.cam.updateProjectionMatrix();
      WZ.UI.hudShow(false); WZ.UI.clearScreens();
      Shop.ui = WZ.UI._screen('shop', '<div class="shop-top"><button class="btn dark" data-act="back">' + t('shop.back') + '</button><div class="shop-title">' + t('shop.title') + '</div>' +
        '<div class="shop-coins panel">' + COIN + '<b id="sh-coins">0</b></div></div><div class="shop-stage-spacer"></div><div class="shop-main"><div class="shop-list" id="sh-list"></div><div class="shop-detail panel" id="sh-detail"></div></div>' +
        '<div class="shop-drag">' + t('shop.drag') + '</div>');
      Shop.ui.onclick = Shop.click;
      let dragId = -1, dragX = 0;
      Shop.ui.onpointerdown = (e) => {
        if (e.target.closest('button, .shop-list, .shop-detail')) return;
        dragId = e.pointerId; dragX = e.clientX;
      };
      Shop.ui.onpointermove = (e) => {
        if (e.pointerId !== dragId) return;
        const dx = e.clientX - dragX; dragX = e.clientX;
        Shop.rot += dx * 0.012;
      };
      Shop.ui.onpointerup = Shop.ui.onpointercancel = (e) => { if (e.pointerId === dragId) dragId = -1; };
      Shop.makeThumbs(); Shop.show(Shop.sel); Shop.paint();
    },

    exit() {
      WZ.UI.clearScreens();
      Shop.disposeObj(); G.disposeTree(Shop.scene); Shop.scene = null; Shop.holder = null;
      Shop.cam.fov = CFG.camera.fov; Shop.cam.clearViewOffset(); Shop.cam.updateProjectionMatrix();
      WZ.Main.renderer.renderLists.dispose();
    },

    canPause() { return false; },

    update(dt) {
      Shop.t += dt; const I = WZ.Input;
      I.update(); Shop.spinV = I.stick.mag > 0.1 ? I.stick.x * 2.6 : 0;
      for (const k of ['pause', 'debug', 'deploy', 'boost', 'skip', 'mine', 'turret', 'heavy', 'bomb', 'heli', 'tank', 'weapon', 'wnext', 'wprev', 'wsel']) I.consume(k);
    },

    render(alpha, dt) {
      const Main = WZ.Main, cam = Shop.cam, w = Main.w, h = Main.h, asp = w / h, tm = Shop.t;
      Shop.rot += (0.32 + Shop.spinV) * dt;
      Shop.pop = Math.min(1, Shop.pop + dt * 3); const e = 1 - Math.pow(1 - Shop.pop, 3);
      Shop.holder.rotation.y = Shop.rot; Shop.holder.scale.setScalar(0.86 + 0.14 * e);
      const m = Shop.model;
      if (m) { for (const wl of m.wheels) wl.rotation.x = tm * 0.8; m.gunYaw.rotation.y = Math.sin(tm * 0.6) * 0.55; m.flag.rotation.y = Math.sin(tm * 5) * 0.3; }
      if (Shop.rig) { Shop.rig.headG.rotation.y = Math.sin(tm * 0.8) * 0.9; if (Shop.rig.spin) Shop.rig.spin(dt); }
      if (Shop.heroes) for (const hr of Shop.heroes) hr.update(dt);
      const portrait = asp < 1, r = Shop.r, fit = r / (Math.tan(cam.fov * Math.PI / 360) * Math.min(1, asp * 1.15)) * (portrait ? 1.28 : 1.45);
      cam.position.set(fit * 0.2, r * 0.55 + 1.8, fit); cam.lookAt(0, r * 0.26 + 0.6, 0);
      cam.setViewOffset(w, h, 0, portrait ? h * 0.25 : 0, w, h);
      Main.renderer.render(Shop.scene, cam);
    },

    back() { const d = Shop.data; if (d && d.ret) d.ret(); else WZ.Main.go('menu'); },

    // ------------------------------------------------------------------ 3D stage
    buildStage() {
      const sc = Shop.scene, mk = (geo, color, o) => { const m = new T.Mesh(geo, o && o.basic ? new T.MeshBasicMaterial({ color, transparent: !!o.op, opacity: o.op || 1, side: T.DoubleSide }) : new T.MeshLambertMaterial({ color })); return m; };
      // concrete floor
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      x.fillStyle = '#23282e'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1500; i++) { x.fillStyle = 'rgba(' + (i % 2 ? '255,255,255' : '0,0,0') + ',' + (0.03 + Math.random() * 0.05) + ')'; x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3); }
      x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 2; x.strokeRect(1, 1, 254, 254);
      const ft = new T.CanvasTexture(c); ft.wrapS = ft.wrapT = T.RepeatWrapping; ft.repeat.set(14, 14);
      const floor = new T.Mesh(new T.CircleGeometry(90, 48), new T.MeshLambertMaterial({ map: ft })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
      // turntable + brand rings
      const plat = mk(new T.CylinderGeometry(8.2, 8.5, 0.6, 56), 0x2f353c); plat.position.y = 0.3; plat.receiveShadow = true; sc.add(plat);
      const ring = (r0, r1, col, y) => { const m = mk(new T.RingGeometry(r0, r1, 64), col, { basic: true }); m.rotation.x = -Math.PI / 2; m.position.y = y; sc.add(m); };
      ring(7.5, 7.9, 0xFFB400, 0.62); ring(6.6, 6.7, 0x0E0E0E, 0.62); ring(8.25, 8.55, 0x0E0E0E, 0.31);
      // back wall: diagonal hazard band + brand text
      const wc = document.createElement('canvas'); wc.width = 1024; wc.height = 512; const wx = wc.getContext('2d');
      const gr = wx.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#171b21'); gr.addColorStop(1, '#0c0e12'); wx.fillStyle = gr; wx.fillRect(0, 0, 1024, 512);
      wx.save(); wx.beginPath(); wx.rect(0, 392, 1024, 56); wx.clip(); wx.fillStyle = '#FFB400'; wx.fillRect(0, 392, 1024, 56); wx.fillStyle = '#0E0E0E';
      for (let i = -2; i < 40; i++) { wx.beginPath(); wx.moveTo(i * 56, 448); wx.lineTo(i * 56 + 28, 448); wx.lineTo(i * 56 + 56, 392); wx.lineTo(i * 56 + 28, 392); wx.fill(); } wx.restore();
      wx.font = '900 150px Impact, Haettenschweiler, "Arial Black", sans-serif'; wx.textAlign = 'center'; wx.fillStyle = 'rgba(236,233,225,0.09)'; wx.fillText('WARZAR', 512, 250);
      wx.font = '900 40px Impact, "Arial Black", sans-serif'; wx.fillStyle = 'rgba(255,180,0,0.55)'; wx.fillText('MOTOR POOL', 512, 320);
      const wall = new T.Mesh(new T.PlaneGeometry(130, 65), new T.MeshBasicMaterial({ map: new T.CanvasTexture(wc), fog: false })); wall.position.set(0, 24, -34); sc.add(wall);
      for (const sx of [-1, 1]) { const p = mk(new T.BoxGeometry(0.5, 30, 0.5), 0xFFF0C8, { basic: true }); p.position.set(sx * 26, 15, -31); sc.add(p); }
      // lights
      sc.add(new T.HemisphereLight(0xcfdcff, 0x3a2f22, 0.75));
      const key = new T.DirectionalLight(0xfff1d6, 1.15); key.position.set(-10, 18, 13); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
      const sh = key.shadow.camera; sh.left = sh.bottom = -13; sh.right = sh.top = 13; sh.near = 1; sh.far = 70; key.shadow.bias = -0.0006; sc.add(key);
      const rim1 = new T.PointLight(0x6aa8ff, 1.0, 60); rim1.position.set(-14, 9, -12); sc.add(rim1);
      const rim2 = new T.PointLight(0xffb400, 0.9, 60); rim2.position.set(14, 7, -10); sc.add(rim2);
      Shop.holder = new T.Group(); Shop.holder.position.y = 0.62; sc.add(Shop.holder);
    },

    disposeObj() {
      if (Shop.heroes) Shop.heroes.forEach((h) => h.dispose());
      if (Shop.obj) { if (Shop.holder) Shop.holder.remove(Shop.obj); G.disposeTree(Shop.obj); }
      Shop.heroes = null; Shop.model = null; Shop.obj = null; Shop.rig = null;
    },

    /** build the object for a catalogue id (with the two heroes seated in vehicles) */
    make(id) {
      if (id === 'mine') { const m = WZ.Vehicles.mineModel(); m.scale.setScalar(3.6); return { obj: m, model: null, heroes: null, r: 4.6 }; }
      if (id === 'heli') {
        const m = WZ.Heli.model(), g = new T.Group(); m.root.scale.setScalar(1.25); m.root.position.y = 2.2; g.add(m.root);
        const sz = new T.Box3().setFromObject(g).getSize(new T.Vector3());
        return { obj: g, model: null, heroes: null, rig: m, r: Math.max(sz.x, sz.z) * 0.5 + sz.y * 0.12 };
      }
      if (id === 'tank') {
        const m = WZ.Tanks.model(), g = new T.Group(); m.root.scale.setScalar(1.45); m.root.position.y = 0.1; g.add(m.root);
        const sz = new T.Box3().setFromObject(g).getSize(new T.Vector3());
        return { obj: g, model: null, heroes: null, rig: m, r: Math.max(sz.x, sz.z) * 0.55 + sz.y * 0.12 };
      }
      if (id === 'turret' || id === 'heavy' || id === 'bomb') {
        const kind = DEFS[id].kind, m = WZ.Turrets.model(kind), g = new T.Group(); m.root.scale.setScalar(m.scale * 2.1); g.add(m.root);
        const sz = new T.Box3().setFromObject(g).getSize(new T.Vector3());
        return { obj: g, model: null, heroes: null, rig: m, r: Math.max(sz.x, sz.z) * 0.6 + sz.y * 0.12 };
      }
      const mdl = WZ.Vehicles.build(id), c = WZ.Heroes.commander(), n = WZ.Heroes.nana();
      c.setMode('sit'); n.setMode('sit'); mdl.seatCmdr.add(c.root); mdl.seatNana.add(n.root);
      for (let i = 0; i < 45; i++) { c.update(1 / 60); n.update(1 / 60); }
      const s = new T.Box3().setFromObject(mdl.root).getSize(new T.Vector3());
      return { obj: mdl.root, model: mdl, heroes: [c, n], r: Math.max(s.x, s.z) * 0.6 + s.y * 0.12 };
    },

    show(id) {
      Shop.disposeObj(); const o = Shop.make(id);
      Shop.obj = o.obj; Shop.model = o.model; Shop.heroes = o.heroes; Shop.rig = o.rig || null; Shop.r = o.r; Shop.holder.add(o.obj); Shop.pop = 0;
      Shop.obj.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    },

    // ------------------------------------------------------------------ 3D thumbnails for the cards
    makeThumbs() {
      if (Shop.thumbsDone) return; Shop.thumbsDone = true;
      for (const id of CFG.vehicleOrder.concat(['mine', 'turret', 'heavy', 'bomb', 'heli', 'tank'])) { try { Shop.thumbs[id] = Shop.thumb(id); } catch (e) { Shop.thumbs[id] = ''; } }
    },

    thumb(id) {
      const R = WZ.Main.renderer, W = 440, H = 270, rt = new T.WebGLRenderTarget(W, H);
      const sc = new T.Scene(); sc.add(new T.HemisphereLight(0xdfe9ff, 0x6b5a3a, 1.05));
      const d = new T.DirectionalLight(0xfff0d0, 0.95); d.position.set(-6, 10, 9); sc.add(d);
      const o = Shop.make(id); sc.add(o.obj);
      const box = new T.Box3().setFromObject(o.obj), size = box.getSize(new T.Vector3()), ctr = box.getCenter(new T.Vector3());
      const cam = new T.PerspectiveCamera(28, W / H, 0.5, 300), dist = (Math.max(size.x, size.z) * 0.62 + size.y * 0.35) / Math.tan(14 * Math.PI / 180) * 1.02;
      cam.position.set(ctr.x + dist * 0.6, ctr.y + dist * 0.34, ctr.z + dist * 0.74); cam.lookAt(ctr.x, ctr.y - size.y * 0.06, ctr.z);
      const prev = new T.Color(); R.getClearColor(prev); const pa = R.getClearAlpha();
      R.setClearColor(0x000000, 0); R.setRenderTarget(rt); R.clear(); R.render(sc, cam);
      const buf = new Uint8Array(W * H * 4); R.readRenderTargetPixels(rt, 0, 0, W, H, buf);
      R.setRenderTarget(null); R.setClearColor(prev, pa); rt.dispose();
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), img = cx.createImageData(W, H);
      for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      cx.putImageData(img, 0, 0); const url = cv.toDataURL('image/png');
      if (o.heroes) o.heroes.forEach((h) => h.dispose()); G.disposeTree(o.obj);
      return url;
    },

    // ------------------------------------------------------------------ DOM
    paint() {
      const S = WZ.Save.data, el = Shop.ui, eq = S.equipped.vehicle, own = S.owned.vehicles;
      el.querySelector('#sh-coins').textContent = S.coins;
      const img = (id) => Shop.thumbs[id] ? '<img class="vthumb" alt="" src="' + Shop.thumbs[id] + '">' : '<div class="vthumb noimg"></div>';
      let list = CFG.vehicleOrder.map((id) => {
        const v = CFG.vehicles[id], o = own.indexOf(id) >= 0;
        const tag = eq === id ? '<span class="tg eq">' + t('shop.equipped') + '</span>' : o ? '<span class="tg own">' + t('shop.owned') + '</span>' : '<span class="tg price">' + COIN + v.price + '</span>';
        return '<button class="vcard' + (Shop.sel === id ? ' sel' : '') + (o ? '' : ' locked') + '" data-act="sel" data-id="' + id + '">' + img(id) + '<div class="vinfo"><div class="vname">' + v.name + '</div>' + pips(v.tier) + tag + '</div></button>';
      }).join('');
      list += '<button class="vcard' + (Shop.sel === 'mine' ? ' sel' : '') + '" data-act="sel" data-id="mine">' + img('mine') + '<div class="vinfo"><div class="vname">' + t('shop.mines') + '</div><span class="tg own">' + t('shop.stock', { n: S.inv.mines }) + '</span></div></button>';
      const sect = (txt) => '<div class="sh-sect">' + txt + '</div>';
      list += sect(t('shop.defense'));
      for (const id of ['turret', 'heavy', 'bomb', 'heli', 'tank']) {
        const D = DEFS[id];
        list += '<button class="vcard' + (Shop.sel === id ? ' sel' : '') + '" data-act="sel" data-id="' + id + '">' + img(id) + '<div class="vinfo"><div class="vname">' + t(D.name) + '</div><span class="tg own">' + t('shop.stock', { n: S.inv[D.inv] | 0 }) + '</span></div></button>';
      }
      el.querySelector('#sh-list').innerHTML = list;

      const d = el.querySelector('#sh-detail');
      if (Shop.sel === 'mine') {
        const M = CFG.shop.mines;
        d.innerHTML = '<div class="dname">' + t('shop.mines') + '</div><div class="dblurb">' + t('shop.mines.how') + '</div>' +
          '<div class="dstock">' + t('shop.stock', { n: S.inv.mines }) + ' / ' + M.cap + '</div><div class="packs">' +
          M.packs.map((p, i) => { const full = S.inv.mines + p.n > M.cap, poor = S.coins < p.price; return '<button class="btn buy" data-act="pack" data-i="' + i + '"' + (full || poor ? ' disabled' : '') + '><span>x' + p.n + '</span><em>' + (full ? t('shop.full') : COIN + p.price) + '</em></button>'; }).join('') + '</div>';
        return;
      }
      if (DEFS[Shop.sel]) { d.innerHTML = Shop.defenseHtml(Shop.sel); return; }
      const v = CFG.vehicles[Shop.sel], o = own.indexOf(Shop.sel) >= 0, equipped = eq === Shop.sel, need = v.price - S.coins;
      let act;
      if (equipped) act = '<button class="btn big" disabled>' + t('shop.equipped') + '</button>';
      else if (o) act = '<button class="btn big" data-act="equip" data-id="' + Shop.sel + '">' + t('shop.equip') + '</button>';
      else if (need > 0) act = '<button class="btn big" disabled>' + t('shop.need', { n: need }) + '</button>';
      else act = '<button class="btn big" data-act="buy" data-id="' + Shop.sel + '">' + t('shop.buy') + ' ' + COIN + v.price + '</button>';
      d.innerHTML = '<div class="dname">' + v.name + '</div>' + pips(v.tier) + '<div class="dblurb">' + v.blurb + '</div>' +
        STATS.map((s) => { const val = v[s[1]], pct = Math.max(6, Math.min(100, val / s[2] * 100)); return '<div class="st"><span>' + t(s[0]) + '</span><i><b style="width:' + pct.toFixed(0) + '%"></b></i><em>' + s[3](val) + '</em></div>'; }).join('') +
        '<div class="dact">' + act + '</div>';
    },

    defenseHtml(id) {
      const S = WZ.Save.data, DF = DEFS[id], C = DF.C, SH = DF.SH, D = CFG.defenseTech;
      const lvl = S.upgrades.defense | 0, stock = S.inv[DF.inv] | 0;
      const dmg = C.damage * (1 + lvl * D.dmg), rate = (C.rate) * (1 + lvl * D.rate), life = C.life * (1 + lvl * D.life);
      const bar = (lab, val, max, txt) => '<div class="st"><span>' + t(lab) + '</span><i><b style="width:' + Math.max(6, Math.min(100, val / max * 100)).toFixed(0) + '%"></b></i><em>' + txt + '</em></div>';
      let h = '<div class="dname">' + t(DF.name) + '</div><div class="dblurb">' + t(DF.how) + '</div>' +
        bar('shop.dmg', dmg, DF.maxDmg, dmg.toFixed(1) + (DF.splash ? ' AOE' : '')) + bar('shop.rate', rate, DF.maxRate, rate.toFixed(1) + '/s') + bar('shop.range', C.range, 46, C.range + ' M') + bar('shop.life', life, 50, Math.round(life) + ' S') +
        (DF.splash ? bar('shop.splash', DF.splash, 8, DF.splash + ' M') : '') +
        '<div class="dstock">' + t('shop.stock', { n: stock }) + ' / ' + SH.cap + '</div><div class="packs">' +
        SH.packs.map((p, i) => { const full = stock + p.n > SH.cap, poor = S.coins < p.price; return '<button class="btn buy" data-act="tpack" data-kind="' + DF.kind + '" data-i="' + i + '"' + (full || poor ? ' disabled' : '') + '><span>x' + p.n + '</span><em>' + (full ? t('shop.full') : COIN + p.price) + '</em></button>'; }).join('') + '</div>';
      const maxed = lvl >= D.max, price = maxed ? 0 : D.prices[lvl];
      h += '<div class="tech"><div class="tech-h"><b>' + t('shop.tech') + '</b><span>' + (maxed ? t('shop.tech.max') : t('shop.tech.lvl', { n: lvl, m: D.max })) + '</span></div>' +
        '<div class="tech-pips">' + Array.from({ length: D.max }, (_, i) => '<i class="' + (i < lvl ? 'on' : '') + '"></i>').join('') + '</div>' +
        '<div class="dblurb sm">' + t('shop.tech.how') + '</div>' +
        '<button class="btn buy" data-act="tech"' + (maxed || S.coins < price ? ' disabled' : '') + '><span>' + t('shop.upgrade') + '</span><em>' + (maxed ? t('shop.tech.max') : COIN + price) + '</em></button></div>';
      return h;
    },

    click(e) {
      const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
      const a = b.dataset.act, id = b.dataset.id; WZ.Audio.unlock();
      if (a === 'back') { WZ.Audio.sfx('click'); Shop.back(); return; }
      if (a === 'sel') { WZ.Audio.sfx('click'); if (Shop.sel !== id) { Shop.sel = id; Shop.show(id); } }
      else if (a === 'buy') { const r = Shop.buyVehicle(id); WZ.Audio.sfx(r === 'ok' ? 'win' : 'beep'); if (r === 'ok') { Shop.show(id); WZ.Particles && 0; } }
      else if (a === 'equip') { WZ.Audio.sfx(Shop.equip(id) === 'ok' ? 'go' : 'beep'); }
      else if (a === 'tpack') { WZ.Audio.sfx(Shop.buyTurrets(b.dataset.kind, +b.dataset.i) === 'ok' ? 'deliver' : 'beep'); }
      else if (a === 'tech') { WZ.Audio.sfx(Shop.buyTech() === 'ok' ? 'win' : 'beep'); }
      else if (a === 'pack') { WZ.Audio.sfx(Shop.buyMines(+b.dataset.i) === 'ok' ? 'deliver' : 'beep'); }
      Shop.paint();
    },
  };

  WZ.Scenes = WZ.Scenes || {};
  WZ.Scenes.shop = Shop;
})(window.WZ = window.WZ || {});
