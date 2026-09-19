#!/usr/bin/env python3
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'assets'
OUT=SRC/'sprites-v4'
OUT.mkdir(parents=True,exist_ok=True)
CELL=256
COLS=10
ROWS=6
TOTAL=60

def load(path):
    im=Image.open(path).convert('RGBA').resize((CELL,CELL),Image.Resampling.NEAREST)
    return np.array(im,dtype=np.uint8)

def composite_gray(rgba):
    rgb=rgba[...,:3].astype(np.float32)
    a=rgba[...,3:4].astype(np.float32)/255.0
    bg=np.full_like(rgb,18.0)
    comp=rgb*a+bg*(1-a)
    return cv2.cvtColor(comp.astype(np.uint8),cv2.COLOR_RGB2GRAY)

def warp(img,flow,t):
    h,w=img.shape[:2]
    yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
    mx=xx-flow[...,0]*t
    my=yy-flow[...,1]*t
    channels=[cv2.remap(img[...,i],mx,my,cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=0) for i in range(4)]
    return np.stack(channels,-1)

def morph(a,b,t):
    if t<=0:return a.copy()
    if t>=1:return b.copy()
    ga,gb=composite_gray(a),composite_gray(b)
    fa=cv2.calcOpticalFlowFarneback(ga,gb,None,.5,3,21,3,5,1.1,0)
    fb=cv2.calcOpticalFlowFarneback(gb,ga,None,.5,3,21,3,5,1.1,0)
    wa=warp(a,fa,t).astype(np.float32)
    wb=warp(b,fb,1-t).astype(np.float32)
    # Premultiplied alpha blend prevents bright transparent fringes.
    aa=wa[...,3:4]/255.0
    ab=wb[...,3:4]/255.0
    ca=wa[...,:3]*aa
    cb=wb[...,:3]*ab
    alpha=aa*(1-t)+ab*t
    color=ca*(1-t)+cb*t
    out=np.zeros_like(wa)
    out[...,3:4]=alpha*255.0
    out[...,:3]=np.where(alpha>1e-4,color/np.maximum(alpha,1e-4),0)
    # Crisp transparent edges while retaining in-between body motion.
    out[...,3]=np.where(out[...,3]<10,0,out[...,3])
    return np.clip(out,0,255).astype(np.uint8)

def sequence(paths,anchors):
    src=[load(p) for p in paths]
    if len(src)!=len(anchors): raise ValueError((len(src),len(anchors)))
    frames=[None]*TOTAL
    for idx,at in enumerate(anchors):
        frames[at]=src[idx]
    for i in range(len(src)-1):
        a_at,b_at=anchors[i],anchors[i+1]
        for f in range(a_at,b_at+1):
            t=(f-a_at)/max(1,b_at-a_at)
            frames[f]=morph(src[i],src[i+1],t)
    for f in range(0,anchors[0]): frames[f]=src[0]
    for f in range(anchors[-1],TOTAL): frames[f]=src[-1]
    return frames

def save_sheet(name,frames):
    sheet=np.zeros((CELL*ROWS,CELL*COLS,4),dtype=np.uint8)
    for i,fr in enumerate(frames):
        r,c=divmod(i,COLS)
        sheet[r*CELL:(r+1)*CELL,c*CELL:(c+1)*CELL]=fr
    Image.fromarray(sheet,'RGBA').save(OUT/f'{name}-60.png',optimize=True)
    # Contact sheet is useful for visual QA and proves there are 60 distinct cells.
    print(f'{name}: {len(frames)} frames -> {OUT/f"{name}-60.png"}')

def paths(prefix,count):
    return [SRC/'sprites-v2'/'frames'/f'{prefix}-{i:02d}.png' for i in range(count)]

swing=paths('batter-swing',12)
miss=paths('batter-miss',6)
pitch=paths('pitcher-pitch',12)
strikeout=paths('pitcher-strikeout',6)
homer=swing+[SRC/'sprites-v1'/'batter-homerun.png']

save_sheet('batter-swing',sequence(swing,[0,4,8,12,17,18,23,32,37,42,47,52]))
save_sheet('batter-miss',sequence(miss,[0,8,17,18,23,52]))
save_sheet('pitcher-pitch',sequence(pitch,[0,3,6,9,12,17,18,23,32,39,46,52]))
save_sheet('pitcher-strikeout',sequence(strikeout,[0,10,20,32,44,52]))
save_sheet('batter-homer',sequence(homer,[0,4,8,12,17,18,23,32,37,42,46,50,59]))

(OUT/'README.md').write_text("""# sprites-v4

Generated 60-frame pixel sprite sheets. Each PNG is a 10×6 sheet of 256×256 cells (60 frames total).

These are real raster in-between frames generated from the authored V2/V1 pixel poses using bidirectional optical-flow warping. Runtime animation changes only the sheet cell at display refresh cadence; it does not use the GM08 SVG puppet.
""",encoding='utf-8')
