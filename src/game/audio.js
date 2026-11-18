/* WZ.Audio — sample player. Every audible source is a decoded MP3 from the packaged bank.
 * Web Audio is used only for playback, looping, fades/pitch, panning and the original mix compressors. */
(function (WZ) {
  'use strict';
  const bank = WZ.AudioBank;
  const manifest = bank && bank.manifest;
  const musicVol = { menu: 0.62, shop: 0.62, mission: 0.13 };
  const soundtrack = () => (A.curScene === 'mission' && manifest.missionMusic) || manifest.music;
  const menuFX = ['click', 'go', 'beep', 'cash'];
  const missionFX = ['deploy', 'recall', 'board', 'gun', 'tshot', 'grab', 'deliver', 'boost', 'pickup'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const decoded = new Map(), decoding = new Map(), raw = new Map();
  const MAX_VOICES = 24;

  function gain(c, value, destination) {
    const g = c.createGain(); g.gain.value = value;
    if (destination) g.connect(destination);
    return g;
  }
  function compressor(c, threshold, knee, ratio, attack, release, destination) {
    const node = c.createDynamicsCompressor();
    node.threshold.value = threshold; node.knee.value = knee; node.ratio.value = ratio;
    node.attack.value = attack; node.release.value = release;
    node.connect(destination);
    return node;
  }

  function bytes(file) {
    if (!raw.has(file)) {
      const url = bank?.urls[file];
      const promise = Promise.resolve().then(async () => {
        if (!url) throw new Error('Missing MP3: ' + file);
        if (url.startsWith('data:')) { // local/offline HTML: no fetch or object URL needed
          const str = atob(url.slice(url.indexOf(',') + 1)), out = new Uint8Array(str.length);
          for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i);
          return out.buffer;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error('MP3 request failed: ' + response.status);
        return response.arrayBuffer();
      });
      raw.set(file, promise);
    }
    return raw.get(file);
  }

  function decode(file) {
    if (!decoding.has(file)) {
      const c = A.ctx, spec = manifest.clips[file];
      decoding.set(file, bytes(file).then((data) => c.decodeAudioData(data)).then((buffer) => {
        const ratio = buffer.sampleRate / manifest.sampleRate;
        // Safari can return the encoder's full frames; Chromium normally applies the gapless tag itself.
        const untrimmed = Math.abs(buffer.length - spec.encodedFrames * ratio) <= 4;
        const startFrame = untrimmed ? Math.round(spec.delay * ratio) : 0;
        const endFrame = Math.min(buffer.length, startFrame + Math.round(spec.frames * ratio));
        const offset = startFrame / buffer.sampleRate, end = endFrame / buffer.sampleRate;
        const loopStart = (startFrame + Math.round((spec.loopStart || 0) * ratio)) / buffer.sampleRate;
        if (end <= offset || end <= loopStart) throw new Error('Invalid MP3 cue: ' + file);
        const clip = { buffer, offset, end, loopStart, length: end - offset, cycles: spec.cycles };
        decoded.set(file, clip);
        return clip;
      }).catch((err) => {
        console.warn('[WARZAR] Audio asset unavailable:', file, err);
        return null; // never fall back to synthesized sound
      }).finally(() => raw.delete(file)));
    }
    return decoding.get(file);
  }

  function loop(clip, output) {
    const source = A.ctx.createBufferSource();
    source.buffer = clip.buffer;
    source.loop = true; source.loopStart = clip.loopStart; source.loopEnd = clip.end;
    source.connect(output);
    return source;
  }
  function warm(names) {
    for (const name of names) for (const file of manifest.sfx[name].files) decode(file);
  }

  // Start phase-aligned engine layers at one audio time. Wind layers are recordings with their gusts already baked in.
  function startBank(field, group, config, bus, panned) {
    Promise.all(config.layers.map((layer) => decode(layer.file))).then((clips) => {
      if (A[field] !== group) return;
      const c = A.ctx, t = c.currentTime + 0.004;
      group.pan = panned && c.createStereoPanner ? c.createStereoPanner() : null;
      if (group.pan) group.pan.connect(bus);
      group.g = gain(c, 0, group.pan || bus);
      group.voices = [];
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i]; if (!clip) continue;
        const mix = gain(c, 0, group.g), source = loop(clip, mix);
        group.voices.push({ source, mix, value: config.layers[i].value,
          pitchScale: clip.cycles ? (clip.end - clip.loopStart) / clip.cycles : 1 / (config.baseHz || 74), offset: clip.offset });
      }
      if (field === 'eng') mixEngine(group, t, true);
      else mixWind(group, t, true);
      for (const v of group.voices) v.source.start(t, v.offset);
    });
  }

  function blend(group, key, t, glide, first, hz) {
    const voices = group.voices, n = voices.length;
    if (!n) return;
    let hi = 0;
    while (hi + 1 < n && voices[hi].value < key) hi++;
    const lo = Math.max(0, hi - 1);
    const f = hi === lo ? 0 : clamp((key - voices[lo].value) / (voices[hi].value - voices[lo].value), 0, 1);
    for (let i = 0; i < n; i++) {
      const v = voices[i], weight = i === lo ? 1 - f : i === hi ? f : 0;
      if (first) v.mix.gain.value = weight;
      else v.mix.gain.setTargetAtTime(weight, t, glide);
      if (hz) {
        if (first) v.source.playbackRate.value = hz * v.pitchScale;
        else v.source.playbackRate.setTargetAtTime(hz * v.pitchScale, t, .09);
      }
    }
  }
  function mixEngine(e, t, first) {
    blend(e, e.rpm, t, .09, first, 50 + 55 * e.rpm);
    e.g.gain.setTargetAtTime(e.vol / manifest.engine.scale, t, .10);
  }
  function mixWind(w, t, first) {
    blend(w, w.level, t, .25, first);
    const vol = w.level < .01 ? 0 : .02 + .33 * Math.pow(w.level, 1.2);
    w.g.gain.setTargetAtTime(vol / manifest.wind.scale, t, .16);
    if (w.pan) w.pan.pan.setTargetAtTime(clamp(w.side * (1 - .35 * w.level), -.8, .8), t, .14);
  }
  function stopBank(group, fade) {
    if (!group?.voices) return; // an in-flight decode cannot start a removed group
    const c = A.ctx, t = c.currentTime, fadeNow = !A.blocked && c.state === 'running';
    if (fadeNow) group.g.gain.setTargetAtTime(0, t, fade / 5);
    else group.g.disconnect();
    let left = group.voices.length;
    const release = () => { group.g.disconnect(); if (group.pan) group.pan.disconnect(); };
    if (!left) release();
    for (const v of group.voices) {
      v.source.onended = () => {
        v.source.disconnect(); v.mix.disconnect();
        if (--left === 0) release();
      };
      v.source.stop(t + (fadeNow ? fade : 0));
      if (!fadeNow) { v.source.onended(); v.source.onended = null; }
    }
  }

  const A = {
    ctx: null, master: null, music: null, musicG: null, sfxBus: null, engBus: null, eng: null, wind: null,
    curScene: 'menu', musicFile: '', _songGain: null, userMuted: false, platformMuted: false, hardSuspended: false,
    get muted() { return A.userMuted || A.platformMuted; },
    get blocked() {
      return A.muted || A.hardSuspended || !!WZ.Main?.paused || (typeof document !== 'undefined' && !!document.hidden);
    },
    _power: null, _epoch: 0, _prepared: false, _musicPending: '', _windTimer: 0, _windSeen: 0,
    _voices: new Set(), _last: Object.create(null), _variant: Object.create(null),

    prepare() {
      if (A._prepared || !manifest) return;
      A._prepared = true;
      // Fetch only the small opening essentials; do not open the browser's audio output before interaction.
      if (!A.blocked) for (const file of [manifest.music, 'sfx_click']) bytes(file).catch(() => {});
      document.addEventListener('click', (e) => { if (e.isTrusted) A.unlock(); });
    },

    unlock() {
      if (!manifest) return;
      if (!A.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { A.ctx = new AC(); } catch (e) { return; }
        const c = A.ctx;
        A.master = gain(c, 0, c.destination);
        const mix = compressor(c, -12, 6, 10, .001, .12, A.master);
        A.sfxBus = compressor(c, -15, 6, 8, .001, .09, mix);
        A.musicG = gain(c, (manifest.missionMusic && A.curScene === 'mission') ? .38 : (musicVol[A.curScene] ?? musicVol.menu), mix);
        A.engBus = gain(c, .92, mix);
      }
      A._syncPower(true);
    },

    _syncPower(gesture = false) {
      const c = A.ctx; if (!c) return;
      const run = !A.blocked, changed = run !== A._power, t = c.currentTime;
      A._power = run;
      if (changed) {
        const g = A.master.gain;
        g.cancelScheduledValues(0);
        if (run) g.setTargetAtTime(.85, t, .02);
        else {
          g.value = 0; // silence the output even if the context suspends before the next audio quantum
          A._epoch++;
          A.stopLoops(); // active gameplay will request fresh engine/wind state on return
          for (const voice of A._voices) {
            voice.source.onended = null;
            voice.source.stop(); voice.source.disconnect(); voice.g.disconnect();
          }
          A._voices.clear();
        }
      }
      if (!run) { if (changed) c.suspend().catch(() => {}); return; }
      if (changed || (gesture && c.state !== 'running')) c.resume().catch(() => {});
      if (changed) { warm(menuFX); if (A.curScene === 'mission') A._warmMission(); }
      A._startMusic();
    },

    suspend() { A.hardSuspended = true; A._syncPower(); },
    resume() {
      if (WZ.Main?.paused) return;
      A.hardSuspended = false; A._syncPower(true);
    },
    setMuted(m) {
      A.userMuted = !!m; A._syncPower(); WZ.Events.emit('audio:state');
    },
    setPlatformMuted(m) {
      A.platformMuted = !!m; A._syncPower(); WZ.Events.emit('audio:state');
    },

    /** Standalone keeps its continuous score. The Playgama profile crossfades distinct produced menu/mission tracks. */
    setMusic(scene /*, theme */) {
      if (scene) A.curScene = scene;
      if (!A.ctx) return;
      const level = (manifest.missionMusic && scene === 'mission') ? .38 : (musicVol[A.curScene] ?? musicVol.menu);
      A.musicG.gain.setTargetAtTime(level, A.ctx.currentTime, .24);
      if (scene === 'mission' && !A.blocked) A._warmMission();
      A._startMusic();
    },
    _startMusic() {
      const file = soundtrack();
      if (A.musicFile === file || A._musicPending === file || A.blocked) return;
      A._musicPending = file;
      decode(file).then((clip) => {
        if (A._musicPending === file) A._musicPending = '';
        if (!clip || A.blocked || file !== soundtrack() || A.musicFile === file) return;
        const t = A.ctx.currentTime, old = A.music, oldG = A._songGain;
        A._songGain = gain(A.ctx, 0, A.musicG);
        A._songGain.gain.setTargetAtTime(1, t, .075);
        A.musicFile = file;
        A.music = loop(clip, A._songGain);
        A.music.start(t, clip.offset);
        if (old) {
          oldG.gain.setTargetAtTime(0, t, .075);
          old.onended = () => { old.disconnect(); oldG.disconnect(); };
          old.stop(t + .42);
        }
      });
    },
    _warmMission() {
      for (const layer of manifest.engine.layers) decode(layer.file);
      warm(missionFX);
    },

    sfx(name, volume = 1) {
      const c = A.ctx, entry = manifest?.sfx[name];
      if (!c || !entry || !Array.isArray(entry.files) || A.blocked) return;
      const now = performance.now(), last = A._last[name];
      if (last != null && now - last < entry.gap * 1000) return;
      A._last[name] = now;
      const index = A._variant[name] || 0, file = entry.files[index];
      A._variant[name] = (index + 1) % entry.files.length;
      const epoch = A._epoch, v = clamp(volume ?? 1, .08, 1);
      const play = (clip) => {
        if (!clip || A.blocked || epoch !== A._epoch || performance.now() - now > 300 || A._voices.size >= MAX_VOICES) return;
        const source = c.createBufferSource(), g = gain(c, v, A.sfxBus), voice = { source, g };
        source.buffer = clip.buffer; source.connect(g);
        A._voices.add(voice);
        source.onended = () => { A._voices.delete(voice); source.disconnect(); g.disconnect(); };
        source.start(c.currentTime, clip.offset, clip.length);
      };
      if (decoded.has(file)) play(decoded.get(file));
      else decode(file).then(play);
    },

    engineStart() {
      if (!A.ctx || A.blocked || A.eng) return;
      const e = A.eng = { rpm: 0, vol: .16, voices: null };
      startBank('eng', e, manifest.engine, A.engBus, false);
    },
    engineSet(speed, throttle, boosting) {
      if (!A.ctx || A.blocked) return;
      if (!A.eng) A.engineStart();
      const e = A.eng, s = clamp(speed || 0, 0, 1), tr = clamp(throttle || 0, 0, 1), bst = boosting ? 1 : 0;
      e.rpm += (Math.min(1.15, s * .68 + tr * .22 + bst * .20) - e.rpm) * .15;
      e.vol = .16 + s * .13 + tr * .07 + bst * .05;
      if (e.voices) mixEngine(e, A.ctx.currentTime, false);
    },
    engineStop() { const e = A.eng; A.eng = null; stopBank(e, .24); },

    windSet(level, pan) {
      if (!A.ctx || A.blocked) return;
      const l = clamp(level || 0, 0, 1);
      if (!A.wind) {
        if (l < .01) return;
        A.wind = { level: l, side: pan || 0, voices: null };
        startBank('wind', A.wind, manifest.wind, A.sfxBus, true);
        const check = () => {
          const wait = 350 - (performance.now() - A._windSeen);
          if (wait <= 0) A.windStop(); else A._windTimer = setTimeout(check, wait);
        };
        A._windTimer = setTimeout(check, 350);
      }
      A._windSeen = performance.now();
      A.wind.level = l; A.wind.side = pan || 0;
      if (A.wind.voices) mixWind(A.wind, A.ctx.currentTime, false);
    },
    windStop() {
      if (A._windTimer) { clearTimeout(A._windTimer); A._windTimer = 0; }
      const w = A.wind; A.wind = null; stopBank(w, .36);
    },
    stopLoops() { A.engineStop(); A.windStop(); },
  };

  WZ.Audio = A;
})(window.WZ = window.WZ || {});
