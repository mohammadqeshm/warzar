/* WZ.Crates — objective crates: wooden supply crate + ground halo ring + tall additive smoke beam (billboarded) visible from afar.
 * Guard Lock Rule: A crate guarded by a living guardian (WZ.Giants.guardOf(crate)) is LOCKED and visually dimmed (crate, ground ring, beam, and HUD arrow).
 * Killing the crate's guardian unlocks the crate and makes the crate, its ground ring, its beam, and its arrow bright and vivid!
 * States: idle -> carried (by Nana) -> flying (to the jeep bed) -> delivered. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, G = WZ.Geo, A = WZ.Assets, P = WZ.Props;
  const COLORS = { coin: 0xFFC21A, gold: 0xFFE070, time: 0x4CC2FF, part: 0xC96BFF, repair: 0x4CFF6A, tnt: 0xFF6A3A };
  let ringGeo = null, discGeo = null;

  class Crates {
    constructor(scene, map) {
      this.scene = scene; this.map = map; this.list = []; this.delivered = 0; this.onLanded = null;
      this.tmp = new T.Vector3();
      if (!ringGeo) ringGeo = new T.RingGeometry(2.75, 3.35, 48).rotateX(-Math.PI / 2);
      if (!discGeo) discGeo = new T.CircleGeometry(2.75, 36).rotateX(-Math.PI / 2);

      for (const c of map.crates) {
        const gy = map.height(c.x, c.z), mesh = P.crateMesh(2.2);
        mesh.material.transparent = true;
        mesh.position.set(c.x, gy + 0.95, c.z); mesh.rotation.y = (c.id * 1.3) % 6; scene.add(mesh);

        const baseCol = COLORS[c.type] || COLORS.coin;
        const mat = new T.MeshBasicMaterial({ map: A.tex('beam'), color: baseCol, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide, opacity: 0.9 });
        const beam = new T.Mesh(G.beamPlane(), mat);
        beam.scale.set(6, CFG.crates.beamHeight, 1); beam.position.set(c.x, gy, c.z); beam.frustumCulled = false; scene.add(beam);

        // Ground halo ring & inner glow disc ("حلقه دور جعبه")
        const ringMat = new T.MeshBasicMaterial({ color: baseCol, transparent: true, opacity: 0.2, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide });
        const discMat = new T.MeshBasicMaterial({ color: baseCol, transparent: true, opacity: 0.04, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide });
        const ringGrp = new T.Group();
        const rMesh = new T.Mesh(ringGeo, ringMat), dMesh = new T.Mesh(discGeo, discMat);
        rMesh.renderOrder = dMesh.renderOrder = 14;
        ringGrp.add(dMesh, rMesh);
        ringGrp.position.set(c.x, gy + 0.16, c.z);
        scene.add(ringGrp);

        this.list.push({
          id: c.id, type: c.type, baseCol, x: c.x, z: c.z, gy, state: 'idle',
          mesh, beam, mat, ringGrp, ringMat, discMat,
          t: Math.random() * 6, carrier: null, from: new T.Vector3(), ft: 0, reserved: false,
          wasGuarded: null, unlockPop: 0,
        });
      }
    }
    get total() { return this.list.length; }
    remaining() { let n = 0; for (const c of this.list) if (c.state !== 'delivered' && c.state !== 'flying') n++; return n; }

    /** True while this crate's guardian (Giant / Dino / Titan / Beast / Mech) is still alive */
    isGuarded(c) {
      return !!(c && WZ.Giants && WZ.Giants.guardOf && WZ.Giants.guardOf(c));
    }

    /** Nearest UNLOCKED (guardian killed) idle crate within radius r */
    nearestAvailable(x, z, r) {
      let best = null, bd = r * r;
      for (const c of this.list) {
        if (c.state !== 'idle' || this.isGuarded(c)) continue;
        const d = (c.x - x) * (c.x - x) + (c.z - z) * (c.z - z);
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    }

    /** Nearest LOCKED (guardian still alive) idle crate within radius r */
    nearestGuarded(x, z, r) {
      let best = null, bd = r * r;
      for (const c of this.list) {
        if (c.state !== 'idle' || !this.isGuarded(c)) continue;
        const d = (c.x - x) * (c.x - x) + (c.z - z) * (c.z - z);
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    }

    nearestAny(x, z) {
      let best = null, bd = 1e12;
      for (const c of this.list) { if (c.state === 'delivered' || c.state === 'flying') continue; const d = (c.x - x) * (c.x - x) + (c.z - z) * (c.z - z); if (d < bd) { bd = d; best = c; } }
      return best;
    }
    deliver(c, jeep) {
      c.state = 'flying'; c.ft = 0; c.carrier = null; c.from.copy(c.mesh.position); c.beam.visible = false;
      if (c.ringGrp) c.ringGrp.visible = false;
      this.delivered++;
      c.jeep = jeep;
    }
    drop(c, x, z) {
      c.state = 'idle'; c.carrier = null; c.reserved = false; c.x = x; c.z = z; c.gy = this.map.height(x, z);
      c.mesh.position.set(x, c.gy + 0.95, z); c.mesh.scale.setScalar(1); c.beam.position.set(x, c.gy, z); c.beam.visible = true;
      if (c.ringGrp) { c.ringGrp.position.set(x, c.gy + 0.16, z); c.ringGrp.visible = true; }
    }
    update(dt, t, camera) {
      const cp = camera.position;
      for (const c of this.list) {
        c.t += dt;
        if (c.state === 'idle') {
          const guarded = this.isGuarded(c);
          if (c.wasGuarded === null) c.wasGuarded = guarded;
          else if (c.wasGuarded && !guarded) {
            // Guardian was just killed -> unlock crate with visual/audio celebration!
            c.wasGuarded = false;
            c.unlockPop = 1.0;
            if (WZ.Audio) WZ.Audio.sfx('pickup', 0.85);
            if (WZ.Particles) WZ.Particles.sparks(c.x, c.gy + 2.2, c.z, 18, 1, 0.85, 0.25);
            if (WZ.Fx && WZ.I18n) WZ.Fx.text(WZ.I18n.t('hud.crateUnlocked'), c.x, c.gy + 5.2, c.z, 'good');
          }
          if (c.unlockPop > 0) c.unlockPop = Math.max(0, c.unlockPop - dt * 2.2);

          c.beam.rotation.y = Math.atan2(cp.x - c.x, cp.z - c.z);
          if (c.ringGrp) c.ringGrp.visible = true;

          if (guarded) {
            // LOCKED STATE (Guardian alive): dimmed, pale crate, faint beam, and pale ground ring
            c.mesh.position.y = c.gy + 0.92 + Math.sin(c.t * 1.4) * 0.05;
            c.mesh.scale.setScalar(0.96);
            c.mesh.material.color.setRGB(0.42, 0.42, 0.46);
            c.mesh.material.emissive.setRGB(0, 0, 0);
            c.mesh.material.opacity = 0.50;

            c.mat.color.setHex(0x8A8E96);
            c.beam.scale.x = 3.6 * (1 + Math.sin(c.t * 2) * 0.05);
            c.mat.opacity = 0.16 + Math.sin(c.t * 2.5) * 0.04;

            if (c.ringGrp) {
              c.ringGrp.scale.setScalar(1);
              c.ringMat.color.setHex(0x8A8E96);
              c.ringMat.opacity = 0.18 + Math.sin(c.t * 2.5) * 0.04;
              c.discMat.color.setHex(0x8A8E96);
              c.discMat.opacity = 0.035;
            }
          } else {
            // UNLOCKED STATE (Guardian dead): vivid, bright glowing crate, tall bright beam, and vibrant ground ring!
            const pop = c.unlockPop || 0;
            c.mesh.position.y = c.gy + 0.98 + Math.sin(c.t * 2.8) * 0.13 + pop * 0.6;
            c.mesh.rotation.y += Math.sin(c.t * 1.6) * 0.004 + pop * dt * 4;
            c.mesh.scale.setScalar(1 + pop * 0.22);
            c.mesh.material.color.setRGB(1, 1, 1);
            const em = 0.22 + 0.12 * Math.sin(c.t * 5) + pop * 0.45;
            c.mesh.material.emissive.setRGB(em, em * 0.72, em * 0.14);
            c.mesh.material.opacity = 1.0;

            c.mat.color.setHex(c.baseCol);
            c.beam.scale.x = 6.8 * (1 + Math.sin(c.t * 3.2) * 0.12 + pop * 0.3);
            c.mat.opacity = Math.min(1, 0.86 + Math.sin(c.t * 4.5) * 0.14 + pop * 0.2);

            if (c.ringGrp) {
              const rp = 1 + Math.sin(c.t * 4.2) * 0.045 + pop * 0.28;
              c.ringGrp.scale.set(rp, 1, rp);
              c.ringMat.color.setHex(c.baseCol);
              c.ringMat.opacity = Math.min(1, 0.85 + Math.sin(c.t * 5) * 0.15 + pop * 0.2);
              c.discMat.color.setHex(c.baseCol);
              c.discMat.opacity = 0.20 + Math.sin(c.t * 5) * 0.07;
            }
          }
        } else if (c.state === 'carried' && c.carrier) {
          const n = c.carrier;
          c.mesh.material.color.setRGB(1, 1, 1);
          c.mesh.material.emissive.setRGB(0.12, 0.08, 0.01);
          c.mesh.material.opacity = 1.0;
          c.mesh.position.set(n.rx, n.ry + 3.5 + Math.sin(c.t * 10) * 0.05, n.rz); c.mesh.rotation.y += dt * 2;
          const s = c.mesh.scale.x + (0.62 - c.mesh.scale.x) * Math.min(1, dt * 12); c.mesh.scale.setScalar(s);
          c.beam.visible = false;
          if (c.ringGrp) c.ringGrp.visible = false;
        } else if (c.state === 'flying') {
          c.mesh.material.color.setRGB(1, 1, 1);
          c.mesh.material.emissive.setRGB(0, 0, 0);
          c.mesh.material.opacity = 1.0;
          c.ft += dt / 0.5;
          const k = Math.min(1, c.ft); c.jeep.bedWorld(this.tmp);
          c.mesh.position.set(c.from.x + (this.tmp.x - c.from.x) * k, c.from.y + (this.tmp.y - c.from.y) * k + Math.sin(k * Math.PI) * 4, c.from.z + (this.tmp.z - c.from.z) * k);
          c.mesh.rotation.y += dt * 8; c.mesh.scale.setScalar(0.62 - 0.12 * k);
          if (k >= 1) { c.state = 'delivered'; c.mesh.visible = false; if (this.onLanded) this.onLanded(c); }
        }
      }
    }
    dispose() {
      for (const c of this.list) {
        this.scene.remove(c.mesh, c.beam);
        if (c.ringGrp) this.scene.remove(c.ringGrp);
        if (c.mesh.material && !c.mesh.material.userData.shared) c.mesh.material.dispose();
        c.mat.dispose();
        if (c.ringMat) c.ringMat.dispose();
        if (c.discMat) c.discMat.dispose();
      }
      this.list.length = 0;
    }
  }
  WZ.Crates = Crates;
})(window.WZ = window.WZ || {});
