#!/usr/bin/env python3
"""Build 60-frame V3 batter sheets from the approved V3 key poses.

This is an offline build step only. Runtime receives one atlas and never morphs
images on the main thread. Bidirectional optical flow is used between the
already-approved 192x192 V3/V1 poses; exact key poses are copied back into their
anchor cells so contact/face/bat anchors remain untouched.
"""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
V1=ROOT/'assets'/'batter-reboot-v1'
V3=ROOT/'assets'/'batter-reboot-v3'
OUT=ROOT/'assets'/'batter-reboot-v4'
CELL=192
COLS=10
ROWS=6
TOTAL=60

POSES={
    'ready':V1/'batter-ready.png',
    'load':V3/'batter-load.png',
    'trigger':V1/'batter-trigger.png',
    'swing-start':V3/'batter-swing-start.png',
    'swing-mid':V3/'batter-swing-mid.png',
    'contact':V1/'batter-contact.png',
    'follow-through-early':V3/'batter-follow-through-early.png',
    'follow-through-late':V3/'batter-follow-through-late.png',
    'finish':V1/'batter-finish.png',
    'settle':V3/'batter-settle.png',
}
HIT=[('ready',0),('load',8),('trigger',15),('swing-start',22),('swing-mid',27),('contact',30),('follow-through-early',39),('follow-through-late',46),('finish',53),('settle',59)]
MISS=[('ready',0),('load',8),('trigger',15),('swing-start',22),('swing-mid',28),('follow-through-early',38),('follow-through-late',46),('finish',54),('settle',59)]

def load(path):
    return np.array(Image.open(path).convert('RGBA').resize((CELL,CELL),Image.Resampling.NEAREST),dtype=np.uint8)

def composite_gray(rgba):
    rgb=rgba[...,:3].astype(np.float32)
    a=rgba[...,3:4].astype(np.float32)/255.0
    bg=np.full_like(rgb,12.0)
    comp=rgb*a+bg*(1-a)
    return cv2.cvtColor(comp.astype(np.uint8),cv2.COLOR_RGB2GRAY)

def warp(img,flow,t):
    h,w=img.shape[:2]
    yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
    mx=xx-flow[...,0]*t
    my=yy-flow[...,1]*t
    channels=[cv2.remap(img[...,i],mx,my,cv2.INTER_NEAREST,borderMode=cv2.BORDER_CONSTANT,borderValue=0) for i in range(4)]
    return np.stack(channels,-1)

def morph(a,b,t):
    if t<=0:return a.copy()
    if t>=1:return b.copy()
    ga,gb=composite_gray(a),composite_gray(b)
    fa=cv2.calcOpticalFlowFarneback(ga,gb,None,.5,4,19,4,5,1.1,0)
    fb=cv2.calcOpticalFlowFarneback(gb,ga,None,.5,4,19,4,5,1.1,0)
    wa=warp(a,fa,t).astype(np.float32)
    wb=warp(b,fb,1-t).astype(np.float32)
    aa=wa[...,3:4]/255.0
    ab=wb[...,3:4]/255.0
    alpha=aa*(1-t)+ab*t
    color=wa[...,:3]*aa*(1-t)+wb[...,:3]*ab*t
    out=np.zeros_like(wa)
    out[...,3:4]=alpha*255.0
    out[...,:3]=np.where(alpha>1e-5,color/np.maximum(alpha,1e-5),0)
    out[...,3]=np.where(out[...,3]<20,0,np.where(out[...,3]>235,255,out[...,3]))
    return np.clip(out,0,255).astype(np.uint8)

def sequence(spec):
    src={name:load(POSES[name]) for name,_ in spec}
    frames=[None]*TOTAL
    for name,at in spec:
        frames[at]=src[name].copy()
    for (name_a,a_at),(name_b,b_at) in zip(spec,spec[1:]):
        a,b=src[name_a],src[name_b]
        for f in range(a_at,b_at+1):
            frames[f]=morph(a,b,(f-a_at)/max(1,b_at-a_at))
        frames[a_at]=a.copy()
        frames[b_at]=b.copy()
    for i in range(TOTAL):
        if frames[i] is None: frames[i]=frames[max(0,i-1)].copy()
    return frames

def save_sheet(name,frames):
    sheet=np.zeros((CELL*ROWS,CELL*COLS,4),dtype=np.uint8)
    for i,fr in enumerate(frames):
        row,col=divmod(i,COLS)
        sheet[row*CELL:(row+1)*CELL,col*CELL:(col+1)*CELL]=fr
    OUT.mkdir(parents=True,exist_ok=True)
    Image.fromarray(sheet,'RGBA').save(OUT/f'{name}-60.png',optimize=True)

save_sheet('batter-swing-v3',sequence(HIT))
save_sheet('batter-miss-v3',sequence(MISS))
(OUT/'README.md').write_text(
    '# Batter Reboot V4 runtime sheets\n\n'
    '60-frame 10x6 atlases generated from the approved V1/V3 192x192 key poses. '
    'Key-pose cells are copied exactly; in-betweens are offline-only and runtime uses canvas.\n',
    encoding='utf-8'
)
print('generated V3 60-frame runtime atlases')
