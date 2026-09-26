import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {pixiAvailable} from '../src/duel/BallparkActors.jsx';

// V13 C2 — actors on PixiJS (docs/design/v13/BALLPARK.md).
const read=p=>fs.readFileSync(path.resolve(p),'utf8');

/* minimal RGBA PNG decoder (8-bit, colour type 6 or indexed 3 with tRNS), enough for our sprites */
function decodePng(file){
  const buf=fs.readFileSync(file);let p=8,w,h,type,depth,plte=null,trns=null;const idat=[];
  while(p<buf.length){const len=buf.readUInt32BE(p),t=buf.toString('ascii',p+4,p+8),d=buf.subarray(p+8,p+8+len);p+=12+len;
    if(t==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);depth=d[8];type=d[9];}
    else if(t==='PLTE')plte=d;else if(t==='tRNS')trns=d;else if(t==='IDAT')idat.push(d);else if(t==='IEND')break;}
  const raw=zlib.inflateSync(Buffer.concat(idat)),bpp=type===6?4:type===2?3:1,stride=Math.ceil(w*bpp*depth/8),out=new Uint8Array(w*h);
  let prev=new Uint8Array(stride);
  for(let y=0;y<h;y++){const f=raw[y*(stride+1)],line=raw.subarray(y*(stride+1)+1,(y+1)*(stride+1)),cur=new Uint8Array(stride);
    for(let i=0;i<stride;i++){const a=i>=bpp?cur[i-bpp]:0,b=prev[i],c=i>=bpp?prev[i-bpp]:0,x=line[i];
      cur[i]=(x+(f===0?0:f===1?a:f===2?b:f===3?(a+b)>>1:(()=>{const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;})()))&255;}
    for(let x=0;x<w;x++)out[y*w+x]=type===6?cur[x*4+3]:type===3?(trns&&cur[x]<trns.length?trns[cur[x]]:255):255;
    prev=cur;}
  return {w,h,alpha:out};
}
function islandsAbove(file,groundY){
  const {w,h,alpha}=decodePng(file),seen=new Int32Array(w*h).fill(-1),sizes=[],tops=[];
  for(let i=0;i<w*h;i++){if(alpha[i]<=16||seen[i]>=0)continue;const id=sizes.length;let n=0,maxY=0;const st=[i];seen[i]=id;
    while(st.length){const q=st.pop();n++;const x=q%w,y=(q/w)|0;maxY=Math.max(maxY,y);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const k=ny*w+nx;if(alpha[k]>16&&seen[k]<0){seen[k]=id;st.push(k);}}}
    sizes.push(n);tops.push(maxY);}
  const body=sizes.indexOf(Math.max(...sizes));
  return sizes.map((s,i)=>({s,maxY:tops[i]})).filter((c,i)=>i!==body&&c.maxY<groundY);
}

describe('V13 C2 batter key poses',()=>{
  const poses=['batter-reboot-v1/batter-ready.png','batter-reboot-v3/batter-load.png','batter-reboot-v1/batter-trigger.png',
    'batter-reboot-v3/batter-swing-start.png','batter-reboot-v3/batter-swing-mid.png','batter-reboot-v1/batter-contact.png',
    'batter-reboot-v3/batter-follow-through-early.png','batter-reboot-v3/batter-follow-through-late.png',
    'batter-reboot-v1/batter-finish.png','batter-reboot-v3/batter-settle.png'];
  it('have no pixels floating off the body above the ground line (the old bat fragments)',()=>{
    for(const p of poses)expect(islandsAbove(path.resolve('assets',p),165),p).toEqual([]);
  });
});

describe('V13 C2 Pixi actor layer',()=>{
  it('does not mount without WebGL, so the DOM actors stay (tests, old devices)',()=>{
    expect(pixiAvailable()).toBe(false);
  });
  it('loads PixiJS lazily and keeps it out of the eager vendor chunk',()=>{
    const actors=read('src/duel/BallparkActors.jsx');
    expect(actors).toMatch(/await import\('pixi\.js'\)/);
    expect(actors).not.toMatch(/^import .*pixi/m);
    expect(read('vite.config.js')).toMatch(/\(\?!\.\*\(pixi/);
  });
  it('drives both actors from one clock and holds contact on a hit',()=>{
    const actors=read('src/duel/BallparkActors.jsx');
    expect(actors).toMatch(/redRushFrameAt\(t\)/);
    expect(actors).toMatch(/batterMotionV3Timeline/);
    expect(actors).toMatch(/inStop\?'contact'/);
  });
  it('hides a DOM actor only once Pixi draws it, and keeps its box for layout',()=>{
    const css=read('src/duel/ballpark.css');
    expect(css).toMatch(/\.bp-scene\.pixi-batter \.bp-batter>\*,\.bp-scene\.pixi-pitcher \.bp-pitcher>\*\{visibility:hidden\}/);
  });
});

describe('V13 C3 the pitch in Pixi',()=>{
  it('has a release point for every pitcher atlas, inside the frame',async()=>{
    const release=JSON.parse(read('src/duel/pitcher-release.json'));
    const {pitcherAtlases}=await import('../src/duel/pitcher-visuals.js');
    for(const id of Object.keys(pitcherAtlases)){
      expect(release[id],id).toBeTruthy();
      for(const v of release[id])expect(v>=0&&v<=1).toBe(true);
    }
  });
  it('draws the ball from the hand to the real cell, over the zone while the pitch plays',()=>{
    const actors=read('src/duel/BallparkActors.jsx');
    expect(actors).toMatch(/RELEASE\[aid\]/);
    expect(actors).toMatch(/boxes\.cells\[pz\]/);
    expect(read('src/duel/ballpark.css')).toMatch(/\.bp-scene\[class\*="fx-stage-"\] \.bp-pixi\{z-index:4\}/);
  });
});
