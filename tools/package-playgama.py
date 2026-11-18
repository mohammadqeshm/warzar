#!/usr/bin/env python3
"""Build ZIP stage only; never uploads. npm ci && npm run build:playgama first."""
import argparse, hashlib, json, re, zipfile
from html.parser import HTMLParser
from pathlib import Path

repo = Path(__file__).resolve().parents[1]
build = repo / 'dist-playgama'

def read(name): return (repo / name).read_bytes()
def sha(data): return hashlib.sha256(data).hexdigest()

class HTML(HTMLParser):
    def __init__(self): super().__init__(); self.scripts=[]
    def handle_starttag(self, tag, attrs):
        if tag == 'script': self.scripts.append(dict(attrs))

args=argparse.ArgumentParser()
args.add_argument('output', type=Path)
args.add_argument('--extract', type=Path, help='Also extract and verify the exact ZIP in an empty test directory.')
opt=args.parse_args()
parser=HTML(); parser.feed((build / 'index.html').read_text())
first,*others=parser.scripts
assert first == {'src':'./playgama-bridge.js'} and len(others)==1 and others[0]['src'].startswith('./assets/')
assert (build / 'playgama-bridge.js').read_bytes() == read('node_modules/@playgama/bridge/dist/playgama-bridge.js')
config=json.loads((build / 'playgama-bridge-config.json').read_bytes())
assert config['debug'] is False and 'forciblySetPlatformId' not in config and config['sendAnalyticsEvents'] is False
paths={p.relative_to(build).as_posix():p.read_bytes() for p in build.rglob('*') if p.is_file()}
assert all(n in ('index.html','playgama-bridge.js','playgama-bridge-config.json') or re.fullmatch(r'(?:assets|audio)/[a-zA-Z0-9_.-]+',n) for n in paths)
clips=json.loads(read('src/game/audio-playgama/manifest.json'))['clips']
mp3={n:sha(blob) for n,blob in paths.items() if n.endswith('.mp3')}
assert len(mp3)==len(clips)
for clip in clips:
    matches=[d for n,d in mp3.items() if n.startswith('audio/'+clip+'-')]
    assert matches==[sha(read(f'src/game/audio-playgama/{clip}.mp3'))],clip
assert not any(b'music_village' in d or re.search(rb'\b(?:localStorage|sessionStorage|indexedDB)\b',d) for n,d in paths.items() if n.startswith('assets/') and n.endswith('.js'))
paths.update({'LICENSES.txt':read('LICENSES.txt'), 'audio-credits.txt':read('docs/PLAYGAMA-AUDIO.md'),
  'playgama-bridge-LICENSE.txt':read('node_modules/@playgama/bridge/LICENSE'),
  'third-party-MIT.txt':b'\n\n'.join([n.encode()+b'\n'+read('node_modules/'+n+'/LICENSE') for n in ['three','react','react-dom','scheduler']])})
assert sum(map(len,paths.values()))<300_000_000
opt.output.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(opt.output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for n,payload in sorted(paths.items(),key=lambda t:(t[0]!='index.html',t[0])):
        info=zipfile.ZipInfo(n,(2026,11,18,0,0,0));info.external_attr=0o644<<16
        z.writestr(info,payload,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
with zipfile.ZipFile(opt.output) as z:
    assert z.testzip() is None and set(z.namelist())==set(paths)
    for n in z.namelist(): assert paths[n]==z.read(n)
    if opt.extract:
        opt.extract.mkdir(parents=True,exist_ok=True)
        if any(opt.extract.iterdir()): raise ValueError('extraction directory must be empty')
        z.extractall(opt.extract)
        assert all((opt.extract/n).read_bytes()==d for n,d in paths.items())
print(f'{opt.output}: {len(paths)} files, {opt.output.stat().st_size:,} ZIP bytes, {sum(map(len,paths.values())):,} unpacked, {len(clips)} MP3s\nSHA256 {sha(opt.output.read_bytes())}')
