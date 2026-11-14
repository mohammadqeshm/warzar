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
    mine: WI('<ellipse cx="16" cy="21.5" rx="13" ry="5.5" fill="#23272A" ' + ST + '/><ellipse cx="16" cy="19" rx="12" ry="5.2" fill="#4B5A38" ' + ST + '/><ellipse cx="16" cy="16.8" rx="9" ry="3.8" fill="#2A2E34" ' + ST + '/><rect x="5.5" y="17.5" width="3" height="3" rx="0.8" fill="#FFB400"/><rect x="23.5" y="17.5" width="3" height="3" rx="0.8" fill="#FFB400"/><ellipse cx="16" cy="15.8" rx="4.5" ry="2.2" fill="#9CA3AB" ' + ST + '/><circle cx="16" cy="15.2" r="2.3" fill="#FF3A22" ' + ST + '/>'),
    gun: WI('<path d="M4 26l4-4h16l4 4z" fill="#2B3036" ' + ST + '/><rect x="6" y="23" width="20" height="4" rx="1.5" fill="#FFB400" ' + ST + '/><rect x="8.5" y="13" width="15" height="10" rx="2.5" fill="#3E4650" ' + ST + '/><rect x="14" y="2" width="4" height="12" rx="1.2" fill="#111315" ' + ST + '/><rect x="13" y="8" width="6" height="4" rx="1" fill="#2B3036" ' + ST + '/><rect x="13.2" y="1.5" width="5.6" height="2.4" rx="0.8" fill="#59636E" ' + ST + '/><circle cx="11.5" cy="17.5" r="1.8" fill="#38F2FF"/><rect x="14.5" y="16.2" width="5" height="2.5" rx="1" fill="#4CFF6A"/>'),
    soldier: WI('<path d="M6 28c0-5 4-8 10-8s10 3 10 8z" fill="#1F68B5" ' + ST + '/><rect x="6" y="21" width="4" height="3.5" rx="1" fill="#FFB400" ' + ST + '/><rect x="22" y="21" width="4" height="3.5" rx="1" fill="#FFB400" ' + ST + '/><rect x="9.5" y="10" width="13" height="10.5" rx="3" fill="#DCA06A" ' + ST + '/><path d="M8.5 12c0-5.5 3.2-8.5 7.5-8.5s7.5 3 7.5 8.5z" fill="#143C70" ' + ST + '/><rect x="14.2" y="3.2" width="3.6" height="5" rx="1" fill="#FFB400"/><rect x="10.5" y="12.2" width="11" height="4.4" rx="2" fill="#38F2FF" ' + ST + '/><rect x="14" y="22.5" width="14" height="3.2" rx="1" fill="#162436" ' + ST + '/>'),
    heavy: WI('<rect x="4" y="23" width="24" height="5" rx="2" fill="#FFB400" ' + ST + '/><rect x="8" y="15" width="16" height="9" rx="3" fill="#59636E" ' + ST + '/><rect x="13" y="1.5" width="7" height="15" rx="2" fill="#16181A" ' + ST + ' transform="rotate(22 16 16)"/><rect x="12.5" y="1.5" width="8" height="3.4" rx="1" fill="#ff7a4a" ' + ST + ' transform="rotate(22 16 16)"/>'),
    bomb: WI('<circle cx="14.5" cy="19.5" r="10" fill="#2f2f3d" ' + ST + '/><ellipse cx="11" cy="15.5" rx="3" ry="2" fill="#6b6b84" transform="rotate(-30 11 15.5)"/><rect x="17" y="5.5" width="6" height="5" rx="1.5" fill="#8a8a95" ' + ST + ' transform="rotate(28 20 8)"/><path d="M22.5 6.5q4-4 6-0.5" stroke="#c9a06a" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="28.5" cy="5" r="2.6" fill="#FFB400" ' + ST + '/>'),
    heli: WI('<rect x="2" y="5" width="28" height="2.6" rx="1.3" fill="#23272A" ' + ST + '/><rect x="15" y="7" width="2.4" height="3.2" fill="#23272A"/><ellipse cx="14" cy="16.5" rx="9.5" ry="6" fill="#56733F" ' + ST + '/><path d="M6.5 14.5q1.5-4 6-3.6v6.2h-8.4z" fill="#8AD0FF" ' + ST + '/><rect x="21" y="14" width="9" height="3.2" rx="1.4" fill="#56733F" ' + ST + '/><rect x="27.5" y="9.5" width="2.6" height="6.2" rx="1" fill="#FFB400" ' + ST + '/><path d="M5 25h17M9 22v3M18 22v3" stroke="#0E0E0E" stroke-width="2" stroke-linecap="round"/>'),
    tank: WI('<rect x="2" y="21" width="28" height="7.5" rx="3.75" fill="#1B1D1F" ' + ST + '/><circle cx="6.5" cy="24.7" r="2.2" fill="#8d949c"/><circle cx="16" cy="24.7" r="2.2" fill="#8d949c"/><circle cx="25.5" cy="24.7" r="2.2" fill="#8d949c"/><path d="M5 21l2.5-5.5h17L27 21z" fill="#56733F" ' + ST + '/><rect x="10" y="9.5" width="12" height="7" rx="3" fill="#6B8A4C" ' + ST + '/><rect x="21" y="11" width="10" height="2.6" rx="1.2" fill="#16181A" ' + ST + '/><rect x="11" y="12.5" width="9" height="1.8" fill="#FFB400"/>'),
  };
  W_ICO.jet = WI('<path d="M16 1.5l2.4 8.2 11 8.3v3.2l-11-3.2-.8 7.4 4.2 3v1.9L16 28.2l-5.8 2.1v-1.9l4.2-3-.8-7.4-11 3.2V18l11-8.3z" fill="#7F8C97" ' + ST + '/><path d="M16 5.6l1.3 5.2h-2.6z" fill="#0E0E0E"/><ellipse cx="16" cy="12.5" rx="1.7" ry="3.2" fill="#6EC6FF" ' + ST + '/><path d="M2.8 18.4l6.8-2M29.2 18.4l-6.8-2" stroke="#FFB400" stroke-width="2.2" stroke-linecap="round"/><rect x="10.8" y="29.2" width="3.2" height="2.2" rx="1" fill="#FF8A2A"/><rect x="18" y="29.2" width="3.2" height="2.2" rx="1" fill="#FF8A2A"/>');
  const SWAP_ICO = '<svg viewBox="0 0 24 24" class="wi"><path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="#ECE9E1" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const COIN_ICO = '<svg viewBox="0 0 24 24" class="ico"><circle cx="12" cy="12" r="10.5" fill="#FFB400" stroke="#0E0E0E" stroke-width="2"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#8a5f00" stroke-width="2"/><path d="M12 7.2l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z" fill="#8a5f00"/></svg>';
  // storefront icon for the main-menu SHOP button: striped awning, wooden stall, counter, big coin
  const SHOP_ICO = '<svg viewBox="0 0 48 48"><path d="M7 20h34v20a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" fill="#8A5A34" stroke="#0E0E0E" stroke-width="2" stroke-linejoin="round"/><rect x="11" y="24.5" width="26" height="10" rx="1.5" fill="#2A1F16" stroke="#0E0E0E" stroke-width="1.6"/><path d="M12 31l5-4 4 3 4-4 6 5" fill="none" stroke="#FFB400" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/><path d="M9 35h30" stroke="#C9A06A" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M3.5 20.5L7 8h34l3.5 12.5z" fill="#ECE9E1" stroke="#0E0E0E" stroke-width="2" stroke-linejoin="round"/><path d="M7 8h5.7l-2 12.5H3.5zM18.3 8H24v12.5h-6.7zM29.7 8h5.6l3.6 12.5h-6.7z" fill="#FF5A3A"/><path d="M3.5 20.5L7 8h34l3.5 12.5z" fill="none" stroke="#0E0E0E" stroke-width="2" stroke-linejoin="round"/><path d="M3.5 20.5q3.4 4.4 6.8 0t6.8 0 6.8 0 6.8 0 6.8 0 6.8 0" fill="#ECE9E1" stroke="#0E0E0E" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="38" cy="36.5" r="8" fill="#FFB400" stroke="#0E0E0E" stroke-width="2.2"/><circle cx="38" cy="36.5" r="4.8" fill="none" stroke="#8a5f00" stroke-width="1.8"/><path d="M38 33.4l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3z" fill="#8a5f00"/><path d="M13 3l1 2.6L16.6 6.6 14 7.6 13 10.2 12 7.6 9.4 6.6 12 5.6z" fill="#FFE27A" stroke="#0E0E0E" stroke-width=".8"/></svg>';
  const CFG_MAPS = () => WZ.CFG.maps.order;
  const MAP_ICO = {
    village: '<svg viewBox="0 0 120 56"><rect width="120" height="56" fill="#A9D3F2"/><path d="M0 40q30-14 60-4t60-6V56H0z" fill="#C2A866"/><rect x="22" y="26" width="30" height="20" fill="#E2D6C1" stroke="#0E0E0E" stroke-width="2"/><path d="M18 27l19-14 19 14z" fill="#B5503A" stroke="#0E0E0E" stroke-width="2"/><rect x="33" y="34" width="8" height="12" fill="#2A1F16"/><rect x="82" y="16" width="8" height="30" fill="#6B4A2B"/><path d="M78 16h16l-8-9z" fill="#B5503A" stroke="#0E0E0E" stroke-width="1.6"/></svg>',
    jurassic: '<svg viewBox="0 0 120 56"><defs><linearGradient id="jg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FC6BE"/><stop offset="1" stop-color="#F3DFA8"/></linearGradient></defs><rect width="120" height="56" fill="url(#jg)"/><path d="M60 40L74 12h12l14 28z" fill="#4A3F3A"/><path d="M74 12h12l-2 5h-8z" fill="#FF6A1A"/><circle cx="84" cy="7" r="5" fill="#8D8780" opacity=".8"/><path d="M0 42q25-12 50-4t70-6V56H0z" fill="#4F9A45" stroke="#0E0E0E" stroke-width="1.6"/><path d="M0 50q40-6 120 0" stroke="#3F9CC6" stroke-width="5" fill="none"/><path d="M18 44V26M18 26l-9 4M18 26l9 3M18 26l-5-8M18 26l6-8" stroke="#2F7A42" stroke-width="3" stroke-linecap="round"/><path d="M40 46c2-12 8-16 15-17l4-4 8 3-3 5c-3 1-5 4-5 9z" fill="#5E9440" stroke="#0E0E0E" stroke-width="1.8" stroke-linejoin="round"/><path d="M58 28l6 1" stroke="#FF8A2A" stroke-width="3" stroke-linecap="round"/></svg>',
    volcanic: '<svg viewBox="0 0 120 56"><defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2434"/><stop offset="0.7" stop-color="#C8662F"/><stop offset="1" stop-color="#E89048"/></linearGradient></defs><rect width="120" height="56" fill="url(#vg)"/><path d="M34 42L56 10h16l22 32z" fill="#2C201E" stroke="#0E0E0E" stroke-width="1.6" stroke-linejoin="round"/><path d="M56 10h16l-2 5H58z" fill="#FF6A1A"/><path d="M64 15l-6 27M64 15l9 27" stroke="#FF8A2A" stroke-width="2" fill="none"/><circle cx="66" cy="5" r="5" fill="#6A5A54" opacity=".85"/><circle cx="76" cy="3" r="3.4" fill="#FF9A3A"/><circle cx="52" cy="8" r="2" fill="#FF7A22"/><path d="M0 44q25-8 50-2t70-6V56H0z" fill="#3B2A26" stroke="#0E0E0E" stroke-width="1.6"/><path d="M0 51q20-6 44-1t76-3" stroke="#FF6A1A" stroke-width="5" fill="none"/><path d="M0 51q20-6 44-1t76-3" stroke="#FFC060" stroke-width="1.6" fill="none"/></svg>',
  };
  MAP_ICO.frozen = '<svg viewBox="0 0 120 56"><defs><linearGradient id="fzg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FB0D2"/><stop offset="1" stop-color="#DCE9F4"/></linearGradient></defs><rect width="120" height="56" fill="url(#fzg)"/><path d="M-4 38L24 10l16 18 14-22 22 32 14-14 28 16v18H-4z" fill="#7C8FA8" stroke="#0E0E0E" stroke-width="1.6" stroke-linejoin="round"/><path d="M24 10l-7 8 4-2 3 4 3-5 3 3zM54 6l-8 12 5-2 3 5 4-5 5 3z" fill="#F3F8FD"/><path d="M0 44q30-8 60-3t60-4v19H0z" fill="#E8F0F7" stroke="#0E0E0E" stroke-width="1.6"/><ellipse cx="62" cy="49" rx="30" ry="5" fill="#9FDBF2" stroke="#0E0E0E" stroke-width="1.4"/><path d="M48 48l10-1.5M66 50l12-2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M14 46V34M14 34l-6 8h12zM14 28l-5 8h10z" fill="#2F5A47" stroke="#0E0E0E" stroke-width="1.3" stroke-linejoin="round"/><path d="M100 46V32M100 32l-7 9h14zM100 25l-6 9h12z" fill="#2F5A47" stroke="#0E0E0E" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  MAP_ICO.harbor = '<svg viewBox="0 0 120 56"><defs><linearGradient id="hbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9DBDF"/><stop offset="1" stop-color="#9DB9C4"/></linearGradient></defs><rect width="120" height="56" fill="url(#hbg)"/><rect y="40" width="120" height="16" fill="#2F7C99"/><path d="M0 44q15-3 30 0t30 0 30 0 30 0" stroke="#8FD0E0" stroke-width="1.6" fill="none"/><rect x="0" y="34" width="70" height="22" fill="#7A8083" stroke="#0E0E0E" stroke-width="1.6"/><rect x="6" y="22" width="16" height="12" fill="#A8432F" stroke="#0E0E0E" stroke-width="1.6"/><rect x="22" y="22" width="14" height="12" fill="#35607F" stroke="#0E0E0E" stroke-width="1.6"/><rect x="10" y="12" width="15" height="10" fill="#D6B038" stroke="#0E0E0E" stroke-width="1.6"/><rect x="38" y="26" width="14" height="8" fill="#3F7A52" stroke="#0E0E0E" stroke-width="1.6"/><path d="M62 34V6M62 6h-22M62 6h30M92 6v5" stroke="#E0602A" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="88" y="11" width="8" height="5" fill="#C9772E" stroke="#0E0E0E" stroke-width="1.2"/><rect x="72" y="36" width="44" height="6" fill="#8D9291" stroke="#0E0E0E" stroke-width="1.4"/><path d="M92 36l6 6" stroke="#E8B71A" stroke-width="2.4"/><path d="M96 49l12-4 6 3-14 5z" fill="#34414A" stroke="#0E0E0E" stroke-width="1.4"/></svg>';
  const W_ORDER = ['mine', 'gun', 'soldier', 'heavy', 'bomb', 'heli', 'tank', 'jet'];

  const UI = {
    giantBarMax: 10, giantEls: [], soldierBarMax: 16, soldierEls: [],
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
        '  <div id="hud-soldiers"></div>' +
        '  <div id="hud-buttons"><div id="hud-defs">' +
        '<div id="w-wheel" class="hidden"><div id="w-label"></div><div class="w-strip">' + W_ORDER.map((id) => '<button class="wchip" data-w="' + id + '"><i class="cd"></i>' + W_ICO[id] + '<b>0</b><small class="k-keys">' + (W_ORDER.indexOf(id) + 1) + '</small></button>').join('') + '</div></div>' +
        '<button id="btn-wswap" aria-label="swap weapon">' + SWAP_ICO + '<small class="k-keys">' + t('hud.key.wswap') + '</small></button>' +
        '<button id="btn-weapon" class="ready" data-w="gun"><i class="cd"></i><span id="w-ico"></span><span id="w-name">' + t('w.gun') + '</span><b id="w-n">0</b><small class="k-keys">' + t('hud.key.weapon') + '</small></button></div>' +
        '<div id="hud-main"><button id="btn-boost"><i class="cd"></i><span>' + t('hud.boost') + '</span><small class="k-keys">' + t('hud.key.boost') + '</small></button>' +
        '    <button id="btn-deploy" class="off"><span id="deploy-lbl">' + t('hud.deploy') + '</span><small class="k-keys">' + t('hud.key.deploy') + '</small></button></div></div>' +
        '</div>' +
        '<div id="wz-float"></div><div id="wz-screens"></div><div id="wz-flash" class="flash"></div><div id="wz-grain"></div><div id="wz-debug" class="hidden"></div>' +
        '<div id="wz-load"><div class="load-in">' +
        '  <div class="load-title">WARZAR</div>' +
        '  <div class="load-car-wrap">' +
        '    <svg class="load-car-svg" viewBox="0 0 240 110" aria-hidden="true">' +
        '      <defs>' +
        '        <clipPath id="load-car-clip"><rect id="load-car-rect" x="0" y="0" width="0" height="110"/></clipPath>' +
        '        <linearGradient id="load-yel" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFE46B"/><stop offset="55%" stop-color="#FFB400"/><stop offset="100%" stop-color="#D98A00"/></linearGradient>' +
        '        <g id="load-jeep-shape">' +
        '          <rect x="82" y="8" width="22" height="10" rx="3"/>' +
        '          <rect x="104" y="10" width="44" height="5" rx="2"/>' +
        '          <rect x="90" y="18" width="8" height="12"/>' +
        '          <path d="M22 68 L28 42 L68 42 L78 26 L136 26 L152 44 L204 48 L212 68 L218 68 L218 78 L16 78 L16 68 Z"/>' +
        '          <path d="M84 31 L130 31 L142 44 L76 44 Z" fill-opacity="0.35"/>' +
        '          <rect x="34" y="28" width="32" height="14" rx="2"/>' +
        '          <rect x="14" y="50" width="10" height="18" rx="3"/>' +
        '          <path d="M210 48 L222 44 L222 74 L210 74 Z"/>' +
        '          <circle cx="62" cy="82" r="20"/>' +
        '          <circle cx="174" cy="82" r="20"/>' +
        '        </g>' +
        '      </defs>' +
        '      <use href="#load-jeep-shape" fill="#1F2329" stroke="#525864" stroke-width="2.5" stroke-linejoin="round"/>' +
        '      <circle cx="62" cy="82" r="8" fill="#121417" stroke="#525864" stroke-width="2"/>' +
        '      <circle cx="174" cy="82" r="8" fill="#121417" stroke="#525864" stroke-width="2"/>' +
        '      <g clip-path="url(#load-car-clip)">' +
        '        <use href="#load-jeep-shape" fill="url(#load-yel)" stroke="#0E0E0E" stroke-width="2.5" stroke-linejoin="round"/>' +
        '        <path d="M84 31 L130 31 L142 44 L76 44 Z" fill="#16191E" stroke="#0E0E0E" stroke-width="2"/>' +
        '        <path d="M38 35 H62 M50 29 V41" stroke="#0E0E0E" stroke-width="2.2"/>' +
        '        <circle cx="62" cy="82" r="19" fill="#1B1E22" stroke="#FFB400" stroke-width="3" stroke-dasharray="7 4"/>' +
        '        <circle cx="62" cy="82" r="8" fill="#FFB400" stroke="#0E0E0E" stroke-width="2"/>' +
        '        <circle cx="174" cy="82" r="19" fill="#1B1E22" stroke="#FFB400" stroke-width="3" stroke-dasharray="7 4"/>' +
        '        <circle cx="174" cy="82" r="8" fill="#FFB400" stroke="#0E0E0E" stroke-width="2"/>' +
        '        <circle cx="208" cy="56" r="4" fill="#FFF8C8"/>' +
        '      </g>' +
        '    </svg>' +
        '    <div class="load-pct" id="load-pct">0%</div>' +
        '  </div>' +
        '  <div class="load-bar"><i id="load-fill"></i></div>' +
        '  <div class="load-sub">' + t('load.title') + '</div>' +
        '</div></div>';

      for (const id of ['hud-timer', 'hud-timer-box', 'hud-heat', 'hud-lvl', 'hud-crates-n', 'hud-hp', 'hud-nana', 'hud-nana-pct', 'hud-prompt', 'hud-hint', 'hud-obj', 'hud-gun', 'btn-deploy', 'deploy-lbl', 'btn-boost', 'btn-weapon', 'btn-wswap', 'w-wheel', 'w-label', 'w-ico', 'w-name', 'w-n', 'hud-coins', 'hud-coins-n', 'hud-giants', 'hud-soldiers', 'hud-arrows', 'wz-hud', 'wz-screens', 'wz-flash', 'wz-float', 'wz-debug', 'wz-load', 'load-fill', 'load-car-rect', 'load-pct', 'btn-pause']) UI.h[id] = $(id);
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
      // soldier HP + stamina bars (pooled)
      UI.soldierEls = [];
      for (let i = 0; i < UI.soldierBarMax; i++) {
        const s = document.createElement('div'); s.className = 'sbar hidden';
        s.innerHTML = '<div class="sb-name">' + t('hud.soldierTag') + '</div><div class="sb-hp"><i></i></div><div class="sb-life"><i></i></div>';
        UI.h['hud-soldiers'].appendChild(s);
        UI.soldierEls.push({ el: s, hpFill: s.querySelector('.sb-hp i'), lifeFill: s.querySelector('.sb-life i'), vis: false, hpPct: -1, lifePct: -1 });
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
      const pct = Math.max(0, Math.min(100, Math.round(p * 100)));
      if (UI.h['load-fill']) UI.h['load-fill'].style.width = pct + '%';
      if (UI.h['load-car-rect']) UI.h['load-car-rect'].setAttribute('width', (240 * pct / 100).toFixed(1));
      if (UI.h['load-pct']) UI.h['load-pct'].textContent = pct + '%';
    },

    // ------------------------------------------------------------ HUD
    hudShow(on) { UI.h['wz-hud'].classList.toggle('hidden', !on); UI.root.classList.toggle('in-mission', on); if (!on) { UI.hideArrows(0); UI.hideGiantBars(0); UI.hideSoldierBars(0); UI.closeWheel(); if (WZ.Input && WZ.Input.reset) WZ.Input.reset(); } },
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
      if (s.level && c.lvl !== s.level) { c.lvl = s.level; if (h['hud-lvl']) h['hud-lvl'].textContent = s.levelText || t('hud.level', { n: s.level }); }
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
    resetHudCache() { UI.c = {}; UI._wsig = ''; UI._wico = ''; if (UI.h['w-ico']) UI.h['w-ico'].innerHTML = ''; UI.h['hud-coins'].classList.remove('burn', 'pop'); UI.closeWheel(); },

    // ------------------------------------------------------------ weapon selector (one USE button + a swap button + a strip of all items)
    paintWeapons(s) {
      const h = UI.h, W = s.weapons, sel = s.wsel;
      let sig = sel + '|';
      for (let i = 0; i < W.length; i++) sig += W[i].n + ':' + Math.round(W[i].pct * 20) + ',';
      if (sig === UI._wsig) return; UI._wsig = sig;
      const si = W_ORDER.indexOf(sel), it = W[si], btn = h['btn-weapon'];
      // NOTE: the button ships with data-w="gun" in the markup, so we must NOT compare against dataset.w (the default "gun" icon would never be painted).
      if (UI._wico !== sel || !h['w-ico'].firstChild) { UI._wico = sel; btn.dataset.w = sel; h['w-ico'].innerHTML = W_ICO[sel]; h['w-name'].textContent = t('w.' + sel); }
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

    setSoldierBar(i, x, y, hpPct, lifePct) {
      const s = UI.soldierEls[i]; if (!s) return;
      if (!s.vis) { s.vis = true; s.el.classList.remove('hidden'); }
      s.el.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px) translate(-50%,-100%)';
      const hp = Math.round(Math.max(0, Math.min(1, hpPct)) * 100);
      if (s.hpPct !== hp) { s.hpPct = hp; s.hpFill.style.width = hp + '%'; s.el.classList.toggle('low', hp < 35); }
      const lf = Math.round(Math.max(0, Math.min(1, lifePct)) * 100);
      if (s.lifePct !== lf) { s.lifePct = lf; s.lifeFill.style.width = lf + '%'; }
    },
    hideSoldierBars(from) { for (let i = from; i < UI.soldierEls.length; i++) { const s = UI.soldierEls[i]; if (s.vis) { s.vis = false; s.el.classList.add('hidden'); } } },

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
      const PG = WZ.Progress, LV = WZ.CFG.progress.levels;
      const curMap = (WZ.Save && WZ.Save.data.settings.map) || 'village';
      const sNum = Math.max(1, CFG_MAPS().indexOf(curMap) + 1);
      const lvl = PG.current(curMap), done = PG.cleared(curMap);
      const el = UI._screen('menu',
        '<div class="menu-logo"><canvas id="logo-canvas"></canvas></div>' +
        '<div class="menu-bottom"><button class="map-chip" id="btn-maps" aria-label="' + t('maps.change') + '"><span class="mc-thumb" id="mc-thumb">' + UI._mapThumb(curMap) + '</span><span class="mc-t"><small id="mc-season">' + t('maps.current', { s: sNum }) + '</small><b id="mc-name">' + t('maps.' + curMap) + '</b><span class="mc-prog"><span class="mc-bar"><i id="mc-fill" style="width:' + (done / LV * 100) + '%"></i></span><em id="mc-n">' + t('maps.cleared', { n: done, m: LV }) + '</em></span></span><span class="mc-go">' + t('maps.change') + '</span></button>' +
        '<button class="play-btn" id="btn-play"><small class="play-lvl" id="play-lvl">' + t('menu.seasonLevel', { s: sNum, n: lvl, m: LV }) + '</small><span>' + t('menu.play') + '</span></button></div>' +
        '<button class="garage-btn" id="btn-garage" aria-label="' + t('shop.title') + '"><span class="gi">' + SHOP_ICO + '</span><span class="gt"><b>' + t('shop.title') + '</b><small>' + COIN_ICO.replace('class="ico"', 'class="coin"') + '<em id="garage-coins">' + ((WZ.Save && WZ.Save.data.coins) || 0) + '</em></small></span></button>' +
        '<button class="mute-btn" id="btn-mute"></button>');
      UI.drawLogo($('logo-canvas'));
      $('btn-maps').onclick = () => { WZ.Audio.unlock(); WZ.Audio.sfx('click'); if (h.maps) h.maps(); };
      const mute = $('btn-mute');
      const paintMute = () => { mute.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="#ECE9E1"/>' + (WZ.Audio.muted ? '<path d="M15 9l6 6M21 9l-6 6" stroke="#FF5A3A" stroke-width="2.5" stroke-linecap="round"/>' : '<path d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" stroke="#ECE9E1" stroke-width="2" fill="none" stroke-linecap="round"/>') + '</svg>'; };
      paintMute();
      mute.onclick = () => { WZ.Audio.unlock(); WZ.Audio.setMuted(!WZ.Audio.muted); WZ.Save.data.settings.sound = WZ.Audio.muted ? 0 : 1; WZ.Save.save(); WZ.Audio.sfx('click'); paintMute(); };
      $('btn-play').onclick = () => { WZ.Audio.unlock(); WZ.Audio.sfx('click'); h.play(); };
      $('btn-garage').onclick = () => { WZ.Audio.unlock(); WZ.Audio.sfx('click'); h.garage(); };
      return el;
    },

    // ------------------------------------------------------------ map selection
    _mapThumb(id) {
      const url = WZ.MapPreview && WZ.MapPreview.shot[id];
      return url ? '<img alt="" src="' + url + '">' : (MAP_ICO[id] || '').replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ');
    },
    /** keeps the main-menu map chip in sync with the selected map */
    mapChipUpdate(id) {
      const n = $('mc-name'), th = $('mc-thumb'), sn = $('mc-season'), sNum = Math.max(1, CFG_MAPS().indexOf(id) + 1);
      if (sn) sn.textContent = t('maps.current', { s: sNum });
      if (n) n.textContent = t('maps.' + id);
      if (th) th.innerHTML = UI._mapThumb(id);
      const PG = WZ.Progress, LV = WZ.CFG.progress.levels, done = PG.cleared(id), pl = $('play-lvl'), fl = $('mc-fill'), cn = $('mc-n');
      if (pl) pl.textContent = t('menu.seasonLevel', { s: sNum, n: PG.current(id), m: LV });
      if (fl) fl.style.width = (done / LV * 100) + '%';
      if (cn) cn.textContent = t('maps.cleared', { n: done, m: LV });
      const lc = $('logo-canvas');
      if (lc) UI.drawLogo(lc);
    },
    /** a real 3D render of a map finished: drop it into its card (and the menu chip) */
    setMapShot(id, url) {
      const box = UI.root && UI.root.querySelector('.ms-shot[data-shot="' + id + '"]');
      if (box && !box.querySelector('img')) { const im = new Image(); im.alt = ''; im.onload = () => { im.classList.add('on'); box.classList.add('done'); }; im.src = url; box.appendChild(im); }
      const cur = (WZ.Save && WZ.Save.data.settings.map) || 'village'; if (id === cur) UI.mapChipUpdate(id);
    },
    setMapPortrait(id, url) {
      const box = UI.root && UI.root.querySelector('.ms-portrait[data-portrait="' + id + '"]');
      if (box && !box.querySelector('img')) { const im = new Image(); im.alt = ''; im.onload = () => im.classList.add('on'); im.src = url; box.appendChild(im); }
    },
    /** dip the screen to dark, run fn() at the darkest moment (heavy scene rebuild), then fade back in */
    themeFade(fn) {
      const d = document.createElement('div'); d.className = 'theme-fade'; UI.root.appendChild(d);
      requestAnimationFrame(() => { d.classList.add('on'); setTimeout(() => { try { fn(); } finally { requestAnimationFrame(() => { d.classList.remove('on'); setTimeout(() => d.remove(), 260); }); } }, 190); });
    },

    /** Map selection screen: a horizontal carousel of every season/map in CFG.maps.order.
     *  - Browse: mouse DRAG left/right (desktop), LEFT/RIGHT buttons or arrow keys, swipe / scroll (touch). Browsing never changes the selected map.
     *  - Select: the SELECT MAP button on a card, or a click / tap on the card itself.
     *  - Every card shows the season progress (LEVEL x/10) and the 10 level nodes. Locked seasons (finish level 10 of the previous season) cannot be selected.
     *  - Tapping an open level node on a card picks the level the START button will launch. */
    showMapSelect(cur, h) {
      const ids = CFG_MAPS(), PG = WZ.Progress, LV = WZ.CFG.progress.levels, DIFF = { village: 1, jurassic: 2, frozen: 3, harbor: 3, volcanic: 4 };
      const stars = (n) => { let o = ''; for (let i = 0; i < 4; i++) o += '<i' + (i < n ? ' class="on"' : '') + '></i>'; return o; };
      const LOCK = '<svg viewBox="0 0 24 24" class="lk"><rect x="4.5" y="10.5" width="15" height="11" rx="2.2" fill="#ECE9E1" stroke="#0E0E0E" stroke-width="1.8"/><path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9" fill="none" stroke="#ECE9E1" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="15.6" r="1.7" fill="#0E0E0E"/></svg>';
      const miniStars = (n) => { let o = ''; for (let i = 0; i < 3; i++) o += '<i' + (i < n ? ' class="on"' : '') + '></i>'; return '<span class="ns">' + o + '</span>'; };
      const lvNodes = (id) => {
        const st = PG.stars(id), cl = PG.current(id); let o = '';
        for (let i = 0; i < LV; i++) {
          const L = i + 1, done = st[i] > 0, open = PG.levelUnlocked(id, L);
          o += '<button class="lv ' + (done ? 'done' : open ? 'open' : 'lock') + (open && L === cl ? ' cur' : '') + '" data-lv="' + L + '" aria-label="' + t('maps.level', { n: L }) + '">' +
            (open ? '<b>' + L + '</b>' + (done ? miniStars(st[i]) : '') : LOCK) + '</button>';
        }
        return o;
      };
      const lockMsg = (id) => { const p = PG.lockedBy(id); return p ? t('maps.unlockHint', { n: PG.seasonIndex(p) + 1, m: LV }) : ''; };
      const card = (id, i) => '<article class="ms-card' + (id === cur ? ' sel' : '') + (PG.seasonUnlocked(id) ? '' : ' locked') + '" data-map="' + id + '">' +
        '<div class="ms-shot" data-shot="' + id + '">' + (MAP_ICO[id] || '').replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ') +
        '<span class="ms-badge"></span><div class="ms-diff" title="' + t('maps.diff') + '">' + stars(DIFF[id] || 1) + '</div><div class="ms-load">' + t('maps.loading') + '</div>' +
        '<div class="ms-lock">' + LOCK + '<b>' + t('maps.locked') + '</b><small>' + lockMsg(id) + '</small></div></div>' +
        '<div class="ms-info"><div class="ms-head-block"><span class="ms-season">' + t('maps.season', { n: i + 1 }) + '</span><div class="ms-name">' + t('maps.' + id) + '</div><div class="ms-sub">' + t('maps.' + id + '.sub') + '</div></div>' +
        '<div class="ms-guard"><div class="ms-portrait" data-portrait="' + id + '"></div><div class="ms-gt"><small>' + t('maps.guardian') + '</small><b>' + t('maps.' + id + '.guard') + '</b><em>' + t('maps.' + id + '.guard.sub') + '</em></div></div>' +
        '<div class="ms-prog"><div class="ms-ph"><span>' + t('maps.levels') + '</span><b data-prog>' + PG.cleared(id) + '/' + LV + '</b></div><div class="ms-lvls" data-lvls="' + id + '">' + lvNodes(id) + '</div></div>' +
        '<div class="ms-haz"><b>' + t('maps.hazards') + '</b><span>' + t('maps.' + id + '.haz') + '</span></div>' +
        '<button class="ms-sel" data-act="select" type="button"></button></div></article>';
      const el = UI._screen('mapsel',
        '<div class="ms-top"><button class="ms-back" id="ms-back">&lsaquo; ' + t('maps.back') + '</button><div class="ms-title">' + t('maps.select') + '</div><div class="ms-count" id="ms-count"></div></div>' +
        '<div class="ms-stage"><button class="ms-arrow l" id="ms-prev" aria-label="prev">&lsaquo;</button><div class="ms-track" id="ms-track">' + ids.map(card).join('') + '</div><button class="ms-arrow r" id="ms-next" aria-label="next">&rsaquo;</button></div>' +
        '<div class="ms-dots" id="ms-dots">' + ids.map((id) => '<i data-map="' + id + '"></i>').join('') + '</div>' +
        '<div class="ms-foot"><button class="btn big" id="ms-ok">' + t('maps.confirm') + '</button></div>');
      const track = $('ms-track'), cards = [...track.children], dots = [...$('ms-dots').children];
      let view = Math.max(0, ids.indexOf(cur));                       // the card in the middle of the screen (browsing)
      const selIdx = () => Math.max(0, ids.indexOf(cur));
      const centerLeft = (i) => { const c = cards[i]; return c ? c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2 : 0; };
      const center = (i, smooth) => { track.scrollTo({ left: centerLeft(i), behavior: smooth ? 'smooth' : 'auto' }); };
      const nearest = () => { let bi = 0, bd = 1e9; const mid = track.scrollLeft + track.clientWidth / 2; cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; bi = i; } }); return bi; };
      const paintView = () => {
        dots.forEach((d, k) => d.classList.toggle('on', k === view));
        $('ms-count').textContent = t('maps.season', { n: view + 1 }) + ' (' + (view + 1) + '/' + ids.length + ')';
        $('ms-prev').classList.toggle('off', view === 0);
        $('ms-next').classList.toggle('off', view === ids.length - 1);
      };
      const paint = () => {
        cards.forEach((c) => {
          const id = c.dataset.map, isSel = id === cur, locked = !PG.seasonUnlocked(id);
          c.classList.toggle('sel', isSel); c.classList.toggle('locked', locked);
          const b = c.querySelector('.ms-badge'); b.textContent = locked ? t('maps.locked') : isSel ? t('maps.selected') : ''; b.classList.toggle('hide', !locked && !isSel);
          const sb = c.querySelector('.ms-sel'); sb.textContent = locked ? t('maps.locked') : isSel ? t('maps.selectedBtn') : t('maps.selectMap');
          sb.classList.toggle('on', isSel && !locked); sb.classList.toggle('lock', locked);
          c.querySelector('[data-prog]').textContent = PG.cleared(id) + '/' + LV;
          c.querySelector('[data-lvls]').innerHTML = lvNodes(id);
        });
        paintView();
      };
      const deny = (c) => { WZ.Audio.sfx('beep'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); };
      /** make `id` the active map (locked seasons refuse) */
      const apply = (id, scroll) => {
        const c = cards[ids.indexOf(id)]; if (!c) return false;
        if (!PG.seasonUnlocked(id)) { deny(c); if (scroll) { view = ids.indexOf(id); center(view, true); paintView(); } return false; }
        if (id !== cur) { cur = id; WZ.Audio.sfx('click'); h.select(id); paint(); }
        if (scroll) { view = ids.indexOf(id); center(view, true); paintView(); }
        return true;
      };
      // ---- clicks: SELECT MAP button, level nodes, or the card itself (a drag never counts as a click)
      let downX = 0, downY = 0, moved = false;
      cards.forEach((c) => {
        c.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; }, { passive: true });
        c.onclick = (e) => {
          if (moved || Math.hypot(e.clientX - downX, e.clientY - downY) > 14) return;
          WZ.Audio.unlock();
          const id = c.dataset.map, node = e.target.closest('.lv');
          if (node) {
            const L = +node.dataset.lv;
            if (!PG.levelUnlocked(id, L)) { deny(node); return; }
            if (!apply(id, false)) return;
            PG.setCurrent(id, L); WZ.Audio.sfx('click'); if (h.level) h.level(id, L); paint();
            return;
          }
          apply(id, true);
        };
      });
      dots.forEach((d) => { d.onclick = () => { WZ.Audio.unlock(); view = ids.indexOf(d.dataset.map); center(view, true); paintView(); }; });
      const step = (dir) => { WZ.Audio.unlock(); view = Math.max(0, Math.min(ids.length - 1, nearest() + dir)); center(view, true); paintView(); };
      $('ms-prev').onclick = () => step(-1);
      $('ms-next').onclick = () => step(1);
      // ---- mouse DRAG left / right (desktop). Touch keeps its native swipe. Release snaps to the nearest card (a quick flick moves one card).
      let drag = null, scrollRaf = 0;
      track.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        drag = { id: e.pointerId, start: view, x: e.clientX, left: track.scrollLeft, t: performance.now(), lx: e.clientX, lt: performance.now(), v: 0, on: false };
        moved = false;
      });
      track.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x;
        if (!drag.on && Math.abs(dx) > 6) { drag.on = true; moved = true; track.classList.add('dragging'); try { track.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
        if (!drag.on) return;
        const now = performance.now(), dt = Math.max(1, now - drag.lt); drag.v = 0.8 * drag.v + 0.2 * ((e.clientX - drag.lx) / dt); drag.lx = e.clientX; drag.lt = now;
        track.scrollLeft = drag.left - dx;
      });
      const endDrag = (e) => {
        if (!drag || (e && e.pointerId !== drag.id)) return;
        const d = drag; drag = null; track.classList.remove('dragging');
        try { track.releasePointerCapture(d.id); } catch (err) { /* ignore */ }
        if (!d.on) return;
        let i = nearest(); const fling = -d.v;                    // px per ms, positive = content moved left = next card
        if (i === d.start && Math.abs(fling) > 0.5) i = Math.max(0, Math.min(ids.length - 1, i + (fling > 0 ? 1 : -1)));
        view = i; center(view, true); paintView();
        setTimeout(() => { moved = false; }, 60);                  // swallow the click that follows a drag
      };
      track.addEventListener('pointerup', endDrag); track.addEventListener('pointercancel', endDrag);
      track.addEventListener('dragstart', (e) => e.preventDefault());
      // ---- touch swipe / wheel: keep the dots + counter in sync with the card that is in the middle (without selecting anything)
      track.addEventListener('scroll', () => {
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; const n = nearest(); if (n !== view && !(drag && !drag.on)) { view = n; paintView(); } });
      }, { passive: true });
      track.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          track.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      }, { passive: false });
      const key = (e) => {
        if (!el.isConnected) { window.removeEventListener('keydown', key); return; }
        if (e.code === 'ArrowLeft') step(-1); else if (e.code === 'ArrowRight') step(1);
        else if (e.code === 'Enter') { if (apply(ids[view], true)) { /* selected */ } }
        else if (e.code === 'Escape') h.close();
      };
      window.addEventListener('keydown', key);
      $('ms-back').onclick = $('ms-ok').onclick = () => { WZ.Audio.sfx('click'); h.close(); };
      paint(); center(selIdx(), false);
      requestAnimationFrame(() => { center(selIdx(), false); view = selIdx(); paintView(); });
      // images already rendered earlier in this session
      const MP = WZ.MapPreview; if (MP) ids.forEach((id) => { if (MP.shot[id]) UI.setMapShot(id, MP.shot[id]); if (MP.portrait[id]) UI.setMapPortrait(id, MP.portrait[id]); });
      return el;
    },

    showBriefing(info, onGo) {
      UI.clearScreens();
      const el = UI._screen('briefing',
        '<div class="brief panel"><div class="brief-n">' + t('brief.mission', { n: info.level || info.index, m: info.levels || WZ.CFG.progress.levels }) + '</div>' +
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

    /** count-up animation for every [data-count] inside `root` (stops by itself when the element leaves the DOM) */
    _countUp(root) {
      root.querySelectorAll('[data-count]').forEach((el) => {
        const to = +el.dataset.count, from = +(el.dataset.from || 0), pre = el.dataset.pre || '', delay = +el.dataset.delay || 0, dur = 750;
        el.textContent = pre + from;
        setTimeout(() => {
          if (!el.isConnected) return;
          const t0 = performance.now();
          const tick = (now) => {
            if (!el.isConnected) return;
            const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
            el.textContent = pre + Math.round(from + (to - from) * e);
            if (k < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }, delay);
      });
    },

    showSummary(r, h) {
      UI.clearScreens();
      const win = r.kind === 'complete';
      const STAR = '<svg viewBox="0 0 24 24"><path d="M12 1.8l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.5 5.7 21.2l1.5-7.1L1.8 9.2 9 8.4z"/></svg>';
      const row = (label, n, delay, cls) => '<div class="sum-row ' + (cls || '') + '" style="--d:' + delay + 'ms"><span>' + label + '</span><b data-count="' + n + '" data-pre="+" data-delay="' + (delay + 350) + '">+0</b></div>';
      const earned = (r.coinsCrates || 0) + (r.coinsKills || 0) + (win ? (r.coinsDone || 0) + (r.coinsTime || 0) + (r.coinsSeason || 0) : 0);
      const LV = r.levels || WZ.CFG.progress.levels;
      const totalRow = (delay) => '<div class="sum-row total" style="--d:' + delay + 'ms"><span>' + t('sum.coins.total') + '</span><b data-from="' + Math.max(0, r.wallet - earned) + '" data-count="' + r.wallet + '" data-delay="' + (delay + 300) + '">' + r.wallet + '</b></div>';
      let el;
      if (win) {
        // ---------------------------------------------------------------- VICTORY: golden sunburst, confetti, LEVEL UP badge, star rating, counting coins
        const stars = r.stars || 1, seasonUp = !!r.seasonDone, lastLvl = r.level >= LV;
        const COL = ['#FFB400', '#FF5A3A', '#4CFF6A', '#5AD6FF', '#ECE9E1', '#FF6AD0'];
        let conf = ''; for (let i = 0; i < 30; i++) { const a = (i * 37 + 11) % 100, b = (i * 53 + 7) % 100; conf += '<b style="left:' + a + '%;--dl:' + (b % 22) / 10 + 's;--du:' + (2.6 + (a % 17) / 10) + 's;--c:' + COL[i % COL.length] + ';--w:' + (6 + b % 7) + 'px;--sw:' + ((a % 2 ? 1 : -1) * (20 + b % 40)) + 'px"></b>'; }
        let rows = row(t('sum.coins.crates'), r.coinsCrates, 1500) + row(t('sum.coins.kills'), r.coinsKills || 0, 1650) + row(t('sum.coins.done'), r.coinsDone, 1800) + row(t('sum.coins.time'), r.coinsTime, 1950) + (r.coinsSeason ? row(t('sum.coins.season'), r.coinsSeason, 2100) : '');
        el = UI._screen('summary is-win',
          '<div class="win-fx"><i class="rays"></i><i class="glowc"></i><div class="confetti">' + conf + '</div></div>' +
          '<div class="sum panel win">' +
          '<div class="sum-head">' +
          '<div class="lvl-badge"><i class="lvl-ring"></i><i class="lvl-ring r2"></i><div class="lvl-core"><small>' + t(lastLvl ? 'sum.seasonClear' : 'sum.levelup') + '</small>' +
          '<div class="lvl-num"><span class="old">' + (lastLvl ? LV : r.level) + '</span><span class="new">' + (lastLvl ? '\u2605' : r.level + 1) + '</span></div></div></div>' +
          '<div class="sum-title">' + t(seasonUp ? 'sum.seasonComplete' : 'sum.complete') + '</div>' +
          '<div class="sum-stars">' + [0, 1, 2].map((i) => '<span class="star' + (i < stars ? ' got' : '') + '" style="--i:' + i + '">' + STAR + '</span>').join('') + '</div>' +
          (stars === 3 ? '<div class="sum-perfect">' + t('sum.perfect') + '</div>' : '') +
          (r.record ? '<div class="sum-record">' + t('sum.newrecord') + '</div>' : '') +
          '<div class="sum-next">' + (r.unlockedSeason ? t('sum.seasonUnlocked', { n: WZ.Progress.seasonIndex(r.unlockedSeason) + 1, name: t('maps.' + r.unlockedSeason) }) : r.allClear ? t('sum.allClear') : lastLvl ? t('sum.nextSeasonLine', { n: WZ.Progress.seasonIndex(r.theme) + 2 }) : t('sum.unlocked', { n: r.level + 1, m: LV })) + '</div></div>' +
          '<div class="sum-body"><div class="sum-stats"><div><small>' + t('sum.crates') + '</small><b>' + r.crates + '/' + r.total + '</b></div><div><small>' + t('sum.kos') + '</small><b>' + r.kos + '</b></div>' +
          '<div><small>' + t('sum.timeleft') + '</small><b>' + WZ.U.fmtTime(r.timeLeft) + '</b></div></div>' +
          '<div class="sum-coins">' + rows + totalRow(r.coinsSeason ? 2250 : 2100) + '</div></div>' +
          '<div class="sum-btns"><button class="btn big" id="btn-sum-main">' + t(r.allClear ? 'sum.replay' : lastLvl ? 'sum.nextSeason' : 'sum.next') + '</button><button class="btn dark" id="btn-sum-shop">' + t('shop.title') + '</button><button class="btn dark" id="btn-sum-menu">' + t('sum.menu') + '</button></div></div>');
        // choreography: badge flips old level -> new level (with a sound), stars pop one after another
        setTimeout(() => { if (!el.isConnected) return; el.querySelector('.lvl-badge').classList.add('up'); WZ.Audio.sfx('pickup'); }, 650);
        el.querySelectorAll('.star').forEach((s, i) => setTimeout(() => { if (!el.isConnected) return; s.classList.add('on'); if (s.classList.contains('got')) WZ.Audio.sfx('deliver'); }, 1000 + i * 260));
      } else {
        // ---------------------------------------------------------------- DEFEAT: dark, smoky, red vignette, FAILED stamp, reason icon, crate progress, a tip
        const rs = r.reason || 'jeep';
        const IC = {
          time: '<circle cx="24" cy="26" r="16" fill="#2a2a2c" stroke="#ECE9E1" stroke-width="3"/><path d="M24 14v12l8 5" stroke="#FF5A3A" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M18 6h12M24 6v4" stroke="#ECE9E1" stroke-width="3" stroke-linecap="round"/>',
          boom: '<path d="M24 3l5 11 12-4-6 11 10 6-12 3 2 12-11-7-11 7 2-12L2 27l10-6L6 10l12 4z" fill="#FF8A2A" stroke="#0E0E0E" stroke-width="2.4" stroke-linejoin="round"/><path d="M24 14l3 7 7 1-6 5 2 7-6-4-6 4 2-7-6-5 7-1z" fill="#FFD84A"/>',
          pit: '<ellipse cx="24" cy="30" rx="19" ry="9" fill="#0E0E0E" stroke="#6b4a2b" stroke-width="3"/><ellipse cx="24" cy="30" rx="12" ry="5" fill="#000"/><path d="M24 4v14M17 12l7 7 7-7" stroke="#FF5A3A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
          fire: '<path d="M24 3c2 10 13 14 13 27 0 8-6 14-13 14S11 38 11 30c0-6 4-9 5-14 3 3 4 5 5 7 2-6 1-14 3-20z" fill="#FF6A1A" stroke="#0E0E0E" stroke-width="2.4" stroke-linejoin="round"/><path d="M24 22c1 6 7 8 7 15 0 4-3 7-7 7s-7-3-7-7c0-4 3-6 4-9 2 2 2 3 3 4z" fill="#FFD84A"/>',
          nana: '<circle cx="19" cy="25" r="14" fill="#3a3a3c" stroke="#0E0E0E" stroke-width="3"/><circle cx="19" cy="25" r="9" fill="#55555a"/><path d="M31 33l14 10" stroke="#ECE9E1" stroke-width="5" stroke-linecap="round"/><path d="M13 21l4 4m0-4l-4 4M22 21l4 4m0-4l-4 4" stroke="#FF5A3A" stroke-width="2.4" stroke-linecap="round"/>',
          jeep: '<path d="M4 31l3-9 9-5h14l9 5 5 2 2 7z" fill="#6b6b6e" stroke="#0E0E0E" stroke-width="2.6" stroke-linejoin="round"/><circle cx="15" cy="33" r="5.4" fill="#23272A" stroke="#0E0E0E" stroke-width="2.4"/><circle cx="37" cy="33" r="5.4" fill="#23272A" stroke="#0E0E0E" stroke-width="2.4"/><path d="M19 9l-4 5M27 7v6M34 9l3 5" stroke="#9a9a9a" stroke-width="3" stroke-linecap="round"/>',
        };
        const ico = ({ time: 'time', nana: 'nana', mine: 'boom', barrel: 'boom', pit: 'pit', giant: 'jeep', fire: 'fire', wave: 'boom', beast: 'jeep', sea: 'pit', shell: 'boom', missile: 'boom', mech: 'jeep' })[rs] || 'jeep';
        const hint = t('sum.hint.' + (['time', 'nana', 'mine', 'barrel', 'pit', 'giant', 'fire', 'lava', 'rock', 'vent', 'wave', 'beast', 'sea', 'shell', 'missile', 'mech'].indexOf(rs) >= 0 ? rs : 'jeep'));
        let segs = ''; const tot = Math.max(1, r.total || 1); for (let i = 0; i < tot; i++) segs += '<i class="' + (i < r.crates ? 'on' : '') + '" style="--i:' + i + '"></i>';
        let smoke = ''; for (let i = 0; i < 9; i++) smoke += '<b style="left:' + (6 + i * 11) + '%;--dl:' + ((i * 7) % 5) * 0.55 + 's;--du:' + (5 + (i % 4)) + 's;--s:' + (90 + (i * 29) % 90) + 'px"></b>';
        el = UI._screen('summary is-fail',
          '<div class="fail-fx"><div class="smoke">' + smoke + '</div><i class="vig"></i></div>' +
          '<div class="sum panel fail">' +
          '<svg class="fail-cracks" viewBox="0 0 120 120" aria-hidden="true"><path d="M0 18l22 12-8 14 20 10M120 96l-28-10 6-16-18-8M60 0l-6 22 14 10" fill="none" stroke="rgba(255,90,58,.5)" stroke-width="2" stroke-linejoin="round"/></svg>' +
          '<div class="sum-head">' +
          '<div class="fail-icon"><svg viewBox="0 0 48 48">' + IC[ico] + '</svg></div>' +
          '<div class="fail-stamp">' + t('sum.stamp') + '</div>' +
          '<div class="sum-title">' + t('sum.failed') + '</div>' +
          '<div class="sum-sub">' + t(({ time: 'sum.fail.time', nana: 'sum.fail.nana', mine: 'sum.fail.mine', barrel: 'sum.fail.barrel', pit: 'sum.fail.pit', giant: 'sum.fail.giant', fire: 'sum.fail.fire', lava: 'sum.fail.lava', rock: 'sum.fail.rock', vent: 'sum.fail.vent', wave: 'sum.fail.wave', beast: 'sum.fail.beast', sea: 'sum.fail.sea', shell: 'sum.fail.shell', missile: 'sum.fail.missile', mech: 'sum.fail.mech' })[rs] || 'sum.fail.jeep') + '</div>' +
          '<div class="sum-sub2">' + t('sum.reached', { s: r.season || 1, n: r.level || r.index, m: LV }) + '</div>' +
          (r.record ? '<div class="sum-record">' + t('sum.newrecord') + '</div>' : '') + '</div>' +
          '<div class="sum-body"><div class="fail-prog"><div class="fp-h"><span>' + t('sum.progress') + '</span><b>' + r.crates + '/' + r.total + '</b></div><div class="fp-bar">' + segs + '</div>' +
          (r.crates >= r.total - 1 && r.total > 1 ? '<div class="fp-near">' + t('sum.nearly') + '</div>' : '') + '</div>' +
          '<div class="sum-stats"><div><small>' + t('sum.kos') + '</small><b>' + r.kos + '</b></div><div><small>' + t('sum.crates') + '</small><b>' + r.crates + '</b></div></div>' +
          '<div class="sum-coins">' + row(t('sum.coins.crates'), r.coinsCrates, 700) + row(t('sum.coins.kills'), r.coinsKills || 0, 850) + totalRow(1000) + '</div>' +
          '<div class="fail-tip"><b>' + t('sum.tip') + '</b><span>' + hint + '</span></div>' +
          '<div class="sum-note">' + t('sum.keptcoins') + '</div></div>' +
          '<div class="sum-btns"><button class="btn big retry" id="btn-sum-main">' + t('sum.tryagain') + '</button><button class="btn dark" id="btn-sum-shop">' + t('shop.title') + '</button><button class="btn dark" id="btn-sum-menu">' + t('sum.menu') + '</button></div></div>');
      }
      UI._countUp(el);
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
      // yellow label: displays current Season number + map name
      const curMap = (WZ.Save && WZ.Save.data && WZ.Save.data.settings && WZ.Save.data.settings.map) || 'village';
      const sNum = Math.max(1, CFG_MAPS().indexOf(curMap) + 1);
      const seasonLabel = t('maps.season', { n: sNum }) + '  ·  ' + t('maps.' + curMap);
      g.save(); g.translate(W / 2, 372); g.rotate(-0.012);
      g.fillStyle = '#FFB400'; g.fillRect(-250, -26, 500, 52);
      g.fillStyle = '#0E0E0E'; g.font = '700 31px ' + F; g.fillText(seasonLabel, 0, 11, 466); g.restore();
    },

    drawBrandGlobal() { /* reserved */ },
  };
  WZ.UI = UI;
})(window.WZ = window.WZ || {});
