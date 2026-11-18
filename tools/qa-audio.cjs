/* Production audio smoke. Run both npm builds first. Install Playwright + Chromium/WebKit separately.
 * WZ_PLAYWRIGHT points to that module if it isn't installed locally. WZ_PLAYGAMA_DIR can point at an extracted ZIP.
 * node tools/qa-audio.cjs [chromium|webkit] */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const engines = require(process.env.WZ_PLAYWRIGHT || 'playwright');
const repo = path.join(__dirname, '..');
const dist = process.env.WZ_PLAYGAMA_DIR || path.join(repo, 'dist-playgama');
const m = require('../src/game/audio-playgama/manifest.json');
const root = 'https://audio-test.invalid/games/warzar/';
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const key = 'warzar_crate_rush_save_v1';
const selected = process.argv.find((v) => v === 'webkit' || v === 'chromium');
const wait = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 14000, polling: 80 });
const snap = (page) => page.evaluate(() => {
  const a = WZ.Audio, n = WZ.Scenes.mission;
  return { state: a.ctx?.state, gain: a.master?.gain.value, ac: a.ctx?.currentTime,
    time: n.timeLeft, starts: qa.starts.length, user: WZ.Main.userPaused, host: WZ.Main.platformPaused,
    coins: WZ.Save.data.coins, inventory: JSON.stringify(WZ.Save.data.inv) };
});
async function silence(page) {
  await wait(page, () => WZ.Audio.ctx?.state === 'suspended' && WZ.Audio.master.gain.value === 0).catch(async (err) => {
    console.error('Silence check:', await snap(page), await page.evaluate(() => [WZ.Audio.userMuted, WZ.Audio.platformMuted, document.activeElement.id]));
    throw err;
  });
  const first = await snap(page);
  await page.waitForTimeout(100);
  const second = await snap(page);
  assert.equal(first.ac, second.ac, 'audio clock frozen');
  assert.equal(first.starts, second.starts, 'no new audio starts while blocked');
}
async function audible(page) {
  await wait(page, () => WZ.Audio.ctx?.state === 'running' && WZ.Audio.music);
  await wait(page, () => {
    const a = WZ.Audio;
    if (!qa.meter) {
      qa.meter = a.ctx.createAnalyser();
      qa.samples = new Float32Array(qa.meter.fftSize);
      a.master.connect(qa.meter);
    }
    qa.meter.getFloatTimeDomainData(qa.samples);
    return qa.samples.some((s) => Math.abs(s) > .001);
  });
}

function runtimeProbe(opts) {
  const { mobile, storageKey, hostMuted, initialHidden = false, withMock = true } = opts;
  const qa = window.qa = { starts: [], messages: [], reads: 0 };
  const p = BaseAudioContext.prototype, create = p.createBufferSource, decode = p.decodeAudioData;
  const encoded = new WeakMap();
  p.createOscillator = p.createPeriodicWave = p.createBuffer = () => { throw Error('Unexpected runtime synthesis'); };
  p.decodeAudioData = function (ab) {
    const { byteLength } = ab, h = new Uint8Array(ab, 0, 2);
    if (h[0] !== 0xff || (h[1] & 0xe6) !== 0xe2) throw Error('Expected MPEG Layer III');
    return decode.call(this, ab).then((buffer) => { encoded.set(buffer, byteLength); return buffer; });
  };
  p.createBufferSource = function () {
    const n = create.call(this), play = n.start;
    n.start = function (...args) {
      const bytes = encoded.get(n.buffer);
      if (!bytes) throw Error('Playback source was not decoded from MP3');
      qa.starts.push({ bytes, loop: n.loop, rate: n.playbackRate.value, from: n.loopStart, to: n.loopEnd });
      return play.apply(n, args);
    };
    return n;
  };
  const standardHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden').get.bind(document);
  let hidden = initialHidden;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden || standardHidden() });
  qa.visible = (on) => { hidden = !on; document.dispatchEvent(new Event('visibilitychange')); };
  if (!withMock) return;
  const callbacks = new Map();
  const emit = (name, value) => callbacks.get(name)?.(value);
  const subscribe = (name, cb) => callbacks.set(name, cb);
  const enabled = () => sessionStorage.getItem('fixtureHostAudio') !== 'off';
  if (sessionStorage.getItem('fixtureHostAudio') == null) sessionStorage.setItem('fixtureHostAudio', hostMuted ? 'off' : 'on');
  if (!localStorage.getItem(storageKey)) localStorage.setItem(storageKey, JSON.stringify({ progV: 2, coins: 9000,
    inv: { mines: 0 }, flags: { tutorialDone: true }, settings: { sound: 1, quality: 'low' } }));
  qa.audio = (on) => { sessionStorage.setItem('fixtureHostAudio', on ? 'on' : 'off'); emit('audio_state_changed', on); };
  let paused = false;
  qa.pause = (on) => { paused = on; emit('pause_state_changed', on); };
  qa.ad = (type, state) => {
    window.bridge.advertisement[type + 'State'] = state;
    emit(type + '_state_changed', state);
  };
  window.bridge = {
    initialize: () => Promise.resolve(),
    platform: {
      id: 'playgama', language: mobile ? 'ru' : 'en', get isAudioEnabled() { qa.reads++; return enabled(); },
      get isPaused() { return paused; }, on: subscribe, sendMessage: (msg) => { qa.messages.push(msg); return Promise.resolve(); },
    },
    storage: {
      get: (keys) => Promise.resolve(keys.map((k) => localStorage.getItem(k))),
      set: (keys, values) => { keys.forEach((k, i) => localStorage.setItem(k, values[i])); return Promise.resolve(); },
    },
    advertisement: { interstitialState: 'closed', rewardedState: 'closed', on: subscribe },
  };
}

