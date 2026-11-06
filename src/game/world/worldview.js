/* WZ.WorldView.build(map, scene, opts) — turns map data into Three.js objects:
 * baked ground "splat" texture (roads, yards, building shadows), rolling hills, village merged per chunk+material,
 * border cliffs, sky dome, mountains, clouds, grass tufts, burning wreck, extraction zone, lights + fog. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, G = WZ.Geo, P = WZ.Props, R = WZ.RNG;
  const SPLAT = 1024, SPAN = 404;

  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };

  function paintGround(map) {
    const c = document.createElement('canvas'); c.width = c.height = SPLAT;
    const g = c.getContext('2d'), rng = R.mulberry32((map.seed ^ 0xABCDEF) >>> 0), k = SPLAT / SPAN;
    const px = (x) => (x + SPAN / 2) * k, pz = (z) => (z + SPAN / 2) * k;
    g.fillStyle = '#B59A5B'; g.fillRect(0, 0, SPLAT, SPLAT);
    const cols = ['#8F8B45', '#A38A4F', '#8A6A3F', '#B59A5B', '#9C9A55', '#C2A866'];
    for (let i = 0; i < 170; i++) {
      const x = rng() * SPLAT, y = rng() * SPLAT, r = 30 + rng() * 90, col = cols[(rng() * cols.length) | 0];
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hexA(col, 0.55)); gr.addColorStop(1, hexA(col, 0));
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // yards
    for (const cl of map.clusters) {
      const r = cl.r * 1.15 * k, x = px(cl.x), y = pz(cl.z), gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(138,106,63,.7)'); gr.addColorStop(0.7, 'rgba(138,106,63,.4)'); gr.addColorStop(1, 'rgba(138,106,63,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // roads
    g.lineCap = 'round'; g.lineJoin = 'round';
    const road = (w, col, a) => {
      g.strokeStyle = hexA(col, a); g.lineWidth = w * k;
      for (const r of map.roads) { g.beginPath(); g.moveTo(px(r.a.x), pz(r.a.z)); g.quadraticCurveTo(px(r.c.x), pz(r.c.z), px(r.b.x), pz(r.b.z)); g.stroke(); }
    };
    road(10, '#5E4629', 0.4); road(7.6, '#8A6A3F', 0.95); road(4.2, '#9D7C4E', 0.5);
    g.fillStyle = 'rgba(60,40,20,.3)';
    for (const p of map.roadPts) for (let i = 0; i < 3; i++) g.fillRect(px(p.x + (rng() - 0.5) * 6), pz(p.z + (rng() - 0.5) * 6), 1.6, 5);
    // start pad + extraction marking
    const s = map.start; g.fillStyle = 'rgba(94,70,41,.65)'; g.fillRect(px(s.x - 13), pz(s.z - 9), 26 * k, 18 * k);
    g.setLineDash([14, 10]); g.strokeStyle = 'rgba(236,233,225,.55)'; g.lineWidth = 3; g.strokeRect(px(s.x - 12), pz(s.z - 8), 24 * k, 16 * k);
    if (map.extract) {
      g.beginPath(); g.arc(px(map.extract.x), pz(map.extract.z), map.extract.r * k, 0, 7); g.fillStyle = 'rgba(80,110,50,.25)'; g.fill();
      g.strokeStyle = 'rgba(236,233,225,.5)'; g.lineWidth = 4; g.stroke();
    }
    g.setLineDash([]);
    // scorch under the wreck
    for (const f of map.fires) {
      const x = px(f.x), y = pz(f.z), r = 9 * k, gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(20,15,10,.8)'); gr.addColorStop(1, 'rgba(20,15,10,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // baked shadows (light from top-left => shadows fall toward +x,+z)
    const soft = (x, z, w, d, off, a) => {
      for (let s2 = 0; s2 <= 4; s2++) {
        const o = off * s2 / 4;
        for (let i = 0; i < 3; i++) { const e = (3 - i) * 0.8; g.fillStyle = 'rgba(35,22,10,' + a + ')'; g.fillRect(px(x - w / 2 - e + o), pz(z - d / 2 - e + o), (w + 2 * e) * k, (d + 2 * e) * k); }
      }
    };
    for (const h of map.houses) {
      g.fillStyle = 'rgba(50,38,26,.55)'; g.fillRect(px(h.x - h.w / 2 - 0.9), pz(h.z - h.d / 2 - 0.9), (h.w + 1.8) * k, (h.d + 1.8) * k);
      soft(h.x, h.z, h.w, h.d, h.h * 0.55, 0.06);
    }
    for (const w of map.walls) soft(w.x, w.z, w.axis === 'x' ? w.len : 1.4, w.axis === 'x' ? 1.4 : w.len, 2.4, 0.07);
    for (const t of map.towers) { g.strokeStyle = 'rgba(35,22,10,.22)'; g.lineWidth = 3.4 * k; g.beginPath(); g.moveTo(px(t.x), pz(t.z)); g.lineTo(px(t.x + 12), pz(t.z + 10)); g.stroke(); soft(t.x, t.z, 5, 5, 0.5, 0.1); }
    const blob = (x, z, r, a) => { const X = px(x), Y = pz(z), rr = r * k, gr = g.createRadialGradient(X, Y, 0, X, Y, rr); gr.addColorStop(0, 'rgba(35,22,10,' + a + ')'); gr.addColorStop(1, 'rgba(35,22,10,0)'); g.fillStyle = gr; g.fillRect(X - rr, Y - rr, rr * 2, rr * 2); };
    for (const r of map.rocks) blob(r.x + r.r * 0.4, r.z + r.r * 0.4, r.r * 1.6, 0.55);
    for (const t of map.trees) blob(t.x + 1.6 * t.s, t.z + 1.4 * t.s, 2.6 * t.s, t.dead ? 0.3 : 0.5);
    for (const t of map.tents) blob(t.x + 1, t.z + 1, 5, 0.5);
    for (const w of map.wrecks) blob(w.x + 1.5, w.z + 1.5, 6, 0.55);
    for (const sm of map.smalls) blob(sm.x + 0.5, sm.z + 0.5, sm.t === 'barrel' ? 1.1 : 1.2, 0.4);
    // speckles + grass flecks
    for (let i = 0; i < 24000; i++) {
      g.fillStyle = rng() < 0.5 ? 'rgba(60,45,20,.22)' : 'rgba(225,205,140,.22)';
      g.fillRect(rng() * SPLAT, rng() * SPLAT, 1 + rng() * 1.5, 1 + rng() * 1.5);
    }
    g.strokeStyle = 'rgba(143,139,69,.5)'; g.lineWidth = 1;
    for (let i = 0; i < 2600; i++) { const x = rng() * SPLAT, y = rng() * SPLAT; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rng() - 0.5) * 2, y - 3 - rng() * 3); g.stroke(); }
    const t = new T.CanvasTexture(c); t.anisotropy = 8; return t;
  }

  function tuftGeo() {
    const b = new G.Builder(), cols = [0xB59A5B, 0x8F8B45, 0xC9B06A, 0xA08A4A];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.283;
      b.add(G.cone(3), { x: Math.cos(a) * 0.22, z: Math.sin(a) * 0.22, y: 0.55, rz: Math.cos(a) * 0.25, rx: Math.sin(a) * 0.25, sx: 0.09, sy: 1.1, sz: 0.09, color: cols[i % 4] });
    }
    return b.build();
  }

  function skyDome() {
    const g = new T.SphereGeometry(900, 24, 14), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const stops = [[-1, '#D6E8F5'], [0, '#C4DFF3'], [0.06, '#A9D3F2'], [0.3, '#5FA2EA'], [0.65, '#3F8FE3'], [1, '#1F6FD1']];
    const cc = new T.Color(), c2 = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) / 900;
      let j = 0; while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
      const a = stops[j], b = stops[j + 1], u = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
      cc.set(a[1]); c2.set(b[1]); cc.lerp(c2, u);
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
    m.renderOrder = -10; m.frustumCulled = false;
    return m;
  }

  function build(map, scene, opts) {
    opts = opts || {};
    const q = opts.quality == null ? 2 : opts.quality;
    const group = new T.Group(); scene.add(group);
    const rng = R.create((map.seed ^ 0x77) | 0), half = map.half;
    const view = { group, map, smokeT: [], flames: [], extract: null };

    scene.fog = new T.Fog(0xB9D6EE, 100, 360);
    scene.background = new T.Color(0xA9D3F2);
    const hemi = new T.HemisphereLight(0xCFE6FF, 0xA88C5E, 0.64); scene.add(hemi);
    const sun = new T.DirectionalLight(0xFFE3B8, 0.86);
    sun.castShadow = CFG.quality.shadow[q] > 0;
    if (sun.castShadow) {
      const ss = sun.shadow; ss.mapSize.set(CFG.quality.shadow[q], CFG.quality.shadow[q]);
      const c = ss.camera; c.left = -20; c.right = 20; c.top = 20; c.bottom = -20; c.near = 10; c.far = 220;
      ss.bias = -0.0006; ss.normalBias = 0.35;
    }
    scene.add(sun); scene.add(sun.target);
    view.sun = sun; view.hemi = hemi;

    // ground
    const splat = paintGround(map);
    const gg = new T.PlaneGeometry(SPAN, SPAN, 100, 100); gg.rotateX(-Math.PI / 2);
    const gp = gg.attributes.position;
    for (let i = 0; i < gp.count; i++) gp.setY(i, map.height(gp.getX(i), gp.getZ(i)));
    gg.computeVertexNormals();
    const ground = new T.Mesh(gg, new T.MeshLambertMaterial({ map: splat }));
    ground.receiveShadow = true; group.add(ground);
    const outer = new T.Mesh(new T.PlaneGeometry(3400, 3400), new T.MeshLambertMaterial({ color: 0x9C8A52 }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -6; group.add(outer); // below any hill; hidden by the border cliffs

    // static village, merged per chunk + material
    const CH = CFG.world.chunk, nC = Math.ceil(map.size / CH), sets = [];
    for (let i = 0; i < nC * nC; i++) sets.push(P.newSet());
    const setAt = (x, z) => sets[Math.max(0, Math.min(nC - 1, Math.floor((z + half) / CH))) * nC + Math.max(0, Math.min(nC - 1, Math.floor((x + half) / CH)))];
    for (const h of map.houses) P.house(setAt(h.x, h.z), h.x, h.z, h.gy, h.w, h.d, h.h, rng, { red: h.red });
    for (const w of map.walls) P.wall(setAt(w.x, w.z), w.x, w.z, w.gy, w.len, w.axis, 1.4, 2.6, rng);
    for (const t of map.towers) P.tower(setAt(t.x, t.z), t.x, t.z, t.gy, t.h);
    for (const t of map.trees) P.tree(setAt(t.x, t.z), t.x, t.z, t.gy, t.s, t.dead, rng);
    for (const r of map.rocks) P.rock(setAt(r.x, r.z), r.x, r.z, r.gy, r.r, rng);
    for (const t of map.tents) P.camp(setAt(t.x, t.z), t.x, t.z, map.height(t.x, t.z));
    for (const f of map.flags) P.flagPole(setAt(f.x, f.z), f.x, f.z, map.height(f.x, f.z));
    for (const w of map.wrecks) P.wreck(setAt(w.x, w.z), w.x, w.z, w.gy, rng);
    sets.forEach((s) => P.setMeshes(s, group));
    const cl = P.newSet(); P.cliffs(cl, half, rng); P.setMeshes(cl, group);

    // grass tufts
    const nGrass = Math.min(map.grass.length, CFG.quality.grass[q]);
    if (nGrass > 0) {
      const gm = new T.InstancedMesh(tuftGeo(), new T.MeshLambertMaterial({ vertexColors: true }), nGrass);
      gm.frustumCulled = false;
      const d = new T.Object3D(), c = new T.Color();
      for (let i = 0; i < nGrass; i++) {
        const o = map.grass[i];
        d.position.set(o.x, map.height(o.x, o.z) - 0.05, o.z); d.rotation.set(0, o.r, 0); d.scale.set(o.s, o.s * (0.8 + (i % 5) * 0.12), o.s); d.updateMatrix();
        gm.setMatrixAt(i, d.matrix); const v = 0.8 + ((i * 37) % 30) / 100; c.setRGB(v, v, v * 0.95); gm.setColorAt(i, c);
      }
      group.add(gm);
    }

    // sky, mountains, clouds, sun glow
    view.sky = skyDome(); scene.add(view.sky);
    view.mountains = P.mountains(R.create(map.seed ^ 0x33)); scene.add(view.mountains);
    view.clouds = P.clouds(R.create(map.seed ^ 0x44)); scene.add(view.clouds);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: WZ.Assets.tex('glow'), color: 0xFFE9B0, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.8 }));
    glow.scale.set(340, 340, 1); glow.renderOrder = -9; scene.add(glow); view.glow = glow;

    // fires (burning wreck)
    for (const f of map.fires) {
      const fl = P.flames(); fl.group.position.set(f.x, f.gy + 2.4, f.z); fl.group.scale.setScalar(1.7); group.add(fl.group); view.flames.push(fl);
    }
    for (const s of map.smokes) view.smokeT.push({ x: s.x, y: s.gy, z: s.z, t: Math.random() });

    // extraction zone
    if (map.extract && !opts.menu) {
      const ex = map.extract, eg = new T.Group();
      const conform = (geo) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, map.height(ex.x + p.getX(i), ex.z + p.getZ(i)) + 0.3); };
      const ringG = new T.RingGeometry(ex.r - 1.1, ex.r, 72, 1); ringG.rotateX(-Math.PI / 2); conform(ringG);
      const discG = new T.RingGeometry(0.01, ex.r - 1.1, 48, 5); discG.rotateX(-Math.PI / 2); conform(discG);
      const mk = (geo, op) => new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x4CFF6A, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }));
      const ring = mk(ringG, 0.8), disc = mk(discG, 0.14);
      eg.add(ring, disc); eg.position.set(ex.x, 0, ex.z);
      ringG.translate(0, 0, 0);
      const beam = new T.Mesh(G.beamPlane(), new T.MeshBasicMaterial({ map: WZ.Assets.tex('beam'), color: 0x4CFF6A, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide, opacity: 0.9 }));
      beam.scale.set(9, 130, 1); beam.position.set(0, map.height(ex.x, ex.z), 0); eg.add(beam);
      group.add(eg);
      view.extract = {
        group: eg, active: false,
        setActive(on) { this.active = on; ring.material.opacity = on ? 0.9 : 0.28; disc.material.opacity = on ? 0.2 : 0.05; beam.visible = on; },
        update(t, cam) {
          const pul = 1 + Math.sin(t * 4) * 0.015; eg.scale.set(pul, 1, pul);
          disc.material.opacity = (this.active ? 0.16 : 0.05) + (this.active ? Math.sin(t * 4) * 0.06 : 0);
          beam.rotation.y = Math.atan2(cam.position.x - ex.x, cam.position.z - ex.z);
          beam.scale.x = 9 * (1 + Math.sin(t * 3) * 0.1);
        },
      };
      view.extract.setActive(false);
    }

    const tmp = new T.Vector3();
    view.followLight = (x, y, z) => {
      x = Math.round(x * 2) / 2; z = Math.round(z * 2) / 2;
      sun.position.set(x - 34, y + 62, z - 28); sun.target.position.set(x, y, z); sun.target.updateMatrixWorld();
      view.glow.position.set(x - 34 * 9, y + 62 * 9, z - 28 * 9);
    };
    view.followLight(map.start.x, 0, map.start.z);

    /** per-frame: sky follows camera, flames flicker, smoke columns emit */
    view.update = (t, dt, camera) => {
      view.sky.position.copy(camera.position);
      view.mountains.position.set(camera.position.x, 0, camera.position.z);
      view.clouds.position.set(camera.position.x * 0.9 + t * 3, 0, camera.position.z * 0.9);
      view.glow.position.copy(camera.position).add(tmp.set(-34, 62, -28).normalize().multiplyScalar(820));
      if (view.extract) view.extract.update(t, camera);
      for (const fl of view.flames) fl.parts.forEach((m, i) => { const s = 1 + Math.sin(t * (9 + i * 3) + i) * 0.18; m.scale.y = (2.6 - i * 0.4) * s; m.rotation.y = t * (1 + i); m.material.opacity = 0.7 + Math.sin(t * 13 + i) * 0.15; });
      const Pt = WZ.Particles;
      if (Pt && Pt.ready) {
        for (const s of view.smokeT) {
          const dx = s.x - camera.position.x, dz = s.z - camera.position.z;
          if (dx * dx + dz * dz > 260 * 260) continue;
          s.t -= dt;
          if (s.t <= 0) {
            s.t = 0.22 / CFG.quality.particles[Math.max(0, WZ.Quality ? WZ.Quality.level : 2)];
            Pt.emit(0, s.x + (Math.random() - 0.5) * 1.5, s.y, s.z + (Math.random() - 0.5) * 1.5, 1.4, 7 + Math.random() * 2, 0.8, 6 + Math.random() * 2, 3, 15, 0.23, 0.23, 0.24, 0.5, 0, -0.3, 0.2);
          }
        }
        for (const f of map.fires) {
          if (Math.random() < dt * 14) Pt.emit(1, f.x + (Math.random() - 0.5) * 1.4, f.gy + 2.6, f.z + (Math.random() - 0.5) * 1.4, (Math.random() - 0.5), 4 + Math.random() * 3, (Math.random() - 0.5), 0.7, 1.4, 0.2, 1, 0.55, 0.15, 0.9, 0, -2, 0.5);
        }
      }
    };

    view.dispose = () => {
      G.disposeTree(group); G.disposeTree(view.sky); G.disposeTree(view.mountains); G.disposeTree(view.clouds);
      splat.dispose();
      scene.remove(group, view.sky, view.mountains, view.clouds, view.glow, hemi, sun, sun.target);
      if (sun.shadow.map) sun.shadow.map.dispose();
      scene.fog = null;
    };
    return view;
  }

  WZ.WorldView = { build };
})(window.WZ = window.WZ || {});
