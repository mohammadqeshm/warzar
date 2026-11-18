const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.join(__dirname, '../src/game');
let locale = 'ru';
const sandbox = { window: { WZ: { Save: { data: { settings: { lang: 'es' } } }, Platform: { language: () => locale } } } };
vm.runInNewContext(fs.readFileSync(path.join(root, 'i18n.js'), 'utf8'), sandbox);
const i = sandbox.window.WZ.I18n, { en, ru } = i.dict;
assert.deepEqual(Object.keys(ru).sort(), Object.keys(en).sort());
for (const [key, value] of Object.entries(en)) {
  assert(ru[key].trim());
  const vars = (s) => (s.match(/\{\w+\}/g) || []).sort();
  assert.deepEqual(vars(value), vars(ru[key]), key);
}
for (const l of ['fr', 'es', 'en', 'ru', 'pt', 'tr']) { locale = l; i.init(); assert.equal(i.lang, l === 'ru' ? 'ru' : 'en'); }
function scan(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { scan(p); continue; }
    if (!f.name.endsWith('.js') || f.name === 'i18n.js') continue;
    const txt = fs.readFileSync(p, 'utf8');
    for (const m of txt.matchAll(/\b(?:WZ\.)?t\(['"]([\w.]+)['"]\s*[,)]/g)) {
      if (m[1].includes('.')) assert(Object.hasOwn(en, m[1]), `${f.name} missing ${m[1]}`);
    }
    assert(!/\p{Extended_Pictographic}\uFE0F|[\u{1f300}-\u{1faff}]/u.test(txt), `${f.name}: emoji icon`);
  }
}
scan(root);
console.log(`NO ISSUES (${Object.keys(en).length} EN and RU strings, matching placeholders, keys and Bridge fallback)`);