async function checkAllClips(page) {
  return page.evaluate(async () => {
    const { manifest, urls } = WZ.AudioBank, c = new OfflineAudioContext(1, 128, manifest.sampleRate);
    const files = Object.entries(manifest.clips), problems = [];
    let next = 0;
    async function worker() {
      while (next < files.length) {
        const [id, spec] = files[next++];
        try {
          const r = await fetch(urls[id]);
          if (!r.ok) throw Error(`HTTP ${r.status}`);
          const raw = await r.arrayBuffer();
          if (raw.byteLength !== spec.bytes) throw Error('Unexpected byte count');
          const decoded = await c.decodeAudioData(raw), data = decoded.getChannelData(0);
          const start = Math.abs(data.length - spec.encodedFrames) <= 4 ? spec.delay : 0;
          if (start + spec.frames > data.length) throw Error('Truncated decode');
          let pk = 0;
          for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
            const samples=decoded.getChannelData(ch);
            for(let i=start;i<start+spec.frames;i++) pk=Math.max(pk,Math.abs(samples[i]));
          }
          if (!Number.isFinite(pk) || Math.abs(pk - spec.peak) > .11) throw Error(`Unexpected peak ${pk}/${spec.peak}`);
          if (spec.loopStart != null) for (let ch=0;ch<decoded.numberOfChannels;ch++) {
            const v=decoded.getChannelData(ch), head=start+spec.loopStart, tail=start+spec.frames-1;
            if (Math.abs(v[tail]-v[head]) > .09) throw Error(`Loop discontinuity (channel ${ch}, ${Math.abs(v[tail]-v[head]).toFixed(3)})`);
          }
        } catch (e) { problems.push(id + ': ' + e.message); }
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker));
    return problems;
  });
}

