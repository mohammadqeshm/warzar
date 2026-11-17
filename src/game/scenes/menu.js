/* Menu scene — Cinematic 3D live diorama showcase of the selected map.
 * Both Commander and Nana ride inside the player's equipped vehicle in a serious tactical stance,
 * framed at a scenic vantage point overlooking the map's landmarks, guardian boss, escort heli, and sky drops,
 * with studio 3-point + biome rim lighting and high-resolution shadows. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, U = WZ.U, P = WZ.Props, G = WZ.Geo;

  const BIOME_LIGHT = {
    village:  { key: 0xFFF2D6, keyI: 0.75, rim: 0xFFB84D, rimI: 0.85, fill: 0xFFE4B5, particle: [0.92, 0.78, 0.52] },
    jurassic: { key: 0xFFF5D8, keyI: 0.78, rim: 0x88FF9E, rimI: 0.82, fill: 0xD8F8D0, particle: [0.65, 1.0, 0.55] },
    volcanic: { key: 0xFFD8B0, keyI: 0.82, rim: 0xFF5A1F, rimI: 1.05, fill: 0xFF8A44, particle: [1.0, 0.48, 0.14] },
    frozen:   { key: 0xF2F8FF, keyI: 0.75, rim: 0x68E4FF, rimI: 0.92, fill: 0xCBEAFF, particle: [0.85, 0.95, 1.0] },
    harbor:   { key: 0xFFF0D4, keyI: 0.78, rim: 0xFFA23A, rimI: 0.88, fill: 0xBCDCF0, particle: [1.0, 0.76, 0.35] },
  };

  const Menu = {
    name: 'menu',
    t: 0,

    /** The map whose 3D scene is shown behind the menu = the selected map (Save.settings.map) */
    themeOf() {
      const m = WZ.Save.data.settings.map;
      return WZ.CFG.maps[m] && m !== 'order' && WZ.Progress.seasonUnlocked(m) ? m : WZ.Progress.firstOpen();
    },

    enter(data) {
      const S = WZ.Save.data;
      Menu.t = 0;
      Menu.theme = Menu.themeOf();
      Menu.want = Menu.theme;
      Menu.fading = false;
      Menu.mapOpen = false;
      if (WZ.Audio.setMusic) WZ.Audio.setMusic('menu', Menu.theme);
      Menu.build(Menu.theme);
      S.settings.map = Menu.theme;
      WZ.UI.hudShow(false);
      WZ.UI.clearScreens();
      clearTimeout(Menu.warmT);
      if (data && data.result) {
        // coming back from the shop (or anywhere) to the RESULTS screen of the level that was just played: show exactly that screen again
        Menu.menuEl = null;
        WZ.Progress.presentResult(data.result);
        return;
      }
      WZ.Main.lastResult = null;
      Menu.menuEl = WZ.UI.showMenu(
        { level: WZ.Progress.current(Menu.theme), coins: S.coins },
        { play: Menu.play, garage: () => WZ.Main.go('shop'), maps: Menu.openMaps }
      );
      Menu.warmT = setTimeout(() => {
        if (WZ.MapPreview && !Menu.mapOpen) WZ.MapPreview.request([Menu.theme], Menu.onImage);
      }, 1500);
      if ((data && data.maps) || (S.flags && S.flags.pendingUnlock)) {
        Menu.openMaps({
          unlockSeason: (data && data.unlockSeason) || (S.flags && S.flags.pendingUnlock) || '',
          fromTheme: (data && data.fromTheme) || Menu.theme,
        });
      }
    },

    /** Build the cinematic 3D menu showcase for a map theme */
    build(theme) {
      const S = WZ.Save.data;
      Menu.scene = new T.Scene();
      Menu.map = WZ.World.backdrop(2024, theme);
      Menu.col = WZ.Collision.create(Menu.map);
      // Build WorldView at high quality for the menu showcase
      const q = Math.max(1, WZ.Quality ? WZ.Quality.level : 2);
      Menu.view = WZ.WorldView.build(Menu.map, Menu.scene, { menu: true, quality: q });
      WZ.Particles.init(Menu.scene);
      const rng = WZ.RNG.create(99), scene = Menu.scene, map = Menu.map, hm = map.height;

      // ---- 1. Find a scenic open stage overlooking the map's focal landmark (no wall blocking the vista!)
      const F = map.focus || (map.bridges && map.bridges[0]) || map.clusters[Math.min(1, map.clusters.length - 1)] || { x: 0, z: 0 };
      let bestSt = null, bestScore = -1e9;
      for (let i = 0; i < 72; i++) {
        const ang = (i / 72) * Math.PI * 2 + 0.35;
        for (const dist of [32, 38, 27, 44]) {
          const sx = F.x - Math.sin(ang) * dist;
          const sz = F.z - Math.cos(ang) * dist;
          if (Math.abs(sx) > map.half - 42 || Math.abs(sz) > map.half - 42) continue;
          const dx = Math.sin(ang), dz = Math.cos(ang); // unit vector from stage -> focal landmark
          const rx = -dz, rz = dx;                      // right vector
          // Ensure vehicle spot, camera spot behind stage, and sightline ahead are obstacle-free
          if (!Menu.col.free(sx, sz, 7.5)) continue;
          if (!Menu.col.free(sx - dx * 9, sz - dz * 9, 5.5)) continue;
          if (!Menu.col.free(sx - dx * 15, sz - dz * 15, 4.5)) continue;
          if (!Menu.col.free(sx + dx * 8, sz + dz * 8, 5.0)) continue;
          const gy = hm(sx, sz);
          if (map.waterLevel != null && gy < map.waterLevel + 0.6) continue;
          if (map.seaLevel != null && gy < map.seaLevel + 0.8) continue;
          // Prefer flat ground at the vehicle position and a gentle view over the landmark
          const slope = Math.abs(hm(sx + dx * 3, sz + dz * 3) - hm(sx - dx * 3, sz - dz * 3)) +
                        Math.abs(hm(sx + rx * 3, sz + rz * 3) - hm(sx - rx * 3, sz - rz * 3));
          const elevBonus = (gy - hm(F.x, F.z)) * 0.4;
          const score = -slope * 4 + elevBonus - Math.abs(dist - 34) * 0.15;
          if (score > bestScore) {
            bestScore = score;
            bestSt = { x: sx, z: sz, y: gy, dx, dz, rx, rz };
          }
        }
      }
      if (!bestSt) {
        const dx = 0, dz = -1, rx = 1, rz = 0;
        bestSt = { x: map.start.x, z: map.start.z, y: hm(map.start.x, map.start.z), dx, dz, rx, rz };
      }
      const st = bestSt;
      Menu.st = st;
      const at = (f, s, y) => {
        const wx = st.x + st.dx * f + st.rx * s;
        const wz = st.z + st.dz * f + st.rz * s;
        return new T.Vector3(wx, hm(wx, wz) + (y || 0), wz);
      };

      // ---- 2. Player's Equipped Vehicle with BOTH Commander & Nana riding inside!
      const vid = (S.owned && S.owned.vehicles && S.owned.vehicles.indexOf(S.equipped.vehicle) >= 0 && CFG.vehicles[S.equipped.vehicle])
        ? S.equipped.vehicle : 'jeep';
      const veh = WZ.Vehicles.build(vid);
      Menu.veh = veh;

      Menu.cmdr = WZ.Heroes.commander();
      Menu.cmdr.rifle.visible = false;
      Menu.cmdr.setMode('sit');
      Menu.cmdr.lookYaw = -0.18;
      veh.seatCmdr.add(Menu.cmdr.root);

      Menu.nana = WZ.Heroes.nana();
      Menu.nana.setMode('sit');
      Menu.nana.lookYaw = 0.22;
      if (Menu.nana.pan) Menu.nana.pan.visible = false;
      veh.seatNana.add(Menu.nana.root);

      // Show loaded supply crates in the vehicle bed
      if (veh.bedCrates) {
        for (let i = 0; i < veh.bedCrates.length; i++) veh.bedCrates[i].visible = i < 2;
      }

      // Position vehicle on the stage at a heroic 3/4 angle facing toward the camera-left / vista
      const vPos = at(0, -0.6, 0);
      const vYaw = Math.atan2(-st.dx, -st.dz) + 0.58; // angled so front grille, side profile, and both riders are clearly visible
      Menu.vehBaseYaw = vYaw;
      Menu.vehPos = vPos;
      veh.root.rotation.order = 'YXZ';
      const vfx = Math.sin(vYaw), vfz = Math.cos(vYaw), vlx = Math.cos(vYaw), vlz = -Math.sin(vYaw);
      const vPitch = -Math.atan((hm(vPos.x + vfx * 2.2, vPos.z + vfz * 2.2) - hm(vPos.x - vfx * 2.2, vPos.z - vfz * 2.2)) / 4.4);
      const vRoll = Math.atan((hm(vPos.x + vlx * 1.4, vPos.z + vlz * 1.4) - hm(vPos.x - vlx * 1.4, vPos.z - vlz * 1.4)) / 2.8);
      Menu.vehPitch = vPitch;
      Menu.vehRoll = vRoll;
      veh.root.position.copy(vPos);
      veh.root.rotation.set(vPitch, vYaw, vRoll);
      veh.root.scale.setScalar(1.08);
      scene.add(veh.root);

      // Soft contact shadow under the vehicle
      const shGeo = new T.PlaneGeometry(6.8, 8.8);
      shGeo.rotateX(-Math.PI / 2);
      const shMesh = new T.Mesh(shGeo, new T.MeshBasicMaterial({
        map: WZ.Assets.tex('blob'), transparent: true, opacity: 0.78, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      }));
      shMesh.position.set(vPos.x, vPos.y + 0.08, vPos.z);
      shMesh.rotation.y = vYaw;
      scene.add(shMesh);

      // Volumetric headlight glow cones on the vehicle
      const beamMat = new T.MeshBasicMaterial({
        map: WZ.Assets.tex('beam'), color: 0xFFF1C0, transparent: true, opacity: 0.34,
        blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false,
      });
      for (const s of [-0.82, 0.82]) {
        const bm = new T.Mesh(G.beamPlane(), beamMat);
        bm.scale.set(2.2, 7.5, 1);
        bm.rotation.x = Math.PI / 2 + 0.14;
        bm.position.set(s, 1.55, 2.65);
        veh.bodyG.add(bm);
      }

      // ---- 3. Tactical Foreground & Midground Props (Sandbags, Supply Crate with Beacon, Barrels)
      const bagMat = new T.MeshLambertMaterial({ map: WZ.Assets.tex('sandbag') });
      for (let i = 0; i < 5; i++) {
        const b = new T.Mesh(P.sandbagGeo(), bagMat);
        const row = i < 3 ? 0 : 1;
        const col = i < 3 ? i : i - 2.5;
        const p = at(2.8 + row * 0.25, 5.2 + col * 1.45, 0.26 + row * 0.5);
        b.position.copy(p);
        b.rotation.y = Math.atan2(st.rx, st.rz) + (i - 2) * 0.08;
        b.castShadow = true;
        b.receiveShadow = true;
        scene.add(b);
      }

      // Glowing supply crate objective in midground right
      const cratePos = at(6.8, 5.8, 0);
      const crate = P.crateMeshShared(2.4);
      crate.position.set(cratePos.x, cratePos.y + 1.15, cratePos.z);
      crate.rotation.y = Math.atan2(st.dx, st.dz) + 0.38;
      crate.castShadow = true;
      scene.add(crate);

      const cBeam = new T.Mesh(G.beamPlane(), new T.MeshBasicMaterial({
        map: WZ.Assets.tex('beam'), color: 0xFFD24A, transparent: true, opacity: 0.55,
        blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false,
      }));
      cBeam.scale.set(3.2, 42, 1);
      cBeam.position.set(cratePos.x, cratePos.y, cratePos.z);
      scene.add(cBeam);
      Menu.crateBeam = cBeam;

      // Red explosive barrels on midground left
      const barMat = new T.MeshLambertMaterial({ vertexColors: true });
      for (let i = 0; i < 2; i++) {
        const b = new T.Mesh(P.barrelGeo(), barMat);
        const p = at(5.4 + i * 1.5, -6.2 - i * 0.9, 0.75);
        b.position.copy(p);
        b.castShadow = true;
        scene.add(b);
      }

      // ---- 4. Map's Iconic Guardian Boss in the Vista Background
      Menu.guardian = null;
      if (WZ.Giants && WZ.Giants.rigFor) {
        const gMat = new T.MeshLambertMaterial({ vertexColors: true });
        const gRig = WZ.Giants.rigFor(theme, gMat, 0);
        const gPos = at(34, -8.5, 0);
        gRig.root.position.copy(gPos);
        gRig.root.rotation.y = Math.atan2(-st.dx, -st.dz) + 0.35;
        gRig.root.scale.setScalar(1.05);
        scene.add(gRig.root);
        Menu.guardian = { rig: gRig, mat: gMat, baseY: gPos.y };
      }

      // ---- 5. Sky Life: Cargo Plane + Parachute Crates + Escort Helicopter
      const pl = P.plane();
      pl.group.scale.setScalar(2.4);
      scene.add(pl.group);
      Menu.plane = pl;

      Menu.chutes = [];
      for (let i = 0; i < 4; i++) {
        const g = P.parachute(rng);
        g.scale.setScalar(2.0 - i * 0.18);
        scene.add(g);
        Menu.chutes.push({
          g,
          f: 58 + i * 26,
          s: -28 + i * 22 + (i % 2) * 10,
          y: 30 + i * 14,
          sp: 2.2 + i * 0.55,
          ph: i * 1.7,
        });
      }

      // Escort Helicopter patrolling in midground sky
      Menu.heli = null;
      if (WZ.Heli && WZ.Heli.model) {
        const hmdl = WZ.Heli.model();
        hmdl.root.scale.setScalar(1.15);
        scene.add(hmdl.root);
        Menu.heli = hmdl;
      }

      // ---- 6. Studio 3-Point + Biome Rim Lighting & High-Res Shadows
      Menu.setupLights(theme, st, vPos);

      Menu.cam = WZ.Cam.cam;
      Menu.cam.fov = 38;
      Menu.cam.updateProjectionMatrix();
      Menu.fireT = 1.2;
      Menu.partT = 0;
    },

    setupLights(theme, st, vPos) {
      const scene = Menu.scene, view = Menu.view;
      const bl = BIOME_LIGHT[theme] || BIOME_LIGHT.village;

      // Focus main sun shadow tightly around the hero stage for crisp self/ground shadows
      if (view && view.sun) {
        const sun = view.sun;
        const sh = CFG.quality.shadow[Math.max(1, WZ.Quality ? WZ.Quality.level : 2)] || 1024;
        sun.castShadow = true;
        sun.shadow.mapSize.set(sh, sh);
        const c = sun.shadow.camera;
        c.left = -24; c.right = 24; c.top = 24; c.bottom = -24; c.near = 8; c.far = 180;
        c.updateProjectionMatrix();
        sun.position.set(vPos.x - st.dx * 24 + st.rx * 18, vPos.y + 42, vPos.z - st.dz * 24 + st.rz * 18);
        sun.target.position.copy(vPos);
        sun.target.updateMatrixWorld();
      }

      // Dedicated Key Light from camera-front-right to illuminate the vehicle & heroes' faces cleanly
      const keyL = new T.DirectionalLight(bl.key, bl.keyI);
      keyL.position.set(vPos.x - st.dx * 16 + st.rx * 12, vPos.y + 14, vPos.z - st.dz * 16 + st.rz * 12);
      keyL.target.position.set(vPos.x, vPos.y + 2, vPos.z);
      scene.add(keyL, keyL.target);

      // Biome-colored Rim Backlight from behind-left to carve out silhouettes
      const rimL = new T.DirectionalLight(bl.rim, bl.rimI);
      rimL.position.set(vPos.x + st.dx * 22 - st.rx * 16, vPos.y + 18, vPos.z + st.dz * 22 - st.rz * 16);
      rimL.target.position.set(vPos.x, vPos.y + 1.5, vPos.z);
      scene.add(rimL, rimL.target);

      // Warm Hero Cabin PointLight so Commander & Nana inside the vehicle have vibrant 3D contrast
      const cabL = new T.PointLight(bl.fill, 0.68, 16, 1.5);
      cabL.position.set(vPos.x - st.dx * 3.2 + st.rx * 1.5, vPos.y + 4.4, vPos.z - st.dz * 3.2 + st.rz * 1.5);
      scene.add(cabL);
    },

    /** Free the 3D menu scene (used by exit() and when another map is picked) */
    destroy() {
      if (!Menu.scene) return;
      if (Menu.cmdr) Menu.cmdr.dispose();
      if (Menu.nana) Menu.nana.dispose();
      if (Menu.guardian) {
        if (Menu.guardian.rig && Menu.guardian.rig.dispose) Menu.guardian.rig.dispose();
        if (Menu.guardian.mat) Menu.guardian.mat.dispose();
        Menu.guardian = null;
      }
      if (Menu.heli && Menu.heli.dispose) Menu.heli.dispose();
      G.disposeTree(Menu.scene);
      WZ.Particles.dispose();
      Menu.view.dispose();
      Menu.scene = null;
      Menu.veh = null;
      Menu.heli = null;
      WZ.Main.renderer.renderLists.dispose();
    },

    // ---------------------------------------------------------------- map selection
    onImage(kind, th, url) {
      if (kind === 'shot') WZ.UI.setMapShot(th, url);
      else WZ.UI.setMapPortrait(th, url);
    },
    openMaps(opts) {
      if (Menu.mapOpen) return;
      Menu.mapOpen = true;
      if (Menu.menuEl) Menu.menuEl.style.display = 'none';
      const uId = (opts && opts.unlockSeason) || (WZ.Save.data.flags && WZ.Save.data.flags.pendingUnlock) || '';
      WZ.UI.showMapSelect(
        Menu.want || Menu.theme,
        { select: Menu.pick, close: Menu.closeMaps, level: Menu.pickLevel },
        { unlockSeason: uId, fromTheme: opts && opts.fromTheme }
      );
      const prio = (id) => (id === uId ? -2 : id === Menu.theme ? -1 : 0);
      const order = WZ.CFG.maps.order.slice().sort((a, b) => prio(a) - prio(b));
      WZ.MapPreview.request(order, Menu.onImage);
    },
    closeMaps() {
      if (!Menu.mapOpen) return;
      Menu.mapOpen = false;
      WZ.UI.removeScreen('mapsel');
      if (Menu.menuEl) Menu.menuEl.style.display = '';
      WZ.UI.mapChipUpdate(Menu.want || Menu.theme);
    },
    /** A map card was chosen: remember it and switch the 3D scene behind the screen to that map */
    /** a level node on a map card was chosen: START will launch that level */
    pickLevel(id) { WZ.UI.mapChipUpdate(id); },
    pick(id) {
      if (!WZ.Progress.seasonUnlocked(id)) return;           // locked seasons can never be selected
      WZ.Save.data.settings.map = id;
      WZ.Save.save();
      Menu.want = id;
      if (WZ.Audio.setMusic) WZ.Audio.setMusic('menu', id);
      WZ.UI.mapChipUpdate(id);
      if (Menu.fading || id === Menu.theme) return;
      Menu.fading = true;
      WZ.UI.themeFade(() => {
        if (WZ.Main.cur !== Menu) { Menu.fading = false; return; }
        Menu.destroy();
        Menu.theme = Menu.want;
        Menu.build(Menu.theme);
        Menu.fading = false;
        if (Menu.want !== Menu.theme) Menu.pick(Menu.want);
      });
    },

    play() {
      const Main = WZ.Main, S = WZ.Save.data;
      const theme = Menu.themeOf(), lvl = WZ.Progress.current(theme);
      Main.startIndex = lvl; void S;
      Main.go('mission', { theme, level: lvl, runSeed: WZ.Save.newRunSeed(), runCoins: 0 });
    },

    exit() {
      clearTimeout(Menu.warmT);
      if (WZ.MapPreview) WZ.MapPreview.cancel();
      WZ.UI.clearScreens();
      WZ.Fx.clear();
      Menu.mapOpen = false;
      Menu.menuEl = null;
      Menu.destroy();
      Menu.cam.fov = CFG.camera.fov;
      Menu.cam.updateProjectionMatrix();
    },

    update(dt) {
      Menu.t += dt;
      WZ.Input.consume('pause');
      WZ.Input.consume('debug');
    },

    render(alpha, dt) {
      if (!Menu.scene) return;
      const Main = WZ.Main, S = Menu.st, cam = Menu.cam, t = Menu.t, asp = Main.w / Main.h;
      const veh = Menu.veh;

      // ---- 1. Animate Vehicle & Seated Heroes (Engine rumble, wheel roll, turret scan & tracer fire)
      Menu.cmdr.update(dt);
      Menu.nana.update(dt);
      if (veh) {
        // Subtle powerful V8 engine rumble & suspension breathing
        veh.bodyG.position.y = Math.sin(t * 14) * 0.018 + Math.sin(t * 2.6) * 0.025;
        veh.bodyG.rotation.z = Math.sin(t * 2.2) * 0.014;
        veh.bodyG.rotation.x = Math.cos(t * 1.9) * 0.01;
        for (const w of veh.wheels) w.rotation.x += dt * 4.2;
        const steer = Math.sin(t * 0.85) * 0.22;
        for (const f of veh.front) f.rotation.y = steer;
        if (veh.flag) {
          veh.flag.rotation.y = Math.sin(t * 8.5) * 0.32 + 0.25;
          veh.flag.rotation.z = Math.sin(t * 6.2) * 0.08;
        }
        // Roof turret smoothly scans toward the distant guardian and fires periodic tracer bursts
        if (veh.gunYaw) {
          const targetAim = -0.65 + Math.sin(t * 0.95) * 0.42;
          veh.gunYaw.rotation.y = targetAim;
          Menu.fireT -= dt;
          if (Menu.fireT <= 0 && veh.muzzle && WZ.Particles.ready) {
            Menu.fireT = (Math.sin(t * 2.1) > 0.3) ? 0.14 : 1.35;
            const mp = new T.Vector3();
            veh.muzzle.getWorldPosition(mp);
            WZ.Particles.muzzle(mp.x, mp.y, mp.z);
            WZ.Particles.sparks(mp.x, mp.y, mp.z, 3, 1, 0.85, 0.35);
          }
        }
      }

      // ---- 2. Animate Guardian Boss in the Vista
      if (Menu.guardian && Menu.guardian.rig) {
        const gr = Menu.guardian.rig;
        gr.root.position.y = Menu.guardian.baseY + Math.abs(Math.sin(t * 1.8)) * 0.18;
        if (gr.armR) gr.armR.rotation.x = -0.55 + Math.sin(t * 2.2) * 0.25;
        if (gr.armL) gr.armL.rotation.x = -0.25 - Math.sin(t * 2.2) * 0.18;
        if (gr.head) gr.head.rotation.y = Math.sin(t * 1.1) * 0.22;
      }

      // ---- 3. Animate Escort Helicopter in Midground Sky
      if (Menu.heli) {
        const hAng = t * 0.38;
        const hx = S.x + S.dx * (26 + Math.cos(hAng) * 8) + S.rx * (11 + Math.sin(hAng) * 10);
        const hz = S.z + S.dz * (26 + Math.cos(hAng) * 8) + S.rz * (11 + Math.sin(hAng) * 10);
        Menu.heli.root.position.set(hx, S.y + 11.5 + Math.sin(t * 2.1) * 0.6, hz);
        Menu.heli.root.rotation.set(0.14, Math.atan2(-S.dx, -S.dz) - 0.4 + Math.sin(hAng) * 0.25, Math.cos(hAng) * 0.12);
        if (Menu.heli.spin) Menu.heli.spin(dt);
        if (Menu.heli.mainRotor) Menu.heli.mainRotor.rotation.y += dt * 28;
        if (Menu.heli.tailRotor) Menu.heli.tailRotor.rotation.x += dt * 34;
      }

      // ---- 4. Biome Atmospheric Particles & Tire Dust
      Menu.partT -= dt;
      if (Menu.partT <= 0 && WZ.Particles.ready && Menu.vehPos) {
        Menu.partT = 0.09;
        const vp = Menu.vehPos;
        // Subtle wheel dust behind rear tires
        WZ.Particles.emit(
          WZ.Particles.SOFT,
          vp.x + (Math.random() - 0.5) * 1.8, vp.y + 0.35, vp.z + (Math.random() - 0.5) * 1.8,
          -S.dx * (2.5 + Math.random() * 2), 0.7 + Math.random() * 0.8, -S.dz * (2.5 + Math.random() * 2),
          0.65, 0.7, 2.2, 0.76, 0.66, 0.48, 0.28, 0, 0, 1.4
        );
        // Floating biome embers / snowflakes / fireflies
        const bl = BIOME_LIGHT[Menu.theme] || BIOME_LIGHT.village;
        const pc = bl.particle;
        const px = S.x + S.dx * (4 + Math.random() * 24) + S.rx * ((Math.random() - 0.5) * 24);
        const pz = S.z + S.dz * (4 + Math.random() * 24) + S.rz * ((Math.random() - 0.5) * 24);
        const isSnow = Menu.theme === 'frozen';
        WZ.Particles.emit(
          WZ.Particles.GLOW,
          px, S.y + (isSnow ? 9 + Math.random() * 6 : 0.6 + Math.random() * 4), pz,
          (Math.random() - 0.5) * 1.5, isSnow ? -1.8 - Math.random() : 1.2 + Math.random() * 1.8, (Math.random() - 0.5) * 1.5,
          1.4 + Math.random() * 0.8, 0.28, 0.08, pc[0], pc[1], pc[2], 0.75, 0, 0, 0.4
        );
      }

      // ---- 5. Cinematic Camera Framing (Heroic Low 3/4 Angle with Smooth Orbit Drift)
      const dist = U.clamp(3.6 / (Math.tan(19 * Math.PI / 180) * Math.min(1.35, Math.max(0.65, asp))), 9.2, 15.5) + Math.sin(t * 0.32) * 0.45;
      const sway = Math.sin(t * 0.26) * 1.35 + (asp < 1 ? -0.25 : -0.75);
      const camH = 2.65 + (asp < 1 ? 0.65 : 0.15) + Math.sin(t * 0.4) * 0.14;
      cam.position.set(
        S.x - S.dx * dist + S.rx * sway,
        S.y + camH,
        S.z - S.dz * dist + S.rz * sway
      );
      // Look past the vehicle toward the scenic vista so the vehicle sits heroically in the lower-middle frame
      const lookY = S.y + (asp < 1 ? 2.55 : 2.85);
      const lookLat = (asp < 1 ? -0.2 : 0.35) + Math.sin(t * 0.26) * 0.3;
      cam.lookAt(
        S.x + S.dx * 22 + S.rx * lookLat,
        lookY,
        S.z + S.dz * 22 + S.rz * lookLat
      );
      cam.updateMatrixWorld(true);

      if (Menu.crateBeam) {
        Menu.crateBeam.rotation.y = Math.atan2(cam.position.x - Menu.crateBeam.position.x, cam.position.z - Menu.crateBeam.position.z);
      }

      // ---- 6. Cargo Plane & Parachutes in the Sky
      const pl = Menu.plane, px = ((t * 26) % 520) - 260;
      pl.group.position.set(S.x + S.dx * 165 + S.rx * px, S.y + 58, S.z + S.dz * 165 + S.rz * px);
      pl.group.rotation.y = Math.atan2(S.rx, S.rz);
      pl.group.rotation.z = Math.sin(t * 0.8) * 0.05;
      pl.props.forEach((p) => { p.rotation.z += 40 * dt; });

      for (const c of Menu.chutes) {
        const y = 76 - ((t * c.sp + c.ph * 9) % 68);
        c.g.position.set(
          S.x + S.dx * c.f + S.rx * (c.s + Math.sin(t * 0.7 + c.ph) * 4),
          S.y + y,
          S.z + S.dz * c.f + S.rz * (c.s + Math.sin(t * 0.7 + c.ph) * 4)
        );
        c.g.rotation.z = Math.sin(t * 1.1 + c.ph) * 0.1;
        c.g.rotation.y = t * 0.2 + c.ph;
      }

      WZ.Particles.update(dt, cam);
      Menu.view.update(t, dt, cam);
      Main.renderer.render(Menu.scene, cam);
    },
  };

  WZ.Scenes = WZ.Scenes || {};
  WZ.Scenes.menu = Menu;
})(window.WZ = window.WZ || {});
