/* V14 ART — turn a generated UI image into a clean, on-grid, on-palette game asset (no API, no packages).

   raw RGBA → background out (real alpha, or flood-fill of the border colour; magenta spill removed everywhere)
            → split into cells (empty-row/column cuts, reading order)
            → each cell resampled to its native pixel size (majority colour per native pixel, after palette snap)
            → palette ramp only → hard alpha → nearest-neighbour ×scale
   plus a report of what the generator got wrong, so a loop can reject a bad image instead of shipping it. */

const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
/* each palette colour with two darker steps (towards ink) and one lighter step: hue stays, value moves */
export function paletteRamp(hexes){
  const ink=hex('#07080d'),white=[255,250,240],out=[];
  for(const h of hexes){const c=hex(h);out.push(c,mix(c,ink,.35),mix(c,ink,.6),mix(c,white,.3));}
  return out;
}
const dist2=(r,g,b,c)=>{const dr=r-c[0],dg=g-c[1],db=b-c[2];return 2*dr*dr+4*dg*dg+3*db*db;};
function nearest(r,g,b,pal){let best=0,bd=Infinity;for(let i=0;i<pal.length;i++){const d=dist2(r,g,b,pal[i]);if(d<bd){bd=d;best=i;}}return [best,bd];}
const isMagenta=(r,g,b)=>r>200&&b>200&&g<90;

export function removeBackground(img){
  const {width:w,height:h,data}=img,out=new Uint8Array(data);
  const border=[];for(let x=0;x<w;x++){border.push(x,(h-1)*w+x);}for(let y=0;y<h;y++){border.push(y*w,y*w+w-1);}
  const realAlpha=border.some(i=>data[i*4+3]<250);
  if(!realAlpha){
    /* background = most common border colour; flood from the border through similar pixels */
    const count=new Map();for(const i of border){const k=(data[i*4]>>3)<<10|(data[i*4+1]>>3)<<5|(data[i*4+2]>>3);count.set(k,(count.get(k)||0)+1);}
    const [key]=[...count.entries()].sort((a,b)=>b[1]-a[1])[0];const bg=[(key>>10&31)<<3|4,(key>>5&31)<<3|4,(key&31)<<3|4];
    const near=i=>{const d=Math.abs(data[i*4]-bg[0])+Math.abs(data[i*4+1]-bg[1])+Math.abs(data[i*4+2]-bg[2]);return d<70;};
    const seen=new Uint8Array(w*h),stack=border.filter(near);stack.forEach(i=>seen[i]=1);
    while(stack.length){const i=stack.pop();out[i*4+3]=0;const x=i%w,y=(i/w)|0;
      for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&!seen[j]&&near(j)){seen[j]=1;stack.push(j);}}
  }
  for(let i=0;i<w*h;i++)if(isMagenta(out[i*4],out[i*4+1],out[i*4+2]))out[i*4+3]=0;   // spill: magenta is never art
  return {width:w,height:h,data:out};
}

/* XY-cut: split on fully transparent rows, then columns inside each band; reading order */
export function splitCells(img,minGap=2){
  const {width:w,height:h,data}=img,op=(x,y)=>data[(y*w+x)*4+3]>127;
  const runs=(n,filled)=>{const r=[];let s=-1,gap=0;for(let i=0;i<n;i++){if(filled(i)){if(s<0)s=i;gap=0;}else if(s>=0){gap++;if(gap>=minGap){r.push([s,i-gap+1]);s=-1;gap=0;}}}if(s>=0)r.push([s,n-gap]);return r;};
  const cells=[];
  for(const [y0,y1] of runs(h,y=>{for(let x=0;x<w;x++)if(op(x,y))return true;return false;})){
    for(const [x0,x1] of runs(w,x=>{for(let y=y0;y<y1;y++)if(op(x,y))return true;return false;})){
      let t=y1,b=y0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(op(x,y)){t=Math.min(t,y);b=Math.max(b,y+1);}
      if((x1-x0)*(b-t)>=16)cells.push({x:x0,y:t,w:x1-x0,h:b-t});
    }
  }
  return cells;
}

