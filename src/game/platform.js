/* WZ.Platform — the ONLY place that talks to a hosting platform (Playgama Bridge v2 / YouTube Playables).
 * Isolates lifecycle messages, audio/pause state events, Bridge cloud/local storage, and interstitial/rewarded ads
 * behind a clean adapter with a safe local fallback for unit tests and offline runs. */
(function (WZ) {
  'use strict';

  // This flag is compiled into the two entry profiles. The release never falls back to a different save backend.
  const release = !!(WZ.Build && WZ.Build.playgama);
  // Only for the downloadable file:// standalone demo, where external config fetch is unavailable.
  const FILE_CFG = { sendAnalyticsEvents: false, disableLoadingLogo: true };

  const P = {
    name: 'local-mock',
    _init: null,
    platformId: 'mock',
    bridge: null,
    ready: false,
    _gameReady: false,
    _readySent: false,
    _gameplayActive: false,
    audioEnabled: true,
    _hidden: false,
    _pageAway: false,
    _platPaused: false,
    _interstitialBusy: false,
    _rewardedBusy: false,
    get _adOpen() { return P._interstitialBusy || P._rewardedBusy; },
    _paused: false,
    _interstitialDone: null,
    _rewardedDone: null,
    _rewardedGranted: false,
    _grantReward: null,

    _syncPause(reason) {
      const want = !!(P._hidden || P._pageAway || P._platPaused || P._adOpen);
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

    // YouTube Playables exposes its own overall mute control. Playgama requires one in-game.
    hasGameMute() { return P.platformId !== 'youtube'; },

    init() {
      if (!P._init) P._init = P.connect();
      return P._init;
    },

    async connect() {
      if (typeof document !== 'undefined' && document.addEventListener) {
        const visibility = () => { P._hidden = !!document.hidden; P._syncPause('hidden'); };
        visibility();
        document.addEventListener('visibilitychange', visibility);
      }
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('pagehide', () => { P._pageAway = true; P._syncPause('pagehide'); });
        window.addEventListener('pageshow', () => {
          P._pageAway = false;
          P._hidden = typeof document !== 'undefined' && !!document.hidden;
          P._syncPause('pageshow');
        });
      }
      const b = window.bridge || window.playgamaBridge;
      if (release && (!b || !window.warzarBridgeReady)) throw new Error('Bridge did not finish initialization');
      if (b && typeof b.initialize === 'function') {
        P._syncAudio(false);
        try {
          if (!release && !b.isInitialized) {
            b.engine = 'javascript';
            if (WZ.CFG && WZ.CFG.version) b.gameVersion = String(WZ.CFG.version);
            if (typeof location !== 'undefined' && location.protocol === 'file:') {
              await b.initialize({ configFilePath: 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(FILE_CFG)) });
            } else {
              await b.initialize();
            }
          }
          if (!b.platform) throw new Error('Bridge platform module is missing');
        } catch (err) {
          if (release) throw err;
          P._syncAudio(true);
          P.ready = true;
          return P;
        }
        P.bridge = b; P.name = 'playgama-bridge';
        const EV = b.EVENT_NAME || {}, platform = b.platform, ads = b.advertisement;
        P.platformId = platform.id || 'mock';
        P._syncAudio(platform.isAudioEnabled);
        P._platPaused = platform.isPaused === true;
        if (typeof platform.on === 'function') {
          platform.on(EV.AUDIO_STATE_CHANGED || 'audio_state_changed', P._syncAudio);
          platform.on(EV.PAUSE_STATE_CHANGED || 'pause_state_changed', (state) => { P._platPaused = !!state; P._syncPause('platform'); });
        }
        if (ads) {
          P._interstitialBusy = ads.interstitialState === 'opened';
          P._rewardedBusy = ads.rewardedState === 'opened' || ads.rewardedState === 'rewarded';
          if (typeof ads.on === 'function') {
            ads.on(EV.INTERSTITIAL_STATE_CHANGED || 'interstitial_state_changed', (state) => {
              if (state === 'opened') P._interstitialBusy = true;
              if (state === 'closed' || state === 'failed') {
                P._interstitialBusy = false;
                if (P._interstitialDone) P._interstitialDone(state === 'closed');
              }
              P._syncPause('interstitial');
            });
            ads.on(EV.REWARDED_STATE_CHANGED || 'rewarded_state_changed', (state) => {
              if (state === 'opened' || state === 'rewarded') P._rewardedBusy = true;
              if (state === 'rewarded' && P._rewardedDone && !P._rewardedGranted &&
                  (!ads.rewardedPlacement || ads.rewardedPlacement === P._rewardedPlacement)) {
                P._rewardedGranted = true;
                // Credit earned coins on 'rewarded'; keep the pause and UI latch until the ad closes.
                if (P._grantReward) P._grantReward();
              }
              if (state === 'failed' || state === 'closed') {
                P._rewardedBusy = false;
                if (P._rewardedDone) P._rewardedDone(P._rewardedGranted);
              }
              P._syncPause('rewarded');
            });
          }
        }
      }
      P.ready = true;
      P._syncPause('init');
      return P;
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
      P._gameReady = true;
      if (!P.bridge || P._readySent) return;
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
      const lang = P.bridge && P.bridge.platform && P.bridge.platform.language;
      return typeof lang === 'string' && lang ? lang.slice(0, 2).toLowerCase() : 'en';
    },

    // ------------------------------------------------------------------ Storage (Requirement 3.2.1)
    async storageGet(keys) {
      if (P.bridge && P.bridge.storage && typeof P.bridge.storage.get === 'function') {
        const res = await P.bridge.storage.get(keys);
        return Array.isArray(res) ? res : [res];
      }
      if (release) throw new Error('Bridge storage is unavailable');
      return keys.map((k) => WZ.LocalStorage ? WZ.LocalStorage.get(k) : null);
    },

    async storageSet(keys, values) {
      if (P.bridge && P.bridge.storage && typeof P.bridge.storage.set === 'function') {
        return P.bridge.storage.set(keys, values);
      }
      if (release) throw new Error('Bridge storage is unavailable');
      if (WZ.LocalStorage) keys.forEach((k, i) => WZ.LocalStorage.set(k, values[i]));
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

    // SDK owns spacing and eligibility. These deadlines only release a UI waiting on a missing callback
    // before an ad has opened. Requests after a stall remain blocked by the SDK's in-flight state.
    _requestAd(kind, placement, grantReward) {
      const ads = P.bridge && P.bridge.advertisement;
      const rewarded = kind === 'rewarded', done = rewarded ? '_rewardedDone' : '_interstitialDone';
      const method = rewarded ? 'showRewarded' : 'showInterstitial';
      if (!ads || typeof ads[method] !== 'function' || !ads[rewarded ? 'isRewardedSupported' : 'isInterstitialSupported'] || P._adOpen || P._rewardedDone || P._interstitialDone ||
          [ads.rewardedState, ads.interstitialState].some((s) => s === 'loading' || s === 'opened' || s === 'rewarded')) return Promise.resolve(false);
      return new Promise((resolve) => {
        const finish = (ok) => {
          if (P[done] !== finish) return;
          clearTimeout(deadline);
          P[done] = null;
          if (rewarded) { P._rewardedGranted = false; P._rewardedPlacement = ''; P._grantReward = null; }
          resolve(!!ok);
        };
        const deadline = setTimeout(() => {
          if (!(rewarded ? P._rewardedBusy : P._interstitialBusy)) finish(false);
        }, rewarded ? 12000 : 4500);
        P[done] = finish;
        if (rewarded) { P._rewardedGranted = false; P._rewardedPlacement = placement; P._grantReward = grantReward; }
        try {
          // Bridge 2.x emits state events; failure to start (no loading/opened event) is also non-blocking.
          const rv = ads[method](placement);
          if (rv && typeof rv.catch === 'function') rv.catch(() => { if (!P._adOpen) finish(false); });
          const state = ads[kind + 'State'];
          if (state !== 'loading' && state !== 'opened' && state !== 'rewarded') finish(false);
        } catch (_) { if (!P._adOpen) finish(false); }
      });
    },

    showInterstitial(placement = 'level_completed') { return P._requestAd('interstitial', placement); },
    isRewardedSupported() { return !!(P.bridge && P.bridge.advertisement && P.bridge.advertisement.isRewardedSupported); },
    showRewarded(placement = 'bonus_coins', grantReward) { return P._requestAd('rewarded', placement, grantReward); },

  };

  WZ.Platform = P;
})(window.WZ = window.WZ || {});
