/* Build-time mastering only. Never imported by the game. Requires Chromium (Playwright) and FFmpeg/libmp3lame.
 * WZ_PLAYWRIGHT may point at a separately installed playwright module. Optional argument: a copy of the original audio.js.
 * FFprobe records the MP3 encoder delay for browsers that do not trim it.
 * The reference is the last in-game mix (including the quiet two-note purchase sound), not the older audio pack. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.WZ_PLAYWRIGHT || 'playwright');
const repo = path.resolve(__dirname, '..');
const out = path.resolve(repo, process.env.WZ_AUDIO_OUT || 'src/game/audio');
const ref = 'c84bd45a64125af510f3c0cd85ca3bed09838678';
const source = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8')
  : execFileSync('git', ['show', ref + ':src/game/audio.js'], { cwd: repo, encoding: 'utf8' });
const sampleRate = 44100, engineScale = 0.72, windScale = 0.85;
const names = [...source.matchAll(/case '([^']+)':/g)].map((m) => m[1]);
const gapsText = source.match(/const gap = \{([\s\S]*?)\}\[name\]/)?.[1];
if (!names.length || !gapsText || !source.includes('WZ.Audio = A;')) throw new Error('Not the reference WARZAR synthesis source');
const gaps = Object.fromEntries([...gapsText.matchAll(/(\w+):\s*([\d.]+)/g)].map((m) => [m[1], Number(m[2])]));
const engine = [0, .225, .45, .675, .90, 1.10].map((value, i) => ({ value, file: 'engine_' + ['idle', 'low', 'cruise', 'fast', 'top', 'boost'][i] }));
const wind = [.14, .42, .72, 1].map((value, i) => ({ value, file: 'tornado_' + ['breeze', 'near', 'strong', 'max'][i] }));

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const wavDir = process.env.WZ_AUDIO_PCM;
  if (wavDir) fs.mkdirSync(wavDir, { recursive: true });
  const manifest = { version: 2, format: 'mp3', sampleRate, sourceRevision: ref,
    sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
    music: 'music_village', engine: { scale: engineScale, layers: engine }, wind: { scale: windScale, layers: wind }, sfx: {}, clips: {} };
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.evaluate(({ source, sampleRate, engineScale, windScale }) => {
      const Original = Function(source.replace('WZ.Audio = A;', 'WZ.Audio = A; WZ.renderTheme = THEMES[MUSIC_THEME];'));
      const LiveContext = window.AudioContext;
      function graph(frames, seed) {
        let state = seed >>> 0;
        Math.random = () => {
          state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
          return state / 4294967296;
        };
        window.WZ = { Events: { on() {} } };
        Original();
        const A = WZ.Audio, c = new OfflineAudioContext(1, frames, sampleRate);
        // Exercise the actual original graph in an offline context before rendering, never the live device.
        Object.defineProperty(c, 'state', { get: () => 'running' });
        window.AudioContext = function () { return c; };
        A._startMusicLoop = () => {};
        try { A.unlock(); } finally { window.AudioContext = LiveContext; }
        return { A, c };
      }
      function tap(node, c) { node.disconnect(); node.connect(c.destination); }
      function blendTail(pcm, start, frames, span) {
        // Splice two equal-phase sections, leaving the start intact. This keeps the recorded loop click-free.
        const data = pcm.slice(start, start + frames), blend = Math.round(sampleRate * span);
        for (let i = 0; i < blend; i++) {
          const j = frames - blend + i, w = 0.5 - 0.5 * Math.cos(Math.PI * (i + 1) / blend);
          data[j] += (pcm[start - blend + i] - data[j]) * w;
        }
        return data;
      }
      window.bake = async ({ kind, name, value, variant = 0 }) => {
        let pcm, loopStart, cycles, hasNoise = false;
        if (kind === 'sfx') {
          const { A, c } = graph(Math.ceil(sampleRate * 1.35), 0x338D + variant * 0x1913);
          let end = 0;
          const tone = A.tone, noise = A.noise;
          A.tone = (type, f0, f1, dur, vol, delay, cut) => {
            end = Math.max(end, 0.005 + (delay || 0) + Math.max(.018, dur || .05) + .02);
            tone(type, f0, f1, dur, vol, delay, cut);
          };
          A.noise = (dur, type, f0, f1, vol, delay, q, pink) => {
            hasNoise = true;
            end = Math.max(end, 0.005 + (delay || 0) + Math.max(.025, Math.min(1, dur || .1)) + .04);
            noise(dur, type, f0, f1, vol, delay, q, pink);
          };
          // The per-sound layers AND the original shared SFX lowpass/level are linear: bake them together.
          // The runtime still does the same bus compression after relative event loudness and polyphony.
          tap(A.sfxLP, c);
          if (name === 'tick_lo') A._tickFlip = true;
          A.sfx(name.startsWith('tick_') ? 'tick' : name, 1);
          if (!end) throw new Error('No original sound: ' + name);
          pcm = (await c.startRendering()).getChannelData(0).slice(0, Math.ceil((end + .012) * sampleRate));
        } else if (kind === 'music') {
          // The original soundtrack is a 32-step, 110 BPM sequence. Keep the opening and then loop a steady cycle.
          const span = Math.round((60 / 110) * 8 * sampleRate);
          const { A, c } = graph(3 * span, 0x338D), th = WZ.renderTheme;
          const dt = span / (32 * sampleRate);
          tap(A.musicLP, c);
          for (let step = 0; step < 96; step++) A._scheduleStep(th, step % 32, step * dt, dt);
          const raw = (await c.startRendering()).getChannelData(0);
          loopStart = span;
          pcm = raw.slice(0, 2 * span);
          // Keep the first two measures as the original entrance; use the steady-state wrap for remaining laps.
          const tail = blendTail(raw, span, span, .024);
          pcm.set(tail, span);
        } else if (kind === 'engine') {
          // Every sample contains the same number of fundamental cycles at the same phase, so the live sample
          // player can continuously pitch-match and crossfade them, without osc/noise synthesis or beating.
          cycles = 160;
          const span = Math.round(sampleRate * cycles / (50 + value * 55)), dur = span / sampleRate;
          const { A, c } = graph(2 * span, 0x5DF1);
          const boost = value > .9, speed = Math.min(1, value / .9);
          A.engineStart();
          A.eng.rpm = value; A.engineSet(speed, speed, boost);
          const e = A.eng;
          for (let i = 1; i <= 4; i++) {
            const f = e['o' + i].frequency;
            f.cancelScheduledValues(0); f.setValueAtTime(i * cycles / dur, 0);
          }
          e.lfo.frequency.cancelScheduledValues(0);
          e.lfo.frequency.setValueAtTime(Math.round((9.5 + 16 * value) * dur) / dur, 0);
          e.g.gain.cancelScheduledValues(0); e.g.gain.setValueAtTime(engineScale, 0);
          tap(e.g, c); loopStart = 0;
          pcm = blendTail((await c.startRendering()).getChannelData(0), span, span, .060);
        } else { // tornado: the same warm pink-noise vortex and its own recorded gusts at each distance
          const hz = .32 + value * .65, turns = Math.ceil(3 * hz);
          const span = Math.round(sampleRate * turns / hz);
          const { A, c } = graph(2 * span, 0x2C19);
          A.windSet(value, 0);
          const w = A.wind;
          clearInterval(A._windTimer);
          w.lfo.frequency.cancelScheduledValues(0); w.lfo.frequency.setValueAtTime(turns * sampleRate / span, 0);
          w.g.gain.cancelScheduledValues(0); w.g.gain.setValueAtTime(windScale, 0);
          w.g.disconnect(); w.g.connect(A.sfxG); tap(A.sfxLP, c); loopStart = 0;
          pcm = blendTail((await c.startRendering()).getChannelData(0), span, span, .18);
        }
        let peak = 0, energy = 0;
        for (const n of pcm) { peak = Math.max(peak, Math.abs(n)); energy += n * n; }
        const data = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
        let binary = '';
        for (let i = 0; i < data.length; i += 16384) binary += String.fromCharCode(...data.subarray(i, i + 16384));
        return { frames: pcm.length, loopStart, cycles, peak, rms: Math.sqrt(energy / pcm.length), hasNoise, bytes: btoa(binary) };
      };
    }, { source, sampleRate, engineScale, windScale });

    const bake = async (name, kind, more = {}, referenceName = name) => {
      const r = await page.evaluate((spec) => bake(spec), { name: referenceName, kind, ...more });
      if (!(r.peak < .98 && r.peak > .001 && r.rms > .0001)) throw new Error(`Invalid signal: ${name} (peak ${r.peak}, rms ${r.rms})`);
      const pcm = Buffer.from(r.bytes, 'base64'), filename = path.join(out, name + '.mp3');
      execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0',
        '-map_metadata', '-1', '-c:a', 'libmp3lame', '-q:a', '2', '-write_xing', '1', '-id3v2_version', '0', filename], { input: pcm });
      if (wavDir) fs.writeFileSync(path.join(wavDir, name + '.f32'), pcm);
      const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=start_time,duration', '-of', 'json', filename])).streams[0];
      // Some Safari decoders expose the complete MP3 frames rather than applying the LAME gapless tag.
      const clip = { frames: r.frames, encodedFrames: Math.round(Number(probe.duration) * sampleRate), delay: Math.round(Number(probe.start_time) * sampleRate), ...(r.loopStart == null ? {} : { loopStart: r.loopStart }), ...(r.cycles ? { cycles: r.cycles } : {}),
        bytes: fs.statSync(filename).size, peak: Number(r.peak.toFixed(5)) };
      manifest.clips[name] = clip;
      console.log(`${name}.mp3  ${(r.frames / sampleRate).toFixed(3)}s  ${clip.bytes} bytes`);
      return r.hasNoise;
    };
    for (const name of names) {
      if (name === 'buy' || name === 'tick') continue;
      const file = 'sfx_' + name, variants = [file];
      if (await bake(file, 'sfx', {}, name)) {
        variants.push(file + '_2', file + '_3');
        await bake(file + '_2', 'sfx', { variant: 1 }, name);
        await bake(file + '_3', 'sfx', { variant: 2 }, name);
      }
      manifest.sfx[name] = { gap: gaps[name] || .05, files: variants };
    }
    manifest.sfx.buy = manifest.sfx.cash;
    manifest.sfx.tick = { gap: gaps.tick, files: ['sfx_tick_hi', 'sfx_tick_lo'] };
    for (const key of ['tick_hi', 'tick_lo']) await bake('sfx_' + key, 'sfx', {}, key);
    await bake(manifest.music, 'music');
    for (const layer of engine) await bake(layer.file, 'engine', { value: layer.value });
    for (const layer of wind) await bake(layer.file, 'wind', { value: layer.value });
    fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Mastered ${Object.keys(manifest.clips).length} files, ${Object.values(manifest.clips).reduce((n, v) => n + v.bytes, 0)} bytes total.`);
  } finally { await browser.close(); }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