async function packaged(browser, mobile) {
  const context = await browser.newContext({ viewport: mobile ? { width: 320, height: 440 } : { width: 800, height: 510 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, reducedMotion:'reduce' });
  const page = await context.newPage();
  const failures = [], requests = new Set();
  const notify = (msg) => console.log(mobile ? 'touch:' : 'desktop:', msg);
  try {
    page.on('pageerror', (e) => failures.push(e.message));
    page.on('console', (msg) => { if (msg.type() === 'error' || msg.text().includes('Audio asset unavailable')) failures.push(msg.text()); });
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (!url.startsWith(root)) { failures.push('Unexpected request: ' + url); return route.abort(); }
      const rel = url.slice(root.length).split('?')[0] || 'index.html', file = path.join(dist, rel);
      if (!fs.existsSync(file)) { failures.push('Missing file ' + rel); return route.fulfill({ status: 404 }); }
      if (rel === 'playgama-bridge.js') return route.fulfill({body:'',contentType:mime['.js']}); // keep the init-script mock
      if (rel.endsWith('.mp3')) requests.add(rel);
      await route.fulfill({ contentType: mime[path.extname(rel)], body: fs.readFileSync(file) });
    });
    await page.addInitScript(runtimeProbe, { mobile, hostMuted: true, storageKey: key, initialHidden: mobile });
    const tap = (css) => page.locator(css)[mobile ? 'tap' : 'click']({ timeout: 12000, force: css === '#btn-play' });
    const boot = () => wait(page, () => window.WZ?.Main?.cur?.name === 'menu' && WZ.Platform._gameReady);
    const gesture = () => mobile ? page.touchscreen.tap(10, 200) : page.keyboard.press('z');
    const set = (cmd, arg) => page.evaluate(cmd, arg);
    await page.goto(root + 'index.html'); await boot();
    assert.equal(await set(() => WZ.Main.platformPaused), mobile);
    if (mobile) await set(() => qa.visible(true));
    assert.equal(await set(() => qa.reads), 1);
    assert.equal(await set(() => qa.messages.filter((msg) => msg === 'game_ready').length), 1);
    assert.equal(await page.locator('#btn-mute').isDisabled(), true);
    await gesture(); await silence(page);
    assert.equal(requests.size, 0, 'no MP3 I/O while initially host-muted');
    await set(() => qa.audio(true)); await audible(page);
    const bbox = await page.locator('#btn-mute').boundingBox();
    assert.ok(bbox.width >= 44 && bbox.height >= 44 && bbox.x >= 0 && bbox.x + bbox.width <= page.viewportSize().width);
    if (mobile) await tap('#btn-mute'); else { await page.locator('#btn-mute').focus(); await page.keyboard.press('Enter'); }
    await silence(page);
    assert.equal(await page.locator('#btn-mute').getAttribute('aria-pressed'), 'true');
    await wait(page, k=>JSON.parse(localStorage.getItem(k)).settings.sound===0,key);
    await set(() => { qa.audio(false); qa.audio(true); }); await silence(page);
    await page.reload(); await boot();
    if (mobile) await set(() => qa.visible(true));
    await gesture(); await silence(page);
    await tap('#btn-mute'); await audible(page);
    await wait(page, k=>JSON.parse(localStorage.getItem(k)).settings.sound===1,key);
    await set(() => qa.audio(false)); await silence(page);
    await page.reload(); await boot();
    if (mobile) await set(() => qa.visible(true));
    await gesture(); await silence(page);
    assert.equal(await set(() => WZ.Save.data.settings.sound), 1, 'host mute not written into the user setting');
    await set(() => qa.audio(true)); await audible(page);
    notify('initial host mute, reload with either mute source, gesture, and persisted control');

    await set(() => { qa.track = WZ.Audio.music;qa.fadeEnded=false;qa.track.addEventListener('ended',()=>{qa.fadeEnded=true;}); });
    await tap('#btn-garage');
    const beforeBuy = await set(() => WZ.Save.data.coins);
    await tap('.shop [data-act="pack"]');
    assert.ok(await set(() => WZ.Save.data.coins) < beforeBuy);
    await wait(page, (bytes) => qa.starts.some((n) => !n.loop && n.bytes === bytes), m.clips.sfx_cash.bytes);
    assert.equal(await set(() => qa.track === WZ.Audio.music), true);
    await tap('.shop [data-act="back"]'); await tap('#btn-play'); await tap('#btn-go');
    await wait(page, () => WZ.Scenes.mission.phase === 'play' && WZ.Audio.eng?.voices?.length === 6);
    await page.keyboard.down('w'); await page.keyboard.down('Shift');
    await wait(page, () => WZ.Audio.eng.rpm > .2 && WZ.Audio.eng.vol > .25);
    await page.keyboard.up('Shift'); await page.keyboard.up('w');
    await wait(page, () => qa.track !== WZ.Audio.music && qa.fadeEnded && WZ.Audio.musicFile === 'music_mission' && WZ.Audio.musicG.gain.value < .40);
    notify('real purchase cue, separate, ducked mission music, and driven/boosted MP3 engine');

    // Exercise wind with controlled distance/pan, not by forcing a random encounter in an unrelated level.
    await page.evaluate(() => { qa.windTimer = setInterval(() => WZ.Audio.windSet(.85, .7), 30); });
    await wait(page, () => WZ.Audio.wind?.voices?.length === 4 && WZ.Audio.wind.pan.pan.value > .2);
    await set(() => clearInterval(qa.windTimer));
    await wait(page, () => !WZ.Audio.wind);

    await set(() => { qa.run = WZ.Scenes.mission.jeep; qa.visible(false); qa.pause(true); qa.ad('interstitial', 'opened'); });
    await silence(page);
    const frozen = await snap(page);
    await set(() => { qa.visible(true); qa.pause(false); });
    await silence(page);
    assert.equal((await snap(page)).time, frozen.time, 'ad alone still freezes the run');
    await set(() => { window.dispatchEvent(new Event('pagehide')); qa.ad('rewarded', 'opened'); qa.ad('interstitial', 'closed'); });
    await silence(page);
    await set(() => { window.dispatchEvent(new Event('pageshow')); }); await silence(page);
    await set(() => qa.ad('rewarded', 'closed'));
    await audible(page);
    assert.equal(await set(() => qa.run === WZ.Scenes.mission.jeep), true);
    const resumed = await snap(page);
    assert.ok(resumed.time <= frozen.time && frozen.time - resumed.time < 2, 'no time lost while hidden');
    assert.equal(resumed.coins, frozen.coins);
    assert.equal(resumed.inventory, frozen.inventory);
    assert.equal(resumed.user || resumed.host, false);

    await tap('#btn-pause'); await silence(page);
    await tap('#btn-pause-mute');
    await set(() => { qa.visible(false); qa.audio(false); qa.pause(true); qa.visible(true); qa.audio(true); qa.pause(false); });
    await silence(page);
    assert.equal(await set(() => WZ.Main.userPaused && WZ.Audio.userMuted), true);
    await tap('#btn-pause-mute'); await silence(page); // unmute does not resume a manually paused mission
    await tap('#btn-resume'); await audible(page);
    assert.equal(await set(() => qa.run === WZ.Scenes.mission.jeep), true);
    notify('wind pan/expiry; overlapping visibility, page, Bridge, ad and manual pause gates keep the same run');

    assert.deepEqual(await checkAllClips(page), []);
    assert.equal(requests.size, Object.keys(m.clips).length, 'all packaged MP3s accessible beneath the game subpath');
    assert.deepEqual(failures, []);
    notify(`${requests.size} clips decoded from the package`);
  } finally { await context.close(); }
}

