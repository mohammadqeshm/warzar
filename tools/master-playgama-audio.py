#!/usr/bin/env python3
"""Offline editing only: trims, equalizes, levels and compresses licensed source audio.
Prepare the source directory from docs/PLAYGAMA-AUDIO.md. No music or sound is synthesized.
Requires NumPy, ffmpeg (libmp3lame) and ffprobe. The checked-in MP3s build without these tools.
"""
import json, os, pathlib, subprocess as sp, sys
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = pathlib.Path(sys.argv[1]).resolve()
OUT = ROOT / 'src/game/audio-playgama'
OUT.mkdir(exist_ok=True)
LEGACY = json.loads((ROOT / 'src/game/audio/manifest.json').read_text())
R = 44100
PACK = {
    'ui': 'interface-sounds/Audio', 'sci': 'sci-fi-sounds/Audio', 'rpg': 'rpg/OGG',
    'music': '.', 'motor': 'engine/engine-loop', 'wind': '.',
    'jng': '85-short-music-jingles/OGG/jingles_STEEL',
}
# Multiple variants are actual different sources, not blank/copy placeholders.
CUES = {
    'gun': ('sci', ['laserSmall_000','laserSmall_002','laserSmall_004'], .13, .22, 1.22),
    'tshot': ('sci', ['laserSmall_003'], .16, .24, 1.02),
    'bonk': ('rpg', ['metalPot2'], .27, .32, 1.1),
    'hit': ('sci', ['impactMetal_000','impactMetal_001','impactMetal_004'], .18, .18, 1.18),
    'hurt': ('sci', ['impactMetal_002'], .26, .38, .9),
    'ko': ('sci', ['slime_000'], .23, .32, .93),
    'ram': ('sci', ['impactMetal_003','impactMetal_004','impactMetal_002'], .28, .46, .78),
    'crash': ('rpg', ['metalPot3','metalPot2','metalPot1'], .34, .49, .79),
    'thud': ('rpg', ['bookPlace1','bookPlace2','bookPlace3'], .19, .32, .94),
    'bag': ('rpg', ['footstep03','footstep06','footstep08'], .21, .33, .81),
    'barrel': ('rpg', ['doorClose_1','doorClose_2','doorClose_3'], .29, .42, .74),
    'grab': ('rpg', ['metalLatch'], .24, .28, 1.04), 'deliver': ('ui', ['confirmation_002'], .39, .34, 1),
    'cash': ('rpg', ['handleCoins2'], .25, .29, 1.04),
    'deploy': ('ui', ['open_001'], .31, .24, 1.04), 'recall': ('ui', ['back_003'], .25, .27, 1),
    'board': ('rpg', ['metalClick'], .20, .30, .88), 'boost': ('sci', ['thrusterFire_003'], .72, .47, 1.1),
    'click': ('ui', ['click_003'], .10, .22, 1), 'go': ('ui', ['confirmation_004'], .43, .39, 1),
    'beep': ('ui', ['error_005'], .21, .25, 1), 'revive': ('ui', ['maximize_007'], .54, .43, .94),
    'nanako': ('ui', ['error_007'], .41, .43, .93), 'win': ('jng', ['jingles_STEEL00'], 2.4, .49, 1),
    'lose': ('jng', ['jingles_STEEL14'], 2.0, .44, .92),
    'boom': ('sci', ['explosionCrunch_001','explosionCrunch_002','explosionCrunch_003'], .66, .67, .93),
    'blast': ('sci', ['explosionCrunch_004','lowFrequency_explosion_000','lowFrequency_explosion_001'], .87, .68, 1.03),
    'ignite': ('sci', ['thrusterFire_001'], .49, .39, 1.13), 'burn': ('sci', ['thrusterFire_002'], .54, .33, .94),
    'tank': ('sci', ['spaceEngineLow_002'], .67, .51, .95),
    'cannon': ('sci',['explosionCrunch_000','explosionCrunch_001','explosionCrunch_002'], .48, .58, 1.09),
    'build': ('rpg', ['doorClose_4'], .38, .43, 1), 'mine': ('rpg', ['beltHandle1'], .23, .30, 1),
    'siren': ('ui', ['error_003'], .53, .47, .85), 'wind': ('wind', ['wind%20woosh%20loop.ogg'], .82, .42, 1),
    'roar': ('sci', ['spaceEngineLarge_002'], .83, .61, .71),
    'club': ('rpg', ['bookPlace3','doorClose_3','metalPot3'], .35, .57, .78),
    'swish': ('rpg', ['knifeSlice2'], .24, .38, .82),
    'mortar': ('sci', ['explosionCrunch_000','explosionCrunch_004','explosionCrunch_003'], .52, .49, 1.19),
    'heli': ('sci', ['engineCircular_001'], .84, .44, 1.1), 'jet': ('sci', ['spaceEngineLarge_001'], 1.06, .50, 1.14),
    'whistle': ('sci', ['laserRetro_001'], .49, .31, 1), 'dflame': ('sci', ['thrusterFire_004'], .81, .56, .78),
    'dino': ('sci', ['spaceEngineLarge_003'], .96, .62, .70), 'pickup': ('ui', ['confirmation_001'], .34, .37, 1.1),
    'clock': ('ui', ['maximize_004'], .44, .41, 1.15),
    'rumble': ('sci', ['lowFrequency_explosion_000','lowFrequency_explosion_001','spaceEngineLow_003'], 1.15, .63, .66),
    'spawn': ('ui', ['pluck_001'], .30, .35, 1.02), 'tick': ('ui', ['tick_001','tick_002'], .12, .39, 1),
}

