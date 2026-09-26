#!/usr/bin/env python3
"""Where each pitcher's ball leaves the hand (V13 C3), for the Pixi ball flight.

All atlases face screen-left and release around frame 76-79, so the throwing hand is the leftmost
opaque point of the body at chest height (20-60% of the frame). Writes normalized (0-1) points
per art id to src/duel/pitcher-release.json. Offline helper; the runtime only reads the JSON.
"""
import glob,json
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
FRAME=77
out={}
for f in [ROOT/'assets/pitcher-sd-v1/red-rush-pitch-120-atlas.png']+sorted(map(Path,glob.glob(str(ROOT/'assets/pitcher-sd-v2/atlases/*.png')))):
    A=np.array(Image.open(f).convert('RGBA'));fh=A.shape[0]//12;fw=A.shape[1]//10
    r,c=divmod(FRAME,10);a=A[r*fh:(r+1)*fh,c*fw:(c+1)*fw,3]>40
    y0,y1=int(fh*.2),int(fh*.6);band=a[y0:y1]
    cols=np.where(band.any(axis=0))[0];x=int(cols.min())
    ys=np.where(band[:,x])[0];y=y0+int(ys.mean())
    name=f.name.replace('-pitch-120-atlas.png','');name='regular-01-red-rush' if name=='red-rush' else name
    out[name]=[round(x/fw,3),round(y/fh,3)]
json.dump(out,open(ROOT/'src/duel/pitcher-release.json','w'),indent=1)
print(json.dumps(out))
