#!/usr/bin/env python3
"""Typeset the three cover slots over distinct in-engine camera captures. Pillow + DejaVu Sans."""
import math, pathlib, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
raw, out = map(pathlib.Path,sys.argv[1:3]); out.mkdir(parents=True,exist_ok=True)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
heavy='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def fitted(draw,text,w0,size,face=font):
    while size>6:
        f=ImageFont.truetype(face,size)
        if draw.textbbox((0,0),text,font=f)[2]<=w0:return f
        size-=1
    return f

def mix(a,b,v):return a*(1-v)+b*v

for shape,wh in [('square',(800,800)),('portrait',(1080,1920)),('landscape',(1920,1080))]:
    w,h=wh; wide=shape=='landscape'; tall=shape=='portrait'; src=Image.open(raw/f'key-{shape}.png').convert('RGB'); assert src.size==wh
    src=ImageEnhance.Contrast(ImageEnhance.Color(src).enhance(1.18)).enhance(1.10)
    z=np.asarray(src,dtype=np.float32); ys,xs=np.mgrid[0:h,0:w].astype(np.float32); xs/=w;ys/=h
    # Dark ink behind the left-aligned landscape title, or the top of the two vertical compositions.
    edge=.28*np.clip((np.sqrt(((xs-.57)*.88)**2+((ys-.57)*.92)**2)-.25)*2.8,0,1)
    title=(.92*np.clip((.63-xs)/.63,0,1)**1.1) if wide else (.9*np.clip((.47-ys)/.47,0,1)**.86)
    alp=np.maximum(edge,title)[:,:,None]
    col=np.array([17,19,23],np.float32)
    im=Image.fromarray(mix(z,col,alp).clip(0,255).astype(np.uint8),'RGB')
    d=ImageDraw.Draw(im)
    gold='#ffbd34'; cream='#fff5e5'; black='#141519'; x=round(w*(.057 if wide else .083)); y=round(h*(.27 if wide else (.095 if tall else .072)))
    label='3D ARCADE ACTION'; micro=ImageFont.truetype(heavy, max(18,round(w*(.018 if not wide else .016))))
    lx=d.textlength(label,font=micro); line=max(3,round(h*.004));
    d.rounded_rectangle((x,y,x+lx+28,y+round(micro.size*1.56)),radius=round(micro.size*.26),fill=black,outline=gold,width=max(1,line//2))
    d.text((x+14,y+round(micro.size*.19)),label,font=micro,fill=gold)
    y+=round(micro.size*1.95)
    title1, title2='WARZAR:', 'CRATE RUSH'
    maxw=round(w*(.437 if wide else .834)); f1=fitted(d,title1,maxw, round(w*.109 if wide else w*.168),heavy)
    f2=fitted(d,title2,maxw,round(f1.size*.57),heavy)
    d.text((x,y),title1,font=f1,fill=cream,stroke_fill=black,stroke_width=max(2,round(w/600)))
    y+=round(f1.size*.99)
    d.text((x+3,y),title2,font=f2,fill=gold,stroke_fill=black,stroke_width=max(1,round(w/820)))
    y+=round(f2.size*1.16); d.line((x+3,y,x+round(maxw*.45),y),fill=gold,width=line)
    # A small bottom hazard-stripe accent, independent of the cropped action.
    margin=round(w*.046); by=h-round(h*.045)
    for i in range(5):
        dx=margin+i*round(w*.021); dy=max(7,round(h*.006)); bw=round(w*.01)
        d.polygon([(dx,by),(dx+bw,by),(dx+bw+dy//2,by-dy),(dx+dy//2,by-dy)],fill=gold)
    im.save(out/f'cover-{shape}-{w}x{h}.jpg',quality=93,subsampling=0,optimize=True)

for p in sorted(raw.glob('0*.png')):
    im=Image.open(p).convert('RGB'); im.save(out/(p.stem+'.jpg'),quality=94,subsampling=0,optimize=True)
