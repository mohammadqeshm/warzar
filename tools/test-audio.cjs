// Asset inventory/coverage checks, no browser or FFmpeg required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const game = path.join(__dirname, '../src/game');
const release = !process.argv.includes('--legacy'); // Shared licensed bank is the current default.
const folder = path.join(game, release ? 'audio-playgama' : 'audio');
const m = require(path.join(folder, 'manifest.json'));
const files = new Set(fs.readdirSync(folder).filter((f) => f.endsWith('.mp3')));
assert.equal(m.format, 'mp3');
assert.equal(m.sampleRate, 44100);
assert.deepEqual([...files].sort(), Object.keys(m.clips).map((id) => id + '.mp3').sort());
let total = 0;
for (const [id, spec] of Object.entries(m.clips)) {
  const b = fs.readFileSync(path.join(folder, id + '.mp3'));
  assert.ok(/^[a-z0-9_]+$/.test(id), id);
  assert.equal(b.length, spec.bytes, id);
  assert.ok(b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && (b[1] & 6) === 2, `${id} must start with an MPEG Layer III frame`);
  assert.ok(spec.delay > 0 && spec.encodedFrames >= spec.frames + spec.delay && spec.frames > 0, id);
  assert.ok(spec.peak > 0 && spec.peak < 1, id);
  if (spec.loopStart != null) assert.ok(spec.loopStart >= 0 && spec.loopStart < spec.frames, id);
  total += b.length;
}
const referenced = new Set([m.music, m.missionMusic].filter(Boolean));
for (const [cue, spec] of Object.entries(m.sfx)) {
  assert.ok(spec.gap > 0 && spec.files.length > 0, cue);
  spec.files.forEach((f) => referenced.add(f));
}
for (const bank of [m.engine, m.wind]) {
  let last = -1;
  for (const layer of bank.layers) {
    assert.ok(layer.value > last && m.clips[layer.file].loopStart === 0, layer.file);
    last = layer.value;
    referenced.add(layer.file);
  }
}
assert.deepEqual([...referenced].sort(), Object.keys(m.clips).sort());
assert.deepEqual(m.sfx.buy, m.sfx.cash);
assert.notEqual(m.sfx.tick.files[0], m.sfx.tick.files[1]);
assert.ok(total < (release ? 2700 : 600) * 1024, 'compressed bank fits the audio budget');

function js(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => item.isDirectory()
    ? js(path.join(dir, item.name)) : item.name.endsWith('.js') ? [path.join(dir, item.name)] : []);
}
for (const f of js(game)) {
  const source = fs.readFileSync(f, 'utf8');
  for (const [, cue] of source.matchAll(/\bWZ\.Audio\.sfx\(['"]([^'"]+)['"]/g)) assert.ok(m.sfx[cue], `${f}: missing ${cue}`);
  assert.doesNotMatch(source, /createOscillator\(|createPeriodicWave\(|noiseBurst\(/, `runtime synthesis in ${f}`);
}
// With Git history available, audit even the older cue names with dynamic call sites.
if (release) assert.ok(Object.values(m.clips).every(c=>c.source&&m.profile==='playgama-licensed'));
let reference;
try {
  if (!release) reference = execFileSync('git', ['show', m.sourceRevision + ':src/game/audio.js'], { cwd: game, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
} catch (_) { /* a downloaded source ZIP intentionally has no Git history */ }
if (reference) {
  assert.deepEqual([...reference.matchAll(/case '([^']+)':/g)].map((x) => x[1]).sort(), Object.keys(m.sfx).sort());
  assert.equal(require('node:crypto').createHash('sha256').update(reference).digest('hex'), m.sourceSha256);
}
console.log(`NO ISSUES  (${Object.keys(m.sfx).length} cue names, ${files.size} MP3s, ${(total / 1024).toFixed(1)} KiB, no runtime synthesis)`);
