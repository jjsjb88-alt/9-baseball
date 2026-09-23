// V12 Golden Master pixel kit — decision-only helper, not runtime code.
// Paints on a low-res art canvas (A) shown at exactly 2×, plus a 1× hard-edged text layer (T).
/* global window */
(function(){
const K={};
K.init=(art,txt)=>{K.A=art.getContext('2d',{willReadFrequently:true});K.T=txt.getContext('2d');K.A.imageSmoothingEnabled=false;
  K.W=art.width;K.H=art.height;K.TS=txt.width/parseFloat(getComputedStyle(txt).width);
  // text is authored in 'design px' = art px × 2; a 3× layout scales the whole text layer by 1.5
  K.u=parseFloat(getComputedStyle(art).width)/art.width/2};
// flat translucent fill — broad light and shade are stepped alpha, not dither noise
K.wash=(x,y,w,h,c,a)=>K.rect(x,y,w,h,c,a);
const rgba=(c,a=1)=>'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';
K.px=(x,y,c,a=1)=>{K.A.fillStyle=rgba(c,a);K.A.fillRect(x|0,y|0,1,1)};
K.rect=(x,y,w,h,c,a=1)=>{if(w<=0||h<=0)return;K.A.fillStyle=rgba(c,a);K.A.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
K.bayer=(x,y)=>(BAYER[(y&3)*4+(x&3)]+.5)/16;
// ordered-dither fill: density d in [0,1] (or fn(i,j)) — the pixel-art way to fade, never blur
K.dither=(x,y,w,h,c,d,a=1)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++){const dd=typeof d==='function'?d(i,j):d;if(K.bayer(x+i,y+j)<dd)K.px(x+i,y+j,c,a)}};

K.load=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('asset '+src));i.src=src});
K.pixels=(img,sx=0,sy=0,sw=img.width,sh=img.height)=>{
  const c=document.createElement('canvas');c.width=sw;c.height=sh;const g=c.getContext('2d',{willReadFrequently:true});
  g.drawImage(img,sx,sy,sw,sh,0,0,sw,sh);return {w:sw,h:sh,d:g.getImageData(0,0,sw,sh).data};
};
// Majority colour per target cell keeps authored linework; 'mean' for very coarse cells.
K.resample=(src,tw,th,mode='mode')=>{
  const out=new Uint8ClampedArray(tw*th*4),fx=src.w/tw,fy=src.h/th,key=(d,i)=>(d[i]>>4)<<8|(d[i+1]>>4)<<4|(d[i+2]>>4);
  for(let y=0;y<th;y++)for(let x=0;x<tw;x++){
    const x0=Math.floor(x*fx),x1=Math.max(x0+1,Math.floor((x+1)*fx)),y0=Math.floor(y*fy),y1=Math.max(y0+1,Math.floor((y+1)*fy));
    let n=0,op=0,r=0,g=0,b=0;const votes=new Map();
    for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){const i=(yy*src.w+xx)*4;n++;if(src.d[i+3]<128)continue;op++;
      r+=src.d[i];g+=src.d[i+1];b+=src.d[i+2];if(mode==='mode'){const k=key(src.d,i);votes.set(k,(votes.get(k)||0)+1)}}
    const o=(y*tw+x)*4;if(op*2<n)continue;
    let cr=r/op,cg=g/op,cb=b/op;
    if(mode==='mode'){let bk=0,bv=0;votes.forEach((v,k)=>{if(v>bv){bv=v;bk=k}});
      if(bv*3>=op){let rr=0,gg=0,bb=0,m=0;
        for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){const i=(yy*src.w+xx)*4;if(src.d[i+3]>=128&&key(src.d,i)===bk){rr+=src.d[i];gg+=src.d[i+1];bb+=src.d[i+2];m++}}
        cr=rr/m;cg=gg/m;cb=bb/m}}
    out[o]=cr;out[o+1]=cg;out[o+2]=cb;out[o+3]=255;
  }
  return {w:tw,h:th,d:out};
};
K.kmeans=(img,k)=>{
  const cols=[];for(let i=0;i<img.d.length;i+=4)if(img.d[i+3])cols.push([img.d[i],img.d[i+1],img.d[i+2]]);
  const lum=c=>c[0]*.299+c[1]*.587+c[2]*.114,s=[...cols].sort((a,b)=>lum(a)-lum(b));
  let cent=Array.from({length:k},(_,i)=>[...s[Math.floor(i*(s.length-1)/(k-1))]]);
  for(let it=0;it<10;it++){const acc=cent.map(()=>[0,0,0,0]);
    for(const c of cols){let bi=0,bd=1e9;for(let i=0;i<k;i++){const d=(cent[i][0]-c[0])**2+(cent[i][1]-c[1])**2+(cent[i][2]-c[2])**2;if(d<bd){bd=d;bi=i}}
      const a=acc[bi];a[0]+=c[0];a[1]+=c[1];a[2]+=c[2];a[3]++}
    cent=cent.map((c,i)=>acc[i][3]?[acc[i][0]/acc[i][3],acc[i][1]/acc[i][3],acc[i][2]/acc[i][3]]:c)}
  for(let i=0;i<img.d.length;i+=4){if(!img.d[i+3])continue;let bi=0,bd=1e9;
    for(let j=0;j<k;j++){const c=cent[j],d=(c[0]-img.d[i])**2*.3+(c[1]-img.d[i+1])**2*.59+(c[2]-img.d[i+2])**2*.11;if(d<bd){bd=d;bi=j}}
    img.d[i]=cent[bi][0];img.d[i+1]=cent[bi][1];img.d[i+2]=cent[bi][2]}
  return img;
};
const alphaAt=(w,h,d,x,y)=>x<0||y<0||x>=w||y>=h?0:d[(y*w+x)*4+3];
// Actor finish: drop specks, rebuild 1px ink, backlight rim toward the light, cool shadow fill.
// fill may be [r,g,b] or {from:[r,g,b],to:[r,g,b],axis:'x'|'y'} for light falling across the body
K.actorPass=(img,{ink,rim,rimDirs,fill,rimK=.6})=>{
  const fillAt=(x,y)=>{if(Array.isArray(fill))return fill;const t=fill.axis==='y'?y/img.h:x/img.w;return fill.from.map((v,i)=>v+(fill.to[i]-v)*t)};
  const w=img.w,h=img.h,d=img.d,copy=new Uint8ClampedArray(d);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(!copy[i+3])continue;let n=0;
    for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++)if((j||k)&&alphaAt(w,h,copy,x+k,y+j))n++;if(n<=1)d[i+3]=0}
  const base=new Uint8ClampedArray(d);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(!base[i+3])continue;
    const f=fillAt(x,y);d[i]*=f[0];d[i+1]*=f[1];d[i+2]*=f[2];
    if([[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>!alphaAt(w,h,base,x+a,y+b))){d[i]=ink[0];d[i+1]=ink[1];d[i+2]=ink[2];continue}
    if(rimDirs.some(([a,b])=>!alphaAt(w,h,base,x+2*a,y+2*b))){d[i]+=(rim[0]-d[i])*rimK;d[i+1]+=(rim[1]-d[i+1])*rimK;d[i+2]+=(rim[2]-d[i+2])*rimK}}
  return img;
};
// deterministic noise so every capture is identical
K.rng=(seed=9)=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
// scanline polygon fill (convex), crisp at the art grid — used for light shafts
K.poly=(pts,c,a)=>{const ys=pts.map(p=>p[1]),y0=Math.ceil(Math.min(...ys)),y1=Math.floor(Math.max(...ys));
  for(let y=y0;y<=y1;y++){const xs=[];for(let i=0;i<pts.length;i++){const [ax,ay]=pts[i],[bx,by]=pts[(i+1)%pts.length];
      if((ay<=y&&by>y)||(by<=y&&ay>y))xs.push(ax+(y-ay)*(bx-ax)/(by-ay))}
    if(xs.length>=2){xs.sort((p,q)=>p-q);K.rect(Math.round(xs[0]),y,Math.round(xs[xs.length-1])-Math.round(xs[0]),1,c,a)}}};