/* resample one cell to its native size: snap every source pixel to the palette, majority vote per native pixel */
export function resampleCell(img,cell,nw,nh,pal){
  const {width:W,data}=img,out=new Uint8Array(nw*nh*4);let offSum=0,offN=0;
  for(let ny=0;ny<nh;ny++)for(let nx=0;nx<nw;nx++){
    const sx0=cell.x+Math.floor(nx*cell.w/nw),sx1=Math.max(sx0+1,cell.x+Math.floor((nx+1)*cell.w/nw));
    const sy0=cell.y+Math.floor(ny*cell.h/nh),sy1=Math.max(sy0+1,cell.y+Math.floor((ny+1)*cell.h/nh));
    const votes=new Map();let opaque=0,total=0;
    for(let y=sy0;y<sy1;y++)for(let x=sx0;x<sx1;x++){
      const o=(y*W+x)*4;total++;if(data[o+3]<128)continue;opaque++;
      const [i,d]=nearest(data[o],data[o+1],data[o+2],pal);offSum+=Math.sqrt(d/9);offN++;votes.set(i,(votes.get(i)||0)+1);
    }
    const q=(ny*nw+nx)*4;
    if(opaque*2<total||!votes.size){out[q+3]=0;continue;}
    const [pi]=[...votes.entries()].sort((a,b)=>b[1]-a[1])[0];const c=pal[pi];out[q]=c[0];out[q+1]=c[1];out[q+2]=c[2];out[q+3]=255;
  }
  return {img:{width:nw,height:nh,data:out},offPalette:offN?offSum/offN:0};
}

export function upscale({width:w,height:h,data},k){
  const out=new Uint8Array(w*k*h*k*4);
  for(let y=0;y<h*k;y++)for(let x=0;x<w*k;x++){const s=(((y/k)|0)*w+((x/k)|0))*4,d=(y*w*k+x)*4;out[d]=data[s];out[d+1]=data[s+1];out[d+2]=data[s+2];out[d+3]=data[s+3];}
  return {width:w*k,height:h*k,data:out};
}

/* 9-slice sanity: the centre (inside the slice inset) should be one flat colour for text to sit on */
export function centreFlatness({width:w,height:h,data},inset){
  if(!inset||w<=inset*2||h<=inset*2)return null;
  const count=new Map();let n=0;
  for(let y=inset;y<h-inset;y++)for(let x=inset;x<w-inset;x++){const o=(y*w+x)*4;if(data[o+3]<128)continue;const k=data[o]<<16|data[o+1]<<8|data[o+2];count.set(k,(count.get(k)||0)+1);n++;}
  return n?Math.max(...count.values())/n:0;
}

export const LIMITS={offPalette:40,aspect:.18,centreFlat:.85};

export function fixAsset(raw,spec,paletteHex){
  const pal=paletteRamp(paletteHex),clean=removeBackground(raw),cells=splitCells(clean),problems=[],outputs=[];
  if(cells.length!==spec.cells.length)problems.push(`cells: found ${cells.length}, expected ${spec.cells.length} (states side by side with clear gaps?)`);
  const touching=cells.some(c=>c.x===0||c.y===0||c.x+c.w>=raw.width||c.y+c.h>=raw.height);
  if(touching)problems.push('art touches the image edge (cropped?)');
  spec.cells.forEach(([nw,nh],i)=>{
    const cell=cells[i];if(!cell)return;
    const aspect=Math.abs((cell.w/cell.h)/(nw/nh)-1);
    const {img,offPalette}=resampleCell(clean,cell,nw,nh,pal);
    const inset=spec.sliceCells?.[spec.states[i]]??spec.slice;
    const flat=centreFlatness(img,inset);
    if(aspect>LIMITS.aspect)problems.push(`${spec.states[i]}: aspect off by ${(aspect*100)|0}%`);
    if(offPalette>LIMITS.offPalette)problems.push(`${spec.states[i]}: far from the palette (${offPalette.toFixed(0)})`);
    if(flat!==null&&flat<LIMITS.centreFlat)problems.push(`${spec.states[i]}: 9-slice centre not flat (${(flat*100)|0}%)`);
    outputs.push({state:spec.states[i],native:img,aspect,offPalette,centreFlat:flat,inset});
  });
  return {outputs,problems,ok:!problems.length};
}
