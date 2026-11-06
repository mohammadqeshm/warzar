/* WZ.Cam — 3/4 chase camera behind and above the jeep. Smooth aim with look-ahead, a subtle yaw bias toward the
 * driving direction, dynamic zoom that keeps jeep AND Nana on screen, portrait-aware framing, optional shake. */
(function (WZ) {
  'use strict';
  const T = THREE, CFG = WZ.CFG, U = WZ.U, C = CFG.camera;
  const v = new T.Vector3();

  const Cam = {
    cam: null, baseYaw: Math.PI, yaw: Math.PI, zoom: 1.4, aim: new T.Vector3(), aspect: 1, aspectZoom: 1, shakeA: 0, w: 1, h: 1,

    init() {
      Cam.cam = new T.PerspectiveCamera(C.fov, 1, C.near, C.far);
      Cam.cam.position.set(0, 30, 30);
    },
    resize(w, h) {
      Cam.w = w; Cam.h = h; Cam.aspect = w / h;
      Cam.cam.aspect = Cam.aspect; Cam.cam.updateProjectionMatrix();
      Cam.aspectZoom = Cam.aspect >= 1.3 ? 1 : 1 + 0.85 * U.clamp((1.3 - Cam.aspect) / 0.8, 0, 1);
    },
    snap(x, y, z) { Cam.aim.set(x, y, z); Cam.zoom = Cam.aspectZoom * 1.15; Cam.yaw = Cam.baseYaw; },
    shake(a) { Cam.shakeA = Math.max(Cam.shakeA, a); },

    /** j: jeep (rx,rz,ry,h,speed) · n: nana (rx,rz,ry,out,isKO) · amount: shake multiplier from settings */
    update(dt, j, n, amount) {
      const sp = U.clamp(j.speed / CFG.jeep.topSpeed, 0, 1);
      Cam.yaw = U.damp(Cam.yaw, Cam.baseYaw + 0.25 * Math.sin(j.h - Cam.baseYaw) * sp, 2.2, dt);
      let tx = j.rx + Math.sin(j.h) * j.speed * C.lookAhead, tz = j.rz + Math.cos(j.h) * j.speed * C.lookAhead;
      if (n.out) { tx = U.lerp(tx, (j.rx + n.rx) / 2, 0.45); tz = U.lerp(tz, (j.rz + n.rz) / 2, 0.45); }
      Cam.aim.x = U.damp(Cam.aim.x, tx, 6, dt); Cam.aim.z = U.damp(Cam.aim.z, tz, 6, dt); Cam.aim.y = U.damp(Cam.aim.y, j.ry, 4, dt);
      Cam.zoom = U.damp(Cam.zoom, Cam.zt || Cam.aspectZoom, 3, dt);
      Cam._place();
      // fit zoom so Nana stays on screen
      let zt = Cam.aspectZoom * (1 + 0.1 * sp);
      if (n.out) {
        let req = 0;
        v.set(n.rx, n.ry, n.rz).project(Cam.cam); req = Math.max(req, Math.abs(v.x) / 0.72, v.y > 0 ? v.y / 0.6 : -v.y / 0.66);
        v.set(j.rx, j.ry, j.rz).project(Cam.cam); req = Math.max(req, Math.abs(v.x) / 0.72, v.y > 0 ? v.y / 0.6 : -v.y / 0.66);
        zt = Math.min(C.maxZoom * Cam.aspectZoom, Math.max(zt, Cam.zoom * req * 1.04)); // converges to the tightest zoom that keeps both in frame
      }
      Cam.zt = zt;
      Cam.shakeA = Math.max(0, Cam.shakeA - dt * 2.4);
      if (Cam.shakeA > 0.001 && amount > 0) {
        const a = Cam.shakeA * amount * 1.2;
        Cam.cam.position.x += (Math.random() - 0.5) * a; Cam.cam.position.y += (Math.random() - 0.5) * a; Cam.cam.position.z += (Math.random() - 0.5) * a;
      }
    },
    _place() {
      const f = Math.sin(Cam.yaw), g = Math.cos(Cam.yaw), z = Cam.zoom;
      Cam.cam.position.set(Cam.aim.x - f * C.back * z, Cam.aim.y + C.height * z, Cam.aim.z - g * C.back * z);
      Cam.cam.lookAt(Cam.aim);
      Cam.cam.updateMatrixWorld(true);
    },
    /** free camera used by briefing / result orbits */
    orbit(cx, cy, cz, ang, dist, height) {
      Cam.cam.position.set(cx + Math.sin(ang) * dist, cy + height, cz + Math.cos(ang) * dist);
      Cam.cam.lookAt(cx, cy + 1.5, cz); Cam.cam.updateMatrixWorld(true);
    },
  };
  WZ.Cam = Cam;
})(window.WZ = window.WZ || {});
