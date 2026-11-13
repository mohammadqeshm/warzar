/* WZ.MapPreview — REAL 3D renders for the map-selection screen (no hand-drawn thumbnails):
 *   shot[theme]     JPEG data-URL: the actual map (terrain, scenery, sky, fog, lighting) generated + built with the game's own WorldView, with the
 *                   vehicle and that map's guardian standing in it, rendered to an anti-aliased off-screen target at 960x600.
 *   portrait[theme] PNG data-URL (transparent background): the guardian rig on its own, rim-lit in the map's colour.
 * Everything is rendered lazily, ONE image per timer tick (so the menu never freezes), cached for the session and disposed right after rendering.
 * A failure just leaves the SVG placeholder in the card (never breaks the menu). */
(function (WZ) {
  'use strict';
  const T = THREE;
  const SHOT = { w: 960, h: 600, ow: 720, oh: 450 }, POR = { s: 640, o: 384 };
  const RIM = { village: 0xFFD08A, jurassic: 0xB6FF8A, volcanic: 0xFF7A2A, frozen: 0x8FE8FF };

  const MP = {
    shot: {}, portrait: {}, tasks: [], timer: 0, running: false,

    /** queue shot + portrait for the given themes (current one first); onDone(kind, theme, url) is called as each image is ready */
    request(themes, onDone) {
      for (const th of themes) {
        if (!MP.shot[th] && !MP.tasks.some((k) => k.kind === 'shot' && k.th === th)) MP.tasks.push({ kind: 'shot', th, cb: onDone });
        if (!MP.portrait[th] && !MP.tasks.some((k) => k.kind === 'portrait' && k.th === th)) MP.tasks.push({ kind: 'portrait', th, cb: onDone });
      }
      if (!MP.running) { MP.running = true; MP.timer = setTimeout(MP._tick, 60); }
    },
    cancel() { MP.tasks.length = 0; clearTimeout(MP.timer); MP.running = false; },
    _tick() {
      const Main = WZ.Main, k = MP.tasks.shift();
      if (!k || !Main || !Main.renderer || Main.cur !== WZ.Scenes.menu) { MP.running = false; MP.tasks.length = 0; return; }
      try {
        const url = k.kind === 'shot' ? MP._renderShot(k.th) : MP._renderPortrait(k.th);
        if (url) { MP[k.kind][k.th] = url; if (k.cb) k.cb(k.kind, k.th, url); }
      } catch (e) { console.warn('[MapPreview] ' + k.kind + ' ' + k.th + ' failed', e); }
      MP.timer = setTimeout(MP._tick, 70);
    },

    // ------------------------------------------------------------------------------------------------ helpers
    _target(w, h) { return new T.WebGLRenderTarget(w, h, { samples: 4, format: T.RGBAFormat }); },
    /** render `scene` with `cam` into an off-screen target, hand the raw RGBA pixels (top row first) to fn, restore the renderer state */
    _render(scene, cam, w, h, clearA, fn) {
      const r = WZ.Main.renderer, prevRT = r.getRenderTarget(), cc = new T.Color(), ca = r.getClearAlpha(); r.getClearColor(cc);
      const rt = MP._target(w, h);
      try {
        r.setRenderTarget(rt); r.setClearColor(0x000000, clearA); r.clear(); r.render(scene, cam);
        const buf = new Uint8Array(w * h * 4); r.readRenderTargetPixels(rt, 0, 0, w, h, buf);
        const row = w * 4, flipped = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++) flipped.set(buf.subarray((h - 1 - y) * row, (h - y) * row), y * row);
        return fn(flipped);
      } finally { r.setRenderTarget(prevRT); r.setClearColor(cc, ca); rt.dispose(); }
    },
    _canvas(px, w, h, ow, oh, mime, unpremultiply) {
      if (unpremultiply) for (let i = 0; i < px.length; i += 4) { const a = px[i + 3]; if (a > 0 && a < 255) { const k = 255 / a; px[i] = Math.min(255, px[i] * k); px[i + 1] = Math.min(255, px[i + 1] * k); px[i + 2] = Math.min(255, px[i + 2] * k); } }
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(new ImageData(px, w, h), 0, 0);
      const o = document.createElement('canvas'); o.width = ow; o.height = oh; const g = o.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, ow, oh);
      return mime === 'image/png' ? o.toDataURL('image/png') : o.toDataURL('image/jpeg', 0.9);
    },

    // ------------------------------------------------------------------------------------------------ the map itself
    _renderShot(theme) {
      const G = WZ.Geo, map = WZ.World.backdrop(2024, theme), scene = new T.Scene();
      const view = WZ.WorldView.build(map, scene, { menu: true, quality: 2 });
      const F = map.focus || (map.bridges && map.bridges[0]) || map.clusters[Math.min(1, map.clusters.length - 1)];
      const a = Math.hypot(F.x, F.z) > 30 ? Math.atan2(-F.x, -F.z) + 0.35 : 0.6, dx = Math.sin(a), dz = Math.cos(a), rx = dz, rz = -dx;     // camera sits between the focus and the map centre
      const hm = map.height, D = 58, cx = F.x + dx * D, cz = F.z + dz * D, cam = new T.PerspectiveCamera(50, SHOT.w / SHOT.h, 1, 1500);
      cam.position.set(cx, Math.max(hm(cx, cz), hm(F.x, F.z)) + 21, cz); cam.lookAt(F.x - dx * 4, hm(F.x, F.z) + 3.2, F.z - dz * 4); cam.updateMatrixWorld(true);
      // the vehicle (with its driver) and the guardian stand in the scene
      const jeep = WZ.Vehicles.jeep(), cmdr = WZ.Heroes.commander(); jeep.seatCmdr.add(cmdr.root); cmdr.setMode('sit');
      const jx = F.x + rx * 7.5 + dx * 12, jz = F.z + rz * 7.5 + dz * 12; jeep.root.position.set(jx, hm(jx, jz), jz); jeep.root.rotation.y = Math.atan2(-dx, -dz) + 2.55; scene.add(jeep.root);
      const mat = new T.MeshLambertMaterial({ vertexColors: true }), rig = WZ.Giants.rigFor(theme, mat, 0);
      const gx = F.x - rx * 6 - dx * 3, gz = F.z - rz * 6 - dz * 3; rig.root.position.set(gx, hm(gx, gz), gz); rig.root.rotation.y = Math.atan2(dx, dz) + 0.45; rig.armR.rotation.x = -0.45; rig.armL.rotation.x = -0.2; scene.add(rig.root);
      view.followLight(F.x, hm(F.x, F.z), F.z);
      const P = WZ.Particles, pr = P && P.ready; if (P) P.ready = false;          // the scenery update must not spawn particles into the menu scene
      try { view.update(2.2, 0.016, cam); } finally { if (P) P.ready = pr; }
      const url = MP._render(scene, cam, SHOT.w, SHOT.h, 1, (px) => MP._canvas(px, SHOT.w, SHOT.h, SHOT.ow, SHOT.oh, 'image/jpeg', false));
      // clean up
      if (rig.dispose) rig.dispose(); mat.dispose(); G.disposeTree(jeep.root); if (cmdr.dispose) cmdr.dispose(); view.dispose(); scene.clear();
      WZ.Main.renderer.renderLists.dispose();
      return url;
    },

    // ------------------------------------------------------------------------------------------------ the guardian alone, transparent background
    _renderPortrait(theme) {
      const scene = new T.Scene(), mat = new T.MeshLambertMaterial({ vertexColors: true }), rig = WZ.Giants.rigFor(theme, mat, 0);
      rig.root.rotation.y = 0.5; rig.armR.rotation.x = -0.5; rig.armL.rotation.x = -0.25; rig.armR.rotation.z = 0.16; rig.armL.rotation.z = -0.16; scene.add(rig.root);
      scene.add(new T.HemisphereLight(0xFFFFFF, 0x6C7080, 0.95));
      const key = new T.DirectionalLight(0xFFFFFF, 0.85); key.position.set(3, 5, 6); scene.add(key);
      const rim = new T.DirectionalLight(RIM[theme] || 0xFFFFFF, 1.1); rim.position.set(-5, 3, -6); scene.add(rim);
      scene.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(rig.root), size = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
      const cam = new T.PerspectiveCamera(28, 1, 1, 300), dist = (Math.max(size.y, size.x * 1.05) / 2) / Math.tan(14 * Math.PI / 180) * 1.1;
      cam.position.set(c.x, c.y + size.y * 0.06, c.z + dist); cam.lookAt(c.x, c.y, c.z); cam.updateMatrixWorld(true);
      const url = MP._render(scene, cam, POR.s, POR.s, 0, (px) => MP._canvas(px, POR.s, POR.s, POR.o, POR.o, 'image/png', true));
      if (rig.dispose) rig.dispose(); mat.dispose(); scene.clear();
      return url;
    },
  };
  WZ.MapPreview = MP;
})(window.WZ = window.WZ || {});
