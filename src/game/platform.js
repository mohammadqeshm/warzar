/* WZ.Platform — the ONLY place that talks to a hosting platform (Playgama Bridge v2 / YouTube Playables).
 * Isolates lifecycle messages, audio/pause state events, Bridge cloud/local storage, and interstitial/rewarded ads
 * behind a clean adapter with a safe local fallback for unit tests and offline runs. */
(function (WZ) {
  'use strict';

  const INLINE_CFG = {
    forciblySetPlatformId: '',
    debug: false,
    advertisement: {
      minimumDelayBetweenInterstitial: 60,
      interstitial: {
        disable: false,
        preloadOnStart: 'level_completed',
        placementFallback: 'level_completed',
        placements: [{ id: 'level_completed' }, { id: 'level_failed' }, { id: 'pause_restart' }, { id: 'pause_menu' }],
      },
      rewarded: {
        disable: false,
        preloadOnStart: 'bonus_coins',
        placementFallback: 'bonus_coins',
        placements: [{ id: 'bonus_coins' }, { id: 'shop_coins' }],
      },
    },
    leaderboards: [{ id: 'best_level', isMain: true }],
    achievements: [{ id: 'first_win' }, { id: 'season_1_clear' }],
    platforms: { youtube: {}, playgama: {}, crazy_games: { useUserToken: false }, poki: {}, yandex: { useSignedData: false }, msn: { disableAutoNotifications: false }, xiaomi: { testMode: false }, gamesnacks: {} },
  };

  const P = {
    name: 'local-mock',
    platformId: 'mock',
    bridge: null,
    ready: false,
    _readySent: false,
    _gameplayActive: false,
    audioEnabled: true,
    _hidden: false,
    _platPaused: false,
    _adOpen: false,
    _paused: false,
    _interstitialDone: null,
    _rewardedDone: null,
    _rewardedGranted: false,

    _syncPause(reason) {
      const want = !!(P._hidden || P._platPaused || P._adOpen);
      if (want === P._paused) return;
      P._paused = want;
      WZ.Events.emit(want ? 'game:pause' : 'game:resume', { reason: reason || 'platform' });
    },

    _syncAudio(enabled) {
      P.audioEnabled = enabled !== false;
      if (WZ.Audio && typeof WZ.Audio.setPlatformMuted === 'function') {
        WZ.Audio.setPlatformMuted(!P.audioEnabled);
      }
    },

    init() {
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', () => {
          P._hidden = !!document.hidden;
          P._syncPause('hidden');
        });
      }
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('pagehide', () => {
          P._hidden = true;
          P._syncPause('pagehide');
        });
        window.addEventListener('pageshow', () => {
          P._hidden = typeof document !== 'undefined' ? !!document.hidden : false;
          P._syncPause('pageshow');
        });
      }

      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          P.ready = true;
          resolve(P);
        };
        const b = typeof window !== 'undefined' ? (window.bridge || window.playgamaBridge) : null;
        if (!b || typeof b.initialize !== 'function') {
          finish();
          return;
        }
        const timer = setTimeout(finish, 4000);
        try {
          try {
            b.engine = 'javascript';
            if (WZ.CFG && WZ.CFG.version) b.gameVersion = String(WZ.CFG.version);
          } catch (e) { /* ignore */ }

          const initOpts = Object.assign({}, INLINE_CFG);
          if (typeof location !== 'undefined' && location.protocol === 'file:') {
            initOpts.configFilePath = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(INLINE_CFG));
          }

          Promise.resolve(b.initialize(initOpts)).then(() => {
            P.bridge = b;
            P.name = 'playgama-bridge';
            const EV = b.EVENT_NAME || {};

            try {
              if (b.platform) {
                P.platformId = b.platform.id || 'mock';
                if (typeof b.platform.isAudioEnabled === 'boolean') {
                  P._syncAudio(b.platform.isAudioEnabled);
                }
                if (typeof b.platform.isPaused === 'boolean') {
                  P._platPaused = b.platform.isPaused;
                }
                if (typeof b.platform.on === 'function') {
                  b.platform.on(EV.AUDIO_STATE_CHANGED || 'audio_state_changed', (isEnabled) => {
                    P._syncAudio(!!isEnabled);
                  });
                  b.platform.on(EV.PAUSE_STATE_CHANGED || 'pause_state_changed', (isPaused) => {
                    P._platPaused = !!isPaused;
                    P._syncPause('platform');
                  });
                }
              }
            } catch (e) { /* ignore */ }

            try {
              if (b.game && typeof b.game.on === 'function') {
                b.game.on(EV.VISIBILITY_STATE_CHANGED || 'visibility_state_changed', (state) => {
                  P._hidden = state === 'hidden';
                  P._syncPause('visibility');
                });
              }
            } catch (e) { /* ignore */ }

            try {
              if (b.advertisement) {
                const iState = b.advertisement.interstitialState;
                const rState = b.advertisement.rewardedState;
                if (iState === 'opened' || rState === 'opened') {
                  P._adOpen = true;
                }
                if (typeof b.advertisement.on === 'function') {
                  b.advertisement.on(EV.INTERSTITIAL_STATE_CHANGED || 'interstitial_state_changed', (state) => {
                    if (state === 'loading' || state === 'opened') {
                      P._adOpen = true;
                      P._syncPause('interstitial');
                    } else if (state === 'closed' || state === 'failed') {
                      P._adOpen = false;
                      P._syncPause('interstitial');
                      if (P._interstitialDone) {
                        const cb = P._interstitialDone;
                        P._interstitialDone = null;
                        cb(state === 'closed');
                      }
                    }
                  });
                  b.advertisement.on(EV.REWARDED_STATE_CHANGED || 'rewarded_state_changed', (state) => {
                    if (state === 'loading' || state === 'opened') {
                      P._adOpen = true;
                      P._syncPause('rewarded');
                    } else if (state === 'rewarded') {
                      P._rewardedGranted = true;
                    } else if (state === 'closed' || state === 'failed') {
                      P._adOpen = false;
                      P._syncPause('rewarded');
                      if (P._rewardedDone) {
                        const cb = P._rewardedDone;
                        const granted = P._rewardedGranted && state === 'closed';
                        P._rewardedDone = null;
                        P._rewardedGranted = false;
                        cb(granted);
                      }
                    }
                  });
                }
              }
            } catch (e) { /* ignore */ }

            P._syncPause('init');
            clearTimeout(timer);
            finish();
          }).catch(() => {
            clearTimeout(timer);
            finish();
          });
        } catch (e) {
          clearTimeout(timer);
          finish();
        }
      });
    },

    /** Report loading progress (0..1) to Playgama Bridge. */
    setLoadingProgress(pct01) {
      if (!P.bridge || typeof P.bridge.setGameLoadingProgress !== 'function') return;
      try {
        P.bridge.setGameLoadingProgress(Math.round(Math.max(0, Math.min(1, pct01 || 0)) * 100));
      } catch (e) { /* ignore */ }
    },

    /** Send a platform lifecycle message ('game_ready', 'level_started', 'level_completed', 'level_failed', 'level_paused', 'level_resumed', 'gameplay_started', 'gameplay_stopped'). */
    sendMessage(msg, opts) {
      if (!P.bridge || !P.bridge.platform || typeof P.bridge.platform.sendMessage !== 'function') return;
      try {
        Promise.resolve(opts ? P.bridge.platform.sendMessage(msg, opts) : P.bridge.platform.sendMessage(msg)).catch(() => {});
      } catch (e) { /* never break gameplay */ }
    },

    /** Send "game_ready" once the first interactive screen is shown and loading screen is hidden. */
    gameReady() {
      if (P._readySent) return;
      P._readySent = true;
      P.sendMessage('game_ready');
    },

    gameplayStart(world, level) {
      if (P._gameplayActive) return;
      P._gameplayActive = true;
      P.sendMessage('level_started', world ? { world: String(world), level: String(level || 1) } : undefined);
      P.sendMessage('gameplay_started');
    },

    gameplayStop() {
      if (!P._gameplayActive) return;
      P._gameplayActive = false;
      P.sendMessage('gameplay_stopped');
    },

    /** Player language from Playgama Bridge only (Requirement 3.4.2). Falls back to 'en'. */
    language() {
      if (P.bridge && P.bridge.platform && typeof P.bridge.platform.language === 'string' && P.bridge.platform.language) {
        return P.bridge.platform.language.slice(0, 2).toLowerCase();
      }
      return 'en';
    },

    // ------------------------------------------------------------------ Storage (Requirement 3.2.1)
    storageGet(keys) {
      const arr = Array.isArray(keys) ? keys : [keys];
      if (P.bridge && P.bridge.storage && typeof P.bridge.storage.get === 'function') {
        return Promise.resolve(P.bridge.storage.get(arr)).then((res) => (Array.isArray(res) ? res : [res])).catch(() => arr.map(() => null));
      }
      const out = arr.map((k) => {
        try { return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null; } catch (e) { return null; }
      });
      return Promise.resolve(out);
    },

    storageSet(keys, values) {
      const kArr = Array.isArray(keys) ? keys : [keys];
      const vArr = Array.isArray(values) ? values : [values];
      if (P.bridge && P.bridge.storage && typeof P.bridge.storage.set === 'function') {
        return Promise.resolve(P.bridge.storage.set(kArr, vArr)).catch(() => {});
      }
      for (let i = 0; i < kArr.length; i++) {
        try {
          if (typeof localStorage !== 'undefined') {
            const val = typeof vArr[i] === 'string' ? vArr[i] : JSON.stringify(vArr[i]);
            localStorage.setItem(kArr[i], val);
          }
        } catch (e) { /* ignore */ }
      }
      return Promise.resolve();
    },

    storageFlush() {
      if (P.bridge && P.bridge.storage && typeof P.bridge.storage.flush === 'function') {
        try { Promise.resolve(P.bridge.storage.flush()).catch(() => {}); } catch (e) { /* ignore */ }
      }
    },

    // ------------------------------------------------------------------ Advertisement (Requirement 2.1 & 2.2)
    isInterstitialSupported() {
      return !!(P.bridge && P.bridge.advertisement && P.bridge.advertisement.isInterstitialSupported);
    },

    /** Show an interstitial ad at a natural pause (level complete / game over / restart).
     *  Bridge handles minimumDelayBetweenInterstitial internally; never add custom timers. */
    showInterstitial(placement) {
      if (!P.isInterstitialSupported() || P._adOpen) return Promise.resolve(false);
      return new Promise((resolve) => {
        let settled = false;
        const finish = (ok) => {
          if (settled) return;
          settled = true;
          clearTimeout(safety);
          if (P._interstitialDone === finish) P._interstitialDone = null;
          P._adOpen = false;
          P._syncPause('interstitial');
          resolve(!!ok);
        };
        const safety = setTimeout(() => finish(false), 6000);
        P._interstitialDone = finish;
        try {
          P.bridge.advertisement.showInterstitial(placement || 'level_completed');
          const st = P.bridge.advertisement.interstitialState;
          if (st === 'failed' || st === 'closed') finish(st === 'closed');
        } catch (e) {
          finish(false);
        }
      });
    },

    isRewardedSupported() {
      return !!(P.bridge && P.bridge.advertisement && P.bridge.advertisement.isRewardedSupported);
    },

    /** Show an opt-in rewarded ad. Resolves to true ONLY if the 'rewarded' state was reached. */
    showRewarded(placement) {
      if (!P.isRewardedSupported() || P._adOpen) return Promise.resolve(false);
      return new Promise((resolve) => {
        let settled = false;
        const finish = (granted) => {
          if (settled) return;
          settled = true;
          clearTimeout(safety);
          if (P._rewardedDone === finish) P._rewardedDone = null;
          P._rewardedGranted = false;
          P._adOpen = false;
          P._syncPause('rewarded');
          resolve(!!granted);
        };
        const safety = setTimeout(() => finish(false), 45000);
        P._rewardedGranted = false;
        P._rewardedDone = finish;
        try {
          P.bridge.advertisement.showRewarded(placement || 'bonus_coins');
          const st = P.bridge.advertisement.rewardedState;
          if (st === 'failed') finish(false);
        } catch (e) {
          finish(false);
        }
      });
    },
  };

  WZ.Platform = P;
})(window.WZ = window.WZ || {});
