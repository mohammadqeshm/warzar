/* WZ.Fx — floating text ("BONK!", "+28"), screen shake, hit-stop, edge damage flash. DOM-pooled, no allocations per frame. */
(function (WZ) {
  'use strict';
  const T = THREE, v = new T.Vector3();
  const N = 24;

  const Fx = {
    layer: null, flashEl: null, items: [], stopT: 0, shakeOn: true,

    init(layer, flashEl) {
      Fx.layer = layer; Fx.flashEl = flashEl; Fx.items = []; Fx.stopT = 0;
      layer.innerHTML = '';
      for (let i = 0; i < N; i++) {
        const el = document.createElement('div'); el.className = 'ft'; el.style.display = 'none'; layer.appendChild(el);
        Fx.items.push({ el, on: false, x: 0, y: 0, z: 0, t: 0, life: 1, rise: 2 });
      }
    },
    /** kind: bonk | coin | warn | good | info */
    text(str, x, y, z, kind) {
      let it = null;
      for (let i = 0; i < N; i++) if (!Fx.items[i].on) { it = Fx.items[i]; break; }
      if (!it) it = Fx.items[0];
      it.on = true; it.x = x; it.y = y; it.z = z; it.t = 0; it.life = kind === 'bonk' ? 0.7 : 1.1; it.rise = kind === 'bonk' ? 3 : 2.2;
      it.el.className = 'ft ' + (kind || 'info'); it.el.textContent = str; it.el.style.display = 'block';
    },
    shake(a) { if (Fx.shakeOn) WZ.Cam.shake(a); },
    hitstop(t) { Fx.stopT = Math.max(Fx.stopT, Math.min(t, WZ.CFG.sim.hitStopMax)); },
    flash(kind) {
      const el = Fx.flashEl; if (!el) return;
      el.className = 'flash ' + (kind || 'hurt'); void el.offsetWidth; el.classList.add('on');
    },
    update(dt, camera, w, h) {
      for (let i = 0; i < N; i++) {
        const it = Fx.items[i]; if (!it.on) continue;
        it.t += dt;
        if (it.t >= it.life) { it.on = false; it.el.style.display = 'none'; continue; }
        const k = it.t / it.life;
        v.set(it.x, it.y + it.t * it.rise, it.z).project(camera);
        if (v.z > 1) { it.el.style.display = 'none'; continue; }
        it.el.style.display = 'block';
        const s = 1 + 0.45 * Math.max(0, 1 - k * 5);
        it.el.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * w).toFixed(1) + 'px,' + ((-v.y * 0.5 + 0.5) * h).toFixed(1) + 'px) translate(-50%,-50%) scale(' + s.toFixed(2) + ')';
        it.el.style.opacity = k < 0.6 ? 1 : (1 - (k - 0.6) / 0.4).toFixed(2);
      }
    },
    clear() { for (const it of Fx.items) { it.on = false; it.el.style.display = 'none'; } Fx.stopT = 0; },
  };
  WZ.Fx = Fx;
})(window.WZ = window.WZ || {});
