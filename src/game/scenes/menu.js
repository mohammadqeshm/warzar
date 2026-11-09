/* Menu scene — mimics the key art: Commander + Nana in front of a stone wall, village hills behind, parachute crates
 * and a cargo plane in the sky. Rendered with the same engine as the mission. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, U = WZ.U, P = WZ.Props, G = WZ.Geo;

  const Menu = {
    name: 'menu', t: 0,

    enter() {
      const S = WZ.Save.data;
      Menu.t = 0;
      Menu.scene = new T.Scene();
      Menu.map = WZ.World.backdrop(1337);
      Menu.col = WZ.Collision.create(Menu.map);
      Menu.view = WZ.WorldView.build(Menu.map, Menu.scene, { menu: true, quality: WZ.Quality.level });
      WZ.Particles.init(Menu.scene);
      const rng = WZ.RNG.create(99), scene = Menu.scene, map = Menu.map;

      // ---- find a free stage with the village straight ahead (axis-aligned so the wall is a simple box)
      const dirs = [[0, -1], [0, 1], [1, 0], [-1, 0]];
      let st = null;
      for (let tries = 0; tries < 400 && !st; tries++) {
        const cl = map.clusters[tries % map.clusters.length], d = dirs[(tries >> 2) % 4], back = 48 + (tries % 7) * 3, lat = ((tries * 7) % 21) - 10;
        const x = cl.x - d[0] * back - d[1] * lat, z = cl.z - d[1] * back + d[0] * lat;
        if (Math.abs(x) < map.half - 40 && Math.abs(z) < map.half - 40 && Menu.col.free(x, z, 12) && Menu.col.free(x + d[0] * 6, z + d[1] * 6, 9)) st = { x, z, d };
      }
      if (!st) st = { x: 0, z: 0, d: [0, -1] };
      const d = st.d, r = [-d[1], d[0]], gy = map.height(st.x, st.z);
      Menu.st = { x: st.x, z: st.z, y: gy, dx: d[0], dz: d[1], rx: r[0], rz: r[1] };
      const at = (f, s, y) => new T.Vector3(st.x + d[0] * f + r[0] * s, gy + (y || 0), st.z + d[1] * f + r[1] * s);

      // ---- wall + props
      const set = P.newSet();
      P.wall(set, at(2.8, 0).x, at(2.8, 0).z, gy, 22, d[0] === 0 ? 'x' : 'z', 1.9, 3.4, rng);
      P.setMeshes(set, scene);
      const barMat = new T.MeshLambertMaterial({ vertexColors: true });
      for (let i = 0; i < 2; i++) { const b = new T.Mesh(P.barrelGeo(), barMat); const p = at(0.4 + i * 1.6, -6.8 - i * 0.8, 0.75); b.position.copy(p); scene.add(b); }
      const bagMat = new T.MeshLambertMaterial({ map: WZ.Assets.tex('sandbag') });
      for (let i = 0; i < 6; i++) { const b = new T.Mesh(P.sandbagGeo(), bagMat); const p = at(1.0 + (i > 2 ? 0.2 : 0), 6.2 + (i % 3) * 1.55 - (i > 2 ? 0.7 : 0), 0.28 + (i > 2 ? 0.55 : 0)); b.position.copy(p); b.rotation.y = Math.atan2(r[0], r[1]) + 0.1 * i; scene.add(b); }
      const crate = P.crateMeshShared(3.2); crate.position.copy(at(0.2, 7.2, 1.4)); crate.rotation.y = Math.atan2(d[0], d[1]) + 0.25; scene.add(crate);
      const helm = new T.Mesh(new T.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), new T.MeshLambertMaterial({ map: WZ.Assets.tex('camoDark') }));
      helm.scale.set(0.9, 0.7, 0.9); helm.position.copy(at(-3.4, -4.6, 0.3)); helm.rotation.set(0.2, 1, 0.1); scene.add(helm);
      Menu.helm = helm;

      // ---- heroes
      const face = Math.atan2(-d[0], -d[1]);
      Menu.cmdr = WZ.Heroes.commander(); Menu.cmdr.rifle.visible = true; Menu.cmdr.setMode('hold');
      Menu.nana = WZ.Heroes.nana(); Menu.nana.setMode('idle');
      for (const [rig, s] of [[Menu.cmdr, -2.1], [Menu.nana, 2.2]]) {
        rig.root.scale.setScalar(1.15); const p = at(0, s); rig.root.position.copy(p); rig.root.rotation.y = face + (s < 0 ? -0.18 : 0.2); scene.add(rig.root);
      }

      // ---- sky life: cargo plane + parachute crates
      const pl = P.plane(); pl.group.scale.setScalar(2.4); scene.add(pl.group); Menu.plane = pl;
      Menu.chutes = [];
      for (let i = 0; i < 4; i++) { const g = P.parachute(rng); g.scale.setScalar(2.0 - i * 0.18); scene.add(g); Menu.chutes.push({ g, f: 55 + i * 28, s: -32 + i * 24 + (i % 2) * 12, y: 30 + i * 14, sp: 2.2 + i * 0.6, ph: i * 1.7 }); }

      Menu.view.followLight(st.x, gy, st.z);
      Menu.cam = WZ.Cam.cam; Menu.cam.fov = 40; Menu.cam.updateProjectionMatrix();
      const lvl = Math.max(1, S.level || S.best.mission || 1);
      S.level = lvl; WZ.Main.startIndex = lvl;
      WZ.UI.hudShow(false); WZ.UI.clearScreens();
      WZ.UI.showMenu({ level: lvl, coins: S.coins }, { play: Menu.play, garage: () => WZ.Main.go('shop') });
      void rng;
    },

    play() {
      const Main = WZ.Main, S = WZ.Save.data;
      const lvl = Math.max(1, (S && S.level) || Main.startIndex || 1);
      Main.startIndex = lvl;
      Main.go('mission', { index: lvl, runSeed: WZ.Save.newRunSeed(), runCoins: 0 });
    },

    exit() {
      WZ.UI.clearScreens(); WZ.Fx.clear();
      Menu.cmdr.dispose(); Menu.nana.dispose();
      G.disposeTree(Menu.scene); WZ.Particles.dispose(); Menu.view.dispose();
      Menu.scene = null;
      Menu.cam.fov = CFG.camera.fov; Menu.cam.updateProjectionMatrix();
      WZ.Main.renderer.renderLists.dispose();
    },

    update(dt) { Menu.t += dt; WZ.Input.consume('pause'); WZ.Input.consume('debug'); },

    render(alpha, dt) {
      const Main = WZ.Main, S = Menu.st, cam = Menu.cam, t = Menu.t, asp = Main.w / Main.h;
      Menu.cmdr.update(dt); Menu.nana.update(dt);
      // camera: low, in front of the heroes, village on the hills behind the wall
      const dist = U.clamp(4.6 / (Math.tan(20 * Math.PI / 180) * asp), 12.5, 26) + Math.sin(t * 0.3) * 0.4;
      const sway = Math.sin(t * 0.25) * 0.9;
      cam.position.set(S.x - S.dx * dist + S.rx * sway, S.y + 2.3 + (asp < 1 ? 0.8 : 0), S.z - S.dz * dist + S.rz * sway);
      const look = 2.3 + 30 * Math.tan(-Math.atan(2.3 / dist) + (asp < 1 ? 0.14 : 0.31)); // keep the heroes' feet near the bottom edge at any aspect
      cam.lookAt(S.x + S.dx * 30 + S.rx * (asp < 1 ? 0 : 0.8), S.y + look, S.z + S.dz * 30 + S.rz * (asp < 1 ? 0 : 0.8));
      cam.updateMatrixWorld(true);

      // plane crosses the sky, chutes drift down
      const pl = Menu.plane, px = ((t * 26) % 520) - 260;
      pl.group.position.set(S.x + S.dx * 170 + S.rx * px, S.y + 62, S.z + S.dz * 170 + S.rz * px);
      pl.group.rotation.y = Math.atan2(S.rx, S.rz); pl.group.rotation.z = Math.sin(t * 0.8) * 0.05;
      pl.props.forEach((p) => { p.rotation.z += 40 * dt; });
      for (const c of Menu.chutes) {
        const y = 78 - ((t * c.sp + c.ph * 9) % 70);
        c.g.position.set(S.x + S.dx * c.f + S.rx * (c.s + Math.sin(t * 0.7 + c.ph) * 4), S.y + y, S.z + S.dz * c.f + S.rz * (c.s + Math.sin(t * 0.7 + c.ph) * 4));
        c.g.rotation.z = Math.sin(t * 1.1 + c.ph) * 0.1; c.g.rotation.y = t * 0.2 + c.ph;
      }
      Menu.helm.rotation.y = 1;
      WZ.Particles.update(dt, cam);
      Menu.view.update(t, dt, cam);
      Main.renderer.render(Menu.scene, cam);
    },
  };

  WZ.Scenes = WZ.Scenes || {};
  WZ.Scenes.menu = Menu;
})(window.WZ = window.WZ || {});
