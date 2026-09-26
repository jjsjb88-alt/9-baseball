#!/usr/bin/env python3
"""Remove detached pixel islands from the batter key poses (V13 C2).

The V3 bat-layer warp left bat fragments floating beside the body (swing-start, swing-mid,
follow-through) and 1-6px specks near the hands. Every connected component that is not the body
and sits above the ground line is cleared; the ground shadow / dirt below GROUND_Y is kept.
Idempotent. Offline authoring helper; the runtime never calls it.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[1]/'assets'
POSES=['batter-reboot-v1/batter-ready.png','batter-reboot-v3/batter-load.png','batter-reboot-v1/batter-trigger.png',
       'batter-reboot-v3/batter-swing-start.png','batter-reboot-v3/batter-swing-mid.png','batter-reboot-v1/batter-contact.png',
       'batter-reboot-v3/batter-follow-through-early.png','batter-reboot-v3/batter-follow-through-late.png',
       'batter-reboot-v1/batter-finish.png','batter-reboot-v3/batter-settle.png']
GROUND_Y=165

for rel in POSES:
    path=ROOT/rel
    a=np.array(Image.open(path).convert('RGBA'))
    mask=a[:,:,3]>16
    lab,n=ndimage.label(mask,structure=np.ones((3,3)))
    sizes=ndimage.sum(mask,lab,range(1,n+1))
    body=int(np.argmax(sizes))+1
    removed=0
    for i in range(1,n+1):
        if i==body:continue
        ys,_=np.where(lab==i)
        if ys.max()<GROUND_Y:
            a[lab==i]=0;removed+=int(sizes[i-1])
    # faint alpha fringe that is not part of any kept component
    Image.fromarray(a).save(path,optimize=True)
    print(f'{rel}: removed {removed}px')
