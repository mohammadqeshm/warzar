/* WZ.Jeep — arcade driving (no physics engine). The stick sets a TARGET heading + throttle; the jeep steers toward it
 * with inertia and a little drift. Big obstacles block (two collision circles), small props are knocked away,
 * auto-unstick, boost with cooldown. */
(function (WZ) {
  'use strict';
  const CFG = WZ.CFG, U = WZ.U, J = CFG.jeep;
  const tmp = { x: 0, z: 0 };

  class Jeep {
    constructor(map, col, scene) {
      this.map = map; this.col = col; this.scene = scene;
      const sv = WZ.Save.data, vid = (sv.owned.vehicles.indexOf(sv.equipped.vehicle) >= 0 && CFG.vehicles[sv.equipped.vehicle]) ? sv.equipped.vehicle : 'jeep';
      this.id = vid; this.P = WZ.Vehicles.stats(vid); this.model = WZ.Vehicles.build(vid); this.mesh = this.model.root; this.mesh.rotation.order = 'YXZ';
      scene.add(this.mesh);
      const s = map.start;
      this.x = s.x; this.z = s.z; this.h = s.heading; this.px = this.x; this.pz = this.z; this.ph = this.h;
      this.vx = 0; this.vz = 0; this.speed = 0; this.sF = 0; this.sL = 0; this.acc = 0;
      this.hp = this.P.hp; this.maxHp = this.P.hp; this.alive = true;
      this.boostT = 0; this.boostCd = 0; this.boosting = false;
      this.throttle = 0; this.targetH = this.h; this.steer = 0; this.stuckT = 0; this.unstick = 0; this.udx = 0; this.udz = 0;
      this.impact = 0; this.wheelRot = 0; this.crates = 0; this.hurtT = 0; this.rollV = 0; this.pitchV = 0;
      this.cmdr = WZ.Heroes.commander(); this.model.seatCmdr.add(this.cmdr.root); this.cmdr.setMode('sit');
      this.t = 0; this.hop = 0;
      // tornado hooks (WZ.Hazards): captive = whirled around the funnel (no control), slow = top-speed multiplier for this step, lift/tilt = visual
      this.captive = null; this.slow = 1; this.lift = 0; this.tiltX = 0; this.tiltZ = 0;
      // river hooks (Jurassic map, set by the mission each step): wade 0..1 = how deep in the water we are, curX/curZ = unit flow direction
      this.wade = 0; this.curX = 1; this.curZ = 0;
    }
    get boostReady() { return this.boostCd <= 0 && this.boostT <= 0; }
    get boostPct() { return this.boostT > 0 ? 1 : 1 - Math.max(0, this.boostCd) / (J.boostCooldown); }

    localToWorld(lx, lz, out) {
      const c = Math.cos(this.h), s = Math.sin(this.h);
      out.x = this.x + lx * c + lz * s; out.z = this.z - lx * s + lz * c; return out;
    }
    bedWorld(v) {
      const gy = this.map.height(this.x, this.z), c = Math.sin(this.h), s = Math.cos(this.h);
      const bd = this.model.bed, bz = bd ? -bd.z : 1.75, by = bd ? bd.y : 2.4;
      v.set(this.x - c * bz, gy + by, this.z - s * bz); return v;
    }

    step(dt, inp, camYaw) {
      const J = this.P;
      this.px = this.x; this.pz = this.z; this.ph = this.h;
      if (!this.alive) {
        if (this.inPit) {
          this.x = U.damp(this.x, this.inPit.x, 8, dt);
          this.z = U.damp(this.z, this.inPit.z, 8, dt);
          this.pitSink = Math.min(3.5, (this.pitSink || 0) + dt * 5.2);
          this.speed = 0;
          return;
        }
        this.vx *= Math.exp(-3 * dt); this.vz *= Math.exp(-3 * dt); this.x += this.vx * dt; this.z += this.vz * dt; this.speed = Math.hypot(this.vx, this.vz); return;
      }
      if (this.captive) { // caught by the tornado: the hazard system moves us, the driver has no control at all
        this.speed = Math.hypot(this.vx, this.vz); this.boosting = false; this.throttle = 0; this.unstick = 0; this.stuckT = 0;
        this.wheelRot += 14 * dt; this.steer = U.damp(this.steer, 0.4, 6, dt);
        if (this.hurtT > 0) this.hurtT -= dt;
        if (this.hop > 0) this.hop -= dt;
        return;
      }
      const slow = this.slow; this.slow = 1;
      const wade = this.wade; this.wade = 0;
      let mag = inp.mag;
      if (mag > 0.05) {
        const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
        this.targetH = Math.atan2(fx * inp.y - fz * inp.x, fz * inp.y + fx * inp.x);
      }
      if (inp.boost && this.boostReady) { this.boostT = J.boostTime; this.boostCd = J.boostCooldown; WZ.Audio.sfx('boost'); this.justBoosted = true; }
      if (this.boostCd > 0) this.boostCd -= dt;
      const boosting = this.boostT > 0; if (boosting) this.boostT -= dt;
      this.boosting = boosting;

      if (this.unstick > 0) { this.unstick -= dt; this.targetH = Math.atan2(this.udx, this.udz); mag = 1; }
      const active = mag > 0.05 || boosting;
      this.throttle = active ? Math.max(mag, boosting ? 1 : 0) : 0;
      let h = this.h, diff = 0;
      if (active) {
        diff = U.angDiff(h, this.targetH);
        const maxTurn = J.turnRate * J.handling * (0.55 + 0.45 * U.clamp(this.speed / 8, 0, 1)) * (boosting ? 0.8 : 1) * (1 - CFG.maps.jurassic.waterTurn * wade);   // heavier steering when wading
        h += U.clamp(diff, -maxTurn * dt, maxTurn * dt);
      }
      this.steer = U.damp(this.steer, U.clamp(diff * 0.6, -0.5, 0.5), 12, dt);
      this.h = h;
      const fx = Math.sin(h), fz = Math.cos(h), rx = -Math.cos(h), rz = Math.sin(h);
      if (wade > 0) { const c = CFG.maps.jurassic.current * wade; this.vx += this.curX * c * dt; this.vz += this.curZ * c * dt; }   // the river current drags the vehicle downstream
      let sF = this.vx * fx + this.vz * fz, sL = this.vx * rx + this.vz * rz;
      const sF0 = sF;
      if (active) {
        const align = Math.max(0, Math.cos(U.angDiff(h, this.targetH)));
        const want = (boosting ? J.boostSpeed : J.topSpeed) * (boosting ? 1 : mag) * (0.35 + 0.65 * align) * slow;
        if (sF < want) sF = Math.min(want, sF + J.accel * (boosting ? 1.7 : 1) * dt); else sF = Math.max(want, sF - J.brake * dt);
      } else sF = sF > 0 ? Math.max(0, sF - J.coast * dt) : Math.min(0, sF + J.coast * dt);
      sL *= Math.exp(-J.grip * (1 - CFG.maps.jurassic.waterGrip * wade) * dt);   // less side grip in the water => it slides a little
      this.acc = U.damp(this.acc, (sF - sF0) / dt, 10, dt);
      this.vx = fx * sF + rx * sL; this.vz = fz * sF + rz * sL;
      this.sF = sF; this.sL = sL;
      this.x += this.vx * dt; this.z += this.vz * dt;
      this.wheelRot += sF * dt / J.wheelR;

      // collisions: two circles (nose + tail)
      let hit = false, nx = 0, nz = 0;
      for (let i = 0; i < 2; i++) {
        const off = i === 0 ? J.halfLen : -J.halfLen;
        tmp.x = this.x + fx * off; tmp.z = this.z + fz * off;
        const ox = tmp.x, oz = tmp.z;
        if (this.col.resolve(tmp, J.radius)) { this.x += tmp.x - ox; this.z += tmp.z - oz; nx += this.col.nx; nz += this.col.nz; hit = true; }
      }
      if (hit) {
        const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
        const vn = this.vx * nx + this.vz * nz;
        if (vn < 0) {
          const b = 1 + J.bounce; this.vx -= b * vn * nx; this.vz -= b * vn * nz;
          this.vx *= 0.985; this.vz *= 0.985;
          if (-vn > this.impact) this.impact = -vn;
        }
      }
      this.speed = Math.hypot(this.vx, this.vz);

      // auto-unstick
      if ((mag > 0.3 || boosting) && this.speed < 1.0 && this.unstick <= 0) {
        this.stuckT += dt;
        if (this.stuckT > J.stuckTime) {
          this.stuckT = 0;
          let best = -9, bx = 0, bz = 1;
          for (let k = 0; k < 16; k++) {
            const a = k * Math.PI / 8, dx = Math.sin(a), dz = Math.cos(a);
            const ok = this.col.free(this.x + dx * 5, this.z + dz * 5, 2.0) && this.col.free(this.x + dx * 2.5, this.z + dz * 2.5, 1.6);
            const sc = ok ? 1 + Math.cos(U.angDiff(a, this.targetH)) : -1;
            if (sc > best) { best = sc; bx = dx; bz = dz; }
          }
          this.udx = bx; this.udz = bz; this.unstick = 0.75; this.vx = bx * 7; this.vz = bz * 7;
        }
      } else if (this.speed >= 1.0) this.stuckT = 0;
      if (this.hurtT > 0) this.hurtT -= dt;
      if (this.hop > 0) this.hop -= dt;
    }

    hurt(n) {
      if (!this.alive) return;
      this.hp = Math.max(0, this.hp - n); this.hurtT = 0.15;
      this.cmdr.punch(-0.5); this.cmdr.flash(0.5);
      if (this.hp <= 0) { this.alive = false; WZ.Events.emit('jeep:destroyed'); }
      WZ.Events.emit('jeep:damaged', { hp: this.hp, amount: n });
    }
    heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }
    addCrate() { this.crates++; const bc = this.model.bedCrates; for (let i = 0; i < bc.length; i++) bc[i].visible = i < this.crates; }

    /** write the (interpolated) pose to the meshes */
    sync(alpha, dt, t) {
      const J = this.P;
      const x = U.lerp(this.px, this.x, alpha), z = U.lerp(this.pz, this.z, alpha), h = this.ph + U.angDiff(this.ph, this.h) * alpha;
      const hm = this.map.height, gy = hm(x, z);
      const fx = Math.sin(h), fz = Math.cos(h), lx = Math.cos(h), lz = -Math.sin(h);
      const pitch = -Math.atan((hm(x + fx * 2.2, z + fz * 2.2) - hm(x - fx * 2.2, z - fz * 2.2)) / 4.4);
      const roll = Math.atan((hm(x + lx * 1.4, z + lz * 1.4) - hm(x - lx * 1.4, z - lz * 1.4)) / 2.8);
      const sink = this.inPit ? (this.pitSink || 0) : 0;
      this.rx = x; this.rz = z; this.ry = gy - sink;
      const hp = this.hop > 0 ? Math.sin((1 - this.hop / 0.6) * Math.PI) : 0;
      if (!this.captive) { this.lift = U.damp(this.lift, 0, 5, dt); this.tiltX = U.damp(this.tiltX, 0, 6, dt); this.tiltZ = U.damp(this.tiltZ, 0, 6, dt); }
      this.mesh.position.set(x, gy + hp * 1.5 - sink + this.lift, z); this.mesh.rotation.set(pitch - hp * 0.3 - sink * 0.25 + this.tiltX, h, roll + hp * 0.25 + sink * 0.15 + this.tiltZ);
      if (sink > 0) this.mesh.scale.setScalar(Math.max(0.25, 1 - sink * 0.2));
      const m = this.model, sp01 = Math.min(1, this.speed / J.topSpeed);
      this.rollV = U.damp(this.rollV, U.clamp(-this.sL * 0.012 - this.steer * sp01 * 0.1, -0.2, 0.2), 8, dt);
      this.pitchV = U.damp(this.pitchV, U.clamp(-this.acc * 0.0035, -0.1, 0.1), 8, dt);
      m.bodyG.rotation.set(this.pitchV, 0, this.rollV);
      m.bodyG.position.y = Math.sin(this.wheelRot * 2.2) * 0.04 * sp01 + (this.hurtT > 0 ? 0.08 : 0);
      for (const w of m.wheels) w.rotation.x = this.wheelRot;
      for (const f of m.front) f.rotation.y = this.steer;
      m.flag.rotation.y = Math.sin(t * 9) * 0.35 + sp01 * 0.4; m.flag.rotation.z = Math.sin(t * 7) * 0.08;
      this.cmdr.speed01 = sp01; this.cmdr.update(dt);
    }

    dispose() { this.scene.remove(this.mesh); this.cmdr.dispose(); WZ.Geo.disposeTree(this.mesh); }
  }
  WZ.Jeep = Jeep;
})(window.WZ = window.WZ || {});
