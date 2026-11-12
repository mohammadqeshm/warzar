/* WZ.UI — all DOM UI: loading, main menu (canvas-drawn logo), briefing card, HUD, off-screen arrows, summary, pause, debug.
 * Black + yellow, dashed panels, chunky tilted buttons. All strings come from WZ.t(). */
(function (WZ) {
  'use strict';
  const t = (k, v) => WZ.I18n.t(k, v), FONT = () => WZ.Tex.FONT;
  const $ = (id) => document.getElementById(id);
  const FLAME = 'M12 1C13 8 20 11 20 20C20 27 16 31 12 31C8 31 4 27 4 20C4 15 7 13 8 9C10 11 10 13 11 14C12 10 11 5 12 1Z';
  const flameSvg = (i) => '<svg class="flame" viewBox="0 0 24 32"><defs><clipPath id="fc' + i + '"><rect id="fcr' + i + '" x="0" y="32" width="24" height="0"/></clipPath></defs><path d="' + FLAME + '" fill="#3a3a3c" stroke="#0E0E0E" stroke-width="1.5"/><path d="' + FLAME + '" fill="url(#fg)" clip-path="url(#fc' + i + ')"/></svg>';
  const CRATE_ICO = '<svg viewBox="0 0 24 24" class="ico"><rect x="2" y="5" width="20" height="16" rx="2" fill="#7A5230" stroke="#0E0E0E" stroke-width="1.5"/><path d="M2 9h20M2 17h20M5 5v16M19 5v16" stroke="#3A3C3E" stroke-width="2"/><path d="M6 20L18 6" stroke="#5E4126" stroke-width="2"/></svg>';
  const BOLT_ICO = '<svg viewBox="0 0 24 24" class="ico"><path d="M13 1L4 14h6l-2 9 10-14h-6z" fill="#FFB400" stroke="#0E0E0E" stroke-width="1.5" stroke-linejoin="round"/></svg>';

  // weapon icons (one per deployable) + swap icon + coin
  const WI = (body) => '<svg viewBox="0 0 32 32" class="wi">' + body + '</svg>';
  const ST = 'stroke="#0E0E0E" stroke-width="1.6" stroke-linejoin="round"';
  const W_ICO = {
    mine: WI('<ellipse cx="16" cy="20" rx="12.5" ry="6" fill="#3e4430" ' + ST + '/><ellipse cx="16" cy="17" rx="12.5" ry="6" fill="#6b7348" ' + ST + '/><circle cx="16" cy="16.6" r="3" fill="#ff3a22" ' + ST + '/><path d="M6 13l-2-3M26 13l2-3M16 10V6" stroke="#0E0E0E" stroke-width="2" stroke-linecap="round"/>'),
    gun: WI('<rect x="5" y="23" width="22" height="5" rx="2" fill="#FFB400" ' + ST + '/><rect x="9" y="13" width="14" height="10" rx="3" fill="#4A525A" ' + ST + '/><rect x="11.5" y="3.5" width="3.4" height="11" rx="1" fill="#16181A" ' + ST + '/><rect x="17.2" y="3.5" width="3.4" height="11" rx="1" fill="#16181A" ' + ST + '/><rect x="13" y="16" width="6" height="3" rx="1" fill="#4cff6a"/>'),
    heavy: WI('<rect x="4" y="23" width="24" height="5" rx="2" fill="#FFB400" ' + ST + '/><rect x="8" y="15" width="16" height="9" rx="3" fill="#59636E" ' + ST + '/><rect x="13" y="1.5" width="7" height="15" rx="2" fill="#16181A" ' + ST + ' transform="rotate(22 16 16)"/><rect x="12.5" y="1.5" width="8" height="3.4" rx="1" fill="#ff7a4a" ' + ST + ' transform="rotate(22 16 16)"/>'),
    bomb: WI('<circle cx="14.5" cy="19.5" r="10" fill="#2f2f3d" ' + ST + '/><ellipse cx="11" cy="15.5" rx="3" ry="2" fill="#6b6b84" transform="rotate(-30 11 15.5)"/><rect x="17" y="5.5" width="6" height="5" rx="1.5" fill="#8a8a95" ' + ST + ' transform="rotate(28 20 8)"/><path d="M22.5 6.5q4-4 6-0.5" stroke="#c9a06a" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="28.5" cy="5" r="2.6" fill="#FFB400" ' + ST + '/>'),
    heli: WI('<rect x="2" y="5" width="28" height="2.6" rx="1.3" fill="#23272A" ' + ST + '/><rect x="15" y="7" width="2.4" height="3.2" fill="#23272A"/><ellipse cx="14" cy="16.5" rx="9.5" ry="6" fill="#56733F" ' + ST + '/><path d="M6.5 14.5q1.5-4 6-3.6v6.2h-8.4z" fill="#8AD0FF" ' + ST + '/><rect x="21" y="14" width="9" height="3.2" rx="1.4" fill="#56733F" ' + ST + '/><rect x="27.5" y="9.5" width="2.6" height="6.2" rx="1" fill="#FFB400" ' + ST + '/><path d="M5 25h17M9 22v3M18 22v3" stroke="#0E0E0E" stroke-width="2" stroke-linecap="round"/>'),
    tank: WI('<rect x="2" y="21" width="28" height="7.5" rx="3.75" fill="#1B1D1F" ' + ST + '/><circle cx="6.5" cy="24.7" r="2.2" fill="#8d949c"/><circle cx="16" cy="24.7" r="2.2" fill="#8d949c"/><circle cx="25.5" cy="24.7" r="2.2" fill="#8d949c"/><path d="M5 21l2.5-5.5h17L27 21z" fill="#56733F" ' + ST + '/><rect x="10" y="9.5" width="12" height="7" rx="3" fill="#6B8A4C" ' + ST + '/><rect x="21" y="11" width="10" height="2.6" rx="1.2" fill="#16181A" ' + ST + '/><rect x="11" y="12.5" width="9" height="1.8" fill="#FFB400"/>'),
  };
  W_ICO.jet = WI('<path d="M16 1.5l2.4 8.2 11 8.3v3.2l-11-3.2-.8 7.4 4.2 3v1.9L16 28.2l-5.8 2.1v-1.9l4.2-3-.8-7.4-11 3.2V18l11-8.3z" fill="#7F8C97" ' + ST + '/><path d="M16 5.6l1.3 5.2h-2.6z" fill="#0E0E0E"/><ellipse cx="16" cy="12.5" rx="1.7" ry="3.2" fill="#6EC6FF" ' + ST + '/><path d="M2.8 18.4l6.8-2M29.2 18.4l-6.8-2" stroke="#FFB400" stroke-width="2.2" stroke-linecap="round"/><rect x="10.8" y="29.2" width="3.2" height="2.2" rx="1" fill="#FF8A2A"/><rect x="18" y="29.2" width="3.2" height="2.2" rx="1" fill="#FF8A2A"/>');
  const SWAP_ICO = '<svg viewBox="0 0 24 24" class="wi"><path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="#ECE9E1" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const COIN_ICO = '<svg viewBox="0 0 24 24" class="ico"><circle cx="12" cy="12" r="10.5" fill="#FFB400" stroke="#0E0E0E" stroke-width="2"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#8a5f00" stroke-width="2"/><path d="M12 7.2l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z" fill="#8a5f00"/></svg>';
  const CFG_MAPS = () => WZ.CFG.maps.order;
  const MAP_ICO = {
    village: '<svg viewBox="0 0 120 56"><rect width="120" height="56" fill="#A9D3F2"/><path d="M0 40q30-14 60-4t60-6V56H0z" fill="#C2A866"/><rect x="22" y="26" width="30" height="20" fill="#E2D6C1" stroke="#0E0E0E" stroke-width="2"/><path d="M18 27l19-14 19 14z" fill="#B5503A" stroke="#0E0E0E" stroke-width="2"/><rect x="33" y="34" width="8" height="12" fill="#2A1F16"/><rect x="82" y="16" width="8" height="30" fill="#6B4A2B"/><path d="M78 16h16l-8-9z" fill="#B5503A" stroke="#0E0E0E" stroke-width="1.6"/></svg>',
    jurassic: '<svg viewBox="0 0 120 56"><defs><linearGradient id="jg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FC6BE"/><stop offset="1" stop-color="#F3DFA8"/></linearGradient></defs><rect width="120" height="56" fill="url(#jg)"/><path d="M60 40L74 12h12l14 28z" fill="#4A3F3A"/><path d="M74 12h12l-2 5h-8z" fill="#FF6A1A"/><circle cx="84" cy="7" r="5" fill="#8D8780" opacity=".8"/><path d="M0 42q25-12 50-4t70-6V56H0z" fill="#4F9A45" stroke="#0E0E0E" stroke-width="1.6"/><path d="M0 50q40-6 120 0" stroke="#3F9CC6" stroke-width="5" fill="none"/><path d="M18 44V26M18 26l-9 4M18 26l9 3M18 26l-5-8M18 26l6-8" stroke="#2F7A42" stroke-width="3" stroke-linecap="round"/><path d="M40 46c2-12 8-16 15-17l4-4 8 3-3 5c-3 1-5 4-5 9z" fill="#5E9440" stroke="#0E0E0E" stroke-width="1.8" stroke-linejoin="round"/><path d="M58 28l6 1" stroke="#FF8A2A" stroke-width="3" stroke-linecap="round"/></svg>',
  };
  const W_ORDER = ['mine', 'gun', 'heavy', 'bomb', 'heli', 'tank', 'jet'];

  const UI = {
    giantBarMax: 10, giantEls: [],
    root: null, c: {}, arrowEls: [], dbgOn: false, h: {},

    mount(host) {
      host.innerHTML = '';
      const root = document.createElement('div'); root.id = 'wz-root'; host.appendChild(root); UI.root = root;
      root.innerHTML =
        '<canvas id="wz-canvas"></canvas>' +
        '<div id="wz-touch"></div><div id="stick-base"></div><div id="stick-knob"></div>' +
        '<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="fg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFC23A"/><stop offset="1" stop-color="#FF4A10"/></linearGradient></defs></svg>' +
        '<div id="wz-hud" class="hidden">' +
        '  <div id="hud-top"><div id="hud-timer-box" class="panel"><div id="hud-timer">0:00</div></div>' +
        '    <div id="hud-coins" class="panel" title="' + t('hud.loot.tip') + '">' + COIN_ICO + '<span id="hud-coins-n">0</span></div>' +
        '    <div id="hud-heat" class="panel"><div class="flames">' + flameSvg(0) + flameSvg(1) + flameSvg(2) + '</div><div class="lbl">' + t('hud.heat') + '</div></div></div>' +
        '  <div id="hud-left"><div id="hud-lvl" class="panel">LVL 1</div><div id="hud-crates" class="panel">' + CRATE_ICO + '<span id="hud-crates-n">0/0</span></div>' +
        '    <div id="hud-hp" class="bar"><i style="width:100%"></i><span>' + t('hud.jeep') + '</span><em class="strikes" title="mines"><u></u><u></u></em></div>' +
        '    <div id="hud-nana" class="bar nana"><i style="width:100%"></i><span>' + t('hud.nana') + '</span><b id="hud-nana-pct" class="bar-pct">100%</b></div></div>' +
        '  <button id="btn-pause" aria-label="pause"><svg viewBox="0 0 24 24"><rect x="5" y="4" width="5" height="16" rx="1" fill="#ECE9E1"/><rect x="14" y="4" width="5" height="16" rx="1" fill="#ECE9E1"/></svg></button>' +
        '  <div id="hud-obj"></div><div id="hud-prompt" class="hidden"></div><div id="hud-hint" class="hidden"></div>' +
        '  <div id="hud-gun" class="hidden">' + BOLT_ICO + 'GUN BOOST</div>' +
        '  <div id="hud-arrows"></div>' +
        '  <div id="hud-giants"></div>' +
        '  <div id="hud-buttons"><div id="hud-defs">' +
        '<div id="w-wheel" class="hidden"><div id="w-label"></div><div class="w-strip">' + W_ORDER.map((id) => '<button class="wchip" data-w="' + id + '"><i class="cd"></i>' + W_ICO[id] + '<b>0</b><small class="k-keys">' + (W_ORDER.indexOf(id) + 1) + '</small></button>').join('') + '</div></div>' +
        '<button id="btn-wswap" aria-label="swap weapon">' + SWAP_ICO + '<small class="k-keys">Q/E</small></button>' +
        '<button id="btn-weapon" class="ready" data-w="gun"><i class="cd"></i><span id="w-ico"></span><span id="w-name">' + t('w.gun') + '</span><b id="w-n">0</b><small class="k-keys">' + t('hud.key.weapon') + '</small></button></div>' +
        '<div id="hud-main"><button id="btn-boost"><i class="cd"></i><span>' + t('hud.boost') + '</span><small class="k-keys">' + t('hud.key.boost') + '</small></button>' +
        '    <button id="btn-deploy" class="off"><span id="deploy-lbl">' + t('hud.deploy') + '</span><small class="k-keys">' + t('hud.key.deploy') + '</small></button></div></div>' +
        '</div>' +
        '<div id="wz-float"></div><div id="wz-screens"></div><div id="wz-flash" class="flash"></div><div id="wz-grain"></div><div id="wz-debug" class="hidden"></div>' +
        '<div id="wz-load"><div class="load-in"><div class="load-title">WARZAR</div><div class="load-bar"><i id="load-fill"></i></div><div class="load-sub">' + t('load.title') + '</div></div></div>';

      for (const id of ['hud-timer', 'hud-timer-box', 'hud-heat', 'hud-lvl', 'hud-crates-n', 'hud-hp', 'hud-nana', 'hud-nana-pct', 'hud-prompt', 'hud-hint', 'hud-obj', 'hud-gun', 'btn-deploy', 'deploy-lbl', 'btn-boost', 'btn-weapon', 'btn-wswap', 'w-wheel', 'w-label', 'w-ico', 'w-name', 'w-n', 'hud-coins', 'hud-coins-n', 'hud-giants', 'hud-arrows', 'wz-hud', 'wz-screens', 'wz-flash', 'wz-float', 'wz-debug', 'wz-load', 'load-fill', 'btn-pause']) UI.h[id] = $(id);
      UI.h.hpFill = UI.h['hud-hp'].firstChild; UI.h.nanaFill = UI.h['hud-nana'].firstChild; UI.h.cd = UI.h['btn-boost'].querySelector('.cd'); UI.h.wcd = UI.h['btn-weapon'].querySelector('.cd'); UI.h.chips = Array.from(UI.h['w-wheel'].querySelectorAll('.wchip')); UI.h.strikes = UI.h['hud-hp'].querySelectorAll('.strikes u');
      UI.h.rects = [$('fcr0'), $('fcr1'), $('fcr2')];
      // arrows
      for (let i = 0; i < 12; i++) {
        const a = document.createElement('div'); a.className = 'arrow hidden';
        a.innerHTML = '<svg viewBox="0 0 40 40"><path d="M20 3L36 33L20 26L4 33Z" fill="currentColor" stroke="#0E0E0E" stroke-width="3" stroke-linejoin="round"/></svg><b></b>';
        UI.h['hud-arrows'].appendChild(a); UI.arrowEls.push({ el: a, svg: a.firstChild, lbl: a.lastChild, vis: false });
      }
      // giant HP bars (pooled)
      UI.giantEls = [];
      for (let i = 0; i < UI.giantBarMax; i++) {
        const g = document.createElement('div'); g.className = 'gbar hidden';
        g.innerHTML = '<div class="gb-name">' + t('hud.giant') + '</div><div class="gb-bar"><i></i></div><em></em>';
        UI.h['hud-giants'].appendChild(g); UI.giantEls.push({ el: g, fill: g.querySelector('i'), hp: g.querySelector('em'), vis: false, pct: -1, alert: -1, n: -1 });
      }
      // film grain
      try {
        const g = document.createElement('canvas'); g.width = g.height = 96; const x = g.getContext('2d'), d = x.createImageData(96, 96);
        for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
        x.putImageData(d, 0, 0); $('wz-grain').style.backgroundImage = 'url(' + g.toDataURL() + ')';
      } catch (e) { /* grain is optional */ }
      UI.setDevice(WZ.Input.device);
      WZ.Events.on('input:device', UI.setDevice);
      return { canvas: $('wz-canvas'), touch: $('wz-touch'), stickBase: $('stick-base'), stickKnob: $('stick-knob') };
    },

    setDevice(d) { UI.root.classList.toggle('dev-touch', d === 'touch'); UI.root.classList.toggle('dev-keys', d !== 'touch'); },

    loading(p) {
      if (p === false) { UI.h['wz-load'].classList.add('done'); setTimeout(() => UI.h['wz-load'].classList.add('hidden'), 450); return; }
      UI.h['load-fill'].style.width = Math.round(p * 100) + '%';
    },

    // ------------------------------------------------------------ HUD
    hudShow(on) { UI.h['wz-hud'].classList.toggle('hidden', !on); UI.root.classList.toggle('in-mission', on); if (!on) { UI.hideArrows(0); UI.hideGiantBars(0); UI.closeWheel(); if (WZ.Input && WZ.Input.reset) WZ.Input.reset(); } },
    bindHud(handlers) {
      const dep = UI.h['btn-deploy'], bst = UI.h['btn-boost'], pz = UI.h['btn-pause'];
      const press = (el, fn) => { el.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); WZ.Audio.unlock(); fn(true); }; };
      press(dep, () => handlers.deploy());
      press(UI.h['btn-weapon'], () => handlers.weapon());
      press(UI.h['btn-wswap'], () => { handlers.wswap(); UI.openWheel(); });
      for (const chip of UI.h.chips) press(chip, () => { handlers.wsel(chip.dataset.w); UI.openWheel(); });
      bst.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); WZ.Audio.unlock(); WZ.Input.setBoost(true); };
      bst.onpointerup = bst.onpointercancel = bst.onpointerleave = () => WZ.Input.setBoost(false);
      pz.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); handlers.pause(); };
    },
    updateHUD(s) {
      const c = UI.c, h = UI.h;
      if (c.timer !== s.timerText) { c.timer = s.timerText; h['hud-timer'].textContent = s.timerText; }
      if (c.low !== s.timerLow) { c.low = s.timerLow; h['hud-timer-box'].classList.toggle('low', s.timerLow); }
      const hp = Math.round(s.heat * 50);
      if (c.heat !== hp) { c.heat = hp; for (let i = 0; i < 3; i++) { const f = Math.max(0, Math.min(1, s.heat - i)); h.rects[i].setAttribute('y', (32 * (1 - f)).toFixed(1)); h.rects[i].setAttribute('height', (32 * f).toFixed(1)); } h['hud-heat'].classList.toggle('hot', s.heat > 1.5); h['hud-heat'].classList.toggle('off', !s.heatOn); }
      if (s.level && c.lvl !== s.level) { c.lvl = s.level; if (h['hud-lvl']) h['hud-lvl'].textContent = t('hud.level', { n: s.level }); }
      if (c.crates !== s.cratesText) { c.crates = s.cratesText; h['hud-crates-n'].textContent = s.cratesText; }
      const hpw = Math.max(0, Math.min(100, Math.round(s.hp / (s.hpMax || 1) * 100)));
      if (c.hp !== hpw) { c.hp = hpw; h.hpFill.style.width = hpw + '%'; h['hud-hp'].classList.toggle('crit', hpw < 30); }
      h['hud-nana'].classList.remove('hidden');
      const nw = Math.max(0, Math.min(100, Math.round(s.nanaHp / (s.nanaMax || 1) * 100)));
      if (c.nw !== nw) { c.nw = nw; h.nanaFill.style.width = nw + '%'; if (h['hud-nana-pct']) h['hud-nana-pct'].textContent = nw + '%'; h['hud-nana'].classList.toggle('crit', nw < 35); }
      if (c.dep !== s.deploy) {
        c.dep = s.deploy; const b = h['btn-deploy'];
        b.classList.toggle('ready', s.deploy === 'deploy-ready'); b.classList.toggle('recall', s.deploy === 'recall'); b.classList.toggle('off', s.deploy === 'off');
        h['deploy-lbl'].textContent = s.deploy === 'recall' ? t('hud.recall') : t('hud.deploy');
      }
      if (c.bp !== Math.round(s.boostPct * 20)) { c.bp = Math.round(s.boostPct * 20); h.cd.style.height = (100 - s.boostPct * 100) + '%'; h['btn-boost'].classList.toggle('ready', s.boostPct >= 1); }
      if (c.prompt !== s.prompt) { c.prompt = s.prompt; h['hud-prompt'].textContent = s.prompt || ''; h['hud-prompt'].classList.toggle('hidden', !s.prompt); }
      if (c.hint !== s.hint) { c.hint = s.hint; h['hud-hint'].textContent = s.hint || ''; h['hud-hint'].classList.toggle('hidden', !s.hint); }
      if (c.obj !== s.objective) { c.obj = s.objective; h['hud-obj'].textContent = s.objective || ''; }
      UI.paintWeapons(s);
      if (c.strikes !== s.strikes) { c.strikes = s.strikes; h.strikes.forEach((u, i) => u.classList.toggle('on', i < s.strikes)); }
      const rk = s.rush > 0.5; if (c.rk !== rk) { c.rk = rk; h['hud-nana'].classList.toggle('danger', rk); h['wz-hud'].classList.toggle('rush', rk); }
      if (c.loot !== s.loot) { const up = c.loot != null && s.loot > c.loot; c.loot = s.loot; h['hud-coins-n'].textContent = s.loot; if (up) { const e = h['hud-coins']; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); } }
      if (c.gun !== s.gunBoost) { c.gun = s.gunBoost; h['hud-gun'].classList.toggle('hidden', !s.gunBoost); }
    },
    resetHudCache() { UI.c = {}; UI._wsig = ''; UI.h['hud-coins'].classList.remove('burn', 'pop'); UI.closeWheel(); },

    // ------------------------------------------------------------ weapon selector (one USE button + a swap button + a strip of all items)
    paintWeapons(s) {
      const h = UI.h, W = s.weapons, sel = s.wsel;
      let sig = sel + '|';
      for (let i = 0; i < W.length; i++) sig += W[i].n + ':' + Math.round(W[i].pct * 20) + ',';
      if (sig === UI._wsig) return; UI._wsig = sig;
      const si = W_ORDER.indexOf(sel), it = W[si], btn = h['btn-weapon'];
      if (btn.dataset.w !== sel) { btn.dataset.w = sel; h['w-ico'].innerHTML = W_ICO[sel]; h['w-name'].textContent = t('w.' + sel); }
      h['w-n'].textContent = it.n; h.wcd.style.height = (100 - it.pct * 100) + '%';
      btn.classList.toggle('ready', it.pct >= 1 && it.n > 0); btn.classList.toggle('off', !(it.n > 0));
      h.chips.forEach((ch, i) => {
        ch.classList.toggle('sel', i === si); ch.classList.toggle('off', !(W[i].n > 0)); ch.firstChild.style.height = (100 - W[i].pct * 100) + '%';
        const b = ch.querySelector('b'); if (b.textContent !== String(W[i].n)) b.textContent = W[i].n;
      });
      h['w-label'].textContent = t('w.' + sel);
    },
    /** show the weapon strip for a moment (after swapping / selecting) */
    openWheel() {
      const w = UI.h['w-wheel']; if (!w) return; w.classList.remove('hidden');
      clearTimeout(UI._wheelT); UI._wheelT = setTimeout(UI.closeWheel, 3200);
    },
    closeWheel() { clearTimeout(UI._wheelT); const w = UI.h['w-wheel']; if (w) w.classList.add('hidden'); },
    /* (unused since KO coins are always paid out; kept for the HUD style) */ burnLoot() { const e = UI.h['hud-coins']; if (e) { e.classList.remove('pop'); e.classList.add('burn'); } },

    // ------------------------------------------------------------ giant HP bars (positions are projected by WZ.Giants.bars)
    setGiantBar(i, x, y, pct, alert, hp, name) {
      const g = UI.giantEls[i]; if (!g) return;
      const nm = name || t('hud.giant'); if (g.name !== nm) { g.name = nm; g.el.firstChild.textContent = nm; }
      if (!g.vis) { g.vis = true; g.el.classList.remove('hidden'); }
      g.el.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px) translate(-50%,-100%)';
      const p = Math.round(Math.max(0, Math.min(1, pct)) * 100);
      if (g.pct !== p) { g.pct = p; g.fill.style.width = p + '%'; }
      if (g.alert !== alert) { g.alert = alert; g.el.classList.toggle('alert', !!alert); }
      const n = Math.ceil(hp); if (g.n !== n) { g.n = n; g.hp.textContent = n; }
    },
    hideGiantBars(from) { for (let i = from; i < UI.giantEls.length; i++) { const g = UI.giantEls[i]; if (g.vis) { g.vis = false; g.el.classList.add('hidden'); } } },

    /** off-screen / on-screen arrows to targets */
    setArrow(i, x, y, rotDeg, label, kind, onscreen) {
      const a = UI.arrowEls[i]; if (!a) return;
      if (!a.vis) { a.vis = true; a.el.classList.remove('hidden'); }
      a.el.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px) translate(-50%,-50%)';
      a.svg.style.transform = 'rotate(' + rotDeg.toFixed(0) + 'deg)';
      if (a.lbl.textContent !== label) a.lbl.textContent = label;
      if (a.kind !== kind) { a.kind = kind; a.el.className = 'arrow ' + kind; }
      a.el.classList.toggle('on', !!onscreen);
    },
    hideArrows(from) { for (let i = from; i < UI.arrowEls.length; i++) { const a = UI.arrowEls[i]; if (a.vis) { a.vis = false; a.el.classList.add('hidden'); } } },

    // ------------------------------------------------------------ screens
    clearScreens() { UI.h['wz-screens'].innerHTML = ''; },
    _screen(cls, html) { const d = document.createElement('div'); d.className = 'screen ' + cls; d.innerHTML = html; UI.h['wz-screens'].appendChild(d); return d; },

    showMenu(data, h) {
      UI.clearScreens();
      const lvl = Math.max(1, (data && data.level) || (WZ.Save && WZ.Save.data && WZ.Save.data.level) || 1);
      const curMap = (WZ.Save && WZ.Save.data.settings.map) || 'village';
      const el = UI._screen('menu',
        '<div class="menu-logo"><canvas id="logo-canvas"></canvas></div>' +
        '<div class="menu-bottom"><div class="map-pick" id="map-pick">' + CFG_MAPS().map((id) => '<button class="map-card' + (id === curMap ? ' sel' : '') + '" data-map="' + id + '">' + MAP_ICO[id] + '<b>' + t('maps.' + id) + '</b><small>' + t('maps.' + id + '.sub') + '</small></button>').join('') + '</div>' +
        '<button class="play-btn" id="btn-play"><small class="play-lvl">' + t('menu.level', { n: lvl }) + '</small><span>' + t('menu.play') + '</span></button></div>' +
        '<button class="garage-btn" id="btn-garage"><svg viewBox="0 0 48 28"><path d="M3 20l3-8 8-4h14l8 4 8 2 2 6z" fill="#FFB400" stroke="#0E0E0E" stroke-width="2" stroke-linejoin="round"/><circle cx="14" cy="21" r="4.2" fill="#23272A" stroke="#0E0E0E" stroke-width="2"/><circle cx="37" cy="21" r="4.2" fill="#23272A" stroke="#0E0E0E" stroke-width="2"/></svg><span>' + t('shop.title') + '</span></button>' +
        '<button class="mute-btn" id="btn-mute"></button>');
      UI.drawLogo($('logo-canvas'));
      el.querySelectorAll('.map-card').forEach((b) => { b.onclick = () => { WZ.Audio.unlock(); WZ.Audio.sfx('click'); WZ.Save.data.settings.map = b.dataset.map; WZ.Save.save(); el.querySelectorAll('.map-card').forEach((o) => o.classList.toggle('sel', o === b)); }; });
      const mute = $('btn-mute');
      const paintMute = () => { mute.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="#ECE9E1"/>' + (WZ.Audio.muted ? '<path d="M15 9l6 6M21 9l-6 6" stroke="#FF5A3A" stroke-width="2.5" stroke-linecap="round"/>' : '<path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" stroke="#ECE9E1" stroke-width="2" fill="none" stroke-linecap="round"/>') + '</svg>'; };
      paintMute();
      mute.onclick = () => { WZ.Audio.unlock(); WZ.Audio.setMuted(!WZ.Audio.muted); WZ.Save.data.settings.sound = WZ.Audio.muted ? 0 : 1; WZ.Save.save(); WZ.Audio.sfx('click'); paintMute(); };
      $('btn-play').onclick = () => { WZ.Audio.unlock(); WZ.Audio.sfx('click'); h.play(); };
      $('btn-garage').onclick = () => { WZ.Audio.unlock(); WZ.Audio.sfx('click'); h.garage(); };
      return el;
    },

    showBriefing(info, onGo) {
      UI.clearScreens();
      const el = UI._screen('briefing',
        '<div class="brief panel"><div class="brief-n">' + t('brief.mission', { n: info.index }) + '</div>' +
        (info.tutorial ? '<div class="brief-tag">' + t('brief.tutorial') + '</div>' : '') +
        (info.mapName ? '<div class="brief-map">' + info.mapName + '</div>' : '') +
        '<div class="brief-row"><span>' + CRATE_ICO + t('brief.find', { n: info.crates }) + '</span><span>' + t('brief.time', { t: WZ.U.fmtTime(info.time) }) + '</span></div>' +
        '<div class="brief-tip">' + info.tip + '</div>' +
        '<button class="btn big" id="btn-go">' + t('brief.go') + '</button></div>');
      let done = false;
      const go = () => { if (done) return; done = true; WZ.Audio.unlock(); WZ.Audio.sfx('go'); onGo(); };
      $('btn-go').onclick = go; el._go = go;
      return el;
    },

    showSummary(r, h) {
      UI.clearScreens();
      const win = r.kind === 'complete';
      let rows = '';
      if (win) {
        rows = '<div class="sum-row"><span>' + t('sum.coins.crates') + '</span><b>+' + r.coinsCrates + '</b></div>' +
          '<div class="sum-row"><span>' + t('sum.coins.kills') + '</span><b>+' + (r.coinsKills || 0) + '</b></div>' +
          '<div class="sum-row"><span>' + t('sum.coins.done') + '</span><b>+' + r.coinsDone + '</b></div>' +
          '<div class="sum-row"><span>' + t('sum.coins.time') + '</span><b>+' + r.coinsTime + '</b></div>';
      } else rows = '<div class="sum-row"><span>' + t('sum.coins.crates') + '</span><b>+' + r.coinsCrates + '</b></div>' +
        '<div class="sum-row"><span>' + t('sum.coins.kills') + '</span><b>+' + (r.coinsKills || 0) + '</b></div>';   // KO loot is banked even when the mission is lost
      const el = UI._screen('summary',
        '<div class="sum panel ' + (win ? 'win' : 'fail') + '">' +
        '<div class="sum-title">' + (win ? t('sum.complete') : t('sum.failed')) + '</div>' +
        (win ? '' : '<div class="sum-sub">' + t(({ time: 'sum.fail.time', nana: 'sum.fail.nana', mine: 'sum.fail.mine', barrel: 'sum.fail.barrel', pit: 'sum.fail.pit', giant: 'sum.fail.giant', fire: 'sum.fail.fire' })[r.reason] || 'sum.fail.jeep') + '</div><div class="sum-sub2">' + t('sum.reached', { n: r.index }) + '</div>') +
        (r.record ? '<div class="sum-record">' + t('sum.newrecord') + '</div>' : '') +
        '<div class="sum-stats"><div><small>' + t('sum.crates') + '</small><b>' + r.crates + '/' + r.total + '</b></div><div><small>' + t('sum.kos') + '</small><b>' + r.kos + '</b></div>' +
        (win ? '<div><small>' + t('sum.timeleft') + '</small><b>' + WZ.U.fmtTime(r.timeLeft) + '</b></div>' : '') + '</div>' +
        '<div class="sum-coins">' + rows + '<div class="sum-row total"><span>' + t('sum.coins.total') + '</span><b>' + r.wallet + '</b></div></div>' +
        (win ? '' : '<div class="sum-note">' + t('sum.keptcoins') + '</div>') +
        '<div class="sum-btns"><button class="btn big" id="btn-sum-main">' + (win ? t('sum.next') : t('sum.retry')) + '</button><button class="btn dark" id="btn-sum-shop">' + t('shop.title') + '</button><button class="btn dark" id="btn-sum-menu">' + t('sum.menu') + '</button></div></div>');
      $('btn-sum-main').onclick = () => { WZ.Audio.sfx('click'); h.main(); };
      $('btn-sum-menu').onclick = () => { WZ.Audio.sfx('click'); h.menu(); };
      $('btn-sum-shop').onclick = () => { WZ.Audio.sfx('click'); h.garage(); };
      return el;
    },

    showPause(h) {
      const el = UI._screen('pause',
        '<div class="panel pause-box"><div class="pause-title">' + t('pause.title') + '</div>' +
        '<button class="btn big" id="btn-resume">' + t('pause.resume') + '</button>' +
        '<button class="btn dark" id="btn-shake"></button><button class="btn dark" id="btn-mute2"></button>' +
        '<button class="btn dark" id="btn-restart">' + t('pause.restart') + '</button><button class="btn dark" id="btn-tomenu">' + t('pause.menu') + '</button></div>');
      const sh = $('btn-shake'), mu = $('btn-mute2');
      const paint = () => { sh.textContent = t(WZ.Save.data.settings.shake ? 'pause.shake.on' : 'pause.shake.off'); mu.textContent = t(WZ.Audio.muted ? 'menu.sound.off' : 'menu.sound.on'); };
      paint();
      $('btn-resume').onclick = h.resume; $('btn-restart').onclick = h.restart; $('btn-tomenu').onclick = h.menu;
      sh.onclick = () => { WZ.Save.data.settings.shake = WZ.Save.data.settings.shake ? 0 : 1; WZ.Fx.shakeOn = !!WZ.Save.data.settings.shake; WZ.Save.save(); paint(); };
      mu.onclick = () => { WZ.Audio.setMuted(!WZ.Audio.muted); WZ.Save.data.settings.sound = WZ.Audio.muted ? 0 : 1; WZ.Save.save(); paint(); };
      return el;
    },
    /** short flash on the timer when time is added */
    pulseTimer() { const b = UI.h['hud-timer-box']; if (!b) return; b.classList.remove('bonus'); void b.offsetWidth; b.classList.add('bonus'); },
    removeScreen(cls) { const e = UI.h['wz-screens'].querySelector('.screen.' + cls); if (e) e.remove(); },

    toggleDebug(on) { UI.dbgOn = on == null ? !UI.dbgOn : on; UI.h['wz-debug'].classList.toggle('hidden', !UI.dbgOn); },
    debug(txt) { if (UI.dbgOn) UI.h['wz-debug'].textContent = txt; },

    // ------------------------------------------------------------ brand logo (canvas, no image files)
    drawLogo(c) {
      const W = 900, H = 430; c.width = W; c.height = H;
      const g = c.getContext('2d'), R = WZ.RNG, rng = R.mulberry32(77), F = FONT();
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.font = '700 30px ' + F; g.fillStyle = '#fff'; g.fillText(t('logo.tag1'), W / 2, 34, 600);
      g.fillStyle = '#FFB400'; g.fillText(t('logo.tag2'), W / 2, 70, 400);
      const star = (x, y, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
      g.fillStyle = '#FFB400'; star(W / 2 - 62, 112, 20); star(W / 2, 104, 22); star(W / 2 + 62, 112, 20);
      // black brush splash
      g.fillStyle = '#0E0E0E'; g.beginPath();
      const top = [], bot = [];
      for (let x = 40; x <= 860; x += 14) { top.push([x, 150 + (rng() - 0.5) * 22 + (x < 90 || x > 810 ? -10 * rng() : 0)]); bot.push([x, 322 + (rng() - 0.5) * 22 + (x < 90 || x > 810 ? 12 * rng() : 0)]); }
      g.moveTo(14, 236); top.forEach((p) => g.lineTo(p[0], p[1])); g.lineTo(888, 226); bot.reverse().forEach((p) => g.lineTo(p[0], p[1])); g.closePath(); g.fill();
      for (let i = 0; i < 26; i++) { // brush bristle streaks at both ends
        const left = i % 2 === 0, x = left ? 14 + rng() * 60 : 826 + rng() * 70, y = 160 + rng() * 150;
        g.fillRect(left ? x - 18 : x, y, 18 + rng() * 22, 2 + rng() * 5);
      }
      g.fillStyle = '#FFB400'; // yellow streaks
      const slash = (x, y, w, h, sk) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w - sk, y + h); g.lineTo(x - sk, y + h); g.closePath(); g.fill(); };
      slash(30, 176, 46, 10, 14); slash(52, 292, 70, 9, 16); slash(786, 168, 60, 9, 14); slash(814, 290, 52, 12, 18); slash(848, 214, 26, 6, 10);
      // WARZAR letters (chipped off-white) on an offscreen layer
      const lay = document.createElement('canvas'); lay.width = W; lay.height = H; const l = lay.getContext('2d');
      l.font = '900 200px ' + F; l.textBaseline = 'alphabetic';
      const word = 'WARZAR', ws = [...word].map((ch) => l.measureText(ch).width), gap = 4, total = ws.reduce((a, b) => a + b, 0) + gap * 5;
      const sx = Math.min(0.92, 760 / total);
      l.save(); l.translate(W / 2 - total * sx / 2, 300); l.scale(sx, 1);
      let px = 0; const xs = [];
      [...word].forEach((ch, i) => { xs.push(px); l.fillStyle = '#050505'; l.fillText(ch, px + 5, 6); l.fillStyle = '#ECE9E1'; l.fillText(ch, px, 0); px += ws[i] + gap; });
      l.restore();
      l.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 260; i++) { l.globalAlpha = 0.5 + rng() * 0.5; l.fillRect(100 + rng() * 700, 150 + rng() * 150, 1 + rng() * 5, 1 + rng() * 3); }
      l.globalAlpha = 1; l.globalCompositeOperation = 'source-atop'; l.strokeStyle = 'rgba(120,115,105,.35)'; l.lineWidth = 2;
      for (let i = 0; i < 40; i++) { const x = 100 + rng() * 700, y = 150 + rng() * 150; l.beginPath(); l.moveTo(x, y); l.lineTo(x + rng() * 26 - 6, y + rng() * 12 - 6); l.stroke(); }
      g.drawImage(lay, 0, 0);
      // bullet hole in the second "A"
      const ax = W / 2 - total * sx / 2 + (xs[4] + ws[4] / 2) * sx, ay = 228;
      g.strokeStyle = 'rgba(15,15,15,.85)'; g.lineWidth = 2;
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + rng(), r = 24 + rng() * 34; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + Math.cos(a) * r, ay + Math.sin(a) * r); g.stroke(); }
      g.fillStyle = '#0A0A0A'; g.beginPath(); g.arc(ax, ay, 15, 0, 7); g.fill();
      g.strokeStyle = 'rgba(236,233,225,.9)'; g.lineWidth = 2.5; g.beginPath(); g.arc(ax, ay, 17, 0.2, 5.2); g.stroke();
      // yellow label
      g.save(); g.translate(W / 2, 372); g.rotate(-0.012);
      g.fillStyle = '#FFB400'; g.fillRect(-250, -26, 500, 52);
      g.fillStyle = '#0E0E0E'; g.font = '700 31px ' + F; g.fillText(t('logo.label'), 0, 11, 466); g.restore();
    },

    drawBrandGlobal() { /* reserved */ },
  };
  WZ.UI = UI;
})(window.WZ = window.WZ || {});
