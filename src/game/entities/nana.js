/* WZ.Nana — the signature mechanic. States: IN_JEEP, RUNNING_OUT, GRABBING, RETURNING, BOARDING, KO, RECALLING.
 * DEPLOY: runs (A* on the nav grid) to the chosen crate, grabs it (0.8 s), runs back. Boards only when the jeep is slow
 * (< 8 u/s) and she is within 4 u. DEPLOY again = RECALL (keeps the crate). Pan auto-bonks enemies (cleave). */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, U = WZ.U, N = CFG.nana;
  const S = { IN_JEEP: 'IN_JEEP', RUNNING_OUT: 'RUNNING_OUT', GRABBING: 'GRABBING', RETURNING: 'RETURNING', BOARDING: 'BOARDING', KO: 'KO', RECALLING: 'RECALLING' };
  const SWING = 0.28;
  const seat = { x: 0, z: 0 };

  class Nana {
    constructor(ctx) {
      this.ctx = ctx; const jeep = ctx.jeep;
      this.rig = WZ.Heroes.nana();
      jeep.model.seatNana.add(this.rig.root); this.rig.setMode('sit');
      this.state = S.IN_JEEP;
      this.hp = N.hp; this.maxHp = N.hp;
      this.x = jeep.x; this.z = jeep.z; this.px = this.x; this.pz = this.z; this.h = jeep.h; this.ph = this.h;
      this.rx = this.x; this.ry = 0; this.rz = this.z;
      this.path = null; this.pathIdx = 0; this.navT = 0; this.direct = true;
      this.target = null; this.carry = null; this.grabT = 0; this.boardT = 0; this.boardFromX = 0; this.boardFromZ = 0;
      this.cdPan = 0; this.swingT = -1; this.swingHit = true; this.iframes = 0; this.reviveT = 0; this.koCount = 0;
      this.stuckT = 0; this.lx = this.x; this.lz = this.z; this.jumpT = 0; this.tt = 0; this.starT = 0; this.wasOut = false;
      this.speed = 0;
      // rescue marker (bouncing arrow + park ring)
      this.marker = new T.Group();
      const arrow = new T.Mesh(new T.ConeGeometry(0.8, 1.6, 4), new T.MeshBasicMaterial({ color: 0xFFB400 }));
      arrow.rotation.x = Math.PI; arrow.position.y = 6.2; this.marker.add(arrow);
      const ring = new T.Mesh(new T.RingGeometry(N.reviveRadius - 0.5, N.reviveRadius, 40), new T.MeshBasicMaterial({ color: 0xFFB400, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.7; this.marker.add(ring);
      this.marker.visible = false; ctx.scene.add(this.marker); this.arrow = arrow;
    }

    get out() { return this.state !== S.IN_JEEP; }
    get isKO() { return this.state === S.KO; }
    get returning() { return this.state === S.RETURNING || this.state === S.RECALLING; }

    /** DEPLOY button. Returns 'deploy' | 'recall' | 'nocrate' | 'ignored' */
    press() {
      const ctx = this.ctx, jeep = ctx.jeep;
      if (this.state === S.IN_JEEP) {
        const c = ctx.crates.nearestAvailable(jeep.x, jeep.z, N.deployRadius);
        if (!c) return 'nocrate';
        c.reserved = true; this.target = c;
        jeep.localToWorld(-3.0, 0.2, this);
        ctx.col.resolve(this, 0.9);
        this.px = this.x; this.pz = this.z; this.h = this.ph = jeep.h - 1.2;
        ctx.scene.add(this.rig.root); this.state = S.RUNNING_OUT; this.jumpT = 0.4; this.navT = 0; this.path = null;
        this.rig.setMode('jump'); this.rig.punch(0.8); this.stuckT = 0; this.lx = this.x; this.lz = this.z;
        WZ.Audio.sfx('deploy'); WZ.Events.emit('nana:deploy', { crate: c });
        return 'deploy';
      }
      if (this.state === S.KO || this.state === S.BOARDING) return 'ignored';
      if (this.state === S.RECALLING) return 'ignored';
      if (this.target && !this.carry) { this.target.reserved = false; }
      this.target = null; this.state = S.RECALLING; this.navT = 0; this.path = null; this.grabT = 0;
      WZ.Audio.sfx('recall'); WZ.Events.emit('nana:recall');
      return 'recall';
    }

    hurt(dmg) {
      if (this.state === S.IN_JEEP || this.state === S.BOARDING || this.state === S.KO || this.iframes > 0) return;
      this.hp -= dmg * N.damageMul; this.iframes = N.iFrames;
      this.rig.flash(0.7); this.rig.punch(-0.8);
      WZ.Audio.sfx('hurt', 0.7);
      WZ.Events.emit('nana:hurt', { hp: this.hp });
      if (this.hp <= 0) this._ko();
    }

    _ko() {
      const ctx = this.ctx;
      this.hp = 0; this.state = S.KO; this.reviveT = 0; this.koCount++;
      if (this.carry) { ctx.crates.drop(this.carry, this.x, this.z); this.carry = null; }
      if (this.target) { this.target.reserved = false; this.target = null; }
      this.rig.setMode('ko'); this.marker.visible = !N.permaDeath;
      WZ.Audio.sfx('nanako'); WZ.Events.emit('nana:ko', { count: this.koCount });
    }

    _goTo(tx, tz, dt) {
      const ctx = this.ctx, nav = ctx.map.nav.nana;
      this.navT -= dt;
      const d0 = Math.hypot(tx - this.x, tz - this.z);
      if (this.navT <= 0) {
        this.navT = 0.3;
        this.direct = d0 < 5 || nav.los(this.x, this.z, tx, tz);
        if (!this.direct) { this.path = nav.path(this.x, this.z, tx, tz); this.pathIdx = 0; if (!this.path) this.direct = true; }
      }
      let wx = tx, wz = tz;
      if (!this.direct && this.path) {
        while (this.pathIdx < this.path.length - 1 && Math.hypot(this.path[this.pathIdx].x - this.x, this.path[this.pathIdx].z - this.z) < 1.8) this.pathIdx++;
        const p = this.path[Math.min(this.pathIdx, this.path.length - 1)]; wx = p.x; wz = p.z;
      }
      const dx = wx - this.x, dz = wz - this.z, d = Math.hypot(dx, dz) || 1;
      this.h += U.clamp(U.angDiff(this.h, Math.atan2(dx, dz)), -14 * dt, 14 * dt);
      const sp = N.speed * (this.swingT > 0 ? 0.8 : 1) * (this.jumpT > 0 ? 0.6 : 1);
      const st = Math.min(sp * dt, d);
      this.x += dx / d * st; this.z += dz / d * st;
      ctx.col.resolve(this, 0.9);
      this.speed = sp;
      return d0;
    }

    step(dt) {
      const ctx = this.ctx, jeep = ctx.jeep;
      this.px = this.x; this.pz = this.z; this.ph = this.h; this.tt += dt;
      if (this.iframes > 0) this.iframes -= dt;
      if (this.jumpT > 0) this.jumpT -= dt;
      if (this.state === S.IN_JEEP) { jeep.localToWorld(-0.65, -0.15, seat); this.x = seat.x; this.z = seat.z; this.h = jeep.h; this.px = this.x; this.pz = this.z; return; }
      let moving = false;

      switch (this.state) {
        case S.RUNNING_OUT: {
          const c = this.target;
          if (!c || c.state !== 'idle') { this.state = S.RECALLING; this.target = null; break; }
          const d = this._goTo(c.x, c.z, dt); moving = true;
          if (d < 1.9) { this.state = S.GRABBING; this.grabT = 0; this.rig.setMode('grab'); this.h = Math.atan2(c.x - this.x, c.z - this.z); }
          break;
        }
        case S.GRABBING: {
          const c = this.target;
          this.grabT += dt;
          if (this.grabT >= N.grabTime) {
            c.state = 'carried'; c.carrier = this; this.carry = c; this.target = null;
            this.state = S.RETURNING; this.navT = 0; this.path = null; this.rig.punch(1);
            WZ.Audio.sfx('grab'); WZ.Events.emit('crate:grabbed', { crate: c });
          }
          break;
        }
        case S.RETURNING: case S.RECALLING: {
          const d = this._goTo(jeep.x, jeep.z, dt); moving = true;
          if (d < N.boardRadius && jeep.speed < N.boardSpeed) { this.state = S.BOARDING; this.boardT = 0; this.boardFromX = this.x; this.boardFromZ = this.z; }
          break;
        }
        case S.BOARDING: {
          this.boardT += dt / 0.32;
          jeep.localToWorld(-0.65, -0.15, seat);
          const k = Math.min(1, this.boardT);
          this.x = this.boardFromX + (seat.x - this.boardFromX) * k; this.z = this.boardFromZ + (seat.z - this.boardFromZ) * k;
          if (k >= 1) this._boarded();
          break;
        }
        case S.KO: {
          this.starT -= dt;
          if (this.starT <= 0 && WZ.Particles) { this.starT = 0.18; WZ.Particles.stars(this.x, this.ry + 3.4, this.z, 1); }
          if (N.permaDeath) break;   // dead for good: the mission scene ends the run
          const near = Math.hypot(jeep.x - this.x, jeep.z - this.z) < N.reviveRadius && jeep.speed < CFG.heat.stillSpeed;
          this.reviveT = near ? this.reviveT + dt : Math.max(0, this.reviveT - dt * 1.5);
          if (this.reviveT >= N.reviveTime) {
            this.hp = this.maxHp * N.reviveHpPct; this.iframes = 1.5; this.state = S.RECALLING; this.marker.visible = false; this.navT = 0; this.reviveT = 0;
            this.rig.setMode('jump'); this.rig.punch(1); WZ.Audio.sfx('revive'); WZ.Events.emit('nana:revive');
          }
          break;
        }
        default: break;
      }

      // pan: auto-bonk anything in melee range (cleave)
      if (this.out && this.state !== S.KO && this.state !== S.BOARDING) {
        this.cdPan -= dt;
        if (this.cdPan <= 0) {
          const e = ctx.enemies.nearest(this.x, this.z, N.panRange);
          if (e) { this.cdPan = N.panCooldown; this.swingT = SWING; this.swingHit = false; this.h = Math.atan2(e.x - this.x, e.z - this.z); }
        }
        if (this.swingT >= 0) {
          this.swingT -= dt;
          if (!this.swingHit && this.swingT < SWING * 0.55) {
            this.swingHit = true;
            const q = ctx.enemies, list = [];
            q.hash.query(this.x, this.z, N.panRange + 1, q.q);
            for (let i = 0; i < q.q.length; i++) list.push(q.q[i]);
            let any = false;
            for (const e of list) {
              if (!e.active || e.state === 2) continue;
              const dx = e.x - this.x, dz = e.z - this.z, d = Math.hypot(dx, dz);
              if (d > N.panRange) continue;
              any = true; const l = d || 1;
              q.damage(e, N.panDamage, dx / l * N.panKnock, dz / l * N.panKnock, 'pan');
              ctx.particles.sparks(e.x, ctx.map.height(e.x, e.z) + 2, e.z, 4, 1, 0.9, 0.4);
            }
            if (WZ.Giants) for (const g of WZ.Giants.list) { // giants are bigger: reach counts from their body edge
              if (!g.active || Math.hypot(g.x - this.x, g.z - this.z) - g.radius > N.panRange) continue;
              any = true; WZ.Giants.damage(g, N.panDamage, 0, 0, 'pan');
              ctx.particles.sparks(g.x - Math.sin(this.h) * g.radius, g.ry + 3, g.z - Math.cos(this.h) * g.radius, 4, 1, 0.9, 0.4);
            }
            if (any) {
              WZ.Audio.sfx('bonk'); ctx.fx.text(WZ.t('hud.bonk'), this.x + Math.sin(this.h) * 1.5, this.ry + 3.6, this.z + Math.cos(this.h) * 1.5, 'bonk');
              ctx.fx.shake(0.15);
            }
          }
          if (this.swingT < 0) this.swingT = -1;
        }
      }

      // stuck safety: teleport to the nearest free point
      if (moving) {
        this.stuckT = Math.hypot(this.x - this.lx, this.z - this.lz) < N.speed * dt * 0.3 && this.jumpT <= 0 ? this.stuckT + dt : 0;
        this.lx = this.x; this.lz = this.z;
        if (this.stuckT > N.stuckTeleport) {
          this.stuckT = 0;
          const ref = this.path && this.path.length ? this.path[Math.min(this.pathIdx + 1, this.path.length - 1)] : ctx.jeep;
          const f = ctx.map.nav.nana.nearestFree(ref.x, ref.z, 6);
          if (f) { ctx.particles.poof(this.x, this.ry + 1, this.z, 6, 1); this.x = f.x; this.z = f.z; this.px = this.x; this.pz = this.z; this.navT = 0; ctx.particles.poof(this.x, this.ry + 1, this.z, 6, 1); }
        }
      } else this.stuckT = 0;
      this.moving = moving;
    }

    _boarded() {
      const ctx = this.ctx, jeep = ctx.jeep;
      this.state = S.IN_JEEP;
      jeep.model.seatNana.add(this.rig.root); this.rig.root.position.set(0, 0, 0); this.rig.root.rotation.set(0, 0, 0);
      this.rig.setMode('sit'); this.rig.punch(-0.7); this.rig.pan.visible = true;
      if (this.carry) { const c = this.carry; this.carry = null; ctx.crates.deliver(c, jeep); WZ.Events.emit('crate:delivered', { crate: c }); }
      this.target = null; this.swingT = -1;
      WZ.Audio.sfx('board'); WZ.Events.emit('nana:board');
    }

    render(alpha, dt, t) {
      const ctx = this.ctx, rig = this.rig, hm = ctx.map.height;
      if (this.state === S.IN_JEEP) {
        const j = ctx.jeep; this.rx = j.rx || this.x; this.rz = j.rz || this.z; this.ry = (j.ry || 0) + 2; rig.speed01 = 1; rig.swing = -1;
        rig.setMode(this.cheer ? 'cheer' : 'sit');
        rig.update(dt); return;
      }
      const x = U.lerp(this.px, this.x, alpha), z = U.lerp(this.pz, this.z, alpha), h = this.ph + U.angDiff(this.ph, this.h) * alpha;
      let y = hm(x, z);
      if (this.state === S.BOARDING) y += Math.sin(Math.min(1, this.boardT) * Math.PI) * 2.2 + Math.min(1, this.boardT) * 1.2;
      if (this.jumpT > 0) y += Math.sin((1 - this.jumpT / 0.4) * Math.PI) * 2.4;
      this.rx = x; this.ry = y; this.rz = z;
      rig.root.position.set(x, y, z); rig.root.rotation.y = h;
      let mode = 'run';
      switch (this.state) {
        case S.GRABBING: mode = 'grab'; break;
        case S.BOARDING: mode = 'jump'; break;
        case S.KO: mode = 'ko'; break;
        case S.RETURNING: case S.RECALLING: mode = this.carry ? 'carry' : 'run'; break;
        default: mode = this.jumpT > 0 ? 'jump' : 'run';
      }
      rig.setMode(mode); rig.speed01 = 1; rig.swing = this.swingT >= 0 ? 1 - this.swingT / SWING : -1;
      rig.pan.visible = !this.carry;
      rig.update(dt);
      if (this.state === S.KO) {
        this.marker.position.set(x, y, z);
        this.arrow.position.y = 6.2 + Math.sin(t * 6) * 0.5; this.arrow.rotation.y = t * 3;
      }
    }

    dispose() { this.ctx.scene.remove(this.marker, this.rig.root); this.rig.dispose(); this.arrow.geometry.dispose(); }
  }
  Nana.S = S;
  WZ.Nana = Nana;
})(window.WZ = window.WZ || {});
