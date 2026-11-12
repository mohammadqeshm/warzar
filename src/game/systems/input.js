/* WZ.Input — virtual stick (appears where you touch, fixed origin, left half), keyboard (WASD/arrows, Space, Shift, Esc/P), device detection.
 * Output: Input.stick {x,y,mag} (y up), Input.consume('deploy'|'boost'|'pause'|'debug'|'skip'|'weapon'|'wnext'|'wprev'|'wsel'|...), Input.boostHeld. */
(function (WZ) {
  'use strict';
  const IN = {
    stick: { x: 0, y: 0, mag: 0 }, device: 'keys', keys: new Set(), pressed: { deploy: false, boost: false, pause: false, debug: false, skip: false, mine: false, turret: false, heavy: false, bomb: false, heli: false, tank: false, jet: false, weapon: false, wnext: false, wprev: false, wsel: false },
    boostHeld: false, bot: null, enabled: true, _touchId: -1, _ox: 0, _oy: 0, _tx: 0, _ty: 0, _R: 70, _baseEl: null, _knobEl: null,

    init(zone, baseEl, knobEl) {
      IN._baseEl = baseEl; IN._knobEl = knobEl;
      if (IN._baseEl) IN._baseEl.style.display = 'none';
      if (IN._knobEl) IN._knobEl.style.display = 'none';
      IN.device = (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 'touch' : 'keys';
      const setDev = (d) => { if (IN.device !== d) { IN.device = d; WZ.Events.emit('input:device', d); } };

      window.addEventListener('keydown', (e) => {
        if (e.repeat) { if (e.code.indexOf('Arrow') === 0 || e.code === 'Space') e.preventDefault(); return; }
        WZ.Audio.unlock(); setDev('keys');
        IN.keys.add(e.code);
        switch (e.code) {
          case 'Space': IN.pressed.deploy = true; e.preventDefault(); break;
          case 'ShiftLeft': case 'ShiftRight': IN.pressed.boost = true; IN.boostHeld = true; break;
          case 'Escape': case 'KeyP': IN.pressed.pause = true; break;
          case 'Backquote': case 'F3': IN.pressed.debug = true; e.preventDefault(); break;
          case 'KeyN': IN.pressed.skip = true; break;
          case 'KeyF': IN.pressed.weapon = true; break;                      // USE the selected weapon
          case 'KeyE': IN.pressed.wnext = true; break; case 'KeyQ': IN.pressed.wprev = true; break;
          case 'Digit1': case 'Numpad1': IN.pressed.wsel = 'mine'; break; case 'Digit2': case 'Numpad2': IN.pressed.wsel = 'gun'; break;
          case 'Digit3': case 'Numpad3': IN.pressed.wsel = 'heavy'; break; case 'Digit4': case 'Numpad4': IN.pressed.wsel = 'bomb'; break;
          case 'Digit5': case 'Numpad5': IN.pressed.wsel = 'heli'; break; case 'Digit6': case 'Numpad6': IN.pressed.wsel = 'tank'; break;
          case 'Digit7': case 'Numpad7': IN.pressed.wsel = 'jet'; break;
          // direct shortcuts (desktop): deploy a specific item without changing the selection
          case 'KeyM': IN.pressed.mine = true; break;
          case 'KeyT': IN.pressed.turret = true; break;
          case 'KeyH': case 'KeyG': IN.pressed.heavy = true; break;
          case 'KeyB': IN.pressed.bomb = true; break;
          case 'KeyV': IN.pressed.heli = true; break;
          case 'KeyY': IN.pressed.tank = true; break;
          case 'KeyU': IN.pressed.jet = true; break;
          default: if (e.code.indexOf('Arrow') === 0) e.preventDefault();
        }
      });
      window.addEventListener('keyup', (e) => { IN.keys.delete(e.code); if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') IN.boostHeld = false; });
      window.addEventListener('blur', () => { IN.keys.clear(); IN.boostHeld = false; IN._release(); });

      const pr = (e) => e.preventDefault();
      document.addEventListener('contextmenu', pr);
      document.addEventListener('gesturestart', pr);
      document.addEventListener('dblclick', pr);
      document.addEventListener('touchmove', (e) => {
        if (e.target && e.target.closest && e.target.closest('.shop-list, .shop-detail, .sum, .pause-box, .brief')) return;
        if (e.target && e.target.closest && e.target.closest('#wz-root')) e.preventDefault();
      }, { passive: false });

      zone.addEventListener('pointerdown', (e) => {
        WZ.Audio.unlock();
        if (e.pointerType === 'touch') setDev('touch');
        if (WZ.UI && WZ.UI.root && !WZ.UI.root.classList.contains('in-mission')) return;
        if (IN._touchId !== -1) return;
        IN._touchId = e.pointerId; IN._ox = IN._tx = e.clientX; IN._oy = IN._ty = e.clientY;
        IN._R = Math.max(54, Math.min(96, Math.min(window.innerWidth, window.innerHeight) * 0.14));
        try { zone.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
        if (IN._baseEl) {
          IN._baseEl.style.display = 'block'; IN._baseEl.style.width = IN._baseEl.style.height = IN._R * 2 + 'px';
          IN._baseEl.style.transform = 'translate(' + (IN._ox - IN._R) + 'px,' + (IN._oy - IN._R) + 'px)';
        }
        if (IN._knobEl) {
          IN._knobEl.style.display = 'block';
          IN._knobEl.style.transform = 'translate(' + (IN._ox - 30) + 'px,' + (IN._oy - 30) + 'px)';
        }
        e.preventDefault();
      });
      zone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== IN._touchId) return;
        IN._tx = e.clientX; IN._ty = e.clientY;
        // Fixed origin (no drifting): the knob is only clamped visually to the ring.
        let dx = IN._tx - IN._ox, dy = IN._ty - IN._oy; const d = Math.hypot(dx, dy);
        if (d > IN._R) { dx *= IN._R / d; dy *= IN._R / d; }
        if (IN._knobEl) IN._knobEl.style.transform = 'translate(' + (IN._ox + dx - 30) + 'px,' + (IN._oy + dy - 30) + 'px)';
        e.preventDefault();
      });
      const up = (e) => { if (e.pointerId === IN._touchId) IN._release(); };
      zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up); zone.addEventListener('lostpointercapture', up);
    },

    _release() {
      IN._touchId = -1;
      if (IN._baseEl) IN._baseEl.style.display = 'none';
      if (IN._knobEl) { IN._knobEl.style.display = 'none'; IN._knobEl.style.transform = 'translate(-200px,-200px)'; }
    },
    press(name) { IN.pressed[name] = true; },
    consume(name) { const v = IN.pressed[name]; IN.pressed[name] = false; return v; },
    setBoost(v) { IN.boostHeld = v; if (v) IN.pressed.boost = true; },

    /** call once per sim step */
    update() {
      const s = IN.stick;
      if (IN.bot) { s.x = IN.bot.x; s.y = IN.bot.y; s.mag = Math.min(1, Math.hypot(s.x, s.y)); return; }
      let x = 0, y = 0;
      const k = IN.keys;
      if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
      if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
      if (x || y) { const l = Math.hypot(x, y); x /= l; y /= l; }
      else if (IN._touchId !== -1) {
        const dx = IN._tx - IN._ox, dy = IN._ty - IN._oy, d = Math.hypot(dx, dy);
        // dead zone 6 px; FULL speed already at 60% of the ring, so a relaxed/creeping thumb never slows the jeep
        if (d > 6) { const m = Math.min(1, (d - 6) / (IN._R * 0.6 - 6)); x = dx / d * m; y = -dy / d * m; }
      }
      s.x = x; s.y = y; s.mag = Math.min(1, Math.hypot(x, y));
    },
    reset() { IN.keys.clear(); IN._release(); IN.stick.x = IN.stick.y = IN.stick.mag = 0; for (const k in IN.pressed) IN.pressed[k] = false; IN.boostHeld = false; },
  };
  WZ.Input = IN;
})(window.WZ = window.WZ || {});
