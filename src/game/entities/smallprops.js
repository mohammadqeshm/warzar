/* WZ.SmallProps — sandbags + oil barrels as two InstancedMeshes. The jeep knocks them away (break/bounce). */
(function (WZ) {
  'use strict';
  const T = THREE, A = WZ.Assets, P = WZ.Props;
  const G_ = -26;

  class SmallProps {
    constructor(scene, map) {
      this.scene = scene; this.map = map;
      const bags = map.smalls.filter((s) => s.t === 'bag'), bars = [];
      this.bagMesh = new T.InstancedMesh(P.sandbagGeo(), new T.MeshLambertMaterial({ map: A.tex('sandbag') }), Math.max(1, bags.length));
      this.barMesh = new T.InstancedMesh(P.barrelGeo(), new T.MeshLambertMaterial({ vertexColors: true }), 1);
      for (const m of [this.bagMesh, this.barMesh]) { m.frustumCulled = false; m.instanceMatrix.setUsage(T.DynamicDrawUsage); scene.add(m); m.count = 0; }
      this.bagMesh.count = bags.length; this.barMesh.count = 0;
      this.hash = new WZ.SpatialHash(8, map.half + 12);
      this.items = []; this.fly = []; this.q = [];
      this.d = new T.Object3D(); this.c = new T.Color();
      const mk = (list, mesh, kind, half) => {
        list.forEach((s, i) => {
          const gy = map.height(s.x, s.z);
          const it = { kind, mesh, idx: i, x: s.x, y: gy + s.ly + half, z: s.z, rot: s.rot, rx: 0, rz: 0, vx: 0, vy: 0, vz: 0, sp: 0, state: 0, bounces: 0, half, t: 0 };
          this.items.push(it); this.hash.insert(it, it.x, it.z);
          this._write(it);
          const v = 0.88 + ((i * 53) % 20) / 100; this.c.setRGB(v, v, v); mesh.setColorAt(i, this.c);
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      };
      mk(bags, this.bagMesh, 0, 0.28); mk(bars, this.barMesh, 1, 0.75);
    }
    _write(it) {
      const d = this.d;
      d.position.set(it.x, it.y, it.z); d.rotation.set(it.rx, it.rot, it.rz, 'YXZ'); d.updateMatrix();
      it.mesh.setMatrixAt(it.idx, d.matrix); it.mesh.instanceMatrix.needsUpdate = true;
    }
    /** called every sim step with the jeep; launches anything it touches */
    hit(jeep, particles) {
      if (jeep.speed < 1.5) return;
      const fx = Math.sin(jeep.h), fz = Math.cos(jeep.h);
      for (let k = -1; k <= 1; k++) {
        const cx = jeep.x + fx * k * 1.6, cz = jeep.z + fz * k * 1.6;
        this.hash.query(cx, cz, 2.6, this.q);
        for (let i = 0; i < this.q.length; i++) {
          const it = this.q[i];
          if (it.state !== 0) continue;
          const dx = it.x - cx, dz = it.z - cz, d = Math.hypot(dx, dz);
          if (d > 1.9) continue;
          it.state = 1; it.bounces = 0; it.t = 0;
          const n = d > 0.01 ? 1 / d : 0, sp = jeep.speed;
          it.vx = jeep.vx * 0.75 + dx * n * (3 + sp * 0.25) + (Math.random() - 0.5) * 3;
          it.vz = jeep.vz * 0.75 + dz * n * (3 + sp * 0.25) + (Math.random() - 0.5) * 3;
          it.vy = 6 + Math.random() * 5 + sp * 0.12; it.sp = (Math.random() - 0.5) * 12;
          this.fly.push(it);
          particles.dust(it.x, it.y - 0.2, it.z, 2);
          WZ.Audio.sfx(it.kind === 0 ? 'bag' : 'thud', 0.8);
        }
      }
    }
    update(dt) {
      for (let i = this.fly.length - 1; i >= 0; i--) {
        const it = this.fly[i];
        it.vy += G_ * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.z += it.vz * dt;
        it.rot += it.sp * dt; it.rx += it.sp * 0.6 * dt; it.rz += it.sp * 0.4 * dt; it.t += dt;
        const gy = this.map.height(it.x, it.z) + it.half;
        if (it.y < gy && it.vy < 0) {
          it.y = gy; it.vy *= -0.38; it.vx *= 0.72; it.vz *= 0.72; it.sp *= 0.55; it.bounces++;
          if (it.bounces > 2 || Math.abs(it.vy) < 1.6) {
            it.state = 2; it.vx = it.vz = it.vy = 0; it.rx = 0; it.rz = it.kind === 1 && Math.random() < 0.5 ? Math.PI / 2 : 0;
            if (it.rz) it.y = this.map.height(it.x, it.z) + 0.55;
            this.fly.splice(i, 1);
          }
        }
        this._write(it);
      }
    }
    dispose() {
      this.scene.remove(this.bagMesh, this.barMesh);
      this.bagMesh.geometry.dispose(); this.barMesh.geometry.dispose(); this.bagMesh.material.dispose(); this.barMesh.material.dispose();
      this.bagMesh.dispose(); this.barMesh.dispose();
    }
  }
  WZ.SmallProps = SmallProps;
})(window.WZ = window.WZ || {});