K.blit=(img,x,y)=>{const c=document.createElement('canvas');c.width=img.w;c.height=img.h;c.getContext('2d').putImageData(new ImageData(img.d,img.w,img.h),0,0);K.A.drawImage(c,Math.round(x),Math.round(y))};

// 5×7 pixel font — numerals and the Latin labels the screen uses.
const F={
'0':'.###.#...##..###.#.###..##...#.###.','1':'..#...##....#....#....#....#...###.','2':'.###.#...#....#...#...#...#...#####',
'3':'#####...#...#.....#....##...#.###.','4':'...#...##..#.#.#..#.#####...#....#.','5':'######....####.....#....##...#.###.',
'6':'..##..#...#....####.#...##...#.###.','7':'#####....#...#...#...#....#....#...','8':'.###.#...##...#.###.#...##...#.###.',
'9':'.###.#...##...#.####....#...#..##..','A':'.###.#...##...#######...##...##...#','B':'####.#...##...#####.#...##...#####.',
'C':'.###.#...##....#....#....#...#.###.','D':'####.#...##...##...##...##...#####.','E':'######....#....####.#....#....#####',
'G':'.###.#...##....#.####...##...#.####','H':'#...##...##...#######...##...##...#','I':'.###...#....#....#....#....#...###.',
'K':'#...##..#.#.#..##...#.#..#..#.#...#','L':'#....#....#....#....#....#....#####','M':'#...###.###.#.##.#.##...##...##...#',
'N':'#...##...###..##.#.##..###...##...#','O':'.###.#...##...##...##...##...#.###.','P':'####.#...##...#####.#....#....#....',
'R':'####.#...##...#####.#.#..#..#.#...#','S':'.#####....#.....###.....#....#####.','T':'#####..#....#....#....#....#....#..',
'U':'#...##...##...##...##...##...#.###.','W':'#...##...##...##.#.##.#.##.#..#.#.','Z':'#####....#...#...#...#...#....#####',
'Y':'#...##...#.#.#...#....#....#....#..','V':'#...##...##...##...##...#.#.#...#..',
'/':'....#....#...#...#...#...#....#....','%':'##..###..#...#...#...#...#..###..##','+':'.......#....#..#####..#....#.......',
' ':'...................................'};
K.glyphs=(str,x,y,c,scale=1)=>{let cx=x;for(const ch of str){const g=F[ch]||F[' '];
  for(let j=0;j<7;j++)for(let i=0;i<5;i++)if(g[j*5+i]==='#')K.rect(cx+i*scale,y+j*scale,scale,scale,c);cx+=6*scale}return cx-x-scale};