def ff(args, pcm=None):
    return sp.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*args],input=pcm,capture_output=True,check=True).stdout

def read(pack, name, channels=1, speed=1):
    base = SRC / PACK[pack] / name
    file = base if base.suffix else base.with_suffix('.ogg')
    return np.frombuffer(ff(['-i',str(file),'-af',f'aresample={R},asetrate={int(R*speed)},aresample={R}', '-ac',str(channels),'-f','f32le','-']),dtype='<f4').reshape(-1,channels).copy(), file.relative_to(SRC).as_posix()

def edit_loop(audio, sec, fade=.072):
    audio = audio[:int(sec*R)].copy()
    n = int(fade*R); assert len(audio) > 2*n
    w = np.linspace(0,1,n,dtype=np.float32)[:,None]; w = w*w*(3-2*w)
    audio[-n:] = audio[-n:] * (1-w) + audio[:n] * w
    return audio[n:]

def eq(x, lo, hi):
    # Zero-phase filtering of the recorded signal; all RPM renditions start at identical phase.
    freq = np.fft.rfftfreq(len(x),1/R)
    mult = (1 - np.exp(-(freq / max(1,lo))**2)) / (1 + (freq / hi)**4)
    return np.fft.irfft(np.fft.rfft(x,axis=0)*mult[:,None], n=len(x),axis=0).astype(np.float32)

clips={}

def save(key, x, peak, source, loop=False, q=3, rms=None):
    x=x.copy(); x-=np.mean(x,axis=0,keepdims=True)
    x*=min(peak/max(1e-8,float(np.max(np.abs(x)))), rms/max(1e-8,float(np.sqrt(np.mean(x*x)))) if rms else 100)
    if not loop:
        f=min(len(x)//3, int(.026*R)); a=min(f,132)
        x[:a]*=np.linspace(0,1,a)[:,None]; x[-f:]*=np.linspace(1,0,f)[:,None]
    file=OUT / (key+'.mp3')
    ff(['-f','f32le','-ar',str(R),'-ac',str(x.shape[1]),'-i','pipe:0','-map_metadata','-1','-codec:a','libmp3lame','-q:a',str(q),'-id3v2_version','0',str(file)], x.astype('<f4').tobytes())
    js=json.loads(sp.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_packets','-show_entries','packet=side_data_list','-of','json',str(file)]))
    packets=js['packets']; delay=packets[0]['side_data_list'][0]['skip_samples']
    clips[key]={'frames':len(x),'encodedFrames':len(packets)*1152,'delay':delay,
                'bytes':file.stat().st_size,'peak':round(float(np.max(np.abs(x))),5),'source':source}
    if loop: clips[key]['loopStart']=0

for cue,spec in CUES.items():
    pack,names,sec,peak,speed=spec
    ids=LEGACY['sfx'][cue]['files']; assert len(ids)==len(names),(cue,ids,names)
    for fid,src in zip(ids,names):
        x,source=read(pack,src,speed=speed); save(fid,x[:int(sec*R)],peak,source)

x,source=read('motor','engine-loop-1-normalized.wav')
x=edit_loop(x,4,.084)
for i,l in enumerate(LEGACY['engine']['layers']):
    save(l['file'],eq(x,32+i*6,460+i*470),.58,source,True,4,.137)

x,source=read('wind','wind%20woosh%20loop.ogg'); x=edit_loop(x,5.9,.14)
for i,l in enumerate(LEGACY['wind']['layers']):
    save(l['file'],eq(x,30+i*27,320+i*800),.52,source,True,4,.12)

for name in ['menu','loop']:
    x,source=read('music','empacotatron_'+name+'.flac',2)
    # Keep the author's native rhythm exactly in the full mission loop. The menu edit has a short seam blend.
    if name=='menu': x=edit_loop(x,len(x)/R,.015)
    save('music_'+('menu' if name=='menu' else 'mission'),x,.58,source,True,4,.12 if name=='menu' else .145)

m={'version':2,'format':'mp3','sampleRate':R,'profile':'playgama-licensed',
   'music':'music_menu','missionMusic':'music_mission','engine':{**LEGACY['engine'],'baseHz':74},
   'wind':LEGACY['wind'],'sfx':LEGACY['sfx'],'clips':clips}
(OUT/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
lines=['// Generated by tools/master-playgama-audio.py. Vite resolves these to archive-relative paths.','export default {']
lines += [f'  {key}: new URL(\'./{key}.mp3\', import.meta.url).href,' for key in sorted(clips)]
(OUT/'urls.js').write_text('\n'.join(lines+['};','']))
print(len(clips),'licensed cuts,',sum(x['bytes'] for x in clips.values()),'bytes')
