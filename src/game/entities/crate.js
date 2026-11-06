/* WZ.Crates — objective crates: wooden toy crate + tall additive smoke beam (billboarded) visible from afar.
 * States: idle -> carried (by Nana) -> flying (to the jeep bed) -> delivered. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, G = WZ.Geo, A = WZ.Assets, P = WZ.Props;
  const COLORS = { coin: 0xFFC21A, gold: 0xFFE070, time: 0x4CC2FF, part: 0xC96BFF, repair: 0x4CFF6A, tnt: 0xFF6A3A };

  class Crates {
    constructor(scene, map) {
      this.scene = scene; this.map = map; this.list = []; this.delivered = 0; this.onLanded = null;
      this.tmp = new T.Vector3();
      for (const c of map.crates) {
        const gy = map.height(c.x, c.z), mesh = P.crateMeshShared(2.2);
        mesh.position.set(c.x, gy + 0.95, c.z); mesh.rotation.y = (c.id * 1.3) % 6; scene.add(mesh);
        const mat = new T.MeshBasicMaterial({ map: A.tex('beam'), color: COLORS[c.type] || COLORS.coin, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide, opacity: 0.9 });
        const beam = new T.Mesh(G.beamPlane(), mat);
        beam.scale.set(6, CFG.crates.beamHeight, 1); beam.position.set(c.x, gy, c.z); beam.frustumCulled = false; scene.add(beam);
        this.list.push({ id: c.id, type: c.type, x: c.x, z: c.z, gy, state: 'idle', mesh, beam, mat, t: Math.random() * 6, carrier: null, from: new T.Vector3(), ft: 0, reserved: false });
      }
    }
    get total() { return this.list.length; }
    remaining() { let n = 0; for (const c of this.list) if (c.state !== 'delivered' && c.state !== 'flying') n++; return n; }
    nearestAvailable(x, z, r) {
      let best = null, bd = r * r;
      for (const c of this.list) { if (c.state !== 'idle') continue; const d = (c.x - x) * (c.x - x) + (c.z - z) * (c.z - z); if (d < bd) { bd = d; best = c; } }
      return best;
    }
    nearestAny(x, z) {
      let best = null, bd = 1e12;
      for (const c of this.list) { if (c.state === 'delivered' || c.state === 'flying') continue; const d = (c.x - x) * (c.x - x) + (c.z - z) * (c.z - z); if (d < bd) { bd = d; best = c; } }
      return best;
    }
    deliver(c, jeep) {
      c.state = 'flying'; c.ft = 0; c.carrier = null; c.from.copy(c.mesh.position); c.beam.visible = false; this.delivered++;
      c.jeep = jeep;
    }
    drop(c, x, z) {
      c.state = 'idle'; c.carrier = null; c.reserved = false; c.x = x; c.z = z; c.gy = this.map.height(x, z);
      c.mesh.position.set(x, c.gy + 0.95, z); c.mesh.scale.setScalar(1); c.beam.position.set(x, c.gy, z); c.beam.visible = true;
    }
    update(dt, t, camera) {
      const cp = camera.position;
      for (const c of this.list) {
        c.t += dt;
        if (c.state === 'idle') {
          c.mesh.position.y = c.gy + 0.95 + Math.sin(c.t * 2) * 0.1; c.mesh.rotation.y += Math.sin(c.t * 1.3) * 0.002;
          c.beam.rotation.y = Math.atan2(cp.x - c.x, cp.z - c.z);
          c.beam.scale.x = 6 * (1 + Math.sin(c.t * 3) * 0.1); c.mat.opacity = 0.78 + Math.sin(c.t * 4) * 0.16;
        } else if (c.state === 'carried' && c.carrier) {
          const n = c.carrier;
          c.mesh.position.set(n.rx, n.ry + 3.5 + Math.sin(c.t * 10) * 0.05, n.rz); c.mesh.rotation.y += dt * 2;
          const s = c.mesh.scale.x + (0.62 - c.mesh.scale.x) * Math.min(1, dt * 12); c.mesh.scale.setScalar(s);
          c.beam.visible = false;
        } else if (c.state === 'flying') {
          c.ft += dt / 0.5;
          const k = Math.min(1, c.ft); c.jeep.bedWorld(this.tmp);
          c.mesh.position.set(c.from.x + (this.tmp.x - c.from.x) * k, c.from.y + (this.tmp.y - c.from.y) * k + Math.sin(k * Math.PI) * 4, c.from.z + (this.tmp.z - c.from.z) * k);
          c.mesh.rotation.y += dt * 8; c.mesh.scale.setScalar(0.62 - 0.12 * k);
          if (k >= 1) { c.state = 'delivered'; c.mesh.visible = false; if (this.onLanded) this.onLanded(c); }
        }
      }
    }
    dispose() { for (const c of this.list) { this.scene.remove(c.mesh, c.beam); c.mat.dispose(); } this.list.length = 0; }
  }
  WZ.Crates = Crates;
})(window.WZ = window.WZ || {});
