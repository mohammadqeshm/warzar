// Headless test for Playgama Bridge v2 & YouTube Playables integration (WZ.Platform, WZ.Save, WZ.Audio, WZ.I18n).
const fs = require('fs'), vm = require('vm'), path = require('path');
const base = path.join(__dirname, '../src/game/');
global.window = global;
global.document = { hidden: false, addEventListener() {} };
global.location = { protocol: 'https:', search: '' };
global.performance = { now: () => 0 };

const issues = [], ok = (c, m) => { if (!c) issues.push(m); };

// Create a mock Playgama Bridge v2 object matching @playgama/bridge API
const listeners = { platform: {}, ad: {} };
const cloudStore = {};
const sentMessages = [];
let loadingPct = -1;
let adInterstitialMode = 'closed';
let adRewardedMode = 'rewarded';

global.bridge = {
  engine: '',
  gameVersion: '',
  EVENT_NAME: {
    AUDIO_STATE_CHANGED: 'audio_state_changed',
    PAUSE_STATE_CHANGED: 'pause_state_changed',
    INTERSTITIAL_STATE_CHANGED: 'interstitial_state_changed',
    REWARDED_STATE_CHANGED: 'rewarded_state_changed',
    VISIBILITY_STATE_CHANGED: 'visibility_state_changed',
  },
  initialize() {
    return Promise.resolve();
  },
  setGameLoadingProgress(pct) {
    loadingPct = pct;
  },
  platform: {
    id: 'youtube',
    language: 'es',
    isAudioEnabled: false,
    isPaused: false,
    on(ev, cb) { listeners.platform[ev] = cb; },
    sendMessage(msg, opts) { sentMessages.push([msg, opts]); return Promise.resolve(); },
  },
  storage: {
    get(keys) {
      return Promise.resolve(keys.map((k) => (k in cloudStore ? cloudStore[k] : null)));
    },
    set(keys, vals) {
      keys.forEach((k, i) => { cloudStore[k] = vals[i]; });
      return Promise.resolve();
    },
    flush() { return Promise.resolve(); },
  },
  advertisement: {
    isInterstitialSupported: true,
    isRewardedSupported: true,
    interstitialState: 'closed',
    rewardedState: 'closed',
    on(ev, cb) { listeners.ad[ev] = cb; },
    showInterstitial() {
      const cb = listeners.ad.interstitial_state_changed;
      if (adInterstitialMode === 'throttled') {
        this.interstitialState = 'loading'; if (cb) cb('loading');
        this.interstitialState = 'failed'; if (cb) cb('failed');
        return;
      }
      this.interstitialState = 'loading'; if (cb) cb('loading');
      this.interstitialState = 'opened'; if (cb) cb('opened');
      setTimeout(() => {
        this.interstitialState = 'closed'; if (cb) cb('closed');
      }, 10);
    },
    showRewarded() {
      const cb = listeners.ad.rewarded_state_changed;
      this.rewardedState = 'loading'; if (cb) cb('loading');
      this.rewardedState = 'opened'; if (cb) cb('opened');
      setTimeout(() => {
        if (adRewardedMode === 'rewarded') {
          this.rewardedState = 'rewarded'; if (cb) cb('rewarded');
        }
        this.rewardedState = 'closed'; if (cb) cb('closed');
      }, 10);
    },
  },
};

for (const f of ['config.js', 'rng.js', 'events.js', 'util.js', 'platform.js', 'save.js', 'progress.js', 'i18n.js', 'audio.js']) {
  vm.runInThisContext(fs.readFileSync(base + f, 'utf8'), { filename: f });
}

(async () => {
  const WZ = global.WZ;
  let pauseCount = 0, resumeCount = 0;
  WZ.Events.on('game:pause', () => pauseCount++);
  WZ.Events.on('game:resume', () => resumeCount++);

  await WZ.Platform.init();
  ok(WZ.Platform.name === 'playgama-bridge', 'Bridge initialized');
  ok(WZ.Platform.platformId === 'youtube', 'Platform ID read from bridge');
  ok(WZ.Audio.platformMuted === true && WZ.Audio.muted === true, 'Initial platform.isAudioEnabled=false muted audio');

  // User unmuting must NOT override platform mute (Requirement 3.3.4)
  WZ.Audio.setMuted(false);
  ok(WZ.Audio.muted === true, 'User unmute does not override platform mute');

  // Platform enables audio
  listeners.platform.audio_state_changed(true);
  ok(WZ.Audio.platformMuted === false && WZ.Audio.muted === false, 'Platform audio_state_changed(true) unmutes when userMuted is false');

  // Localization from platform.language ('es')
  await WZ.Save.init();
  WZ.I18n.init();
  ok(WZ.I18n.lang === 'es', 'Language initialized from bridge.platform.language (es)');
  ok(WZ.I18n.t('menu.play') === 'JUGAR', 'Spanish translation applied');

  // Storage get/set via Bridge storage
  WZ.Save.data.coins = 777;
  WZ.Save.save();
  WZ.Save.flush();
  ok(cloudStore.warzar_crate_rush_save_v1 && JSON.parse(cloudStore.warzar_crate_rush_save_v1).coins === 777, 'Save persisted to Bridge storage');

  // Loading progress & game_ready
  WZ.Platform.setLoadingProgress(0.5);
  ok(loadingPct === 50, 'setLoadingProgress forwards percentage');
  WZ.Platform.gameReady();
  WZ.Platform.gameReady(); // duplicate call ignored
  ok(sentMessages.filter((m) => m[0] === 'game_ready').length === 1, 'game_ready sent exactly once');

  // Pause state event
  listeners.platform.pause_state_changed(true);
  ok(pauseCount === 1, 'pause_state_changed(true) emitted game:pause');
  listeners.platform.pause_state_changed(false);
  ok(resumeCount === 1, 'pause_state_changed(false) emitted game:resume');

  // Interstitial ad (normal & throttled)
  const i1 = await WZ.Platform.showInterstitial('level_completed');
  ok(i1 === true && pauseCount === 2 && resumeCount === 2, 'Interstitial ad paused during ad and resumed on close');
  adInterstitialMode = 'throttled';
  const i2 = await WZ.Platform.showInterstitial('level_completed');
  ok(i2 === false, 'Throttled synchronous interstitial resolved cleanly');

  // Rewarded ad (granted vs skipped)
  adRewardedMode = 'rewarded';
  const r1 = await WZ.Platform.showRewarded('bonus_coins');
  ok(r1 === true, 'Rewarded ad resolved true when state reached rewarded');
  adRewardedMode = 'skipped';
  const r2 = await WZ.Platform.showRewarded('bonus_coins');
  ok(r2 === false, 'Rewarded ad resolved false when closed early without rewarded state');

  console.log(issues.length ? 'ISSUES:\n' + issues.join('\n') : 'NO ISSUES  (Playgama Bridge v2 init, audio/pause, i18n, storage, lifecycle, interstitial & rewarded ads)');
  process.exit(issues.length ? 1 : 0);
})();