async function standalone(browser) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'warzar-standalone-'));
  const context = await browser.newContext({ viewport: { width: 640, height: 420 } });
  try {
    const html = path.join(tmp, 'index.html');
    fs.copyFileSync(path.join(repo, 'dist/index.html'), html);
    const page = await context.newPage(), failures = [];
    page.on('pageerror', (e) => failures.push(e.message));
    await page.route('https://bridge.playgama.com/**', (r) => r.fulfill({ body: '', contentType: 'text/javascript' }));
    await page.addInitScript(runtimeProbe, { withMock: false });
    await page.goto(pathToFileURL(html).href);
    await wait(page, () => window.WZ?.Platform?._gameReady && WZ.Main.cur?.name === 'menu');
    await page.keyboard.press('z'); await audible(page);
    assert.equal(await page.evaluate(() => WZ.Audio.musicFile), m.music);
    const urls = await page.evaluate(() => Object.entries(WZ.AudioBank.urls));
    assert.equal(urls.length, Object.keys(m.clips).length);
    for (const [id, url] of urls) {
      assert.ok(url.startsWith('data:audio/mpeg;base64,'), id);
      const raw = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
      assert.ok(raw.equals(fs.readFileSync(path.join(repo,'src/game/audio-playgama',id+'.mp3'))), `${id}: standalone and Playgama MP3 bytes differ`);
    }
    await page.locator('#btn-garage').click({ timeout: 18000 });
    assert.equal(await page.locator('.shop .ad-btn, .shop [data-act=adcoins]').count(),0);
    await page.locator('.shop [data-act=back]').click();
    // Skip Playwright's stability check for the continuously pulsing Play button.
    const play = page.locator('#btn-play');
    await play.waitFor({ state: 'visible' });
    await play.click({ timeout: 16000, force: true });
    await wait(page, (id) => WZ.Scenes.mission.phase === 'play' && WZ.Audio.musicFile === id && WZ.Audio.music?.buffer?.duration >= 79, m.missionMusic);
    await audible(page);
    assert.deepEqual(failures, []);
    console.log(`standalone file: same ${urls.length} MP3s byte for byte, separate menu/mission playback and no Shop ad`);
  } finally { await context.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
}

module.exports = { checkAllClips };
if (require.main === module) (async () => {
  for (const name of selected ? [selected] : ['chromium', 'webkit']) {
    const browser = await engines[name].launch(name === 'chromium' ? { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] } : {});
    try {
      console.log(name);
      if (!process.argv.includes('--standalone')) await packaged(browser, name === 'webkit');
      if (!process.argv.includes('--release')) await standalone(browser);
    } finally { await browser.close(); }
  }
})().catch((err) => { console.error(err); process.exitCode = 1; });
