/* WZ.Platform — the ONLY place that talks to a hosting platform (Playgama Bridge).
 * M1: local mock + visibility handling. The official bridge file is NOT loaded yet (M4); if window.bridge
 * exists, the guarded calls below are used. Every uncertain call is tagged VERIFY AGAINST OFFICIAL DOCS. */
(function (WZ) {
  'use strict';

  const P = {
    name: 'local-mock',
    bridge: null,
    ready: false,
    _readySent: false,

    init() {
      document.addEventListener('visibilitychange', () => {
        WZ.Events.emit(document.hidden ? 'game:pause' : 'game:resume', { reason: 'hidden' });
      });
      window.addEventListener('pagehide', () => WZ.Events.emit('game:pause', { reason: 'pagehide' }));

      return new Promise((resolve) => {
        let done = false;
        const finish = () => { if (done) return; done = true; P.ready = true; resolve(P); };
        const b = window.bridge; // VERIFY AGAINST OFFICIAL DOCS: global object name of the Bridge SDK
        if (!b || typeof b.initialize !== 'function') { finish(); return; }
        const timer = setTimeout(finish, 3000);
        try {
          // VERIFY AGAINST OFFICIAL DOCS: bridge.initialize() returns a Promise
          Promise.resolve(b.initialize()).then(() => {
            P.bridge = b; P.name = 'playgama-bridge';
            try {
              // VERIFY AGAINST OFFICIAL DOCS: event name + payload for platform pause/resume
              if (b.game && typeof b.game.on === 'function') {
                b.game.on('visibility_state_changed', (state) => {
                  WZ.Events.emit(state === 'hidden' ? 'game:pause' : 'game:resume', { reason: 'platform' });
                });
              }
            } catch (e) { /* ignore */ }
            clearTimeout(timer); finish();
          }).catch(() => { clearTimeout(timer); finish(); });
        } catch (e) { clearTimeout(timer); finish(); }
      });
    },

    /** Send "game ready" once the first interactive screen is shown. */
    gameReady() {
      if (P._readySent) return;
      P._readySent = true;
      if (!P.bridge) return;
      try {
        // VERIFY AGAINST OFFICIAL DOCS: message name for "game ready"
        P.bridge.platform.sendMessage('game_ready');
      } catch (e) { /* never break the game because of the platform */ }
    },

    language() {
      // VERIFY AGAINST OFFICIAL DOCS: bridge.platform.language (M4). Until then: browser language.
      return (navigator.language || 'en').slice(0, 2).toLowerCase();
    },
  };

  WZ.Platform = P;
})(window.WZ = window.WZ || {});
