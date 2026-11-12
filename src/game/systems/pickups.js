/* WZ.Pickups — rare collectibles lying around the map (off in the tutorial). Drive over them with the VEHICLE:
 *   HEART  (repair): restores CFG.pickups.heal.healPct of the vehicle's max armor. Not used up while the armor is already full.
 *   CLOCK  (time):   adds CFG.pickups.time.bonus seconds (one minute by default) to the mission timer.
 * They hover and spin above a glowing ring with a tall light beam (visible from afar) and sparkle particles; a small arrow appears when one is near.
 * Placement is seeded, reachable by the vehicle (flood fill from the start), away from the start, crates, extraction and hazards. All numbers: CFG.pickups. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, PC = CFG.pickups, U = WZ.U, G = WZ.Geo;
  const d2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);
  const KIND = {
    heal: { color: 0xFF4A6A, rgb: [1, 0.35, 0.5], arrow: 'heal', label: 'hud.pk.heal' },
    time: { color: 0x46D0FF, rgb: [0.3, 0.85, 1], arrow: 'time', label: 'hud.pk.time' },
  };

  function heartGeo() {
    const s = new T.Shape();
    s.moveTo(0, -1.05); s.bezierCurveTo(-0.25, -0.8, -1.25, -0.2, -1.12, 0.52); s.bezierCurveTo(-1.0, 1.18, -0.2, 1.22, 0, 0.62);
    s.bezierCurveTo(0.2, 1.22, 1.0, 1.18, 1.12, 0.52); s.bezierCurveTo(1.25, -0.2, 0.25, -0.8, 0, -1.05);
    const g = new T.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.2, bevelSegments: 3, curveSegments: 12 });
    g.translate(0, 0, -0.275); return g;
  }

  /** clock model: gold rim, cream face, 12 ticks, two hands (returned for animation), alarm bells */
  function clockModel(geos, mats) {
    const g = new T.Group(), L = (o) => { const m = new T.MeshLambertMaterial(o); mats.push(m); return m; };
    const rimG = new T.TorusGeometry(1.12, 0.22, 10, 28), faceG = new T.CircleGeometry(1.12, 28), bellG = new T.SphereGeometry(0.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), tickG = new T.BoxGeometry(0.1, 0.24, 0.06), handG = new T.BoxGeometry(1, 1, 0.07), hubG = new T.SphereGeometry(0.13, 8, 6);
    geos.push(rimG, faceG, bellG, tickG, handG, hubG);
    const gold = L({ color: 0xFFC21A, emissive: 0x4a3200 }), cream = L({ color: 0xFFF6DC, emissive: 0x2a2a22 }), dark = L({ color: 0x1B1D1F }), red = L({ color: 0xE23A2A });
    g.add(new T.Mesh(rimG, gold)); const face = new T.Mesh(faceG, cream); face.position.z = -0.02; g.add(face);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, t = new T.Mesh(tickG, dark); t.position.set(Math.sin(a) * 0.88, Math.cos(a) * 0.88, 0.05); t.rotation.z = -a; if (i % 3 === 0) t.scale.set(1.6, 1.3, 1); g.add(t); }
    for (const s of [-1, 1]) { const b = new T.Mesh(bellG, red); b.position.set(0.82 * s, 1.0, 0); b.rotation.z = -0.62 * s; g.add(b); }
    const mk = (w, h, y) => { const p = new T.Group(); const m = new T.Mesh(handG, dark); m.scale.set(w, h, 1); m.position.y = h / 2 - 0.08; p.add(m); p.position.z = 0.08; g.add(p); return p; };
    const hour = mk(0.14, 0.62), minute = mk(0.1, 0.9); const hub = new T.Mesh(hubG, red); hub.position.z = 0.12; g.add(hub);
    return { g, hour, minute };
  }

  const Pk = {
    ctx: null, list: [], geos: [], mats: [], note: 0, heartG: null, sparkT: 0,

    init(ctx, mission, seed) {
      Pk.dispose(); Pk.ctx = ctx; Pk.note = 0; Pk.list = [];
      const m = mission.index;
      if (mission.tutorial || m < PC.fromMission) return;
      const map = ctx.map, col = ctx.col, rng = WZ.RNG.create(seed), lim = map.half - 24, st = map.start, ex = map.extract, nav = map.nav && map.nav.jeep;
      const reach = nav ? nav.flood(st.x, st.z) : null, Hz = WZ.Hazards || {}, bad = [].concat(Hz.mines || [], Hz.barrels || [], Hz.pits || []);
      const want = [];
      for (let i = 0; i < PC.heal.count(m); i++) want.push('heal');
      for (let i = 0; i < PC.time.count(m); i++) want.push('time');
      const placed = [];
      const ok = (x, z) => {
        if (Math.abs(x) > lim || Math.abs(z) > lim || d2(x, z, st.x, st.z) < PC.minFromStart * PC.minFromStart) return false;
        if (ex && d2(x, z, ex.x, ex.z) < PC.minFromExtract * PC.minFromExtract) return false;
        for (const c of map.crates) if (d2(x, z, c.x, c.z) < PC.minFromCrate * PC.minFromCrate) return false;
        for (const o of placed) if (d2(x, z, o.x, o.z) < PC.minGap * PC.minGap) return false;
        for (const b of bad) if (d2(x, z, b.x, b.z) < 49) return false;
        if (reach && !reach[nav.idx(x, z)]) return false;
        if (map.noHazard && map.noHazard(x, z)) return false;     // never in the river / on a bridge
        return col.free(x, z, 2.6);
      };
      for (const type of want) {
        for (let g = 0; g < 800; g++) {
          let x, z;
          if (map.roadPts.length && rng.chance(0.5)) { const p = rng.pick(map.roadPts); x = p.x + rng.range(-9, 9); z = p.z + rng.range(-9, 9); } else { x = rng.range(-lim, lim); z = rng.range(-lim, lim); }
          if (ok(x, z)) { const o = { type, x, z }; placed.push(o); break; }
        }
      }
      // meshes
      const sc = ctx.scene, tex = WZ.Assets.tex;
      Pk.heartG = heartGeo(); Pk.geos.push(Pk.heartG);
      const ringG = new T.RingGeometry(2.0, 2.55, 40).rotateX(-Math.PI / 2), discG = new T.CircleGeometry(2.0, 32).rotateX(-Math.PI / 2); Pk.geos.push(ringG, discG);
      const heartM = new T.MeshLambertMaterial({ color: 0xFF2E52, emissive: 0x80101f }); Pk.mats.push(heartM);
      for (const o of placed) {
        const K = KIND[o.type], root = new T.Group(), gy = map.height(o.x, o.z);
        const add = (c, op, extra) => new T.MeshBasicMaterial(Object.assign({ color: c, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }, extra || {}));
        const ringM = add(K.color, 0.8), discM = add(K.color, 0.2), beamM = add(K.color, 0.55, { map: tex('beam') }), glowM = new T.SpriteMaterial({ map: tex('glow'), color: K.color, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.9 });
        Pk.mats.push(ringM, discM, beamM, glowM);
        const ring = new T.Mesh(ringG, ringM), disc = new T.Mesh(discG, discM); ring.position.y = disc.position.y = 0.35; root.add(ring, disc);
        const beam = new T.Mesh(G.beamPlane(), beamM); beam.scale.set(4.2, 46, 1); beam.position.y = 0.2; beam.frustumCulled = false; root.add(beam);
        const glow = new T.Sprite(glowM); glow.scale.set(8, 8, 1); glow.position.y = PC.hover; root.add(glow);
        let item, hour = null, minute = null;
        if (o.type === 'heal') { item = new T.Mesh(Pk.heartG, heartM); item.scale.setScalar(1.45); item.castShadow = true; }
        else { const cm = clockModel(Pk.geos, Pk.mats); item = cm.g; hour = cm.hour; minute = cm.minute; item.scale.setScalar(1.55); }
        item.position.y = PC.hover; root.add(item);
        root.position.set(o.x, gy, o.z); sc.add(root);
        Pk.list.push({ type: o.type, x: o.x, z: o.z, gy, on: true, root, item, glow, beam, ring, hour, minute, ph: rng.range(0, 6.28), t: 0, K });
      }
    },

    /** arrow targets for the HUD (nearby, still available) */
    arrows(px, pz, out) {
      out.length = 0;
      for (const p of Pk.list) { if (p.on && d2(p.x, p.z, px, pz) < PC.arrowRange * PC.arrowRange) out.push(p); }
      return out;
    },

    update(dt) {
      const c = Pk.ctx; if (!c || !Pk.list.length) return;
      const J = c.jeep; if (Pk.note > 0) Pk.note -= dt;
      for (const p of Pk.list) {
        if (!p.on) continue;
        if (!J.alive || d2(p.x, p.z, J.x, J.z) > (PC.radius + J.P.radius + 0.6) * (PC.radius + J.P.radius + 0.6)) continue;
        if (p.type === 'heal') {
          if (J.hp >= J.maxHp - 0.5) { if (Pk.note <= 0) { Pk.note = 1.4; WZ.Fx.text(WZ.I18n.t('hud.healfull'), J.rx, J.ry + 5, J.rz, 'warn'); } continue; }
          const n = Math.max(1, Math.round(J.maxHp * PC.heal.healPct)), before = J.hp; J.heal(n);
          WZ.Fx.text(WZ.I18n.t('hud.healup', { n: Math.round(J.hp - before) }), J.rx, J.ry + 6, J.rz, 'good');
          c.particles.sparks(J.x, J.ry + 2.4, J.z, 22, 1, 0.45, 0.6); WZ.Audio.sfx('pickup');
        } else {
          const s = PC.time.bonus; if (c.addTime) c.addTime(s);
          WZ.Fx.text(WZ.I18n.t('hud.timeup', { s }), J.rx, J.ry + 6, J.rz, 'good');
          c.particles.sparks(J.x, J.ry + 2.4, J.z, 22, 0.35, 0.85, 1); WZ.Audio.sfx('clock'); if (WZ.UI.pulseTimer) WZ.UI.pulseTimer();
        }
        p.on = false; p.root.visible = false; WZ.Fx.flash('good'); c.particles.stars(p.x, p.gy + 2.5, p.z, 6);
      }
    },

    render(dt, tm) {
      const c = Pk.ctx; if (!c || !Pk.list.length) return; const cam = WZ.Cam.cam, P = c.particles;
      Pk.sparkT -= dt; const spark = Pk.sparkT <= 0; if (spark) Pk.sparkT = 0.12;
      for (const p of Pk.list) {
        if (!p.on) continue;
        p.t += dt; const bob = Math.sin(tm * 2.4 + p.ph) * PC.bob, pulse = 1 + Math.sin(tm * 5 + p.ph) * 0.08;
        p.item.position.y = PC.hover + bob; p.glow.position.y = PC.hover + bob; p.glow.scale.setScalar(8 * pulse);
        p.beam.rotation.y = Math.atan2(cam.position.x - p.x, cam.position.z - p.z); p.beam.scale.x = 4.2 * (1 + Math.sin(tm * 3 + p.ph) * 0.1);
        p.ring.scale.setScalar(1 + 0.06 * Math.sin(tm * 4 + p.ph));
        if (p.type === 'heal') { p.item.rotation.y = tm * 2.2 + p.ph; p.item.scale.setScalar(1.45 * (1 + 0.06 * Math.max(0, Math.sin(tm * 6)))); }
        else {
          p.item.rotation.set(-0.55, WZ.Cam.yaw + Math.PI + Math.sin(tm * 1.6 + p.ph) * 0.45, 0, 'YXZ');
          p.minute.rotation.z = -tm * 3.2; p.hour.rotation.z = -tm * 3.2 / 12;
        }
        if (spark) { const k = p.K.rgb; P.emit(1, p.x + (Math.random() - 0.5) * 3, p.gy + 0.6, p.z + (Math.random() - 0.5) * 3, 0, 2.4 + Math.random() * 1.4, 0, 1.1, 0.55, 0.1, k[0], k[1], k[2], 0.9, 0, 0, 0.6); }
      }
    },

    dispose() {
      const c = Pk.ctx;
      if (c) for (const p of Pk.list) c.scene.remove(p.root);
      for (const g of Pk.geos) g.dispose(); for (const m of Pk.mats) m.dispose();
      Pk.geos = []; Pk.mats = []; Pk.list = []; Pk.ctx = null; Pk.heartG = null;
    },
  };
  WZ.Pickups = Pk;
})(window.WZ = window.WZ || {});
