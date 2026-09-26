import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {decodePNG,encodePNG} from '../scripts/lib/png.mjs';
import {fixAsset,paletteRamp,removeBackground,splitCells} from '../scripts/lib/asset-fix.mjs';

// V14 ART — generated UI images are cleaned to grid + palette before they reach the game (no API, no packages).
const specs=JSON.parse(fs.readFileSync('docs/art/gemini/assets.json','utf8'));
const PAL=paletteRamp(specs.palette);

/* a native 96x48 "bubble": ink outline, cream face, red stitches, flat centre */
function nativeBubble(){
  const w=96,h=48,d=new Uint8Array(w*h*4),set=(x,y,c)=>d.set([...c,255],(y*w+x)*4);
  const ink=PAL[0],cream=PAL[16],red=PAL[28];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const edge=x===0||y===0||x===w-1||y===h-1;set(x,y,edge?ink:cream);}
  for(let x=4;x<w-4;x+=4){set(x,3,red);set(x,h-4,red);}for(let y=4;y<h-4;y+=4){set(3,y,red);set(w-4,y,red);}
  return {width:w,height:h,data:d};
}
/* what a generator hands back: 3 copies at a non-integer-looking scale, noise, a warm tint, magenta background */
function fakeGenerated(cell,k=7,noise=10){
  const cells=3,gap=20,W=cells*(cell.width*k)+(cells+1)*gap,H=cell.height*k+2*gap,d=new Uint8Array(W*H*4);
  for(let i=0;i<W*H;i++)d.set([255,0,255,255],i*4);
  let seed=7;const rnd=()=>((seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff-.5)*2*noise;
  for(let c=0;c<cells;c++)for(let y=0;y<cell.height*k;y++)for(let x=0;x<cell.width*k;x++){
    const s=(((y/k)|0)*cell.width+((x/k)|0))*4,o=((y+gap)*W+gap+c*(cell.width*k+gap)+x)*4;
    d.set([cell.data[s]+8+rnd(),cell.data[s+1]+rnd(),cell.data[s+2]-6+rnd(),255].map(v=>Math.max(0,Math.min(255,v|0))),o);
  }
  return {width:W,height:H,data:d};
}

describe('PNG codec (node:zlib only)',()=>{
  it('round-trips RGBA and reads the real pitcher art',()=>{
    const img=nativeBubble(),back=decodePNG(encodePNG(img));
    expect(back.width).toBe(96);expect(Buffer.from(back.data).equals(Buffer.from(img.data))).toBe(true);
    const art=decodePNG(fs.readFileSync('assets/pitcher-mobs-v1/regular-01-red-rush.png'));
    expect(art.width).toBeGreaterThan(500);expect(art.data.length).toBe(art.width*art.height*4);
  });
  it('refuses a JPEG with a clear message',()=>{
    expect(()=>decodePNG(Buffer.from([0xff,0xd8,0xff,0xe0,0,0,0,0]))).toThrow(/not a PNG/);
  });
});

describe('asset-fix',()=>{
  it('recovers the exact native grid and palette from a noisy x7 magenta-backed sheet',()=>{
    const native=nativeBubble(),res=fixAsset(fakeGenerated(native),specs.assets.A1,specs.palette);
    expect(res.problems).toEqual([]);expect(res.ok).toBe(true);
    expect(res.outputs).toHaveLength(3);
    for(const o of res.outputs){
      expect([o.native.width,o.native.height]).toEqual([96,48]);
      let diff=0;for(let i=0;i<native.data.length;i++)if(o.native.data[i]!==native.data[i])diff++;
      expect(diff/native.data.length).toBeLessThan(.01);
      expect(o.centreFlat).toBeGreaterThan(.95);
    }
  });
  it('rejects what the loop must not ship: wrong state count, cropped art, busy 9-slice centre',()=>{
    const native=nativeBubble(),gen=fakeGenerated(native);
    expect(fixAsset(gen,{...specs.assets.A1,cells:[[96,48],[96,48]],states:['a','b']},specs.palette).problems.join()).toMatch(/cells: found 3, expected 2/);
    // busy centre: fill the middle with a stripe pattern
    const busy=nativeBubble();for(let y=14;y<34;y++)for(let x=14;x<82;x++)busy.data.set([...PAL[(x+y)%3?16:28],255],(y*96+x)*4);
    expect(fixAsset(fakeGenerated(busy),specs.assets.A1,specs.palette).problems.join()).toMatch(/centre not flat/);
    // cropped: art running off the canvas edge
    const crop={width:gen.width-30,height:gen.height,data:new Uint8Array((gen.width-30)*gen.height*4)};
    for(let y=0;y<gen.height;y++)crop.data.set(gen.data.subarray((y*gen.width+30)*4,(y*gen.width+gen.width)*4),y*crop.width*4);
    expect(fixAsset(crop,specs.assets.A1,specs.palette).problems.join()).toMatch(/touches the image edge/);
  });
  it('keeps interior colours that resemble the background (flood from the border only)',()=>{
    // white background, cream asset: cream must survive
    const img={width:40,height:20,data:new Uint8Array(40*20*4)};
    for(let i=0;i<800;i++)img.data.set([255,255,255,255],i*4);
    for(let y=5;y<15;y++)for(let x=5;x<35;x++)img.data.set(x===5||x===34||y===5||y===14?[7,8,13,255]:[236,228,207,255],(y*40+x)*4);
    const clean=removeBackground(img);
    expect(clean.data[(10*40+20)*4+3]).toBe(255);expect(clean.data[3]).toBe(0);
    expect(splitCells(clean)).toHaveLength(1);
  });
  it('every asset in the spec names its states and native sizes consistently',()=>{
    for(const [id,a] of Object.entries(specs.assets)){
      expect(a.cells.length,id).toBe(a.states.length);
      expect(a.name.startsWith(id+'-'),id).toBe(true);
    }
  });
});
