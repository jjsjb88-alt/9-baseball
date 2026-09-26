#!/usr/bin/env python3
"""Where and when each pitcher's front foot lands (V13 BP-11), for the Pixi stride dust.

All atlases face screen-left. Over the stride (frames 30-74) the front foot is the leftmost opaque
point of the bottom 6% of the body; it plants on the first frame that gets within 3% of the stride's
furthest reach. Writes {art id: [frame, x, y]} (x/y normalized 0-1) to src/duel/pitcher-stride.json.
Offline helper; the runtime only reads the JSON.
"""
import glob,json
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
out={}
for f in [ROOT/'assets/pitcher-sd-v1/red-rush-pitch-120-atlas.png']+sorted(map(Path,glob.glob(str(ROOT/'assets/pitcher-sd-v2/atlases/*.png')))):
    A=np.array(Image.open(f).convert('RGBA'));fh=A.shape[0]//12;fw=A.shape[1]//10
    foot={}
    for k in range(30,75):
        r,c=divmod(k,10);a=A[r*fh:(r+1)*fh,c*fw:(c+1)*fw,3]>40
        bot=int(np.where(a.any(axis=1))[0].max());band=a[int(bot-fh*.06):bot+1]
        x=int(np.where(band.any(axis=0))[0].min());foot[k]=(x,bot)
    reach=min(x for x,_ in foot.values())
    k=next(k for k in sorted(foot) if foot[k][0]<=reach+fw*.03)
    name=f.name.replace('-pitch-120-atlas.png','');name='regular-01-red-rush' if name=='red-rush' else name
    out[name]=[k,round(foot[k][0]/fw,3),round(foot[k][1]/fh,3)]
json.dump(out,open(ROOT/'src/duel/pitcher-stride.json','w'),indent=1)
print(json.dumps(out))