K.glyphW=(s,scale=1)=>s.length*6*scale-scale;

// Hangul on a device-resolution layer (2 device px per CSS px): readable at 9–12px, with a hard
// ink outline so it sits on the pixel world like engraved UI rather than floating web text.
K.text=(str,x,y,{size=12,weight=800,color=[246,238,219],ink=[20,12,14],align='left',ring=true}={})=>{
  const g=K.T,s=K.TS*K.u;g.save();g.scale(s,s);
  g.font=weight+' '+size+'px "Pretendard","Noto Sans KR","Malgun Gothic",sans-serif';g.textBaseline='top';
  g.textAlign=align;g.lineJoin='round';
  if(ring){g.strokeStyle=rgba(ink,.92);g.lineWidth=2.5;g.strokeText(str,x,y)}
  g.fillStyle=rgba(color);g.fillText(str,x,y);const w=g.measureText(str).width;g.restore();return w;
};

// Stepped-light disc: highlight / body / shade bands and a 1px ink ring.
K.disc=(cx,cy,r,hi,mid,lo,ink)=>{for(let y=-r-1;y<=r+1;y++)for(let x=-r-1;x<=r+1;x++){const d=Math.hypot(x,y);
  if(d<=r+.5&&d>r-.6)K.px(cx+x,cy+y,ink);else if(d<=r-.6){const l=(-x-y)/(r*1.6);K.px(cx+x,cy+y,l>.55?hi:l>-.45?mid:lo)}}};
K.line=(x0,y0,x1,y1,c,thick=1)=>{const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);
  for(let i=0;i<=n;i++){const x=Math.round(x0+(x1-x0)*i/n),y=Math.round(y0+(y1-y0)*i/n);K.rect(x-(thick>>1),y-(thick>>1),thick,thick,c)}};
// Hexagonal plate button with banded fill and ink edge.
K.hexButton=(x,y,w,h,[top,mid,bot],ink,hi)=>{const half=(h-1)/2;
  for(let j=0;j<h;j++){const inset=Math.round(Math.abs(j-half)/half*4),t=j/h;
    K.rect(x+inset,y+j,w-inset*2,1,t<.4?top:t<.75?mid:bot);K.px(x+inset,y+j,ink);K.px(x+w-inset-1,y+j,ink)}
  K.rect(x+4,y,w-8,1,ink);K.rect(x+4,y+h-1,w-8,1,ink);if(hi)K.rect(x+5,y+1,w-10,1,hi)};
// Home-plate card silhouette: straight shoulders, pointed foot. fn(x,y,i,j,isEdge)
K.plateShape=(x,y,w,h,fn)=>{const sh=Math.round(h*.7);
  for(let j=0;j<h;j++){const k=j<sh?0:Math.round((j-sh)/(h-1-sh)*(w/2-1));for(let i=k;i<w-k;i++)fn(x+i,y+j,i,j,i===k||i===w-k-1||j===0||j===h-1)}};
window.PK=K;
})();
